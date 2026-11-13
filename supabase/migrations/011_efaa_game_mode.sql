-- 24/7 Game Mode engine.
-- Isolated from live-room points and from efaa_user_gamification.current_streak.

create table if not exists public.efaa_countries_leaderboard (
  country_code text primary key check (country_code ~ '^[A-Z]{2}$'),
  country_name text not null,
  flag_emoji text not null default '🌍',
  total_score integer not null default 0 check (total_score >= 0),
  updated_at timestamptz not null default now()
);

create table if not exists public.efaa_user_game_state (
  user_id text primary key,
  lightning_bolts integer not null default 5 check (lightning_bolts >= 0 and lightning_bolts <= 20),
  personal_points integer not null default 0 check (personal_points >= 0),
  referral_code text not null unique,
  country_code text not null default '',
  updated_at timestamptz not null default now()
);

create index if not exists efaa_countries_leaderboard_score_idx
  on public.efaa_countries_leaderboard (total_score desc, country_code asc);

create unique index if not exists efaa_user_game_state_referral_idx
  on public.efaa_user_game_state (referral_code);

alter table public.efaa_countries_leaderboard enable row level security;
alter table public.efaa_user_game_state enable row level security;

drop policy if exists efaa_countries_leaderboard_select on public.efaa_countries_leaderboard;
create policy efaa_countries_leaderboard_select
  on public.efaa_countries_leaderboard for select
  using (true);

drop policy if exists efaa_user_game_state_select on public.efaa_user_game_state;
create policy efaa_user_game_state_select
  on public.efaa_user_game_state for select
  using (true);

grant select on public.efaa_countries_leaderboard to anon, authenticated;
grant select on public.efaa_user_game_state to anon, authenticated;

do $$
begin
  begin
    alter publication supabase_realtime add table public.efaa_countries_leaderboard;
  exception
    when duplicate_object then null;
    when undefined_object then null;
  end;
end $$;

insert into public.efaa_countries_leaderboard (country_code, country_name, flag_emoji)
values
  ('TD', 'Chad', '🇹🇩'),
  ('CM', 'Cameroon', '🇨🇲'),
  ('NG', 'Nigeria', '🇳🇬'),
  ('NE', 'Niger', '🇳🇪'),
  ('SN', 'Senegal', '🇸🇳'),
  ('CI', 'Côte d''Ivoire', '🇨🇮'),
  ('ML', 'Mali', '🇲🇱'),
  ('FR', 'France', '🇫🇷'),
  ('HU', 'Hungary', '🇭🇺'),
  ('US', 'United States', '🇺🇸')
on conflict (country_code) do nothing;

create or replace function public.efaa_flag_emoji(p_code text)
returns text
language sql
immutable
as $$
  select coalesce(
    (
      select string_agg(chr(127397 + ascii(letter)), '')
      from unnest(string_to_array(upper(p_code), null)) as letter
    ),
    '🌍'
  );
$$;

create or replace function public.efaa_ensure_game_state(
  p_user_id text,
  p_country_code text default '',
  p_country_name text default ''
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  rec public.efaa_user_game_state%rowtype;
  code text := upper(regexp_replace(coalesce(p_country_code, ''), '[^A-Za-z]', '', 'g'));
  referral text;
begin
  if p_user_id is null or length(trim(p_user_id)) = 0 then
    raise exception 'user_id required';
  end if;
  if length(code) <> 2 then
    code := 'TD';
  end if;

  referral := 'EFA' || upper(substr(md5(p_user_id), 1, 6));

  insert into public.efaa_user_game_state (user_id, referral_code, country_code)
  values (p_user_id, referral, code)
  on conflict (user_id) do update
    set country_code = excluded.country_code,
        updated_at = now();

  insert into public.efaa_countries_leaderboard (country_code, country_name, flag_emoji)
  values (code, coalesce(nullif(p_country_name, ''), code), public.efaa_flag_emoji(code))
  on conflict (country_code) do update
    set country_name = coalesce(nullif(excluded.country_name, ''), efaa_countries_leaderboard.country_name);

  select * into rec from public.efaa_user_game_state where user_id = p_user_id;
  return to_jsonb(rec);
end;
$$;

-- Win a 24/7 game: +2 personal points, +20 country score.
-- MUST NOT touch efaa_user_gamification or current_streak.
create or replace function public.efaa_award_game_win(p_user_id text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  rec public.efaa_user_game_state%rowtype;
  board public.efaa_countries_leaderboard%rowtype;
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

  return jsonb_build_object(
    'personal_points', rec.personal_points,
    'lightning_bolts', rec.lightning_bolts,
    'country_code', rec.country_code,
    'country_score', board.total_score,
    'personal_gained', 2,
    'country_gained', 20
  );
end;
$$;

create or replace function public.efaa_spend_game_energy(p_user_id text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  rec public.efaa_user_game_state%rowtype;
begin
  select * into rec from public.efaa_user_game_state where user_id = p_user_id for update;
  if rec.user_id is null then
    raise exception 'game state missing';
  end if;
  if rec.lightning_bolts <= 0 then
    return to_jsonb(rec);
  end if;

  update public.efaa_user_game_state
  set lightning_bolts = lightning_bolts - 1,
      updated_at = now()
  where user_id = p_user_id
  returning * into rec;

  return to_jsonb(rec);
end;
$$;

create or replace function public.efaa_recharge_game_energy(p_user_id text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  rec public.efaa_user_game_state%rowtype;
begin
  update public.efaa_user_game_state
  set lightning_bolts = least(20, lightning_bolts + 5),
      updated_at = now()
  where user_id = p_user_id
  returning * into rec;

  if rec.user_id is null then
    raise exception 'game state missing';
  end if;
  return to_jsonb(rec);
end;
$$;

grant execute on function public.efaa_flag_emoji(text) to anon, authenticated;
grant execute on function public.efaa_ensure_game_state(text, text, text) to anon, authenticated;
grant execute on function public.efaa_award_game_win(text) to anon, authenticated;
grant execute on function public.efaa_spend_game_energy(text) to anon, authenticated;
grant execute on function public.efaa_recharge_game_energy(text) to anon, authenticated;
