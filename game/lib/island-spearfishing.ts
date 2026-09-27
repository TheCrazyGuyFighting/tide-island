import type {FishAgent,Point} from './island-fishing';
import {terrainHeight,clamp} from './island-world';
export type SpearPhase='ready'|'firing'|'retrieving'|'reloading';
export type SpearStatus={phase:SpearPhase;message:string;remaining:number};
export const SPEAR_RANGE=12;
type Blocked=(p:Point)=>boolean;
const distance=(a:Point,b:Point)=>Math.hypot(a.x-b.x,a.y-b.y,a.z-b.z);
export function clearSpearPath(a:Point,b:Point,blocked:Blocked){
  const steps=Math.ceil(distance(a,b)/.12);
  for(let i=1;i<=steps;i++){const t=i/steps,p={x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t,z:a.z+(b.z-a.z)*t};if(p.y>=0||terrainHeight(p.x,p.z)>p.y-.025||blocked(p))return false;}
  return true;
}
export function spearCandidate(fish:FishAgent[],origin:Point,direction:Point,blocked:Blocked){
  return fish.filter(f=>{
    if(f.caught||!f.catchable||f.position.y>=-.1)return false;
    const dx=f.position.x-origin.x,dy=f.position.y-origin.y,dz=f.position.z-origin.z,t=dx*direction.x+dy*direction.y+dz*direction.z;
    const miss=Math.hypot(dx-direction.x*t,dy-direction.y*t,dz-direction.z*t),radius=clamp((f.length??f.clearance*2)*.25,.16,.48);
    return t>.4&&t<=SPEAR_RANGE&&miss<=radius&&clearSpearPath(origin,f.position,blocked);
  }).sort((a,b)=>distance(origin,a.position)-distance(origin,b.position))[0]??null;
}
export class Spearfishing{
  phase:SpearPhase='ready';elapsed=0;message='Wear scuba gear, dive and aim at a fish · F to fire';
  selected:FishAgent|null=null;origin:Point={x:0,y:0,z:0};end:Point={x:0,y:0,z:0};tip:Point={x:0,y:0,z:0};private resolved=false;
  constructor(private fish:FishAgent[],private blocked:Blocked,private reward:(f:FishAgent)=>boolean){}
  get active(){return this.phase!=='ready';}
  snapshot():SpearStatus{return {phase:this.phase,message:this.message,remaining:Math.max(0,(this.phase==='reloading'?2.6:this.phase==='retrieving'?1.2:this.phase==='firing'?.8:0)-this.elapsed)};}
  fire(origin:Point,direction:Point){
    if(this.active)return false;
    this.origin={...origin};this.tip={...origin};this.selected=spearCandidate(this.fish,origin,direction,this.blocked);this.resolved=false;
    if(this.selected){this.end={...this.selected.position};this.selected.target={...this.end};}
    else{let range=SPEAR_RANGE;for(let d=.2;d<=SPEAR_RANGE;d+=.2){const p={x:origin.x+direction.x*d,y:origin.y+direction.y*d,z:origin.z+direction.z*d};if(p.y>=0||terrainHeight(p.x,p.z)>p.y||this.blocked(p)){range=d;break;}}this.end={x:origin.x+direction.x*range,y:origin.y+direction.y*range,z:origin.z+direction.z*range};}
    this.phase='firing';this.elapsed=0;this.message='Spear away!';return true;
  }
  update(dt:number,hand:Point){
    if(!this.active)return;this.elapsed+=dt;
    if(this.phase==='firing'){
      const t=clamp(this.elapsed/.45,0,1);this.tip={x:this.origin.x+(this.end.x-this.origin.x)*t,y:this.origin.y+(this.end.y-this.origin.y)*t,z:this.origin.z+(this.end.z-this.origin.z)*t};
      if(this.elapsed>=.45&&!this.resolved){this.resolved=true;const f=this.selected;
        if(f&&!f.caught&&clearSpearPath(this.origin,f.position,this.blocked)&&this.reward(f)){f.target=null;f.landing={position:{...this.end},pitch:0,yaw:0,roll:0};this.message=`${f.name} caught! Retrieving to your hand…`;}
        else{if(f)f.target=null;this.selected=null;this.message='Missed. The spear is returning…';}
      }
      if(this.elapsed>=.8){this.phase='retrieving';this.elapsed=0;}
    }else if(this.phase==='retrieving'){
      const t=clamp(this.elapsed/1.2,0,1),u=t*t*(3-2*t);this.tip={x:this.end.x+(hand.x-this.end.x)*u,y:this.end.y+(hand.y-this.end.y)*u,z:this.end.z+(hand.z-this.end.z)*u};
      if(this.selected?.landing){this.selected.landing.position={...this.tip};this.selected.landing.roll=Math.sin(this.elapsed*22)*.18;}
      if(t>=1){if(this.selected)this.selected.landing=null;this.selected=null;this.phase='reloading';this.elapsed=0;this.message+=' Reloading…';}
    }else if(this.elapsed>=2.6){this.phase='ready';this.elapsed=0;this.message='Ready · aim at a fish within 12 m · F to fire';}
  }
  cancel(){if(this.selected){this.selected.target=null;this.selected.landing=null;}this.selected=null;this.phase='ready';this.elapsed=0;}
}
