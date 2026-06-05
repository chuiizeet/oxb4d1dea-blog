// Crea el bucket "media" (público) en Supabase Storage si no existe.
// Uso: node --env-file=.env scripts/setup-storage.mjs
import { createClient } from '@supabase/supabase-js';

const url = process.env.PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error('Faltan PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY en .env');
  process.exit(1);
}
const sb = createClient(url, key, { auth: { persistSession: false } });

const { data: buckets, error: listErr } = await sb.storage.listBuckets();
if (listErr) {
  console.error('Error listando buckets:', listErr.message);
  process.exit(1);
}
if (buckets?.some((b) => b.name === 'media')) {
  console.log('bucket "media" ya existe ✓');
} else {
  const { error } = await sb.storage.createBucket('media', { public: true });
  if (error) {
    console.error('Error creando bucket:', error.message);
    process.exit(1);
  }
  console.log('bucket "media" creado (público) ✓');
}
