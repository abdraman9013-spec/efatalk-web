-- Daily Formation stars (5 cards × 10) go to the class board the same day.
create or replace function public.efaa_complete_formation(
  p_user_id text,
  p_phrase_ids text[],
  p_age integer default null,
  p_color text default null,
  p_display_name text default null,
  p_nationality text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  rec public.efaa_user_gamification%rowtype;
  today date := public.efaa_academy_today();
  already_today boolean := false;
  formation_points integer := 50;
begin
  if p_user_id is null or length(trim(p_user_id)) = 0 then
    raise exception 'user_id required';
  end if;

  insert into public.efaa_user_gamification (user_id, display_name, nationality)
  values (
    p_user_id,
    coalesce(p_display_name, ''),
    coalesce(p_nationality, '')
  )
  on conflict (user_id) do nothing;

  select * into rec
  from public.efaa_user_gamification
  where user_id = p_user_id
  for update;

  already_today := rec.last_formation_at is not null
    and (timezone('Africa/Ndjamena', rec.last_formation_at))::date = today;

  update public.efaa_user_gamification
  set
    learned_phrases = (
      select coalesce(array_agg(distinct phrase), '{}'::text[])
      from unnest(coalesce(learned_phrases, '{}'::text[]) || coalesce(p_phrase_ids, '{}'::text[])) as phrase
    ),
    last_formation_at = now(),
    age = coalesce(p_age, age),
    favorite_color = coalesce(nullif(p_color, ''), favorite_color),
    display_name = coalesce(nullif(p_display_name, ''), display_name),
    nationality = coalesce(nullif(p_nationality, ''), nationality),
    updated_at = now()
  where user_id = p_user_id;

  if not already_today then
    perform public.efaa_grant_class_points(p_user_id, formation_points);
  end if;

  select * into rec
  from public.efaa_user_gamification
  where user_id = p_user_id;

  return to_jsonb(rec);
end;
$$;

grant execute on function public.efaa_complete_formation(text, text[], integer, text, text, text) to anon, authenticated;
