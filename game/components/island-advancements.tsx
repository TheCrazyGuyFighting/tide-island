'use client';
import {useState} from 'react';
import {Award,Check,X} from 'lucide-react';
import type {AdvancementSnapshot} from '@/lib/island-advancements';

export function IslandAdvancements({progress}:{progress:AdvancementSnapshot}){
  const [open,setOpen]=useState(false);
  return <>
    <button className="advancement-toggle" aria-expanded={open} aria-controls="island-advancements" onClick={()=>setOpen(!open)}>
      <span><Award size={17}/><strong>Advancements</strong><b>{progress.completed}/{progress.total}</b></span>
      <progress aria-label="Overall advancement progress" value={progress.xp} max={progress.totalXp}/>
      <small>{progress.xp} / {progress.totalXp} XP</small>
    </button>
    {open&&<section id="island-advancements" className="advancement-panel" aria-label="Island advancements">
      <div className="chart-heading"><Award size={20}/><strong>Your island journey</strong><button aria-label="Close advancements" onClick={()=>setOpen(false)}><X size={18}/></button></div>
      <p>Catch, care, build and explore. Each milestone awards XP once this visit.</p>
      <ul>{progress.items.map(item=><li key={item.id} className={item.complete?'complete':''}>
        <div className="advancement-name"><strong>{item.name}</strong><span>{item.complete?<Check size={16} aria-label="Completed"/>:`${item.value}/${item.goal}`} · {item.xp} XP</span></div>
        <p>{item.description}</p><progress aria-label={item.name} value={item.value} max={item.goal}/>
      </li>)}</ul>
    </section>}
  </>;
}
