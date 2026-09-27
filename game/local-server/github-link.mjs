import {spawn} from 'node:child_process';
import {mkdtemp,rm,lstat,access} from 'node:fs/promises';
import {join} from 'node:path';
import {setTimeout as delay} from 'node:timers/promises';
import {Resolver} from 'node:dns/promises';
import https from 'node:https';
import {isIP} from 'node:net';

export const REPOSITORY_PAGE='https://github.com/TheCrazyGuyFighting/tide-island';
const REMOTE='ssh://git@ssh.github.com:443/TheCrazyGuyFighting/tide-island.git';

export function validateGameURL(url){
  if(typeof url!=='string'||!/^https:\/\/[a-z0-9]+(?:-[a-z0-9]+)*\.trycloudflare\.com\/?$/.test(url))
    throw Error('Only a Cloudflare HTTPS game link is allowed.');
  return url.replace(/\/$/,'');
}

export function replacePlayLink(readme,url){
  url=validateGameURL(url);
  const links=[...readme.matchAll(/\[Play Tide Island\]\(([^)\r\n]+)\)/g)];
  if(links.length!==1)throw Error('README must contain exactly one [Play Tide Island](...) link. No changes published.');
  validateGameURL(links[0][1]);
  const start=links[0].index+'[Play Tide Island]('.length;
  return readme.slice(0,start)+url+readme.slice(start+links[0][1].length);
}

// No inherited Git configuration, SSH agent, hooks, filters, or credential helpers.
// A bare temporary repository also avoids checking out/executing remote files.
export function gitEnvironment(sshCommand){
  const env=Object.fromEntries(Object.entries(process.env).filter(([k])=>!k.startsWith('GIT_')&&!k.startsWith('SSH_')));
  Object.assign(env,{GIT_CONFIG_GLOBAL:'/dev/null',GIT_CONFIG_NOSYSTEM:'1',GIT_TERMINAL_PROMPT:'0',
    GIT_AUTHOR_NAME:'Tide Island Link Updater',GIT_COMMITTER_NAME:'Tide Island Link Updater',
    GIT_AUTHOR_EMAIL:'tide-island-link-updater@users.noreply.github.com',GIT_COMMITTER_EMAIL:'tide-island-link-updater@users.noreply.github.com'});
  if(sshCommand)env.GIT_SSH_COMMAND=sshCommand;
  return env;
}

export function runGit(args,{cwd,env=gitEnvironment(),signal,input,allowFailure=false}={}){
  return new Promise((resolve,reject)=>{
    const child=spawn('/usr/bin/git',['-c','core.hooksPath=/dev/null','-c','commit.gpgSign=false',...args],
      {cwd,env,signal,timeout:30000,killSignal:'SIGKILL',stdio:['pipe','pipe','pipe']});
    let out='',err='',tooLarge=false;
    child.stdout.setEncoding('utf8');child.stderr.setEncoding('utf8');
    child.stdout.on('data',chunk=>{out+=chunk;if(out.length>1024*1024){tooLarge=true;child.kill('SIGKILL');}});
    child.stderr.on('data',chunk=>{err=(err+chunk).slice(-4000);});
    child.stdin.on('error',()=>{});child.stdin.end(input);
    child.once('error',reject);
    child.once('close',(code,terminationSignal)=>{
      if(tooLarge)reject(Error('Git output exceeded the safe size limit.'));
      else if(code!==0&&!allowFailure)reject(Error(`Git ${args[0]} failed${terminationSignal?' ('+terminationSignal+')':''}: ${err.trim().slice(-1200)}`));
      else resolve({code,out,err});
    });
  });
}

// Exported separately so tests can exercise real Git against a disposable local repo.
// The production entry point below always uses the single hardcoded GitHub repository.
export async function updateReadmeRepository({runtime,remote,url,env,signal,isCurrent=()=>true,beforePush=async()=>{}}){
  url=validateGameURL(url);
  const dir=await mkdtemp(join(runtime,'readme-sync-'));
  const git=(args,options={})=>runGit(args,{cwd:dir,env,signal,...options});
  const current=()=>{signal?.throwIfAborted();if(!isCurrent())throw Error('The server link changed; cancelled the outdated update.');};
  try{
    current();await git(['init','--bare','--template=','.']);
    for(let attempt=0;attempt<3;attempt++){
      current();await git(['fetch','--no-tags','--depth=1',remote,'refs/heads/main']);
      const base=(await git(['rev-parse','FETCH_HEAD'])).out.trim();
      const entry=(await git(['ls-tree',base,'--','README.md'])).out;
      const match=entry.match(/^(100644|100755) blob ([a-f0-9]{40,64})\tREADME\.md\n$/);
      if(!match)throw Error('README.md is missing or is not a regular file. No changes published.');
      const size=Number((await git(['cat-file','-s',match[2]])).out.trim());
      if(!Number.isFinite(size)||size>256*1024)throw Error('README.md is too large to update safely.');
      const readme=(await git(['cat-file','blob',match[2]])).out;
      if(readme.includes('\uFFFD')||readme.includes('\0'))throw Error('README.md is not plain UTF-8 text.');
      const next=replacePlayLink(readme,url);
      if(next===readme)return {state:'unchanged',commit:base,url};
      const blob=(await git(['hash-object','-w','--stdin'],{input:next})).out.trim();
      await git(['read-tree',base]);
      await git(['update-index','--add','--cacheinfo',`${match[1]},${blob},README.md`]);
      const tree=(await git(['write-tree'])).out.trim();
      const commit=(await git(['commit-tree',tree,'-p',base],{input:'Update Play link for the current game server\n'})).out.trim();
      const changed=(await git(['diff-tree','--no-commit-id','--name-only','-r',base,commit])).out.trim();
      if(changed!=='README.md')throw Error('Refusing to publish changes outside README.md.');
      await beforePush({attempt,commit,base});current();
      const pushed=await git(['push','--porcelain',remote,`${commit}:refs/heads/main`],{allowFailure:true});
      if(pushed.code===0)return {state:'published',commit,url};
      // Never force-push. If someone edited the README, fetch and reapply to their version.
      if(!/\[rejected\].*(fetch first|non-fast-forward)/i.test(pushed.out+pushed.err))
        throw Error('GitHub rejected the link update. Check the repository deploy key and branch rules.');
    }
    throw Error('README kept changing during the update. Try Sync again.');
  }finally{
    // Only remove the unique scratch repository created by this invocation, never runtime state.
    await rm(dir,{recursive:true,force:true});
  }
}

const quote=value=>"'"+value.replace(/'/g,"'\\''")+"'";
export async function lookupTunnelDoH(hostname,{signal,fetcher=fetch}={}){
  validateGameURL('https://'+hostname);
  signal?.throwIfAborted();
  const response=await fetcher('https://cloudflare-dns.com/dns-query?name='+encodeURIComponent(hostname)+'&type=A',{
    headers:{accept:'application/dns-json'},redirect:'error',signal,
  });
  if(response.status!==200)throw Error('Cloudflare HTTPS DNS lookup failed.');
  const text=await response.text();if(text.length>65536)throw Error('DNS response is too large.');
  const answer=JSON.parse(text);
  if(answer.Status!==0||!Array.isArray(answer.Answer))throw Error('The public tunnel DNS record is not ready.');
  for(const record of answer.Answer){
    if(record.type!==1||record.name?.replace(/\.$/,'')!==hostname||isIP(record.data)!==4)continue;
    const [a,b]=record.data.split('.').map(Number);
    if(a===0||a===10||a===127||a>=224||(a===169&&b===254)||(a===172&&b>=16&&b<=31)||(a===192&&b===168)||(a===100&&b>=64&&b<=127))continue;
    return record.data;
  }
  throw Error('HTTPS DNS returned no public address for this tunnel.');
}
export async function probePublicGame(url,{signal,resolveAddress,request=https.get}={}){
  url=validateGameURL(url);
  const hostname=new URL(url).hostname;
  const deadline=AbortSignal.any([...(signal?[signal]:[]),AbortSignal.timeout(10000)]);
  deadline.throwIfAborted();
  let address;
  if(resolveAddress)address=await resolveAddress(hostname);
  else{
    // Quick Tunnel names can be negatively cached by a local/VPN resolver while
    // their DNS record is being created. Query the tunnel provider independently.
    // This does not change OS DNS settings, TLS validation, Host, or SNI.
    const resolver=new Resolver({timeout:2000,tries:1});resolver.setServers(['1.1.1.1','1.0.0.1']);
    const dnsDeadline=AbortSignal.any([deadline,AbortSignal.timeout(3500)]);
    const cancel=()=>resolver.cancel();dnsDeadline.addEventListener('abort',cancel,{once:true});
    try{
      // Only resolve the long-lived nameserver names through recursive DNS. Ask
      // the authoritative server for the new game name, avoiding a 30-minute
      // negative cache if the tunnel's DNS record has not been created yet.
      const nameservers=await resolver.resolveNs('trycloudflare.com');
      const authorities=nameservers.filter(name=>name.endsWith('.ns.cloudflare.com')).slice(0,2);
      if(!authorities.length)throw Error('Cloudflare authoritative DNS was not found.');
      const addresses=[];for(const authority of authorities)addresses.push(await resolver.resolve4(authority));
      let dnsError;
      for(const servers of addresses){
        deadline.throwIfAborted();resolver.setServers(servers);
        try{[address]=await resolver.resolve4(hostname);if(address)break;}catch(error){dnsError=error;}
      }
      if(!address&&dnsError)throw dnsError;
    }catch{
      deadline.throwIfAborted();
      // Some networks intercept or negatively cache even directed UDP DNS.
      // Use the same provider over HTTPS; never disable game TLS checks.
      address=await lookupTunnelDoH(hostname,{signal:deadline});
    }finally{dnsDeadline.removeEventListener('abort',cancel);}
  }
  if(!address)throw Error('The public game DNS record is not ready.');
  deadline.throwIfAborted();
  return new Promise((resolve,reject)=>{
    const req=request(url+'/',{signal:deadline,agent:false,family:4,autoSelectFamily:false,rejectUnauthorized:true,
      lookup:(host,options,done)=>host===hostname?done(null,address,4):done(Error('Unexpected probe hostname.'))},response=>{
      let html='';response.setEncoding('utf8');
      response.on('data',chunk=>{html+=chunk;if(html.length>1024*1024)req.destroy(Error('Public response is too large.'));});
      response.on('error',reject);response.on('aborted',()=>reject(Error('Public game response was interrupted.')));
      response.on('end',()=>resolve(response.statusCode===200&&/<title>Tide Island[^<]*<\/title>/.test(html)));
    });
    req.on('error',reject);
  });
}

export async function publishGameLink({root,runtime,url,signal,isCurrent=()=>true,onState=()=>{}}){
  url=validateGameURL(url);
  const key=join(runtime,'github-link-key'),knownHosts=join(root,'local-server/github-known-hosts');
  const stat=await lstat(key).catch(()=>null);
  if(!stat?.isFile()||(stat.mode&0o077)!==0)throw Error('GitHub updater key is missing or not private (permissions must be 600).');
  await access(knownHosts);
  const ssh=['/usr/bin/ssh','-F','/dev/null','-i',key,'-o','IdentitiesOnly=yes','-o','IdentityAgent=none',
    '-o','BatchMode=yes','-o','ConnectTimeout=10','-o','StrictHostKeyChecking=yes',
    '-o','HostKeyAlgorithms=ssh-ed25519','-o','HostKeyAlias=github.com','-o','UpdateHostKeys=no',
    '-o',`UserKnownHostsFile=${knownHosts}`,'-o','GlobalKnownHostsFile=/dev/null'].map(quote).join(' ');
  let lastError;
  onState('waiting');
  // DNS propagation can lag behind cloudflared reporting a connection.
  for(let attempt=0;attempt<12;attempt++){
    signal?.throwIfAborted();
    if(!isCurrent())throw Error('The server stopped before its link was published.');
    try{
      if(await probePublicGame(url,{signal})){lastError=null;break;}
      lastError=Error('The public game is not ready yet.');
    }catch(e){lastError=e;}
    if(attempt<11)await delay(8000,undefined,{signal});
  }
  if(lastError)throw Error('The public game link did not become reachable. Start again to retry the README update.');
  onState('publishing');
  return updateReadmeRepository({runtime,remote:REMOTE,url,env:gitEnvironment(ssh),signal,isCurrent});
}
