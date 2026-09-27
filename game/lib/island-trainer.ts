import * as T from 'three';
import {createOutfitRig} from './island-outfits';
import {SeaCareController,type SeaCareTarget} from './island-sea-care';
import {SHOP_ITEMS,equipmentName,isAquaticPet,petRoster,type ShopInventory,type ShopResult} from './island-shop';
import {SEAFOOD,seafoodSpec} from './island-expansion-types';
import type {habitatLayout} from './island-home-layout';

type Layout=ReturnType<typeof habitatLayout>;
export type TrainerPhase='paused'|'observing'|'walking'|'cue'|'feeding'|'lesson'|'water'|'reward'|'waiting';
export type TrainerSnapshot={hired:boolean;enabled:boolean;phase:TrainerPhase;message:string;balance:number;spent:number;allocated:number;refunded:number;supplies:Record<string,number>;log:{id:number;message:string;cost:number}[]};
type Job={kind:'feed'|'lesson'|'recall'|'water';pet?:string;food?:string};
type Homes={trainer:T.Group;trainerLayout:()=>Layout;installed:(home:'sea')=>boolean;seaTarget:(id:string)=>SeaCareTarget|null};

/** Local game agent: observes needs, chooses a job, executes it, then reassesses.
 * Its wallet and supplies are separate from the player's inventory. No real money,
 * network calls, hidden top-ups, equipment changes, or purchases outside pet care.
 */
export class MarineTrainer {
  enabled=false;balance=0;spent=0;allocated=0;refunded=0;
  phase:TrainerPhase='paused';message='Give me a care budget when you are ready.';
  readonly supplies:Record<string,number>={};
  private controller:SeaCareController;
  private log:TrainerSnapshot['log']=[];private sequence=0;private clock=0;private timer=0;private review=0;
  private fed=new Map<string,number>();private trained=new Map<string,number>();private watered=0;
  private job:Job|null=null;private destination=new T.Vector3();private layoutKey='';private gait=0;private oldMeals=new Map<string,number>();
  private gear:ReturnType<typeof createOutfitRig>;outfit:'waders'|'scuba'='waders';
  constructor(scene:T.Scene,private inventory:ShopInventory,private homes:Homes){this.controller=new SeaCareController(scene);const mount=new T.Group();mount.rotation.y=Math.PI;homes.trainer.add(mount);this.gear=createOutfitRig(mount,['left','right'].map(s=>homes.trainer.getObjectByName(s+'-hip')!));this.gear.set('waders');}
  get hired(){return this.inventory.owned.has('trainer');}
  get busy(){return !!this.job;}
  get root(){return this.homes.trainer;}
  snapshot():TrainerSnapshot{return {hired:this.hired,enabled:this.enabled,phase:this.phase,message:this.message,balance:this.balance,spent:this.spent,allocated:this.allocated,refunded:this.refunded,supplies:{...this.supplies},log:this.log.map(l=>({...l}))};}
  private record(message:string,cost=0){this.log.unshift({id:++this.sequence,message,cost});this.log=this.log.slice(0,40);}
  fund(amount:number,wallet:{coins:number}):ShopResult{
    if(!this.hired)return {ok:false,message:'Hire the professional trainer from Isla first.'};
    if(!Number.isSafeInteger(amount)||amount<=0||!Number.isSafeInteger(this.balance+amount))return {ok:false,message:'Enter a positive whole number of coins.'};
    if(!Number.isFinite(wallet.coins)||wallet.coins<amount)return {ok:false,message:'Not enough coins in your wallet.'};
    wallet.coins-=amount;this.balance+=amount;this.allocated+=amount;this.enabled=true;this.review=0;
    this.record(`You assigned ${amount} coins.`,0);this.message='Budget received. Checking the animals and water.';
    return {ok:true,message:`${amount} coins assigned. I will not use your remaining coins.`};
  }
  pause(){this.enabled=false;this.cancel();this.phase='paused';this.message='Paused. My unspent coins and supplies are safe.';}
  resume():ShopResult{if(!this.hired)return {ok:false,message:'Hire the trainer first.'};this.enabled=true;this.review=0;this.message='Checking the animals and choosing the next job.';return {ok:true,message:'Autonomous care resumed.'};}
  reclaim(wallet:{coins:number}):ShopResult{this.pause();const amount=this.balance;wallet.coins+=amount;this.balance=0;this.refunded+=amount;this.record(`Returned ${amount} unspent coins. Purchased supplies stay with the trainer.`);return {ok:true,message:`${amount} coins returned. Trainer paused; supplies retained.`};}
  private purchase(id:string){
    // An explicit allowlist is important: the agent never receives the player wallet.
    const food=seafoodSpec(id),item=SHOP_ITEMS.find(i=>i.id===id);
    if(!item||!food&&id!=='seawater'||food?.mode==='frozen'||item.price>this.balance)return false;
    this.balance-=item.price;this.spent+=item.price;this.supplies[id]=(this.supplies[id]??0)+(food?.portions??1);
    this.record(`Ordered ${food?`${food.portions} portions of ${item.name.toLowerCase()}`:'one seawater refresh'} from Isla.`,item.price);return true;
  }
  private foodFor(pet:string){
    const hunting=this.inventory.expansion.skills[pet]?.hunting??0;
    const options=SEAFOOD.filter(f=>f.mode!=='frozen').sort((a,b)=>Number(b.mode==='live'&&hunting<100)-Number(a.mode==='live'&&hunting<100)||a.price-b.price);
    const stocked=options.find(f=>(this.supplies[f.id]??0)>0);if(stocked)return stocked.id;
    const affordable=options.find(f=>f.price<=this.balance);return affordable&&this.purchase(affordable.id)?affordable.id:null;
  }
  request(pet:string,kind:'lesson'|'recall'):ShopResult{
    if(!this.hired||!this.homes.installed('sea'))return {ok:false,message:'Hire a trainer and install a sea home first.'};
    if(this.busy)return {ok:false,message:'The trainer is finishing another job.'};
    if(!this.homes.seaTarget(pet))return {ok:false,message:'Wait for this sea pet to move in.'};
    const food=this.foodFor(pet);if(!food)return {ok:false,message:'Assign at least 24 coins for a pack of training rewards.'};
    this.begin({kind,pet,food});return {ok:true,message:'Watch the trainer walk over, give a cue and reward your animal.'};
  }
  private begin(job:Job){
    this.outfit=job.kind==='water'?'scuba':'waders';this.gear.set(this.outfit);
    this.job=job;this.phase='walking';this.timer=0;const h=this.homes.trainerLayout();
    // Only walk on the wide front boardwalk; never through the gate or into water.
    this.destination.set(h.x+(job.kind==='water'?-.9:.8),h.y,h.z-h.rz-.9);
    this.message=job.kind==='water'?'Walking over to refresh the seawater.':`Walking to ${equipmentName(job.pet!)} · ${job.kind==='feed'?'meal and hunting practice':job.kind==='recall'?'recall practice':'target lesson'}.`;
    this.record(this.message);
  }
  private choose(){
    const pets=petRoster(this.inventory.snapshot()).filter(p=>isAquaticPet(p.id)&&this.homes.seaTarget(p.id));
    if(!this.homes.installed('sea')||!pets.length){this.phase='waiting';this.message='Waiting for a sea home and a dolphin or sea lion.';return;}
    // Observe player-fed meals too, so the agent does not immediately feed again.
    for(const p of pets){const meals=this.inventory.petMeals[p.id]??0;if(meals>(this.oldMeals.get(p.id)??0))this.fed.set(p.id,this.clock);this.oldMeals.set(p.id,meals);}
    const hungry=pets.filter(p=>this.clock-(this.fed.get(p.id)??-1000)>=150).sort((a,b)=>(this.fed.get(a.id)??-1000)-(this.fed.get(b.id)??-1000));
    if(hungry.length){const food=this.foodFor(hungry[0].id);if(food){this.begin({kind:'feed',pet:hungry[0].id,food});return;}}
    if(this.clock-this.watered>=240&&((this.supplies.seawater??0)>0||this.purchase('seawater'))){this.begin({kind:'water'});return;}
    const pupil=pets.filter(p=>(this.inventory.expansion.skills[p.id]?.trust??0)<100&&this.clock-(this.trained.get(p.id)??-1000)>=55).sort((a,b)=>(this.inventory.expansion.skills[a.id]?.trust??0)-(this.inventory.expansion.skills[b.id]?.trust??0))[0];
    if(pupil){const food=this.foodFor(pupil.id);if(food){this.begin({kind:(this.inventory.expansion.skills[pupil.id]?.trust??0)<30?'recall':'lesson',pet:pupil.id,food});return;}}
    this.phase='observing';this.message=hungry.length||pupil?'Not enough budget or rewards. Add coins when you want me to continue.':'Everyone has had a turn. Watching the animals and saving your coins.';
  }
  private startAction(){
    const job=this.job;if(!job)return;
    if(job.kind==='water'){this.phase='water';this.timer=0;this.message='Refreshing the seawater supply.';return;}
    const target=this.homes.seaTarget(job.pet!);if(!target){this.cancel();return;}
    const skills=this.inventory.expansion.skills[job.pet!]??{hunting:0,trust:0};
    if(job.kind==='feed'){this.serve(target,job,false);return;}
    this.phase='lesson';this.message=`${equipmentName(job.pet!)} · ${job.kind==='recall'?'come to my hand signal':'follow my target cue'}.`;
    const started=this.controller.interact(target,job.kind,this.root.position,skills,ok=>{
      if(ok&&this.job===job)this.serve(target,job,true);else this.complete(false);
    });if(!started)this.complete(false);
  }
  private serve(target:SeaCareTarget,job:Job,lesson:boolean){
    if((this.supplies[job.food!]??0)<1){this.complete(false);return;}
    this.supplies[job.food!]--;this.phase='feeding';this.message=lesson?'Good response! Throwing a seafood reward.':`Pouring ${seafoodSpec(job.food!)!.name.toLowerCase()} · watch the animal catch it.`;
    const origin=this.root.localToWorld(new T.Vector3(.28,1.05,.45));
    const settle=(ok:boolean)=>{if(!ok){this.supplies[job.food!]++;this.complete(false);return;}
      const id=job.pet!,skills=this.inventory.expansion.skills[id]??={hunting:0,trust:0};
      this.inventory.petMeals[id]=(this.inventory.petMeals[id]??0)+1;this.oldMeals.set(id,this.inventory.petMeals[id]);this.fed.set(id,this.clock);
      skills.hunting=Math.min(100,skills.hunting+(seafoodSpec(job.food!)?.mode==='live'?10:0));skills.trust=Math.min(100,skills.trust+(lesson?10:2));if(lesson)this.trained.set(id,this.clock);
      this.phase='reward';this.timer=0;this.message=`${equipmentName(id)} ${lesson?'completed its lesson':'caught its meal'} · trust ${skills.trust}% · hunting ${skills.hunting}%.`;this.record(this.message);
    };
    if(!this.controller.start(target,job.food!,origin,this.inventory.expansion.skills[job.pet!]??{hunting:0,trust:0},settle))settle(false);
  }
  private complete(ok:boolean){if(!ok)this.record('Care interrupted. Any unused meal was returned to my supplies.');this.job=null;this.phase=this.enabled?'observing':'paused';this.review=ok?8:5;this.timer=0;}
  cancel(){this.controller.cancel();this.job=null;this.timer=0;this.review=3;this.phase=this.enabled?'observing':'paused';}
  private pose(time:number,dt:number,moving:number){
    this.gait+=dt*7*moving;const working=['cue','lesson','water','feeding','reward'].includes(this.phase);
    const bone=(name:string)=>this.root.getObjectByName(name);
    for(const [i,side] of ['left','right'].entries()){
      const leg=bone(`${side}-hip`),arm=bone(`${side}-shoulder`),elbow=bone(`${side}-elbow`);
      if(leg)leg.rotation.x=Math.sin(this.gait+i*Math.PI)*.38*moving;
      if(arm)arm.rotation.x=T.MathUtils.damp(arm.rotation.x,working?(side==='right'?-1.1-Math.sin(time*4)*.2:-.35):Math.sin(this.gait+i*Math.PI+Math.PI)*.30*moving,7,dt);
      if(elbow)elbow.rotation.x=T.MathUtils.damp(elbow.rotation.x,working?-.65:-.12,7,dt);
    }
    const head=bone('trainer-head');if(head)head.rotation.y=working?Math.sin(time*1.4)*.1:Math.sin(time*.7)*.27;
    const chest=bone('trainer-chest');if(chest)chest.scale.y=1+Math.sin(time*2)*.008;
    const bucket=bone('trainer-bucket');if(bucket)bucket.visible=working;
  }
  update(dt:number,time:number,blocked=false,player?:{x:number;z:number}){
    dt=Math.max(0,Math.min(.05,dt));this.clock+=dt;
    if(!this.hired||!this.homes.installed('sea')){if(this.busy)this.cancel();return;}
    const h=this.homes.trainerLayout(),key=`${h.x}/${h.z}/${h.rx}/${h.rz}`;
    if(key!==this.layoutKey){this.cancel();this.layoutKey=key;this.root.position.set(h.care.x+1.4,h.y,h.z-h.rz-.9);}
    if(blocked){if(this.busy){this.cancel();this.message='Waiting while you finish your interaction.';}this.pose(time,dt,0);return;}
    this.timer+=dt;let moving=0;
    if(this.phase==='walking'&&this.job){
      const delta=this.destination.clone().sub(this.root.position),d=delta.length();
      const next=this.root.position.clone().addScaledVector(delta,Math.min(1,dt*.9/Math.max(.001,d)));
      if(player&&Math.hypot(player.x-next.x,player.z-next.z)<.65){this.message='Please leave a little room on the boardwalk.';}
      else{this.root.position.copy(next);moving=d>.05?1:0;this.root.rotation.y=T.MathUtils.damp(this.root.rotation.y,Math.atan2(delta.x,delta.z),5,dt);}
      if(d<.07){this.phase='cue';this.timer=0;this.root.rotation.y=0;this.message='Calling the animal with a hand signal.';}
    }else if(this.phase==='cue'&&this.timer>1.4)this.startAction();
    else if(this.phase==='water'&&this.timer>3){this.supplies.seawater--;this.inventory.waterRefreshes++;this.watered=this.clock;this.message='Seawater refreshed. Checking the next animal.';this.record(this.message);this.complete(true);}
    else if(this.phase==='reward'&&this.timer>2.5)this.complete(true);
    this.controller.update(dt,time);
    if(!this.job&&this.enabled){this.review-=dt;if(this.review<=0){this.review=5;this.choose();}}
    this.pose(time,dt,moving);
  }
  dispose(){this.enabled=false;this.controller.dispose();this.job=null;}
}
