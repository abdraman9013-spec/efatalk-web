create table if not exists public.efaa_web (
  id text primary key default 'main',
  session_days text[] not null default array['tue','thu','sat','sun']::text[],
  session_start text not null default '21:00',
  session_end text not null default '22:00',
  topics jsonb not null default '{}'::jsonb,
  next_student_n integer not null default 1,
  issued_codes text[] not null default '{}'::text[],
  updated_at timestamptz not null default now()
);

create table if not exists public.efaa_active_students (
  id uuid primary key default gen_random_uuid(),
  access_code text not null unique,
  email text not null unique,
  first_name text not null,
  last_name text not null,
  status text not null,
  nationality text not null,
  city text not null,
  whatsapp text not null,
  level text not null check (level in ('beginner', 'intermediate', 'advanced')),
  photo_url text,
  amount_paid numeric not null default 0,
  amount_due numeric not null default 0,
  created_at timestamptz not null default now()
);
