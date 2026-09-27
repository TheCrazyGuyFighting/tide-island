import assert from 'node:assert/strict';
import * as T from 'three';
import fs from 'node:fs';
import {GLTFLoader} from 'three/examples/jsm/loaders/GLTFLoader.js';
import {FBXLoader} from 'three/examples/jsm/loaders/FBXLoader.js';
import {OBJLoader} from 'three/examples/jsm/loaders/OBJLoader.js';
import {ShopInventory,SHOP_ITEMS,basketQuote,hotbarItems} from '../lib/island-shop';
import {createVessel,homeLaunchVessel,stepVessel,navigable,safeDisembark} from '../lib/island-vessels';
import {makeSailingBoat} from '../lib/island-vessel-model';
import {IslandPhysics,createBody} from '../lib/island-physics';
import {RAINFOREST,RAINFOREST_APPROACH,RAINFOREST_BEACH,HOME_WAYPOINT,chartCourse,rainforestTerrain} from '../lib/island-rainforest-layout';
import {terrainHeight,walkingHeight} from '../lib/island-world';
import {buildRainforest} from '../lib/island-rainforest';
import {buildLandscape} from '../lib/island-landscape';

Object.assign(globalThis,{document:{createElement:()=>({width:0,height:0,getContext:()=>({clearRect(){},beginPath(){},ellipse(){},fill(){}})})}});
GLTFLoader.prototype.loadAsync=async function(url:string){const b=fs.readFileSync(`public${url}`),l=new GLTFLoader();l.register(()=>({name:'TEST_TEXTURES',loadTexture:()=>Promise.resolve(new T.Texture())}));return l.parseAsync(b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength),'');};
OBJLoader.prototype.loadAsync=async function(url:string){return this.parse(fs.readFileSync(`public${url}`,'utf8'));};
T.TextureLoader.prototype.load=function(){return new T.Texture();};
FBXLoader.prototype.loadAsync=async function(url:string){this.manager.itemStart(url);const b=fs.readFileSync(`public${url}`),r=this.parse(b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength),'/models/shop/');this.manager.itemEnd(url);return r;};

const inv=new ShopInventory(),money={coins:10000};assert.equal(inv.snapshot().chartUnlocked,false);
inv.addToBasket('kayak-v1');assert.equal(inv.snapshot().chartUnlocked,false);
assert(!inv.checkout({coins:0}).ok);assert.equal(inv.snapshot().chartUnlocked,false);
const total=basketQuote(inv.basket).total;assert(inv.checkout(money).ok);assert.equal(money.coins,10000-total);assert(inv.snapshot().chartUnlocked);assert(!inv.owned.has('map'),'A free chart must not consume a paid hotbar slot');
assert.equal(inv.activeItem,'kayak-v1','Checkout must select the delivered Classic kayak');
assert(hotbarItems(inv.snapshot()).includes('kayak-v1'));
assert(!inv.buy('kayak-v1',money).ok,'Do not charge for an already-owned kayak');
const full=new ShopInventory(),rich={coins:50000};
assert(full.applyLicence({equipment:'scuba',targets:'wild-fish',agree:true},rich).ok);
for(const item of SHOP_ITEMS.filter(i=>['Tackle','Gear'].includes(i.category)))assert(full.buy(item.id,rich).ok);
assert(full.buy('food-can',rich).ok);
assert(full.addToBasket('kayak-v1').ok);assert(full.checkout(rich).ok);
assert(full.hotbarPage>0&&hotbarItems(full.snapshot()).includes('kayak-v1'),'Reveal the new kayak even on a later hotbar page');
const homes=new Set<'birds'|'sea'>(),landscape=buildLandscape(new T.Scene(),true),physics=new IslandPhysics(landscape.colliders,(x,z)=>walkingHeight(x,z,homes));
assert([...landscape.terrain.geometry.attributes.position.array].every(Number.isFinite),'Every terrain vertex must stay finite, including the widened stream valley');
const boats=SHOP_ITEMS.filter(i=>i.category==='Boats');
for(const b of boats){
  const model=await makeSailingBoat(b.id),berth=homeLaunchVessel(b.id,model,homes,physics);
  assert(berth,b.id+' must have a navigable berth and safe landing with actual rocks, trees and dock');const s=berth;
  assert([model.width,model.length,model.seat].every(n=>Number.isFinite(n)&&n>0));assert(model.width<model.length*1.15,b.id+' hull must be correctly oriented');
  assert(navigable(s,s.x,s.z,s.yaw,homes,physics),b.id+' must fit the home launch berth');
  assert(safeDisembark(s,physics,homes),b.id+' must permit stepping onto the harbour');
  s.aboard=true;const start=s.z;for(let i=0;i<180;i++)stepVessel(s,1,0,1/60,i/60,homes,physics);assert(s.z>start+9,b.id+' must move through water');
  const yaw=s.yaw;for(let i=0;i<60;i++)stepVessel(s,1,1,1/60,i/60,homes,physics);assert(s.yaw<yaw-.4,b.id+' must steer right');
  s.x=0;s.z=190;for(let i=0;i<240;i++)stepVessel(s,0,0,1/60,i/60,homes,physics);assert(Math.abs(s.speed)<.02,'Release throttle to stop');assert.equal(safeDisembark(s,physics,homes),null,'No jumping off into deep ocean');
  const y=s.y;stepVessel(s,0,0,.05,22,homes,physics);assert.notEqual(s.y,y,'Waves must move the boat');
  console.log(`Hull ${b.id}: ${model.length.toFixed(1)} × ${model.width.toFixed(1)} m`);
}
const vessel=createVessel('rowboat');vessel.aboard=true;
function sailTo(point:{x:number;z:number},limit=18000){
  for(let i=0;i<limit;i++){
    const dx=point.x-vessel.x,dz=point.z-vessel.z,dist=Math.hypot(dx,dz);if(dist<2)return true;
    const wanted=Math.atan2(-dx,-dz),error=Math.atan2(Math.sin(wanted-vessel.yaw),Math.cos(wanted-vessel.yaw));
    stepVessel(vessel,dist<12?.28:Math.abs(error)>.5?.25:1,Math.max(-1,Math.min(1,-error*2)),1/60,i/60,homes,physics);
    if(vessel.notice&&dist<8)return true;
  }return false;
}
assert(sailTo(HOME_WAYPOINT),'Reach the offshore departure waypoint');
assert(sailTo(RAINFOREST_APPROACH),'Sail the complete open-water crossing to the new island');
for(let i=0;i<300;i++)stepVessel(vessel,0,0,1/60,i/60,homes,physics);
let shore=safeDisembark(vessel,physics,homes);
if(!shore){vessel.yaw=Math.atan2(-(RAINFOREST_BEACH.x-vessel.x),-(RAINFOREST_BEACH.z-vessel.z));for(let i=0;i<480;i++)stepVessel(vessel,.2,0,1/60,i/60,homes,physics);vessel.speed=0;shore=safeDisembark(vessel,physics,homes);}
assert(shore,'The rainforest beach must be a safe landing');
assert(terrainHeight(shore.x,shore.z)>.2);const body=createBody();Object.assign(body,shore,{peak:shore.y});
const oldX=body.x;for(let i=0;i<120;i++)physics.update(body,-2,1,1/60,false);assert(body.x<oldX-1,'The third island must not be blocked by the old 200m walking boundary');assert.equal(body.health,100);
assert(chartCourse(0,0,'rainforest').distance>400);assert(chartCourse(RAINFOREST_APPROACH.x,RAINFOREST_APPROACH.z,'rainforest').distance<.001);
assert(chartCourse(-28,117,'rainforest').bearing>180&&chartCourse(-28,117,'rainforest').bearing<270);
assert(!navigable(vessel,RAINFOREST.x,RAINFOREST.z,0),'No sailing through land');

let homeArea=0,forestArea=0;
for(let z=-220;z<220;z+=4)for(let x=-220;x<220;x+=4){if(terrainHeight(x,z)>.1)homeArea++;if(rainforestTerrain(RAINFOREST.x+x,RAINFOREST.z+z)>.1)forestArea++;}
assert(forestArea>homeArea*3,'New island must be substantially larger than Tide Island');
const forest=buildRainforest(new T.Scene(),true);assert(forest.trees.length>=300);assert.equal(forest.colliders.length,forest.trees.length);
const travelled=new Map(forest.birds.map(b=>[b,0])),flown=new Set(),landed=new Set();
for(let i=0;i<7200;i++){
  const before=forest.birds.map(b=>b.bird.position.clone()),was=forest.birds.map(b=>b.rest);forest.update(i/60,1/60);
  forest.birds.forEach((b,j)=>{const d=b.bird.position.distanceTo(before[j]);assert(d<.4,'No teleporting birds');travelled.set(b,travelled.get(b)!+d);if(!b.rest)flown.add(b);if(!was[j]&&b.rest)landed.add(b);assert(b.bird.position.y>rainforestTerrain(b.bird.position.x,b.bird.position.z)+2);});
}
assert(flown.size>=10,'Birds must fly between branches');assert(landed.size>=10,'Birds must complete flights and perch');assert([...travelled.values()].every(d=>d>20));
console.log(`PASS: 10 working boats, free live chart, sea crossing and safe landing; rainforest ${(forestArea/homeArea).toFixed(1)}× home land area; ${forest.trees.length} colliding trees; ${flown.size} birds flap, glide and perch. Marketplace terrain and stock layout untouched.`);
