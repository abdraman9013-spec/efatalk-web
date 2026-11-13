create or replace function public.efaa_retention_pulse()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  today date := public.efaa_academy_today();
  this_start date := today - 6;
  prev_start date := today - 13;
  prev_end date := today - 7;
begin
  return jsonb_build_object(
    'ok', true,
    'today', today,
    'boardActiveThis', (select count(distinct user_id) from efaa_class_daily where day between this_start and today),
    'boardActivePrev', (select count(distinct user_id) from efaa_class_daily where day between prev_start and prev_end),
    'pointsThis', (select coalesce(sum(granted),0) from efaa_class_daily where day between this_start and today),
    'pointsPrev', (select coalesce(sum(granted),0) from efaa_class_daily where day between prev_start and prev_end),
    'matchActiveThis', (select count(*) from efaa_user_gamification where last_activity_date between this_start and today),
    'matchActivePrev', (select count(*) from efaa_user_gamification where last_activity_date between prev_start and prev_end),
    'formationThis', (select count(*) from efaa_user_gamification where last_formation_at::date between this_start and today),
    'flaming', (select count(*) from efaa_user_gamification where current_streak > 0),
    'pushSubs', (select count(*) from efaa_push_subs),
    'practice', (select count(*) from efaa_practice_students),
    'official', (select count(*) from efaa_active_students),
    'clash', (select count(*) from efaa_user_game_state)
  );
end;
$$;

grant execute on function public.efaa_retention_pulse() to anon, authenticated;
