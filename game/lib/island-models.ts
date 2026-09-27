import * as T from 'three';
import {RODS,seafoodSpec,bundleSpec} from './island-expansion-types';
import {expansionDisplay} from './island-expansion-models';
import {menhadenModel} from './island-menhaden-model';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js';
import { MTLLoader } from 'three/examples/jsm/loaders/MTLLoader.js';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js';
import { careModel } from './island-care-models';
import { boatSpec } from './island-boats';
import { isPetHome } from './island-home-layout';
import { petHomeDisplay } from './island-home-models';
import {isOutfit} from './island-water';
import {outfitDisplay} from './island-outfits';
import {loadSpeargunAsset} from './island-speargun-model';
import {birdToolModel,isBirdTool} from './island-bird-tools';
import {isSpeargun} from './island-speargun-types';
import {isFamilyItem} from './island-family-layout';
import {familyFurniture} from './island-family-models';
import {createBoatCraft,isCraftBoat} from './island-boat-craft';

// Preserve supplied colours/textures while removing wildly different export units.
export function normalizeModel(source: T.Object3D): T.Group {
  source.updateMatrixWorld(true);
  const result = new T.Group();
  source.traverse(o => {
    if (!(o instanceof T.Mesh)) return;
    const geometry = o.geometry.clone().applyMatrix4(o.matrixWorld);
    const materials = (Array.isArray(o.material) ? o.material : [o.material]).map(m => {
      const old = m as T.MeshStandardMaterial;
      const mat = new T.MeshStandardMaterial({ color: old.color ?? '#ffffff', map: old.map, roughness: .78, metalness: old.metalness ?? 0, transparent: old.transparent, opacity: old.opacity, side: T.DoubleSide, vertexColors: old.vertexColors });
      mat.name = m.name; return mat;
    });
    // Material arrays render only indexed geometry groups; ungrouped imports need one material.
    const model = new T.Mesh(geometry, Array.isArray(o.material) ? materials : materials[0]); model.castShadow = true; model.receiveShadow = true; result.add(model);
  });
  const box = new T.Box3().setFromObject(result), size = box.getSize(new T.Vector3()), center = box.getCenter(new T.Vector3());
  const scale = 1 / Math.max(size.x, size.y, size.z);
  if (!Number.isFinite(scale)) throw new Error('The model has no usable geometry.');
  result.children.forEach(o => { const m = o as T.Mesh; m.geometry.translate(-center.x, -box.min.y, -center.z); m.geometry.scale(scale, scale, scale); });
  return result;
}
const prototypes = new Map<string, Promise<T.Group>>();
const boatParts = new Map<string, Promise<T.Group>>();
async function loadBoatPart(file: string): Promise<T.Group> {
  let pending = boatParts.get(file);
  if (!pending) {
    pending = (async () => {
      // FBX geometries finish before their texture requests. Stock is ready only
      // after the supplied PolyPackBoats atlas has loaded as well.
      const manager = new T.LoadingManager();
      const failures: string[] = [];
      const texturesReady = new Promise<void>(resolve => { manager.onLoad = resolve; });
      manager.onError = url => { failures.push(url); };
      const source = await new FBXLoader(manager).loadAsync(`/models/shop/${file}`);
      await texturesReady;
      if (failures.length) throw new Error(`Boat textures could not load: ${file}`);
      return normalizeModel(source);
    })();
    boatParts.set(file, pending);
    pending.catch(() => boatParts.delete(file));
  }
  return (await pending).clone(true);
}
// Sailing needs a full-sized hull without the static shop paddle arrangement.
export async function loadSailingHull(id:string){
  const spec=boatSpec(id);return spec?loadBoatPart(spec.model):loadIslandModel(id);
}
async function loadPackedBoat(id: string) {
  const boat = boatSpec(id)!;
  const hull = await loadBoatPart(boat.model);
  if (boat.paddle) {
    const paddle = await loadBoatPart(boat.paddle === 'rowing' ? 'Paddle.fbx' : 'KayakPaddle.fbx');
    const height = new T.Box3().setFromObject(hull).max.y;
    if (boat.paddle === 'rowing') {
      for (const side of [-1, 1]) {
        const oar = paddle.clone(true); oar.name = 'included-rowing-oar';
        oar.scale.setScalar(.66); oar.position.set(side * .105, height * .72, -.025);
        oar.rotation.y = side * .07; hull.add(oar);
      }
    } else {
      paddle.name = 'included-kayak-paddle'; paddle.scale.setScalar(.72);
      paddle.position.set(0, height * .82, -.08); paddle.rotation.y = Math.PI * .36;
      hull.add(paddle);
    }
  }
  return hull;
}
export async function loadIslandModel(id: string): Promise<T.Group> {
  if(isCraftBoat(id))return normalizeModel(createBoatCraft(id));
  if(id==='trainer'||seafoodSpec(id)||bundleSpec(id))return normalizeModel(expansionDisplay(id));
  if(RODS.some(r=>r.id===id)){let cached=prototypes.get(id);if(!cached){cached=(async()=>{const raw=await new OBJLoader().loadAsync('/models/shop/'+RODS.find(r=>r.id===id)!.file);raw.traverse(o=>{if(o instanceof T.Mesh){const map=(m:T.Material)=>new T.MeshStandardMaterial({name:m.name,color:({Wood:'#65513b',Metal:'#acb9bc',Black:'#1d262d',Red:'#9b302a',Gold:'#b49348'} as Record<string,string>)[m.name]??'#606c70',metalness:m.name==='Metal'||m.name==='Gold'?.7:.12,roughness:.38});o.material=Array.isArray(o.material)?o.material.map(map):map(o.material);}});return normalizeModel(raw);})();prototypes.set(id,cached);cached.catch(()=>prototypes.delete(id));}return (await cached).clone(true);}
  if(id==='menhaden'){const model=menhadenModel();const wrapper=new T.Group(),box=new T.Box3().setFromObject(model);model.position.y=-box.min.y;wrapper.add(model);return wrapper;}
  if(isBirdTool(id))return normalizeModel(birdToolModel(id));
  if(isOutfit(id))return normalizeModel(outfitDisplay(id));
  if(isSpeargun(id))return normalizeModel((await loadSpeargunAsset(id)).scene);
  if(isFamilyItem(id))return id==='family-aviary'?petHomeDisplay('bird-home'):normalizeModel(familyFurniture(id));
  if(isPetHome(id))return petHomeDisplay(id);
  if(id==='food-can'||id==='seawater')return careModel(id);
  let pending = prototypes.get(id);
  if (!pending) {
    pending = (async () => {
      const base = '/models/shop/'; let source: T.Object3D;
      if (boatSpec(id)) source = await loadPackedBoat(id);
      else if (['hook','net','rowboat','pet-brown-pelican','birds-nest'].includes(id)) {
        const loader = new OBJLoader();
        if (id === 'net') {
          const response = await fetch(`${base}net.mtl`); if (!response.ok) throw new Error('Net material could not load.');
          loader.setMaterials(new MTLLoader().parse(await response.text(), base));
        }
        source = await loader.loadAsync(id==='rowboat'?'/models/harbor-boat.obj':`${base}${id}.obj`);
        if (['pet-brown-pelican','birds-nest'].includes(id)) {
          const map = await new T.TextureLoader().loadAsync(`${base}${id}.png`); map.colorSpace = T.SRGBColorSpace;
          source.traverse(o => { if (o instanceof T.Mesh) o.material = new T.MeshStandardMaterial({ map, color: '#ffffff', roughness: .7 }); });
        } else if (id === 'hook') source.traverse(o => { if (o instanceof T.Mesh) o.material = new T.MeshStandardMaterial({ color: '#b6c4ca', metalness: .65, roughness: .32 }); });
        else if(id==='rowboat')source.traverse(o=>{if(o instanceof T.Mesh)o.material=new T.MeshStandardMaterial({color:'#ac7946',roughness:.85});});
      } else source = (await new GLTFLoader().loadAsync(`${base}${id}.glb`)).scene;
      const result = normalizeModel(source); result.name = id; return result;
    })();
    prototypes.set(id, pending); pending.catch(() => prototypes.delete(id));
  }
  // Clones share immutable buffers and materials; animate transforms, not buffers.
  return (await pending).clone(true);
}
