-- Classic card win points (no challenge card_corrects grant).

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
