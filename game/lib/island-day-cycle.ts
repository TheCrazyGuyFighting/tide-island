export const DAY_SECONDS=1200,DAILY_TAX=50;
export type DaySnapshot={day:number;hour:number;energy:number;exhausted:boolean;night:number;taxDue:number;sleeping:boolean;message:string};
/** Visit-local gameplay. Exhaustion is terminal until the page/code is restarted. */
export class IslandDay {
  elapsed=0;energy=100;exhausted=false;taxDue=0;sleeping=0;message='Sleep in your cabin before energy reaches zero.';
  get day(){return 1+Math.floor(this.elapsed/DAY_SECONDS);}
  get hour(){return (8+this.elapsed/DAY_SECONDS*24)%24;}
  get night(){return 1-Math.max(0,Math.min(1,(Math.sin((this.hour-6)/24*Math.PI*2)+.1)*2));}
  snapshot():DaySnapshot{return {day:this.day,hour:this.hour,energy:this.energy,exhausted:this.exhausted,night:this.night,taxDue:this.taxDue,sleeping:this.sleeping>0,message:this.message};}
  private advance(seconds:number,wallet:{coins:number},onDay:()=>void,free=false){const before=this.day;this.elapsed+=seconds;for(let d=before;d<this.day;d++){if(!free)this.taxDue+=DAILY_TAX;onDay();}if(before!==this.day){const paid=free?0:Math.min(wallet.coins,this.taxDue);wallet.coins-=paid;this.taxDue-=paid;this.message=free?`Day ${this.day} · rested for free.`:`Day ${this.day} · ${paid} coins paid${this.taxDue?` · ${this.taxDue} tax still due`:''}.`;}}
  update(dt:number,effort:number,wallet:{coins:number},onDay:()=>void){if(this.exhausted)return;dt=Math.max(0,Math.min(.1,dt));if(this.sleeping>0){this.sleeping=Math.max(0,this.sleeping-dt);if(this.sleeping===0){this.advance(DAY_SECONDS-this.elapsed%DAY_SECONDS,wallet,onDay,true);this.energy=100;}return;}this.advance(dt,wallet,onDay);this.energy=Math.max(0,this.energy-dt*(.060+Math.min(1,effort)*.022));if(this.energy===0){this.exhausted=true;this.message='Energy depleted. Reload the game to start a new visit.';}}
  sleep(){if(this.exhausted)return false;if(this.sleeping>0)return false;this.sleeping=2.5;this.message='Resting until the next morning…';return true;}
  settleTax(wallet:{coins:number}){const paid=Math.min(wallet.coins,this.taxDue);wallet.coins-=paid;this.taxDue-=paid;return paid;}
}
