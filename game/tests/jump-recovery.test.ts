import assert from 'node:assert/strict';
import {IslandDay} from '../lib/island-day-cycle';
import {IslandPhysics,createBody} from '../lib/island-physics';
import {GAME_HUD,GAME_DIALOG,returnPointerFocusToGame} from '../lib/island-hud-focus';

// Sleep can finish between frames. It must clear the timer exactly, not leave a
// negative truthy value that blocks jumping (and pet care) for the whole visit.
for (const fps of [20,30,60,144]) {
  const day=new IslandDay(),wallet={coins:250};let mornings=0;
  const physics=new IslandPhysics([],()=>10,()=>false),body=createBody();
  Object.assign(body,{x:0,z:0,y:10,peak:10});
  for (let visit=0;visit<3;visit++) {
    day.energy=12;
    assert(day.sleep());assert(!day.sleep(),'cannot start a second overlapping sleep');
    assert(day.snapshot().sleeping);
    for(let frame=0;day.sleeping>0;frame++) {
      assert(frame<1000,'sleep must complete');
      day.update(1/fps,0,wallet,()=>mornings++);
      assert(day.sleeping>=0,'sleep never leaves a negative timer');
    }
    assert.equal(day.sleeping,0);
    assert.equal(day.snapshot().sleeping,false);
    assert.equal(day.energy,100);
    assert.equal(wallet.coins,250,'sleep is still free');
    assert.equal(mornings,visit+1,'one morning per sleep');
    // The engine uses this same rest/energy gate before physics.jump().
    assert(!day.exhausted&&!day.sleeping);
    assert(physics.jump(body),'jump is available after resting');
    assert(!physics.jump(body),'no extra mid-air jump');
    let peak=body.y;
    for(let frame=0;frame<fps;frame++) {
      physics.update(body,0,0,1/fps,true);
      peak=Math.max(peak,body.y);
    }
    assert(peak>10.8);assert(body.grounded);assert.equal(body.health,100);
    day.update(1/fps,0,wallet,()=>mornings++);
    assert.equal(mornings,visit+1,'waking does not advance the day twice');
  }
  day.energy=.001;day.update(.1,1,wallet,()=>{});
  assert(day.exhausted);assert(!day.sleep(),'exhaustion still requires reload');
}

// The helper acts only on pointer-triggered HUD buttons, not keyboard clicks,
// editable fields, or shop/care dialogs. Browser QA also checks actual DOM focus.
let focused=0;
const canvas={focus:(options?:FocusOptions)=>{assert.equal(options?.preventScroll,true);focused++;}};
function target({hud=true,dialog=false,disabled=false,button=true}={}) {
  const element={hasAttribute:(name:string)=>name==='disabled'&&disabled,
    closest:(selector:string):Element|null=>((selector==='button'&&button)||(selector===GAME_HUD&&hud)||(selector===GAME_DIALOG&&dialog))?element as unknown as Element:null};
  return element;
}
assert(returnPointerFocusToGame(target(),1,canvas));
assert(returnPointerFocusToGame(target(),2,canvas));
assert.equal(focused,2);
for(const args of [
  [target(),0,canvas], [target({dialog:true}),1,canvas],
  [target({hud:false}),1,canvas], [target({disabled:true}),1,canvas],
  [target({button:false}),1,canvas], [null,1,canvas], [target(),1,null],
] as const) assert(!returnPointerFocusToGame(args[0],args[1],args[2]));
assert.equal(focused,2,'do not steal menu or keyboard focus');
console.log('PASS: sleep recovery and repeated jumps at 20/30/60/144 FPS; free sleep, exhaustion, no double jumps; pointer-only HUD focus with protected menus and keyboard controls.');
