import { SHOP_ITEMS,requirementSatisfied,requirementName,basketQuote,petRoster,availableBirds,isAquaticPet,isPelican,purchaseTotal,type ShopSnapshot } from './island-shop';
import {FAMILY_FURNITURE} from './island-family-layout';
import {ownedTier,homeCapacity,homeItemInfo} from './island-habitat-types';
import { HOME_ITEMS } from './island-home-layout';
export type AdviceTopic='next'|'pets'|'discounts';
// A local, rule-based game agent: no external AI service or hidden purchase action.
export function cashierAdvice(s:ShopSnapshot,coins:number,topic:AdviceTopic) {
  const quote=basketQuote(s.basket),owned=s.owned,petCount=petRoster(s).length;
  if(topic==='discounts'){
    const eligible=quote.sections.filter(g=>g.count>=4);
    if(eligible.length)return `Your ${eligible.map(g=>g.category).join(' and ')} section qualifies: ${quote.discount} coins off goods. Shipping is separate. ${coins<quote.total?`You still need ${quote.total-coins} coins.`:'You can check out when ready.'}`;
    const closest=[...quote.sections].sort((a,b)=>b.count-a.count)[0];
    return closest?`${closest.category} has ${closest.count} item${closest.count===1?'':'s'}. Add ${4-closest.count} more from that same section for 10% off its goods. Items in other sections do not count; shipping is never discounted.`:'Four or more items from one section earn 10% off. Isla also offers pelican, sea-lion keeper, and chilled tackle bundles at the seafood terrace. Bundles include listed supplies and pet shipping; they cannot duplicate permanent items you already own.';
  }
  const missing=quote.lines.find(l=>l.item.requires&&!requirementSatisfied(s,l.item.requires));
  if(missing&&homeItemInfo(missing.item.requires!))return `${missing.item.name} needs ${requirementName(missing.item.requires!)}. Basic homes start at ${missing.item.requires==='bird-home'?60:150} coins; check their capacity before adding your pets. A matching home and pets can be paid for together.`;
  if(missing){const home=SHOP_ITEMS.find(i=>i.id===missing.item.requires)!;return `${missing.item.name} needs ${home.name}. Add it to this order or buy it first. ${home.name} costs ${purchaseTotal(home)} coins${home.category==='Pet care'?', including installation':''}. No coins will be taken until the order is valid.`;}
  if(topic==='pets'){
    if(owned.some(isAquaticPet)&&!owned.includes('trainer'))return 'Isla’s professional trainer costs 240 coins at the seafood terrace. It unlocks recall and target practice. Wear waders or scuba to interact. Live fish, mini squid and crabs improve hunting; frozen food needs a held cooler with five ice blocks.';
    if(!owned.includes(HOME_ITEMS.birds)&&!owned.includes(HOME_ITEMS.sea))return 'Pet homes are bought separately. Choose Basic, Standard, Prime or Premium at Isla’s home displays. Basic bird cages start at 60 coins; basic sea tanks at 150. Standard and higher sea homes support breeding. Installation is included. Add a home and its pets to the same order, or buy the home first. A food can holds six meals.';
    if(!petCount)return `Your ${owned.includes(HOME_ITEMS.birds)&&owned.includes(HOME_ITEMS.sea)?'two pet homes are':owned.includes(HOME_ITEMS.birds)?'bird aviary is':'seawater habitat is'} installed by the harbour. Choose a matching pet at Isla’s displays. Each home only needs to be bought once.`;
    if(owned.some(isPelican)&&(s.menhaden??0)<3)return 'Isla sells six Menhaden for 24 coins at the display beside her stall. Only white and brown pelicans eat them. Equip Menhaden, visit your bird home and press F to throw one down.';
    if((s.foodPortions??0)<3)return `You have ${petCount} pets and ${s.foodPortions??0} canned meals. I recommend a 30-coin food-can refill from Pet Care; each adds six meals. Caught fish also work.`;
    if(owned.some(isAquaticPet)&&(s.seawaterUses??0)===0)return 'Your sea pets share one home. I recommend a 20-coin seawater supply so you can refresh their habitat. You still have canned food for feeding.';
    if(ownedTier(s,'sea')==='basic'&&petRoster(s).filter(p=>isAquaticPet(p.species)).length>=2)return 'Your sea pair needs a Standard or larger home to breed. Upgrade at Isla’s sea-home displays, then stock 8 meals and 1 seawater supply at the care sign.';
    const birds=availableBirds(s),pair=birds.some(p=>birds.filter(b=>b.species===p.species).length>=2);
    if(pair&&birds.length+2>homeCapacity(s,'birds'))return 'Your bird home needs two free spaces for future chicks. Upgrade to a bigger tier before starting a family.';
    if(pair&&!owned.includes('family-aviary'))return 'You have a matching bird pair! Isla sells a smaller family aviary for 180 coins, installed beside the cabin. Add the nesting basket, branch perch and feeder to make it ready for chicks.';
    const furniture=FAMILY_FURNITURE.find(id=>!owned.includes(id));
    if(owned.includes('family-aviary')&&furniture)return `Your family aviary needs ${SHOP_ITEMS.find(i=>i.id===furniture)!.name}. Buy its furniture at Isla’s Pet Care displays, then stock six meals at the nursery sign to start nesting.`;
    return `Your ${petCount} pets share their purchased homes. You have ${s.foodPortions??0} canned meals and ${s.seawaterUses??0} seawater refreshes. Visit the feeding signs to care for them and customise your can.`;
  }
  if(quote.total>coins)return `Your order costs ${quote.total} coins after discounts and shipping, but you have ${coins}. Remove an item or catch more fish. I won’t add anything or spend coins for you.`;
  const candidateIds=petCount&&!owned.includes('food-can')?['food-can','seawater']:!owned.includes('net')?['net','hook','lure-1']:['food-can','ice-box','lure-2','pet-seagull'];
  const item=candidateIds.map(id=>SHOP_ITEMS.find(i=>i.id===id)!).find(i=>(i.consumable||!owned.includes(i.id))&&(!i.requires||requirementSatisfied(s,i.requires))&&!s.basket?.[i.id]&&purchaseTotal(i)<=coins-quote.total);
  return item?`With ${coins-quote.total} coins left after your basket, I recommend ${item.name} in ${item.category} (${purchaseTotal(item)} coins including shipping). ${item.id==='net'?'It lets you scoop small fish near the surface.':item.id==='food-can'?'It provides six meals and a reusable, customisable can.':'Walk to its display to inspect it before adding it.'}`:'Your basket fits your coins. I don’t have another affordable recommendation right now—save for the next catch.';
}
