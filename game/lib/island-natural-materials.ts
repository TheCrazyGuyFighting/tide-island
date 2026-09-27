import * as T from 'three';

type Surface='sand'|'grass'|'rock'|'bark'|'wood';
const assets:Record<Surface,string>={sand:'coast_sand_01',grass:'aerial_grass_rock',rock:'rock_face',bark:'bark_brown_02',wood:'wooden_planks'};
const textures=new Map<string,T.Texture>();
export const landscapeWind={value:0};
function texture(surface:Surface,map:string){
  const key=`${assets[surface]}_${map}`;if(textures.has(key))return textures.get(key)!;
  // Keep geometry usable even in non-browser physics tests.
  const t=typeof document==='undefined'?new T.Texture():new T.TextureLoader().load(`/environment/${key}.jpg`);
  t.wrapS=t.wrapT=T.RepeatWrapping;t.anisotropy=8;if(map==='diff')t.colorSpace=T.SRGBColorSpace;textures.set(key,t);return t;
}
export function disposeNaturalTextures(){textures.forEach(t=>t.dispose());textures.clear();}
export function naturalSurface(kind:Surface,repeat=1,color:T.ColorRepresentation='#ffffff'){
  const maps=['diff','nor_gl','arm'].map(map=>{const t=texture(kind,map).clone();t.repeat.setScalar(repeat);t.needsUpdate=true;return t;});
  return new T.MeshStandardMaterial({color,map:maps[0],normalMap:maps[1],normalScale:new T.Vector2(.65,.65),roughnessMap:maps[2],roughness:.94});
}

// World-space projection avoids stretched cliff textures and visible UV seams.
export function naturalTerrain(biome:'coast'|'tropical'|'volcanic'|'alpine'='coast'){
  const material=new T.MeshStandardMaterial({color:'#ffffff',roughness:.95});material.name='coastal-photographic-terrain';
  material.customProgramCacheKey=()=> `coastal-terrain-v2-${biome}`;
  material.onBeforeCompile=shader=>{
    for(const [prefix,kind] of [['Sand','sand'],['Grass','grass'],['Rock','rock']] as const)for(const [suffix,map] of [['Color','diff'],['Normal','nor_gl'],['ARM','arm']])shader.uniforms[`t${prefix}${suffix}`]={value:texture(kind,map)};
    shader.vertexShader='varying vec3 vGround; varying vec3 vGroundNormal;\n'+shader.vertexShader;
    shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvGround=(modelMatrix*vec4(position,1.0)).xyz;vGroundNormal=normalize(mat3(modelMatrix)*normal);');
    shader.fragmentShader=`varying vec3 vGround; varying vec3 vGroundNormal;
      uniform sampler2D tSandColor,tGrassColor,tRockColor,tSandNormal,tGrassNormal,tRockNormal,tSandARM,tGrassARM,tRockARM;
      vec3 projectSurface(sampler2D tex,vec3 p,vec3 w){return texture2D(tex,p.yz).rgb*w.x+texture2D(tex,p.xz).rgb*w.y+texture2D(tex,p.xy).rgb*w.z;}
      vec3 surfaceNormal(sampler2D tex,vec3 p,vec3 w,vec3 n){
        vec3 x=texture2D(tex,p.yz).xyz*2.0-1.0,y=texture2D(tex,p.xz).xyz*2.0-1.0,z=texture2D(tex,p.xy).xyz*2.0-1.0;
        return vec3(0.,x.x,x.y)*w.x+vec3(y.x,0.,y.y)*w.y+vec3(z.x,z.y,0.)*w.z;
      }\n`+shader.fragmentShader;
    shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>',`
      vec3 gn=normalize(vGroundNormal),weights=pow(abs(gn),vec3(5.0));weights/=max(.001,weights.x+weights.y+weights.z);
      float steep=1.0-abs(gn.y),rockBlend=smoothstep(.16,.51,steep)*smoothstep(.8,4.0,vGround.y);
      float grassBlend=smoothstep(1.9,4.4,vGround.y)*(1.0-rockBlend);
      vec3 sandColor=projectSurface(tSandColor,vGround*.43,weights),grassColor=projectSurface(tGrassColor,vGround*.105,weights),rockColor=projectSurface(tRockColor,vGround*.24,weights);
      vec3 surfaceColor=mix(sandColor,grassColor,grassBlend);surfaceColor=mix(surfaceColor,rockColor,rockBlend);
      ${biome==='volcanic'?'grassBlend=0.;rockBlend=smoothstep(1.,10.,vGround.y);surfaceColor=mix(sandColor*.24,rockColor*.58,rockBlend);':biome==='alpine'?'surfaceColor=mix(surfaceColor*.8,vec3(.77,.84,.89)+rockColor*.12,smoothstep(7.,23.,vGround.y)*(1.-steep*.65));':biome==='tropical'?'surfaceColor=mix(surfaceColor,sandColor*vec3(1.12,1.10,1.03),(1.-grassBlend)*(1.-rockBlend));':''}
      float wet=1.0-smoothstep(.05,1.05,vGround.y);
      diffuseColor.rgb=surfaceColor*mix(1.0,.57,wet);
      diffuseColor.rgb*=.9+.1*sin(vGround.x*.044+sin(vGround.z*.071));
    `);
    shader.fragmentShader=shader.fragmentShader.replace('#include <roughnessmap_fragment>',`#include <roughnessmap_fragment>
      float sr=projectSurface(tSandARM,vGround*.43,weights).g,gr=projectSurface(tGrassARM,vGround*.105,weights).g,rr=projectSurface(tRockARM,vGround*.24,weights).g;
      roughnessFactor=clamp(mix(mix(sr,gr,grassBlend),rr,rockBlend)*mix(1.,.58,wet),.35,1.);
    `);
    shader.fragmentShader=shader.fragmentShader.replace('#include <normal_fragment_maps>',`#include <normal_fragment_maps>
      vec3 sandN=surfaceNormal(tSandNormal,vGround*.43,weights,gn),grassN=surfaceNormal(tGrassNormal,vGround*.105,weights,gn),rockN=surfaceNormal(tRockNormal,vGround*.24,weights,gn);
      normal=normalize(normal+mat3(viewMatrix)*mix(mix(sandN,grassN,grassBlend),rockN,rockBlend)*.55);
    `);
  };return material;
}

type FoliageKind='canopy'|'palm'|'grass';
type PlantShader=Parameters<T.Material['onBeforeCompile']>[0];
function leafAtlas(){
  const key='coastal-leaf-atlas';if(textures.has(key))return textures.get(key)!;
  const t=typeof document==='undefined'?new T.Texture():new T.TextureLoader().load('/environment/coastal-leaf-atlas.png');
  t.colorSpace=T.SRGBColorSpace;t.anisotropy=8;t.wrapS=t.wrapT=T.ClampToEdgeWrapping;textures.set(key,t);return t;
}
function plantWind(s:PlantShader){
  s.uniforms.uWind=landscapeWind;
  s.vertexShader='uniform float uWind; attribute vec3 aPlant; varying vec2 vPlantUV;\n'+s.vertexShader;
  s.vertexShader=s.vertexShader.replace('#include <begin_vertex>',`#include <begin_vertex>
    vPlantUV=uv;
    vec4 plantWorld=vec4(position,1.0);
    #ifdef USE_INSTANCING
      plantWorld=instanceMatrix*plantWorld;
    #endif
    plantWorld=modelMatrix*plantWorld;
    float phase=plantWorld.x*.18+plantWorld.z*.13;
    float gust=sin(uWind*.72+phase)*.68+sin(uWind*1.31+phase*.54)*.32;
    float flutter=sin(uWind*3.4+aPlant.y+phase*2.0)*.14;
    float flex=aPlant.x*aPlant.z;
    transformed.x+=(gust+flutter)*flex;
    transformed.z+=(gust*.42+sin(uWind*1.8+aPlant.y)*.12)*flex;
  `);
}
export function foliageMaterial(kind:FoliageKind='canopy'){
  const m=new T.MeshStandardMaterial({color:'#ffffff',roughness:kind==='grass'?.92:.8,side:T.DoubleSide,vertexColors:true});
  m.name=`natural-${kind}`;m.userData.foliageKind=kind;
  if(kind==='canopy'){m.map=leafAtlas();m.alphaTest=.42;m.alphaToCoverage=true;m.bumpMap=m.map;m.bumpScale=.012;}
  m.customProgramCacheKey=()=>`living-foliage-v2-${kind}`;
  m.onBeforeCompile=s=>{
    plantWind(s);s.fragmentShader='varying vec2 vPlantUV;\n'+s.fragmentShader;
    if(kind!=='canopy')s.fragmentShader=s.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
      // Fine longitudinal fibres and a muted midrib; no broad painted stripes.
      float midrib=exp(-abs(vPlantUV.x-.5)*65.0);
      float fibres=sin(vPlantUV.x*78.0+sin(vPlantUV.y*18.0)*.3);
      diffuseColor.rgb*=.94+fibres*.035+midrib*.1;
    `);
    s.fragmentShader=s.fragmentShader.replace('#include <normal_fragment_begin>',`#include <normal_fragment_begin>
      // Softer undersides catch sky light instead of turning into black cutouts.
      if(!gl_FrontFacing)diffuseColor.rgb=mix(diffuseColor.rgb,diffuseColor.rgb*vec3(1.12,1.1,.93),.55);
    `);
    s.fragmentShader=s.fragmentShader.replace('#include <lights_fragment_end>',`#include <lights_fragment_end>
      #if NUM_DIR_LIGHTS > 0
        float leafLight=pow(max(0.0,dot(-geometryNormal,directionalLights[0].direction)),2.0);
        reflectedLight.indirectDiffuse+=diffuseColor.rgb*directionalLights[0].color*leafLight*.055;
      #endif
    `);
  };return m;
}

// Alpha silhouettes and wind must match in the visible and shadow passes.
export function foliageShadow(mesh:T.Mesh){
  const m=mesh.material as T.MeshStandardMaterial;
  const depth=new T.MeshDepthMaterial({depthPacking:T.RGBADepthPacking,map:m.map,alphaTest:m.alphaTest,side:T.DoubleSide});
  depth.customProgramCacheKey=()=>`rooted-foliage-shadow-v2-${m.userData.foliageKind}`;
  depth.onBeforeCompile=plantWind;mesh.customDepthMaterial=depth;
}
