-- Private invitation codes for official student onboarding (launch emergency).
-- Keeps efaa_web.issued_codes in sync for backward compatibility with older flows.

create table if not exists public.invitation_codes (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  is_used boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists invitation_codes_created_at_idx
  on public.invitation_codes (created_at desc);

alter table public.invitation_codes enable row level security;

drop policy if exists invitation_codes_select on public.invitation_codes;
create policy invitation_codes_select
  on public.invitation_codes for select
  to anon, authenticated
  using (true);

drop policy if exists invitation_codes_insert on public.invitation_codes;
create policy invitation_codes_insert
  on public.invitation_codes for insert
  to anon, authenticated
  with check (true);

drop policy if exists invitation_codes_update on public.invitation_codes;
create policy invitation_codes_update
  on public.invitation_codes for update
  to anon, authenticated
  using (true)
  with check (true);

grant select, insert, update on public.invitation_codes to anon, authenticated;
