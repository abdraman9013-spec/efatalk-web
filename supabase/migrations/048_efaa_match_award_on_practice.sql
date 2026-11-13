-- Award a match on real practice time (leave after 20s+), not only when the
-- 3/15/30 minute clock hits zero. Unique event id per grant so later matches
-- are never collapsed onto speaking:{user}:{day}:{stuck_count}.

update public.efaa_challenge_activities
set min_duration_seconds = 20, updated_at = now()
where challenge_id = 'english-2026' and activity_type = 'speaking';

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
  wanted := 10 + (speech / 10);
  if public.efaa_bonus_active() then wanted := least(wanted, 50); end if;

  select * into campaign from efaa_private.challenge_for_scoring();
  if campaign.id is not null then
    select * into participant from efaa_private.challenge_participant_owned(campaign.id, p_user_id);
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
