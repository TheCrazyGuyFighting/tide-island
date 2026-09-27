import assert from 'node:assert/strict';import fs from 'node:fs';import * as T from 'three';
import {GLTFLoader} from 'three/examples/jsm/loaders/GLTFLoader.js';import {OBJLoader} from 'three/examples/jsm/loaders/OBJLoader.js';
import {loadPetAnimationAsset,createPetAnimation,type PetPose} from '../lib/island-pet-animation';
import {PetBehaviour,petPositionSafe} from '../lib/island-pet-motion';import {PETS} from '../lib/island-shop';
GLTFLoader.prototype.loadAsync=async function(url:string){const b=fs.readFileSync(`public${url}`),l=new GLTFLoader();l.register(()=>({name:'TEST_TEXTURES',loadTexture:()=>Promise.resolve(new T.Texture())}));return l.parseAsync(b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength),'');};
OBJLoader.prototype.loadAsync=async function(url:string){return this.parse(fs.readFileSync(`public${url}`,'utf8'));};T.TextureLoader.prototype.loadAsync=async()=>new T.Texture();
const pose:PetPose={gait:1,stride:0,peck:0,preen:0,look:0,flap:0,swim:0,turn:0,breath:0};
function vertices(root:T.Group){root.updateMatrixWorld(true);const points:number[]=[];root.traverse(o=>{if(o instanceof T.SkinnedMesh){for(let i=0;i<o.geometry.getAttribute('position').count;i++){const v=new T.Vector3();o.getVertexPosition(i,v);v.applyMatrix4(o.matrixWorld);points.push(v.x,v.y,v.z);}}});return points;}
for(const {id} of PETS){
  const asset=await loadPetAnimationAsset(id),a=createPetAnimation(asset,id),b=createPetAnimation(asset,id);
  const original=vertices(b.root);a.animate(pose,0);const start=vertices(a.root);assert(start.length>30,id+' needs an actual skinned mesh');
  a.animate({...pose,stride:Math.PI/2,peck:.8,preen:.5,flap:.8,swim:1},.27);const moved=vertices(a.root);
  assert(moved.every(Number.isFinite));assert(moved.some((v,i)=>Math.abs(v-start[i])>.02),id+' must deform, not just translate');
  assert.deepEqual(vertices(b.root),original,id+' instances must have independent skeletons');
  if(id!=='pet-dolphin'&&id!=='pet-sea-lion'){
    const wings=a.root.getObjectByName('unfolding-flight-wings');assert(wings,id+' needs flight wings');
    a.animate({...pose,gait:0,flight:1,flap:-.7},.02);const down=new T.Box3().setFromObject(wings,true);
    a.animate({...pose,gait:0,flight:1,flap:.7},.02);const up=new T.Box3().setFromObject(wings,true);
    assert(wings.visible);assert(!down.isEmpty());assert(down.min.distanceTo(up.min)>.05,'Wingbeats must move actual geometry');
    if(id==='pet-seagull'){assert(asset.flightSource,'Both supplied seagull models are combined');assert(wings.getObjectByName('original-flight-feathers'));}
    a.animate({...pose,flight:0},.02);assert(!wings.visible,'Fold wings away while walking');
  }
  if(id==='pet-dolphin')assert(asset.clips.some(c=>/swim/i.test(c.name)),'Preserve the supplied dolphin swimming clip');
  a.dispose();b.dispose();
}
const brains=PETS.map(p=>new PetBehaviour(p.id)),neighbours=brains.map(b=>({id:b.id,position:b.position})),actions=new Map(brains.map(b=>[b.id,new Set<string>()]));
for(let i=0;i<7200;i++)for(const b of brains){b.update(1/60,neighbours);actions.get(b.id)!.add(b.action);assert(petPositionSafe(b.id,b.position.x,b.position.z,b.position.y),'Keep pets clear of walls, gates, bowl and perches');}
for(const b of brains)assert(actions.get(b.id)!.size>=2,b.id+' must change activity');
const bird=new PetBehaviour('pet-seagull'),old=bird.position.clone();bird.feed();for(let i=0;i<60;i++)bird.update(1/60,[]);assert.equal(bird.action,'peck');assert(bird.position.distanceTo(old)<.01,'Feeding pauses walking');
console.log('PASS: all 10 supplied pets have independent deforming joints; dolphin clip preserved; varied decisions and obstacle-safe steering; feeding stops a bird to eat.');
