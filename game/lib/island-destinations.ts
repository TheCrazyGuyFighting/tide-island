export const DISTANT_ISLANDS = [
  { id: 'pearl', name: 'Pearl Atoll', x: 1350, z: 950, rx: 130, rz: 110, extent: 220, step: 4, biome: 'tropical', description: 'Pale sand, palm groves and a sheltered turquoise lagoon.', reward: 150 },
  { id: 'ember', name: 'Ember Isle', x: -1400, z: -1550, rx: 170, rz: 145, extent: 260, step: 4, biome: 'volcanic', description: 'Black-sand beaches and a weathered volcanic crater.', reward: 200 },
  { id: 'frost', name: 'Frosthaven', x: 1900, z: -2300, rx: 190, rz: 165, extent: 280, step: 4, biome: 'alpine', description: 'Snow-covered ridges, evergreen trees and a quiet landing cove.', reward: 250 },
] as const;

export type DistantIsland = typeof DISTANT_ISLANDS[number];
export type DistantIslandId = DistantIsland['id'];
export const distantIslandAt = (x: number, z: number) => DISTANT_ISLANDS.find(i => Math.abs(x-i.x)<=i.extent && Math.abs(z-i.z)<=i.extent);
const ease=(a:number,b:number,x:number)=>{const t=Math.max(0,Math.min(1,(x-a)/(b-a)));return t*t*(3-2*t);};
export const distantCoastRadius=(angle:number)=>1+.045*Math.sin(angle*3+.7)+.025*Math.cos(angle*5);

export function distantGround(island:DistantIsland,x:number,z:number){
  const dx=x-island.x,dz=z-island.z,r=Math.hypot(dx/island.rx,dz/island.rz);
  const angle=Math.atan2(dz/island.rz,dx/island.rx),inland=(distantCoastRadius(angle)-r)*Math.min(island.rx,island.rz);
  let height=-4+8*ease(-12,18,inland)-24*ease(12,70,-inland);
  const relief=ease(20,50,inland);
  if(island.biome==='tropical'){
    // A low island with a swimmable central lagoon and dry paths around it.
    height+=relief*(4+Math.sin(dx*.045)*Math.cos(dz*.037)*2);
    height-=12*(1-ease(.18,.42,r));
  }else if(island.biome==='volcanic'){
    const crater=Math.exp(-(((r-.28)/.17)**2))*61;
    height+=relief*(crater+7+Math.sin(angle*9)*3*ease(.15,.45,r));
  }else{
    height+=relief*(58*Math.exp(-(((dx+25)/80)**2+((dz-15)/75)**2))+24*Math.exp(-(((dx-65)/58)**2+((dz+30)/64)**2)));
  }
  return height;
}

// Physics uses the exact same triangles as the visible island mesh.
export function distantTerrain(island:DistantIsland,x:number,z:number){
  const step=island.step,ix=Math.floor((x-island.x)/step)*step+island.x,iz=Math.floor((z-island.z)/step)*step+island.z;
  const fx=(x-ix)/step,fz=(z-iz)/step;
  const a=Math.fround(distantGround(island,ix,iz)),b=Math.fround(distantGround(island,ix+step,iz)),c=Math.fround(distantGround(island,ix,iz+step)),d=Math.fround(distantGround(island,ix+step,iz+step));
  return fx+fz<=1?a+(b-a)*fx+(c-a)*fz:d+(c-d)*(1-fx)+(b-d)*(1-fz);
}

export function distantLanding(island:DistantIsland,ashore=false){
  const a=Math.atan2(-island.z/island.rz,-island.x/island.rx),r=distantCoastRadius(a)+(ashore?-.075:.01);
  return {x:island.x+Math.cos(a)*island.rx*r,z:island.z+Math.sin(a)*island.rz*r};
}
