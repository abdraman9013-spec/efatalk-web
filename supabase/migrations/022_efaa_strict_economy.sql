-- Strict class-point economy. Existing totals are kept.
-- Word Clash remains lightning-only. Voice matches remain the only flame source.

create table if not exists public.efaa_class_daily (
  user_id text not null,
  day date not null,
  granted integer not null default 0 check (granted >= 0),
  primary key (user_id, day)
);

alter table public.efaa_class_daily enable row level security;

create table if not exists public.efaa_reaction_cooldown (
  speaker_id text not null,
  sender_id text not null,
  last_at timestamptz not null default now(),
  primary key (speaker_id, sender_id)
);

alter table public.efaa_reaction_cooldown enable row level security;

create or replace function public.efaa_academy_today()
returns date
language sql
stable
as $$
  select (timezone('Africa/Ndjamena', now()))::date;
$$;

create or replace function public.efaa_grant_class_points(p_user_id text, p_points integer)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  rec public.efaa_user_gamification%rowtype;
  today date := public.efaa_academy_today();
  wanted integer := greatest(coalesce(p_points, 0), 0);
  already integer := 0;
  room integer;
  awarded integer := 0;
  combined integer;
  diamonds_add integer := 0;
  daily_cap integer := 700;
begin
  if p_user_id is null or length(trim(p_user_id)) = 0 or p_user_id = 'efaa-admin' then
    return jsonb_build_object(
      'points_gained', 0,
      'diamonds_gained', 0,
      'daily_remaining', daily_cap,
      'daily_cap', daily_cap
    );
  end if;

  insert into public.efaa_user_gamification (user_id)
  values (p_user_id)
  on conflict (user_id) do nothing;

  select * into rec
  from public.efaa_user_gamification
  where user_id = p_user_id
  for update;

  insert into public.efaa_class_daily (user_id, day, granted)
  values (p_user_id, today, 0)
  on conflict (user_id, day) do nothing;

  select granted into already
  from public.efaa_class_daily
  where user_id = p_user_id and day = today
  for update;

  room := greatest(daily_cap - coalesce(already, 0), 0);
  awarded := least(wanted, room);

  if awarded > 0 then
    combined := rec.total_points + awarded;
    diamonds_add := combined / 10000;
    rec.total_points := combined % 10000;
    rec.diamonds_count := rec.diamonds_count + diamonds_add;

    update public.efaa_user_gamification
    set total_points = rec.total_points,
        diamonds_count = rec.diamonds_count,
        updated_at = now()
    where user_id = p_user_id
    returning * into rec;

    update public.efaa_class_daily
    set granted = public.efaa_class_daily.granted + awarded
    where user_id = p_user_id and day = today;
  end if;

  return jsonb_build_object(
    'total_points', rec.total_points,
    'diamonds_count', rec.diamonds_count,
    'points_gained', awarded,
    'diamonds_gained', diamonds_add,
    'daily_granted', coalesce(already, 0) + awarded,
    'daily_cap', daily_cap,
    'daily_remaining', greatest(daily_cap - (coalesce(already, 0) + awarded), 0)
  );
end;
$$;

revoke all on function public.efaa_grant_class_points(text, integer) from public;
revoke all on function public.efaa_grant_class_points(text, integer) from anon, authenticated;

update public.efaa_user_gamification
set current_streak = 6,
    last_activity_date = '2026-09-06',
    updated_at = now()
where display_name = 'Zahra Hassan'
  and current_streak = 0
  and last_activity_date = '2026-09-05';

create or replace function public.efaa_protect_class_economy()
returns trigger
language plpgsql
as $$
begin
  if current_user in ('anon', 'authenticated') then
    new.total_points := old.total_points;
    new.diamonds_count := old.diamonds_count;
    new.current_streak := old.current_streak;
    new.matchs_tonight_count := old.matchs_tonight_count;
    new.last_activity_date := old.last_activity_date;
  end if;
  return new;
end;
$$;

drop trigger if exists efaa_protect_class_economy on public.efaa_user_gamification;
create trigger efaa_protect_class_economy
before update on public.efaa_user_gamification
for each row
execute function public.efaa_protect_class_economy();

create or replace function public.efaa_sync_broken_streak(p_user_id text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  rec public.efaa_user_gamification%rowtype;
  today date := public.efaa_academy_today();
begin
  select * into rec from public.efaa_user_gamification where user_id = p_user_id;
  if rec.user_id is null then
    return jsonb_build_object('current_streak', 0);
  end if;
  if rec.last_activity_date is not null and rec.last_activity_date < today - 1 then
    update public.efaa_user_gamification
    set current_streak = 0, updated_at = now()
    where user_id = p_user_id
    returning * into rec;
  end if;
  return to_jsonb(rec);
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

create or replace function public.efaa_award_reaction_points(
  p_speaker_id text,
  p_sender_id text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  grant_row jsonb;
  accepted timestamptz;
begin
  if p_speaker_id is null or length(trim(p_speaker_id)) = 0 then
    raise exception 'speaker required';
  end if;
  if p_speaker_id = p_sender_id or coalesce(p_sender_id, '') = '' then
    return jsonb_build_object('points_gained', 0, 'total_points', 0, 'diamonds_count', 0);
  end if;

  insert into public.efaa_reaction_cooldown (speaker_id, sender_id, last_at)
  values (p_speaker_id, p_sender_id, now())
  on conflict (speaker_id, sender_id) do update
    set last_at = now()
    where public.efaa_reaction_cooldown.last_at <= now() - interval '60 seconds'
  returning last_at into accepted;

  if accepted is null then
    return jsonb_build_object('points_gained', 0, 'total_points', 0, 'diamonds_count', 0);
  end if;

  grant_row := public.efaa_grant_class_points(p_speaker_id, 1);
  return grant_row;
end;
$$;

create or replace function public.efaa_award_quiz_answer(
  p_user_id text,
  p_correct boolean
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  mid public.efaa_intermediate_progress%rowtype;
  rec public.efaa_user_gamification%rowtype;
  grant_row jsonb;
  gained integer := 0;
begin
  if p_user_id is null or length(trim(p_user_id)) = 0 then
    raise exception 'user_id required';
  end if;

  insert into public.efaa_intermediate_progress (user_id)
  values (p_user_id)
  on conflict (user_id) do nothing;

  select * into mid from public.efaa_intermediate_progress where user_id = p_user_id for update;

  if coalesce(p_correct, false) then
    if mid.quiz_points >= 30 then
      mid.quiz_bundle := mid.quiz_bundle + 1;
      if mid.quiz_bundle >= 3 then
        gained := 1;
        mid.quiz_bundle := 0;
      end if;
    else
      mid.quiz_corrects := mid.quiz_corrects + 1;
      if mid.quiz_corrects = 1 then
        gained := 5;
      elsif mid.quiz_corrects = 2 then
        gained := 3;
      elsif mid.quiz_corrects = 3 then
        gained := 2;
      else
        gained := 1;
      end if;
    end if;
    mid.quiz_points := mid.quiz_points + gained;
  end if;

  update public.efaa_intermediate_progress
  set quiz_points = mid.quiz_points,
      quiz_corrects = mid.quiz_corrects,
      quiz_bundle = mid.quiz_bundle,
      updated_at = now()
  where user_id = p_user_id
  returning * into mid;

  insert into public.efaa_user_gamification (user_id)
  values (p_user_id)
  on conflict (user_id) do nothing;

  if gained > 0 then
    grant_row := public.efaa_grant_class_points(p_user_id, gained);
  else
    select * into rec from public.efaa_user_gamification where user_id = p_user_id;
    grant_row := jsonb_build_object(
      'total_points', coalesce(rec.total_points, 0),
      'diamonds_count', coalesce(rec.diamonds_count, 0),
      'points_gained', 0
    );
  end if;

  return jsonb_build_object(
    'total_points', coalesce((grant_row->>'total_points')::integer, 0),
    'diamonds_count', coalesce((grant_row->>'diamonds_count')::integer, 0),
    'points_gained', coalesce((grant_row->>'points_gained')::integer, 0),
    'quiz_points', mid.quiz_points,
    'quiz_corrects', mid.quiz_corrects,
    'quiz_bundle', mid.quiz_bundle
  );
end;
$$;

create or replace function public.efaa_award_warmup_points(
  p_user_id text,
  p_points integer
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  rec public.efaa_user_gamification%rowtype;
  mid public.efaa_intermediate_progress%rowtype;
  today date := public.efaa_academy_today();
  gained integer := least(greatest(coalesce(p_points, 0), 5), 10);
  daily_cap integer := 40;
  grant_row jsonb;
begin
  if p_user_id is null or length(trim(p_user_id)) = 0 then
    raise exception 'user_id required';
  end if;
  insert into public.efaa_intermediate_progress (user_id)
  values (p_user_id)
  on conflict (user_id) do nothing;
  select * into mid from public.efaa_intermediate_progress where user_id = p_user_id for update;
  if mid.warmup_date is distinct from today then
    mid.warmup_points_today := 0;
    mid.warmup_date := today;
  end if;
  if mid.warmup_points_today >= daily_cap then
    gained := 0;
  elsif mid.warmup_points_today + gained > daily_cap then
    gained := daily_cap - mid.warmup_points_today;
  end if;
  update public.efaa_intermediate_progress
  set warmup_points_today = mid.warmup_points_today + gained, warmup_date = today, updated_at = now()
  where user_id = p_user_id
  returning * into mid;

  grant_row := public.efaa_grant_class_points(p_user_id, gained);
  select * into rec from public.efaa_user_gamification where user_id = p_user_id;

  return jsonb_build_object(
    'total_points', rec.total_points,
    'diamonds_count', rec.diamonds_count,
    'points_gained', (grant_row->>'points_gained')::integer,
    'warmup_points_today', mid.warmup_points_today
  );
end;
$$;

create or replace function public.efaa_flush_game_board_bonus(p_user_id text)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  rec public.efaa_user_game_state%rowtype;
  next_threshold integer;
  steps integer;
  awarded integer := 0;
  grant_row jsonb;
begin
  if p_user_id is null or length(trim(p_user_id)) = 0 or p_user_id = 'efaa-admin' then
    return 0;
  end if;

  select * into rec from public.efaa_user_game_state where user_id = p_user_id for update;
  if rec.user_id is null then
    return 0;
  end if;

  next_threshold := floor(rec.personal_points / 100.0)::integer;
  if next_threshold <= coalesce(rec.last_board_threshold, 0) then
    return 0;
  end if;

  steps := next_threshold - coalesce(rec.last_board_threshold, 0);
  awarded := steps * 5;

  update public.efaa_user_game_state
  set last_board_threshold = next_threshold,
      updated_at = now()
  where user_id = p_user_id;

  grant_row := public.efaa_grant_class_points(p_user_id, awarded);
  return coalesce((grant_row->>'points_gained')::integer, 0);
end;
$$;

create or replace function public.efaa_add_game_points(p_user_id text, p_points integer)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  rec public.efaa_user_game_state%rowtype;
  gain integer := least(greatest(coalesce(p_points, 0), 0), 3);
  bonus integer := 0;
begin
  if p_user_id is null or length(trim(p_user_id)) = 0 then
    raise exception 'user_id required';
  end if;

  select * into rec from public.efaa_user_game_state where user_id = p_user_id for update;
  if rec.user_id is null then
    raise exception 'game state missing';
  end if;

  if gain = 0 then
    return to_jsonb(rec) || jsonb_build_object('board_bonus', 0);
  end if;

  update public.efaa_user_game_state
  set personal_points = personal_points + gain,
      updated_at = now()
  where user_id = p_user_id
  returning * into rec;

  bonus := public.efaa_flush_game_board_bonus(p_user_id);
  select * into rec from public.efaa_user_game_state where user_id = p_user_id;
  return to_jsonb(rec) || jsonb_build_object('board_bonus', bonus);
end;
$$;

create or replace function public.efaa_award_game_win(p_user_id text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  rec public.efaa_user_game_state%rowtype;
  board public.efaa_countries_leaderboard%rowtype;
  bonus integer := 0;
begin
  if p_user_id is null or length(trim(p_user_id)) = 0 then
    raise exception 'user_id required';
  end if;

  select * into rec from public.efaa_user_game_state where user_id = p_user_id for update;
  if rec.user_id is null then
    raise exception 'game state missing';
  end if;

  update public.efaa_user_game_state
  set personal_points = personal_points + 2,
      updated_at = now()
  where user_id = p_user_id
  returning * into rec;

  insert into public.efaa_countries_leaderboard (country_code, country_name, flag_emoji, total_score)
  values (rec.country_code, rec.country_code, public.efaa_flag_emoji(rec.country_code), 20)
  on conflict (country_code) do update
    set total_score = efaa_countries_leaderboard.total_score + 20,
        updated_at = now()
  returning * into board;

  bonus := public.efaa_flush_game_board_bonus(p_user_id);
  select * into rec from public.efaa_user_game_state where user_id = p_user_id;

  return jsonb_build_object(
    'personal_points', rec.personal_points,
    'lightning_bolts', rec.lightning_bolts,
    'country_code', rec.country_code,
    'country_score', board.total_score,
    'personal_gained', 2,
    'country_gained', 20,
    'board_bonus', bonus
  );
end;
$$;

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
  top_rows jsonb;
  gap integer := 0;
  me_name text;
  rival_name text;
begin
  select * into me from public.efaa_user_gamification where user_id = p_user_id;
  me_name := coalesce(nullif(public.efaa_student_board_name(p_user_id), ''), me.display_name);

  select jsonb_agg(row_to_json(t))
    into top_rows
  from (
    select
      g.user_id,
      coalesce(nullif(public.efaa_student_board_name(g.user_id), ''), g.display_name) as display_name,
      g.nationality,
      g.current_streak,
      g.diamonds_count,
      g.total_points,
      public.efaa_student_avatar_url(g.user_id) as photo
    from public.efaa_user_gamification g
    where g.user_id <> 'efaa-admin'
      and btrim(coalesce(nullif(public.efaa_student_board_name(g.user_id), ''), g.display_name, '')) <> ''
      and (
        exists (select 1 from public.efaa_practice_students p where p.id::text = g.user_id)
        or exists (select 1 from public.efaa_active_students a where a.id::text = g.user_id)
      )
    order by g.diamonds_count desc, g.total_points desc, g.current_streak desc, g.user_id asc
    limit 10
  ) t;

  if me.user_id is null then
    return jsonb_build_object('top', coalesce(top_rows, '[]'::jsonb), 'me', null, 'rank', null, 'rival', null, 'gap', 0);
  end if;

  select count(*)::integer + 1
  into my_rank
  from public.efaa_user_gamification g
  where g.user_id <> 'efaa-admin'
    and btrim(coalesce(nullif(public.efaa_student_board_name(g.user_id), ''), g.display_name, '')) <> ''
    and (
      exists (select 1 from public.efaa_practice_students p where p.id::text = g.user_id)
      or exists (select 1 from public.efaa_active_students a where a.id::text = g.user_id)
    )
    and (
      g.diamonds_count > coalesce(me.diamonds_count, 0)
      or (g.diamonds_count = coalesce(me.diamonds_count, 0) and g.total_points > coalesce(me.total_points, 0))
      or (
        g.diamonds_count = coalesce(me.diamonds_count, 0)
        and g.total_points = coalesce(me.total_points, 0)
        and g.current_streak > coalesce(me.current_streak, 0)
      )
      or (
        g.diamonds_count = coalesce(me.diamonds_count, 0)
        and g.total_points = coalesce(me.total_points, 0)
        and g.current_streak = coalesce(me.current_streak, 0)
        and g.user_id < me.user_id
      )
    );

  select *
  into rival
  from public.efaa_user_gamification g
  where g.user_id <> me.user_id
    and g.user_id <> 'efaa-admin'
    and btrim(coalesce(nullif(public.efaa_student_board_name(g.user_id), ''), g.display_name, '')) <> ''
    and (
      exists (select 1 from public.efaa_practice_students p where p.id::text = g.user_id)
      or exists (select 1 from public.efaa_active_students a where a.id::text = g.user_id)
    )
    and (
      g.diamonds_count > coalesce(me.diamonds_count, 0)
      or (g.diamonds_count = coalesce(me.diamonds_count, 0) and g.total_points > coalesce(me.total_points, 0))
    )
  order by g.diamonds_count asc, g.total_points asc, g.user_id asc
  limit 1;

  if rival.user_id is not null then
    if rival.diamonds_count > coalesce(me.diamonds_count, 0) then
      gap := (10000 - coalesce(me.total_points, 0)) + rival.total_points + ((rival.diamonds_count - me.diamonds_count - 1) * 10000);
    else
      gap := rival.total_points - coalesce(me.total_points, 0);
    end if;
    rival_name := coalesce(nullif(public.efaa_student_board_name(rival.user_id), ''), rival.display_name);
  end if;

  return jsonb_build_object(
    'top', coalesce(top_rows, '[]'::jsonb),
    'me', to_jsonb(me) || jsonb_build_object(
      'display_name', coalesce(me_name, me.display_name),
      'photo', public.efaa_student_avatar_url(me.user_id)
    ),
    'rank', my_rank,
    'rival', case
      when rival.user_id is null then null
      else to_jsonb(rival) || jsonb_build_object(
        'display_name', coalesce(rival_name, rival.display_name),
        'photo', public.efaa_student_avatar_url(rival.user_id)
      )
    end,
    'gap', greatest(gap, 0)
  );
end;
$$;

grant execute on function public.efaa_academy_today() to anon, authenticated;
grant execute on function public.efaa_sync_broken_streak(text) to anon, authenticated;
grant execute on function public.efaa_award_match_points(text, integer) to anon, authenticated;
grant execute on function public.efaa_award_reaction_points(text, text) to anon, authenticated;
grant execute on function public.efaa_award_quiz_answer(text, boolean) to anon, authenticated;
grant execute on function public.efaa_award_warmup_points(text, integer) to anon, authenticated;
grant execute on function public.efaa_flush_game_board_bonus(text) to anon, authenticated;
grant execute on function public.efaa_add_game_points(text, integer) to anon, authenticated;
grant execute on function public.efaa_award_game_win(text) to anon, authenticated;
grant execute on function public.efaa_leaderboard_for(text) to anon, authenticated;
