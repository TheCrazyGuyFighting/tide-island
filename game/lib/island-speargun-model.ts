import * as T from 'three';
import {GLTFLoader,type GLTF} from 'three/examples/jsm/loaders/GLTFLoader.js';
import {clone} from 'three/examples/jsm/utils/SkeletonUtils.js';
import type {SpearPhase} from './island-spearfishing';
import {MeshoptDecoder} from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import type {SpeargunId} from './island-speargun-types';
const assets=new Map<SpeargunId,Promise<GLTF>>();
export function loadSpeargunAsset(id:SpeargunId='speargun'){
  let asset=assets.get(id);if(!asset){asset=new GLTFLoader().setMeshoptDecoder(MeshoptDecoder).loadAsync(`/models/shop/${id==='meandros-b32'?'meandros-b32':'pelagic-r07'}.glb`);assets.set(id,asset);asset.catch(()=>assets.delete(id));}return asset;
}
export async function createSpeargunActor(id:SpeargunId='speargun'){
  const gltf=await loadSpeargunAsset(id),model=clone(gltf.scene),root=new T.Group();root.add(model);root.rotation.y=Math.PI/2;root.name=id;
  const mixer=new T.AnimationMixer(model),actions=new Map(gltf.animations.map(clip=>[clip.name,mixer.clipAction(clip)]));
  let current='',clock=0;
  model.traverse(o=>{if(o instanceof T.Mesh){o.castShadow=false;o.frustumCulled=false;}});
  return {root,update(phase:SpearPhase,elapsed:number,dt:number){
    clock+=dt;const name=phase==='reloading'?'Reload':phase==='ready'?'Idle':'Fire';
    if(name!==current){mixer.stopAllAction();const action=actions.get(name);if(action){action.reset();action.setLoop(name==='Idle'?T.LoopRepeat:T.LoopOnce,name==='Idle'?Infinity:1);action.clampWhenFinished=true;action.play();}current=name;}
    const action=actions.get(name);if(action){action.time=name==='Idle'?clock%action.getClip().duration:Math.min(action.getClip().duration-.00001,phase==='retrieving'?.8:elapsed);mixer.update(0);}
    const spear=model.getObjectByName(id==='meandros-b32'?'B32_Spear':'R07_Spear');if(spear)spear.visible=phase!=='retrieving'&&!(phase==='firing'&&elapsed>.1);
  },dispose(){mixer.stopAllAction();mixer.uncacheRoot(model);model.traverse(o=>{if(o instanceof T.SkinnedMesh)o.skeleton.dispose();});}};
}
