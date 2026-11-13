-- Beginner gamification: points loop, diamonds, daily streak, formation memory.
-- user_id is the Efaa student id (practice text id or official uuid as text).
-- Practice students are not in auth.users, so this cannot FK to auth.users.

create table if not exists public.efaa_user_gamification (
  user_id text primary key,
  total_points integer not null default 0 check (total_points >= 0 and total_points <= 10000),
  diamonds_count integer not null default 0 check (diamonds_count >= 0),
  current_streak integer not null default 0 check (current_streak >= 0),
  last_activity_date date,
  matchs_tonight_count integer not null default 0 check (matchs_tonight_count >= 0),
  learned_phrases text[] not null default '{}'::text[],
  last_formation_at timestamptz,
  age integer,
  favorite_color text,
  display_name text not null default '',
  nationality text not null default '',
  updated_at timestamptz not null default now()
);

create index if not exists efaa_user_gamification_board_idx
  on public.efaa_user_gamification (diamonds_count desc, total_points desc, current_streak desc);

alter table public.efaa_user_gamification enable row level security;

drop policy if exists efaa_user_gamification_select on public.efaa_user_gamification;
create policy efaa_user_gamification_select
  on public.efaa_user_gamification for select
  using (true);

drop policy if exists efaa_user_gamification_insert on public.efaa_user_gamification;
create policy efaa_user_gamification_insert
  on public.efaa_user_gamification for insert
  with check (true);

drop policy if exists efaa_user_gamification_update on public.efaa_user_gamification;
create policy efaa_user_gamification_update
  on public.efaa_user_gamification for update
  using (true)
  with check (true);

grant select, insert, update on public.efaa_user_gamification to anon, authenticated;

do $$
begin
  begin
    alter publication supabase_realtime add table public.efaa_user_gamification;
  exception
    when duplicate_object then null;
    when undefined_object then null;
  end;
end $$;

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
  today date := (timezone('utc', now()))::date;
  speech integer := greatest(coalesce(p_speech_seconds, 0), 0);
  points_gained integer;
  combined integer;
  diamonds_add integer;
begin
  if p_user_id is null or length(trim(p_user_id)) = 0 then
    raise exception 'user_id required';
  end if;

  points_gained := 10 + (speech / 10);

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

  combined := rec.total_points + points_gained;
  diamonds_add := combined / 10000;
  rec.total_points := combined % 10000;
  rec.diamonds_count := rec.diamonds_count + diamonds_add;
  rec.matchs_tonight_count := rec.matchs_tonight_count + 1;
  rec.last_activity_date := today;

  update public.efaa_user_gamification
  set
    total_points = rec.total_points,
    diamonds_count = rec.diamonds_count,
    current_streak = rec.current_streak,
    last_activity_date = rec.last_activity_date,
    matchs_tonight_count = rec.matchs_tonight_count,
    updated_at = now()
  where user_id = p_user_id
  returning * into rec;

  return jsonb_build_object(
    'total_points', rec.total_points,
    'diamonds_count', rec.diamonds_count,
    'current_streak', rec.current_streak,
    'matchs_tonight_count', rec.matchs_tonight_count,
    'points_gained', points_gained,
    'diamonds_gained', diamonds_add
  );
end;
$$;

grant execute on function public.efaa_award_match_points(text, integer) to anon, authenticated;

create or replace function public.efaa_complete_formation(
  p_user_id text,
  p_phrase_ids text[],
  p_age integer default null,
  p_color text default null,
  p_display_name text default null,
  p_nationality text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  rec public.efaa_user_gamification%rowtype;
begin
  insert into public.efaa_user_gamification (user_id, display_name, nationality)
  values (
    p_user_id,
    coalesce(p_display_name, ''),
    coalesce(p_nationality, '')
  )
  on conflict (user_id) do nothing;

  update public.efaa_user_gamification
  set
    learned_phrases = (
      select coalesce(array_agg(distinct phrase), '{}'::text[])
      from unnest(coalesce(learned_phrases, '{}'::text[]) || coalesce(p_phrase_ids, '{}'::text[])) as phrase
    ),
    last_formation_at = now(),
    age = coalesce(p_age, age),
    favorite_color = coalesce(nullif(p_color, ''), favorite_color),
    display_name = coalesce(nullif(p_display_name, ''), display_name),
    nationality = coalesce(nullif(p_nationality, ''), nationality),
    updated_at = now()
  where user_id = p_user_id
  returning * into rec;

  return to_jsonb(rec);
end;
$$;

grant execute on function public.efaa_complete_formation(text, text[], integer, text, text, text) to anon, authenticated;

create or replace function public.efaa_leaderboard_for(p_user_id text)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  me public.efaa_user_gamification%rowtype;
  rival public.efaa_user_gamification%rowtype;
  my_rank integer := 1;
  top5 jsonb;
  gap integer := 0;
begin
  select * into me from public.efaa_user_gamification where user_id = p_user_id;

  select jsonb_agg(row_to_json(t))
  into top5
  from (
    select
      user_id,
      display_name,
      nationality,
      current_streak,
      diamonds_count,
      total_points
    from public.efaa_user_gamification
    order by diamonds_count desc, total_points desc, current_streak desc, user_id asc
    limit 5
  ) t;

  if me.user_id is null then
    return jsonb_build_object('top', coalesce(top5, '[]'::jsonb), 'me', null, 'rank', null, 'rival', null, 'gap', 0);
  end if;

  select count(*)::integer + 1
  into my_rank
  from public.efaa_user_gamification g
  where
    g.diamonds_count > me.diamonds_count
    or (g.diamonds_count = me.diamonds_count and g.total_points > me.total_points)
    or (g.diamonds_count = me.diamonds_count and g.total_points = me.total_points and g.current_streak > me.current_streak)
    or (g.diamonds_count = me.diamonds_count and g.total_points = me.total_points and g.current_streak = me.current_streak and g.user_id < me.user_id);

  select *
  into rival
  from public.efaa_user_gamification g
  where
    g.user_id <> me.user_id
    and (
      g.diamonds_count > me.diamonds_count
      or (g.diamonds_count = me.diamonds_count and g.total_points > me.total_points)
      or (g.diamonds_count = me.diamonds_count and g.total_points = me.total_points and g.current_streak > me.current_streak)
      or (g.diamonds_count = me.diamonds_count and g.total_points = me.total_points and g.current_streak = me.current_streak and g.user_id < me.user_id)
    )
  order by g.diamonds_count asc, g.total_points asc, g.current_streak asc, g.user_id desc
  limit 1;

  if rival.user_id is not null then
    if rival.diamonds_count > me.diamonds_count then
      gap := (10000 - me.total_points) + rival.total_points + ((rival.diamonds_count - me.diamonds_count - 1) * 10000);
      if gap < 1 then gap := 1; end if;
    else
      gap := greatest(rival.total_points - me.total_points, 1);
    end if;
  end if;

  return jsonb_build_object(
    'top', coalesce(top5, '[]'::jsonb),
    'me', to_jsonb(me),
    'rank', my_rank,
    'rival', case when rival.user_id is null then null else to_jsonb(rival) end,
    'gap', gap
  );
end;
$$;

grant execute on function public.efaa_leaderboard_for(text) to anon, authenticated;
