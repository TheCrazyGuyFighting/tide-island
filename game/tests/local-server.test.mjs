import assert from 'node:assert/strict';
const base=process.env.TIDE_TEST_ORIGIN??'http://127.0.0.1:8870';
const response=await fetch(base);assert.equal(response.status,200);const html=await response.text();assert(html.includes('Tide Island'));
const scripts=[...html.matchAll(/(?:src|href)="([^" ]+\.(?:js|css))"/g)].map(m=>m[1]);assert(scripts.length>0);
for(const asset of scripts.slice(0,5)){const r=await fetch(new URL(asset,base));assert.equal(r.status,200,asset);assert(!(await r.text()).startsWith('<!DOCTYPE'));}
for(const path of ['/package.json','/.env','/.git/config','/local-server/server.mjs','/.local-server/control-key','/.local-server/github-link-key','/local-server/github-link.mjs','/sync-link','/drizzle/0000_nostalgic_jimmy_woo.sql','/src/app/page.tsx','/@vite/client','/@fs/etc/passwd','/__scheduled','/stop','/status','/api/other']){const r=await fetch(base+path);assert.equal(r.status,404,path);}
assert.equal((await fetch(base+'/',{method:'POST'})).status,405);
assert.equal((await fetch(base+'/api/crew',{method:'DELETE',headers:{Origin:'https://example.com'}})).status,403);
assert.equal((await fetch(base+'/api/crew',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({padding:'x'.repeat(5000)})})).status,413);
assert.equal((await fetch(base+'/api/crew',{method:'POST',headers:{'Content-Type':'text/plain'},body:'{}'})).status,415);
const model=await fetch(base+'/models/shop/bow.glb',{method:'HEAD'});assert.equal(model.status,200);
console.log('PASS: game HTML, built scripts/styles, model asset, blocked source/private/config/debug/control paths, method restriction, CSRF rejection, body limit.');
