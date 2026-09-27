export type PetHome='birds'|'sea';
export type HomeTier='basic'|'standard'|'prime'|'premium';
export const HOME_TIERS:HomeTier[]=['basic','standard','prime','premium'];
export type HomeTiers=Partial<Record<PetHome,HomeTier>>;
export type HomeExpansions=Partial<Record<PetHome,number>>;
export const HABITAT_TILE_PRICE=20;
export const MAX_HABITAT_EXPANSION={birds:120,sea:192};
export const AREA_PER_EXTRA_RESIDENT={birds:5,sea:24};
export function expansionArea(s:{homeExpansions?:HomeExpansions},home:PetHome){
  const area=s.homeExpansions?.[home]??0;
  return Number.isFinite(area)?Math.max(0,Math.min(MAX_HABITAT_EXPANSION[home],Math.floor(area))):0;
}
export function habitatArea(home:PetHome,tier:HomeTier){
  const scale=tier==='basic'?(home==='birds'?2.6/12:6/16):tier==='standard'?.6:tier==='premium'?1.5:1;
  return (home==='birds'?120:192)*scale*scale;
}
export const TIER_NAMES:Record<HomeTier,string>={basic:'Basic',standard:'Standard',prime:'Prime',premium:'Premium'};
export const TIER_PRICES={birds:{basic:60,standard:140,prime:250,premium:480},sea:{basic:150,standard:350,prime:600,premium:1000}};
export const TIER_CAPACITY={birds:{basic:2,standard:8,prime:24,premium:36},sea:{basic:2,standard:4,prime:8,premium:12}};
export const homeItem=(home:PetHome,tier:HomeTier)=>`${home==='birds'?'bird':'sea'}-home${tier==='prime'?'':'-'+tier}`;
export function homeItemInfo(id:string){for(const home of ['birds','sea'] as const)for(const tier of HOME_TIERS)if(id===homeItem(home,tier))return {home,tier};return null;}
export function ownedTier(s:{owned:readonly string[];homeTiers?:HomeTiers},home:PetHome):HomeTier|null{if(s.homeTiers?.[home])return s.homeTiers[home]!;return [...HOME_TIERS].reverse().find(t=>s.owned.includes(homeItem(home,t)))??null;}
export const homeCapacity=(s:{owned:readonly string[];homeTiers?:HomeTiers;homeExpansions?:HomeExpansions},home:PetHome)=>{const tier=ownedTier(s,home);return tier?TIER_CAPACITY[home][tier]+Math.floor(expansionArea(s,home)/AREA_PER_EXTRA_RESIDENT[home]):0;};
export type SeaBrood={species:string;parents:[string,string];elapsed:number};
export const SEA_BREEDING={birth:45,grown:180,meals:8};
export const seaBroodStage=(b:SeaBrood)=>b.elapsed<SEA_BREEDING.birth?'expecting':b.elapsed<120?'baby':'juvenile';
