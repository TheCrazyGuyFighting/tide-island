'use client';
import {IslandHabitatExpansion} from './island-habitat-expansion';
import {IslandTrainerPanel,type TrainerControls} from './island-trainer-panel';
import { useState } from 'react';
import {IslandSeaCarePanel} from './island-sea-care-panel';
import { X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { CAN_COLORS,DEFAULT_CAN,petRoster,isAquaticPet,isPelican,equipmentName,type CanDesign,type ShopSnapshot,type ShopResult } from '@/lib/island-shop';
import {ownedTier,TIER_NAMES,homeCapacity} from '@/lib/island-habitat-types';
import {IslandSeaFamily} from './island-sea-family';
import type { PetHome } from '@/lib/island-home-layout';
export function IslandPetCare({trainer,selectSeafood,serveSeafood,seaCommand,busy=false,home,inventory,coins,expand,fish,feed,water,design,equip,close,gateOpen,toggleGate,startSea}:{trainer?:TrainerControls;selectSeafood:(id:string)=>ShopResult;serveSeafood:(id:string)=>ShopResult;seaCommand:(id:string,c:'lesson'|'recall'|'pet')=>ShopResult;coins:number;expand:(tiles:number)=>ShopResult;busy?:boolean;startSea:(id:string)=>ShopResult;home:PetHome;inventory:ShopSnapshot;fish:number;feed:(id:string)=>ShopResult;water:()=>ShopResult;design:(value:CanDesign)=>ShopResult;equip:(id:string)=>ShopResult;close:()=>void;gateOpen:boolean;toggleGate:()=>ShopResult}){
  const [draft,setDraft]=useState<CanDesign>(inventory.canDesign??DEFAULT_CAN),[message,setMessage]=useState('');
  const pets=petRoster(inventory).filter(p=>(isAquaticPet(p.species)?'sea':'birds')===home&&!inventory.familyBrood?.parents.includes(p.id)).map(p=>p.id),hasCan=inventory.owned.includes('food-can'),usingCan=inventory.activeItem==='food-can',usingMenhaden=inventory.activeItem==='menhaden';
  const tier=ownedTier(inventory,home)??'prime';
  const food=usingMenhaden?(inventory.menhaden??0):usingCan?(inventory.foodPortions??0):fish;
  return <aside className="market-offer pet-care-offer" aria-label="Pet home care"><button className="market-offer-close" onClick={close} aria-label="Close pet care"><X size={18}/></button><span className="market-seller">{TIER_NAMES[tier]} · {homeCapacity(inventory,home)} spaces</span><h2>{home==='birds'?'Bird aviary':'Seawater habitat'}</h2><p>{pets.length} residents · {inventory.foodPortions??0} canned meals · {fish} caught fish · {inventory.menhaden??0} Menhaden</p>
    {home==='sea'&&trainer?.state.hired&&<IslandTrainerPanel {...trainer}/>}
    <IslandHabitatExpansion home={home} inventory={inventory} coins={coins} disabled={busy} expand={expand}/>
    <button className="care-secondary" aria-pressed={gateOpen} onClick={()=>setMessage(toggleGate().message)}>{gateOpen?'Close':'Open'} enclosure gate</button><p>{home==='birds'?'Birds stay home until called. Equip your glove and whistle by the open gate, then press G to take one out.':'The gate leads onto a railed feeding platform. Pets stay in their home when the gate is open.'}</p>
    {hasCan&&<button className="care-secondary" onClick={()=>setMessage(equip(usingCan?'rod':'food-can').message)}>{usingCan?'Use caught fish instead':'Equip food can to feed'}</button>}
    {home==='birds'&&inventory.owned.includes('menhaden')&&<button className="care-secondary" disabled={busy} aria-pressed={usingMenhaden} onClick={()=>setMessage(equip(usingMenhaden?'rod':'menhaden').message)}>{usingMenhaden?'Use caught fish instead':'Equip Menhaden · pelicans only'}</button>}
    {usingMenhaden&&<p>Choose a white or brown pelican. One fish is tossed down, picked up and swallowed. Other pets cannot eat Menhaden.</p>}
    <ul className="care-residents">{pets.map(id=><li key={id}><span>{equipmentName(id)}<small>{inventory.petMeals?.[id]??0} meals eaten</small></span><button disabled={busy||food<1||usingMenhaden&&!isPelican(id)} onClick={()=>setMessage(feed(id).message)}>{usingMenhaden?(isPelican(id)?'Toss 1 Menhaden':'Pelicans only'):`Feed ${usingCan?'1 portion':'1 fish'}`}</button></li>)}</ul>
    {!pets.length&&<p>Buy a {home==='birds'?'bird':'dolphin or sea lion'} from Isla on Market Island. It will move in here automatically.</p>}
    {home==='sea'&&<IslandSeaCarePanel inventory={inventory} busy={busy} select={selectSeafood} equip={equip} feed={serveSeafood} command={seaCommand}/>}
    {home==='sea'&&<IslandSeaFamily inventory={inventory} fish={fish} start={startSea}/>}
    {home==='sea'&&<div className="care-water"><p>Seawater supplies: {inventory.seawaterUses??0} · Refreshes: {inventory.waterRefreshes??0}</p><button className="care-secondary" disabled={!(inventory.seawaterUses??0)} onClick={()=>setMessage(water().message)}>Use 1 seawater supply</button></div>}
    {hasCan?<form className="can-designer" onSubmit={e=>{e.preventDefault();const result=design(draft);setMessage(result.message);if(result.ok)equip('food-can');}}><h3>Make your can your own</h3><label htmlFor="can-label">Can label</label><Input id="can-label" value={draft.label} maxLength={18} onChange={e=>setDraft({...draft,label:e.target.value})}/><div className="can-colors" role="group" aria-label="Can colour">{CAN_COLORS.map((color,i)=><button type="button" key={color} style={{backgroundColor:color}} aria-label={['Teal','Gold','Coral','Blue','Green','Pink'][i]} aria-pressed={draft.color===color} onClick={()=>setDraft({...draft,color})}/>)}</div><label className="can-stripe"><Checkbox checked={draft.stripe} onCheckedChange={stripe=>setDraft({...draft,stripe})}/> Add cream stripes</label><button className="market-buy" type="submit">Save design & hold can</button></form>:<p>Pet Care sells a refillable food can you can name and colour yourself.</p>}
    <p className="market-receipt" role="status">{message}</p><small>Birds share this aviary; dolphins and sea lions share the sea home. Designs and supplies last for this visit.</small>
  </aside>;
}
