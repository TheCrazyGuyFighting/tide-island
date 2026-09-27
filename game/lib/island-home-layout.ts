import {familyFootprint} from './island-family-layout';
import {homeItemInfo,expansionArea,habitatArea,type PetHome,type HomeTier,type HomeTiers,type HomeExpansions} from './island-habitat-types';
export type {PetHome} from './island-habitat-types';
export const HOME_ITEMS={birds:'bird-home',sea:'sea-home'} as const;
export type HomeAvailability=ReadonlySet<PetHome>&{tiers?:HomeTiers;homeExpansions?:HomeExpansions};
export class InstalledHomes extends Set<PetHome>{tiers:HomeTiers={};homeExpansions:HomeExpansions={};}
const NO_HOMES:HomeAvailability=new Set();
export const isPetHome=(id:string)=>!!homeItemInfo(id);
export const AVIARY={x:-54,z:43,y:3.4,rx:6,rz:5};
export const SEA_HOME={x:-53,z:74,rx:8,rz:6};
export const CARE_POINTS={birds:{x:-45.1,z:42.8},sea:{x:-56,z:67}};
export const HOME_GATES={birds:{x:-48,z:45,y:AVIARY.y},sea:{x:-53,z:69,y:2.23}};
export function habitatLayout(home:PetHome,tier:HomeTier='prime',addedArea=0){
  const bird=home==='birds',base=tier==='basic'?(bird?2.6/12:6/16):tier==='standard'?.6:tier==='premium'?1.5:1;
  const extraArea=expansionArea({homeExpansions:{[home]:addedArea}},home),s=base*Math.sqrt(1+extraArea/habitatArea(home,tier));
  const rx=(bird?6:8)*s,rz=(bird?5:6)*s,y=bird?3.4:2.23;
  // Grow away from the cabin and harbour: east edge stays fixed, sea grows south.
  const x=(bird?AVIARY.x:SEA_HOME.x)+(bird?6:8)*base-rx,z=bird?AVIARY.z:SEA_HOME.z-6*base+rz;
  const height=bird?(tier==='basic'?1.8:tier==='standard'?3.4:tier==='prime'?5:6.5):2.1;
  const gate=bird?{x:x+rx,z:z+Math.min(2,rz*.4),y,width:tier==='basic'?.9:2,height:Math.min(2.65,height-.15)}:{x,z:z-rz+1,y,width:2,height:1.3};
  const care=bird?{x:gate.x+2.7,z:gate.z-2.2}:{x:x-3,z:z-rz-1};
  return {home,tier,s,x,z,rx,rz,y,height,gate,care,extraArea,area:rx*rz*4,shore:tier!=='basic'};
}
export const installedLayout=(homes:HomeAvailability|undefined,home:PetHome)=>habitatLayout(home,homes?.tiers?.[home]??'prime',expansionArea(homes??{},home));
export function birdPassage(homes?:HomeAvailability){const h=installedLayout(homes,'birds'),g=h.gate;return {inside:{x:g.x-1.4*h.s,y:h.y+Math.min(2.4,h.height*.5),z:g.z},door:{x:g.x-.6,y:h.y+Math.min(.9,h.height*.35),z:g.z},outside:{x:g.x+1.8,y:h.y+Math.min(.9,h.height*.35),z:g.z}};}
export function insideBirdAviary(x:number,y:number,z:number,homes?:HomeAvailability){const h=installedLayout(homes,'birds');return h.height>2.5&&Math.abs(x-h.x)<h.rx-.7&&Math.abs(z-h.z)<h.rz-.7&&y>=h.y-.2&&y<h.y+h.height-1;}
export function nearPetGate(x:number,z:number,homes:HomeAvailability=NO_HOMES):PetHome|null{for(const home of ['birds','sea'] as const){const g=installedLayout(homes,home).gate;if(homes.has(home)&&Math.hypot(x-g.x,z-g.z)<2.05)return home;}return null;}
export function homeFootprint(x:number,z:number,margin=0){return familyFootprint(x,z,margin)||x>-69-margin&&x<-42+margin&&Math.abs(z-AVIARY.z)<11+margin||x>-74-margin&&x<-35+margin&&z>62-margin&&z<89+margin;}
export function seaBeachHeight(x:number,z:number,tier:HomeTier,addedArea=0){const h=habitatLayout('sea',tier,addedArea);if(!h.shore||x<h.x-h.rx+.15||x>h.x-h.rx*.18||Math.abs(z-h.z)>h.rz-.3)return null;const u=(x-(h.x-h.rx*.66))/(h.rx*.48);return .48-Math.max(0,Math.min(1,u))*2.4;}
export function homeDeck(x:number,z:number,homes:HomeAvailability=NO_HOMES):number|null{
  for(const home of ['birds','sea'] as const){if(!homes.has(home))continue;const h=installedLayout(homes,home),g=h.gate;
    if(home==='birds'){if(Math.abs(x-h.x)<h.rx+1.3&&Math.abs(z-h.z)<h.rz+1)return h.y;if(x>g.x&&x<g.x+3.5&&Math.abs(z-g.z)<1.5)return h.y;}
    else{if(Math.abs(x-h.x)<h.rx+1.8&&Math.abs(z-h.z)<h.rz+1.8&&(Math.abs(x-h.x)>h.rx||Math.abs(z-h.z)>h.rz))return h.y;
      if(x>h.x-2&&x<h.x+2&&z>g.z-2.8&&z<g.z+2.5)return h.y;
      if(x>h.x-3&&x<-36&&z>h.z-h.rz-1.8&&z<h.z-h.rz+.7)return h.y;
      const beach=seaBeachHeight(x,z,h.tier,h.extraArea);if(beach!==null)return beach;
    }
  }return null;
}
export function nearHome(x:number,z:number,homes:HomeAvailability=NO_HOMES):PetHome|null{for(const home of ['birds','sea'] as const){if(!homes.has(home))continue;const h=installedLayout(homes,home);if(Math.hypot(x-h.care.x,z-h.care.z)<3.1||home==='birds'&&insideBirdAviary(x,h.y,z,homes)||home==='sea'&&Math.abs(x-h.x)<1.8&&Math.abs(z-h.gate.z)<2.5)return home;}return null;}
