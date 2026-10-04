import * as T from 'three';
import {CatchWork,type CatchWorkSnapshot} from './island-catch-work';
import {CoastalDeliveries} from './island-deliveries';
import {createCoastalWorld,RACK_POINT,STALL_POINT,CREW_POINT} from './island-coastal-world';
import {FishingBow} from './island-bow';
import {IslandMultiplayer} from './island-multiplayer';
import type {CrewState} from './crew-protocol';
import {homeItemInfo} from './island-habitat-types';
export type CoastalPanel='bag'|'rack'|'stall'|'shop'|'crew'|null;
type CoastalStatus={coastal?:{panel:CoastalPanel;catches:CatchWorkSnapshot;deliveries:ReturnType<CoastalDeliveries['snapshot']>;bow:string};crew?:CrewState};
type CoastalAPI={openCoastal:(panel:CoastalPanel)=>void;catchAction:(action:'hold'|'stow'|'hang'|'retrieve'|'list'|'withdraw',id:string,price?:number)=>ShopResult;listEquipment:(id:string,price:number)=>ShopResult;joinCrew:(mode:'match'|'create'|'code',name:string,code?:string)=>Promise<void>;leaveCrew:()=>void;catalogAdd:(id:string)=>ShopResult};
import {MarineTrainer,type TrainerSnapshot} from './island-trainer';
import {careInteraction,keepCareOpen} from './island-care-interaction';
import {buildDistantIslands} from './island-distant-world';
import {distantIslandAt} from './island-destinations';
import {advancementSnapshot,emptyAdvancements,type AdvancementSnapshot} from './island-advancements';
import {expansionArea} from './island-habitat-types';
import {createAtmosphere} from './island-atmosphere';
import {createWaterReflection} from './island-water-reflection';
import {landscapeWind,disposeNaturalTextures} from './island-natural-materials';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { buildLandscape, material, mesh } from './island-landscape';
import { CABIN, DOCK, clamp, groundHeight, waterHeight, walkingHeight } from './island-world';
import { IslandPhysics, createBody } from './island-physics';
import { FishingGame, castTarget, castRange, castArcHeight, castFlightPoint, CAST_DURATION, type FishAgent, type FishingPhase } from './island-fishing';
import {addMarinePopulation} from './island-marine-population';
import {IslandDay,type DaySnapshot} from './island-day-cycle';
import {SeaCareController} from './island-sea-care';
import {buildCabinInterior,cabinTarget} from './island-cabin-interior';
import {seafoodSpec,expandedOrder,isFishingRod,rodLevel} from './island-expansion-types';
import {MenhadenFeeding} from './island-menhaden-feeding';
import { createCatchAnimation } from './island-catch';
import {createCatchHook} from './island-hook';
import { ShopInventory, SHOP_ITEMS, HOTBAR_CODES, hotbarItems, usesRod, isPet, isBoat, isCarriedItem, equipmentName, type ShopSnapshot, type ShopResult } from './island-shop';
import { addReefAndKingfish, createShopWorld } from './island-shop-world';
import { createNetSplash } from './island-net';
import { addHomeFerry, buildMarket } from './island-market';
import { MARKET, HOME_FERRY, MARKET_RETURN, MARKET_SPOTS, MARKET_VENDORS, nearestMarketSpot, spotInReach, onMarket } from './island-market-layout';
import { CASHIER } from './island-market-layout';
import { addPetHomes } from './island-pet-homes';
import { nearHome,nearPetGate,insideBirdAviary,installedLayout,InstalledHomes,type PetHome } from './island-home-layout';
import { basketQuote,isAquaticPet,isPelican,petRoster,type CanDesign } from './island-shop';
import { cashierAdvice,type AdviceTopic } from './island-cashier';
import {buildRainforest} from './island-rainforest';
import {RAINFOREST,onRainforest} from './island-rainforest-layout';
import {homeLaunchVessel,stepVessel,safeDisembark,type VesselState} from './island-vessels';
import {makeSailingBoat} from './island-vessel-model';
import type {NavigationState} from '@/components/island-chart';
import {immersion,isOutfit,outfitName,safeDepth,waterSurface,canSwim,type Outfit} from './island-water';
import {createOutfitRig} from './island-outfits';
import {Spearfishing,type SpearStatus} from './island-spearfishing';
import {BirdCompanion,type BirdStatus} from './island-bird-companion';
import {isBirdTool,whistleAudio} from './island-bird-tools';
import {isSpeargun,type LicenceApplication} from './island-speargun-types';
import {availableBirds} from './island-shop';
import {nearFamily,familyStage} from './island-family-layout';
type FamilyAPI={startSeaBrood:(species:string)=>ShopResult;applyLicence:(a:LicenceApplication)=>ShopResult;startBrood:(species:string)=>ShopResult;closeFamily:()=>void;toggleFamilyGate:()=>ShopResult};
type CareAPI={togglePetGate:(home:PetHome)=>ShopResult;closeCashier:()=>void;closeCare:()=>void;removeBasket:(id:string)=>void;checkout:()=>Promise<ShopResult>;askCashier:(topic:AdviceTopic)=>void;customiseCan:(design:CanDesign)=>ShopResult;feedResident:(id:string)=>ShopResult;refreshHabitat:()=>ShopResult};

export type CameraMode = 'first' | 'third' | 'overview';
export type IslandStatus = CoastalStatus & {castAim?:{angle:number;range:number};trainer?:TrainerSnapshot;trainerBusy?:boolean;day?:DaySnapshot;storage?:boolean;seaCare?:{active:boolean;message:string};advancements?:AdvancementSnapshot;pelicanMeal?:{active:boolean;message:string};familyCare?:boolean;familyGateOpen?:boolean;bird:BirdStatus;water:{depth:number;submerged:boolean;swimming:boolean;outfit:Outfit};spear:SpearStatus; navigation:NavigationState;boatBusy:boolean;zone: string; heading: number; door: string; loading: number; assetError: string; locked: boolean; health: number; dead: boolean; notice: string; coins: number; catches: number; fishInBag:number; fishing: FishingPhase; fishingMessage: string; progress: number; tension: number; shop: ShopSnapshot; market:boolean; marketLoading:boolean; offer:string|null;cashier:boolean;care:PetHome|null;petGates:Record<PetHome,boolean>;advice:string };
export type IslandAPI = CoastalAPI & CareAPI & FamilyAPI & {fundTrainer:(amount:number)=>ShopResult;pauseTrainer:()=>void;resumeTrainer:()=>ShopResult;reclaimTrainer:()=>ShopResult;selectSeafood:(id:string)=>ShopResult;serveSeafood:(pet:string)=>ShopResult;seaCommand:(pet:string,command:'lesson'|'recall'|'pet')=>ShopResult;storeItem:(id:string)=>ShopResult;retrieveItem:(id:string)=>ShopResult;closeStorage:()=>void;expandHabitat:(home:PetHome,tiles:number)=>ShopResult;whistle:()=>void;petBird:()=>void;selectBird:(id:string)=>void;returnBird:()=>void;launchBoat:(id:string)=>Promise<void>;boatAction:()=>Promise<void>;toggleChart:()=>void; setView: (mode: CameraMode) => void; setNight: (night: boolean) => void; setMist: (mist: boolean) => void; setDrift: (drift: boolean) => void; reset: () => void; interact: () => void; jump: () => void; fish: () => void; reel: (down: boolean) => void; cancelCast: () => void; setMove: (key: string, down: boolean) => void; travelMarket: () => boolean; closeOffer:()=>void; buy: (id: string) => Promise<ShopResult>; equip: (id: string) => ShopResult; hotbarPage:(delta:number)=>void; dispose: () => void };

export function createIsland(host: HTMLDivElement, report: (s: IslandStatus) => void): IslandAPI {
  const lowPower = host.clientWidth < 700;
  const renderer = new T.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, lowPower ? 1.5 : 1.75));
  renderer.setSize(host.clientWidth, host.clientHeight); renderer.outputColorSpace = T.SRGBColorSpace;
  renderer.toneMapping = T.ACESFilmicToneMapping; renderer.toneMappingExposure = .92;
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = T.PCFShadowMap;
  renderer.domElement.setAttribute('aria-label', 'Explore Tide Island in 3D'); renderer.domElement.tabIndex = 0; host.appendChild(renderer.domElement);
  const scene = new T.Scene(); scene.background = new T.Color('#a9c4d8'); scene.fog = new T.FogExp2('#b4c8d4', 0.0018);
  const camera = new T.PerspectiveCamera(64, host.clientWidth / host.clientHeight, 0.06, 14000);
  const ambient = new T.HemisphereLight('#c3d5e0', '#494a37', .7); scene.add(ambient);
  const sun = new T.DirectionalLight('#fff2d9', 2.8); sun.position.set(-80, 105, 50); sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048); Object.assign(sun.shadow.camera, { left: -48, right: 48, top: 48, bottom: -48, near: 1, far: 310 }); sun.shadow.normalBias = 0.035; sun.shadow.bias = -0.0002; scene.add(sun);scene.add(sun.target);
  const atmosphere=createAtmosphere(scene,renderer),sky=atmosphere.sky;
  const world = buildLandscape(scene, lowPower);
  const seaReflection=createWaterReflection(renderer,scene,world.waterSurfaces,lowPower);world.uniforms.uReflection.value=seaReflection.texture;world.uniforms.uReflectionMatrix.value=seaReflection.matrix;
  const rainforest=buildRainforest(scene,lowPower);world.colliders.push(...rainforest.colliders);
  const distantWorld=buildDistantIslands(scene,lowPower);world.colliders.push(...distantWorld.colliders);
  const discovered=new Set<string>(),awarded=new Set<string>();
  const builtHomes=new InstalledHomes();
  const physics = new IslandPhysics(world.colliders,(x,z)=>walkingHeight(x,z,builtHomes)), body = createBody();
  const petHomes=addPetHomes(scene,physics,()=>disposed,builtHomes);
  const fishAgents: FishAgent[] = [], fishing = new FishingGame(fishAgents);
  const inventory = new ShopInventory();
  const catchWork=new CatchWork(),deliveries=new CoastalDeliveries(inventory);
  inventory.dispatch=order=>deliveries.order(order);
  fishing.onLand=f=>catchWork.add(f);
  const bow=new FishingBow(fishAgents,p=>world.colliders.some(c=>c.enabled!==false&&Math.abs(p.y-c.y)<c.ry&&Math.abs(p.x-c.x)<c.rx&&Math.abs(p.z-c.z)<c.rz));
  let coastPanel:CoastalPanel=null;
  const closeCoast=()=>{coastPanel=null;};
  const day=new IslandDay(),cabinInterior=buildCabinInterior(scene,physics),seaCare=new SeaCareController(scene);
  const trainer=new MarineTrainer(scene,inventory,petHomes);
  const companion=new BirdCompanion(petHomes,fishAgents,world.colliders,id=>{inventory.petMeals[id]=(inventory.petMeals[id]??0)+1;reportShop();}),whistleSound=whistleAudio();
  const spear=new Spearfishing(fishAgents,p=>world.colliders.some(c=>c.enabled!==false&&Math.abs(p.y-c.y)<c.ry&&Math.abs(p.x-c.x)<c.rx&&Math.abs(p.z-c.z)<c.rz),f=>fishing.claimSpearCatch(f));
  let vessel:VesselState|null=null,sailing:Awaited<ReturnType<typeof makeSailingBoat>>|null=null,launching=false,chartOpen=false;
  const vesselModels=new Map<string,Awaited<ReturnType<typeof makeSailingBoat>>>();
  let inMarket=false, market:ReturnType<typeof buildMarket>|undefined;
  let homeReturn={x:body.x,y:body.y,z:body.z,yaw:-.73,pitch:-.03};
  addHomeFerry(scene);
  const controls = new OrbitControls(camera, renderer.domElement); controls.enableDamping = true; controls.dampingFactor = .06; controls.enablePan = false;
  controls.minDistance = 45; controls.maxDistance = 310; controls.maxPolarAngle = Math.PI * .46; controls.autoRotateSpeed = .22; controls.enabled = false;

  const player = new T.Group(); scene.add(player); player.position.set(body.x, body.y, body.z);
  const skin = material('#d5a07b'), jersey = material('#e4ece7'), navy = material('#24313b'), accent = material('#80ba4f');
  mesh(player, new T.CapsuleGeometry(.25, .42, 4, 8), jersey, 0, 1.04, 0);
  mesh(player, new T.BoxGeometry(.43, .13, .31), accent, 0, 1.11, -.05);
  mesh(player, new T.SphereGeometry(.18, 12, 8), skin, 0, 1.56, 0);
  const cap = mesh(player, new T.SphereGeometry(.195, 10, 6), jersey, 0, 1.66, 0); cap.scale.y = .5;
  mesh(player, new T.BoxGeometry(.3, .025, .18), jersey, 0, 1.65, -.18);
  const legs: T.Object3D[] = [];
  for (const side of [-1, 1]) {
    const leg = new T.Group(); leg.position.set(side * .13, .77, 0); player.add(leg); legs.push(leg);
    mesh(leg, new T.CapsuleGeometry(.11, .47, 4, 6), navy, 0, -.34, 0);
    mesh(leg, new T.BoxGeometry(.2, .12, .32), navy, 0, -.7, -.08);
    const arm = mesh(player, new T.CapsuleGeometry(.09, .42, 4, 6), navy, side * .33, 1.02, -.05); arm.rotation.z = side * .15;
    mesh(player, new T.SphereGeometry(.09, 8, 6), skin, side * .36, .72, -.09);
  }
  const outfitRig=createOutfitRig(player,legs);outfitRig.set('regular');
  const equipmentScene = new T.Scene(); equipmentScene.add(new T.HemisphereLight('#edfbff', '#a5a499', 2.7));
  const equipmentSun = new T.DirectionalLight('#fff3d4', 2); equipmentSun.position.set(-2, 3, 2); equipmentScene.add(equipmentSun);
  const equipmentCamera = new T.PerspectiveCamera(64, camera.aspect, .01, 15); equipmentScene.add(equipmentCamera);
  const handRig = new T.Group(); equipmentCamera.add(handRig);
  const sleeve = mesh(handRig, new T.CapsuleGeometry(.075, .33, 4, 8), navy, .39, -.46, -.44); sleeve.rotation.x = -.85; sleeve.rotation.z = -.25;
  mesh(handRig, new T.CylinderGeometry(.081, .081, .055, 10), jersey, .35, -.31, -.59).rotation.x = -.85;
  const palm = mesh(handRig, new T.SphereGeometry(.081, 10, 8), skin, .35, -.28, -.63); palm.scale.set(1, 1.22, .83);
  for (let i = 0; i < 4; i++) mesh(handRig, new T.CapsuleGeometry(.016, .065, 3, 6), skin, .309 + i * .021, -.26, -.67).rotation.x = .4;

  let view: CameraMode = 'first', night = false, mist = true, drift = false, doorOpen = false, disposed = false;
  let doorPivot: T.Group | null = null, boat: T.Group | null = null;
  const thirdRodMount = new T.Group(); thirdRodMount.position.set(.36, .75, -.1); player.add(thirdRodMount);
  const animations: { update: (dt: number, time: number) => void }[] = [];
  addMarinePopulation(scene,lowPower,f=>fishAgents.push(f),animations);
  const status: IslandStatus = {advancements:emptyAdvancements(),bird:companion.snapshot(),water:{depth:0,submerged:false,swimming:false,outfit:'regular'},spear:spear.snapshot(), navigation:{x:body.x,z:body.z,heading:42,open:false,aboard:null,speed:0,rainforest:false},boatBusy:false,zone: 'Harbour beach', heading: 0, door: '', loading: 0, assetError: '', locked: false, health: 100, dead: false, notice: '', coins: 250, catches: 0, fishInBag:0, fishing: 'idle', fishingMessage: fishing.message, progress: 0, tension: .2, shop: inventory.snapshot(),market:false,marketLoading:false,offer:null,cashier:false,care:null,petGates:{birds:false,sea:false},advice:'' };
  let yaw = -.73, pitch = -.03, time = 0, last = performance.now(), frame = 0, lastReport = 0;
  let lastManualLook=-10;
  const velocity = new T.Vector2(), desired = new T.Vector2(), keys = new Set<string>();
  const lookTarget = new T.Vector3(), thirdTarget = new T.Vector3();
  let reelHeld = false;
  const multiplayer=new IslandMultiplayer(scene,()=>({x:body.x,y:body.y,z:body.z,yaw,outfit:inventory.outfit,action:catchWork.holding?'caught':fishing.active?'fishing':bow.active?'bow':catchWork.preparing?'knife':velocity.length()>.2?'walking':'idle',boat:vessel?.aboard?vessel.id:null}));
  const coastalWorld=createCoastalWorld(scene,equipmentCamera,thirdRodMount,physics,catchWork,deliveries,inventory,bow,()=>disposed);
  const syncCoast=()=>{status.coastal={panel:coastPanel,catches:catchWork.snapshot(),deliveries:deliveries.snapshot(),bow:bow.message};status.crew=multiplayer.snapshot();};
  const openCoastal=(panel:CoastalPanel)=>{if(fishing.active||spear.active||body.dead||day.exhausted)return;if(panel==='rack'&&(!inventory.owned.has('drying-rack')||Math.hypot(body.x-RACK_POINT.x,body.z-RACK_POINT.z)>4))return;if(panel==='stall'&&(!inMarket||Math.hypot(body.x-STALL_POINT.x,body.z-STALL_POINT.z)>4))return;if(panel==='shop'&&!inMarket)return;coastPanel=panel;clearInput();if(panel&&document.pointerLockElement===renderer.domElement)document.exitPointerLock();syncCoast();report({...status});};
  const float = new T.Group(); scene.add(float); float.visible = false;
  mesh(float, new T.SphereGeometry(.085, 10, 8), material('#fff4d1'), 0, .035, 0);
  mesh(float, new T.CylinderGeometry(.035, .045, .18, 8), material('#e76842'), 0, .12, 0);
  const ripple = mesh(float, new T.RingGeometry(.22, .25, 32), new T.MeshBasicMaterial({ color: '#ecffe5', transparent: true, opacity: .6, side: T.DoubleSide }), 0, .01, 0); ripple.rotation.x = -Math.PI / 2;
  const lineGeometry = new T.BufferGeometry(); lineGeometry.setAttribute('position', new T.Float32BufferAttribute(new Float32Array(33 * 3), 3));
  const fishingLine = new T.Line(lineGeometry, new T.LineBasicMaterial({ color: '#fff4d0', transparent: true, opacity: .85 })); fishingLine.frustumCulled = false; fishingLine.visible = false; scene.add(fishingLine);
  const leaderGeometry=new T.BufferGeometry().setAttribute('position',new T.Float32BufferAttribute(new Float32Array(6),3));
  const hookLeader=new T.Line(leaderGeometry,new T.LineBasicMaterial({color:'#eaf6ec',transparent:true,opacity:.7}));
  hookLeader.name='float-to-hook-leader';hookLeader.frustumCulled=false;hookLeader.visible=false;scene.add(hookLeader);
  const lineStart = new T.Vector3(), lineEnd = new T.Vector3(), castOrigin = new T.Vector3();
  const catchAnimation = createCatchAnimation(scene);
  const catchHook=createCatchHook(scene);
  const netSplash=createNetSplash(scene),birdSplash=createNetSplash(scene),netDestination=new T.Vector3();let feedingUntil=0;
  let checkoutBusy=false;
  const shopWorld = createShopWorld(handRig, thirdRodMount, float);
  const menhadenMeal=new MenhadenFeeding(scene);
  const spearHand=new T.Vector3(),spearDirection=new T.Vector3();
  const glovePoint=new T.Vector3(),petHand=new T.Group();equipmentCamera.add(petHand);petHand.visible=false;
  mesh(petHand,new T.CapsuleGeometry(.067,.15,4,8),skin,0,0,0).rotation.x=Math.PI/2;for(let i=0;i<4;i++)mesh(petHand,new T.CapsuleGeometry(.015,.08,3,6),skin,-.045+i*.03,0,-.14).rotation.x=Math.PI/2;
  const spearLine=new T.Line(new T.BufferGeometry().setFromPoints([new T.Vector3(),new T.Vector3()]),new T.LineBasicMaterial({color:'#c6f0dc',transparent:true,opacity:.7}));spearLine.frustumCulled=false;spearLine.visible=false;scene.add(spearLine);
  const projectile=new T.Group();scene.add(projectile);projectile.visible=false;
  mesh(projectile,new T.CylinderGeometry(.012,.012,.9,6).rotateX(Math.PI/2),material('#b9d6db',.3),0,0,0);
  mesh(projectile,new T.ConeGeometry(.035,.14,6).rotateX(-Math.PI/2),material('#d5eef0',.3),0,0,-.50);
  const reportShop = () => { syncCoast();status.trainer=trainer.snapshot();status.trainerBusy=trainer.busy;status.day=day.snapshot();status.seaCare={active:seaCare.active,message:seaCare.active?seaCare.message:''};cabinInterior.sync(inventory.snapshot(),shopWorld.rackRod);status.pelicanMeal={active:menhadenMeal.active,message:menhadenMeal.active?menhadenMeal.message:''};status.coins = fishing.coins;status.fishInBag=fishing.fishInBag;status.fishingMessage=fishing.message; status.shop = inventory.snapshot();status.bird=companion.snapshot();outfitRig.set(inventory.outfit);jersey.color.set(inventory.outfit==='scuba'?'#132c38':inventory.outfit==='snorkel'?'#1eb4ba':'#e4ece7');accent.color.set(inventory.outfit==='scuba'?'#13a6ad':inventory.outfit==='snorkel'?'#f3a142':'#80ba4f');petHomes.apply(status.shop); report({ ...status }); };
  const changeHotbarPage=(delta:number)=>{if(!fishing.active&&!body.dead&&!day.exhausted&&!seaCare.active){inventory.changePage(delta);reportShop();}};
  const actionHint=(id:string)=>seafoodSpec(id)?'Visit your sea home · F pours selected seafood for a dolphin or sea lion':id==='ice-box'?'Hold the cooler with at least 5 ice blocks · choose frozen food at the sea home':isSpeargun(id)?'Wear scuba, dive below the surface, aim at a wild fish · F to fire':isBoat(id)?'Go to the end of your home harbour · F to launch & board · M for your sea chart':usesRod(id)?'Face the water · F to cast':id==='net'?'Face a nearby small fish · F to scoop':id==='menhaden'?'Pelican food · F at your bird home tosses 1 Menhaden':id==='food-can'?'Visit a pet home · F feeds a resident':id==='seawater'?'Visit the seawater home · F refreshes water':`${equipmentName(id)} in hand · select slot 1 to fish.`;
  const equip = (id:string):ShopResult => {
    if(catchWork.preparing||bow.active)return {ok:false,message:'Finish the tool animation first.'};
    if(day.exhausted||day.sleeping>0)return {ok:false,message:'Resting or out of energy.'};
    if(seaCare.active)return {ok:false,message:'Let the sea animal finish first.'};
    if(menhadenMeal.active)return {ok:false,message:'Let your pelican finish its Menhaden first.'};
    if(vessel?.aboard)return {ok:false,message:'Land and step ashore before changing equipment.'};
    if(disposed||body.dead)return {ok:false,message:'Equipment unavailable right now.'};
    if(fishing.active||spear.active)return {ok:false,message:'Finish your cast or let the speargun reload before switching equipment.'};
    if(isOutfit(id)&&(!body.grounded||immersion(body.x,body.y,body.z)>.1)){announce('Change outfits on dry land first.');return {ok:false,message:'Change outfits on dry land first.'};}
    if(companion.away&&!isBirdTool(id)&&!isOutfit(id)){announce('Return your bird through the aviary gate before putting the glove away.');return {ok:false,message:'Return your bird home first.'};}
    if(id==='drying-rack')return {ok:false,message:'Your rack is installed beside the cabin. Press E there.'};
    const result=inventory.equip(id);
    if(result.ok){shopWorld.apply(inventory.snapshot());shopWorld.update(time,false);reelHeld=false;keys.delete('r');fishing.message=actionHint(id);status.fishingMessage=fishing.message;}
    if(result.ok&&isOutfit(id))announce(result.message);
    reportShop();return result;
  };
  const jump = () => { if (!coastPanel&&!status.care&&!status.familyCare&&!status.storage&&!day.exhausted&&!day.sleeping&&!seaCare.active&&view !== 'overview' && !menhadenMeal.active&&!fishing.active&&!spear.active&&!vessel?.aboard&&!(canSwim(inventory.outfit)&&immersion(body.x,body.y,body.z)>.8)) physics.jump(body); };
  const birdGateNearby=()=>{const p=petHomes.passage().outside;return Math.hypot(body.x-p.x,body.z-p.z)<4.5;};
  const birdAllowed=()=>!body.dead&&!inMarket&&!vessel?.aboard&&!fishing.active&&!spear.active&&view!=='overview'&&isBirdTool(inventory.activeItem)&&immersion(body.x,body.y,body.z)<.5;
  const birdGateOpen=()=>petHomes.gates.birds.ready;
  const insideAviary=()=>petHomes.installed('birds')&&insideBirdAviary(body.x,body.y,body.z,builtHomes);
  function birdBlocker(){
    if(!inventory.owned.has('bird-glove'))return 'Missing bird-handling glove. Buy it from Isla and pay at the cashier.';
    if(!inventory.owned.has('whistle'))return 'Missing Keeper’s whistle. Buy it from Isla and pay at the cashier.';
    if(![...inventory.owned].some(id=>isPet(id)&&!isAquaticPet(id)))return 'No bird owned yet. Pay for a bird and its shared aviary at the market cashier.';
    if(!availableBirds(inventory.snapshot()).length)return 'Your birds are caring for chicks in the family aviary. Call them after the young birds grow up.';
    if(!petHomes.installed('birds'))return 'Your bird needs the shared aviary. Buy it at Pet Care and pay at the cashier.';
    if(!birdAllowed())return inMarket?'Return to Tide Island to call your bird.':!isBirdTool(inventory.activeItem)?'Equip your glove or whistle from the hotbar.':'Stand on dry land or the aviary deck to call your bird.';
    if(companion.phase==='home'&&!insideAviary()){
      if(!birdGateNearby())return 'Move to the aviary entrance, or step inside the aviary, to call your bird.';
      const gate=petHomes.gates.birds;
      if(!gate.open)return 'Aviary gate is closed. Press E beside the entrance to open it, then whistle.';
      if(gate.paused)return 'The gate is blocked by your player. Step back from the swinging door, then whistle.';
      if(!gate.ready)return 'The gate is still opening. Whistle once it is fully open.';
    }
    return null;
  }
  const whistle=()=>{status.care=null;status.familyCare=false;const blocker=birdBlocker();if(blocker){announce(blocker);}else if(companion.whistle(birdOwned(),birdGateOpen(),birdGateNearby(),insideAviary()))whistleSound.blow();status.bird={...companion.snapshot(),blocker};report({...status});};
  const petBird=()=>{if(birdAllowed()){companion.pet();status.bird=companion.snapshot();report({...status});}};
  const familyAllowed=()=>inventory.owned.has('family-aviary')&&!inMarket&&!body.dead&&!fishing.active&&!spear.active&&view!=='overview'&&nearFamily(body.x,body.z);
  const birdOwned=()=>[...[...inventory.owned].filter(id=>!isPet(id)),...availableBirds(inventory.snapshot()).map(p=>p.id)];
  const careAllowed=(home:PetHome)=>!day.exhausted&&!day.sleeping&&petHomes.installed(home)&&!inMarket&&!body.dead&&!fishing.active&&!spear.active&&!vessel?.aboard&&view!=='overview'&&(nearHome(body.x,body.z,builtHomes)===home||status.care===home&&keepCareOpen(home,body.x,body.z,builtHomes));
  const seaAllowed=()=>!day.exhausted&&!day.sleeping&&!inMarket&&!body.dead&&!vessel?.aboard&&!fishing.active&&!spear.active&&view!=='overview'&&petHomes.installed('sea')&&(careAllowed('sea')||['waders','scuba'].includes(inventory.outfit)&&(()=>{const h=installedLayout(builtHomes,'sea');return Math.abs(body.x-h.x)<h.rx+2&&Math.abs(body.z-h.z)<h.rz+2;})());
  const mealOrigin=()=>{const p=shopWorld.foodOrigin(view==='first',new T.Vector3());if(view==='first'){camera.updateMatrixWorld(true);p.applyMatrix4(camera.matrixWorld);}return p;};
  const showSeaAction=(target:T.Object3D)=>{status.care=null;clearInput();const dx=target.position.x-body.x,dz=target.position.z-body.z;yaw=Math.atan2(-dx,-dz);pitch=clamp(Math.atan2(target.position.y-body.y-1.62,Math.hypot(dx,dz)),-.9,.15);};
  const serveSeafood=(id:string):ShopResult=>{
    if(trainer.busy)return {ok:false,message:'The trainer is caring for an animal. Pause him in the care panel to take over.'};
    if(!seaAllowed()||seaCare.active||menhadenMeal.active)return {ok:false,message:'Visit your sea home and finish the current action first.'};
    const target=petHomes.seaTarget(id);if(!target)return {ok:false,message:'Wait for your dolphin or sea lion to move in.'};
    const food=inventory.activeItem==='ice-box'?inventory.expansion.selectedSeafood:inventory.activeItem;
    const reserved=inventory.reserveSeafood(id,food);if(!reserved.ok)return reserved;
    const started=seaCare.start(target,food,mealOrigin(),inventory.expansion.skills[id]??{hunting:0,trust:0},eaten=>{reserved.settle!(eaten);fishing.message=eaten?`${equipmentName(id)} caught its meal · hunting ${inventory.expansion.skills[id]?.hunting??0}%.`:'Feeding interrupted. The portion was returned.';if(!disposed)reportShop();});
    if(!started){reserved.settle!(false);return {ok:false,message:'Another animal is eating.'};}showSeaAction(target.root);fishing.message=reserved.message;reportShop();return reserved;
  };
  const seaCommand=(id:string,command:'lesson'|'recall'|'pet'):ShopResult=>{
    if(!seaAllowed()||seaCare.active||menhadenMeal.active)return {ok:false,message:'Visit the sea home and finish your current action.'};
    if(trainer.busy)return {ok:false,message:'Pause the trainer or wait for him to finish the current job.'};
    if(command!=='pet'){const result=trainer.request(id,command);reportShop();return result;}
    if(!['waders','scuba'].includes(inventory.outfit))return {ok:false,message:'Wear keeper’s chest waders or scuba to interact.'};
    const target=petHomes.seaTarget(id);if(!target)return {ok:false,message:'Your sea animal is not ready yet.'};
    seaCare.interact(target,command,player.position,inventory.expansion.skills[id]??{hunting:0,trust:0},success=>{if(success){const s=inventory.expansion.skills[id]??={hunting:0,trust:0};s.trust=Math.min(100,s.trust+3);fishing.message=`${equipmentName(id)} responded · trust ${s.trust}%.`;}if(!disposed)reportShop();});showSeaAction(target.root);reportShop();return {ok:true,message:'Keeper interaction started.'};
  };
  const feedResident=(id:string):ShopResult=>{
    if(isAquaticPet(id)&&trainer.busy)return {ok:false,message:'The trainer is caring for an animal. Pause him before feeding by hand.'};
    if(isAquaticPet(id)&&(seafoodSpec(inventory.activeItem)||inventory.activeItem==='ice-box'))return serveSeafood(id);
    if(!careAllowed(isAquaticPet(id)?'sea':'birds'))return {ok:false,message:'Visit this pet’s shared home first.'};
    if(menhadenMeal.active||time<feedingUntil)return {ok:false,message:'Let your pet finish eating first.'};
    if(inventory.activeItem==='menhaden'){
      if(!isPelican(id))return {ok:false,message:'Menhaden are only for white and brown pelicans. No food was used.'};
      const target=petHomes.mealTarget(id);
      if(!target)return {ok:false,message:'Return this pelican to its main bird home first. Wait for any new pet to finish loading.'};
      const reservation=inventory.reserveMenhaden(id);if(!reservation.ok)return reservation;
      const started=menhadenMeal.start(target,()=>{
        const point=shopWorld.foodOrigin(view==='first',new T.Vector3());
        if(view==='first'){camera.updateMatrixWorld(true);point.applyMatrix4(camera.matrixWorld);}return point;
      },eaten=>{
        reservation.settle!(eaten);fishing.message=eaten?`${equipmentName(id)} gulped its Menhaden! ${inventory.menhaden} left.`:'Feeding interrupted. Your Menhaden was returned.';
        shopWorld.apply(inventory.snapshot());if(!disposed)reportShop();
      });
      if(!started){reservation.settle!(false);return {ok:false,message:'A pelican is already eating.'};}
      status.care=null;clearInput();
      const p=target.root.position,dx=p.x-body.x,dz=p.z-body.z;
      yaw=Math.atan2(-dx,-dz);pitch=clamp(Math.atan2(p.y+.4-body.y-1.62,Math.hypot(dx,dz)),-.65,.25);
      fishing.message=reservation.message;shopWorld.apply(inventory.snapshot());reportShop();return {ok:true,message:reservation.message};
    }
    const result=inventory.feedPet(id,fishing,inventory.activeItem==='food-can');if(result.ok)feedingUntil=time+1.2;fishing.message=result.message;reportShop();return result;
  };
  const refreshHabitat=():ShopResult=>{if(!careAllowed('sea'))return {ok:false,message:'Visit the seawater home first.'};const result=inventory.refreshWater();if(result.ok)feedingUntil=time+1.2;reportShop();return result;};
  const fishAction = () => {
    if (view === 'overview' || body.dead || day.exhausted || day.sleeping>0) return;
    if(coastPanel||catchWork.preparing)return;
    if(seaCare.active)return;
    if(spear.active)return;
    if(inventory.activeItem==='knife'){fishing.message=catchWork.knife()?'Preparing your catch…':catchWork.message;reportShop();return;}
    if(inventory.activeItem==='bow'){if(inMarket||inventory.outfit==='scuba'&&immersion(body.x,body.y+1.62,body.z)>.05){announce('Use the fishing bow above water, away from the market.');return;}bow.fire({x:body.x,y:body.y+1.55,z:body.z},{x:-Math.sin(yaw)*Math.cos(pitch),y:Math.sin(pitch),z:-Math.cos(yaw)*Math.cos(pitch)});fishing.message=bow.message;return;}
    if(menhadenMeal.active){fishing.message=menhadenMeal.message;return;}
    if(inventory.activeItem==='whistle'){whistle();return;}
    if(inventory.activeItem==='bird-glove'){petBird();return;}
    if(isSpeargun(inventory.activeItem)){
      if(inventory.activeItem==='meandros-b32'&&!inventory.meandrosLicence){announce('Apply for your Meandros permit at Finn’s display first.');return;}
      if(vessel?.aboard||inMarket||inventory.outfit!=='scuba'||immersion(body.x,body.y+1.62,body.z)<.06){spear.message='Wear scuba gear and dive below the surface before firing.';announce(spear.message);return;}
      if(!shopWorld.spearReady()){announce('The speargun is still loading.');return;}
      spearDirection.set(-Math.sin(yaw)*Math.cos(pitch),Math.sin(pitch),-Math.cos(yaw)*Math.cos(pitch));spear.fire({x:body.x,y:body.y+1.62,z:body.z},spearDirection);return;
    }
    if(vessel?.aboard){announce('W/S throttle & reverse · A/D steer · E steps ashore when stopped near land.');return;}
    if(isBoat(inventory.activeItem)){void boatAction();return;}
    if(inMarket){fishing.message='Visit a display and press E to inspect it. Return to Tide Island to fish.';return;}
    if(seafoodSpec(inventory.activeItem)||inventory.activeItem==='ice-box'){const pet=petRoster(inventory.snapshot()).find(p=>isAquaticPet(p.id));fishing.message=pet?serveSeafood(pet.id).message:'Buy a dolphin or sea lion and its home from Isla first.';reportShop();return;}
    if(inventory.activeItem==='menhaden'){
      const birds=petRoster(inventory.snapshot()).filter(p=>isPelican(p.id)&&!inventory.familyBrood?.parents.includes(p.id)).map(p=>({id:p.id,target:petHomes.mealTarget(p.id)})).filter(p=>p.target).sort((a,b)=>a.target!.root.position.distanceToSquared(player.position)-b.target!.root.position.distanceToSquared(player.position));
      fishing.message=birds.length?feedResident(birds[0].id).message:'Menhaden are pelican-only food. Buy a white or brown pelican from Isla, or return yours to the main aviary.';reportShop();return;
    }
    if(inventory.activeItem==='food-can'){
      const home=nearHome(body.x,body.z,builtHomes),residents=[...inventory.owned].filter(id=>isPet(id)&&(isAquaticPet(id)?'sea':'birds')===home).sort((a,b)=>(inventory.petMeals[a]??0)-(inventory.petMeals[b]??0));
      fishing.message=residents.length?feedResident(residents[0]).message:'Visit a pet home with a bought pet to feed it.';return;
    }
    if(inventory.activeItem==='seawater'){fishing.message=refreshHabitat().message;return;}
    if(inventory.activeItem==='net'){if(body.grounded)fishing.scoop(body,yaw);else fishing.message='Land safely before scooping.';return;}
    if(isPet(inventory.activeItem)){
      if(time<feedingUntil)return;const result=inventory.feed(fishing);fishing.message=result.message;
      if(result.ok)feedingUntil=time+1.4;reportShop();return;
    }
    if(immersion(body.x,body.y+1.62,body.z)>.05){fishing.message='Use the speargun underwater. Surface to cast a fishing line.';return;}
    if (!usesRod(inventory.activeItem)) { fishing.message = 'Select the fishing rod in slot 1 to cast.'; return; }
    if (!handRig.getObjectByName('rod-tip')) { fishing.message = 'Your rod is still loading…'; return; }
    if (fishing.phase === 'bite') fishing.hook();
    else if (!fishing.active) {
      if (!body.grounded) { fishing.message = 'Land safely before casting.'; return; }
      castOrigin.set(body.x, body.y + 1.65, body.z);
      const target = castTarget(body, yaw, pitch);
      const distance = target ? Math.hypot(target.x-body.x, target.z-body.z) : 0;
      fishing.rodLevel=rodLevel(inventory.expansion.rod);
      fishing.cast(target, castArcHeight(pitch, distance));
    }
  };
  const setView = (next: CameraMode) => {
    if(day.exhausted||day.sleeping>0)return;
    seaCare.cancel();
    if(menhadenMeal.active)menhadenMeal.cancel();
    if (document.pointerLockElement === renderer.domElement) document.exitPointerLock();
    keys.clear(); reelHeld = false; velocity.set(0, 0); fishing.cancel('Face the water · F to cast', true); spear.cancel();view = next; controls.enabled = next === 'overview'; controls.autoRotate = next === 'overview' && drift; player.visible = next !== 'first';
    status.storage=false;status.offer=null;status.cashier=false;status.care=null;status.familyCare=false;
    if (next === 'overview') { const wild=onRainforest(body.x,body.z),remote=distantIslandAt(body.x,body.z);controls.maxDistance=wild||remote?800:310;camera.position.set(remote?remote.x+250:inMarket?MARKET.x+65:wild?RAINFOREST.x+230:137,remote?245:inMarket?80:wild?215:119,remote?remote.z+280:inMarket?90:wild?RAINFOREST.z+265:167); controls.target.set(remote?remote.x:inMarket?MARKET.x:wild?RAINFOREST.x:0, 5,remote?remote.z:wild?RAINFOREST.z:0); camera.lookAt(controls.target); controls.update(); }
  };
  setView('first');
  const closeOffer=()=>{status.offer=null;report({...status});};
  const announce=(message:string)=>{body.message=message;body.messageTime=5;status.notice=message;report({...status});};
  const toggleChart=()=>{if(!inventory.snapshot().chartUnlocked){announce('Your first bought boat includes a free navigation chart.');return;}chartOpen=!chartOpen;status.navigation={...status.navigation,open:chartOpen};if(chartOpen&&document.pointerLockElement===renderer.domElement)document.exitPointerLock();report({...status});};
  const prepareBoat=async(id:string)=>{
    const cached=vesselModels.get(id);if(cached)return cached;
    const model=await makeSailingBoat(id);
    if(disposed){disposeScene(model.root);throw new Error('Island closed.');}
    vesselModels.set(id,model);return model;
  };
  const deliverBoat=(next:VesselState,model:Awaited<ReturnType<typeof makeSailingBoat>>)=>{
    if(sailing)scene.remove(sailing.root);
    sailing=model;vessel=next;stepVessel(next,0,0,0,time,builtHomes,physics);model.update(next,time);scene.add(model.root);
  };
  const boardBoat=()=>{
    if(!vessel)return;
    companion.reset();
    vessel.aboard=true;vessel.speed=0;yaw=vessel.yaw;pitch=-.18;
    Object.assign(body,{x:vessel.x,y:vessel.y+vessel.seat-.75,z:vessel.z,vy:0,grounded:true});
    clearInput();chartOpen=false;status.navigation={...status.navigation,open:false,aboard:vessel.id,x:vessel.x,z:vessel.z,speed:0};
    renderer.domElement.focus();announce('You are aboard! W/S move & reverse · A/D steer · M chart · E step ashore.');
  };
  // An explicit UI action takes an owned boat to the home launch berth. It never
  // buys anything, and validates the real hull, water and landing before moving us.
  const launchBoat=async(id:string)=>{
    if(!isBoat(id)||!inventory.owned.has(id)){announce('Purchase this boat at the cashier first.');return;}
    if(day.exhausted||day.sleeping>0||seaCare.active||menhadenMeal.active||launching||checkoutBusy||disposed||body.dead||fishing.active||spear.active||vessel?.aboard){announce('Finish your current action or step ashore before launching.');return;}
    launching=true;status.boatBusy=true;clearInput();report({...status});
    try{
      const model=await prepareBoat(id);
      if(disposed||body.dead||fishing.active)return;
      const next=homeLaunchVessel(id,model,builtHomes,physics);
      if(!next){announce('No safe berth is available. Your boat is still owned; try again.');return;}
      inMarket=false;status.market=false;status.marketLoading=false;status.offer=null;status.cashier=false;status.care=null;status.familyCare=false;
      inventory.equip(id);shopWorld.apply(inventory.snapshot());
      if(view==='overview')setView('first');
      deliverBoat(next,model);boardBoat();reportShop();
    }catch{if(!disposed)announce('The boat could not load. You still own it; Launch & drive will retry without charging you.');}
    finally{launching=false;status.boatBusy=false;if(!disposed)report({...status});}
  };
  const boatAction=async(forceBoard=false)=>{
    if(launching||disposed||body.dead||fishing.active||inMarket||view==='overview'){announce('Return to the home harbour in first or third person to launch your boat.');return;}
    if(vessel?.aboard){
      const shore=safeDisembark(vessel,physics,builtHomes);
      if(!shore){announce(Math.abs(vessel.speed)>.7?'Release W and S to stop before stepping ashore.':'No safe land beside the boat. Approach a beach or dock first.');return;}
      vessel.aboard=false;vessel.speed=0;Object.assign(body,shore,{vy:0,grounded:true,peak:shore.y});clearInput();announce('Boat moored here · E nearby to board again.');return;
    }
    if(vessel&&Math.hypot(body.x-vessel.x,body.z-vessel.z)<8&&(forceBoard||inventory.activeItem===vessel.id)){boardBoat();return;}
    const id=inventory.activeItem;if(!isBoat(id)||!inventory.owned.has(id)){announce('Select a purchased boat in your hotbar first.');return;}
    if(Math.hypot(body.x-DOCK.x,body.z-78)>9){announce('Launch at the end of your home harbour. Your boat is selected in the hotbar.');return;}
    await launchBoat(id);
  };
  const travelMarket=()=>{
    if(day.exhausted||day.sleeping>0||seaCare.active){announce('Finish resting or caring for your animal before travelling.');return false;}
    status.storage=false;closeCoast();
    if(menhadenMeal.active){announce('Let your pelican finish eating before travelling.');return false;}
    if(vessel?.aboard||launching){announce('Moor your boat and step ashore before visiting the market.');return false;}
    if(disposed||body.dead||catchWork.preparing||bow.active||fishing.active||spear.active||!body.grounded||immersion(body.x,body.y,body.z)>.1){announce('Finish your catch and stand on dry ground before travelling.');return false;}
    clearInput();fishing.cancel(undefined,true);status.offer=null;status.cashier=false;status.care=null;status.familyCare=false;
    companion.reset();
    if(document.pointerLockElement===renderer.domElement)document.exitPointerLock();
    if(!inMarket){
      homeReturn={x:body.x,y:body.y,z:body.z,yaw,pitch};
      market??=buildMarket(scene,physics,()=>disposed);
      inMarket=true;body.x=MARKET.spawnX;body.y=MARKET.floor;body.z=MARKET.spawnZ;yaw=0;pitch=0;
      status.marketLoading=true;
      void market.loadStock().then(()=>{if(disposed)return;status.marketLoading=false;if(market!.failed.size&&inMarket)announce('Some stock could not load. Return and visit again to retry. No coins were spent.');report({...status});});
    }else{inMarket=false;Object.assign(body,{x:homeReturn.x,y:homeReturn.y,z:homeReturn.z});yaw=homeReturn.yaw;pitch=homeReturn.pitch;}
    body.vy=0;body.grounded=true;body.peak=body.y;
    player.position.set(body.x,body.y,body.z);player.rotation.y=yaw;
    camera.position.set(body.x,body.y+1.62,body.z);camera.rotation.set(pitch,yaw,0,'YXZ');
    sun.position.set(-80+(inMarket?MARKET.x:0),120,50);sun.target.position.set(inMarket?MARKET.x:0,0,0);scene.add(sun.target);
    status.market=inMarket;status.zone=inMarket?'Saltwater Market':'Tide Island';status.door='';
    setView(view);announce(inMarket?'Welcome! E at displays adds items to a basket. Pay Coral at the central cashier.':'Welcome home! Meet your coastal delivery crew at the harbour. Builders are assembling any ordered habitats.');return true;
  };
  const nearbyVendor=()=>MARKET_VENDORS.find(v=>Math.hypot(body.x-v.x,body.z-v.z-2.5)<2.5);
  const atCashier=()=>inMarket&&!body.dead&&!fishing.active&&view!=='overview'&&Math.hypot(body.x-CASHIER.x,body.z-CASHIER.approachZ)<3;
  const togglePetGate=(home:PetHome):ShopResult=>{
    if(home==='birds'&&inventory.familyBrood&&familyStage(inventory.familyBrood)==='moving')return {ok:false,message:'Let the young birds move through the gate first.'};
    if(home==='birds'&&['calling','homing'].includes(companion.phase)){announce('Let your bird pass through the gate first.');return {ok:false,message:'Bird in the doorway.'};}
    if(!petHomes.installed(home))return {ok:false,message:'Purchase this pet home from Isla on Market Island first.'};
    if(inMarket||body.dead||fishing.active||view==='overview'||(!careAllowed(home)&&nearPetGate(body.x,body.z,builtHomes)!==home))return {ok:false,message:'Stand near this pet home to use its gate.'};
    const open=petHomes.toggleGate(home);status.petGates=petHomes.gateState();
    const message=`${home==='birds'?'Aviary':'Sea home'} gate ${open?'opening':'closing'}. Step clear of the swinging door.`;
    announce(message);return {ok:true,message};
  };
  const interact = () => {
    if(coastPanel||catchWork.preparing||bow.active)return;
    if (status.care||status.familyCare||status.storage||view === 'overview'||body.dead||fishing.active||spear.active||day.exhausted||day.sleeping>0||seaCare.active||menhadenMeal.active) return;
    if(!inMarket&&Math.hypot(body.x-CREW_POINT.x,body.z-CREW_POINT.z)<3&&deliveries.shipment?.state==='handoff'){if(isAquaticPet(deliveries.shipment.item)){announce('The crew will lower the transport tank when the sea home is ready.');return;}deliveries.collect();petHomes.apply(inventory.snapshot());shopWorld.apply(inventory.snapshot());reportShop();announce(deliveries.message);return;}
    if(!inMarket&&deliveries.cages.length&&nearHome(body.x,body.z,builtHomes)==='birds'){deliveries.deploy();reportShop();announce(deliveries.message);return;}
    if(!inMarket&&inventory.owned.has('drying-rack')&&Math.hypot(body.x-RACK_POINT.x,body.z-RACK_POINT.z)<4){openCoastal('rack');return;}
    if(inMarket&&Math.hypot(body.x-STALL_POINT.x,body.z-STALL_POINT.z)<4){openCoastal('stall');return;}
    if(!inMarket&&body.grounded&&Math.abs(body.y-CABIN.y-CABIN.floor)<.8){const target=cabinTarget(body.x,body.z);if(target){if(target.type==='bed'){clearInput();day.sleep();announce('Sleeping until morning. Rest and the skipped night are free.');reportShop();return;}if(target.type==='chest'){status.storage=true;clearInput();if(document.pointerLockElement===renderer.domElement)document.exitPointerLock();reportShop();return;}const id=usesRod(inventory.activeItem)?inventory.expansion.rod:target.id;const result=inventory.expansion.stored.includes(id)?inventory.retrieve(id):inventory.stow(id);shopWorld.apply(inventory.snapshot());reportShop();announce(result.message);return;}}
    if(!inMarket&&(vessel?.aboard||vessel&&Math.hypot(body.x-vessel.x,body.z-vessel.z)<8)){void boatAction(true);return;}
    if(inMarket){
      if(atCashier()){status.cashier=true;status.offer=null;status.advice=cashierAdvice(inventory.snapshot(),fishing.coins,'next');clearInput();if(document.pointerLockElement===renderer.domElement)document.exitPointerLock();reportShop();return;}
      if(Math.hypot(body.x-MARKET_RETURN.x,body.z-MARKET_RETURN.z)<3.8){travelMarket();return;}
      const spot=nearestMarketSpot(body.x,body.z);
      if(spot){if(!market?.ready(spot.id)){announce(market?.failed.has(spot.id)?'This model could not load. Return home and visit again to retry. No coins were spent.':'This display is still loading. No coins have been spent.');return;}status.offer=spot.id;clearInput();if(document.pointerLockElement===renderer.domElement)document.exitPointerLock();report({...status});return;}
      const vendor=nearbyVendor();if(vendor)openCoastal('shop');return;
    }
    if(familyAllowed()){status.familyCare=true;status.care=null;clearInput();if(document.pointerLockElement===renderer.domElement)document.exitPointerLock();reportShop();return;}
    const careTarget=careInteraction(body.x,body.z,builtHomes,trainer.hired?trainer.root.position:undefined);
    if(careTarget?.kind==='gate'){togglePetGate(careTarget.home);return;}
    if(careTarget){status.care=careTarget.home;status.offer=null;clearInput();if(document.pointerLockElement===renderer.domElement)document.exitPointerLock();reportShop();return;}
    if(Math.hypot(body.x-HOME_FERRY.x,body.z-HOME_FERRY.z)<3.2){travelMarket();return;}
    if (Math.hypot(player.position.x - CABIN.x, player.position.z - CABIN.z - CABIN.halfZ) < 3.1) doorOpen = !doorOpen;
  };
  const onKeyDown = (event: KeyboardEvent) => {
    if(day.exhausted||day.sleeping>0)return;
    if(event.key==='Escape'&&coastPanel){closeCoast();syncCoast();report({...status});return;}
    if(coastPanel)return;
    if(event.key==='Escape'&&status.storage){status.storage=false;reportShop();return;}
    if(event.key==='Escape'&&(status.offer||status.cashier||status.care||status.familyCare)){status.cashier=false;status.care=null;status.familyCare=false;closeOffer();return;}
    if ((event.target as HTMLElement)?.closest('input, select, textarea') || event.key === ' ' && (event.target as HTMLElement)?.closest('button')) return;
    if(status.care||status.familyCare||status.storage||status.offer||status.cashier)return;
    const key = event.key.toLowerCase();
    if(key==='g'&&!event.repeat&&!event.metaKey&&!event.ctrlKey){event.preventDefault();whistle();return;}
    if(key==='m'&&!event.repeat&&!event.metaKey&&!event.ctrlKey){event.preventDefault();toggleChart();return;}
    const slot=HOTBAR_CODES.indexOf(event.code);
    if(slot>=0&&!event.altKey&&!event.ctrlKey&&!event.metaKey){event.preventDefault();const id=hotbarItems(inventory.snapshot())[slot];if(id&&!event.repeat)equip(id);return;}
    if(['BracketLeft','BracketRight'].includes(event.code)&&!event.metaKey&&!event.ctrlKey&&!event.altKey){event.preventDefault();if(!event.repeat)changeHotbarPage(event.code==='BracketLeft'?-1:1);return;}
    if (['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright', 'shift', 'e', ' ', 'c', 'f', 'r', 'x'].includes(key)) { event.preventDefault(); keys.add(key); }
    if (key === 'e' && !event.repeat) interact();
    if (key === ' ' && !event.repeat) jump();
    if (key === 'f' && !event.repeat) fishAction();
    if (key === 'x' && !event.repeat) fishing.cancel();
  };
  const onKeyUp = (event: KeyboardEvent) => keys.delete(event.key.toLowerCase());
  const clearInput = () => { keys.clear(); reelHeld = false; velocity.set(0, 0); dragging = false; };
  let dragging = false, dragX = 0, dragY = 0, dragged = false;
  const pointerDown = (e: PointerEvent) => { if (coastPanel||status.care||status.familyCare||status.storage||status.offer||status.cashier||view === 'overview') return; renderer.domElement.focus(); if (document.pointerLockElement === renderer.domElement && e.button === 0) { if(inMarket)interact();else if (fishing.phase === 'reeling') reelHeld = true; else fishAction(); return; } dragging = true; dragged = false; dragX = e.clientX; dragY = e.clientY; try{renderer.domElement.setPointerCapture(e.pointerId);}catch{dragging=false;} };
  const pointerMove = (e: PointerEvent) => {
    if (coastPanel || view === 'overview' || fishing.phase === 'landing' || fishing.phase==='scooping') return;
    if (document.pointerLockElement === renderer.domElement) { if(e.movementX||e.movementY)lastManualLook=time;yaw -= e.movementX * .0024; pitch = clamp(pitch - e.movementY * .0024, -1.15, 1.15); }
    else if (dragging) { const dx = e.clientX - dragX, dy = e.clientY - dragY; if(dx||dy)lastManualLook=time;if (Math.abs(dx) + Math.abs(dy) > 2) dragged = true; yaw -= dx * .003; pitch = clamp(pitch - dy * .003, -1.15, 1.15); dragX = e.clientX; dragY = e.clientY; }
  };
  const pointerUp = (e: PointerEvent) => { reelHeld = false; dragging = false; if (renderer.domElement.hasPointerCapture(e.pointerId)) renderer.domElement.releasePointerCapture(e.pointerId); if (!status.care&&!status.familyCare&&!status.storage&&!status.offer&&!status.cashier&&!dragged && e.pointerType === 'mouse' && view !== 'overview' && document.pointerLockElement !== renderer.domElement) renderer.domElement.requestPointerLock?.()?.catch(() => {}); };
  const lockChanged = () => { status.locked = document.pointerLockElement === renderer.domElement; keys.clear(); reelHeld = false; };
  window.addEventListener('keydown', onKeyDown); window.addEventListener('keyup', onKeyUp); window.addEventListener('blur', clearInput); document.addEventListener('visibilitychange', clearInput); document.addEventListener('pointerlockchange', lockChanged);
  renderer.domElement.addEventListener('pointerdown', pointerDown); renderer.domElement.addEventListener('pointermove', pointerMove); renderer.domElement.addEventListener('pointerup', pointerUp); renderer.domElement.addEventListener('pointercancel', clearInput);
  const resize = new ResizeObserver(() => { const w = host.clientWidth, h = host.clientHeight; renderer.setSize(w, h); camera.aspect = w / h; camera.updateProjectionMatrix(); equipmentCamera.aspect = camera.aspect; equipmentCamera.updateProjectionMatrix(); handRig.position.x = w / h < 1 ? -.17 : 0; }); resize.observe(host);

  function animate(now: number) {
    if (disposed) return;
    frame = requestAnimationFrame(animate); const dt = Math.min((now - last) / 1000, .05); last = now; time += dt;
    if(status.loading>=100&&!document.hidden)day.update(dt,Math.min(1,velocity.length()/7.2),fishing,()=>{inventory.expansion.iceBlocks=Math.max(0,inventory.expansion.iceBlocks-1);});
    status.day=day.snapshot();multiplayer.update(dt,time);
    if(day.exhausted||day.sleeping>0){trainer.cancel();clearInput();menhadenMeal.cancel();seaCare.cancel();fishing.cancel(undefined,true);spear.cancel();if(document.pointerLockElement===renderer.domElement)document.exitPointerLock();report({...status});renderer.setClearColor('#000000');renderer.clear();if(day.exhausted)cancelAnimationFrame(frame);return;}
    if(day.taxDue&&fishing.coins>0)day.settleTax(fishing);
    const darkness=day.night;night=darkness>.55;const angle=(day.hour-6)/24*Math.PI*2;
    ambient.intensity=T.MathUtils.lerp(.7,.18,darkness);sun.intensity=T.MathUtils.lerp(2.8,.20,darkness);sun.color.set(darkness>.2?'#ecc6a2':'#fff2d9');renderer.toneMappingExposure=T.MathUtils.lerp(.92,1.05,darkness);
    sun.position.set(body.x+Math.cos(angle)*100,Math.max(12,Math.sin(angle)*115),body.z+45);sun.target.position.set(body.x,0,body.z);
    world.uniforms.uTime.value = time; world.uniforms.uEye.value.copy(camera.position);
    world.uniforms.uNight.value = T.MathUtils.damp(world.uniforms.uNight.value, darkness, 2, dt);
    world.palms.forEach((p, i) => { p.rotation.z = Math.sin(time * .7 + i) * .028; p.rotation.x = Math.sin(time * .5 + i) * .018; }); atmosphere.update(time,darkness,new T.Vector3(Math.cos(angle)*100,Math.sin(angle)*115,45)); landscapeWind.value=time;
    if (view !== 'overview') {
      const forward = Number(keys.has('w') || keys.has('arrowup')) - Number(keys.has('s') || keys.has('arrowdown'));
      const right = Number(keys.has('d') || keys.has('arrowright')) - Number(keys.has('a') || keys.has('arrowleft'));
      desired.set(-Math.sin(yaw) * forward + Math.cos(yaw) * right, -Math.cos(yaw) * forward - Math.sin(yaw) * right);
      const wet=immersion(body.x,body.y,body.z),swimming=canSwim(inventory.outfit)&&wet>.8&&!vessel?.aboard;
      if (desired.lengthSq() > 0) desired.normalize().multiplyScalar(swimming?3.1:wet>.15?inventory.outfit==='waders'?3:2.1:keys.has('shift') ? 7.2 : 4.2);
      if (coastPanel || catchWork.preparing || fishing.active || body.dead || menhadenMeal.active || seaCare.active || status.storage || status.care || status.familyCare || status.offer || status.cashier) desired.set(0, 0);
      velocity.lerp(desired, 1 - Math.exp(-12 * dt));
      if(vessel?.aboard){
        const oldYaw=vessel.yaw;stepVessel(vessel,forward,right,dt,time,builtHomes,physics);yaw+=vessel.yaw-oldYaw;
        Object.assign(body,{x:vessel.x,y:vessel.y+vessel.seat-.75,z:vessel.z,grounded:true,vy:0,peak:vessel.y+vessel.seat});velocity.set(0,0);
      }else physics.update(body, velocity.x, velocity.y, dt, doorOpen,{outfit:inventory.outfit,vertical:(Number(keys.has(' '))-Number(keys.has('c')))*2.2});
      if(inMarket&&!onMarket(body.x,body.z)){inMarket=false;status.market=false;status.offer=null;sun.position.set(-80,120,50);sun.target.position.set(0,0,0);}
      if(status.offer){const offerSpot=MARKET_SPOTS.find(s=>s.id===status.offer);if(!offerSpot||!spotInReach(offerSpot,body.x,body.z)||body.dead)status.offer=null;}
      if(status.cashier&&!atCashier())status.cashier=false;
      if(status.care&&(inMarket||body.dead||!!vessel?.aboard||!keepCareOpen(status.care,body.x,body.z,builtHomes)))status.care=null;
      if(status.familyCare&&!familyAllowed())status.familyCare=false;
      player.position.set(body.x, body.y, body.z); player.rotation.y = vessel?.aboard?vessel.yaw:yaw;
      if (body.dead && fishing.active) fishing.cancel(undefined, true);
      if(body.dead&&spear.active)spear.cancel();
      if(body.dead&&menhadenMeal.active)menhadenMeal.cancel();
      if(body.dead&&seaCare.active)seaCare.cancel();
      const moving = body.grounded ? Math.min(1, velocity.length() / 4.2) : 0, bob = Math.sin(time * 9) * .025 * moving;
      legs.forEach((leg, i) => leg.rotation.x = vessel?.aboard?-.75:swimming?Math.sin(time*4+i*Math.PI)*.24:Math.sin(time * 9 + i * Math.PI) * .45 * moving);
      // Follow a close retrieve down toward the water, but yield immediately to looking around.
      if(view==='first'&&fishing.phase==='reeling'&&fishing.selected&&time-lastManualLook>.7){
        const p=fishing.selected.position,dx=p.x-body.x,dz=p.z-body.z,heading=Math.atan2(-dx,-dz);
        if(Math.abs(Math.atan2(Math.sin(heading-yaw),Math.cos(heading-yaw)))<.65)pitch=T.MathUtils.damp(pitch,clamp(Math.atan2(p.y-body.y-1.62,Math.hypot(dx,dz)),-1.05,.2),3,dt);
      }
      if (fishing.phase === 'landing') pitch = T.MathUtils.damp(pitch, -.07, 5, dt);
      if (view === 'first') { const eye=inventory.outfit==='snorkel'&&swimming&&pitch<-.25?.72:1.62;camera.position.copy(player.position).add(new T.Vector3(0, eye + bob, 0)); camera.rotation.set(pitch, yaw, 0, 'YXZ'); }
      else {
        lookTarget.copy(player.position).add(new T.Vector3(0, 1.35, 0));
        const follow=vessel?.aboard?Math.max(7,vessel.length*1.45):5.2;thirdTarget.set(Math.sin(yaw) * follow * Math.cos(pitch), 2.5 - Math.sin(pitch) * 4, Math.cos(yaw) * follow * Math.cos(pitch)).add(lookTarget);
        if(inventory.outfit==='scuba'&&wet>1.67){thirdTarget.set(Math.sin(yaw)*3.2,.2,Math.cos(yaw)*3.2).add(lookTarget);thirdTarget.y=Math.min(thirdTarget.y,(waterSurface(body.x,body.z)??0)-.2);}
        thirdTarget.y = Math.max(thirdTarget.y, groundHeight(thirdTarget.x, thirdTarget.z) + .7); camera.position.lerp(thirdTarget, 1 - Math.exp(-8 * dt)); camera.lookAt(lookTarget);
      }
      handRig.position.y = Math.sin(time * 1.7) * .005 + bob * .5; handRig.rotation.z = Math.sin(time * 4.5) * .012 * moving;
      handRig.rotation.x = T.MathUtils.damp(handRig.rotation.x, menhadenMeal.active?menhadenMeal.armSwing:fishing.phase === 'landing' ? .16 + Math.sin(time * 8) * .013 : fishing.phase === 'casting' ? -Math.sin((.7 - fishing.timer) / .7 * Math.PI) * .35 : fishing.phase === 'reeling' ? -.06 + Math.sin(time * 12) * .016 : 0, 14, dt);
      thirdRodMount.rotation.x = T.MathUtils.damp(thirdRodMount.rotation.x, menhadenMeal.active?menhadenMeal.armSwing:fishing.phase === 'landing' ? .2 : 0, 8, dt);
    } else if (view === 'overview') controls.update();
    if(inMarket)market?.update(time);
    const previousBag=catchWork.bagCount;if(fishing.fishInBag<previousBag)catchWork.consume(previousBag-fishing.fishInBag);
    catchWork.update(dt);fishing.fishInBag=catchWork.bagCount;
    const deliveryBefore=Object.keys(inventory.pending).map(id=>id+inventory.pending[id]).join();
    deliveries.update(dt,!inMarket&&Math.hypot(body.x-CREW_POINT.x,body.z-CREW_POINT.z)<35);
    if(deliveryBefore!==Object.keys(inventory.pending).map(id=>id+inventory.pending[id]).join()){petHomes.apply(inventory.snapshot());shopWorld.apply(inventory.snapshot());}
    bow.update(dt);if(inventory.activeItem==='bow')fishing.message=bow.message;
    coastalWorld.update(dt,time,inMarket,view,fishing.active||spear.active,fishing);
    if(coastPanel==='rack'&&Math.hypot(body.x-RACK_POINT.x,body.z-RACK_POINT.z)>5||coastPanel==='stall'&&Math.hypot(body.x-STALL_POINT.x,body.z-STALL_POINT.z)>5)closeCoast();
    const brood=inventory.familyBrood,transferring=brood&&familyStage(brood)==='moving';
    if(transferring)petHomes.ensureTransferGates();
    if((!transferring||petHomes.transferReady())&&inventory.updateFamily(dt)){
      reportShop();if(brood&&!inventory.familyBrood)announce('Two young birds have grown up and moved into your main aviary! Their parents are home too.');
    }
    const seaFamily=inventory.seaBrood;if(inventory.updateSeaFamily(dt)){reportShop();if(seaFamily&&!inventory.seaBrood)announce('Your sea baby has grown into an adult! It stays with the family in its home.');}
    petHomes.update(time,dt,inMarket?undefined:body,inventory.familyBrood,inventory.seaBrood);
    trainer.update(dt,time,document.hidden||!!body.dead||seaCare.active||menhadenMeal.active,inMarket?undefined:body);
    seaCare.update(dt,time);status.seaCare={active:seaCare.active,message:seaCare.active?seaCare.message:''};if(seaCare.active)fishing.message=seaCare.message;
    cabinInterior.sync(inventory.snapshot(),shopWorld.rackRod);
    if(Math.hypot(body.x-RAINFOREST.x,body.z-RAINFOREST.z)<360)rainforest.update(time,dt);
    if(vessel&&sailing){
      if(!vessel.aboard||view==='overview')stepVessel(vessel,0,0,dt,time,builtHomes,physics);
      sailing.update(vessel,time);world.uniforms.uBoat.value.set(vessel.x,vessel.z,vessel.yaw);world.uniforms.uBoatSize.value.set(vessel.width*.34,vessel.length*.37);
    }
    if (doorPivot) doorPivot.rotation.y = T.MathUtils.damp(doorPivot.rotation.y, doorOpen ? -Math.PI * .58 : 0, 7, dt);
    if(boat)boat.visible=!sailing;
    if (boat&&!sailing) {
      const bx = DOCK.x + 6.9 + Math.sin(time * .38) * .13, bz = 77 + Math.sin(time * .31) * .18;
      boat.position.set(bx, .16 + waterHeight(bx, bz, time), bz); boat.rotation.y = Math.sin(time * .28) * .045;
      boat.rotation.x = -Math.atan2(waterHeight(bx, bz + 2, time) - waterHeight(bx, bz - 2, time), 4);
      boat.rotation.z = Math.atan2(waterHeight(bx + .8, bz, time) - waterHeight(bx - .8, bz, time), 1.6);
      world.uniforms.uBoat.value.set(bx, bz, boat.rotation.y); world.uniforms.uBoatSize.value.set(boat.userData.halfWidth * .63, 1.95);
    }
    const previousPhase=fishing.phase;
    if (!inMarket) fishing.update(dt, reelHeld || keys.has('r'),body);
    if(previousPhase!=='idle'&&fishing.phase==='idle')fishing.message=actionHint(inventory.activeItem);
    coastalWorld.updateCatch(time,fishing.active||spear.active);
    const landing = catchAnimation.update(fishing, body, yaw, dt, time,coastalWorld.catchHandoff(view,camera));
    spearHand.set(body.x-Math.sin(yaw)*.65+Math.cos(yaw)*.28,body.y+1.35,body.z-Math.cos(yaw)*.65-Math.sin(yaw)*.28);
    spear.update(dt,spearHand);
    menhadenMeal.update(dt);status.pelicanMeal={active:menhadenMeal.active,message:menhadenMeal.active?menhadenMeal.message:''};
    if(menhadenMeal.active)fishing.message=menhadenMeal.message;
    shopWorld.update(time, fishing.active,fishing.scoopProgress,Math.max(0,Math.min(1,feedingUntil-time)),spear,menhadenMeal,seaCare.pouring);
    shopWorld.toolPose(catchWork.preparing,bow.cooldown);
    spearLine.visible=projectile.visible=spear.phase==='firing'||spear.phase==='retrieving';
    if(spearLine.visible){const p=spearLine.geometry.attributes.position;p.setXYZ(0,spearHand.x,spearHand.y,spearHand.z);p.setXYZ(1,spear.tip.x,spear.tip.y,spear.tip.z);p.needsUpdate=true;projectile.position.set(spear.tip.x,spear.tip.y,spear.tip.z);projectile.lookAt(spear.origin.x,spear.origin.y,spear.origin.z);}
    handRig.visible=thirdRodMount.visible=!vessel?.aboard&&!isBoat(inventory.activeItem);
    netSplash.update(fishing.scoopProgress,fishing.scoopPoint,time);
    if(fishing.phase==='scooping'&&fishing.selected?.caught&&fishing.scoopFrom){
      shopWorld.netCenter(view==='first',netDestination);
      if(view==='first'){camera.updateMatrixWorld(true);netDestination.applyMatrix4(camera.matrixWorld);}
      const t=clamp(((fishing.scoopProgress??0)-.45)/.23,0,1),from=fishing.scoopFrom;
      fishing.selected.landing={position:{x:T.MathUtils.lerp(from.x,netDestination.x,t),y:T.MathUtils.lerp(from.y,netDestination.y,t),z:T.MathUtils.lerp(from.z,netDestination.z,t)},pitch:Math.sin(time*18)*.18,yaw,roll:Math.sin(time*22)*.16};
    }
    if(companion.away&&(body.dead||inMarket||vessel?.aboard||immersion(body.x,body.y,body.z)>.7))companion.reset();
    if(view==='first'){glovePoint.set(.35,-.23,-.9).applyQuaternion(camera.quaternion).add(camera.position);}else glovePoint.set(.36,1.05,-.6).applyAxisAngle(T.Object3D.DEFAULT_UP,yaw).add(player.position);
    companion.update(dt,glovePoint,yaw);birdSplash.update(companion.splash?.progress??null,companion.splash?.point??null,time);status.bird={...companion.snapshot(),blocker:birdBlocker()};petHand.visible=status.bird.petting&&view==='first';petHand.position.set(.2+Math.sin(time*5)*.045,-.13,-.89);petHand.rotation.z=-.45;
    animations.forEach(a => a.update(dt, time));
    const hasLine = usesRod(inventory.activeItem)&&fishing.active && !!fishing.target;
    float.visible = hasLine && !landing; fishingLine.visible = hasLine;
    const fightingFish=hasLine&&!landing&&fishing.selected?.struggle?fishing.selected:null;
    catchHook.update(hasLine?(landing?catchAnimation.mouth:fightingFish?.mouth??null):null,yaw);
    shopWorld.showWaterTackle(!catchHook.root.visible);
    hookLeader.visible=!!fightingFish?.mouth;
    for (const rig of [handRig, thirdRodMount]) { const idle = rig.getObjectByName('idle-line'); if (idle) idle.visible = !hasLine; }
    if (hasLine && fishing.target) {
      const tip = (view === 'first' ? handRig : thirdRodMount).getObjectByName('rod-tip');
      if (tip) {
        if (view === 'first') { equipmentScene.updateMatrixWorld(true); tip.getWorldPosition(lineStart); camera.updateMatrixWorld(true); lineStart.applyMatrix4(camera.matrixWorld); }
        else { player.updateMatrixWorld(true); tip.getWorldPosition(lineStart); }
      } else lineStart.copy(player.position).add(new T.Vector3(0, 1.8, 0));
      const t = fishing.phase === 'casting' ? clamp(1 - fishing.timer / CAST_DURATION, 0, 1) : 1;
      const flight = castFlightPoint(castOrigin, fishing.target, t, fishing.castArc);
      float.position.set(flight.x, flight.y + waterHeight(fishing.target.x, fishing.target.z, time) * t, flight.z);
      float.position.y += fishing.phase === 'bite' ? Math.sin(time * 19) * .08 : 0;
      if(fightingFish?.mouth){
        const mouth=fightingFish.mouth,effort=fightingFish.struggle!.strength;
        float.position.x=mouth.x;float.position.z=mouth.z;
        float.position.y=waterHeight(mouth.x,mouth.z,time)+Math.sin(time*18)*.07*effort;
        float.rotation.set(Math.sin(time*15)*.17*effort,0,Math.sin(time*19)*.22*effort);
        const a=leaderGeometry.attributes.position;a.setXYZ(0,float.position.x,float.position.y,float.position.z);a.setXYZ(1,catchHook.endpoint.x,catchHook.endpoint.y,catchHook.endpoint.z);a.needsUpdate=true;
      }else float.rotation.set(0,0,0);
      ripple.scale.setScalar(fightingFish?1.35+(Math.sin(time*9)+1)*.8:1 + (Math.sin(time * 3) + 1) * .65);
      if (landing) lineEnd.copy(catchHook.endpoint);
      else lineEnd.copy(float.position).add(new T.Vector3(0, .16, 0));
      const attr = lineGeometry.attributes.position;
      for (let i = 0; i <= 32; i++) { const u = i / 32; attr.setXYZ(i, T.MathUtils.lerp(lineStart.x, lineEnd.x, u), T.MathUtils.lerp(lineStart.y, lineEnd.y, u) - Math.sin(u * Math.PI) * (landing ? .025 : fishing.phase === 'reeling' ? .1 : .35), T.MathUtils.lerp(lineStart.z, lineEnd.z, u)); }
      attr.needsUpdate = true;
    }
    if (time - lastReport > .15) {
      lastReport = time; const p = player.position;
      const remote=distantIslandAt(body.x,body.z);
      if(!inMarket&&!body.dead&&!vessel?.aboard&&body.grounded&&groundHeight(body.x,body.z)>.2){
        if(remote)discovered.add(remote.id);else if(onRainforest(body.x,body.z))discovered.add('rainforest');
      }
      status.advancements=advancementSnapshot({catches:fishing.catches,meals:Object.values(inventory.petMeals).reduce((n,v)=>n+v,0),raisedBirds:inventory.raisedBirds,raisedSea:inventory.raisedSea,expandedArea:expansionArea(inventory,'birds')+expansionArea(inventory,'sea'),boats:[...inventory.owned].filter(isBoat).length,discovered:[...discovered]});
      const newlyEarned=status.advancements.items.filter(a=>a.complete&&!awarded.has(a.id));
      if(newlyEarned.length){newlyEarned.forEach(a=>awarded.add(a.id));announce(`Advancement: ${newlyEarned.map(a=>a.name).join(' · ')} · +${newlyEarned.reduce((n,a)=>n+a.xp,0)} XP`);}

      status.navigation={x:body.x,z:body.z,heading:((-(vessel?.aboard?vessel.yaw:yaw)*180/Math.PI)%360+360)%360,open:chartOpen,aboard:vessel?.aboard?vessel.id:null,speed:Math.abs(vessel?.speed??0),rainforest:onRainforest(body.x,body.z),distant:remote?.id??null,discovered:[...discovered]};
      const depth=vessel?.aboard?0:immersion(body.x,body.y,body.z);
      status.water={depth,submerged:depth>1.67||inventory.outfit==='snorkel'&&depth>.8&&pitch<-.25,swimming:canSwim(inventory.outfit)&&depth>.8,outfit:inventory.outfit};status.spear=spear.snapshot();
      status.zone = inMarket?'Saltwater Market':remote?vessel?.aboard?`${remote.name} coast`:body.y>15?'Highland trail':'Landing beach':onRainforest(body.x,body.z)?vessel?.aboard?'Rainwild coast':body.y>10?'Rainforest canopy':'Rainwild landing beach':vessel?.aboard?'Open sea':view === 'overview' ? 'Tide Island' : Math.hypot(p.x - DOCK.x, p.z - 63) < 20 ? 'Harbour beach' : Math.hypot(p.x - 15, p.z - 19) < 36 ? 'Emerald lagoon' : p.y > 17 ? 'Windward ridge' : 'Wild coast';
      status.heading = ((-yaw * 180 / Math.PI) % 360 + 360) % 360;
      status.castAim = {angle: Math.round(pitch * 180 / Math.PI), range: castRange(pitch)};
      status.door = view !== 'overview' && Math.hypot(p.x - CABIN.x, p.z - CABIN.z - CABIN.halfZ) < 3.1 ? (doorOpen ? 'Close cabin door' : 'Open cabin door') : '';
      if(view!=='overview'&&!body.dead){
        if(inMarket){const spot=nearestMarketSpot(p.x,p.z),vendor=nearbyVendor();status.door=Math.hypot(p.x-MARKET_RETURN.x,p.z-MARKET_RETURN.z)<3.8?'Return to Tide Island · free':spot?`Inspect ${equipmentName(spot.id)}`:vendor?`Talk to ${vendor.name}`:'';}
        else if(Math.hypot(p.x-HOME_FERRY.x,p.z-HOME_FERRY.z)<3.2)status.door='Travel to Market Island · free';
        if(!inMarket){const target=careInteraction(body.x,body.z,builtHomes,trainer.hired?trainer.root.position:undefined);if(target)status.door=target.kind==='trainer'?'Talk to trainer · budget & care':target.kind==='care'?target.home==='birds'?'Care for birds · customise can':'Care for sea pets · trainer':petHomes.gates[target.home].paused?'Gate paused · step clear':`${petHomes.gates[target.home].open?'Close':'Open'} ${target.home==='birds'?'aviary':'sea home'} gate`;}
        if(familyAllowed()&&!status.familyCare)status.door='Care for bird family';
        if(inMarket&&atCashier())status.door='Coral · cashier & recommendations';
        if(!inMarket&&vessel&&(vessel.aboard||Math.hypot(body.x-vessel.x,body.z-vessel.z)<8))status.door=vessel.aboard?'Stop beside a beach or dock · step ashore':`Board ${equipmentName(vessel.id)}`;
      }
      if(!inMarket&&body.grounded&&Math.abs(body.y-CABIN.y-CABIN.floor)<.8&&view!=='overview'&&!seaCare.active){const target=cabinTarget(body.x,body.z);if(target)status.door=target.type==='bed'?'Sleep until morning · restore energy · free':target.type==='chest'?'Open cabin storage':usesRod(inventory.activeItem)?'Clip held rod into rack':`Retrieve ${equipmentName(target.id)}`;}
      if(status.storage&&cabinTarget(body.x,body.z)?.type!=='chest')status.storage=false;
      if(vessel?.aboard)body.messageTime=Math.max(0,body.messageTime-dt*9);
      Object.assign(status, { health: body.health, dead: !!body.dead, notice: vessel?.notice|| (body.messageTime > 0 ? body.message : ''), coins: fishing.coins, catches: fishing.catches, fishInBag:fishing.fishInBag, fishing: fishing.phase, fishingMessage: fishing.message, progress: fishing.progress, tension: fishing.tension });
      if(!inMarket&&inventory.owned.has('drying-rack')&&Math.hypot(body.x-RACK_POINT.x,body.z-RACK_POINT.z)<4)status.door='Drying rack · hang or retrieve fish';
      if(inMarket&&Math.hypot(body.x-STALL_POINT.x,body.z-STALL_POINT.z)<4)status.door='Your market stall · set prices';
      if(!inMarket&&deliveries.shipment?.state==='handoff'&&Math.hypot(body.x-CREW_POINT.x,body.z-CREW_POINT.z)<3)status.door='Collect coastal delivery';
      if(!inMarket&&deliveries.cages.length&&nearHome(body.x,body.z,builtHomes)==='birds')status.door='Release delivered birds into aviary';
      syncCoast();if(coastPanel)status.door='';
      status.trainer=trainer.snapshot();status.trainerBusy=trainer.busy;if(status.care||status.familyCare||status.storage)status.door='';
      status.shop=inventory.snapshot();status.familyGateOpen=petHomes.family.gate.open;
      report({ ...status });
    }
    const submerged=view!=='overview'&&immersion(camera.position.x,camera.position.y,camera.position.z)>.04;
    sky.visible=!submerged;sky.position.copy(camera.position);
    (scene.fog as T.FogExp2).density=submerged?.035:mist?.00125:.0005;
    (scene.fog as T.FogExp2).color.set(submerged?(night?'#072d43':'#126d79'):night?'#182b45':'#b4c8d4');
    (scene.background as T.Color).set(submerged?(night?'#072d43':'#126d79'):night?'#101e36':'#a9c4d8');
    if(!submerged)seaReflection.update(camera,time);
    renderer.autoClear = true; renderer.render(scene, camera);
    if (view === 'first') { renderer.autoClear = false; renderer.clearDepth(); renderer.render(equipmentScene, equipmentCamera); }
  }
  frame = requestAnimationFrame(animate);
  // Load supplied packs after the landscape is already playable.
  let baseLoading=0, reefLoading=0, baseError='', reefError='';
  const updateLoading=()=>{status.loading=Math.round(baseLoading*.75+reefLoading*.25);status.assetError=[baseError,reefError].filter(Boolean).join(' ');};
  void import('./island-assets').then(({ addIslandAssets }) => addIslandAssets({ scene, handRig, thirdRodMount, lowPower, isDisposed: () => disposed, onDoor: p => { doorPivot = p; }, onBoat: b => { boat = b; }, onFish: f => fishAgents.push(f), animations, onProgress: (value, error) => { baseLoading=value;baseError=error;updateLoading(); } })).catch(() => { baseError='Some models could not load. Reload to try again.';baseLoading=100;updateLoading(); });
  void addReefAndKingfish(scene,animations,f=>fishAgents.push(f),lowPower,()=>disposed,(value,error)=>{reefLoading=value;reefError=error;updateLoading();});

  function disposeScene(root: T.Object3D) {
    if(root===scene){companion.reset();whistleSound.dispose();spear.cancel();shopWorld.dispose();}
    if(root===scene)for(const model of vesselModels.values())if(!model.root.parent)disposeScene(model.root);
    const geometries = new Set<T.BufferGeometry>(), materials = new Set<T.Material>();
    root.traverse(o => { if (o instanceof T.Mesh || o instanceof T.Line || o instanceof T.Points) { geometries.add(o.geometry); if(o instanceof T.Mesh){if(o.customDepthMaterial)materials.add(o.customDepthMaterial);if(o.customDistanceMaterial)materials.add(o.customDistanceMaterial);} for (const m of Array.isArray(o.material) ? o.material : [o.material]) materials.add(m); } else if(o instanceof T.Sprite)materials.add(o.material); });
    root.traverse(o=>{if(o instanceof T.SkinnedMesh)o.skeleton.dispose();});
    geometries.forEach(g => g.dispose()); materials.forEach(m => { Object.values(m).forEach(v => { if (v instanceof T.Texture) v.dispose(); }); m.dispose(); });
  }
  return {
    openCoastal,joinCrew:async(mode,name,code)=>{await multiplayer.join(mode,name,code);syncCoast();report({...status});},leaveCrew:()=>{void multiplayer.leave();},
    catchAction:(action,id,price)=>{
      if(body.dead||day.exhausted||fishing.active||spear.active||catchWork.preparing)return {ok:false,message:'Finish the current action first.'};
      if(['hang','retrieve'].includes(action)&&(!inventory.owned.has('drying-rack')||Math.hypot(body.x-RACK_POINT.x,body.z-RACK_POINT.z)>4))return {ok:false,message:'Stand beside your drying rack.'};
      if(['list','withdraw'].includes(action)&&(!inMarket||Math.hypot(body.x-STALL_POINT.x,body.z-STALL_POINT.z)>4))return {ok:false,message:'Visit your stall on Market Island.'};
      const gear=catchWork.fish.find(f=>f.id===id)?.item;
      const ok=action==='hold'?catchWork.hold(id):action==='stow'?catchWork.hold(null):action==='hang'?catchWork.hang(id):action==='retrieve'?catchWork.retrieve(id):action==='list'?catchWork.list(id,price??0):catchWork.withdraw(id);
      if(ok&&action==='withdraw'&&gear){inventory.owned.add(gear);catchWork.fish=catchWork.fish.filter(f=>f.id!==id);}
      fishing.fishInBag=catchWork.bagCount;reportShop();return {ok,message:ok?catchWork.message:'This action is unavailable for that item.'};
    },
    listEquipment:(id,price)=>{const item=SHOP_ITEMS.find(i=>i.id===id);if(!inMarket||Math.hypot(body.x-STALL_POINT.x,body.z-STALL_POINT.z)>4||!item||!inventory.owned.has(id)||!isCarriedItem(id)||item.consumable||usesRod(id)||isBoat(id)||id==='meandros-b32')return {ok:false,message:'Only spare, non-consumable equipment can be sold here.'};if(inventory.activeItem===id||inventory.outfit===id||inventory.expansion.stored.includes(id)||inventory.equippedLure===id||id==='hook'&&inventory.hookEquipped)return {ok:false,message:'Unequip and retrieve this item first.'};const ok=catchWork.listItem(id,item.name,item.price,price);if(ok)inventory.owned.delete(id);reportShop();return {ok,message:ok?'Equipment listed at your stall.':'Enter a valid whole coin price.'};},
    catalogAdd:id=>{if(!inMarket||coastPanel!=='shop')return {ok:false,message:'Visit the marketplace first.'};const result=inventory.addToBasket(id);reportShop();return result;},
    fundTrainer:amount=>{if(status.care!=='sea'||!careAllowed('sea'))return {ok:false,message:'Talk to your trainer at the sea home first.'};const r=trainer.fund(amount,fishing);reportShop();return r;},
    pauseTrainer:()=>{trainer.pause();reportShop();},resumeTrainer:()=>{const r=trainer.resume();reportShop();return r;},reclaimTrainer:()=>{const r=trainer.reclaim(fishing);reportShop();return r;},
    selectSeafood:id=>{const r=inventory.selectSeafood(id);reportShop();return r;},serveSeafood,seaCommand,
    storeItem:id=>{if(day.exhausted||!status.storage||cabinTarget(body.x,body.z)?.type!=='chest')return {ok:false,message:'Open the cabin chest first.'};const r=inventory.stow(id);shopWorld.apply(inventory.snapshot());reportShop();return r;},
    retrieveItem:id=>{if(day.exhausted||!status.storage||cabinTarget(body.x,body.z)?.type!=='chest')return {ok:false,message:'Open the cabin chest first.'};const r=inventory.retrieve(id);shopWorld.apply(inventory.snapshot());reportShop();return r;},closeStorage:()=>{status.storage=false;},
    expandHabitat:(home,tiles)=>{
      if(!careAllowed(home)||status.care!==home)return {ok:false,message:'Visit this habitat’s care sign to extend it.'};
      if(trainer.busy||seaCare.active||menhadenMeal.active||home==='birds'&&(companion.away||inventory.familyBrood&&familyStage(inventory.familyBrood)==='moving'))return {ok:false,message:'Let your birds return home and finish feeding before extending.'};
      const result=inventory.expandHabitat(home,tiles,fishing);
      if(result.ok){
        petHomes.apply(inventory.snapshot());
        const h=installedLayout(builtHomes,home);body.x=h.care.x;body.z=h.care.z;body.y=walkingHeight(body.x,body.z,builtHomes);body.vy=0;body.grounded=true;body.peak=body.y;
        player.position.set(body.x,body.y,body.z);status.petGates=petHomes.gateState();announce(result.message);
      }
      reportShop();return result;
    },
    startSeaBrood:species=>{if(!careAllowed('sea'))return {ok:false,message:'Visit your sea home’s care sign first.'};const result=inventory.startSeaBrood(species,fishing);reportShop();return result;},
    applyLicence:a=>{const spot=MARKET_SPOTS.find(s=>s.id==='meandros-b32')!;if(!inMarket||body.dead||status.offer!==spot.id||!spotInReach(spot,body.x,body.z))return {ok:false,message:'Apply beside Finn’s Meandros display on Market Island.'};const result=inventory.applyLicence(a,fishing);reportShop();return result;},
    startBrood:species=>{if(!familyAllowed())return {ok:false,message:'Visit the family aviary beside your cabin.'};const result=inventory.startBrood(species,companion.away?companion.activeId:null,fishing);reportShop();return result;},
    closeFamily:()=>{status.familyCare=false;reportShop();},
    toggleFamilyGate:()=>{if(!familyAllowed())return {ok:false,message:'Stand beside your family aviary.'};if(inventory.familyBrood&&familyStage(inventory.familyBrood)==='moving')return {ok:false,message:'Let the young birds pass through first.'};petHomes.family.gate.toggle();status.familyGateOpen=petHomes.family.gate.open;reportShop();return {ok:true,message:`Family gate ${petHomes.family.gate.open?'opening':'closing'}. Step clear of the door.`};},
    whistle,petBird,selectBird:id=>{companion.select(id,birdOwned());status.bird=companion.snapshot();report({...status});},returnBird:()=>{companion.sendHome(birdGateOpen(),birdGateNearby(),insideAviary());status.bird=companion.snapshot();report({...status});},
    boatAction:()=>boatAction(),launchBoat,toggleChart,
    setView,
    setNight: () => { announce('The sun now follows the automatic day/night cycle.'); },
    setMist: value => { mist = value; (scene.fog as T.FogExp2).density = mist ? .00125 : .0005; },
    setDrift: value => { drift = value; controls.autoRotate = view === 'overview' && value; },
    reset: () => { if(day.exhausted||day.sleeping>0)return;status.storage=false;seaCare.cancel();menhadenMeal.cancel();companion.reset();spear.cancel();if(vessel){vessel.aboard=false;vessel.speed=0;}inMarket=false;status.market=false;status.offer=null;sun.position.set(-80,120,50);sun.target.position.set(0,0,0);clearInput();physics.reset(body); player.position.set(body.x, body.y, body.z); yaw = -.73; pitch = -.03; setView(view); },
    interact, jump, fish: fishAction, reel: down => { reelHeld = down; }, cancelCast: () => fishing.cancel(),
    travelMarket,closeOffer,
    closeCashier:()=>{status.cashier=false;reportShop();},closeCare:()=>{status.care=null;reportShop();},
    removeBasket:id=>{if(status.cashier&&atCashier()&&!checkoutBusy){inventory.removeFromBasket(id);status.advice=cashierAdvice(inventory.snapshot(),fishing.coins,'discounts');reportShop();}},
    askCashier:topic=>{if(status.cashier&&atCashier()){status.advice=cashierAdvice(inventory.snapshot(),fishing.coins,topic);reportShop();}},
    customiseCan:design=>{if(!status.care||!careAllowed(status.care))return {ok:false,message:'Visit a pet-home care sign first.'};const result=inventory.customiseCan(design);if(result.ok)shopWorld.apply(inventory.snapshot());reportShop();return result;},
    feedResident,refreshHabitat,togglePetGate,
    checkout:async()=>{
      if(checkoutBusy||!status.cashier||!atCashier())return {ok:false,message:'Visit Coral at the cashier to pay.'};
      const quote=basketQuote(inventory.basket);if(!quote.count)return {ok:false,message:'Your basket is empty.'};
      if(fishing.coins<quote.total)return {ok:false,message:`You need ${quote.total-fishing.coins} more coins.`};
      checkoutBusy=true;let paid=false;
      try{
        const ids=Object.keys(expandedOrder(inventory.basket));await petHomes.prepare(ids);
        // Load the drivable hull before payment, not just the miniature display.
        await Promise.all(ids.filter(isCarriedItem).map(id=>isBoat(id)?prepareBoat(id):shopWorld.prepare(id)));
        const boughtBoats=ids.filter(isBoat),deliveryId=boughtBoats[boughtBoats.length-1];
        const deliveryModel=deliveryId?vesselModels.get(deliveryId):undefined;
        const delivery=deliveryModel?homeLaunchVessel(deliveryId,deliveryModel,builtHomes,physics):null;
        if(deliveryModel&&!delivery)return {ok:false,message:'The home berth is blocked. No coins were spent; your basket is kept.'};
        if(disposed||!status.cashier||!atCashier())return {ok:false,message:'You left the cashier. No coins were spent.'};
        const hadChart=inventory.snapshot().chartUnlocked,result=inventory.checkout(fishing);paid=result.ok;
        if(result.ok){
          if(!inventory.dispatch&&delivery&&deliveryModel)deliverBoat(delivery,deliveryModel);
          petHomes.apply(inventory.snapshot());shopWorld.apply(inventory.snapshot());
          if(!hadChart&&inventory.snapshot().chartUnlocked)result.message+=' Free sea chart gifted! M shows Rainwild and three distant islands.';
          status.advice=result.message;
        }
        reportShop();return result;
      }catch{
        if(paid){status.shop=inventory.snapshot();status.coins=fishing.coins;report({...status});return {ok:true,message:'Payment complete and items owned. Delivery display needs a retry: select your boat in My boats, then Launch & drive. You will not be charged again.'};}
        return {ok:false,message:'Delivery models could not load. No coins were spent; your basket is kept.'};
      }finally{checkoutBusy=false;}
    },
    buy: async id => {
      if(!SHOP_ITEMS.some(i=>i.id===id)||disposed||checkoutBusy)return {ok:false,message:'Item unavailable right now.'};
      const spot=MARKET_SPOTS.find(s=>s.id===id);
      const canBuy=()=>inMarket&&!body.dead&&!fishing.active&&view!=='overview'&&(status.offer===id||!!homeItemInfo(id)&&homeItemInfo(id)?.home===homeItemInfo(status.offer??'')?.home)&&!!spot&&!!status.offer&&spotInReach(MARKET_SPOTS.find(s=>s.id===status.offer)!,body.x,body.z)&&market?.ready(status.offer);
      if(!canBuy())return {ok:false,message:'Visit the item display on Market Island first.'};
      const result=inventory.addToBasket(id);reportShop();return result;
    },
    equip,
    hotbarPage:changeHotbarPage,
    setMove: (key, down) => { if (down) keys.add(key); else keys.delete(key); },
    dispose: () => { disposed = true;multiplayer.dispose();coastalWorld.dispose();trainer.dispose();seaCare.dispose();menhadenMeal.dispose(); petHomes.dispose(); fishing.cancel(undefined, true); cancelAnimationFrame(frame); if (document.pointerLockElement === renderer.domElement) document.exitPointerLock(); resize.disconnect(); controls.dispose(); window.removeEventListener('keydown', onKeyDown); window.removeEventListener('keyup', onKeyUp); window.removeEventListener('blur', clearInput); document.removeEventListener('visibilitychange', clearInput); document.removeEventListener('pointerlockchange', lockChanged); renderer.domElement.removeEventListener('pointerdown', pointerDown); renderer.domElement.removeEventListener('pointermove', pointerMove); renderer.domElement.removeEventListener('pointerup', pointerUp); renderer.domElement.removeEventListener('pointercancel', clearInput); animations.forEach(a => a.update(0, -1)); atmosphere.dispose(); seaReflection.dispose(); disposeNaturalTextures(); disposeScene(scene); disposeScene(equipmentScene); renderer.dispose(); renderer.domElement.remove(); },
  };
}
