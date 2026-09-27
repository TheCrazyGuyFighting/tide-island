import * as T from 'three';
import {menhadenModel} from './island-menhaden-model';

export type PelicanMealTarget={
  id:string; root:T.Group; ready:()=>boolean; requestLanding:()=>void;
  hold:(held:boolean)=>void; pose:(peck:number,gulp:number)=>void;
  dropPoint:()=>T.Vector3; mouth:()=>T.Vector3;
};
export const MEAL_TIMING={windup:.38,land:1.18,pickup:1.55,swallow:2.08,finish:2.95};
const ease=(t:number)=>T.MathUtils.smoothstep(t,0,1);

/** One reserved fish, one recipient, one settlement. Cancelling refunds the fish. */
export class MenhadenFeeding {
  readonly fish=menhadenModel();
  target:PelicanMealTarget|null=null;elapsed=0;waiting=0;settling=false;
  private origin=()=>new T.Vector3();private settle:((eaten:boolean)=>void)|null=null;
  private from=new T.Vector3();private to=new T.Vector3();
  constructor(scene:T.Scene){this.fish.name='tossed-menhaden';this.fish.visible=false;this.fish.scale.setScalar(.36);scene.add(this.fish);}
  get active(){return !!this.target;}
  get released(){return this.active&&!this.settling&&this.elapsed>=MEAL_TIMING.windup;}
  get armSwing(){if(!this.active||this.settling)return 0;return -.65*Math.sin(Math.min(1,this.elapsed/.8)*Math.PI);}
  get message(){return this.settling?'Your pelican is landing for its Menhaden…':this.elapsed<MEAL_TIMING.land?'Tossing Menhaden…':this.elapsed<MEAL_TIMING.swallow?'Your pelican is picking it up…':'Gulp! Your pelican is swallowing its fish.';}
  start(target:PelicanMealTarget,origin:()=>T.Vector3,settle:(eaten:boolean)=>void){
    if(this.active)return false;
    this.target=target;this.origin=origin;this.settle=settle;this.elapsed=0;this.waiting=0;this.settling=true;
    target.requestLanding();return true;
  }
  update(dt:number){
    const target=this.target;if(!target)return;dt=T.MathUtils.clamp(dt,0,.05);
    if(this.settling){
      this.waiting+=dt;if(this.waiting>22){this.cancel();return;}
      if(!target.ready())return;
      target.hold(true);this.to.copy(target.dropPoint());this.settling=false;this.elapsed=0;
    }
    const previous=this.elapsed;this.elapsed+=dt;const t=this.elapsed;
    if(previous<MEAL_TIMING.windup&&t>=MEAL_TIMING.windup)this.from.copy(this.origin());
    this.fish.visible=t>=MEAL_TIMING.windup&&t<MEAL_TIMING.swallow+.32;
    this.fish.scale.setScalar(.36);
    const lower=ease((t-(MEAL_TIMING.land-.25))/.52),lift=ease((t-MEAL_TIMING.pickup)/.58);
    const gulp=Math.sin(Math.PI*ease((t-MEAL_TIMING.swallow)/.72));
    target.pose(lower*(1-lift),Math.max(0,gulp));
    if(t<MEAL_TIMING.land){
      const u=T.MathUtils.clamp((t-MEAL_TIMING.windup)/(MEAL_TIMING.land-MEAL_TIMING.windup),0,1);
      this.fish.position.copy(this.from).lerp(this.to,u);this.fish.position.y+=Math.sin(u*Math.PI)*.5;
      this.fish.rotation.set(u*3.8,Math.atan2(this.to.x-this.from.x,this.to.z-this.from.z),Math.PI/2+u*2.2);
    }else if(t<MEAL_TIMING.pickup){
      this.fish.position.copy(this.to);this.fish.position.y+=Math.abs(Math.sin((t-MEAL_TIMING.land)*22))*.028*Math.exp(-(t-MEAL_TIMING.land)*12);
      this.fish.rotation.set(0,target.root.rotation.y,Math.PI/2);
    }else{
      const u=ease((t-MEAL_TIMING.pickup)/(MEAL_TIMING.swallow-MEAL_TIMING.pickup));
      this.fish.position.copy(this.to).lerp(target.mouth(),u);this.fish.rotation.set(-.25-gulp*.6,target.root.rotation.y,Math.PI/2*(1-u));
      // The fish disappears head-first into the moving bill, not at impact.
      this.fish.scale.setScalar(.36*(1-ease((t-MEAL_TIMING.swallow)/.32)));
    }
    if(t>=MEAL_TIMING.finish)this.finish(true);
  }
  private finish(eaten:boolean){
    const target=this.target,settle=this.settle;
    this.target=null;this.settle=null;this.fish.visible=false;this.settling=false;
    target?.hold(false);settle?.(eaten);
  }
  cancel(){this.finish(false);}
  dispose(){this.cancel();this.fish.removeFromParent();const materials=new Set<T.Material>();this.fish.traverse(o=>{if(o instanceof T.Mesh){o.geometry.dispose();for(const m of Array.isArray(o.material)?o.material:[o.material])materials.add(m);if(o.customDepthMaterial)materials.add(o.customDepthMaterial);if(o.customDistanceMaterial)materials.add(o.customDistanceMaterial);}});materials.forEach(m=>{for(const value of Object.values(m))if(value instanceof T.Texture)value.dispose();m.dispose();});}
}
