// Supplied boat pack. Lengths are display metres, independent of FBX export units.
export const NEW_BOATS = [
  { id: 'wood-boat-v2', name: 'Wooden skiff', model: 'Wood_BoatV2.fbx', price: 720, length: 4.8, paddle: 'rowing', detail: 'A timber skiff with a matching pair of wooden oars.' },
  { id: 'kayak-v1', name: 'Classic kayak', model: 'KayakV1.fbx', price: 380, length: 4.3, paddle: 'kayak', detail: 'A slim single-seat kayak with a double-ended paddle.' },
  { id: 'kayak-v2', name: 'Touring kayak', model: 'KayakV2.fbx', price: 520, length: 4.6, paddle: 'kayak', detail: 'A touring kayak with a raised seat and its own double-ended paddle.' },
  { id: 'fisher-boat', name: 'Fishing boat', model: 'Fisher_Boat.fbx', price: 1200, length: 5.8, paddle: null, detail: 'A dedicated fishing boat with a roomy open deck.' },
  { id: 'scout-boat', name: 'Scout boat', model: 'Scout_Boat.fbx', price: 1500, length: 6.5, paddle: null, detail: 'A tall-console scout boat for your fleet.' },
  { id: 'speed-boat', name: 'Speedboat', model: 'Speed_Boat.fbx', price: 1800, length: 6.5, paddle: null, detail: 'A streamlined speedboat with a low windscreen.' },
  { id: 'jetski-v1', name: 'Jet ski', model: 'JetskiV1.fbx', price: 950, length: 3.5, paddle: null, detail: 'A compact jet ski with a raised saddle and handlebars.' },
] as const;

export function boatSpec(id: string) { return NEW_BOATS.find(boat => boat.id === id); }
