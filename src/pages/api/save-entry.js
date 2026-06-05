import { upsertEntry, addRevision } from '../../lib/db.js';

const slugify = (s) =>
  (s || '')
    .toString()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'entrada';

export async function POST({ request }) {
  let data;
  try {
    data = await request.json();
  } catch {
    return new Response('JSON inválido', { status: 400 });
  }
  if (!data.title || !data.type) {
    return new Response('Falta título o tipo', { status: 400 });
  }
  const slug = data.slug || slugify(data.title);
  try {
    const saved = await upsertEntry({ ...data, slug });
    await addRevision(saved.id, saved, data.note || null);
    return new Response(JSON.stringify({ ok: true, id: saved.id, slug: saved.slug, type: saved.type }), {
      headers: { 'content-type': 'application/json' },
    });
  } catch (e) {
    return new Response('Error: ' + e.message, { status: 500 });
  }
}
