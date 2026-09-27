import * as T from 'three';
export const isBirdTool=(id:string)=>id==='bird-glove'||id==='whistle';
export function birdToolModel(id:string){
  const root=new T.Group(),leather=new T.MeshStandardMaterial({color:'#a16b36',roughness:.92}),dark=new T.MeshStandardMaterial({color:'#503720',roughness:.9}),brass=new T.MeshStandardMaterial({color:'#e3be61',metalness:.7,roughness:.3});
  const part=(g:T.BufferGeometry,m:T.Material,x:number,y:number,z:number)=>{const mesh=new T.Mesh(g,m);mesh.position.set(x,y,z);root.add(mesh);return mesh;};
  if(id==='whistle'){part(new T.CylinderGeometry(.085,.085,.12,16).rotateX(Math.PI/2),brass,0,.1,0);part(new T.BoxGeometry(.075,.055,.16),brass,0,.12,-.1);part(new T.BoxGeometry(.043,.008,.035),dark,0,.15,-.09);const ring=part(new T.TorusGeometry(.055,.008,6,16),brass,0,.13,.1);ring.rotation.x=Math.PI/2;return root;}
  part(new T.CylinderGeometry(.10,.13,.24,10).rotateX(Math.PI/2),leather,0,0,.13);
  part(new T.BoxGeometry(.22,.09,.24),leather,0,.025,-.07);
  for(let i=0;i<4;i++)part(new T.CapsuleGeometry(.028,.105,3,7).rotateX(Math.PI/2),leather,-.084+i*.055,.06,-.24);
  part(new T.CapsuleGeometry(.037,.13,3,7).rotateZ(-.6),leather,-.14,.04,-.075);
  for(const z of [.08,.18])part(new T.BoxGeometry(.24,.03,.034),dark,0,.095,z);
  part(new T.BoxGeometry(.042,.035,.04),brass,.13,.075,.18);return root;
}
export function whistleAudio(){
  let audio:AudioContext|undefined;
  return {blow(){try{audio??=new AudioContext();void audio.resume();const t=audio.currentTime,osc=audio.createOscillator(),gain=audio.createGain();osc.type='sine';osc.frequency.setValueAtTime(1850,t);osc.frequency.linearRampToValueAtTime(2450,t+.11);osc.frequency.linearRampToValueAtTime(2050,t+.3);gain.gain.setValueAtTime(0,t);gain.gain.linearRampToValueAtTime(.085,t+.035);gain.gain.exponentialRampToValueAtTime(.001,t+.34);osc.connect(gain).connect(audio.destination);osc.start(t);osc.stop(t+.35);}catch{/* Whistle commands still work when audio is unavailable. */}},dispose(){void audio?.close();}};
}
