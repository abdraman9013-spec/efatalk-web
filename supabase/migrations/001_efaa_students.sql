create table if not exists efaa_students (
  id uuid primary key default gen_random_uuid(),
  first_name text not null,
  last_name text not null,
  status text not null,
  nationality text not null,
  city text not null,
  whatsapp text not null unique,
  level text not null check (level in ('beginner', 'intermediate', 'advanced')),
  photo_url text,
  streak integer not null default 1,
  created_at timestamptz not null default now()
);

alter table efaa_students enable row level security;
