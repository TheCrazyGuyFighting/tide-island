import {createMarineCreature} from './island-original-marine';
/** Original detailed silver Menhaden, held and fed rather than imported. */
export function menhadenModel(){const actor=createMarineCreature('menhaden','high');actor.update(0,0);return actor.root;}
