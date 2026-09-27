import assert from 'node:assert/strict';
import {PetBehaviour,petPositionSafe} from '../lib/island-pet-motion';
import {PETS,SHOP_ITEMS,ShopInventory,isAquaticPet} from '../lib/island-shop';
import {MARKET_SPOTS} from '../lib/island-market-layout';
import {AVIARY} from '../lib/island-home-layout';
const birds=PETS.filter(p=>!isAquaticPet(p.id)).map(p=>new PetBehaviour(p.id));
const neighbours=birds.map(b=>({id:b.id,position:b.position})),actions=new Map(birds.map(b=>[b.id,new Set<string>()]));
const landed=new Set<string>();
for(let frame=0;frame<180*60;frame++)for(const b of birds){
  const last=b.position.clone(),oldAction=b.action;b.update(1/60,neighbours);actions.get(b.id)!.add(b.action);
  if(oldAction==='landing'&&!b.flying)landed.add(b.id);
  assert(b.position.distanceTo(last)<.06,'Continuous velocity, never teleporting');
  assert(petPositionSafe(b.id,b.position.x,b.position.z,b.position.y));
  assert(b.position.y>=AVIARY.y+.1&&b.position.y<AVIARY.y+3.2,'Ceiling clearance');
}
for(const b of birds){
  const a=actions.get(b.id)!;for(const action of ['walk','takeoff','flap','glide','landing'])assert(a.has(action),`${b.id} missing ${action}: ${[...a]}`);
  assert(landed.has(b.id),b.id+' must finish landing and return to ground activities');
}
const fed=new PetBehaviour('pet-seagull');
for(let i=0;i<6000&&fed.action!=='flap'&&fed.action!=='glide';i++)fed.update(1/60);
assert(fed.flying);fed.feed();let ate=false;
for(let i=0;i<3600;i++){fed.update(1/60);if(fed.action==='peck'){assert(fed.position.y<AVIARY.y+.14);ate=true;break;}}
assert(ate,'An airborne bird must land to eat its queued meal');
const inv=new ShopInventory();inv.owned.add('pet-flying-seagull');inv.owned.add('pet-seagull');inv.petMeals={'pet-seagull':2,'pet-flying-seagull':3};
assert.deepEqual(inv.snapshot().owned,['pet-seagull']);assert.equal(inv.snapshot().petMeals?.['pet-seagull'],5);
assert(!inv.addToBasket('pet-flying-seagull').ok);assert(!inv.buy('pet-seagull',{coins:1000}).ok);
assert.equal(SHOP_ITEMS.filter(i=>i.id.includes('seagull')).length,1);
for(const id of ['pet-dolphin','pet-sea-lion'])assert.equal(MARKET_SPOTS.find(s=>s.id===id)!.scale,6,'Sea pets retain their tanks after catalog merge');
console.log('PASS: all 8 bird species walk, take off, flap, glide and finish landing; safe continuous movement; feeding recalls a flying bird; one seagull SKU with merged ownership/meals; sea tanks unchanged.');
