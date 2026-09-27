import * as T from 'three';
import {MARINE_PACK_IDS} from './island-marine-roster';
import {naturalSurface} from './island-natural-materials';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js';

import { beam, material, mesh } from './island-landscape';
import { CABIN, DOCK, LAGOON, clamp, coastRadius, dockHeight, groundHeight, random } from './island-world';
import type { FishAgent } from './island-fishing';

type AssetOptions = { scene: T.Scene; handRig: T.Group; thirdRodMount: T.Group; lowPower: boolean; isDisposed: () => boolean; onDoor: (p: T.Group) => void; onBoat: (b: T.Group) => void; onFish?: (f: FishAgent) => void; animations: { update: (dt: number, time: number) => void }[]; onProgress: (v: number, error: string) => void };

// Wildlife roster comes from the explicit legacy-to-upgraded model mapping.
// Menhaden stays in Isla's pelican food stock, separate from catchable wildlife.
export const FISH_SPECIES = MARINE_PACK_IDS;

function brighten(source: T.Material) {
  const old = source as T.MeshPhongMaterial;
  if(source instanceof T.MeshStandardMaterial)return source.clone();
  const color = old.color?.clone() ?? new T.Color('#aaaaaa');
  // FBX diffuse values in these packs are dark; retain each material's hue.
  color.multiplyScalar(2.2);
  return new T.MeshStandardMaterial({ color, roughness: .82, side: T.DoubleSide, name: source.name });
}

// Collapse FBX unit/orientation transforms into geometry. Never replace a
// nested FBX transform with a world-space scale, especially on the held rod.
export function bakeStatic(source: T.Group, size: number, axis: 'x' | 'y' | 'z' = 'y', onlyMaterial?: (name: string) => boolean) {
  source.updateMatrixWorld(true);
  const group = new T.Group();
  source.traverse(o => {
    if (!(o instanceof T.Mesh)) return;
    const geometry = o.geometry.clone().applyMatrix4(o.matrixWorld);
    const materials = (Array.isArray(o.material) ? o.material : [o.material]).map(brighten);
    if (onlyMaterial) {
      const g = geometry.index ? geometry.toNonIndexed() : geometry;
      const selected: number[] = [], outGroups: { start: number; count: number; materialIndex: number }[] = [];
      for (const part of g.groups) {
        const index = part.materialIndex ?? 0;
        if (!onlyMaterial(materials[index].name)) continue;
        const start = selected.length / 3;
        for (let i = part.start; i < part.start + part.count; i++) selected.push(g.attributes.position.getX(i), g.attributes.position.getY(i), g.attributes.position.getZ(i));
        outGroups.push({ start, count: selected.length / 3 - start, materialIndex: index });
      }
      geometry.dispose(); if (g !== geometry) g.dispose();
      const filtered = new T.BufferGeometry(); filtered.setAttribute('position', new T.Float32BufferAttribute(selected, 3)); filtered.groups = outGroups; filtered.computeVertexNormals();
      const m = new T.Mesh(filtered, materials); m.castShadow = true; m.receiveShadow = true; group.add(m);
    } else { const m = new T.Mesh(geometry, materials); m.castShadow = true; m.receiveShadow = true; group.add(m); }
  });
  const box = new T.Box3().setFromObject(group), scale = size / box.getSize(new T.Vector3())[axis];
  const offset = new T.Vector3(-(box.min.x + box.max.x) / 2, -box.min.y, -(box.min.z + box.max.z) / 2);
  group.traverse(o => { if (o instanceof T.Mesh) { o.geometry.translate(offset.x, offset.y, offset.z); o.geometry.scale(scale, scale, scale); } });
  return group;
}

function clipPolygon(poly: T.Vector3[], axis: 'x' | 'y' | 'z', value: number, positive: boolean) {
  const output: T.Vector3[] = [];
  const distance = (p: T.Vector3) => (p[axis] - value) * (positive ? 1 : -1);
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i], b = poly[(i + 1) % poly.length], da = distance(a), db = distance(b);
    if (da >= 0) output.push(a);
    if ((da >= 0) !== (db >= 0)) output.push(a.clone().lerp(b, da / (da - db)));
  }
  return output;
}

// The supplied cabin has a solid wall behind its decorative doorway.
// Subtract an actual opening from those triangles so the player can enter.
export function cutCabinDoor(group: T.Group) {
  const planes: ['x' | 'y' | 'z', number, boolean][] = [['x', -.84, true], ['x', .84, false], ['y', .47, true], ['y', 3.15, false], ['z', 2.7, true], ['z', 5.2, false]];
  group.traverse(o => {
    if (!(o instanceof T.Mesh)) return;
    const g = o.geometry.index ? o.geometry.toNonIndexed() : o.geometry;
    const p = g.attributes.position, buckets = new Map<number, number[]>();
    for (const part of g.groups.length ? g.groups : [{ start: 0, count: p.count, materialIndex: 0 }]) {
      const index = part.materialIndex ?? 0;
      const out = buckets.get(index) ?? []; buckets.set(index, out);
      const append = (poly: T.Vector3[]) => { for (let j = 1; j < poly.length - 1; j++) for (const v of [poly[0], poly[j], poly[j + 1]]) out.push(v.x, v.y, v.z); };
      for (let i = part.start; i < part.start + part.count; i += 3) {
        let inside = [0, 1, 2].map(k => new T.Vector3().fromBufferAttribute(p, i + k));
        for (const [axis, value, positive] of planes) {
          if (!inside.length) break;
          append(clipPolygon(inside, axis, value, !positive));
          inside = clipPolygon(inside, axis, value, positive);
        }
      }
    }
    const next = new T.BufferGeometry(), vertices: number[] = [];
    for (const [index, positions] of buckets) { next.addGroup(vertices.length / 3, positions.length / 3, index); for (const n of positions) vertices.push(n); }
    next.setAttribute('position', new T.Float32BufferAttribute(vertices, 3)); next.computeVertexNormals();
    o.geometry.dispose(); if (g !== o.geometry) g.dispose(); o.geometry = next;
  });
}

export function buildRod(source: T.Group) {
  const rod = bakeStatic(source, 2.65);
  const gripPivot = new T.Group(); gripPivot.add(rod); rod.position.y = -.28;
  // Point into the scene from the right hand; both grip and tip project on-screen.
  gripPivot.quaternion.setFromUnitVectors(new T.Vector3(0, 1, 0), new T.Vector3(-.16, .42, -.9).normalize());
  gripPivot.position.set(.35, -.27, -.65);
  const points = [new T.Vector3(0, 2.34, .015), new T.Vector3(0, 1.7, -.2), new T.Vector3(0, 1.15, -.35)];
  const line = new T.Line(new T.BufferGeometry().setFromPoints(points), new T.LineBasicMaterial({ color: '#e6e2be', transparent: true, opacity: .8 }));
  line.name = 'idle-line';
  const tip = new T.Object3D(); tip.name = 'rod-tip'; tip.position.copy(points[0]); gripPivot.add(tip);
  gripPivot.add(line); return gripPivot;
}

export type SwimRoute = { x: number; z: number; rx: number; rz: number; phase: number; speed: number; y: number; clearance: number };
export function routePosition(route: SwimRoute, time: number) {
  const a = route.phase + time * route.speed;
  return { x: route.x + Math.cos(a) * route.rx, z: route.z + Math.sin(a) * route.rz, yaw: Math.atan2(Math.sin(a) * route.rx, -Math.cos(a) * route.rz) };
}
export function safeSwimRoute(index: number, shark = false, clearance = .5): SwimRoute {
  const rng = random(4321 + index * 117);
  for (let attempt = 0; attempt < 180; attempt++) {
    const a = rng() * Math.PI * 2;
    const lagoon = !shark && index % 3 === 0;
    const harbour = !shark && index % 3 === 1;
    const radius = shark ? 128 + rng() * 15 : coastRadius(a) + 3 + rng() * 11;
    const x = lagoon ? LAGOON.x + (rng() - .5) * 25 : harbour ? DOCK.x + (rng() - .5) * 24 : Math.cos(a) * radius;
    const z = lagoon ? LAGOON.z + (rng() - .5) * 19 : harbour ? 74 + rng() * 10 : Math.sin(a) * radius / 1.06;
    const rx = shark ? 10 + rng() * 6 : 2 + rng() * 3.5, rz = shark ? 9 + rng() * 5 : 2 + rng() * 3;
    let highestBed = -Infinity;
    for (let j = 0; j < 64; j++) {
      const t = j / 64 * Math.PI * 2;
      highestBed = Math.max(highestBed, groundHeight(x + Math.cos(t) * rx, z + Math.sin(t) * rz));
    }
    if (highestBed > -clearance * 2 - .55) continue;
    return { x, z, rx, rz, phase: rng() * 6.28, speed: (shark ? 2.1 : .7 + rng() * .6) / Math.max(rx, rz), y: shark ? -3 : Math.min(-clearance - .45, Math.max(-2.2, highestBed + clearance + .4)), clearance };
  }
  // The open-water fallback also satisfies the seabed and shoreline constraints.
  return { x: shark ? 140 : 102, z: index * 2 - 32, rx: 4, rz: 4, phase: index, speed: .2, y: shark ? -3 : -1.8, clearance };
}

function buildHarbour(scene: T.Scene) {
  const dock = new T.Group(); scene.add(dock);
  const wood = naturalSurface('wood',1), dark = naturalSurface('wood',1,'#968670'), rope = material('#c9ba90');
  const count = Math.ceil((DOCK.end - DOCK.start) / .63), plankLength = (DOCK.end - DOCK.start) / count;
  for (let i = 0; i < count; i++) {
    const z = DOCK.start + (i + .5) * plankLength;
    const board = mesh(dock, new T.BoxGeometry(DOCK.width, .24, plankLength - .035), i % 4 === 0 ? dark : wood, DOCK.x, dockHeight(z) - .12, z);
    board.rotation.x = -Math.atan2(dockHeight(z + .1) - dockHeight(z - .1), .2);
  }
  for (let i = 0; i < 8; i++) mesh(dock, new T.BoxGeometry(10.8, .24, .6), i % 4 ? wood : dark, DOCK.x, DOCK.y + .01, 76.3 + i * .63);
  for (let z = 49; z < 82; z += 4.5) {
    for (const side of [-1, 1]) {
      const x = DOCK.x + side * 1.5, top = dockHeight(z) + .65, bottom = Math.max(-10, groundHeight(x, z) - .2);
      mesh(dock, new T.CylinderGeometry(.13, .18, top - bottom, 9), dark, x, (top + bottom) / 2, z);
      if (z < 76) {
        const curve = new T.CatmullRomCurve3([new T.Vector3(x, top - .12, z), new T.Vector3(x, (top + dockHeight(z + 4.5)) / 2 - .1, z + 2.25), new T.Vector3(x, dockHeight(z + 4.5) + .53, z + 4.5)]);
        mesh(dock, new T.TubeGeometry(curve, 8, .028, 5, false), rope);
      }
    }
  }
  // Shore steps bridge the cabin threshold to the sloped dock.
  for (let i = 0; i < 4; i++) mesh(dock, new T.BoxGeometry(2, .17, .32), wood, CABIN.x, CABIN.y + CABIN.floor - .08 - i * .14, CABIN.z + 3.9 + i * .3);
  return dock;
}

export async function addIslandAssets(options: AssetOptions) {
  const { scene, handRig, thirdRodMount, animations, isDisposed, onProgress } = options;
  if (isDisposed()) return;
  buildHarbour(scene);
  const loader = new FBXLoader(), failed: string[] = [];
  let completed = 0;
  const total = 4;
  const finish = () => onProgress(Math.round(++completed / total * 100), failed.length ? `${failed.length} model${failed.length > 1 ? 's' : ''} could not load. Reload to try again.` : '');
  const load = async (name: string, install: (model: T.Group) => void) => {
    try { const m = await loader.loadAsync(`/models/${name}`); if (!isDisposed()) install(m); }
    catch { failed.push(name); }
    finally { if (!isDisposed()) finish(); }
  };
  const tasks: (() => Promise<void>)[] = [
    () => load('fishing-rod-lvl1.fbx', source => {
      const rod = buildRod(source); rod.name='fishing-rod-rod';handRig.add(rod);
      const third = rod.clone(true); third.position.set(0, 0, 0); thirdRodMount.add(third);
    }),
    () => load('house-four.fbx', source => {
      const cabin = bakeStatic(source, 9, 'x'); cutCabinDoor(cabin); cabin.position.set(CABIN.x, CABIN.y, CABIN.z); scene.add(cabin);
      const floor = mesh(cabin, new T.BoxGeometry(6.8, .12, 7.35), naturalSurface('wood',3), 0, CABIN.floor - .06, 0); floor.castShadow = false;
    }),
    () => load('door-straight.fbx', source => {
      const door = bakeStatic(source, 2.55, 'y', name => name.includes('Wood') || name.includes('Metal'));
      const box = new T.Box3().setFromObject(door), size = box.getSize(new T.Vector3());
      door.scale.x = 1.48 / size.x; door.scale.z = .16 / size.z;
      const pivot = new T.Group(); pivot.position.set(CABIN.x - .74, CABIN.y + CABIN.floor, CABIN.z + 3.99); door.position.x = .74; pivot.add(door); scene.add(pivot); options.onDoor(pivot);
    }),
    async () => {
      try {
        const source = await new OBJLoader().loadAsync('/models/harbor-boat.obj');
        if (!isDisposed()) {
          const box = new T.Box3().setFromObject(source), size = box.getSize(new T.Vector3());
          const boatModel = bakeStatic(source, 5.6, size.x > size.z ? 'x' : 'z');
          if (size.x > size.z) boatModel.rotation.y = Math.PI / 2;
          boatModel.position.y = -.24;
          boatModel.traverse(o => { if (o instanceof T.Mesh) o.material = naturalSurface('wood',2,'#b9a285'); });
          const boat = new T.Group(); boat.name = 'floating-rowboat'; boat.add(boatModel); boat.position.set(DOCK.x + 6.9, .16, 77);
          boatModel.updateMatrixWorld(true);
          const hull = new T.Box3().setFromObject(boatModel), halfWidth = hull.getSize(new T.Vector3()).x / 2;
          boat.userData.halfWidth = halfWidth; boat.userData.halfLength = 2.8;
          const warmWood = material('#8e643e'), lightWood = material('#cba16c');
          // A dry internal sole and two seats hide the bare, hollow OBJ interior.
          const sole = mesh(boat, new T.CylinderGeometry(1, 1, .09, 16), warmWood, 0, .13, 0); sole.scale.set(halfWidth * .75, 1, 2.08);
          for (const z of [-.95, .95]) mesh(boat, new T.BoxGeometry(halfWidth * 1.55, .12, .36), lightWood, 0, .5, z);
          for (const side of [-1, 1]) {
            const oar = new T.Group(); oar.name = side < 0 ? 'port-oar' : 'starboard-oar'; boat.add(oar);
            const start = new T.Vector3(side * .3, .64, .7), end = new T.Vector3(side * (halfWidth + 1.55), .3, -.7);
            beam(oar, start, end, .038, lightWood);
            const blade = mesh(oar, new T.BoxGeometry(.24, .055, .62), warmWood, end.x, end.y, end.z);
            blade.quaternion.setFromUnitVectors(new T.Vector3(0, 0, 1), end.clone().sub(start).normalize());
            mesh(oar, new T.TorusGeometry(.09, .021, 6, 10), material('#594e3e'), side * halfWidth * .8, .62, .23).rotation.y = Math.PI / 2;
          }
          scene.add(boat); options.onBoat(boat);
          const rope = material('#bdb192'); beam(scene, new T.Vector3(DOCK.x + 5, 2.3, 79), new T.Vector3(DOCK.x + 6.4, .8, 79), .035, rope);
        }
      } catch { failed.push('harbor-boat.obj'); }
      finally { if (!isDisposed()) finish(); }
    },
  ];
  // Limit concurrent downloads and FBX parsing to keep the first frames smooth.
  let cursor = 0;
  await Promise.all(Array.from({ length: 4 }, async () => { while (cursor < tasks.length && !isDisposed()) { const task = tasks[cursor++]; await task(); } }));
  if (!isDisposed()) onProgress(100, failed.length ? `${failed.length} models could not load. Reload to try again.` : '');
}
