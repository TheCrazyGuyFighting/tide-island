import {env} from 'cloudflare:workers';
export function crewDB(){const db=(env as unknown as {DB?:D1Database}).DB;if(!db)throw new Error('Crew database unavailable');return db;}
