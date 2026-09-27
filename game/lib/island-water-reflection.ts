import * as T from 'three';

// One shared half-resolution reflection for the connected sea, updated at 20 Hz.
// Camera mirroring and oblique clipping follow Three.js Water's planar method.
export function createWaterReflection(renderer:T.WebGLRenderer,scene:T.Scene,surfaces:T.Object3D[],lowPower:boolean){
  const target=new T.WebGLRenderTarget(lowPower?256:512,lowPower?256:512,{type:T.HalfFloatType});
  const camera=new T.PerspectiveCamera(),matrix=new T.Matrix4(),rotation=new T.Matrix4(),normal=new T.Vector3(0,1,0),look=new T.Vector3(),up=new T.Vector3(),plane=new T.Plane(),clip=new T.Vector4(),q=new T.Vector4();let last=-1;
  return {texture:target.texture,matrix,update(source:T.PerspectiveCamera,time:number){
    if(source.position.y<.15||time-last<1/(lowPower?12:20))return;last=time;source.updateMatrixWorld();
    camera.position.copy(source.position);camera.position.y*=-1;
    rotation.extractRotation(source.matrixWorld);look.set(0,0,-1).applyMatrix4(rotation).add(source.position);look.y*=-1;
    camera.up.copy(up.set(0,1,0).applyMatrix4(rotation).reflect(normal));camera.lookAt(look);camera.far=source.far;camera.updateMatrixWorld();camera.projectionMatrix.copy(source.projectionMatrix);
    matrix.set(.5,0,0,.5,0,.5,0,.5,0,0,.5,.5,0,0,0,1).multiply(camera.projectionMatrix).multiply(camera.matrixWorldInverse);
    plane.set(normal,-.03).applyMatrix4(camera.matrixWorldInverse);clip.set(plane.normal.x,plane.normal.y,plane.normal.z,plane.constant);const p=camera.projectionMatrix.elements;
    q.set((Math.sign(clip.x)+p[8])/p[0],(Math.sign(clip.y)+p[9])/p[5],-1,(1+p[10])/p[14]);clip.multiplyScalar(2/clip.dot(q));p[2]=clip.x;p[6]=clip.y;p[10]=clip.z+1-.002;p[14]=clip.w;
    const previous=renderer.getRenderTarget(),auto=renderer.autoClear,shadows=renderer.shadowMap.autoUpdate,xr=renderer.xr.enabled,visible=surfaces.map(s=>s.visible);
    try{surfaces.forEach(s=>s.visible=false);renderer.xr.enabled=false;renderer.shadowMap.autoUpdate=false;renderer.autoClear=true;renderer.setRenderTarget(target);renderer.clear();renderer.render(scene,camera);}
    finally{surfaces.forEach((s,i)=>s.visible=visible[i]);renderer.setRenderTarget(previous);renderer.autoClear=auto;renderer.shadowMap.autoUpdate=shadows;renderer.xr.enabled=xr;}
  },dispose(){target.dispose();}};
}
