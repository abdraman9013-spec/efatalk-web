-- Arena games: +1 class point per 20 arena personal points, no 700/day cap (challenge stays separate).

create or replace function public.efaa_flush_game_board_bonus(p_user_id text)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  rec public.efaa_user_game_state%rowtype;
  g public.efaa_user_gamification%rowtype;
  next_threshold integer;
  steps integer;
  awarded integer := 0;
  combined integer;
  diamonds_add integer := 0;
begin
  if p_user_id is null or length(trim(p_user_id)) = 0 or p_user_id = 'efaa-admin' then
    return 0;
  end if;

  select * into rec from public.efaa_user_game_state where user_id = p_user_id for update;
  if rec.user_id is null then
    return 0;
  end if;

  next_threshold := floor(rec.personal_points / 20.0)::integer;
  if next_threshold <= coalesce(rec.last_board_threshold, 0) then
    return 0;
  end if;

  steps := next_threshold - coalesce(rec.last_board_threshold, 0);
  awarded := steps;

  update public.efaa_user_game_state
  set last_board_threshold = next_threshold,
      updated_at = now()
  where user_id = p_user_id;

  insert into public.efaa_user_gamification (user_id)
  values (p_user_id)
  on conflict (user_id) do nothing;

  select * into g from public.efaa_user_gamification where user_id = p_user_id for update;
  if g.user_id is null then
    return awarded;
  end if;

  combined := g.total_points + awarded;
  diamonds_add := combined / 10000;
  g.total_points := combined % 10000;
  g.diamonds_count := g.diamonds_count + diamonds_add;

  update public.efaa_user_gamification
  set total_points = g.total_points,
      diamonds_count = g.diamonds_count,
      updated_at = now()
  where user_id = p_user_id;

  return awarded;
end;
$$;
