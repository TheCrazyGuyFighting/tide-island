import * as T from 'three';
import {DISTANT_ISLANDS,distantGround,distantTerrain,distantLanding} from './island-destinations';
import {naturalTerrain,naturalSurface,foliageMaterial,foliageShadow} from './island-natural-materials';
import {palmFrondGeometry,weatheredRockGeometry} from './island-natural-geometry';
import {mesh,material} from './island-landscape';
import {random,smooth} from './island-world';
import type {Collider} from './island-physics';

export function buildDistantIslands(scene:T.Scene,lowPower:boolean){
  const colliders:Collider[]=[],roots:T.Group[]=[];
  for(const island of DISTANT_ISLANDS){
    const root=new T.Group();root.name=`distant-island-${island.id}`;scene.add(root);roots.push(root);
    const rng=random(island.x*17+island.z*3),size=island.extent*2;
    const geometry=new T.PlaneGeometry(size,size,size/island.step,size/island.step).rotateX(-Math.PI/2).translate(island.x,0,island.z);
    const positions=geometry.attributes.position,colors=new Float32Array(positions.count*3),color=new T.Color();
    const sand=new T.Color(island.biome==='volcanic'?'#6c6861':'#e8ddbe');
    const land=new T.Color(island.biome==='volcanic'?'#535958':island.biome==='alpine'?'#879b97':'#578e5c');
    const snow=new T.Color('#e4eef1');
    for(let i=0;i<positions.count;i++){
      const x=positions.getX(i),z=positions.getZ(i),height=distantGround(island,x,z);
      positions.setY(i,height);color.copy(sand).lerp(land,smooth(2,9,height));
      if(island.biome==='alpine')color.lerp(snow,smooth(7,22,height));
      color.multiplyScalar(.94+.045*Math.sin(x*.13)*Math.cos(z*.19));color.toArray(colors,i*3);
    }
    geometry.setAttribute('color',new T.BufferAttribute(colors,3));geometry.computeVertexNormals();mesh(root,geometry,naturalTerrain(island.biome)).castShadow=false;
    const landing=distantLanding(island,true),points:{x:number;y:number;z:number;scale:number;angle:number}[]=[];
    const wanted=island.biome==='volcanic'?(lowPower?32:55):(lowPower?45:80);
    for(let tries=0;tries<5000&&points.length<wanted;tries++){
      const x=island.x+(rng()-.5)*island.rx*1.8,z=island.z+(rng()-.5)*island.rz*1.8,y=distantTerrain(island,x,z);
      const slope=Math.hypot(distantTerrain(island,x+1,z)-distantTerrain(island,x-1,z),distantTerrain(island,x,z+1)-distantTerrain(island,x,z-1))/2;
      if(y<4.4||slope>.65||Math.hypot(x-landing.x,z-landing.z)<22||points.some(p=>Math.hypot(p.x-x,p.z-z)<7))continue;
      points.push({x,y,z,scale:.8+rng()*.65,angle:rng()*Math.PI*2});
    }
    const dummy=new T.Object3D();
    if(island.biome==='volcanic'){
      const rocks=new T.InstancedMesh(weatheredRockGeometry(),naturalSurface('rock',1,'#636665'),points.length);
      points.forEach((p,index)=>{dummy.position.set(p.x,p.y+.8*p.scale,p.z);dummy.rotation.set(.2,p.angle,.13);dummy.scale.set(p.scale*2.6,p.scale*1.7,p.scale*2.2);dummy.updateMatrix();rocks.setMatrixAt(index,dummy.matrix);colliders.push({kind:'rock',x:p.x,y:p.y+1.1*p.scale,z:p.z,rx:p.scale*2.3,ry:p.scale*1.5,rz:p.scale*2});});
      rocks.castShadow=true;rocks.receiveShadow=true;root.add(rocks);
    }else{
      const palm=island.biome==='tropical';
      const trunks=new T.InstancedMesh(new T.CylinderGeometry(.17,.32,1,8),naturalSurface('bark',2),points.length);
      const crowns=new T.InstancedMesh(palm?palmFrondGeometry():new T.ConeGeometry(2.3,4.5,9),palm?foliageMaterial('palm'):material('#42675b'),points.length*(palm?7:3));
      if(palm)foliageShadow(crowns);
      points.forEach((p,index)=>{
        const height=p.scale*(palm?6:8);dummy.position.set(p.x,p.y+height/2,p.z);dummy.rotation.set(0,p.angle,0);dummy.scale.set(p.scale,height,p.scale);dummy.updateMatrix();trunks.setMatrixAt(index,dummy.matrix);
        colliders.push({kind:'tree',x:p.x,y:p.y+height/2,z:p.z,rx:.35*p.scale,ry:height/2,rz:.35*p.scale});
        const layers=palm?7:3;
        for(let j=0;j<layers;j++){
          dummy.position.set(p.x,p.y+height-(palm?0:j*1.9*p.scale),p.z);dummy.rotation.set(palm?-.1:0,p.angle+j*Math.PI*2/7,0);
          dummy.scale.setScalar(p.scale*(palm?1:1-j*.14));dummy.updateMatrix();crowns.setMatrixAt(index*layers+j,dummy.matrix);
          if(!palm)crowns.setColorAt(index*layers+j,new T.Color(j===0?'#dce8e6':'#8ea79e'));
        }
      });
      for(const object of [trunks,crowns]){object.castShadow=true;object.receiveShadow=true;object.computeBoundingSphere();root.add(object);}
    }
  }
  return {colliders,roots};
}
