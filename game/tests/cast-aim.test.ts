import assert from 'node:assert/strict';
import {castRange,castTarget,castArcHeight,castFlightPoint,FishingGame,CAST_DURATION,MAX_CAST_RANGE} from '../lib/island-fishing';
import {terrainHeight,CABIN,DOCK} from '../lib/island-world';
const rad=(degrees:number)=>degrees*Math.PI/180;
const near=(a:number,b:number)=>assert(Math.abs(a-b)<1e-8,`${a} should equal ${b}`);
near(castRange(rad(45)),MAX_CAST_RANGE);
for(let angle=-90;angle<=90;angle+=.25){
  const range=castRange(rad(angle));assert(range>=2&&range<=MAX_CAST_RANGE);
  if(angle!==45)assert(range<MAX_CAST_RANGE,'45 degrees is the unique maximum');
  if(angle<45)assert(castRange(rad(angle+.25))>range,'rises toward 45 degrees');
  if(angle>=45&&angle<90)assert(castRange(rad(angle+.25))<range,'falls beyond 45 degrees');
}
near(castRange(rad(30)),castRange(rad(60)));
assert(castRange(rad(-45))<castRange(0));
assert(Number.isFinite(castRange(NaN)));assert(Number.isFinite(castRange(Infinity)));
// All compass directions retain the player's heading; no global-axis casting.
const origin={x:0,y:2,z:300};
for(const degrees of [-65,0,15,30,45,60,65])for(const yaw of [0,Math.PI/2,Math.PI,Math.PI*1.5,.73]){
  const pitch=rad(degrees),target=castTarget(origin,yaw,pitch);assert(target,'open sea accepts the cast');
  const range=castRange(pitch);near(Math.hypot(target.x-origin.x,target.z-origin.z),range);
  near(target.x,origin.x-Math.sin(yaw)*range);near(target.z,origin.z-Math.cos(yaw)*range);
  const arc=castArcHeight(pitch,range),launch={...origin,y:origin.y+1.65};
  assert.deepEqual(castFlightPoint(launch,target,0,arc),launch);
  const end=castFlightPoint(launch,target,1,arc);near(end.x,target.x);near(end.y,target.y);near(end.z,target.z);
  const game=new FishingGame([]);game.cast(target,arc);near(game.castArc,arc);assert.equal(game.phase,'casting');
  game.update(CAST_DURATION+.01,false);assert.equal(game.phase,'waiting');
  game.cancel();assert.equal(game.target,null);
}
// Dry inland casts fail, and all accepted near-shore flights clear the terrain.
assert.equal(castTarget({x:CABIN.x,y:CABIN.y,z:CABIN.z},0,0),null);
for(const degrees of [-45,0,30,45,65])for(const yaw of [0,Math.PI/2,Math.PI]){
  const start={x:DOCK.x,y:DOCK.y,z:78},pitch=rad(degrees),target=castTarget(start,yaw,pitch);
  if(!target)continue;
  const distance=Math.hypot(target.x-start.x,target.z-start.z);assert(distance<=castRange(pitch)+1e-8);
  assert(terrainHeight(target.x,target.z)<=-1);
  for(let i=1;i<24;i++){
    const p=castFlightPoint({...start,y:start.y+1.65},target,i/24,castArcHeight(pitch,distance));
    assert(terrainHeight(p.x,p.z)<=p.y-.15);
  }
}
assert.equal(castTarget(origin,NaN,0),null);
console.log('PASS: exact 45-degree maximum; shorter low/high casts; camera-relative headings; shared visible/obstruction trajectory; land rejection and fishing lifecycle.');
