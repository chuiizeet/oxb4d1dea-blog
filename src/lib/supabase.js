import { createClient } from '@supabase/supabase-js';

// en dev se leen de import.meta.env (.env); en producción de process.env (host)
const url = import.meta.env.PUBLIC_SUPABASE_URL ?? process.env.PUBLIC_SUPABASE_URL;
const anonKey = import.meta.env.PUBLIC_SUPABASE_ANON_KEY ?? process.env.PUBLIC_SUPABASE_ANON_KEY;
const serviceKey = import.meta.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;

// Cliente de SERVIDOR (SSR): service_role, acceso total. Nunca exponer al navegador.
export const supabaseAdmin =
  url && serviceKey ? createClient(url, serviceKey, { auth: { persistSession: false } }) : null;

// Cliente PÚBLICO (anon): para el navegador y el login.
export const supabaseAnon = url && anonKey ? createClient(url, anonKey) : null;

export const supabaseReady = Boolean(url && serviceKey);
