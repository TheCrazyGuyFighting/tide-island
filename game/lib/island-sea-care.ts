import * as T from 'three';
import {createMarineCreature} from './island-original-marine';
import {seafoodSpec,type AnimalSkills} from './island-expansion-types';
export type SeaCareTarget={id:string;root:T.Group;hold:(v:boolean)=>void;pose:(time:number,effort:number)=>void;bounds:{x:number;z:number;rx:number;rz:number};};
type Prey={actor:ReturnType<typeof createMarineCreature>;from:T.Vector3;point:T.Vector3;velocity:T.Vector3;caught:boolean};
export class SeaCareController {
  private target:SeaCareTarget|null=null;private prey:Prey[]=[];private settle:((success:boolean)=>void)|null=null;private foodId='';private command='';private elapsed=0;private skills:AnimalSkills={hunting:0,trust:0};private spot=new T.Vector3();
  constructor(private scene:T.Scene){}
  get active(){return !!this.target;}
  get pouring(){return this.active&&!!this.foodId&&this.elapsed<1.4;}
  get message(){return this.command?this.command==='pet'?'Your animal comes close for a gentle keeper interaction.':this.command==='recall'?'Recall · your animal is responding to the trainer’s cue.':'Target practice · follow, touch, reward.':this.elapsed<1.4?'Pouring seafood into the sea home…':seafoodSpec(this.foodId)?.mode==='live'?'Hunting practice · watch your animal pursue the live prey.':'Your animal is collecting its meal.';}
  start(target:SeaCareTarget,foodId:string,origin:T.Vector3,skills:AnimalSkills,settle:(success:boolean)=>void){
    if(this.active)return false;const food=seafoodSpec(foodId);if(!food)return false;
    this.target=target;this.foodId=foodId;this.command='';this.elapsed=0;this.skills={...skills};this.settle=settle;target.hold(true);
    for(let i=0;i<3;i++){const actor=createMarineCreature(food.kind==='fish'?'mackerel':food.kind,'medium');actor.root.scale.setScalar(food.kind==='crab'?.25:.30);actor.root.visible=false;this.scene.add(actor.root);const h=target.bounds,p=new T.Vector3(h.x+h.rx*(.22+i*.13),food.kind==='crab'?-1.05:-.5-i*.18,h.z+(i-1)*Math.min(1.2,h.rz*.30));this.prey.push({actor,from:origin.clone(),point:p,velocity:new T.Vector3(Math.sin(i*2+1)*.45,0,Math.cos(i*2+1)*.45),caught:false});}return true;
  }
  interact(target:SeaCareTarget,command:'lesson'|'recall'|'pet',player:T.Vector3,skills:AnimalSkills,settle:(success:boolean)=>void){if(this.active)return false;this.target=target;this.command=command;this.foodId='';this.elapsed=0;this.skills={...skills};this.settle=settle;const h=target.bounds;this.spot.set(T.MathUtils.clamp(player.x,h.x+h.rx*.1,h.x+h.rx*.6),-.65,T.MathUtils.clamp(player.z,h.z-h.rz*.55,h.z+h.rz*.55));target.hold(true);return true;}
  update(dt:number,time:number){
    const t=this.target;if(!t)return;dt=Math.max(0,Math.min(.05,dt));this.elapsed+=dt;
    if(this.elapsed>30){this.finish(false);return;}
    const h=t.bounds,food=seafoodSpec(this.foodId),live=food?.mode==='live';
    if(this.command){const distance=this.move(this.spot,dt,1.05+this.skills.trust*.02,time);t.pose(time,distance>.2?.8:.1);if(distance<.22){t.root.rotation.x=this.command==='pet'?Math.sin(time*3)*.055:Math.sin(time*4)*.12;if(this.elapsed>5)this.finish(true);}return;}
    for(let i=0;i<this.prey.length;i++){
      const p=this.prey[i];if(p.caught)continue;const age=this.elapsed-i*.20;
      if(age<.25)continue;p.actor.root.visible=true;
      if(age<1.25){const u=(age-.25);p.actor.root.position.copy(p.from).lerp(p.point,u);p.actor.root.position.y+=Math.sin(u*Math.PI)*.3;p.actor.root.rotation.z=u*3;continue;}
      if(live){p.velocity.applyAxisAngle(new T.Vector3(0,1,0),Math.sin(time*1.7+i)*dt*.7);p.point.addScaledVector(p.velocity,dt*(food?.kind==='crab'?.28:1));const lo=h.x+h.rx*.06,hi=h.x+h.rx*.72,rz=Math.max(.3,h.rz*.64);if(p.point.x<lo||p.point.x>hi)p.velocity.x*=-1;if(Math.abs(p.point.z-h.z)>rz)p.velocity.z*=-1;p.point.x=T.MathUtils.clamp(p.point.x,lo,hi);p.point.z=T.MathUtils.clamp(p.point.z,h.z-rz,h.z+rz);}
      p.actor.root.position.copy(p.point);p.actor.root.rotation.set(0,Math.atan2(p.velocity.x,p.velocity.z),live?0:Math.PI/2);if(live)p.actor.update(time+i,1);
    }
    if(this.elapsed<1.35){t.pose(time,.3);return;}
    const remaining=this.prey.filter(p=>!p.caught).sort((a,b)=>a.point.distanceToSquared(t.root.position)-b.point.distanceToSquared(t.root.position));
    if(!remaining.length){this.finish(true);return;}
    const next=remaining[0],distance=this.move(next.point,dt,(live?1.2:1.4)+this.skills.hunting*.022,time);t.pose(time,live?1:.6);
    if(distance<.22+this.skills.hunting*.001){next.caught=true;next.actor.root.visible=false;t.root.rotation.x=-.12;}
  }
  private move(point:T.Vector3,dt:number,speed:number,time:number){const t=this.target!,delta=point.clone().sub(t.root.position),d=delta.length();t.root.position.addScaledVector(delta,Math.min(1,speed*dt/Math.max(.001,d)));const yaw=Math.atan2(delta.x,delta.z);t.root.rotation.y+=Math.atan2(Math.sin(yaw-t.root.rotation.y),Math.cos(yaw-t.root.rotation.y))*Math.min(1,dt*4);t.root.rotation.x=Math.sin(time*3)*.035;return d;}
  private finish(success:boolean){const target=this.target,settle=this.settle;this.target=null;this.settle=null;target?.hold(false);for(const p of this.prey){p.actor.root.removeFromParent();p.actor.dispose();}this.prey=[];settle?.(success);}
  cancel(){this.finish(false);}
  dispose(){this.cancel();}
}
