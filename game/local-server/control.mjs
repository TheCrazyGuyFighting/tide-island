import {spawn} from 'node:child_process';
import {readFile,mkdir,open} from 'node:fs/promises';
import {dirname,join,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..'),runtime=join(root,'.local-server');
async function request(path,method='GET'){const key=(await readFile(join(runtime,'control-key'),'utf8')).trim();return fetch('http://127.0.0.1:8872'+path,{method,headers:{Authorization:'Bearer '+key},signal:AbortSignal.timeout(1500)});}
async function status(){try{const r=await request('/status');return r.ok?await r.json():null;}catch{return null;}}
const action=process.argv[2]??'status';let state=await status();
function show(s){if(process.argv.includes('--json'))console.log(JSON.stringify(s,null,2));else{if(s?.phase==='online')console.log('Tide Island is online!\nDirect game link: '+s.url+'\nKeep this Mac awake and online.');else console.log(s?'Game server: '+s.phase+'\nLocal game: '+s.local:'The local game is stopped.');for(const address of s?.lan??[])console.log('Same Wi-Fi: '+address);if(s?.github){console.log('Permanent page to share: '+s.github.page);if(['published','unchanged'].includes(s.github.state))console.log('GitHub Play button: up to date.');else if(s.github.state==='error')console.log('GitHub Play button update failed: '+s.github.error+'\nRun Start again to retry without restarting the game.');else if(['waiting','publishing'].includes(s.github.state))console.log('GitHub Play button: updating in the background (usually under a minute).');}}}
if(action==='stop'){if(!state){console.log('The local game is already stopped.');process.exit(0);}const r=await request('/stop','POST');console.log(await r.text());}
else if(action==='start'){
  for(let i=0;state?.phase==='stopping'&&i<12;i++){await new Promise(r=>setTimeout(r,300));state=await status();}
  if(state){if(state.phase==='online'&&['error','idle','cancelled'].includes(state.github?.state)){await request('/sync-link','POST');state=await status();}show(state);process.exit(0);}
  await mkdir(runtime,{recursive:true,mode:0o700});const log=await open(join(runtime,'server.log'),'a',0o600);
  const child=spawn(process.execPath,[join(root,'local-server/server.mjs'),...(process.argv.includes('--local-only')?['--local-only']:[])],{cwd:root,detached:true,stdio:['ignore',log.fd,log.fd]});child.unref();await log.close();
  for(let i=0;i<90;i++){await new Promise(r=>setTimeout(r,500));state=await status();if(state&&['online','local-ready'].includes(state.phase)&&(state.phase==='online'||process.argv.includes('--local-only'))){show(state);process.exit(0);}if(state?.phase==='stopping')break;}
  show(state);console.log('Details: '+join(runtime,'server.log'));process.exitCode=1;
}else if(action==='sync-link'){
  if(!state){console.error('Start the game server first.');process.exitCode=1;}
  else{const r=await request('/sync-link','POST');console.log(await r.text());if(!r.ok)process.exitCode=1;}
}else if(action==='status')show(state);
else{console.error('Use start, status, sync-link or stop.');process.exitCode=1;}
