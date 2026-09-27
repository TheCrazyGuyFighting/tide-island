'use client';
import { useState } from 'react';
import { X,Minus,Coins } from 'lucide-react';
import { basketQuote,isBoat,equipmentName,type ShopSnapshot,type ShopResult } from '@/lib/island-shop';
import type { AdviceTopic } from '@/lib/island-cashier';
export function IslandCashier({inventory,coins,advice,ask,remove,pay,close,launchBoat}:{inventory:ShopSnapshot;coins:number;advice:string;ask:(topic:AdviceTopic)=>void;remove:(id:string)=>void;pay:()=>Promise<ShopResult>;close:()=>void;launchBoat:(id:string)=>void}){
  const [busy,setBusy]=useState(false),[message,setMessage]=useState('');const quote=basketQuote(inventory.basket);
  async function checkout(){if(busy)return;setBusy(true);setMessage('');try{setMessage((await pay()).message);}catch{setMessage('Checkout could not complete. Check your basket before trying again.');}finally{setBusy(false);}}
  return <aside className="market-offer cashier-offer" aria-label="Cashier checkout">
    <button className="market-offer-close" onClick={close} aria-label="Leave cashier"><X size={18}/></button><span className="market-seller">Coral · Cashier</span><h2>Let’s check your basket.</h2>
    <p className="cashier-advice" role="status">{advice}</p><div className="cashier-questions">{([['next','Recommend an item'],['pets','Pet-care advice'],['discounts','Section discounts']] as const).map(([topic,name])=><button key={topic} onClick={()=>ask(topic)}>{name}</button>)}</div>
    <small>In-game adviser · recommendations use your coins, pets and basket.</small>
    <ul className="cashier-lines">{quote.lines.map(({item,quantity})=><li key={item.id}><span>{item.name}<small>{item.category} · {quantity} × {item.price} coins</small></span><button aria-label={`Remove one ${item.name}`} disabled={busy} onClick={()=>{remove(item.id);setMessage('');}}><Minus size={16}/></button></li>)}</ul>
    {!quote.count&&<p>Your basket is empty. Inspect a display with E to add an item.</p>}
    <div className="cashier-sections">{quote.sections.map(s=><p key={s.category}>{s.category}: {s.count} items <strong>{s.discount?`−${s.discount} coins (10%)`:`${4-s.count} more for 10% off`}</strong></p>)}</div>
    <dl className="market-price"><div><dt>Goods</dt><dd>{quote.subtotal}</dd></div><div><dt>Section discounts</dt><dd>−{quote.discount}</dd></div><div><dt>Shipping</dt><dd>{quote.shipping}</dd></div><div className="market-total"><dt>Total</dt><dd>{quote.total} coins</dd></div></dl>
    <button className="market-buy" disabled={busy||!quote.count||coins<quote.total} onClick={()=>void checkout()}><Coins size={18}/>{busy?'Preparing delivery…':coins<quote.total?`Need ${quote.total-coins} more coins`:`Pay ${quote.total} coins`}</button>
    <p className="market-receipt" role="status">{message||'Nothing is charged until you confirm payment.'}</p>
    {!quote.count&&isBoat(inventory.activeItem)&&inventory.owned.includes(inventory.activeItem)&&<button className="market-buy" disabled={busy} onClick={()=>launchBoat(inventory.activeItem)}>Launch & drive {equipmentName(inventory.activeItem)}</button>}
    <small>Pets move into your homes. Boats are ready at your harbour and listed in My boats. Equipment goes into your hotbar. Purchases last for this visit.</small>
  </aside>;
}
