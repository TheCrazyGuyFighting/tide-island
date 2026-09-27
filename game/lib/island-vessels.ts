import {terrainHeight,walkingHeight,onDock,waterHeight} from './island-world';
import {VOYAGE_BOUNDS,HOME_BERTH} from './island-rainforest-layout';
import {homeDeck,type HomeAvailability} from './island-home-layout';
import {boatSpec} from './island-boats';
import {craftDimensions,isCraftBoat} from './island-boat-craft';
import type {IslandPhysics} from './island-physics';
export type VesselState={id:string;x:number;y:number;z:number;yaw:number;speed:number;aboard:boolean;length:number;width:number;draft:number;seat:number;pitch:number;roll:number;notice:string};
export const vesselSpeed=(id:string)=>id==='jetski-v1'?27:id==='speed-boat'?25:['scout-boat','boat'].includes(id)?20:id==='fisher-boat'?17:id.startsWith('kayak')?10:id==='raft'?6.5:8.5;
export const vesselLength=(id:string)=>isCraftBoat(id)?craftDimensions(id).length:boatSpec(id)?.length??(id==='raft'?4:5.6);
export function createVessel(id:string,length=vesselLength(id),width=length*.36):VesselState{
  return {id,...HOME_BERTH,y:0,yaw:Math.PI,speed:0,aboard:false,length,width,draft:id.startsWith('kayak')?.18:.35,seat:.3,pitch:0,roll:0,notice:''};
}
export function homeLaunchVessel(id:string,model:{length:number;width:number;draft:number;seat:number},homes:HomeAvailability,physics:IslandPhysics){
  const next=createVessel(id,model.length,model.width);next.draft=model.draft;next.seat=model.seat;
  for(const offset of [0,2,4,6]){
    next.x=HOME_BERTH.x+offset;
    if(navigable(next,next.x,next.z,next.yaw,homes,physics)&&safeDisembark(next,physics,homes))return next;
  }
  return null;
}
export function navigable(s:VesselState,x:number,z:number,yaw:number,homes?:HomeAvailability,physics?:IslandPhysics){
  if(x<VOYAGE_BOUNDS.minX||x>VOYAGE_BOUNDS.maxX||z<VOYAGE_BOUNDS.minZ||z>VOYAGE_BOUNDS.maxZ)return false;
  const c=Math.cos(yaw),n=Math.sin(yaw);
  for(const along of [-.43,0,.43])for(const side of [-.42,0,.42]){
    const px=x+c*side*s.width+n*along*s.length,pz=z-n*side*s.width+c*along*s.length;
    if(terrainHeight(px,pz)>-s.draft-.16||onDock(px,pz)||homeDeck(px,pz,homes)!==null||physics?.blocked(px,.1,pz,false))return false;
  }
  return true;
}
export function stepVessel(s:VesselState,throttle:number,steer:number,dt:number,time:number,homes?:HomeAvailability,physics?:IslandPhysics){
  dt=Math.min(.06,Math.max(0,dt));s.notice='';
  const steps=Math.max(1,Math.ceil(dt/.012)),step=dt/steps;
  for(let i=0;i<steps;i++){
    const target=s.aboard?throttle*vesselSpeed(s.id)*(throttle<0?.35:1):0;
    s.speed+=(target-s.speed)*(1-Math.exp(-step*(throttle?1.25:2.4)));
    const nextYaw=s.yaw-steer*step*(.35+Math.min(1,Math.abs(s.speed)/4))*(s.speed<-.2?-1:1);
    if(navigable(s,s.x,s.z,nextYaw,homes,physics))s.yaw=nextYaw;
    const x=s.x-Math.sin(s.yaw)*s.speed*step,z=s.z-Math.cos(s.yaw)*s.speed*step;
    if(navigable(s,x,z,s.yaw,homes,physics)){s.x=x;s.z=z;}
    else {s.speed=0;s.notice='Shallows or an obstacle ahead · turn or reverse';}
  }
  s.y=waterHeight(s.x,s.z,time)+.08;
  const fx=-Math.sin(s.yaw),fz=-Math.cos(s.yaw),rx=Math.cos(s.yaw),rz=-Math.sin(s.yaw);
  s.pitch=(waterHeight(s.x+fx*s.length*.3,s.z+fz*s.length*.3,time)-waterHeight(s.x-fx*s.length*.3,s.z-fz*s.length*.3,time))/(s.length*.6);
  s.roll=(waterHeight(s.x+rx*s.width*.35,s.z+rz*s.width*.35,time)-waterHeight(s.x-rx*s.width*.35,s.z-rz*s.width*.35,time))/(s.width*.7);
}
export function safeDisembark(s:VesselState,physics:IslandPhysics,homes:HomeAvailability){
  if(Math.abs(s.speed)>.7)return null;
  for(let r=Math.max(1.7,s.width*.65);r<=8;r+=.45)for(let j=0;j<40;j++){
    const a=j*Math.PI*2/40,x=s.x+Math.cos(a)*r,z=s.z+Math.sin(a)*r,y=walkingHeight(x,z,homes);
    if(y<.25||y>3.5||physics.gradient(x,z).slope>.85||physics.blocked(x,y,z,false))continue;
    // The landing must support the player's whole footprint, not a single edge.
    if([[.3,0],[-.3,0],[0,.3],[0,-.3]].some(([dx,dz])=>Math.abs(walkingHeight(x+dx,z+dz,homes)-y)>.28||physics.blocked(x+dx,y,z+dz,false)))continue;
    return {x,y,z};
  }
  return null;
}
