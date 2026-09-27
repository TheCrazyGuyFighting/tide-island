import type {MarineKind} from './island-original-marine';

export type MarineSpecies={kind:MarineKind;legacyId:string;name:string;length:number;value:number;catchable:boolean;habitat:'reef'|'pelagic'|'seabed'|'deep'};
// Keep an explicit one-to-one record of the old pack. Model upgrades must not
// silently remove species or merge the different tangs/clownfish/flatfish.
export const REMOVED_FRESHWATER_SPECIES=[
  'ArmoredCatfish','Betta','BlueGoldfish','FlowerHorn','Goldfish','Koi','Tetra',
] as const;
export const MARINE_SPECIES:MarineSpecies[]=[
  {legacyId:'BlackLionFish',kind:'black-lionfish',name:'Black lionfish',length:1.12,value:20,catchable:true,habitat:'reef'},
  {legacyId:'Blobfish',kind:'blobfish',name:'Blobfish',length:1.28,value:24,catchable:true,habitat:'deep'},
  {legacyId:'BlueTang',kind:'tang',name:'Blue tang',length:.96,value:24,catchable:true,habitat:'reef'},
  {legacyId:'ButterflyFish',kind:'butterflyfish',name:'Butterflyfish',length:1.12,value:36,catchable:true,habitat:'reef'},
  {legacyId:'CardinalFish',kind:'cardinalfish',name:'Cardinalfish',length:1.28,value:40,catchable:true,habitat:'reef'},
  {legacyId:'Clownfish',kind:'clownfish',name:'Clownfish',length:.8,value:16,catchable:true,habitat:'reef'},
  {legacyId:'CoralGrouper',kind:'grouper',name:'Coral grouper',length:.96,value:42,catchable:true,habitat:'reef'},
  {legacyId:'Cowfish',kind:'cowfish',name:'Cowfish',length:1.12,value:16,catchable:true,habitat:'reef'},
  {legacyId:'Flatfish',kind:'flatfish',name:'Flatfish',length:1.28,value:28,catchable:true,habitat:'seabed'},
  {legacyId:'Humphead',kind:'humphead',name:'Humphead wrasse',length:1.12,value:32,catchable:true,habitat:'reef'},
  {legacyId:'Lionfish',kind:'lionfish',name:'Lionfish',length:.8,value:40,catchable:true,habitat:'reef'},
  {legacyId:'MandarinFish',kind:'mandarinfish',name:'Mandarinfish',length:.96,value:44,catchable:true,habitat:'reef'},
  {legacyId:'MoorishIdol',kind:'moorish-idol',name:'Moorish idol',length:1.12,value:12,catchable:true,habitat:'reef'},
  {legacyId:'ParrotFish',kind:'parrotfish',name:'Parrotfish',length:1.28,value:16,catchable:true,habitat:'reef'},
  {legacyId:'Puffer',kind:'puffer',name:'Marine pufferfish',length:.8,value:20,catchable:true,habitat:'reef'},
  {legacyId:'RedSnapper',kind:'snapper',name:'Red snapper',length:.96,value:34,catchable:true,habitat:'reef'},
  {legacyId:'RoyalGramma',kind:'royal-gramma',name:'Royal gramma',length:1.12,value:28,catchable:true,habitat:'reef'},
  {legacyId:'Sunfish',kind:'sunfish',name:'Ocean sunfish',length:1.5,value:0,catchable:false,habitat:'pelagic'},
  {legacyId:'Swordfish',kind:'swordfish',name:'Swordfish',length:1.5,value:0,catchable:false,habitat:'pelagic'},
  {legacyId:'Tang',kind:'surgeonfish',name:'Tang',length:.96,value:40,catchable:true,habitat:'reef'},
  {legacyId:'Tuna',kind:'tuna',name:'Yellowfin tuna',length:1.5,value:72,catchable:true,habitat:'pelagic'},
  {legacyId:'Turbot',kind:'turbot',name:'Turbot',length:.8,value:12,catchable:true,habitat:'seabed'},
  {legacyId:'YellowTang',kind:'yellow-tang',name:'Yellow tang',length:.96,value:16,catchable:true,habitat:'reef'},
  {legacyId:'ZebraClownFish',kind:'zebra-clownfish',name:'Zebra clownfish',length:1.12,value:20,catchable:true,habitat:'reef'},
  {legacyId:'Shark',kind:'shark',name:'Offshore reef shark',length:3.8,value:0,catchable:false,habitat:'pelagic'},
  {legacyId:'ReefFishOne',kind:'reef-fish-one',name:'Silver reef fish',length:.8,value:32,catchable:true,habitat:'reef'},
  {legacyId:'ReefFishTwo',kind:'reef-fish-two',name:'Striped reef fish',length:.96,value:36,catchable:true,habitat:'reef'},
  {legacyId:'ReefFishThree',kind:'reef-fish-three',name:'Rose reef fish',length:1.12,value:40,catchable:true,habitat:'reef'},
  {legacyId:'MantaRay',kind:'manta-ray',name:'Manta ray',length:3.4,value:0,catchable:false,habitat:'pelagic'},
  {legacyId:'Kingfish',kind:'kingfish',name:'Kingfish',length:1.1,value:48,catchable:true,habitat:'reef'},
  {legacyId:'Mackerel',kind:'mackerel',name:'Atlantic mackerel',length:.65,value:26,catchable:true,habitat:'reef'},
  {legacyId:'MiniSquid',kind:'squid',name:'Mini reef squid',length:.28,value:20,catchable:true,habitat:'reef'},
  {legacyId:'ShoreCrab',kind:'crab',name:'Shore crab',length:.28,value:18,catchable:true,habitat:'seabed'},
];

export const MARINE_PACK_IDS=MARINE_SPECIES.map(s=>s.legacyId);
