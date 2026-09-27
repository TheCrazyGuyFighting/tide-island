import * as T from 'three';
import { AVIARY } from './island-home-layout';
import { canonicalPetId } from './island-shop';
import type { PetPose } from './island-pet-animation';

export type PetAction='walk'|'watch'|'peck'|'preen'|'hop'|'takeoff'|'flap'|'glide'|'landing'|'swim'|'dive'|'surface'|'float';
type Neighbour={id:string;position:T.Vector3};
const clamp=T.MathUtils.clamp,GROUND=AVIARY.y+.11;
function seedFor(id:string){let n=2166136261;for(const c of id)n=Math.imul(n^c.charCodeAt(0),16777619);return n>>>0;}
// Air lanes reserve wingtip clearance from all four walls. Floor obstacles may
// only be crossed above the perches; landing always uses the ground mask.
export function petPositionSafe(id:string,x:number,z:number,y=GROUND){
  id=canonicalPetId(id);
  if(id==='pet-dolphin'||id==='pet-sea-lion')return x>-58.1&&x<-48&&z>72.3&&z<77.3&&!(x<-56.8&&z>75.8)&&!(x>-55.5&&x<-50.5&&z<73);
  if(x<-58.8||x>-49.3||z<39.1||z>46.8)return false;
  if(y>GROUND+2.3)return true;
  if(x>-51&&z>43.3&&z<44.7)return false;
  if(Math.hypot(x+52.6,z-44.8)<1)return false;
  return [-56,-54,-52].every(px=>Math.hypot(x-px,z-41.5)>.75);
}
const inAirLane=(x:number,z:number)=>x>-57.8&&x<-50.3&&z>40&&z<46;
function clearSegment(id:string,a:T.Vector3,b:T.Vector3){
  const steps=Math.ceil(a.distanceTo(b)/.15);
  for(let i=1;i<=steps;i++)if(!petPositionSafe(id,T.MathUtils.lerp(a.x,b.x,i/steps),T.MathUtils.lerp(a.z,b.z,i/steps),Math.min(a.y,b.y)))return false;
  return true;
}

/** Seeded goals, acceleration and flight phases; never an orbit formula. */
export class PetBehaviour {
  readonly id:string;readonly position=new T.Vector3();readonly target=new T.Vector3();
  readonly pose:PetPose={gait:0,stride:0,peck:0,preen:0,look:0,flap:0,swim:0,turn:0,breath:0,flight:0,landing:0};
  action:PetAction='watch';heading=0;speed=0;verticalSpeed=0;age=0;
  readonly sea:boolean;
  private seed:number;private timer=0;private actionAge=0;private feedTime=0;private targetSpeed=.6;
  private flightAfter:number;private flightLeft=0;private foodWaiting=false;private flightPhase=0;
  get flying(){return ['takeoff','flap','glide','landing'].includes(this.action);}
  constructor(id:string,identity=id){
    id=canonicalPetId(id);this.id=identity;this.seed=seedFor(identity);this.sea=id==='pet-dolphin'||id==='pet-sea-lion';
    const starts:Record<string,[number,number]>={
      'pet-seagull':[-57.3,45.4],'pet-white-pelican':[-55.3,45.8],'pet-brown-pelican':[-53.4,46.2],
      'pet-heron':[-50.5,46.1],'pet-great-egret':[-57.8,42.7],'pet-snowy-egret':[-57.3,39.8],
      'pet-osprey':[-54.8,39.8],'pet-white-stork':[-50.4,40],
      'pet-dolphin':[-50.1,75.4],'pet-sea-lion':[-56.6,73.8],
    };
    const [x,z]=starts[id]??[-54,45];this.position.set(x,this.sea?-1.1:GROUND,z);
    if(identity!==id)for(let i=0;i<40;i++){const nx=this.sea?-57.7+this.random()*9.2:-58.3+this.random()*8.4,nz=this.sea?72.6+this.random()*4.3:39.6+this.random()*6.6;if(petPositionSafe(id,nx,nz)){this.position.x=nx;this.position.z=nz;break;}}
    this.target.copy(this.position);this.heading=this.random()*Math.PI*2;this.timer=.4+this.random()*1.7;
    this.flightAfter=5+this.random()*9;this.flightPhase=this.random()*Math.PI*2;
    if(this.sea)this.chooseTarget();
  }
  private random(){this.seed=(Math.imul(1664525,this.seed)+1013904223)>>>0;return this.seed/4294967296;}
  feed(){
    if(this.sea){this.feedTime=2.8;return;}
    if(this.flying){this.foodWaiting=true;this.flightLeft=0;}
    else{this.feedTime=3;this.flightAfter=Math.max(this.flightAfter,8);this.setAction('peck',3);this.target.copy(this.position);this.speed=0;}
  }
  private setAction(action:PetAction,duration:number){this.action=action;this.timer=duration;this.actionAge=0;}
  private chooseTarget(air=false,landing=false,neighbours:Neighbour[]=[],player?:{x:number;y:number;z:number}){
    for(let i=0;i<90;i++){
      const t=new T.Vector3(this.sea?-57.7+this.random()*9.2:air?-57.5+this.random()*6.9:-58.3+this.random()*8.4,
        this.sea?-1.1:air?GROUND+2.65+this.random()*.25:GROUND,
        this.sea?72.6+this.random()*4.3:air?40.3+this.random()*5.4:39.6+this.random()*6.6);
      if(t.distanceTo(this.position)<(landing?.4:1.5)||!petPositionSafe(this.id,t.x,t.z,landing?GROUND:t.y)||!clearSegment(this.id,this.position,t))continue;
      if(landing&&(neighbours.some(n=>n.id!==this.id&&Math.hypot(n.position.x-t.x,n.position.z-t.z)<1.25)||player&&Math.hypot(player.x-t.x,player.z-t.z)<1.5))continue;
      this.target.copy(t);this.targetSpeed=this.sea?.65+this.random()*.65:air?1.5+this.random()*.5:.45+this.random()*.28;
      if(this.sea){const r=this.random();this.setAction(r<.38?'dive':r<.74?'surface':'swim',15);this.target.y=this.action==='dive'?-2.4:this.action==='surface'?-.45:-1.2;}
      else this.setAction(landing?'landing':air?(this.random()<.4?'glide':'flap'):'walk',air?8:18);
      return true;
    }
    return false;
  }
  update(dt:number,neighbours:Neighbour[]=[],player?:{x:number;y:number;z:number}){
    dt=clamp(dt,0,.05);this.age+=dt;this.actionAge+=dt;this.timer-=dt;this.feedTime=Math.max(0,this.feedTime-dt);
    const wasFlying=this.flying;
    if(!this.sea&&!wasFlying){
      this.flightAfter-=this.feedTime?0:dt;
      if(this.flightAfter<=0&&this.feedTime===0&&inAirLane(this.position.x,this.position.z)&&petPositionSafe(this.id,this.position.x,this.position.z)&&
        !neighbours.some(n=>n.id!==this.id&&this.position.distanceTo(n.position)<1.4)&&!(player&&Math.hypot(player.x-this.position.x,player.z-this.position.z)<1.5)){
        this.target.copy(this.position);this.target.y=GROUND+2.7;this.setAction('takeoff',5);this.flightLeft=12+this.random()*10;this.speed=0;
      }
    }
    if(this.flying&&this.action!=='takeoff'){
      this.flightLeft-=dt;
      if((this.flightLeft<=0||this.foodWaiting)&&this.action!=='landing')this.chooseTarget(true,true,neighbours,player);
    }
    const moving=this.sea?this.action!=='float':this.flying?this.action!=='takeoff':this.action==='walk';
    let horizontal=Math.hypot(this.target.x-this.position.x,this.target.z-this.position.z),turn=0;
    if(moving&&horizontal>.06){
      let dx=this.target.x-this.position.x,dz=this.target.z-this.position.z,blocked=false;
      for(const other of neighbours){
        if(other.id===this.id||Math.abs(other.position.y-this.position.y)>.9)continue;
        const ox=this.position.x-other.position.x,oz=this.position.z-other.position.z,d=Math.hypot(ox,oz),space=this.sea?1.65:this.flying?2:.92;
        if(d<space&&d>.001){dx+=ox/d*(space-d)*3;dz+=oz/d*(space-d)*3;if(d<space*.55)blocked=true;}
      }
      if(player&&!this.sea&&Math.abs(player.y-this.position.y)<1.5){
        const ox=this.position.x-player.x,oz=this.position.z-player.z,d=Math.hypot(ox,oz);
        if(d<1.2){dx+=ox/Math.max(.1,d)*(1.2-d)*4;dz+=oz/Math.max(.1,d)*(1.2-d)*4;blocked=d<.7;}
      }
      const goal=Math.atan2(dx,dz),error=Math.atan2(Math.sin(goal-this.heading),Math.cos(goal-this.heading));
      turn=clamp(error,-1,1);const rate=this.sea?1.6:this.flying?2.3:2.7;this.heading+=clamp(error,-dt*rate,dt*rate);
      const desired=this.targetSpeed*Math.max(0,Math.cos(error))*(blocked?.15:1)*Math.min(1,horizontal/.65);
      this.speed=T.MathUtils.damp(this.speed,desired,4,dt);
      const step=Math.min(horizontal,this.speed*dt),x=this.position.x+Math.sin(this.heading)*step,z=this.position.z+Math.cos(this.heading)*step;
      if(petPositionSafe(this.id,x,z,this.position.y)&&(!this.flying||inAirLane(x,z))){this.position.x=x;this.position.z=z;}
      else{this.speed=0;this.timer=0;}
    }else this.speed=T.MathUtils.damp(this.speed,0,8,dt);
    horizontal=Math.hypot(this.target.x-this.position.x,this.target.z-this.position.z);
    this.verticalSpeed=0;
    if(this.sea||this.flying){
      let targetY=this.target.y;
      if(this.action==='takeoff'&&this.actionAge<.4)targetY=GROUND;
      if(this.action==='landing'&&horizontal<.25){
        const occupied=neighbours.some(n=>n.id!==this.id&&Math.abs(n.position.y-GROUND)<1&&Math.hypot(n.position.x-this.position.x,n.position.z-this.position.z)<1)||
          player&&Math.hypot(player.x-this.position.x,player.z-this.position.z)<1.35;
        if(occupied||!petPositionSafe(this.id,this.position.x,this.position.z))this.chooseTarget(true,true,neighbours,player);
        else targetY=GROUND;
      }
      const dy=clamp((targetY-this.position.y)*2,this.sea?-.4:-.95,this.sea?.4:1.25);
      this.position.y+=dy*dt;this.verticalSpeed=dy;
    }
    if(this.action==='takeoff'){
      if(this.position.y>GROUND+2.5){if(!this.chooseTarget(true))this.setAction('glide',1);}
    }else if(this.action==='landing'){
      if(this.position.y<GROUND+.025&&horizontal<.3){
        this.position.y=GROUND;this.verticalSpeed=0;this.speed=0;this.target.copy(this.position);
        this.flightAfter=9+this.random()*12;this.setAction(this.foodWaiting?'peck':'watch',this.foodWaiting?3:1.5);
        if(this.foodWaiting){this.feedTime=3;this.foodWaiting=false;}
      }else if(this.timer<0&&this.position.y>GROUND+2)this.chooseTarget(true,true,neighbours,player);
    }else if((moving&&horizontal<.22)||this.timer<=0){
      if(this.feedTime>0&&!this.sea)this.setAction('peck',this.feedTime);
      else if(this.sea){
        if(this.id==='pet-sea-lion'&&this.action!=='float'&&this.random()<.45){this.setAction('float',2+this.random()*3);this.target.copy(this.position);this.target.y=-.55;}
        else this.chooseTarget();
      }else if(this.flying)this.chooseTarget(true);
      else if(this.action==='walk'){const r=this.random();this.setAction(r<.38?'peck':r<.6?'preen':r<.72?'hop':'watch',1.3+this.random()*2.8);}
      else if(!this.chooseTarget())this.setAction('watch',1);
    }
    const p=this.pose,air=this.flying;
    const extension=this.action==='takeoff'?clamp(this.actionAge/.6,0,1):air?1:0;
    p.flight=T.MathUtils.damp(p.flight??0,extension,air?8:5,dt);
    p.landing=T.MathUtils.damp(p.landing??0,this.action==='landing'&&horizontal<.7?1:0,4,dt);
    p.gait=T.MathUtils.damp(p.gait,air?0:clamp(this.speed/.65,0,1),8,dt);p.stride+=this.speed*dt*13;
    const envelope=Math.min(1,this.actionAge*3,Math.max(0,this.timer*3));
    p.peck=T.MathUtils.damp(p.peck,!air&&(this.feedTime>0||this.action==='peck')?Math.pow(Math.max(0,Math.sin(this.actionAge*5)),2)*envelope:0,18,dt);
    p.preen=T.MathUtils.damp(p.preen,this.action==='preen'?Math.sin(this.actionAge*2.6)*envelope:0,8,dt);
    let look=Math.sin(this.age*.73)*.35;
    if(player&&Math.hypot(player.x-this.position.x,player.z-this.position.z)<3){const a=Math.atan2(player.x-this.position.x,player.z-this.position.z)-this.heading;look=clamp(Math.atan2(Math.sin(a),Math.cos(a)),-.65,.65);}
    p.look=T.MathUtils.damp(p.look,look,5,dt);p.turn=T.MathUtils.damp(p.turn,turn,4,dt);
    const frequency=this.id.includes('pelican')||this.id.includes('stork')?6:9;
    this.flightPhase+=dt*(this.action==='takeoff'?frequency*1.3:frequency);
    p.flap=T.MathUtils.damp(p.flap,this.action==='glide'?.08:Math.sin(this.flightPhase)*.8,18,dt);
    p.swim=Math.sin(this.age*(this.action==='float'?1.5:5));p.breath=Math.sin(this.age*2);
  }
  apply(root:T.Object3D){
    root.position.copy(this.position);root.rotation.set(0,this.heading,0,'YXZ');
    if(this.sea){root.rotation.x=(this.id==='pet-sea-lion'?Math.PI/3:0)-Math.atan2(this.verticalSpeed,Math.max(.4,this.speed));root.rotation.z=this.pose.turn*-.09;}
    else if(this.flying){root.rotation.z=this.pose.turn*-.2;root.rotation.x=-clamp(this.verticalSpeed*.12,-.12,.15);}
    else{root.position.y+=this.action==='hop'?Math.sin(Math.min(1,this.actionAge/.65)*Math.PI)*.15:this.pose.gait*Math.sin(this.pose.stride*2)*.012;root.rotation.z=Math.sin(this.pose.stride)*this.pose.gait*.018;}
    root.userData.behaviour=this.action;
  }
}
