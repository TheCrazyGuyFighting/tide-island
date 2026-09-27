'use client';
import {useState} from 'react';
import {Bird,Check,Egg,Home,X} from 'lucide-react';
import {availableBirds,equipmentName,type ShopSnapshot,type ShopResult} from '@/lib/island-shop';
import {homeCapacity} from '@/lib/island-habitat-types';
import {FAMILY_FURNITURE,FAMILY_STAGES,familyStage} from '@/lib/island-family-layout';

export function IslandFamilyPanel({inventory,fish,away,gateOpen,start,toggleGate,close}:{inventory:ShopSnapshot;fish:number;away:string|null;gateOpen:boolean;start:(species:string)=>ShopResult;toggleGate:()=>ShopResult;close:()=>void}){
  const [selected,setSelected]=useState(''),[message,setMessage]=useState('');
  const birds=availableBirds(inventory).filter(p=>p.id!==away),species=[...new Set(birds.map(p=>p.species))];
  const pairs=species.filter(id=>birds.filter(p=>p.species===id).length>=2),chosen=pairs.includes(selected)?selected:pairs[0]??'';
  const brood=inventory.familyBrood,stage=brood?familyStage(brood):null,meals=(inventory.foodPortions??0)+fish,furnished=FAMILY_FURNITURE.every(id=>inventory.owned.includes(id));
  return <aside className="market-offer family-panel" aria-label="Family aviary care">
    <button className="market-offer-close" aria-label="Close family care" onClick={close}><X size={18}/></button>
    <span className="market-seller"><Home size={15}/> THE CABIN NURSERY</span><h2>A little family.</h2>
    <p>A smaller home for two parents and two chicks. Once grown, the young birds join your main aviary.</p>
    <div className="family-furniture">{FAMILY_FURNITURE.map(id=><div key={id}>{inventory.owned.includes(id)?<Check size={16}/>:<span className="family-missing">○</span>}<span>{equipmentName(id)}<small>{inventory.owned.includes(id)?'Installed':'Buy from Isla · Pet Care'}</small></span></div>)}</div>
    {brood?<div className="family-progress"><span className="family-phase">{stage==='eggs'?<Egg size={21}/>:<Bird size={21}/>} {stage==='eggs'?'Two eggs in the nest':stage==='chick'?'The chicks have hatched':stage==='juvenile'?'Growing feathers & practising flight':'Moving to the main aviary'}</span><p>{equipmentName(brood.species)} family · 2 parents + 2 young</p><progress aria-label="Bird family growth" value={brood.elapsed} max={FAMILY_STAGES.moving}/><small>{Math.max(0,Math.ceil(FAMILY_STAGES.moving-brood.elapsed))} active-game seconds until grown. The gates open automatically for their flight home; keep the doorway clear.</small><p>Six meals stocked · the parents are busy caring for their chicks and cannot join the glove yet.</p></div>:<>
      <label className="bird-choice">Choose an adult pair<select aria-label="Choose breeding pair" value={chosen} onChange={e=>setSelected(e.target.value)}>{!pairs.length&&<option value="">No matching pair at home</option>}{pairs.map(id=><option key={id} value={id}>{equipmentName(id)} · {birds.filter(p=>p.species===id).length} adults</option>)}</select></label>
      {!pairs.length&&<p>Buy two birds of the same species at the market. Return any companion from your glove first.</p>}
      <p>{meals} meals available · 6 needed for one family</p><button className="market-buy" disabled={!furnished||!chosen||meals<6} onClick={()=>setMessage(start(chosen).message)}><Egg size={18}/> Start nesting · stock 6 meals</button>
      <small>Eggs → chicks → fledglings → main aviary, in about 2½ active-game minutes. One family at a time; room for {homeCapacity(inventory,'birds')} adults in your bird home.</small>
    </>}
    <button className="care-secondary" disabled={stage==='moving'} aria-pressed={gateOpen} onClick={()=>setMessage(toggleGate().message)}>{gateOpen?'Close':'Open'} family gate</button>
    <p className="market-receipt" role="status">{message}</p><small>{inventory.raisedBirds??0} young birds raised · Purchases and families last for this visit.</small>
  </aside>;
}
