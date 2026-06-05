import { supabaseAdmin } from '../../lib/supabase.js';
import { addMedia } from '../../lib/db.js';

function kindOf(type = '') {
  if (type.startsWith('video')) return 'video';
  if (type.startsWith('image')) return 'photo';
  if (type.startsWith('audio')) return 'audio';
  return 'other';
}

export async function POST({ request }) {
  if (!supabaseAdmin) return new Response('Storage no configurado (faltan llaves Supabase)', { status: 500 });
  const form = await request.formData();
  const file = form.get('file');
  if (!file || typeof file === 'string') return new Response('Falta archivo', { status: 400 });

  const ext = (file.name?.split('.').pop() || 'bin').toLowerCase().replace(/[^a-z0-9]/g, '');
  const path = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const buf = Buffer.from(await file.arrayBuffer());

  const { error } = await supabaseAdmin.storage.from('media').upload(path, buf, {
    contentType: file.type || 'application/octet-stream',
    upsert: false,
  });
  if (error) return new Response('Error subiendo: ' + error.message, { status: 500 });

  const { data } = supabaseAdmin.storage.from('media').getPublicUrl(path);
  const kind = kindOf(file.type);
  try {
    await addMedia(null, kind, data.publicUrl, file.name || null);
  } catch {
    // el registro en `media` es opcional; el archivo ya está subido
  }
  return new Response(JSON.stringify({ url: data.publicUrl, kind }), {
    headers: { 'content-type': 'application/json' },
  });
}
