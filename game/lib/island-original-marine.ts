import * as THREE from 'three';

/** Original procedural geometry. No asset downloads, canvas, DOM, or shared buffers.
 * Units: metres; +Z is anterior/forward, +Y is dorsal/up. Rest-pose longest
 * dimension is 1 m, centred on the origin; animation can extend that envelope.
 * Call update(elapsedSeconds, swimSpeed) once per frame (speed defaults to 1).
 * Fish deformation requires WebGLRenderer, including its shadow passes.
 * GPU fish deformation does not change CPU raycasts or export baked animation.
 * Create a separate factory instance for each independently animated creature.
 */
type OriginalMarineKind =
  | 'snapper' | 'mackerel' | 'tuna' | 'clownfish' | 'tang' | 'grouper'
  | 'flatfish' | 'shark' | 'kingfish' | 'menhaden' | 'squid' | 'crab';

/** Restored original species; legacy 'tang' continues to identify the blue tang. */
type RestoredKind =
  | 'black-lionfish' | 'blobfish' | 'butterflyfish' | 'cardinalfish' | 'cowfish'
  | 'humphead' | 'lionfish' | 'mandarinfish' | 'moorish-idol' | 'parrotfish'
  | 'puffer' | 'royal-gramma' | 'sunfish' | 'swordfish' | 'turbot'
  | 'yellow-tang' | 'zebra-clownfish' | 'surgeonfish' | 'manta-ray'
  | 'reef-fish-one' | 'reef-fish-two' | 'reef-fish-three';
export type MarineKind = OriginalMarineKind | RestoredKind;
type ReefKind = Exclude<RestoredKind, 'manta-ray'>;

type V3 = [number, number, number];
type RGB = [number, number, number];
type FishKind = Exclude<OriginalMarineKind, 'squid' | 'crab'>;
type Profile = [number, number, number, number]; // z, half-width, half-height, y centre
type Material = THREE.MeshStandardMaterial | THREE.MeshPhysicalMaterial;
type FishSpec = {
  profile: Profile[];
  back: number; flank: number; belly: number; fin: number;
  tail: 'fork' | 'crescent' | 'round' | 'shark';
  tailHeight: number; eyeZ: number; eyeRadius: number;
  dorsal: number; dorsalZ: number; metal: number; frequency: number;
};
type Resources = {
  geometries: Set<THREE.BufferGeometry>;
  materials: Set<THREE.Material>;
  textures: Set<THREE.Texture>;
  skeletons: Set<THREE.Skeleton>;
};

const TAU = Math.PI * 2;
const clamp = THREE.MathUtils.clamp;
const lerp = THREE.MathUtils.lerp;
const vec = (p: V3) => new THREE.Vector3(...p);
const color = (hex: number) => new THREE.Color(hex);
const hexRGB = (hex: number): RGB => [(hex >> 16) / 255, ((hex >> 8) & 255) / 255, (hex & 255) / 255];
const mixRGB = (a: RGB, b: RGB, t: number): RGB => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
const noise = (x: number, y: number, seed = 0) => {
  const a = Math.sin(x * 127.1 + y * 311.7 + seed * 74.7) * 43758.5453;
  return a - Math.floor(a);
};
// Integrate changes in speed without a discontinuous phase jump. Backward time
// seeks reset the phase; no wall clock, frame-rate assumption, or timers are used.
function animationClock(base: number, rate: number): (time: number, speed: number) => number {
  let previous = 0, phase = 0;
  return (time, speed) => {
    const dt = time >= previous ? time - previous : time;
    if (time < previous) phase = 0;
    phase += dt * (base + rate * speed);
    previous = time;
    return phase;
  };
}
function smoothNoise(x: number, y: number, seed: number): number {
  const ix = Math.floor(x), iy = Math.floor(y);
  const fx = x - ix, fy = y - iy;
  const sx = fx * fx * (3 - 2 * fx), sy = fy * fy * (3 - 2 * fy);
  return lerp(lerp(noise(ix, iy, seed), noise(ix + 1, iy, seed), sx),
    lerp(noise(ix, iy + 1, seed), noise(ix + 1, iy + 1, seed), sx), sy);
}

// Profiles intentionally include head, shoulder, belly, narrow peduncle and nose.
// Monotone interpolation below prevents overshooting the small tail radii.
const FISH: Record<FishKind, FishSpec> = {
  snapper: {
    profile: [[-.30,.018,.033,0],[-.24,.032,.065,0],[-.12,.062,.119,.004],[.03,.083,.154,.008],[.19,.079,.15,.009],[.32,.06,.115,.014],[.42,.034,.07,.001],[.48,0,0,-.025]],
    back: 0x843e3c, flank: 0xd18b78, belly: 0xf1d7bd, fin: 0xbb6759,
    tail: 'fork', tailHeight: .157, eyeZ: .35, eyeRadius: .010, dorsal: .080, dorsalZ: .12, metal: .22, frequency: 2.8,
  },
  mackerel: {
    profile: [[-.30,.014,.023,0],[-.22,.025,.041,0],[-.1,.045,.076,0],[.06,.064,.099,0],[.22,.061,.087,0],[.35,.042,.059,.002],[.435,.022,.035,0],[.48,0,0,-.005]],
    back: 0x174b59, flank: 0x94b9bb, belly: 0xe9ece0, fin: 0x6b8587,
    tail: 'fork', tailHeight: .126, eyeZ: .367, eyeRadius: .0088, dorsal: .065, dorsalZ: .12, metal: .46, frequency: 4.4,
  },
  tuna: {
    profile: [[-.30,.012,.022,0],[-.23,.023,.040,0],[-.13,.046,.075,0],[.02,.082,.128,0],[.17,.100,.14,.003],[.29,.085,.114,.005],[.40,.045,.068,0],[.48,0,0,-.008]],
    back: 0x153443, flank: 0x789ba9, belly: 0xd9e3df, fin: 0x6a8590,
    tail: 'crescent', tailHeight: .19, eyeZ: .364, eyeRadius: .0085, dorsal: .108, dorsalZ: .12, metal: .50, frequency: 3.3,
  },
  clownfish: {
    profile: [[-.30,.019,.051,0],[-.22,.031,.075,0],[-.1,.054,.125,0],[.05,.076,.163,0],[.21,.078,.158,.007],[.34,.057,.12,.012],[.43,.029,.073,0],[.48,0,0,-.006]],
    back: 0xb44917, flank: 0xf17e22, belly: 0xf6b04b, fin: 0xe77926,
    tail: 'round', tailHeight: .13, eyeZ: .35, eyeRadius: .0095, dorsal: .055, dorsalZ: .12, metal: .08, frequency: 3.5,
  },
  tang: {
    profile: [[-.30,.012,.038,0],[-.22,.020,.09,0],[-.12,.044,.16,0],[.04,.064,.218,0],[.19,.061,.212,0],[.30,.045,.17,-.008],[.395,.022,.09,-.020],[.46,0,0,-.039]],
    back: 0x12377d, flank: 0x296fc0, belly: 0x68a8d5, fin: 0x2869a9,
    tail: 'fork', tailHeight: .127, eyeZ: .34, eyeRadius: .0087, dorsal: .045, dorsalZ: .1, metal: .13, frequency: 3.4,
  },
  grouper: {
    profile: [[-.30,.028,.048,0],[-.20,.044,.078,0],[-.08,.085,.13,0],[.08,.114,.159,.005],[.23,.114,.15,.006],[.35,.098,.129,0],[.445,.060,.084,-.025],[.49,0,0,-.039]],
    back: 0x4b5140, flank: 0x8b8866, belly: 0xc2b597, fin: 0x696e50,
    tail: 'round', tailHeight: .137, eyeZ: .354, eyeRadius: .010, dorsal: .063, dorsalZ: .09, metal: .08, frequency: 2.1,
  },
  flatfish: {
    profile: [[-.30,.031,.009,0],[-.20,.087,.019,0],[-.07,.178,.026,0],[.09,.204,.032,0],[.22,.168,.032,0],[.33,.105,.026,0],[.405,.052,.019,0],[.46,0,0,0]],
    back: 0x686647, flank: 0x8b8460, belly: 0xddd7c0, fin: 0x86805c,
    tail: 'round', tailHeight: .11, eyeZ: .31, eyeRadius: .0075, dorsal: .035, dorsalZ: .1, metal: .04, frequency: 2.4,
  },
  shark: {
    profile: [[-.31,.017,.03,0],[-.22,.028,.048,0],[-.10,.055,.079,0],[.06,.091,.109,0],[.21,.111,.105,-.001],[.33,.094,.078,-.006],[.43,.056,.041,-.008],[.50,0,0,-.012]],
    back: 0x465963, flank: 0x84949a, belly: 0xdbe0d9, fin: 0x607780,
    tail: 'shark', tailHeight: .23, eyeZ: .372, eyeRadius: .0068, dorsal: .15, dorsalZ: .09, metal: .09, frequency: 2.4,
  },
  kingfish: {
    profile: [[-.30,.014,.025,0],[-.22,.03,.047,0],[-.09,.055,.086,0],[.07,.078,.117,0],[.23,.078,.108,0],[.35,.052,.074,.002],[.435,.027,.041,0],[.49,0,0,-.014]],
    back: 0x375e60, flank: 0x9bb6ab, belly: 0xe1e6d6, fin: 0xb8ad4e,
    tail: 'fork', tailHeight: .168, eyeZ: .366, eyeRadius: .0085, dorsal: .088, dorsalZ: .05, metal: .42, frequency: 3.7,
  },
  menhaden: {
    profile: [[-.30,.010,.025,0],[-.23,.021,.047,0],[-.1,.040,.085,0],[.06,.056,.118,0],[.22,.057,.115,.007],[.33,.043,.088,.013],[.425,.024,.047,.009],[.475,0,0,0]],
    back: 0x345b70, flank: 0xbbcbd0, belly: 0xf0ebdf, fin: 0x8aabaf,
    tail: 'fork', tailHeight: .146, eyeZ: .36, eyeRadius: .010, dorsal: .086, dorsalZ: .11, metal: .52, frequency: 3.8,
  },
};

/** Compact geometry accumulator: merges small anatomical details by material. */
class GeometryBuilder {
  positions: number[] = [];
  normals: number[] = [];
  uvs: number[] = [];
  colors: number[] = [];
  indices: number[] = [];
  vertex(p: THREE.Vector3, n: THREE.Vector3, uv: [number, number], c: THREE.Color): number {
    const i = this.positions.length / 3;
    this.positions.push(p.x, p.y, p.z); this.normals.push(n.x, n.y, n.z);
    this.uvs.push(...uv); this.colors.push(c.r, c.g, c.b);
    return i;
  }
  triangle(a: number, b: number, c: number): void { this.indices.push(a, b, c); }
  append(g: THREE.BufferGeometry, tint = color(0xffffff), matrix?: THREE.Matrix4): void {
    const offset = this.positions.length / 3;
    const p = g.getAttribute('position'), n = g.getAttribute('normal');
    const uv = g.getAttribute('uv'), c = g.getAttribute('color');
    const normalMatrix = matrix ? new THREE.Matrix3().getNormalMatrix(matrix) : null;
    const v = new THREE.Vector3(), normal = new THREE.Vector3();
    for (let i = 0; i < p.count; ++i) {
      v.fromBufferAttribute(p, i); normal.fromBufferAttribute(n, i);
      if (matrix && normalMatrix) { v.applyMatrix4(matrix); normal.applyMatrix3(normalMatrix).normalize(); }
      const tintAtVertex = c ? new THREE.Color().setRGB(c.getX(i), c.getY(i), c.getZ(i)).multiply(tint) : tint;
      this.vertex(v, normal, [uv?.getX(i) ?? 0, uv?.getY(i) ?? 0], tintAtVertex);
    }
    if (g.index) for (let i = 0; i < g.index.count; ++i) this.indices.push(offset + g.index.getX(i));
    else for (let i = 0; i < p.count; ++i) this.indices.push(offset + i);
  }
  finish(): THREE.BufferGeometry {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(this.positions, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(this.normals, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(this.uvs, 2));
    g.setAttribute('color', new THREE.Float32BufferAttribute(this.colors, 3));
    g.setIndex(this.indices); g.computeBoundingBox(); g.computeBoundingSphere();
    return g;
  }
}

function ellipsoid(b: GeometryBuilder, centre: V3, radii: V3, tint: number,
  radial: number, vertical: number, orientation?: THREE.Quaternion): void {
  const g = new THREE.SphereGeometry(1, radial, vertical);
  b.append(g, color(tint), new THREE.Matrix4().compose(vec(centre), orientation ?? new THREE.Quaternion(), vec(radii)));
  g.dispose();
}

/** A capped tapered tube with transported frames and smooth finite-difference normals. */
function tube(b: GeometryBuilder, points: THREE.Vector3[], radius: number | ((t: number) => number),
  tint: number, sides: number, cap = true): void {
  const c = color(tint), frames: THREE.Vector3[] = [];
  const rings: number[][] = [];
  let previous = new THREE.Vector3(0, 1, 0);
  for (let j = 0; j < points.length; ++j) {
    const t = j / (points.length - 1), r = typeof radius === 'number' ? radius : radius(t);
    const tangent = points[Math.min(j + 1, points.length - 1)].clone().sub(points[Math.max(j - 1, 0)]).normalize();
    let axis = previous.clone().addScaledVector(tangent, -previous.dot(tangent));
    if (axis.lengthSq() < 1e-8) axis = new THREE.Vector3(1, 0, 0).cross(tangent);
    axis.normalize(); previous = axis;
    const second = tangent.clone().cross(axis).normalize(); frames.push(tangent);
    const ring: number[] = [];
    for (let k = 0; k <= sides; ++k) {
      const a = k / sides * TAU, n = axis.clone().multiplyScalar(Math.cos(a)).addScaledVector(second, Math.sin(a));
      ring.push(b.vertex(points[j].clone().addScaledVector(n, r), n, [t, k / sides], c));
    }
    rings.push(ring);
    if (j) for (let k = 0; k < sides; ++k) {
      b.triangle(rings[j - 1][k], rings[j - 1][k + 1], ring[k]);
      b.triangle(rings[j - 1][k + 1], ring[k + 1], ring[k]);
    }
  }
  if (cap) for (const end of [0, points.length - 1]) {
    const n = frames[end].clone().multiplyScalar(end === 0 ? -1 : 1);
    const centre = b.vertex(points[end], n, [end === 0 ? 0 : 1, .5], c);
    const edge: number[] = [];
    for (let k = 0; k <= sides; ++k) {
      const i = rings[end][k] * 3;
      edge.push(b.vertex(new THREE.Vector3(b.positions[i], b.positions[i + 1], b.positions[i + 2]), n, [0, 0], c));
    }
    for (let k = 0; k < sides; ++k) {
      if (end === 0) b.triangle(centre, edge[k + 1], edge[k]);
      else b.triangle(centre, edge[k], edge[k + 1]);
    }
  }
}

function path(points: V3[], segments: number): THREE.Vector3[] {
  return new THREE.CatmullRomCurve3(points.map(vec), false, 'centripetal').getPoints(segments);
}

/** Shape-preserving cubic interpolation of a measured anatomical profile. */
function sampleProfile(profile: Profile[], z: number): [number, number, number] {
  let i = 0;
  while (i < profile.length - 2 && z > profile[i + 1][0]) ++i;
  const a = profile[i], b = profile[i + 1], h = b[0] - a[0];
  const t = clamp((z - a[0]) / h, 0, 1), out: number[] = [];
  for (let k = 1; k <= 3; ++k) {
    const slope = (b[k] - a[k]) / h;
    const before = i ? (a[k] - profile[i - 1][k]) / (a[0] - profile[i - 1][0]) : slope;
    const after = i + 2 < profile.length ? (profile[i + 2][k] - b[k]) / (profile[i + 2][0] - b[0]) : slope;
    const m0 = before * slope <= 0 ? 0 : 2 * before * slope / (before + slope);
    const m1 = after * slope <= 0 ? 0 : 2 * after * slope / (after + slope);
    out.push((2*t*t*t - 3*t*t + 1)*a[k] + (t*t*t - 2*t*t + t)*h*m0
      + (-2*t*t*t + 3*t*t)*b[k] + (t*t*t - t*t)*h*m1);
  }
  return out as [number, number, number];
}

function surfacePoint(profile: Profile[], z: number, theta: number, lift = 0): THREE.Vector3 {
  const [rx, ry, cy] = sampleProfile(profile, z);
  return new THREE.Vector3((rx + lift) * Math.cos(theta), cy + (ry + lift) * Math.sin(theta), z);
}

function bodyGeometry(profile: Profile[], longitudinal: number, radial: number): THREE.BufferGeometry {
  const b = new GeometryBuilder(), white = color(0xffffff);
  const z0 = profile[0][0], z1 = profile[profile.length - 1][0];
  const epsilon = (z1 - z0) * 1e-4;
  // Last ring stops just shy of the nose; a single pole avoids zero-area faces.
  for (let j = 0; j < longitudinal; ++j) {
    const u = j / longitudinal, z = lerp(z0, z1, u);
    for (let k = 0; k <= radial; ++k) {
      const v = k / radial, theta = v * TAU;
      const p = surfacePoint(profile, z, theta);
      const dt = surfacePoint(profile, z, theta + .001).sub(surfacePoint(profile, z, theta - .001));
      const dz = surfacePoint(profile, Math.min(z1 - epsilon, z + epsilon), theta)
        .sub(surfacePoint(profile, Math.max(z0, z - epsilon), theta));
      b.vertex(p, dt.cross(dz).normalize(), [u, v], white);
      if (j && k < radial) {
        const a = (j - 1) * (radial + 1) + k, c = j * (radial + 1) + k;
        b.triangle(a, a + 1, c); b.triangle(a + 1, c + 1, c);
      }
    }
  }
  const nose = b.vertex(new THREE.Vector3(0, profile[profile.length - 1][3], z1), new THREE.Vector3(0, 0, 1), [1, .5], white);
  const tail = b.vertex(new THREE.Vector3(0, profile[0][3], z0), new THREE.Vector3(0, 0, -1), [0, .5], white);
  for (let k = 0; k < radial; ++k) {
    const a = (longitudinal - 1) * (radial + 1) + k;
    b.triangle(a, a + 1, nose); b.triangle(tail, k + 1, k);
  }
  return b.finish();
}

/** Pixel-by-pixel pigmentation, scale relief and fine iridescent scale edges. */
function skinTextures(kind: OriginalMarineKind, high: boolean, resources: Resources): { map: THREE.DataTexture; bumpMap: THREE.DataTexture } {
  const width = high ? 512 : 256, height = high ? 256 : 128;
  const pixels = new Uint8Array(width * height * 4), relief = new Uint8Array(width * height * 4);
  const spec = kind !== 'squid' && kind !== 'crab' ? FISH[kind] : null;
  const back = hexRGB(spec?.back ?? (kind === 'squid' ? 0xa4594e : 0x526457));
  const flank = hexRGB(spec?.flank ?? (kind === 'squid' ? 0xd5a68e : 0x7b8266));
  const belly = hexRGB(spec?.belly ?? (kind === 'squid' ? 0xe9d4bf : 0xc8b38a));
  for (let y = 0; y < height; ++y) for (let x = 0; x < width; ++x) {
    const u = x / (width - 1), v = y / (height - 1), dorsal = Math.sin(v * TAU);
    const grain = noise(x, y, 19), clouds = smoothNoise(u * 21, v * 18, 5);
    let c = mixRGB(flank, back, Math.pow(clamp((dorsal + .12) / 1.12, 0, 1), 1.35));
    c = mixRGB(c, belly, Math.pow(clamp(-dorsal, 0, 1), 1.2));
    const rows = kind === 'menhaden' ? 66 : 45;
    const col = Math.floor(v * 48), sx = (u * rows + (col % 2) * .5) % 1;
    const sy = (v * 48) % 1;
    const scaleArc = Math.sqrt((sx - .46) ** 2 + ((sy - .5) * .78) ** 2);
    const edge = Math.exp(-(((scaleArc - .47) / .055) ** 2));
    let fleck = 1 + (grain - .5) * .07 + edge * .09;
    let bump = .48 + edge * .24 + (grain - .5) * .10;
    if (kind === 'mackerel') {
      const stripe = Math.sin(u * 122 + Math.sin(v * TAU * 7) * 2.5 + Math.sin(u * 31));
      if (dorsal > .10 && stripe > .38) c = mixRGB(c, hexRGB(0x183a43), clamp((stripe - .38) * 1.65, 0, .88));
    } else if (kind === 'clownfish') {
      const bend = .024 * Math.cos(v * TAU * 2);
      const distance = Math.min(Math.abs(u - .245 - bend), Math.abs(u - .535 + bend), Math.abs(u - .835 - bend));
      if (distance < .065) c = hexRGB(0x25262a);
      if (distance < .047) c = hexRGB(0xf2ead9);
    } else if (kind === 'tang') {
      const swash = Math.abs(dorsal - (.36 + .17 * Math.sin(u * 7)));
      if ((swash < .17 && u < .82 && u > .24) || (u < .43 && dorsal > .28)) c = mixRGB(c, hexRGB(0x132645), .9);
      if (u < .11) c = hexRGB(0xe7d953);
    } else if (kind === 'menhaden') {
      // Both flanks: prominent shoulder spot just posterior to the operculum.
      const spot = ((u - .686) / .031) ** 2 + ((dorsal - .19) / .15) ** 2;
      if (spot < 1.35) c = mixRGB(c, hexRGB(0x202c31), clamp((1.35 - spot) * 2, 0, 1));
      for (let i = 0; i < 4; ++i) {
        const dot = ((u - (.61 - i * .053)) / (.010 - i * .001)) ** 2 + ((dorsal - .16) / .047) ** 2;
        if (dot < 1) c = mixRGB(c, hexRGB(0x52636b), .56 * (1 - dot));
      }
    } else if (kind === 'kingfish') {
      const stripe = Math.exp(-(((dorsal - .07) / .085) ** 2));
      c = mixRGB(c, hexRGB(0xc9b453), stripe * .8);
    } else if (kind === 'grouper' || kind === 'flatfish') {
      const large = smoothNoise(u * 12, v * 12, 31);
      const mottled = smoothNoise(u * 63, v * 45, 17);
      c = mixRGB(c, hexRGB(kind === 'grouper' ? 0x424937 : 0x454733), clamp((large - .43) * 1.7, 0, .62));
      if (mottled > .64) c = mixRGB(c, hexRGB(0xd0b991), (mottled - .64) * 2.1);
      if (kind === 'flatfish' && dorsal < -.1) c = mixRGB(hexRGB(0xd5cfb9), belly, -dorsal);
    } else if (kind === 'snapper') {
      const line = Math.exp(-(((dorsal - .19) / .085) ** 2));
      c = mixRGB(c, hexRGB(0xd2a76f), line * .35);
      if (grain > .978 && dorsal > -.4) c = mixRGB(c, hexRGB(0x8bbac1), .32);
    } else if (kind === 'shark') {
      fleck = 1 + (grain - .5) * .04; bump = .5 + (grain - .5) * .22;
    } else if (kind === 'squid') {
      c = mixRGB(belly, back, .18 + clouds * .65);
      const cells = noise(Math.floor(u * 165), Math.floor(v * 120), 77);
      if (cells > .64) c = mixRGB(c, hexRGB(0x703e35), (cells - .64) * 1.3);
      fleck = 1 + (grain - .5) * .06; bump = .5 + (grain - .5) * .08;
    } else if (kind === 'crab') {
      c = mixRGB(flank, back, clouds);
      c = mixRGB(c, belly, Math.max(0, smoothNoise(u * 9, v * 10, 9) - .54) * 1.2);
      if (grain > .92) c = mixRGB(c, hexRGB(0xd0bc8b), .24);
      fleck = .94 + clouds * .13; bump = .35 + clouds * .24 + grain * .28;
    }
    // Blue-green pearl on reflective scale rims; pigments remain species-specific.
    const pearl = spec && spec.metal > .2 ? edge * .018 : 0;
    const i = (y * width + x) * 4;
    pixels[i] = clamp(c[0] * fleck * 255, 0, 255);
    pixels[i + 1] = clamp((c[1] * fleck + pearl) * 255, 0, 255);
    pixels[i + 2] = clamp((c[2] * fleck + pearl * 1.5) * 255, 0, 255);
    pixels[i + 3] = 255;
    relief[i] = relief[i + 1] = relief[i + 2] = clamp(bump * 255, 0, 255); relief[i + 3] = 255;
  }
  // The circumferential texture seam must be identical on both sides.
  for (let x = 0; x < width * 4; ++x) {
    pixels[(height - 1) * width * 4 + x] = pixels[x];
    relief[(height - 1) * width * 4 + x] = relief[x];
  }
  const make = (data: Uint8Array, srgb: boolean) => {
    const t = new THREE.DataTexture(data, width, height, THREE.RGBAFormat, THREE.UnsignedByteType);
    t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
    t.wrapS = THREE.ClampToEdgeWrapping; t.wrapT = THREE.RepeatWrapping;
    t.magFilter = THREE.LinearFilter; t.minFilter = THREE.LinearMipmapLinearFilter;
    t.generateMipmaps = true; t.needsUpdate = true; resources.textures.add(t); return t;
  };
  return { map: make(pixels, true), bumpMap: make(relief, false) };
}

function trackMaterial<T extends THREE.Material>(r: Resources, m: T): T { r.materials.add(m); return m; }
function standard(r: Resources, tint: number, roughness = .48, metalness = .12, vertexColors = false): Material {
  return trackMaterial(r, new THREE.MeshStandardMaterial({ color: tint, roughness, metalness, vertexColors }));
}
function mesh(r: Resources, parent: THREE.Object3D, name: string, geometry: THREE.BufferGeometry, material: Material): THREE.Mesh {
  r.geometries.add(geometry);
  const m = new THREE.Mesh(geometry, material); m.name = name; m.castShadow = true; m.receiveShadow = true;
  parent.add(m); return m;
}

type FishMotion = { phase: { value: number }; amplitude: { value: number }; flat: { value: number } };
const FISH_WAVE = /* glsl */`
uniform float marinePhase;
uniform float marineAmplitude;
uniform float marineFlat;
// Return lateral displacement and its derivative with respect to z.
vec2 marineWave(float z) {
  float t = clamp((0.28 - z) / 0.80, 0.0, 1.0);
  float dt = (z < 0.28 && z > -0.52) ? -1.25 : 0.0;
  float a = marinePhase - 6.5 * t;
  float w = marineAmplitude * t * t * sin(a);
  float d = marineAmplitude * dt * (2.0 * t * sin(a) - 6.5 * t * t * cos(a));
  return vec2(w, d);
}
`;
function bendMaterial<T extends THREE.Material>(material: T, motion: FishMotion): T {
  material.onBeforeCompile = shader => {
    shader.uniforms.marinePhase = motion.phase;
    shader.uniforms.marineAmplitude = motion.amplitude;
    shader.uniforms.marineFlat = motion.flat;
    shader.vertexShader = FISH_WAVE + shader.vertexShader;
    shader.vertexShader = shader.vertexShader.replace('#include <beginnormal_vertex>', /* glsl */`
      #include <beginnormal_vertex>
      vec2 marineNormalWave = marineWave(position.z);
      // Inverse-transpose of the actual deformation Jacobian (not a rotated guess).
      objectNormal.z -= marineNormalWave.y * mix(objectNormal.x, objectNormal.y, marineFlat);
      #ifdef USE_TANGENT
        objectTangent.x += (1.0 - marineFlat) * marineNormalWave.y * objectTangent.z;
        objectTangent.y += marineFlat * marineNormalWave.y * objectTangent.z;
      #endif
    `);
    shader.vertexShader = shader.vertexShader.replace('#include <begin_vertex>', /* glsl */`
      #include <begin_vertex>
      vec2 marinePositionWave = marineWave(position.z);
      transformed.x += (1.0 - marineFlat) * marinePositionWave.x;
      transformed.y += marineFlat * marinePositionWave.x;
    `);
  };
  material.customProgramCacheKey = () => 'original-marine-wave-v1';
  return material;
}

/** Cambered fin membrane plus individual raised, tapered fin rays. */
function fin(b: GeometryBuilder, rays: GeometryBuilder, roots: V3[], edge: V3[],
  tint: number, high: boolean, rayCount: number, edgeTint?: number): void {
  const spans = high ? 30 : 15, chords = high ? 5 : 3;
  const rootCurve = new THREE.CatmullRomCurve3(roots.map(vec), false, 'centripetal');
  const edgeCurve = new THREE.CatmullRomCurve3(edge.map(vec), false, 'centripetal');
  const temporary = new GeometryBuilder(), base = color(tint), tip = color(edgeTint ?? tint).multiplyScalar(.78);
  const point = (u: number, v: number) => {
    const r = rootCurve.getPoint(u), e = edgeCurve.getPoint(u);
    const normal = edgeCurve.getTangent(u).cross(e.clone().sub(r)).normalize();
    return r.lerp(e, v).addScaledVector(normal, Math.sin(v * Math.PI) * Math.sin(u * Math.PI) * .0035);
  };
  for (let i = 0; i <= spans; ++i) for (let j = 0; j <= chords; ++j) {
    const u = i / spans, v = j / chords, p = point(u, v);
    const du = point(Math.min(1, u + .001), v).sub(point(Math.max(0, u - .001), v));
    const dv = point(u, Math.min(1, v + .001)).sub(point(u, Math.max(0, v - .001)));
    temporary.vertex(p, du.cross(dv).normalize(), [u, v], base.clone().lerp(tip, v * v));
    if (i && j) {
      const d = i * (chords + 1) + j, a = d - chords - 2;
      temporary.triangle(a, d - 1, d); temporary.triangle(a, d, a + 1);
    }
  }
  const g = temporary.finish();
  // The rendered tessellation, especially medium LOD, defines the shading frame.
  g.computeVertexNormals(); b.append(g); g.dispose();
  for (let i = 0; i < rayCount; ++i) {
    const u = (i + .4) / rayCount, points: THREE.Vector3[] = [];
    for (let j = 0; j <= (high ? 4 : 2); ++j) points.push(point(u, j / (high ? 4 : 2)));
    tube(rays, points, t => lerp(.00125, .00035, t), tint, high ? 4 : 3, false);
  }
}

function fishFins(kind: FishKind, s: FishSpec, high: boolean): { membrane: THREE.BufferGeometry; rays: THREE.BufferGeometry } {
  const membrane = new GeometryBuilder(), rays = new GeometryBuilder();
  const flat = kind === 'flatfish';
  const tailHeight = s.tailHeight, zBase = s.profile[0][0];
  let tailEdge: V3[];
  if (s.tail === 'round') tailEdge = [[0,-tailHeight,-.465],[0,-tailHeight*.7,-.51],[0,0,-.524],[0,tailHeight*.7,-.51],[0,tailHeight,-.465]];
  else if (s.tail === 'shark') tailEdge = [[0,-.126,-.447],[0,-.079,-.424],[0,-.008,-.382],[0,.087,-.441],[0,.23,-.52]];
  else tailEdge = [[0,-tailHeight,-.515],[0,-tailHeight*.66,s.tail === 'crescent' ? -.444 : -.478],[0,0,s.tail === 'crescent' ? -.350 : -.395],[0,tailHeight*.66,s.tail === 'crescent' ? -.444 : -.478],[0,tailHeight,-.515]];
  let tailRoot: V3[] = [[0,-.024,zBase + .012],[0,0,zBase + .004],[0,.024,zBase + .012]];
  if (flat) {
    tailEdge = tailEdge.map(([x,y,z]) => [y,x,z]); tailRoot = tailRoot.map(([x,y,z]) => [y,x,z]);
  }
  const tailColor = kind === 'tang' || kind === 'kingfish' ? 0xd4bd46 : s.fin;
  fin(membrane, rays, tailRoot, tailEdge, tailColor, high, high ? 17 : 9, kind === 'clownfish' ? 0x242327 : undefined);
  if (flat) {
    for (const side of [-1, 1]) {
      const roots: V3[] = [], edge: V3[] = [];
      for (let i = 0; i < 9; ++i) {
        const z = lerp(-.26, .38, i / 8), [rx] = sampleProfile(s.profile, z);
        roots.push([side * rx * .96, 0, z]);
        edge.push([side * (rx + .037 * Math.sin(Math.PI * i / 8) + .005), -.006, z - .01]);
      }
      fin(membrane, rays, roots, edge, s.fin, high, high ? 25 : 12);
    }
  } else {
    const longDorsal = kind === 'clownfish' || kind === 'grouper' || kind === 'tang' || kind === 'kingfish';
    const zStart = longDorsal ? -.205 : -.14, zEnd = .275;
    const roots: V3[] = [], edge: V3[] = [];
    for (let i = 0; i < 9; ++i) {
      const z = lerp(zStart, zEnd, i / 8), [,ry,cy] = sampleProfile(s.profile, z);
      const peak = Math.exp(-(((z - s.dorsalZ) / (longDorsal ? .21 : .105)) ** 2));
      const serration = kind === 'snapper' || kind === 'grouper' ? (i % 2 ? .006 : 0) : 0;
      roots.push([0, cy + ry * .96, z]);
      edge.push([0, cy + ry + .007 + s.dorsal * peak + serration, z - .026 * peak]);
    }
    fin(membrane, rays, roots, edge, s.fin, high, high ? 18 : 10, kind === 'clownfish' ? 0x262627 : undefined);
    const analRoot: V3[] = [], analEdge: V3[] = [];
    for (let i = 0; i < 5; ++i) {
      const z = lerp(-.22, .02, i / 4), [,ry,cy] = sampleProfile(s.profile, z);
      analRoot.push([0, cy - ry * .96, z]);
      analEdge.push([0, cy - ry - .008 - Math.sin(i / 4 * Math.PI) * (kind === 'tang' ? .05 : .043), z - .026]);
    }
    fin(membrane, rays, analRoot, analEdge, s.fin, high, high ? 11 : 6);
    for (const side of [-1, 1]) {
      const z = .215, [rx,ry,cy] = sampleProfile(s.profile, z);
      const tipX = side * (rx + (kind === 'shark' ? .18 : kind === 'tuna' ? .085 : .065));
      const tipZ = kind === 'shark' ? -.04 : kind === 'tuna' ? -.065 : .05;
      fin(membrane, rays,
        [[side*rx*.91,cy-ry*.2,z+.025],[side*rx*.94,cy-ry*.30,z],[side*rx*.91,cy-ry*.40,z-.025]],
        [[side*(rx+.015),cy-ry*.22,z+.02],[tipX,cy-ry*.48-.025,tipZ],[side*(rx+.024),cy-ry*.56,z-.06]],
        s.fin, high, high ? 9 : 5);
      const [px,py,pc] = sampleProfile(s.profile, -.02);
      fin(membrane, rays,
        [[side*px*.35,pc-py*.91,.005],[side*px*.45,pc-py*.94,-.025]],
        [[side*(px+.025),pc-py-.046,-.065],[side*px*.6,pc-py-.016,-.09]],
        s.fin, high, high ? 5 : 3);
    }
    if (kind === 'tuna' || kind === 'mackerel' || kind === 'kingfish') {
      const count = kind === 'kingfish' ? 3 : 5;
      for (const side of [-1, 1]) for (let i = 0; i < count; ++i) {
        const z = -.135 - i * .029, [,ry,cy] = sampleProfile(s.profile, z);
        const a = vec([0,cy+side*ry,z+.009]), c = vec([0,cy+side*(ry+.021-i*.0015),z-.014]), d = vec([0,cy+side*ry,z-.013]);
        const normal = new THREE.Vector3(-side,0,0), tint = color(kind === 'tuna' ? 0xd9bd55 : s.fin);
        const ia = membrane.vertex(a,normal,[0,0],tint), ic = membrane.vertex(c,normal,[.5,1],tint), id = membrane.vertex(d,normal,[1,0],tint);
        membrane.triangle(ia,ic,id);
        tube(rays,[a,c],.0008,kind === 'tuna' ? 0xd9bd55 : s.fin,3,false);
      }
    }
    if (kind === 'shark') {
      fin(membrane,rays,[[0,.052,-.20],[0,.071,-.135]],[[0,.06,-.235],[0,.104,-.19],[0,.074,-.14]],s.fin,high,5);
    }
  }
  return { membrane: membrane.finish(), rays: rays.finish() };
}

function fishDetails(kind: FishKind, s: FishSpec, high: boolean): { trim: THREE.BufferGeometry; eyes: THREE.BufferGeometry; pupils: THREE.BufferGeometry } {
  const trim = new GeometryBuilder(), eyes = new GeometryBuilder(), pupils = new GeometryBuilder();
  const eyeSegments = high ? 16 : 10, eyeRings = high ? 10 : 6;
  const flat = kind === 'flatfish';
  for (const side of [-1, 1]) {
    const theta = side > 0 ? .17 : Math.PI - .17;
    const p = flat ? vec([side > 0 ? .065 : .020, .029, side > 0 ? .289 : .337]) : surfacePoint(s.profile,s.eyeZ,theta,.0015);
    const normal = flat ? new THREE.Vector3(0,1,0) : new THREE.Vector3(side,.12,.13).normalize();
    const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,0,1),normal);
    const r = s.eyeRadius;
    ellipsoid(trim,p.toArray() as V3,[r*1.2,r*1.13,r*.38],s.back,eyeSegments,high ? 6 : 4,q);
    const ep = p.clone().addScaledVector(normal,r*.19);
    ellipsoid(eyes,ep.toArray() as V3,[r,r*.93,r*.48],kind === 'shark' ? 0x646b68 : 0xb8a56d,eyeSegments,eyeRings,q);
    const pupil = p.clone().addScaledVector(normal,r*.63);
    ellipsoid(pupils,pupil.toArray() as V3,[r*.55,r*.57,r*.12],0x091519,high ? 12 : 8,high ? 6 : 4,q);
    const gillCount = kind === 'shark' ? 5 : 1;
    for (let g = 0; g < gillCount; ++g) {
      const points: THREE.Vector3[] = [];
      for (let j = 0; j <= (high ? 15 : 9); ++j) {
        const t = j / (high ? 15 : 9), angle = lerp(-1.01,1.05,t);
        const z = (kind === 'shark' ? .242 - g*.020 : .272) - .035*Math.sin(Math.PI*t);
        const th = side > 0 ? angle : Math.PI - angle;
        if (flat) points.push(surfacePoint(s.profile,z,side > 0 ? .58+t*.54 : 2.12+t*.4,.002));
        else points.push(surfacePoint(s.profile,z,th,.0018));
      }
      tube(trim,points,kind === 'shark' ? .0013 : .0016,kind === 'clownfish' ? 0x623c27 : s.back,high ? 4 : 3);
    }
    if (!flat) {
      const lateral: THREE.Vector3[] = [];
      for (let j = 0; j <= (high ? 28 : 17); ++j) {
        const z = lerp(-.27,.244,j/(high ? 28 : 17));
        const a = .11 + .11 * Math.exp(-(((z-.13)/.17)**2));
        lateral.push(surfacePoint(s.profile,z,side > 0 ? a : Math.PI-a,.0011));
      }
      tube(trim,lateral,kind === 'menhaden' ? .00065 : .0009,kind === 'kingfish' ? 0xbcac69 : s.flank,3);
      const mouth: THREE.Vector3[] = [];
      const lastZ = s.profile[s.profile.length-1][0];
      for (let j=0;j<=10;++j) {
        const z = lerp(lastZ-.065,lastZ-.004,j/10);
        mouth.push(surfacePoint(s.profile,z,side > 0 ? -.34 : Math.PI+.34,.0009));
      }
      tube(trim,mouth,kind === 'grouper' ? .0025 : .0011,s.back,high ? 4 : 3);
      if (kind === 'menhaden' && side === 1) {
        // Small ventral scutes, a distinctive keel along the belly.
        for (let j=0;j<(high ? 17 : 9);++j) {
          const z = lerp(-.17,.21,j/(high ? 16 : 8)), [,ry,cy] = sampleProfile(s.profile,z);
          tube(trim,[vec([-.005,cy-ry,z+.003]),vec([0,cy-ry-.004,z]),vec([.005,cy-ry,z-.003])],.0008,0xd8dcd0,3,false);
        }
      }
    }
  }
  if (flat) tube(trim,path([[.025,.011,.398],[.02,.003,.438],[-.006,-.003,.447]],10),.0013,s.back,4);
  return { trim:trim.finish(), eyes:eyes.finish(), pupils:pupils.finish() };
}

function makeFish(kind: FishKind, high: boolean, parent: THREE.Group, r: Resources): (time: number, speed: number) => void {
  const s = FISH[kind];
  const motion: FishMotion = {phase:{value:0},amplitude:{value:.045},flat:{value:kind === 'flatfish' ? 1 : 0}};
  const textures = skinTextures(kind,high,r);
  const bodyMaterial = trackMaterial(r,new THREE.MeshPhysicalMaterial({
    color:0xffffff,...textures,bumpScale:kind === 'shark' ? .00065 : .0011,
    metalness:s.metal,roughness:kind === 'grouper' || kind === 'flatfish' ? .51 : .37,
    clearcoat:.24,clearcoatRoughness:.33,
  }));
  const finMaterial = standard(r,0xffffff,.48,.10,true); finMaterial.side=THREE.DoubleSide;
  const detailMaterial = standard(r,0xffffff,.42,.22,true);
  const eyeMaterial = standard(r,0xffffff,.22,.25,true);
  const pupilMaterial = trackMaterial(r,new THREE.MeshPhysicalMaterial({color:0xffffff,vertexColors:true,roughness:.12,clearcoat:.8,clearcoatRoughness:.08}));
  for (const material of [bodyMaterial,finMaterial,detailMaterial,eyeMaterial,pupilMaterial]) bendMaterial(material,motion);
  const depth = trackMaterial(r,bendMaterial(new THREE.MeshDepthMaterial({depthPacking:THREE.RGBADepthPacking,side:THREE.DoubleSide}),motion));
  const distance = trackMaterial(r,bendMaterial(new THREE.MeshDistanceMaterial({side:THREE.DoubleSide}),motion));
  const fins = fishFins(kind,s,high), details = fishDetails(kind,s,high);
  mesh(r,parent,'profiled-body',bodyGeometry(s.profile,high ? 64 : 38,high ? 48 : 24),bodyMaterial);
  mesh(r,parent,'cambered-fin-membranes',fins.membrane,finMaterial);
  mesh(r,parent,'individual-fin-rays',fins.rays,detailMaterial);
  mesh(r,parent,'gills-mouth-lateral-lines',details.trim,detailMaterial);
  mesh(r,parent,'irises',details.eyes,eyeMaterial);
  mesh(r,parent,'pupils',details.pupils,pupilMaterial);
  parent.traverse(o => {
    if (o instanceof THREE.Mesh) { o.customDepthMaterial=depth; o.customDistanceMaterial=distance; }
  });
  const clock = animationClock(s.frequency*.35,s.frequency*.65);
  return (time,speed) => {
    motion.phase.value = clock(time,speed) % TAU;
    motion.amplitude.value = (kind === 'tuna' ? .036 : kind === 'flatfish' ? .025 : .050) * (.24 + .76 * Math.min(speed,2));
  };
}

// Restored roster uses the original low-level profile, tube and cambered-fin
// tools. No original species is routed through, or substituted by, this branch.
type ReefFamily = 'lion' | 'soft' | 'disk' | 'cardinal' | 'box' | 'wrasse'
  | 'dragonet' | 'puffer' | 'sunfish' | 'bill' | 'flat' | 'clown' | 'tang' | 'reef';
type ReefSpec = FishSpec & {
  family: ReefFamily; label: string; features: string[]; sectionPower: number;
};
function reefSpec(label: string, family: ReefFamily, profile: Profile[],
  palette: [number, number, number, number], features: string[],
  options: Partial<FishSpec & { sectionPower: number }> = {}): ReefSpec {
  return { label, family, profile, back: palette[0], flank: palette[1], belly: palette[2], fin: palette[3],
    tail: 'round', tailHeight: .12, eyeZ: .33, eyeRadius: .011,
    dorsal: .068, dorsalZ: .10, metal: .12, frequency: 3.1, sectionPower: 1,
    ...options, features };
}

const REEF: Record<ReefKind, ReefSpec> = {
  'black-lionfish': reefSpec('Dark banded lionfish', 'lion',
    [[-.28,.022,.045,0],[-.17,.055,.090,0],[-.03,.105,.143,.006],[.12,.118,.152,.008],[.26,.092,.131,.005],[.36,.058,.100,-.005],[.445,0,0,-.028]],
    [0x211d26,0x47383d,0xc2ad9e,0x352f3f], ['dark-cream-bands','separated-dorsal-spines','pectoral-feathers','supraorbital-tentacles'],
    {tailHeight:.116,eyeZ:.33,dorsal:.30,frequency:2.0}),
  blobfish: reefSpec('Soft-bodied benthic blobfish', 'soft',
    [[-.31,.019,.024,-.025],[-.23,.040,.041,-.023],[-.12,.072,.078,-.014],[.04,.145,.132,0],[.20,.170,.155,.015],[.34,.135,.137,.021],[.43,.076,.091,-.005],[.48,0,0,-.023]],
    [0xbda096,0xe1b7a8,0xf2d5c3,0xc99588], ['gelatinous-head','pendulous-nose','downturned-mouth','low-soft-fins'],
    {tailHeight:.065,eyeZ:.345,eyeRadius:.009,dorsal:.026,metal:.02,frequency:1.4}),
  butterflyfish: reefSpec('Eyespot butterflyfish', 'disk',
    [[-.25,.012,.047,0],[-.17,.027,.127,0],[-.05,.048,.227,0],[.095,.052,.247,0],[.23,.042,.210,-.007],[.325,.026,.123,-.025],[.405,.016,.035,-.045],[.46,0,0,-.049]],
    [0xdfa828,0xf0d957,0xffefb2,0xe8c447], ['compressed-disk','posterior-eyespot','eye-mask','pointed-snout'],
    {eyeZ:.32,tailHeight:.104,dorsal:.041}),
  cardinalfish: reefSpec('Banded double-dorsal cardinalfish', 'cardinal',
    [[-.29,.015,.031,0],[-.20,.028,.062,0],[-.06,.053,.103,0],[.10,.065,.124,.008],[.24,.054,.111,.010],[.35,.036,.081,.007],[.435,0,0,-.010]],
    [0x74797d,0xdad9c9,0xf3ead7,0x292d39], ['three-dark-bars','two-separated-dorsals','white-fin-speckles','large-eyes'],
    {tail:'fork',eyeZ:.335,eyeRadius:.018,tailHeight:.168,dorsal:.16,frequency:3.4}),
  cowfish: reefSpec('Horned box cowfish', 'box',
    [[-.30,.019,.025,0],[-.22,.060,.070,0],[-.13,.109,.118,.002],[.06,.128,.134,.008],[.23,.118,.126,.010],[.35,.085,.098,.008],[.425,.032,.049,-.018],[.47,0,0,-.036]],
    [0xa29130,0xe1c653,0xf2dfa0,0xddb950], ['angular-carapace','paired-forehead-horns','rear-horns','hexagonal-scutes'],
    {sectionPower:.34,eyeZ:.337,eyeRadius:.013,dorsal:.036,tailHeight:.082,frequency:2.6}),
  humphead: reefSpec('Humphead wrasse', 'wrasse',
    [[-.29,.027,.050,0],[-.19,.048,.095,0],[-.06,.093,.155,.008],[.09,.115,.183,.030],[.22,.110,.218,.061],[.31,.087,.209,.068],[.39,.058,.116,.008],[.46,.028,.048,-.043],[.485,0,0,-.044]],
    [0x306d65,0x579f89,0xb8c2a0,0x337e7b], ['pronounced-forehead-hump','thick-lips','reticulated-scales','facial-lines'],
    {eyeZ:.365,eyeRadius:.012,tailHeight:.148,dorsal:.046,frequency:2.1}),
  lionfish: reefSpec('Light striped lionfish', 'lion',
    [[-.28,.020,.041,0],[-.17,.049,.083,0],[-.02,.096,.132,.008],[.13,.109,.147,.012],[.27,.088,.129,.008],[.37,.054,.093,-.004],[.45,0,0,-.030]],
    [0x96533d,0xefe0be,0xf9ebd2,0xca9777], ['rust-ivory-bands','separated-dorsal-spines','pectoral-feathers','supraorbital-tentacles'],
    {eyeZ:.34,tailHeight:.127,dorsal:.33,frequency:2.2}),
  mandarinfish: reefSpec('Patterned mandarin dragonet', 'dragonet',
    [[-.31,.018,.030,-.013],[-.22,.030,.052,-.006],[-.10,.051,.077,0],[.055,.071,.091,.005],[.21,.089,.099,.010],[.33,.067,.074,.008],[.42,.038,.044,-.010],[.47,0,0,-.025]],
    [0x24767b,0x279fa1,0xe3b661,0xde913e], ['undulating-orange-cyan-pigment','raised-eyes','two-dorsals','broad-pelvic-fans'],
    {eyeZ:.33,eyeRadius:.014,tailHeight:.108,dorsal:.13,metal:.03,frequency:2.8}),
  'moorish-idol': reefSpec('Banner-finned Moorish idol', 'disk',
    [[-.25,.012,.040,0],[-.17,.026,.128,.008],[-.05,.041,.226,.014],[.085,.044,.256,.014],[.21,.036,.220,.004],[.315,.022,.127,-.026],[.39,.015,.041,-.061],[.455,0,0,-.073]],
    [0xc9ba78,0xf6efce,0xf9f4de,0xf3e4af], ['black-white-yellow-saddles','elongated-dorsal-banner','tubular-snout'],
    {tail:'fork',eyeZ:.31,tailHeight:.122,dorsal:.065,frequency:2.9}),
  parrotfish: reefSpec('Beaked reef parrotfish', 'wrasse',
    [[-.29,.021,.037,0],[-.18,.045,.074,0],[-.04,.081,.122,0],[.11,.098,.148,.012],[.25,.096,.143,.018],[.36,.075,.116,.014],[.43,.048,.075,-.002],[.48,0,0,-.028]],
    [0x267d8a,0x43b8a0,0xc2dd9d,0x459faf], ['two-part-fused-beak','large-edged-scales','cheek-markings'],
    {tail:'crescent',eyeZ:.35,eyeRadius:.012,tailHeight:.141,dorsal:.055}),
  puffer: reefSpec('Spiny spotted puffer', 'puffer',
    [[-.30,.017,.028,0],[-.24,.036,.050,0],[-.15,.127,.140,0],[0,.201,.220,0],[.16,.208,.221,.003],[.29,.166,.175,.010],[.385,.084,.103,.003],[.455,0,0,-.021]],
    [0x80794e,0xc7bd82,0xf1e4ba,0xb4a56a], ['rounded-inflated-body','distributed-tapered-spines','beak-mouth','small-rear-fins'],
    {eyeZ:.343,eyeRadius:.018,tailHeight:.067,dorsal:.030,metal:.02,frequency:2.5}),
  'royal-gramma': reefSpec('Purple and gold royal gramma', 'reef',
    [[-.29,.014,.030,0],[-.20,.026,.050,0],[-.06,.044,.077,0],[.10,.054,.094,0],[.25,.050,.085,.008],[.36,.032,.061,.008],[.455,0,0,-.010]],
    [0x502371,0x9a40c4,0xd788cb,0x814d9d], ['purple-head-gold-tail','dark-eye-streak','dorsal-ocellus'],
    {tail:'fork',eyeZ:.343,tailHeight:.093,dorsal:.061,frequency:3.5}),
  sunfish: reefSpec('Tall ocean sunfish with clavus', 'sunfish',
    [[-.285,.031,.173,0],[-.23,.052,.236,0],[-.10,.091,.287,.003],[.045,.112,.296,.010],[.18,.106,.268,.011],[.285,.077,.208,.011],[.35,.047,.122,.008],[.40,.029,.054,-.003],[.433,0,0,-.012]],
    [0x677878,0xa7b4ae,0xd4dbca,0x788b86], ['tall-disk','scalloped-clavus','opposed-dorsal-anal-paddles','small-beak'],
    {eyeZ:.35,eyeRadius:.012,dorsal:.24,metal:.09,frequency:1.7}),
  swordfish: reefSpec('Long-billed swordfish', 'bill',
    [[-.30,.013,.025,0],[-.22,.024,.042,0],[-.09,.051,.073,0],[.07,.070,.097,.003],[.21,.067,.088,.002],[.33,.043,.060,0],[.41,.026,.035,.001],[.485,0,0,.012]],
    [0x233d53,0x789bab,0xe4e7dd,0x395771], ['flattened-sword-bill','lunate-tail','swept-dorsal','peduncle-keels'],
    {tail:'crescent',eyeZ:.362,eyeRadius:.011,tailHeight:.205,dorsal:.195,metal:.39,frequency:2.6}),
  turbot: reefSpec('Top-eyed rhomboid turbot', 'flat',
    [[-.28,.034,.012,0],[-.19,.118,.025,0],[-.04,.240,.039,0],[.10,.262,.044,.001],[.23,.197,.037,.002],[.34,.106,.029,.003],[.42,.053,.019,.002],[.47,0,0,0]],
    [0x6c6044,0x978565,0xe2dac8,0x9b8968], ['horizontal-rhomboid','both-eyes-on-top','mottled-tubercles','continuous-fringe'],
    {eyeZ:.33,eyeRadius:.010,tailHeight:.098,dorsal:.045,metal:.03,frequency:2.0}),
  'yellow-tang': reefSpec('Sail-finned yellow tang', 'tang',
    [[-.27,.012,.041,0],[-.18,.025,.112,0],[-.055,.041,.211,.006],[.085,.046,.239,.003],[.215,.037,.204,0],[.31,.024,.120,-.017],[.38,.019,.048,-.036],[.44,0,0,-.052]],
    [0xd9af12,0xf5d729,0xffea67,0xefcd20], ['solid-lemon-pigment','high-dorsal-and-anal','white-caudal-scalpel','pointed-mouth'],
    {tail:'fork',eyeZ:.31,tailHeight:.12,dorsal:.072,metal:.08}),
  'zebra-clownfish': reefSpec('Black and white zebra clownfish', 'clown',
    [[-.29,.019,.044,0],[-.20,.034,.073,0],[-.065,.061,.135,0],[.09,.075,.164,.002],[.235,.069,.146,.007],[.35,.048,.111,.002],[.43,.025,.058,-.006],[.47,0,0,-.012]],
    [0x12191d,0x252b31,0x515353,0x242c31], ['three-white-bands','black-body','white-fin-margins'],
    {eyeZ:.34,tailHeight:.116,dorsal:.065,metal:.05,frequency:3.4}),
  surgeonfish: reefSpec('Striped olive surgeonfish', 'tang',
    [[-.29,.013,.035,0],[-.20,.024,.079,0],[-.07,.048,.146,0],[.085,.064,.181,.006],[.225,.059,.168,.003],[.335,.039,.125,-.004],[.41,.024,.066,-.017],[.47,0,0,-.027]],
    [0x545957,0x8f9474,0xcbd0a8,0xb8ab56], ['fine-horizontal-stripes','orange-shoulder','paired-caudal-scalpels','crescent-tail'],
    {tail:'crescent',eyeZ:.351,tailHeight:.150,dorsal:.058,metal:.17,frequency:3.2}),
  'reef-fish-one': reefSpec('Original silver fusiform reef fish', 'reef',
    [[-.31,.012,.024,0],[-.22,.024,.047,0],[-.08,.046,.088,.002],[.085,.064,.112,.006],[.245,.058,.096,.005],[.35,.035,.058,.003],[.45,0,0,-.005]],
    [0x3f687a,0xb1c8cd,0xf0ecdb,0x8baba9], ['silver-fusiform','fine-gold-lateral-stripe','fork-tail'],
    {tail:'fork',eyeZ:.35,tailHeight:.14,dorsal:.082,metal:.51,frequency:3.7}),
  'reef-fish-two': reefSpec('Original deep striped reef fish', 'reef',
    [[-.28,.015,.040,0],[-.18,.031,.110,0],[-.045,.053,.197,.009],[.115,.064,.230,.012],[.25,.052,.195,.008],[.35,.033,.121,-.003],[.45,0,0,-.023]],
    [0x6b796b,0xcdd4a0,0xeeebc7,0xc7b85d], ['deep-body','five-vertical-charcoal-bars','high-comb-dorsal'],
    {tail:'fork',eyeZ:.34,tailHeight:.137,dorsal:.077,metal:.17,frequency:3.0}),
  'reef-fish-three': reefSpec('Original slender warm reef fish', 'reef',
    [[-.31,.011,.023,-.004],[-.22,.021,.039,-.001],[-.08,.038,.061,0],[.085,.050,.079,.003],[.24,.045,.073,.006],[.36,.027,.047,.004],[.46,0,0,-.008]],
    [0xa9493b,0xea9672,0xf9d9a6,0xc97557], ['slender-warm-body','undulating-lilac-stripes','rounded-tail'],
    {tail:'round',eyeZ:.35,tailHeight:.077,dorsal:.045,metal:.15,frequency:3.9}),
};

/** Superellipse sections give the cowfish actual planar-looking armour. */
function reefSurface(s: ReefSpec, z: number, theta: number, lift = 0): THREE.Vector3 {
  const [rx, ry, cy] = sampleProfile(s.profile,z);
  const power = (v: number) => Math.sign(v) * Math.pow(Math.abs(v),s.sectionPower);
  return vec([(rx+lift)*power(Math.cos(theta)),cy+(ry+lift)*power(Math.sin(theta)),z]);
}
function reefBody(s: ReefSpec, high: boolean): THREE.BufferGeometry {
  const g=bodyGeometry(s.profile,high?84:46,high?64:36);
  if(s.sectionPower!==1) {
    const p=g.getAttribute('position'), uv=g.getAttribute('uv');
    for(let i=0;i<p.count-2;++i) {
      const v=reefSurface(s,p.getZ(i),uv.getY(i)*TAU); p.setXYZ(i,v.x,v.y,v.z);
    }
    g.computeVertexNormals(); g.computeBoundingBox(); g.computeBoundingSphere();
  }
  return g;
}

/** Deterministic original pigments: no images, downloads, canvas or DOM. */
function reefTextures(kind: ReefKind, s: ReefSpec, high: boolean, r: Resources): {map:THREE.DataTexture;bumpMap:THREE.DataTexture} {
  const width=high?512:256, height=high?256:128;
  const pigment=new Uint8Array(width*height*4), relief=new Uint8Array(pigment.length);
  const back=hexRGB(s.back), flank=hexRGB(s.flank), belly=hexRGB(s.belly);
  for(let y=0;y<height;++y) for(let x=0;x<width;++x) {
    const u=x/(width-1), v=y/(height-1), d=Math.sin(v*TAU), grain=noise(x,y,43);
    const clouds=smoothNoise(u*17,v*19,11);
    let c=mixRGB(flank,back,Math.pow(Math.max(0,d),1.4));
    c=mixRGB(c,belly,Math.pow(Math.max(0,-d),1.5));
    const row=Math.floor(v*44), sx=(u*(s.family==='wrasse'?32:53)+(row%2)*.5)%1, sy=(v*44)%1;
    const rim=Math.exp(-(((Math.hypot(sx-.46,(sy-.5)*.8)-.45)/.048)**2));
    const scaleless=['soft','puffer','flat','sunfish','dragonet','bill'].includes(s.family);
    let bump=.47+(grain-.5)*.12+(scaleless?0:rim*.23);
    let shine=1+(grain-.5)*.055+(scaleless?0:rim*.075);
    if(s.family==='lion') {
      const band=Math.sin(u*TAU*10+.65*Math.sin(d*5)+.35*Math.sin(v*TAU*3));
      const dark=kind==='black-lionfish';
      c=hexRGB(band>(dark?.22:-.05)?(dark?0x25212c:0x994e3a):(dark?0xd5c6b3:0xf6e9cf));
      if(Math.abs(band)<.16) c=mixRGB(c,hexRGB(dark?0x906e62:0x4b302b),.7);
    } else if(kind==='blobfish') {
      c=mixRGB(c,hexRGB(0xb88e8e),clouds*.23); bump=.48+(grain-.5)*.035; shine=1;
    } else if(kind==='butterflyfish') {
      const spot=((u-.30)/.077)**2+((d-.24)/.34)**2;
      if(spot<1.5)c=hexRGB(0xf8eed2); if(spot<1)c=hexRGB(0x202c37);
      if(Math.abs(u-(.805+.028*d))<.032)c=hexRGB(0x202a33);
      if(u>.37&&u<.73&&Math.sin(u*130+d*13)>.74)c=mixRGB(c,hexRGB(0x996b28),.35);
    } else if(kind==='cardinalfish') {
      const a=Math.min(Math.abs(u-.22-.024*d),Math.abs(u-.54+.02*d),Math.abs(u-.83-.014*d));
      if(a<.047)c=hexRGB(0x242632);
      if(noise(Math.floor(u*80),Math.floor(v*54),8)>.95)c=mixRGB(c,hexRGB(0xffffff),.65);
    } else if(kind==='cowfish') {
      const col=Math.floor(v*21), hx=(u*29+(col%2)*.5)%1-.5, hy=(v*21)%1-.5;
      const plate=Math.max(Math.abs(hy)*1.12,Math.abs(hx)*.86+Math.abs(hy)*.5);
      if(plate>.43)c=mixRGB(c,hexRGB(0x84793c),.32);
      if(hx*hx+hy*hy<.038)c=mixRGB(c,hexRGB(0x55958c),.8);
      bump=.42+.16*(1-clamp((plate-.36)*8,0,1));
    } else if(kind==='humphead') {
      if(u>.71&&Math.sin(u*147+d*17+2*Math.sin(d*8))>.35)c=mixRGB(c,hexRGB(0x214f62),.65);
      c=mixRGB(c,hexRGB(0xb5c87f),rim*.29);
    } else if(kind==='mandarinfish') {
      const wave=Math.sin(u*34+Math.sin(d*6)*3.3+Math.sin(u*14-v*TAU*3)*1.8);
      c=hexRGB(wave>.35?0xeb8e27:wave>.06?0x174663:wave>-.18?0x42d4e0:0x277a66);
      if(Math.sin(u*62+Math.cos(v*TAU*5)*2)>.94)c=mixRGB(c,hexRGB(0xe7cf4a),.7);
      bump=.5+(grain-.5)*.035;
    } else if(kind==='moorish-idol') {
      const band=Math.min(Math.abs(u-.25-.035*d),Math.abs(u-.73+.065*d));
      if(band<.086)c=hexRGB(0x20292e);
      else if(u>.38&&u<.62)c=mixRGB(c,hexRGB(0xf1c92d),.87);
    } else if(kind==='parrotfish') {
      c=mixRGB(c,hexRGB(0x815297),rim*.48);
      if(u>.69&&Math.abs(Math.sin(u*28+d*8))<.21)c=mixRGB(c,hexRGB(0xf397b5),.83);
    } else if(kind==='puffer') {
      const row2=Math.floor(v*18), px=(u*29+(row2%2)*.5)%1-.5, py=(v*18)%1-.5;
      if(px*px+py*py<.075&&d>-.7)c=mixRGB(c,hexRGB(0x4a4e35),.82);
    } else if(kind==='royal-gramma') {
      c=mixRGB(hexRGB(0xf5cf36),c,clamp((u-.45)*22,0,1));
      if(u>.77&&Math.abs(d-(.18+(u-.82)*2.0))<.10)c=hexRGB(0x32243c);
    } else if(kind==='sunfish') {
      c=mixRGB(c,hexRGB(0x657574),clouds*.30);
      if(grain>.96)c=mixRGB(c,hexRGB(0xe2e1c9),.40);
      bump=.4+grain*.22;
    } else if(kind==='swordfish') {
      c=mixRGB(c,hexRGB(0x34567a),Math.max(0,d)*.3);
      bump=.5+(grain-.5)*.045;
    } else if(kind==='turbot') {
      if(d<0)c=hexRGB(0xe3dbc9);
      else {
        const mottled=smoothNoise(u*48,v*40,17);
        c=mixRGB(c,hexRGB(0x494b38),clamp((clouds-.35)*1.35,0,.7));
        if(mottled>.63)c=mixRGB(c,hexRGB(0xd6bc8a),.6);
        bump=.40+mottled*.27;
      }
    } else if(kind==='yellow-tang') {
      c=mixRGB(c,hexRGB(0xffdf23),.45);
      if(u<.15&&Math.abs(d)<.25)c=hexRGB(0xf9f3c9);
    } else if(kind==='zebra-clownfish') {
      const bend=.018*Math.cos(v*TAU*2);
      if(Math.min(Math.abs(u-.23-bend),Math.abs(u-.54+bend),Math.abs(u-.83-bend))<.057)c=hexRGB(0xf4f2df);
    } else if(kind==='surgeonfish') {
      if(Math.sin(d*48+u*2)>.22)c=mixRGB(c,hexRGB(0x504d58),.47);
      const shoulder=((u-.69)/.105)**2+((d-.12)/.27)**2;
      if(shoulder<1)c=mixRGB(c,hexRGB(0xec9c42),.90);
      if(u<.12)c=mixRGB(c,hexRGB(0xe4d6a8),.7);
    } else if(kind==='reef-fish-one') {
      c=mixRGB(c,hexRGB(0xcbb562),Math.exp(-(((d-.09)/.06)**2))*.75);
    } else if(kind==='reef-fish-two') {
      if(Math.sin(u*TAU*5.1+.5*d)>.45&&u<.87)c=mixRGB(c,hexRGB(0x303f47),.93);
    } else if(kind==='reef-fish-three') {
      if(Math.abs(Math.sin(d*14+Math.sin(u*9)*.65))<.22)c=mixRGB(c,hexRGB(0xa2799b),.72);
    }
    const i=(y*width+x)*4;
    for(let channel=0;channel<3;++channel) {pigment[i+channel]=clamp(c[channel]*shine*255,0,255);relief[i+channel]=clamp(bump*255,0,255);}
    pigment[i+3]=relief[i+3]=255;
  }
  for(let x=0;x<width*4;++x) {pigment[(height-1)*width*4+x]=pigment[x];relief[(height-1)*width*4+x]=relief[x];}
  const make=(data:Uint8Array,srgb:boolean)=>{
    const t=new THREE.DataTexture(data,width,height,THREE.RGBAFormat,THREE.UnsignedByteType);
    t.colorSpace=srgb?THREE.SRGBColorSpace:THREE.NoColorSpace;
    t.wrapS=THREE.ClampToEdgeWrapping;t.wrapT=THREE.RepeatWrapping;
    t.magFilter=THREE.LinearFilter;t.minFilter=THREE.LinearMipmapLinearFilter;t.generateMipmaps=true;t.needsUpdate=true;
    r.textures.add(t);return t;
  };
  return {map:make(pigment,true),bumpMap:make(relief,false)};
}

/** Band-coloured, tapered spines remain separate geometry at both LODs. */
function reefSpine(b: GeometryBuilder, controls: V3[], radius: number, tint: number, high: boolean, band?: number): void {
  const first=b.colors.length/3;
  tube(b,path(controls,high?10:5),t=>radius*Math.pow(1-t,.85)+.00025,tint,high?6:4);
  if(band!==undefined) {
    const dark=color(band);
    for(let i=first;i<b.colors.length/3;++i) if(Math.sin(b.uvs[i*2]*TAU*5)>.2) {
      b.colors[i*3]=dark.r;b.colors[i*3+1]=dark.g;b.colors[i*3+2]=dark.b;
    }
  }
}

function reefFins(kind: ReefKind, s: ReefSpec, high: boolean, membrane: GeometryBuilder, trim: GeometryBuilder): void {
  const flat=s.family==='flat', lion=s.family==='lion';
  const add=(roots:V3[],edge:V3[],rays=12,tint=s.fin,edgeTint?:number)=>
    fin(membrane,trim,roots,edge,tint,high,high?rays:Math.max(3,Math.ceil(rays*.55)),edgeTint);
  const median=(sign:number,z0:number,z1:number,height:number,peak=.55,tint=s.fin)=>{
    const roots:V3[]=[],edge:V3[]=[];
    for(let i=0;i<=12;++i) {
      const t=i/12,z=lerp(z0,z1,t),[,ry,cy]=sampleProfile(s.profile,z);
      const envelope=Math.pow(Math.sin(Math.PI*t),.70)*Math.exp(-(((t-peak)/.8)**2));
      roots.push([0,cy+sign*ry*.97,z]);
      edge.push([0,cy+sign*(ry+.004+height*envelope),z-.032*envelope]);
    }
    add(roots,edge,18,tint,kind==='zebra-clownfish'?0xf4f1df:undefined);
  };
  if(s.family==='sunfish') {
    // A broad scalloped truncation, with no peduncle or forked caudal fin.
    const roots:V3[]=[], edge:V3[]=[];
    for(let i=0;i<=16;++i) {
      const t=i/16,y=lerp(-.175,.175,t);
      roots.push([0,y,-.282]);
      edge.push([0,y*1.04,-.337-.014*Math.sin(t*Math.PI)-.010*Math.sin(t*8*Math.PI)**2]);
    }
    add(roots,edge,22,0x91a099);
    for(const side of [-1,1]) add(
      [[0,side*.230,-.225],[0,side*.273,-.145],[0,side*.294,-.035]],
      [[0,side*.260,-.257],[0,side*.526,-.17],[0,side*.493,-.095],[0,side*.306,-.025]],20,s.fin);
  } else {
    const h=s.tailHeight,z=s.profile[0][0],crescent=s.tail==='crescent';
    let edge:V3[]=s.tail==='round'
      ? [[0,-h,-.465],[0,-h*.75,-.510],[0,0,-.525],[0,h*.75,-.510],[0,h,-.465]]
      : [[0,-h,-.521],[0,-h*.64,crescent?-.420:-.478],[0,0,crescent?-.347:-.409],[0,h*.64,crescent?-.420:-.478],[0,h,-.521]];
    let roots:V3[]=[[0,-.025,z+.009],[0,0,z+.003],[0,.025,z+.009]];
    if(flat) {edge=edge.map(([x,y,z1])=>[y,x,z1]);roots=roots.map(([x,y,z1])=>[y,x,z1]);}
    add(roots,edge,20,kind==='royal-gramma'?0xefc93b:s.fin,kind==='zebra-clownfish'?0xf1eedb:undefined);
  }
  if(flat) {
    for(const side of [-1,1]) {
      const roots:V3[]=[],edge:V3[]=[];
      for(let i=0;i<=16;++i) {
        const t=i/16,z=lerp(-.25,.411,t),[rx,,cy]=sampleProfile(s.profile,z);
        roots.push([side*rx*.98,cy,z]);
        edge.push([side*(rx+.044*Math.sin(Math.PI*t)+.003),cy-.007,z-.012]);
      }
      add(roots,edge,32);
    }
    return;
  }
  if(lion) {
    const dark=kind==='black-lionfish', pale=dark?0xc1b4ab:0xf3dbba, stripe=dark?0x2c2330:0x9e513b;
    // Only basal webbing joins the 13 long dorsal spines. Distal shafts have air gaps.
    median(1,-.205,.285,.037);
    for(let i=0;i<13;++i) {
      const t=i/12,z=lerp(.285,-.21,t),[,ry,cy]=sampleProfile(s.profile,z);
      const h=s.dorsal*(.62+.38*Math.sin(Math.PI*t)), tipZ=z-.065-.07*t;
      reefSpine(trim,[[0,cy+ry*.93,z],[0,cy+ry+h*.58,z-.015],[.004*Math.sin(i),cy+ry+h,tipZ]],.0038,pale,high,stripe);
      add([[0,cy+ry,z-.010],[0,cy+ry,z+.010]],
        [[0,cy+ry+h*.68,tipZ-.012],[0,cy+ry+h*.77,tipZ],[0,cy+ry+h*.48,tipZ+.013]],3,pale,stripe);
    }
    for(const side of [-1,1]) for(let i=0;i<10;++i) {
      const t=i/9,root=reefSurface(s,.16-t*.17,side>0?-.22:Math.PI+.22);
      const tip:V3=[side*(.34+.13*Math.sin(t*Math.PI)),lerp(.04,-.23,t),lerp(.12,-.36,t)];
      const mid:V3=[lerp(root.x,tip[0],.58),lerp(root.y,tip[1],.56)+.018,lerp(root.z,tip[2],.58)];
      reefSpine(trim,[root.toArray() as V3,mid,tip],.0035,pale,high,stripe);
      const rootA:V3=[root.x,root.y+.008,root.z+.008],rootB:V3=[root.x,root.y-.008,root.z-.008];
      add([rootA,rootB],[[tip[0]*.85,tip[1]+.018,tip[2]+.014],tip,[tip[0]*.83,tip[1]-.015,tip[2]-.018]],3,pale,stripe);
    }
    median(-1,-.205,-.025,.090);
    return;
  }
  if(s.family==='cardinal'||s.family==='dragonet') {
    median(1,.08,.28,s.dorsal,.52);
    median(1,-.205,.033,s.family==='cardinal'?.144:.082,.62);
    median(-1,-.225,.02,.075);
  } else if(s.family==='box'||s.family==='puffer') {
    median(1,-.20,-.075,.065);median(-1,-.205,-.09,.053);
  } else if(s.family==='soft') {
    median(1,-.255,.065,.025);median(-1,-.26,-.07,.024);
  } else if(s.family==='bill') {
    add([[0,.070,-.14],[0,.090,.10],[0,.073,.27]],
      [[0,.080,-.195],[0,.150,-.015],[0,.299,.145],[0,.082,.275]],18);
    median(1,-.26,-.18,.025);median(-1,-.24,-.07,.05);
  } else if(s.family!=='sunfish') {
    median(1,-.215,.282,s.dorsal,.60);
    median(-1,-.218,.055,s.family==='disk'||s.family==='tang'?.080:.049,.56,
      kind==='royal-gramma'?0xebc746:s.fin);
  }
  if(kind==='moorish-idol') {
    // Long curved ribbon with an actual free tip, attached at the dorsal shoulder.
    add([[0,.239,.165],[0,.326,.11],[0,.470,-.015],[0,.592,-.20],[0,.553,-.34]],
      [[0,.255,.19],[0,.365,.143],[0,.503,.012],[0,.610,-.19],[0,.553,-.34]],12,0xf5ecd4);
  }
  for(const side of [-1,1]) {
    const z=s.family==='sunfish'?.25:.20, [rx,ry,cy]=sampleProfile(s.profile,z);
    const fan=s.family==='dragonet'?.143:s.family==='soft'?.139:s.family==='bill'?.151:.082;
    const tipZ=s.family==='bill'?-.085:s.family==='soft'?.031:.071;
    add([[side*rx*.97,cy-ry*.15,z+.029],[side*rx,cy-ry*.33,z],[side*rx*.97,cy-ry*.49,z-.025]],
      [[side*(rx+.02),cy-ry*.13,z+.025],[side*(rx+fan),cy-ry*.30-.024,tipZ],
        [side*(rx+fan*.56),cy-ry*.66-.036,tipZ-.014],[side*(rx+.017),cy-ry*.52,z-.047]],12);
    if(!['box','puffer','sunfish','bill','soft'].includes(s.family)) {
      const [px,py,pc]=sampleProfile(s.profile,.035),wide=s.family==='dragonet';
      add([[side*px*.25,pc-py*.96,.076],[side*px*.60,pc-py*.98,.006]],
        [[side*(px+(wide?.125:.031)),pc-py-.037,-.054],[side*(px+.018),pc-py-.055,-.12]],9);
    }
  }
}

/** Anatomy shares the same section sampler as the skin, including box surfaces. */
function reefDetails(kind: ReefKind, s: ReefSpec, high: boolean, trim: GeometryBuilder, eyes: GeometryBuilder): void {
  const flat=s.family==='flat', radial=high?20:12, rings=high?12:7;
  for(const side of [-1,1]) {
    const theta=s.family==='dragonet'?(side>0?.68:Math.PI-.68):(side>0?.24:Math.PI-.24);
    const p=flat?reefSurface(s,side>0?.315:.366,side>0?1.04:1.42,.004):reefSurface(s,s.eyeZ,theta,.002);
    const normal=flat?vec([0,1,.12]).normalize():vec([side,s.family==='dragonet'?.65:.16,.15]).normalize();
    const q=new THREE.Quaternion().setFromUnitVectors(vec([0,0,1]),normal),rad=s.eyeRadius;
    ellipsoid(trim,p.toArray() as V3,[rad*1.27,rad*1.18,rad*.51],s.back,radial,high?8:5,q);
    ellipsoid(eyes,p.clone().addScaledVector(normal,rad*.28).toArray() as V3,[rad,rad*.96,rad*.51],
      s.family==='cardinal'?0xcab7a0:s.family==='dragonet'?0xdf9251:0xbfb376,radial,rings,q);
    ellipsoid(eyes,p.clone().addScaledVector(normal,rad*.76).toArray() as V3,[rad*.54,rad*.60,rad*.16],0x08171b,radial,high?8:5,q);
    const gill:THREE.Vector3[]=[];
    for(let i=0;i<=(high?22:12);++i) {
      const t=i/(high?22:12),z=(s.family==='sunfish'?.272:.256)-.031*Math.sin(t*Math.PI);
      const angle=flat?lerp(.40,1.15,t):lerp(-.94,.99,t);
      gill.push(reefSurface(s,z,side>0?angle:Math.PI-angle,.0022));
    }
    tube(trim,gill,s.family==='soft'?.0022:.0014,s.back,high?5:3);
    if(!flat) {
      const lateral:THREE.Vector3[]=[];
      for(let i=0;i<=(high?30:17);++i) {
        const t=i/(high?30:17),z=lerp(s.profile[0][0]+.036,.245,t),a=.10+.1*Math.sin(t*Math.PI);
        lateral.push(reefSurface(s,z,side>0?a:Math.PI-a,.001));
      }
      tube(trim,lateral,.00085,s.flank,3);
    }
    if(s.family==='lion') {
      const top=reefSurface(s,s.eyeZ,side>0?.74:Math.PI-.74);
      reefSpine(trim,[top.toArray() as V3,[top.x*1.12,top.y+.083,top.z+.006],[top.x*1.10,top.y+.119,top.z-.026]],.0043,s.flank,high,s.back);
      const chin=reefSurface(s,.37,side>0?-.55:Math.PI+.55);
      reefSpine(trim,[chin.toArray() as V3,[chin.x*1.09,chin.y-.040,.39],[chin.x*1.15,chin.y-.070,.365]],.0032,s.flank,high,s.back);
    }
    if(kind==='cowfish') {
      const horn=reefSurface(s,.337,side>0?.88:Math.PI-.88);
      reefSpine(trim,[horn.toArray() as V3,[side*.10,.225,.392],[side*.13,.293,.458]],.016,0xdfd2a4,high);
      const rear=reefSurface(s,-.19,side>0?-.35:Math.PI+.35);
      reefSpine(trim,[rear.toArray() as V3,[side*.109,-.056,-.30],[side*.142,-.058,-.36]],.012,0xc8b776,high);
    }
    if(s.family==='tang') {
      const p1=reefSurface(s,-.248,side>0?0:Math.PI,.0015);
      reefSpine(trim,[[p1.x,p1.y,p1.z+.019],[p1.x+side*.011,p1.y+.004,p1.z-.002],[p1.x+side*.014,p1.y,p1.z-.032]],.0034,0xf8ead0,high);
    }
    if(kind==='swordfish') {
      reefSpine(trim,[[side*.018,0,-.235],[side*.036,0,-.267],[side*.021,0,-.309]],.0035,0x879da6,high);
    }
    if(kind==='humphead') for(let line=0;line<3;++line) {
      const points:THREE.Vector3[]=[];
      for(let j=0;j<=12;++j) {
        const t=j/12,z=.315+t*.095,th=.58+line*.16+.08*Math.sin(t*Math.PI);
        points.push(reefSurface(s,z,side>0?th:Math.PI-th,.0012));
      }
      tube(trim,points,.001,0x315e69,3);
    }
  }
  const last=s.profile[s.profile.length-1],noseZ=last[0],mouthY=last[3];
  if(kind==='parrotfish'||kind==='puffer') {
    for(const jaw of [-1,1]) ellipsoid(trim,[0,mouthY+jaw*.014,noseZ-.014],[.030,jaw>0?.018:.014,.039],
      kind==='parrotfish'?0xe6d8b6:0xdcc9a5,high?24:14,high?12:7);
    tube(trim,path([[-.027,mouthY,noseZ-.008],[0,mouthY-.002,noseZ+.025],[.027,mouthY,noseZ-.008]],high?18:10),.0016,0x4e5550,4);
    tube(trim,[vec([0,mouthY+.006,noseZ+.024]),vec([0,mouthY+.021,noseZ+.014])],.0009,0x827d64,3);
  } else if(kind==='blobfish') {
    ellipsoid(trim,[0,-.012,.423],[.047,.055,.075],0xe2b5a6,high?32:18,high?20:11);
    const points:THREE.Vector3[]=[];
    for(let i=0;i<=24;++i) {
      const t=i/24,x=lerp(-.083,.083,t);
      points.push(vec([x,-.053-.017*Math.abs(2*t-1),.427-.075*Math.abs(2*t-1)]));
    }
    tube(trim,points,.0035,0x8c6968,high?6:4);
  } else if(kind==='swordfish') {
    const bill:Profile[]=[[.435,.022,.012,.010],[.51,.018,.0085,.013],[.69,.012,.0052,.017],[.86,.006,.003,.023],[1.025,0,0,.026]];
    const g=bodyGeometry(bill,high?44:24,high?20:12);trim.append(g,color(0x7896a4));g.dispose();
    reefSpine(trim,[[0,-.018,.427],[0,-.015,.493],[0,-.007,.553]],.010,0xcbd2c8,high);
  } else if(flat) {
    tube(trim,path([[.044,.015,.407],[.024,.006,.451],[-.014,.007,.443]],high?16:9),.0016,s.back,4);
  } else {
    for(const side of [-1,1]) {
      const points:THREE.Vector3[]=[];
      for(let i=0;i<=14;++i)points.push(reefSurface(s,lerp(noseZ-.058,noseZ-.003,i/14),side>0?-.32:Math.PI+.32,.0015));
      tube(trim,points,kind==='humphead'?.005:.0017,kind==='humphead'?0x88b09e:s.back,high?6:4);
    }
  }
  if(kind==='puffer') {
    const rows=high?13:9,cols=high?15:11;
    for(let i=0;i<rows;++i)for(let j=0;j<cols;++j) {
      const z=lerp(-.17,.326,(i+.35)/rows),a=TAU*(j+(i%2)*.5)/cols;
      const p=reefSurface(s,z,a,.001),[rx,ry]=sampleProfile(s.profile,z);
      const normal=vec([Math.cos(a)/rx,Math.sin(a)/ry,(z-.09)*8]).normalize();
      const length=.016+.017*noise(i,j,91);
      const tip=p.clone().addScaledVector(normal,length);
      reefSpine(trim,[p.toArray() as V3,p.clone().lerp(tip,.57).toArray() as V3,tip.toArray() as V3],.0033,0xe2d7b0,high);
    }
  }
  if(kind==='turbot') {
    const rows=high?14:9,cols=high?7:5;
    for(let i=0;i<rows;++i)for(let j=0;j<cols;++j) {
      const z=lerp(-.16,.26,(i+.5)/rows),a=lerp(.31,Math.PI-.31,(j+noise(i,j,3)*.5)/cols);
      const p=reefSurface(s,z,a,.0017),rad=.0025+.0017*noise(i,j,41);
      ellipsoid(trim,p.toArray() as V3,[rad,rad*.8,rad],0xb6a079,high?7:5,high?5:3);
    }
  }
}

function tintReefFins(kind: ReefKind, s: ReefSpec, b: GeometryBuilder): void {
  for(let i=0;i<b.positions.length/3;++i) {
    const x=b.positions[i*3],y=b.positions[i*3+1],z=b.positions[i*3+2];
    let tint:THREE.Color|undefined;
    if(s.family==='lion'&&Math.sin(z*110+y*75+Math.abs(x)*60)>.18)tint=color(s.back);
    if(kind==='cardinalfish') {
      if(Math.sin(z*45+y*13)>.15)tint=color(0x222633);
      if(Math.sin(x*250+y*220)*Math.cos(z*220)>.80)tint=color(0xf5edda);
    }
    if(kind==='royal-gramma') {
      if(z<-.12)tint=color(0xf0ce36);
      if(((z-.02)/.026)**2+((y-.143)/.025)**2<1)tint=color(0x232237);
    }
    if(kind==='mandarinfish')tint=color(Math.sin(z*61+y*50+x*29)>.12?0xeea145:0x2b98aa);
    if(kind==='moorish-idol'&&y<.30&&Math.abs(z+.08)>.12)tint=color(0x283038);
    if(tint){b.colors[i*3]=tint.r;b.colors[i*3+1]=tint.g;b.colors[i*3+2]=tint.b;}
  }
}

// GPU normal transport samples the actual displacement field along a local
// tangent frame. The same field is compiled into colour, depth and point shadows.
type ReefMotion = FishMotion & { rigid: {value:number} };
const REEF_WAVE=FISH_WAVE+/* glsl */`
uniform float reefRigid;
vec3 reefPosition(vec3 p) {
  vec2 wave=marineWave(p.z);
  vec3 q=p;
  q.x+=(1.0-marineFlat)*wave.x;
  q.y+=marineFlat*wave.x;
  float paddle=smoothstep(0.12,0.40,abs(p.y));
  float pectoral=smoothstep(0.075,0.27,abs(p.x));
  float effort=0.30+marineAmplitude*10.0;
  q.x+=reefRigid*paddle*paddle*0.038*effort*sin(marinePhase*1.7-p.y*5.0-p.z*4.0);
  q.y+=reefRigid*pectoral*0.026*effort*sin(marinePhase*1.8-p.z*9.0);
  return q;
}
`;
function reefMaterial<T extends THREE.Material>(m:T,motion:ReefMotion):T {
  m.onBeforeCompile=shader=>{
    shader.uniforms.marinePhase=motion.phase;shader.uniforms.marineAmplitude=motion.amplitude;
    shader.uniforms.marineFlat=motion.flat;shader.uniforms.reefRigid=motion.rigid;
    shader.vertexShader=REEF_WAVE+shader.vertexShader;
    shader.vertexShader=shader.vertexShader.replace('#include <beginnormal_vertex>',/* glsl */`
      #include <beginnormal_vertex>
      vec3 rn=normalize(objectNormal);
      vec3 rt=normalize(cross(rn,abs(rn.y)<0.90?vec3(0.,1.,0.):vec3(1.,0.,0.)));
      vec3 rb=cross(rn,rt);
      vec3 rd1=reefPosition(position+rt*0.0003)-reefPosition(position-rt*0.0003);
      vec3 rd2=reefPosition(position+rb*0.0003)-reefPosition(position-rb*0.0003);
      objectNormal=normalize(cross(rd1,rd2));
      #ifdef USE_TANGENT
        objectTangent=normalize(reefPosition(position+objectTangent*0.0003)-reefPosition(position-objectTangent*0.0003));
      #endif
    `).replace('#include <begin_vertex>','vec3 transformed=reefPosition(position);');
  };
  m.customProgramCacheKey=()=> 'original-restored-reef-wave-v1';return m;
}

function makeReefFish(kind:ReefKind,high:boolean,parent:THREE.Group,r:Resources):(time:number,speed:number)=>void {
  const s=REEF[kind],rigid=['box','puffer','sunfish','disk','tang'].includes(s.family);
  const motion:ReefMotion={phase:{value:0},amplitude:{value:.04},flat:{value:s.family==='flat'?1:0},rigid:{value:rigid?1:.30}};
  const skin=trackMaterial(r,new THREE.MeshPhysicalMaterial({color:0xffffff,...reefTextures(kind,s,high,r),
    metalness:s.metal,roughness:s.family==='soft'?.50:.40,bumpScale:s.family==='soft'?.00025:.0011,clearcoat:.22,clearcoatRoughness:.31}));
  const fins=standard(r,0xffffff,.48,.10,true);fins.side=THREE.DoubleSide;
  const hard=standard(r,0xffffff,.43,.13,true);
  const gloss=trackMaterial(r,new THREE.MeshPhysicalMaterial({color:0xffffff,vertexColors:true,roughness:.15,metalness:.12,clearcoat:.7}));
  for(const m of [skin,fins,hard,gloss])reefMaterial(m,motion);
  const depth=trackMaterial(r,reefMaterial(new THREE.MeshDepthMaterial({depthPacking:THREE.RGBADepthPacking,side:THREE.DoubleSide}),motion));
  const distance=trackMaterial(r,reefMaterial(new THREE.MeshDistanceMaterial({side:THREE.DoubleSide}),motion));
  const membranes=new GeometryBuilder(),trim=new GeometryBuilder(),eyes=new GeometryBuilder();
  reefFins(kind,s,high,membranes,trim);tintReefFins(kind,s,membranes);reefDetails(kind,s,high,trim,eyes);
  mesh(r,parent,`${kind}-profiled-${s.family}-body`,reefBody(s,high),skin);
  mesh(r,parent,`${kind}-${s.family==='sunfish'?'clavus-and-opposed-paddles':'cambered-fin-membranes'}`,membranes.finish(),fins);
  mesh(r,parent,`${kind}-rays-and-distinctive-anatomy`,trim.finish(),hard);
  mesh(r,parent,`${kind}-${s.family==='flat'?'top-eyes':'irises-and-pupils'}`,eyes.finish(),gloss);
  parent.traverse(o=>{if(o instanceof THREE.Mesh){o.customDepthMaterial=depth;o.customDistanceMaterial=distance;}});
  const clock=animationClock(s.frequency*.35,s.frequency*.65);
  return(time,speed)=>{
    motion.phase.value=clock(time,speed)%TAU;
    motion.amplitude.value=(rigid?.010:s.family==='flat'?.026:s.family==='lion'?.024:.043)*(.25+.75*Math.min(speed,2));
  };
}

/** Manta wings are thick, closed, swept lifting surfaces, not fish fins. */
function mantaWings(high:boolean):THREE.BufferGeometry {
  const b=new GeometryBuilder(), spans=high?48:26,chords=high?32:16,white=color(0xffffff);
  for(const side of [-1,1]) {
    const start=b.positions.length/3, row=chords+1, sheet=(spans+1)*row;
    for(const face of [1,-1])for(let i=0;i<=spans;++i)for(let j=0;j<=chords;++j) {
      const s=i/spans,t=j/chords;
      const leading=lerp(.205,-.061,s)+.058*Math.sin(s*Math.PI);
      const trailing=lerp(-.225,-.079,s)-.084*Math.sin(s*Math.PI);
      const thickness=.026*Math.pow(1-s,.82)*Math.pow(Math.sin(Math.PI*t),.8)+.0008;
      const p=vec([side*(.041+s*.528),.009*Math.sin(s*Math.PI)+face*thickness,lerp(leading,trailing,t)]);
      b.vertex(p,vec([0,face,0]),[s,t],white);
      if(i&&j) {
        const a=start+(face===1?0:sheet)+(i-1)*row+j-1,d=a+row;
        if(side*face>0){b.triangle(a,d,a+1);b.triangle(a+1,d,d+1);}
        else {b.triangle(a,a+1,d);b.triangle(a+1,d+1,d);}
      }
    }
    // Bridge the upper and lower perimeter; the central seam lies inside the disk.
    const boundary:number[]=[];
    for(let j=0;j<=chords;++j)boundary.push(start+j);
    for(let i=1;i<=spans;++i)boundary.push(start+i*row+chords);
    for(let j=chords-1;j>=0;--j)boundary.push(start+spans*row+j);
    for(let i=spans-1;i>0;--i)boundary.push(start+i*row);
    for(let i=0;i<boundary.length;++i) {
      const a=boundary[i],d=boundary[(i+1)%boundary.length];
      if(side>0){b.triangle(a,a+sheet,d);b.triangle(d,a+sheet,d+sheet);}
      else {b.triangle(a,d,a+sheet);b.triangle(d,d+sheet,a+sheet);}
    }
  }
  const g=b.finish();g.computeVertexNormals();mantaPigment(g);return g;
}
function mantaPigment(g:THREE.BufferGeometry):void {
  const p=g.getAttribute('position'),n=g.getAttribute('normal'),c=g.getAttribute('color');
  for(let i=0;i<p.count;++i) {
    const x=p.getX(i),z=p.getZ(i),top=n.getY(i)>0;
    let tint=color(top?0x253a43:0xdbdfd1);
    if(top) {
      const shoulder=Math.exp(-(((Math.abs(x)-.105)/.075)**2+((z-.126)/.045)**2));
      tint.lerp(color(0x9aada9),shoulder*.78);
    } else if(Math.abs(x)<.15&&z<.10&&Math.sin(x*153+z*57)*Math.cos(z*109)>.59)tint=color(0x657875);
    tint.multiplyScalar(.97+.05*noise(x*411,z*367,37));c.setXYZ(i,tint.r,tint.g,tint.b);
  }
}
type MantaMotion={phase:{value:number};amplitude:{value:number}};
const MANTA_WAVE=/* glsl */`
uniform float mantaPhase;
uniform float mantaAmplitude;
vec3 mantaPosition(vec3 p) {
  float a=abs(p.x);
  float u=clamp((a-0.065)/0.504,0.0,1.0);
  float phase=mantaPhase-u*1.65-p.z*1.4;
  vec3 q=p;
  q.y+=mantaAmplitude*u*u*sin(phase);
  q.x*=1.0-0.055*u*u*(0.5+0.5*sin(phase));
  float tail=clamp((-p.z-0.23)/0.53,0.0,1.0);
  q.x+=0.022*tail*tail*sin(mantaPhase-tail*4.0);
  q.y+=0.010*tail*tail*sin(mantaPhase*0.8-tail*2.0);
  float lobe=smoothstep(0.225,0.36,p.z);
  q.y+=0.009*lobe*sin(mantaPhase*0.7+p.x*9.0);
  return q;
}
`;
function mantaMaterial<T extends THREE.Material>(m:T,motion:MantaMotion):T {
  m.onBeforeCompile=shader=>{
    shader.uniforms.mantaPhase=motion.phase;shader.uniforms.mantaAmplitude=motion.amplitude;
    shader.vertexShader=MANTA_WAVE+shader.vertexShader;
    shader.vertexShader=shader.vertexShader.replace('#include <beginnormal_vertex>',/* glsl */`
      #include <beginnormal_vertex>
      vec3 mn=normalize(objectNormal);
      vec3 mt=normalize(cross(mn,abs(mn.y)<0.9?vec3(0.,1.,0.):vec3(1.,0.,0.)));
      vec3 mb=cross(mn,mt);
      objectNormal=normalize(cross(
        mantaPosition(position+mt*0.0003)-mantaPosition(position-mt*0.0003),
        mantaPosition(position+mb*0.0003)-mantaPosition(position-mb*0.0003)));
      #ifdef USE_TANGENT
        objectTangent=normalize(mantaPosition(position+objectTangent*0.0003)-mantaPosition(position-objectTangent*0.0003));
      #endif
    `).replace('#include <begin_vertex>','vec3 transformed=mantaPosition(position);');
  };
  m.customProgramCacheKey=()=> 'original-manta-flap-v1';return m;
}
function makeManta(high:boolean,parent:THREE.Group,r:Resources):(time:number,speed:number)=>void {
  const motion:MantaMotion={phase:{value:0},amplitude:{value:.14}};
  const skin=mantaMaterial(standard(r,0xffffff,.51,.08,true),motion);
  const gloss=mantaMaterial(trackMaterial(r,new THREE.MeshPhysicalMaterial({color:0xffffff,vertexColors:true,roughness:.16,clearcoat:.55})),motion);
  const depth=trackMaterial(r,mantaMaterial(new THREE.MeshDepthMaterial({depthPacking:THREE.RGBADepthPacking,side:THREE.DoubleSide}),motion));
  const distance=trackMaterial(r,mantaMaterial(new THREE.MeshDistanceMaterial({side:THREE.DoubleSide}),motion));
  mesh(r,parent,'manta-paired-broad-flapping-wings',mantaWings(high),skin);
  const body=new GeometryBuilder(),eyes=new GeometryBuilder();
  const disk:Profile[]=[[-.26,.020,.013,0],[-.19,.059,.031,0],[-.075,.117,.044,0],[.075,.139,.049,0],[.165,.127,.044,0],[.216,.103,.032,-.003],[.245,0,0,-.005]];
  const diskGeometry=bodyGeometry(disk,high?64:36,high?48:28);mantaPigment(diskGeometry);body.append(diskGeometry);diskGeometry.dispose();
  reefSpine(body,[[0,0,-.22],[0,-.005,-.39],[.018,-.009,-.58],[.011,-.012,-.79]],.009,0x344951,high);
  for(const side of [-1,1]) {
    // A rolled fleshy funnel on either side of the broad anterior mouth.
    const lobe=new GeometryBuilder(),long=high?30:17,circ=high?16:10;
    for(let j=0;j<=long;++j)for(let k=0;k<=circ;++k) {
      const t=j/long,a=lerp(-.85*Math.PI,.85*Math.PI,k/circ),radius=.022*(1-.42*t);
      const cx=side*(.088-.016*Math.sin(t*Math.PI)),cy=-.007+.019*t*t,z=.20+.154*t;
      const p=vec([cx+side*radius*Math.sin(a),cy+radius*Math.cos(a),z]);
      lobe.vertex(p,vec([side*Math.sin(a),Math.cos(a),0]),[t,k/circ],color(k/circ>.28&&k/circ<.72?0x758e8d:0x354b53));
      if(j&&k) {
        const d=j*(circ+1)+k,a0=d-circ-2;
        if(side>0){lobe.triangle(a0,d-1,d);lobe.triangle(a0,d,a0+1);}
        else {lobe.triangle(a0,d,d-1);lobe.triangle(a0,a0+1,d);}
      }
    }
    // Roll surfaces have two visible sides without an extra transparent pass.
    const lg=lobe.finish();lg.computeVertexNormals();body.append(lg);
    const reverse=lg.clone(),idx=reverse.getIndex()!;
    for(let i=0;i<idx.count;i+=3){const a=idx.getX(i);idx.setX(i,idx.getX(i+2));idx.setX(i+2,a);}
    const normals=reverse.getAttribute('normal');for(let i=0;i<normals.count;++i)normals.setXYZ(i,-normals.getX(i),-normals.getY(i),-normals.getZ(i));
    body.append(reverse);lg.dispose();reverse.dispose();
    ellipsoid(body,[side*.126,.020,.153],[.022,.018,.023],0x314b53,high?22:14,high?12:8);
    ellipsoid(eyes,[side*.143,.022,.163],[.007,.010,.014],0x0a191f,high?20:12,high?12:7);
    // Five gill slits per side on the ventral disk, following its surface.
    for(let slit=0;slit<5;++slit) {
      const points:THREE.Vector3[]=[];
      for(let j=0;j<=12;++j) {
        const t=j/12,z=.122-slit*.037-.012*Math.sin(t*Math.PI),a=side>0?lerp(-1.22,-.47,t):lerp(Math.PI+1.22,Math.PI+.47,t);
        points.push(surfacePoint(disk,z,a,.001));
      }
      tube(body,points,.0019,0x627774,high?5:3);
    }
  }
  tube(body,path([[-.077,-.016,.228],[-.041,-.024,.238],[0,-.026,.243],[.041,-.024,.238],[.077,-.016,.228]],high?28:16),.0051,0x101f26,high?8:5);
  const dorsal=new GeometryBuilder(),rays=new GeometryBuilder();
  fin(dorsal,rays,[[0,.022,-.239],[0,.028,-.195],[0,.032,-.16]],
    [[0,.032,-.248],[0,.079,-.218],[0,.039,-.154]],0x3a5058,high,0);
  const dg=dorsal.finish();body.append(dg);dg.dispose();
  mesh(r,parent,'manta-disk-whip-tail-cephalic-lobes-mouth-gills',body.finish(),skin);
  mesh(r,parent,'manta-lateral-eyes',eyes.finish(),gloss);
  parent.traverse(o=>{if(o instanceof THREE.Mesh){o.customDepthMaterial=depth;o.customDistanceMaterial=distance;}});
  const clock=animationClock(1.2,.9);
  return(time,speed)=>{motion.phase.value=clock(time,speed)%TAU;motion.amplitude.value=.10+.072*Math.min(speed,2);};
}

type JointMotion = { bone: THREE.Bone; index: number; phase: number; tentacle: boolean };

function makeArm(parent: THREE.Group, r: Resources, material: Material, high: boolean,
  theta: number, tentacle: boolean, phase: number, joints: JointMotion[]): void {
  const length = tentacle ? .57 : .34 + .025*Math.cos(theta*2);
  const radial = high ? 8 : 6, longitudinal = tentacle ? (high ? 28 : 16) : (high ? 20 : 12);
  const count = tentacle ? 9 : 7, b = new GeometryBuilder();
  const pink = color(0xbb8776), cream = color(0xe0c2a4);
  const radiusAt = (t: number) => tentacle
    ? .0055*(1-.6*t) + .013*Math.exp(-(((t-.875)/.083)**2))
    : .0145*Math.pow(1-t,.8)+.0012;
  for (let j=0;j<=longitudinal;++j) for (let k=0;k<=radial;++k) {
    const t=j/longitudinal, angle=k/radial*TAU, rad=radiusAt(t);
    const normal = new THREE.Vector3(Math.cos(angle),Math.sin(angle),.025).normalize();
    const tint=pink.clone().lerp(cream,clamp(-Math.sin(angle),0,1)*.65);
    b.vertex(new THREE.Vector3(rad*Math.cos(angle),rad*Math.sin(angle),t*length),normal,[t,k/radial],tint);
    if(j && k<radial) {
      const a=(j-1)*(radial+1)+k,d=j*(radial+1)+k;
      b.triangle(a,a+1,d); b.triangle(a+1,d+1,d);
    }
  }
  // Small closed tip and proximal end, separate from the suction-cup geometry.
  for (const end of [0,longitudinal]) {
    const centre=b.vertex(vec([0,0,end/longitudinal*length]),vec([0,0,end===0?-1:1]),[end/longitudinal,.5],pink);
    for(let k=0;k<radial;++k) {
      const a=end*(radial+1)+k;
      if(end===0) b.triangle(centre,a+1,a); else b.triangle(centre,a,a+1);
    }
  }
  const cups = tentacle ? (high ? 7 : 3) : (high ? 10 : 3);
  const cupSides=high ? 6 : 4;
  for(let j=0;j<cups;++j) for(const side of [-1,1]) {
    const t=tentacle ? lerp(.79,.955,j/(cups-1)) : lerp(.12,.86,j/(cups-1));
    const rad=radiusAt(t), cupRadius=Math.min(rad*.48,.0062);
    const cx=side*rad*.43, cy=-rad*.90, z=t*length;
    const start=b.positions.length/3;
    // Raised rim and recessed inner wall, not white painted dots.
    for(let ring=0;ring<3;++ring) for(let k=0;k<cupSides;++k) {
      const a=k/cupSides*TAU, cr=cupRadius*(ring===0?1:ring===1?.72:.37);
      b.vertex(vec([cx+cr*Math.cos(a),cy-(ring===1?.0035:ring===2?.001:.0005),z+cr*Math.sin(a)]),
        vec([Math.cos(a)*.2,-1,Math.sin(a)*.2]).normalize(),[t,.75],ring===2?color(0x9d6656):cream);
    }
    for(let ring=0;ring<2;++ring) for(let k=0;k<cupSides;++k) {
      const a=start+ring*cupSides+k, next=start+ring*cupSides+(k+1)%cupSides;
      b.triangle(a,next,a+cupSides); b.triangle(next,next+cupSides,a+cupSides);
    }
  }
  const geometry=b.finish(), skinIndices:number[]=[], skinWeights:number[]=[];
  for(let i=0;i<b.positions.length/3;++i) {
    const t=clamp(b.positions[i*3+2]/length,0,1)*count;
    const lower=Math.min(count-1,Math.floor(t)), weight=t-lower;
    skinIndices.push(lower,lower+1,0,0); skinWeights.push(1-weight,weight,0,0);
  }
  geometry.setAttribute('skinIndex',new THREE.Uint16BufferAttribute(skinIndices,4));
  geometry.setAttribute('skinWeight',new THREE.Float32BufferAttribute(skinWeights,4));
  r.geometries.add(geometry);
  const arm=new THREE.SkinnedMesh(geometry,material); arm.name=tentacle?'clubbed-feeding-tentacle':'suckered-arm';
  const bones:THREE.Bone[]=[];
  for(let i=0;i<=count;++i) {
    const bone=new THREE.Bone(); bone.name=`${arm.name}-joint-${i}`;
    if(i) { bone.position.z=length/count; bones[i-1].add(bone); }
    else arm.add(bone);
    bones.push(bone); joints.push({bone,index:i,phase,tentacle});
  }
  const skeleton=new THREE.Skeleton(bones); r.skeletons.add(skeleton);
  arm.bind(skeleton);
  arm.position.set(Math.cos(theta)*.052,Math.sin(theta)*.045,.18);
  arm.quaternion.setFromAxisAngle(new THREE.Vector3(0,0,1),theta-Math.PI/2)
    .multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1,0,0),tentacle?-.13:-.28));
  arm.castShadow=true; arm.receiveShadow=true;
  // Skin bounds vary every frame; disabling per-arm culling avoids CPU vertex scans.
  arm.frustumCulled=false; parent.add(arm);
}

function makeSquid(high: boolean, parent: THREE.Group, r: Resources): (time: number, speed: number) => void {
  const textures=skinTextures('squid',high,r);
  const skin=trackMaterial(r,new THREE.MeshPhysicalMaterial({color:0xffffff,...textures,bumpScale:.0007,roughness:.4,clearcoat:.28,clearcoatRoughness:.3}));
  const flesh=standard(r,0xffffff,.44,.08,true);
  const finMaterial=standard(r,0xffffff,.47,.06,true); finMaterial.side=THREE.DoubleSide;
  const eyeMaterial=trackMaterial(r,new THREE.MeshPhysicalMaterial({color:0xffffff,vertexColors:true,roughness:.18,metalness:.35,clearcoat:.55}));
  const mantleGroup=new THREE.Group(); mantleGroup.name='pulsing-mantle'; parent.add(mantleGroup);
  const mantleProfile:Profile[]=[[-.44,.001,.001,0],[-.40,.028,.022,0],[-.30,.074,.058,0],[-.15,.100,.080,0],[0,.087,.07,0],[.085,.069,.054,0],[.116,0,0,0]];
  mesh(r,mantleGroup,'tapered-mantle',bodyGeometry(mantleProfile,high?40:24,high?40:22),skin);
  const collar=new GeometryBuilder();
  const ring:THREE.Vector3[]=[];
  const collarSegments=high?48:24;
  for(let i=0;i<=collarSegments;++i) ring.push(vec([Math.cos(i/collarSegments*TAU)*.068,Math.sin(i/collarSegments*TAU)*.053,.078]));
  tube(collar,ring,.005,0xc7957e,high?6:4,false);
  ellipsoid(collar,[0,-.046,.132],[.025,.021,.068],0xcead93,high?16:10,high?10:6);
  mesh(r,parent,'mantle-collar-and-siphon',collar.finish(),flesh);
  const head=new GeometryBuilder();
  ellipsoid(head,[0,0,.137],[.063,.05,.070],0xd2a78d,high?24:14,high?14:8);
  mesh(r,parent,'head',head.finish(),flesh);
  const eyes=new GeometryBuilder(), pupils=new GeometryBuilder();
  for(const side of [-1,1]) {
    ellipsoid(eyes,[side*.059,.004,.143],[.014,.021,.025],0xa7aaa0,high?20:12,high?12:8);
    ellipsoid(pupils,[side*.072,.004,.148],[.005,.010,.013],0x132222,high?14:10,high?8:6);
  }
  mesh(r,parent,'squid-irises',eyes.finish(),eyeMaterial);
  mesh(r,parent,'squid-pupils',pupils.finish(),standard(r,0xffffff,.17,.08,true));
  const wings:{group:THREE.Group;side:number}[]=[];
  for(const side of [-1,1]) {
    const f=new GeometryBuilder(), rays=new GeometryBuilder();
    const group=new THREE.Group(); group.name='mantle-fin'; mantleGroup.add(group);
    fin(f,rays,[[side*.005,0,-.431],[side*.058,0,-.335],[side*.086,0,-.21],[side*.09,0,-.12]],
      [[side*.009,0,-.431],[side*.155,0,-.305],[side*.164,0,-.25],[side*.093,0,-.12]],0xb87e6d,high,0,0xd5a991);
    mesh(r,group,'soft-rhomboid-fin',f.finish(),finMaterial); wings.push({group,side});
  }
  const joints:JointMotion[]=[];
  for(let i=0;i<8;++i) makeArm(parent,r,flesh,high,TAU*(i+.5)/8,false,i*.83,joints);
  for(let i=0;i<2;++i) makeArm(parent,r,flesh,high,i===0?-.23:Math.PI+.23,true,i*Math.PI+.3,joints);
  const clock=animationClock(1.7,1.8);
  return(time,speed)=>{
    const phase=clock(time,speed), effort=.30+Math.min(speed,2)*.70;
    const pulse=Math.sin(phase);
    mantleGroup.scale.set(1+pulse*.035*effort,1+pulse*.035*effort,1-pulse*.018*effort);
    for(const wing of wings) wing.group.rotation.z=wing.side*Math.sin(phase+.5)*.17*effort;
    for(const j of joints) {
      const wave=phase-j.index*.48+j.phase;
      j.bone.rotation.x=(Math.sin(wave)*.075*effort + (j.index>3?.027:0))*(j.tentacle?.7:1);
      j.bone.rotation.y=Math.cos(wave*.83)*.042*effort;
    }
  };
}

type Articulation = { group: THREE.Group; rest: THREE.Quaternion; phase: number; segment: number; side: number };

function crabSegment(length: number, radius: number, high: boolean, tint: number): THREE.BufferGeometry {
  const b=new GeometryBuilder(), points:THREE.Vector3[]=[];
  const sections=high?7:3;
  for(let j=0;j<=sections;++j) points.push(vec([0,.006*Math.sin(j/sections*Math.PI),j/sections*length]));
  tube(b,points,t=>radius*(.48+.52*Math.sin(Math.PI*(.06+t*.86)))*(1-.3*t),tint,high?10:6);
  const g=b.finish(); g.computeVertexNormals(); return g;
}

function articulatedChain(parent: THREE.Group, r: Resources, points: V3[], radii: number[], material: Material,
  high: boolean, tint: number, name: string, phase: number, side: number, motions: Articulation[]): THREE.Group {
  let current:THREE.Object3D=parent, previousWorld=new THREE.Quaternion();
  const axis=new THREE.Vector3(0,0,1);
  let previousLength=0;
  for(let i=0;i<points.length-1;++i) {
    const from=vec(points[i]), to=vec(points[i+1]), direction=to.sub(from), length=direction.length();
    const world=new THREE.Quaternion().setFromUnitVectors(axis,direction.normalize());
    const group=new THREE.Group(); group.name=`${name}-joint-${i}`;
    if(i===0) group.position.copy(from); else group.position.z=previousLength;
    group.quaternion.copy(previousWorld.clone().invert().multiply(world)); current.add(group);
    mesh(r,group,`${name}-segment-${i}`,crabSegment(length,radii[i],high,tint),material);
    motions.push({group,rest:group.quaternion.clone(),phase,segment:i,side});
    current=group; previousWorld=world; previousLength=length;
  }
  const end=new THREE.Group(); end.position.z=previousLength; current.add(end); return end;
}

function makeCrab(high: boolean, parent: THREE.Group, r: Resources): (time: number, speed: number) => void {
  const textures=skinTextures('crab',high,r);
  const shell=trackMaterial(r,new THREE.MeshPhysicalMaterial({color:0xffffff,...textures,bumpScale:.0022,roughness:.50,clearcoat:.17,clearcoatRoughness:.42}));
  const legs=standard(r,0xffffff,.51,.06,true);
  const bodyGroup=new THREE.Group(); bodyGroup.name='carapace-and-mouth'; parent.add(bodyGroup);
  const shellGeometry=new THREE.SphereGeometry(1,high?64:32,high?36:16);
  const position=shellGeometry.getAttribute('position');
  for(let i=0;i<position.count;++i) {
    const x=position.getX(i), y=position.getY(i), z=position.getZ(i);
    const lobe=1+.028*Math.cos(z*19)*Math.pow(Math.abs(x),3);
    const ridges=.004*Math.cos(x*17)*Math.cos(z*16)*Math.max(y,0);
    position.setXYZ(i,x*.197*lobe,y*(y>0?.088:.038)+ridges,z*.163*(1-.06*z));
  }
  shellGeometry.computeVertexNormals(); shellGeometry.computeBoundingBox(); shellGeometry.computeBoundingSphere();
  mesh(r,bodyGroup,'domed-lobed-carapace',shellGeometry,shell);
  const trim=new GeometryBuilder(), dark=new GeometryBuilder();
  // Serrated lateral margins and short defensive spines.
  for(const side of [-1,1]) {
    const rim:THREE.Vector3[]=[];
    const rimSegments=high?32:24;
    for(let i=0;i<=rimSegments;++i) {
      const a=lerp(-1.18,1.24,i/rimSegments); rim.push(vec([side*.195*Math.cos(a),.003,Math.sin(a)*.157]));
    }
    tube(trim,rim,.0034,0xa6a17b,high?5:3);
    for(let i=0;i<8;++i) {
      const a=lerp(-1,1.06,i/7), x=side*.19*Math.cos(a), z=Math.sin(a)*.155;
      tube(trim,[vec([x,0,z]),vec([x+side*.012,.005,z-.004]),vec([x+side*.028,.009,z-.012])],t=>lerp(.0055,.0006,t),0x6b7355,high?6:4);
    }
    // Eye stalks rise in front of the shell. Small dark corneas, no cartoon eyes.
    tube(trim,path([[side*.061,.019,.139],[side*.077,.048,.164],[side*.080,.058,.175]],high?8:5),t=>lerp(.006,.0045,t),0x9b9876,high?8:5);
    ellipsoid(dark,[side*.081,.059,.177],[.009,.009,.010],0x112323,high?14:10,high?8:6);
    for(let i=0;i<3;++i) {
      const z=.156+i*.010;
      tube(trim,path([[side*.009,-.017,z],[side*(.025+i*.004),-.021,z+.011],[side*.012,-.025,z+.021]],high?6:4),.0033,0xc2ad86,high?5:3);
    }
    tube(trim,path([[side*.034,.008,.16],[side*.040,.013,.206],[side*.051,.009,.225]],high?8:5),t=>lerp(.0021,.0006,t),0xa69b76,high?4:3);
  }
  // Shallow regional grooves on the dorsal shell follow its actual dome.
  for(const side of [-1,1]) for(let line=0;line<2;++line) {
    const points:THREE.Vector3[]=[];
    for(let i=0;i<=14;++i) {
      const t=i/14, x=side*(.018+t*.105), z=.055-line*.063+.022*Math.sin(t*Math.PI);
      const y=.088*Math.sqrt(Math.max(0,1-(x/.197)**2-(z/.163)**2))+.0015;
      points.push(vec([x,y,z]));
    }
    tube(trim,points,.0011,0x4f624e,3);
  }
  mesh(r,bodyGroup,'shell-rim-spines-stalks-mouthparts',trim.finish(),legs);
  mesh(r,bodyGroup,'compound-eyes',dark.finish(),standard(r,0xffffff,.2,.12,true));
  const motions:Articulation[]=[], clawMotions:Articulation[]=[];
  for(const side of [-1,1]) for(let i=0;i<4;++i) {
    const z=.107-i*.069, sweep=.09-i*.058;
    articulatedChain(parent,r,[[side*.153,-.008,z],[side*(.254+.006*Math.sin(i)),.023,z+sweep],
      [side*(.345-.006*i),-.044,z+sweep*1.55],[side*(.378-.008*i),-.154,z+sweep*1.75]],
      [.017,.012,.007],legs,high,side>0?0x8e9772:0x89936e,`walking-leg-${side}-${i}`,i*Math.PI*.92+(side>0?0:Math.PI),side,motions);
  }
  const pincers:{group:THREE.Group;side:number}[]=[];
  for(const side of [-1,1]) {
    const wrist=articulatedChain(parent,r,[[side*.106,-.011,.112],[side*.174,-.009,.228],[side*.207,.021,.326]],
      [.025,.026],legs,high,0x8d9674,`cheliped-${side}`,side>0?0:1.1,side,clawMotions);
    const palm=new GeometryBuilder();
    ellipsoid(palm,[0,0,.044],[.043,.029,.069],side>0?0x9e9e74:0x9ba27e,high?24:14,high?14:8);
    tube(palm,path([[-.029,0,.077],[-.034,-.002,.113],[-.024,-.003,.155],[-.004,-.003,.181]],high?15:9),t=>lerp(.014,.0022,t),0xc4b792,high?8:5);
    for(let i=0;i<(high?6:4);++i) {
      const t=i/(high?5:3), z=lerp(.105,.156,t);
      tube(palm,[vec([-.022,0,z]),vec([-.009,0,z+.003])],t2=>lerp(.004,.001,t2),0xd7c9a3,high?5:3);
    }
    mesh(r,wrist,'claw-palm-fixed-finger-teeth',palm.finish(),legs);
    const finger=new THREE.Group(); finger.name='hinged-dactyl'; finger.position.set(.022,0,.078); wrist.add(finger);
    const digit=new GeometryBuilder();
    tube(digit,path([[0,0,0],[.009,0,.04],[-.001,0,.075],[-.023,-.002,.102]],high?15:9),t=>lerp(.013,.0016,t),0xc8bb92,high?8:5);
    for(let i=0;i<(high?5:3);++i) {
      const z=.024+i*.012;
      tube(digit,[vec([.002,0,z]),vec([-.010,0,z+.002])],t=>lerp(.0035,.0008,t),0xd8cba6,high?5:3);
    }
    mesh(r,finger,'movable-claw-finger',digit.finish(),legs); pincers.push({group:finger,side});
  }
  const turn=new THREE.Quaternion(), euler=new THREE.Euler();
  const clock=animationClock(1.1,3.1);
  return(time,speed)=>{
    const phase=clock(time,speed), effort=Math.min(speed,2);
    bodyGroup.position.y=Math.sin(phase*2)*.0025*effort;
    for(const m of motions) {
      const wave=phase+m.phase;
      euler.set(Math.max(0,Math.sin(wave))*.12*effort*(m.segment===1?1.4:.6),
        Math.cos(wave)*.13*effort*m.side*(m.segment===0?1:.45),0);
      m.group.quaternion.copy(m.rest).multiply(turn.setFromEuler(euler));
    }
    for(const m of clawMotions) {
      euler.set(Math.sin(phase*.48+m.phase)*.045,Math.cos(phase*.37+m.phase)*.038*m.side,0);
      m.group.quaternion.copy(m.rest).multiply(turn.setFromEuler(euler));
    }
    for(const p of pincers) p.group.rotation.y=.13+.20*(.5+.5*Math.sin(time*1.9+p.side));
  };
}

function isReefKind(kind:MarineKind):kind is ReefKind {return Object.prototype.hasOwnProperty.call(REEF,kind);}

export function createMarineCreature(kind: MarineKind, detail: 'high' | 'medium' = 'high'): {
  root: THREE.Group;
  update: (time: number, speed?: number) => void;
  dispose: () => void;
} {
  if (!(kind === 'squid' || kind === 'crab' || kind === 'manta-ray' || isReefKind(kind) || Object.prototype.hasOwnProperty.call(FISH,kind))) {
    throw new RangeError(`Unsupported marine kind: ${String(kind)}`);
  }
  if (detail !== 'high' && detail !== 'medium') throw new RangeError(`Unsupported marine detail: ${String(detail)}`);
  const r:Resources={geometries:new Set(),materials:new Set(),textures:new Set(),skeletons:new Set()};
  const root=new THREE.Group(); root.name=`original-marine-${kind}`;
  const content=new THREE.Group(); content.name='normalised-anatomy'; root.add(content);
  const high=detail==='high';
  let animate:((time:number,speed:number)=>void)|undefined=kind==='squid' ? makeSquid(high,content,r)
    : kind==='crab' ? makeCrab(high,content,r) : kind==='manta-ray' ? makeManta(high,content,r)
    : isReefKind(kind) ? makeReefFish(kind,high,content,r) : makeFish(kind,high,content,r);
  root.updateMatrixWorld(true);
  const bounds=new THREE.Box3().setFromObject(content), centre=bounds.getCenter(new THREE.Vector3()), size=bounds.getSize(new THREE.Vector3());
  const scale=1/Math.max(size.x,size.y,size.z);
  content.scale.setScalar(scale); content.position.copy(centre).multiplyScalar(-scale);
  // Root-local anatomical landmark: the bill/tail/bounding-box end is not the mouth.
  const profile=isReefKind(kind)?REEF[kind].profile:kind!=='squid'&&kind!=='crab'&&kind!=='manta-ray'?FISH[kind].profile:null;
  const last=profile?.[profile.length-1];
  const mouth=new THREE.Vector3(0,last?.[3]??0,last?.[0]??(kind==='crab'?.15:kind==='squid'?.19:.18)).sub(centre).multiplyScalar(scale);
  root.userData.mouthLocal={x:mouth.x,y:mouth.y,z:mouth.z};
  // GPU-only displacements need conservative CPU bounds for renderer culling.
  if(kind!=='squid' && kind!=='crab') for(const g of r.geometries) {
    const padding=kind==='manta-ray'?new THREE.Vector3(.06,.28,0)
      : kind==='turbot'?new THREE.Vector3(.02,.07,0)
      : isReefKind(kind)?new THREE.Vector3(.13,.06,0)
      : new THREE.Vector3(kind==='flatfish'?0:.10,kind==='flatfish'?.055:0,0);
    g.boundingBox?.expandByVector(padding);
    if(g.boundingSphere) g.boundingSphere.radius+=kind==='manta-ray'?.29:isReefKind(kind)?.15:.105;
  }
  let triangles=0, vertices=0;
  for(const g of r.geometries) { vertices+=g.getAttribute('position').count; triangles+=(g.index?.count ?? g.getAttribute('position').count)/3; }
  let renderMeshes=0;root.traverse(o=>{if(o instanceof THREE.Mesh)++renderMeshes;});
  root.userData.marine={kind,detail,triangles,vertices,nominalLength:1,forward:'+Z',
    deformation:kind==='squid'?'skeletal':kind==='crab'?'articulated':kind==='manta-ray'?'gpu-wing-flap':'gpu-wave',
    source:'original-procedural',restPoseMaxDimension:1,renderMeshes,
    ...(isReefKind(kind)?{label:REEF[kind].label,family:REEF[kind].family,features:[...REEF[kind].features]}
      :kind==='manta-ray'?{label:'Original broad-wing manta ray',family:'ray',features:['broad-flapping-wings','whip-tail','cephalic-lobes','ventral-gill-slits']}:{})};
  let disposed=false;
  const update=(time:number,speed=1)=>{
    if(disposed) return;
    animate?.(Number.isFinite(time)?time:0,clamp(Number.isFinite(speed)?speed:1,0,3));
  };
  const dispose=()=>{
    if(disposed) return; disposed=true; animate=undefined;
    root.removeFromParent();
    for(const skeleton of r.skeletons) skeleton.dispose();
    for(const g of r.geometries) g.dispose();
    for(const m of r.materials) m.dispose();
    for(const t of r.textures) t.dispose();
    r.geometries.clear(); r.materials.clear(); r.textures.clear(); r.skeletons.clear();
    root.clear();
  };
  // Establish uniforms and the articulated pose before the first render.
  update(0,1); root.updateMatrixWorld(true);
  return {root,update,dispose};
}
