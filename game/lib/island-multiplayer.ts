import * as T from 'three';
import {keeperTrainer} from './island-expansion-models';
import {createOutfitRig} from './island-outfits';
import {label} from './island-market';
import {emptyCrew,type CrewState,type CrewPose,type CrewPeer} from './crew-protocol';
export class IslandMultiplayer{
  state:CrewState=emptyCrew();private peers=new Map<string,{root:T.Group;outfit:ReturnType<typeof createOutfitRig>;rod:T.Mesh;fish:T.Mesh;boat:T.Mesh}>();
  private timer=0;private pending=false;private closed=false;private generation=0;private failures=0;
  constructor(private scene:T.Scene,private getPose:()=>CrewPose){}
  snapshot(){return {...this.state,players:this.state.players.map(p=>({...p}))};}
  async join(mode:'match'|'create'|'code',name:string,code=''){
    if(this.state.busy)return;this.state.busy=true;this.state.message='Connecting to the coast…';const epoch=++this.generation;
    try{const response=await fetch('/api/crew',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'join',mode,name,code,pose:this.getPose()}),signal:AbortSignal.timeout(10000)});const data=await response.json() as Partial<CrewState>&{error?:string};if(this.closed||epoch!==this.generation)return;if(!response.ok)throw new Error(data.error);Object.assign(this.state,data,{connected:true,message:'Crew connected · shared movement & fishing · personal coins, pets and orders'});this.failures=0;this.timer=0;}
    catch(e){if(!this.closed&&epoch===this.generation)this.state.message=e instanceof Error?e.message:'Could not connect. Try again.';}finally{this.state.busy=false;}
  }
  async leave(){this.generation++;this.state=emptyCrew();this.clear();try{await fetch('/api/crew',{method:'DELETE',keepalive:true});}catch{this.state.message='Playing solo. The old connection will expire automatically.';}}
  private clear(){for(const p of this.peers.values()){p.root.removeFromParent();p.root.traverse(o=>{if(o instanceof T.Mesh){o.geometry.dispose();for(const m of Array.isArray(o.material)?o.material:[o.material])m.dispose();}if(o instanceof T.Sprite){o.material.map?.dispose();o.material.dispose();}});}this.peers.clear();}
  private async pulse(){if(this.pending||!this.state.connected||this.closed)return;this.pending=true;const epoch=this.generation;
    try{const response=await fetch('/api/crew',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'pulse',pose:this.getPose()}),signal:AbortSignal.timeout(6000)});const data=await response.json() as Partial<CrewState>&{error?:string};if(this.closed||epoch!==this.generation)return;if(!response.ok){if(response.status===410){this.state.connected=false;this.clear();}throw new Error(data.error);}Object.assign(this.state,data);this.failures=0;this.state.message='Connected · move, explore and fish together';}
    catch(e){if(!this.closed&&epoch===this.generation){this.failures++;this.state.message=this.failures<3?'Connection interrupted · retrying…':e instanceof Error?e.message:'Disconnected. Join again.';if(this.failures>=5){this.state.connected=false;this.clear();}}}finally{this.pending=false;}
  }
  update(dt:number,time:number){if(!this.state.connected)return;this.timer+=dt;if(this.timer>=.5){this.timer=0;void this.pulse();}
    const now=Date.now(),present=new Set<string>();for(const p of this.state.players){if(p.id===this.state.self||now-p.updated>45000)continue;present.add(p.id);let avatar=this.peers.get(p.id);if(!avatar){const root=keeperTrainer();const legs=['left','right'].map(s=>root.getObjectByName(s+'-hip')!);const rig=createOutfitRig(root,legs);const tag=label(root,p.name,'CREWMATE',0,2.3,0,2.2);tag.material.depthTest=false;const rod=new T.Mesh(new T.CylinderGeometry(.017,.026,1.8,7),new T.MeshStandardMaterial({color:'#72563a'}));rod.position.set(.35,1.3,-.55);rod.rotation.x=-.55;root.add(rod);const fish=new T.Mesh(new T.SphereGeometry(.22,12,8),new T.MeshStandardMaterial({color:'#94bac0',metalness:.4,roughness:.35}));fish.scale.set(.45,.65,1.5);fish.position.set(-.3,.9,-.3);root.add(fish);const boat=new T.Mesh(new T.BoxGeometry(1.4,.3,3.2),new T.MeshStandardMaterial({color:'#70593c'}));boat.position.y=-.12;root.add(boat);root.position.set(p.pose.x,p.pose.y,p.pose.z);this.scene.add(root);avatar={root,outfit:rig,rod,fish,boat};this.peers.set(p.id,avatar);}
      const a=avatar,delta=new T.Vector3(p.pose.x,p.pose.y,p.pose.z).sub(a.root.position),moving=delta.length()>.035;if(delta.length()>30)a.root.position.add(delta);else a.root.position.addScaledVector(delta,1-Math.exp(-9*dt));a.root.rotation.y+=Math.atan2(Math.sin(p.pose.yaw-a.root.rotation.y),Math.cos(p.pose.yaw-a.root.rotation.y))*Math.min(1,10*dt);a.outfit.set(p.pose.outfit as 'regular'|'scuba'|'waders'|'snorkel');for(const [i,s]of ['left','right'].entries()){const leg=a.root.getObjectByName(s+'-hip');if(leg)leg.rotation.x=p.pose.boat?-.8:moving?Math.sin(time*9+i*Math.PI)*.4:0;}a.rod.visible=p.pose.action==='fishing';a.rod.rotation.z=Math.sin(time*10)*.07;a.fish.visible=p.pose.action==='caught';a.fish.rotation.z=Math.sin(time*15)*.12;a.boat.visible=!!p.pose.boat;
    }for(const [id,p]of this.peers)if(!present.has(id)){p.root.removeFromParent();this.peers.delete(id);}
  }
  dispose(){const connected=this.state.connected;this.closed=true;this.generation++;if(connected)void fetch('/api/crew',{method:'DELETE',keepalive:true}).catch(()=>{});this.state=emptyCrew();this.clear();}
}
