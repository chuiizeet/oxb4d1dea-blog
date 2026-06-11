import postgres from 'postgres';

const url = import.meta.env.DATABASE_URL ?? process.env.DATABASE_URL;

// singleton: una conexión persistente para todo el servidor SSR
let _sql = null;
export function db() {
  if (!_sql) _sql = postgres(url, { prepare: false, onnotice: () => {} });
  return _sql;
}

export async function getEntries() {
  return await db()`select * from entries where published = true order by date desc, created_at desc`;
}

export async function getEntriesByType(type) {
  return await db()`
    select * from entries
    where published = true and type = ${type}
    order by date desc, created_at desc`;
}

export async function getEntry(type, slug) {
  const rows = await db()`
    select * from entries where type = ${type} and slug = ${slug} limit 1`;
  return rows[0] ?? null;
}

// ── editor ──────────────────────────────────────────────────────────────
export async function getAllEntries() {
  return await db()`select * from entries order by date desc, created_at desc`;
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
  const rows = await db()`select name, avatar, status from profile where id = true limit 1`;
  return rows[0] ?? { name: 'Chuy', avatar: '/pfp.jpg', status: 'auto' };
}

export async function updateProfile({ name, avatar, status }) {
  const [r] = await db()`
    insert into profile (id, name, avatar, status) values (true, ${name}, ${avatar}, ${status})
    on conflict (id) do update set
      name = excluded.name, avatar = excluded.avatar, status = excluded.status, updated_at = now()
    returning name, avatar, status`;
  return r;
}

// ── secciones (slots) + items (actual/archivados) con historial ──────────
// home: una fila por sección publicada con su item actual
export async function getInventory() {
  return await db()`
    select s.id as section_id, s.label, s.icon, s.position,
           i.title, i.sub, i.description, i.cover, i.url
    from sections s
    left join items i on i.section_id = s.id and i.current = true
    where s.published = true
    order by s.position, s.created_at`;
}

// editor: todas las secciones con todos sus items (actual primero, luego archivados)
export async function getSectionsFull() {
  const sections = await db()`select * from sections order by position, created_at`;
  const items = await db()`select * from items order by current desc, started_at desc, created_at desc`;
  return sections.map((s) => ({ ...s, items: items.filter((it) => it.section_id === s.id) }));
}

export async function upsertSection(data) {
  const s = db();
  const v = {
    label: data.label ?? '',
    icon: data.icon ?? '',
    position: Number.isFinite(data.position) ? data.position : 0,
    published: data.published ?? true,
  };
  let saved;
  if (data.id) {
    [saved] = await s`update sections set label=${v.label}, icon=${v.icon}, position=${v.position}, published=${v.published} where id=${data.id} returning *`;
  } else {
    [saved] = await s`insert into sections (label, icon, position, published) values (${v.label}, ${v.icon}, ${v.position}, ${v.published}) returning *`;
  }
  return saved;
}
export async function deleteSection(id) {
  await db()`delete from sections where id = ${id}`; // items + revisiones caen en cascada
}

const ITEM_FIELDS = (data) => ({
  title: data.title ?? '',
  sub: data.sub ?? '',
  description: data.description ?? '',
  cover: data.cover ?? '',
  url: data.url ?? '',
});

// editar el item actual (mismo libro): solo cambia sus campos
export async function updateItem(itemId, data) {
  const v = ITEM_FIELDS(data);
  const [saved] = await db()`
    update items set title=${v.title}, sub=${v.sub}, description=${v.description}, cover=${v.cover}, url=${v.url}
    where id=${itemId} returning *`;
  return saved;
}

// cambiar de item (libro nuevo): archiva el actual e inserta uno nuevo como actual
export async function changeItem(sectionId, data) {
  const s = db();
  const v = ITEM_FIELDS(data);
  await s`update items set current=false where section_id=${sectionId} and current=true`;
  const [saved] = await s`
    insert into items (section_id, title, sub, description, cover, url, current, started_at)
    values (${sectionId}, ${v.title}, ${v.sub}, ${v.description}, ${v.cover}, ${v.url}, true, now())
    returning *`;
  return saved;
}

// volver a poner como actual un item archivado
export async function setCurrentItem(sectionId, itemId) {
  const s = db();
  await s`update items set current=false where section_id=${sectionId} and current=true`;
  const [saved] = await s`update items set current=true, started_at=now() where id=${itemId} returning *`;
  return saved;
}

export async function deleteItem(id) {
  await db()`delete from items where id = ${id}`; // item_revisions caen en cascada
}
export async function addItemRevision(itemId, snapshot, note = null) {
  const s = db();
  await s`insert into item_revisions (item_id, snapshot, note) values (${itemId}, ${s.json(snapshot)}, ${note})`;
}
export async function getItemRevisions(itemId) {
  return await db()`
    select id, created_at, note, snapshot from item_revisions
    where item_id = ${itemId} order by created_at desc`;
}
