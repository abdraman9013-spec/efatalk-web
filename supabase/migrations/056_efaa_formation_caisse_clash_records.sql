-- Formation settings + caisse ledger + clash H2H (classic bolts, no challenge grant).

create table if not exists public.efaa_formation_settings (
  id smallint primary key default 1 check (id = 1),
  discount_ends_at timestamptz not null default '2026-11-15T22:59:59+00:00',
  discount_active boolean not null default true,
  updated_at timestamptz not null default now()
);

insert into public.efaa_formation_settings (id)
values (1)
on conflict (id) do nothing;

alter table public.efaa_formation_settings enable row level security;

drop policy if exists efaa_formation_settings_select on public.efaa_formation_settings;
create policy efaa_formation_settings_select
  on public.efaa_formation_settings for select
  using (true);

grant select on public.efaa_formation_settings to anon, authenticated;

create table if not exists public.efaa_formation_caisse (
  id smallint primary key default 1 check (id = 1),
  balance_fcfa bigint not null default 0 check (balance_fcfa >= 0),
  updated_at timestamptz not null default now()
);

insert into public.efaa_formation_caisse (id, balance_fcfa)
values (1, 0)
on conflict (id) do nothing;

alter table public.efaa_formation_caisse enable row level security;

drop policy if exists efaa_formation_caisse_select on public.efaa_formation_caisse;
create policy efaa_formation_caisse_select
  on public.efaa_formation_caisse for select
  using (true);

grant select on public.efaa_formation_caisse to anon, authenticated;

create table if not exists public.efaa_formation_caisse_entries (
  id uuid primary key default gen_random_uuid(),
  entry_at timestamptz not null default now(),
  actor text not null default 'system',
  kind text not null check (kind in ('income', 'expense')),
  purpose text not null,
  purpose_note text,
  amount_fcfa integer not null check (amount_fcfa > 0),
  balance_before bigint not null,
  balance_after bigint not null,
  application_id uuid references public.efaa_formation_applications (id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists efaa_formation_caisse_entries_at_idx
  on public.efaa_formation_caisse_entries (entry_at desc);

alter table public.efaa_formation_caisse_entries enable row level security;

drop policy if exists efaa_formation_caisse_entries_select on public.efaa_formation_caisse_entries;
create policy efaa_formation_caisse_entries_select
  on public.efaa_formation_caisse_entries for select
  using (true);

grant select on public.efaa_formation_caisse_entries to anon, authenticated;

create table if not exists public.efaa_clash_h2h (
  user_low text not null,
  user_high text not null,
  name_low text,
  name_high text,
  wins_low integer not null default 0 check (wins_low >= 0),
  wins_high integer not null default 0 check (wins_high >= 0),
  updated_at timestamptz not null default now(),
  primary key (user_low, user_high)
);

create index if not exists efaa_clash_h2h_updated_idx
  on public.efaa_clash_h2h (updated_at desc);

alter table public.efaa_clash_h2h enable row level security;

drop policy if exists efaa_clash_h2h_select on public.efaa_clash_h2h;
create policy efaa_clash_h2h_select on public.efaa_clash_h2h for select using (true);

grant select on public.efaa_clash_h2h to anon, authenticated;

create or replace function public.efaa_clash_pair_ids(p_a text, p_b text)
returns table(user_low text, user_high text)
language sql
immutable
as $$
  select
    case when p_a < p_b then p_a else p_b end,
    case when p_a < p_b then p_b else p_a end;
$$;

create or replace function public.efaa_clash_h2h_bump(
  p_winner text,
  p_loser text,
  p_winner_name text default null,
  p_loser_name text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  low_id text;
  high_id text;
  win_low boolean;
begin
  if p_winner is null or p_loser is null or p_winner = p_loser then
    return;
  end if;
  select user_low, user_high into low_id, high_id from public.efaa_clash_pair_ids(p_winner, p_loser);
  win_low := p_winner = low_id;

  insert into public.efaa_clash_h2h (user_low, user_high, wins_low, wins_high, name_low, name_high)
  values (
    low_id,
    high_id,
    case when win_low then 1 else 0 end,
    case when win_low then 0 else 1 end,
    case when p_winner = low_id then p_winner_name when p_loser = low_id then p_loser_name else null end,
    case when p_winner = high_id then p_winner_name when p_loser = high_id then p_loser_name else null end
  )
  on conflict (user_low, user_high) do update
  set
    wins_low = public.efaa_clash_h2h.wins_low + case when win_low then 1 else 0 end,
    wins_high = public.efaa_clash_h2h.wins_high + case when win_low then 0 else 1 end,
    name_low = coalesce(
      case when p_winner = low_id then p_winner_name when p_loser = low_id then p_loser_name end,
      public.efaa_clash_h2h.name_low
    ),
    name_high = coalesce(
      case when p_winner = high_id then p_winner_name when p_loser = high_id then p_loser_name end,
      public.efaa_clash_h2h.name_high
    ),
    updated_at = now();
end;
$$;

create or replace function public.efaa_formation_caisse_move(
  p_kind text,
  p_purpose text,
  p_amount integer,
  p_actor text default 'azolo',
  p_note text default null,
  p_application_id uuid default null
)
returns public.efaa_formation_caisse_entries
language plpgsql
security definer
set search_path = public
as $$
declare
  box public.efaa_formation_caisse%rowtype;
  entry public.efaa_formation_caisse_entries%rowtype;
  amt integer := greatest(coalesce(p_amount, 0), 0);
  before_bal bigint;
  after_bal bigint;
begin
  if amt <= 0 then
    raise exception 'amount-required';
  end if;

  select * into box from public.efaa_formation_caisse where id = 1 for update;
  before_bal := coalesce(box.balance_fcfa, 0);

  if p_kind = 'income' then
    after_bal := before_bal + amt;
  elsif p_kind = 'expense' then
    if before_bal < amt then
      raise exception 'insufficient-caisse';
    end if;
    after_bal := before_bal - amt;
  else
    raise exception 'bad-kind';
  end if;

  update public.efaa_formation_caisse
  set balance_fcfa = after_bal, updated_at = now()
  where id = 1;

  insert into public.efaa_formation_caisse_entries (
    actor, kind, purpose, purpose_note, amount_fcfa, balance_before, balance_after, application_id
  )
  values (
    coalesce(p_actor, 'azolo'),
    p_kind,
  coalesce(p_purpose, 'autre'),
    p_note,
    amt,
    before_bal,
    after_bal,
    p_application_id
  )
  returning * into entry;

  return entry;
end;
$$;

-- Clash settle: bolts + elo + H2H only (no challenge class points).
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
  paid := least(wager, coalesce(lose_game.lightning_bolts, 0));

  update public.efaa_user_game_state
  set lightning_bolts = lightning_bolts - paid, updated_at = now()
  where user_id = p_loser
  returning * into lose_game;

  update public.efaa_user_game_state
  set lightning_bolts = least(50, lightning_bolts + paid), updated_at = now()
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
    'paid', paid,
    'challenge_points', 0
  );
end;
$$;

grant execute on function public.efaa_clash_h2h_bump(text, text, text, text) to anon, authenticated;
grant execute on function public.efaa_formation_caisse_move(text, text, integer, text, text, uuid) to anon, authenticated;

create or replace function public.efaa_clash_h2h_for_user(p_user text)
returns table(
  rival_id text,
  rival_name text,
  my_wins integer,
  rival_wins integer
)
language sql
stable
security definer
set search_path = public
as $$
  select
    case when h.user_low = p_user then h.user_high else h.user_low end as rival_id,
    case when h.user_low = p_user then coalesce(h.name_high, 'Rival') else coalesce(h.name_low, 'Rival') end as rival_name,
    case when h.user_low = p_user then h.wins_low else h.wins_high end as my_wins,
    case when h.user_low = p_user then h.wins_high else h.wins_low end as rival_wins
  from public.efaa_clash_h2h h
  where h.user_low = p_user or h.user_high = p_user
  order by (case when h.user_low = p_user then h.wins_low else h.wins_high end) desc,
           updated_at desc
  limit 24;
$$;

grant execute on function public.efaa_clash_h2h_for_user(text) to anon, authenticated;
