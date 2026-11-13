-- Seeded word lists so two World Cup phones always spell the same word.
-- Uses the lower mastery of the pair. Never touches daily streak or pro_* tables.

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
  words jsonb;
  seed text;
begin
  if coalesce(p_user_id, '') = '' then
    raise exception 'invalid user';
  end if;

  effective := public.efaa_effective_mastery(p_user_id);
  if coalesce(p_partner_id, '') <> '' and p_partner_id <> p_user_id then
    effective := least(effective, public.efaa_effective_mastery(p_partner_id));
  end if;

  lo := greatest(1, effective - 5);
  hi := least(100, effective + 5);
  cap := greatest(1, least(coalesce(p_limit, 24), 50));
  seed := coalesce(nullif(p_seed, ''), 'world-cup');

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

  return jsonb_build_object(
    'effective_mastery', effective,
    'range', jsonb_build_array(lo, hi),
    'words', words
  );
end;
$$;

grant execute on function public.efaa_get_seeded_words(text, text, text, integer) to anon, authenticated;
