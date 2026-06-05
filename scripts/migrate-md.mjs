// Migra las entradas .md (diario + blog) a la tabla `entries` (idempotente).
// Uso: node --env-file=.env scripts/migrate-md.mjs
import postgres from 'postgres';
import matter from 'gray-matter';
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';

const url = process.env.DATABASE_URL;
if (!url) {
  console.error('Falta DATABASE_URL en .env');
  process.exit(1);
}
const sql = postgres(url, { prepare: false, onnotice: () => {} });

async function loadDir(dir, type) {
  let files = [];
  try {
    files = (await readdir(dir)).filter((f) => f.endsWith('.md'));
  } catch {
    return [];
  }
  const out = [];
  for (const f of files) {
    const raw = await readFile(path.join(dir, f), 'utf8');
    const { data, content } = matter(raw);
    out.push({ type, slug: f.replace(/\.md$/, ''), data, body: content.trim() });
  }
  return out;
}

const items = [
  ...(await loadDir('src/content/diario', 'diario')),
  ...(await loadDir('src/content/blog', 'blog')),
];

try {
  for (const e of items) {
    const d = e.data ?? {};
    const row = {
      type: e.type,
      slug: e.slug,
      title: d.title ?? e.slug,
      body: e.body ?? '',
      mood: d.mood ?? null,
      exfile: d.exfile ?? null,
      image: d.image ?? null,
      summary: d.summary ?? null,
      tags: Array.isArray(d.tags) ? d.tags : [],
      date: (d.date ? new Date(d.date) : new Date()).toISOString(),
    };
    const [saved] = await sql`
      insert into entries ${sql(row, 'type', 'slug', 'title', 'body', 'mood', 'exfile', 'image', 'summary', 'tags', 'date')}
      on conflict (type, slug) do update set
        title = excluded.title, body = excluded.body, mood = excluded.mood,
        exfile = excluded.exfile, image = excluded.image, summary = excluded.summary,
        tags = excluded.tags, date = excluded.date
      returning id, type, slug`;
    await sql`insert into revisions (entry_id, snapshot, note)
      values (${saved.id}, ${sql.json(row)}, 'migración inicial')`;
    console.log(`✓ ${saved.type}/${saved.slug}`);
  }
  const [{ count }] = await sql`select count(*)::int as count from entries`;
  console.log(`Total en DB: ${count} entradas (${items.length} migradas)`);
} catch (e) {
  console.error('Error:', e.message);
  process.exitCode = 1;
} finally {
  await sql.end();
}
