import {RODS,SEAFOOD,BUNDLES,seafoodSpec,bundleSpec,expandedOrder,emptyStock,isFishingRod,type ExpansionStock} from './island-expansion-types';
import { NEW_BOATS, boatSpec } from './island-boats';
import { HOME_ITEMS, isPetHome } from './island-home-layout';
import {isOutfit,outfitName,type Outfit} from './island-outfit-types';
import {isFamilyItem,FAMILY_FURNITURE,FAMILY_STAGES,familyStage,type FamilyBrood} from './island-family-layout';
import {isSpeargun,LICENCE_FEE,type LicenceApplication} from './island-speargun-types';
import {HOME_TIERS,TIER_NAMES,TIER_PRICES,TIER_CAPACITY,homeItem,homeItemInfo,ownedTier,homeCapacity,SEA_BREEDING,seaBroodStage,type HomeTiers,type HomeExpansions,type SeaBrood} from './island-habitat-types';
import {HABITAT_TILE_PRICE,MAX_HABITAT_EXPANSION,expansionArea,type PetHome} from './island-habitat-types';
export { isPetHome } from './island-home-layout';

export type ShopCategory = 'Tackle' | 'Gear' | 'Boats' | 'Pets' | 'Pet care';
export const PETS = [
  {id:'pet-seagull',name:'Seagull',price:100},
  {id:'pet-white-pelican',name:'White pelican',price:180},
  {id:'pet-brown-pelican',name:'Brown pelican',price:180},
  {id:'pet-heron',name:'Heron',price:210},
  {id:'pet-great-egret',name:'Great egret',price:220},
  {id:'pet-snowy-egret',name:'Snowy egret',price:200},
  {id:'pet-osprey',name:'Osprey',price:300},
  {id:'pet-white-stork',name:'White stork',price:260},
  {id:'pet-sea-lion',name:'Sea lion',price:400},
  {id:'pet-dolphin',name:'Dolphin',price:550},
];
export function canonicalPetId(id:string) { const species=id.split('#')[0];return species==='pet-flying-seagull'?'pet-seagull':species; }
export function isPet(id:string) { return PETS.some(p=>p.id===canonicalPetId(id)); }
export function isPelican(id:string) { return ['pet-white-pelican','pet-brown-pelican'].includes(canonicalPetId(id)); }
export const MENHADEN_PACK=6;
export function isAquaticPet(id:string) { return ['pet-dolphin','pet-sea-lion'].includes(canonicalPetId(id)); }
export function isBoat(id:string) { return ['raft','boat','rowboat'].includes(id) || !!boatSpec(id); }
export type ShopItem = { id: string; name: string; price: number; category: ShopCategory; description: string; maker: string; requires?: string; consumable?:boolean };
export const SHOP_ITEMS: ShopItem[] = [
  {id:'knife',name:'Keeper’s fish knife',price:45,category:'Gear',maker:'Quaternius · your supplied model',description:'Hold a landed fish, equip this knife and press F to prepare it with a short, non-graphic animation. Prepared fish can be dried or sold.'},
  {id:'bow',name:'Coastal fishing bow',price:110,category:'Gear',maker:'Zsky · your supplied model',description:'Aim at a wild fish near the surface and press F. Arrows leave the fish struggling in the water. Equip your net to scoop it. Does not target pets or other players.'},
  {id:'drying-rack',name:'Fish drying rack',price:90,category:'Gear',maker:'Kenney · your supplied model',description:'Delivered by the coastal crew and installed beside the cabin. E at the rack hangs or retrieves prepared fish. Six hooks; 90 seconds of drying adds up to 80% sale value.'},
  ...RODS.map(r=>({id:r.id,name:r.name,price:r.price,category:'Tackle' as const,maker:'Your supplied rod models',description:`Level ${r.level} rod. Stronger line and faster reeling. Equip it or clip it onto the cabin rod rack with E.`})),
  ...SEAFOOD.map(f=>({id:f.id,name:f.name,price:f.price,category:'Pet care' as const,consumable:true,maker:'Isla’s seafood',description:`Six ${f.kind} portions. ${f.mode==='live'?'Dolphins and sea lions only. Pour into their home: animals pursue and catch them, improving their hunting skill.':f.mode==='frozen'?'Select the ice box and keep at least five ice blocks inside before serving. One block melts each day.':'Fresh-dead seafood. Serve to an owned sea animal at its home; no ice required.'}`})),
  {id:'trainer',name:'Professional marine trainer',price:240,category:'Pet care',description:'An autonomous marine keeper arrives at your sea home. Press E near him to assign a separate coin budget. He buys seafood and water from Isla, feeds animals, gives cues and rewards lessons. Pause him or reclaim unspent coins any time. Supplies and budget last for this visit.',maker:'Isla’s keeper service'},
  ...BUNDLES.map(b=>({id:b.id,name:b.name,price:b.price,description:b.description,category:'Pet care' as const,maker:'Saltwater Market'})),
  ...(['birds','sea'] as const).flatMap(home=>HOME_TIERS.filter(t=>t!=='prime').map(tier=>({id:homeItem(home,tier),name:`${TIER_NAMES[tier]} ${home==='birds'?'bird cage':'sea home'}`,price:TIER_PRICES[home][tier],category:'Pet care' as const,maker:'Tide Island',description:`${tier==='basic'?'Market-sized cage or clear seawater tank.':tier==='standard'?home==='birds'?'Medium cage with a T-stand.':'Medium seawater home with a sandy sea-lion beach.':home==='birds'?'Aviary 1.5× the Prime width and length, with perches and a bath.':'Coastal home 1.5× the Prime width and length, with a sandy shore and sunning rocks.'} Holds ${TIER_CAPACITY[home][tier]} ${home==='birds'?'adult birds':'sea animals'}. Upgrades replace the smaller home and keep your pets. Full listed price; installation included.`}))),
  {id:'meandros-b32',name:'Meandros B32 spear',price:420,category:'Gear',description:'Your supplied animated camouflage spear. Apply for the 50-coin Tide Island permit at this display before buying. Scuba and submersion required. F fires; the tether retrieves the spear and catch.',maker:'Your supplied Meandros B32 model'},
  {id:'family-aviary',name:'Family bird aviary',price:180,category:'Pet care',requires:'bird-home',description:'A smaller four-bird nesting home beside the cabin. Choose two adults of one species, add all three furniture pieces and stock 6 meals to raise two chicks. Grown birds join the main aviary.',maker:'Tide Island'},
  {id:'family-nest',name:'Nesting basket',price:60,category:'Pet care',requires:'family-aviary',description:'A cosy nest for the family aviary. Installed there after checkout; required for breeding.',maker:'Tide Island'},
  {id:'family-perch',name:'Family branch perch',price:35,category:'Pet care',requires:'family-aviary',description:'A low branch for parents and fledglings. Installed in the family aviary; required for breeding.',maker:'Tide Island'},
  {id:'family-feeder',name:'Feeder & birdbath',price:45,category:'Pet care',requires:'family-aviary',description:'A feeding table and water bowl for the family home. Stock 6 food-can portions or caught fish when starting a brood.',maker:'Tide Island'},
  { id: 'hook', name: 'Steel fish hook', price: 35, category: 'Tackle', description: 'Equip the supplied 3D hook on your fishing line.', maker: 'Poly by Google' },
  ...[45, 55, 65, 75, 85].map((price, i) => ({ id: `lure-${i + 1}`, name: `Reef lure ${['I', 'II', 'III', 'IV', 'V'][i]}`, price, category: 'Tackle' as const, description: 'A different look for your line. Equip one lure at a time.', maker: 'Quaternius' })),
  { id: 'net', name: 'Fishing net', price: 120, category: 'Gear', description: 'Press F or Scoop near a small fish to sweep it from the water. Reach: 3.8 m; near-surface fish only.', maker: 'Poly by Google' },
  { id: 'raft', name: 'Timber raft', price: 450, category: 'Boats', description: 'A slow, steady raft. Select it in your hotbar and press F at your home harbour to launch. Your first boat includes a free navigation chart.', maker: 'Quaternius' },
  { id: 'rowboat', name: 'Wooden rowboat', price: 600, category: 'Boats', description: 'Row across the sea with working oars. Select in your hotbar; F at your home harbour launches it. W/S throttle and reverse, A/D steer.', maker: 'Your supplied boat pack' },
  { id: 'boat', name: 'Coastal boat', price: 900, category: 'Boats', description: 'An 8.8-metre coastal cruiser with twin stern outboards, a sheltered helm and working propellers. F launches from your home harbour, M opens the free chart, and E steps ashore beside safe land.', maker: 'Tide Island · original hull' },
  ...NEW_BOATS.map(boat => ({ id: boat.id, name: boat.name, price: boat.price, category: 'Boats' as const, description: `${boat.detail} Select in your hotbar; F at your home harbour launches it. W/S throttle and reverse; A/D steer. First boat includes a free sea chart.`, maker: boat.paddle?'Your supplied boat pack':'Tide Island · original hull' })),
  { id: 'ice-box', name: 'Ice box', price: 180, category: 'Gear', description: 'Carry a cooler in your hand. Stored in your hotbar, not placed on the dock.', maker: 'Poly by Google' },
  { id: 'ice-block', name: 'Ice blocks', price: 25, category: 'Gear', description: 'One ice block loaded into your cooler. Buy at least five for frozen seafood. One block melts per day/night cycle.', maker: 'Quaternius', requires: 'ice-box',consumable:true },
  {id:'speargun',name:'Pelagic R07 speargun',price:320,category:'Gear',description:'Your animated carbon-and-teal speargun. Wear scuba gear and dive below the surface. Aim at a fish and press F; the tether retrieves your catch and the gun reloads automatically. Range: 12 m.',maker:'Your supplied Pelagic R07 pack'},
  {id:'waders',name:'Keeper’s chest waders',price:180,category:'Gear',description:'Waterproof waders keep your clothes dry up to 1.3 m deep. They do not let you swim or dive. Wear or remove on dry land; your hands stay free.',maker:'Tide Island'},
  {id:'scuba',name:'Scuba diving suit',price:480,category:'Gear',description:'Wetsuit, mask, air tanks and fins for diving and spearfishing. WASD swims, Space rises, C dives. Wear on dry land, then carry your speargun. Wetsuits are designed to get wet.',maker:'Tide Island'},
  {id:'snorkel',name:'Snorkeling suit',price:160,category:'Gear',description:'A bright surface-swimming suit with mask, snorkel and fins. Swim with WASD and look down to watch the reef. No deep diving or speargun use; choose scuba for that. Change on dry land.',maker:'Tide Island'},
  {id:'bird-glove',name:'Bird-handling glove',price:85,category:'Pet care',description:'A padded leather perch for one owned bird. Pair with the whistle, open the aviary gate, and call your selected bird onto your hand. F gently pets it.',maker:'Tide Island'},
  {id:'whistle',name:'Keeper’s whistle',price:40,category:'Pet care',requires:'bird-glove',description:'Hold the glove or whistle. G once calls your chosen bird; G twice less than 3 seconds apart sends it fishing. The bird eats its catch and returns to your glove. Open the aviary gate to take it out.',maker:'Tide Island'},
  ...PETS.map(p=>({...p,category:'Pets' as const,requires:HOME_ITEMS[isAquaticPet(p.id)?'sea':'birds'],maker:p.id==='pet-dolphin'?'Quaternius':p.id==='pet-white-stork'?'Gwym Hendawyr':'Poly by Google',description:isAquaticPet(p.id)?'Needs your purchased seawater habitat. Dolphins and sea lions share one home near the harbour.':`${p.id==='pet-seagull'?'One seagull, both supplied walking and flying models. ':''}Walks, flies and lands in your purchased shared bird aviary. Comes down to eat when fed.`})),
  {id:HOME_ITEMS.birds,name:'Prime bird aviary',price:250,category:'Pet care',description:'The original 12 × 10 m aviary, with flying space, three branch perches, a water bowl and an opening gate. Holds 24 adults. Installed near the cabin after checkout. Buy once; installation included.',maker:'Tide Island'},
  {id:HOME_ITEMS.sea,name:'Prime coastal sea home',price:600,category:'Pet care',description:'A 16 × 12 m coastal home for dolphins and sea lions, with a sloping sandy shore, sunning rocks, surrounding decks and a gated keeper platform. Holds 8 sea animals. Installed by the harbour after checkout. Buy once; installation included.',maker:'Tide Island'},
  {id:'menhaden',name:'Menhaden',price:24,category:'Pet care',consumable:true,description:'Six whole Menhaden for white and brown pelicans only. Equip from your hotbar, visit the bird home and press F to toss one down. Your pelican lowers its bill and gulps it. Other pets cannot eat these.',maker:'Tide Island'},
  {id:'food-can',name:'Pet food can',price:30,category:'Pet care',consumable:true,description:'Six fish-food portions. Rebuy to refill; customise your reusable can’s name, colour and stripe at the pet homes.',maker:'Tide Island'},
  {id:'seawater',name:'Seawater supply',price:20,category:'Pet care',consumable:true,description:'One seawater refresh for the shared dolphin and sea-lion habitat. Select it and press F at the habitat.',maker:'Tide Island'},
];
export const HOTBAR_KEYS = ['1','2','3','4','5','6','7','8','9','0','-'];
export const HOTBAR_CODES = ['Digit1','Digit2','Digit3','Digit4','Digit5','Digit6','Digit7','Digit8','Digit9','Digit0','Minus'];
export function usesRod(id: string) { return isFishingRod(id) || id === 'hook' || id.startsWith('lure-'); }
export function equipmentName(id: string) { const name=id==='hands'?'Empty hands':id === 'rod' ? 'Fishing rod · Level 1' : SHOP_ITEMS.find(i => i.id === canonicalPetId(id))?.name ?? 'Equipment';return id.includes('#')?`${name} · ${id.split('#')[1]}`:name; }
export function shippingFee(item: ShopItem) { return Math.ceil(item.price * (item.category === 'Boats' ? .1 : item.category === 'Pets' ? .15 : 0)); }
export function purchaseTotal(item: ShopItem) { return item.price + shippingFee(item); }
export type CanDesign={label:string;color:string;stripe:boolean};
export const CAN_COLORS=['#278c91','#e5a84a','#d96663','#6279bb','#719458','#be77a4'];
export const DEFAULT_CAN:CanDesign={label:'Fish feast',color:CAN_COLORS[0],stripe:true};
export type ShopSnapshot = {pending?:Record<string,number>;expansion?:ExpansionStock; homeTiers?:HomeTiers;homeExpansions?:HomeExpansions;seaBrood?:SeaBrood|null;raisedSea?:number;owned: string[];outfit?:Outfit; equippedLure: string | null; hookEquipped: boolean; activeItem: string; chartUnlocked?:boolean; petMeals?: Record<string,number>; hotbarPage?:number; basket?:Record<string,number>;menhaden?:number;foodPortions?:number;seawaterUses?:number;waterRefreshes?:number;canDesign?:CanDesign;petCounts?:Record<string,number>;familyBrood?:FamilyBrood|null;raisedBirds?:number;meandrosLicence?:boolean };
export const petCount=(s:ShopSnapshot,id:string)=>s.petCounts?.[canonicalPetId(id)]??Number(s.owned.includes(canonicalPetId(id)));
export function petRoster(s:ShopSnapshot){return s.owned.filter(isPet).flatMap(species=>Array.from({length:petCount(s,species)},(_,i)=>({id:i?`${species}#${i+1}`:species,species})));}
export const availableBirds=(s:ShopSnapshot)=>petRoster(s).filter(p=>!isAquaticPet(p.species)&&!s.familyBrood?.parents.includes(p.id));
export function requirementSatisfied(s:ShopSnapshot,id:string){return s.owned.includes(id)||!!s.basket?.[id]||Object.keys(s.basket??{}).some(key=>{const h=homeItemInfo(key);return h&&HOME_ITEMS[h.home]===id;});}
export const requirementName=(id:string)=>id===HOME_ITEMS.birds?'a bird home (any tier)':id===HOME_ITEMS.sea?'a sea home (any tier)':equipmentName(id);
export const repeatableItem=(item:ShopItem)=>!!item.consumable||isPet(item.id);
export const HOTBAR_PAGE_SIZE=10;
export function isCarriedItem(id:string){return id!=='drying-rack'&&id!=='trainer'&&!bundleSpec(id)&&!isPet(id)&&!isPetHome(id)&&!isFamilyItem(id);}
export function hotbarOwned(s:ShopSnapshot) {return s.owned.filter(id=>isCarriedItem(id)&&!s.expansion?.stored.includes(id));}
export function hotbarItems(s:ShopSnapshot) {return [s.expansion?.stored.includes('rod')?'hands':'rod',...hotbarOwned(s).slice((s.hotbarPage??0)*HOTBAR_PAGE_SIZE,((s.hotbarPage??0)+1)*HOTBAR_PAGE_SIZE)];}
export function basketQuote(basket:Record<string,number>={}) {
  const lines=SHOP_ITEMS.filter(i=>(basket[i.id]??0)>0).map(item=>({item,quantity:basket[item.id]}));
  const sections=([...new Set(lines.map(l=>l.item.category))]).map(category=>{
    const entries=lines.filter(l=>l.item.category===category),count=entries.reduce((n,l)=>n+l.quantity,0),subtotal=entries.reduce((n,l)=>n+l.quantity*l.item.price,0);
    return {category,count,subtotal,discount:count>=4?Math.floor(subtotal*.1):0};
  });
  const subtotal=sections.reduce((n,s)=>n+s.subtotal,0),discount=sections.reduce((n,s)=>n+s.discount,0),shipping=lines.reduce((n,l)=>n+shippingFee(l.item)*l.quantity,0);
  return {lines,sections,count:lines.reduce((n,l)=>n+l.quantity,0),subtotal,discount,shipping,total:subtotal-discount+shipping};
}
export type ShopResult = { ok: boolean; message: string };
export class ShopInventory {
  dispatch:((order:Record<string,number>)=>void)|null=null;
  pending:Record<string,number>={};
  receive(id:string,quantity:number){const count=Math.min(quantity,this.pending[id]??0);if(count<1)return;this.deliver(id,count);this.pending[id]-=count;if(!this.pending[id])delete this.pending[id];}
  private fulfill(order:Record<string,number>){if(!this.dispatch){for(const [id,n] of Object.entries(order))this.deliver(id,n);return;}const flat=expandedOrder(order);for(const [id,n] of Object.entries(flat))this.pending[id]=(this.pending[id]??0)+n;this.dispatch(flat);}
  expansion=emptyStock();
  owned = new Set<string>(); equippedLure: string | null = null; hookEquipped = false; activeItem = 'rod';
  petMeals:Record<string,number>={};
  homeTiers:HomeTiers={};homeExpansions:HomeExpansions={};seaBrood:SeaBrood|null=null;raisedSea=0;
  petCounts:Record<string,number>={};familyBrood:FamilyBrood|null=null;raisedBirds=0;meandrosLicence=false;
  basket:Record<string,number>={};menhaden=0;foodPortions=0;seawaterUses=0;waterRefreshes=0;canDesign:CanDesign={...DEFAULT_CAN};
  hotbarPage=0;
  outfit:Outfit='regular';
  private mergeSeagulls(){
    if(this.owned.delete('pet-flying-seagull'))this.owned.add('pet-seagull');
    if(this.petMeals['pet-flying-seagull']){this.petMeals['pet-seagull']=(this.petMeals['pet-seagull']??0)+this.petMeals['pet-flying-seagull'];delete this.petMeals['pet-flying-seagull'];}
    if(this.basket['pet-flying-seagull']){if(!this.owned.has('pet-seagull'))this.basket['pet-seagull']=1;delete this.basket['pet-flying-seagull'];}
    this.activeItem=canonicalPetId(this.activeItem);
  }
  snapshot(): ShopSnapshot { this.mergeSeagulls();return {pending:{...this.pending},expansion:{...this.expansion,seafood:{...this.expansion.seafood},skills:structuredClone(this.expansion.skills),stored:[...this.expansion.stored]},homeTiers:{...this.homeTiers},homeExpansions:{...this.homeExpansions},seaBrood:this.seaBrood?{...this.seaBrood,parents:[...this.seaBrood.parents]}:null,raisedSea:this.raisedSea, owned: [...this.owned],outfit:this.outfit, chartUnlocked:[...this.owned].some(isBoat), equippedLure: this.equippedLure, hookEquipped: this.hookEquipped, activeItem: this.activeItem, petMeals:{...this.petMeals},hotbarPage:this.hotbarPage,basket:{...this.basket},menhaden:this.menhaden,foodPortions:this.foodPortions,seawaterUses:this.seawaterUses,waterRefreshes:this.waterRefreshes,canDesign:{...this.canDesign},petCounts:{...this.petCounts},familyBrood:this.familyBrood?{...this.familyBrood,parents:[...this.familyBrood.parents]}:null,raisedBirds:this.raisedBirds,meandrosLicence:this.meandrosLicence }; }
  expandHabitat(home:PetHome,tiles:number,wallet:{coins:number}):ShopResult {
    if(home!=='birds'&&home!=='sea')return {ok:false,message:'Choose an animal habitat.'};
    if(!ownedTier(this.snapshot(),home))return {ok:false,message:'Buy this habitat before extending it.'};
    const current=expansionArea(this,home);
    if(!Number.isSafeInteger(tiles)||tiles<1)return {ok:false,message:'Choose a whole number of 1 × 1 m plots.'};
    if(tiles>MAX_HABITAT_EXPANSION[home]-current)return {ok:false,message:'There is not enough building space for that extension.'};
    const price=tiles*HABITAT_TILE_PRICE;
    if(!Number.isFinite(wallet.coins)||wallet.coins<price)return {ok:false,message:`You need ${Math.max(0,price-wallet.coins)} more coins.`};
    wallet.coins-=price;this.homeExpansions[home]=current+tiles;
    return {ok:true,message:`Habitat extended by ${tiles} m² · ${price} coins. Room for ${homeCapacity(this.snapshot(),home)} animals.`};
  }
  changePage(delta:number) {this.hotbarPage=Math.max(0,Math.min(Math.ceil(hotbarOwned(this.snapshot()).length/HOTBAR_PAGE_SIZE)-1,this.hotbarPage+delta));}
  addToBasket(id:string):ShopResult {
    this.mergeSeagulls();id=canonicalPetId(id);
    const item=SHOP_ITEMS.find(i=>i.id===id);if(!item)return {ok:false,message:'Item unavailable.'};
    if(this.pending[id]&&!repeatableItem(item))return {ok:false,message:'This item is already ordered. Meet the delivery crew at your harbour.'};
    if(id==='meandros-b32'&&!this.meandrosLicence)return {ok:false,message:'Apply for the in-game Meandros permit at this display first.'};
    const home=homeItemInfo(id);if(home&&Object.keys(this.pending).some(key=>homeItemInfo(key)?.home===home.home))return {ok:false,message:'This habitat is already under construction. Wait for the builders to finish before upgrading.'};if(home){const current=ownedTier(this.snapshot(),home.home);if(current&&HOME_TIERS.indexOf(current)>=HOME_TIERS.indexOf(home.tier))return {ok:false,message:'You already have this tier or a better home. Pets keep their current home.'};if(Object.keys(this.basket).some(key=>homeItemInfo(key)?.home===home.home))return {ok:false,message:'Choose one tier per home in an order. Remove the other tier at the cashier first.'};}
    if(!home&&!repeatableItem(item)&&(this.owned.has(id)||this.basket[id]))return {ok:false,message:this.owned.has(id)?'You already own this item.':'Already in your basket.'};
    if((this.basket[id]??0)>=20)return {ok:false,message:'Maximum 20 supplies per item in one order.'};
    this.basket[id]=(this.basket[id]??0)+1;return {ok:true,message:`${item.name} added. Pay at the cashier in the market square.`};
  }
  removeFromBasket(id:string){if(this.basket[id]>1)this.basket[id]--;else delete this.basket[id];}
  private deliver(id:string,quantity:number){const bundle=bundleSpec(id);if(bundle){for(const [part,n] of Object.entries(bundle.contents))this.deliver(part,n*quantity);this.owned.add(id);return;}const food=seafoodSpec(id);if(food)this.expansion.seafood[id]=(this.expansion.seafood[id]??0)+food.portions*quantity;if(id==='ice-block')this.expansion.iceBlocks+=quantity;const home=homeItemInfo(id);if(home){this.homeTiers[home.home]=home.tier;this.owned.add(HOME_ITEMS[home.home]);}if(isPet(id))this.petCounts[id]=(this.petCounts[id]??Number(this.owned.has(id)))+quantity;this.owned.add(id);if(id==='menhaden')this.menhaden+=MENHADEN_PACK*quantity;if(id==='food-can')this.foodPortions+=6*quantity;if(id==='seawater')this.seawaterUses+=quantity;}
  private petCapacity(order:Record<string,number>){order=Object.fromEntries([...new Set([...Object.keys(this.pending),...Object.keys(order)])].map(id=>[id,(this.pending[id]??0)+(order[id]??0)]));const s=this.snapshot();for(const id of Object.keys(order)){const h=homeItemInfo(id);if(h){s.homeTiers![h.home]=h.tier;s.owned.push(HOME_ITEMS[h.home]);}}for(const sea of [false,true]){const total=petRoster(s).filter(p=>isAquaticPet(p.species)===sea).length+Object.entries(order).filter(([id])=>isPet(id)&&isAquaticPet(id)===sea).reduce((n,[,q])=>n+q,0)+(!sea&&this.familyBrood?2:sea&&this.seaBrood?1:0);if(total>homeCapacity(s,sea?'sea':'birds'))return false;}return true;}
  private requirementMet(id:string,order:Record<string,number>={}){return this.owned.has(id)||!!order[id]||!!this.pending[id]||Object.keys({...this.pending,...order}).some(key=>{const h=homeItemInfo(key);return h&&HOME_ITEMS[h.home]===id;});}
  checkout(wallet:{coins:number}):ShopResult {
    this.mergeSeagulls();
    const quote=basketQuote(this.basket);if(!quote.count)return {ok:false,message:'Your basket is empty.'};
    const order=expandedOrder(this.basket);
    if(Object.keys(order).some(id=>this.pending[id]&&!repeatableItem(SHOP_ITEMS.find(i=>i.id===id)!)))return {ok:false,message:'An item in this basket is already on its way. Collect that delivery first.'};
    const expandedLines=Object.entries(order).map(([id,quantity])=>({item:SHOP_ITEMS.find(i=>i.id===id)!,quantity}));
    for(const {item,quantity} of expandedLines){
      const h=homeItemInfo(item.id),current=h?ownedTier(this.snapshot(),h.home):null;
      if(h&&(quantity!==1||current&&HOME_TIERS.indexOf(current)>=HOME_TIERS.indexOf(h.tier)||expandedLines.filter(l=>homeItemInfo(l.item.id)?.home===h.home).length>1))return {ok:false,message:'Select a single higher tier for each home. No coins were spent.'};
      if(!Number.isInteger(quantity)||quantity<1||quantity>20||!h&&!repeatableItem(item)&&(quantity>1||this.owned.has(item.id)))return {ok:false,message:'One of these items is already owned or unavailable.'};
      if(item.id==='meandros-b32'&&!this.meandrosLicence)return {ok:false,message:'A Meandros permit is required before checkout.'};
      if(item.requires&&!this.requirementMet(item.requires,order))return {ok:false,message:`${item.name} needs ${equipmentName(item.requires)}. Buy it first or add it to this order.`};
    }
    if(!this.petCapacity(order))return {ok:false,message:'This order exceeds your home’s capacity. Buy a larger tier or fewer pets. Growing babies have reserved spaces.'};
    if(wallet.coins<quote.total)return {ok:false,message:`You need ${quote.total-wallet.coins} more coins, including shipping and discounts.`};
    wallet.coins-=quote.total;this.fulfill(this.basket);this.basket={};this.changePage(0);
    if(this.dispatch)return {ok:true,message:'Order paid. Builders will assemble habitats; your coastal delivery boat is on its way. Meet the crew at the home harbour to collect items and bird cages.'};
    const boats=quote.lines.filter(l=>isBoat(l.item.id));
    // Reveal the purchased boat even when the hotbar already spans several pages.
    if(boats.length)this.equip(boats[boats.length-1].item.id);
    else if(quote.lines.some(l=>isSpeargun(l.item.id)))this.equip(quote.lines.find(l=>isSpeargun(l.item.id))!.item.id);
    else if(quote.lines.some(l=>l.item.id==='menhaden'))this.equip('menhaden');
    else if(expandedLines.some(l=>isFishingRod(l.item.id)))this.equip(expandedLines.find(l=>isFishingRod(l.item.id))!.item.id);
    return {ok:true,message:`Order delivered! ${quote.discount?`Saved ${quote.discount} coins. `:''}${boats.length?`${boats.map(l=>l.item.name).join(', ')} now owned. Use My boats or Launch & drive to board at your home harbour. `:''}${quote.lines.some(l=>isPetHome(l.item.id))?'Purchased homes are installed by the harbour. ':''}Pets move into their owned homes; equipment goes to your hotbar.`};
  }
  customiseCan(design:CanDesign):ShopResult {
    if(!this.owned.has('food-can'))return {ok:false,message:'Buy a food can first.'};
    const label=design.label.trim().replace(/[^\p{L}\p{N} !'-]/gu,'').slice(0,18);
    if(!label||!CAN_COLORS.includes(design.color))return {ok:false,message:'Choose a colour and a label of 1–18 letters or numbers.'};
    this.canDesign={label,color:design.color,stripe:!!design.stripe};return {ok:true,message:'Your can design is ready. It stays the same when you refill.'};
  }
  feedPet(id:string,food:{fishInBag:number},useCan:boolean):ShopResult {
    this.mergeSeagulls();
    if(!petRoster(this.snapshot()).some(p=>p.id===id))return {ok:false,message:'This pet has not moved in yet.'};
    if(this.familyBrood?.parents.includes(id))return {ok:false,message:'This parent is caring for chicks in the family aviary; its nursery meals are already stocked.'};
    if(!this.owned.has(HOME_ITEMS[isAquaticPet(id)?'sea':'birds']))return {ok:false,message:'Purchase the matching pet home first.'};
    if(useCan){if(this.foodPortions<1)return {ok:false,message:'Your can is empty. Buy a refill at Pet Care.'};this.foodPortions--;}
    else{if(food.fishInBag<1)return {ok:false,message:'Catch a fish, or select your pet food can.'};food.fishInBag--;}
    this.petMeals[id]=(this.petMeals[id]??0)+1;return {ok:true,message:`${equipmentName(id)} enjoyed its meal!`};
  }
  reserveMenhaden(id:string):ShopResult&{settle?:(eaten:boolean)=>void} {
    if(!isPelican(id))return {ok:false,message:'Menhaden are only for white and brown pelicans. No food was used.'};
    const s=this.snapshot();
    if(!petRoster(s).some(p=>p.id===id)||!this.owned.has(HOME_ITEMS.birds))return {ok:false,message:'Buy a pelican and its bird home from Isla first.'};
    if(this.familyBrood?.parents.includes(id))return {ok:false,message:'This parent is in the family aviary with its stocked meals. Choose a pelican in the main home.'};
    if(this.menhaden<1)return {ok:false,message:'No Menhaden left. Isla sells packs of six for 24 coins.'};
    this.menhaden--;let settled=false;
    return {ok:true,message:'Tossing one Menhaden for your pelican…',settle:eaten=>{
      if(settled)return;settled=true;
      if(eaten)this.petMeals[id]=(this.petMeals[id]??0)+1;else this.menhaden++;
    }};
  }
  refreshWater():ShopResult {if(!this.owned.has(HOME_ITEMS.sea))return {ok:false,message:'Purchase the seawater habitat first.'};if(this.seawaterUses<1)return {ok:false,message:'Buy seawater supplies from Pet Care first.'};this.seawaterUses--;this.waterRefreshes++;return {ok:true,message:'Shared seawater habitat refreshed!'};}
  feed(food:{fishInBag:number}):ShopResult {
    return this.feedPet(this.activeItem,food,false);
  }
  buy(id: string, wallet: { coins: number }): ShopResult {
    this.mergeSeagulls();id=canonicalPetId(id);
    const item = SHOP_ITEMS.find(i => i.id === id);
    if (!item) return { ok: false, message: 'This item is unavailable.' };
    if(bundleSpec(id)){const previous=this.basket;this.basket={[id]:1};const result=this.checkout(wallet);this.basket=previous;return result;}
    const h=homeItemInfo(id),current=h?ownedTier(this.snapshot(),h.home):null;
    if(h&&current&&HOME_TIERS.indexOf(current)>=HOME_TIERS.indexOf(h.tier))return {ok:false,message:'Your current home is this tier or better.'};
    if (!h&&this.owned.has(id)&&!repeatableItem(item)) return { ok: false, message: 'You already own this item.' };
    if(id==='meandros-b32'&&!this.meandrosLicence)return {ok:false,message:'Apply for your in-game Meandros permit first.'};
    if(!this.petCapacity({[id]:1}))return {ok:false,message:'Your pet homes are full.'};
    if (item.requires && !this.requirementMet(item.requires)) return { ok: false, message: `Buy ${equipmentName(item.requires)} before ${item.name}.` };
    const total = purchaseTotal(item), shipping = shippingFee(item);
    if (wallet.coins < total) return { ok: false, message: `You need ${total - wallet.coins} more coins${shipping ? ', including shipping' : ''}.` };
    wallet.coins -= total; this.fulfill({[id]:1});
    if(this.dispatch)return {ok:true,message:'Ordered. Meet the coastal delivery crew at your home harbour.'};
    this.changePage(0);if(isBoat(id)||id==='menhaden')this.equip(id);
    return { ok: true, message: isFamilyItem(id)?`${item.name} installed in the family aviary beside the cabin.`:isPetHome(id)?`${item.name} purchased. Installed by the harbour.`:isPet(id)?`${item.name} delivered to its shared home.`:`${item.name} delivered to your hotbar.${shipping ? ` ${shipping} coins shipping included.` : ''} Select it to equip.` };
  }
  equip(id: string): ShopResult {
    if(id==='trainer'||bundleSpec(id))return {ok:false,message:'This service or bundle is delivered to its proper location, not held.'};
    if(this.expansion.stored.includes(id))return {ok:false,message:'Retrieve this item from your cabin storage first.'};
    if(isFamilyItem(id))return {ok:false,message:'Family furniture and the nursery are installed beside the cabin, not carried.'};
    if(id==='meandros-b32'&&!this.meandrosLicence)return {ok:false,message:'Apply for the Meandros permit at Finn’s display.'};
    if(isPetHome(id))return {ok:false,message:'Pet homes are installed by the harbour, not carried in your hand.'};
    if(isPet(id))return {ok:false,message:'Your pets live at the shared homes near the harbour.'};
    if (id !== 'rod' && id!=='hands' && !this.owned.has(id)) return { ok: false, message: 'Purchase this item first.' };
    if(isOutfit(id)){this.outfit=this.outfit===id?'regular':id as Outfit;return {ok:true,message:`${outfitName(this.outfit)} worn. Your held tool stays equipped.`};}
    this.activeItem = id;
    if(usesRod(id)&&!isFishingRod(id)&&this.expansion.stored.includes(this.expansion.rod)){this.activeItem='hands';return {ok:false,message:'Retrieve your rod from the cabin before using tackle.'};}
    if(isFishingRod(id))this.expansion.rod=id;
    if(seafoodSpec(id))this.expansion.selectedSeafood=id;
    if(id!=='rod'&&id!=='hands')this.hotbarPage=Math.floor(hotbarOwned(this.snapshot()).indexOf(id)/HOTBAR_PAGE_SIZE);
    if (id.startsWith('lure-')) this.equippedLure = id;
    if (id === 'hook') this.hookEquipped = true;
    return { ok: true, message: `${equipmentName(id)} equipped.` };
  }
  stow(id:string):ShopResult {
    if(!isCarriedItem(id)||id==='hands'||id!=='rod'&&!this.owned.has(id))return {ok:false,message:'Hold a rod or piece of equipment first.'};
    if(this.expansion.stored.includes(id))return {ok:false,message:'Already stored.'};
    this.expansion.stored.push(id);if(this.activeItem===id||isFishingRod(id)&&this.expansion.rod===id&&usesRod(this.activeItem))this.activeItem='hands';if(this.outfit===id)this.outfit='regular';if(this.equippedLure===id)this.equippedLure=null;if(id==='hook')this.hookEquipped=false;this.changePage(0);return {ok:true,message:`${equipmentName(id)} stored in the cabin. E to retrieve.`};
  }
  retrieve(id:string):ShopResult {if(!this.expansion.stored.includes(id))return {ok:false,message:'That shelf is empty.'};this.expansion.stored=this.expansion.stored.filter(i=>i!==id);return this.equip(id);}
  selectSeafood(id:string):ShopResult {const spec=seafoodSpec(id);if(!spec)return {ok:false,message:'Choose fish, mini squid or crab.'};this.expansion.selectedSeafood=id;return {ok:true,message:`${spec.name} selected. ${spec.mode==='frozen'?'Hold the ice box with five ice blocks.':'Equip this food and pour at the sea home.'}`};}
  reserveSeafood(id:string,foodId:string):ShopResult&{settle?:(eaten:boolean)=>void}{
    const f=seafoodSpec(foodId);if(!f||!isAquaticPet(id)||!petRoster(this.snapshot()).some(p=>p.id===id)||!this.owned.has(HOME_ITEMS.sea))return {ok:false,message:'Seafood feeding needs an owned dolphin or sea lion and its sea home.'};
    if((this.expansion.seafood[foodId]??0)<1||this.expansion.stored.includes(foodId))return {ok:false,message:'No portions available. Buy supplies from Isla or retrieve them from the cabin.'};
    if(f.mode==='frozen'&&(this.activeItem!=='ice-box'||this.expansion.iceBlocks<5||this.expansion.stored.includes('ice-box')||this.expansion.stored.includes('ice-block')))return {ok:false,message:'Hold your ice box and carry at least five ice blocks to serve frozen food.'};
    if(f.mode!=='frozen'&&this.activeItem!==foodId)return {ok:false,message:'Equip the selected seafood first.'};
    this.expansion.seafood[foodId]--;let done=false;return {ok:true,message:f.mode==='live'?'Pouring live prey · watch the chase!':'Serving seafood…',settle:eaten=>{if(done)return;done=true;if(!eaten){this.expansion.seafood[foodId]++;return;}this.petMeals[id]=(this.petMeals[id]??0)+1;const s=this.expansion.skills[id]??={hunting:0,trust:0};s.hunting=Math.min(100,s.hunting+(f.mode==='live'?10:0));s.trust=Math.min(100,s.trust+2);}};
  }
  train(id:string):ShopResult {if(!this.owned.has('trainer')||!isAquaticPet(id)||!petRoster(this.snapshot()).some(p=>p.id===id))return {ok:false,message:'Hire Isla’s professional trainer and own a sea animal first.'};if(!['waders','scuba'].includes(this.outfit))return {ok:false,message:'Wear keeper’s chest waders or scuba to interact safely.'};const s=this.expansion.skills[id]??={hunting:0,trust:0};s.trust=Math.min(100,s.trust+10);return {ok:true,message:`${equipmentName(id)} completed target practice · trust ${s.trust}%.`};}
  applyLicence(a:LicenceApplication,wallet:{coins:number}):ShopResult{
    if(this.meandrosLicence)return {ok:true,message:'Your Tide Island Meandros permit is already valid.'};
    if(a.equipment!=='scuba'||a.targets!=='wild-fish'||a.agree!==true)return {ok:false,message:'Complete the game briefing: scuba underwater, wild fish only, and agree to protect pets.'};
    if(wallet.coins<LICENCE_FEE)return {ok:false,message:`The application costs ${LICENCE_FEE} coins.`};
    wallet.coins-=LICENCE_FEE;this.meandrosLicence=true;return {ok:true,message:'TIDE-M32 permit issued! You may now buy and use the Meandros spear. Valid for this game visit only.'};
  }
  startBrood(species:string,awayId:string|null,food:{fishInBag:number}):ShopResult{
    if(this.familyBrood)return {ok:false,message:'One family at a time. Let the current chicks grow first.'};
    if(!this.owned.has('family-aviary')||!this.owned.has('bird-home'))return {ok:false,message:'Buy the family aviary and main bird aviary first.'};
    if(FAMILY_FURNITURE.some(id=>!this.owned.has(id)))return {ok:false,message:'Install a nesting basket, branch perch, and feeder & birdbath first.'};
    const s=this.snapshot(),pair=availableBirds(s).filter(p=>p.species===species&&p.id!==awayId).slice(0,2);
    if(pair.length<2)return {ok:false,message:'You need two adult birds of the same species at home. Return any bird on your glove first.'};
    if(petRoster(s).filter(p=>!isAquaticPet(p.species)).length+2>homeCapacity(s,'birds'))return {ok:false,message:'Leave two spaces in your bird home for the chicks. Upgrade the home if needed.'};
    if(this.foodPortions+food.fishInBag<6)return {ok:false,message:'Stock 6 meals: food-can portions, caught fish, or a mix.'};
    const canned=Math.min(6,this.foodPortions);this.foodPortions-=canned;food.fishInBag-=6-canned;
    this.familyBrood={species,parents:[pair[0].id,pair[1].id],elapsed:0};return {ok:true,message:'Your pair moved into the family aviary. Two eggs are nesting; 6 meals stocked.'};
  }
  startSeaBrood(species:string,food:{fishInBag:number}):ShopResult{
    if(this.seaBrood)return {ok:false,message:'Your sea family is already raising a baby.'};
    const s=this.snapshot(),tier=ownedTier(s,'sea');if(!tier||tier==='basic')return {ok:false,message:'Sea breeding needs a Standard, Prime or Premium home.'};
    const pair=petRoster(s).filter(p=>p.species===species&&isAquaticPet(species)).slice(0,2);
    if(pair.length<2)return {ok:false,message:'Buy two adults of the same species: two dolphins or two sea lions.'};
    if(petRoster(s).filter(p=>isAquaticPet(p.species)).length+1>homeCapacity(s,'sea'))return {ok:false,message:'Keep one free space for the baby, or upgrade your sea home.'};
    if(this.foodPortions+food.fishInBag<SEA_BREEDING.meals||this.seawaterUses<1)return {ok:false,message:'Stock 8 meals and 1 seawater supply for the family.'};
    const canned=Math.min(SEA_BREEDING.meals,this.foodPortions);this.foodPortions-=canned;food.fishInBag-=SEA_BREEDING.meals-canned;this.seawaterUses--;this.seaBrood={species,parents:[pair[0].id,pair[1].id],elapsed:0};return {ok:true,message:'A sea family is starting! Food and fresh seawater stocked. Your baby will arrive soon.'};
  }
  updateSeaFamily(dt:number){if(!this.seaBrood)return false;const before=seaBroodStage(this.seaBrood);this.seaBrood.elapsed+=Math.max(0,Math.min(.05,dt));if(this.seaBrood.elapsed>=SEA_BREEDING.grown){this.deliver(this.seaBrood.species,1);this.raisedSea++;this.seaBrood=null;return true;}return before!==seaBroodStage(this.seaBrood);}
  updateFamily(dt:number){if(!this.familyBrood)return false;const before=familyStage(this.familyBrood);this.familyBrood.elapsed+=Math.max(0,Math.min(.05,dt));if(this.familyBrood.elapsed>=FAMILY_STAGES.moving){this.deliver(this.familyBrood.species,2);this.raisedBirds+=2;this.familyBrood=null;return true;}return before!==familyStage(this.familyBrood);}
}
