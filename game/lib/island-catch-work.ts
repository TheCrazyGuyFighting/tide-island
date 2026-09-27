import type {FishAgent} from './island-fishing';
export type KeptFish={listedState?:'live'|'dead'|'dried';item?:string;length?:number;id:string;species:string;name:string;weight:number;baseValue:number;state:'live'|'dead'|'drying'|'dried'|'listed';drying:number;price:number};
export type CatchWorkSnapshot={fish:KeptFish[];held:string|null;preparing:number;message:string;sales:{name:string;price:number;buyer:string}[]};
export const DRYING_SECONDS=90;
export const fishValue=(f:KeptFish)=>Math.round(f.baseValue*(1+Math.min(1,f.drying/DRYING_SECONDS)*.8));
/** One record per landed fish. Moving to the rack or a stall never duplicates it. */
export class CatchWork {
  fish:KeptFish[]=[];held:string|null=null;preparing=0;message='Land a fish to hold it. Your catches are sold at your market stall.';
  sales:CatchWorkSnapshot['sales']=[];private seq=0;private preparingId:string|null=null;
  add(f:FishAgent){const kept:KeptFish={id:`catch-${++this.seq}`,species:f.name,name:f.name,length:f.length,weight:f.weight,baseValue:f.value,state:f.injured==='dead'?'dead':'live',drying:0,price:f.value};this.fish.push(kept);this.held=kept.id;this.message=`${f.name} in your hand. Keep it, prepare it with the knife, or sell it at your stall.`;}
  get holding(){return this.fish.find(f=>f.id===this.held)??null;}
  listItem(item:string,name:string,baseValue:number,price:number){if(!Number.isSafeInteger(price)||price<1||price>100000)return false;this.fish.push({id:`gear-${++this.seq}`,item,species:'',name,weight:0,baseValue,price,state:'listed',drying:0});return true;}
  get bagCount(){return this.fish.filter(f=>f.state==='live'||f.state==='dead'||f.state==='dried').length;}
  snapshot():CatchWorkSnapshot{return {fish:this.fish.map(f=>({...f})),held:this.held,preparing:this.preparing,message:this.message,sales:this.sales.map(s=>({...s}))};}
  hold(id:string|null){if(this.preparing)return false;if(id===null){this.held=null;return true;}const f=this.fish.find(f=>f.id===id);if(!f||['drying','listed'].includes(f.state))return false;this.held=id;return true;}
  knife(){if(this.preparing)return false;const f=this.holding;if(!f||f.state!=='live'){this.message='Hold a live catch first.';return false;}this.preparing=1.6;this.preparingId=f.id;this.message='Preparing your catch…';return true;}
  hang(id:string){const f=this.fish.find(f=>f.id===id);if(this.preparing||!f||f.state!=='dead'){this.message='Prepare a fish with your knife before hanging it.';return false;}if(this.fish.filter(f=>f.state==='drying').length>=6){this.message='All six rack hooks are full.';return false;}f.state='drying';f.drying=0;if(this.held===id)this.held=null;this.message='Fish hung on the rack. 90 seconds of drying adds up to 80% value.';return true;}
  retrieve(id:string){const f=this.fish.find(f=>f.id===id);if(!f||f.state!=='drying')return false;f.state=f.drying>=DRYING_SECONDS?'dried':'dead';this.held=id;this.message=`Retrieved ${f.name} · market value ${fishValue(f)} coins.`;return true;}
  list(id:string,price:number){const f=this.fish.find(f=>f.id===id);if(this.preparing||!f||f.state==='drying'||!Number.isSafeInteger(price)||price<1||price>100000){this.message='Choose a carried fish and a whole price from 1 to 100,000 coins.';return false;}if(f.state!=='listed')f.listedState=f.state;f.price=price;f.state='listed';if(this.held===id)this.held=null;this.message='Listed at your stall. Visitors compare your price with its market value.';return true;}
  withdraw(id:string){const f=this.fish.find(f=>f.id===id);if(!f||f.state!=='listed')return false;f.state=f.listedState??(f.drying>=DRYING_SECONDS?'dried':'dead');return true;}
  customer(buyer:string,wallet:{coins:number}){const f=this.fish.find(f=>f.state==='listed'&&f.price<=Math.ceil(fishValue(f)*1.1));if(!f){this.message='A customer browsed your stall. High prices may not sell.';return false;}wallet.coins+=f.price;this.fish=this.fish.filter(v=>v!==f);this.sales.unshift({name:f.name,price:f.price,buyer});this.sales=this.sales.slice(0,12);this.message=`${buyer} bought ${f.name} for ${f.price} coins.`;return true;}
  consume(count:number){for(let n=0;n<count;n++){const f=this.fish.find(f=>['live','dead','dried'].includes(f.state));if(!f)break;this.fish=this.fish.filter(v=>v!==f);if(this.held===f.id)this.held=null;}}
  update(dt:number){if(this.preparing){this.preparing=Math.max(0,this.preparing-dt);if(!this.preparing){const f=this.fish.find(f=>f.id===this.preparingId);if(f)f.state='dead';this.preparingId=null;this.message='Catch prepared. Hang it on the drying rack or sell it at the market.';}}for(const f of this.fish)if(f.state==='drying')f.drying=Math.min(DRYING_SECONDS,f.drying+dt);}
}
