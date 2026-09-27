import assert from 'node:assert/strict';
import * as T from 'three';
import {MarineTrainer} from '../lib/island-trainer';
import {keeperTrainer} from '../lib/island-expansion-models';
import {ShopInventory} from '../lib/island-shop';
import {habitatLayout,InstalledHomes,homeDeck} from '../lib/island-home-layout';
import {careInteraction,keepCareOpen} from '../lib/island-care-interaction';

function setup(tier:'basic'|'standard'|'prime'|'premium'='prime'){
  const inv=new ShopInventory(),scene=new T.Scene(),trainer=keeperTrainer(),layout=habitatLayout('sea',tier),wallet={coins:1000};
  inv.owned.add('trainer');inv.owned.add('sea-home');inv.owned.add('pet-dolphin');inv.owned.add('pet-sea-lion');inv.homeTiers.sea=tier;
  const held=new Set<string>(),targets=new Map(['pet-dolphin','pet-sea-lion'].map((id,i)=>{const root=new T.Group();root.position.set(layout.x+1,-.7,layout.z+i*.3);scene.add(root);return [id,{id,root,bounds:layout,pose(){},hold(v:boolean){if(v)held.add(id);else held.delete(id);}}] as const;}));
  scene.add(trainer);const agent=new MarineTrainer(scene,inv,{trainer,trainerLayout:()=>layout,installed:()=>true,seaTarget:id=>targets.get(id)??null});
  const homes=new InstalledHomes(['sea']);homes.tiers.sea=tier;
  let t=0;const tick=(seconds:number,blocked=false)=>{for(let i=0;i<seconds*20;i++){t+=.05;agent.update(.05,t,blocked);assert.equal(homeDeck(trainer.position.x,trainer.position.z,homes),layout.y,'trainer remains on boardwalk');assert(agent.balance>=0);assert.equal(agent.balance+agent.spent+agent.refunded,agent.allocated,'escrow conservation');}};
  agent.update(0,0);return {agent,inv,wallet,tick,held,targets,trainer,homes,layout};
}
{
 const s=setup();for(const n of [-1,0,.5,NaN,Infinity,1001])assert(!s.agent.fund(n,s.wallet).ok);
 assert.equal(s.wallet.coins,1000);assert.equal(s.agent.balance,0);
 s.inv.owned.delete('trainer');assert(!s.agent.fund(50,s.wallet).ok);s.agent.dispose();
}
for(const tier of ['basic','standard','prime','premium'] as const){
 const s=setup(tier);assert(s.agent.fund(100,s.wallet).ok);assert.equal(s.wallet.coins,900);
 const start=s.trainer.position.clone();s.tick(300);
 assert(start.distanceTo(s.trainer.position)>.3,'trainer walks');
 for(const id of s.targets.keys()){assert((s.inv.petMeals[id]??0)>0,tier+' feed each resident');assert((s.inv.expansion.skills[id]?.hunting??0)>0);assert((s.inv.expansion.skills[id]?.trust??0)>=10,tier+' give rewarded lessons');}
 assert(s.inv.waterRefreshes>0,tier+' autonomous water care');
 assert.equal(s.inv.activeItem,'rod','does not equip player items');assert.equal(s.inv.outfit,'regular','delegation does not need player outfit');assert.deepEqual(s.inv.expansion.seafood,{},'private supplies');
 assert.equal(s.wallet.coins,900,'no hidden access to remaining coins');
 assert(s.agent.snapshot().log.some(l=>l.cost>0));
 const balance=s.agent.balance;s.agent.reclaim(s.wallet);assert.equal(s.wallet.coins,900+balance);assert.equal(s.held.size,0);const meals={...s.inv.petMeals};s.tick(50);assert.deepEqual(s.inv.petMeals,meals,'pause stops jobs and spending');
 s.agent.reclaim(s.wallet);assert.equal(s.wallet.coins,900+balance,'no double refund');s.agent.dispose();
}
{
 const s=setup();s.agent.fund(24,s.wallet);for(let i=0;i<300&&s.agent.phase!=='feeding';i++)s.tick(.05);assert.equal(s.agent.phase,'feeding');
 s.agent.pause();assert.equal(s.held.size,0);assert.equal(Object.values(s.agent.supplies).reduce((a,b)=>a+b,0),6,'cancel returns reserved food');
 s.agent.resume();s.tick(55);assert(Object.values(s.inv.petMeals).reduce((a,b)=>a+b,0)>0);
 const spent=s.agent.spent;s.tick(10,true);assert.equal(s.held.size,0);assert.equal(s.agent.spent,spent,'manual care blocks agent');s.agent.dispose();
}
for(const tier of ['basic','standard','prime','premium'] as const){
 const s=setup(tier),h=s.layout;
 assert.equal(careInteraction(h.care.x,h.care.z,s.homes)?.kind,'care');
 assert.equal(careInteraction(h.gate.x,h.gate.z,s.homes)?.kind,'gate');
 assert.equal(careInteraction(h.care.x+1.4,h.care.z,s.homes,s.trainer.position)?.kind,'trainer');
 assert(keepCareOpen('sea',h.care.x+3.2,h.care.z,s.homes),'latch beyond entry radius');
 assert(!keepCareOpen('sea',h.x+h.rx+7,h.z,s.homes),'closes after leaving');
 s.agent.dispose();
}
console.log('PASS trainer: four home tiers, budget validation/conservation, autonomous purchases/meals/lessons/water, animation/path, cancellation/refunds, private stock, and stable E targets.');
