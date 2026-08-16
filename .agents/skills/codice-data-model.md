---
name: codice-data-model
description: Esquema de base de datos de Códice en Supabase/Postgres, incluyendo políticas de Row Level Security. Úsala para cualquier migración, query, o feature que lea o escriba datos.
---

# Modelo de datos de Códice

Fuente de verdad del esquema. Cualquier cambio de estructura se refleja acá en el mismo commit que lo introduce.

```sql
create table profiles (
  id uuid primary key references auth.users(id),
  display_name text,
  plan text not null default 'free',
  created_at timestamptz default now()
);

create table worlds (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references profiles(id),
  name text not null,
  description text default '',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table entries (
  id uuid primary key default gen_random_uuid(),
  world_id uuid not null references worlds(id) on delete cascade,
  type text not null check (type in ('personaje','faccion','lugar','magia','evento','termino')),
  name text not null,
  summary text default '',
  details text default '',
  tags text[] default '{}',
  date_in_world text default '',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table entry_relations (
  id uuid primary key default gen_random_uuid(),
  world_id uuid not null references worlds(id) on delete cascade,
  from_entry_id uuid not null references entries(id) on delete cascade,
  to_entry_id uuid not null references entries(id) on delete cascade,
  relation_type text not null,
  note text default ''
);

create table research_shelf (
  id uuid primary key default gen_random_uuid(),
  world_id uuid not null references worlds(id) on delete cascade,
  external_id text not null,
  title text not null,
  authors text default '',
  year text default '',
  thumbnail_url text default '',
  note text default '',
  created_at timestamptz default now()
);

create table oracle_conversations (
  id uuid primary key default gen_random_uuid(),
  world_id uuid not null references worlds(id) on delete cascade,
  created_at timestamptz default now()
);

create table oracle_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references oracle_conversations(id) on delete cascade,
  role text not null check (role in ('user','assistant')),
  content text not null,
  created_at timestamptz default now()
);
```

## Patrón de RLS (aplicar a cada tabla con datos de usuario)

```sql
alter table worlds enable row level security;

create policy "select_own_worlds"
  on worlds for select using (owner_id = auth.uid());

create policy "insert_own_worlds"
  on worlds for insert with check (owner_id = auth.uid());

create policy "update_own_worlds"
  on worlds for update using (owner_id = auth.uid());

create policy "delete_own_worlds"
  on worlds for delete using (owner_id = auth.uid());
```

Para tablas hijas (`entries`, `entry_relations`, `research_shelf`, `oracle_conversations`, `oracle_messages`), la política filtra por pertenencia indirecta, por ejemplo:

```sql
alter table entries enable row level security;

create policy "select_own_entries"
  on entries for select using (
    world_id in (select id from worlds where owner_id = auth.uid())
  );
-- repetir el patrón para insert/update/delete
```

## Convenciones
- PKs siempre `uuid default gen_random_uuid()`.
- Columnas en `snake_case`.
- `type` de `entries` es un enum cerrado vía `check` — no se agregan tipos nuevos sin actualizar esta skill y el resto de la UI que itera sobre los tipos.
- Las tablas de suscripción/pago (`subscriptions`) se agregan en la fase de monetización, no en el MVP de beta.
