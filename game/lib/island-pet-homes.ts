import * as T from 'three';
import {AVIARY,InstalledHomes,birdPassage,habitatLayout,type PetHome} from './island-home-layout';
import {isPet,isAquaticPet,isPelican,canonicalPetId,petRoster,type ShopSnapshot} from './island-shop';
import {ownedTier,expansionArea,SEA_BREEDING,type SeaBrood,type HomeTiers,type HomeExpansions} from './island-habitat-types';
import type {IslandPhysics,Body} from './island-physics';
import {PetBehaviour} from './island-pet-motion';
import {loadPetAnimationAsset,createPetAnimation,type PetAnimationAsset} from './island-pet-animation';
import {createFamilyHome} from './island-family-home';
import type {FamilyBrood} from './island-family-layout';
import {buildHabitat} from './island-habitat-model';
import type {SeaCareTarget} from './island-sea-care';
import {keeperTrainer} from './island-expansion-models';
import type {PelicanMealTarget} from './island-menhaden-feeding';
import {seaSwimPoint,SeaResting} from './island-sea-pet-motion';

export function addPetHomes(scene:T.Scene,physics:IslandPhysics,disposed:()=>boolean,built:Set<PetHome>&{tiers?:HomeTiers;homeExpansions?:HomeExpansions}=new InstalledHomes()){
  const root=new T.Group();root.name='shared-pet-homes';scene.add(root);
  const groups={birds:new T.Group(),sea:new T.Group()};for(const home of ['birds','sea'] as const){groups[home].name=home+'-purchased-home';groups[home].visible=false;root.add(groups[home]);}
  const habitats={birds:buildHabitat('birds','prime',physics),sea:buildHabitat('sea','prime',physics)};
  for(const home of ['birds','sea'] as const){groups[home].add(habitats[home].root);habitats[home].setEnabled(false);}
  const family=createFamilyHome(scene,physics,disposed),models=new Map<string,PetAnimationAsset>();
  type Resident={animation:ReturnType<typeof createPetAnimation>;brain:PetBehaviour;rest:SeaResting;feeding?:boolean};
  const trainer=keeperTrainer();trainer.visible=false;scene.add(trainer);
  const residents=new Map<string,Resident>(),away=new Set<string>();
  let state:ShopSnapshot|undefined,baby:ReturnType<typeof createPetAnimation>|null=null,babySpecies='';
  const place=(resident:Resident,home:PetHome)=>{
    const h=habitats[home].layout,p=resident.brain.position,o=resident.animation.root;
    resident.brain.apply(o);
    if(home==='sea')o.position.copy(seaSwimPoint(p,h.tier,h.extraArea));
    else{const s=h.s*(h.tier==='basic'?.64:1);o.position.set(h.x+(p.x-AVIARY.x)*s,h.y+(h.tier==='basic'?.11:(p.y-AVIARY.y)*Math.min(1.3,h.s)),h.z+(p.z-AVIARY.z)*s);}
  };
  const clearBaby=()=>{if(baby){baby.root.removeFromParent();baby.dispose();baby=null;babySpecies='';}};
  return {root,groups,built,family,trainer,trainerLayout:()=>habitats.sea.layout,
    get gates(){return {birds:habitats.birds.gate,sea:habitats.sea.gate};},
    passage:()=>birdPassage(built),
    borrowBird(id:string){const r=residents.get(id);if(!r||r.feeding||isAquaticPet(id)||away.has(id)||state?.familyBrood?.parents.includes(id))return null;away.add(id);scene.attach(r.animation.root);return r.animation;},
    returnBird(id:string){const r=residents.get(id);if(!r)return;away.delete(id);groups.birds.attach(r.animation.root);r.animation.root.scale.setScalar(1.25);place(r,'birds');},
    mealTarget(id:string):PelicanMealTarget|null{
      const r=residents.get(id);if(!r||!isPelican(id)||away.has(id)||state?.familyBrood?.parents.includes(id)||!built.has('birds'))return null;
      return {id,root:r.animation.root,ready:()=>!r.brain.flying&&r.brain.action!=='hop'&&(r.brain.pose.flight??0)<.08,
        requestLanding:()=>r.brain.feed(),hold:held=>{r.feeding=held;},
        pose:(peck,gulp)=>{r.animation.animate({...r.brain.pose,gait:0,flight:0,look:0,preen:0,peck,gulp},0);r.animation.root.updateMatrixWorld(true);},
        dropPoint:()=>{const h=habitats.birds.layout;r.animation.root.updateWorldMatrix(true,false);const p=r.animation.root.localToWorld(new T.Vector3(0,0,.30));p.y=h.y+.07;p.x=T.MathUtils.clamp(p.x,h.x-h.rx+.2,h.x+h.rx-.2);p.z=T.MathUtils.clamp(p.z,h.z-h.rz+.2,h.z+h.rz-.2);return p;},
        mouth:()=>{r.animation.root.updateMatrixWorld(true);return (r.animation.root.getObjectByName('pelican-bill-tip')??r.animation.root).getWorldPosition(new T.Vector3());}
      };
    },
    seaTarget(id:string):SeaCareTarget|null{const r=residents.get(id);if(!r||!isAquaticPet(id)||!built.has('sea'))return null;return {id,root:r.animation.root,bounds:habitats.sea.layout,hold:v=>{r.feeding=v;if(!v){const h=habitats.sea.layout,p=r.animation.root.position,left=h.x-h.rx*(h.shore?.12:.70),right=h.x+h.rx*.72;r.brain.position.set(-58.1+T.MathUtils.clamp((p.x-left)/(right-left),0,1)*10.1,p.y,74.8+T.MathUtils.clamp((p.z-h.z)/Math.max(.6,h.rz-1.2),-1,1)*2.5);r.rest=new SeaResting(id);}},pose:(t,effort)=>{r.animation.animate({...r.brain.pose,gait:effort,swim:Math.sin(t*(4+effort*3)),peck:0,look:0},1/60);}};},
    installed:(home:PetHome)=>built.has(home),
    gateState:()=>({birds:built.has('birds')&&habitats.birds.gate.open,sea:built.has('sea')&&habitats.sea.gate.open}),
    toggleGate:(home:PetHome)=>built.has(home)?habitats[home].gate.toggle():false,
    async prepare(ids:string[]){await Promise.all([family.prepare(ids),...[...new Set(ids.filter(isPet).map(canonicalPetId))].map(async id=>{if(!models.has(id))models.set(id,await loadPetAnimationAsset(id));})]);},
    apply(s:ShopSnapshot){
      for(const home of ['birds','sea'] as const){
        const tier=ownedTier(s,home),extra=expansionArea(s,home);built.tiers??={};built.homeExpansions??={};built.homeExpansions[home]=extra;if(tier){built.add(home);built.tiers[home]=tier;}else{built.delete(home);delete built.tiers[home];}
        if(tier&&(habitats[home].layout.tier!==tier||habitats[home].layout.extraArea!==extra)){const gateOpen=habitats[home].gate.open;habitats[home].dispose();habitats[home]=buildHabitat(home,tier,physics,extra);if(gateOpen)habitats[home].gate.toggle();groups[home].add(habitats[home].root);residents.forEach((r,id)=>{if((isAquaticPet(id)?'sea':'birds')===home){r.rest=new SeaResting(id);if(!away.has(id))place(r,home);}});}
        groups[home].visible=!!tier;habitats[home].setEnabled(!!tier);
      }
      for(const {id,species} of petRoster(s)){
        const home=isAquaticPet(species)?'sea':'birds';if(!built.has(home))continue;
        if(!residents.has(id)){const source=models.get(species);if(!source||disposed())continue;const animation=createPetAnimation(source,species),brain=new PetBehaviour(species,id),resident={animation,brain,rest:new SeaResting(id)};
          animation.root.name='resident-'+id;animation.root.scale.setScalar(species==='pet-sea-lion'?2.5:isAquaticPet(species)?3:1.25);groups[home].add(animation.root);residents.set(id,resident);place(resident,home);
        }
        const r=residents.get(id)!;if((s.petMeals?.[id]??0)>(state?.petMeals?.[id]??0))r.brain.feed();
        if(s.familyBrood?.parents.includes(id)){if(r.animation.root.parent!==family.root)family.root.attach(r.animation.root);}
        else if(r.animation.root.parent===family.root){groups[home].attach(r.animation.root);place(r,home);}
      }
      trainer.visible=s.owned.includes('trainer')&&built.has('sea');
      family.apply(s,s.familyBrood?models.get(s.familyBrood.species):undefined);
      if(!s.seaBrood)clearBaby();
      state=s;
    },
    ensureTransferGates(){if(!habitats.birds.gate.open)habitats.birds.gate.toggle();if(!family.gate.open)family.gate.toggle();},
    transferReady:()=>habitats.birds.gate.ready&&family.gate.ready,
    update(time:number,dt=1/60,body?:Body,brood?:FamilyBrood|null,seaBrood?:SeaBrood|null){
      for(const home of ['birds','sea'] as const)if(built.has(home))habitats[home].gate.update(dt,body);
      const neighbours=[...residents].filter(([id])=>!away.has(id)&&!state?.familyBrood?.parents.includes(id)).map(([id,r])=>({id,position:r.brain.position}));
      residents.forEach((r,id)=>{const home=r.brain.sea?'sea':'birds';if(away.has(id)||state?.familyBrood?.parents.includes(id)||!built.has(home))return;
        const h=habitats[home].layout,canonicalBody=body&&home==='birds'?{...body,x:AVIARY.x+(body.x-h.x)/h.s,z:AVIARY.z+(body.z-h.z)/h.s}:undefined;
        if(r.feeding&&home==='sea')return;
        if(!r.feeding)r.brain.update(dt,neighbours,canonicalBody);place(r,home);const pose={...r.brain.pose};
        if(home==='birds'&&h.tier==='basic'){pose.flight=0;pose.gait=.25;}
        if(home==='sea')r.rest.update(dt,h.tier,r.animation.root,r.animation.root.position.clone(),pose,canonicalPetId(id)==='pet-sea-lion',h.extraArea);
        r.animation.animate(pose,dt);
      });
      if(state)family.update(time,dt,{...state,familyBrood:brood===undefined?state.familyBrood:brood},(state.familyBrood?.parents??[]).map(id=>residents.get(id)!.animation),body,birdPassage(built));
      const sea=seaBrood===undefined?state?.seaBrood:seaBrood;
      if(sea&&sea.elapsed>=SEA_BREEDING.birth){const source=models.get(sea.species),parent=residents.get(sea.parents[0]);
        if(source&&parent){if(!baby||babySpecies!==sea.species){clearBaby();baby=createPetAnimation(source,sea.species);babySpecies=sea.species;baby.root.name='sea-family-baby';groups.sea.add(baby.root);baby.root.position.copy(parent.animation.root.position);}
          const growth=T.MathUtils.clamp((sea.elapsed-SEA_BREEDING.birth)/(SEA_BREEDING.grown-SEA_BREEDING.birth),0,1),size=sea.species==='pet-dolphin'?3:2.5;
          baby.root.scale.setScalar(size*(.28+growth*.66));const adult=parent.animation.root,tail=new T.Vector3(-Math.sin(adult.rotation.y),0,-Math.cos(adult.rotation.y)).multiplyScalar(.7+growth*.7);const target=adult.position.clone().add(tail);target.y+=Math.sin(time*2.5)*.07;const bounds=habitats.sea.layout;target.x=T.MathUtils.clamp(target.x,bounds.x-bounds.rx+.8,bounds.x+bounds.rx-.8);target.z=T.MathUtils.clamp(target.z,bounds.z-bounds.rz+.8,bounds.z+bounds.rz-.8);baby.root.position.lerp(target,1-Math.exp(-2.5*dt));baby.root.rotation.copy(adult.rotation);baby.animate({...parent.brain.pose,gait:.65,swim:Math.sin(time*6),breath:Math.sin(time*2)},dt);
        }
      }else if(!sea)clearBaby();
    },
    residentCount:()=>residents.size,
    dispose(){const materials=new Set<T.Material>();trainer.traverse(o=>{if(o instanceof T.Mesh){o.geometry.dispose();(Array.isArray(o.material)?o.material:[o.material]).forEach(m=>materials.add(m));}});materials.forEach(m=>m.dispose());trainer.removeFromParent();residents.forEach(p=>p.animation.dispose());clearBaby();family.dispose();},
  };
}
