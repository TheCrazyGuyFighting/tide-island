import * as T from 'three';
import { loadIslandModel } from './island-models';
import { isPet, isAquaticPet, canonicalPetId } from './island-shop';
import { loadPetAnimationAsset,createPetAnimation,type PetAnimationAsset,type PetPose } from './island-pet-animation';

export function petEnclosure(id:string, animal:T.Group, nest?:T.Group) {
  const enclosure=new T.Group(),root=new T.Group();root.name=`enclosure-${id}`;root.add(enclosure);
  const frame=new T.MeshStandardMaterial({color:'#aa9670',metalness:.35,roughness:.55});
  const base=new T.Mesh(new T.BoxGeometry(1.42,.08,1.22),new T.MeshStandardMaterial({color:'#3a5651',roughness:.8}));base.position.y=.04;enclosure.add(base);
  const aquatic=isAquaticPet(id),h=aquatic?.92:1.38;
  const poleGeometry=new T.CylinderGeometry(.009,.009,h,5);
  for(let i=0;i<=6;i++)for(const side of [-1,1]){
    if(aquatic && i!==0 && i!==6)continue;
    for(const [x,z] of [[-.66+i*.22,side*.56],[side*.66,-.56+i*.187]]){const pole=new T.Mesh(poleGeometry,frame);pole.position.set(x,.08+h/2,z);enclosure.add(pole);}
  }
  for(const y of [.1,h+.08]){
    for(const z of [-.56,.56]){const bar=new T.Mesh(new T.BoxGeometry(1.35,.025,.025),frame);bar.position.set(0,y,z);enclosure.add(bar);}
    for(const x of [-.66,.66]){const bar=new T.Mesh(new T.BoxGeometry(.025,.025,1.15),frame);bar.position.set(x,y,0);enclosure.add(bar);}
  }
  if(aquatic){
    const glass=new T.Mesh(new T.BoxGeometry(1.3,h,1.1),new T.MeshPhysicalMaterial({color:'#99d8d4',transparent:true,opacity:.09,roughness:.15,side:T.DoubleSide,depthWrite:false}));glass.position.y=.08+h/2;enclosure.add(glass);
    const water=new T.Mesh(new T.PlaneGeometry(1.28,1.08),new T.MeshStandardMaterial({color:'#2faeb8',transparent:true,opacity:.25,side:T.DoubleSide,depthWrite:false}));water.rotation.x=-Math.PI/2;water.position.y=h*.68;enclosure.add(water);
  }else{
    const roof=new T.Mesh(new T.BoxGeometry(1.4,.04,1.2),new T.MeshStandardMaterial({color:'#4e6d5e',transparent:true,opacity:.22,depthWrite:false}));roof.position.y=h+.1;enclosure.add(roof);
    if(nest){const n=nest.clone(true);n.scale.setScalar(.54);n.position.set(-.22,.08,.12);enclosure.add(n);}
  }
  const pet=new T.Group();pet.name='pet-occupant';const model=animal.clone(true);model.scale.setScalar(aquatic?.94:.8);
  pet.add(model);pet.position.set(.03,aquatic?.27:id==='pet-flying-seagull'?.5:.13,0);pet.rotation.y=-.35;pet.userData.baseY=pet.position.y;enclosure.add(pet);
  enclosure.scale.setScalar(1/1.44);root.userData.petId=id;return root;
}
const displays=new Map<string,Promise<T.Group>>();
const animationAssets=new Map<string,PetAnimationAsset>();
const displayActors=new WeakMap<T.Object3D,{animation:ReturnType<typeof createPetAnimation>;last:number;pose:PetPose}>();
export async function loadShopDisplay(id:string) {
  id=canonicalPetId(id);
  if(!isPet(id))return loadIslandModel(id);
  let pending=displays.get(id);
  if(!pending){pending=Promise.all([loadIslandModel(id),isAquaticPet(id)?Promise.resolve(undefined):loadIslandModel('birds-nest'),loadPetAnimationAsset(id)]).then(([animal,nest,asset])=>{animationAssets.set(id,asset);return petEnclosure(id,animal,nest);});displays.set(id,pending);pending.catch(()=>displays.delete(id));}
  return (await pending).clone(true);
}
export function animatePet(root:T.Object3D,time:number,feeding=0) {
  const pet=root.getObjectByName('pet-occupant');if(!pet)return;
  const id=root.userData.petId as string,asset=animationAssets.get(id);if(!asset)return;
  let actor=displayActors.get(pet);
  if(!actor){
    const animation=createPetAnimation(asset,id);animation.root.scale.copy(pet.children[0].scale);pet.clear();pet.add(animation.root);
    actor={animation,last:time,pose:{gait:0,stride:0,peck:0,preen:0,look:0,flap:0,swim:0,turn:0,breath:0}};displayActors.set(pet,actor);
  }
  const offset=[...id].reduce((n,c)=>n+c.charCodeAt(0),0)*.07,t=time+offset,p=actor.pose;
  p.gait=isAquaticPet(id)?.55:0;p.peck=Math.max(feeding,t%10>7?Math.max(0,Math.sin(t*5)):0);p.preen=t%10>4&&t%10<6?Math.sin(t*2):0;
  p.look=Math.sin(t*.7)*.45;p.flap=Math.sin(t*9.5)*.75;p.swim=Math.sin(t*4);p.breath=Math.sin(t*2);
  actor.animation.animate(p,Math.min(.05,Math.max(0,time-actor.last)));actor.last=time;
}
