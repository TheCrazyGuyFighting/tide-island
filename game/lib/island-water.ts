import {riverSample,terrainHeight} from './island-world';

export {type Outfit,WAIST_DEPTH,WADER_DEPTH,isOutfit,outfitName,safeDepth,canSwim} from './island-outfit-types';
// Gameplay uses the mean surface: a small wave must not randomly kill a wader.
export function waterSurface(x:number,z:number):number|null{
  const bed=terrainHeight(x,z);
  if(x>-36&&x<17&&z>-42&&z<10){const river=riverSample(x,z);if(river.distance<1.4&&river.surface+.025>bed)return river.surface+.025;}
  return bed<0?0:null;
}
export function immersion(x:number,y:number,z:number){const surface=waterSurface(x,z);return surface===null?0:Math.max(0,surface-y);}
