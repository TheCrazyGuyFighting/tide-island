import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as T from 'three';
import {GLTFLoader} from 'three/examples/jsm/loaders/GLTFLoader.js';
import {IslandPhysics,createBody} from '../lib/island-physics';
import {waterSurface,immersion,type Outfit} from '../lib/island-water';
import {riverAt} from '../lib/island-world';
import {FishingGame,type FishAgent} from '../lib/island-fishing';
import {Spearfishing,spearCandidate} from '../lib/island-spearfishing';
import {ShopInventory,basketQuote} from '../lib/island-shop';
import {createSpeargunActor,loadSpeargunAsset} from '../lib/island-speargun-model';
import {MARKET_SPOTS} from '../lib/island-market-layout';

for(const [outfit,depth,dead] of [['regular',.95,false],['regular',1.01,true],['waders',1.29,false],['waders',1.32,true],['scuba',4,false]] as [Outfit,number,boolean][]){
  const b=createBody();Object.assign(b,{x:15,z:19,y:-depth,peak:-depth});const p=new IslandPhysics([],()=>-depth,()=>false);
  p.update(b,0,0,.05,false,{outfit,vertical:0});assert.equal(!!b.dead,dead,`${outfit} at ${depth} m`);
}
const stream=riverAt(.4),surface=waterSurface(stream.x,stream.z);assert(surface!==null&&surface>5,'Stream water must be detected above sea level');assert(Math.abs(immersion(stream.x,surface-.7,stream.z)-.7)<.0001);
const diver=createBody();Object.assign(diver,{x:15,z:19,y:-2.2,peak:-2.2,grounded:false});const water=new IslandPhysics([],()=>-5,()=>false);
for(let i=0;i<60;i++)water.update(diver,0,0,1/60,false,{outfit:'scuba',vertical:-2.2});assert(diver.y<-4&&diver.health===100,'Scuba descends without drowning');
for(let i=0;i<180;i++)water.update(diver,0,0,1/60,false,{outfit:'scuba',vertical:2.2});assert(diver.y>=-.83&&diver.y<=-.81,'Scuba rises to a stable surface position');
const block=new IslandPhysics([{kind:'rock',x:15,y:-2,z:17,rx:.8,ry:2,rz:.8}],()=>-5,()=>false);Object.assign(diver,{x:15,y:-2.2,z:19});for(let i=0;i<100;i++)block.update(diver,0,-3,1/60,false,{outfit:'scuba',vertical:0});assert(diver.z>18,'Diver cannot swim through submerged rocks');
const fish:FishAgent={id:'test-kingfish',name:'Kingfish',position:{x:15,y:-2,z:19},target:null,caught:false,catchable:true,clearance:.2,length:1,value:48,weight:1};
const origin={x:15,y:-2,z:25},direction={x:0,y:0,z:-1};assert.equal(spearCandidate([fish],origin,direction,()=>false),fish);assert.equal(spearCandidate([fish],origin,direction,()=>true),null,'No shooting through obstacles');
assert.equal(spearCandidate([{...fish,catchable:false}],origin,direction,()=>false),null,'Protected creatures cannot be speared');
assert.equal(spearCandidate([fish],origin,{x:1,y:0,z:0},()=>false),null,'A miss is not a catch');
const fishing=new FishingGame([fish]),spear=new Spearfishing([fish],()=>false,f=>fishing.claimSpearCatch(f));
assert(spear.fire(origin,direction));assert(!spear.fire(origin,direction),'No firing while reloading');assert.equal(fishing.catches,0);
for(let i=0;i<310;i++)spear.update(1/60,origin);
assert.equal(fishing.catches,1);assert.equal(fishing.coins,298);assert.equal(fishing.fishInBag,1);assert.equal(spear.phase,'ready');assert.equal(fish.landing,null);assert.equal(fish.target,null);
assert(spear.fire(origin,direction));for(let i=0;i<310;i++)spear.update(1/60,origin);assert.equal(fishing.catches,1,'Same fish cannot reward twice');
const inventory=new ShopInventory(),wallet={coins:1500};for(const id of ['speargun','waders','scuba'])assert(inventory.addToBasket(id).ok);const price=basketQuote(inventory.basket).total;assert(inventory.checkout(wallet).ok);assert.equal(wallet.coins,1500-price);assert.equal(inventory.activeItem,'speargun');
inventory.equip('scuba');assert.equal(inventory.outfit,'scuba');assert.equal(inventory.activeItem,'speargun','Clothing must not replace the held gun');inventory.equip('waders');assert.equal(inventory.outfit,'waders');inventory.equip('waders');assert.equal(inventory.outfit,'regular');
for(const id of ['speargun','waders','scuba']){const s=MARKET_SPOTS.find(s=>s.id===id)!;assert(MARKET_SPOTS.every(o=>o===s||Math.hypot(o.x-s.x,o.z-s.z)>3.5),'Separate reachable gear displays');}
GLTFLoader.prototype.loadAsync=async function(url:string){const b=fs.readFileSync(`public${url}`),loader=new GLTFLoader();loader.register(()=>({name:'TEST_TEXTURES',loadTexture:()=>Promise.resolve(new T.Texture())}));return loader.parseAsync(b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength),'');};
const asset=await loadSpeargunAsset();assert.deepEqual(asset.animations.map(a=>a.name).sort(),['Fire','Idle','Reload']);assert(asset.scene.getObjectByName('Spear'));
const actor=await createSpeargunActor(),other=await createSpeargunActor();actor.update('ready',0,0);actor.root.updateMatrixWorld(true);
const bone=actor.root.getObjectByName('Spear')!,start=bone.getWorldPosition(new T.Vector3());actor.update('firing',.799,0);actor.root.updateMatrixWorld(true);const fired=bone.getWorldPosition(new T.Vector3());
assert(fired.distanceTo(start)>3,'The supplied Fire clip must move the real spear bone');actor.update('reloading',2.599,0);actor.root.updateMatrixWorld(true);assert(bone.getWorldPosition(new T.Vector3()).distanceTo(start)<.02,'Reload returns the spear to its loaded pose');assert.notEqual(other.root.getObjectByName('Spear'),bone,'First/third views have independent skeletons');
console.log('PASS: waist/chest depth limits, river wading, scuba descent/ascent and collision; aimed spear hits, blocked shots, reload, one reward per fish; 3 physical shop items, independent outfits; real supplied GLB Fire/Reload skeleton animation.');
