import * as T from 'three';
import {terrainHeight} from './island-world';
import {AVIARY,birdPassage} from './island-home-layout';
import {isPet,isAquaticPet,equipmentName,canonicalPetId} from './island-shop';
import type {FishAgent,Point} from './island-fishing';
import type {PetPose,createPetAnimation} from './island-pet-animation';
import type {Collider} from './island-physics';

export type BirdPhase='home'|'calling'|'perched'|'outbound'|'hunting'|'eating'|'returning'|'homing';
export type BirdStatus={id:string|null;phase:BirdPhase;message:string;doubleWindow:number;queued:boolean;petting:boolean;blocker?:string|null};
export type HuntStyle='scoop'|'plunge'|'talons'|'stalk'|'skim';
export const birdStyle=(id:string):HuntStyle=>{id=canonicalPetId(id);return id==='pet-white-pelican'?'scoop':id==='pet-brown-pelican'?'plunge':id==='pet-osprey'?'talons':id==='pet-seagull'?'skim':'stalk';};
export const birdStrategy=(id:string)=>({scoop:'Land on the surface · scoop · drain and gulp',plunge:'Climb · plunge head-first · surface and gulp',talons:'Hover · dive feet-first · grip with talons',stalk:'Land in shallows · stalk · strike with the bill',skim:'Glide low · snatch a near-surface fish'}[birdStyle(id)]);
type Actor=ReturnType<typeof createPetAnimation>;
type Hunt={fish:FishAgent;water:T.Vector3;stand:T.Vector3};
const vec=(p:Point)=>new T.Vector3(p.x,p.y,p.z);
// A real, unreserved fish is attracted within reach. Wading birds must find an
// actual shallow bank; they never stand on deep water or spawn a reward fish.
export function birdHuntTarget(id:string,fish:FishAgent[],hand:Point):Hunt|null{
  const style=birdStyle(id);
  for(const f of fish.filter(f=>f.catchable&&!f.caught&&!f.target&&(f.length??1)<1.7&&f.position.y<-.1&&f.position.y>-5&&vec(f.position).distanceTo(vec(hand))<48).sort((a,b)=>vec(a.position).distanceTo(vec(hand))-vec(b.position).distanceTo(vec(hand)))){
    let water=vec(f.position),stand=new T.Vector3(water.x,.05,water.z);
    if(style==='stalk'){
      let found=false;
      for(let r=1;r<=10&&!found;r+=.6)for(let i=0;i<32;i++){
        const a=i*Math.PI/16,x=f.position.x+Math.sin(a)*r,z=f.position.z+Math.cos(a)*r,h=terrainHeight(x,z);
        if(h<-.65||h>-.12)continue;
        const dx=(f.position.x-x)/r,dz=(f.position.z-z)/r,wx=x+dx*1.6,wz=z+dz*1.6,bed=terrainHeight(wx,wz);
        if(bed>-(f.clearance*2+.45)||bed<-2.8)continue;
        let clear=true;for(let j=1;j<20;j++){const t=j/20;if(terrainHeight(f.position.x+(wx-f.position.x)*t,f.position.z+(wz-f.position.z)*t)>-f.clearance*2-.4){clear=false;break;}}
        if(!clear)continue;stand.set(x,h+.02,z);water.set(wx,-f.clearance-.3,wz);found=true;break;
      }
      if(!found)continue;
    }else water.y=-f.clearance-.3;
    return {fish:f,water,stand};
  }return null;
}

export class BirdCompanion{
  id:string|null=null;phase:BirdPhase='home';message='Choose your bird · press G or Whistle to call it.';
  private actor:Actor|null=null;private pose:PetPose={gait:0,stride:0,peck:0,preen:0,look:0,flap:0,swim:0,turn:0,breath:0,flight:0,landing:0};
  private route:T.Vector3[]=[];private hunt:Hunt|null=null;private age=0;private clock=0;private lastBlow=-Infinity;private petUntil=0;private queued=false;private homePoint=new T.Vector3();private caught=false;
  private perch=new T.Vector3();private perchYaw=0;private done:'perch'|'hunt'|'home'='perch';private passage=false;
  constructor(private homes:{borrowBird:(id:string)=>Actor|null;returnBird:(id:string)=>void;passage?:typeof birdPassage},private fish:FishAgent[],private colliders:Collider[],private meal:(id:string)=>void,private now=()=>performance.now()/1000){}
  get away(){return this.phase!=='home';}
  get activeId(){return this.actor?this.id:null;}
  get splash(){return this.phase==='eating'&&this.hunt?{point:this.hunt.water,progress:.42+this.age/1.2}:null;}
  snapshot():BirdStatus{return {id:this.id,phase:this.phase,message:this.message,doubleWindow:Math.max(0,3-(this.now()-this.lastBlow)),queued:this.queued,petting:this.clock<this.petUntil};}
  select(id:string,owned:string[]){if(!isPet(id)||isAquaticPet(id)||!owned.includes(id))return false;if(this.away&&id!==this.id){this.message='Return this bird home before choosing another.';return false;}this.id=id;this.lastBlow=-Infinity;return true;}
  private path(to:T.Vector3){
    const from=this.actor!.root.position;let altitude=Math.max(from.y,to.y)+3;
    const n=Math.ceil(from.distanceTo(to));for(let i=0;i<=n;i++){const p=from.clone().lerp(to,n?i/n:1);altitude=Math.max(altitude,terrainHeight(p.x,p.z)+4);for(const c of this.colliders)if(c.enabled!==false&&Math.abs(c.x-p.x)<c.rx+1.5&&Math.abs(c.z-p.z)<c.rz+1.5)altitude=Math.max(altitude,c.y+c.ry+2);}
    this.route=[new T.Vector3(from.x,altitude,from.z),new T.Vector3(to.x,altitude,to.z),to.clone()];this.passage=false;
  }
  whistle(owned:string[],gateOpen:boolean,nearGate:boolean,inside=false){
    if(!owned.includes('bird-glove')||!owned.includes('whistle')){this.message='Buy both the bird-handling glove and whistle first.';return false;}
    if(!this.id||!owned.includes(this.id))this.id=owned.find(id=>isPet(id)&&!isAquaticPet(id))??null;
    if(!this.id||!owned.includes(this.id)){this.message='Buy a bird and its aviary first, then choose the bird here.';return false;}
    const now=this.now(),double=now-this.lastBlow<3;this.lastBlow=double?-Infinity:now;
    if(double){
      if(inside&&['calling','perched'].includes(this.phase)){this.message='Step outside through the open gate with your bird before sending it fishing.';return true;}
      if(this.phase==='calling'){this.queued=true;this.message='Two whistles heard! Your bird will hunt after reaching the glove.';return true;}
      if(this.phase==='perched'){this.beginHunt();return true;}
      this.message=this.phase==='home'?'Call the bird through its open aviary gate first.':'Your bird is already out. One whistle recalls it.';return true;
    }
    if(this.phase==='home'){
      if(!inside&&(!gateOpen||!nearGate)){this.message='Stand by the aviary’s open gate to take your bird out.';this.lastBlow=-Infinity;return false;}
      this.actor=this.homes.borrowBird(this.id);if(!this.actor){this.message='Your bird is still arriving. Try again in a moment.';this.lastBlow=-Infinity;return false;}
      this.homePoint.copy(this.actor.root.position);this.actor.root.scale.setScalar(.85);this.phase='calling';this.done='perch';this.passage=true;
      const passage=this.homes.passage?.()??birdPassage();this.route=[new T.Vector3(this.homePoint.x,passage.inside.y,this.homePoint.z),vec(passage.inside),vec(passage.door),vec(passage.outside)];
      this.message=`${equipmentName(this.id)} is coming through the gate. Whistle again within 3 seconds to send it fishing.`;
      if(inside){this.passage=false;this.route=[this.perch.clone()];this.message=`${equipmentName(this.id)} is coming to your glove inside the aviary.`;}
    }else if(this.phase==='perched'){this.message='Your bird is on the glove. Whistle again within 3 seconds to send it fishing.';}
    else if(this.phase!=='homing'){this.releaseFish();this.queued=false;this.phase='returning';this.done='perch';this.path(this.perch);this.message='Recall heard · returning to your glove.';}
    return true;
  }
  private beginHunt(){
    this.queued=false;const hunt=birdHuntTarget(this.id!,this.fish,this.perch);
    if(!hunt){this.message=birdStyle(this.id!)==='stalk'?'No reachable fish beside a shallow bank. Try nearer the lagoon shore.':'No small fish in range. Move closer to swimming fish.';return;}
    this.hunt=hunt;this.caught=false;hunt.fish.target={...hunt.water};this.phase='outbound';this.done='hunt';this.path(new T.Vector3(hunt.stand.x,birdStyle(this.id!)==='stalk'?hunt.stand.y:5,hunt.stand.z));this.message=birdStrategy(this.id!);this.age=0;
  }
  pet(){if(this.phase!=='perched'){this.message='Call your bird onto the glove first.';return false;}this.petUntil=this.clock+2.1;this.message=`${equipmentName(this.id!)} leans into a gentle scratch.`;return true;}
  sendHome(gateOpen:boolean,nearGate:boolean,inside=false){if(!this.away)return;if(!inside&&(!gateOpen||!nearGate)){this.message='Return to the aviary’s open gate to put your bird home.';return;}this.releaseFish();this.queued=false;this.phase='homing';this.done='home';if(inside){this.passage=true;this.route=[this.homePoint.clone()];this.message='Returning to its perch inside the aviary…';}else{this.path(vec((this.homes.passage?.()??birdPassage()).outside));this.message='Returning through the aviary gate…';}}
  private releaseFish(){if(this.hunt){if(!this.hunt.fish.caught)this.hunt.fish.target=null;if(this.caught)this.hunt.fish.landing=null;}this.hunt=null;this.caught=false;}
  reset(){this.releaseFish();if(this.actor&&this.id)this.homes.returnBird(this.id);this.actor=null;this.phase='home';this.route=[];this.queued=false;this.petUntil=0;this.lastBlow=-Infinity;this.message='Your bird is safe at home.';}
  update(dt:number,hand:Point,yaw:number){
    dt=Math.min(.05,Math.max(0,dt));this.clock+=dt;this.perch.copy(vec(hand));this.perchYaw=yaw;if(!this.actor)return;this.age+=dt;
    const root=this.actor.root,p=this.pose,style=birdStyle(this.id!);p.breath=Math.sin(this.clock*2);p.flap=Math.sin(this.clock*(style==='scoop'||style==='plunge'?6:9))*.8;p.peck=0;p.preen=0;p.gait=0;p.flight=0;p.landing=0;p.look=Math.sin(this.clock*.7)*.2;root.rotation.x=0;root.rotation.z=0;
    if(['calling','outbound','returning','homing'].includes(this.phase)){
      let target=this.route[0];if(target){const delta=target.clone().sub(root.position),d=delta.length(),speed=this.passage?3:9;root.position.addScaledVector(delta,Math.min(1,speed*dt/Math.max(.001,d)));if(Math.hypot(delta.x,delta.z)>.02)root.rotation.y=Math.atan2(delta.x,delta.z);p.flight=this.passage?.12:1;if(d<.15)this.route.shift();}
      if(!this.route.length){
        if(this.passage&&this.phase==='calling'){this.passage=false;this.path(this.perch);}
        else if(this.done==='hunt'){this.phase='hunting';this.age=0;}
        else if(this.done==='home'){if(!this.passage){this.passage=true;const passage=this.homes.passage?.()??birdPassage();this.route=[vec(passage.door),vec(passage.inside),this.homePoint.clone()];}else this.reset();}
        else{if(root.position.distanceTo(this.perch)>1.5)this.path(this.perch);else{this.phase='perched';this.age=0;this.message='On your glove · pet it or whistle twice to hunt.';if(this.queued)this.beginHunt();}}
      }
    }else if(this.phase==='perched'){
      root.position.lerp(this.perch,1-Math.exp(-18*dt));root.rotation.y=yaw;root.scale.setScalar(.7);p.preen=this.clock<this.petUntil?Math.sin((this.petUntil-this.clock)*3)*.25:0;p.look=this.clock<this.petUntil?.45:p.look;
    }else if(this.phase==='hunting'&&this.hunt){
      root.scale.setScalar(.95);const h=this.hunt,t=this.age;root.rotation.y=Math.atan2(h.water.x-h.stand.x,h.water.z-h.stand.z);
      const strikeAt=style==='stalk'?3.2:style==='scoop'?2.8:2;
      if(style==='stalk'){root.position.copy(h.stand);root.position.x+=Math.sin(t*2)*.04;p.gait=t<1.5?.3:0;p.stride+=dt*5;p.peck=t>2.2?Math.min(1,(t-2.2)*1.5):0;}
      else{const down=T.MathUtils.smoothstep(t,style==='scoop'?0:.6,style==='scoop'?1.6:1.9);root.position.set(h.water.x,T.MathUtils.lerp(5,style==='talons'?.28:style==='plunge'?-.35:0,down),h.water.z);p.flight=1-down;p.landing=down;root.rotation.x=style==='plunge'?-Math.sin(down*Math.PI)*1.05:style==='talons'?Math.sin(down*Math.PI)*.55:0;p.peck=style==='scoop'&&t>1.7?Math.min(1,(t-1.7)*1.2):0;}
      if(t>=strikeAt){
        const f=h.fish;if(!f.caught&&f.catchable&&vec(f.position).distanceTo(h.water)<2.5){f.caught=true;f.target=null;f.landing={position:{...root.position},pitch:0,yaw:root.rotation.y,roll:0};this.caught=true;this.meal(this.id!);this.phase='eating';this.age=0;this.message=`${equipmentName(this.id!)} caught ${f.name} · ${style==='talons'?'gripping with its talons':'lifting its bill'}…`;}
        else{this.releaseFish();this.phase='returning';this.done='perch';this.path(this.perch);this.message='The fish got away. Returning to your glove.';}
      }
    }else if(this.phase==='eating'&&this.hunt){
      p.peck=this.age<1?.8:-(Math.sin(Math.min(1,(this.age-1)/1.3)*Math.PI)*.45);p.preen=style==='talons'?.2:0;
      if(this.hunt.fish.landing){root.updateMatrixWorld(true);const head=root.getObjectByName('pet-head'),pos=style==='talons'?root.localToWorld(new T.Vector3(0,.08,.10)):head?head.localToWorld(new T.Vector3(0,.04,.12)):root.localToWorld(new T.Vector3(0,.5,.38));this.hunt.fish.landing.position={...pos};this.hunt.fish.landing.pitch=Math.sin(this.age*4)*.2;}
      if(this.age>2.6){this.releaseFish();this.phase='returning';this.done='perch';this.path(this.perch);this.message='A good meal! Returning to your glove.';}
    }
    if(this.actor){root.userData.behaviour=this.phase;this.actor.animate(p,dt);}
  }
}
