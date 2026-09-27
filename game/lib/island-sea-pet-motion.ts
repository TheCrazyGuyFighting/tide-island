import * as T from 'three';
import {habitatLayout,seaBeachHeight} from './island-home-layout';
import type {HomeTier} from './island-habitat-types';
import type {PetPose} from './island-pet-animation';
// Map the existing independent swim goals into each enclosure's water area.
export function seaSwimPoint(p:T.Vector3,tier:HomeTier,addedArea=0){const h=habitatLayout('sea',tier,addedArea),left=h.x-h.rx*(h.shore?.12:.70),right=h.x+h.rx*.72;return new T.Vector3(T.MathUtils.lerp(left,right,T.MathUtils.clamp((p.x+58.1)/10.1,0,1)),Math.max(tier==='basic'?-1.1:-2,Math.min(-.6,p.y)),h.z+T.MathUtils.clamp((p.z-74.8)/2.5,-1,1)*Math.max(.6,h.rz-1.2));}
export class SeaResting {
  private age=0;private rest=0;private stage:'swim'|'approach'|'climb'|'bask'|'return'|'rejoin'='swim';private point=new T.Vector3();private restTimer:number;
  constructor(private identity:string){this.restTimer=16+[...identity].reduce((n,c)=>n+c.charCodeAt(0),0)%19;}
  update(dt:number,tier:HomeTier,root:T.Object3D,swim:T.Vector3,pose:PetPose,enabled:boolean,addedArea=0){
    const h=habitatLayout('sea',tier,addedArea);this.age+=dt;
    if(!enabled||!h.shore){this.stage='swim';root.position.copy(swim);return;}
    const lane=([ ...this.identity].reduce((n,c)=>n+c.charCodeAt(0),0)%3-1)*h.rz*.48;
    const water=new T.Vector3(h.x-h.rx*.08,-.8,h.z+lane),beach=new T.Vector3(h.x-h.rx*.81,tier==='standard'?.50:1.1,h.z+lane);
    if(this.stage==='swim'){root.position.copy(swim);if(this.age>this.restTimer){this.stage='approach';this.point.copy(root.position);this.age=0;}return;}
    if(this.stage==='bask'){pose.swim=0;pose.gait=0;pose.preen=Math.sin(this.age*.5)*.12;pose.breath=Math.sin(this.age*1.6);root.rotation.x=-.12;root.position.copy(beach);this.rest+=dt;if(this.rest>16){this.stage='return';this.rest=0;}return;}
    const target=this.stage==='approach'?water:this.stage==='climb'?beach:this.stage==='rejoin'?swim:water,delta=target.clone().sub(this.point),distance=delta.length();this.point.addScaledVector(delta,Math.min(1,dt*(this.stage==='climb'?.75:this.stage==='rejoin'?2.5:1.15)/Math.max(.01,distance)));root.position.copy(this.point);root.rotation.y=Math.atan2(delta.x,delta.z);pose.swim=Math.sin(this.age*5);pose.gait=.5;
    if(this.stage==='climb'||this.stage==='return'){const ground=seaBeachHeight(root.position.x,root.position.z,tier,addedArea);root.position.y=Math.max(root.position.y,(ground??-2)+.03);}
    if(distance<.12){if(this.stage==='approach')this.stage='climb';else if(this.stage==='climb'){this.stage='bask';this.rest=0;}else if(this.stage==='return')this.stage='rejoin';else{this.stage='swim';this.age=0;}}
  }
}
