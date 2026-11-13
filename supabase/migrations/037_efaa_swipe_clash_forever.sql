-- Permanent swipe + clash quality fix.
-- 1) Repair then remove broken emoji↔word pairs (▶ play-button on Eat/Sleep/etc).
-- 2) Random emoji deck never returns junk glyphs and can exclude used ids.
-- 3) Seeded clash decks are larger and strictly unique by spelling.

-- Repair verbs FIRST (they currently use ▶).
update public.efaa_vocabulary_emojis set emoji = '🍎' where lower(word_en) = 'apple';
update public.efaa_vocabulary_emojis set emoji = '🐶' where lower(word_en) = 'dog';
update public.efaa_vocabulary_emojis set emoji = '🐱' where lower(word_en) = 'cat';
update public.efaa_vocabulary_emojis set emoji = '🛏️' where lower(word_en) = 'bed';
update public.efaa_vocabulary_emojis set emoji = '🍳' where lower(word_en) = 'eat';
update public.efaa_vocabulary_emojis set emoji = '🥤' where lower(word_en) = 'drink';
update public.efaa_vocabulary_emojis set emoji = '😴' where lower(word_en) = 'sleep';
update public.efaa_vocabulary_emojis set emoji = '🚶' where lower(word_en) = 'walk';
update public.efaa_vocabulary_emojis set emoji = '🏃' where lower(word_en) = 'run';
update public.efaa_vocabulary_emojis set emoji = '🪑' where lower(word_en) = 'sit';
update public.efaa_vocabulary_emojis set emoji = '🧍' where lower(word_en) = 'stand';
update public.efaa_vocabulary_emojis set emoji = '🚪' where lower(word_en) in ('close', 'open', 'door');
update public.efaa_vocabulary_emojis set emoji = '🎁' where lower(word_en) = 'give';
update public.efaa_vocabulary_emojis set emoji = '🤲' where lower(word_en) = 'take';
update public.efaa_vocabulary_emojis set emoji = '🛒' where lower(word_en) = 'buy';
update public.efaa_vocabulary_emojis set emoji = '🏷️' where lower(word_en) = 'sell';
update public.efaa_vocabulary_emojis set emoji = '💳' where lower(word_en) in ('pay', 'cost');
update public.efaa_vocabulary_emojis set emoji = '🔎' where lower(word_en) = 'find';
update public.efaa_vocabulary_emojis set emoji = '😢' where lower(word_en) = 'lose';
update public.efaa_vocabulary_emojis set emoji = '💖' where lower(word_en) in ('like', 'love', 'want', 'need');
update public.efaa_vocabulary_emojis set emoji = '🧠' where lower(word_en) in ('remember', 'forget', 'understand', 'think');
update public.efaa_vocabulary_emojis set emoji = '🗣️' where lower(word_en) in ('explain', 'translate', 'repeat', 'speak', 'say', 'tell');
update public.efaa_vocabulary_emojis set emoji = '🔢' where lower(word_en) in ('count', 'measure');
update public.efaa_vocabulary_emojis set emoji = '👜' where lower(word_en) in ('bring', 'carry', 'keep');
update public.efaa_vocabulary_emojis set emoji = '🍈' where lower(word_en) = 'papaya';
update public.efaa_vocabulary_emojis set emoji = '🫙' where lower(word_en) = 'vinegar';
update public.efaa_vocabulary_emojis set emoji = '🔥' where lower(word_en) = 'oven';
update public.efaa_vocabulary_emojis set emoji = '♨️' where lower(word_en) = 'stove';

-- Drop remaining junk glyphs that still don't match anything useful.
delete from public.efaa_vocabulary_emojis
where emoji like '%▶%'
   or emoji in ('▶️', '▶', '🌍', '🧡', '🧴', '🪵', '🏺', '✅', '❌', '➡️', '⬅️')
   or emoji ~ '^[A-Za-z0-9._-]+$';

drop function if exists public.efaa_random_emoji_words(integer);
drop function if exists public.efaa_random_emoji_words(integer, bigint[]);

create or replace function public.efaa_random_emoji_words(
  n integer default 10,
  p_exclude bigint[] default null
)
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
  where e.emoji is not null
    and length(trim(e.emoji)) > 0
    and e.emoji not like '%▶%'
    and e.emoji !~ '^[A-Za-z0-9._-]+$'
    and length(trim(e.word_en)) >= 2
    and length(trim(e.translation_fr)) >= 2
    and (p_exclude is null or cardinality(p_exclude) = 0 or e.id <> all (p_exclude))
  order by random()
  limit greatest(2, least(coalesce(n, 10), 40));
$$;

grant execute on function public.efaa_random_emoji_words(integer, bigint[]) to anon, authenticated;

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

  lo := greatest(1, effective - 25);
  hi := least(100, effective + 25);
  -- Bigger decks so World Clash never loops a tiny pool mid-match.
  cap := greatest(60, least(coalesce(p_limit, 80), 120));
  left_id := least(p_user_id, coalesce(nullif(p_partner_id, ''), p_user_id));
  right_id := greatest(p_user_id, coalesce(nullif(p_partner_id, ''), p_user_id));
  seed := coalesce(nullif(p_seed, ''), 'world-cup')
    || ':' || left_id
    || ':' || right_id
    || ':' || public.efaa_academy_today()::text
    || ':' || floor(extract(epoch from now()) / 900)::text; -- reshuffle every 15 min

  select count(*)::integer into have
  from public.efaa_vocabulary
  where difficulty_index between lo and hi
    and length(regexp_replace(upper(word_en), '[^A-Z]', '', 'g')) between 4 and 12;

  if have < 40 then
    lo := 1;
    hi := 100;
  end if;

  select coalesce(jsonb_agg(to_jsonb(picked) order by picked.rank), '[]'::jsonb)
  into words
  from (
    select distinct on (spell)
      id,
      word_en,
      translation_fr,
      translation_ar,
      difficulty_index,
      category,
      image_url,
      spell,
      md5(seed || ':' || spell) as rank
    from (
      select
        v.*,
        regexp_replace(upper(v.word_en), '[^A-Z]', '', 'g') as spell
      from public.efaa_vocabulary v
      where v.difficulty_index between lo and hi
    ) cleaned
    where length(spell) between 4 and 12
    order by spell, md5(seed || ':' || spell)
  ) dedup
  order by rank
  limit cap;

  if coalesce(jsonb_array_length(words), 0) < 40 then
    select coalesce(jsonb_agg(to_jsonb(picked) order by picked.rank), '[]'::jsonb)
    into words
    from (
      select distinct on (spell)
        id,
        word_en,
        translation_fr,
        translation_ar,
        difficulty_index,
        category,
        image_url,
        spell,
        md5(seed || ':' || spell) as rank
      from (
        select
          v.*,
          regexp_replace(upper(v.word_en), '[^A-Z]', '', 'g') as spell
        from public.efaa_vocabulary v
      ) cleaned
      where length(spell) between 4 and 12
      order by spell, md5(seed || ':' || spell)
    ) dedup
    order by rank
    limit cap;
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
