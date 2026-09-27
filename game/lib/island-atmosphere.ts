import * as T from 'three';
import {Sky} from 'three/examples/jsm/objects/Sky.js';

// One atmospheric sky drives both the view and physically based material lighting.
export function createAtmosphere(scene:T.Scene,renderer:T.WebGLRenderer){
  const sky=new Sky();sky.name='coastal-atmosphere';sky.scale.setScalar(1800);scene.add(sky);
  const uniforms=sky.material.uniforms;
  uniforms.turbidity.value=3.4;uniforms.rayleigh.value=1.65;
  uniforms.mieCoefficient.value=.003;uniforms.mieDirectionalG.value=.82;
  uniforms.sunPosition.value.set(-80,105,50);
  if(uniforms.cloudCoverage){uniforms.cloudCoverage.value=.34;uniforms.cloudDensity.value=.58;uniforms.cloudScale.value=.0028;uniforms.cloudSpeed.value=.000025;}
  uniforms.uNight={value:0};
  sky.material.fragmentShader='uniform float uNight;\n'+sky.material.fragmentShader.replace('gl_FragColor = vec4( texColor, 1.0 );',`texColor=mix(texColor,vec3(.006,.012,.026)+vec3(.035,.045,.06)*pow(1.0-abs(direction.y),3.0),uNight);\n gl_FragColor = vec4( texColor, 1.0 );`);
  const pmrem=new T.PMREMGenerator(renderer),environmentScene=new T.Scene();
  const environmentSky=sky.clone();environmentSky.material=sky.material;environmentScene.add(environmentSky);
  uniforms.showSunDisc.value=false;
  const environment=pmrem.fromScene(environmentScene,.045,.1,2200);uniforms.showSunDisc.value=true;
  scene.environment=environment.texture;scene.environmentIntensity=.36;pmrem.dispose();
  return {sky,update(time:number,darkness:number,sun?:T.Vector3){if(uniforms.time)uniforms.time.value=time;uniforms.uNight.value=darkness;if(sun)uniforms.sunPosition.value.copy(sun);scene.environmentIntensity=T.MathUtils.lerp(.36,.07,darkness);},dispose(){environment.dispose();}};
}
