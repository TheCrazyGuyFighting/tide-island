import assert from 'node:assert/strict';
import * as T from 'three';
import {crownGeometry,palmFrondGeometry,grassClumpGeometry} from '../lib/island-natural-geometry';
import {foliageMaterial,foliageShadow,landscapeWind} from '../lib/island-natural-materials';

for(const g of [crownGeometry(145),crownGeometry(110,882,.72),palmFrondGeometry(),grassClumpGeometry(),grassClumpGeometry(493)]){
  const p=g.getAttribute('position'),uv=g.getAttribute('uv'),flex=g.getAttribute('aPlant'),norm=g.getAttribute('normal');
  for(const attribute of Object.values(g.attributes))assert([...attribute.array].every(Number.isFinite),g.name+' finite attributes');
  assert.equal(p.count,uv.count);assert.equal(p.count,flex.count);
  assert([...uv.array].every(n=>n>=0&&n<=1),'UVs must stay within the atlas');
  const a=new T.Vector3(),b=new T.Vector3(),c=new T.Vector3();
  for(let i=0;i<g.index!.count;i+=3){
    a.fromBufferAttribute(p,g.index!.getX(i));b.fromBufferAttribute(p,g.index!.getX(i+1));c.fromBufferAttribute(p,g.index!.getX(i+2));
    assert(b.sub(a).cross(c.sub(a)).lengthSq()>1e-15,g.name+' must not contain degenerate tip triangles');
  }
  for(let i=0;i<p.count;i++){
    assert(Math.abs(a.fromBufferAttribute(norm,i).length()-1)<1e-5,'Unit normals');
    assert(flex.getX(i)>=0&&flex.getX(i)<=1,'Bounded flexibility');
    if(g.name==='fine-curved-grass'&&p.getY(i)===0)assert.equal(flex.getX(i),0,'Grass roots cannot drift in the wind');
  }
  if(g.name==='fine-curved-grass'){
    g.computeBoundingBox();assert(g.boundingBox!.max.y<.3,'Short ground cover, not waist-high spikes');
    assert.equal(p.count,22*13,'Twenty-two individual tapered blades per tuft');
  }
  assert(g.index!.count/3<2000,'Keep shared vegetation prototypes inexpensive');
}
const canopy=crownGeometry(16);
for(let card=0;card<16;card++){
  const uv=canopy.getAttribute('uv'),tile=card%4;
  for(let i=0;i<9;i++){assert.equal(Math.floor(uv.getX(card*9+i)*2),tile%2);assert.equal(Math.floor(uv.getY(card*9+i)*2),Math.floor(tile/2));}
}
for(const kind of ['canopy','palm','grass'] as const){
  const m=foliageMaterial(kind),mesh=new T.Mesh(kind==='grass'?grassClumpGeometry():kind==='palm'?palmFrondGeometry():crownGeometry(2),m);
  foliageShadow(mesh);
  if(kind==='canopy'){assert(m.map);assert.equal(m.map,(mesh.customDepthMaterial as T.MeshDepthMaterial).map);assert.equal(m.alphaTest,mesh.customDepthMaterial!.alphaTest);}
  const shader={uniforms:{},vertexShader:T.ShaderLib.standard.vertexShader,fragmentShader:T.ShaderLib.standard.fragmentShader} as Parameters<T.Material['onBeforeCompile']>[0];
  m.onBeforeCompile(shader,{} as T.WebGLRenderer);
  assert.equal(shader.uniforms.uWind,landscapeWind);assert(shader.vertexShader.includes('float flex=aPlant.x*aPlant.z;'));
  const depth={uniforms:{},vertexShader:T.ShaderLib.depth.vertexShader,fragmentShader:T.ShaderLib.depth.fragmentShader} as Parameters<T.Material['onBeforeCompile']>[0];
  mesh.customDepthMaterial!.onBeforeCompile(depth,{} as T.WebGLRenderer);
  assert.equal(depth.uniforms.uWind,landscapeWind);assert(depth.vertexShader.includes('float flex=aPlant.x*aPlant.z;'));
}
console.log('PASS: fine foliage geometry, rooted wind, atlas UV isolation, matching alpha shadows, and bounded prototype cost.');
