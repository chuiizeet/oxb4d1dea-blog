// Migra items "planos" a Secciones + items (cada item suelto -> su propia sección, como actual).
// Uso: node --env-file=.env scripts/migrate-items.mjs
import postgres from 'postgres';

const sql = postgres(process.env.DATABASE_URL, { prepare: false, onnotice: () => {} });
const labelByPos = { 0: 'Libro', 1: 'Álbum', 2: 'Juego' };

try {
  const items = await sql`select * from items where section_id is null order by position, created_at`;
  for (const it of items) {
    const label = labelByPos[it.position] ?? 'Sección';
    const [sec] = await sql`
      insert into sections (label, icon, position, published)
      values (${label}, ${it.icon || ''}, ${it.position || 0}, ${it.published ?? true})
      returning id`;
    await sql`update items set section_id = ${sec.id}, current = true, started_at = ${it.created_at} where id = ${it.id}`;
    console.log(`✓ ${label} (${it.icon}) <- "${it.title}"`);
  }
  console.log(`Migrados ${items.length} items a secciones.`);
} catch (e) {
  console.error('Error:', e.message);
  process.exitCode = 1;
} finally {
  await sql.end();
}
