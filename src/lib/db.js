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

export async function upsertEntry(data) {
  const s = db();
  const v = {
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
    attachments: Array.isArray(data.attachments) ? data.attachments : [],
  };
  let saved;
  if (data.id) {
    [saved] = await s`
      update entries set
        type = ${v.type}, slug = ${v.slug}, title = ${v.title}, body = ${v.body},
        mood = ${v.mood}, exfile = ${v.exfile}, image = ${v.image}, summary = ${v.summary},
        tags = ${v.tags}, date = ${v.date}, published = ${v.published}, attachments = ${s.json(v.attachments)}
      where id = ${data.id} returning *`;
  } else {
    [saved] = await s`
      insert into entries
        (type, slug, title, body, mood, exfile, image, summary, tags, date, published, attachments)
      values
        (${v.type}, ${v.slug}, ${v.title}, ${v.body}, ${v.mood}, ${v.exfile}, ${v.image},
         ${v.summary}, ${v.tags}, ${v.date}, ${v.published}, ${s.json(v.attachments)})
      on conflict (type, slug) do update set
        title = excluded.title, body = excluded.body, mood = excluded.mood, exfile = excluded.exfile,
        image = excluded.image, summary = excluded.summary, tags = excluded.tags, date = excluded.date,
        published = excluded.published, attachments = excluded.attachments
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

export async function getMedia(limit = 80) {
  return await db()`select kind, url, caption from media order by created_at desc limit ${limit}`;
}

// ── perfil (nombre + avatar del menú) ────────────────────────────────────
export async function getProfile() {
  const rows = await db()`select name, avatar from profile where id = true limit 1`;
  return rows[0] ?? { name: 'Chuy', avatar: '/pfp.jpg' };
}

export async function updateProfile({ name, avatar }) {
  const [r] = await db()`
    insert into profile (id, name, avatar) values (true, ${name}, ${avatar})
    on conflict (id) do update set name = excluded.name, avatar = excluded.avatar, updated_at = now()
    returning name, avatar`;
  return r;
}
