import * as T from 'three';
import {mesh,material} from './island-landscape';
import {label} from './island-market';
import {addPetGate} from './island-pet-gate';
import {familyFurniture} from './island-family-models';
import {FAMILY_AVIARY as H,FAMILY_CARE,FAMILY_FURNITURE,familyStage} from './island-family-layout';
import {AVIARY,birdPassage} from './island-home-layout';
import {createPetAnimation,type PetAnimationAsset,type PetPose} from './island-pet-animation';
import type {ShopSnapshot} from './island-shop';
import type {IslandPhysics,Collider,Body} from './island-physics';
type Actor=ReturnType<typeof createPetAnimation>;
export function createFamilyHome(scene:T.Scene,physics:IslandPhysics,_disposed:()=>boolean){
  const root=new T.Group();root.name='purchased-family-aviary';root.visible=false;scene.add(root);
  const wood=material('#aa7b47'),mint=material('#608c78'),wire=material('#a9c0b6'),roof=material('#457369');
  const colliders:Collider[]=[],box=(x:number,y:number,z:number,rx:number,ry:number,rz:number)=>{const c:Collider={kind:'box',x,y,z,rx,ry,rz,enabled:false};physics.addCollider(c);colliders.push(c);return c;};
  mesh(root,new T.BoxGeometry(8,.18,7.8),wood,H.x,H.y-.09,H.z+.5);
  for(const x of [-H.rx,H.rx])for(const z of [-H.rz,H.rz])mesh(root,new T.BoxGeometry(.16,H.height,.16),wood,H.x+x,H.y+H.height/2,H.z+z);
  for(const side of [-1,1]){
    box(H.x+side*H.rx,H.y+1.9,H.z,.08,1.9,H.rz);
    for(let z=-H.rz;z<=H.rz;z+=.4)mesh(root,new T.CylinderGeometry(.018,.018,H.height,5),wire,H.x+side*H.rx,H.y+1.9,H.z+z);
    const r=mesh(root,new T.BoxGeometry(H.rx+.45,.16,6.7),roof,H.x+side*H.rx/2,H.y+H.height+.4,H.z);r.rotation.z=-side*.22;
  }
  box(H.x,H.y+1.9,H.z-H.rz,H.rx,1.9,.08);
  for(let x=-H.rx;x<=H.rx;x+=.4)for(const z of [-H.rz,H.rz]){if(z>0&&Math.abs(x)<1)continue;mesh(root,new T.CylinderGeometry(.018,.018,H.height,5),wire,H.x+x,H.y+1.9,H.z+z);}
  for(const side of [-1,1])box(H.x+side*2.25,H.y+1.9,H.z+H.rz,1.25,1.9,.08);
  box(H.x,H.y+3.3,H.z+H.rz,1,.55,.08);
  for(const y of [.2,1.35,2.7,3.7]){
    for(const side of [-1,1]){mesh(root,new T.BoxGeometry(.07,.07,6),mint,H.x+side*H.rx,H.y+y,H.z);mesh(root,new T.BoxGeometry(2.5,.07,.07),mint,H.x+side*2.25,H.y+y,H.z+H.rz);}
    mesh(root,new T.BoxGeometry(7,.07,.07),mint,H.x,H.y+y,H.z-H.rz);
  }
  const gate=addPetGate(root,physics,'family',H.x-.9,H.y,H.z+H.rz,1.8,2.65,0);gate.collider.enabled=false;colliders.push(gate.collider);
  label(root,'FAMILY AVIARY','Two parents · two chicks · E to care',H.x,H.y+4.65,H.z+H.rz,4.4);
  label(root,'NEST & NURTURE','E to choose a breeding pair',FAMILY_CARE.x,H.y+1.4,FAMILY_CARE.z,3);
  const furnishings=new Map<string,T.Group>();
  for(const id of ['family-perch','family-feeder']){const o=familyFurniture(id);o.position.set(H.x+(id==='family-perch'?1.5:2),H.y,H.z+(id==='family-perch'?-1.4:1));root.add(o);furnishings.set(id,o);}
  const nest=familyFurniture('family-nest');nest.scale.setScalar(1.4);
  const nestHolder=new T.Group();nestHolder.position.set(H.x-1.25,H.y+.12,H.z-.5);nestHolder.add(nest);root.add(nestHolder);furnishings.set('family-nest',nestHolder);
  const eggs=new T.Group();for(const side of [-1,1]){const egg=mesh(eggs,new T.SphereGeometry(.15,14,10),material('#f4e1b1'),H.x-1.25+side*.2,H.y+.36,H.z-.5);egg.scale.set(.8,1.25,.8);}root.add(eggs);eggs.visible=false;
  const furnitureColliders=new Map([...furnishings].map(([id,o])=>{const bounds=new T.Box3().setFromObject(o),center=bounds.getCenter(new T.Vector3()),size=bounds.getSize(new T.Vector3());return [id,box(center.x,center.y,center.z,size.x/2,size.y/2,size.z/2)] as const;}));
  let chicks:Actor[]=[];
  return {root,gate,
    async prepare(_ids:string[]){/* Procedural furnishings are ready before payment. */},
    apply(s:ShopSnapshot,source?:PetAnimationAsset){const owned=s.owned.includes('family-aviary');root.visible=owned;colliders.forEach(c=>c.enabled=owned);for(const id of FAMILY_FURNITURE)furnishings.get(id)!.visible=owned&&s.owned.includes(id);
      for(const [id,c] of furnitureColliders)c.enabled=owned&&s.owned.includes(id);
      if(s.familyBrood&&!chicks.length&&source){chicks=[createPetAnimation(source,s.familyBrood.species),createPetAnimation(source,s.familyBrood.species)];for(const [i,c] of chicks.entries()){c.root.name=`family-chick-${i+1}`;root.add(c.root);}}
      if(!s.familyBrood&&chicks.length){for(const c of chicks){c.root.removeFromParent();c.dispose();}chicks=[];}},
    update(time:number,dt:number,s:ShopSnapshot,parents:Actor[],body?:Body,passage=birdPassage()){if(!root.visible)return;gate.update(dt,body);const b=s.familyBrood;eggs.visible=!!b&&familyStage(b)==='eggs';if(!b)return;
      for(const [i,a] of parents.entries()){a.root.position.set(H.x+(i?1.3:-.1),H.y+.11,H.z+(i?-1.2:.2));a.root.scale.setScalar(1.25);a.root.rotation.set(0,i?-2.2:-.7,0);a.animate({gait:0,stride:0,peck:Math.max(0,Math.sin(time*.7+i))*.4,preen:Math.sin(time*.5+i)*.12,look:Math.sin(time+i)*.2,flap:0,flight:0,swim:0,turn:0,breath:Math.sin(time*2)},dt);}
      const stage=familyStage(b),growth=T.MathUtils.clamp((b.elapsed-40)/100,0,1);
      for(const [i,c] of chicks.entries()){c.root.visible=stage!=='eggs';if(!c.root.visible)continue;const side=i?1:-1,pose:PetPose={gait:0,stride:time*4,peck:Math.max(0,Math.sin(time*2+i))*.5,preen:0,look:Math.sin(time+i)*.2,flap:Math.sin(time*9+i)*.55,flight:0,swim:0,turn:0,breath:Math.sin(time*3)};
        c.root.scale.setScalar(stage==='moving'?1.25:.25+growth*.8);c.root.rotation.set(0,.4+Math.sin(time*.5+i)*.4,0);c.root.position.set(H.x-1.25+side*(.2+growth*.5),H.y+.25+Math.max(0,Math.sin(time*3+i))*.08*growth,H.z-.5+Math.sin(time*.5+i)*growth*.5);
        if(stage==='juvenile'){pose.gait=.25;pose.flight=Math.max(0,Math.sin(time*.7+i))*.4;c.root.position.y+=pose.flight*.8;}
        if(stage==='moving'){
          const route=[new T.Vector3(H.x-1.25+side*.3,H.y+.3,H.z-.5),new T.Vector3(H.x,H.y+.8,H.z+H.rz+.1),new T.Vector3(H.x,H.y+1,H.z+H.rz+1.5),new T.Vector3(H.x,14,42.5),new T.Vector3(passage.outside.x,14,passage.outside.z),new T.Vector3(passage.outside.x,passage.outside.y,passage.outside.z),new T.Vector3(passage.door.x,passage.door.y,passage.door.z),new T.Vector3(-54+side,AVIARY.y+.11,43)];
          const t=T.MathUtils.clamp((b.elapsed-140-i*.6)/10.8,0,.9999)*(route.length-1),index=Math.floor(t),a=route[index],next=route[index+1];c.root.position.copy(a).lerp(next,t-index);c.root.rotation.y=Math.atan2(next.x-a.x,next.z-a.z);pose.flight=index===1||index===5?.12:1;
        }
        c.animate(pose,dt);
      }
    },dispose(){for(const c of chicks)c.dispose();},
  };
}
