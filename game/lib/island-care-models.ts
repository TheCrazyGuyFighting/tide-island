import * as T from 'three';
import { DEFAULT_CAN,type CanDesign } from './island-shop';
export function careModel(id:string,design:CanDesign=DEFAULT_CAN) {
  const root=new T.Group(),food=id==='food-can';
  const metal=new T.MeshStandardMaterial({color:'#d5dfdd',metalness:.55,roughness:.34});
  const body=new T.Mesh(new T.CylinderGeometry(.3,.3,.7,24),new T.MeshStandardMaterial({color:food?design.color:'#3b9eba',roughness:.48}));body.position.y=.38;root.add(body);
  for(const y of [.045,.735]){const lid=new T.Mesh(new T.CylinderGeometry(.315,.315,.045,24),metal);lid.position.y=y;root.add(lid);}
  if(food&&design.stripe){for(const y of [.14,.61]){const ring=new T.Mesh(new T.CylinderGeometry(.302,.302,.065,24),new T.MeshStandardMaterial({color:'#f6e4b8'}));ring.position.y=y;root.add(ring);}}
  const canvas=document.createElement('canvas');canvas.width=512;canvas.height=256;const ctx=canvas.getContext('2d')!;
  ctx.fillStyle='#f5ecd2';ctx.fillRect(0,0,512,256);ctx.textAlign='center';ctx.fillStyle='#214445';ctx.font='bold 45px sans-serif';ctx.fillText(food?design.label:'SEAWATER',256,113,470);ctx.font='28px sans-serif';ctx.fillText(food?'PET FOOD · REFILLABLE':'HABITAT SUPPLY',256,173,470);
  const map=new T.CanvasTexture(canvas);map.colorSpace=T.SRGBColorSpace;
  const label=new T.Mesh(new T.PlaneGeometry(.48,.24),new T.MeshStandardMaterial({map,roughness:.75}));label.position.set(0,.39,.304);root.add(label);
  const pull=new T.Mesh(new T.TorusGeometry(.06,.014,6,14),metal);pull.rotation.x=Math.PI/2;pull.position.set(0,.766,0);root.add(pull);
  root.traverse(o=>{if(o instanceof T.Mesh){o.castShadow=true;o.receiveShadow=true;}});root.name=id;return root;
}
