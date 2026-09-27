import assert from 'node:assert/strict';
import * as T from 'three';
import {MARKET_SPOTS,MARKET_SECTIONS,MARKET_VENDORS,MARKET_STALL,MARKET,marketTerrain,marketSection} from '../lib/island-market-layout';
import {SHOP_ITEMS,ShopInventory} from '../lib/island-shop';
import {terrainHeight,onDock} from '../lib/island-world';
import {habitatLayout} from '../lib/island-home-layout';
import {HOME_TIERS,MAX_HABITAT_EXPANSION} from '../lib/island-habitat-types';
import {buildMarket} from '../lib/island-market';
import {IslandPhysics} from '../lib/island-physics';
import {POWERED_BOATS,createBoatCraft,craftDimensions} from '../lib/island-boat-craft';
import {CoastalDeliveries} from '../lib/island-deliveries';
import {INBOUND_ROUTE,RETURN_ROUTE,DELIVERY_ARRIVAL_SECONDS,DELIVERY_RETURN_SECONDS,FREIGHT_HOME,FREIGHT_MARKET,TANK_RECOVERY_SECONDS} from '../lib/island-delivery-route';

assert.equal(MARKET_SPOTS.length,SHOP_ITEMS.length);
assert.equal(new Set(MARKET_SPOTS.map(p=>p.id)).size,SHOP_ITEMS.length);
for(const spot of MARKET_SPOTS){
  assert(MARKET_SECTIONS.some(s=>s.id===spot.section));
  assert(Math.abs(marketTerrain(spot.approachX,spot.approachZ)-MARKET.floor)<.01,spot.id+' has a flat, walkable approach');
  assert.equal(spot.section,marketSection(SHOP_ITEMS.find(i=>i.id===spot.id)!));
}
for(const point of [...MARKET_VENDORS,MARKET_STALL])assert(Math.abs(marketTerrain(point.x,point.z)-MARKET.floor)<.01,'Vendors and player stall sit on land');
for(const id of [...POWERED_BOATS,'delivery']){
  const root=createBoatCraft(id),engine=root.getObjectByName(id==='jetski-v1'?'stern-jet-drive':'outboard-engine')!;
  assert(engine&&engine.position.z>0,id+' engine belongs at stern +Z');
  assert.equal(root.userData.bowAxis,'-Z');
  const hull=root.getObjectByName('formed-v-hull') as T.Mesh;
  assert(hull.geometry.attributes.position.count>1000,'Smooth curved hull');
  assert([...hull.geometry.attributes.position.array].every(Number.isFinite));
  for(const yaw of [0,Math.PI/3,Math.PI,Math.PI*1.75]){
    root.rotation.y=yaw;root.updateMatrixWorld(true);
    const aft=engine.getWorldPosition(new T.Vector3()),forward=new T.Vector3(-Math.sin(yaw),0,-Math.cos(yaw));
    assert(aft.dot(forward)<0,id+' engine stays behind forward direction at every heading');
  }
}
assert(craftDimensions('boat').length>=8.8&&craftDimensions('delivery').length>=16);
for(const [name,route]of [['inbound',INBOUND_ROUTE],['return',RETURN_ROUTE]] as const){
  assert(route.length>640&&route.duration>60,'Full crossing, not a short despawn animation');
  assert.equal(route.sample(0).speed,0);assert.equal(route.sample(route.duration).speed,0);
  for(let t=0;t<=route.duration;t+=.1){
    const p=route.sample(t),next=route.sample(t+.01),forward={x:-Math.sin(p.yaw),z:-Math.cos(p.yaw)};
    assert((next.x-p.x)*forward.x+(next.z-p.z)*forward.z>=-1e-6,'Bow-first route');
    for(const along of [-7,0,7])for(const side of [-2,0,2]){
      const x=p.x+Math.sin(p.yaw)*along+Math.cos(p.yaw)*side,z=p.z+Math.cos(p.yaw)*along-Math.sin(p.yaw)*side;
      assert(terrainHeight(x,z)<-1,`${name} hull clears land at ${x.toFixed(1)},${z.toFixed(1)} (time ${t.toFixed(1)})`);
      assert(!onDock(x,z),'Freighter never intersects home dock');
      assert(!(Math.abs(x-MARKET.x)<4.1&&z>62&&z<82.2),'Freighter clears the market cargo quay');
      for(const tier of HOME_TIERS){const h=habitatLayout('sea',tier,MAX_HABITAT_EXPANSION.sea);assert(!(Math.abs(x-h.x)<h.rx+2&&Math.abs(z-h.z)<h.rz+2),'Freighter clears even expanded sea habitats');}
    }
  }
}
const inv=new ShopInventory(),d=new CoastalDeliveries(inv);inv.owned.add('ice-box');inv.dispatch=o=>d.order(o);const wallet={coins:50000};
inv.basket={knife:1,net:1,'ice-block':5};assert(inv.checkout(wallet).ok);d.update(0,true);
assert.equal(d.voyage.phase,'arriving');assert.equal(d.voyage.x,FREIGHT_MARKET.x);
assert.equal(d.orders.filter(o=>o.state==='onboard').length,2,'Whole basket boards together');
d.update(DELIVERY_ARRIVAL_SECONDS/2,true);assert.equal(d.voyage.phase,'arriving');assert(!d.collect());
d.update(DELIVERY_ARRIVAL_SECONDS/2+.01,true);assert.equal(d.voyage.phase,'home');assert.equal(d.voyage.x,FREIGHT_HOME.x);
for(const id of ['knife','net','ice-block']){assert.equal(d.shipment?.item,id);assert(d.collect());d.update(1.01,true);}
assert(inv.owned.has('knife')&&inv.owned.has('net'));assert.equal(inv.expansion.iceBlocks,5);
assert.equal(d.voyage.phase,'returning');assert(!d.collect());d.update(DELIVERY_RETURN_SECONDS/2,true);
assert.equal(d.voyage.phase,'returning');assert(d.voyage.x>100&&d.voyage.x<600);
inv.basket={hook:1};assert(inv.checkout(wallet).ok);d.update(.1,true);assert.equal(d.orders.at(-1)?.state,'queued','New orders wait for ship to return');
d.update(DELIVERY_RETURN_SECONDS,true);assert.equal(d.voyage.phase,'market');assert.equal(d.voyage.x,FREIGHT_MARKET.x);assert.equal(d.voyage.z,FREIGHT_MARKET.z);
d.update(.1,true);assert.equal(d.voyage.phase,'arriving');assert.equal(inv.expansion.iceBlocks,5,'No duplicated delivery');
const sea=new ShopInventory(),sd=new CoastalDeliveries(sea);sea.dispatch=o=>sd.order(o);sea.basket={'sea-home-basic':1,'pet-dolphin':1};assert(sea.checkout(wallet).ok);
sd.update(DELIVERY_ARRIVAL_SECONDS+.1,true);assert.equal(sd.shipment?.state,'crane');sd.update(12,true);assert.equal(sd.shipment?.state,'recovering');assert.equal(sea.petCounts['pet-dolphin'],1);
sd.update(TANK_RECOVERY_SECONDS-.1,true);assert.equal(sd.voyage.phase,'home');sd.update(.2,true);assert.equal(sd.voyage.phase,'returning');sd.update(DELIVERY_RETURN_SECONDS+1,true);assert.equal(sea.petCounts['pet-dolphin'],1);
Object.assign(globalThis,{document:{createElement:()=>({width:0,height:0,getContext:()=>({fillRect(){},strokeRect(){},fillText(){}})})}});
T.TextureLoader.prototype.load=()=>new T.Texture();
const physics=new IslandPhysics([],marketTerrain,()=>false);buildMarket(new T.Scene(),physics,()=>false);
for(const spot of MARKET_SPOTS)assert(!physics.blocked(spot.approachX,MARKET.floor,spot.approachZ,false),spot.id+' interaction is not inside a collider');
const visited=new Set<string>(),queue=[[600,31]];
while(queue.length){const [x,z]=queue.pop()!,key=x+','+z;if(visited.has(key)||x<542||x>653||z< -53||z>64||marketTerrain(x,z)<MARKET.floor-.05||physics.blocked(x,MARKET.floor,z,false))continue;visited.add(key);queue.push([x+1,z],[x-1,z],[x,z+1],[x,z-1]);}
for(const spot of MARKET_SPOTS)assert(visited.has(Math.round(spot.approachX)+','+Math.round(spot.approachZ)),spot.id+' is reachable from the ferry by clear walking lanes');
console.log(`PASS: ${MARKET_SPOTS.length} reachable market displays, stern engines at all headings, metre-scale hulls, two clear-water routes, full basket voyage, persistent return berth, queued orders and crane recovery.`);
