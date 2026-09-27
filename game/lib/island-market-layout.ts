import {RODS,SEAFOOD} from './island-expansion-types';
import {SHOP_ITEMS,isAquaticPet,isPetHome,type ShopItem} from './island-shop';
import {homeItemInfo,HOME_TIERS} from './island-habitat-types';
import {boatSpec} from './island-boats';

export const MARKET={x:600,z:0,floor:2.4,spawnX:600,spawnZ:31};
export const HOME_FERRY={x:-38,z:73};
export const CASHIER={x:600,z:20,approachZ:23.5};
export const MARKET_RETURN={x:600,z:36};
export const MARKET_STALL={x:612,z:61};
export const MARKET_SECTIONS=[
  {id:'boats',name:'Boatyard',vendor:'Mara',direction:'West quay',color:'#3b6470',x:-36,z:6,w:36,l:76,signX:-36,signZ:34},
  {id:'tackle',name:'Fishing & tackle',vendor:'Finn',direction:'North-west',color:'#a08351',x:-14,z:-24,w:23,l:30,signX:-14,signZ:-5},
  {id:'diving',name:'Diving & wading',vendor:'Finn',direction:'West promenade',color:'#4c747a',x:-14,z:14,w:23,l:23,signX:-14,signZ:29},
  {id:'pets',name:'Birds & sea animals',vendor:'Isla',direction:'East gardens',color:'#61765d',x:29,z:12,w:38,l:35,signX:29,signZ:33},
  {id:'homes',name:'Habitats & furniture',vendor:'Isla',direction:'North-east',color:'#8c7460',x:29,z:-32,w:39,l:37,signX:29,signZ:-9},
  {id:'seafood',name:'Seafood counter',vendor:'Isla',direction:'South-west',color:'#667b85',x:-14,z:50,w:24,l:25,signX:-14,signZ:37},
  {id:'care',name:'Care & training',vendor:'Isla',direction:'South-east',color:'#786d86',x:26,z:44,w:43,l:20,signX:29,signZ:56},
] as const;
export type MarketSection=typeof MARKET_SECTIONS[number]['id'];
export function marketSection(item:Pick<ShopItem,'id'|'category'>):MarketSection{
  if(item.category==='Boats')return 'boats';
  if(item.category==='Pets')return 'pets';
  if(SEAFOOD.some(s=>s.id===item.id)||item.id==='menhaden')return 'seafood';
  if(isPetHome(item.id)||item.id.startsWith('family-'))return 'homes';
  if(['speargun','meandros-b32','waders','scuba','snorkel'].includes(item.id))return 'diving';
  if(item.category==='Pet care')return 'care';
  return 'tackle';
}
export type MarketSpot={id:string;x:number;z:number;approachX:number;approachZ:number;scale:number;vendor:string;section:MarketSection};
export const MARKET_SPOTS:MarketSpot[]=SHOP_ITEMS.map(item=>{
  const section=marketSection(item),info=MARKET_SECTIONS.find(s=>s.id===section)!;
  const peers=SHOP_ITEMS.filter(i=>marketSection(i)===section),i=peers.findIndex(p=>p.id===item.id);
  let dx=0,z=0,scale=1;
  if(section==='boats'){dx=-45+Math.floor(i/5)*15;z=24-i%5*12;scale=item.id==='boat'?8.8:boatSpec(item.id)?.length??(item.id==='raft'?4:5.6);}
  else if(section==='pets'){
    const aquatic=isAquaticPet(item.id),n=peers.filter(p=>isAquaticPet(p.id)===aquatic).findIndex(p=>p.id===item.id);
    dx=aquatic?19+n*20:15+n%4*9;z=aquatic?-3:24-Math.floor(n/4)*9;scale=aquatic?6:2.5;
  }else if(section==='homes'){
    const h=homeItemInfo(item.id);
    if(h){dx=14+HOME_TIERS.indexOf(h.tier)*10;z=h.home==='birds'?-21:-33;scale=h.tier==='basic'?1.3:h.tier==='standard'?1.8:h.tier==='prime'?2.3:3.45;}
    else{const n=['family-aviary','family-nest','family-perch','family-feeder'].indexOf(item.id);dx=14+n*10;z=-45;scale=n===0?2:1.2;}
  }else if(section==='seafood'){dx=-22+i%4*6;z=43+Math.floor(i/4)*7;scale=1;}
  else if(section==='care'){dx=10+i%5*8;z=41+Math.floor(i/5)*8;scale=item.id==='trainer'?1.85:item.id==='whistle'?.6:1.1;}
  else if(section==='diving'){dx=-21+i%3*6.5;z=9+Math.floor(i/3)*9;scale=item.id.includes('spear')||item.id==='meandros-b32'?1.65:1.75;}
  else{dx=-22+i%4*5;z=-35+Math.floor(i/4)*7;scale=RODS.some(r=>r.id===item.id)?2.8:item.id==='net'||item.id==='drying-rack'?1.4:.85;}
  const x=MARKET.x+dx;
  return {id:item.id,x,z,approachX:section==='boats'?x+4.8:x,approachZ:section==='boats'?z:z+(section==='pets'&&isAquaticPet(item.id)?4.3:2.5),scale,vendor:`${info.vendor} · ${info.name}`,section};
});
export const MARKET_VENDORS=[
  {name:'Coral',role:'CHECKOUT',x:CASHIER.x,z:CASHIER.z,color:'#65716a',message:'Coral: Pay for your basket here. Four or more items in one section earns 10% off that section. Your coastal delivery boat carries the order home.'},
  {name:'Mara',role:'BOATYARD',x:564,z:38,color:'#385e6a',message:'Mara: Boats are together on the west quay. Outboards are at the stern; the pointed bow goes forward. The larger coastal boat has a sheltered helm. Boat shipping is 10%. Your first purchase includes the navigation chart.'},
  {name:'Finn',role:'FISHING & DIVING',x:591,z:1,color:'#817051',message:'Finn: Fishing rods and tackle are north of my counter; diving equipment is south. Apply for your Meandros licence at the spear display. Add supplies to your basket, then pay Coral.'},
  {name:'Isla',role:'ANIMAL CARE',x:608,z:26,color:'#647760',message:'Isla: Birds and sea animals are in the east gardens. The habitat showroom is north, seafood and keeper supplies are south. Pick a home size before buying your pet. Live, frozen and fresh-dead seafood have separate counters; Menhaden are for pelicans only.'},
];
export function onMarket(x:number,z:number){return Math.abs(x-MARKET.x)<80&&Math.abs(z)<80;}
const ease=(a:number,b:number,v:number)=>{const t=Math.max(0,Math.min(1,(v-a)/(b-a)));return t*t*(3-2*t);};
export function marketGround(x:number,z:number){
  const dx=x-MARKET.x,a=Math.atan2(z/57,dx/56),r=Math.hypot(dx/56,z/57)/(1+.035*Math.sin(a*3)+.02*Math.cos(a*7));
  let h=MARKET.floor-5.5*ease(.73,1.08,r)-23*ease(1.08,1.45,r);
  for(const s of MARKET_SECTIONS){const edge=Math.hypot(Math.max(Math.abs(dx-s.x)-s.w/2-1,0),Math.max(Math.abs(z-s.z)-s.l/2-1,0));h=Math.max(h,MARKET.floor-5.5*ease(0,8,edge)-23*ease(8,23,edge));}
  const edge=Math.hypot(Math.max(Math.abs(dx-8)-15,0),Math.max(Math.abs(z-58)-8,0));
  return Math.max(h,MARKET.floor-5.5*ease(0,8,edge)-23*ease(8,23,edge));
}
export function marketTerrain(x:number,z:number){
  const ix=Math.floor(x),iz=Math.floor(z),fx=x-ix,fz=z-iz;
  const a=Math.fround(marketGround(ix,iz)),b=Math.fround(marketGround(ix+1,iz)),c=Math.fround(marketGround(ix,iz+1)),d=Math.fround(marketGround(ix+1,iz+1));
  return fx+fz<=1?a+(b-a)*fx+(c-a)*fz:d+(c-d)*(1-fx)+(b-d)*(1-fz);
}
export function spotInReach(spot:MarketSpot,x:number,z:number){return Math.hypot(x-spot.approachX,z-spot.approachZ)<2.6;}
export function nearestMarketSpot(x:number,z:number){return MARKET_SPOTS.filter(p=>spotInReach(p,x,z)).sort((a,b)=>Math.hypot(a.approachX-x,a.approachZ-z)-Math.hypot(b.approachX-x,b.approachZ-z))[0];}
