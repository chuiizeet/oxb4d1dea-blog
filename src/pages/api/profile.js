import { updateProfile } from '../../lib/db.js';

export async function POST({ request }) {
  let d;
  try {
    d = await request.json();
  } catch {
    return new Response('JSON inválido', { status: 400 });
  }
  const name = (d?.name ?? '').toString().trim() || 'Chuy';
  const avatar = (d?.avatar ?? '').toString().trim() || '/pfp.jpg';
  try {
    const p = await updateProfile({ name, avatar });
    return new Response(JSON.stringify({ ok: true, ...p }), { headers: { 'content-type': 'application/json' } });
  } catch (e) {
    return new Response('Error: ' + e.message, { status: 500 });
  }
}
