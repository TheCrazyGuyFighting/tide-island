import assert from 'node:assert/strict';
import * as T from 'three';
import {ShopInventory} from '../lib/island-shop';
import {homeCapacity,MAX_HABITAT_EXPANSION} from '../lib/island-habitat-types';
import {habitatLayout,InstalledHomes,homeDeck,nearHome,nearPetGate} from '../lib/island-home-layout';
import {buildHabitat} from '../lib/island-habitat-model';
import {seaSwimPoint} from '../lib/island-sea-pet-motion';
import {IslandPhysics,createBody} from '../lib/island-physics';
import {DISTANT_ISLANDS,distantLanding,distantGround,distantTerrain} from '../lib/island-destinations';
import {buildDistantIslands} from '../lib/island-distant-world';
import {createVessel,navigable,stepVessel,safeDisembark} from '../lib/island-vessels';
import {walkingHeight,terrainHeight,groundHeight} from '../lib/island-world';
import {advancementSnapshot} from '../lib/island-advancements';

Object.assign(globalThis,{document:{createElement:()=>({width:0,height:0,getContext:()=>({fillRect(){},strokeRect(){},fillText(){}})})}});
T.TextureLoader.prototype.load=function(){return new T.Texture();};
for(const home of ['birds','sea'] as const){
  const inv=new ShopInventory(),money={coins:100000};
  assert(!inv.expandHabitat(home,1,money).ok,'Must own the habitat');
  assert(inv.buy(`${home==='birds'?'bird':'sea'}-home`,money).ok);
  const start=money.coins,before=homeCapacity(inv.snapshot(),home);
  assert(!inv.expandHabitat(home,1,{coins:19}).ok);assert.equal(inv.homeExpansions[home],undefined);
  for(const invalid of [0,-1,1.5,NaN,Infinity,MAX_HABITAT_EXPANSION[home]+1])assert(!inv.expandHabitat(home,invalid,money).ok);
  assert.equal(money.coins,start,'Rejected expansions must not spend coins');
  assert(inv.expandHabitat(home,1,money).ok);assert.equal(start-money.coins,20);
  assert(inv.expandHabitat(home,24,money).ok);assert.equal(start-money.coins,500);
  assert.equal(homeCapacity(inv.snapshot(),home),before+(home==='birds'?5:1));
  const h=habitatLayout(home,'prime',25),base=habitatLayout(home,'prime');
  assert(Math.abs(h.area-base.area-25)<1e-8,'Every purchased tile must add exactly one square metre');
  assert(Math.abs(h.x+h.rx-base.x-base.rx)<1e-8,'Preserve the east boundary by the harbour');
  const built=new InstalledHomes([home]);built.tiers[home]='prime';built.homeExpansions[home]=25;
  assert.equal(nearHome(h.care.x,h.care.z,built),home);assert.equal(nearPetGate(h.gate.x,h.gate.z,built),home);assert.equal(homeDeck(h.gate.x,h.gate.z,built),h.y);
  const physics=new IslandPhysics([]),model=buildHabitat(home,'prime',physics,25);model.setEnabled(true);
  assert(physics.blocked(h.gate.x,h.y,h.gate.z,false),'Expanded gate must collide');
  assert(model.root.getObjectByName(`pet-gate-${home}`));model.dispose();assert.equal(physics.colliders.length,0,'Resizing must remove old collider allocations');
  const owned=[...inv.owned];assert(inv.buy(`${home==='birds'?'bird':'sea'}-home-premium`,money).ok);assert.equal(inv.homeExpansions[home],25);assert(owned.every(id=>inv.owned.has(id)));
  assert(inv.expandHabitat(home,MAX_HABITAT_EXPANSION[home]-25,money).ok);const balance=money.coins;assert(!inv.expandHabitat(home,1,money).ok);assert.equal(money.coins,balance);
  if(home==='sea'){const bounds=habitatLayout(home,'premium',192);for(const x of [-58,-52,-48]){const p=seaSwimPoint(new T.Vector3(x,-1,76),'premium',192);assert(p.x>bounds.x-bounds.rx&&p.x<bounds.x+bounds.rx);assert(p.z>bounds.z-bounds.rz&&p.z<bounds.z+bounds.rz);}}
}
console.log('PASS: exact 20-coin tiles, no charge on rejected purchases, larger capacity, working walls/gates, preserved upgrades and expanded swim bounds.');

const scene=new T.Scene(),world=buildDistantIslands(scene,true),physics=new IslandPhysics(world.colliders),homes=new InstalledHomes();
assert.equal(world.roots.length,3);
for(const island of DISTANT_ISLANDS){
  const approach=distantLanding(island),beach=distantLanding(island,true);
  assert(Math.hypot(island.x,island.z)>1500);assert(groundHeight(beach.x,beach.z)>.2);
  assert.equal(terrainHeight(beach.x,beach.z),distantTerrain(island,beach.x,beach.z));
  const ground=world.roots.find(root=>root.name.endsWith(island.id))!.children[0] as T.Mesh;
  const vertices=ground.geometry.attributes.position;
  for(let i=0;i<vertices.count;i+=131){const x=vertices.getX(i),z=vertices.getZ(i);assert(Math.abs(vertices.getY(i)-distantGround(island,x,z))<.0001);}
  const boat=createVessel('speed-boat');Object.assign(boat,{x:approach.x,y:0,z:approach.z,aboard:true});
  assert(navigable(boat,boat.x,boat.z,0,homes,physics),'Landing approach must be navigable');
  boat.yaw=Math.atan2(-(beach.x-boat.x),-(beach.z-boat.z));
  for(let i=0;i<600;i++)stepVessel(boat,.15,0,1/60,i/60,homes,physics);
  boat.speed=0;const shore=safeDisembark(boat,physics,homes);assert(shore,`${island.name}: boat can land`);
  const body=createBody();Object.assign(body,shore,{peak:shore.y});const distanceBefore=Math.hypot(body.x-island.x,body.z-island.z);
  const dx=island.x-body.x,dz=island.z-body.z,len=Math.hypot(dx,dz);
  for(let i=0;i<120;i++)physics.update(body,dx/len*2,dz/len*2,1/60,false);
  assert(Math.hypot(body.x-island.x,body.z-island.z)<distanceBefore-1,`${island.name}: walk inland without old boundary blocking`);assert.equal(body.health,100);
  console.log(`PASS: ${island.name} has matching visible/physical terrain, boat landing and walkable beach.`);
}
const start={catches:0,meals:0,raisedBirds:0,raisedSea:0,expandedArea:0,boats:0,discovered:[] as string[]};
assert.equal(advancementSnapshot(start).xp,0);
const mid=advancementSnapshot({...start,expandedArea:5,boats:1});assert.equal(mid.completed,2);assert.equal(mid.xp,100);
const complete={catches:10,meals:5,raisedBirds:2,raisedSea:1,expandedArea:25,boats:1,discovered:['rainforest',...DISTANT_ISLANDS.map(i=>i.id)]};
const all=advancementSnapshot(complete);assert.equal(all.completed,12);assert.equal(all.xp,1250);assert.equal(all.totalXp,all.xp);
assert.deepEqual(advancementSnapshot(complete),all,'Repeated frames cannot award extra XP');
console.log('PASS: advancement bar reflects real milestones and completes at 12 / 12 without repeat rewards.');
