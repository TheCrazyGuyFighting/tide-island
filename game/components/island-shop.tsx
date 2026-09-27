'use client';
import {bundleSpec} from '@/lib/island-expansion-types';
import { useState } from 'react';
import { Check, Coins, Package, X } from 'lucide-react';
import { SHOP_ITEMS, purchaseTotal, shippingFee,isPet,isPetHome,requirementSatisfied,requirementName,petCount,repeatableItem,equipmentName, type ShopSnapshot, type ShopResult } from '@/lib/island-shop';
import { MARKET_SPOTS } from '@/lib/island-market-layout';
import {homeItemInfo,ownedTier,HOME_TIERS,TIER_NAMES,homeCapacity,homeItem,habitatArea,TIER_CAPACITY,type HomeTier} from '@/lib/island-habitat-types';
import {isFamilyItem} from '@/lib/island-family-layout';
import {IslandLicence} from './island-licence';
import type {LicenceApplication} from '@/lib/island-speargun-types';
import {isOutfit} from '@/lib/island-water';

// A quote belongs to the physical exhibit the player is standing beside.
// No catalog, category navigation, modal backdrop, or remote purchasing.
export function IslandShop({ id:displayId, coins, inventory, buy, equip, close, applyLicence }: { applyLicence:(a:LicenceApplication)=>ShopResult; id:string; coins:number; inventory:ShopSnapshot; buy:(id:string)=>Promise<ShopResult>; equip:(id:string)=>ShopResult; close:()=>void }) {
  const [busy,setBusy]=useState(false),[message,setMessage]=useState('');
  const [selectedTier,setSelectedTier]=useState<HomeTier>(homeItemInfo(displayId)?.tier??'prime');
  const displayHome=homeItemInfo(displayId),id=displayHome?homeItem(displayHome.home,selectedTier):displayId;
  const item=SHOP_ITEMS.find(i=>i.id===id)!;
  const home=homeItemInfo(id),tier=home?ownedTier(inventory,home.home):null;
  const shipping=shippingFee(item),total=purchaseTotal(item),owned=home?!!tier&&HOME_TIERS.indexOf(tier)>=HOME_TIERS.indexOf(home.tier):inventory.owned.includes(id),equipped=isOutfit(id)?inventory.outfit===id:inventory.activeItem===id;
  const inBasket=inventory.basket?.[id]??0;
  async function purchase(){if(busy)return;setBusy(true);setMessage('');try{setMessage((await buy(id)).message);}catch{setMessage('Purchase could not complete. Please try again.');}finally{setBusy(false);}}
  return <aside className="market-offer" aria-label={`Buy ${item.name}`}>
    <button className="market-offer-close" onClick={close} aria-label="Close item quote"><X size={18}/></button>
    <span className="market-seller">{MARKET_SPOTS.find(s=>s.id===id)?.vendor}</span>
    <h2>{item.name}</h2><p>{item.description}</p>
    {home&&<div className="home-tier-summary"><label>Choose size<select value={selectedTier} onChange={e=>setSelectedTier(e.target.value as HomeTier)}>{HOME_TIERS.map(t=><option value={t} key={t}>{TIER_NAMES[t]} · {Math.round(habitatArea(home.home,t))} m² · {TIER_CAPACITY[home.home][t]} animals</option>)}</select></label><strong>{TIER_NAMES[home.tier]} home</strong><p>{tier?`Currently ${TIER_NAMES[tier]} · ${homeCapacity(inventory,home.home)} spaces`:'No home installed yet.'}</p><small>Upgrade purchases replace your enclosure without removing any pets. Lower tiers cannot replace a larger home.</small></div>}
    {item.requires&&!requirementSatisfied(inventory,item.requires)&&<p>{inventory.basket?.[item.requires]?`${requirementName(item.requires)} is in this order.`:`Needs ${requirementName(item.requires)}. Buy it first, or add both to the same order.`}</p>}
    <dl className="market-price"><div><dt>Item</dt><dd>{item.price} coins</dd></div><div><dt>Shipping</dt><dd>{shipping?`${shipping} coins`:'Free'}</dd></div><div className="market-total"><dt>Total</dt><dd>{total} coins</dd></div></dl>
    {id==='meandros-b32'&&<IslandLicence valid={!!inventory.meandrosLicence} coins={coins} apply={applyLicence}/>}
    {isPet(id)&&<p>{petCount(inventory,id)} owned · Buy another of the same species to form a bird pair.</p>}
    {owned&&!repeatableItem(item)?<button className="market-buy" disabled={busy||equipped||id==='trainer'||!!bundleSpec(id)||isPet(id)||isPetHome(id)||isFamilyItem(id)} onClick={()=>setMessage(equip(id).message)}><Check size={18}/>{id==='trainer'?'Trainer hired':bundleSpec(id)?'Bundle delivered':isFamilyItem(id)?'Installed beside your cabin':isPetHome(id)?`${TIER_NAMES[tier??'prime']} home installed`:isPet(id)?'Moved into your shared home':equipped?'Equipped':'Owned · equip item'}</button>:<button className="market-buy" disabled={busy||!repeatableItem(item)&&inBasket>0||id==='meandros-b32'&&!inventory.meandrosLicence} onClick={()=>void purchase()}><Package size={18}/>{busy?'Adding…':inBasket&&!repeatableItem(item)?'In your basket':`Add ${repeatableItem(item)?'one ':''}to basket`}</button>}
    <p className="market-receipt" role="status">{message||`${inBasket} in basket · Pay Coral at the central cashier.`}</p>
    <p>Buy 4+ items from {item.category} in one order for 10% off that section’s goods. Shipping is separate.</p>
    <small>Model by {item.maker} · Walk away or Esc to close</small>
  </aside>;
}
