'use client';
import {Bird,Hand,Volume2} from 'lucide-react';
import {equipmentName,availableBirds,type ShopSnapshot} from '@/lib/island-shop';
import {birdStrategy,type BirdStatus} from '@/lib/island-bird-companion';
export function IslandBirdPanel({bird,inventory,disabled,whistle,pet,select,home}:{bird:BirdStatus;inventory:ShopSnapshot;disabled:boolean;whistle:()=>void;pet:()=>void;select:(id:string)=>void;home:()=>void}){
  const birds=availableBirds(inventory).map(p=>p.id),id=bird.id&&birds.includes(bird.id)?bird.id:birds[0]??'',paired=inventory.owned.includes('bird-glove')&&inventory.owned.includes('whistle');
  return <section className="fishing-panel bird-panel" aria-label="Bird companion"><div className="fishing-title"><Bird size={19}/><span>KEEPER’S GLOVE</span></div>
    <label className="bird-choice">Your bird<select aria-label="Choose companion bird" value={id} disabled={disabled||bird.phase!=='home'} onChange={e=>select(e.target.value)} onKeyDown={e=>{const key=e.key.toLowerCase();if(!e.repeat&&!e.ctrlKey&&!e.metaKey&&!e.altKey&&(key==='g'||key==='f')){e.preventDefault();e.stopPropagation();if(key==='g'||inventory.activeItem==='whistle')whistle();else pet();}}}>{!birds.length&&<option value="">No available birds</option>}{birds.map(id=><option key={id} value={id}>{equipmentName(id)}</option>)}</select></label>
    <p role="status">{bird.blocker??bird.message}</p>{id&&<small>{birdStrategy(id)} · {inventory.petMeals?.[id]??0} meals eaten</small>}
    {bird.doubleWindow>0&&<div className="whistle-window"><span>Second whistle: {bird.doubleWindow.toFixed(1)}s</span><progress aria-label="Time for second whistle" max={3} value={bird.doubleWindow}/></div>}
    <div className="fishing-actions"><button className="fish-action" disabled={disabled||bird.phase==='homing'} onClick={whistle}><Volume2 size={15}/><kbd>G</kbd>Whistle</button><button className="fish-action" disabled={disabled||bird.phase!=='perched'} onClick={pet}><Hand size={15}/>{inventory.activeItem!=='whistle'&&<kbd>F</kbd>}Pet</button></div>
    {bird.phase!=='home'&&<button className="bird-home" disabled={disabled||bird.phase==='homing'} onClick={home}>Return bird home</button>}
    {inventory.activeItem==='whistle'&&<small>Whistle equipped: F also blows it.</small>}
    <small>{!birds.length?'Buy a bird and shared aviary at the market.':!paired?'Buy the glove and whistle at Isla’s Pet Care displays.':'One G calls · two G less than 3 seconds apart sends a hunt. Birds eat their catch, then return to the glove.'}</small>
  </section>;
}
