-- ==============================================================================
-- CÓDICE — Migración Inicial (0001_init.sql)
-- Esquema completo de base de datos y políticas de Row Level Security (RLS)
-- ==============================================================================

-- 1. Perfiles de usuario vinculados a auth.users
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  plan text not null default 'free',
  created_at timestamptz default now()
);

-- 2. Mundos (universos de worldbuilding creados por el autor)
create table public.worlds (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  description text default '',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 3. Entradas del códice (personaje, facción, lugar, magia, evento, término)
create table public.entries (
  id uuid primary key default gen_random_uuid(),
  world_id uuid not null references public.worlds(id) on delete cascade,
  type text not null check (type in ('personaje','faccion','lugar','magia','evento','termino')),
  name text not null,
  summary text default '',
  details text default '',
  tags text[] default '{}',
  date_in_world text default '',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 4. Relaciones entre entradas del códice
create table public.entry_relations (
  id uuid primary key default gen_random_uuid(),
  world_id uuid not null references public.worlds(id) on delete cascade,
  from_entry_id uuid not null references public.entries(id) on delete cascade,
  to_entry_id uuid not null references public.entries(id) on delete cascade,
  relation_type text not null,
  note text default ''
);

-- 5. Estante de investigación (libros y referencias externas)
create table public.research_shelf (
  id uuid primary key default gen_random_uuid(),
  world_id uuid not null references public.worlds(id) on delete cascade,
  external_id text not null,
  title text not null,
  authors text default '',
  year text default '',
  thumbnail_url text default '',
  note text default '',
  created_at timestamptz default now()
);

-- 6. Conversaciones con el Oráculo
create table public.oracle_conversations (
  id uuid primary key default gen_random_uuid(),
  world_id uuid not null references public.worlds(id) on delete cascade,
  created_at timestamptz default now()
);

-- 7. Mensajes del Oráculo
create table public.oracle_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.oracle_conversations(id) on delete cascade,
  role text not null check (role in ('user','assistant')),
  content text not null,
  created_at timestamptz default now()
);

-- ==============================================================================
-- Índices para optimización de consultas
-- ==============================================================================
create index idx_worlds_owner on public.worlds(owner_id);
create index idx_entries_world on public.entries(world_id);
create index idx_entries_type on public.entries(world_id, type);
create index idx_entry_relations_world on public.entry_relations(world_id);
create index idx_entry_relations_from on public.entry_relations(from_entry_id);
create index idx_entry_relations_to on public.entry_relations(to_entry_id);
create index idx_research_shelf_world on public.research_shelf(world_id);
create index idx_oracle_conversations_world on public.oracle_conversations(world_id);
create index idx_oracle_messages_conversation on public.oracle_messages(conversation_id);

-- ==============================================================================
-- Trigger para creación automática de perfil al registrarse un usuario
-- ==============================================================================
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'display_name', new.raw_user_meta_data->>'name', split_part(new.email, '@', 1))
  );
  return new;
end;
$$ language plpgsql security definer;

create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ==============================================================================
-- Habilitación y configuración de Row Level Security (RLS)
-- ==============================================================================

-- PROFILES
alter table public.profiles enable row level security;

create policy "select_own_profile"
  on public.profiles for select
  using (id = auth.uid());

create policy "insert_own_profile"
  on public.profiles for insert
  with check (id = auth.uid());

create policy "update_own_profile"
  on public.profiles for update
  using (id = auth.uid());

create policy "delete_own_profile"
  on public.profiles for delete
  using (id = auth.uid());

-- WORLDS
alter table public.worlds enable row level security;

create policy "select_own_worlds"
  on public.worlds for select
  using (owner_id = auth.uid());

create policy "insert_own_worlds"
  on public.worlds for insert
  with check (owner_id = auth.uid());

create policy "update_own_worlds"
  on public.worlds for update
  using (owner_id = auth.uid());

create policy "delete_own_worlds"
  on public.worlds for delete
  using (owner_id = auth.uid());

-- ENTRIES
alter table public.entries enable row level security;

create policy "select_own_entries"
  on public.entries for select
  using (world_id in (select id from public.worlds where owner_id = auth.uid()));

create policy "insert_own_entries"
  on public.entries for insert
  with check (world_id in (select id from public.worlds where owner_id = auth.uid()));

create policy "update_own_entries"
  on public.entries for update
  using (world_id in (select id from public.worlds where owner_id = auth.uid()));

create policy "delete_own_entries"
  on public.entries for delete
  using (world_id in (select id from public.worlds where owner_id = auth.uid()));

-- ENTRY RELATIONS
alter table public.entry_relations enable row level security;

create policy "select_own_entry_relations"
  on public.entry_relations for select
  using (world_id in (select id from public.worlds where owner_id = auth.uid()));

create policy "insert_own_entry_relations"
  on public.entry_relations for insert
  with check (world_id in (select id from public.worlds where owner_id = auth.uid()));

create policy "update_own_entry_relations"
  on public.entry_relations for update
  using (world_id in (select id from public.worlds where owner_id = auth.uid()));

create policy "delete_own_entry_relations"
  on public.entry_relations for delete
  using (world_id in (select id from public.worlds where owner_id = auth.uid()));

-- RESEARCH SHELF
alter table public.research_shelf enable row level security;

create policy "select_own_research_shelf"
  on public.research_shelf for select
  using (world_id in (select id from public.worlds where owner_id = auth.uid()));

create policy "insert_own_research_shelf"
  on public.research_shelf for insert
  with check (world_id in (select id from public.worlds where owner_id = auth.uid()));

create policy "update_own_research_shelf"
  on public.research_shelf for update
  using (world_id in (select id from public.worlds where owner_id = auth.uid()));

create policy "delete_own_research_shelf"
  on public.research_shelf for delete
  using (world_id in (select id from public.worlds where owner_id = auth.uid()));

-- ORACLE CONVERSATIONS
alter table public.oracle_conversations enable row level security;

create policy "select_own_oracle_conversations"
  on public.oracle_conversations for select
  using (world_id in (select id from public.worlds where owner_id = auth.uid()));

create policy "insert_own_oracle_conversations"
  on public.oracle_conversations for insert
  with check (world_id in (select id from public.worlds where owner_id = auth.uid()));

create policy "update_own_oracle_conversations"
  on public.oracle_conversations for update
  using (world_id in (select id from public.worlds where owner_id = auth.uid()));

create policy "delete_own_oracle_conversations"
  on public.oracle_conversations for delete
  using (world_id in (select id from public.worlds where owner_id = auth.uid()));

-- ORACLE MESSAGES
alter table public.oracle_messages enable row level security;

create policy "select_own_oracle_messages"
  on public.oracle_messages for select
  using (
    conversation_id in (
      select oc.id from public.oracle_conversations oc
      join public.worlds w on oc.world_id = w.id
      where w.owner_id = auth.uid()
    )
  );

create policy "insert_own_oracle_messages"
  on public.oracle_messages for insert
  with check (
    conversation_id in (
      select oc.id from public.oracle_conversations oc
      join public.worlds w on oc.world_id = w.id
      where w.owner_id = auth.uid()
    )
  );

create policy "update_own_oracle_messages"
  on public.oracle_messages for update
  using (
    conversation_id in (
      select oc.id from public.oracle_conversations oc
      join public.worlds w on oc.world_id = w.id
      where w.owner_id = auth.uid()
    )
  );

create policy "delete_own_oracle_messages"
  on public.oracle_messages for delete
  using (
    conversation_id in (
      select oc.id from public.oracle_conversations oc
      join public.worlds w on oc.world_id = w.id
      where w.owner_id = auth.uid()
    )
  );
