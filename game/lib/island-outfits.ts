import * as T from 'three';
import type {Outfit} from './island-water';
const mat=(color:string,metalness=0)=>new T.MeshStandardMaterial({color,roughness:.65,metalness});
function part(root:T.Object3D,shape:T.BufferGeometry,material:T.Material,x:number,y:number,z:number){const m=new T.Mesh(shape,material);m.position.set(x,y,z);root.add(m);return m;}
export function createOutfitRig(player:T.Object3D,legs:T.Object3D[]){
  const waders=new T.Group(),scuba=new T.Group(),snorkel=new T.Group();player.add(waders,scuba,snorkel);
  const rubber=mat('#3e6250'),strap=mat('#cfad65'),dark=mat('#132c38'),teal=mat('#13a6ad'),silver=mat('#becdd0',.65);
  part(waders,new T.BoxGeometry(.48,.53,.36),rubber,0,1.03,0);
  part(waders,new T.BoxGeometry(.24,.17,.025),strap,0,1.08,-.195);
  for(const side of [-1,1]){
    part(waders,new T.BoxGeometry(.062,.45,.035),strap,side*.18,1.38,-.17).rotation.z=side*.08;
    part(scuba,new T.CapsuleGeometry(.105,.5,4,10),silver,side*.115,1.05,.29).rotation.z=side*.03;
    part(scuba,new T.BoxGeometry(.29,.05,.06),dark,side*.115,.99,.37);
    part(scuba,new T.BoxGeometry(.065,.54,.04),teal,side*.19,1.16,-.18);
  }
  part(scuba,new T.BoxGeometry(.37,.16,.08),dark,0,1.59,-.175);
  part(scuba,new T.BoxGeometry(.31,.105,.02),new T.MeshStandardMaterial({color:'#64e0e6',metalness:.3,roughness:.08,transparent:true,opacity:.55}),0,1.595,-.223);
  part(scuba,new T.CylinderGeometry(.066,.066,.09,12).rotateX(Math.PI/2),dark,0,1.46,-.23);
  const hose=new T.CatmullRomCurve3([new T.Vector3(.12,1.31,.33),new T.Vector3(.36,1.46,.1),new T.Vector3(.24,1.43,-.23),new T.Vector3(0,1.46,-.24)]);
  part(scuba,new T.TubeGeometry(hose,16,.022,6,false),dark,0,0,0);
  const orange=mat('#f3a142');part(snorkel,new T.BoxGeometry(.37,.16,.09),orange,0,1.59,-.18);
  part(snorkel,new T.BoxGeometry(.31,.105,.02),mat('#61d4da'),0,1.595,-.234);
  const tube=new T.CatmullRomCurve3([new T.Vector3(0,1.45,-.23),new T.Vector3(-.25,1.47,-.20),new T.Vector3(-.27,1.8,-.04),new T.Vector3(-.23,1.98,-.02)]);
  part(snorkel,new T.TubeGeometry(tube,18,.026,8,false),teal,0,0,0);part(snorkel,new T.CylinderGeometry(.04,.04,.10,8),orange,-.23,1.98,-.02);
  const legwear=legs.map(leg=>{const boots=new T.Group(),fins=new T.Group();leg.add(boots,fins);part(boots,new T.CylinderGeometry(.125,.145,.68,9),rubber,0,-.34,0);part(boots,new T.BoxGeometry(.235,.18,.38),rubber,0,-.69,-.10);part(fins,new T.BoxGeometry(.24,.06,.60),teal,0,-.70,-.24);return {boots,fins};});
  return {set(outfit:Outfit){waders.visible=outfit==='waders';scuba.visible=outfit==='scuba';snorkel.visible=outfit==='snorkel';legwear.forEach(l=>{l.boots.visible=outfit==='waders';l.fins.visible=outfit==='scuba'||outfit==='snorkel';});}};
}
export function outfitDisplay(id:string){
  const root=new T.Group(),body=new T.Group();root.add(body);
  const base=mat('#203b43'),cloth=mat(id==='scuba'?'#132c38':id==='snorkel'?'#1eb4ba':'#e1e9dc');
  part(body,new T.CapsuleGeometry(.24,.44,4,9),cloth,0,1.05,0);part(body,new T.SphereGeometry(.18,10,8),base,0,1.57,0);
  const legs=[-1,1].map(side=>{const leg=new T.Group();leg.position.set(side*.13,.77,0);body.add(leg);part(leg,new T.CapsuleGeometry(.105,.48,4,8),base,0,-.34,0);return leg;});
  createOutfitRig(body,legs).set(id==='scuba'?'scuba':id==='snorkel'?'snorkel':'waders');
  for(const side of [-1,1])part(body,new T.CapsuleGeometry(.085,.43,4,8),cloth,side*.34,1.06,0).rotation.z=side*.15;
  body.rotation.y=.4;return root;
}
