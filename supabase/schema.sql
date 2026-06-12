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

-- ── Perfil (una sola fila): nombre + avatar del menú ───────────────────
create table if not exists profile (
  id          boolean primary key default true,
  name        text not null default 'Chuy',
  avatar      text not null default '/pfp.jpg',
  updated_at  timestamptz not null default now(),
  constraint profile_single check (id)
);
insert into profile (id) values (true) on conflict (id) do nothing;

alter table profile enable row level security;
drop policy if exists "public read profile" on profile;
create policy "public read profile" on profile for select using (true);
drop policy if exists "auth write profile" on profile;
create policy "auth write profile" on profile for all to authenticated using (true) with check (true);

-- ── Imágenes adjuntas por entrada (galería tipo Polaroid) ──────────────
-- array jsonb de { url, caption }
alter table entries add column if not exists attachments jsonb not null default '[]';

-- status del menú: 'auto' (según el último diario) o un id de condition fijo
alter table profile add column if not exists status text not null default 'auto';

-- ── ITEMS del inventario (libro/álbum/juego…) + su historial ───────────
create table if not exists items (
  id          uuid primary key default gen_random_uuid(),
  title       text not null default '',
  sub         text not null default '',
  description text not null default '',
  cover       text not null default '',
  url         text not null default '',
  icon        text not null default '',
  position    int  not null default 0,
  published   boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists items_position_idx on items (position, created_at);

create table if not exists item_revisions (
  id          uuid primary key default gen_random_uuid(),
  item_id     uuid references items(id) on delete cascade,
  snapshot    jsonb not null,
  note        text,
  created_at  timestamptz not null default now()
);
create index if not exists item_revisions_idx on item_revisions (item_id, created_at desc);

drop trigger if exists items_updated_at on items;
create trigger items_updated_at before update on items
  for each row execute function set_updated_at();

alter table items          enable row level security;
alter table item_revisions enable row level security;
drop policy if exists "public read items" on items;
create policy "public read items" on items for select using (published = true);
drop policy if exists "auth write items" on items;
create policy "auth write items" on items for all to authenticated using (true) with check (true);
drop policy if exists "auth item_revisions" on item_revisions;
create policy "auth item_revisions" on item_revisions for all to authenticated using (true) with check (true);

-- seed inicial (solo si no hay items)
insert into items (title, sub, description, icon, position)
select * from (values
  ('Libro actual', '(autor)', '', '📖', 0),
  ('Álbum del momento', '(artista)', '', '💿', 1),
  ('Jugando', '(juego)', '', '🎮', 2)
) as v(title, sub, description, icon, position)
where not exists (select 1 from items);

-- ── SECCIONES (slots del inventario: Libro/Álbum/Juego…) ───────────────
-- Cada sección tiene un item "actual" + items anteriores (archivados).
create table if not exists sections (
  id          uuid primary key default gen_random_uuid(),
  label       text not null default '',
  icon        text not null default '',
  position    int  not null default 0,
  published   boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists sections_position_idx on sections (position, created_at);
drop trigger if exists sections_updated_at on sections;
create trigger sections_updated_at before update on sections
  for each row execute function set_updated_at();
alter table sections enable row level security;
drop policy if exists "public read sections" on sections;
create policy "public read sections" on sections for select using (published = true);
drop policy if exists "auth write sections" on sections;
create policy "auth write sections" on sections for all to authenticated using (true) with check (true);

-- items ahora pertenecen a una sección y pueden ser actual o archivados
alter table items add column if not exists section_id uuid references sections(id) on delete cascade;
alter table items add column if not exists current boolean not null default true;
alter table items add column if not exists started_at timestamptz not null default now();
create index if not exists items_section_idx on items (section_id, current, started_at desc);

-- ── slot: dónde se muestra la sección ──────────────────────────────────
-- 'grid' (rejilla de items, por defecto) | 'equip' | 'disc' (slots del header del menú)
alter table sections add column if not exists slot text not null default 'grid';

-- slots fijos del header (EQUIP + disco), con su propio historial. Solo en el header.
insert into sections (label, icon, position, slot)
select 'Equip', '🎒', 10, 'equip' where not exists (select 1 from sections where slot = 'equip');
insert into sections (label, icon, position, slot)
select 'Disco', '📀', 11, 'disc' where not exists (select 1 from sections where slot = 'disc');
