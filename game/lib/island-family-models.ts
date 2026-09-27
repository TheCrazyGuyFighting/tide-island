import * as T from 'three';
export function familyFurniture(id:string){
  const root=new T.Group(),wood=new T.MeshStandardMaterial({color:'#b78d52',roughness:.85}),teal=new T.MeshStandardMaterial({color:'#428d8d'}),water=new T.MeshStandardMaterial({color:'#8ddae0',roughness:.25});
  const add=(g:T.BufferGeometry,m:T.Material,x:number,y:number,z:number)=>{const o=new T.Mesh(g,m);o.position.set(x,y,z);o.castShadow=true;o.receiveShadow=true;root.add(o);return o;};
  if(id==='family-nest'){
    add(new T.CylinderGeometry(.39,.32,.065,12),new T.MeshStandardMaterial({color:'#80623b'}),0,.035,0);
    for(let layer=0;layer<4;layer++)for(let i=0;i<12;i++){const angle=i*Math.PI/6+layer*.17,r=.39+layer*.018;const twig=add(new T.CylinderGeometry(.025,.035,.30,6),wood,Math.cos(angle)*r,.08+layer*.042,Math.sin(angle)*r);twig.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),new T.Vector3(-Math.sin(angle),.09*Math.sin(i*3+layer),Math.cos(angle)).normalize());}
  }
  else if(id==='family-perch'){for(const x of [-.6,.6])add(new T.CylinderGeometry(.07,.1,1.25,8),wood,x,.625,0);add(new T.CylinderGeometry(.09,.09,1.55,8).rotateZ(Math.PI/2),wood,0,1.2,0);add(new T.CylinderGeometry(.045,.06,.7,7).rotateZ(.7),wood,.3,1.35,0);}
  else{for(const x of [-.45,.45])add(new T.CylinderGeometry(.05,.065,.6,8),wood,x,.3,0);add(new T.BoxGeometry(1.2,.12,.7),wood,0,.65,0);for(const x of [-.32,.32]){add(new T.CylinderGeometry(.23,.18,.12,16),teal,x,.75,0);add(new T.CircleGeometry(.19,20).rotateX(-Math.PI/2),x>0?water:new T.MeshStandardMaterial({color:'#dda969'}),x,.817,0);}}
  return root;
}
