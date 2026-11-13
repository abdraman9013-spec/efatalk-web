-- Board names: nom (family) then prenom (given). Compose from real student rows.

create or replace function public.efaa_student_board_name(p_user_id text)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (
      select btrim(regexp_replace(
        concat_ws(' ', nullif(btrim(p.last_name), ''), nullif(btrim(p.first_name), '')),
        '\s+', ' ', 'g'
      ))
      from public.efaa_practice_students p
      where p.id::text = p_user_id
      limit 1
    ),
    (
      select btrim(regexp_replace(
        concat_ws(' ', nullif(btrim(a.last_name), ''), nullif(btrim(a.first_name), '')),
        '\s+', ' ', 'g'
      ))
      from public.efaa_active_students a
      where a.id::text = p_user_id
      limit 1
    )
  );
$$;

revoke all on function public.efaa_student_board_name(text) from public;

-- Backfill denormalized board names from first_name/last_name (prenom/nom).
update public.efaa_user_gamification g
set
  display_name = n.board_name,
  updated_at = timezone('utc', now())
from (
  select
    s.user_id,
    btrim(regexp_replace(
      concat_ws(' ', nullif(btrim(s.last_name), ''), nullif(btrim(s.first_name), '')),
      '\s+', ' ', 'g'
    )) as board_name
  from (
    select id::text as user_id, first_name, last_name from public.efaa_practice_students
    union all
    select id::text, first_name, last_name from public.efaa_active_students
  ) s
) n
where g.user_id = n.user_id
  and n.board_name <> ''
  and g.display_name is distinct from n.board_name;

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
      g.total_points
    from public.efaa_user_gamification g
    where g.user_id <> 'efaa-admin'
      and btrim(coalesce(nullif(public.efaa_student_board_name(g.user_id), ''), g.display_name, '')) <> ''
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
    and btrim(coalesce(nullif(public.efaa_student_board_name(g.user_id), ''), g.display_name, '')) <> ''
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
    and btrim(coalesce(nullif(public.efaa_student_board_name(g.user_id), ''), g.display_name, '')) <> ''
    and (
      exists (select 1 from public.efaa_practice_students p where p.id::text = g.user_id)
      or exists (select 1 from public.efaa_active_students a where a.id::text = g.user_id)
    )
    and g.total_points > coalesce(me.total_points, 0)
  order by g.total_points asc, g.diamonds_count asc, g.user_id asc
  limit 1;

  if rival.user_id is not null then
    gap := rival.total_points - coalesce(me.total_points, 0);
    rival_name := coalesce(nullif(public.efaa_student_board_name(rival.user_id), ''), rival.display_name);
  end if;

  return jsonb_build_object(
    'top', coalesce(top_rows, '[]'::jsonb),
    'me', to_jsonb(me) || jsonb_build_object('display_name', coalesce(me_name, me.display_name)),
    'rank', my_rank,
    'rival', case
      when rival.user_id is null then null
      else to_jsonb(rival) || jsonb_build_object('display_name', coalesce(rival_name, rival.display_name))
    end,
    'gap', greatest(gap, 0)
  );
end;
$$;

grant execute on function public.efaa_leaderboard_for(text) to anon, authenticated;
