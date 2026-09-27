import assert from 'node:assert/strict';
import * as T from 'three';
import {createMarineCreature, type MarineKind} from '../lib/island-original-marine';
import {SeaCareController} from '../lib/island-sea-care';
import {SEAFOOD} from '../lib/island-expansion-types';
import {cabinTarget,CABIN_BED,CABIN_CHEST,RACK_SLOTS} from '../lib/island-cabin-interior';
import {MARINE_SPECIES} from '../lib/island-marine-roster';
const kinds:MarineKind[]=[...MARINE_SPECIES.map(s=>s.kind),'menhaden'];
for(const kind of kinds)for(const detail of ['high','medium'] as const){
 const a=createMarineCreature(kind,detail);let tris=0;
 a.root.traverse(o=>{if(o instanceof T.Mesh){const p=o.geometry.getAttribute('position');assert(Array.from(p.array).every(Number.isFinite),kind);tris+=(o.geometry.index?.count??p.count)/3;}});
 assert(tris>(detail==='high'?10000:3000),kind+' detail');
 for(let i=0;i<180;i++)a.update(i/60,.5+i/180);
 const box=new T.Box3().setFromObject(a.root),size=box.getSize(new T.Vector3());assert(size.toArray().every(v=>Number.isFinite(v)&&v>0));a.dispose();
}
for(const f of SEAFOOD){
 const scene=new T.Scene(),root=new T.Group();root.position.set(-1,-.7,0);scene.add(root);
 let held=false,settled=0,result=false;
 const care=new SeaCareController(scene),target={id:'pet-dolphin',root,bounds:{x:0,z:0,rx:2,rz:2},hold:(v:boolean)=>{held=v;},pose(){}};
 assert(care.start(target,f.id,new T.Vector3(-1,1,1),{hunting:0,trust:0},ok=>{settled++;result=ok;}));assert(held);
 assert(!care.start(target,f.id,new T.Vector3(),{hunting:0,trust:0},()=>{}));
 for(let i=0;i<1800&&care.active;i++){care.update(1/60,i/60);assert(root.position.toArray().every(Number.isFinite));}
 assert(!care.active&&result&&!held,f.id+' full pursuit/meal');assert.equal(settled,1);assert.equal(scene.children.length,1,'Transient prey disposed');
 care.cancel();assert.equal(settled,1);
 assert(care.start(target,f.id,new T.Vector3(),{hunting:0,trust:0},ok=>{settled++;result=ok;}));care.cancel();assert(!result&&!held);assert.equal(settled,2);
 for(const command of ['lesson','recall','pet'] as const){assert(care.interact(target,command,new T.Vector3(.5,0,0),{hunting:0,trust:0},ok=>result=ok));for(let i=0;i<1800&&care.active;i++)care.update(1/60,i/60);assert(result&&!care.active&&!held,command);}
 care.dispose();
}
assert.equal(cabinTarget(CABIN_BED.x+1,CABIN_BED.z)?.type,'bed');
assert.equal(cabinTarget(CABIN_CHEST.x-1,CABIN_CHEST.z)?.type,'chest');
for(const slot of RACK_SLOTS)assert.equal(cabinTarget(slot.x,slot.z+.6)?.type,'rack');
console.log('PASS: '+kinds.length*2+' original marine variants, all 9 seafood pursuit/feeding animations, cancellation/disposal, keeper interactions, accessible cabin rack/bed/chest.');
