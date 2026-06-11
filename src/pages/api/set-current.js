import { setCurrentItem, addItemRevision } from '../../lib/db.js';

// volver a poner como actual un item archivado
export async function POST({ request }) {
  let d;
  try {
    d = await request.json();
  } catch {
    return new Response('JSON inválido', { status: 400 });
  }
  if (!d.sectionId || !d.itemId) return new Response('Faltan datos', { status: 400 });
  try {
    const s = await setCurrentItem(d.sectionId, d.itemId);
    await addItemRevision(s.id, s, d.note || 'Reactivado');
    return new Response(JSON.stringify({ ok: true }), { headers: { 'content-type': 'application/json' } });
  } catch (e) {
    return new Response('Error: ' + e.message, { status: 500 });
  }
}
