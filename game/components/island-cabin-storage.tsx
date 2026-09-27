'use client';
import {useState} from 'react';
import {equipmentName,isCarriedItem,type ShopSnapshot,type ShopResult} from '@/lib/island-shop';
export function IslandCabinStorage({inventory,store,retrieve,close}:{inventory:ShopSnapshot;store:(id:string)=>ShopResult;retrieve:(id:string)=>ShopResult;close:()=>void}){
  const [message,setMessage]=useState(''),stored=inventory.expansion?.stored??[],items=['rod',...inventory.owned.filter(isCarriedItem)];
  return <aside className="market-offer cabin-storage" aria-label="Cabin storage"><button className="market-offer-close" aria-label="Close storage" onClick={close}>×</button><span className="market-seller">CABIN · YOUR EQUIPMENT</span><h2>Chest & rod rack</h2><p>Put equipment away or retrieve it. Rods appear in the wall clips; stored gear leaves your hotbar. Supplies keep their counts.</p><ul className="care-residents">{items.map(id=><li key={id}><span>{equipmentName(id)}<small>{stored.includes(id)?'Stored in cabin':'Carried'}</small></span><button onClick={()=>setMessage((stored.includes(id)?retrieve(id):store(id)).message)}>{stored.includes(id)?'Retrieve':'Store'}</button></li>)}</ul><p role="status">{message}</p><small>Storage lasts for this visit, like your purchases.</small></aside>;
}
