import * as T from 'three';
import {seafoodSpec,bundleSpec} from './island-expansion-types';
const mat=(color:string,metalness=0)=>new T.MeshStandardMaterial({color,metalness,roughness:metalness?.3:.75});
function part(root:T.Object3D,g:T.BufferGeometry,m:T.Material,x=0,y=0,z=0){const o=new T.Mesh(g,m);o.position.set(x,y,z);o.castShadow=true;o.receiveShadow=true;root.add(o);return o;}
export function keeperTrainer(){
  const r=new T.Group();r.name='professional-keeper';
  const suit=mat('#234551'),skin=mat('#b78766'),boots=mat('#18252b');
  const joint=(parent:T.Object3D,name:string,x:number,y:number,z=0)=>{const g=new T.Group();g.name=name;g.position.set(x,y,z);parent.add(g);return g;};
  const chest=joint(r,'trainer-chest',0,1.15);
  part(chest,new T.CapsuleGeometry(.20,.43,8,20),suit);
  const head=joint(r,'trainer-head',0,1.65);
  part(head,new T.SphereGeometry(.16,24,16),skin);
  part(head,new T.CylinderGeometry(.23,.24,.055,24),boots,0,.18);
  for(const x of [-.055,.055])part(head,new T.SphereGeometry(.016,12,8),boots,x,.025,.145);
  for(const [i,side] of ['left','right'].entries()){
    const s=i?1:-1,hip=joint(r,side+'-hip',s*.12,.89);
    part(hip,new T.CapsuleGeometry(.082,.63,8,12),boots,0,-.40);
    part(hip,new T.BoxGeometry(.16,.10,.28),boots,0,-.80,.055);
    const arm=joint(r,side+'-shoulder',s*.26,1.41);
    part(arm,new T.CapsuleGeometry(.065,.20,8,12),suit,0,-.14);
    const elbow=joint(arm,side+'-elbow',0,-.30);
    part(elbow,new T.CapsuleGeometry(.058,.19,8,12),suit,0,-.13);
    part(elbow,new T.SphereGeometry(.07,16,12),skin,0,-.30);
    if(!i){const bucket=joint(elbow,'trainer-bucket',0,-.50,.06);part(bucket,new T.CylinderGeometry(.15,.12,.23,20),mat('#72968d'));part(bucket,new T.TorusGeometry(.15,.012,8,24,Math.PI),boots,0,.13);bucket.visible=false;}
  }
  part(r,new T.BoxGeometry(.09,.10,.02),mat('#ece2bc'),-.11,1.3,.195);
  part(r,new T.SphereGeometry(.027,12,8),mat('#b9bbc1',.6),.06,1.34,.225);
  return r;
}
export function expansionDisplay(id:string){
  if(id==='trainer')return keeperTrainer();
  const r=new T.Group(),food=seafoodSpec(id),bundle=bundleSpec(id),steel=mat('#a6b0b0',.65);
  if(food){const color=food.mode==='live'?'#24646d':food.mode==='frozen'?'#80b1c4':'#7d5741';part(r,new T.CylinderGeometry(.36,.29,.56,40,1,true),mat(color),0,.3);part(r,new T.CylinderGeometry(.29,.29,.045,40),steel,0,.02);part(r,new T.TorusGeometry(.36,.021,12,48),steel,0,.58).rotation.x=Math.PI/2;const handle=part(r,new T.TorusGeometry(.37,.018,8,32,Math.PI),steel,0,.57);handle.rotation.y=Math.PI/2;part(r,new T.CylinderGeometry(.33,.33,.025,40),mat(food.mode==='frozen'?'#c2e4ef':'#426e70'),0,.48);r.userData.food=food.kind;
  }else if(bundle){part(r,new T.BoxGeometry(.85,.60,.62),mat('#847052'),0,.30);for(const x of [-.28,.28])part(r,new T.BoxGeometry(.055,.62,.65),steel,x,.31);part(r,new T.BoxGeometry(.32,.22,.018),mat('#e2ce9e'),0,.32,.32);}
  return r;
}
