-- Daily gold line: 700. 15 days x 700 = 10500 diamond.
-- Match 20 x 15 = 300. Flame +30 at 5 and 10 matches = 60. Match+flame = 360.
-- Cards: 100 card pts (1 win) = 15 challenge, cap 200.
-- Clash win: 5 pts + lightning, cap 100.
-- Phrases/slang: 40 once.

update public.efaa_challenges
set
  daily_points_cap = 700,
  referral_points = 0,
  referral_points_cap = 0,
  updated_at = now()
where id = 'english-2026';

update public.efaa_challenge_activities
set points = 20, daily_points_cap = 300, max_completions_per_day = 15, enabled = true, updated_at = now()
where challenge_id = 'english-2026' and activity_type = 'speaking';

update public.efaa_challenge_activities
set points = 15, daily_points_cap = 200, max_completions_per_day = 14, enabled = true, updated_at = now()
where challenge_id = 'english-2026' and activity_type = 'card';

update public.efaa_challenge_activities
set points = 5, daily_points_cap = 100, max_completions_per_day = 20, enabled = true, updated_at = now()
where challenge_id = 'english-2026' and activity_type = 'clash';

update public.efaa_challenge_activities
set points = 40, daily_points_cap = 40, max_completions_per_day = 1, enabled = true, updated_at = now()
where challenge_id = 'english-2026' and activity_type = 'formation';

update public.efaa_challenge_activities
set points = 30, daily_points_cap = 60, max_completions_per_day = 2, enabled = true, updated_at = now()
where challenge_id = 'english-2026' and activity_type = 'flame';

update public.efaa_challenge_activities
set points = 0, daily_points_cap = 0, enabled = false, updated_at = now()
where challenge_id = 'english-2026' and activity_type in ('daily_challenge', 'quiz', 'learning');

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
begin
  if p_user_id is null or length(trim(p_user_id)) = 0 then raise exception 'user_id required'; end if;
  wanted := 10 + (speech / 10);
  if public.efaa_bonus_active() then wanted := least(wanted, 50); end if;

  select * into campaign from efaa_private.challenge_for_scoring();
  if campaign.id is not null then
    select * into participant from efaa_private.challenge_participant_owned(campaign.id, p_user_id);
    if participant.id is not null then
      in_challenge := true;
      wanted := case when speech >= 30 then 20 else 0 end;
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
  if speech >= 30 then
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
    'speaking:' || p_user_id || ':' || today::text || ':' || rec.matchs_tonight_count::text,
    true
  );
  perform set_config('efaa.challenge_duration', speech::text, true);
  grant_row := public.efaa_grant_class_points(p_user_id, wanted);
  total_gained := coalesce((grant_row->>'points_gained')::integer, 0);
  total_diamonds := coalesce((grant_row->>'diamonds_gained')::integer, 0);

  if speech >= 30 and in_challenge and rec.matchs_tonight_count in (5, 10) then
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

create or replace function public.efaa_award_game_win(p_user_id text)
returns jsonb
language plpgsql
security definer
set search_path = public, efaa_private
as $$
declare
  rec public.efaa_user_game_state%rowtype;
  board public.efaa_countries_leaderboard%rowtype;
  bonus integer := 0;
  campaign public.efaa_challenges%rowtype;
  participant public.efaa_challenge_participants%rowtype;
  stats public.efaa_challenge_daily_stats%rowtype;
  today date := public.efaa_academy_today();
  card_award jsonb;
begin
  if p_user_id is null or length(trim(p_user_id)) = 0 then raise exception 'user_id required'; end if;
  select * into rec from public.efaa_user_game_state where user_id = p_user_id for update;
  if rec.user_id is null then raise exception 'game state missing'; end if;
  update public.efaa_user_game_state
  set personal_points = personal_points + 2, updated_at = now()
  where user_id = p_user_id returning * into rec;
  insert into public.efaa_countries_leaderboard (country_code, country_name, flag_emoji, total_score)
  values (rec.country_code, rec.country_code, public.efaa_flag_emoji(rec.country_code), 20)
  on conflict (country_code) do update
  set total_score = efaa_countries_leaderboard.total_score + 20, updated_at = now()
  returning * into board;
  bonus := public.efaa_flush_game_board_bonus(p_user_id);

  select * into campaign from efaa_private.challenge_for_scoring();
  if campaign.id is not null then
    select * into participant
    from efaa_private.challenge_participant_owned(campaign.id, p_user_id);
    if participant.id is not null then
      insert into public.efaa_challenge_daily_stats (
        challenge_id, participant_id, academy_day, card_corrects
      ) values (campaign.id, participant.id, today, 100)
      on conflict (challenge_id, participant_id, academy_day) do update
      set card_corrects = public.efaa_challenge_daily_stats.card_corrects + 100,
          updated_at = now()
      returning * into stats;
      perform set_config('efaa.challenge_source', 'card', true);
      perform set_config(
        'efaa.challenge_event_id',
        'card:' || p_user_id || ':' || today::text || ':' || (stats.card_corrects / 100)::text,
        true
      );
      card_award := public.efaa_grant_class_points(p_user_id, 15);
    end if;
  end if;

  select * into rec from public.efaa_user_game_state where user_id = p_user_id;
  return jsonb_build_object(
    'personal_points', rec.personal_points,
    'lightning_bolts', rec.lightning_bolts,
    'country_code', rec.country_code,
    'country_score', board.total_score,
    'personal_gained', 2,
    'country_gained', 20,
    'board_bonus', bonus,
    'challenge_card_points', coalesce((card_award->>'points_gained')::integer, 0)
  );
end;
$$;

create or replace function public.efaa_settle_clash(
  p_winner text,
  p_loser text,
  p_wager integer default 1
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  wager integer := greatest(coalesce(p_wager, 1), 1);
  win_game public.efaa_user_game_state%rowtype;
  lose_game public.efaa_user_game_state%rowtype;
  win_elo public.efaa_user_elo%rowtype;
  lose_elo public.efaa_user_elo%rowtype;
  paid integer;
  today date := public.efaa_academy_today();
  clash_row jsonb := '{}'::jsonb;
  stamp text := (extract(epoch from clock_timestamp()) * 1000)::bigint::text;
begin
  if p_winner is null or p_loser is null or p_winner = p_loser then
    raise exception 'invalid clash players';
  end if;

  insert into public.efaa_user_game_state (user_id, referral_code, country_code)
  values
    (p_winner, 'EFA' || upper(substr(md5(p_winner), 1, 6)), 'TD'),
    (p_loser, 'EFA' || upper(substr(md5(p_loser), 1, 6)), 'TD')
  on conflict (user_id) do nothing;

  perform public.efaa_ensure_elo(p_winner);
  perform public.efaa_ensure_elo(p_loser);

  select * into lose_game from public.efaa_user_game_state where user_id = p_loser for update;
  select * into win_game from public.efaa_user_game_state where user_id = p_winner for update;
  paid := least(wager, coalesce(lose_game.lightning_bolts, 0));

  update public.efaa_user_game_state
  set lightning_bolts = lightning_bolts - paid, updated_at = now()
  where user_id = p_loser
  returning * into lose_game;

  update public.efaa_user_game_state
  set lightning_bolts = least(20, lightning_bolts + paid), updated_at = now()
  where user_id = p_winner
  returning * into win_game;

  update public.efaa_user_elo
  set elo = elo + 16, wins = wins + 1, updated_at = now()
  where user_id = p_winner
  returning * into win_elo;

  update public.efaa_user_elo
  set elo = greatest(100, elo - 12), losses = losses + 1, updated_at = now()
  where user_id = p_loser
  returning * into lose_elo;

  begin
    perform set_config('efaa.challenge_source', 'clash', true);
    perform set_config('efaa.challenge_event_id', 'clash:' || p_winner || ':' || today::text || ':' || stamp, true);
    clash_row := public.efaa_grant_class_points(p_winner, 5);
  exception when others then
    clash_row := '{}'::jsonb;
  end;

  return jsonb_build_object(
    'winner_bolts', win_game.lightning_bolts,
    'loser_bolts', lose_game.lightning_bolts,
    'winner_elo', win_elo.elo,
    'loser_elo', lose_elo.elo,
    'paid', paid,
    'challenge_points', coalesce((clash_row->>'points_gained')::integer, 0)
  );
end;
$$;

create table if not exists public.efaa_clash_lobby (
  user_id text primary key,
  name text not null default 'Rival',
  photo text,
  nationality text,
  heartbeat timestamptz not null default now()
);

alter table public.efaa_clash_lobby enable row level security;
alter table public.efaa_clash_lobby replica identity full;

drop policy if exists efaa_clash_lobby_select on public.efaa_clash_lobby;
create policy efaa_clash_lobby_select on public.efaa_clash_lobby for select using (true);
grant select on public.efaa_clash_lobby to anon, authenticated;

create table if not exists public.efaa_clash_signs (
  id uuid primary key default gen_random_uuid(),
  from_user text not null,
  to_user text not null,
  from_name text not null default 'Rival',
  to_name text not null default 'Rival',
  status text not null default 'pending',
  room_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists efaa_clash_signs_to_idx on public.efaa_clash_signs (to_user, status, created_at desc);
create index if not exists efaa_clash_signs_from_idx on public.efaa_clash_signs (from_user, status, created_at desc);

alter table public.efaa_clash_signs enable row level security;
alter table public.efaa_clash_signs replica identity full;

drop policy if exists efaa_clash_signs_select on public.efaa_clash_signs;
create policy efaa_clash_signs_select on public.efaa_clash_signs for select using (true);
grant select on public.efaa_clash_signs to anon, authenticated;

do $$
begin
  begin
    alter publication supabase_realtime add table public.efaa_clash_lobby;
  exception when duplicate_object then null; when undefined_object then null; end;
  begin
    alter publication supabase_realtime add table public.efaa_clash_signs;
  exception when duplicate_object then null; when undefined_object then null; end;
end $$;

create or replace function public.efaa_clash_lobby_pulse(
  p_user text,
  p_name text default 'Rival',
  p_photo text default null,
  p_nat text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  if coalesce(p_user, '') = '' then raise exception 'user required'; end if;
  delete from public.efaa_clash_lobby where heartbeat < now() - interval '12 seconds';
  delete from public.efaa_clash_signs
  where status = 'pending' and created_at < now() - interval '90 seconds';
  insert into public.efaa_clash_lobby (user_id, name, photo, nationality, heartbeat)
  values (p_user, coalesce(nullif(p_name, ''), 'Rival'), nullif(p_photo, ''), nullif(p_nat, ''), now())
  on conflict (user_id) do update set
    name = excluded.name,
    photo = excluded.photo,
    nationality = excluded.nationality,
    heartbeat = now();
  return jsonb_build_object(
    'online', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', l.user_id,
        'name', l.name,
        'photo', l.photo,
        'nationality', l.nationality
      ) order by l.name)
      from public.efaa_clash_lobby l
      where l.user_id <> p_user
    ), '[]'::jsonb),
    'inbox', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', s.id,
        'from_user', s.from_user,
        'to_user', s.to_user,
        'from_name', s.from_name,
        'to_name', s.to_name,
        'status', s.status,
        'room_id', s.room_id
      ) order by s.created_at desc)
      from public.efaa_clash_signs s
      where (s.to_user = p_user or s.from_user = p_user)
        and s.created_at > now() - interval '3 minutes'
        and s.status in ('pending', 'accepted')
    ), '[]'::jsonb)
  );
end;
$$;

create or replace function public.efaa_clash_lobby_leave(p_user text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from public.efaa_clash_lobby where user_id = p_user;
end;
$$;

create or replace function public.efaa_clash_sign_send(
  p_from text,
  p_to text,
  p_from_name text default 'Rival',
  p_to_name text default 'Rival'
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  rec public.efaa_clash_signs%rowtype;
begin
  if coalesce(p_from, '') = '' or coalesce(p_to, '') = '' or p_from = p_to then
    raise exception 'invalid sign';
  end if;
  delete from public.efaa_clash_signs
  where status = 'pending'
    and ((from_user = p_from and to_user = p_to) or (from_user = p_to and to_user = p_from));
  insert into public.efaa_clash_signs (from_user, to_user, from_name, to_name, status)
  values (p_from, p_to, coalesce(nullif(p_from_name, ''), 'Rival'), coalesce(nullif(p_to_name, ''), 'Rival'), 'pending')
  returning * into rec;
  return to_jsonb(rec);
end;
$$;

create or replace function public.efaa_clash_sign_act(
  p_id uuid,
  p_user text,
  p_accept boolean
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  rec public.efaa_clash_signs%rowtype;
begin
  select * into rec from public.efaa_clash_signs where id = p_id for update;
  if rec.id is null then raise exception 'sign missing'; end if;
  if rec.to_user <> p_user and rec.from_user <> p_user then raise exception 'not your sign'; end if;
  if rec.status <> 'pending' then return to_jsonb(rec); end if;
  if p_accept then
    rec.status := 'accepted';
    rec.room_id := 's-' || replace(rec.id::text, '-', '');
  else
    rec.status := 'declined';
  end if;
  rec.updated_at := now();
  update public.efaa_clash_signs
  set status = rec.status, room_id = rec.room_id, updated_at = rec.updated_at
  where id = rec.id;
  return to_jsonb(rec);
end;
$$;

grant execute on function public.efaa_clash_lobby_pulse(text, text, text, text) to anon, authenticated;
grant execute on function public.efaa_clash_lobby_leave(text) to anon, authenticated;
grant execute on function public.efaa_clash_sign_send(text, text, text, text) to anon, authenticated;
grant execute on function public.efaa_clash_sign_act(uuid, text, boolean) to anon, authenticated;
