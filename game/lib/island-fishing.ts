import { clamp, terrainHeight } from './island-world';
import { SCOOP_DURATION, scoopCandidate } from './island-net';

export type Point = { x: number; y: number; z: number };
export type LandingPose = { position: Point; pitch: number; yaw: number; roll: number };
export type HookStruggle = { elapsed:number; strength:number };
export type FishAgent = { injured?:'struggling'|'dead';injuryTime?:number; id: string; name: string; position: Point; target: Point | null; caught: boolean; catchable: boolean; clearance: number; value: number; weight: number; length?: number; landing?: LandingPose | null; struggle?:HookStruggle|null; mouth?:Point|null; mouthLocal?:Point; rotation?:Point; reelTarget?:Point|null };
export type FishingPhase = 'idle' | 'casting' | 'waiting' | 'bite' | 'reeling' | 'landing' | 'scooping' | 'caught' | 'missed';
export const CATCH_LIFT_DURATION = 3.2;
export function waterPath(a: Point, b: Point, clearance: number) {
  for (let i = 0; i <= 24; i++) {
    const t = i / 24;
    if (terrainHeight(a.x + (b.x - a.x) * t, a.z + (b.z - a.z) * t) > -clearance * 2 - .4) return false;
  }
  return true;
}
/** Stop the retrieve before the whole fish reaches a bank, not at the player's feet. */
export function reelWaterTarget(from: Point, angler: Point, fish: FishAgent): Point {
  const dx=angler.x-from.x,dz=angler.z-from.z,distance=Math.hypot(dx,dz);
  const reach=Math.max(0,distance-2.4),radius=(fish.length??1)*.6;
  let result={...from};
  const steps=Math.ceil(reach/.25);
  for(let i=1;i<=steps;i++){
    const t=(reach*i/steps)/Math.max(.001,distance),x=from.x+dx*t,z=from.z+dz*t;
    if([[0,0],[radius,0],[-radius,0],[0,radius],[0,-radius]].some(([ox,oz])=>terrainHeight(x+ox,z+oz)>-fish.clearance*2-.4))break;
    result={x,y:from.y,z};
  }
  return result;
}
export function castTarget(origin: Point, yaw: number, pitch: number): Point | null {
  const range = clamp(18 + pitch * 10, 6, 24);
  for (let distance = range; distance >= 4; distance -= .5) {
    const target = { x: origin.x - Math.sin(yaw) * distance, y: 0, z: origin.z - Math.cos(yaw) * distance };
    if (terrainHeight(target.x, target.z) > -1) continue;
    let clear = true;
    for (let i = 1; i < 24; i++) {
      const t = i / 24, y = (origin.y + 1.65) * (1 - t) + Math.sin(t * Math.PI) * 2.5;
      if (terrainHeight(origin.x + (target.x - origin.x) * t, origin.z + (target.z - origin.z) * t) > y - .15) { clear = false; break; }
    }
    if (clear) return target;
  }
  return null;
}
export class FishingGame {
  phase: FishingPhase = 'idle'; target: Point | null = null; selected: FishAgent | null = null;
  landingFrom: Point | null = null;
  private reelFrom:Point|null=null;
  private reelEnd:Point|null=null;private reelAngler:Point|null=null;
  fishInBag=0;scoopPoint:Point|null=null;scoopFrom:Point|null=null;
  private scoopOrigin:Point={x:0,y:0,z:0};private scoopYaw=0;private scoopResolved=false;
  rodLevel=1;
  timer = 0; elapsed = 0; progress = 0; tension = .2; coins = 250; catches = 0; message = 'Face the water · F to cast';
  constructor(public fish: FishAgent[]) {}
  onLand:((fish:FishAgent)=>void)|null=null;
  get active() { return ['casting', 'waiting', 'bite', 'reeling', 'landing','scooping'].includes(this.phase); }
  get scoopProgress() { return this.phase==='scooping'?clamp(1-this.timer/SCOOP_DURATION,0,1):null; }
  private reward(fish:FishAgent) {if(fish.caught)return;fish.caught=true;if(this.onLand)this.onLand(fish);else this.coins+=fish.value;this.catches++;this.fishInBag++;}
  claimSpearCatch(fish:FishAgent){if(fish.caught||!fish.catchable||!this.fish.includes(fish))return false;this.reward(fish);return true;}
  scoop(origin:Point,yaw:number) {
    if(this.active)return;this.release();this.scoopOrigin={...origin};this.scoopYaw=yaw;this.scoopResolved=false;this.scoopFrom=null;
    this.selected=scoopCandidate(this.fish,origin,yaw);
    if(this.selected)this.selected.target={...this.selected.position};
    const ahead={x:origin.x-Math.sin(yaw)*2.7,y:0,z:origin.z-Math.cos(yaw)*2.7};
    this.scoopPoint=this.selected?{...this.selected.position}:terrainHeight(ahead.x,ahead.z)<-.15?ahead:null;
    this.target=null;this.phase='scooping';this.timer=SCOOP_DURATION;this.message='Sweeping the net…';
  }
  private release() { if (this.selected) { this.selected.target = null; this.selected.landing = null; this.selected.struggle=null;this.selected.mouth=null;this.selected.reelTarget=null; } this.selected = null; this.landingFrom = null;this.reelFrom=null;this.reelEnd=null;this.reelAngler=null; }
  cancel(message = 'Line retrieved. Face the water to cast again.', force = false) {
    if ((this.phase === 'landing'||this.phase==='scooping') && !force) return;
    this.release(); this.phase = 'idle'; this.target = null; this.progress = 0; this.tension = .2; this.message = message;
  }
  cast(target: Point | null) {
    if (this.active) return;
    this.release(); this.progress = 0; this.tension = .2; this.elapsed = 0;
    if (!target) { this.cancel('Aim toward open water from the shore or dock.'); return; }
    this.target = { ...target }; this.phase = 'casting'; this.timer = .7; this.message = 'Casting…';
  }
  hook() {
    if (this.phase !== 'bite') return;
    this.phase = 'reeling'; this.timer = 0; this.progress = .05; this.tension = .24;
    if(this.selected)this.reelFrom={...(this.selected.mouth??this.selected.position)};
    this.message = 'Hold R or Reel · release to ease the tension';
  }
  private lose(message: string) { this.release(); this.phase = 'missed'; this.timer = 3.5; this.target = null; this.message = message; }
  update(dt: number, reeling: boolean, angler?:Point) {
    this.elapsed += dt;
    if(this.selected?.struggle&&(this.phase==='bite'||this.phase==='reeling')){
      this.selected.struggle.elapsed+=dt;
      this.selected.struggle.strength=this.phase==='bite'?.85:.55+this.tension*.65+(reeling?.15:0);
    }
    if(this.phase==='scooping'){
      this.timer-=dt;
      if(!this.scoopResolved&&this.timer<=SCOOP_DURATION*.55){
        this.scoopResolved=true;const fish=this.selected;
        if(fish&&scoopCandidate([fish],this.scoopOrigin,this.scoopYaw)){
          this.scoopFrom={...fish.position};this.reward(fish);fish.target=null;fish.landing={position:{...fish.position},pitch:0,yaw:this.scoopYaw,roll:0};
          this.message=this.onLand?`${fish.name} scooped! Now in your hand.`:`${fish.name} scooped! +${fish.value} coins`;
        }else this.message='Empty net. Get closer to a small, near-surface fish.';
      }
      if(this.timer<=0){const success=!!this.selected?.caught;this.release();this.phase=success?'caught':'missed';this.timer=3.5;}
      return;
    }
    if (this.phase === 'landing') {
      if ((this.timer -= dt) <= 0) {
        const fish = this.selected;
        this.message = fish ? `${fish.name} · ${fish.weight.toFixed(1)} kg · ${this.onLand?'in your hand':`+${fish.value} coins`}` : 'Catch landed!';
        this.release(); this.target = null; this.phase = 'caught'; this.timer = 3.5;
      }
      return;
    }
    if (!this.active) { if (this.phase !== 'idle' && (this.timer -= dt) <= 0) this.cancel(); return; }
    if (this.phase === 'casting') {
      if ((this.timer -= dt) <= 0) { this.phase = 'waiting'; this.timer = 0; this.message = 'Watch the float… F when a fish bites'; }
      return;
    }
    if (this.phase === 'waiting' && this.target) {
      this.timer += dt;
      if (!this.selected) {
        this.selected = this.fish.filter(f => f.catchable && !f.caught && !f.injured && Math.hypot(f.position.x - this.target!.x, f.position.z - this.target!.z) < 15 && waterPath(f.position, this.target!, f.clearance)).sort((a, b) => Math.hypot(a.position.x - this.target!.x, a.position.z - this.target!.z) - Math.hypot(b.position.x - this.target!.x, b.position.z - this.target!.z))[0] ?? null;
        if (this.selected) this.selected.target = { ...this.target, y: -this.selected.clearance - .45 };
      }
      if (this.selected && this.timer > 2.5 && Math.hypot(this.selected.position.x - this.target.x, this.selected.position.z - this.target.z) < 1.25) {
        this.phase = 'bite'; this.timer = 2.5; this.message = 'BITE! Press F to hook!';
        this.selected.struggle={elapsed:0,strength:.85};
      } else if (this.timer > 24) this.lose('No bites here. Try another part of the lagoon or harbour.');
    } else if (this.phase === 'bite') {
      if ((this.timer -= dt) <= 0) this.lose('Missed the bite! Press F to cast again.');
    } else if (this.phase === 'reeling') {
      this.timer += dt;
      this.tension = clamp(this.tension + (reeling ? .3 - (this.rodLevel-1)*.025 + Math.sin(this.timer * 2.7) * .12 : -.48) * dt, 0, 1);
      this.progress = clamp(this.progress + (reeling ? .16+(this.rodLevel-1)*.025 : -.018) * dt, 0, 1);
      if(this.selected&&this.reelFrom&&angler){
        if(!this.reelEnd||!this.reelAngler||Math.hypot(angler.x-this.reelAngler.x,angler.z-this.reelAngler.z)>.35){this.reelEnd=reelWaterTarget(this.reelFrom,angler,this.selected);this.reelAngler={...angler};}
        const end=this.reelEnd,t=this.progress;
        this.selected.reelTarget={x:this.reelFrom.x+(end.x-this.reelFrom.x)*t,y:end.y,z:this.reelFrom.z+(end.z-this.reelFrom.z)*t};
      }
      if (this.tension >= .999) this.lose('The line snapped! Release Reel before tension turns red.');
      else if (this.timer > 40) this.lose('The fish slipped away. Try reeling a little faster.');
      else if (this.progress >= 1 && this.selected) {
        const fish = this.selected;
        this.reward(fish);
        this.landingFrom = { ...fish.position };
        fish.struggle=null;fish.mouth=null;
        fish.target = null;fish.reelTarget=null;
        fish.landing = { position: { ...fish.position }, pitch: fish.rotation?.x??0, yaw: fish.rotation?.y??0, roll: fish.rotation?.z??0 };
        this.phase = 'landing'; this.timer = CATCH_LIFT_DURATION;
        this.message = `${fish.name} caught! Bringing it in…`;
      }
    }
  }
}
