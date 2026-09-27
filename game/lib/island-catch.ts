import * as T from 'three';
import { CATCH_LIFT_DURATION, type FishingGame, type LandingPose, type Point } from './island-fishing';
import { clamp, smooth, terrainHeight, waterHeight } from './island-world';
import {landedMouth} from './island-hook';

// Move the same swimming model through a continuous lift, arc and hanging pose.
export function catchPose(from: Point, to: Point, progress: number, yaw: number): LandingPose {
  const p = clamp(progress, 0, 1), travel = smooth(0, .68, p), hang = smooth(.45, .75, p);
  const distance = Math.hypot(to.x - from.x, to.z - from.z);
  const swing = Math.sin(p * 26) * .075 * hang;
  // Apply pitch in the fish's local frame; XYZ pitch reverses at half the compass headings.
  const rotation=new T.Euler().setFromQuaternion(new T.Quaternion().setFromEuler(new T.Euler(
    -smooth(0,.58,p)*Math.PI/2+Math.sin(p*61)*.07*hang,
    yaw+.4+Math.sin(p*22)*.2*hang,Math.sin(p*47)*.13*smooth(0,.3,p),'YXZ',
  )));
  return {
    position: {
      x: T.MathUtils.lerp(from.x, to.x, travel) + Math.cos(yaw) * swing,
      y: T.MathUtils.lerp(from.y, to.y, travel) + Math.sin(travel * Math.PI) * (.95 + distance * .075) + Math.sin(p * 38) * .025 * hang,
      z: T.MathUtils.lerp(from.z, to.z, travel) - Math.sin(yaw) * swing,
    },
    pitch:rotation.x,yaw:rotation.y,roll:rotation.z,
  };
}

/** Blend the landing model into the exact carried pose, including camera pitch. */
export function catchHandoff(pose:LandingPose,to:LandingPose,progress:number):LandingPose {
  const t=smooth(.76,1,progress),a=new T.Quaternion().setFromEuler(new T.Euler(pose.pitch,pose.yaw,pose.roll));
  a.slerp(new T.Quaternion().setFromEuler(new T.Euler(to.pitch,to.yaw,to.roll)),t);
  const rotation=new T.Euler().setFromQuaternion(a);
  return {position:{x:T.MathUtils.lerp(pose.position.x,to.position.x,t),y:T.MathUtils.lerp(pose.position.y,to.position.y,t),z:T.MathUtils.lerp(pose.position.z,to.position.z,t)},pitch:rotation.x,yaw:rotation.y,roll:rotation.z};
}

export function createCatchAnimation(scene: T.Scene) {
  const effects = new T.Group(); effects.name = 'catch-splash'; effects.visible = false; scene.add(effects);
  const sprayMaterial = new T.MeshBasicMaterial({ color: '#d4fff4', transparent: true, opacity: .85, depthWrite: false });
  const spray = new T.InstancedMesh(new T.IcosahedronGeometry(.042, 0), sprayMaterial, 18); spray.frustumCulled = false; effects.add(spray);
  const ringMaterial = new T.MeshBasicMaterial({ color: '#e5fff4', transparent: true, opacity: .8, depthWrite: false, side: T.DoubleSide });
  const ringGeometry = new T.RingGeometry(.8, 1, 40);
  const rings = [0, 1].map(() => { const ring = new T.Mesh(ringGeometry, ringMaterial); ring.rotation.x = -Math.PI / 2; effects.add(ring); return ring; });
  const dummy = new T.Object3D(), destination = new T.Vector3(), mouth = new T.Vector3();
  const startRotation=new T.Quaternion(),poseRotation=new T.Quaternion(),rotation=new T.Euler();
  let activeId: string | null = null, splashAge = 2, splashed = false, facing = 0, previousY = 0;
  return {
    mouth,
    update(game: FishingGame, player: Point, yaw: number, dt: number, time: number, handoff:LandingPose|null=null) {
      const fish = game.phase === 'landing' ? game.selected : null;
      if (!fish || !game.landingFrom) { activeId = null; effects.visible = false; return false; }
      if (activeId !== fish.id) {
        activeId = fish.id; facing = yaw; splashAge = 2; splashed = false; previousY = game.landingFrom.y;
        startRotation.setFromEuler(new T.Euler(fish.landing?.pitch??0,fish.landing?.yaw??yaw,fish.landing?.roll??0));
        destination.set(player.x - Math.sin(yaw) * 2.3 - Math.cos(yaw) * .25, player.y + 1.18, player.z - Math.cos(yaw) * 2.3 + Math.sin(yaw) * .25);
        destination.y = Math.max(destination.y, terrainHeight(destination.x, destination.z) + (fish.length ?? 1) * .5 + .2);
      }
      const progress=1-game.timer/CATCH_LIFT_DURATION;
      let pose = catchPose(game.landingFrom, destination, progress, facing);
      poseRotation.copy(startRotation).slerp(new T.Quaternion().setFromEuler(rotation.set(pose.pitch,pose.yaw,pose.roll)),smooth(0,.25,progress));
      rotation.setFromQuaternion(poseRotation);pose.pitch=rotation.x;pose.yaw=rotation.y;pose.roll=rotation.z;
      if(handoff)pose=catchHandoff(pose,handoff,progress);
      fish.landing = pose;
      // Attach the line to the raised nose, not the float or the fish's centre.
      landedMouth(fish,pose,mouth);
      const surface = waterHeight(pose.position.x, pose.position.z, time);
      if (!splashed && previousY <= surface && pose.position.y > surface) {
        splashed = true; splashAge = 0; effects.position.set(pose.position.x, surface + .035, pose.position.z);
      }
      previousY = pose.position.y;
      splashAge += dt; effects.visible = splashAge < 1.05;
      if (effects.visible) {
        const age = splashAge;
        effects.position.y = waterHeight(effects.position.x, effects.position.z, time) + .035;
        for (let i = 0; i < spray.count; i++) {
          const angle = i * 2.39996, speed = .55 + (i % 5) * .2;
          dummy.position.set(Math.cos(angle) * age * speed, Math.max(0, (.9 + i % 4 * .2) * age - 2.1 * age * age), Math.sin(angle) * age * speed);
          dummy.scale.setScalar(Math.max(.01, 1 - age)); dummy.updateMatrix(); spray.setMatrixAt(i, dummy.matrix);
        }
        spray.instanceMatrix.needsUpdate = true; sprayMaterial.opacity = Math.max(0, .9 - age);
        rings.forEach((ring, i) => { ring.position.y = .005 + i * .005; ring.scale.setScalar(.18 + age * (1.2 + i * .5)); });
        ringMaterial.opacity = Math.max(0, .8 * (1 - age));
      }
      return true;
    },
  };
}
