import {distantIslandAt,distantGround,distantTerrain} from './island-destinations';
import { onMarket, marketGround, marketTerrain } from './island-market-layout';
import { AVIARY, SEA_HOME, homeDeck, type HomeAvailability } from './island-home-layout';
import {FAMILY_AVIARY} from './island-family-layout';
import { onRainforest,rainforestGround,rainforestTerrain } from './island-rainforest-layout';
// All terrain, water, vegetation, collision and fish routes share this heightfield.
export const SEA = 0;
export const CABIN = { x: -38, z: 40, y: 3.4, halfX: 3.42, halfZ: 3.69, floor: 0.58 };
export const DOCK = { x: -38, start: 44.6, end: 81, width: 3.2, y: 2.1 };
export const SPAWN = { x: -29, z: 54 };
export const LAGOON = { x: 15, z: 19 };
export const TERRAIN_SIZE = 440, TERRAIN_SEGMENTS = 300, TERRAIN_STEP = TERRAIN_SIZE / TERRAIN_SEGMENTS;
export const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
export function smooth(a: number, b: number, v: number) {
  const t = clamp((v - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
}
export function random(seed = 9187) {
  return () => { seed |= 0; seed = seed + 0x6d2b79f5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
}
function hash(x: number, z: number) {
  const v = Math.sin(x * 127.1 + z * 311.7) * 43758.5453;
  return v - Math.floor(v);
}
export function noise(x: number, z: number) {
  const ix = Math.floor(x), iz = Math.floor(z);
  const fx = smooth(0, 1, x - ix), fz = smooth(0, 1, z - iz);
  const a = hash(ix, iz) * (1 - fx) + hash(ix + 1, iz) * fx;
  const b = hash(ix, iz + 1) * (1 - fx) + hash(ix + 1, iz + 1) * fx;
  return (a * (1 - fz) + b * fz) * 2 - 1;
}
export function coastRadius(angle: number) {
  return 76 + 8 * Math.sin(angle * 3 + 0.7) + 4.5 * Math.sin(angle * 7 - 0.8) + 2 * Math.cos(angle * 11);
}
export function riverAt(t: number) {
  return { x: -20 + t * 25 + Math.sin(t * Math.PI * 2) * 4, z: -35 + t * 44, y: (1 - smooth(0, 1, t)) * 16 };
}
const river = Array.from({ length: 61 }, (_, i) => riverAt(i / 60));
export function riverSample(x: number, z: number) {
  let distance = Infinity, surface = 0;
  // Only the local part of the monotonic river can be closest.
  const middle = clamp(Math.round((z + 35) / 44 * 60),0,river.length-1);
  for (let i = Math.max(0, middle - 9); i < Math.min(river.length - 1, middle + 10); i++) {
    const a = river[i], b = river[i + 1];
    const dx = b.x - a.x, dz = b.z - a.z;
    const t = clamp(((x - a.x) * dx + (z - a.z) * dz) / (dx * dx + dz * dz), 0, 1);
    const d = Math.hypot(x - a.x - dx * t, z - a.z - dz * t);
    if (d < distance) { distance = d; surface = a.y + (b.y - a.y) * t; }
  }
  return { distance, surface };
}
export function groundHeight(x: number, z: number): number {
  const distant=distantIslandAt(x,z);if(distant)return distantGround(distant,x,z);
  if(onRainforest(x,z))return rainforestGround(x,z);
  if(onMarket(x,z))return marketGround(x,z);
  const r = Math.hypot(x, z * 1.06), a = Math.atan2(z * 1.06, x);
  const coast = coastRadius(a), inland = coast - r;
  let h = -2.7 + 6.6 * smooth(-8, 14, inland);
  h -= 26 * smooth(-8, 90, -inland);
  const g = (cx: number, cz: number, rx: number, rz: number) => Math.exp(-(((x - cx) / rx) ** 2 + ((z - cz) / rz) ** 2));
  const mountains = g(-18, -27, 31, 26) * 26 + g(28, -27, 17, 28) * 20 + g(-44, -5, 14, 25) * 13;
  // Broad eroded ridges retain cliffs without stacked, artificial terrace steps.
  const ridges = Math.pow(1 - Math.abs(noise(x * 0.065, z * 0.065)), 3) * 3.2;
  h += (mountains + noise(x * 0.055, z * 0.055) * 2.3 + ridges) * smooth(6, 25, inland);
  h += noise(x*.12+noise(z*.025,x*.025),z*.12)*1.1*smooth(8,20,inland);
  h += noise(x * 0.23, z * 0.23) * 0.28 * smooth(0, 9, inland);
  const lagoonAngle = Math.atan2((z - LAGOON.z) / 23, (x - LAGOON.x) / 28);
  const lagoonDistance = Math.hypot((x - LAGOON.x) / 28, (z - LAGOON.z) / 23);
  const lagoonEdge = 1 + Math.sin(lagoonAngle * 3 + 1) * 0.08 + Math.cos(lagoonAngle * 5) * 0.04;
  const lagoonBed = -4.8 + Math.pow(clamp(lagoonDistance / lagoonEdge, 0, 1), 2) * 1.8;
  h = h * smooth(0.78, 1.23, lagoonDistance / lagoonEdge) + lagoonBed * (1 - smooth(0.78, 1.23, lagoonDistance / lagoonEdge));
  // An open tidal channel joins the lagoon to the sea, with sloping sandy banks.
  const channelZ = 24 + Math.sin((x - 25) * 0.033) * 10;
  const channel = (1 - smooth(5.5, 12, Math.abs(z - channelZ))) * smooth(26, 42, x);
  h = h * (1 - channel) + Math.min(h, -3.7) * channel;
  if (x > -46 && x < 25 && z > -49 && z < 19) {
    const { distance, surface } = riverSample(x, z);
    const valley=(1-smooth(3,14,distance))*smooth(-49,-40,z)*(1-smooth(12,19,z));
    const bank=surface+.25+Math.max(0,distance-1.4)*.55;
    h=Math.min(h,h*(1-valley)+bank*valley);
    const carve = 1 - smooth(1.05, 3.4, distance);
    h = h * (1 - carve) + (surface - 0.78 + Math.min(distance / 3.4, 1) * 0.4) * carve;
  }
  const cabinFlat = 1 - smooth(5, 10, Math.max(Math.abs(x - CABIN.x), Math.abs(z - CABIN.z)));
  h = h * (1 - cabinFlat) + CABIN.y * cabinFlat;
  const aviaryFlat=1-smooth(0,3,Math.max(Math.abs(x-AVIARY.x)-10.5,Math.abs(z-AVIARY.z)-8.5));
  h=h*(1-aviaryFlat)+AVIARY.y*aviaryFlat;
  const familyFlat=1-smooth(0,2.5,Math.max(Math.abs(x-FAMILY_AVIARY.x)-4.1,Math.abs(z-FAMILY_AVIARY.z)-4.8));
  h=h*(1-familyFlat)+FAMILY_AVIARY.y*familyFlat;
  if(Math.abs(x-SEA_HOME.x)<12.8&&Math.abs(z-SEA_HOME.z)<9.8)h=Math.min(h,-4.4);
  // Cut the FULL shoreward walkway out of the hill. The old approach ended at
  // z=59, leaving the boardwalk buried up to 2.7 m beneath the rendered terrain.
  // Include one mesh cell plus body clearance so interpolated edge triangles
  // cannot slope back through the planks. Blend the remaining banks naturally.
  const clearedWidth=DOCK.width/2+TERRAIN_STEP+.3;
  const approach=(1-smooth(clearedWidth,clearedWidth+4,Math.abs(x-DOCK.x)))
    *smooth(CABIN.z+3.2,DOCK.start-.5,z)*(1-smooth(DOCK.end,DOCK.end+3,z));
  h+=(Math.min(h,dockHeight(z)-.4)-h)*approach;
  return h;
}
export function slopeAt(x: number, z: number) {
  return Math.hypot(groundHeight(x + 0.6, z) - groundHeight(x - 0.6, z), groundHeight(x, z + 0.6) - groundHeight(x, z - 0.6)) / 1.2;
}
export function onDock(x: number, z: number) {
  return Math.abs(x - DOCK.x) < DOCK.width / 2 && z >= DOCK.start && z <= DOCK.end || Math.abs(x - DOCK.x) < 5.5 && z > 76 && z < 81;
}
export function dockHeight(z: number) { return DOCK.y + .13 + 1.22 * (1 - smooth(DOCK.start, 54, z)); }
// Interpolate the actual rendered triangles, not the smoother source function.
const terrainGrid = new Float32Array((TERRAIN_SEGMENTS+1)**2).fill(NaN);
const gridStep = TERRAIN_STEP;
export function terrainHeight(x: number, z: number) {
  const distant=distantIslandAt(x,z);if(distant)return distantTerrain(distant,x,z);
  if(onRainforest(x,z))return rainforestTerrain(x,z);
  if(onMarket(x,z))return marketTerrain(x,z);
  if (Math.abs(x) >= TERRAIN_SIZE/2 || Math.abs(z) >= TERRAIN_SIZE/2) return groundHeight(x, z);
  const u = (x + TERRAIN_SIZE/2) / gridStep, v = (z + TERRAIN_SIZE/2) / gridStep;
  const ix = Math.floor(u), iz = Math.floor(v), fx = u - ix, fz = v - iz;
  const vertex = (i: number, j: number) => {
    const k = j * (TERRAIN_SEGMENTS+1) + i;
    if (Number.isNaN(terrainGrid[k])) terrainGrid[k] = groundHeight(Math.fround(-TERRAIN_SIZE/2 + i * gridStep), Math.fround(-TERRAIN_SIZE/2 + j * gridStep));
    return terrainGrid[k];
  };
  const a = vertex(ix, iz), b = vertex(ix + 1, iz), c = vertex(ix, iz + 1), d = vertex(ix + 1, iz + 1);
  return fx + fz <= 1 ? a + (b - a) * fx + (c - a) * fz : d + (c - d) * (1 - fx) + (b - d) * (1 - fz);
}
export function waterHeight(x: number, z: number, time: number) {
  const strength = (.2 + .8 * smooth(22, 60, Math.hypot(x - 15, z - 19))) * smooth(.1, 3, -groundHeight(x, z));
  return (Math.sin(.24 * x + .13 * z + time * 1.1) * .19 + Math.sin(-.12 * x + .32 * z + time * 1.5) * .1 + Math.sin(.72 * x + .41 * z - time * 2) * .035) * strength;
}
export function walkingHeight(x: number, z: number, homes?:HomeAvailability) {
  // A floor adds support above terrain; it must never replace solid ground
  // with a lower, invisible walking surface (including at dock/home edges).
  let height=terrainHeight(x,z);
  const deck=homeDeck(x,z,homes);if(deck!==null)height=Math.max(height,deck);
  if (onDock(x, z)) height=Math.max(height,dockHeight(z));
  if (Math.abs(x - CABIN.x) < CABIN.halfX && z > CABIN.z - CABIN.halfZ && z < CABIN.z + 5.2) {
    height=Math.max(height,CABIN.y + CABIN.floor * (1 - smooth(3.2, 5.2, z - CABIN.z)));
  }
  return height;
}
export function cabinBlocked(x: number, z: number, doorOpen: boolean) {
  const dx = x - CABIN.x, dz = z - CABIN.z, radius = 0.24;
  const side = Math.abs(Math.abs(dx) - CABIN.halfX) < 0.35 + radius && Math.abs(dz) < CABIN.halfZ + radius;
  const back = Math.abs(dz + CABIN.halfZ) < 0.35 + radius && Math.abs(dx) < CABIN.halfX + radius;
  const front = Math.abs(dz - CABIN.halfZ) < 0.4 + radius && Math.abs(dx) < CABIN.halfX + radius;
  return side || back || front && (!doorOpen || Math.abs(dx) > 0.64);
}
