import {installedLayout,nearHome,nearPetGate,type HomeAvailability,type PetHome} from './island-home-layout';

/** One resolver drives both the E label and its action; looking at a trainer/sign
 * must not quietly toggle an overlapping gate. */
export function careInteraction(x:number,z:number,homes:HomeAvailability,trainer?:{x:number;z:number}){
  if(trainer&&homes.has('sea')&&Math.hypot(x-trainer.x,z-trainer.z)<2.4)return {kind:'trainer' as const,home:'sea' as const};
  const home=nearHome(x,z,homes);
  if(home){const h=installedLayout(homes,home);if(Math.hypot(x-h.care.x,z-h.care.z)<2.4)return {kind:'care' as const,home};}
  const gate=nearPetGate(x,z,homes);if(gate)return {kind:'gate' as const,home:gate};
  return home?{kind:'care' as const,home}:null;
}

/** An already-open care panel has a wider, stable boundary than its entry prompt.
 * Physics nudges, gate swings, and an animation ending must not dismiss the UI. */
export function keepCareOpen(home:PetHome,x:number,z:number,homes:HomeAvailability){
  if(!homes.has(home))return false;
  const h=installedLayout(homes,home);
  return Math.abs(x-h.x)<=h.rx+6&&Math.abs(z-h.z)<=h.rz+6;
}
