create or replace function public.efaa_submit_exam_attempt(
  p_user_id text,
  p_exam_id text,
  p_score integer,
  p_total integer,
  p_answers jsonb,
  p_items jsonb,
  p_started_at timestamptz default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  rec public.efaa_exam_attempts%rowtype;
begin
  if coalesce(trim(p_user_id), '') = '' then
    raise exception 'user required';
  end if;

  insert into public.efaa_exam_attempts (
    user_id, exam_id, score, total, answers, items, started_at, submitted_at
  ) values (
    trim(p_user_id),
    coalesce(nullif(trim(p_exam_id), ''), 'beginner_1'),
    greatest(coalesce(p_score, 0), 0),
    greatest(coalesce(p_total, 20), 1),
    coalesce(p_answers, '{}'::jsonb),
    coalesce(p_items, '[]'::jsonb),
    p_started_at,
    now()
  )
  on conflict (user_id, exam_id) do nothing;

  select * into rec
  from public.efaa_exam_attempts
  where user_id = trim(p_user_id)
    and exam_id = coalesce(nullif(trim(p_exam_id), ''), 'beginner_1');

  return to_jsonb(rec);
end;
$$;

grant execute on function public.efaa_submit_exam_attempt(text, text, integer, integer, jsonb, jsonb, timestamptz) to anon, authenticated;
