import {homeItemInfo} from './island-habitat-types';
import {equipmentName,isPet,isAquaticPet,type ShopInventory} from './island-shop';
import {DELIVERY_ARRIVAL_SECONDS,DELIVERY_RETURN_SECONDS,TANK_RECOVERY_SECONDS,INBOUND_ROUTE,RETURN_ROUTE,FREIGHT_HOME,FREIGHT_MARKET} from './island-delivery-route';
export type Delivery={id:number;item:string;quantity:number;state:'queued'|'onboard'|'arriving'|'handoff'|'giving'|'carried'|'crane'|'recovering'|'returning'|'building'|'done';elapsed:number};
export class CoastalDeliveries{
  orders:Delivery[]=[];private seq=0;message='Coastal deliveries arrive at your home harbour.';
  private departure:Delivery|null=null;
  private leg:'market'|'arriving'|'home'|'returning'='market';private voyageElapsed=0;
  constructor(private inventory:ShopInventory){}
  order(order:Record<string,number>){for(const [item,quantity]of Object.entries(order)){const building=!!homeItemInfo(item)||item==='family-aviary';this.orders.push({id:++this.seq,item,quantity,state:building?'building':'queued',elapsed:0});}this.message='Order dispatched. Habitats take 30 seconds to build; your basket travels together on the coastal boat.';}
  get shipment(){return this.orders.find(o=>['arriving','handoff','giving','crane','recovering'].includes(o.state))??this.departure??undefined;}
  get cages(){return this.orders.filter(o=>o.state==='carried');}
  get voyage(){
    const p=this.leg==='arriving'?INBOUND_ROUTE.sample(this.voyageElapsed):this.leg==='returning'?RETURN_ROUTE.sample(this.voyageElapsed):{...(this.leg==='home'?FREIGHT_HOME:FREIGHT_MARKET),yaw:0,speed:0,progress:1};
    return {...p,phase:this.leg,elapsed:this.voyageElapsed,remaining:this.leg==='arriving'?Math.max(0,DELIVERY_ARRIVAL_SECONDS-this.voyageElapsed):this.leg==='returning'?Math.max(0,DELIVERY_RETURN_SECONDS-this.voyageElapsed):0};
  }
  collect(){const o=this.shipment;if(!o||o.state!=='handoff'||isAquaticPet(o.item))return false;o.state='giving';o.elapsed=0;this.message='The crew is handing over your order…';return true;}
  deploy(){const o=this.cages[0];if(!o||!this.inventory.owned.has('bird-home'))return false;this.inventory.receive(o.item,o.quantity);o.state='done';this.message=`Released ${o.quantity} ${equipmentName(o.item)} into your aviary.`;return true;}
  private finish(o:Delivery){
    if(o.state!=='carried')o.state='done';
    const next=this.orders.find(p=>p.state==='onboard');
    if(next){next.state='handoff';next.elapsed=0;this.message+=` Next aboard: ${equipmentName(next.item)}.`;}
    else{this.departure={...o,state:'returning',elapsed:0};this.leg='returning';this.voyageElapsed=0;this.message+=' The crew is sailing back to Market Island.';}
  }
  update(dt:number,nearHarbour:boolean){
    dt=Math.max(0,dt);
    for(const o of this.orders.filter(o=>o.state==='building')){o.elapsed+=dt;if(o.elapsed>=30){this.inventory.receive(o.item,o.quantity);o.state='done';this.message=`${equipmentName(o.item)} construction complete. The gate is ready.`;}}
    if(this.leg==='market'){
      const batch=this.orders.filter(o=>o.state==='queued');
      if(batch.length){batch.forEach(o=>{o.state='onboard';o.elapsed=0;});batch[0].state='arriving';this.leg='arriving';this.voyageElapsed=0;this.message='Coastal boat departing Market Island with your order.';}
    }
    if(this.leg==='returning'){
      this.voyageElapsed=Math.min(DELIVERY_RETURN_SECONDS,this.voyageElapsed+dt);if(this.departure)this.departure.elapsed=this.voyageElapsed;
      if(this.voyageElapsed>=DELIVERY_RETURN_SECONDS){this.leg='market';this.voyageElapsed=0;this.departure=null;this.message='Coastal boat has moored at Market Island, ready for the next order.';}
      return;
    }
    const ship=this.shipment;if(!ship)return;ship.elapsed+=dt;
    if(this.leg==='arriving'){
      this.voyageElapsed=Math.min(DELIVERY_ARRIVAL_SECONDS,this.voyageElapsed+dt);
      if(this.voyageElapsed>=DELIVERY_ARRIVAL_SECONDS){this.leg='home';ship.state='handoff';ship.elapsed=0;this.message=`Coastal crew arrived with ${equipmentName(ship.item)}. E beside the crew to collect.`;}
    }
    if(ship.state==='giving'&&ship.elapsed>=1){
      if(isPet(ship.item)){ship.state='carried';this.message=`${equipmentName(ship.item)} cage received. E at your aviary to release the bird.`;}
      else{this.inventory.receive(ship.item,ship.quantity);if(['knife','bow'].includes(ship.item))this.inventory.equip(ship.item);this.message=`Crew handed over ${equipmentName(ship.item)}. ${ship.item==='drying-rack'?'Your rack is installed beside the cabin.':'Ready to use.'}`;}
      this.finish(ship);
    }
    if(ship.state==='handoff'&&isAquaticPet(ship.item)&&this.inventory.owned.has('sea-home')&&nearHarbour){ship.state='crane';ship.elapsed=0;this.message='Crew lowering the seawater transport tank. Watch your animal swim into its home.';}
    if(ship.state==='crane'&&ship.elapsed>=12){this.inventory.receive(ship.item,ship.quantity);ship.state='recovering';ship.elapsed=0;this.message='Animal released safely. The empty transport tank is being secured aboard.';}
    if(ship.state==='recovering'&&ship.elapsed>=TANK_RECOVERY_SECONDS)this.finish(ship);
  }
  snapshot(){return {orders:this.orders.filter(o=>o.state!=='done').map(o=>({...o})),voyage:this.voyage,message:this.message};}
}
