-- Card game head-to-head (classic points, no challenge hooks).

create table if not exists public.efaa_card_h2h (
  user_low text not null,
  user_high text not null,
  name_low text,
  name_high text,
  wins_low integer not null default 0 check (wins_low >= 0),
  wins_high integer not null default 0 check (wins_high >= 0),
  updated_at timestamptz not null default now(),
  primary key (user_low, user_high)
);

alter table public.efaa_card_h2h enable row level security;

drop policy if exists efaa_card_h2h_select on public.efaa_card_h2h;
create policy efaa_card_h2h_select on public.efaa_card_h2h for select using (true);

grant select on public.efaa_card_h2h to anon, authenticated;

create or replace function public.efaa_card_h2h_bump(
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
  insert into public.efaa_card_h2h (user_low, user_high, wins_low, wins_high, name_low, name_high)
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
    wins_low = public.efaa_card_h2h.wins_low + case when win_low then 1 else 0 end,
    wins_high = public.efaa_card_h2h.wins_high + case when win_low then 0 else 1 end,
    name_low = coalesce(
      case when p_winner = low_id then p_winner_name when p_loser = low_id then p_loser_name end,
      public.efaa_card_h2h.name_low
    ),
    name_high = coalesce(
      case when p_winner = high_id then p_winner_name when p_loser = high_id then p_loser_name end,
      public.efaa_card_h2h.name_high
    ),
    updated_at = now();
end;
$$;

create or replace function public.efaa_card_h2h_for_user(p_user text)
returns table(rival_id text, rival_name text, my_wins integer, rival_wins integer)
language sql
stable
security definer
set search_path = public
as $$
  select
    case when h.user_low = p_user then h.user_high else h.user_low end,
    case when h.user_low = p_user then coalesce(h.name_high, 'Rival') else coalesce(h.name_low, 'Rival') end,
    case when h.user_low = p_user then h.wins_low else h.wins_high end,
    case when h.user_low = p_user then h.wins_high else h.wins_low end
  from public.efaa_card_h2h h
  where h.user_low = p_user or h.user_high = p_user
  order by (case when h.user_low = p_user then h.wins_low else h.wins_high end) desc,
           h.updated_at desc
  limit 24;
$$;

grant execute on function public.efaa_card_h2h_bump(text, text, text, text) to anon, authenticated;
grant execute on function public.efaa_card_h2h_for_user(text) to anon, authenticated;
