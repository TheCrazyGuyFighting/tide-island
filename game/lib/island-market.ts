import * as T from 'three';
import {naturalTerrain,naturalSurface,foliageMaterial,foliageShadow} from './island-natural-materials';
import {palmFrondGeometry} from './island-natural-geometry';
import { material, mesh } from './island-landscape';
import { MARKET, MARKET_SPOTS, MARKET_RETURN, MARKET_VENDORS, MARKET_SECTIONS, HOME_FERRY, marketGround } from './island-market-layout';
import { SHOP_ITEMS, isPet, isPetHome, purchaseTotal, shippingFee } from './island-shop';
import { loadShopDisplay, animatePet } from './island-pets';
import type { IslandPhysics } from './island-physics';
import {keeperTrainer} from './island-expansion-models';

export function label(parent:T.Object3D,title:string,detail:string,x:number,y:number,z:number,width=3.8) {
  const canvas=document.createElement('canvas');canvas.width=768;canvas.height=192;
  const ctx=canvas.getContext('2d')!;
  ctx.fillStyle='#143a40';ctx.fillRect(0,0,768,192);ctx.strokeStyle='#e2bb70';ctx.lineWidth=8;ctx.strokeRect(5,5,758,182);
  ctx.fillStyle='#fff4d8';ctx.textAlign='center';ctx.font='bold 38px sans-serif';ctx.fillText(title,384,75,724);
  ctx.fillStyle='#c5e6df';ctx.font='28px sans-serif';ctx.fillText(detail,384,133,720);
  const texture=new T.CanvasTexture(canvas);texture.colorSpace=T.SRGBColorSpace;
  const sprite=new T.Sprite(new T.SpriteMaterial({map:texture,depthTest:true}));sprite.position.set(x,y,z);sprite.scale.set(width,width/4,1);parent.add(sprite);return sprite;
}
export function addHomeFerry(scene:T.Scene) {
  const root=new T.Group();root.position.set(HOME_FERRY.x,2.24,HOME_FERRY.z);scene.add(root);
  mesh(root,new T.CylinderGeometry(.035,.045,2.2,8),material('#bb995f'),-1.4,1.1,0);
  label(root,'MARKET ISLAND','E to travel · free return',0,2.5,0,3.7);
}

// Real signboards stay attached to their stands instead of facing the camera.
function signboard(parent:T.Object3D,title:string,detail:string,x:number,y:number,z:number,width:number,color='#263e44',yaw=0){
  const group=new T.Group();group.position.set(x,y,z);group.rotation.y=yaw;parent.add(group);
  const canvas=document.createElement('canvas');canvas.width=1024;canvas.height=256;const c=canvas.getContext('2d')!;
  c.fillStyle=color;c.fillRect(0,0,1024,256);c.fillStyle='#b8a077';c.fillRect(28,29,968,3);
  c.fillStyle='#f0f0e7';c.font='600 52px sans-serif';c.textAlign='center';c.fillText(title,512,112,950);
  c.fillStyle='#d1d8d4';c.font='34px sans-serif';c.fillText(detail,512,192,950);
  const texture=new T.CanvasTexture(canvas);texture.colorSpace=T.SRGBColorSpace;texture.anisotropy=4;
  mesh(group,new T.BoxGeometry(width+.06,width*.25+.06,.09),material('#716b5c'),0,0,-.055);
  mesh(group,new T.PlaneGeometry(width,width*.25),new T.MeshStandardMaterial({map:texture,roughness:.85}),0,0,0);
  for(const dx of [-width*.38,width*.38])mesh(group,new T.CylinderGeometry(.035,.035,Math.max(.12,y-MARKET.floor),8),material('#555e5c'),dx,-(y-MARKET.floor)/2,0);
  return group;
}

export function buildMarket(scene:T.Scene,physics:IslandPhysics,disposed:()=>boolean) {
  const root=new T.Group();root.name='market-island';scene.add(root);
  const wood=naturalSurface('wood',1),darkWood=naturalSurface('wood',1,'#786e5e'),sand=naturalSurface('sand',7),stone=naturalSurface('rock',4,'#a6aaa1');
  const box=(x:number,y:number,z:number,rx:number,ry:number,rz:number)=>physics.addCollider({kind:'box',x,y,z,rx,ry,rz});
  const geometry=new T.PlaneGeometry(160,160,160,160).rotateX(-Math.PI/2).translate(MARKET.x,0,0);
  const positions=geometry.attributes.position,colors=new Float32Array(positions.count*3);
  const color=new T.Color(),grassy=new T.Color('#78a45a'),sandy=new T.Color('#e0cf9f'),seabed=new T.Color('#8bb5a7');
  for(let i=0;i<positions.count;i++){
    const x=positions.getX(i),z=positions.getZ(i),h=marketGround(x,z);positions.setY(i,h);
    color.copy(h<0?seabed:sandy);if(h>2.2)color.lerp(grassy,.6);color.multiplyScalar(.97+.03*Math.sin(x*.9+z*.7));color.toArray(colors,i*3);
  }
  geometry.setAttribute('color',new T.BufferAttribute(colors,3));geometry.computeVertexNormals();
  mesh(root,geometry,naturalTerrain()).castShadow=false;
  const path=(x:number,z:number,w:number,l:number)=>mesh(root,new T.BoxGeometry(w,.025,l),sand,MARKET.x+x,MARKET.floor+.05,z);
  path(0,5,7,115);path(0,34,104,5);path(3,-9,88,4);path(3,-40,88,3);path(0,63,32,4);
  for(const s of MARKET_SECTIONS){
    const floor=s.id==='boats'?darkWood:s.id==='seafood'?stone:sand;
    mesh(root,new T.BoxGeometry(s.w,.035,s.l),floor,MARKET.x+s.x,MARKET.floor+.015,s.z);
    signboard(root,s.name.toUpperCase(),`${s.vendor} · ${s.direction}`,MARKET.x+s.signX,MARKET.floor+3.3,s.signZ,6.5,s.color);
  }
  path(-40.2,0,3,60);path(-25.2,0,3,60);
  for(const z of [-32.5,-25.5,-18.5,-11.5])path(-14,z,24,2.2);
  for(const z of [26.5,17.5,-18.5,-30.5,-42.5,43.5,51.5])path(29,z,40,2.5);
  for(const z of [45.5,52.5,59.5])path(-13,z,25,2.5);
  // Flush stone borders and timber seams give the quay human-scale detail.
  for(const x of [-3.55,3.55])mesh(root,new T.BoxGeometry(.16,.06,115),stone,MARKET.x+x,MARKET.floor+.015,5);
  for(let i=0;i<29;i++)mesh(root,new T.BoxGeometry(6.8,.012,.028),stone,MARKET.x,MARKET.floor+.023,-51+i*4);
  const plaza=mesh(root,new T.CylinderGeometry(5,5,.025,48),sand,MARKET.x,MARKET.floor+.02,30);plaza.receiveShadow=true;

  // A free return landing is always reachable without spending coins.
  const bell=new T.Group();bell.position.set(MARKET_RETURN.x,MARKET.floor,MARKET_RETURN.z);root.add(bell);
  for(const x of [-1.7,1.7])mesh(bell,new T.CylinderGeometry(.09,.12,3.8,8),wood,x,1.9,0);
  mesh(bell,new T.BoxGeometry(3.6,.16,.18),wood,0,3.7,0);
  mesh(bell,new T.ConeGeometry(.26,.36,12,1,true),material('#dcb260',.4),0,2.6,0).rotation.z=Math.PI;
  signboard(root,'TIDE ISLAND FERRY','E at the bell · free return',MARKET_RETURN.x,MARKET.floor+4.1,MARKET_RETURN.z,4.6);
  signboard(root,'SALTWATER MARKET','WEST  Boats & tackle    ·    EAST  Animals & habitats',MARKET.x,MARKET.floor+5.8,28,9);
  // Cargo quay: the same freighter returns here and stays moored between orders.
  for(let i=0;i<29;i++)mesh(root,new T.BoxGeometry(8,.18,.64),wood,MARKET.x,2.15,63+i*.66);
  for(const x of [-3.7,3.7])for(const z of [65,71,78,81]){mesh(root,new T.CylinderGeometry(.19,.23,5.5,12),darkWood,MARKET.x+x,.3,z);mesh(root,new T.CylinderGeometry(.16,.20,.42,16),material('#464f4b',.6),MARKET.x+x,2.55,z);}
  signboard(root,'COASTAL FREIGHT QUAY','Working berth · deliveries depart and return here',MARKET.x,MARKET.floor+2.1,64,5.8);
  box(MARKET.x,MARKET.floor+.45,65,4,.45,.12);

  const sellers:T.Group[]=[];
  for(const vendor of MARKET_VENDORS){
    const booth=new T.Group();booth.position.set(vendor.x,MARKET.floor,vendor.z);root.add(booth);
    const canopy=material(vendor.color),skin=material('#cd9f7e');
    for(const x of [-1.6,1.6])for(const z of [-1.2,1.2]){mesh(booth,new T.CylinderGeometry(.065,.08,3.2,7),wood,x,1.6,z);box(vendor.x+x,MARKET.floor+1.6,vendor.z+z,.08,1.6,.08);}
    const awning=mesh(booth,new T.BoxGeometry(3.8,.06,3.1),canopy,0,3.2,0);awning.rotation.x=.075;
    for(let i=0;i<14;i++)mesh(booth,new T.BoxGeometry(.013,.012,3.1),material('#b5b7a9'),-1.76+i*.27,3.24,0).rotation.x=.075;
    mesh(booth,new T.BoxGeometry(3.8,.19,.04),canopy,0,3.0,1.55);
    mesh(booth,new T.BoxGeometry(2.8,1.05,.85),wood,0,.525,1);box(vendor.x,MARKET.floor+.525,vendor.z+1,1.4,.525,.425);
    const npc=keeperTrainer();npc.position.set(0,0,-.1);booth.add(npc);sellers.push(npc);
    mesh(npc,new T.BoxGeometry(.32,.49,.028),canopy,0,1.02,.2);
    mesh(npc,new T.SphereGeometry(.028,16,12),skin,0,1.66,.157).scale.set(.7,1.1,1);
    for(const side of [-1,1])mesh(npc,new T.SphereGeometry(.035,12,8),skin,side*.15,1.65,0).scale.set(.65,1,.7);
    for(let i=0;i<7;i++)mesh(booth,new T.BoxGeometry(.37,.88,.04),darkWood,-1.2+i*.4,.5,1.45);
    box(vendor.x,MARKET.floor+.95,vendor.z-.1,.45,.95,.35);
    signboard(root,vendor.role,vendor.name,vendor.x,MARKET.floor+2.65,vendor.z+1.6,3.3,vendor.color);
  }
  // Physical stock replaces the catalog. Each exhibit has its own price sign.
  const displays=new Map<string,T.Group>(),failed=new Set<string>();
  let pending:Promise<void>|undefined;
  for(const spot of MARKET_SPOTS){
    const item=SHOP_ITEMS.find(i=>i.id===spot.id)!,boat=item.category==='Boats',pet=isPet(item.id),home=isPetHome(item.id),aquatic=pet&&spot.scale>3;
    const baseY=MARKET.floor+(boat?.7:pet?.35:1),halfX=boat?1.65:home?spot.scale*.56:pet?spot.scale*.5:1.25,halfZ=boat?spot.scale*.52:home?spot.scale*.5:pet?spot.scale*.43:.75;
    mesh(root,new T.BoxGeometry(halfX*2,baseY-MARKET.floor,halfZ*2),boat?darkWood:wood,spot.x,(baseY+MARKET.floor)/2,spot.z);
    box(spot.x,(baseY+MARKET.floor)/2,spot.z,halfX,(baseY-MARKET.floor)/2,halfZ);
    if(pet)box(spot.x,baseY+(aquatic?2.1:1.3),spot.z,halfX,aquatic?2.1:1.3,halfZ);
    if(home)box(spot.x,baseY+.7,spot.z,halfX,.7,halfZ);
    if(boat)box(spot.x,baseY+1,spot.z,halfX,1,halfZ);
    const fee=shippingFee(item);
    signboard(root,item.name,home?`${item.price} coins · fitted`:`${purchaseTotal(item)} coins${fee?' · shipping included':''} · E to inspect`,boat?spot.x+3.3:spot.x,MARKET.floor+1.35,boat?spot.z:spot.z+halfZ+.12,boat?3.4:2.8,'#303f42',boat?Math.PI/2:0);
    const marker=mesh(root,new T.RingGeometry(.19,.23,24),new T.MeshBasicMaterial({color:'#b4ab85',side:T.DoubleSide}),spot.approachX,MARKET.floor+.05,spot.approachZ);marker.rotation.x=-Math.PI/2;marker.castShadow=false;
  }
  // A few palms frame the shops without obstructing the market's walking lanes.
  for(const [dx,z] of [[-57,25],[-57,-26],[51,27],[51,-18],[-30,58],[43,61]]){
    const x=MARKET.x+dx,y=marketGround(x,z);if(y<1)continue;
    mesh(root,new T.CylinderGeometry(.17,.27,5.7,7),wood,x,y+2.85,z);physics.addCollider({kind:'tree',x,y:y+2.85,z,rx:.27,ry:2.85,rz:.27});
    for(let i=0;i<7;i++){const leaf=mesh(root,palmFrondGeometry(),foliageMaterial('palm'),x,y+5.9,z);foliageShadow(leaf);leaf.rotation.z=0;leaf.rotation.y=i/7*Math.PI*2;leaf.position.x+=Math.cos(i/7*Math.PI*2)*1.1;leaf.position.z+=Math.sin(i/7*Math.PI*2)*1.1;}
  }
  async function loadStock() {
    if(pending)return pending;
    pending=(async()=>{
      // Bounded concurrency avoids decoding the whole animal collection at once.
      const queue=MARKET_SPOTS.filter(s=>!displays.has(s.id));
      const worker=async()=>{for(let spot=queue.shift();spot;spot=queue.shift()){
        try{const model=await loadShopDisplay(spot.id);if(disposed())return;
          const item=SHOP_ITEMS.find(i=>i.id===spot!.id)!;
          model.scale.setScalar(spot.scale);model.position.set(spot.x,MARKET.floor+(item.category==='Boats'?.7:isPet(item.id)?.35:1),spot.z);
          root.add(model);displays.set(spot.id,model);failed.delete(spot.id);
        }catch{failed.add(spot.id);}
      }};
      await Promise.all([worker(),worker()]);
    })();
    try{await pending;}finally{pending=undefined;}
  }
  return {root,loadStock,failed,ready:(id:string)=>displays.has(id),update(time:number){
    displays.forEach((model,id)=>{if(isPet(id))animatePet(model,time);});
    sellers.forEach((npc,i)=>{npc.rotation.y=Math.sin(time*.55+i)*.08;});
  }};
}
