import assert from 'node:assert/strict';
const base=process.env.TIDE_TEST_ORIGIN??'http://localhost:3000';
const pose={x:-29,y:4,z:54,yaw:0,outfit:'waders',action:'walking',boat:null};
const cookies=[];
async function request(body,cookie){const r=await fetch(base+'/api/crew',{method:'POST',headers:{'Content-Type':'application/json',Origin:base,...(cookie?{Cookie:cookie}:{})},body:JSON.stringify(body)});const data=await r.json();const c=r.headers.get('set-cookie')?.split(';')[0];if(c)cookies.push(c);return {r,data,c};}
try{
  const malformed=await request(null);assert.equal(malformed.r.status,400);
  const a=await request({action:'join',mode:'create',name:'Test keeper A',pose});assert.equal(a.r.status,200,JSON.stringify(a.data));assert.equal(a.data.players.length,1);const room=a.data.room;
  const b=await request({action:'join',mode:'code',code:room,name:'Test keeper B',pose:{...pose,x:-30}});assert.equal(b.r.status,200);assert.equal(b.data.players.length,2);assert.notEqual(a.data.self,b.data.self);
  const peers=await Promise.all(['C','D'].map(name=>request({action:'join',mode:'code',code:room,name:'Test '+name,pose})));peers.forEach(p=>assert.equal(p.r.status,200));
  const extra=await request({action:'join',mode:'code',code:room,name:'Overflow',pose});assert.equal(extra.r.status,409);
  await new Promise(r=>setTimeout(r,170));const pulse=await request({action:'pulse',pose:{...pose,x:-31,action:'fishing'}},a.c);assert.equal(pulse.r.status,200);assert.equal(pulse.data.players.length,4);assert.equal(pulse.data.players.find(p=>p.id===a.data.self).pose.x,-31);assert.equal(pulse.data.players.find(p=>p.id===b.data.self).pose.x,-30);
  const anonymous=await request({action:'pulse',pose});assert.equal(anonymous.r.status,410);
  const invalid=await request({action:'pulse',pose:{...pose,x:1e100}},a.c);assert.equal(invalid.r.status,400);
  const other=await request({action:'join',mode:'match',name:'Separate crew',pose});assert.equal(other.r.status,200);assert.notEqual(other.data.room,room);assert.equal(other.data.players.length,1);
  const matched=await request({action:'join',mode:'match',name:'Matched guest',pose});assert.equal(matched.r.status,200);assert.equal(matched.data.room,other.data.room);
  const cross=await fetch(base+'/api/crew',{method:'DELETE',headers:{Origin:'https://not-the-game.example',Cookie:a.c}});assert.equal(cross.status,403);
  console.log('PASS: separate guest cookies, room-code join, public matching, race-safe four-player capacity, movement sync, room isolation, invalid poses and cross-origin rejection.');
}finally{await Promise.all(cookies.map(cookie=>fetch(base+'/api/crew',{method:'DELETE',headers:{Origin:base,Cookie:cookie}})));}
