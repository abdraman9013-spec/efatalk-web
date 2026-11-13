-- Real class attendance for official Level 0 / Level 1.
-- Present = joined the lecture room OR completed a match that academy day.
-- Otherwise absent. Presence roll only shows people actually in the room.

create table if not exists public.efaa_attendance (
  user_id text not null,
  day date not null,
  source text not null check (source in ('lecture', 'match')),
  created_at timestamptz not null default now(),
  primary key (user_id, day)
);

create index if not exists efaa_attendance_day_idx on public.efaa_attendance (day);
alter table public.efaa_attendance enable row level security;

drop policy if exists efaa_attendance_read on public.efaa_attendance;
create policy efaa_attendance_read on public.efaa_attendance
  for select to anon, authenticated using (true);

create or replace function public.efaa_mark_present(p_user_id text, p_source text default 'lecture')
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  today date := public.efaa_academy_today();
  src text := lower(coalesce(nullif(trim(p_source), ''), 'lecture'));
begin
  if p_user_id is null or length(trim(p_user_id)) = 0 or p_user_id = 'efaa-admin' then
    return jsonb_build_object('ok', false, 'reason', 'bad_user');
  end if;
  if src not in ('lecture', 'match') then
    src := 'lecture';
  end if;

  insert into public.efaa_attendance (user_id, day, source)
  values (p_user_id, today, src)
  on conflict (user_id, day) do update
    set source = case
      when public.efaa_attendance.source = 'lecture' then 'lecture'
      else excluded.source
    end;

  return jsonb_build_object('ok', true, 'day', today, 'source', src);
end;
$$;

revoke all on function public.efaa_mark_present(text, text) from public;
grant execute on function public.efaa_mark_present(text, text) to anon, authenticated;

create or replace function public.efaa_attendance_days(p_user_id text)
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select count(*)::integer
  from public.efaa_attendance
  where user_id = p_user_id
    and day >= date '2026-09-15';
$$;

revoke all on function public.efaa_attendance_days(text) from public;
grant execute on function public.efaa_attendance_days(text) to anon, authenticated;

create or replace function public.efaa_tonight_attendance(p_levels text[] default array['beginner','intermediate'])
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(jsonb_agg(jsonb_build_object(
    'user_id', a.id::text,
    'first_name', a.first_name,
    'last_name', a.last_name,
    'level', a.level,
    'photo', coalesce(a.avatar_url, a.photo_url),
    'source', att.source,
    'present', true
  ) order by a.level, a.first_name), '[]'::jsonb)
  from public.efaa_attendance att
  join public.efaa_active_students a on a.id::text = att.user_id
  where att.day = public.efaa_academy_today()
    and a.level = any (p_levels);
$$;

revoke all on function public.efaa_tonight_attendance(text[]) from public;
grant execute on function public.efaa_tonight_attendance(text[]) to anon, authenticated;

-- Match night = present
create or replace function public.efaa_award_match_points(p_user_id text, p_speech_seconds integer)
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
  missed integer := 0;
  grace integer := 1;
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

  missed := public.efaa_missed_days(rec.last_activity_date, today);
  grace := public.efaa_streak_grace(rec.current_streak);

  if rec.last_activity_date is null then
    rec.current_streak := 1;
  elsif rec.last_activity_date = today then
    null;
  elsif rec.last_activity_date = today - 1 then
    rec.current_streak := rec.current_streak + 1;
  elsif missed < grace then
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
  perform public.efaa_mark_present(p_user_id, 'match');

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

-- Remove fake / stale presence for official L0+L1 who were absent yesterday AND the day before.
with chronic as (
  select a.id::text as uid
  from public.efaa_active_students a
  where a.level in ('beginner', 'intermediate')
    and not exists (
      select 1 from public.efaa_class_daily d
      where d.user_id = a.id::text
        and d.day = public.efaa_academy_today() - 1
        and d.granted > 0
    )
    and not exists (
      select 1 from public.efaa_class_daily d
      where d.user_id = a.id::text
        and d.day = public.efaa_academy_today() - 2
        and d.granted > 0
    )
    and not exists (
      select 1 from public.efaa_attendance x
      where x.user_id = a.id::text
        and x.day = public.efaa_academy_today() - 1
    )
    and not exists (
      select 1 from public.efaa_attendance x
      where x.user_id = a.id::text
        and x.day = public.efaa_academy_today() - 2
    )
)
delete from public.efaa_class_daily d
using chronic c
where d.user_id = c.uid;
