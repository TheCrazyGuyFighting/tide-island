import * as T from 'three';
import { loadIslandModel, normalizeModel } from './island-models';
import { loadShopDisplay, animatePet } from './island-pets';
import {RODS,isFishingRod,seafoodSpec} from './island-expansion-types';
import { buildRod, routePosition, safeSwimRoute } from './island-assets';
import type { FishAgent } from './island-fishing';
import { usesRod, isPet, isBoat, type ShopSnapshot } from './island-shop';
import { DOCK, clamp, random, terrainHeight } from './island-world';
import { careModel } from './island-care-models';
import {createSpeargunActor} from './island-speargun-model';
import type {SpearPhase} from './island-spearfishing';
import {birdToolModel,isBirdTool} from './island-bird-tools';
import {isSpeargun,type SpeargunId} from './island-speargun-types';

type Animation = { update: (dt: number, time: number) => void };
export async function addReefAndKingfish(scene: T.Scene, animations: Animation[], onFish: (fish: FishAgent) => void, lowPower: boolean, disposed: () => boolean, progress: (n: number, error: string) => void) {
  let completed = 0; const failures: string[] = [];
  const install = async (id: string, use: (model: T.Group) => void) => { try { const model=await loadIslandModel(id); if(!disposed()) use(model); } catch { failures.push(id); } finally { if(!disposed()) progress(++completed/2*100,failures.length?`Could not load: ${failures.join(', ')}. Reload to retry.`:''); } };
  await Promise.all([
    ...(['coral','coral-reef'] as const).map((id,index)=>install(id, source=>{
      const rng=random(6671+index), variants=id==='coral-reef'?source.children.map(o=>normalizeModel(o)): [source];
      let count=0;
      for(let attempt=0;attempt<1800 && count<(lowPower?18:38);attempt++){
        const a=rng()*Math.PI*2, radius=58+rng()*32;
        const x=attempt%3?15+(rng()-.5)*49:Math.cos(a)*radius, z=attempt%3?19+(rng()-.5)*39:Math.sin(a)*radius/1.06;
        const h=terrainHeight(x,z), scale=.8+rng()*1.25, model=variants[count%variants.length];
        const bounds=new T.Box3().setFromObject(model).getSize(new T.Vector3());
        if(h>-.7-bounds.y*scale||h<-7||Math.hypot(x-DOCK.x,z-77)<9)continue;
        const samples=[terrainHeight(x+.6,z),terrainHeight(x-.6,z),terrainHeight(x,z+.6),terrainHeight(x,z-.6)];
        if(Math.max(...samples)-Math.min(...samples)>.35)continue;
        const coral=model.clone(true); coral.name=`seabed-${id}-${count}`;coral.position.set(x,h-.06,z);coral.scale.setScalar(scale);coral.rotation.y=rng()*Math.PI*2;
        coral.traverse(o=>{if(o instanceof T.Mesh){o.castShadow=false;o.receiveShadow=true;}});scene.add(coral);count++;
      }
    })),
  ]);
}

export function createShopWorld(handRig:T.Group, thirdRodMount:T.Group, float:T.Group) {
  const spearguns=new Map<SpeargunId,Awaited<ReturnType<typeof createSpeargunActor>>[]>();
  let lastTime=0;
  const resources=new Map<string,T.Group>();
  const rods=new Map<string,T.Group[]>();
  const selectedRod=()=>state.expansion?.rod??'rod';
  function syncRods(){for(const mount of [handRig,thirdRodMount])for(const r of mount.children.filter(o=>o.name.startsWith('fishing-rod-'))){const selected=r.name==='fishing-rod-'+selectedRod()&&!state.expansion?.stored.includes(selectedRod());r.visible=selected&&usesRod(state.activeItem);r.traverse(o=>{if(o.name==='rod-tip'||o.name==='inactive-rod-tip')o.name=selected?'rod-tip':'inactive-rod-tip';});}}
  const held=new T.Group(), thirdHeld=new T.Group(), waterTackle=new T.Group();
  const carried=new T.Group(), thirdCarried=new T.Group();
  held.name='shop-held-tackle';thirdHeld.name='shop-third-tackle';waterTackle.name='shop-water-tackle';
  carried.name='held-equipment';thirdCarried.name='third-held-equipment';
  handRig.add(held,carried);thirdRodMount.add(thirdHeld,thirdCarried);float.add(waterTackle);
  let state:ShopSnapshot={owned:[],equippedLure:null,hookEquipped:false,activeItem:'rod'}, signature='', carriedId='rod',canSignature='';
  function carryModel(id:string, source:T.Group) {
    if(isBirdTool(id)){source=normalizeModel(birdToolModel('bird-glove'));const whistle=birdToolModel('whistle');whistle.scale.setScalar(.55);whistle.position.set(.24,.05,.12);source.add(whistle);}
    const first=source.clone(true), third=source.clone(true);
    const height=new T.Box3().setFromObject(source).getSize(new T.Vector3()).y;
    for(const model of [first,third]) {
      // The supplied net's long handle ends at +Z. Put that end in the palm.
      if(isBirdTool(id)){model.scale.setScalar(.44);model.position.set(0,-.07,-.12);}
      else if(id==='knife'){model.scale.setScalar(.52);model.rotation.set(-.5,0,-.15);model.position.set(0,-.08,-.03);}
      else if(id==='bow'){model.scale.setScalar(1.1);model.position.set(-.2,-.52,-.2);model.rotation.y=Math.PI/2;}
      else if(id==='net'){model.scale.setScalar(1.65);model.position.set(-.06*1.65,-.472*1.65,-.497*1.65);}
      else if(id==='ice-box'){model.scale.setScalar(.6);model.position.y=-height*.6;}
      else if(id==='ice-block'){model.scale.setScalar(.28);model.position.y=-.12;}
      else if(seafoodSpec(id)){model.scale.setScalar(.5);model.position.set(0,-height*.4,0);}
      else if(id==='menhaden'){model.scale.setScalar(.36);model.rotation.set(0,Math.PI/2,.1);model.position.set(0,-height*.18,-.015);}
      else if(id==='food-can'||id==='seawater'){model.scale.setScalar(.48);model.position.set(0,-.15,-.03);model.rotation.y=-.18;}
      else if(isPet(id)){model.scale.setScalar(.5);model.position.set(-.1,-.25,-.25);}
      else {model.scale.setScalar(.9);model.rotation.y=.25;model.position.set(-.08,-.08,-.18);}
    }
    carried.position.set(.35,-.27,-.65);thirdCarried.position.set(0,0,0);
    carried.rotation.set(id==='net'?.28:0,0,0);thirdCarried.rotation.copy(carried.rotation);
    carried.add(first);thirdCarried.add(third);
  }
  return {
    showWaterTackle(show:boolean){waterTackle.visible=show;},
    async prepare(id:string) {if(RODS.some(r=>r.id===id)){if(!rods.has(id)){const source=await loadIslandModel(id),a=buildRod(source),b=a.clone(true);a.name=b.name='fishing-rod-'+id;b.position.set(0,0,0);handRig.add(a);thirdRodMount.add(b);rods.set(id,[a,b]);syncRods();}return;}if(isSpeargun(id)){if(!spearguns.has(id))spearguns.set(id,await Promise.all([createSpeargunActor(id),createSpeargunActor(id)]));return;}if(!resources.has(id))resources.set(id,await loadShopDisplay(id)); },
    rackRod:(id:string)=>handRig.children.find(o=>o.name==='fishing-rod-'+id) as T.Group|undefined,
    toolPose(preparing:number,bowDrawing:number){if(state.activeItem==='knife'){carried.rotation.z=thirdCarried.rotation.z=preparing?-.7+Math.sin(preparing*9)*.35:0;carried.position.x=preparing?.08:.35;carried.position.y=preparing?-.20:-.27;}if(state.activeItem==='bow'){carried.rotation.z=Math.sin(bowDrawing*6)*.025;carried.position.z=-.65+Math.sin(Math.min(1,bowDrawing)*Math.PI)*.15;}},
    spearReady:()=>isSpeargun(state.activeItem)&&spearguns.get(state.activeItem)?.length===2,
    dispose:()=>spearguns.forEach(pair=>pair.forEach(s=>s.dispose())),
    foodOrigin(first:boolean,out:T.Vector3){const group=first?carried:thirdCarried;group.updateWorldMatrix(true,true);return group.children[0]?.getWorldPosition(out)??group.getWorldPosition(out);},
    netCenter(first:boolean,out:T.Vector3) {const group=first?carried:thirdCarried;group.updateWorldMatrix(true,true);return group.children[0]?.localToWorld(out.set(0,.19,-.31))??out.set(0,0,0);},
    apply(next:ShopSnapshot) {
      state=next;syncRods();
      const designKey=JSON.stringify(next.canDesign);
      if(next.activeItem==='food-can'&&designKey!==canSignature){resources.set('food-can',careModel('food-can',next.canDesign));canSignature=designKey;carriedId='';}
      if(next.activeItem!==carriedId) {
        carried.clear();thirdCarried.clear();carriedId=next.activeItem;
        const source=resources.get(next.activeItem);
        const pair=isSpeargun(next.activeItem)?spearguns.get(next.activeItem):undefined;
        if(pair){carried.position.set(.32,-.27,-.60);thirdCarried.position.set(0,.2,-.1);carried.rotation.set(0,0,0);thirdCarried.rotation.set(0,0,0);carried.add(pair[0].root);thirdCarried.add(pair[1].root);}
        if(!usesRod(next.activeItem)&&!isBoat(next.activeItem)&&source)carryModel(next.activeItem,source);
      }
      const key=`${next.equippedLure}:${next.hookEquipped}`;
      if(key===signature)return;signature=key; held.clear();thirdHeld.clear();waterTackle.clear();
      for(const id of [next.equippedLure, next.hookEquipped?'hook':null]){
        if(!id)continue;const source=resources.get(id);if(!source)continue;
        const tackle=source.clone(true);tackle.scale.setScalar(id==='hook'?.15:.28);tackle.position.y=id==='hook'?-.16:0;
        waterTackle.add(tackle);held.add(tackle.clone(true));thirdHeld.add(tackle.clone(true));
      }
    },
    update(time:number, active:boolean, scoop:number|null=null, feeding=0,spear:{phase:SpearPhase;elapsed:number}={phase:'ready',elapsed:0},meal:{active:boolean;released:boolean}={active:false,released:false},pouring=false) {
      const dt=Math.min(.05,Math.max(0,time-lastTime));lastTime=time;
      if(isSpeargun(state.activeItem))spearguns.get(state.activeItem)?.forEach(s=>s.update(spear.phase,spear.elapsed,dt));
      syncRods();const rodVisible=usesRod(state.activeItem)&&!state.expansion?.stored.includes(selectedRod());
      carried.visible=thirdCarried.visible=!rodVisible;
      if(state.activeItem==='menhaden'){const show=meal.active?!meal.released:(state.menhaden??0)>0;for(const group of [carried,thirdCarried])if(group.children[0])group.children[0].visible=show;}
      if(seafoodSpec(state.activeItem)||state.activeItem==='ice-box')carried.rotation.x=thirdCarried.rotation.x=T.MathUtils.damp(carried.rotation.x,pouring?-.95:0,9,dt);
      if(state.activeItem==='net'){
        const dip=scoop===null?0:Math.sin(scoop*Math.PI);
        carried.rotation.x=thirdCarried.rotation.x=.28-.95*dip;
        carried.rotation.z=thirdCarried.rotation.z=scoop===null?0:Math.sin(scoop*Math.PI*2)*.2;
        carried.position.y=-.27-.4*dip;carried.position.z=-.65-.3*dip;thirdCarried.position.y=-.4*dip;thirdCarried.position.z=-.3*dip;
      }
      if(isPet(state.activeItem)){animatePet(carried,time,feeding);animatePet(thirdCarried,time,feeding);}
      if(state.activeItem==='food-can'||state.activeItem==='seawater'){carried.rotation.x=thirdCarried.rotation.x=-feeding*.55;carried.rotation.z=thirdCarried.rotation.z=Math.sin(time*14)*feeding*.08;}
      for(const [mount,tackle] of [[handRig,held],[thirdRodMount,thirdHeld]] as const){
        const tip=mount.getObjectByName('rod-tip'); tackle.visible=rodVisible && !active && !!(state.equippedLure||state.hookEquipped);
        if(tip?.parent)tip.parent.visible=rodVisible;
        if(tip){mount.updateMatrixWorld(true);const point=tip.localToWorld(new T.Vector3(0,-1.19,-.365));mount.worldToLocal(point);tackle.position.copy(point);}
        tackle.rotation.y=Math.sin(time*1.6)*.15;
      }
      waterTackle.rotation.y=time*.4;
    },
  };
}
