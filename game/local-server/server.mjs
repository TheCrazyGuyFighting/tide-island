import {spawn} from 'node:child_process';
import {mkdir,writeFile,readFile,access} from 'node:fs/promises';
import {dirname,resolve,join} from 'node:path';
import {fileURLToPath} from 'node:url';
import http from 'node:http';
import {randomBytes,timingSafeEqual} from 'node:crypto';
import {createGameGateway} from './gateway.mjs';
import {lanAddresses} from './network.mjs';
import {publishGameLink,REPOSITORY_PAGE} from './github-link.mjs';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'..'),runtime=join(root,'.local-server');
const config=join(root,'local-server/wrangler.json'),wrangler=join(root,'node_modules/wrangler/bin/wrangler.js');
const upstream='http://127.0.0.1:8871',local='http://127.0.0.1:8870';
const lanHosts=lanAddresses(),lan=lanHosts.map(address=>`http://${address}:8870`),gateways=[];
const controlKey=randomBytes(32).toString('hex'),children=new Set();
let url='',phase='starting',stopping=false;
let github={state:'idle',page:REPOSITORY_PAGE},linkTask=null,linkAbort=null;
let pendingSave=Promise.resolve();
const env={...process.env,XDG_CONFIG_HOME:join(runtime,'config'),WRANGLER_SEND_METRICS:'false',WRANGLER_LOG_PATH:join(runtime,'logs'),CLOUDFLARE_LOAD_DEV_VARS_FROM_DOT_ENV:'false',CHOKIDAR_USEPOLLING:'true',CHOKIDAR_INTERVAL:'2000'};
for(const key of Object.keys(env))if(key.startsWith('TUNNEL_')||['CLOUDFLARE_API_TOKEN','CLOUDFLARE_API_KEY','CLOUDFLARE_ACCOUNT_ID'].includes(key))delete env[key];
const snapshot=()=>({phase,url,local,lan,github,pid:process.pid,startedAt:started});const started=new Date().toISOString();
function save(){const data=JSON.stringify(snapshot(),null,2)+'\n';pendingSave=pendingSave.catch(()=>{}).then(()=>writeFile(join(runtime,'status.json'),data,{mode:0o600}));return pendingSave;}
function syncLink(){
  if(linkTask||phase!=='online'||stopping)return;
  const target=url;linkAbort=new AbortController();
  const signal=linkAbort.signal;
  const setState=(state,extra={})=>{github={state,page:REPOSITORY_PAGE,url:target,updatedAt:new Date().toISOString(),...extra};void save().catch(()=>{});};
  setState('waiting');
  linkTask=publishGameLink({root,runtime,url:target,signal,isCurrent:()=>!stopping&&phase==='online'&&url===target,onState:setState})
    .then(result=>{if(!stopping){setState(result.state,{commit:result.commit});console.log('GitHub Play link is current: '+REPOSITORY_PAGE);}})
    .catch(error=>{if(!stopping){setState('error',{error:error.message});console.error('Game remains online, but the README update failed: '+error.message);}})
    .finally(()=>{linkTask=null;linkAbort=null;});
}
function launch(command,args){const child=spawn(command,args,{cwd:root,env,stdio:['ignore','pipe','pipe']});children.add(child);child.once('exit',()=>children.delete(child));child.on('error',e=>{console.error(e.message);void stop(1);});return child;}
async function stop(code=0){if(stopping)return;stopping=true;phase='stopping';url='';linkAbort?.abort();if(linkTask)github={...github,state:'cancelled'};await save().catch(()=>{});for(const gateway of gateways){gateway.closeAllConnections();gateway.close();}for(const child of children)child.kill('SIGTERM');control.close();setTimeout(()=>{for(const child of children)child.kill('SIGKILL');phase='stopped';void save().finally(()=>process.exit(code));},1500);}
const control=http.createServer((req,res)=>{
  const token=req.headers.authorization?.replace(/^Bearer /,'')??'';
  if(token.length!==controlKey.length||!timingSafeEqual(Buffer.from(token),Buffer.from(controlKey))){res.writeHead(403);res.end();return;}
  if(req.url==='/status'&&req.method==='GET'){res.setHeader('Content-Type','application/json');res.end(JSON.stringify(snapshot()));}
  else if(req.url==='/stop'&&req.method==='POST'){res.end('Stopping game server');void stop();}
  else if(req.url==='/sync-link'&&req.method==='POST'){
    if(phase!=='online'){res.writeHead(409);res.end('Public game is not online.');return;}
    syncLink();res.writeHead(202);res.end('Updating GitHub Play link.');
  }
  else{res.writeHead(404);res.end();}
});
process.on('SIGTERM',()=>void stop());process.on('SIGINT',()=>void stop());
process.on('uncaughtException',e=>{console.error(e.message);void stop(1);});process.on('unhandledRejection',e=>{console.error(String(e));void stop(1);});
async function main(){
  await mkdir(runtime,{recursive:true,mode:0o700});
  await access(join(root,'dist/server/index.js'));await access('/opt/homebrew/bin/cloudflared');
  await new Promise((ok,bad)=>{control.once('error',bad);control.listen(8872,'127.0.0.1',ok);});
  await writeFile(join(runtime,'control-key'),controlKey,{mode:0o600});await save();
  // Generated migrations are applied only to this separate local database.
  console.log('Preparing the local multiplayer database…');
  const migrate=launch(process.execPath,[wrangler,'d1','migrations','apply','DB','--local','--config',config,'--persist-to',join(runtime,'state')]);
  migrate.stdout.pipe(process.stdout);migrate.stderr.pipe(process.stderr);
  await new Promise((ok,bad)=>{migrate.once('exit',code=>code===0?ok():bad(Error('Local database setup failed.')));migrate.once('error',bad);});
  const worker=launch(process.execPath,[join(root,'local-server/worker.mjs')]);
  worker.stdout.pipe(process.stdout);worker.stderr.pipe(process.stderr);worker.once('exit',()=>{if(!stopping){console.error('Local game engine stopped.');void stop(1);}});
  let ready=false;
  for(let i=0;i<100&&!stopping;i++){try{const r=await fetch(upstream,{signal:AbortSignal.timeout(1500)});await r.arrayBuffer();if(r.ok){ready=true;break;}}catch{}await new Promise(r=>setTimeout(r,300));}
  if(!ready)throw Error('Local game did not start.');
  for(const host of ['127.0.0.1',...lanHosts]){
    const gateway=await createGameGateway({staticRoot:join(root,'dist/client'),upstream,publicOrigin:()=>url,lanOrigins:lan});
    gateways.push(gateway);
    await new Promise((ok,bad)=>{gateway.once('error',bad);gateway.listen(8870,host,ok);});
  }
  phase='local-ready';await save();console.log('Local game ready: '+local);
  for(const address of lan)console.log('Same Wi-Fi game: '+address);
  if(process.argv.includes('--local-only'))return;
  const tunnel=launch('/opt/homebrew/bin/cloudflared',['tunnel','--config',join(root,'local-server/quick-tunnel.yml'),'--no-autoupdate','--metrics','127.0.0.1:0','--grace-period','3s','--url',local]);
  let tail='';const log=chunk=>{const text=chunk.toString();process.stdout.write(text);tail=(tail+text).slice(-4000);const found=tail.match(/https:\/\/[a-z0-9-]+\.trycloudflare\.com/);if(found&&!url&&!stopping){url=found[0];phase='tunnel-starting';void save();}if(tail.includes('Registered tunnel connection')&&url&&phase!=='online'&&!stopping){phase='online';void save();console.log('\nSHARE THIS GAME LINK: '+url+'\nKeep this Mac awake and online.');syncLink();}};
  tunnel.stdout.on('data',log);tunnel.stderr.on('data',log);tunnel.once('exit',()=>{if(!stopping){console.error('Temporary tunnel stopped.');void stop(1);}});
}
main().catch(e=>{console.error(e.message);void stop(1);});
