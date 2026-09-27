import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,writeFile,rm,readdir} from 'node:fs/promises';
import {EventEmitter} from 'node:events';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {replacePlayLink,validateGameURL,gitEnvironment,runGit,updateReadmeRepository,publishGameLink,probePublicGame,lookupTunnelDoH} from '../local-server/github-link.mjs';

const oldURL='https://old-tide-link.trycloudflare.com',newURL='https://new-tide-link.trycloudflare.com';
const original=`# Tide Island\r\n\r\n**[Play Tide Island](${oldURL})**\r\n\r\nKeep my description 🐟 and [feedback](https://example.com).\r\n`;

test('HTTPS DNS fallback is provider-bound, cancellable, and only accepts matching public addresses',async()=>{
  const hostname='new-tide-link.trycloudflare.com';
  const query=async(answer,status=200)=>lookupTunnelDoH(hostname,{fetcher:async(url,options)=>{
    assert.equal(url,'https://cloudflare-dns.com/dns-query?name='+hostname+'&type=A');
    assert.equal(options.redirect,'error');assert.equal(options.headers.accept,'application/dns-json');
    return new Response(JSON.stringify(answer),{status});
  }});
  assert.equal(await query({Status:0,Answer:[{name:hostname+'.',type:1,data:'104.16.230.132'}]}),'104.16.230.132');
  for(const data of ['127.0.0.1','192.168.3.114','10.0.0.1','169.254.1.1','172.16.0.1','100.64.0.1','::1','not-an-address'])
    await assert.rejects(query({Status:0,Answer:[{name:hostname,type:1,data}]}));
  await assert.rejects(query({Status:0,Answer:[{name:'other.trycloudflare.com',type:1,data:'104.16.230.132'}]}));
  await assert.rejects(query({Status:3}));await assert.rejects(query({},503));
  const noFetch=()=>{throw Error('must not make a network request');};
  await assert.rejects(lookupTunnelDoH('example.com',{fetcher:noFetch}),/Cloudflare/);
  await assert.rejects(lookupTunnelDoH(hostname,{signal:AbortSignal.abort(),fetcher:noFetch}),{name:'AbortError'});
});

test('changes only the Play URL and preserves Unicode, CRLF, and surrounding content',()=>{
  assert.equal(replacePlayLink(original,newURL),original.replace(oldURL,newURL));
  assert.equal(replacePlayLink(original,oldURL),original);
  assert.equal(validateGameURL(newURL+'/'),newURL);
});
test('rejects ambiguous/missing links and unsafe destinations',()=>{
  for(const text of ['no play link',original+original,'[Play Tide Island](https://example.com)'])
    assert.throws(()=>replacePlayLink(text,newURL));
  for(const url of ['http://test.trycloudflare.com','https://test.trycloudflare.com.evil.com','https://test.trycloudflare.com/path',
    'https://test.trycloudflare.com?secret=1','https://user@test.trycloudflare.com','https://127.0.0.1','file:///etc/passwd',newURL+'\n'])
    assert.throws(()=>validateGameURL(url));
});
test('isolates Git configuration and avoids an inherited SSH agent',()=>{
  const env=gitEnvironment('dedicated-ssh');
  assert.equal(env.GIT_CONFIG_GLOBAL,'/dev/null');assert.equal(env.GIT_CONFIG_NOSYSTEM,'1');
  assert.equal(env.GIT_TERMINAL_PROMPT,'0');assert.equal(env.GIT_SSH_COMMAND,'dedicated-ssh');
  assert.equal(env.SSH_AUTH_SOCK,undefined);
});

async function fixture(t){
  const root=await mkdtemp(join(tmpdir(),'tide-readme-test-'));
  t.after(()=>rm(root,{recursive:true,force:true}));
  const remote=join(root,'remote.git'),work=join(root,'author'),runtime=join(root,'runtime');
  await mkdir(work);await mkdir(runtime);
  const env=gitEnvironment();
  const git=(args,options={})=>runGit(args,{cwd:work,env,...options});
  await git(['init','--bare','--template=',remote]);await git(['init','--template=','-b','main','.']);
  await writeFile(join(work,'README.md'),original);await writeFile(join(work,'untouched.txt'),'Leave me alone.\n');
  await git(['add','README.md','untouched.txt']);await git(['commit','-m','Initial intro']);
  await git(['remote','add','origin',remote]);await git(['push','origin','main']);
  const head=()=>git(['--git-dir',remote,'rev-parse','refs/heads/main']).then(r=>r.out.trim());
  const read=path=>git(['--git-dir',remote,'show','refs/heads/main:'+path]).then(r=>r.out);
  const update=options=>updateReadmeRepository({runtime,remote,url:newURL,env,...options});
  return {root,remote,work,runtime,git,head,read,update};
}

test('publishes only README, creates one commit, cleans scratch data, and is idempotent',async t=>{
  const f=await fixture(t),before=await f.head();
  const result=await f.update();assert.equal(result.state,'published');
  assert.equal(await f.read('README.md'),original.replace(oldURL,newURL));
  assert.equal(await f.read('untouched.txt'),'Leave me alone.\n');
  assert.equal((await f.git(['--git-dir',f.remote,'diff','--name-only',before,result.commit])).out,'README.md\n');
  assert.deepEqual(await readdir(f.runtime),[]);
  const again=await f.update();assert.equal(again.state,'unchanged');assert.equal(await f.head(),result.commit);
});

test('preserves an overlapping user edit by retrying a rejected non-fast-forward push',async t=>{
  const f=await fixture(t);let attempts=0;
  const description='\r\nNew text written by the owner during startup!\r\n';
  await f.update({beforePush:async({attempt})=>{
    attempts++;if(attempt===0){await writeFile(join(f.work,'README.md'),original+description);
      await f.git(['add','README.md']);await f.git(['commit','-m','Owner edits description']);await f.git(['push','origin','main']);}
  }});
  assert.equal(attempts,2);assert.equal(await f.read('README.md'),original.replace(oldURL,newURL)+description);
});

test('fails closed without writing when README has multiple links',async t=>{
  const f=await fixture(t);
  await writeFile(join(f.work,'README.md'),original+original);await f.git(['add','README.md']);
  await f.git(['commit','-m','Ambiguous links']);await f.git(['push','origin','main']);const before=await f.head();
  await assert.rejects(f.update(),/exactly one/);assert.equal(await f.head(),before);assert.deepEqual(await readdir(f.runtime),[]);
});

test('stopping/changing the server cancels publication before push',async t=>{
  const f=await fixture(t),before=await f.head();let current=true;
  await assert.rejects(f.update({isCurrent:()=>current,beforePush:async()=>{current=false;}}),/cancelled/);
  assert.equal(await f.head(),before);
  const abort=new AbortController();abort.abort();await assert.rejects(f.update({signal:abort.signal}));
  assert.equal(await f.head(),before);assert.deepEqual(await readdir(f.runtime),[]);
});

test('refuses a symlink README without following its target or changing GitHub',async t=>{
  const f=await fixture(t);
  const blob=(await f.git(['hash-object','-w','--stdin'],{input:'/private/secret'})).out.trim();
  await f.git(['update-index','--cacheinfo',`120000,${blob},README.md`]);
  await f.git(['commit','-m','Symlink README']);await f.git(['push','origin','main']);
  const before=await f.head();await assert.rejects(f.update(),/not a regular file/);assert.equal(await f.head(),before);
});

test('production publishing refuses missing keys before making any network requests',async t=>{
  const f=await fixture(t);
  await assert.rejects(publishGameLink({root:f.root,runtime:f.runtime,url:newURL}),/key is missing/);
});

test('public readiness checks use the real hostname with normal TLS verification and reject redirects',async()=>{
  const probe=async(statusCode,body)=>probePublicGame(newURL,{
    resolveAddress:async hostname=>{assert.equal(hostname,'new-tide-link.trycloudflare.com');return '104.16.231.132';},
    request:(url,options,callback)=>{
      assert.equal(url,newURL+'/');assert.notEqual(options.rejectUnauthorized,false);assert.equal(options.checkServerIdentity,undefined);
      options.lookup('new-tide-link.trycloudflare.com',{},(err,address,family)=>{
        assert.equal(err,null);assert.equal(address,'104.16.231.132');assert.equal(family,4);
      });
      const req=new EventEmitter();queueMicrotask(()=>{
        const response=new EventEmitter();response.statusCode=statusCode;response.setEncoding=()=>{};
        callback(response);response.emit('data',body);response.emit('end');
      });return req;
    }
  });
  assert.equal(await probe(200,'<title>Tide Island — Natural 3D Environment</title>'),true);
  assert.equal(await probe(302,'<title>Tide Island</title>'),false);
  assert.equal(await probe(200,'<title>Cloudflare error</title>'),false);
});
