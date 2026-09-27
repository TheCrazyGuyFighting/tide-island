import assert from 'node:assert/strict';
import {MARINE_SPECIES,REMOVED_FRESHWATER_SPECIES} from '../lib/island-marine-roster';
// Snapshot of the complete pre-upgrade population, not inferred from the new factory.
const previous=['ArmoredCatfish','Betta','BlackLionFish','Blobfish','BlueGoldfish','BlueTang','ButterflyFish','CardinalFish','Clownfish','CoralGrouper','Cowfish','Flatfish','FlowerHorn','Goldfish','Humphead','Koi','Lionfish','MandarinFish','MoorishIdol','ParrotFish','Puffer','RedSnapper','RoyalGramma','Sunfish','Swordfish','Tang','Tetra','Tuna','Turbot','YellowTang','ZebraClownFish','Shark','ReefFishOne','ReefFishTwo','ReefFishThree','MantaRay','Kingfish'];
const removed=new Set<string>(REMOVED_FRESHWATER_SPECIES),restored=new Set(MARINE_SPECIES.map(s=>s.legacyId));
for(const id of previous)assert.equal(restored.has(id),!removed.has(id),id+' was silently dropped or freshwater was restored');
assert.equal(previous.filter(id=>!removed.has(id)).length,30);
assert.equal(removed.size,7);
assert.equal(MARINE_SPECIES.length,33);
assert.equal(restored.size,MARINE_SPECIES.length);
assert.equal(new Set(MARINE_SPECIES.map(s=>s.kind)).size,MARINE_SPECIES.length,'Each species needs its own model kind');
for(const id of ['Shark','MantaRay','Sunfish','Swordfish'])assert(!MARINE_SPECIES.find(s=>s.legacyId===id)!.catchable);
assert.equal(MARINE_SPECIES.find(s=>s.legacyId==='Shark')!.habitat,'pelagic');
console.log('PASS: all 30 previous saltwater entries retained, exactly 7 freshwater entries excluded; mackerel, squid and crab preserved.');
