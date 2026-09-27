import * as T from 'three';
import {random,noise} from './island-world';

// All vegetation carries UVs and rooted flex weights, including the shadow pass.
class PlantGeometry {
  positions:number[]=[]; colors:number[]=[]; uvs:number[]=[]; flex:number[]=[]; indices:number[]=[];
  vertex(p:T.Vector3,c:T.Color,u:number,v:number,weight:number,phase:number,amplitude:number){
    this.positions.push(p.x,p.y,p.z);this.colors.push(c.r,c.g,c.b);this.uvs.push(u,v);this.flex.push(weight,phase,amplitude);
  }
  finish(name:string){
    const g=new T.BufferGeometry();g.name=name;
    g.setAttribute('position',new T.Float32BufferAttribute(this.positions,3));g.setAttribute('color',new T.Float32BufferAttribute(this.colors,3));
    g.setAttribute('uv',new T.Float32BufferAttribute(this.uvs,2));g.setAttribute('aPlant',new T.Float32BufferAttribute(this.flex,3));
    g.setIndex(this.indices);g.computeVertexNormals();g.computeBoundingSphere();return g;
  }
}

export function crownGeometry(count=150,seed=45,twigScale=1){
  const r=random(seed),g=new PlantGeometry(),q=new T.Quaternion(),up=new T.Vector3(0,1,0);
  for(let i=0;i<count;i++){
    // Small leafy twigs rather than enormous individual leaves. Mixed branch
    // planes give a porous, three-dimensional canopy when seen from below too.
    const a=r()*Math.PI*2,v=r()*2-1,rad=.25+Math.cbrt(r())*.7,s=Math.sqrt(1-v*v);
    const center=new T.Vector3(Math.cos(a)*s*rad,v*rad*.72,Math.sin(a)*s*rad);
    const direction=new T.Vector3(Math.cos(a)*.6,.3+r()*.75,Math.sin(a)*.6).normalize();
    q.setFromUnitVectors(up,direction).multiply(new T.Quaternion().setFromAxisAngle(up,r()*Math.PI*2));
    const length=(.42+r()*.24)*twigScale,width=length*(.85+r()*.18),phase=r()*Math.PI*2;
    const tile=i%4,tx=tile%2,ty=Math.floor(tile/2),shade=.76+rad*.14+r()*.14,k=g.positions.length/3;
    const color=new T.Color(shade,shade,shade);
    for(let y=0;y<3;y++)for(let x=0;x<3;x++){
      const u=x/2,t=y/2;
      const point=new T.Vector3((u-.5)*width,(t-.5)*length,Math.sin(t*Math.PI)*length*.09+(u-.5)**2*width*.18).applyQuaternion(q).add(center);
      g.vertex(point,color,(tx+.006+u*.988)*.5,(ty+.006+t*.988)*.5,t*t,phase,.018);
    }
    for(let y=0;y<2;y++)for(let x=0;x<2;x++){const j=k+y*3+x;g.indices.push(j,j+1,j+3,j+1,j+4,j+3);}
  }
  return g.finish('fine-leafy-twig-canopy');
}

export function palmFrondGeometry(){
  const r=random(736),g=new PlantGeometry();
  for(let i=1;i<43;i++)for(const side of [-1,1]){
    const t=(i+(side===1?.25:0))/44,x=t*4.2,y=Math.sin(t*Math.PI)*1.05-t*1.1;
    const length=Math.sin(Math.PI*t)**.55*(.95-.24*t)*(.9+r()*.18),width=.018+r()*.014,k=g.positions.length/3,phase=r()*6.28;
    const color=new T.Color().setHSL(.225+r()*.025,.32+r()*.12,.29+r()*.10,T.SRGBColorSpace);
    // Narrow, folded pinnae droop from the rachis instead of looking like paper spikes.
    for(let j=0;j<6;j++){
      const v=j/6,half=width*(1-v)**.65;
      for(const edge of [-1,0,1])g.vertex(new T.Vector3(x-v*length*.34+edge*half,y-v*v*length*.34+(edge===0?.012*Math.sin(v*Math.PI):0),side*(.012+v*length)),color,(edge+1)/2,v,v*v,phase,.035+t*.035);
    }
    const tip=g.positions.length/3;g.vertex(new T.Vector3(x-length*.34,y-length*.34,side*(.012+length)),color,.5,1,1,phase,.035+t*.035);
    for(let j=0;j<5;j++)for(let col=0;col<2;col++){const a=k+j*3+col;g.indices.push(a,a+3,a+1,a+1,a+3,a+4);}
    g.indices.push(k+15,k+16,tip,k+16,k+17,tip);
  }
  return g.finish('curved-palm-pinnae');
}

export function grassClumpGeometry(seed=412){
  const r=random(seed),g=new PlantGeometry();
  for(let b=0;b<22;b++){
    const angle=r()*Math.PI*2,rootAngle=r()*Math.PI*2,spread=Math.sqrt(r())*.3;
    const rootX=Math.cos(rootAngle)*spread,rootZ=Math.sin(rootAngle)*spread;
    const width=.003+r()*.004,height=.09+r()**1.5*.26,lean=height*(.3+r()*.75),k=g.positions.length/3,phase=r()*6.28;
    const dry=r()<.12,color=new T.Color().setHSL(dry?.13:.20+r()*.045,dry?.25:.30+r()*.18,.28+r()*.13,T.SRGBColorSpace);
    const cx=Math.cos(angle),cz=Math.sin(angle);
    for(let j=0;j<6;j++){
      const t=j/6,bend=lean*t*t,half=width*(1-t)**.72,shade=.56+t*.44;
      for(const side of [-1,1])g.vertex(new T.Vector3(rootX+cx*bend-cz*side*half,height*(t-.16*t*t*t),rootZ+cz*bend+cx*side*half),color.clone().multiplyScalar(shade),(side+1)/2,t,t*t,phase,height*.12);
    }
    const tip=g.positions.length/3;g.vertex(new T.Vector3(rootX+cx*lean,height*.84,rootZ+cz*lean),color,.5,1,1,phase,height*.12);
    for(let j=0;j<5;j++){const a=k+j*2;g.indices.push(a,a+1,a+2,a+1,a+3,a+2);}
    g.indices.push(k+10,k+11,tip);
  }
  return g.finish('fine-curved-grass');
}

export function weatheredRockGeometry(){
  const g=new T.SphereGeometry(1,20,14),p=g.attributes.position;
  for(let i=0;i<p.count;i++){const x=p.getX(i),y=p.getY(i),z=p.getZ(i),r=1+noise(x*2.8+z*.8,y*3.2)*.2+noise(z*6.1,x*5.3)*.055;p.setXYZ(i,x*r, y*r*(.94+.06*Math.sin(x*11)),z*r);}
  g.computeVertexNormals();return g;
}
