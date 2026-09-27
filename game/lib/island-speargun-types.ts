export type SpeargunId='speargun'|'meandros-b32';
export const isSpeargun=(id:string):id is SpeargunId=>id==='speargun'||id==='meandros-b32';
export const LICENCE_FEE=50;
export type LicenceApplication={equipment:string;targets:string;agree:boolean};
