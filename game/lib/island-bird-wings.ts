import * as T from 'three';
import type { PetPose } from './island-pet-animation';

const colours:Record<string,[string,string]>={
  'wild-parakeet':['#45bf79','#236bb1'],'wild-toucan':['#27384b','#f2d985'],
  'pet-white-pelican':['#eceae2','#343a40'],'pet-brown-pelican':['#817b6d','#454542'],
  'pet-heron':['#8b9ca9','#4b5963'],'pet-great-egret':['#f2f1e7','#d5d9d5'],
  'pet-snowy-egret':['#f4f1e6','#d7dcdb'],'pet-osprey':['#6d6050','#332f2c'],
  'pet-white-stork':['#eeeeeb','#292e34'],
};

// A tapered, solid feather, rather than a rectangular plane. The two ridges
// give the low-poly surface volume and a distinct trailing feather silhouette.
function feather(length:number,width:number){
  const points=[0,0,0, length*.25,.025,width*.46, length*.88,0,width*.3, length,0,0, length*.84,0,-width*.36, length*.2,0,-width*.46, length*.44,-.025,0];
  const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.Float32BufferAttribute(points,3));
  geometry.setIndex([0,1,2,0,2,3,0,3,4,0,4,5,0,6,1,1,6,2,2,6,3,3,6,4,4,6,5,5,6,0]);geometry.computeVertexNormals();return geometry;
}

// Keep the actual flight-model triangles, UVs and original materials for the
// seagull's wings. Its walking model supplies one continuous body and identity.
function suppliedWing(source:T.Group,side:number,outer:boolean){
  const group=new T.Group();group.name='supplied-seagull-flight-wing';
  source.traverse(o=>{if(!(o instanceof T.Mesh))return;
    const g=(o.geometry.index?o.geometry.toNonIndexed():o.geometry.clone()).rotateY(-Math.PI/2),p=g.getAttribute('position');
    const names=Object.keys(g.attributes),data:Record<string,number[]>={};names.forEach(n=>data[n]=[]);
    const groups=g.groups.length?g.groups:[{start:0,count:p.count,materialIndex:0}],result=new T.BufferGeometry();
    for(const part of groups){const start=data.position.length/3;
      for(let i=part.start;i<part.start+part.count;i+=3){
        const x=side*(p.getX(i)+p.getX(i+1)+p.getX(i+2))/3;
        if(x<.15||(outer?x<.33:x>=.33))continue;
        for(let j=i;j<i+3;j++)for(const n of names){const a=g.getAttribute(n);for(let k=0;k<a.itemSize;k++)data[n].push(a.array[j*a.itemSize+k]);}
      }
      result.addGroup(start,data.position.length/3-start,part.materialIndex);
    }
    if(data.position.length){
      for(const n of names)result.setAttribute(n,new T.Float32BufferAttribute(data[n],g.getAttribute(n).itemSize));
      result.translate(-side*.15,-.225,0).scale(2.05,2.05,2.05);
      if(outer)result.translate(-side*.37,0,0);
      const mesh=new T.Mesh(result,o.material);mesh.castShadow=true;mesh.name='original-flight-feathers';group.add(mesh);
    }
    g.dispose();
  });return group;
}

export function createBirdWings(id:string,size:T.Vector3,shoulderY:number,flightSource?:T.Group){
  const root=new T.Group();root.name='unfolding-flight-wings';
  const pair:{shoulder:T.Group;elbow:T.Group;side:number}[]=[];
  const [base,tip]=colours[id]??['#e7e8e5','#51575d'];
  const materials=[base,tip].map(color=>new T.MeshStandardMaterial({color,roughness:.82,side:T.DoubleSide}));
  for(const side of [-1,1]){
    const shoulder=new T.Group(),elbow=new T.Group();shoulder.name=side<0?'flight-shoulder-left':'flight-shoulder-right';elbow.name='flight-elbow';
    shoulder.position.set(side*size.x*.29,shoulderY,0);elbow.position.set(side*.37,0,0);root.add(shoulder);shoulder.add(elbow);pair.push({shoulder,elbow,side});
    if(flightSource){shoulder.add(suppliedWing(flightSource,side,false));elbow.add(suppliedWing(flightSource,side,true));}
    else{
      const primary=id.includes('pelican')?.58:id==='pet-osprey'?.55:.48;
      const covert=new T.Mesh(feather(.49,.4),materials[0]);covert.scale.x=side;covert.rotation.y=side*.15;shoulder.add(covert);
      for(let i=0;i<7;i++){
        const f=new T.Mesh(feather(.31+i*.014,.11),materials[0]);f.position.set(side*(.08+i*.044),-.012,-.04);f.rotation.y=side*(1.13+i*.025);f.scale.x=side;shoulder.add(f);
      }
      for(let i=0;i<8;i++){
        const f=new T.Mesh(feather(primary-i*.023,.125),materials[i>2?1:0]);f.position.set(side*i*.032,-i*.002,0);f.rotation.y=side*(.12+i*.115);f.scale.x=side;elbow.add(f);
      }
    }
    shoulder.traverse(o=>{if(o instanceof T.Mesh){o.castShadow=true;o.receiveShadow=true;}});
  }
  return {root,animate(pose:PetPose){
    const spread=pose.flight??0;root.visible=spread>.015;
    for(const {shoulder,elbow,side} of pair){
      // Fold backwards against the body on landing, then open the elbow before
      // full wingbeats. Gliding holds an extended, slightly raised wing.
      shoulder.scale.setScalar(.18+.82*spread);
      shoulder.rotation.set((pose.landing??0)*.2,side*(1-spread)*1.15,side*((pose.flap*.7-(flightSource?.42:0))*spread+(1-spread)*-.65));
      elbow.rotation.set(0,side*((1-spread)*1.05+Math.max(0,pose.flap)*.22),side*pose.flap*spread*.18);
    }
  },dispose(){root.traverse(o=>{if(o instanceof T.Mesh)o.geometry.dispose();});materials.forEach(m=>m.dispose());}};
}
