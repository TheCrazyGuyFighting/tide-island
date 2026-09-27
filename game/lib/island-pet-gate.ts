import * as T from 'three';
import { mesh,material } from './island-landscape';
import { colliderBlocks,type IslandPhysics,type Body,type Collider } from './island-physics';

export function addPetGate(root:T.Group,physics:IslandPhysics,name:string,x:number,y:number,z:number,width:number,height:number,closedAngle:number) {
  const pivot=new T.Group();pivot.name=`pet-gate-${name}`;pivot.position.set(x,y,z);root.add(pivot);
  const frame=material('#507a63'),brass=material('#e5ba63'),wire=material('#b8ccc2');
  for(const xx of [.06,width-.06])mesh(pivot,new T.BoxGeometry(.12,height,.12),frame,xx,height/2,0);
  for(const yy of [.09,height/2,height-.07])mesh(pivot,new T.BoxGeometry(width,.12,.12),frame,width/2,yy,0);
  for(let xx=.3;xx<width-.15;xx+=.25)mesh(pivot,new T.CylinderGeometry(.022,.022,height-.12,5),wire,xx,height/2,0);
  for(const yy of [.35,height-.35])mesh(pivot,new T.CylinderGeometry(.09,.09,.2,8),brass,0,yy,0);
  mesh(pivot,new T.BoxGeometry(.32,.075,.19),brass,width-.26,Math.min(1.12,height*.65),0);
  let angle=closedAngle,open=false,paused=false;
  const collider:Collider={kind:'box',x:0,y:y+height/2,z:0,rx:width/2,ry:height/2,rz:.07,angle};
  const place=(a:number)=>{collider.x=x+Math.cos(a)*width/2;collider.z=z-Math.sin(a)*width/2;collider.angle=a;};
  place(angle);pivot.rotation.y=angle;physics.addDynamicCollider(collider);
  return {pivot,collider,get open(){return open;},get paused(){return paused;},get ready(){return open&&Math.abs(angle-(closedAngle-Math.PI/2))<.1;},
    toggle(){open=!open;return open;},
    update(dt:number,body?:Pick<Body,'x'|'y'|'z'>){
      const target=closedAngle-(open?Math.PI/2:0),step=Math.max(-2*dt,Math.min(2*dt,target-angle));
      const pieces=Math.max(1,Math.ceil(Math.abs(step)/.025));paused=false;
      // Check the whole swept arc, not only the end pose, so a door cannot push through you.
      for(let i=0;i<pieces;i++){
        const next=angle+step/pieces;place(next);
        if(body&&colliderBlocks(collider,body.x,body.y,body.z)){place(angle);paused=Math.abs(target-angle)>.01;break;}
        angle=next;
      }
      pivot.rotation.y=angle;
    },
  };
}
