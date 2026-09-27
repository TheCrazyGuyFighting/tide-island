import * as T from 'three';
import type {FishAgent,LandingPose} from './island-fishing';

const turn=new T.Euler();
export function fishMouthOffset(fish:FishAgent,out=new T.Vector3()) {
  const p=fish.mouthLocal??{x:0,y:0,z:.43};
  return out.set(p.x,p.y,p.z).multiplyScalar(fish.length??1);
}
export function landedMouth(fish:FishAgent,pose:LandingPose,out=new T.Vector3()) {
  fishMouthOffset(fish,out).applyEuler(turn.set(pose.pitch,pose.yaw,pose.roll));
  out.x+=pose.position.x;out.y+=pose.position.y;out.z+=pose.position.z;return out;
}

/** The point of the hook is at the mouth; the line terminates at its eye. */
export function createCatchHook(scene:T.Scene) {
  const root=new T.Group();root.name='mouth-attached-fishing-hook';root.scale.setScalar(.35);root.visible=false;scene.add(root);
  const curve=new T.CatmullRomCurve3([
    new T.Vector3(0,0,0),new T.Vector3(.012,-.028,0),new T.Vector3(.037,-.03,0),
    new T.Vector3(.045,-.007,0),new T.Vector3(.044,.092,0),
  ]);
  const metal=new T.MeshStandardMaterial({color:'#b8c6cc',metalness:.85,roughness:.22});
  root.add(new T.Mesh(new T.TubeGeometry(curve,24,.003,6,false),metal));
  const eye=new T.Mesh(new T.TorusGeometry(.011,.003,5,12),metal);eye.position.set(.044,.103,0);root.add(eye);
  const endpoint=new T.Vector3();
  return {root,endpoint,update(mouth:{x:number;y:number;z:number}|null,yaw:number){
    root.visible=!!mouth;if(!mouth)return;
    root.position.set(mouth.x,mouth.y,mouth.z);root.rotation.y=yaw;root.updateMatrixWorld(true);
    root.localToWorld(endpoint.set(.044,.114,0));
  }};
}
