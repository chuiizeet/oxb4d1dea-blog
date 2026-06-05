// Ejecuta un archivo .sql contra la DB (DATABASE_URL).
// Uso: node --env-file=.env scripts/run-sql.mjs <archivo.sql>
import postgres from 'postgres';
import { readFile } from 'node:fs/promises';

const url = process.env.DATABASE_URL;
if (!url) {
  console.error('Falta DATABASE_URL en el entorno (.env).');
  process.exit(1);
}
const file = process.argv[2];
if (!file) {
  console.error('Uso: node --env-file=.env scripts/run-sql.mjs <archivo.sql>');
  process.exit(1);
}

const sql = postgres(url, { prepare: false });
try {
  const text = await readFile(file, 'utf8');
  await sql.unsafe(text);
  console.log('✓ SQL ejecutado:', file);
  const rows = await sql`
    select table_name from information_schema.tables
    where table_schema = 'public' order by table_name`;
  console.log('Tablas en public:', rows.map((r) => r.table_name).join(', ') || '(ninguna)');
} catch (e) {
  console.error('Error:', e.message);
  process.exitCode = 1;
} finally {
  await sql.end();
}
