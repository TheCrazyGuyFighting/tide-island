import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as T from 'three';
import {GLTFLoader} from 'three/examples/jsm/loaders/GLTFLoader.js';
import {OBJLoader} from 'three/examples/jsm/loaders/OBJLoader.js';
import {ShopInventory,isPelican,hotbarItems,basketQuote,SHOP_ITEMS} from '../lib/island-shop';
import {MARKET_SPOTS,spotInReach} from '../lib/island-market-layout';
import {MenhadenFeeding} from '../lib/island-menhaden-feeding';
import {addPetHomes} from '../lib/island-pet-homes';
import {IslandPhysics} from '../lib/island-physics';
import {habitatLayout} from '../lib/island-home-layout';

Object.assign(globalThis,{document:{createElement:()=>({width:0,height:0,getContext:()=>({fillRect(){},strokeRect(){},fillText(){}})})}});
GLTFLoader.prototype.loadAsync=async function(url:string){const b=fs.readFileSync('public'+url),l=new GLTFLoader();l.register(()=>({name:'TEST_TEXTURES',loadTexture:()=>Promise.resolve(new T.Texture())}));return l.parseAsync(b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength),'');};
OBJLoader.prototype.loadAsync=async function(url:string){return this.parse(fs.readFileSync('public'+url,'utf8'));};
T.TextureLoader.prototype.loadAsync=async()=>new T.Texture();
const inv=new ShopInventory(),money={coins:10000};
for(const id of ['bird-home','pet-white-pelican','pet-white-pelican','pet-brown-pelican','pet-seagull'])assert(inv.buy(id,money).ok);
for(let i=0;i<4;i++)assert(inv.addToBasket('menhaden').ok);
const quote=basketQuote(inv.basket);assert.equal(quote.shipping,0);assert.equal(quote.discount,9);assert.equal(quote.total,87);
assert(!inv.checkout({coins:0}).ok);assert.equal(inv.menhaden,0);
assert(inv.checkout(money).ok);assert.equal(inv.menhaden,24);assert.equal(inv.activeItem,'menhaden');assert(hotbarItems(inv.snapshot()).includes('menhaden'));
assert(isPelican('pet-white-pelican#2')&&isPelican('pet-brown-pelican'));
for(const id of ['pet-seagull','pet-dolphin','pet-sea-lion','pet-heron','pet-white-pelican#99']){assert(!inv.reserveMenhaden(id).ok);assert.equal(inv.menhaden,24);}
const cancelled=inv.reserveMenhaden('pet-white-pelican');assert(cancelled.ok);cancelled.settle!(false);cancelled.settle!(false);assert.equal(inv.menhaden,24);
const reserve=inv.reserveMenhaden('pet-white-pelican#2');reserve.settle!(true);reserve.settle!(true);assert.equal(inv.petMeals['pet-white-pelican#2'],1);assert.equal(inv.menhaden,23);
assert.equal(inv.foodPortions,0,'Menhaden cannot become generic food');
const spot=MARKET_SPOTS.find(p=>p.id==='menhaden')!;assert(spot.vendor.startsWith('Isla'));assert(spotInReach(spot,spot.approachX,spot.approachZ));
assert.equal(SHOP_ITEMS.find(i=>i.id==='menhaden')!.price,24);

for(const tier of ['basic','standard','prime','premium'] as const){
  const scene=new T.Scene(),homes=addPetHomes(scene,new IslandPhysics([]),()=>false),local=new ShopInventory(),wallet={coins:10000};
  for(const id of [tier==='prime'?'bird-home':'bird-home-'+tier,'pet-white-pelican','pet-brown-pelican','menhaden'])assert(local.buy(id,wallet).ok);
  await homes.prepare(['pet-white-pelican','pet-brown-pelican']);homes.apply(local.snapshot());
  const meal=new MenhadenFeeding(scene),h=habitatLayout('birds',tier);
  for(const id of ['pet-white-pelican','pet-brown-pelican']){
    const recipient=homes.mealTarget(id)!;assert(recipient);const receipt=local.reserveMenhaden(id),count=local.menhaden;
    assert(meal.start(recipient,()=>new T.Vector3(h.care.x,h.y+1.2,h.care.z),receipt.settle!));
    assert(!meal.start(recipient,()=>new T.Vector3(),()=>{}),'One throw at a time');
    let flew=false,landed=false,swallowed=false;const drop=recipient.dropPoint();
    for(let frame=0;frame<900&&meal.active;frame++){
      homes.update(frame/60,1/60);meal.update(1/60);
      assert(meal.fish.position.toArray().every(Number.isFinite));
      if(meal.released&&meal.elapsed<1.1)flew=true;
      if(meal.elapsed>1.24&&meal.elapsed<1.5){assert(Math.abs(meal.fish.position.y-drop.y)<.04);landed=true;}
      if(meal.elapsed>2.15&&meal.elapsed<2.3){assert(meal.fish.position.distanceTo(recipient.mouth())<.025);swallowed=true;}
    }
    assert(!meal.active&&flew&&landed&&swallowed,tier+' '+id+' needs the complete toss/pickup/swallow');
    assert.equal(local.menhaden,count);assert.equal(local.petMeals[id],1);assert(!meal.fish.visible);
    homes.apply(local.snapshot());
  }
  const r=local.reserveMenhaden('pet-white-pelican'),before=local.menhaden;
  meal.start(homes.mealTarget('pet-white-pelican')!,()=>new T.Vector3(),r.settle!);meal.cancel();meal.cancel();
  assert.equal(local.menhaden,before+1);assert.equal(local.petMeals['pet-white-pelican'],1);
  const timeout=local.reserveMenhaden('pet-white-pelican'),stuck=homes.mealTarget('pet-white-pelican')!;
  meal.start({...stuck,ready:()=>false},()=>new T.Vector3(),timeout.settle!);
  for(let i=0;i<450;i++)meal.update(.05);
  assert(!meal.active);assert.equal(local.menhaden,before+1,'A failed landing refunds the reserved fish');
  meal.dispose();homes.dispose();
}
const empty=new ShopInventory();assert(!empty.reserveMenhaden('pet-white-pelican').ok);
console.log('PASS: Isla stock, repeat purchases, exact pack counts/discounts, hotbar, pelican-only diet, both real pelican models in all 4 homes, animated arc/landing/bill pickup, one meal per fish, cancellation and timeout refunds.');
