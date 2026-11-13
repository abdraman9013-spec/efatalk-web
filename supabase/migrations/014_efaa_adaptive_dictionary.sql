-- Infinite Adaptive Dictionary.
-- Isolated from live-room streak and from all pro_* tables.

create table if not exists public.efaa_vocabulary (
  id bigint generated always as identity primary key,
  word_en text not null check (char_length(btrim(word_en)) between 1 and 48),
  word_key text generated always as (lower(btrim(word_en))) stored,
  translation_fr text not null check (char_length(btrim(translation_fr)) between 1 and 80),
  translation_ar text not null check (char_length(btrim(translation_ar)) between 1 and 80),
  difficulty_index integer not null check (difficulty_index between 1 and 100),
  category text not null default 'general',
  image_url text,
  created_at timestamptz not null default now()
);

create unique index if not exists efaa_vocabulary_word_key_idx
  on public.efaa_vocabulary (word_key);

create index if not exists efaa_vocabulary_difficulty_idx
  on public.efaa_vocabulary (difficulty_index);

create table if not exists public.efaa_user_mastery (
  user_id text primary key,
  current_mastery_index integer not null default 5
    check (current_mastery_index between 1 and 100),
  matches_won integer not null default 0 check (matches_won >= 0),
  account_created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.efaa_vocabulary enable row level security;
alter table public.efaa_user_mastery enable row level security;

drop policy if exists efaa_vocabulary_select on public.efaa_vocabulary;
create policy efaa_vocabulary_select
  on public.efaa_vocabulary for select
  using (true);

drop policy if exists efaa_user_mastery_select on public.efaa_user_mastery;
create policy efaa_user_mastery_select
  on public.efaa_user_mastery for select
  using (true);

grant select on public.efaa_vocabulary to anon, authenticated;
grant select on public.efaa_user_mastery to anon, authenticated;

insert into public.efaa_vocabulary (word_en, translation_fr, translation_ar, difficulty_index, category)
values
  ('APPLE', 'pomme', 'تفاحة', 3, 'food'),
  ('WATER', 'eau', 'ماء', 2, 'nature'),
  ('HOUSE', 'maison', 'بيت', 3, 'home'),
  ('BOOK', 'livre', 'كتاب', 4, 'school'),
  ('SCHOOL', 'école', 'مدرسة', 5, 'school'),
  ('SUN', 'soleil', 'شمس', 2, 'nature'),
  ('PHONE', 'téléphone', 'هاتف', 6, 'objects'),
  ('CAT', 'chat', 'قطة', 3, 'animals'),
  ('DOG', 'chien', 'كلب', 3, 'animals'),
  ('BREAD', 'pain', 'خبز', 4, 'food'),
  ('MOTHER', 'mère', 'أم', 4, 'people'),
  ('FRIEND', 'ami', 'صديق', 6, 'people'),
  ('CITY', 'ville', 'مدينة', 7, 'places'),
  ('HAPPY', 'heureux', 'سعيد', 8, 'feelings'),
  ('TEACHER', 'professeur', 'معلم', 9, 'school'),
  ('WINDOW', 'fenêtre', 'نافذة', 7, 'home'),
  ('MONEY', 'argent', 'مال', 8, 'life'),
  ('FAMILY', 'famille', 'عائلة', 6, 'people'),
  ('NIGHT', 'nuit', 'ليل', 5, 'nature'),
  ('MARKET', 'marché', 'سوق', 8, 'places'),
  ('CHILD', 'enfant', 'طفل', 5, 'people'),
  ('FOOD', 'nourriture', 'طعام', 4, 'food'),
  ('WORK', 'travail', 'عمل', 9, 'life'),
  ('TIME', 'temps', 'وقت', 10, 'abstract'),
  ('HEALTH', 'santé', 'صحة', 11, 'life'),
  ('DREAM', 'rêve', 'حلم', 12, 'abstract'),
  ('TRAVEL', 'voyage', 'سفر', 13, 'life'),
  ('WEATHER', 'météo', 'طقس', 10, 'nature'),
  ('OPINION', 'avis', 'رأي', 18, 'abstract'),
  ('FREEDOM', 'liberté', 'حرية', 19, 'abstract')
on conflict (word_key) do nothing;

create or replace function public.efaa_ensure_user_mastery(p_user_id text)
returns public.efaa_user_mastery
language plpgsql
security definer
set search_path = public
as $$
declare
  rec public.efaa_user_mastery%rowtype;
begin
  if coalesce(p_user_id, '') = '' then
    raise exception 'invalid user';
  end if;

  insert into public.efaa_user_mastery (user_id)
  values (p_user_id)
  on conflict (user_id) do nothing;

  select * into rec from public.efaa_user_mastery where user_id = p_user_id;
  return rec;
end;
$$;

create or replace function public.efaa_effective_mastery(p_user_id text)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  rec public.efaa_user_mastery%rowtype;
  effective integer;
begin
  rec := public.efaa_ensure_user_mastery(p_user_id);
  effective := rec.current_mastery_index;
  if rec.account_created_at > now() - interval '14 days' then
    effective := least(effective, 20);
  end if;
  return greatest(1, least(100, effective));
end;
$$;

-- Dynamic difficulty: words in [mastery - 5, mastery + 5].
-- Accounts younger than 14 days stay in the concrete 1-20 band.
create or replace function public.get_adaptive_words(user_id text, limit_amount integer)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  rec public.efaa_user_mastery%rowtype;
  effective integer;
  lo integer;
  hi integer;
  cap integer;
  words jsonb;
begin
  rec := public.efaa_ensure_user_mastery(get_adaptive_words.user_id);
  effective := rec.current_mastery_index;
  if rec.account_created_at > now() - interval '14 days' then
    effective := least(effective, 20);
  end if;
  effective := greatest(1, least(100, effective));
  lo := greatest(1, effective - 5);
  hi := least(100, effective + 5);
  cap := greatest(1, least(coalesce(limit_amount, 20), 50));

  select coalesce(jsonb_agg(to_jsonb(picked)), '[]'::jsonb)
  into words
  from (
    select id, word_en, translation_fr, translation_ar, difficulty_index, category, image_url
    from public.efaa_vocabulary
    where difficulty_index between lo and hi
    order by random()
    limit cap
  ) picked;

  return jsonb_build_object(
    'user_id', rec.user_id,
    'mastery_index', rec.current_mastery_index,
    'effective_mastery', effective,
    'matches_won', rec.matches_won,
    'account_created_at', rec.account_created_at,
    'range', jsonb_build_array(lo, hi),
    'words', words
  );
end;
$$;

-- Flow-state progression: +2 mastery every 5 wins. Never touches daily streak.
create or replace function public.efaa_update_user_mastery(p_user_id text, p_did_win boolean)
returns public.efaa_user_mastery
language plpgsql
security definer
set search_path = public
as $$
declare
  rec public.efaa_user_mastery%rowtype;
  next_index integer;
begin
  rec := public.efaa_ensure_user_mastery(p_user_id);
  if not coalesce(p_did_win, false) then
    return rec;
  end if;

  rec.matches_won := rec.matches_won + 1;
  next_index := rec.current_mastery_index;
  if rec.matches_won % 5 = 0 then
    next_index := least(100, rec.current_mastery_index + 2);
    if rec.account_created_at > now() - interval '14 days' then
      next_index := least(20, next_index);
    end if;
  end if;

  update public.efaa_user_mastery
  set
    matches_won = rec.matches_won,
    current_mastery_index = next_index,
    updated_at = now()
  where user_id = p_user_id
  returning * into rec;

  return rec;
end;
$$;

create or replace function public.efaa_ingest_vocabulary(p_words jsonb)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  inserted integer := 0;
begin
  if p_words is null or jsonb_typeof(p_words) <> 'array' then
    return 0;
  end if;

  with incoming as (
    select distinct on (lower(btrim(item->>'word_en')))
      btrim(item->>'word_en') as word_en,
      btrim(item->>'translation_fr') as translation_fr,
      btrim(item->>'translation_ar') as translation_ar,
      least(100, greatest(1, coalesce((item->>'difficulty_index')::int, 5))) as difficulty_index,
      coalesce(nullif(btrim(item->>'category'), ''), 'generated') as category,
      nullif(btrim(item->>'image_url'), '') as image_url
    from jsonb_array_elements(p_words) as item
    where coalesce(btrim(item->>'word_en'), '') <> ''
      and coalesce(btrim(item->>'translation_fr'), '') <> ''
      and coalesce(btrim(item->>'translation_ar'), '') <> ''
    order by lower(btrim(item->>'word_en'))
  ),
  upserted as (
    insert into public.efaa_vocabulary (
      word_en, translation_fr, translation_ar, difficulty_index, category, image_url
    )
    select word_en, translation_fr, translation_ar, difficulty_index, category, image_url
    from incoming
    on conflict (word_key) do update set
      translation_fr = excluded.translation_fr,
      translation_ar = excluded.translation_ar,
      difficulty_index = excluded.difficulty_index,
      category = excluded.category,
      image_url = coalesce(excluded.image_url, public.efaa_vocabulary.image_url)
    returning 1
  )
  select count(*)::int into inserted from upserted;

  return inserted;
end;
$$;

grant execute on function public.efaa_ensure_user_mastery(text) to anon, authenticated;
grant execute on function public.efaa_effective_mastery(text) to anon, authenticated;
grant execute on function public.get_adaptive_words(text, integer) to anon, authenticated;
grant execute on function public.efaa_update_user_mastery(text, boolean) to anon, authenticated;
grant execute on function public.efaa_ingest_vocabulary(jsonb) to anon, authenticated;
