import * as T from 'three';
import {createMarineCreature} from './island-original-marine';
import {MARINE_SPECIES} from './island-marine-roster';
import {safeSwimRoute,routePosition} from './island-assets';
import {groundHeight,waterHeight,clamp,random} from './island-world';
import {hookStrugglePose} from './island-hook-struggle';
import {fishMouthOffset} from './island-hook';
import {waterPath,type FishAgent} from './island-fishing';
export {MARINE_SPECIES} from './island-marine-roster';

export function addMarinePopulation(scene:T.Scene,lowPower:boolean,onFish:(f:FishAgent)=>void,animations:{update:(dt:number,time:number)=>void}[]){
  // Restore every species, not just a sample. Two animals per species matches
  // the old desktop population; mobile reduces copies, never the species list.
  MARINE_SPECIES.forEach((spec,index)=>{for(let copy=0;copy<(lowPower?1:2);copy++){
    const actor=createMarineCreature(spec.kind,lowPower?'medium':'high'),root=actor.root;root.name=`original-${spec.kind}-${copy}`;root.userData.legacySpecies=spec.legacyId;root.scale.setScalar(spec.length);scene.add(root);
    const bounds=new T.Box3().setFromObject(root).getSize(new T.Vector3()),clearance=Math.max(.08,bounds.y*.53);
    const offshore=spec.habitat==='pelagic'||spec.habitat==='deep',seabed=spec.habitat==='seabed'||spec.habitat==='deep';
    const route=safeSwimRoute(index*2+copy,offshore,clearance),start=routePosition(route,0),rng=random(891+index*53+copy);
    root.position.set(start.x,route.y,start.z);const goal=root.position.clone(),delta=new T.Vector3();let nextGoal=0;
    const hookAnchor=new T.Vector3(),nose=new T.Vector3(),centre=new T.Vector3(),hookMouth=new T.Vector3();
    const fightRotation=new T.Euler(0,0,0,'YXZ');
    let fighting=false,fightYaw=0;
    const agent:FishAgent={id:root.name,name:spec.name,position:root.position,target:null,caught:false,catchable:spec.catchable,clearance,length:spec.length,value:spec.value,weight:Number((spec.length**2*1.1).toFixed(2)),landing:null,mouthLocal:root.userData.mouthLocal,rotation:root.rotation};
    const update=(dt:number,time:number)=>{
      if(time<0){actor.dispose();return;}root.visible=!agent.caught||!!agent.landing;if(!root.visible)return;
      const struggle=agent.struggle&&!agent.caught?hookStrugglePose(agent.struggle,spec.length):null;
      actor.update(time+index+copy,struggle?.speed??(agent.landing?1.8:agent.target?1.4:1));
      if(agent.landing){const p=agent.landing;root.position.set(p.position.x,p.position.y,p.position.z);root.rotation.set(p.pitch,p.yaw,p.roll);return;}
      if(agent.injured){agent.injuryTime=(agent.injuryTime??0)+dt;agent.target=null;if(agent.injuryTime>12)agent.injured='dead';const alive=agent.injured==='struggling';root.position.y=T.MathUtils.damp(root.position.y,-clearance-.06,1.4,dt);root.rotation.z=T.MathUtils.damp(root.rotation.z,Math.PI/2+(alive?Math.sin(time*17)*.22:Math.sin(time)*.02),5,dt);if(alive)root.rotation.y+=Math.sin(time*15)*dt*.65;actor.update(alive?time:0,alive?2:0);return;}
      if(struggle){
        if(!fighting){
          fighting=true;fightYaw=root.rotation.y;
          fishMouthOffset(agent,nose).applyEuler(root.rotation);hookAnchor.copy(root.position).add(nose);
        }
        if(agent.reelTarget){
          delta.set(agent.reelTarget.x-hookAnchor.x,0,agent.reelTarget.z-hookAnchor.z);
          if(delta.lengthSq()>.0001){
            const heading=Math.atan2(delta.x,delta.z);
            fightYaw+=Math.atan2(Math.sin(heading-fightYaw),Math.cos(heading-fightYaw))*(1-Math.exp(-dt*4));
            delta.clampLength(0,5*dt);hookAnchor.add(delta);
          }
        }
        root.quaternion.setFromEuler(fightRotation.set(struggle.pitch-(agent.reelTarget ? .18 : 0),fightYaw+struggle.yaw,struggle.roll));
        fishMouthOffset(agent,nose).applyEuler(root.rotation);
        // The dorsal body breaks the surface: deep seabed water must not hide a retrieve.
        if(agent.reelTarget)hookAnchor.y=T.MathUtils.damp(hookAnchor.y,waterHeight(hookAnchor.x,hookAnchor.z,time)+nose.y-clearance*.35,4,dt);
        // Keep the nose at the hook while the body and tail thrash behind it.
        centre.copy(hookAnchor).add(new T.Vector3(struggle.tugX,struggle.bob,struggle.tugZ)).sub(nose);
        const bed=groundHeight(centre.x,centre.z);
        if(bed<-clearance*2-.4&&(!agent.reelTarget||waterPath(root.position,centre,clearance))){
          centre.y=clamp(centre.y,bed+clearance+.1,waterHeight(centre.x,centre.z,time)-(agent.reelTarget ? clearance*.12 : clearance+.12));
          root.position.copy(centre);
        }else hookAnchor.copy(root.position).add(nose);
        hookMouth.copy(root.position).add(nose);agent.mouth=hookMouth;return;
      }
      if(fighting)root.rotation.set(0,fightYaw,0);
      fighting=false;agent.mouth=null;
      if(time>nextGoal&&!agent.target){nextGoal=time+3+rng()*5;for(let a=0;a<12;a++){const p={x:route.x+(rng()-.5)*route.rx*1.6,y:route.y,z:route.z+(rng()-.5)*route.rz*1.6};if(waterPath(root.position,p,clearance)){goal.set(p.x,p.y,p.z);break;}}}
      const destination=agent.target??goal;delta.set(destination.x-root.position.x,0,destination.z-root.position.z);
      const distance=delta.length(),speed=agent.target?2.3:seabed?.25:spec.kind==='shark'?2.2:.55+spec.length*.6;
      const move=Math.min(1,speed*dt/Math.max(.001,distance)),nx=root.position.x+delta.x*move,nz=root.position.z+delta.z*move,bed=groundHeight(nx,nz);
      if(bed<-clearance*2-.4){root.position.x=nx;root.position.z=nz;root.position.y=seabed&&!agent.target?bed+clearance:clamp(T.MathUtils.damp(root.position.y,destination.y+Math.sin(time*.7+index)*.06,3,dt),bed+clearance+.1,-clearance-.22);}
      else nextGoal=0;
      if(distance>.03){const yaw=Math.atan2(delta.x,delta.z);root.rotation.y+=Math.atan2(Math.sin(yaw-root.rotation.y),Math.cos(yaw-root.rotation.y))*Math.min(1,dt*3);}
      root.rotation.z=seabed?0:Math.sin(time+copy)*.025;
      root.rotation.x=T.MathUtils.damp(root.rotation.x,0,8,dt);
    };update(0,0);animations.push({update});onFish(agent);
  }});
}
