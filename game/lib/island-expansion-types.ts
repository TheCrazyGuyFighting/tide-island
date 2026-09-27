export const RODS=[
  {id:'rod-2',level:2,price:160,name:'Coastal rod · Level 2',file:'FishingRod_Lvl2.obj'},
  {id:'rod-3',level:3,price:320,name:'Surf rod · Level 3',file:'FishingRod_Lvl3.obj'},
  {id:'rod-4',level:4,price:560,name:'Offshore rod · Level 4',file:'FishingRod_Lvl4.obj'},
  {id:'rod-5',level:5,price:900,name:'Ocean master · Level 5',file:'FishingRod_Lvl5.obj'},
];
export const isFishingRod=(id:string)=>id==='rod'||RODS.some(r=>r.id===id);
export const rodLevel=(id:string)=>RODS.find(r=>r.id===id)?.level??1;
export type SeafoodKind='fish'|'squid'|'crab';
export type SeafoodMode='live'|'frozen'|'fresh';
export const SEAFOOD_MODES:SeafoodMode[]=['live','frozen','fresh'];
export const SEAFOOD_KINDS:SeafoodKind[]=['fish','squid','crab'];
export const SEAFOOD=SEAFOOD_MODES.flatMap((mode,i)=>SEAFOOD_KINDS.map((kind,j)=>({id:`${mode}-${kind}`,mode,kind,price:[36,18,24][i]+j*6,name:`${mode==='fresh'?'Fresh-dead':mode==='live'?'Live':'Frozen'} ${kind}`,portions:6})));
export const seafoodSpec=(id:string)=>SEAFOOD.find(f=>f.id===id);
export const BUNDLES=[
  {id:'bundle-pelican',name:'Pelican keeper bundle',price:390,contents:{'bird-home-basic':1,'pet-white-pelican':1,'menhaden':2,'bird-glove':1,'whistle':1},description:'Basic bird cage, white pelican, 12 Menhaden, glove and whistle. Pet shipping included. Buy before owning these permanent items.'},
  {id:'bundle-sea',name:'Sea-lion keeper bundle',price:1090,contents:{'sea-home-standard':1,'pet-sea-lion':1,'live-fish':1,'live-squid':1,'live-crab':1,'waders':1,'trainer':1},description:'Standard sea home, sea lion, keeper’s waders, professional trainer and six each of live fish, squid and crab. Shipping included.'},
  {id:'bundle-tackle',name:'Chilled tackle bundle',price:295,contents:{'rod-2':1,'ice-box':1,'ice-block':5,'frozen-fish':1},description:'Level 2 coastal rod, ice box, five ice blocks and six frozen fish. Ready for chilled feeding.'},
] as const;
export const bundleSpec=(id:string)=>BUNDLES.find(b=>b.id===id);
export function expandedOrder(order:Record<string,number>){const out:Record<string,number>={};for(const [id,n] of Object.entries(order)){const b=bundleSpec(id);if(b){for(const [part,q] of Object.entries(b.contents))out[part]=(out[part]??0)+q*n;}else out[id]=(out[id]??0)+n;}return out;}
export type AnimalSkills={hunting:number;trust:number};
export type ExpansionStock={seafood:Record<string,number>;iceBlocks:number;skills:Record<string,AnimalSkills>;stored:string[];rod:string;selectedSeafood:string};
export const emptyStock=():ExpansionStock=>({seafood:{},iceBlocks:0,skills:{},stored:[],rod:'rod',selectedSeafood:'live-fish'});
