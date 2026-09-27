import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as T from 'three';
import {FBXLoader} from 'three/examples/jsm/loaders/FBXLoader.js';
import {NEW_BOATS} from '../lib/island-boats';
import {loadIslandModel} from '../lib/island-models';
import {isCraftBoat} from '../lib/island-boat-craft';
import {ShopInventory,SHOP_ITEMS,isBoat,basketQuote,hotbarItems,shippingFee} from '../lib/island-shop';

// Parse the real geometry/UVs. The browser review also exercises image loading.
T.TextureLoader.prototype.load=function(url:string){
  assert(url.endsWith('PolyPackBoats.png'));
  assert(fs.existsSync('public/models/shop/PolyPackBoats.png'));
  return new T.Texture();
};
FBXLoader.prototype.loadAsync=async function(url:string){
  this.manager.itemStart(url);
  const bytes=fs.readFileSync(`public${url}`);
  const result=this.parse(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'/models/shop/');
  this.manager.itemEnd(url);return result;
};
for(const boat of NEW_BOATS){
  const model=await loadIslandModel(boat.id),size=new T.Box3().setFromObject(model).getSize(new T.Vector3());
  assert(size.toArray().every(n=>Number.isFinite(n)&&n>0));
  assert(Math.abs(Math.max(...size.toArray())-1)<.00001,'Consistent units');
  if(!isCraftBoat(boat.id)){
    const expected=boat.paddle==='rowing'?3:boat.paddle==='kayak'?2:1;
    assert.equal(model.children.length,expected,boat.name+' includes the correct paddle meshes');
    model.traverse(o=>{if(o instanceof T.Mesh){assert(o.geometry.getAttribute('uv'));assert((o.material as T.MeshStandardMaterial).map);}});
  }else{let vertices=0;model.traverse(o=>{if(o instanceof T.Mesh)vertices+=o.geometry.attributes.position.count;});assert(vertices>3000,'Detailed original motorboat geometry');}
  const clone=await loadIslandModel(boat.id);clone.position.x=99;assert.equal(model.position.x,0);
}
const boats=SHOP_ITEMS.filter(i=>i.category==='Boats');assert.equal(boats.length,10);
const inventory=new ShopInventory(),wallet={coins:30000};
for(const boat of boats){assert(isBoat(boat.id));assert(inventory.addToBasket(boat.id).ok);assert(!inventory.addToBasket(boat.id).ok);assert.equal(shippingFee(boat),Math.ceil(boat.price*.1));}
const quote=basketQuote(inventory.basket);assert.equal(quote.count,10);assert.equal(quote.discount,Math.floor(quote.subtotal*.1));
assert(inventory.checkout(wallet).ok);assert.equal(wallet.coins,30000-quote.total);
for(const boat of boats){assert(inventory.equip(boat.id).ok);assert(hotbarItems(inventory.snapshot()).includes(boat.id));assert(!inventory.addToBasket(boat.id).ok);}
assert(inventory.buy('net',wallet).ok);assert(inventory.equip('net').ok);assert.equal(inventory.hotbarPage,1);assert(inventory.equip('jetski-v1').ok);assert.equal(inventory.hotbarPage,0);
console.log('PASS: detailed motorboats and retained textured rowing/kayak models; independent clones; all 10 boats purchasable/equippable; shipping, discount, duplicate prevention and hotbar paging.');
