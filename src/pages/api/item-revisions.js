import { getItemRevisions } from '../../lib/db.js';

export async function GET({ url }) {
  const id = url.searchParams.get('itemId');
  if (!id) return new Response('Falta itemId', { status: 400 });
  try {
    const rows = await getItemRevisions(id);
    return new Response(JSON.stringify(rows), { headers: { 'content-type': 'application/json' } });
  } catch (e) {
    return new Response('Error: ' + e.message, { status: 500 });
  }
}
