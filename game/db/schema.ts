import {sqliteTable,text,integer,index,uniqueIndex} from 'drizzle-orm/sqlite-core';
export const crewSessions=sqliteTable('crew_sessions',{
  token:text('token').primaryKey(),id:text('id').notNull(),room:text('room').notNull(),slot:integer('slot').notNull(),public:integer('public').notNull(),name:text('name').notNull(),pose:text('pose').notNull(),updated:integer('updated').notNull(),joined:integer('joined').notNull(),
},t=>[uniqueIndex('crew_room_slot').on(t.room,t.slot),index('crew_public_updated').on(t.public,t.updated),index('crew_room_updated').on(t.room,t.updated)]);
