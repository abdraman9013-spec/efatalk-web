-- Gold line: 400 points a full day x 15 days = 6000.
-- 1 match 180, cards 80, clash win 70, phrases/slang 40, flame bonus 30.

update public.efaa_challenges
set daily_points_cap = 400, updated_at = now()
where id = 'english-2026';

update public.efaa_challenge_activities
set points = 180, daily_points_cap = 180, max_completions_per_day = 1, enabled = true, updated_at = now()
where challenge_id = 'english-2026' and activity_type = 'speaking';

update public.efaa_challenge_activities
set points = 80, daily_points_cap = 80, max_completions_per_day = 1, enabled = true, updated_at = now()
where challenge_id = 'english-2026' and activity_type = 'card';

update public.efaa_challenge_activities
set points = 40, daily_points_cap = 40, max_completions_per_day = 1, enabled = true, updated_at = now()
where challenge_id = 'english-2026' and activity_type = 'formation';

update public.efaa_challenge_activities
set points = 0, daily_points_cap = 0, enabled = false, updated_at = now()
where challenge_id = 'english-2026' and activity_type in ('daily_challenge', 'quiz', 'learning');

insert into public.efaa_challenge_activities (
  challenge_id, activity_type, label, points, daily_points_cap,
  min_duration_seconds, max_completions_per_day, meaningful, validation_method
) values
  ('english-2026', 'clash', 'Clash win', 70, 70, 0, 1, true, 'server_event'),
  ('english-2026', 'flame', 'Flame bonus', 30, 30, 0, 1, true, 'server_event')
on conflict (challenge_id, activity_type) do update set
  label = excluded.label,
  points = excluded.points,
  daily_points_cap = excluded.daily_points_cap,
  max_completions_per_day = excluded.max_completions_per_day,
  meaningful = excluded.meaningful,
  enabled = true,
  updated_at = now();

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
set search_path = public, efaa_private
as $$
declare
  rec public.efaa_user_gamification%rowtype;
  today date := public.efaa_academy_today();
  already_today boolean := false;
begin
  if p_user_id is null or length(trim(p_user_id)) = 0 then raise exception 'user_id required'; end if;
  insert into public.efaa_user_gamification (user_id, display_name, nationality)
  values (p_user_id, coalesce(p_display_name, ''), coalesce(p_nationality, ''))
  on conflict (user_id) do nothing;
  select * into rec from public.efaa_user_gamification where user_id = p_user_id for update;
  already_today := rec.last_formation_at is not null
    and (timezone('Africa/Ndjamena', rec.last_formation_at))::date = today;
  update public.efaa_user_gamification
  set learned_phrases = (
        select coalesce(array_agg(distinct phrase), '{}'::text[])
        from unnest(coalesce(learned_phrases, '{}'::text[]) || coalesce(p_phrase_ids, '{}'::text[])) as phrase
      ),
      last_formation_at = now(),
      age = coalesce(p_age, age),
      favorite_color = coalesce(nullif(p_color, ''), favorite_color),
      display_name = coalesce(nullif(p_display_name, ''), display_name),
      nationality = coalesce(nullif(p_nationality, ''), nationality),
      updated_at = now()
  where user_id = p_user_id;
  if not already_today then
    perform set_config('efaa.challenge_source', 'formation', true);
    perform set_config('efaa.challenge_event_id', 'formation:' || p_user_id || ':' || today::text, true);
    perform public.efaa_grant_class_points(p_user_id, 40);
  end if;
  select * into rec from public.efaa_user_gamification where user_id = p_user_id;
  return to_jsonb(rec);
end;
$$;

create or replace function public.efaa_complete_intermediate_day(
  p_user_id text,
  p_slang_ids text[],
  p_display_name text default null,
  p_nationality text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  rec public.efaa_intermediate_progress%rowtype;
  today date := public.efaa_academy_today();
  fresh boolean := false;
begin
  if p_user_id is null or length(trim(p_user_id)) = 0 then
    raise exception 'user_id required';
  end if;

  insert into public.efaa_intermediate_progress (user_id)
  values (p_user_id)
  on conflict (user_id) do nothing;

  select * into rec from public.efaa_intermediate_progress where user_id = p_user_id for update;

  if rec.last_formation_date is distinct from today then
    fresh := true;
    rec.day_index := rec.day_index + 1;
    rec.last_formation_date := today;
    rec.learned_slang_ids := (
      select coalesce(array_agg(distinct phrase), '{}'::text[])
      from unnest(coalesce(rec.learned_slang_ids, '{}'::text[]) || coalesce(p_slang_ids, '{}'::text[])) as phrase
    );
    update public.efaa_intermediate_progress
    set
      day_index = rec.day_index,
      last_formation_date = rec.last_formation_date,
      learned_slang_ids = rec.learned_slang_ids,
      updated_at = now()
    where user_id = p_user_id
    returning * into rec;
  end if;

  insert into public.efaa_user_gamification (user_id, display_name, nationality)
  values (p_user_id, coalesce(p_display_name, ''), coalesce(p_nationality, ''))
  on conflict (user_id) do nothing;

  if p_display_name is not null or p_nationality is not null then
    update public.efaa_user_gamification
    set
      display_name = coalesce(nullif(p_display_name, ''), display_name),
      nationality = coalesce(nullif(p_nationality, ''), nationality),
      updated_at = now()
    where user_id = p_user_id;
  end if;

  if fresh then
    perform set_config('efaa.challenge_source', 'formation', true);
    perform set_config('efaa.challenge_event_id', 'formation:' || p_user_id || ':' || today::text, true);
    perform public.efaa_grant_class_points(p_user_id, 40);
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
set search_path = public, efaa_private
as $$
declare
  rec public.efaa_user_gamification%rowtype;
  today date := public.efaa_academy_today();
  speech integer := least(greatest(coalesce(p_speech_seconds, 0), 0), 1800);
  wanted integer;
  grant_row jsonb;
  flame_row jsonb;
  total_gained integer := 0;
  total_diamonds integer := 0;
  missed integer := 0;
  grace integer := 1;
  campaign public.efaa_challenges%rowtype;
  participant public.efaa_challenge_participants%rowtype;
  in_challenge boolean := false;
  lvl text := 'beginner';
  need integer := 5;
begin
  if p_user_id is null or length(trim(p_user_id)) = 0 then raise exception 'user_id required'; end if;
  wanted := 10 + (speech / 10);
  if public.efaa_bonus_active() then wanted := least(wanted, 50); end if;

  select * into campaign from efaa_private.challenge_for_scoring();
  if campaign.id is not null then
    select * into participant from efaa_private.challenge_participant_owned(campaign.id, p_user_id);
    if participant.id is not null then
      in_challenge := true;
      wanted := case when speech >= 30 then 180 else 0 end;
    end if;
  end if;

  insert into public.efaa_user_gamification (user_id)
  values (p_user_id) on conflict (user_id) do nothing;
  select * into rec from public.efaa_user_gamification where user_id = p_user_id for update;
  if rec.last_activity_date is distinct from today then rec.matchs_tonight_count := 0; end if;
  missed := public.efaa_missed_days(rec.last_activity_date, today);
  grace := public.efaa_streak_grace(rec.current_streak);
  if rec.last_activity_date is null then rec.current_streak := 1;
  elsif rec.last_activity_date = today then null;
  elsif rec.last_activity_date = today - 1 then rec.current_streak := rec.current_streak + 1;
  elsif missed < grace then rec.current_streak := rec.current_streak + 1;
  else rec.current_streak := 1;
  end if;
  rec.matchs_tonight_count := rec.matchs_tonight_count + 1;
  rec.last_activity_date := today;
  update public.efaa_user_gamification
  set current_streak = rec.current_streak,
      last_activity_date = rec.last_activity_date,
      matchs_tonight_count = rec.matchs_tonight_count,
      updated_at = now()
  where user_id = p_user_id returning * into rec;

  perform set_config('efaa.challenge_source', 'speaking', true);
  perform set_config('efaa.challenge_event_id', 'speaking:' || p_user_id || ':' || today::text, true);
  perform set_config('efaa.challenge_duration', speech::text, true);
  grant_row := public.efaa_grant_class_points(p_user_id, wanted);
  total_gained := coalesce((grant_row->>'points_gained')::integer, 0);
  total_diamonds := coalesce((grant_row->>'diamonds_gained')::integer, 0);

  if speech >= 30 and in_challenge then
    select coalesce(
      (select s.level from public.efaa_practice_students s where s.id = p_user_id),
      (select a.level from public.efaa_active_students a where a.id::text = p_user_id),
      'beginner'
    ) into lvl;
    need := case lvl when 'advanced' then 1 when 'intermediate' then 2 else 5 end;
    if rec.matchs_tonight_count >= need then
      perform set_config('efaa.challenge_source', 'flame', true);
      perform set_config('efaa.challenge_event_id', 'flame:' || p_user_id || ':' || today::text, true);
      flame_row := public.efaa_grant_class_points(p_user_id, 30);
      total_gained := total_gained + coalesce((flame_row->>'points_gained')::integer, 0);
      total_diamonds := total_diamonds + coalesce((flame_row->>'diamonds_gained')::integer, 0);
    end if;
  end if;

  perform public.efaa_mark_present(p_user_id, 'match');

  return jsonb_build_object(
    'total_points', coalesce((grant_row->>'total_points')::integer, rec.total_points),
    'diamonds_count', coalesce((grant_row->>'diamonds_count')::integer, rec.diamonds_count),
    'current_streak', rec.current_streak,
    'matchs_tonight_count', rec.matchs_tonight_count,
    'points_gained', total_gained,
    'diamonds_gained', total_diamonds,
    'daily_remaining', coalesce((grant_row->>'daily_remaining')::integer, 0)
  );
end;
$$;

do $$
declare src text;
begin
  src := pg_get_functiondef('public.efaa_award_game_win(text)'::regprocedure);
  src := replace(src, 'efaa_grant_class_points(p_user_id,30)', 'efaa_grant_class_points(p_user_id, 80)');
  src := replace(src, 'efaa_grant_class_points(p_user_id, 30)', 'efaa_grant_class_points(p_user_id, 80)');
  execute src;
end $$;

create or replace function public.efaa_settle_clash(
  p_winner text,
  p_loser text,
  p_wager integer default 1
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  wager integer := greatest(coalesce(p_wager, 1), 1);
  win_game public.efaa_user_game_state%rowtype;
  lose_game public.efaa_user_game_state%rowtype;
  win_elo public.efaa_user_elo%rowtype;
  lose_elo public.efaa_user_elo%rowtype;
  paid integer;
  today date := public.efaa_academy_today();
  clash_row jsonb := '{}'::jsonb;
begin
  if p_winner is null or p_loser is null or p_winner = p_loser then
    raise exception 'invalid clash players';
  end if;

  insert into public.efaa_user_game_state (user_id, referral_code, country_code)
  values
    (p_winner, 'EFA' || upper(substr(md5(p_winner), 1, 6)), 'TD'),
    (p_loser, 'EFA' || upper(substr(md5(p_loser), 1, 6)), 'TD')
  on conflict (user_id) do nothing;

  perform public.efaa_ensure_elo(p_winner);
  perform public.efaa_ensure_elo(p_loser);

  select * into lose_game from public.efaa_user_game_state where user_id = p_loser for update;
  select * into win_game from public.efaa_user_game_state where user_id = p_winner for update;
  paid := least(wager, coalesce(lose_game.lightning_bolts, 0));

  update public.efaa_user_game_state
  set lightning_bolts = lightning_bolts - paid, updated_at = now()
  where user_id = p_loser
  returning * into lose_game;

  update public.efaa_user_game_state
  set lightning_bolts = least(20, lightning_bolts + paid), updated_at = now()
  where user_id = p_winner
  returning * into win_game;

  update public.efaa_user_elo
  set elo = elo + 16, wins = wins + 1, updated_at = now()
  where user_id = p_winner
  returning * into win_elo;

  update public.efaa_user_elo
  set elo = greatest(100, elo - 12), losses = losses + 1, updated_at = now()
  where user_id = p_loser
  returning * into lose_elo;

  begin
    perform set_config('efaa.challenge_source', 'clash', true);
    perform set_config('efaa.challenge_event_id', 'clash:' || p_winner || ':' || today::text, true);
    clash_row := public.efaa_grant_class_points(p_winner, 70);
  exception when others then
    clash_row := '{}'::jsonb;
  end;

  return jsonb_build_object(
    'winner_bolts', win_game.lightning_bolts,
    'loser_bolts', lose_game.lightning_bolts,
    'winner_elo', win_elo.elo,
    'loser_elo', lose_elo.elo,
    'paid', paid,
    'challenge_points', coalesce((clash_row->>'points_gained')::integer, 0)
  );
end;
$$;
