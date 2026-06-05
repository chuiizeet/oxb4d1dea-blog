-- Esquema del blog/diario. Córrelo en Supabase (SQL Editor) una vez.

-- ── Entradas (diario + blog) ───────────────────────────────────────────
create table if not exists entries (
  id          uuid primary key default gen_random_uuid(),
  type        text not null check (type in ('diario', 'blog')),
  slug        text not null,
  title       text not null,
  body        text not null default '',
  mood        text,                                   -- diario (texto: tired, triste, feliz…)
  exfile      int  check (exfile between 1 and 16),   -- imagen EX file (diario)
  image       text,                                   -- override de imagen (ruta/URL)
  summary     text,                                   -- blog
  tags        text[] not null default '{}',
  date        timestamptz not null default now(),
  published   boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (type, slug)
);
create index if not exists entries_type_date_idx on entries (type, date desc);

-- ── Media (fotos / videos / conciertos…) ───────────────────────────────
create table if not exists media (
  id          uuid primary key default gen_random_uuid(),
  entry_id    uuid references entries(id) on delete set null,
  kind        text not null check (kind in ('photo', 'video', 'audio', 'other')),
  url         text not null,                          -- en Supabase Storage / R2
  caption     text,
  meta        jsonb not null default '{}',
  created_at  timestamptz not null default now()
);
create index if not exists media_entry_idx on media (entry_id, created_at desc);

-- ── Revisions = "registro de todo, cambios" ────────────────────────────
-- una fila por cada guardado, con snapshot completo de la entrada.
create table if not exists revisions (
  id          uuid primary key default gen_random_uuid(),
  entry_id    uuid references entries(id) on delete cascade,
  snapshot    jsonb not null,                         -- copia de la entrada al guardar
  note        text,
  created_at  timestamptz not null default now()
);
create index if not exists revisions_entry_idx on revisions (entry_id, created_at desc);

-- ── updated_at automático ──────────────────────────────────────────────
create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;
drop trigger if exists entries_updated_at on entries;
create trigger entries_updated_at before update on entries
  for each row execute function set_updated_at();

-- ── RLS: lectura pública de lo publicado; escritura solo autenticado ────
-- (el servidor SSR usa la service_role y omite RLS; esto protege al cliente anon)
alter table entries   enable row level security;
alter table media     enable row level security;
alter table revisions enable row level security;

drop policy if exists "public read entries" on entries;
create policy "public read entries" on entries
  for select using (published = true);

drop policy if exists "auth write entries" on entries;
create policy "auth write entries" on entries
  for all to authenticated using (true) with check (true);

drop policy if exists "public read media" on media;
create policy "public read media" on media
  for select using (true);

drop policy if exists "auth write media" on media;
create policy "auth write media" on media
  for all to authenticated using (true) with check (true);

drop policy if exists "auth all revisions" on revisions;
create policy "auth all revisions" on revisions
  for all to authenticated using (true) with check (true);
