import * as T from 'three';
import {material,mesh} from './island-landscape';
import {label} from './island-market';
import {addPetGate} from './island-pet-gate';
import {habitatLayout,seaBeachHeight} from './island-home-layout';
import {TIER_NAMES,TIER_CAPACITY,AREA_PER_EXTRA_RESIDENT,type PetHome,type HomeTier} from './island-habitat-types';
import type {IslandPhysics,Collider} from './island-physics';

export function buildHabitat(home:PetHome,tier:HomeTier,physics:IslandPhysics,addedArea=0){
  const h=habitatLayout(home,tier,addedArea),root=new T.Group();root.name=`${tier}-${home}-habitat`;
  const wood=material('#a37b4b'),green=material('#476e60'),wire=material('#b7c9bd'),sand=material('#cdb988');
  const colliders:Collider[]=[];
  const block=(x:number,y:number,z:number,rx:number,ry:number,rz:number)=>{const c:Collider={kind:'box',x,y,z,rx,ry,rz,enabled:false};colliders.push(c);physics.addCollider(c);};
  const deck=(x:number,z:number,w:number,d:number)=>{mesh(root,new T.BoxGeometry(w,.18,d),wood,x,h.y-.09,z);};
  const bar=(x:number,z:number,height=h.height)=>mesh(root,new T.CylinderGeometry(.022,.025,height,6),wire,x,h.y+height/2,z);
  const g=h.gate;
  if(home==='birds'){
    deck(h.x,h.z,2*h.rx+2.6,2*h.rz+2);deck(g.x+1.6,g.z,3.8,3);
    mesh(root,new T.BoxGeometry(2*h.rx,.08,2*h.rz),sand,h.x,h.y+.04,h.z);
    block(h.x-h.rx,h.y+h.height/2,h.z,.08,h.height/2,h.rz);
    for(const z of [h.z-h.rz,h.z+h.rz]){block(h.x,h.y+h.height/2,z,h.rx,h.height/2,.08);for(let x=h.x-h.rx;x<=h.x+h.rx;x+=.5)bar(x,z);}
    const lo=g.z-g.width/2,hi=g.z+g.width/2;
    for(const [a,b] of [[h.z-h.rz,lo],[hi,h.z+h.rz]]){block(g.x,h.y+h.height/2,(a+b)/2,.08,h.height/2,(b-a)/2);for(let z=a;z<=b;z+=.45)bar(g.x,z);}
    block(g.x,h.y+(h.height+g.height)/2,g.z,.08,(h.height-g.height)/2,g.width/2);
    for(let z=h.z-h.rz;z<=h.z+h.rz;z+=.45)bar(h.x-h.rx,z);
    for(const y of [.15,h.height*.28,h.height*.56,h.height*.82,h.height]){
      for(const z of [h.z-h.rz,h.z+h.rz])mesh(root,new T.BoxGeometry(h.rx*2,.04,.04),wire,h.x,h.y+y,z);
      mesh(root,new T.BoxGeometry(.04,.04,h.rz*2),wire,h.x-h.rx,h.y+y,h.z);
      for(const [a,b] of [[h.z-h.rz,lo],[hi,h.z+h.rz]])mesh(root,new T.BoxGeometry(.04,.04,b-a),wire,g.x,h.y+y,(a+b)/2);
    }
    for(const x of [h.x-h.rx,h.x+h.rx])for(const z of [h.z-h.rz,h.z+h.rz])mesh(root,new T.BoxGeometry(.16,h.height+.1,.16),green,x,h.y+h.height/2,z);
    const roof=mesh(root,new T.BoxGeometry(h.rx*2+.25,.08,h.rz*2+.25),new T.MeshStandardMaterial({color:'#628d78',transparent:true,opacity:.25,depthWrite:false}),h.x,h.y+h.height,h.z);roof.castShadow=false;
    if(tier!=='basic'){
      const perches=tier==='standard'?[0]:[-2,0,2];for(const dx of perches){const px=h.x+dx*h.s,pz=h.z-1.5*h.s,ph=tier==='standard'?1.45:2.2;
        mesh(root,new T.CylinderGeometry(.09,.12,ph,8),wood,px,h.y+ph/2,pz);mesh(root,new T.BoxGeometry(tier==='standard'?1.5:2.1,.13,.17),wood,px,h.y+ph,pz);block(px,h.y+ph/2,pz,.18,ph/2,.18);
      }
      mesh(root,new T.CylinderGeometry(.65,.6,.18,18),material('#6daca7'),h.x+1.4*h.s,h.y+.18,h.z+1.8*h.s);
    }
  }else{
    for(const x of [h.x-h.rx-.9,h.x+h.rx+.9])deck(x,h.z,1.8,2*h.rz+3.6);
    for(const z of [h.z-h.rz-.9,h.z+h.rz+.9])deck(h.x,z,2*h.rx,1.8);
    deck(h.x,g.z-.15,4,5.3);deck((h.x-3-36)/2,h.z-h.rz-.55,-36-(h.x-3),2.5);
    // A solid railed keeper platform; the gate never opens directly into deep water.
    for(const x of [h.x-2,h.x+2]){block(x,h.y+.65,g.z+.9,.07,.65,1.6);mesh(root,new T.BoxGeometry(.08,.08,3.2),green,x,h.y+1.25,g.z+.9);}
    block(h.x,h.y+.65,g.z+2.5,2,.65,.07);mesh(root,new T.BoxGeometry(4,.08,.08),green,h.x,h.y+1.25,g.z+2.5);
    const glass=new T.MeshStandardMaterial({color:'#89cad2',transparent:true,opacity:tier==='basic'?.17:.07,roughness:.15,side:T.DoubleSide,depthWrite:false});
    for(const x of [h.x-h.rx,h.x+h.rx]){mesh(root,new T.BoxGeometry(.045,3.2,h.rz*2),glass,x,-1.1,h.z);block(x,.3,h.z,.08,2,h.rz);mesh(root,new T.BoxGeometry(.09,.09,h.rz*2),green,x,.52,h.z);}
    for(const z of [h.z-h.rz,h.z+h.rz]){mesh(root,new T.BoxGeometry(h.rx*2,3.2,.045),glass,h.x,-1.1,z);mesh(root,new T.BoxGeometry(h.rx*2,.09,.09),green,h.x,.52,z);}
    if(h.shore){
      const geo=new T.PlaneGeometry(h.rx*.82-.15,h.rz*2-.6,22,26).rotateX(-Math.PI/2);const pos=geo.attributes.position;const cx=h.x-h.rx*.59-.075;
      for(let i=0;i<pos.count;i++){const x=pos.getX(i)+cx,z=pos.getZ(i)+h.z;pos.setXYZ(i,x,seaBeachHeight(x,z,tier,h.extraArea)??-2,z);}geo.computeVertexNormals();mesh(root,geo,sand).name='sea-lion-sandy-shore';
      if(tier==='prime'||tier==='premium'){
        // The north end of the sand bank reaches the island's natural shoreline.
        mesh(root,new T.BoxGeometry(h.rx*.3,.45,Math.max(1,h.z-h.rz-63.5)),sand,h.x-h.rx*.81,.20,(63.5+h.z-h.rz)/2);
        for(let i=0;i<3;i++){const rock=mesh(root,new T.IcosahedronGeometry(1,2),material('#909d91'),h.x-h.rx*.81,.58,h.z+(i-1)*h.rz*.48);rock.scale.set(h.rx*.15,.55,h.rz*.19);rock.name=`sea-lion-sunning-rock-${i}`;}
      }
    }else mesh(root,new T.BoxGeometry(h.rx*2,.08,h.rz*2),sand,h.x,-2.5,h.z);
  }
  const gate=home==='birds'?addPetGate(root,physics,home,g.x,g.y,g.z-g.width/2,g.width,g.height,-Math.PI/2):addPetGate(root,physics,home,g.x-g.width/2,g.y,g.z,g.width,g.height,0);
  gate.collider.enabled=false;colliders.push(gate.collider);
  label(root,`${TIER_NAMES[tier].toUpperCase()} ${home==='birds'?'BIRD HOME':'SEA HOME'}`,`${TIER_CAPACITY[home][tier]+Math.floor(h.extraArea/AREA_PER_EXTRA_RESIDENT[home])} residents · ${Math.round(h.area)} m²`,h.x,home==='birds'?h.y+h.height+.8:4.7,h.z,Math.min(7,3.5+h.s*2));
  label(root,home==='birds'?'FEED & CARE':'SEA FAMILY & CARE','E at this sign',h.care.x,h.y+1.45,h.care.z,2.8);
  return {root,gate,colliders,layout:h,setEnabled(v:boolean){colliders.forEach(c=>c.enabled=v);root.visible=v;},dispose(){colliders.forEach(c=>physics.removeCollider(c));root.removeFromParent();root.traverse(o=>{if(o instanceof T.Mesh||o instanceof T.Sprite){if(o instanceof T.Mesh)o.geometry.dispose();for(const m of Array.isArray(o.material)?o.material:[o.material]){if('map' in m)(m.map as T.Texture|null)?.dispose();m.dispose();}}});}};
}
