import {DISTANT_ISLANDS} from './island-destinations';
export type AdvancementInput={catches:number;meals:number;raisedBirds:number;raisedSea:number;expandedArea:number;boats:number;discovered:readonly string[]};
export type Advancement={id:string;name:string;description:string;value:number;goal:number;xp:number;complete:boolean};
export type AdvancementSnapshot={items:Advancement[];xp:number;totalXp:number;completed:number;total:number};
export function advancementSnapshot(input:AdvancementInput):AdvancementSnapshot{
  const milestone=(id:string,name:string,description:string,value:number,goal:number,xp:number):Advancement=>({id,name,description,value:Math.min(goal,Math.max(0,value)),goal,xp,complete:value>=goal});
  const items=[
    milestone('catch','First catch','Catch your first fish.',input.catches,1,25),
    milestone('angler','Coastal angler','Land 10 fish using your rod, net or spear.',input.catches,10,75),
    milestone('care','Animal keeper','Feed your animals 5 meals.',input.meals,5,50),
    milestone('birds','New wings','Raise your first pair of chicks.',input.raisedBirds,2,100),
    milestone('sea','Ocean family','Raise a dolphin or sea-lion baby.',input.raisedSea,1,100),
    milestone('extend','Room to roam','Add 5 m² to your animal habitats.',input.expandedArea,5,50),
    milestone('builder','Habitat builder','Add a total of 25 m².',input.expandedArea,25,100),
    milestone('boat','Cast off','Own your first boat.',input.boats,1,50),
    milestone('rainforest','Into the canopy','Step ashore on Rainwild Island.',Number(input.discovered.includes('rainforest')),1,100),
    ...DISTANT_ISLANDS.map(i=>milestone(i.id,i.name,`Step ashore on ${i.name}.`,Number(input.discovered.includes(i.id)),1,i.reward)),
  ];
  return {items,xp:items.reduce((n,i)=>n+(i.complete?i.xp:0),0),totalXp:items.reduce((n,i)=>n+i.xp,0),completed:items.filter(i=>i.complete).length,total:items.length};
}
export const emptyAdvancements=()=>advancementSnapshot({catches:0,meals:0,raisedBirds:0,raisedSea:0,expandedArea:0,boats:0,discovered:[]});
