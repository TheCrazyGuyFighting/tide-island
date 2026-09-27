'use client';
import {useState} from 'react';
import {ShieldCheck} from 'lucide-react';
import {Checkbox} from '@/components/ui/checkbox';
import {LICENCE_FEE,type LicenceApplication} from '@/lib/island-speargun-types';
import type {ShopResult} from '@/lib/island-shop';
export function IslandLicence({valid,coins,apply}:{valid:boolean;coins:number;apply:(a:LicenceApplication)=>ShopResult}){
  const [draft,setDraft]=useState<LicenceApplication>({equipment:'',targets:'',agree:false}),[message,setMessage]=useState('');
  if(valid)return <div className="licence-valid"><ShieldCheck size={21}/><span>TIDE-M32 permit approved<small>Meandros unlocked · in-game only · this visit</small></span></div>;
  return <form className="licence-form" onSubmit={e=>{e.preventDefault();setMessage(apply(draft).message);}}><h3><ShieldCheck size={18}/> Apply for your game permit</h3><p>Finn’s briefing: use scuba equipment underwater, target wild fish only, and leave pets and birds unharmed.</p>
    <label>What equipment is required?<select required aria-label="Licence diving equipment" value={draft.equipment} onChange={e=>setDraft({...draft,equipment:e.target.value})}><option value="">Choose equipment</option><option value="waders">Keeper’s waders</option><option value="scuba">Scuba diving suit</option><option value="snorkel">Snorkeling suit</option></select></label>
    <label>What may you target?<select required aria-label="Licence permitted targets" value={draft.targets} onChange={e=>setDraft({...draft,targets:e.target.value})}><option value="">Choose targets</option><option value="wild-fish">Wild fish only</option><option value="pets">Pets and wild fish</option></select></label>
    <label className="can-stripe"><Checkbox checked={draft.agree} onCheckedChange={agree=>setDraft({...draft,agree:agree===true})}/> I agree to protect pets and birds.</label>
    <button className="market-buy" disabled={coins<LICENCE_FEE||!draft.equipment||!draft.targets||!draft.agree} type="submit">Apply · {LICENCE_FEE} coins</button><small>Fictional game permit—not a real-world licence. Charged once, only on approval; spear sold separately.</small><p role="status">{message|| (coins<LICENCE_FEE?'Catch more fish to afford the application.':'')}</p>
  </form>;
}
