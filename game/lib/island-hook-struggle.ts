import type {HookStruggle} from './island-fishing';

/** Bursts, not a constant spin. All offsets are absolute, so they cannot drift. */
export function hookStrugglePose(state:HookStruggle,length=1){
  const t=Math.max(0,state.elapsed),strength=Math.max(0,Math.min(1.35,state.strength));
  const onset=1-Math.exp(-t*12),burst=.55+.45*Math.sin(t*3.4+.5)**4;
  const effort=onset*burst*strength,beat=t*(16+2/Math.max(.5,length));
  return {
    yaw:Math.sin(beat)*.52*effort+Math.sin(t*7.1)*.12*effort,
    pitch:Math.sin(beat*.73)*.13*effort,
    roll:Math.sin(beat*.91+.6)*.30*effort,
    tugX:Math.sin(t*8.4)*.07*effort,
    tugZ:Math.cos(t*6.7)*.045*effort,
    bob:Math.sin(beat*.82)*.04*effort,
    speed:1.4+effort*1.35,
    effort,
  };
}
