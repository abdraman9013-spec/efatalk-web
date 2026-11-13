create or replace function public.efaa_class_member(p_user_id text, p_level text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.efaa_practice_students p
    where p.id::text = p_user_id
      and p.level = p_level
  )
  or exists (
    select 1
    from public.efaa_active_students a
    where a.id::text = p_user_id
      and a.level = p_level
  );
$$;

create or replace function public.efaa_leaderboard_for_level(p_user_id text, p_level text)
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
  class_level text := case
    when p_level in ('beginner', 'intermediate', 'advanced') then p_level
    else 'beginner'
  end;
begin
  select * into me from public.efaa_user_gamification where user_id = p_user_id;
  me_name := coalesce(nullif(public.efaa_student_board_name(p_user_id), ''), me.display_name);

  select jsonb_agg(row_to_json(t))
    into top_rows
  from (
    select
      r.user_id,
      coalesce(nullif(public.efaa_student_board_name(r.user_id), ''), g.display_name) as display_name,
      coalesce(g.nationality, 'TD') as nationality,
      coalesce(g.current_streak, 0) as current_streak,
      coalesce(g.diamonds_count, 0) as diamonds_count,
      coalesce(g.total_points, 0) as total_points,
      public.efaa_student_avatar_url(r.user_id) as photo
    from (
      select p.id::text as user_id
      from public.efaa_practice_students p
      where p.level = class_level
      union
      select a.id::text as user_id
      from public.efaa_active_students a
      where a.level = class_level
    ) r
    left join public.efaa_user_gamification g on g.user_id = r.user_id
    where r.user_id <> 'efaa-admin'
      and btrim(coalesce(nullif(public.efaa_student_board_name(r.user_id), ''), g.display_name, '')) <> ''
    order by
      coalesce(g.diamonds_count, 0) desc,
      coalesce(g.total_points, 0) desc,
      coalesce(g.current_streak, 0) desc,
      r.user_id asc
    limit 10
  ) t;

  if me.user_id is null then
    return jsonb_build_object('top', coalesce(top_rows, '[]'::jsonb), 'me', null, 'rank', null, 'rival', null, 'gap', 0);
  end if;

  select count(*)::integer + 1
  into my_rank
  from (
    select p.id::text as user_id
    from public.efaa_practice_students p
    where p.level = class_level
    union
    select a.id::text as user_id
    from public.efaa_active_students a
    where a.level = class_level
  ) r
  left join public.efaa_user_gamification g on g.user_id = r.user_id
  where r.user_id <> 'efaa-admin'
    and r.user_id <> me.user_id
    and btrim(coalesce(nullif(public.efaa_student_board_name(r.user_id), ''), g.display_name, '')) <> ''
    and (
      coalesce(g.diamonds_count, 0) > coalesce(me.diamonds_count, 0)
      or (coalesce(g.diamonds_count, 0) = coalesce(me.diamonds_count, 0) and coalesce(g.total_points, 0) > coalesce(me.total_points, 0))
      or (
        coalesce(g.diamonds_count, 0) = coalesce(me.diamonds_count, 0)
        and coalesce(g.total_points, 0) = coalesce(me.total_points, 0)
        and coalesce(g.current_streak, 0) > coalesce(me.current_streak, 0)
      )
      or (
        coalesce(g.diamonds_count, 0) = coalesce(me.diamonds_count, 0)
        and coalesce(g.total_points, 0) = coalesce(me.total_points, 0)
        and coalesce(g.current_streak, 0) = coalesce(me.current_streak, 0)
        and r.user_id < me.user_id
      )
    );

  if not public.efaa_class_member(me.user_id, class_level) then
    my_rank := null;
  end if;

  select g.*
  into rival
  from (
    select p.id::text as user_id
    from public.efaa_practice_students p
    where p.level = class_level
    union
    select a.id::text as user_id
    from public.efaa_active_students a
    where a.level = class_level
  ) r
  join public.efaa_user_gamification g on g.user_id = r.user_id
  where r.user_id <> me.user_id
    and r.user_id <> 'efaa-admin'
    and btrim(coalesce(nullif(public.efaa_student_board_name(r.user_id), ''), g.display_name, '')) <> ''
    and (
      g.diamonds_count > coalesce(me.diamonds_count, 0)
      or (g.diamonds_count = coalesce(me.diamonds_count, 0) and g.total_points > coalesce(me.total_points, 0))
    )
  order by g.diamonds_count asc, g.total_points asc, r.user_id asc
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

grant execute on function public.efaa_class_member(text, text) to anon, authenticated;
grant execute on function public.efaa_leaderboard_for_level(text, text) to anon, authenticated;
