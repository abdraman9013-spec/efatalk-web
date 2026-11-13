-- Admin topic CRUD via security-definer RPCs (anon key, code 0680).

create or replace function public.efaa_ensure_debate_topics(p_rows jsonb, p_code text)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  n integer := 0;
  r jsonb;
begin
  if regexp_replace(coalesce(p_code, ''), '[^0-9]', '', 'g') <> '0680' then
    raise exception 'admin only';
  end if;

  for r in select value from jsonb_array_elements(coalesce(p_rows, '[]'::jsonb))
  loop
    insert into public.efaa_debate_topics (
      id, level, title_en, title_fr, title_ar, questions, sort_order, active, updated_at
    )
    values (
      coalesce(r->>'id', ''),
      r->>'level',
      coalesce(r->>'title_en', ''),
      coalesce(r->>'title_fr', ''),
      coalesce(r->>'title_ar', ''),
      coalesce(r->'questions', '[]'::jsonb),
      coalesce((r->>'sort_order')::integer, 0),
      coalesce((r->>'active')::boolean, true),
      now()
    )
    on conflict (id) do nothing;
    n := n + 1;
  end loop;

  return n;
end;
$$;

create or replace function public.efaa_admin_list_debate_topics(p_code text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  if regexp_replace(coalesce(p_code, ''), '[^0-9]', '', 'g') <> '0680' then
    raise exception 'admin only';
  end if;
  return coalesce(
    (
      select jsonb_agg(to_jsonb(t) order by t.level, t.sort_order, t.id)
      from public.efaa_debate_topics t
    ),
    '[]'::jsonb
  );
end;
$$;

create or replace function public.efaa_upsert_debate_topic(p_code text, p_row jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  rec public.efaa_debate_topics%rowtype;
  next_sort integer;
begin
  if regexp_replace(coalesce(p_code, ''), '[^0-9]', '', 'g') <> '0680' then
    raise exception 'admin only';
  end if;

  select coalesce(max(sort_order), 0) + 1 into next_sort
  from public.efaa_debate_topics
  where level = p_row->>'level';

  insert into public.efaa_debate_topics (
    id, level, title_en, title_fr, title_ar, questions, sort_order, active, updated_at
  )
  values (
    coalesce(nullif(p_row->>'id', ''), 'topic-' || extract(epoch from now())::bigint::text),
    p_row->>'level',
    coalesce(p_row->>'title_en', ''),
    coalesce(p_row->>'title_fr', p_row->>'title_en', ''),
    coalesce(p_row->>'title_ar', p_row->>'title_en', ''),
    coalesce(p_row->'questions', '[]'::jsonb),
    coalesce(nullif(p_row->>'sort_order', '')::integer, next_sort),
    coalesce((p_row->>'active')::boolean, true),
    now()
  )
  on conflict (id) do update
    set level = excluded.level,
        title_en = excluded.title_en,
        title_fr = excluded.title_fr,
        title_ar = excluded.title_ar,
        questions = excluded.questions,
        sort_order = excluded.sort_order,
        active = excluded.active,
        updated_at = now()
  returning * into rec;

  return to_jsonb(rec);
end;
$$;

create or replace function public.efaa_set_debate_topic_active(p_code text, p_id text, p_active boolean)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  rec public.efaa_debate_topics%rowtype;
begin
  if regexp_replace(coalesce(p_code, ''), '[^0-9]', '', 'g') <> '0680' then
    raise exception 'admin only';
  end if;

  update public.efaa_debate_topics
    set active = coalesce(p_active, false), updated_at = now()
    where id = p_id
    returning * into rec;

  if rec.id is null then
    raise exception 'not found';
  end if;
  return to_jsonb(rec);
end;
$$;

revoke all on function public.efaa_ensure_debate_topics(jsonb, text) from public;
revoke all on function public.efaa_admin_list_debate_topics(text) from public;
revoke all on function public.efaa_upsert_debate_topic(text, jsonb) from public;
revoke all on function public.efaa_set_debate_topic_active(text, text, boolean) from public;

grant execute on function public.efaa_ensure_debate_topics(jsonb, text) to anon, authenticated;
grant execute on function public.efaa_admin_list_debate_topics(text) to anon, authenticated;
grant execute on function public.efaa_upsert_debate_topic(text, jsonb) to anon, authenticated;
grant execute on function public.efaa_set_debate_topic_active(text, text, boolean) to anon, authenticated;
