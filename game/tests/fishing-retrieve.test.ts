import assert from 'node:assert/strict';
import * as T from 'three';
import {FishingGame,reelWaterTarget,type FishAgent} from '../lib/island-fishing';
import {addMarinePopulation} from '../lib/island-marine-population';
import {createCatchAnimation,catchPose,catchHandoff} from '../lib/island-catch';
import {fishMouthOffset,landedMouth,createCatchHook} from '../lib/island-hook';
import {CatchWork} from '../lib/island-catch-work';
import {DOCK,groundHeight,waterHeight} from '../lib/island-world';

const scene=new T.Scene(),fish:FishAgent[]=[],animations:{update:(dt:number,time:number)=>void}[]=[];
addMarinePopulation(scene,true,f=>fish.push(f),animations);
const f=fish.find(f=>f.id==='original-mackerel-0')!,root=scene.getObjectByName(f.id)!,animate=animations[fish.indexOf(f)];
root.position.set(DOCK.x,-f.clearance-.45,98);root.rotation.set(0,Math.PI,0);
const angler={x:DOCK.x,y:DOCK.y,z:78},game=new FishingGame([f]),bag=new CatchWork();
game.onLand=fish=>bag.add(fish);
game.cast({...f.position,y:0});game.update(.71,false,angler);game.update(2.6,false,angler);assert.equal(String(game.phase),'bite');
let time=0;animate.update(0,time);
const mouth=fishMouthOffset(f).applyEuler(root.rotation).add(root.position);
assert(mouth.distanceTo(new T.Vector3(f.mouth!.x,f.mouth!.y,f.mouth!.z))<1e-8,'anatomical mouth is the fight anchor');
const start=root.position.clone();game.hook();
let surfaceFrames=0;let previous=root.position.clone();
for(let i=0;i<1200&&game.phase==='reeling';i++){
  const dt=1/60;time+=dt;game.update(dt,game.tension<.72,angler);animate.update(dt,time);
  assert(root.position.distanceTo(previous)<.3,'no teleport on hook or retrieve');previous.copy(root.position);
  assert(root.position.y>groundHeight(root.position.x,root.position.z)+f.clearance,'never dragged through seabed');
  if(game.phase==='reeling'){
    assert(f.mouth);assert(f.reelTarget);
    const expected=fishMouthOffset(f).applyEuler(root.rotation).add(root.position);
    assert(expected.distanceTo(new T.Vector3(f.mouth.x,f.mouth.y,f.mouth.z))<1e-8,'hook remains on moving mouth');
    if(root.position.y>waterHeight(root.position.x,root.position.z,time)-f.clearance*.8)surfaceFrames++;
  }
}
assert.equal(game.phase,'landing');assert.equal(game.catches,1);assert.equal(bag.fish.length,1);
assert.equal(bag.holding?.length,f.length,'handoff preserves fish size');
assert(root.position.distanceTo(start)>12,'reel meter pulls fish across water');
assert(Math.hypot(root.position.x-angler.x,root.position.z-angler.z)<3.3,'fish reaches the angler');
assert(surfaceFrames>100,'fish is visible at the surface throughout most of retrieve');

const lift=createCatchAnimation(scene),hook=createCatchHook(scene);
const hand={position:{x:DOCK.x-.23,y:DOCK.y+1.28,z:78.8},pitch:0,yaw:Math.PI/2,roll:0};
const before=root.quaternion.clone();lift.update(game,angler,Math.PI,0,time,hand);animate.update(0,time);
assert(before.angleTo(root.quaternion)<1e-6,'lifting begins at the actual struggling orientation');
for(let i=0;i<190;i++){
  time+=1/60;game.update(1/60,false,angler);lift.update(game,angler,Math.PI,1/60,time,hand);animate.update(1/60,time);
  assert(root.visible,'same fish remains visible through lift');
  const expected=landedMouth(f,f.landing!);
  assert(expected.distanceTo(lift.mouth)<1e-8,'lift attaches to mouth, never the tail');
  hook.update(lift.mouth,Math.PI);assert(hook.root.position.distanceTo(lift.mouth)<1e-8);
  assert(hook.endpoint.y>lift.mouth.y,'line attaches above the mouth at hook eye');
}
assert(root.position.distanceTo(new T.Vector3(hand.position.x,hand.position.y,hand.position.z))<.02,'landing finishes at the carried fish position');
game.update(.2,false,angler);animate.update(.2,time+.2);hook.update(null,0);
assert.equal(game.phase,'caught');assert(!root.visible&&!hook.root.visible);assert.equal(bag.fish.length,1,'no duplicate handoff reward');
assert(!f.target&&!f.reelTarget&&!f.struggle&&!f.mouth&&!f.landing,'landing releases all line state');
const hang=catchPose({x:0,y:-1,z:10},{x:0,y:2,z:2},.7,0);
for(let yaw=-Math.PI;yaw<=Math.PI;yaw+=.17){
  const hanging=catchPose({x:0,y:-1,z:10},{x:0,y:2,z:2},.7,yaw);
  assert(landedMouth(f,hanging).y>hanging.position.y+f.length!*.25,'hanging fish nose points UP at every compass heading');
}
const end=catchHandoff(hang,hand,1);assert.deepEqual(end.position,hand.position);
// A landward retrieve stops outside the shore with room for the whole animal.
const shore=reelWaterTarget({x:DOCK.x,y:0,z:98},{x:DOCK.x,y:4,z:40},f);
assert(shore.z>40+2.4);assert(groundHeight(shore.x,shore.z)<-f.clearance*2-.4);
f.caught=false;game.cancel();root.position.set(DOCK.x,-.5,96);
game.cast({...f.position,y:0});game.update(.71,false);game.update(2.6,false);game.hook();game.update(.2,true,angler);
assert(f.reelTarget);game.cancel();assert(!f.reelTarget&&!f.mouth&&!f.struggle,'cancel clears retrieve');
animations.forEach(a=>a.update(0,-1));
console.log('PASS: real retrieve, surface visibility, anatomical hook, continuous nose-up lift, handoff size/pose, shore safety, single reward and cleanup.');
