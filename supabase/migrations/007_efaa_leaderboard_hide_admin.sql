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
    where user_id <> 'efaa-admin'
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
    g.user_id <> 'efaa-admin'
    and (
      g.diamonds_count > me.diamonds_count
      or (g.diamonds_count = me.diamonds_count and g.total_points > me.total_points)
      or (g.diamonds_count = me.diamonds_count and g.total_points = me.total_points and g.current_streak > me.current_streak)
      or (g.diamonds_count = me.diamonds_count and g.total_points = me.total_points and g.current_streak = me.current_streak and g.user_id < me.user_id)
    );

  select *
  into rival
  from public.efaa_user_gamification g
  where
    g.user_id <> me.user_id
    and g.user_id <> 'efaa-admin'
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
