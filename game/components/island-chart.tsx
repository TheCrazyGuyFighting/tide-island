'use client';
import {useEffect,useRef,useState} from 'react';
import {Compass,X} from 'lucide-react';
import {groundHeight} from '@/lib/island-world';
import {RAINFOREST,RAINFOREST_APPROACH,HOME_BERTH,HOME_WAYPOINT} from '@/lib/island-rainforest-layout';
import {DISTANT_ISLANDS,distantLanding,type DistantIslandId} from '@/lib/island-destinations';

export type NavigationState={x:number;z:number;heading:number;open:boolean;aboard:string|null;speed:number;rainforest:boolean;distant?:DistantIslandId|null;discovered?:string[]};
type Target='home'|'rainforest'|DistantIslandId;
const LOCAL={x:-660,z:-125,w:1340,h:830},OCEAN={x:-2300,z:-2900,w:6500,h:4200},W=640,H=414;
const distanceLabel=(metres:number)=>metres>=1000?`${(metres/1000).toFixed(1)} km`:`${Math.round(metres)} m`;
export function IslandChart({navigation,close}:{navigation:NavigationState;close:()=>void}){
  const canvas=useRef<HTMLCanvasElement>(null),base=useRef<HTMLCanvasElement|null>(null),[target,setTarget]=useState<Target>(navigation.distant??'rainforest'),[wide,setWide]=useState(Math.abs(navigation.x)>1000||Math.abs(navigation.z)>1000);
  const remote=DISTANT_ISLANDS.find(i=>i.id===target),goal=remote?distantLanding(remote):target==='home'?HOME_WAYPOINT:RAINFOREST_APPROACH;
  const dx=goal.x-navigation.x,dz=goal.z-navigation.z,distance=Math.hypot(dx,dz),bearing=(Math.atan2(dx,-dz)*180/Math.PI+360)%360;
  const bounds=wide?OCEAN:LOCAL;
  useEffect(()=>{
    const chart=document.createElement('canvas');chart.width=W;chart.height=H;const ctx=chart.getContext('2d')!;
    const point=(x:number,z:number)=>({x:(x-bounds.x)/bounds.w*W,y:(z-bounds.z)/bounds.h*H});
    for(let py=0;py<H;py+=2)for(let px=0;px<W;px+=2){
      const x=bounds.x+(px+1)/W*bounds.w,z=bounds.z+(py+1)/H*bounds.h,h=groundHeight(x,z);
      ctx.fillStyle=h>35?'#b9cec6':h>5?'#69a375':h>.1?'#dfd095':h>-4?'#458e94':h>-10?'#286479':'#153e54';ctx.fillRect(px,py,2,2);
    }
    ctx.strokeStyle='#c4e1e41a';ctx.lineWidth=1;
    for(let x=0;x<=W;x+=64){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,H);ctx.stroke();}
    for(let y=0;y<=H;y+=50){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(W,y);ctx.stroke();}
    ctx.font='600 13px system-ui';ctx.fillStyle='#f5f3d8';ctx.textAlign='center';
    const labels=wide?[['TIDE',0,170],['RAINWILD',RAINFOREST.x,RAINFOREST.z+220],['MARKET',600,-90],...DISTANT_ISLANDS.map(i=>[i.name.toUpperCase(),i.x,i.z+i.rz+130])]:[['TIDE ISLAND',0,-78],['RAINWILD ISLAND',RAINFOREST.x,RAINFOREST.z+185],['MARKET',600,-67]];
    for(const [name,x,z] of labels){const p=point(Number(x),Number(z));ctx.fillText(String(name),p.x,p.y);}
    ctx.textAlign='left';ctx.fillText('N ↑',16,25);ctx.font='12px system-ui';ctx.fillStyle='#d7e8e4';
    ctx.fillText(wide?'Open ocean · three distant landfalls':'Sand / shallows / open sea',16,H-15);
    const metres=wide?1000:200,ruler=metres/bounds.w*W;ctx.strokeStyle='#d7e8e4';ctx.beginPath();ctx.moveTo(W-ruler-20,H-30);ctx.lineTo(W-20,H-30);ctx.stroke();ctx.fillText(wide?'1 km':'200 m',W-ruler-20,H-38);
    base.current=chart;
  },[bounds]);
  useEffect(()=>{
    if(!canvas.current||!base.current)return;const ctx=canvas.current.getContext('2d')!;ctx.drawImage(base.current,0,0);
    const point=(x:number,z:number)=>({x:(x-bounds.x)/bounds.w*W,y:(z-bounds.z)/bounds.h*H});
    const route=[HOME_BERTH,HOME_WAYPOINT,...(remote?[{x:remote.x>0?180:-180,z:180}]:[]),goal].map(p=>point(p.x,p.z));
    ctx.strokeStyle='#f2d48b';ctx.lineWidth=1.5;ctx.setLineDash([5,5]);ctx.beginPath();route.forEach((p,i)=>i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y));ctx.stroke();ctx.setLineDash([]);
    const end=point(goal.x,goal.z);ctx.strokeStyle='#fff3b5';ctx.beginPath();ctx.arc(end.x,end.y,8,0,Math.PI*2);ctx.stroke();
    for(const island of DISTANT_ISLANDS){if(!wide)continue;const p=point(island.x,island.z);ctx.fillStyle=navigation.discovered?.includes(island.id)?'#f5d488':'#c8e0df';ctx.beginPath();ctx.arc(p.x,p.y,3,0,Math.PI*2);ctx.fill();}
    const p=point(navigation.x,navigation.z);ctx.save();ctx.translate(p.x,p.y);ctx.rotate(navigation.heading*Math.PI/180);
    ctx.fillStyle='#ffffff';ctx.strokeStyle='#07344b';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(0,-9);ctx.lineTo(6,6);ctx.lineTo(0,3);ctx.lineTo(-6,6);ctx.closePath();ctx.fill();ctx.stroke();ctx.restore();
  },[navigation.x,navigation.z,navigation.heading,navigation.discovered?.join(','),target,bounds,goal.x,goal.z,remote]);
  return <aside className="voyage-chart" aria-label="Live navigation chart"><div className="chart-heading"><Compass size={19}/><strong>Your sea chart</strong><button onClick={close} aria-label="Close navigation chart"><X size={19}/></button></div>
    <canvas ref={canvas} width={W} height={H} role="img" aria-label={`Navigation chart. ${remote?.name??(target==='home'?'Home harbour':'Rainwild Island')} is ${Math.round(distance)} metres away at ${Math.round(bearing)} degrees. Your heading is ${Math.round(navigation.heading)} degrees.`}/>
    <div className="chart-destinations"><label htmlFor="chart-target">Destination<select id="chart-target" value={target} onChange={e=>{const next=e.target.value as Target;setTarget(next);setWide(next!=='home'&&next!=='rainforest');}}>
      <option value="home">Home harbour</option><option value="rainforest">Rainwild Island</option>{DISTANT_ISLANDS.map(i=><option value={i.id} key={i.id}>{i.name}{navigation.discovered?.includes(i.id)?' · Discovered':''}</option>)}
    </select></label><button aria-pressed={wide} onClick={()=>setWide(!wide)}>{wide?'Local waters':'All islands'}</button></div>
    <div className="chart-readings"><span>Distance <b>{distanceLabel(distance)}</b></span><span>Bearing <b>{Math.round(bearing)}°</b></span><span>Heading <b>{Math.round(navigation.heading)}°</b></span></div>
    <p>{remote?`${remote.description} Step ashore to earn ${remote.reward} XP.`:'Leave the harbour southward, then follow the gold route to the landing beach.'}</p>
    <small>{remote?`Follow the gold route around Tide Island’s ${remote.x>0?'east':'west'} coast before the open-water crossing. `:''}White arrow: you · Circle: landing approach · M closes</small>
  </aside>;
}
