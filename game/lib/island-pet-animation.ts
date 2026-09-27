import * as T from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { clone as cloneSkeleton } from 'three/examples/jsm/utils/SkeletonUtils.js';
import { loadIslandModel } from './island-models';
import { createBirdWings } from './island-bird-wings';
import { canonicalPetId } from './island-shop';

export type PetPose={gait:number;stride:number;peck:number;preen:number;look:number;flap:number;swim:number;turn:number;breath:number;flight?:number;landing?:number;gulp?:number};
export type PetAnimationAsset={source:T.Group;clips:T.AnimationClip[];flightSource?:T.Group};
const assets=new Map<string,Promise<PetAnimationAsset>>();
export function loadPetAnimationAsset(id:string):Promise<PetAnimationAsset>{
  id=canonicalPetId(id);
  let pending=assets.get(id);
  if(!pending){pending=(async()=>{
    if(id==='pet-seagull'){const [source,flightSource]=await Promise.all([loadIslandModel(id),loadIslandModel('pet-flying-seagull')]);return {source,flightSource,clips:[]};}
    if(id!=='pet-dolphin')return {source:await loadIslandModel(id),clips:[]};
    const gltf=await new GLTFLoader().loadAsync('/models/shop/pet-dolphin.glb');
    const box=new T.Box3().setFromObject(gltf.scene),size=box.getSize(new T.Vector3()),center=box.getCenter(new T.Vector3());
    const scale=1/Math.max(size.x,size.y,size.z),source=new T.Group();
    gltf.scene.scale.multiplyScalar(scale);gltf.scene.position.set(-center.x*scale,-box.min.y*scale,-center.z*scale);source.add(gltf.scene);
    gltf.scene.traverse(o=>{if(o instanceof T.Mesh){o.castShadow=true;o.receiveShadow=true;o.frustumCulled=false;}});
    return {source,clips:gltf.animations};
  })();assets.set(id,pending);pending.catch(()=>assets.delete(id));}
  return pending;
}

type Anatomy={hip:number;neck:number;head:number;wing:number;forward?:number};
const anatomy:Record<string,Anatomy>={
  'pet-seagull':{hip:.3,neck:.6,head:.77,wing:.55,forward:-Math.PI/2},
  'pet-white-pelican':{hip:.2,neck:.49,head:.7,wing:.48},
  'pet-brown-pelican':{hip:.23,neck:.47,head:.72,wing:.48},
  'pet-heron':{hip:.43,neck:.63,head:.83,wing:.6},
  'pet-great-egret':{hip:.4,neck:.6,head:.82,wing:.57},
  'pet-snowy-egret':{hip:.4,neck:.62,head:.83,wing:.57},
  'pet-osprey':{hip:.27,neck:.64,head:.79,wing:.55},
  'pet-white-stork':{hip:.48,neck:.68,head:.84,wing:.61,forward:-Math.PI/2},
  'pet-flying-seagull':{hip:0,neck:.6,head:.74,wing:.45,forward:-Math.PI/2},
  'pet-sea-lion':{hip:0,neck:.49,head:.72,wing:.25},
};
const smooth=(a:number,b:number,x:number)=>T.MathUtils.smoothstep(x,a,b);

// The supplied static meshes get weighted joints; their original geometry, textures and colours are retained.
export function rigStaticPet(source:T.Group,id:string,flightSource?:T.Group){
  const root=new T.Group(),box=new T.Box3(),p=anatomy[id]??anatomy['pet-seagull'];
  const parts:{geometry:T.BufferGeometry;material:T.Material|T.Material[]}[]=[];
  // Some exports face +X. Correct the local anatomy before assigning left/right wing weights.
  source.traverse(o=>{if(o instanceof T.Mesh){const geometry=o.geometry.clone().rotateY(p.forward??0);geometry.computeBoundingBox();box.union(geometry.boundingBox!);parts.push({geometry,material:o.material});}});
  const size=box.getSize(new T.Vector3()),h=size.y,flying=id==='pet-flying-seagull',sea=id==='pet-sea-lion';
  const bones:T.Bone[]=[],joint=(name:string,x:number,y:number,z:number,parent=0)=>{
    const b=new T.Bone();b.name=name;b.position.set(x,y,z);if(bones.length)bones[parent].add(b);else root.add(b);bones.push(b);return b;
  };
  joint('pet-body',0,0,0);
  const neck=joint('pet-neck',0,h*p.neck,size.z*.08);
  const head=joint('pet-head',0,h*(p.head-p.neck),size.z*.04,1);
  if(id.includes('pelican')){const mouth=new T.Object3D();mouth.name='pelican-bill-tip';mouth.position.set(0,-h*.065,size.z*.34);head.add(mouth);}
  const legL=joint('pet-leg-left',-size.x*.18,h*p.hip,0),legR=joint('pet-leg-right',size.x*.18,h*p.hip,0);
  const wingL=joint('pet-wing-left',-size.x*(flying?.12:.25),h*p.wing,0),wingR=joint('pet-wing-right',size.x*(flying?.12:.25),h*p.wing,0);
  const tail=joint('pet-tail',0,sea?h*.18:h*.38,-size.z*.22);
  const skeleton=new T.Skeleton(bones);
  const flightWings=!sea&&!flying?createBirdWings(id,size,h*p.wing,flightSource):undefined;
  if(flightWings)bones[0].add(flightWings.root);
  parts.forEach(({geometry,material})=>{
    const pos=geometry.getAttribute('position'),indices:number[]=[],weights:number[]=[];
    for(let i=0;i<pos.count;i++){
      const x=pos.getX(i),y=pos.getY(i),z=pos.getZ(i),yn=y/h;
      let bone=0,w=0;
      if(flying&&Math.abs(x)>size.x*.12){bone=x<0?5:6;w=smooth(size.x*.1,size.x*.25,Math.abs(x));}
      else if(!sea&&!flying&&yn<p.hip){bone=x<0?3:4;w=1-smooth(p.hip*.75,p.hip,yn);}
      else if(yn>p.neck){bone=yn>p.head?2:1;w=smooth(p.neck,p.neck+.09,yn);}
      else if(sea&&Math.abs(x)>size.x*.23&&yn<.45){bone=x<0?5:6;w=smooth(size.x*.22,size.x*.36,Math.abs(x));}
      else if(!sea&&!flying&&Math.abs(x)>size.x*.27&&yn>p.hip+.1&&yn<p.neck){bone=x<0?5:6;w=smooth(size.x*.27,size.x*.43,Math.abs(x))*.8;}
      else if(z<-size.z*.25){bone=7;w=1-smooth(-size.z*.43,-size.z*.25,z);}
      indices.push(bone,0,0,0);weights.push(w,1-w,0,0);
    }
    geometry.setAttribute('skinIndex',new T.Uint16BufferAttribute(indices,4));geometry.setAttribute('skinWeight',new T.Float32BufferAttribute(weights,4));
    const skin=new T.SkinnedMesh(geometry,material);skin.name=`animated-${id}`;skin.castShadow=true;skin.receiveShadow=true;skin.frustumCulled=false;root.add(skin);
    root.updateMatrixWorld(true);skin.bind(skeleton);
  });
  return {root,skeleton,animate(pose:PetPose){
    const flight=pose.flight??0,landing=pose.landing??0;
    flightWings?.animate(pose);
    // Keep the spine attached to the supplied body while the feet tuck back.
    bones[0].rotation.x=flight*(1-landing*.8)*.48;
    bones[0].scale.set(1,1+pose.breath*.008,1);
    neck.rotation.set(pose.peck*.9-(pose.gulp??0)*.32,pose.look*.5,pose.preen*.3);
    head.rotation.set(pose.peck*.42-(pose.gulp??0)*.5,pose.look*.5+pose.preen*.9,pose.preen*-.25);
    for(const [leg,phase] of [[legL,0],[legR,Math.PI]] as const){
      const cycle=pose.stride*T.MathUtils.clamp(.27/Math.max(.1,h*p.hip),.5,1.6)+phase;
      const swing=Math.sin(cycle);leg.rotation.x=Math.cos(cycle)*pose.gait*.38+flight*(1-landing)*1.1;
      leg.position.y=h*p.hip*Math.cos(leg.rotation.x)+Math.max(0,swing)*pose.gait*.05;
    }
    if(flying){wingL.rotation.z=-pose.flap;wingR.rotation.z=pose.flap;wingL.rotation.x=wingR.rotation.x=pose.turn*.12;}
    else if(sea){wingL.rotation.z=pose.swim*.45;wingR.rotation.z=-pose.swim*.45;wingL.rotation.x=wingR.rotation.x=pose.swim*.25;tail.rotation.x=pose.swim*.23;}
    else{wingL.rotation.z=-.1*pose.preen;wingR.rotation.z=.1*pose.preen;tail.rotation.y=pose.turn*.15;}
  },dispose(){skeleton.dispose();flightWings?.dispose();}};
}

export function createPetAnimation(asset:PetAnimationAsset,id:string){
  id=canonicalPetId(id);
  if(!asset.clips.length)return rigStaticPet(asset.source,id,asset.flightSource);
  const root=cloneSkeleton(asset.source) as T.Group,mixer=new T.AnimationMixer(root),action=mixer.clipAction(asset.clips[0]);action.play();
  return {root,animate(pose:PetPose,dt=1/60){action.timeScale=.65+pose.gait*.9;mixer.update(dt);},dispose(){mixer.stopAllAction();mixer.uncacheRoot(root);root.traverse(o=>{if(o instanceof T.SkinnedMesh)o.skeleton.dispose();});}};
}
