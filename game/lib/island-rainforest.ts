import * as T from 'three';
import {naturalTerrain,naturalSurface,foliageMaterial,foliageShadow} from './island-natural-materials';
import {crownGeometry,palmFrondGeometry} from './island-natural-geometry';
import {RAINFOREST,RAINFOREST_BEACH,rainforestGround,rainforestTerrain} from './island-rainforest-layout';
import {random,smooth} from './island-world';
import {material,mesh} from './island-landscape';
import type {Collider} from './island-physics';
import {createBirdWings} from './island-bird-wings';

export function buildRainforest(scene:T.Scene,lowPower:boolean){
  const root=new T.Group();root.name='rainwild-island';scene.add(root);
  const rng=random(931275),colliders:Collider[]=[],trees:{x:number;z:number;y:number;h:number;r:number;angle:number}[]=[],perches:T.Vector3[]=[];
  const geo=new T.PlaneGeometry(500,500,250,250).rotateX(-Math.PI/2).translate(RAINFOREST.x,0,RAINFOREST.z),p=geo.getAttribute('position'),colors:number[]=[],c=new T.Color();
  for(let i=0;i<p.count;i++){
    const x=p.getX(i),z=p.getZ(i),h=rainforestGround(x,z),slope=Math.hypot(rainforestGround(x+1,z)-rainforestGround(x-1,z),rainforestGround(x,z+1)-rainforestGround(x,z-1))/2;
    p.setY(i,h);c.set('#dacb98').lerp(new T.Color('#398147'),smooth(1.8,7,h)).lerp(new T.Color('#345d3c'),smooth(8,30,h));
    c.lerp(new T.Color('#758c82'),smooth(.9,1.6,slope));if(h<0)c.lerp(new T.Color('#779f8d'),smooth(0,9,-h));c.toArray(colors,i*3);
  }
  geo.setAttribute('color',new T.Float32BufferAttribute(colors,3));geo.computeVertexNormals();const ground=mesh(root,geo,naturalTerrain());ground.castShadow=false;
  const slope=(x:number,z:number)=>Math.hypot(rainforestTerrain(x+1,z)-rainforestTerrain(x-1,z),rainforestTerrain(x,z+1)-rainforestTerrain(x,z-1))/2;
  for(let attempt=0;attempt<18000&&trees.length<(lowPower?360:720);attempt++){
    const x=RAINFOREST.x+(rng()-.5)*355,z=RAINFOREST.z+(rng()-.5)*320,y=rainforestTerrain(x,z);
    if(y<4.8||slope(x,z)>.85||Math.hypot(x-RAINFOREST_BEACH.x,z-RAINFOREST_BEACH.z)<15||trees.some(t=>Math.hypot(t.x-x,t.z-z)<6.5))continue;
    trees.push({x,z,y,h:12+rng()*15,r:3.5+rng()*2.6,angle:rng()*Math.PI*2});
  }
  const trunks=new T.InstancedMesh(new T.CylinderGeometry(.35,.65,1,12,4),naturalSurface('bark',3),trees.length);
  const branches=new T.InstancedMesh(new T.CylinderGeometry(.12,.3,1,9),naturalSurface('bark',2),trees.length*3);
  const crowns=new T.InstancedMesh(crownGeometry(lowPower?110:165,882,.72),foliageMaterial(),trees.length*4);
  const buttresses=new T.InstancedMesh(new T.ConeGeometry(1,1,3),naturalSurface('bark',2),trees.length*3);
  const dummy=new T.Object3D(),up=new T.Vector3(0,1,0);
  const matrix=(target:T.InstancedMesh,i:number,pos:T.Vector3,scale:T.Vector3)=>{dummy.position.copy(pos);dummy.scale.copy(scale);dummy.updateMatrix();target.setMatrixAt(i,dummy.matrix);};
  trees.forEach((t,i)=>{
    dummy.quaternion.identity();matrix(trunks,i,new T.Vector3(t.x,t.y+t.h*.5,t.z),new T.Vector3(1,t.h,1));
    colliders.push({kind:'tree',x:t.x,z:t.z,y:t.y+t.h*.5,rx:.67,rz:.67,ry:t.h*.5});
    for(let j=0;j<3;j++){
      const a=t.angle+j*Math.PI*2/3,start=new T.Vector3(t.x,t.y+t.h*.53,t.z),end=new T.Vector3(t.x+Math.cos(a)*t.r,t.y+t.h*(.68+j*.055),t.z+Math.sin(a)*t.r);
      const delta=end.clone().sub(start);dummy.quaternion.setFromUnitVectors(up,delta.clone().normalize());matrix(branches,i*3+j,start.add(end).multiplyScalar(.5),new T.Vector3(1,delta.length(),1));
      perches.push(end.clone().add(new T.Vector3(0,.14,0)));
      dummy.rotation.set(0,a,0);matrix(buttresses,i*3+j,new T.Vector3(t.x+Math.cos(a)*.48,t.y+1.1,t.z+Math.sin(a)*.48),new T.Vector3(1.15,2.5,.6));
    }
    for(let j=0;j<4;j++){
      const a=t.angle+j*2.1,r=j===3?0:t.r*.55;
      dummy.rotation.set(0,a,0);matrix(crowns,i*4+j,new T.Vector3(t.x+Math.cos(a)*r,t.y+t.h*(j===3?1:.84),t.z+Math.sin(a)*r),new T.Vector3(t.r,t.r*.55,t.r*.85));
      crowns.setColorAt(i*4+j,new T.Color().setScalar(.85+rng()*.25));
    }
  });
  foliageShadow(crowns);
  for(const m of [trunks,branches,crowns,buttresses]){m.castShadow=true;m.receiveShadow=true;m.computeBoundingSphere();root.add(m);}
  // Fern fans and hanging lianas form a distinct understory below the high canopy.
  const fernGeo=new T.BufferGeometry(),verts:number[]=[],indices:number[]=[];
  for(let j=0;j<7;j++){const a=j/7*Math.PI*2,k=verts.length/3;verts.push(0,0,0,Math.cos(a+.22)*.65,.4,Math.sin(a+.22)*.65,Math.cos(a)*1.1,.5,Math.sin(a)*1.1,Math.cos(a-.22)*.65,.4,Math.sin(a-.22)*.65);indices.push(k,k+1,k+2,k,k+2,k+3);}
  fernGeo.setAttribute('position',new T.Float32BufferAttribute(verts,3));fernGeo.setIndex(indices);fernGeo.computeVertexNormals();
  const fernMat=foliageMaterial('palm');const fernLeaves=palmFrondGeometry();fernLeaves.scale(.35,.5,.65);const ferns=new T.InstancedMesh(fernLeaves,fernMat,trees.length*4);fernGeo.dispose();
  const vines=new T.InstancedMesh(new T.CylinderGeometry(.035,.05,1,4),naturalSurface('bark',2,'#869173'),trees.length);
  trees.forEach((t,i)=>{
    for(let j=0;j<4;j++){const a=rng()*Math.PI*2,x=t.x+Math.cos(a)*2.8,z=t.z+Math.sin(a)*2.8;dummy.rotation.set(0,a,0);matrix(ferns,i*4+j,new T.Vector3(x,rainforestTerrain(x,z),z),new T.Vector3(1.2,1.2,1.2));}
    dummy.rotation.set(0,0,.045);matrix(vines,i,new T.Vector3(t.x+2,t.y+t.h*.59,t.z+.5),new T.Vector3(1,t.h*.55,1));
  });root.add(ferns,vines);ferns.receiveShadow=true;
  const birds=Array.from({length:lowPower?12:24},(_,i)=>{
    const bird=new T.Group(),parakeet=i%3!==0;bird.name=parakeet?'wild-canopy-parakeet':'wild-toucan';root.add(bird);
    const coat=material(parakeet?'#41b77b':'#25364a'),breast=material(parakeet?'#b4db53':'#f7db89');
    const body=mesh(bird,new T.SphereGeometry(.19,10,8),coat,0,.19,0);body.scale.set(1,1.1,1.7);
    mesh(bird,new T.SphereGeometry(.145,10,8),breast,0,.32,-.22);
    const beak=mesh(bird,new T.ConeGeometry(parakeet?.055:.09,parakeet?.15:.34,7),material('#efa14b'),0,.3,parakeet?-.36:-.47);beak.rotation.x=-Math.PI/2;
    for(const side of [-1,1]){mesh(bird,new T.SphereGeometry(.021,7,5),material('#101d20'),side*.12,.36,-.26);mesh(bird,new T.CylinderGeometry(.017,.017,.12,5),material('#6c6151'),side*.07,.055,.04);}
    const tail=mesh(bird,new T.ConeGeometry(.12,.55,4),coat,0,.1,.43);tail.rotation.x=Math.PI/2;
    const wings=createBirdWings(parakeet?'wild-parakeet':'wild-toucan',new T.Vector3(.36,.5,.7),.22);bird.add(wings.root);bird.scale.setScalar(parakeet?1.5:1.8);
    const perch=perches[Math.floor(rng()*perches.length)].clone();bird.position.copy(perch);
    return {bird,wings,from:perch,to:perch.clone(),curve:null as T.CatmullRomCurve3|null,age:rng()*4,duration:3+rng()*6,rest:true,phase:rng()*6,previous:perch.clone()};
  });
  function pickFlight(b:typeof birds[number]){
    const candidates=perches.filter(p=>p.distanceTo(b.from)>16&&p.distanceTo(b.from)<65);if(!candidates.length)return;
    b.to.copy(candidates[Math.floor(rng()*candidates.length)]);
    const middle=b.from.clone().lerp(b.to,.5);middle.y=Math.max(middle.y+5,rainforestTerrain(middle.x,middle.z)+12);
    const d=b.to.clone().sub(b.from);middle.x+=-d.z*.15;middle.z+=d.x*.15;
    b.curve=new T.CatmullRomCurve3([b.from,b.from.clone().lerp(middle,.45).add(new T.Vector3(0,2,0)),middle,b.to.clone().lerp(middle,.3),b.to]);
    // Reject routes through a trunk or terrain; choose another branch next time.
    for(let j=1;j<24;j++){const p=b.curve.getPoint(j/24);if(p.y<rainforestTerrain(p.x,p.z)+2||trees.some(t=>p.y<t.y+t.h*.82&&Math.hypot(p.x-t.x,p.z-t.z)<1.2)){b.curve=null;return;}}
    b.duration=b.curve.getLength()/(4.5+rng()*2);b.age=0;b.rest=false;
  }
  return {root,colliders,trees,perches,birds,update(time:number,dt:number){
    for(const b of birds){
      b.age+=dt;let spread=0,flap=0;
      if(b.rest){if(b.age>b.duration){b.from.copy(b.bird.position);pickFlight(b);if(b.rest){b.age=0;b.duration=.6;}}b.bird.rotation.z=Math.sin(time*1.7+b.phase)*.025;}
      else if(b.curve){
        const u=Math.min(1,b.age/b.duration);b.previous.copy(b.bird.position);b.bird.position.copy(b.curve.getPoint(u));
        const v=b.bird.position.clone().sub(b.previous);if(v.lengthSq()>.000001){b.bird.rotation.y=Math.atan2(-v.x,-v.z);b.bird.rotation.x=-Math.atan2(v.y,Math.hypot(v.x,v.z))*.6;b.bird.rotation.z=Math.sin(u*Math.PI*2)*.16;}
        spread=Math.min(1,u*12,(1-u)*12+.02);flap=u>.25&&u<.55?.08:Math.sin(time*15+b.phase)*.8;
        if(u===1){b.rest=true;b.age=0;b.duration=2+rng()*6;b.bird.rotation.x=0;}
      }
      b.wings.animate({gait:0,stride:0,peck:0,preen:0,look:0,flap,swim:0,turn:0,breath:0,flight:spread});
    }
  },dispose(){birds.forEach(b=>b.wings.dispose());}};
}
