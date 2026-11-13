-- Duolingo-style flame grace + push log.
-- < 10 days: 1 missed class day resets.
-- >= 10 days: 3 missed days before reset.
-- >= 20 days: 5 missed days before reset.

create or replace function public.efaa_streak_grace(p_streak integer)
returns integer
language sql
immutable
as $$
  select case
    when coalesce(p_streak, 0) >= 20 then 5
    when coalesce(p_streak, 0) >= 10 then 3
    else 1
  end;
$$;

create or replace function public.efaa_missed_days(p_last date, p_today date)
returns integer
language sql
immutable
as $$
  select case
    when p_last is null then 0
    else greatest((p_today - p_last) - 1, 0)
  end;
$$;

create or replace function public.efaa_sync_broken_streak(p_user_id text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  rec public.efaa_user_gamification%rowtype;
  today date := public.efaa_academy_today();
  missed integer := 0;
  grace integer := 1;
begin
  select * into rec from public.efaa_user_gamification where user_id = p_user_id;
  if rec.user_id is null then
    return jsonb_build_object(
      'current_streak', 0,
      'missed_days', 0,
      'streak_grace', 1,
      'grace_left', 1
    );
  end if;

  missed := public.efaa_missed_days(rec.last_activity_date, today);
  grace := public.efaa_streak_grace(rec.current_streak);

  if rec.current_streak > 0 and missed >= grace then
    update public.efaa_user_gamification
    set current_streak = 0, updated_at = now()
    where user_id = p_user_id
    returning * into rec;
    missed := public.efaa_missed_days(rec.last_activity_date, today);
    grace := public.efaa_streak_grace(0);
  end if;

  return to_jsonb(rec) || jsonb_build_object(
    'missed_days', missed,
    'streak_grace', grace,
    'grace_left', greatest(grace - missed, 0)
  );
end;
$$;

grant execute on function public.efaa_sync_broken_streak(text) to anon, authenticated;

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

create table if not exists public.efaa_push_subs (
  endpoint text primary key,
  user_id text not null,
  p256dh text not null,
  auth text not null,
  locale text not null default 'fr',
  updated_at timestamptz not null default now()
);

create index if not exists efaa_push_subs_user_idx on public.efaa_push_subs (user_id);

alter table public.efaa_push_subs enable row level security;

drop policy if exists efaa_push_subs_all on public.efaa_push_subs;
create policy efaa_push_subs_all
  on public.efaa_push_subs for all
  using (true)
  with check (true);

grant select, insert, update, delete on public.efaa_push_subs to anon, authenticated;

create table if not exists public.efaa_push_log (
  kind text not null,
  day date not null,
  user_id text not null default '',
  created_at timestamptz not null default now(),
  primary key (kind, day, user_id)
);

alter table public.efaa_push_log enable row level security;

drop policy if exists efaa_push_log_all on public.efaa_push_log;
create policy efaa_push_log_all
  on public.efaa_push_log for all
  using (true)
  with check (true);

grant select, insert on public.efaa_push_log to anon, authenticated;

create or replace function public.efaa_claim_push(p_kind text, p_user_id text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  today date := public.efaa_academy_today();
  inserted integer := 0;
begin
  insert into public.efaa_push_log (kind, day, user_id)
  values (p_kind, today, coalesce(p_user_id, ''))
  on conflict (kind, day, user_id) do nothing;
  get diagnostics inserted = row_count;
  return inserted > 0;
end;
$$;

grant execute on function public.efaa_claim_push(text, text) to anon, authenticated;
