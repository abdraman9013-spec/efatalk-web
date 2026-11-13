-- Level 0 lesson unlock + student work (watched / exo / test).

create table if not exists public.efaa_lesson_unlock (
  band text not null check (band in ('0', '1')),
  lesson_no integer not null check (lesson_no >= 1),
  unlocked boolean not null default false,
  unlocked_at timestamptz,
  updated_at timestamptz not null default now(),
  primary key (band, lesson_no)
);

insert into public.efaa_lesson_unlock (band, lesson_no, unlocked)
select '0', g, false from generate_series(1, 8) as g
on conflict do nothing;

alter table public.efaa_lesson_unlock enable row level security;
alter table public.efaa_lesson_unlock replica identity full;

drop policy if exists efaa_lesson_unlock_select on public.efaa_lesson_unlock;
create policy efaa_lesson_unlock_select on public.efaa_lesson_unlock for select using (true);
grant select on public.efaa_lesson_unlock to anon, authenticated;

create table if not exists public.efaa_lesson_work (
  user_id text not null,
  band text not null check (band in ('0', '1')),
  lesson_no integer not null,
  watched boolean not null default false,
  exo_done boolean not null default false,
  exo_score integer not null default 0,
  exo_total integer not null default 0,
  test_best integer not null default 0,
  updated_at timestamptz not null default now(),
  primary key (user_id, band, lesson_no)
);

alter table public.efaa_lesson_work enable row level security;
alter table public.efaa_lesson_work replica identity full;

drop policy if exists efaa_lesson_work_select on public.efaa_lesson_work;
create policy efaa_lesson_work_select on public.efaa_lesson_work for select using (true);
grant select on public.efaa_lesson_work to anon, authenticated;

create or replace function public.efaa_set_lesson_unlock(
  p_band text,
  p_lesson_no integer,
  p_open boolean,
  p_code text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  rec public.efaa_lesson_unlock%rowtype;
  band_ok text := case when p_band = '1' then '1' else '0' end;
begin
  if regexp_replace(coalesce(p_code, ''), '[^0-9]', '', 'g') <> '0680' then
    raise exception 'admin only';
  end if;

  insert into public.efaa_lesson_unlock (band, lesson_no, unlocked, unlocked_at, updated_at)
  values (
    band_ok,
    greatest(p_lesson_no, 1),
    coalesce(p_open, false),
    case when coalesce(p_open, false) then now() else null end,
    now()
  )
  on conflict (band, lesson_no) do update
    set unlocked = excluded.unlocked,
        unlocked_at = excluded.unlocked_at,
        updated_at = now();

  select * into rec from public.efaa_lesson_unlock
  where band = band_ok and lesson_no = greatest(p_lesson_no, 1);
  return to_jsonb(rec);
end;
$$;

create or replace function public.efaa_save_lesson_work(
  p_user_id text,
  p_band text,
  p_lesson_no integer,
  p_watched boolean,
  p_exo_done boolean,
  p_exo_score integer,
  p_exo_total integer,
  p_test_best integer
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  rec public.efaa_lesson_work%rowtype;
  band_ok text := case when p_band = '1' then '1' else '0' end;
begin
  if coalesce(p_user_id, '') = '' then
    raise exception 'missing user';
  end if;

  insert into public.efaa_lesson_work (
    user_id, band, lesson_no, watched, exo_done, exo_score, exo_total, test_best, updated_at
  )
  values (
    p_user_id,
    band_ok,
    greatest(p_lesson_no, 1),
    coalesce(p_watched, false),
    coalesce(p_exo_done, false),
    coalesce(p_exo_score, 0),
    coalesce(p_exo_total, 0),
    coalesce(p_test_best, 0),
    now()
  )
  on conflict (user_id, band, lesson_no) do update
    set watched = case when p_watched is null then efaa_lesson_work.watched else p_watched end,
        exo_done = case when p_exo_done is null then efaa_lesson_work.exo_done else p_exo_done end,
        exo_score = case when p_exo_score is null then efaa_lesson_work.exo_score else p_exo_score end,
        exo_total = case when p_exo_total is null then efaa_lesson_work.exo_total else p_exo_total end,
        test_best = greatest(efaa_lesson_work.test_best, coalesce(p_test_best, 0)),
        updated_at = now();

  select * into rec from public.efaa_lesson_work
  where user_id = p_user_id and band = band_ok and lesson_no = greatest(p_lesson_no, 1);
  return to_jsonb(rec);
end;
$$;

grant execute on function public.efaa_set_lesson_unlock(text, integer, boolean, text) to anon, authenticated;
grant execute on function public.efaa_save_lesson_work(text, text, integer, boolean, boolean, integer, integer, integer) to anon, authenticated;

do $$
begin
  alter publication supabase_realtime add table public.efaa_lesson_unlock;
exception
  when duplicate_object then null;
end $$;
