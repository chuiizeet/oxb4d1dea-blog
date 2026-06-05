import postgres from 'postgres';

const url = import.meta.env.DATABASE_URL ?? process.env.DATABASE_URL;

// singleton: una conexión persistente para todo el servidor SSR
let _sql = null;
export function db() {
  if (!_sql) _sql = postgres(url, { prepare: false, onnotice: () => {} });
  return _sql;
}

export async function getEntries() {
  return await db()`select * from entries where published = true order by date desc`;
}

export async function getEntriesByType(type) {
  return await db()`
    select * from entries
    where published = true and type = ${type}
    order by date desc`;
}

export async function getEntry(type, slug) {
  const rows = await db()`
    select * from entries where type = ${type} and slug = ${slug} limit 1`;
  return rows[0] ?? null;
}
