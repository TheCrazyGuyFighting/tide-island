import * as T from 'three';
import type { FishAgent, Point } from './island-fishing';
import { terrainHeight, waterHeight } from './island-world';

export const SCOOP_DURATION=1.2;
export function scoopCandidate(fish:FishAgent[],origin:Point,yaw:number,height=terrainHeight) {
  if(origin.y>2.8||origin.y<-.5)return null;
  const fx=-Math.sin(yaw),fz=-Math.cos(yaw);
  return fish.filter(f=>{
    const dx=f.position.x-origin.x,dz=f.position.z-origin.z,d=Math.hypot(dx,dz);
    if(!f.catchable||f.caught||(f.length??1)>(f.injured?2.2:1.4)||d>3.8||d<.15||(dx*fx+dz*fz)/d<.55||f.position.y< -2.1||f.position.y>.12)return false;
    if(height(f.position.x,f.position.z)>f.position.y-.05)return false;
    // A short sweep cannot reach through a bank, rock face, or a raised beach.
    for(let i=1;i<=16;i++){const t=i/16,y=(origin.y+1.4)*(1-t)+f.position.y*t;if(height(origin.x+dx*t,origin.z+dz*t)>y-.03)return false;}
    return true;
  }).sort((a,b)=>Math.hypot(a.position.x-origin.x,a.position.z-origin.z)-Math.hypot(b.position.x-origin.x,b.position.z-origin.z))[0]??null;
}
export function createNetSplash(scene:T.Scene) {
  const root=new T.Group();root.name='net-splash';root.visible=false;scene.add(root);
  const material=new T.MeshBasicMaterial({color:'#e0fff1',transparent:true,opacity:.8,depthWrite:false});
  const ring=new T.Mesh(new T.RingGeometry(.38,.43,28),material);ring.rotation.x=-Math.PI/2;root.add(ring);
  const drops=Array.from({length:12},()=>{const d=new T.Mesh(new T.IcosahedronGeometry(.035,0),material);root.add(d);return d;});
  return {update(progress:number|null,point:Point|null,time:number){
    const age=progress===null?-1:(progress-.42)*SCOOP_DURATION;
    root.visible=!!point&&age>=0&&age<.65;if(!root.visible||!point)return;
    root.position.set(point.x,waterHeight(point.x,point.z,time)+.04,point.z);ring.scale.setScalar(1+age*2.8);material.opacity=Math.max(0,.8-age);
    drops.forEach((d,i)=>{const a=i*2.399;d.position.set(Math.cos(a)*age,Math.max(0,1.1*age-2*age*age),Math.sin(a)*age);});
  }};
}
