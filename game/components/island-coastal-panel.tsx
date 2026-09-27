'use client';
import {useState} from 'react';
import {X,Users,Fish,Package,Store,Search} from 'lucide-react';
import type {IslandAPI,IslandStatus} from '@/lib/island-engine';
import {SHOP_ITEMS,isCarriedItem,isBoat,usesRod,equipmentName,purchaseTotal,shippingFee} from '@/lib/island-shop';
import {MARKET_SECTIONS,marketSection,type MarketSection} from '@/lib/island-market-layout';
import {fishValue,DRYING_SECONDS} from '@/lib/island-catch-work';
import {homeItemInfo,homeItem,HOME_TIERS,TIER_NAMES,TIER_CAPACITY,habitatArea,type HomeTier} from '@/lib/island-habitat-types';
const catalogName=(item:{id:string;name:string})=>{const h=homeItemInfo(item.id);return h?h.home==='birds'?'Bird aviary':'Sea animal home':item.name;};
export function IslandCoastalPanel({status,api}:{status:IslandStatus;api:IslandAPI|null}){
  const [name,setName]=useState('Coastal keeper'),[code,setCode]=useState(''),[message,setMessage]=useState('');
  const [prices,setPrices]=useState<Record<string,string>>({}),[section,setSection]=useState<MarketSection>('boats'),[query,setQuery]=useState(''),[tiers,setTiers]=useState<Record<string,HomeTier>>({});
  const c=status.coastal,panel=c?.panel,crew=status.crew;
  const district=MARKET_SECTIONS.find(s=>s.id===section)!;
  const products=SHOP_ITEMS.filter(i=>marketSection(i)===section&&(!homeItemInfo(i.id)||homeItemInfo(i.id)?.tier==='prime')&&`${i.name} ${i.description}`.toLowerCase().includes(query.trim().toLowerCase())).sort((a,b)=>catalogName(a).localeCompare(catalogName(b)));
  const basketCount=Object.values(status.shop.basket??{}).reduce((n,q)=>n+q,0),voyage=c?.deliveries.voyage;
  const say=(result:{message:string}|undefined)=>setMessage(result?.message??'Please wait for the island.');
  return <>
    <div className="coastal-shortcuts"><button disabled={status.dead} onClick={()=>api?.openCoastal('bag')}><Fish size={17}/>Catch bag <span>{c?.catches.fish.filter(f=>f.state!=='listed').length??0}</span></button><button onClick={()=>api?.openCoastal('crew')}><Users size={17}/>{crew?.connected?`Crew ${crew.players.length}/4`:'Play together'}</button>{status.market&&<button onClick={()=>api?.openCoastal('shop')}><Store size={17}/>Market directory</button>}</div>
    {(!!c?.deliveries.orders.length||voyage?.phase==='returning')&&!panel&&<aside className="coastal-order-note"><Package size={17}/><div><strong>{voyage?.phase==='returning'?'Returning to Market Island':'Coastal order'}</strong><p>{c?.deliveries.message}</p><small>{voyage&&['arriving','returning'].includes(voyage.phase)?`${Math.ceil(voyage.remaining)} seconds to berth`:`${c?.deliveries.orders.length} deliveries / builds remaining`}</small></div></aside>}
    {!panel?null:<div className="coastal-shade"><section className={`coastal-panel ${panel==='shop'?'coastal-catalog':''}`} role="dialog" aria-modal="true" aria-label={panel==='crew'?'Multiplayer crew':panel==='shop'?'Market directory':panel==='stall'?'Your market stall':panel==='rack'?'Drying rack':'Catch bag'}>
      <header><div><small>TIDE ISLAND</small><h2>{panel==='crew'?'Find your crew':panel==='shop'?'Saltwater Market':panel==='stall'?'Your fish & gear stall':panel==='rack'?'The drying rack':'Your catch bag'}</h2></div><button autoFocus aria-label="Close panel" onClick={()=>{api?.openCoastal(null);setMessage('');}}><X/></button></header>
      {panel==='crew'?<>
        <p>Share the islands with up to four players. See your crew walk, swim and fish. Your coins, pets, habitats, fish population and deliveries remain personal.</p>
        <label>Your nickname<input value={name} onChange={e=>setName(e.target.value)} maxLength={18}/></label>
        <div className="coastal-buttons"><button disabled={crew?.busy||!name.trim()} onClick={()=>void api?.joinCrew('match',name)}>Find players</button><button disabled={crew?.busy||!name.trim()} onClick={()=>void api?.joinCrew('create',name)}>Create private room</button></div>
        <form onSubmit={e=>{e.preventDefault();void api?.joinCrew('code',name,code);}} className="coastal-join"><label>Friend’s room code<input placeholder="8-character code" value={code} maxLength={8} onChange={e=>setCode(e.target.value.toUpperCase())}/></label><button disabled={crew?.busy||code.length!==8||!name.trim()}>Join room</button></form>
        {crew?.connected&&<div className="crew-room"><span>Invite code</span><strong>{crew.room}</strong><p>Send your friends this code and the game link.</p><ul>{crew.players.map(p=><li key={p.id}><i style={{background:['#5ed9c0','#e9bb69','#bca3ed','#e991ab'][p.slot]}}/>{p.name}{p.id===crew.self?' · you':''}</li>)}</ul><button onClick={()=>api?.leaveCrew()}>Leave crew · play solo</button></div>}
        <p role="status">{crew?.message}</p><small>No public chat or player-versus-player damage. A room code is an invitation, not a password; only share it with people you want to join. Connections expire after 45 seconds offline.</small>
      </>:panel==='shop'?<>
        <p>Follow the signed promenade to each specialist. Add supplies here, then pay Coral at the central checkout. Your order travels together on the coastal delivery boat.</p>
        <nav className="catalog-sections" aria-label="Shop sections">{MARKET_SECTIONS.map(k=><button key={k.id} aria-pressed={section===k.id} onClick={()=>{setSection(k.id);setQuery('');}}><span>{k.name}</span><small>{k.direction}</small></button>)}</nav>
        <div className="catalog-district"><div><small>{district.vendor} · {district.direction}</small><h3>{district.name}</h3></div><span>{basketCount} in basket · Pay Coral</span></div>
        <label className="catalog-search"><Search size={18}/><input aria-label="Search this shop section" placeholder="Search this section…" value={query} onChange={e=>setQuery(e.target.value)}/></label>
        <div className="coastal-products">{products.map(base=>{const h=homeItemInfo(base.id),tier=tiers[base.id]??'prime',item=h?SHOP_ITEMS.find(i=>i.id===homeItem(h.home,tier))!:base;return <article key={base.id}><div><small>{item.category}</small><h3>{h?h.home==='birds'?'Bird aviary':'Sea animal home':item.name}</h3></div>{h&&<label>Size & tier<select value={tier} onChange={e=>setTiers({...tiers,[base.id]:e.target.value as HomeTier})}>{HOME_TIERS.map(t=><option key={t} value={t}>{TIER_NAMES[t]} · {Math.round(habitatArea(h.home,t))} m² · {TIER_CAPACITY[h.home][t]} animals</option>)}</select></label>}<p>{item.description}</p><footer><div><strong>{purchaseTotal(item)} coins</strong><small>{shippingFee(item)?`Includes ${shippingFee(item)} shipping`:h?'Construction included':'No shipping fee'}</small></div><button onClick={()=>say(api?.catalogAdd(item.id))}>Add to basket</button></footer></article>;})}</div>
        {!products.length&&<p className="coastal-empty">No matches in {district.name}. Try another search or section.</p>}
        <small>Meandros licences: Finn’s physical spear display. Prices include delivery, before basket discounts. Four or more items in the same purchase category earn 10% off that category’s goods. Habitats are assembled at home.</small>
      </>:<>
        <p>{panel==='rack'?'Prepare a catch with the knife, then hang it here. A full 90-second dry adds 80% to its market value. Retrieving early keeps the partial bonus.':panel==='stall'?'Set your own prices. Visiting NPCs buy offers priced at or below 110% of market value; overpriced goods stay listed. One sale per visitor cycle.':'Catches stay in your hand until stowed. Equip the knife and press F to prepare a live fish. Sell catches at your physical stall on Market Island.'}</p>
        <div className="coastal-fish-list">{c?.catches.fish.map(f=><article key={f.id}><div><strong>{f.name}</strong><small>{f.item?'Equipment':`${f.weight.toFixed(1)} kg`} · {f.state} · value {fishValue(f)} coins</small></div>{f.state==='drying'&&<label>Drying {Math.round(f.drying/DRYING_SECONDS*100)}%<progress value={f.drying} max={DRYING_SECONDS}/></label>}<div className="coastal-buttons">
          {panel==='bag'&&!['drying','listed'].includes(f.state)&&<button onClick={()=>say(api?.catchAction(c.catches.held===f.id?'stow':'hold',f.id))}>{c.catches.held===f.id?'Stow fish':'Hold fish'}</button>}
          {panel==='rack'&&f.state==='dead'&&<button onClick={()=>say(api?.catchAction('hang',f.id))}>Hang on rack</button>}
          {panel==='rack'&&f.state==='drying'&&<button onClick={()=>say(api?.catchAction('retrieve',f.id))}>Retrieve · {fishValue(f)} value</button>}
          {panel==='stall'&&f.state!=='drying'&&<><label>Asking price<input aria-label={`Price for ${f.name}`} type="number" min={1} max={100000} step={1} value={prices[f.id]??String(f.state==='listed'?f.price:fishValue(f))} onChange={e=>setPrices({...prices,[f.id]:e.target.value})}/></label><button onClick={()=>say(api?.catchAction('list',f.id,Number(prices[f.id]??(f.state==='listed'?f.price:fishValue(f)))))}>{f.state==='listed'?'Update price':'List for sale'}</button>{f.state==='listed'&&<button onClick={()=>say(api?.catchAction('withdraw',f.id))}>Withdraw</button>}</>}
        </div></article>)}</div>
        {!c?.catches.fish.length&&<p className="coastal-empty">No catches yet. Cast from the shore, land a fish, and return here.</p>}
        {panel==='stall'&&<details><summary>Sell spare equipment</summary>{SHOP_ITEMS.filter(i=>status.shop.owned.includes(i.id)&&isCarriedItem(i.id)&&!i.consumable&&!usesRod(i.id)&&!isBoat(i.id)&&i.id!=='meandros-b32').map(i=><div className="coastal-gear-sale" key={i.id}><span>{i.name}</span><input aria-label={`Price for ${i.name}`} type="number" min={1} value={prices[i.id]??String(i.price)} onChange={e=>setPrices({...prices,[i.id]:e.target.value})}/><button onClick={()=>say(api?.listEquipment(i.id,Number(prices[i.id]??i.price)))}>List</button></div>)}<small>Unequip the item first. Listed equipment cannot be used until withdrawn.</small></details>}
        {panel==='stall'&&!!c?.catches.sales.length&&<details open><summary>Recent sales</summary>{c.catches.sales.map((s,i)=><p key={i}>{s.buyer} bought {s.name} · +{s.price} coins</p>)}</details>}
        <p role="status">{c?.catches.message}</p>
      </>}
      {message&&<p className="coastal-feedback" role="status">{message}</p>}
      {!!c?.deliveries.orders.length&&panel==='bag'&&<details><summary>Orders on their way</summary>{c.deliveries.orders.map(o=><p key={o.id}>{equipmentName(o.item)} × {o.quantity} · {o.state==='building'?`Building ${Math.round(o.elapsed/30*100)}%`:o.state}</p>)}</details>}
    </section></div>}
  </>;
}
