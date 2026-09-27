import * as T from 'three';
import type {FishAgent,Point} from './island-fishing';
import {terrainHeight} from './island-world';
export class FishingBow{
  active=false;cooldown=0;elapsed=0;message='Aim slightly above a near-surface fish · F to shoot · net to collect';
  tip=new T.Vector3();velocity=new T.Vector3();origin=new T.Vector3();
  constructor(private fish:FishAgent[],private blocked:(p:Point)=>boolean){}
  fire(origin:Point,direction:Point){if(this.cooldown>0||this.active)return false;this.tip.set(origin.x,origin.y,origin.z);this.origin.copy(this.tip);this.velocity.set(direction.x,direction.y,direction.z).normalize().multiplyScalar(22);this.active=true;this.elapsed=0;this.cooldown=1.2;this.message='Arrow away…';return true;}
  update(dt:number){this.cooldown=Math.max(0,this.cooldown-dt);if(!this.active)return;for(let i=0;i<4;i++){const step=dt/4;this.elapsed+=step;this.velocity.y-=2.5*step;const from=this.tip.clone();this.tip.addScaledVector(this.velocity,step);if(this.elapsed>1.5||terrainHeight(this.tip.x,this.tip.z)>this.tip.y||this.blocked(this.tip)){this.active=false;this.message='Arrow stopped. Aim into clear water.';return;}
    const segment=new T.Line3(from,this.tip),closest=new T.Vector3();
    const f=this.fish.find(f=>{if(f.caught||!f.catchable||f.injured||f.position.y< -2.1||(f.length??1)>2.2)return false;segment.closestPointToPoint(new T.Vector3(f.position.x,f.position.y,f.position.z),true,closest);return closest.distanceTo(new T.Vector3(f.position.x,f.position.y,f.position.z))<Math.max(.17,(f.length??1)*.28);});
    if(f){f.injured='struggling';f.injuryTime=0;f.target=null;this.active=false;this.message=`${f.name} hit · switch to the net and scoop it from the surface.`;return;}
  }}
}
