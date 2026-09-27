// One continuous water route. Bow is always local -Z; +Z is the stern.
export const FREIGHT_HOME={x:-25,z:89};
export const FREIGHT_MARKET={x:610,z:87};
type Point={x:number;z:number};
function route(points:Point[]){
  const samples:Point[]=[],distances:number[]=[0];
  for(let i=0;i<points.length-1;i++)for(let j=0;j<32;j++){
    const t=j/32,a=points[Math.max(0,i-1)],b=points[i],c=points[i+1],d=points[Math.min(points.length-1,i+2)];
    const axis=(k:'x'|'z')=>.5*(2*b[k]+(-a[k]+c[k])*t+(2*a[k]-5*b[k]+4*c[k]-d[k])*t*t+(-a[k]+3*b[k]-3*c[k]+d[k])*t*t*t);
    samples.push({x:axis('x'),z:axis('z')});
  }
  samples.push(points.at(-1)!);
  for(let i=1;i<samples.length;i++)distances[i]=distances[i-1]+Math.hypot(samples[i].x-samples[i-1].x,samples[i].z-samples[i-1].z);
  const length=distances.at(-1)!,duration=length/10+10;
  function at(distance:number){
    const s=Math.max(0,Math.min(length,distance));let i=1;while(i<distances.length-1&&distances[i]<s)i++;
    const f=(s-distances[i-1])/(distances[i]-distances[i-1]);
    return {x:samples[i-1].x+(samples[i].x-samples[i-1].x)*f,z:samples[i-1].z+(samples[i].z-samples[i-1].z)*f};
  }
  return {length,duration,at,sample(elapsed:number){
    const t=Math.max(0,Math.min(duration,elapsed)),ramp=10,v=length/(duration-ramp);
    const distance=t<ramp?.5*v*t*t/ramp:t>duration-ramp?length-.5*v*(duration-t)**2/ramp:v*(t-ramp*.5);
    const p=at(distance),a=at(Math.max(0,distance-.35)),b=at(Math.min(length,distance+.35));
    return {...p,yaw:Math.atan2(-(b.x-a.x),-(b.z-a.z)),speed:v*Math.min(1,t/ramp,(duration-t)/ramp),progress:distance/length};
  }};
}
// The freighter rounds the south of Tide Island, clear of the reef and habitats.
export const INBOUND_ROUTE=route([FREIGHT_MARKET,{x:618,z:82},{x:632,z:98},{x:628,z:130},{x:581,z:150},{x:534,z:165},{x:310,z:166},{x:80,z:158},{x:-18,z:133},{x:-25,z:111},FREIGHT_HOME]);
// A real turning basin, not a 180-degree model flip at the end of the delivery.
export const RETURN_ROUTE=route([FREIGHT_HOME,{x:-20,z:83},{x:-8,z:87},{x:2,z:110},{x:45,z:150},{x:300,z:166},{x:548,z:146},{x:608,z:112},FREIGHT_MARKET]);
export const DELIVERY_ARRIVAL_SECONDS=INBOUND_ROUTE.duration;
export const DELIVERY_RETURN_SECONDS=RETURN_ROUTE.duration;
export const TANK_RECOVERY_SECONDS=5;
