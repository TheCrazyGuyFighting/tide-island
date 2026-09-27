import {unstable_startWorker} from 'wrangler';
import {dirname,resolve,join} from 'node:path';
import {fileURLToPath} from 'node:url';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
// Run the fixed production build locally, with no file watcher or inspector.
const worker=await unstable_startWorker({
  config:join(root,'local-server/wrangler.json'),envFiles:[],sendMetrics:false,
  dev:{remote:false,watch:false,liveReload:false,inspector:false,enableContainers:false,
    persist:join(root,'.local-server/state'),registry:join(root,'.local-server/registry'),
    logLevel:'warn',server:{hostname:'127.0.0.1',port:8871,secure:false},origin:{secure:false}},
});
await worker.ready;
console.log('Fixed local game build is ready.');
let closing=false;
async function stop(){if(closing)return;closing=true;await worker.dispose();process.exit(0);}
process.on('SIGTERM',()=>void stop());process.on('SIGINT',()=>void stop());
