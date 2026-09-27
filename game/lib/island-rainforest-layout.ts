// A third island, entirely separate from Tide Island and the unchanged market.
export const RAINFOREST={name:'Rainwild Island',x:-400,z:450,rx:175,rz:155,extent:250,step:2};
export const VOYAGE_BOUNDS={minX:-2600,maxX:3000,minZ:-3200,maxZ:1900};
const clamp=(x:number)=>Math.max(0,Math.min(1,x));
const ease=(a:number,b:number,x:number)=>{const t=clamp((x-a)/(b-a));return t*t*(3-2*t);};
export function onRainforest(x:number,z:number){return Math.abs(x-RAINFOREST.x)<=250&&Math.abs(z-RAINFOREST.z)<=250;}
export function rainforestRadius(a:number){return 1+.06*Math.sin(a*3+.4)+.035*Math.cos(a*7-.2)+.017*Math.sin(a*11);}
export function rainforestGround(x:number,z:number){
  const dx=x-RAINFOREST.x,dz=z-RAINFOREST.z,a=Math.atan2(dz/RAINFOREST.rz,dx/RAINFOREST.rx);
  const inland=(rainforestRadius(a)-Math.hypot(dx/RAINFOREST.rx,dz/RAINFOREST.rz))*160;
  let h=-3+8*ease(-10,24,inland)-27*ease(12,95,-inland);
  const hill=(cx:number,cz:number,rx:number,rz:number)=>Math.exp(-(((dx-cx)/rx)**2+((dz-cz)/rz)**2));
  const ridges=(Math.sin(dx*.037+Math.sin(dz*.021)*2)+Math.cos(dz*.043-dx*.013))*2;
  h+=(hill(-38,0,66,62)*42+hill(44,43,50,44)*27+hill(-60,-56,46,32)*18+ridges)*ease(18,53,inland);
  // Western escarpments, a forested saddle and a broad, gently sloping NE beach.
  h+=ease(22,29,h)*8*ease(0,60,-dx);
  h+=Math.sin(dx*.12)*Math.cos(dz*.09)*.65*ease(20,55,inland);
  return h;
}
// These are the same two-metre triangles used by the visible mesh.
export function rainforestTerrain(x:number,z:number){
  const ix=Math.floor(x/2)*2,iz=Math.floor(z/2)*2,fx=(x-ix)/2,fz=(z-iz)/2;
  const a=Math.fround(rainforestGround(ix,iz)),b=Math.fround(rainforestGround(ix+2,iz)),c=Math.fround(rainforestGround(ix,iz+2)),d=Math.fround(rainforestGround(ix+2,iz+2));
  return fx+fz<=1?a+(b-a)*fx+(c-a)*fz:d+(c-d)*(1-fx)+(b-d)*(1-fz);
}
const bayAngle=-.65,bayR=rainforestRadius(bayAngle);
export const RAINFOREST_BEACH={x:RAINFOREST.x+Math.cos(bayAngle)*RAINFOREST.rx*(bayR-.065),z:RAINFOREST.z+Math.sin(bayAngle)*RAINFOREST.rz*(bayR-.065)};
export const RAINFOREST_APPROACH={x:RAINFOREST.x+Math.cos(bayAngle)*RAINFOREST.rx*(bayR+.005),z:RAINFOREST.z+Math.sin(bayAngle)*RAINFOREST.rz*(bayR+.005)};
export const HOME_BERTH={x:-30.8,z:78};
export const HOME_WAYPOINT={x:-28,z:117};
export type ChartTarget='rainforest'|'home';
export function chartCourse(x:number,z:number,target:ChartTarget){
  const goal=target==='rainforest'?RAINFOREST_APPROACH:HOME_WAYPOINT,dx=goal.x-x,dz=goal.z-z;
  return {distance:Math.hypot(dx,dz),bearing:(Math.atan2(dx,-dz)*180/Math.PI+360)%360};
}
