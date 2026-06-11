import { changeItem, addItemRevision } from '../../lib/db.js';

// CAMBIAR de item (libro nuevo): archiva el actual e inserta uno nuevo como actual
export async function POST({ request }) {
  let d;
  try {
    d = await request.json();
  } catch {
    return new Response('JSON inválido', { status: 400 });
  }
  if (!d.sectionId) return new Response('Falta sectionId', { status: 400 });
  try {
    const saved = await changeItem(d.sectionId, d);
    await addItemRevision(saved.id, saved, d.note || 'Nuevo item');
    return new Response(JSON.stringify({ ok: true, id: saved.id }), { headers: { 'content-type': 'application/json' } });
  } catch (e) {
    return new Response('Error: ' + e.message, { status: 500 });
  }
}
