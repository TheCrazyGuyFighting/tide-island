import assert from 'node:assert/strict';
import * as T from 'three';
import {addMarinePopulation} from '../lib/island-marine-population';
import {MARINE_SPECIES} from '../lib/island-marine-roster';
import {groundHeight} from '../lib/island-world';
import type {FishAgent} from '../lib/island-fishing';
for(const lowPower of [false,true]){
 const scene=new T.Scene(),fish:FishAgent[]=[],animations:{update:(dt:number,time:number)=>void}[]=[];
 addMarinePopulation(scene,lowPower,f=>fish.push(f),animations);
 assert.equal(fish.length,MARINE_SPECIES.length*(lowPower?1:2));
 for(const spec of MARINE_SPECIES)assert(fish.some(f=>f.id.startsWith('original-'+spec.kind+'-')),spec.legacyId+' actually spawned');
 const initial=fish.map(f=>new T.Vector3(f.position.x,f.position.y,f.position.z));
 for(let frame=0;frame<300;frame++)for(const a of animations)a.update(.05,frame*.05);
 let moved=0;
 for(const [i,f] of fish.entries()){
   assert(Object.values(f.position).filter(v=>typeof v==='number').every(Number.isFinite));
   assert(f.position.y<0,'No fish above water');
   assert(f.position.y>=groundHeight(f.position.x,f.position.z)+f.clearance-.02,'No buried fish '+f.name);
   assert(groundHeight(f.position.x,f.position.z)<-.4,'No stranded fish');
   if(initial[i].distanceTo(new T.Vector3(f.position.x,f.position.y,f.position.z))>.25)moved++;
   if(f.id.includes('shark'))assert(Math.hypot(f.position.x,f.position.z)>110,'Sharks remain offshore');
 }
 assert(moved>fish.length*.8,'Roster actually swims');
 const landed=fish.find(f=>f.catchable)!;landed.caught=true;landed.landing={position:{x:0,y:2,z:0},pitch:.1,yaw:.2,roll:.3};animations[fish.indexOf(landed)].update(.05,16);assert.equal(landed.position.y,2,'Retains catch-lift animation');landed.landing=null;animations[fish.indexOf(landed)].update(.05,17);assert.equal(scene.getObjectByName(landed.id)!.visible,false);
 animations.forEach(a=>a.update(0,-1));
}
console.log('PASS: every marine species spawns in desktop/mobile, swims underwater above terrain, sharks offshore, catches animate.');
