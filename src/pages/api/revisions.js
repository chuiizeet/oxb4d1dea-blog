import { getRevisions } from '../../lib/db.js';

export async function GET({ url }) {
  const id = url.searchParams.get('entryId');
  if (!id) return new Response('Falta entryId', { status: 400 });
  try {
    const rows = await getRevisions(id);
    return new Response(JSON.stringify(rows), { headers: { 'content-type': 'application/json' } });
  } catch (e) {
    return new Response('Error: ' + e.message, { status: 500 });
  }
}
