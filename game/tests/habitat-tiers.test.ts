import assert from 'node:assert/strict';
import {ShopInventory,petRoster,requirementSatisfied} from '../lib/island-shop';
import {HOME_TIERS,homeItem,ownedTier,homeCapacity,SEA_BREEDING} from '../lib/island-habitat-types';
import {habitatLayout,InstalledHomes,homeDeck,nearHome,nearPetGate} from '../lib/island-home-layout';
import {buildHabitat} from '../lib/island-habitat-model';
import {IslandPhysics} from '../lib/island-physics';
import {SeaResting,seaSwimPoint} from '../lib/island-sea-pet-motion';
import * as T from 'three';
import fs from 'node:fs';
import {GLTFLoader} from 'three/examples/jsm/loaders/GLTFLoader.js';
import {addPetHomes} from '../lib/island-pet-homes';
Object.assign(globalThis,{document:{createElement:()=>({width:0,height:0,getContext:()=>({fillRect(){},strokeRect(){},fillText(){}})})}});
for(const home of ['birds','sea'] as const){
  const inventory=new ShopInventory(),wallet={coins:100000};
  for(const tier of HOME_TIERS){const id=homeItem(home,tier);assert(inventory.addToBasket(id).ok);assert(requirementSatisfied(inventory.snapshot(),homeItem(home,'prime')));assert(inventory.checkout(wallet).ok);assert.equal(ownedTier(inventory.snapshot(),home),tier);assert(!inventory.buy(id,wallet).ok);
    const h=habitatLayout(home,tier),physics=new IslandPhysics([]),model=buildHabitat(home,tier,physics),built=new InstalledHomes([home]);built.tiers[home]=tier;model.setEnabled(true);assert.equal(nearHome(h.care.x,h.care.z,built),home);assert.equal(nearPetGate(h.gate.x,h.gate.z,built),home);assert.equal(homeDeck(h.gate.x,h.gate.z,built),h.y);assert(physics.blocked(h.gate.x,h.gate.y,h.gate.z,false));model.gate.toggle();for(let i=0;i<100;i++)model.gate.update(.02);assert(model.gate.ready);model.dispose();assert(physics.colliders.every(c=>!c.enabled));
  }
  const prime=habitatLayout(home,'prime'),premium=habitatLayout(home,'premium');assert.equal(premium.rx,prime.rx*1.5);assert.equal(premium.rz,prime.rz*1.5);
}
for(const species of ['pet-dolphin','pet-sea-lion']){
  const inv=new ShopInventory(),money={coins:10000},food={fishInBag:20};assert(inv.addToBasket('sea-home-basic').ok);assert(inv.addToBasket(species).ok);assert(inv.addToBasket(species).ok);assert(inv.checkout(money).ok);assert.equal(petRoster(inv.snapshot()).length,2);assert(!inv.buy(species,money).ok);assert(!inv.startSeaBrood(species,food).ok);
  assert(inv.buy('sea-home-standard',money).ok);assert.equal(petRoster(inv.snapshot()).length,2);assert(!inv.startSeaBrood(species,food).ok);assert(inv.buy('seawater',money).ok);assert(inv.startSeaBrood(species,food).ok);assert.equal(food.fishInBag,12);assert.equal(inv.seawaterUses,0);assert(!inv.startSeaBrood(species,food).ok);
  assert(inv.buy(species,money).ok);assert(!inv.buy(species,money).ok,'Reserve room for the baby');assert(inv.buy('sea-home',money).ok);assert(inv.seaBrood,'Upgrading must keep the family');
  for(let i=0;i<SEA_BREEDING.grown*20+1;i++)inv.updateSeaFamily(.05);assert.equal(inv.raisedSea,1);assert.equal(inv.seaBrood,null);assert.equal(petRoster(inv.snapshot()).length,4);assert.equal(homeCapacity(inv.snapshot(),'sea'),8);
}
for(const tier of ['standard','prime','premium'] as const){const motion=new SeaResting('pet-sea-lion'),root=new T.Group(),pose={gait:0,stride:0,peck:0,preen:0,look:0,flap:0,swim:0,turn:0,breath:0},swim=seaSwimPoint(new T.Vector3(-52,-1.1,75),tier);let sun=false;for(let i=0;i<3000;i++){motion.update(.05,tier,root,swim,pose,true);if(root.position.y>.4)sun=true;}assert(sun,'Sea lion should climb onto its resting area');}
console.log('PASS: 8 purchasable tiers, exact Premium 1.5 dimensions, reachable colliding gates, upgrades retain pets and sea families, capacities reserve babies, both species breed and sea lions climb out to rest.');
GLTFLoader.prototype.loadAsync=async function(url:string){const bytes=fs.readFileSync(`public${url}`),loader=new GLTFLoader();loader.register(()=>({name:'TEST_TEXTURES',loadTexture:()=>Promise.resolve(new T.Texture())}));return loader.parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'');};
for(const species of ['pet-dolphin','pet-sea-lion']){
  const scene=new T.Scene(),homes=addPetHomes(scene,new IslandPhysics([]),()=>false),inv=new ShopInventory(),wallet={coins:10000};
  for(const id of ['sea-home-standard',species,species,'seawater'])assert(inv.buy(id,wallet).ok);
  await homes.prepare([species]);homes.apply(inv.snapshot());assert(inv.startSeaBrood(species,{fishInBag:8}).ok);homes.apply(inv.snapshot());
  const parent=scene.getObjectByName(`resident-${species}`)!;inv.seaBrood!.elapsed=50;homes.update(50,.05,undefined,null,inv.seaBrood);
  const baby=scene.getObjectByName('sea-family-baby')!;assert(baby);assert(baby.scale.x<parent.scale.x);
  const before=baby.position.clone();for(let i=0;i<100;i++)homes.update(50+i*.05,.05,undefined,null,inv.seaBrood);assert(baby.position.distanceTo(before)>.1);
  assert(inv.buy('sea-home-premium',wallet).ok);homes.apply(inv.snapshot());homes.update(55,.05,undefined,null,inv.seaBrood);assert.equal(scene.getObjectByName(`resident-${species}`),parent);assert.equal(scene.getObjectByName('sea-family-baby'),baby);
  inv.seaBrood!.elapsed=SEA_BREEDING.grown-.01;assert(inv.updateSeaFamily(.05));homes.apply(inv.snapshot());homes.update(180,.05);assert(!scene.getObjectByName('sea-family-baby'));assert.equal(homes.residentCount(),3);assert(scene.getObjectByName(`resident-${species}#3`));homes.dispose();
}
console.log('PASS: actual dolphin and sea-lion models produce moving smaller babies, retain actors through upgrades, and become permanent third adult residents.');
