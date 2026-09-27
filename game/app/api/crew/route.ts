import {crewDB} from '@/lib/crew-db';
import {validPose} from '@/lib/crew-protocol';
export const dynamic='force-dynamic';
type Row={token:string;id:string;room:string;slot:number;public:number;name:string;pose:string;updated:number;joined:number};
const ttl=45000;
const json=(data:unknown,status=200,cookie?:string)=>Response.json(data,{status,headers:{'Cache-Control':'no-store',...(cookie?{'Set-Cookie':cookie}:{})}});
async function hash(token:string){return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(token))),b=>b.toString(16).padStart(2,'0')).join('');}
function credential(req:Request){return req.headers.get('cookie')?.match(/(?:^|;\s*)tide_crew=([a-f0-9]{64})(?:;|$)/)?.[1]??null;}
function sameOrigin(req:Request){const origin=req.headers.get('origin');return !origin||origin===new URL(req.url).origin;}
async function roomState(db:D1Database,row:Row,now:number){const result=await db.prepare('SELECT id,name,slot,pose,updated FROM crew_sessions WHERE room = ? AND updated > ? ORDER BY slot').bind(row.room,now-ttl).all<Row>();return {room:row.room,self:row.id,players:result.results.map(p=>({id:p.id,name:p.name,slot:p.slot,pose:JSON.parse(p.pose),updated:p.updated}))};}
export async function POST(req:Request){
  if(!sameOrigin(req))return json({error:'This request must come from the game.'},403);
  try{
    if(Number(req.headers.get('content-length')??0)>4096)return json({error:'Request too large.'},413);
    const text=await req.text();if(text.length>4096)return json({error:'Request too large.'},413);let body;try{body=JSON.parse(text);}catch{return json({error:'Invalid request.'},400);}
    if(!body||typeof body!=='object'||Array.isArray(body))return json({error:'Invalid request.'},400);
    const db=crewDB(),now=Date.now();let token=credential(req);const key=token?await hash(token):null;
    const previous=key?await db.prepare('SELECT * FROM crew_sessions WHERE token = ?').bind(key).first<Row>():null;
    if(body.action==='pulse'){
      if(!previous||previous.updated<now-ttl)return json({error:'Your crew session expired. Join again.'},410);
      const pose=validPose(body.pose);if(!pose)return json({error:'Invalid player position.'},400);
      if(now-previous.updated<150)return json({error:'Please slow down.'},429);
      await db.prepare('UPDATE crew_sessions SET pose = ?, updated = ? WHERE token = ?').bind(JSON.stringify(pose),now,key).run();return json(await roomState(db,previous,now));
    }
    if(body.action!=='join'||!['match','create','code'].includes(body.mode))return json({error:'Choose Find players, Create room, or Join code.'},400);
    if(previous&&now-previous.joined<2000)return json({error:'Please wait a moment before switching rooms.'},429);
    const name=typeof body.name==='string'?body.name.trim().replace(/[^\p{L}\p{N} _-]/gu,'').slice(0,18):'';if(!name)return json({error:'Enter a nickname (1–18 letters or numbers).'},400);
    await db.prepare('DELETE FROM crew_sessions WHERE updated <= ?').bind(now-ttl).run();
    let room:string|undefined,publicRoom=body.mode==='match'?1:0;
    if(body.mode==='code'){const entered=typeof body.code==='string'?body.code.trim().toUpperCase():'';if(!/^[A-F0-9]{8}$/.test(entered))return json({error:'Enter the eight-character room code.'},400);room=entered;const found=await db.prepare('SELECT public FROM crew_sessions WHERE room = ? AND updated > ? LIMIT 1').bind(room,now-ttl).first<Row>();if(!found)return json({error:'Room not found or no longer online.'},404);publicRoom=found.public;}
    if(body.mode==='match'){const found=await db.prepare('SELECT room FROM crew_sessions WHERE public = 1 AND updated > ? GROUP BY room HAVING count(*) < 4 ORDER BY min(joined) LIMIT 1').bind(now-ttl).first<{room:string}>();room=found?.room;}
    room??=crypto.randomUUID().replaceAll('-','').slice(0,8).toUpperCase();
    token??=crypto.randomUUID().replaceAll('-','')+crypto.randomUUID().replaceAll('-','');const tokenHash=await hash(token),id=previous?.id??crypto.randomUUID();
    const pose=validPose(body.pose)??{x:-29,y:4,z:54,yaw:0,outfit:'regular',action:'idle',boat:null};
    // A unique room/slot constraint makes the four-player limit race-safe.
    for(let slot=0;slot<4;slot++){
      try{const result=await db.prepare('INSERT INTO crew_sessions (token,id,room,slot,public,name,pose,updated,joined) SELECT ?,?,?,?,?,?,?,?,? WHERE NOT EXISTS (SELECT 1 FROM crew_sessions WHERE room = ? AND slot = ? AND token != ?) ON CONFLICT(token) DO UPDATE SET room=excluded.room,slot=excluded.slot,public=excluded.public,name=excluded.name,pose=excluded.pose,updated=excluded.updated,joined=excluded.joined').bind(tokenHash,id,room,slot,publicRoom,name,JSON.stringify(pose),now,now,room,slot,tokenHash).run();if(!result.meta.changes)continue;
        const row={token:tokenHash,id,room,slot,public:publicRoom,name,pose:JSON.stringify(pose),updated:now,joined:now};return json(await roomState(db,row,now),200,`tide_crew=${token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=86400${new URL(req.url).protocol==='https:'?'; Secure':''}`);
      }catch(error){if(!String(error).includes('UNIQUE'))throw error;}
    }
    return json({error:'This crew is full (4 players). Try Find players again or create a new room.'},409);
  }catch(error){console.error('Crew service:',error instanceof Error?error.message:'unavailable');return json({error:'Multiplayer is temporarily unavailable. Solo play still works; try again.'},503);}
}
export async function DELETE(req:Request){if(!sameOrigin(req))return json({error:'Forbidden'},403);try{const token=credential(req);if(token)await crewDB().prepare('DELETE FROM crew_sessions WHERE token = ?').bind(await hash(token)).run();return json({ok:true});}catch{return json({error:'Could not leave immediately. The session will expire automatically.'},503);}}
