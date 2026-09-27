'use client';
import {seafoodSpec} from '@/lib/island-expansion-types';
import { useEffect, useRef } from 'react';
import { Anchor, Bird, Box, ChevronLeft, ChevronRight, Crosshair, Fish, Grid2X2, Package, Shirt, Snowflake, Hand, Volume2 } from 'lucide-react';
import {isSpeargun} from '@/lib/island-speargun-types';
import {isOutfit} from '@/lib/island-water';
import { HOTBAR_KEYS, HOTBAR_PAGE_SIZE, hotbarItems,hotbarOwned, equipmentName, isPet, isBoat, type ShopSnapshot } from '@/lib/island-shop';

export function EquipmentIcon({ id }: { id: string }) {
  const Icon = id==='bird-glove'?Hand:id==='whistle'?Volume2:isSpeargun(id)?Crosshair:isOutfit(id)?Shirt:id === 'net' ? Grid2X2 : isBoat(id) ? Anchor : isPet(id) ? Bird : id === 'ice-box' ? Box : id === 'ice-block' ? Snowflake : Fish;
  return <Icon size={22} aria-hidden="true" />;
}

export function IslandHotbar({ inventory, disabled, onEquip, onPage }: { inventory: ShopSnapshot; disabled: boolean; onEquip: (id: string) => void; onPage:(delta:number)=>void }) {
  const items = hotbarItems(inventory),pages=Math.max(1,Math.ceil(hotbarOwned(inventory).length/HOTBAR_PAGE_SIZE));
  const active = useRef<HTMLButtonElement>(null);
  useEffect(() => { active.current?.scrollIntoView({block:'nearest',inline:'nearest'}); }, [inventory.activeItem]);
  return <section className="equipment-hotbar" aria-label="Equipment hotbar">
    <div className="hotbar-caption"><span>{equipmentName(inventory.activeItem)}</span><small>{disabled ? 'Equipment switching paused' : 'Click a slot · number keys to switch'}</small></div>
    {pages>1&&<div className="hotbar-pages"><button aria-label="Previous equipment page" disabled={disabled||!inventory.hotbarPage} onClick={()=>onPage(-1)}><ChevronLeft size={16}/></button><span>Page {(inventory.hotbarPage??0)+1} / {pages} · [ ]</span><button aria-label="Next equipment page" disabled={disabled||(inventory.hotbarPage??0)>=pages-1} onClick={()=>onPage(1)}><ChevronRight size={16}/></button></div>}
    <div className="hotbar-slots" role="group" aria-label="Select equipment">
      {items.map((id, index) => <button key={id} ref={inventory.activeItem===id?active:undefined} className="hotbar-slot" disabled={disabled} aria-pressed={inventory.activeItem === id||inventory.outfit===id} aria-label={`Slot ${HOTBAR_KEYS[index]}: ${equipmentName(id)}${inventory.outfit===id?' (worn)':''}${id==='menhaden'?` · ${inventory.menhaden??0} fish remaining`:''}`} title={`${HOTBAR_KEYS[index]} · ${equipmentName(id)}${isOutfit(id)?' · click to wear / remove':''}`} onClick={() => onEquip(id)}>
        <kbd>{HOTBAR_KEYS[index]}</kbd><EquipmentIcon id={id}/><span>{seafoodSpec(id)?`${equipmentName(id)} ×${inventory.expansion?.seafood[id]??0}`:id==='ice-block'?`Ice ×${inventory.expansion?.iceBlocks??0}`:id==='menhaden'?`Menhaden ×${inventory.menhaden??0}`:id === 'rod' ? 'Rod' : equipmentName(id).replace('Fishing ', '').replace('Steel fish ', '').replace('Reef lure ', 'Lure ').replace('Timber ', '')}</span>
      </button>)}
      {Array.from({length:Math.max(0,5-items.length)},(_,i)=><div key={`empty-${i}`} className="hotbar-slot is-empty" aria-hidden="true"><Package size={20}/><span>Empty</span></div>)}
    </div>
  </section>;
}
