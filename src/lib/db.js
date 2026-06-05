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

// ── editor ──────────────────────────────────────────────────────────────
export async function getAllEntries() {
  return await db()`select * from entries order by date desc`;
}

const COLS = ['type', 'slug', 'title', 'body', 'mood', 'exfile', 'image', 'summary', 'tags', 'date', 'published'];

export async function upsertEntry(data) {
  const s = db();
  const row = {
    type: data.type,
    slug: data.slug,
    title: data.title,
    body: data.body ?? '',
    mood: data.mood || null,
    exfile: data.exfile ?? null,
    image: data.image || null,
    summary: data.summary || null,
    tags: Array.isArray(data.tags) ? data.tags : [],
    date: data.date,
    published: data.published ?? true,
  };
  let saved;
  if (data.id) {
    [saved] = await s`update entries set ${s(row, ...COLS)} where id = ${data.id} returning *`;
  } else {
    [saved] = await s`
      insert into entries ${s(row, ...COLS)}
      on conflict (type, slug) do update set ${s(row, ...COLS.filter((c) => c !== 'type' && c !== 'slug'))}
      returning *`;
  }
  return saved;
}

export async function addRevision(entryId, snapshot, note = null) {
  const s = db();
  await s`insert into revisions (entry_id, snapshot, note) values (${entryId}, ${s.json(snapshot)}, ${note})`;
}

export async function deleteEntry(id) {
  await db()`delete from entries where id = ${id}`; // revisions caen en cascada
}

export async function getRevisions(entryId) {
  return await db()`
    select id, created_at, note, snapshot from revisions
    where entry_id = ${entryId} order by created_at desc`;
}

export async function addMedia(entryId, kind, url, caption = null) {
  await db()`
    insert into media (entry_id, kind, url, caption)
    values (${entryId}, ${kind}, ${url}, ${caption})`;
}
