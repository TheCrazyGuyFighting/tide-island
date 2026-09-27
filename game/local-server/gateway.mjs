import http from 'node:http';
import {readdir} from 'node:fs/promises';
import {join} from 'node:path';
import {Readable} from 'node:stream';

// Only the compiled game's explicit public assets are reachable. No directory
// server, source files, credentials, inspector or runtime control is forwarded.
async function assetPaths(root, prefix='') {
  const paths=[];
  for (const item of await readdir(join(root,prefix),{withFileTypes:true})) {
    if(item.name.startsWith('.'))continue;
    const path=prefix+'/'+item.name;
    if(item.isDirectory())paths.push(...await assetPaths(root,path));
    else if(item.isFile()&&!/\.(?:map|md|sql)$/i.test(path))paths.push(path);
  }
  return paths;
}
export async function createGameGateway({staticRoot,upstream,publicOrigin=()=>'',lanOrigins=[],port=8870}) {
  const assets=new Set(await assetPaths(staticRoot)),buckets=new Map();
  const locals=new Set([`http://127.0.0.1:${port}`,`http://localhost:${port}`,...lanOrigins]);
  function respond(res,status,message){res.writeHead(status,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end(JSON.stringify({error:message}));}
  const cleanup=setInterval(()=>{for(const [ip,b]of buckets)if(Date.now()-b.start>60000)buckets.delete(ip);},60000);cleanup.unref();
  const server=http.createServer(async(req,res)=>{
    res.setHeader('X-Content-Type-Options','nosniff');
    res.setHeader('Referrer-Policy','same-origin');
    res.setHeader('X-Frame-Options','SAMEORIGIN');
    try {
      const host=req.headers.host??'',remote=publicOrigin();
      // Only the loopback tunnel connection may supply Cloudflare's hostname
      // and client-IP headers. LAN clients cannot impersonate that proxy.
      const isPublic=req.socket.localAddress==='127.0.0.1'&&!!remote&&host===new URL(remote).host;
      const origin=isPublic?remote:`http://${host}`;
      if(!isPublic&&!locals.has(origin))return respond(res,421,'Unknown game hostname.');
      if(!req.url?.startsWith('/')||req.url.startsWith('//')||req.url.includes('\\'))return respond(res,400,'Invalid path.');
      const url=new URL(req.url,origin),path=url.pathname,api=path==='/api/crew';
      if(path!=='/'&&!api&&!assets.has(path))return respond(res,404,'Not found.');
      if(api?!['POST','DELETE'].includes(req.method):!['GET','HEAD'].includes(req.method))return respond(res,405,'Method not allowed.');
      const claimed=req.headers.origin;
      if(claimed&&claimed!==origin||api&&req.headers['sec-fetch-site']==='cross-site')return respond(res,403,'Use the game page to connect.');
      let body;
      if(api){
        if(req.method==='POST'&&!req.headers['content-type']?.startsWith('application/json'))return respond(res,415,'Send JSON.');
        const key=isPublic?req.headers['cf-connecting-ip']??'public':req.socket.remoteAddress;
        let b=buckets.get(key);if(!b||Date.now()-b.start>60000){b={start:Date.now(),count:0,joins:0};buckets.set(key,b);}
        if(++b.count>900)return respond(res,429,'Please slow down.');
        if(Number(req.headers['content-length']??0)>4096)return respond(res,413,'Request too large.');
        const chunks=[];let size=0;
        for await(const chunk of req){size+=chunk.length;if(size>4096){respond(res,413,'Request too large.');return;}chunks.push(chunk);}
        body=Buffer.concat(chunks);
        try{if(JSON.parse(body.toString()).action==='join'&&++b.joins>30)return respond(res,429,'Please wait before making more rooms.');}catch{/* The game validates JSON. */}
      }
      // The public origin has been checked here; the loopback-only worker sees
      // its own origin. Cookie security is restored for the external HTTPS URL.
      const headers={'Accept-Encoding':'identity'};
      for(const key of ['accept','accept-language','content-type','cookie','rsc','next-router-state-tree','next-router-prefetch','next-url','range','if-none-match','if-modified-since'])if(typeof req.headers[key]==='string')headers[key]=req.headers[key];
      if(api)headers.Origin=upstream;
      const result=await fetch(upstream+path+url.search,{method:req.method,headers,body:req.method==='POST'?body:undefined,redirect:'manual',signal:AbortSignal.timeout(30000)});
      res.statusCode=result.status;
      result.headers.forEach((value,key)=>{if(!['content-encoding','content-length','transfer-encoding','connection','set-cookie','server'].includes(key))res.setHeader(key,value);});
      const cookies=result.headers.getSetCookie();
      if(cookies.length)res.setHeader('Set-Cookie',cookies.map(c=>isPublic&&!/;\s*Secure(?:;|$)/i.test(c)?c+'; Secure':c));
      if(path==='/'||api)res.setHeader('Cache-Control','no-store');
      if(req.method==='HEAD'||!result.body){res.end();return;}
      Readable.fromWeb(result.body).on('error',()=>res.destroy()).pipe(res);
    }catch{if(!res.headersSent)respond(res,502,'The local game is starting or unavailable.');else res.destroy();}
  });
  server.requestTimeout=15000;server.headersTimeout=10000;server.maxHeadersCount=50;
  server.on('upgrade',(_req,socket)=>socket.destroy());
  server.on('close',()=>clearInterval(cleanup));
  return server;
}
