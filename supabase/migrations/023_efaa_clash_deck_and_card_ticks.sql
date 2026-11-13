-- Wider Clash decks so World Cup never loops 3–5 words.
-- Card wins always persist, and class-board ticks every 20 arena XP (same 100→5 rate).

update public.efaa_user_game_state
set last_board_threshold = floor(personal_points / 20.0)::integer;

create or replace function public.efaa_get_seeded_words(
  p_seed text,
  p_user_id text,
  p_partner_id text,
  p_limit integer
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  effective integer;
  lo integer;
  hi integer;
  cap integer;
  have integer := 0;
  words jsonb;
  seed text;
  left_id text;
  right_id text;
begin
  if coalesce(p_user_id, '') = '' then
    raise exception 'invalid user';
  end if;

  effective := public.efaa_effective_mastery(p_user_id);
  if coalesce(p_partner_id, '') <> '' and p_partner_id <> p_user_id then
    effective := least(effective, public.efaa_effective_mastery(p_partner_id));
  end if;

  lo := greatest(1, effective - 20);
  hi := least(100, effective + 20);
  cap := greatest(24, least(coalesce(p_limit, 48), 80));
  left_id := least(p_user_id, coalesce(nullif(p_partner_id, ''), p_user_id));
  right_id := greatest(p_user_id, coalesce(nullif(p_partner_id, ''), p_user_id));
  seed := coalesce(nullif(p_seed, ''), 'world-cup')
    || ':' || left_id
    || ':' || right_id
    || ':' || public.efaa_academy_today()::text;

  select count(*)::integer into have
  from public.efaa_vocabulary
  where difficulty_index between lo and hi;

  if have < 24 then
    lo := 1;
    hi := 100;
  end if;

  select coalesce(jsonb_agg(to_jsonb(picked) order by picked.rank), '[]'::jsonb)
  into words
  from (
    select
      id,
      word_en,
      translation_fr,
      translation_ar,
      difficulty_index,
      category,
      image_url,
      md5(seed || ':' || word_key) as rank
    from public.efaa_vocabulary
    where difficulty_index between lo and hi
    order by md5(seed || ':' || word_key)
    limit cap
  ) picked;

  if coalesce(jsonb_array_length(words), 0) < 24 then
    select coalesce(jsonb_agg(to_jsonb(picked) order by picked.rank), '[]'::jsonb)
    into words
    from (
      select
        id,
        word_en,
        translation_fr,
        translation_ar,
        difficulty_index,
        category,
        image_url,
        md5(seed || ':' || word_key) as rank
      from public.efaa_vocabulary
      order by md5(seed || ':' || word_key)
      limit cap
    ) picked;
    lo := 1;
    hi := 100;
  end if;

  return jsonb_build_object(
    'effective_mastery', effective,
    'range', jsonb_build_array(lo, hi),
    'words', coalesce(words, '[]'::jsonb)
  );
end;
$$;

create or replace function public.efaa_flush_game_board_bonus(p_user_id text)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  rec public.efaa_user_game_state%rowtype;
  next_threshold integer;
  steps integer;
  awarded integer := 0;
  grant_row jsonb;
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

  grant_row := public.efaa_grant_class_points(p_user_id, awarded);
  return coalesce((grant_row->>'points_gained')::integer, 0);
end;
$$;

create or replace function public.efaa_add_game_points(p_user_id text, p_points integer)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  rec public.efaa_user_game_state%rowtype;
  gain integer := least(greatest(coalesce(p_points, 0), 0), 3);
  bonus integer := 0;
begin
  if p_user_id is null or length(trim(p_user_id)) = 0 then
    raise exception 'user_id required';
  end if;

  select * into rec from public.efaa_user_game_state where user_id = p_user_id;
  if rec.user_id is null then
    perform public.efaa_ensure_game_state(p_user_id, '', '');
  end if;

  select * into rec from public.efaa_user_game_state where user_id = p_user_id for update;
  if rec.user_id is null then
    raise exception 'game state missing';
  end if;

  if gain = 0 then
    return to_jsonb(rec) || jsonb_build_object('board_bonus', 0);
  end if;

  update public.efaa_user_game_state
  set personal_points = personal_points + gain,
      updated_at = now()
  where user_id = p_user_id
  returning * into rec;

  bonus := public.efaa_flush_game_board_bonus(p_user_id);
  select * into rec from public.efaa_user_game_state where user_id = p_user_id;
  return to_jsonb(rec) || jsonb_build_object('board_bonus', bonus);
end;
$$;

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

  select * into rec from public.efaa_user_game_state where user_id = p_user_id;
  if rec.user_id is null then
    perform public.efaa_ensure_game_state(p_user_id, '', '');
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

grant execute on function public.efaa_get_seeded_words(text, text, text, integer) to anon, authenticated;
grant execute on function public.efaa_flush_game_board_bonus(text) to anon, authenticated;
grant execute on function public.efaa_add_game_points(text, integer) to anon, authenticated;
grant execute on function public.efaa_award_game_win(text) to anon, authenticated;
