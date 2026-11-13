-- Private training applications + seat caps (official path only).

create table if not exists public.efaa_formation_seats (
  level text primary key check (level in ('level0', 'level1')),
  seats_total integer not null default 9 check (seats_total >= 0),
  updated_at timestamptz not null default now()
);

insert into public.efaa_formation_seats (level, seats_total)
values ('level0', 9), ('level1', 9)
on conflict (level) do nothing;

create table if not exists public.efaa_formation_applications (
  id uuid primary key default gen_random_uuid(),
  level text not null check (level in ('level0', 'level1')),
  expected_first_amount numeric not null,
  amount_second numeric not null default 0,
  amount_total numeric not null,
  amount_list numeric not null,
  status text not null default 'pending'
    check (status in ('pending', 'approved', 'denied')),
  screenshot_url text not null default '',
  ocr_raw text not null default '',
  ocr_amount numeric,
  ocr_phone text not null default '',
  ocr_ok boolean not null default false,
  full_name text not null default '',
  country text not null default '',
  email text not null default '',
  whatsapp text not null default '',
  auth_user_id uuid,
  access_code text,
  reminder_sent_at timestamptz,
  approved_at timestamptz,
  denied_at timestamptz,
  admin_note text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists efaa_formation_applications_status_idx
  on public.efaa_formation_applications (status, created_at desc);

create index if not exists efaa_formation_applications_level_status_idx
  on public.efaa_formation_applications (level, status);

alter table public.efaa_formation_seats enable row level security;
alter table public.efaa_formation_applications enable row level security;

drop policy if exists efaa_formation_seats_select on public.efaa_formation_seats;
create policy efaa_formation_seats_select
  on public.efaa_formation_seats for select
  to anon, authenticated
  using (true);

-- Applications are written via service role API only (no public write policies).

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'efaa-formation-receipts',
  'efaa-formation-receipts',
  false,
  3145728,
  array['image/jpeg', 'image/png', 'image/webp', 'image/jpg']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;
