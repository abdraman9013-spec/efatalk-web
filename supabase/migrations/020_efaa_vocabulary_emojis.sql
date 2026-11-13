-- Beginner swipe emoji dictionary + energy 15/50.
-- Isolated from live-room points and from efaa_user_gamification.current_streak.
-- Does not touch pro_* tables.

create table if not exists public.efaa_vocabulary_emojis (
  id bigint generated always as identity primary key,
  word_en text not null unique,
  translation_fr text not null,
  emoji text not null,
  translation_ar text
);

alter table public.efaa_vocabulary_emojis enable row level security;

drop policy if exists efaa_vocabulary_emojis_select on public.efaa_vocabulary_emojis;
create policy efaa_vocabulary_emojis_select
  on public.efaa_vocabulary_emojis for select
  using (true);

grant select on public.efaa_vocabulary_emojis to anon, authenticated;

insert into public.efaa_vocabulary_emojis (word_en, translation_fr, emoji, translation_ar)
values
  ('Apple', 'Pomme', '🍎', 'تفاحة'),
  ('Table', 'Table', '🪑', 'طاولة'),
  ('Pen', 'Stylo', '🖊️', 'قلم'),
  ('Water', 'Eau', '💧', 'ماء'),
  ('Car', 'Voiture', '🚗', 'سيارة'),
  ('House', 'Maison', '🏠', 'بيت'),
  ('Book', 'Livre', '📖', 'كتاب'),
  ('Phone', 'Téléphone', '📱', 'هاتف'),
  ('Sun', 'Soleil', '☀️', 'شمس'),
  ('Bread', 'Pain', '🍞', 'خبز'),
  ('Cat', 'Chat', '🐱', 'قطة'),
  ('Dog', 'Chien', '🐶', 'كلب'),
  ('Door', 'Porte', '🚪', 'باب'),
  ('Window', 'Fenêtre', '🪟', 'نافذة'),
  ('Tree', 'Arbre', '🌳', 'شجرة'),
  ('Fish', 'Poisson', '🐟', 'سمكة'),
  ('Milk', 'Lait', '🥛', 'حليب'),
  ('School', 'École', '🏫', 'مدرسة'),
  ('Bed', 'Lit', '🛏️', 'سرير'),
  ('Key', 'Clé', '🔑', 'مفتاح'),
  ('Shoe', 'Chaussure', '👟', 'حذاء'),
  ('Moon', 'Lune', '🌙', 'قمر'),
  ('Star', 'Étoile', '⭐', 'نجمة'),
  ('Banana', 'Banane', '🍌', 'موز'),
  ('Bus', 'Bus', '🚌', 'حافلة'),
  ('Bike', 'Vélo', '🚲', 'دراجة'),
  ('Clock', 'Horloge', '🕐', 'ساعة'),
  ('Bag', 'Sac', '👜', 'حقيبة'),
  ('Rain', 'Pluie', '🌧️', 'مطر'),
  ('Fire', 'Feu', '🔥', 'نار'),
  ('Heart', 'Cœur', '❤️', 'قلب'),
  ('Hand', 'Main', '✋', 'يد'),
  ('Egg', 'Œuf', '🥚', 'بيضة'),
  ('Chair', 'Chaise', '💺', 'كرسي'),
  ('Plane', 'Avion', '✈️', 'طائرة'),
  ('Coffee', 'Café', '☕', 'قهوة'),
  ('Flower', 'Fleur', '🌸', 'زهرة'),
  ('Bird', 'Oiseau', '🐦', 'طائر'),
  ('Hat', 'Chapeau', '🎩', 'قبعة'),
  ('Map', 'Carte', '🗺️', 'خريطة')
on conflict (word_en) do nothing;

create or replace function public.efaa_random_emoji_words(n integer default 10)
returns table (
  id bigint,
  word_en text,
  translation_fr text,
  emoji text,
  translation_ar text
)
language sql
stable
security definer
set search_path = public
as $$
  select e.id, e.word_en, e.translation_fr, e.emoji, e.translation_ar
  from public.efaa_vocabulary_emojis e
  order by random()
  limit greatest(1, least(coalesce(n, 10), 40));
$$;

grant execute on function public.efaa_random_emoji_words(integer) to anon, authenticated;

alter table public.efaa_user_game_state
  drop constraint if exists efaa_user_game_state_lightning_bolts_check;

alter table public.efaa_user_game_state
  add constraint efaa_user_game_state_lightning_bolts_check
  check (lightning_bolts >= 0 and lightning_bolts <= 50);

alter table public.efaa_user_game_state
  alter column lightning_bolts set default 15;

alter table public.efaa_user_game_state
  add column if not exists exhausted_at timestamptz;

alter table public.efaa_user_game_state
  add column if not exists energy_refill_at timestamptz;

update public.efaa_user_game_state
set exhausted_at = coalesce(exhausted_at, now()),
    energy_refill_at = coalesce(energy_refill_at, now() + interval '1 hour')
where lightning_bolts <= 0
  and energy_refill_at is null;

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

  if rec.lightning_bolts <= 0 then
    if rec.energy_refill_at is not null and rec.energy_refill_at <= now() then
      update public.efaa_user_game_state
      set lightning_bolts = 15,
          exhausted_at = null,
          energy_refill_at = null,
          updated_at = now()
      where user_id = p_user_id
      returning * into rec;
    elsif rec.energy_refill_at is null then
      update public.efaa_user_game_state
      set exhausted_at = coalesce(exhausted_at, now()),
          energy_refill_at = now() + interval '1 hour',
          updated_at = now()
      where user_id = p_user_id
      returning * into rec;
    end if;
  end if;

  return to_jsonb(rec);
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
    if rec.energy_refill_at is null then
      update public.efaa_user_game_state
      set exhausted_at = coalesce(exhausted_at, now()),
          energy_refill_at = now() + interval '1 hour',
          updated_at = now()
      where user_id = p_user_id
      returning * into rec;
    end if;
    return to_jsonb(rec);
  end if;

  update public.efaa_user_game_state
  set lightning_bolts = lightning_bolts - 1,
      exhausted_at = case when lightning_bolts - 1 <= 0 then now() else exhausted_at end,
      energy_refill_at = case when lightning_bolts - 1 <= 0 then now() + interval '1 hour' else energy_refill_at end,
      updated_at = now()
  where user_id = p_user_id
  returning * into rec;

  return to_jsonb(rec);
end;
$$;

-- WhatsApp invite: +50 energy, cap 50. Never touches live salon streak.
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
  set lightning_bolts = least(50, lightning_bolts + 50),
      exhausted_at = null,
      energy_refill_at = null,
      updated_at = now()
  where user_id = p_user_id
  returning * into rec;

  if rec.user_id is null then
    raise exception 'game state missing';
  end if;
  return to_jsonb(rec);
end;
$$;

create or replace function public.efaa_claim_energy_refill(p_user_id text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  rec public.efaa_user_game_state%rowtype;
begin
  if p_user_id is null or length(trim(p_user_id)) = 0 then
    raise exception 'user_id required';
  end if;

  select * into rec from public.efaa_user_game_state where user_id = p_user_id for update;
  if rec.user_id is null then
    raise exception 'game state missing';
  end if;

  if rec.lightning_bolts > 0 then
    return to_jsonb(rec);
  end if;

  if rec.energy_refill_at is null or rec.energy_refill_at > now() then
    return to_jsonb(rec);
  end if;

  update public.efaa_user_game_state
  set lightning_bolts = 15,
      exhausted_at = null,
      energy_refill_at = null,
      updated_at = now()
  where user_id = p_user_id
  returning * into rec;

  return to_jsonb(rec);
end;
$$;

-- Combo bonus on personal Play points only. No country board. No live streak.
create or replace function public.efaa_add_game_points(p_user_id text, p_points integer)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  rec public.efaa_user_game_state%rowtype;
  gain integer := greatest(coalesce(p_points, 0), 0);
begin
  if p_user_id is null or length(trim(p_user_id)) = 0 then
    raise exception 'user_id required';
  end if;

  select * into rec from public.efaa_user_game_state where user_id = p_user_id for update;
  if rec.user_id is null then
    raise exception 'game state missing';
  end if;

  if gain = 0 then
    return to_jsonb(rec);
  end if;

  update public.efaa_user_game_state
  set personal_points = personal_points + gain,
      updated_at = now()
  where user_id = p_user_id
  returning * into rec;

  return to_jsonb(rec);
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
    'paid', paid
  );
end;
$$;

grant execute on function public.efaa_ensure_game_state(text, text, text) to anon, authenticated;
grant execute on function public.efaa_spend_game_energy(text) to anon, authenticated;
grant execute on function public.efaa_recharge_game_energy(text) to anon, authenticated;
grant execute on function public.efaa_claim_energy_refill(text) to anon, authenticated;
grant execute on function public.efaa_add_game_points(text, integer) to anon, authenticated;
grant execute on function public.efaa_settle_clash(text, text, integer) to anon, authenticated;
