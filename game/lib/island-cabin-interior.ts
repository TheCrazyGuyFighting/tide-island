import * as T from 'three';
import {CABIN} from './island-world';
import {naturalSurface} from './island-natural-materials';
import type {IslandPhysics} from './island-physics';
import {RODS,isFishingRod} from './island-expansion-types';
import type {ShopSnapshot} from './island-shop';
export const CABIN_BED={x:CABIN.x-2.35,z:CABIN.z-1.45};
export const CABIN_CHEST={x:CABIN.x+2.35,z:CABIN.z+1.6};
export const RACK_SLOTS=['rod',...RODS.map(r=>r.id)].map((id,i)=>({id,x:CABIN.x-1.7+i*.84,z:CABIN.z-3.12}));
export function cabinTarget(x:number,z:number){if(Math.abs(x-CABIN.x)>3.3||Math.abs(z-CABIN.z)>3.6)return null;if(z>CABIN.z-2.05&&Math.hypot(x-CABIN_BED.x,z-CABIN_BED.z)<1.7)return {type:'bed' as const};if(Math.hypot(x-CABIN_CHEST.x,z-CABIN_CHEST.z)<1.65)return {type:'chest' as const};const slot=RACK_SLOTS.reduce((a,b)=>Math.hypot(x-a.x,z-a.z)<Math.hypot(x-b.x,z-b.z)?a:b);return Math.hypot(x-slot.x,z-slot.z)<1.8?{type:'rack' as const,id:slot.id}:null;}
export function buildCabinInterior(scene:T.Scene,physics:IslandPhysics){
  const root=new T.Group(),floor=CABIN.y+CABIN.floor;root.name='cabin-bed-and-storage';scene.add(root);
  const wood=naturalSurface('wood',1),metal=new T.MeshStandardMaterial({color:'#87989b',metalness:.72,roughness:.32}),linen=new T.MeshStandardMaterial({color:'#b5b7ac',roughness:1});
  const box=(x:number,y:number,z:number,w:number,h:number,d:number,m:T.Material)=>{const o=new T.Mesh(new T.BoxGeometry(w,h,d),m);o.position.set(x,y,z);o.castShadow=true;o.receiveShadow=true;root.add(o);return o;};
  box(CABIN_BED.x,floor+.30,CABIN_BED.z,1.3,.35,2.3,wood);box(CABIN_BED.x,floor+.55,CABIN_BED.z,1.28,.22,2.2,linen);box(CABIN_BED.x,floor+.73,CABIN_BED.z-.75,1.04,.18,.5,linen);box(CABIN_BED.x,floor+.92,CABIN_BED.z-1.17,1.4,.9,.12,wood);
  physics.addCollider({kind:'box',x:CABIN_BED.x,y:floor+.36,z:CABIN_BED.z,rx:.68,ry:.36,rz:1.2});
  box(CABIN_CHEST.x,floor+.42,CABIN_CHEST.z,1.4,.84,.85,wood);box(CABIN_CHEST.x,floor+.86,CABIN_CHEST.z,1.45,.09,.9,wood);box(CABIN_CHEST.x,floor+.68,CABIN_CHEST.z+.46,.15,.2,.045,metal);
  physics.addCollider({kind:'box',x:CABIN_CHEST.x,y:floor+.45,z:CABIN_CHEST.z,rx:.72,ry:.45,rz:.47});
  for(const y of [.6,1.85])box(CABIN.x,floor+y,CABIN.z-3.3,4.9,.14,.13,wood);
  for(const slot of RACK_SLOTS)for(const y of [.62,1.87]){const clip=new T.Mesh(new T.TorusGeometry(.075,.022,10,20,Math.PI*1.55),metal);clip.rotation.x=Math.PI/2;clip.position.set(slot.x,floor+y,slot.z);root.add(clip);}
  const displayed=new Map<string,T.Group>();
  return {root,sync(s:ShopSnapshot,source:(id:string)=>T.Group|undefined){for(const slot of RACK_SLOTS){const show=s.expansion?.stored.includes(slot.id);let rod=displayed.get(slot.id);if(show&&!rod){const template=source(slot.id);if(template){rod=template.clone(true);rod.name='stored-'+slot.id;rod.position.set(slot.x,floor+.30,slot.z);rod.rotation.set(0,0,0);rod.quaternion.identity();rod.scale.setScalar(.88);rod.getObjectByName('idle-line')?.removeFromParent();displayed.set(slot.id,rod);root.add(rod);}}if(rod)rod.visible=!!show;}},isRod:isFishingRod};
}
