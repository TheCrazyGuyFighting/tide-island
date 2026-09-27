import assert from 'node:assert/strict';
import {test} from 'node:test';
import http from 'node:http';
import {mkdtemp,rmdir} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createGameGateway} from '../local-server/gateway.mjs';
import {lanAddresses} from '../local-server/network.mjs';

test('only private addresses on physical Mac interfaces are advertised',()=>{
  const address=(ip,extra={})=>({address:ip,internal:false,family:'IPv4',...extra});
  assert.deepEqual(lanAddresses({
    lo0:[address('127.0.0.1',{internal:true})],
    en0:[address('192.168.3.114'),address('2001:db8::1',{family:'IPv6'})],
    en1:[address('10.0.1.3'),address('172.20.1.4'),address('203.0.113.5')],
    en2:[address('192.168.3.114'),address('172.32.0.2')],
    utun4:[address('10.14.0.2')],
  }),['192.168.3.114','10.0.1.3','172.20.1.4']);
});

test('LAN requests preserve cookie, origin and host boundaries',async()=>{
  const directory=await mkdtemp(join(tmpdir(),'tide-gateway-test-'));
  const requests=[];
  const engine=http.createServer((req,res)=>{
    requests.push({origin:req.headers.origin,cookie:req.headers.cookie});
    res.setHeader('Set-Cookie','test-session=fixture; HttpOnly; SameSite=Strict; Path=/');
    res.end('game');
  });
  let gateway;
  try{
    await new Promise(resolve=>engine.listen(0,'127.0.0.1',resolve));
    const upstream=`http://127.0.0.1:${engine.address().port}`;
    const lan='http://192.168.3.114:8870',publicUrl='https://test-game.trycloudflare.com';
    gateway=await createGameGateway({staticRoot:directory,upstream,lanOrigins:[lan],publicOrigin:()=>publicUrl});
    await new Promise(resolve=>gateway.listen(0,'127.0.0.1',resolve));
    const base=`http://127.0.0.1:${gateway.address().port}`;
    // Node fetch overwrites Host; raw HTTP lets us test hostile and LAN hosts.
    const request=(path,options={})=>new Promise((resolve,reject)=>{
      const req=http.request(base+path,options,res=>{
        let text='';res.setEncoding('utf8');res.on('data',chunk=>text+=chunk);
        res.on('end',()=>resolve({status:res.statusCode,text,cookie:res.headers['set-cookie']?.join('; ')}));
      });
      req.on('error',reject);req.end(options.body);
    });
    const page=await request('/',{headers:{Host:new URL(lan).host}});
    assert.equal(page.status,200);
    assert.equal(page.text,'game');
    assert(!page.cookie.includes('; Secure'),'HTTP LAN cookie must work');
    const api=await request('/api/crew',{method:'POST',headers:{Host:new URL(lan).host,Origin:lan,'Content-Type':'application/json',Cookie:'test-session=fixture'},body:'{}'});
    assert.equal(api.status,200);
    assert.deepEqual(requests.at(-1),{origin:upstream,cookie:'test-session=fixture'});
    assert.equal((await request('/',{headers:{Host:'untrusted.example:8870'}})).status,421);
    assert.equal((await request('/api/crew',{method:'DELETE',headers:{Host:new URL(lan).host,Origin:'http://192.168.3.115:8870'}})).status,403);
    assert.equal((await request('/api/crew',{method:'DELETE',headers:{Host:new URL(lan).host,'Sec-Fetch-Site':'cross-site'}})).status,403);
    assert.equal((await request('/.local-server/control-key',{headers:{Host:new URL(lan).host}})).status,404);
    const publicPage=await request('/',{headers:{Host:new URL(publicUrl).host}});
    assert.equal(publicPage.status,200);
    assert(publicPage.cookie.includes('; Secure'),'HTTPS tunnel cookie stays secure');
  }finally{
    for(const server of [gateway,engine].filter(Boolean)){server.closeAllConnections();await new Promise(resolve=>server.close(resolve));}
    await rmdir(directory); // Empty test-only fixture directory.
  }
});
