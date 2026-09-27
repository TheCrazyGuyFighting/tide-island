import assert from 'node:assert/strict';
import * as T from 'three';
import {BirdCompanion,birdHuntTarget,birdStyle} from '../lib/island-bird-companion';
import {PETS,ShopInventory} from '../lib/island-shop';
import {terrainHeight} from '../lib/island-world';
import {IslandPhysics,createBody} from '../lib/island-physics';
import type {FishAgent} from '../lib/island-fishing';
import type {PetPose} from '../lib/island-pet-animation';
import {birdToolModel} from '../lib/island-bird-tools';
import {insideBirdAviary} from '../lib/island-home-layout';
import {addPetGate} from '../lib/island-pet-gate';
const owned=['bird-home','bird-glove','whistle',...PETS.map(p=>p.id)],hand={x:-45,y:4.5,z:45};
function fish(){const result:FishAgent[]=[];for(let x=-40;x<22;x+=2)for(let z=18;z<75;z+=2)if(terrainHeight(x,z)<-1.2)result.push({id:`${x},${z}`,name:'Reef fish',position:{x,y:-.6,z},target:null,caught:false,catchable:true,clearance:.2,length:.6,value:10,weight:.3});return result;}
for(const {id} of PETS.filter(p=>!['pet-sea-lion','pet-dolphin'].includes(p.id))){
  let now=0,meals=0,borrowed=0,returned=0;const root=new T.Group();root.position.set(-54,3.51,43);const poses:PetPose[]=[],stock=fish();
  const bird=new BirdCompanion({borrowBird:()=>{borrowed++;return {root,animate:(p:PetPose)=>poses.push({...p}),dispose(){}};},returnBird:()=>{returned++;}},stock,[],()=>meals++,()=>now);
  assert(bird.select(id,owned));assert(!bird.select('pet-dolphin',owned));assert(!bird.whistle(owned,false,true));assert.equal(borrowed,0,'Closed gate never releases a bird');
  assert(bird.whistle(owned,true,true));now+=.6;assert(bird.whistle(owned,true,true));assert(bird.snapshot().queued,'Early double whistle queues a hunt until perched');
  const phases=new Set<string>();for(let i=0;i<10000;i++){now+=1/60;for(const f of stock)if(f.target&&!f.caught){f.position.x+=(f.target.x-f.position.x)*.08;f.position.y+=(f.target.y-f.position.y)*.08;f.position.z+=(f.target.z-f.position.z)*.08;}bird.update(1/60,hand,0);phases.add(bird.phase);if(meals&&bird.phase==='perched')break;}
  assert.equal(meals,1,`${id} catches one actual fish using ${birdStyle(id)}`);assert.equal(stock.filter(f=>f.caught).length,1);assert.equal(borrowed,1);assert.equal(bird.phase,'perched');assert(phases.has('hunting')&&phases.has('eating')&&phases.has('returning'));assert(poses.some(p=>(p.flight??0)>.8)&&poses.some(p=>p.peck!==0));
  assert(bird.pet());assert(bird.snapshot().petting);assert(root.position.distanceTo(new T.Vector3(hand.x,hand.y,hand.z))<1.5);
  now+=4;bird.whistle(owned,true,true);now+=3;bird.whistle(owned,true,true);assert.equal(bird.phase,'perched','Exactly 3 seconds is not a double whistle');now+=2.999;bird.whistle(owned,true,true);assert.equal(bird.phase,'outbound','Less than 3 seconds sends hunt');bird.reset();assert.equal(returned,1);assert(stock.every(f=>!f.target&&!f.landing),'Reset clears reservations and held fish');assert.equal(bird.phase,'home');
  console.log(`PASS ${id}: open-gate call, animated ${birdStyle(id)} hunt, fish meal, glove return, petting, strict double-whistle timing, cleanup`);
}
assert.equal(birdHuntTarget('pet-osprey',fish().map(f=>({...f,catchable:false})),hand),null,'Protected animals are never targets');
const snorkeler=createBody();Object.assign(snorkeler,{x:15,z:19,y:-.82,grounded:false});const physics=new IslandPhysics([],()=>-6,()=>false);for(let i=0;i<360;i++)physics.update(snorkeler,1,0,1/60,false,{outfit:'snorkel',vertical:-2.2});assert.equal(snorkeler.health,100);assert(Math.abs(snorkeler.y+.82)<.001,'Snorkel stays afloat even when C is held');assert(snorkeler.x>20,'Snorkeling moves forward');
const inv=new ShopInventory(),wallet={coins:1000};assert(!inv.buy('whistle',wallet).ok);for(const id of ['bird-glove','whistle','snorkel'])assert(inv.addToBasket(id).ok);assert(inv.checkout(wallet).ok);inv.equip('bird-glove');inv.equip('snorkel');assert.equal(inv.outfit,'snorkel');assert.equal(inv.activeItem,'bird-glove');
for(const id of ['bird-glove','whistle']){const b=new T.Box3().setFromObject(birdToolModel(id));assert(b.max.distanceTo(b.min)>.1);}
console.log('PASS snorkeling surface movement and no diving, 3 purchasable items, independent outfit, glove/whistle geometry');
{
  let returned=0,now=0,ready=false;const root=new T.Group();root.position.set(-54,3.5,43);
  const companion=new BirdCompanion({borrowBird:()=>ready?{root,animate(){},dispose(){}}:null,returnBird:()=>returned++},fish(),[],()=>{},()=>now);
  companion.select('pet-seagull',owned);companion.update(1/60,{x:-56,y:5,z:44},0);
  assert(insideBirdAviary(-56,3.4,44));assert(!insideBirdAviary(-56,0,44));
  assert(!companion.whistle(owned,false,false,true),'A loading bird fails cleanly');now+=.2;ready=true;
  assert(companion.whistle(owned,false,false,true),'Retry after model load is a call, not a stray double whistle');
  assert.equal(companion.phase,'calling');
  for(let i=0;i<600;i++){now+=1/60;companion.update(1/60,{x:-56,y:5,z:44},0);assert(root.position.y<8.4,'Indoor call stays under aviary roof');}
  assert.equal(companion.phase,'perched','An indoor keeper can beckon with the gate closed');
  companion.whistle(owned,false,false,true);now+=.2;companion.whistle(owned,false,false,true);assert.equal(companion.phase,'perched','No hunting flight through a closed cage');
  companion.sendHome(false,false,true);for(let i=0;i<600;i++)companion.update(1/60,{x:-56,y:5,z:44},0);
  assert.equal(companion.phase,'home');assert.equal(returned,1);
  console.log('PASS indoor beckoning and return, closed-cage hunt guard, model-loading retry');
}
{
  const gate=addPetGate(new T.Group(),new IslandPhysics([]),'test',-48,3.4,44,2,2.65,-Math.PI/2);
  assert(!gate.ready);gate.toggle();assert(!gate.ready,'Opening intent is not a clear doorway');
  for(let i=0;i<120;i++)gate.update(1/60,{x:-49,y:3.4,z:45});
  assert(gate.paused&&!gate.ready,'Player in swinging arc pauses the gate');
  for(let i=0;i<120;i++)gate.update(1/60,{x:-46,y:3.4,z:45});
  assert(gate.ready&&!gate.paused,'Moving away lets the gate fully open');
  console.log('PASS gate-ready state and blocked-swing recovery');
}
