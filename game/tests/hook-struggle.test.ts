import assert from 'node:assert/strict';
import * as T from 'three';
import {FishingGame,type FishAgent} from '../lib/island-fishing';
import {addMarinePopulation} from '../lib/island-marine-population';
import {hookStrugglePose} from '../lib/island-hook-struggle';
import {groundHeight} from '../lib/island-world';

const scene=new T.Scene(),fish:FishAgent[]=[],animations:{update:(dt:number,time:number)=>void}[]=[];
addMarinePopulation(scene,true,f=>fish.push(f),animations);
const f=fish.find(f=>f.id==='original-clownfish-0')!,root=scene.getObjectByName(f.id)!,animation=animations[fish.indexOf(f)];
assert(f);const game=new FishingGame([f]);let time=0;
function bite(){
  game.cast({...f.position,y:0});game.update(.71,false);game.update(2.6,false);
  assert.equal(game.phase,'bite');assert(f.struggle);
}
bite();const start=root.position.clone(),angles:number[]=[],mouths:T.Vector3[]=[];
for(let i=0;i<65;i++){time+=1/60;game.update(1/60,false);animation.update(1/60,time);angles.push(root.rotation.y);mouths.push(new T.Vector3(f.mouth!.x,f.mouth!.y,f.mouth!.z));assert(root.position.y<0);assert(root.position.y>groundHeight(root.position.x,root.position.z)+f.clearance);assert(root.position.distanceTo(start)<f.length!,'bounded struggle, no drifting');}
assert(Math.max(...angles)-Math.min(...angles)>.25,'visible body wiggle');
assert(mouths.every(m=>m.distanceTo(mouths[0])<.25),'nose stays near hook');
assert(fish.filter(other=>other!==f).every(other=>!other.struggle),'only selected fish fights');
game.hook();assert.equal(game.phase,'reeling');
for(let i=0;i<1200&&game.phase==='reeling';i++){time+=1/60;game.update(1/60,game.tension<.72);animation.update(1/60,time);}
assert.equal(game.phase,'landing');assert.equal(game.catches,1);assert(!f.struggle&&!f.mouth);assert(f.landing);
game.update(3.3,false);assert.equal(game.phase,'caught');assert(!f.struggle&&!f.mouth&&!f.target);assert.equal(game.coins,250+f.value);
game.cancel();f.caught=false;
bite();game.cancel();animation.update(.05,time+.05);assert(!f.struggle&&!f.mouth&&!f.target,'cancel clears all hook state');
bite();game.update(2.6,false);assert.equal(game.phase,'missed');assert(!f.struggle&&!f.mouth,'missed bite clears fight');
bite();game.hook();game.tension=.998;game.update(.2,true);assert.equal(game.phase,'missed');assert(!f.struggle&&!f.mouth,'snapped line releases fish');
for(const length of [.3,1,3])for(let t=0;t<10;t+=.03){const pose=hookStrugglePose({elapsed:t,strength:1.35},length);assert(Object.values(pose).every(Number.isFinite));assert(Math.abs(pose.yaw)<.9);}
animations.forEach(a=>a.update(0,-1));
console.log('PASS: bite/reel body thrash, anchored mouth, terrain clearance, other fish unaffected, landing reward, cancellation, missed bite, and line-snap cleanup.');
