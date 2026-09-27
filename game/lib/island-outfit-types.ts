// Inventory metadata must not import the terrain/market dependency graph.
export type Outfit='regular'|'waders'|'scuba'|'snorkel';
export const WAIST_DEPTH=.95,WADER_DEPTH=1.3;
export const isOutfit=(id:string)=>id==='waders'||id==='scuba'||id==='snorkel';
export const outfitName=(id:Outfit)=>id==='waders'?'Keeper’s chest waders':id==='scuba'?'Scuba diving suit':id==='snorkel'?'Snorkeling suit':'Regular clothes';
export const canSwim=(outfit:Outfit)=>outfit==='scuba'||outfit==='snorkel';
export const safeDepth=(outfit:Outfit)=>outfit==='scuba'?Infinity:outfit==='snorkel'?1.72:outfit==='waders'?WADER_DEPTH:WAIST_DEPTH;
