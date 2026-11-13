-- Leaderboard: only real practice/official students. Honest point gaps. No padded Top 5.

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
begin
  select * into me from public.efaa_user_gamification where user_id = p_user_id;

  select jsonb_agg(row_to_json(t))
  into top_rows
  from (
    select
      g.user_id,
      g.display_name,
      g.nationality,
      g.current_streak,
      g.diamonds_count,
      g.total_points
    from public.efaa_user_gamification g
    where g.user_id <> 'efaa-admin'
      and btrim(coalesce(g.display_name, '')) <> ''
      and (
        exists (select 1 from public.efaa_practice_students p where p.id::text = g.user_id)
        or exists (select 1 from public.efaa_active_students a where a.id::text = g.user_id)
      )
    order by g.total_points desc, g.diamonds_count desc, g.current_streak desc, g.user_id asc
  ) t;

  if me.user_id is null then
    return jsonb_build_object('top', coalesce(top_rows, '[]'::jsonb), 'me', null, 'rank', null, 'rival', null, 'gap', 0);
  end if;

  select count(*)::integer + 1
  into my_rank
  from public.efaa_user_gamification g
  where g.user_id <> 'efaa-admin'
    and btrim(coalesce(g.display_name, '')) <> ''
    and (
      exists (select 1 from public.efaa_practice_students p where p.id::text = g.user_id)
      or exists (select 1 from public.efaa_active_students a where a.id::text = g.user_id)
    )
    and (
      g.total_points > coalesce(me.total_points, 0)
      or (g.total_points = coalesce(me.total_points, 0) and g.diamonds_count > coalesce(me.diamonds_count, 0))
      or (
        g.total_points = coalesce(me.total_points, 0)
        and g.diamonds_count = coalesce(me.diamonds_count, 0)
        and g.current_streak > coalesce(me.current_streak, 0)
      )
      or (
        g.total_points = coalesce(me.total_points, 0)
        and g.diamonds_count = coalesce(me.diamonds_count, 0)
        and g.current_streak = coalesce(me.current_streak, 0)
        and g.user_id < me.user_id
      )
    );

  select *
  into rival
  from public.efaa_user_gamification g
  where g.user_id <> me.user_id
    and g.user_id <> 'efaa-admin'
    and btrim(coalesce(g.display_name, '')) <> ''
    and (
      exists (select 1 from public.efaa_practice_students p where p.id::text = g.user_id)
      or exists (select 1 from public.efaa_active_students a where a.id::text = g.user_id)
    )
    and g.total_points > coalesce(me.total_points, 0)
  order by g.total_points asc, g.diamonds_count asc, g.user_id asc
  limit 1;

  if rival.user_id is not null then
    gap := rival.total_points - coalesce(me.total_points, 0);
  end if;

  return jsonb_build_object(
    'top', coalesce(top_rows, '[]'::jsonb),
    'me', to_jsonb(me),
    'rank', my_rank,
    'rival', case when rival.user_id is null then null else to_jsonb(rival) end,
    'gap', greatest(gap, 0)
  );
end;
$$;

grant execute on function public.efaa_leaderboard_for(text) to anon, authenticated;
