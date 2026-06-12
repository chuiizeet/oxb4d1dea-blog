// Agrega la columna `slot` a sections y crea los slots del header (EQUIP + disco).
// Correr una vez:  node --env-file=.env scripts/add-header-slots.mjs
import postgres from 'postgres';

const sql = postgres(process.env.DATABASE_URL, { prepare: false, onnotice: () => {} });

await sql`alter table sections add column if not exists slot text not null default 'grid'`;

const [eq] = await sql`select id from sections where slot = 'equip' limit 1`;
if (!eq) await sql`insert into sections (label, icon, position, slot) values ('Equip', '🎒', 10, 'equip')`;

const [dc] = await sql`select id from sections where slot = 'disc' limit 1`;
if (!dc) await sql`insert into sections (label, icon, position, slot) values ('Disco', '📀', 11, 'disc')`;

const rows = await sql`select label, icon, slot, position from sections order by position, created_at`;
console.log('secciones:');
for (const r of rows) console.log(` ${r.icon} ${r.label} → slot=${r.slot} (pos ${r.position})`);

await sql.end();
