import assert from 'node:assert/strict';
import * as T from 'three';
import { addPetHomes } from '../lib/island-pet-homes';
import { addPetGate } from '../lib/island-pet-gate';
import { PetBehaviour,petPositionSafe } from '../lib/island-pet-motion';
import { IslandPhysics,createBody,colliderBlocks } from '../lib/island-physics';
import { AVIARY,HOME_GATES,nearPetGate,homeDeck } from '../lib/island-home-layout';
import { PETS,isAquaticPet } from '../lib/island-shop';
import { walkingHeight } from '../lib/island-world';
import type {PetHome} from '../lib/island-home-layout';

// Labels need a canvas, not a WebGL context, for these scene/physics regression checks.
Object.assign(globalThis,{document:{createElement:()=>({width:0,height:0,getContext:()=>({fillRect(){},strokeRect(){},fillText(){}})})}});
const built=new Set<PetHome>(),physics=new IslandPhysics([],(x,z)=>walkingHeight(x,z,built)),homes=addPetHomes(new T.Scene(),physics,()=>false,built);
homes.apply({owned:['bird-home','sea-home'],activeItem:'rod',hookEquipped:false,equippedLure:null});
const tick=()=>{for(let i=0;i<70;i++)homes.update(i/60,1/60);};
for(const home of ['birds','sea'] as const){
  const p=HOME_GATES[home];assert.equal(nearPetGate(p.x,p.z,built),home);
  assert(physics.blocked(p.x,p.y,p.z,false),home+' gate must block when closed');
  homes.toggleGate(home);tick();
  assert(!physics.blocked(p.x,p.y,p.z,false),home+' doorway must be clear when open');
  const c=homes.gates[home].collider;assert(physics.blocked(c.x,p.y,c.z,false),'The open leaf still has collision');
}
const b=createBody();Object.assign(b,{x:-46.4,y:AVIARY.y,z:45,peak:AVIARY.y});
for(let i=0;i<75;i++)physics.update(b,-3,0,1/60,false);
assert(b.x<-49.6,'Walk into the aviary through its door');assert.equal(b.health,100);
Object.assign(b,{x:-53,y:2.23,z:67.4,peak:2.23,vy:0,grounded:true});
for(let i=0;i<120;i++)physics.update(b,0,3,1/60,false);
assert(b.z>70.8&&b.z<71.3,'Keeper platform is reachable and stops at its railing');assert.equal(b.health,100);
assert.equal(homeDeck(-53,70.8,built),2.23);
for(const home of ['birds','sea'] as const){homes.toggleGate(home);tick();const p=HOME_GATES[home];assert(physics.blocked(p.x,p.y,p.z,false),'Closing restores collision');}

const gate=addPetGate(new T.Group(),new IslandPhysics([],()=>0,()=>false),'test',0,0,0,2,2.6,0);
const obstruction={x:.85,y:0,z:.85};gate.toggle();
for(let i=0;i<80;i++)gate.update(1/60,obstruction);
assert(gate.paused,'Gate must pause before pushing through a player');assert(!colliderBlocks(gate.collider,.85,0,.85));
for(let i=0;i<80;i++)gate.update(1/60,{x:5,y:0,z:5});
assert(!gate.paused);assert(Math.abs(gate.pivot.rotation.y+Math.PI/2)<.001);
gate.toggle();for(let i=0;i<80;i++)gate.update(1/60,obstruction);
assert(gate.paused,'Closing also checks the swept arc');
for(let i=0;i<80;i++)gate.update(1/60,{x:5,y:0,z:5});assert(Math.abs(gate.pivot.rotation.y)<.001);

for(const {id} of PETS){
  const pet=new T.Group(),brain=new PetBehaviour(id),last=new T.Vector3();let travelled=0;const range=new T.Box3(),actions=new Set<string>();
  for(let i=0;i<3600;i++){
    brain.update(1/60);brain.apply(pet);actions.add(brain.action);assert(petPositionSafe(id,pet.position.x,pet.position.z,brain.position.y));assert(pet.position.toArray().every(Number.isFinite));
    if(i){const delta=pet.position.distanceTo(last);assert(delta<.08,id+' must never teleport');travelled+=delta;}
    last.copy(pet.position);range.expandByPoint(pet.position);
    if(isAquaticPet(id)){assert(pet.position.x>-59&&pet.position.x<-46.5&&pet.position.z>70&&pet.position.z<78);assert(pet.position.y<0);}
    else {assert(Math.abs(pet.position.x-AVIARY.x)<5&&Math.abs(pet.position.z-AVIARY.z)<4);assert(pet.position.y>=AVIARY.y&&pet.position.y<AVIARY.y+4);}
  }
  assert(travelled>8,id+' must visibly roam rather than idle in place');assert(actions.size>=2,id+' must have different behaviours');assert(range.getSize(new T.Vector3()).length()>2,id+' must explore a substantial area');
}
console.log('PASS: both working gates, open-leaf collision, anti-crush pause/resume, walkable entrances, railed sea platform, and 10 varied, bounded pet behaviours.');
