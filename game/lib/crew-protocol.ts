export type CrewPose={x:number;y:number;z:number;yaw:number;outfit:string;action:string;boat:string|null};
export type CrewPeer={id:string;name:string;slot:number;pose:CrewPose;updated:number};
export type CrewState={connected:boolean;busy:boolean;room:string;players:CrewPeer[];message:string;self:string};
export const emptyCrew=():CrewState=>({connected:false,busy:false,room:'',players:[],message:'Play solo, find a crew, or invite friends with a room code.',self:''});
export function validPose(raw:unknown):CrewPose|null{
  const p=raw as CrewPose;if(!p||typeof p!=='object'||![p.x,p.y,p.z,p.yaw].every(Number.isFinite)||Math.abs(p.x)>10000||Math.abs(p.z)>10000||p.y< -200||p.y>1000||Math.abs(p.yaw)>100000)return null;
  return {x:p.x,y:p.y,z:p.z,yaw:p.yaw,outfit:['regular','scuba','waders','snorkel'].includes(p.outfit)?p.outfit:'regular',action:['walking','fishing','caught','bow','knife','scooping','idle'].includes(p.action)?p.action:'idle',boat:typeof p.boat==='string'?p.boat.replace(/[^a-z0-9-]/g,'').slice(0,32):null};
}
