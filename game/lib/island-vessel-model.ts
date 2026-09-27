import * as T from 'three';
import {loadSailingHull,normalizeModel} from './island-models';
import {vesselLength,type VesselState} from './island-vessels';
import {material,mesh,beam} from './island-landscape';
import {createBoatCraft,craftDimensions,isCraftBoat} from './island-boat-craft';

export async function makeSailingBoat(id:string){
  const crafted=isCraftBoat(id),source=crafted?createBoatCraft(id):await loadSailingHull(id),size=new T.Box3().setFromObject(source).getSize(new T.Vector3());
  if(size.x>size.z)source.rotation.y=Math.PI/2;
  const hull=crafted?source:normalizeModel(source),length=vesselLength(id),bounds=new T.Box3().setFromObject(hull).getSize(new T.Vector3()),factor=crafted?1:length/bounds.z;
  // Align the narrower bow with local -Z (the direction of forward travel).
  const ends=[{min:Infinity,max:-Infinity},{min:Infinity,max:-Infinity}];
  hull.traverse(o=>{if(o instanceof T.Mesh){const p=o.geometry.getAttribute('position');for(let i=0;i<p.count;i++){const z=p.getZ(i);if(Math.abs(z)<bounds.z*.32)continue;const e=ends[z<0?0:1];e.min=Math.min(e.min,p.getX(i));e.max=Math.max(e.max,p.getX(i));}}});
  // Only unpowered legacy hulls use shape inference. An outboard is narrow but
  // it is the stern, never the bow. New powered craft have explicit -Z bows.
  if(!crafted&&ends[1].max-ends[1].min<(ends[0].max-ends[0].min)*.85)hull.rotation.y=Math.PI;
  const root=new T.Group();root.name='player-sailing-'+id;root.add(hull);hull.scale.setScalar(factor);
  const draft=crafted?craftDimensions(id).draft:id.startsWith('kayak')?.18:.35;hull.position.y=-draft;
  const width=bounds.x*factor,height=bounds.y*factor,seat=crafted?craftDimensions(id).seat:Math.max(.18,Math.min(1.15,height*.58-draft));
  // A dry sole prevents water from showing through open legacy OBJ hulls.
  if(id==='rowboat') {const sole=mesh(root,new T.CylinderGeometry(1,1,.08,16),material('#9d713f'),0,.04,0);sole.scale.set(width*.32,1,length*.34);}
  const oars:T.Group[]=[],wood=material('#ba9359'),blade=material('#dbc190');
  if(['raft','rowboat','wood-boat-v2'].includes(id)||id.startsWith('kayak')){
    if(id.startsWith('kayak')){
      const paddle=new T.Group();paddle.position.set(0,seat+.6,0);root.add(paddle);oars.push(paddle);
      beam(paddle,new T.Vector3(-1.35,0,0),new T.Vector3(1.35,0,0),.035,wood);
      for(const side of [-1,1]){const m=mesh(paddle,new T.BoxGeometry(.6,.05,.2),blade,side*1.25,0,0);m.rotation.y=side*.12;}
    }else for(const side of [-1,1]){
      const oar=new T.Group();oar.position.set(side*width*.39,seat+.25,.4);root.add(oar);oars.push(oar);
      beam(oar,new T.Vector3(-side*.55,0,0),new T.Vector3(side*1.8,-.25,0),.038,wood);
      mesh(oar,new T.BoxGeometry(.62,.055,.23),blade,side*1.65,-.23,0);
    }
  }
  const wakeMat=new T.MeshBasicMaterial({color:'#d9fff0',transparent:true,opacity:0,depthWrite:false,side:T.DoubleSide});
  const wake=mesh(root,new T.PlaneGeometry(width*1.1,length*1.1),wakeMat,0,.03,length*.9);wake.rotation.x=-Math.PI/2;wake.castShadow=false;wake.renderOrder=4;
  // Procedural foam dots are a wake effect, not fish or replacement boat models.
  const textureCanvas=document.createElement('canvas');textureCanvas.width=64;textureCanvas.height=128;const ctx=textureCanvas.getContext('2d')!;ctx.clearRect(0,0,64,128);
  for(let i=0;i<80;i++){const y=i*37%128,x=32+Math.sin(i*5.7)*(6+y*.18);ctx.fillStyle=`rgba(240,255,247,${.8-y/180})`;ctx.beginPath();ctx.ellipse(x,y,1.5+y*.015,2,0,0,Math.PI*2);ctx.fill();}
  wakeMat.map=new T.CanvasTexture(textureCanvas);
  const propellers:T.Object3D[]=[];hull.traverse(o=>{if(o.name==='propeller')propellers.push(o);});
  return {root,width,length,draft,seat,update(s:VesselState,time:number){
    root.position.set(s.x,s.y,s.z);root.rotation.set(s.pitch+(crafted?Math.min(.055,Math.abs(s.speed)*.003):0),s.yaw,s.roll,'YXZ');
    propellers.forEach(p=>{p.rotation.z=time*(3+Math.abs(s.speed)*5);});
    const effort=Math.min(1,Math.abs(s.speed)/5);
    for(let i=0;i<oars.length;i++){const oar=oars[i];oar.rotation.y=Math.sin(time*4)*.48*effort;oar.rotation.z=(oars.length===1?Math.sin(time*4)*.45:(i===0?-1:1)*(.08+Math.cos(time*4)*.18))*effort;}
    wake.visible=Math.abs(s.speed)>1;wakeMat.opacity=Math.min(.58,Math.abs(s.speed)*.035);wake.scale.x=1+Math.sin(time*5)*.07;wake.scale.y=1+Math.abs(s.speed)*.06;
  }};
}
