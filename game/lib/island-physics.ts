import { CABIN, SPAWN, cabinBlocked, clamp, walkingHeight } from './island-world';
import {distantIslandAt} from './island-destinations';
import { onMarket } from './island-market-layout';
import { onRainforest } from './island-rainforest-layout';
import {immersion,safeDepth,waterSurface,canSwim,type Outfit} from './island-water';
import {VOYAGE_BOUNDS} from './island-rainforest-layout';

export type Collider = { kind: 'tree' | 'rock' | 'box'; x: number; y: number; z: number; rx: number; ry: number; rz: number; angle?: number; enabled?:boolean };
export type Body = { x: number; y: number; z: number; vy: number; grounded: boolean; peak: number; health: number; dead: number; message: string; messageTime: number };
export const PLAYER_RADIUS = .24, PLAYER_HEIGHT = 1.72, MAX_SLOPE = Math.tan(44 * Math.PI / 180);
export function colliderBlocks(c:Collider,x:number,y:number,z:number) {
  if(c.enabled===false)return false;
  if(y>=c.y+c.ry||y+PLAYER_HEIGHT<=c.y-c.ry)return false;
  const dx=x-c.x,dz=z-c.z;
  if(c.kind==='box'){
    const cos=Math.cos(c.angle??0),sin=Math.sin(c.angle??0);
    return Math.abs(cos*dx-sin*dz)<c.rx+PLAYER_RADIUS&&Math.abs(sin*dx+cos*dz)<c.rz+PLAYER_RADIUS;
  }
  const nearestY=clamp(c.y,y+PLAYER_RADIUS,y+PLAYER_HEIGHT-PLAYER_RADIUS);
  const section=c.kind==='tree'?1:Math.sqrt(Math.max(0,1-((nearestY-c.y)/c.ry)**2));
  return (dx/(c.rx*section+PLAYER_RADIUS))**2+(dz/(c.rz*section+PLAYER_RADIUS))**2<1;
}
export function createBody(): Body {
  const y = walkingHeight(SPAWN.x, SPAWN.z);
  return { ...SPAWN, y, vy: 0, grounded: true, peak: y, health: 100, dead: 0, message: '', messageTime: 0 };
}
export class IslandPhysics {
  private cells = new Map<string, Collider[]>();
  private dynamic:Collider[]=[];
  constructor(public colliders: Collider[], private height = walkingHeight, private walls = cabinBlocked) {
    for (const c of colliders) this.index(c);
  }
  addCollider(c:Collider) { this.colliders.push(c); this.index(c); }
  removeCollider(c:Collider) {
    c.enabled=false;
    const index=this.colliders.indexOf(c);if(index>=0)this.colliders.splice(index,1);
    const dynamicIndex=this.dynamic.indexOf(c);if(dynamicIndex>=0)this.dynamic.splice(dynamicIndex,1);
    for(const [key,list] of this.cells){const i=list.indexOf(c);if(i>=0){list.splice(i,1);if(!list.length)this.cells.delete(key);}}
  }
  // Hinged doors change position: keep them out of the static spatial hash.
  addDynamicCollider(c:Collider) { this.dynamic.push(c); }
  private index(c:Collider) {
    for (let x = Math.floor((c.x - c.rx - .3) / 8); x <= Math.floor((c.x + c.rx + .3) / 8); x++) for (let z = Math.floor((c.z - c.rz - .3) / 8); z <= Math.floor((c.z + c.rz + .3) / 8); z++) {
      const key = `${x},${z}`, list = this.cells.get(key) ?? []; list.push(c); this.cells.set(key, list);
    }
  }
  gradient(x: number, z: number) {
    const dx = (this.height(x + .08, z) - this.height(x - .08, z)) / .16;
    const dz = (this.height(x, z + .08) - this.height(x, z - .08)) / .16;
    return { x: dx, z: dz, slope: Math.hypot(dx, dz) };
  }
  blocked(x: number, y: number, z: number, door: boolean) {
    if (this.walls(x, z, door) && y < CABIN.y + 6 && y + PLAYER_HEIGHT > CABIN.y) return true;
    for(const c of this.dynamic)if(colliderBlocks(c,x,y,z))return true;
    for (const c of this.cells.get(`${Math.floor(x / 8)},${Math.floor(z / 8)}`) ?? []) {
      if(colliderBlocks(c,x,y,z))return true;
    }
    return false;
  }
  jump(b: Body) { if (b.grounded && !b.dead) { b.vy = 5.9; b.grounded = false; b.peak = b.y; return true; } return false; }
  reset(b: Body) { Object.assign(b, createBody()); b.y = this.height(b.x, b.z); b.peak = b.y; }
  private move(b: Body, dx: number, dz: number, door: boolean) {
    const attempt = (x: number, z: number) => {
      const h = this.height(x, z), current = this.height(b.x, b.z), g = this.gradient(x, z);
      if (Math.hypot(x, z) > 200 && !onMarket(x,z) && !onRainforest(x,z) && !distantIslandAt(x,z) || this.blocked(x, b.y, z, door)) return false;
      // A finite slope limit cannot be defeated by small frames or diagonal keys.
      if (h > current + .0001 && h > b.y - .08 && g.slope > MAX_SLOPE) return false;
      if (h > b.y + (b.grounded ? .23 : .015)) return false;
      // Shallows are walkable. Water safety is checked against the player's feet,
      // not a shoreline wall, so going past the outfit's depth limit is fatal.
      b.x = x; b.z = z; return true;
    };
    if (!attempt(b.x + dx, b.z + dz)) {
      attempt(b.x + dx, b.z); attempt(b.x, b.z + dz);
    }
  }
  update(b: Body, vx: number, vz: number, dt: number, door: boolean,water:{outfit:Outfit;vertical:number}={outfit:'regular',vertical:0}) {
    b.messageTime = Math.max(0, b.messageTime - dt);
    if (b.dead) { b.dead = Math.max(0, b.dead - dt); if (!b.dead) { this.reset(b); b.message = 'Back at the harbour. Watch your footing.'; b.messageTime = 4; } return; }
    const surface=waterSurface(b.x,b.z);
    if(canSwim(water.outfit)&&surface!==null&&surface-b.y>.8&&this.height(b.x,b.z)<surface-1.8){
      if(water.outfit==='snorkel')b.y=Math.max(b.y,surface-.82);
      this.swim(b,vx,vz,water.outfit==='snorkel'?0:water.vertical,dt,door,surface);return;
    }
    const steps = Math.max(1, Math.ceil(dt / (1 / 120))), step = dt / steps;
    for (let i = 0; i < steps; i++) {
      this.move(b, vx * step, vz * step, door);
      const h = this.height(b.x, b.z), gradient = this.gradient(b.x, b.z), steep = gradient.slope > MAX_SLOPE;
      // Leave the ground at a ledge; never snap down to a distant surface.
      if (b.grounded && (b.y - h > .12 || steep)) { b.grounded = false; b.peak = b.y; }
      if (b.grounded) { b.y = h; b.peak = h; }
      else {
        b.vy -= 18 * step; b.y += b.vy * step; b.peak = Math.max(b.peak, b.y);
        if (b.y <= h && b.vy <= 0) {
          b.y = h;
          if (steep) {
            this.move(b, -gradient.x / gradient.slope * 4.5 * step, -gradient.z / gradient.slope * 4.5 * step, door);
            b.vy = -1;
          } else {
            const drop = b.peak - h, damage = drop > 3.2 ? Math.ceil((drop - 3.2) * 19) : 0;
            b.health = Math.max(0, b.health - damage); b.vy = 0; b.grounded = true; b.peak = h;
            if (damage) { b.message = b.health ? `Hard landing · −${damage} health` : 'That fall was too far. Returning to the harbour…'; b.messageTime = 4; }
            if (!b.health) b.dead = 2.2;
          }
        }
      }
      if(immersion(b.x,b.y,b.z)>safeDepth(water.outfit)+.001){b.health=0;b.dead=2.2;b.message=water.outfit==='waders'?'Water over your waders! Returning to the harbour…':'Past waist depth! You need scuba gear for deep water. Returning to the harbour…';b.messageTime=4;}
      if (b.dead) break;
    }
  }
  private swim(b:Body,vx:number,vz:number,vertical:number,dt:number,door:boolean,surface:number){
    const steps=Math.max(1,Math.ceil(dt/(1/120))),step=dt/steps;
    for(let i=0;i<steps;i++){
      const nextY=Math.min(surface-.82,b.y+vertical*step),tryMove=(x:number,z:number)=>{
        if(x<VOYAGE_BOUNDS.minX||x>VOYAGE_BOUNDS.maxX||z<VOYAGE_BOUNDS.minZ||z>VOYAGE_BOUNDS.maxZ)return false;
        const h=this.height(x,z),y=Math.max(h,nextY);
        if(h>nextY+.22||this.gradient(x,z).slope>MAX_SLOPE&&h>nextY-.1||this.blocked(x,y,z,door))return false;
        b.x=x;b.z=z;return true;
      };
      if(!tryMove(b.x+vx*step,b.z+vz*step)){tryMove(b.x+vx*step,b.z);tryMove(b.x,b.z+vz*step);}
      const bed=this.height(b.x,b.z);
      if(!this.blocked(b.x,Math.max(bed,nextY),b.z,door))b.y=Math.max(bed,nextY);
      b.vy=0;b.peak=b.y;b.grounded=bed>=b.y-.03;
    }
  }
}
