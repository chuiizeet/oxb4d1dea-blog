import { deleteEntry } from '../../lib/db.js';

export async function POST({ request }) {
  let d;
  try {
    d = await request.json();
  } catch {
    return new Response('JSON inválido', { status: 400 });
  }
  if (!d.id) return new Response('Falta id', { status: 400 });
  try {
    await deleteEntry(d.id);
    return new Response(JSON.stringify({ ok: true }), { headers: { 'content-type': 'application/json' } });
  } catch (e) {
    return new Response('Error: ' + e.message, { status: 500 });
  }
}
