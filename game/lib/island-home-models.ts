import * as T from 'three';
import {homeItemInfo} from './island-habitat-types';

// Small, empty architectural displays for Isla's physical Pet Care shop.
export function petHomeDisplay(id:string){
  const info=homeItemInfo(id),tier=info?.tier??'prime';const root=new T.Group(),bird=info?.home==='birds';root.name=id;
  const wood=new T.MeshStandardMaterial({color:'#a37b4b',roughness:.85}),frame=new T.MeshStandardMaterial({color:'#476e60'}),wire=new T.MeshStandardMaterial({color:'#adbbb3',metalness:.3,roughness:.55});
  const box=(x:number,y:number,z:number,w:number,h:number,d:number,mat:T.Material)=>{const m=new T.Mesh(new T.BoxGeometry(w,h,d),mat);m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;root.add(m);return m;};
  const height=bird?.6:.4;
  if(bird)box(0,.025,0,1,.05,.85,wood);
  else{
    for(const x of [-.45,.45])box(x,.06,0,.1,.12,.85,wood);
    for(const z of [-.375,.375])box(0,.06,z,.8,.12,.1,wood);
    const water=new T.MeshStandardMaterial({color:'#39969f',transparent:true,opacity:.75});box(0,.035,0,.8,.02,.65,water);
  }
  for(const x of [-.43,.43])for(const z of [-.35,.35])box(x,height/2+.05,z,.035,height,.035,frame);
  for(const y of [.08,height+.05]){
    for(const z of [-.35,.35])box(0,y,z,.86,.02,.02,wire);
    for(const x of [-.43,.43])box(x,y,0,.02,.02,.7,wire);
  }
  for(let i=1;i<8;i++)for(const side of [-1,1]){
    box(-.43+i*.1075,height/2+.05,side*.35,.009,height,.009,wire);
    if(i<7)box(side*.43,height/2+.05,-.35+i*.1,.009,height,.009,wire);
  }
  // A distinct green doorway matches the full-sized home that will be installed.
  for(const x of [-.12,.12])box(x,height*.4,.363,.024,height*.72,.025,frame);
  box(0,height*.76,.363,.26,.024,.025,frame);
  if(bird){
    box(0,height+.075,0,.96,.035,.8,new T.MeshStandardMaterial({color:'#739983',transparent:true,opacity:.45}));
    for(const x of tier==='basic'?[]:tier==='standard'?[0]:[-.2,0,.2]){box(x,.22,-.1,.025,.35,.025,wood);box(x,.4,-.1,.3,.025,.03,wood);}
  }
  if(!bird&&tier!=='basic'){box(-.26,.065,0,.28,.08,.62,new T.MeshStandardMaterial({color:'#d5c38e'}));if(tier!=='standard')for(const z of [-.2,.15]){const rock=new T.Mesh(new T.IcosahedronGeometry(.10,1),new T.MeshStandardMaterial({color:'#9ba296'}));rock.position.set(-.27,.15,z);rock.scale.set(1.2,.7,1);root.add(rock);}}
  return root;
}
