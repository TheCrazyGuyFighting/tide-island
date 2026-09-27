import assert from 'node:assert/strict';
import * as T from 'three';
import {CABIN,DOCK,TERRAIN_SIZE,TERRAIN_SEGMENTS,groundHeight,terrainHeight,walkingHeight,dockHeight} from '../lib/island-world';
import {IslandPhysics,createBody,MAX_SLOPE} from '../lib/island-physics';
import {InstalledHomes} from '../lib/island-home-layout';

// Reproduce the displayed terrain itself, not just a second collision formula.
const geometry=new T.PlaneGeometry(TERRAIN_SIZE,TERRAIN_SIZE,TERRAIN_SEGMENTS,TERRAIN_SEGMENTS).rotateX(-Math.PI/2);
const vertices=geometry.attributes.position;
for(let i=0;i<vertices.count;i++)vertices.setY(i,groundHeight(vertices.getX(i),vertices.getZ(i)));
geometry.computeVertexNormals();
const mesh=new T.Mesh(geometry,new T.MeshBasicMaterial()),ray=new T.Raycaster();mesh.updateMatrixWorld(true);
for(const z of [44.8,49,51,52,54,56,58,60,63,66,72,78])for(const x of [DOCK.x-1.5,DOCK.x,DOCK.x+1.5]){
  ray.set(new T.Vector3(x,30,z),new T.Vector3(0,-1,0));const hit=ray.intersectObject(mesh)[0];assert(hit);
  assert(Math.abs(hit.point.y-terrainHeight(x,z))<.00002,'physics matches the rendered triangle');
  assert(hit.point.y<dockHeight(z)-.24,'terrain cannot cover even the underside of the walkway');
  assert(walkingHeight(x,z)>=hit.point.y,'floor never hides solid ground');
}

// The exact old failure: walking south from the cabin used to put the player's
// head underground between z=54 and z=60. Check the centre and both edges.
for(const x of [DOCK.x-1.25,DOCK.x,DOCK.x+1.25])for(const fps of [30,60,144]){
  const physics=new IslandPhysics([]),body=createBody();
  Object.assign(body,{x,z:45,y:walkingHeight(x,45),peak:walkingHeight(x,45)});
  for(let i=0;i<7.5*fps;i++){
    physics.update(body,0,4.2,1/fps,true);
    assert(body.y>=terrainHeight(body.x,body.z)-.00002,'feet stay above the hill, every frame');
    assert.equal(body.health,100);assert(!body.dead);
  }
  assert(body.z>75,'cabin-to-harbour route remains passable');
  for(let i=0;i<7.5*fps;i++)physics.update(body,0,-4.2,1/fps,true);
  assert(body.z<45.1,'return trip can climb the actual ramp');
}
// An unopened door still blocks entry; an open one permits the threshold.
for(const open of [false,true]){
  const physics=new IslandPhysics([]),b=createBody();Object.assign(b,{x:CABIN.x,z:46,y:walkingHeight(CABIN.x,46)});
  for(let i=0;i<180;i++)physics.update(b,0,-2,1/60,open);
  assert(open?b.z<CABIN.z+3:b.z>CABIN.z+4,'door collision is preserved');
}
// Floors remain above terrain for all habitat configurations around the cabin.
for(const homes of [new InstalledHomes(),...(['basic','standard','prime','premium'] as const).map(tier=>{
  const h=new InstalledHomes(['birds','sea']);h.tiers={birds:tier,sea:tier};return h;
})])for(let z=33;z<88;z+=.5)for(let x=-72;x<-27;x+=.5){
  assert(walkingHeight(x,z,homes)>=terrainHeight(x,z)-1e-6,'no lower support overrides terrain');
}
// A jump on the fixed ramp lands on it again, without tunnelling through a bank.
const physics=new IslandPhysics([]),jumper=createBody();Object.assign(jumper,{x:DOCK.x,z:56,y:walkingHeight(DOCK.x,56)});
assert(physics.jump(jumper));let peak=jumper.y;
for(let i=0;i<90;i++){physics.update(jumper,0,0,1/60,true);peak=Math.max(peak,jumper.y);assert(jumper.y>=terrainHeight(jumper.x,jumper.z));}
assert(peak>dockHeight(56)+.8);assert(jumper.grounded);assert.equal(jumper.health,100);
// Steep banks must still reject walking uphill, including diagonal movement.
let checked=0;
for(let x=DOCK.x-7;x<DOCK.x+7;x+=.5)for(let z=51;z<62;z+=.5){
  const g=physics.gradient(x,z);if(g.slope<MAX_SLOPE+.15)continue;
  const b=createBody();Object.assign(b,{x,z,y:walkingHeight(x,z),grounded:false,peak:walkingHeight(x,z)});
  const before=walkingHeight(x,z);for(let i=0;i<10;i++)physics.update(b,g.x/g.slope*4.2,g.z/g.slope*4.2,1/60,true);
  assert(walkingHeight(b.x,b.z)<=before+.02,'cannot walk through or scale steep banks');checked++;
}
assert(checked>0);
geometry.dispose();(mesh.material as T.Material).dispose();
console.log('PASS: visible terrain matches collision; clear full-length cabin walkway; centre/edge walking both ways at 30/60/144 FPS; door, jump, steep banks and all habitat tiers.');
