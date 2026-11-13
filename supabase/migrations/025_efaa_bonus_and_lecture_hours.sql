-- Bonus 24h (100 pts → +15 board, match cap 50) + Level 0/1 class start times.

create table if not exists public.efaa_bonus_window (
  id text primary key default 'main',
  open boolean not null default false,
  expires_at timestamptz,
  updated_at timestamptz not null default now()
);

insert into public.efaa_bonus_window (id, open)
values ('main', false)
on conflict (id) do nothing;

alter table public.efaa_bonus_window enable row level security;
alter table public.efaa_bonus_window replica identity full;

drop policy if exists efaa_bonus_window_select on public.efaa_bonus_window;
create policy efaa_bonus_window_select on public.efaa_bonus_window for select using (true);
grant select on public.efaa_bonus_window to anon, authenticated;

create table if not exists public.efaa_lecture_hours (
  band text primary key check (band in ('0', '1')),
  start_at text not null,
  weekdays integer[] not null default '{2,4,6}',
  updated_at timestamptz not null default now()
);

insert into public.efaa_lecture_hours (band, start_at, weekdays)
values
  ('0', '21:30', '{2,4,6}'),
  ('1', '20:30', '{2,4,6}')
on conflict (band) do nothing;

alter table public.efaa_lecture_hours enable row level security;
alter table public.efaa_lecture_hours replica identity full;

drop policy if exists efaa_lecture_hours_select on public.efaa_lecture_hours;
create policy efaa_lecture_hours_select on public.efaa_lecture_hours for select using (true);
grant select on public.efaa_lecture_hours to anon, authenticated;

create or replace function public.efaa_bonus_active()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.efaa_bonus_window
    where id = 'main'
      and open
      and expires_at is not null
      and expires_at > now()
  );
$$;

create or replace function public.efaa_set_bonus_24h(p_open boolean, p_code text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  rec public.efaa_bonus_window%rowtype;
begin
  if regexp_replace(coalesce(p_code, ''), '[^0-9]', '', 'g') <> '0680' then
    raise exception 'admin only';
  end if;

  insert into public.efaa_bonus_window (id, open, expires_at, updated_at)
  values (
    'main',
    coalesce(p_open, false),
    case when coalesce(p_open, false) then now() + interval '24 hours' else null end,
    now()
  )
  on conflict (id) do update
    set open = excluded.open,
        expires_at = excluded.expires_at,
        updated_at = now();

  select * into rec from public.efaa_bonus_window where id = 'main';
  return to_jsonb(rec);
end;
$$;

create or replace function public.efaa_set_lecture_hours(
  p_band text,
  p_start_at text,
  p_weekdays integer[],
  p_code text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  rec public.efaa_lecture_hours%rowtype;
  start_txt text := substr(coalesce(p_start_at, '21:00'), 1, 5);
  days integer[] := coalesce(p_weekdays, '{2,4,6}');
begin
  if regexp_replace(coalesce(p_code, ''), '[^0-9]', '', 'g') <> '0680' then
    raise exception 'admin only';
  end if;
  if p_band not in ('0', '1') then
    raise exception 'band';
  end if;
  if start_txt !~ '^[0-2][0-9]:[0-5][0-9]$' then
    start_txt := '21:00';
  end if;
  days := (
    select coalesce(array_agg(distinct d order by d), '{2,4,6}')
    from unnest(days) as d
    where d between 0 and 6
  );

  insert into public.efaa_lecture_hours (band, start_at, weekdays, updated_at)
  values (p_band, start_txt, days, now())
  on conflict (band) do update
    set start_at = excluded.start_at,
        weekdays = excluded.weekdays,
        updated_at = now();

  select * into rec from public.efaa_lecture_hours where band = p_band;
  return to_jsonb(rec);
end;
$$;

grant execute on function public.efaa_bonus_active() to anon, authenticated;
grant execute on function public.efaa_set_bonus_24h(boolean, text) to anon, authenticated;
grant execute on function public.efaa_set_lecture_hours(text, text, integer[], text) to anon, authenticated;

-- Convert 20-point blocks back to a personal-points watermark.
update public.efaa_user_game_state
set last_board_threshold = last_board_threshold * 20
where last_board_threshold > 0
  and last_board_threshold * 20 <= personal_points + 19
  and last_board_threshold < greatest(personal_points / 5, 1);

create or replace function public.efaa_flush_game_board_bonus(p_user_id text)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  rec public.efaa_user_game_state%rowtype;
  bonus boolean := public.efaa_bonus_active();
  watermark integer;
  pts integer;
  prev_blocks integer;
  next_blocks integer;
  awarded integer := 0;
  new_watermark integer;
  grant_row jsonb;
begin
  if p_user_id is null or length(trim(p_user_id)) = 0 or p_user_id = 'efaa-admin' then
    return 0;
  end if;

  select * into rec from public.efaa_user_game_state where user_id = p_user_id for update;
  if rec.user_id is null then
    return 0;
  end if;

  watermark := coalesce(rec.last_board_threshold, 0);
  pts := coalesce(rec.personal_points, 0);

  if bonus then
    prev_blocks := floor(watermark / 100.0)::integer;
    next_blocks := floor(pts / 100.0)::integer;
    awarded := greatest(next_blocks - prev_blocks, 0) * 15;
    new_watermark := next_blocks * 100;
  else
    prev_blocks := floor(watermark / 20.0)::integer;
    next_blocks := floor(pts / 20.0)::integer;
    awarded := greatest(next_blocks - prev_blocks, 0);
    new_watermark := next_blocks * 20;
  end if;

  if awarded <= 0 then
    return 0;
  end if;

  update public.efaa_user_game_state
  set last_board_threshold = new_watermark,
      updated_at = now()
  where user_id = p_user_id;

  grant_row := public.efaa_grant_class_points(p_user_id, awarded);
  return coalesce((grant_row->>'points_gained')::integer, 0);
end;
$$;

create or replace function public.efaa_award_match_points(
  p_user_id text,
  p_speech_seconds integer
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  rec public.efaa_user_gamification%rowtype;
  today date := public.efaa_academy_today();
  speech integer := least(greatest(coalesce(p_speech_seconds, 0), 0), 1800);
  wanted integer;
  grant_row jsonb;
begin
  if p_user_id is null or length(trim(p_user_id)) = 0 then
    raise exception 'user_id required';
  end if;

  wanted := 10 + (speech / 10);
  if public.efaa_bonus_active() then
    wanted := least(wanted, 50);
  end if;

  insert into public.efaa_user_gamification (user_id)
  values (p_user_id)
  on conflict (user_id) do nothing;

  select * into rec
  from public.efaa_user_gamification
  where user_id = p_user_id
  for update;

  if rec.last_activity_date is distinct from today then
    rec.matchs_tonight_count := 0;
  end if;

  if rec.last_activity_date is null then
    rec.current_streak := 1;
  elsif rec.last_activity_date = today then
    null;
  elsif rec.last_activity_date = today - 1 then
    rec.current_streak := rec.current_streak + 1;
  else
    rec.current_streak := 1;
  end if;

  rec.matchs_tonight_count := rec.matchs_tonight_count + 1;
  rec.last_activity_date := today;

  update public.efaa_user_gamification
  set current_streak = rec.current_streak,
      last_activity_date = rec.last_activity_date,
      matchs_tonight_count = rec.matchs_tonight_count,
      updated_at = now()
  where user_id = p_user_id
  returning * into rec;

  grant_row := public.efaa_grant_class_points(p_user_id, wanted);

  return jsonb_build_object(
    'total_points', (grant_row->>'total_points')::integer,
    'diamonds_count', (grant_row->>'diamonds_count')::integer,
    'current_streak', rec.current_streak,
    'matchs_tonight_count', rec.matchs_tonight_count,
    'points_gained', (grant_row->>'points_gained')::integer,
    'diamonds_gained', (grant_row->>'diamonds_gained')::integer,
    'daily_remaining', (grant_row->>'daily_remaining')::integer
  );
end;
$$;

grant execute on function public.efaa_flush_game_board_bonus(text) to anon, authenticated;
grant execute on function public.efaa_award_match_points(text, integer) to anon, authenticated;

do $$
begin
  begin
    alter publication supabase_realtime add table public.efaa_bonus_window;
  exception
    when duplicate_object then null;
    when undefined_object then null;
  end;
  begin
    alter publication supabase_realtime add table public.efaa_lecture_hours;
  exception
    when duplicate_object then null;
    when undefined_object then null;
  end;
end $$;
