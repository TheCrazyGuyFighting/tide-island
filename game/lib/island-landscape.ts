import * as T from 'three';
import {DISTANT_ISLANDS} from './island-destinations';
import {naturalTerrain,naturalSurface,foliageMaterial,foliageShadow} from './island-natural-materials';
import {crownGeometry,palmFrondGeometry,grassClumpGeometry,weatheredRockGeometry} from './island-natural-geometry';
import { CABIN, DOCK, TERRAIN_SIZE, TERRAIN_SEGMENTS, groundHeight, noise, random, riverAt, riverSample, slopeAt, smooth, terrainHeight } from './island-world';
import type { Collider } from './island-physics';
import { homeFootprint } from './island-home-layout';
import { RAINFOREST } from './island-rainforest-layout';

export const material = (color: string, roughness = 0.9) => new T.MeshStandardMaterial({ color, roughness });
export function mesh(parent: T.Object3D, geometry: T.BufferGeometry, mat: T.Material, x = 0, y = 0, z = 0) {
  const m = new T.Mesh(geometry, mat); m.position.set(x, y, z); m.castShadow = true; m.receiveShadow = true; parent.add(m); return m;
}
export function beam(parent: T.Object3D, a: T.Vector3, b: T.Vector3, width: number, mat: T.Material) {
  const m = mesh(parent, new T.CylinderGeometry(width, width * 1.08, a.distanceTo(b), 7), mat);
  m.position.copy(a).add(b).multiplyScalar(0.5);
  m.quaternion.setFromUnitVectors(new T.Vector3(0, 1, 0), b.clone().sub(a).normalize());
  return m;
}
export function buildLandscape(scene: T.Scene, lowPower: boolean) {
  const rng = random(2609);
  const colliders: Collider[] = [];
  const terrainGeo = new T.PlaneGeometry(TERRAIN_SIZE, TERRAIN_SIZE, TERRAIN_SEGMENTS, TERRAIN_SEGMENTS).rotateX(-Math.PI / 2);
  const positions = terrainGeo.attributes.position;
  const colors = new Float32Array(positions.count * 3);
  const sand = new T.Color('#e5d7ae'), wet = new T.Color('#b0c9ad'), grass = new T.Color('#589345'), forest = new T.Color('#296c44'), stone = new T.Color('#85928a');
  const color = new T.Color();
  for (let i = 0; i < positions.count; i++) {
    const x = positions.getX(i), z = positions.getZ(i), h = groundHeight(x, z), slope = slopeAt(x, z);
    positions.setY(i, h);
    color.copy(wet).lerp(sand, smooth(-1, 1, h));
    color.lerp(grass, smooth(1.5, 4.2, h));
    color.lerp(forest, smooth(8, 29, h) * 0.68);
    color.lerp(stone, smooth(0.85, 1.5, slope) * smooth(2, 7, h));
    color.multiplyScalar(0.94 + noise(x * 0.6, z * 0.6) * 0.07 + noise(x * 0.09, z * 0.09) * 0.08);
    color.toArray(colors, i * 3);
  }
  terrainGeo.setAttribute('color', new T.BufferAttribute(colors, 3));
  terrainGeo.computeVertexNormals();
  const terrain = mesh(scene, terrainGeo, naturalTerrain());
  terrain.castShadow = false;

  const waterGeo = new T.PlaneGeometry(20000, 20000, 160, 160).rotateX(-Math.PI / 2);
  // A separate near-water patch gives the lagoon and surf sufficient resolution.
  const nearGeo = new T.PlaneGeometry(440, 440, 250, 250).rotateX(-Math.PI / 2);
  const waterSurfaces:T.Object3D[]=[];
  const uniforms = { uReflection:{value:null as T.Texture|null},uReflectionMatrix:{value:new T.Matrix4()},uTime: { value: 0 }, uNight: { value: 0 }, uEye: { value: new T.Vector3() }, uFar: { value: 0 }, uBoat: { value: new T.Vector3(10000, 10000, 0) }, uBoatSize: { value: new T.Vector2(.65, 1.95) } };
  const waterMat = new T.ShaderMaterial({
    uniforms, transparent: true, depthWrite: false, side: T.DoubleSide,
    vertexShader: `
      uniform float uTime; attribute float bottom; varying vec3 vWorld; varying vec3 vNormal; varying float vDepth; varying float vWave;
      void main() {
        vec3 p=position; float shelter=1.0-smoothstep(22.0,60.0,distance(p.xz,vec2(15.,19.)));
        float strength=mix(1.0,.2,shelter)*smoothstep(.1,3.,-bottom);
        float a=dot(p.xz,vec2(.24,.13))+uTime*1.1;
        float b=dot(p.xz,vec2(-.12,.32))+uTime*1.5;
        float c=dot(p.xz,vec2(.72,.41))-uTime*2.;
        float wave=(sin(a)*.19+sin(b)*.1+sin(c)*.035)*strength;
        p.y=wave; vWorld=p; vWave=wave; vDepth=max(0.,wave-bottom);
        vec2 d=(cos(a)*.19*vec2(.24,.13)+cos(b)*.1*vec2(-.12,.32)+cos(c)*.035*vec2(.72,.41))*strength;
        vNormal=normalize(vec3(-d.x,1.,-d.y)); gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.);
      }`,
    fragmentShader: `
      uniform float uTime,uNight,uFar; uniform vec3 uEye,uBoat; uniform vec2 uBoatSize;
      uniform sampler2D uReflection;uniform mat4 uReflectionMatrix;
      varying vec3 vWorld,vNormal; varying float vDepth,vWave;
      float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
      float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+1.),f.x),f.y);}
      void main(){
        if(uFar>.5 && max(abs(vWorld.x),abs(vWorld.z))<219.8)discard;
        if(uFar>.5 && max(abs(vWorld.x-600.),abs(vWorld.z))<79.8)discard;
        if(uFar>.5 && max(abs(vWorld.x+400.),abs(vWorld.z-450.))<249.8)discard;
        ${DISTANT_ISLANDS.map(i=>`if(uFar>.5 && max(abs(vWorld.x-(${i.x}.)),abs(vWorld.z-(${i.z}.)))<${i.extent-.2})discard;`).join('\n')}
        vec2 delta=vWorld.xz-uBoat.xy;
        vec2 hull=vec2(cos(uBoat.z)*delta.x-sin(uBoat.z)*delta.y,sin(uBoat.z)*delta.x+cos(uBoat.z)*delta.y)/uBoatSize;
        if(dot(hull,hull)<1.)discard;
        vec2 p=vWorld.xz;
        float a=dot(p,vec2(2.7,1.6))+uTime*1.8,b=dot(p,vec2(-1.4,3.1))-uTime*1.6;
        float detail=1.-smoothstep(45.,320.,distance(uEye,vWorld));
        vec3 n=normalize(vNormal+vec3(sin(a)*.045+sin(b)*.027,0.,cos(a*.73)*.038+cos(b)*.024)*detail);
        if(!gl_FrontFacing)n=-n;
        vec3 view=normalize(uEye-vWorld);float fresnel=.025+.975*pow(1.-max(dot(n,view),0.),5.);
        vec3 sky=mix(vec3(.47,.60,.70),vec3(.016,.032,.055),uNight);
        vec3 base=mix(vec3(.036,.19,.17),vec3(.009,.042,.063),1.-exp(-vDepth*.10));
        base*=mix(1.,.24,uNight);
        vec4 projected=uReflectionMatrix*vec4(vWorld,1.);
        vec2 uv=projected.xy/projected.w+n.xz*.009;
        float valid=step(0.,uv.x)*step(uv.x,1.)*step(0.,uv.y)*step(uv.y,1.)*step(0.,projected.w);
        vec3 reflection=mix(sky,texture2D(uReflection,clamp(uv,vec2(.001),vec2(.999))).rgb,valid*(1.-smoothstep(260.,560.,distance(uEye,vWorld))));
        base=mix(base,reflection,clamp(fresnel,.10,.93));
        float sun=pow(max(dot(reflect(-normalize(vec3(-80.,105.,50.)),n),view),0.),220.);
        base+=vec3(1.,.83,.60)*sun*(1.-uNight)*1.8;
        float broken=noise(p*2.1+vec2(uTime*.18,-uTime*.2));
        float wash=sin(vDepth*3.8-uTime*1.35+noise(p*.3)*2.5);
        float foam=smoothstep(.35,.95,wash)*smoothstep(.23,.70,broken)*(1.-smoothstep(.18,1.55,vDepth))*smoothstep(.01,.15,vDepth);
        base=mix(base,mix(vec3(.75,.80,.77),vec3(.13,.18,.24),uNight),foam*.72);
        float haze=1.-exp(-distance(uEye,vWorld)*.00085);base=mix(base,sky,haze);
        gl_FragColor=vec4(base,mix(.38,.98,1.-exp(-vDepth*.22))+fresnel*.08);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
  });
  const marketWaterGeo=new T.PlaneGeometry(160,160,120,120).rotateX(-Math.PI/2).translate(600,0,0);
  const rainforestWaterGeo=new T.PlaneGeometry(500,500,200,200).rotateX(-Math.PI/2).translate(RAINFOREST.x,0,RAINFOREST.z);
  const distantWater= DISTANT_ISLANDS.map(i=>new T.PlaneGeometry(i.extent*2,i.extent*2,i.extent/2,i.extent/2).rotateX(-Math.PI/2).translate(i.x,0,i.z));
  for (const [geo, far] of [[waterGeo, true], [nearGeo, false], [marketWaterGeo,false], [rainforestWaterGeo,false], ...distantWater.map(geo=>[geo,false] as const)] as const) {
    const p = geo.attributes.position, bottom = new Float32Array(p.count);
    for (let i = 0; i < p.count; i++) bottom[i] = groundHeight(p.getX(i), p.getZ(i));
    geo.setAttribute('bottom', new T.BufferAttribute(bottom, 1));
    const mat = far ? waterMat.clone() : waterMat;
    if (far) { mat.uniforms.uReflection=uniforms.uReflection;mat.uniforms.uReflectionMatrix=uniforms.uReflectionMatrix;mat.uniforms.uTime = uniforms.uTime; mat.uniforms.uNight = uniforms.uNight; mat.uniforms.uEye = uniforms.uEye; mat.uniforms.uBoat=uniforms.uBoat;mat.uniforms.uBoatSize=uniforms.uBoatSize; mat.uniforms.uFar.value = 1; }
    const water = mesh(scene, geo, mat);waterSurfaces.push(water); water.renderOrder = 2; water.castShadow = false; water.receiveShadow = false; water.frustumCulled = false;
  }

  const riverGeo = new T.BufferGeometry(), verts: number[] = [], uv: number[] = [], indices: number[] = [];
  for (let i = 0; i <= 150; i++) {
    const t = i / 150, p = riverAt(t), next = riverAt(Math.min(1, t + 0.002)), prev = riverAt(Math.max(0, t - 0.002));
    const len = Math.hypot(next.x - prev.x, next.z - prev.z);
    const nx = -(next.z - prev.z) / len, nz = (next.x - prev.x) / len;
    for (const side of [-1, 1]) { verts.push(p.x + nx * side * 1.4, p.y + 0.025, p.z + nz * side * 1.4); uv.push((side + 1) / 2, t * 20); }
    if (i < 150) { const k = i * 2; indices.push(k, k + 2, k + 1, k + 1, k + 2, k + 3); }
  }
  riverGeo.setAttribute('position', new T.Float32BufferAttribute(verts, 3)); riverGeo.setAttribute('uv', new T.Float32BufferAttribute(uv, 2)); riverGeo.setIndex(indices); riverGeo.computeVertexNormals();
  const riverMat = new T.ShaderMaterial({ uniforms: { uTime: uniforms.uTime, uNight: uniforms.uNight }, side: T.DoubleSide, transparent: true, depthWrite: false,
    vertexShader: `varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }`,
    fragmentShader: `uniform float uTime; uniform float uNight; varying vec2 vUv; void main(){float flow=sin(vUv.y*5.-uTime*3.+sin(vUv.x*38.))*sin(vUv.y*13.-uTime*4.5+vUv.x*21.);float glint=pow(max(0.,flow),14.)*.09;vec3 c=vec3(.035,.16,.14)+vec3(glint);c*=1.-uNight*.65;gl_FragColor=vec4(c,smoothstep(0.,.14,vUv.x)*(1.-smoothstep(.86,1.,vUv.x))*.58);\n#include <tonemapping_fragment>\n#include <colorspace_fragment>\n}` });
  // Shader includes must start on their own line.
  riverMat.fragmentShader = riverMat.fragmentShader.replace('; #include', ';\n#include');
  const riverMesh = mesh(scene, riverGeo, riverMat); riverMesh.renderOrder = 3; riverMesh.castShadow = false;

  const treePositions: { x: number; z: number; h: number; size: number; palm: boolean }[] = [];
  for (let i = 0; i < 4000 && treePositions.length < (lowPower ? 140 : 260); i++) {
    const x = rng() * 160 - 80, z = rng() * 150 - 75, h = terrainHeight(x, z);
    if (homeFootprint(x,z,4)||h < 2.9 || h > 31 || slopeAt(x, z) > 0.95 || Math.hypot(x - CABIN.x, z - CABIN.z) < 11 || Math.hypot(x + 29, z - 54) < 5) continue;
    // Reserve enough bank clearance for the whole canopy, not just the trunk.
    if (riverSample(x, z).distance < 10 || Math.abs(x - DOCK.x) < 3 && z > 43) continue;
    if (treePositions.some(p => Math.hypot(x - p.x, z - p.z) < 3.2)) continue;
    treePositions.push({ x, z, h, size: 0.8 + rng() * 0.9, palm: h < 7 && rng() < 0.7 });
  }
  const broad = treePositions.filter(p => !p.palm), crowns = new T.InstancedMesh(crownGeometry(lowPower?145:210), foliageMaterial(), broad.length * 3);
  const trunks = new T.InstancedMesh(new T.CylinderGeometry(0.18, 0.4, 4, 12, 5), naturalSurface('bark',2), broad.length);
  const dummy = new T.Object3D();
  broad.forEach((p, i) => {
    colliders.push({ kind: 'tree', x: p.x, z: p.z, y: p.h + p.size * 1.8, rx: .4 * p.size, rz: .4 * p.size, ry: 2 * p.size });
    dummy.position.set(p.x, p.h + p.size * 1.8, p.z); dummy.rotation.set(0, rng() * 6.28, 0); dummy.scale.set(p.size, p.size, p.size); dummy.updateMatrix(); trunks.setMatrixAt(i, dummy.matrix);
    for (let j = 0; j < 3; j++) {
      dummy.position.set(p.x + (rng() - 0.5) * 2, p.h + p.size * (3.8 + j * 0.7), p.z + (rng() - 0.5) * 2);
      dummy.scale.set(p.size * (2.5 - j * 0.3), p.size * 1.8, p.size * (2.2 - j * 0.2)); dummy.updateMatrix(); crowns.setMatrixAt(i * 3 + j, dummy.matrix);
      crowns.setColorAt(i * 3 + j, new T.Color().setScalar(.8+rng()*.3));
    }
  });
  const limbs=new T.InstancedMesh(new T.CylinderGeometry(.055,.16,1,7),naturalSurface('bark',1.3),broad.length*6);
  broad.forEach((p,i)=>{for(let j=0;j<6;j++){const a=j*2.4+i,start=new T.Vector3(p.x,p.h+p.size*(2.2+j*.2),p.z),end=new T.Vector3(p.x+Math.cos(a)*p.size*1.9,p.h+p.size*(4+j*.13),p.z+Math.sin(a)*p.size*1.9),delta=end.clone().sub(start);dummy.position.copy(start).lerp(end,.5);dummy.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),delta.clone().normalize());dummy.scale.set(p.size,delta.length(),p.size);dummy.updateMatrix();limbs.setMatrixAt(i*6+j,dummy.matrix);}});limbs.castShadow=true;scene.add(limbs);
  foliageShadow(crowns); crowns.castShadow = true; crowns.receiveShadow = true; trunks.castShadow = true; scene.add(crowns, trunks);
  const palmMaterial = foliageMaterial('palm'), bark = naturalSurface('bark',2,'#c0b7a2');
  const palms: T.Group[] = [];
  treePositions.filter(p => p.palm).forEach(p => {
    const palm = new T.Group(); palm.position.set(p.x, p.h, p.z); palm.rotation.y = rng() * 6.28; palm.scale.setScalar(p.size); scene.add(palm);
    const curve = new T.CatmullRomCurve3([new T.Vector3(), new T.Vector3(.15, 2.2, 0), new T.Vector3(.75, 4.8, .25), new T.Vector3(1.1, 6.2, .5)]);
    palm.updateMatrixWorld(true);
    for (let i = 0; i < 6; i++) {
      const p0 = curve.getPoint((i + .5) / 6).applyMatrix4(palm.matrixWorld);
      colliders.push({ kind: 'tree', x: p0.x, y: p0.y, z: p0.z, rx: .24 * p.size, rz: .24 * p.size, ry: .65 * p.size });
    }
    mesh(palm, new T.TubeGeometry(curve, 18, .2, 12, false), bark);
    const head = new T.Group(); head.position.set(1.1, 6.2, .5); palm.add(head); palms.push(head);
    for (let j = 0; j < 9; j++) {
      const frond=mesh(head,palmFrondGeometry(),palmMaterial);frond.rotation.y=-j/9*Math.PI*2;foliageShadow(frond);
      const angle=j/9*Math.PI*2;const stem=new T.CatmullRomCurve3([new T.Vector3(),new T.Vector3(Math.cos(angle)*2, .55,Math.sin(angle)*2),new T.Vector3(Math.cos(angle)*4.2,-1.1,Math.sin(angle)*4.2)]);mesh(head,new T.TubeGeometry(stem,12,.024,4,false),bark);
    }
    for (let j = 0; j < 3; j++) mesh(head, new T.IcosahedronGeometry(.22, 1), bark, Math.sin(j * 2) * .28, -.3, Math.cos(j * 2) * .28);
  });

  const rockGeo = weatheredRockGeometry(), rockMat = naturalSurface('rock',1.2);
  const rocks = new T.InstancedMesh(rockGeo, rockMat, lowPower ? 160 : 280);
  for (let i = 0; i < rocks.count; i++) {
    let x = 0, z = 0, h = -100;
    for (let n = 0; n < 100; n++) { x = (rng() - .5) * 184; z = (rng() - .5) * 170; h = terrainHeight(x, z); if (!homeFootprint(x,z,3)&&h > -3 && Math.hypot(x - CABIN.x, z - CABIN.z) > 10 && Math.hypot(x + 29, z - 54) > 4 && Math.abs(x - DOCK.x) > 3) break; }
    const s = h > 10 ? 1.4 + rng() * 2 : .25 + rng() * 1.3;
    dummy.position.set(x, h + s * .22, z); dummy.rotation.set(rng(), rng() * 6, rng()); dummy.scale.set(s * 1.2, s * .7, s); dummy.updateMatrix(); rocks.setMatrixAt(i, dummy.matrix);
    // Bound the rotated mesh so collision never misses the broad side of a rock.
    const bounds = new T.Box3().setFromBufferAttribute(rockGeo.attributes.position as T.BufferAttribute).applyMatrix4(dummy.matrix);
    const center = bounds.getCenter(new T.Vector3()), half = bounds.getSize(new T.Vector3()).multiplyScalar(.5);
    colliders.push({ kind: 'rock', x: center.x, y: center.y, z: center.z, rx: half.x, ry: half.y, rz: half.z });
    rocks.setColorAt(i, new T.Color().setScalar(.74+rng()*.35));
  }
  rocks.castShadow = true; rocks.receiveShadow = true; scene.add(rocks);

  const grassMat=foliageMaterial('grass'),up=new T.Vector3(0,1,0);
  // Three different tufts, broad meadows mixed with bare/drier patches. Keep
  // their roots tangent to the actual terrain and out of streams and buildings.
  for(let variant=0;variant<3;variant++){
    const blades=new T.InstancedMesh(grassClumpGeometry(412+variant*81),grassMat,lowPower?1800:4200);
    blades.name='natural-meadow-grass';let placed=0;
    for(let attempt=0;attempt<blades.count*25&&placed<blades.count;attempt++){
      const x=rng()*160-80,z=rng()*150-75,h=terrainHeight(x,z),patch=smooth(-.55,.7,noise(x*.075+17,z*.075));
      if(rng()>.22+patch*.78||homeFootprint(x,z,1.4)||h<3.5||slopeAt(x,z)>.75||riverSample(x,z).distance<3.6||Math.hypot(x-CABIN.x,z-CABIN.z)<7)continue;
      const normal=new T.Vector3(terrainHeight(x-.25,z)-terrainHeight(x+.25,z),.5,terrainHeight(x,z-.25)-terrainHeight(x,z+.25)).normalize();
      dummy.position.set(x,h-.025,z);dummy.quaternion.setFromUnitVectors(up,normal);dummy.rotateY(rng()*Math.PI*2);
      const size=.72+rng()*.42;dummy.scale.set(size,size*(.7+patch*.42),size);dummy.updateMatrix();blades.setMatrixAt(placed,dummy.matrix);
      const tint=.82+patch*.14+rng()*.08;blades.setColorAt(placed,new T.Color(tint,tint,tint*.96));placed++;
    }
    blades.count=placed;blades.computeBoundingSphere();blades.receiveShadow=true;scene.add(blades);
  }
  return { uniforms, palms, terrain, colliders, treePositions,waterSurfaces };
}
