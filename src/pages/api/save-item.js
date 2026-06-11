import { updateItem, addItemRevision } from '../../lib/db.js';

// editar el item ACTUAL (mismo libro): cambia campos + revisión con motivo
export async function POST({ request }) {
  let d;
  try {
    d = await request.json();
  } catch {
    return new Response('JSON inválido', { status: 400 });
  }
  if (!d.id) return new Response('Falta id', { status: 400 });
  try {
    const saved = await updateItem(d.id, d);
    await addItemRevision(saved.id, saved, d.note || null);
    return new Response(JSON.stringify({ ok: true, id: saved.id }), { headers: { 'content-type': 'application/json' } });
  } catch (e) {
    return new Response('Error: ' + e.message, { status: 500 });
  }
}
