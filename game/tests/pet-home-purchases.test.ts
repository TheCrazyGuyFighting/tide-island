import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as T from 'three';
import {GLTFLoader} from 'three/examples/jsm/loaders/GLTFLoader.js';
import {addPetHomes} from '../lib/island-pet-homes';
import {IslandPhysics} from '../lib/island-physics';
import {AVIARY,HOME_ITEMS,HOME_GATES,CARE_POINTS,homeDeck,nearHome,nearPetGate,type PetHome} from '../lib/island-home-layout';
import {walkingHeight} from '../lib/island-world';
import {ShopInventory,SHOP_ITEMS,PETS,isAquaticPet,hotbarItems,basketQuote,shippingFee} from '../lib/island-shop';
import {loadIslandModel} from '../lib/island-models';
import {cashierAdvice} from '../lib/island-cashier';

Object.assign(globalThis,{document:{createElement:()=>({width:0,height:0,getContext:()=>({fillRect(){},strokeRect(){},fillText(){}})})}});
GLTFLoader.prototype.loadAsync=async function(url:string){
  const bytes=fs.readFileSync(`public${url}`),loader=new GLTFLoader();
  loader.register(()=>({name:'TEST_TEXTURES',loadTexture:()=>Promise.resolve(new T.Texture())}));
  return loader.parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'');
};
T.TextureLoader.prototype.loadAsync=async()=>new T.Texture();

function newGame(){
  const built=new Set<PetHome>(),physics=new IslandPhysics([],(x,z)=>walkingHeight(x,z,built),()=>false);
  const homes=addPetHomes(new T.Scene(),physics,()=>false,built),inventory=new ShopInventory();
  homes.apply(inventory.snapshot());return {built,physics,homes,inventory};
}
function assertAbsent(game:ReturnType<typeof newGame>,home:PetHome){
  const p=HOME_GATES[home],care=CARE_POINTS[home];
  assert.equal(game.homes.groups[home].visible,false);
  assert.equal(game.homes.installed(home),false);
  assert.equal(game.homes.gates[home].collider.enabled,false);
  assert.equal(game.homes.toggleGate(home),false);
  assert.equal(game.physics.blocked(p.x,p.y,p.z,false),false,'An unbought gate must not collide');
  assert.equal(nearPetGate(p.x,p.z,game.built),null);
  assert.equal(nearHome(care.x,care.z,game.built),null);
  assert.equal(homeDeck(p.x,p.z,game.built),null,'No invisible home decks');
}
const game=newGame(),{inventory,homes,physics,built}=game,wallet={coins:2000};
assertAbsent(game,'birds');assertAbsent(game,'sea');
assert(physics.colliders.length>0);assert(physics.colliders.every(c=>c.enabled===false));
assert(walkingHeight(-53,70.8,built)<0,'The unbought keeper platform must remain water, not an invisible floor');
assert.equal(physics.blocked(AVIARY.x-6,AVIARY.y,AVIARY.z,false),false);
assert.match(cashierAdvice(inventory.snapshot(),250,'pets'),/bought separately/);

// Loading a pet or adding a home to the basket cannot install anything before payment.
await homes.prepare(['pet-seagull']);
homes.apply({...inventory.snapshot(),owned:['pet-seagull']});
assert.equal(homes.residentCount(),0);
assert(inventory.addToBasket(HOME_ITEMS.birds).ok);homes.apply(inventory.snapshot());
assertAbsent(game,'birds');
const tooPoor={coins:249};assert(!inventory.checkout(tooPoor).ok);assert.equal(tooPoor.coins,249);
homes.apply(inventory.snapshot());assertAbsent(game,'birds');

assert(inventory.checkout(wallet).ok);assert.equal(wallet.coins,1750);homes.apply(inventory.snapshot());
assert(homes.groups.birds.visible);assert(homes.installed('birds'));assertAbsent(game,'sea');
assert(physics.blocked(AVIARY.x-6,AVIARY.y,AVIARY.z,false));
assert(physics.blocked(HOME_GATES.birds.x,AVIARY.y,HOME_GATES.birds.z,false));
assert.equal(homeDeck(-53,43,built),AVIARY.y);
assert.equal(nearHome(CARE_POINTS.birds.x,CARE_POINTS.birds.z,built),'birds');
const children=homes.groups.birds.children.length,colliderCount=physics.colliders.length;
homes.apply(inventory.snapshot());assert.equal(homes.groups.birds.children.length,children);assert.equal(physics.colliders.length,colliderCount);
assert(!inventory.buy(HOME_ITEMS.birds,wallet).ok);assert.equal(wallet.coins,1750);
assert(!inventory.equip(HOME_ITEMS.birds).ok);assert.deepEqual(hotbarItems(inventory.snapshot()),['rod']);
assert(!inventory.buy('pet-dolphin',wallet).ok,'A bird home cannot house a dolphin');assert.equal(wallet.coins,1750);
assert(inventory.buy('pet-seagull',wallet).ok);homes.apply(inventory.snapshot());
assert.equal(homes.residentCount(),1);assert(homes.groups.birds.getObjectByName('resident-pet-seagull'));
homes.apply(inventory.snapshot());assert.equal(homes.residentCount(),1);

assert(inventory.buy(HOME_ITEMS.sea,wallet).ok);homes.apply(inventory.snapshot());
assert(homes.groups.sea.visible);assert(homes.installed('sea'));assert.equal(homeDeck(-53,70.8,built),2.23);
assert(physics.blocked(HOME_GATES.sea.x,HOME_GATES.sea.y,HOME_GATES.sea.z,false));
assert.deepEqual(hotbarItems(inventory.snapshot()),['rod']);
assertAbsent(newGame(),'birds');assertAbsent(newGame(),'sea');

for(const pet of PETS){
  const inv=new ShopInventory(),money={coins:5000},home=HOME_ITEMS[isAquaticPet(pet.id)?'sea':'birds'];
  assert.equal(SHOP_ITEMS.find(i=>i.id===pet.id)?.requires,home);
  assert(!inv.buy(pet.id,money).ok);assert.equal(money.coins,5000);
  assert(inv.addToBasket(pet.id).ok);assert(!inv.checkout(money).ok);assert.equal(money.coins,5000);
  assert.match(cashierAdvice(inv.snapshot(),money.coins,'next'),/needs/);
  assert(inv.addToBasket(home).ok);inv.removeFromBasket(home);
  assert(!inv.checkout(money).ok,'Removing a required home must invalidate the order');assert.equal(money.coins,5000);
  assert(inv.addToBasket(home).ok);const quote=basketQuote(inv.basket);
  assert.equal(quote.shipping,Math.ceil(pet.price*.15));
  assert(inv.checkout(money).ok,'Home and pet can be delivered in the same order');
  assert.equal(money.coins,5000-quote.total);assert(inv.owned.has(home));assert(inv.owned.has(pet.id));
  assert.deepEqual(hotbarItems(inv.snapshot()),['rod']);
  const food={fishInBag:1};assert(inv.feedPet(pet.id,food,false).ok);assert.equal(food.fishInBag,0);
}
const seaFirst=newGame();assert(seaFirst.inventory.buy(HOME_ITEMS.sea,{coins:600}).ok);seaFirst.homes.apply(seaFirst.inventory.snapshot());
assertAbsent(seaFirst,'birds');assert(seaFirst.homes.installed('sea'));
const supplies=new ShopInventory();supplies.buy('food-can',{coins:30});supplies.buy('seawater',{coins:20});
assert(!supplies.refreshWater().ok);assert.equal(supplies.seawaterUses,1);
supplies.owned.add('pet-seagull');assert(!supplies.feedPet('pet-seagull',{fishInBag:1},true).ok);assert.equal(supplies.foodPortions,6);

const order=new ShopInventory();for(const id of ['bird-home','sea-home','food-can','seawater'])assert(order.addToBasket(id).ok);
const quote=basketQuote(order.basket);assert.equal(quote.count,4);assert.equal(quote.shipping,0);assert.equal(quote.discount,90);assert.equal(quote.total,810);
assert(order.checkout({coins:810}).ok);assert.deepEqual(hotbarItems(order.snapshot()),['rod','food-can','seawater']);
for(const id of Object.values(HOME_ITEMS)){
  assert.equal(shippingFee(SHOP_ITEMS.find(i=>i.id===id)!),0);
  const model=await loadIslandModel(id),size=new T.Box3().setFromObject(model).getSize(new T.Vector3());
  assert(size.toArray().every(n=>Number.isFinite(n)&&n>0),'Both homes have valid physical shop display models');
}
homes.dispose();
console.log('PASS: homes absent at spawn; payment-only installation and collision; matching homes required for all 10 pets; same-order purchase; independent shared homes, actual resident delivery, no hotbar homes, prices, fees and section discounts.');
