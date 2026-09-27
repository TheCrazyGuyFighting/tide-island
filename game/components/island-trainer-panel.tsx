'use client';
import {useState} from 'react';
import {Input} from '@/components/ui/input';
import type {TrainerSnapshot} from '@/lib/island-trainer';
import type {ShopResult} from '@/lib/island-shop';
import {equipmentName} from '@/lib/island-shop';

export type TrainerControls={state:TrainerSnapshot;coins:number;fund:(n:number)=>ShopResult;pause:()=>void;resume:()=>ShopResult;reclaim:()=>ShopResult};
export function IslandTrainerPanel({state,coins,fund,pause,resume,reclaim}:TrainerControls){
  const [amount,setAmount]=useState('100'),[message,setMessage]=useState('');
  return <section className="trainer-agent" aria-label="Trainer agent">
    <span className="trainer-eyebrow">YOUR MARINE KEEPER</span><h3>Let me take care of them.</h3>
    <p className="trainer-current" aria-live="polite">{state.message}</p>
    <div className="trainer-wallet"><div><small>My remaining budget</small><strong>{state.balance} <span>coins</span></strong></div><div><small>Spent on care</small><strong>{state.spent} <span>coins</span></strong></div></div>
    <form onSubmit={e=>{e.preventDefault();setMessage(fund(Number(amount)).message);}}>
      <label htmlFor="trainer-budget">Give the trainer a budget</label>
      <div className="trainer-fund"><Input id="trainer-budget" type="number" inputMode="numeric" min={1} max={coins} step={1} value={amount} onChange={e=>setAmount(e.target.value)}/><button className="market-buy" disabled={!Number.isSafeInteger(Number(amount))||Number(amount)<=0||Number(amount)>coins}>Assign coins</button></div>
      <small>Your wallet: {coins} coins. Assigned coins move into his separate wallet.</small>
    </form>
    <div className="trainer-buttons"><button className="care-secondary" onClick={()=>{if(state.enabled){pause();setMessage('Trainer paused.');}else setMessage(resume().message);}}>{state.enabled?'Pause trainer':'Resume trainer'}</button><button className="care-secondary" disabled={state.balance===0&&!state.enabled} onClick={()=>setMessage(reclaim().message)}>Reclaim unspent coins</button></div>
    <p>He chooses meals, hunting practice, recall lessons and seawater care. Supplies come from Isla at her listed prices. He never spends your other coins or buys boats, pets or furniture.</p>
    <p>He carries both keeper’s chest waders and scuba equipment, and changes gear for water-care jobs.</p>
    <details><summary>Keeper’s field notes</summary><p>Bottlenose dolphins locate prey using listening and echolocation; fish, squid and crustaceans are part of their varied diet. <a href="https://www.fisheries.noaa.gov/species/common-bottlenose-dolphin" target="_blank" rel="noreferrer">NOAA field guide</a></p><p>California sea lions eat many kinds of fish as well as squid. <a href="https://www.fisheries.noaa.gov/species/california-sea-lion" target="_blank" rel="noreferrer">NOAA field guide</a></p><p>American white pelicans scoop prey at the surface and can forage together. They do not hunt like plunge-diving brown pelicans. <a href="https://www.allaboutbirds.org/guide/American_White_Pelican/lifehistory" target="_blank" rel="noreferrer">Cornell Lab field guide</a></p><small>Care costs, training gains and breeding times here are game rules, not real animal-care advice.</small></details>
    <small>Training uses seafood rewards. From 24 coins for six fresh-dead portions, or 36 for six live portions. No extra training fee. Close this panel to watch him work; you can still walk and fish.</small>
    {message&&<p role="status">{message}</p>}
    <details><summary>Trainer supplies & spending record</summary><small>Most recent 40 actions. The total spent includes every purchase.</small>
      <ul>{Object.entries(state.supplies).filter(([,n])=>n>0).map(([id,n])=><li key={id}>{equipmentName(id)} · {n} {id==='seawater'?'refreshes':'portions'}</li>)}</ul>
      <ol>{state.log.map(l=><li key={l.id}><span>{l.message}</span>{l.cost>0&&<b>−{l.cost} coins</b>}</li>)}</ol>
      {!state.log.length&&<p>No coins assigned or spent yet.</p>}
    </details>
    <small>Autonomous game character · budget and supplies last for this visit.</small>
  </section>;
}
