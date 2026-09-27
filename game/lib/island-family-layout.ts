// The family home is a smaller, four-bird nursery beside the cabin.
export const FAMILY_AVIARY={x:-27,z:37,y:3.4,rx:3.5,rz:3,height:3.8};
export const FAMILY_CARE={x:-27,z:41.4};
export const FAMILY_FURNITURE=['family-nest','family-perch','family-feeder'] as const;
export const FAMILY_STAGES={eggs:40,chick:100,juvenile:140,moving:152};
export type FamilyBrood={species:string;parents:[string,string];elapsed:number};
export type FamilyStage='eggs'|'chick'|'juvenile'|'moving';
export const familyStage=(brood:FamilyBrood):FamilyStage=>brood.elapsed<FAMILY_STAGES.eggs?'eggs':brood.elapsed<FAMILY_STAGES.chick?'chick':brood.elapsed<FAMILY_STAGES.juvenile?'juvenile':'moving';
export const isFamilyItem=(id:string)=>id==='family-aviary'||FAMILY_FURNITURE.includes(id as typeof FAMILY_FURNITURE[number]);
export const nearFamily=(x:number,z:number)=>Math.hypot(x-FAMILY_CARE.x,z-FAMILY_CARE.z)<3.2||Math.abs(x-FAMILY_AVIARY.x)<3.2&&Math.abs(z-FAMILY_AVIARY.z)<2.7;
export const familyFootprint=(x:number,z:number,margin=0)=>Math.abs(x-FAMILY_AVIARY.x)<FAMILY_AVIARY.rx+1+margin&&Math.abs(z-FAMILY_AVIARY.z)<FAMILY_AVIARY.rz+1+margin;
