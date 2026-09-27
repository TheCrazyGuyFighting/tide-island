import * as T from 'three';
import {RoundedBoxGeometry} from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';

export const POWERED_BOATS=['boat','fisher-boat','scout-boat','speed-boat','jetski-v1'] as const;
export function isCraftBoat(id:string){return (POWERED_BOATS as readonly string[]).includes(id)||id==='delivery';}
export function craftDimensions(id:string){
  const length=id==='delivery'?16:id==='boat'?8.8:id==='fisher-boat'?5.8:id==='jetski-v1'?3.5:6.5;
  return {length,width:id==='delivery'?4.7:id==='boat'?2.85:id==='jetski-v1'?1.25:2.25,draft:id==='delivery'?.8:.38,seat:id==='delivery'?1.7:id==='boat'?.82:.6};
}
const mat=(color:string,roughness=.55,metalness=.05)=>new T.MeshStandardMaterial({color,roughness,metalness});
function add(root:T.Object3D,g:T.BufferGeometry,m:T.Material,x=0,y=0,z=0){const o=new T.Mesh(g,m);o.position.set(x,y,z);o.castShadow=o.receiveShadow=true;root.add(o);return o;}
function box(root:T.Object3D,m:T.Material,x:number,y:number,z:number,w:number,h:number,d:number){return add(root,new T.BoxGeometry(w,h,d),m,x,y,z);}
function tube(root:T.Object3D,points:T.Vector3[],radius:number,m:T.Material){return add(root,new T.TubeGeometry(new T.CatmullRomCurve3(points),Math.max(12,points.length*5),radius,7,false),m);}
function oval(root:T.Object3D,m:T.Material,x:number,y:number,z:number,w:number,h:number,d:number){const o=add(root,new T.SphereGeometry(1,24,16),m,x,y,z);o.scale.set(w,h,d);return o;}

/** Original metre-scale marine models. Every engine is aft, every bow is -Z. */
export function createBoatCraft(id:string){
  const root=new T.Group();root.name='marine-craft-'+id;
  const {length:L,width:W,draft,seat}=craftDimensions(id),cargo=id==='delivery',coastal=id==='boat',jet=id==='jetski-v1';
  const hullMat=mat(cargo?'#28434c':id==='fisher-boat'?'#64634b':id==='scout-boat'?'#596156':jet?'#2b3942':'#cbd1cd',.43,.42);
  const inner=mat('#69716d',.78,.1),rubber=mat('#20292b',.83),steel=mat('#c2cbcc',.27,.86),deck=mat('#8e9186',.9),trim=mat('#e0ded1',.6),seatMat=mat('#5b655d',.86);
  const top=cargo?1.85:jet?.58:1.03;
  const widthAt=(t:number)=>W*.5*(t<.6?.77+.23*Math.sin(t/.6*Math.PI*.5):Math.max(.012,Math.pow((1-t)/.4,.65)));
  const rimAt=(t:number)=>top+(t>.66?Math.pow((t-.66)/.34,2)*(cargo?.55:.28):0);
  const positions:number[]=[],indices:number[]=[],N=56,C=24;
  for(let i=0;i<=N;i++){
    const t=i/N,z=L*(.44-.94*t),w=widthAt(t),rim=rimAt(t);
    for(let j=0;j<=C;j++){const a=j/C*Math.PI,keel=.045+Math.pow(t,9)*top*.35;positions.push(Math.cos(a)*w,rim-Math.pow(Math.sin(a),.72)*(rim-keel),z+Math.pow(t,7)*Math.sin(a)*L*.08);}
  }
  for(let i=0;i<N;i++)for(let j=0;j<C;j++){const a=i*(C+1)+j,b=a+C+1;indices.push(a,b,a+1,a+1,b,b+1);}
  const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(positions,3));g.setIndex(indices);g.computeVertexNormals();
  hullMat.side=T.DoubleSide;add(root,g,hullMat).name='formed-v-hull';
  box(root,hullMat,0,top*.57,L*.435,W*.77,top*.82,.075).name='transom-stern';
  box(root,deck,0,top*.69,L*.04,W*.73,.10,L*.63).name='non-slip-cockpit';
  // Curved gunwales, rubbing strakes, interior liners and raised foredeck.
  for(const side of [-1,1]){
    const rim:T.Vector3[]=[],rail:T.Vector3[]=[];
    for(let i=0;i<=32;i++){const t=i/32;rim.push(new T.Vector3(side*widthAt(t),rimAt(t),L*(.44-.94*t)));if(t>.3&&t<.98)rail.push(new T.Vector3(side*widthAt(t)*.94,rimAt(t)+(cargo?.6:.32),L*(.44-.94*t)));}
    tube(root,rim,cargo?.085:.043,rubber);tube(root,rim.map(p=>p.clone().add(new T.Vector3(-side*.06,-.11,0))),.07,inner);
    if(!jet){tube(root,rail,cargo?.025:.018,steel);for(const t of [.38,.52,.7,.82]){const x=side*widthAt(t)*.94,z=L*(.44-.94*t);tube(root,[new T.Vector3(x,rimAt(t),z),new T.Vector3(x,rimAt(t)+(cargo?.6:.32),z)],.017,steel);}}
    for(const t of [.1,.55,.8]){const x=side*widthAt(t)*.92,z=L*(.44-.94*t);box(root,steel,x,rimAt(t)+.025,z,.15,.04,.07);}
  }
  const fore=new T.Shape();fore.moveTo(-widthAt(.7)*.85,L*(.44-.94*.7));for(let i=22;i<=32;i++){const t=i/32;fore.lineTo(-widthAt(t)*.87,L*(.44-.94*t));}for(let i=32;i>=22;i--){const t=i/32;fore.lineTo(widthAt(t)*.87,L*(.44-.94*t));}fore.closePath();
  add(root,new T.ShapeGeometry(fore,24).rotateX(Math.PI/2),deck,0,top+.10,0).material.side=T.DoubleSide;
  const engine=new T.Group();engine.name=jet?'stern-jet-drive':'outboard-engine';engine.position.set(0,cargo?.4:0,L*.48);root.add(engine);
  if(jet){box(engine,rubber,0,.22,0,.3,.2,.32);oval(root,hullMat,0,.57,-.32,.5,.32,.96);add(root,new RoundedBoxGeometry(.46,.23,1.34,4,.09),seatMat,0,.88,.29);for(const side of [-1,1])add(root,new RoundedBoxGeometry(.2,.055,1.27,3,.02),rubber,side*.39,.61,.37);tube(root,[new T.Vector3(-.32,1.1,-.42),new T.Vector3(0,1.03,-.42),new T.Vector3(.32,1.1,-.42)],.026,rubber);}
  else{
    const count=cargo||coastal?2:1;
    for(let i=0;i<count;i++){
      const x=count===2?(i-.5)*W*.32:0,s=cargo?1.35:1;
      add(engine,new RoundedBoxGeometry(.50*s,.78*s,.64*s,4,.095*s),rubber,x,top*.86,.1).name='engine-cowling';
      box(engine,steel,x,.42,.12,.1*s,.66,.12);box(engine,rubber,x,.08,.12,.07,.33,.2);
      const prop=new T.Group();prop.name='propeller';prop.position.set(x,.07,.27);engine.add(prop);
      add(prop,new T.CylinderGeometry(.055,.055,.14,12).rotateX(Math.PI/2),steel);
      for(let j=0;j<3;j++){const blade=new T.Group();blade.rotation.z=j*Math.PI*2/3;prop.add(blade);oval(blade,steel,.10,0,0,.13,.045,.026);}
      for(let j=0;j<4;j++)box(engine,inner,x,top*.84+j*.045,.405,.29*s,.012,.012);
    }
    // Upholstered seats, helm with wheel spokes, instruments, framed windscreen.
    const seats=cargo?[-.72,.72]:coastal?[-.6,.6]:[-.46,.46];
    const seatZ=cargo?-L*.24+1.0:.18;
    for(const x of seats){box(root,steel,x,top*.9,seatZ+.04,.075,.42,.075);const cushion=add(root,new RoundedBoxGeometry(.54,.16,.54,4,.065),seatMat,x,top*1.05,seatZ);cushion.name='helm-seat';const back=add(root,new RoundedBoxGeometry(.53,.43,.13,4,.06),seatMat,x,top*1.27,seatZ+.22);back.rotation.x=-.12;}
    const helmZ=cargo?-L*.24:-.55,helmY=cargo?2.1:1.1;
    box(root,inner,0,helmY-.12,helmZ,W*.58,.62,.52);
    const wheel=new T.Group();wheel.position.set(-W*.15,helmY+.22,helmZ+.32);wheel.rotation.x=.35;root.add(wheel);
    add(wheel,new T.TorusGeometry(.17,.018,8,32),rubber);for(let j=0;j<3;j++){const spoke=box(wheel,steel,0,.075,0,.018,.15,.018);spoke.rotation.z=j*Math.PI*2/3;}
    for(let i=0;i<3;i++){const dial=add(root,new T.CircleGeometry(.043,20),rubber,W*.02+i*.11,helmY+.2,helmZ+.267);dial.rotation.x=-.3;}
    const glass=new T.MeshPhysicalMaterial({color:'#a4c5cc',roughness:.08,metalness:.05,transparent:true,opacity:.34,depthWrite:false,side:T.DoubleSide});
    const pane=box(root,glass,0,helmY+.57,helmZ-.23,W*.69,.73,.022);pane.rotation.x=-.2;
    for(const x of [-W*.35,0,W*.35])tube(root,[new T.Vector3(x,helmY+.16,helmZ-.14),new T.Vector3(x,helmY+.92,helmZ-.29)],.018,steel);
    tube(root,[new T.Vector3(-W*.35,helmY+.92,helmZ-.29),new T.Vector3(W*.35,helmY+.92,helmZ-.29)],.022,steel);
    if(cargo||coastal||id==='scout-boat'){
      const roofY=cargo?3.5:2.35,roofZ=cargo?helmZ+.55:.2;
      for(const x of [-W*.33,W*.33])for(const z of [roofZ-.7,roofZ+.9])tube(root,[new T.Vector3(x,top,z),new T.Vector3(x,roofY,z)],.025,steel);
      box(root,hullMat,0,roofY,roofZ,W*.78,.10,2.05);
      tube(root,[new T.Vector3(W*.27,roofY,roofZ),new T.Vector3(W*.27,roofY+1.1,roofZ)],.012,steel);
    }
  }
  // Plank seams, fenders, grab handles and navigation lenses read at human scale.
  for(let i=0;i<12;i++)box(root,inner,0,top*.69+.056,L*.30-i*L*.049,W*.72,.007,.012);
  if(!jet)for(const side of [-1,1]){
    add(root,new T.SphereGeometry(.046,12,8),new T.MeshStandardMaterial({color:side<0?'#9e352b':'#257961',emissive:side<0?'#44110c':'#0b3825',emissiveIntensity:.25}),side*W*.4,top+.10,-L*.24);
    for(const z of [-L*.12,L*.22]){const f=add(root,new T.CapsuleGeometry(cargo?.14:.075,cargo?.6:.28,6,12),trim,side*W*.49,top*.66,z);f.rotation.z=side*.2;}
  }
  root.userData={bowAxis:'-Z',sternAxis:'+Z',length:L,width:W,draft,seat};
  return root;
}
