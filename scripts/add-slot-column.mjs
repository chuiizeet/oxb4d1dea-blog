// Paso 1 (pre-deploy): solo agrega la columna `slot` a sections (invisible en live).
// node --env-file=.env scripts/add-slot-column.mjs
import postgres from 'postgres';
const sql = postgres(process.env.DATABASE_URL, { prepare: false, onnotice: () => {} });
await sql`alter table sections add column if not exists slot text not null default 'grid'`;
const rows = await sql`select label, slot from sections order by position, created_at`;
console.log('columna slot lista:');
for (const r of rows) console.log(` ${r.label} → ${r.slot}`);
await sql.end();
