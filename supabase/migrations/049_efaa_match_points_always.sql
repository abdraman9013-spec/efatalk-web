-- Forever fix: Challenge scoring must not require auth.uid() to match.
-- Match rooms often award while the JWT session is missing/expired; the old
-- challenge_participant_owned() gate counted the match but wrote 0 Challenge pts.
-- Scoring DEFENDER paths look up the active participant by user_id only.
-- Also: class_daily must follow Challenge txs, otherwise a ghost 700 cap blocks
-- speaking awards after matches that only inflated class_daily.

create or replace function efaa_private.challenge_participant_for_scoring(
  p_challenge_id text,
  p_user_id text
)
returns public.efaa_challenge_participants
language sql
stable
security definer
set search_path = public, efaa_private
as $$
  select p
  from public.efaa_challenge_participants p
  where p.challenge_id = p_challenge_id
    and p.user_id = p_user_id
    and p.status = 'active'
  limit 1;
$$;

create or replace function efaa_private.challenge_allowed_points(
  p_user_id text,
  p_requested integer,
  p_source_type text,
  p_source_event_id text
)
returns integer
language plpgsql
security definer
set search_path = public, efaa_private
as $$
declare
  campaign public.efaa_challenges%rowtype;
  participant public.efaa_challenge_participants%rowtype;
  activity public.efaa_challenge_activities%rowtype;
  today date := public.efaa_academy_today();
  used_daily integer := 0;
  used_source integer := 0;
begin
  select * into campaign from efaa_private.challenge_for_scoring();
  if campaign.id is null then
    return greatest(coalesce(p_requested, 0), 0);
  end if;

  select * into participant
  from efaa_private.challenge_participant_for_scoring(campaign.id, p_user_id);
  if participant.id is null then
    return greatest(coalesce(p_requested, 0), 0);
  end if;

  if exists (
    select 1 from public.efaa_challenge_points_transactions t
    where t.challenge_id = campaign.id
      and t.participant_id = participant.id
      and t.source_event_id = p_source_event_id
  ) then
    return 0;
  end if;

  select * into activity
  from public.efaa_challenge_activities a
  where a.challenge_id = campaign.id
    and a.activity_type = p_source_type
    and a.enabled = true;

  if activity.activity_type is null then
    return greatest(coalesce(p_requested, 0), 0);
  end if;
  if activity.daily_points_cap <= 0 then
    return 0;
  end if;

  select coalesce(sum(greatest(t.amount, 0)), 0)::integer into used_daily
  from public.efaa_challenge_points_transactions t
  where t.challenge_id = campaign.id
    and t.participant_id = participant.id
    and t.academy_day = today
    and t.counts_for_ranking
    and t.source_type <> 'referral';

  select coalesce(sum(greatest(t.amount, 0)), 0)::integer into used_source
  from public.efaa_challenge_points_transactions t
  where t.challenge_id = campaign.id
    and t.participant_id = participant.id
    and t.academy_day = today
    and t.counts_for_ranking
    and t.source_type = activity.activity_type;

  return greatest(least(
    greatest(coalesce(p_requested, 0), 0),
    campaign.daily_points_cap - used_daily,
    activity.daily_points_cap - used_source
  ), 0);
end;
$$;

create or replace function efaa_private.challenge_record_award(
  p_user_id text,
  p_amount integer,
  p_source_type text,
  p_source_event_id text,
  p_metadata jsonb default '{}'::jsonb
)
returns void
language plpgsql
security definer
set search_path = public, efaa_private
as $$
declare
  campaign public.efaa_challenges%rowtype;
  participant public.efaa_challenge_participants%rowtype;
  today date := public.efaa_academy_today();
  meaningful boolean := true;
  completion_inserted integer := 0;
begin
  if coalesce(p_amount, 0) <= 0 then return; end if;
  select * into campaign from efaa_private.challenge_for_scoring();
  if campaign.id is null then return; end if;
  select * into participant
  from efaa_private.challenge_participant_for_scoring(campaign.id, p_user_id);
  if participant.id is null then return; end if;

  if not exists (
    select 1 from public.efaa_challenge_activities a
    where a.challenge_id = campaign.id
      and a.activity_type = p_source_type
      and a.enabled = true
  ) then
    return;
  end if;
  select coalesce(a.meaningful, true) into meaningful
  from public.efaa_challenge_activities a
  where a.challenge_id = campaign.id and a.activity_type = p_source_type;

  insert into public.efaa_challenge_activity_completions (
    challenge_id, participant_id, user_id, activity_type, source_event_id,
    academy_day, duration_seconds, requested_points, awarded_points,
    validation_method, metadata
  ) values (
    campaign.id, participant.id, p_user_id, p_source_type, p_source_event_id,
    today, greatest(coalesce((p_metadata->>'duration_seconds')::integer, 0), 0),
    p_amount, p_amount, 'server_event', coalesce(p_metadata, '{}'::jsonb)
  )
  on conflict (challenge_id, participant_id, source_event_id) do nothing;
  get diagnostics completion_inserted = row_count;
  if completion_inserted = 0 then return; end if;

  insert into public.efaa_challenge_points_transactions (
    challenge_id, participant_id, user_id, amount, reason, source_type,
    source_event_id, academy_day, metadata
  ) values (
    campaign.id, participant.id, p_user_id, p_amount,
    'Validated EfaTalk activity', p_source_type, p_source_event_id,
    today, coalesce(p_metadata, '{}'::jsonb)
  )
  on conflict (challenge_id, participant_id, source_event_id) do nothing;

  insert into public.efaa_challenge_daily_stats (
    challenge_id, participant_id, academy_day, learning_points,
    valid_completions, speaking_sessions, meaningful_activity
  ) values (
    campaign.id, participant.id, today, p_amount, 1,
    case when p_source_type = 'speaking' then 1 else 0 end,
    meaningful
  )
  on conflict (challenge_id, participant_id, academy_day) do update
  set learning_points = public.efaa_challenge_daily_stats.learning_points + excluded.learning_points,
      valid_completions = public.efaa_challenge_daily_stats.valid_completions + 1,
      speaking_sessions = public.efaa_challenge_daily_stats.speaking_sessions + excluded.speaking_sessions,
      meaningful_activity = public.efaa_challenge_daily_stats.meaningful_activity or excluded.meaningful_activity,
      updated_at = now();

  if meaningful then
    perform efaa_private.challenge_activate_referral(campaign.id, participant.id, now());
  end if;
end;
$$;

create or replace function public.efaa_grant_class_points(p_user_id text, p_points integer)
returns jsonb
language plpgsql
security definer
set search_path = public, efaa_private
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
  daily_cap integer := case when public.efaa_bonus_active() then 1500 else 700 end;
  campaign public.efaa_challenges%rowtype;
  participant public.efaa_challenge_participants%rowtype;
  source_type text := coalesce(nullif(current_setting('efaa.challenge_source', true), ''), 'learning');
  source_event_id text := coalesce(
    nullif(current_setting('efaa.challenge_event_id', true), ''),
    source_type || ':' || p_user_id || ':' || gen_random_uuid()::text
  );
  metadata jsonb := '{}'::jsonb;
  in_challenge boolean := false;
begin
  if p_user_id is null or length(trim(p_user_id)) = 0 or p_user_id = 'efaa-admin' then
    return jsonb_build_object('points_gained', 0, 'diamonds_gained', 0,
      'daily_remaining', daily_cap, 'daily_cap', daily_cap);
  end if;

  select * into campaign from efaa_private.challenge_for_scoring();
  if campaign.id is not null then
    select * into participant
    from efaa_private.challenge_participant_for_scoring(campaign.id, p_user_id);
    if participant.id is not null
      and exists (
        select 1 from public.efaa_challenge_activities a
        where a.challenge_id = campaign.id
          and a.activity_type = source_type
          and a.enabled = true
      )
    then
      in_challenge := true;
      perform pg_advisory_xact_lock(
        hashtextextended(campaign.id || ':' || participant.id::text, 0)
      );
      daily_cap := campaign.daily_points_cap;
      wanted := efaa_private.challenge_allowed_points(
        p_user_id, wanted, source_type, source_event_id
      );
      select coalesce(sum(greatest(t.amount, 0)), 0)::integer into already
      from public.efaa_challenge_points_transactions t
      where t.challenge_id = campaign.id
        and t.participant_id = participant.id
        and t.academy_day = today
        and t.counts_for_ranking
        and t.source_type <> 'referral';
    end if;
  end if;

  insert into public.efaa_user_gamification (user_id)
  values (p_user_id) on conflict (user_id) do nothing;
  select * into rec from public.efaa_user_gamification
  where user_id = p_user_id for update;

  insert into public.efaa_class_daily (user_id, day, granted)
  values (p_user_id, today, 0) on conflict (user_id, day) do nothing;

  if not in_challenge then
    select granted into already from public.efaa_class_daily
    where user_id = p_user_id and day = today for update;
  else
    update public.efaa_class_daily
    set granted = already
    where user_id = p_user_id and day = today
      and granted is distinct from already;
  end if;

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
    where user_id = p_user_id returning * into rec;

    update public.efaa_class_daily
    set granted = coalesce(already, 0) + awarded
    where user_id = p_user_id and day = today;

    metadata := case when source_type = 'speaking'
      then jsonb_build_object(
        'duration_seconds',
        greatest(coalesce(nullif(current_setting('efaa.challenge_duration', true), '')::integer, 0), 0)
      )
      else '{}'::jsonb end;
    perform efaa_private.challenge_record_award(
      p_user_id, awarded, source_type, source_event_id, metadata
    );
  end if;

  perform set_config('efaa.challenge_source', '', true);
  perform set_config('efaa.challenge_event_id', '', true);
  perform set_config('efaa.challenge_duration', '', true);

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

revoke all on function public.efaa_grant_class_points(text, integer) from public, anon, authenticated;

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
  practiced boolean := speech >= 20;
begin
  if p_user_id is null or length(trim(p_user_id)) = 0 then raise exception 'user_id required'; end if;
  if p_user_id = 'efaa-admin' then
    return jsonb_build_object(
      'total_points', 0, 'diamonds_count', 0, 'current_streak', 0,
      'matchs_tonight_count', 0, 'points_gained', 0, 'diamonds_gained', 0,
      'daily_remaining', 0
    );
  end if;

  wanted := 10 + (speech / 10);
  if public.efaa_bonus_active() then wanted := least(wanted, 50); end if;

  select * into campaign from efaa_private.challenge_for_scoring();
  if campaign.id is not null then
    select * into participant
    from efaa_private.challenge_participant_for_scoring(campaign.id, p_user_id);
    if participant.id is not null then
      in_challenge := true;
      wanted := case when practiced then 20 else 0 end;
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

  -- Only count a match after we know practice happened; points come next.
  if practiced then
    rec.matchs_tonight_count := rec.matchs_tonight_count + 1;
  end if;
  rec.last_activity_date := today;
  update public.efaa_user_gamification
  set current_streak = rec.current_streak,
      last_activity_date = rec.last_activity_date,
      matchs_tonight_count = rec.matchs_tonight_count,
      updated_at = now()
  where user_id = p_user_id returning * into rec;

  perform set_config('efaa.challenge_source', 'speaking', true);
  perform set_config(
    'efaa.challenge_event_id',
    'speaking:' || p_user_id || ':' || today::text || ':' || gen_random_uuid()::text,
    true
  );
  perform set_config('efaa.challenge_duration', speech::text, true);
  grant_row := public.efaa_grant_class_points(p_user_id, wanted);
  total_gained := coalesce((grant_row->>'points_gained')::integer, 0);
  total_diamonds := coalesce((grant_row->>'diamonds_gained')::integer, 0);

  if practiced and in_challenge and rec.matchs_tonight_count in (5, 10) then
    perform set_config('efaa.challenge_source', 'flame', true);
    perform set_config(
      'efaa.challenge_event_id',
      'flame:' || p_user_id || ':' || today::text || ':' || rec.matchs_tonight_count::text,
      true
    );
    flame_row := public.efaa_grant_class_points(p_user_id, 30);
    total_gained := total_gained + coalesce((flame_row->>'points_gained')::integer, 0);
    total_diamonds := total_diamonds + coalesce((flame_row->>'diamonds_gained')::integer, 0);
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

-- Backfill: students who already have matchs_tonight_count today but missing speaking txs.
do $$
declare
  today date := public.efaa_academy_today();
  r record;
  missing integer;
  i integer;
  event_id text;
begin
  for r in
    select g.user_id,
           g.matchs_tonight_count,
           coalesce((
             select count(*)::integer
             from public.efaa_challenge_points_transactions t
             where t.user_id = g.user_id
               and t.academy_day = today
               and t.source_type = 'speaking'
           ), 0) as speaking_tx
    from public.efaa_user_gamification g
    join public.efaa_challenge_participants p
      on p.user_id = g.user_id
     and p.challenge_id = 'english-2026'
     and p.status = 'active'
    where g.last_activity_date = today
      and g.matchs_tonight_count > 0
      and g.user_id <> 'efaa-admin'
  loop
    missing := greatest(r.matchs_tonight_count - r.speaking_tx, 0);
    if missing <= 0 then continue; end if;
    for i in 1..missing loop
      event_id := 'speaking:' || r.user_id || ':' || today::text || ':backfill:' || gen_random_uuid()::text;
      perform set_config('efaa.challenge_source', 'speaking', true);
      perform set_config('efaa.challenge_event_id', event_id, true);
      perform set_config('efaa.challenge_duration', '20', true);
      perform public.efaa_grant_class_points(r.user_id, 20);
    end loop;
  end loop;
end;
$$;
