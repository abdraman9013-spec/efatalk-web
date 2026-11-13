-- Word Clash 1v1. Elo + energy settle only. Never touches daily streak.

create table if not exists public.efaa_user_elo (
  user_id text primary key,
  elo integer not null default 1000 check (elo >= 100),
  wins integer not null default 0 check (wins >= 0),
  losses integer not null default 0 check (losses >= 0),
  updated_at timestamptz not null default now()
);

alter table public.efaa_user_elo enable row level security;

drop policy if exists efaa_user_elo_select on public.efaa_user_elo;
create policy efaa_user_elo_select
  on public.efaa_user_elo for select
  using (true);

grant select on public.efaa_user_elo to anon, authenticated;

create or replace function public.efaa_ensure_elo(p_user_id text)
returns public.efaa_user_elo
language plpgsql
security definer
set search_path = public
as $$
declare
  rec public.efaa_user_elo%rowtype;
begin
  insert into public.efaa_user_elo (user_id)
  values (p_user_id)
  on conflict (user_id) do nothing;
  select * into rec from public.efaa_user_elo where user_id = p_user_id;
  return rec;
end;
$$;

-- Winner absorbs loser's wager. Does NOT touch efaa_user_gamification.current_streak.
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
  paid := least(wager, lose_game.lightning_bolts);

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

  return jsonb_build_object(
    'winner_bolts', win_game.lightning_bolts,
    'loser_bolts', lose_game.lightning_bolts,
    'winner_elo', win_elo.elo,
    'loser_elo', lose_elo.elo,
    'paid', paid
  );
end;
$$;

grant execute on function public.efaa_ensure_elo(text) to anon, authenticated;
grant execute on function public.efaa_settle_clash(text, text, integer) to anon, authenticated;
