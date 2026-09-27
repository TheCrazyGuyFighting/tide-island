import assert from 'node:assert/strict';
import {ShopInventory,hotbarItems,hotbarOwned,petRoster} from '../lib/island-shop';
import {IslandDay,DAY_SECONDS} from '../lib/island-day-cycle';
import {SEAFOOD,expandedOrder} from '../lib/island-expansion-types';
import {MARKET_SPOTS,marketTerrain} from '../lib/island-market-layout';
const wallet={coins:10000},s=new ShopInventory();
for(const id of ['sea-home-standard','pet-dolphin','pet-sea-lion','live-fish','live-squid','live-crab','frozen-fish','fresh-crab','ice-box','waders','trainer'])assert.equal(s.buy(id,wallet).ok,true,id);
assert.equal(SEAFOOD.length,9);assert.equal(s.expansion.seafood['live-fish'],6);
for(const spot of MARKET_SPOTS.filter(s=>/^(live-|frozen-|fresh-|rod-|bundle-|trainer)/.test(s.id))){assert(marketTerrain(spot.x,spot.z)>2.3,spot.id+' display ground');assert(marketTerrain(spot.approachX,spot.approachZ)>2.3,spot.id+' approach ground');for(const other of MARKET_SPOTS){if(other.id===spot.id)continue;assert(Math.hypot(spot.x-other.x,spot.z-other.z)>2.5,spot.id+' overlaps '+other.id);}}
s.equip('live-fish');assert.equal(s.reserveSeafood('pet-white-pelican','live-fish').ok,false);assert.equal(s.expansion.seafood['live-fish'],6);
let meal=s.reserveSeafood('pet-dolphin','live-fish');assert.equal(meal.ok,true);assert.equal(s.expansion.seafood['live-fish'],5);meal.settle!(false);meal.settle!(true);assert.equal(s.expansion.seafood['live-fish'],6);assert.equal(s.petMeals['pet-dolphin'],undefined);
meal=s.reserveSeafood('pet-dolphin','live-fish');meal.settle!(true);meal.settle!(true);assert.equal(s.petMeals['pet-dolphin'],1);assert.equal(s.expansion.skills['pet-dolphin'].hunting,10);
s.equip('ice-box');assert.equal(s.reserveSeafood('pet-dolphin','frozen-fish').ok,false);
for(let i=0;i<4;i++)assert.equal(s.buy('ice-block',wallet).ok,true);assert.equal(s.reserveSeafood('pet-dolphin','frozen-fish').ok,false);s.buy('ice-block',wallet);assert.equal(s.expansion.iceBlocks,5);
meal=s.reserveSeafood('pet-dolphin','frozen-fish');assert.equal(meal.ok,true);meal.settle!(true);assert.equal(s.expansion.skills['pet-dolphin'].hunting,10);
s.equip('rod');assert.equal(s.reserveSeafood('pet-dolphin','frozen-fish').ok,false);
assert.equal(s.train('pet-dolphin').ok,false);s.equip('waders');assert.equal(s.train('pet-dolphin').ok,true);
assert.equal(s.stow('rod').ok,true);assert.equal(s.activeItem,'hands');assert.equal(hotbarItems(s.snapshot())[0],'hands');assert.equal(s.equip('rod').ok,false);assert.equal(s.retrieve('rod').ok,true);
s.buy('rod-3',wallet);s.equip('rod-3');assert.equal(s.expansion.rod,'rod-3');s.stow('rod-3');assert(!hotbarOwned(s.snapshot()).includes('rod-3'));s.retrieve('rod-3');assert.equal(s.activeItem,'rod-3');
s.equip('waders');s.stow('waders');assert.equal(s.outfit,'regular');assert.equal(s.train('pet-dolphin').ok,false);s.retrieve('waders');assert.equal(s.outfit,'waders');
s.buy('hook',wallet);s.equip('hook');s.stow('rod-3');assert.equal(s.activeItem,'hands');s.retrieve('rod-3');s.stow('hook');assert.equal(s.hookEquipped,false);
for(const bundle of ['bundle-pelican','bundle-sea','bundle-tackle']){const b=new ShopInventory(),w={coins:5000};assert.equal(b.buy(bundle,w).ok,true,bundle);assert(Object.keys(expandedOrder({[bundle]:1})).every(id=>b.owned.has(id)));assert.equal(b.buy(bundle,w).ok,false);if(bundle==='bundle-pelican')assert.equal(petRoster(b.snapshot()).length,1);}
const invalid=new ShopInventory();invalid.addToBasket('bundle-tackle');invalid.addToBasket('ice-box');const before=wallet.coins;assert.equal(invalid.checkout(wallet).ok,false);assert.equal(wallet.coins,before);assert.equal(invalid.owned.size,0);
const day=new IslandDay(),w={coins:80};let melts=0;day.elapsed=DAY_SECONDS-.05;day.update(.1,0,w,()=>melts++);assert.equal(day.day,2);assert.equal(w.coins,30);assert.equal(melts,1);day.update(.1,0,w,()=>melts++);assert.equal(w.coins,30);
day.energy=15;assert(day.sleep());for(let i=0;i<26;i++)day.update(.1,0,w,()=>melts++);assert(day.energy>99.9);assert.equal(day.day,3);assert.equal(melts,2);assert.equal(day.taxDue,20);assert.equal(w.coins,0);w.coins=50;day.settleTax(w);assert.equal(w.coins,30);assert.equal(day.taxDue,0);
day.energy=.001;day.update(.1,1,w,()=>{});assert(day.exhausted);assert.equal(day.sleep(),false);day.update(.1,0,w,()=>{});assert.equal(day.energy,0);
console.log('PASS: seafood modes, live species guard, cooler + five ice gate, atomic bundles, rod storage, trainer outfit gate, daily tax, sleep and terminal exhaustion.');
