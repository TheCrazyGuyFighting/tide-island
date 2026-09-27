import * as T from 'three';
import {loadIslandModel} from './island-models';
import {createMarineCreature} from './island-original-marine';
import {MARINE_SPECIES} from './island-marine-roster';
import {keeperTrainer} from './island-expansion-models';
import {label} from './island-market';
import {CABIN,DOCK,groundHeight,waterHeight} from './island-world';
import {habitatLayout} from './island-home-layout';
import {FAMILY_AVIARY} from './island-family-layout';
import {homeItemInfo} from './island-habitat-types';
import {isAquaticPet,type ShopInventory} from './island-shop';
import type {CatchWork} from './island-catch-work';
import type {LandingPose} from './island-fishing';
import type {CoastalDeliveries} from './island-deliveries';
import type {IslandPhysics} from './island-physics';
import type {FishingBow} from './island-bow';
import {createBoatCraft,craftDimensions} from './island-boat-craft';
import {MARKET_STALL} from './island-market-layout';
export const RACK_POINT={x:CABIN.x+7,z:CABIN.z+2};
export const STALL_POINT=MARKET_STALL;
export const CREW_POINT={x:DOCK.x+3.8,z:78};
const material=(color:string,opacity=1)=>new T.MeshStandardMaterial({color,roughness:.65,transparent:opacity<1,opacity,depthWrite:opacity===1});
function box(root:T.Object3D,x:number,y:number,z:number,w:number,h:number,d:number,m:T.Material){const o=new T.Mesh(new T.BoxGeometry(w,h,d),m);o.position.set(x,y,z);o.castShadow=true;o.receiveShadow=true;root.add(o);return o;}
function walk(n:T.Group,time:number,pace=1){for(const [i,s]of ['left','right'].entries()){const h=n.getObjectByName(s+'-hip'),a=n.getObjectByName(s+'-shoulder');if(h)h.rotation.x=Math.sin(time*7+i*Math.PI)*.4*pace;if(a)a.rotation.x=-Math.sin(time*7+i*Math.PI)*.28*pace;}}
export function createCoastalWorld(scene:T.Scene,equipment:T.Object3D,third:T.Object3D,physics:IslandPhysics,work:CatchWork,delivery:CoastalDeliveries,inventory:ShopInventory,bow:FishingBow,disposed:()=>boolean){
  const root=new T.Group();root.name='coastal-livelihood';scene.add(root);
  const wood=material('#785332'),canvas=material('#e6cc8e'),teal=material('#214c51'),metal=material('#c7c4ab');
  const rack=new T.Group();rack.position.set(RACK_POINT.x,groundHeight(RACK_POINT.x,RACK_POINT.z),RACK_POINT.z);root.add(rack);rack.visible=false;
  let rackReady=false;void loadIslandModel('drying-rack').then(model=>{if(disposed())return;model.scale.setScalar(3.6);rack.add(model);label(rack,'DRYING RACK','E · Hang / retrieve prepared fish',0,3,0,3.6);rackReady=true;}).catch(()=>{});
  physics.addCollider({kind:'box',x:RACK_POINT.x,y:rack.position.y+1.1,z:RACK_POINT.z,rx:1.8,ry:1.1,rz:1.1,enabled:false});const rackCollider=physics.colliders?.[physics.colliders.length-1];
  const heldFirst=new T.Group(),heldThird=new T.Group();equipment.add(heldFirst);third.add(heldThird);heldFirst.position.set(-.23,-.22,-.72);heldThird.position.set(-.3,.22,-.35);
  const hand=box(heldFirst,0,-.02,.07,.16,.10,.18,material('#d5a07b'));hand.rotation.z=.2;
  let heldId='',actor:ReturnType<typeof createMarineCreature>|null=null,copy:T.Group|null=null;
  const hanging=new Map<string,ReturnType<typeof createMarineCreature>>();
  const stall=new T.Group();stall.position.set(STALL_POINT.x,2.4,STALL_POINT.z);root.add(stall);
  box(stall,0,.6,0,4,1.2,1.2,wood);for(const x of [-2,2])for(const z of [-.8,.8])box(stall,x,1.9,z,.1,3.8,.1,wood);box(stall,0,3.7,0,4.5,.14,2.4,canvas);label(stall,'YOUR FISH STALL','E · Set prices / list catches',0,4.4,0,4.6);
  physics.addCollider({kind:'box',x:STALL_POINT.x,y:3,z:STALL_POINT.z,rx:2,ry:.6,rz:.6});
  const shoppers=Array.from({length:3},(_,i)=>{const n=keeperTrainer();n.name=['Nora','Kai','Tomas'][i];n.position.set(STALL_POINT.x+(i-1)*5,2.4,STALL_POINT.z+5);root.add(n);return n;});let visitorTime=0,customerIndex=0;
  const boat=createBoatCraft('delivery');boat.name='persistent-coastal-freighter';root.add(boat);
  const freightDraft=craftDimensions('delivery').draft;
  const freightCrates=new T.Group();boat.add(freightCrates);
  for(const x of [-1.15,1.15])for(const z of [.9,2.4]){box(freightCrates,x,1.62,z,.85,.65,1.05,wood);for(const y of [1.39,1.83])box(freightCrates,x,y,z,.88,.045,1.08,metal);}
  const wake=new T.Group();boat.add(wake);
  const wakeMaterial=new T.MeshBasicMaterial({color:'#e2ece7',transparent:true,opacity:0,depthWrite:false,side:T.DoubleSide});
  for(const side of [-1,1]){const vertices:number[]=[];for(let i=0;i<=30;i++){const z=7+i*.8,x=side*(1.6+i*.17);vertices.push(x-.11,freightDraft+.11,z,x+.11,freightDraft+.11,z);}const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(vertices,3));const ix:number[]=[];for(let i=0;i<30;i++){const a=i*2;ix.push(a,a+2,a+1,a+1,a+2,a+3);}g.setIndex(ix);const strip=new T.Mesh(g,wakeMaterial);strip.frustumCulled=false;wake.add(strip);}
  const crew=keeperTrainer();root.add(crew);crew.position.set(CREW_POINT.x,2.23,CREW_POINT.z);const crewLabel=label(crew,'COASTAL CREW','E · Collect your order',0,2.45,0,3);
  const parcel=new T.Group();box(parcel,0,0,0,.48,.4,.36,canvas);crew.add(parcel);parcel.position.set(0,1.1,.45);
  const cage=new T.Group();box(cage,0,0,0,.68,.035,.48,wood);for(let i=0;i<7;i++)for(const z of [-.24,.24])box(cage,-.34+i*.113,.26,z,.016,.52,.016,metal);for(let i=0;i<5;i++)for(const x of [-.34,.34])box(cage,x,.26,-.24+i*.12,.016,.52,.016,metal);box(cage,0,.52,0,.7,.035,.5,wood);equipment.add(cage);cage.position.set(-.2,-.5,-1.0);cage.visible=false;let cagedId='';
  const tank=new T.Group();box(tank,0,1.2,0,4,.06,3,metal);for(const x of [-2,2])box(tank,x,2.15,0,.05,1.9,3,material('#7dccde',.23));for(const z of [-1.5,1.5])box(tank,0,2.15,z,4,1.9,.05,material('#7dccde',.23));box(tank,0,3.1,0,4.1,.10,3.1,metal);root.add(tank);tank.visible=false;let tankId='';
  const crane=new T.Group();root.add(crane);box(crane,0,3,0,.25,6,.25,metal);const boom=box(crane,0,6,0,.18,.18,7,metal);boom.position.z=-3.3;const cable=new T.Line(new T.BufferGeometry().setFromPoints([new T.Vector3(),new T.Vector3()]),new T.LineBasicMaterial({color:'#313c3b'}));root.add(cable);crane.visible=cable.visible=false;
  const builders=new Map<number,T.Group>();
  const arrow=new T.Group();root.add(arrow);box(arrow,0,0,0,.025,.025,.8,wood);box(arrow,0,0,.32,.14,.012,.12,canvas);const tip=new T.Mesh(new T.ConeGeometry(.04,.12,5).rotateX(-Math.PI/2),metal);tip.position.z=-.45;arrow.add(tip);arrow.visible=false;
  function creature(name:string){return createMarineCreature(MARINE_SPECIES.find(s=>s.name===name)?.kind??'mackerel','medium');}
  function updateCatch(time:number,catchActive:boolean){
    const f=work.holding;
    if((f?.id??'')!==heldId){actor?.dispose();actor?.root.removeFromParent();copy?.removeFromParent();heldId=f?.id??'';actor=f?creature(f.name):null;copy=null;if(actor){const length=f?.length??.66;actor.root.scale.setScalar(length);actor.root.rotation.y=Math.PI/2;heldFirst.position.z=-Math.max(.72,length*.95);heldFirst.add(actor.root);copy=actor.root.clone(true);heldThird.add(copy);}}
    heldFirst.visible=heldThird.visible=!!f&&!catchActive;hand.visible=!!f;if(actor&&f){actor.update(f.state==='live'?time:0,f.state==='live'?1.6:0);actor.root.rotation.z=f.state==='live'?Math.sin(time*19)*.07:0;if(copy)copy.rotation.copy(actor.root.rotation);heldFirst.rotation.x=work.preparing?Math.sin(work.preparing*9)*.08:0;}
  }
  const handPosition=new T.Vector3(),handRotation=new T.Quaternion(),cameraRotation=new T.Quaternion(),handEuler=new T.Euler();
  function catchHandoff(view:string,camera:T.Camera):LandingPose|null{
    const model=view==='first'?actor?.root:copy;if(!model)return null;
    model.updateWorldMatrix(true,false);model.getWorldPosition(handPosition);model.getWorldQuaternion(handRotation);
    if(view==='first'){camera.updateWorldMatrix(true,false);handPosition.applyMatrix4(camera.matrixWorld);handRotation.premultiply(camera.getWorldQuaternion(cameraRotation));}
    handEuler.setFromQuaternion(handRotation);
    return {position:{x:handPosition.x,y:handPosition.y,z:handPosition.z},pitch:handEuler.x,yaw:handEuler.y,roll:handEuler.z};
  }
  return {root,rackReady:()=>rackReady,updateCatch,catchHandoff,update(dt:number,time:number,market:boolean,view:string,catchActive:boolean,wallet:{coins:number}){
    rack.visible=inventory.owned.has('drying-rack');if(rackCollider)rackCollider.enabled=rack.visible;
    for(const fish of work.fish.filter(f=>f.state==='drying'))if(!hanging.has(fish.id)){const a=creature(fish.name);a.root.scale.setScalar(.58);a.root.rotation.z=Math.PI/2;rack.add(a.root);hanging.set(fish.id,a);}
    let slot=0;for(const [id,a]of hanging){if(!work.fish.some(f=>f.id===id&&f.state==='drying')){a.root.removeFromParent();a.dispose();hanging.delete(id);continue;}a.root.position.set(-1.25+slot*.5,1.6,-.06);a.root.rotation.y=Math.sin(time*.8+slot)*.05;a.update(0,0);slot++;}
    if(market){visitorTime+=dt;shoppers.forEach((n,i)=>{const t=(visitorTime+i*6)%18,approach=t<7?Math.min(1,t/5):t>12?Math.max(0,1-(t-12)/5):1;n.position.set(STALL_POINT.x+(i-1)*1.3,2.4,STALL_POINT.z+5-approach*3.5);n.rotation.y=Math.PI;walk(n,time,t<5||t>12?1:0);});if(visitorTime>=18){visitorTime=0;work.customer(shoppers[customerIndex++%3].name,wallet);}}
    const ship=delivery.shipment,voyage=delivery.voyage;
    boat.visible=crew.visible=true;
    boat.position.set(voyage.x,waterHeight(voyage.x,voyage.z,time)-freightDraft+.1,voyage.z);
    const yawDelta=Math.atan2(Math.sin(voyage.yaw-boat.rotation.y),Math.cos(voyage.yaw-boat.rotation.y));
    boat.rotation.y+=yawDelta*(1-Math.exp(-dt*4));boat.rotation.z=Math.sin(time*1.1)*.018;boat.rotation.x=Math.sin(time*.73)*.012;
    boat.updateMatrixWorld(true);wake.visible=voyage.speed>.3;wakeMaterial.opacity=Math.min(.35,voyage.speed*.035);
    boat.traverse(o=>{if(o.name==='propeller')o.rotation.z=time*(4+voyage.speed*7);});
    const dockside=voyage.phase==='home';crewLabel.visible=dockside;crew.rotation.y=dockside?Math.PI*.4:boat.rotation.y;
    if(dockside)crew.position.set(CREW_POINT.x,2.23,CREW_POINT.z);else crew.position.copy(boat.localToWorld(new T.Vector3(-.72,1.29,-2.9)));
    parcel.visible=!!ship&&['handoff','giving'].includes(ship.state);parcel.position.z=ship?.state==='giving'?.45+Math.min(1,ship.elapsed)*.65:.45;cage.visible=delivery.cages.length>0&&view==='first';
    const c=delivery.cages[0];if(c&&c.item!==cagedId){cagedId=c.item;void loadIslandModel(c.item).then(m=>{if(disposed())return;cage.children.filter(o=>o.name==='delivery-bird').forEach(o=>o.removeFromParent());m.name='delivery-bird';m.scale.setScalar(.38);m.position.y=.07;cage.add(m);}).catch(()=>{});}
    walk(crew,time,0);const arm=crew.getObjectByName('right-shoulder');if(arm)arm.rotation.x=dockside?-1.1:-.65;
    const sea=ship&&isAquaticPet(ship.item);tank.visible=!!sea;freightCrates.visible=!sea;crane.visible=true;cable.visible=!!sea;
    crane.position.copy(boat.localToWorld(new T.Vector3(1.5,1.2,2.5)));crane.rotation.y=boat.rotation.y;
    if(sea&&ship){
      const h=habitatLayout('sea',inventory.homeTiers.sea??'basic'),cargo=boat.localToWorld(new T.Vector3(0,.1,3));
      let t=0,y=cargo.y;
      if(ship.state==='crane'){t=T.MathUtils.clamp((ship.elapsed-2)/4,0,1);y=ship.elapsed<2?T.MathUtils.lerp(cargo.y,2.5,ship.elapsed/2):ship.elapsed<7?2.5:T.MathUtils.lerp(2.5,-3,Math.min(1,(ship.elapsed-7)/4));}
      if(ship.state==='recovering'){t=1-T.MathUtils.clamp((ship.elapsed-2)/2.5,0,1);y=ship.elapsed<2?T.MathUtils.lerp(-3,2.5,ship.elapsed/2):ship.elapsed<4.5?2.5:T.MathUtils.lerp(2.5,cargo.y,(ship.elapsed-4.5)/.5);}
      tank.position.set(T.MathUtils.lerp(cargo.x,h.x,t),y,T.MathUtils.lerp(cargo.z,h.z,t));tank.rotation.y=voyage.phase==='home'?0:boat.rotation.y;
      const dx=tank.position.x-crane.position.x,dz=tank.position.z-crane.position.z,reach=Math.max(1,Math.hypot(dx,dz));crane.rotation.y=Math.atan2(-dx,-dz);boom.scale.z=reach/7;boom.position.z=-reach/2;
      if(ship.id.toString()!==tankId){tankId=ship.id.toString();tank.children.filter(o=>o.name==='transport-animal').forEach(o=>o.removeFromParent());void loadIslandModel(ship.item).then(m=>{if(disposed())return;m.name='transport-animal';m.scale.setScalar(2.2);m.position.y=1.3;tank.add(m);}).catch(()=>{});}
      const animal=tank.getObjectByName('transport-animal');if(animal){animal.visible=!['recovering','returning'].includes(ship.state);animal.position.z=ship.state==='crane'&&ship.elapsed>9?(ship.elapsed-9)*.7:0;}
      const p=cable.geometry.attributes.position;p.setXYZ(0,tank.position.x,crane.position.y+6,tank.position.z);p.setXYZ(1,tank.position.x,tank.position.y+3.1,tank.position.z);p.needsUpdate=true;cable.frustumCulled=false;
    }else{boom.scale.z=1;boom.position.z=-3.3;}
    for(const o of delivery.orders.filter(o=>o.state==='building')){let b=builders.get(o.id);if(!b){b=new T.Group();const h=homeItemInfo(o.item),layout=o.item==='family-aviary'?FAMILY_AVIARY:habitatLayout(h?.home??'birds',h?.tier??'basic');b.position.set(layout.x,layout.y,layout.z);for(const x of [-layout.rx,layout.rx])for(const z of [-layout.rz,layout.rz])box(b,x,layout.height/2,z,.13,layout.height,.13,wood);const wire=box(b,0,layout.height/2,0,layout.rx*2,layout.height,layout.rz*2,material('#cba659',.12));wire.name='construction-panels';for(let i=0;i<2;i++){const n=keeperTrainer();n.position.set((i?1:-1)*(layout.rx+.6),0,0);const hat=box(n,0,1.86,0,.4,.1,.4,material('#edbe36'));hat.name='hard-hat';const hammer=box(n,.32,1.5,.3,.1,.45,.1,wood);box(hammer,0,.2,0,.3,.12,.12,metal);b.add(n);}label(b,'HABITAT BUILD CREW','Assembling posts, mesh & gate…',0,layout.height+1,0,4);root.add(b);builders.set(o.id,b);}const panel=b.getObjectByName('construction-panels');if(panel)panel.scale.y=Math.max(.02,o.elapsed/30);b.children.filter(n=>n.name==='professional-keeper').forEach((n,i)=>{n.rotation.y=i?-Math.PI/2:Math.PI/2;const a=n.getObjectByName('right-shoulder');if(a)a.rotation.x=-1.2+Math.sin(time*7+i)*.55;});}
    for(const [id,b]of builders)if(!delivery.orders.some(o=>o.id===id&&o.state==='building')){b.removeFromParent();builders.delete(id);}
    arrow.visible=bow.active;if(bow.active){arrow.position.copy(bow.tip);arrow.lookAt(bow.tip.clone().sub(bow.velocity));}
  },dispose(){actor?.dispose();hanging.forEach(a=>a.dispose());heldFirst.removeFromParent();heldThird.removeFromParent();cage.removeFromParent();root.removeFromParent();}};
}
