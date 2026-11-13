-- Master live-doors override. Students read it; only admin code 0680 can write via RPC.
create table if not exists public.efaa_doors (
  id integer primary key default 1 check (id = 1),
  force_open boolean not null default false,
  updated_at timestamptz not null default now(),
  updated_by text
);

insert into public.efaa_doors (id, force_open)
values (1, false)
on conflict (id) do nothing;

alter table public.efaa_doors enable row level security;
alter table public.efaa_doors replica identity full;

drop policy if exists efaa_doors_select on public.efaa_doors;
create policy efaa_doors_select on public.efaa_doors for select using (true);

grant select on public.efaa_doors to anon, authenticated;

create or replace function public.efaa_set_doors(p_open boolean, p_code text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  if regexp_replace(coalesce(p_code, ''), '[^0-9]', '', 'g') <> '0680' then
    raise exception 'admin only';
  end if;

  insert into public.efaa_doors (id, force_open, updated_at, updated_by)
  values (1, coalesce(p_open, false), now(), 'admin')
  on conflict (id) do update
    set force_open = excluded.force_open,
        updated_at = now(),
        updated_by = 'admin';

  return coalesce(p_open, false);
end;
$$;

grant execute on function public.efaa_set_doors(boolean, text) to anon, authenticated;

do $$
begin
  begin
    alter publication supabase_realtime add table public.efaa_doors;
  exception
    when duplicate_object then null;
    when undefined_object then null;
  end;
end $$;
