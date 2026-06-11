import { upsertSection } from '../../lib/db.js';

export async function POST({ request }) {
  let d;
  try {
    d = await request.json();
  } catch {
    return new Response('JSON inválido', { status: 400 });
  }
  try {
    const s = await upsertSection(d);
    return new Response(JSON.stringify({ ok: true, id: s.id }), { headers: { 'content-type': 'application/json' } });
  } catch (e) {
    return new Response('Error: ' + e.message, { status: 500 });
  }
}
