'use client';
import {useState} from 'react';
import {Input} from '@/components/ui/input';
import {HABITAT_TILE_PRICE,MAX_HABITAT_EXPANSION,AREA_PER_EXTRA_RESIDENT,expansionArea,habitatArea,homeCapacity,ownedTier,type PetHome} from '@/lib/island-habitat-types';
import type {ShopSnapshot,ShopResult} from '@/lib/island-shop';

export function IslandHabitatExpansion({home,inventory,coins,disabled,expand}:{home:PetHome;inventory:ShopSnapshot;coins:number;disabled:boolean;expand:(tiles:number)=>ShopResult}){
  const [quantity,setQuantity]=useState('1'),[message,setMessage]=useState('');
  const tier=ownedTier(inventory,home),added=expansionArea(inventory,home),remaining=MAX_HABITAT_EXPANSION[home]-added,tiles=Number(quantity);
  const valid=Number.isSafeInteger(tiles)&&tiles>=1&&tiles<=remaining,price=valid?tiles*HABITAT_TILE_PRICE:0;
  const area=(tier?habitatArea(home,tier):0)+added,capacity=homeCapacity(inventory,home);
  const nextCapacity=valid?homeCapacity({...inventory,homeExpansions:{...inventory.homeExpansions,[home]:added+tiles}},home):capacity;
  return <section className="habitat-expansion" aria-label="Habitat expansion">
    <h3>Extend this habitat</h3><p>Every <strong>1 × 1 m</strong> of extra space costs <strong>20 coins</strong>.</p>
    <div className="habitat-size"><span>Current area <strong>{area.toLocaleString(undefined,{maximumFractionDigits:1})} m²</strong></span><span>Animal spaces <strong>{capacity}{valid&&nextCapacity!==capacity?` → ${nextCapacity}`:''}</strong></span></div>
    {remaining>0?<form onSubmit={e=>{e.preventDefault();if(!valid||disabled||coins<price)return;const result=expand(tiles);setMessage(result.message);if(result.ok)setQuantity('1');}}>
      <label htmlFor={`expand-${home}`}>Extra 1 m² plots</label>
      <div className="expansion-quantity"><Input id={`expand-${home}`} type="number" min={1} max={remaining} step={1} value={quantity} onChange={e=>setQuantity(e.target.value)} inputMode="numeric"/><div>{[1,5,10].map(n=><button type="button" key={n} disabled={n>remaining||disabled} aria-pressed={tiles===n} onClick={()=>setQuantity(String(n))}>{n} m²</button>)}</div></div>
      <p className="expansion-price">{valid?`${tiles} m² × 20 = ${price} coins`:`Choose 1–${remaining} whole plots.`}<span>{coins} coins available</span></p>
      <button className="market-buy" disabled={!valid||disabled||coins<price} type="submit">{valid&&coins<price?`Need ${price-coins} more coins`:valid?`Expand ${tiles} m² · ${price} coins`:'Choose an area'}</button>
    </form>:<p>This habitat fills its available building area.</p>}
    <small>{AREA_PER_EXTRA_RESIDENT[home]} extra m² adds one animal space. {added} m² added · {remaining} m² available. Extensions stay when you upgrade the habitat.</small>
    {message&&<p role="status">{message}</p>}
  </section>;
}
