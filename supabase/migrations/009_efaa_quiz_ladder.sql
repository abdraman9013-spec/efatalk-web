alter table public.efaa_intermediate_progress
  add column if not exists quiz_points integer not null default 0 check (quiz_points >= 0);

alter table public.efaa_intermediate_progress
  add column if not exists quiz_corrects integer not null default 0 check (quiz_corrects >= 0);

alter table public.efaa_intermediate_progress
  add column if not exists quiz_bundle integer not null default 0 check (quiz_bundle >= 0 and quiz_bundle <= 2);

create or replace function public.efaa_award_quiz_answer(
  p_user_id text,
  p_correct boolean
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  mid public.efaa_intermediate_progress%rowtype;
  rec public.efaa_user_gamification%rowtype;
  gained integer := 0;
  combined integer;
  diamonds_add integer := 0;
begin
  if p_user_id is null or length(trim(p_user_id)) = 0 then
    raise exception 'user_id required';
  end if;

  insert into public.efaa_intermediate_progress (user_id)
  values (p_user_id)
  on conflict (user_id) do nothing;

  select * into mid from public.efaa_intermediate_progress where user_id = p_user_id for update;

  if coalesce(p_correct, false) then
    if mid.quiz_points >= 30 then
      mid.quiz_bundle := mid.quiz_bundle + 1;
      if mid.quiz_bundle >= 3 then
        gained := 1;
        mid.quiz_bundle := 0;
      end if;
    else
      mid.quiz_corrects := mid.quiz_corrects + 1;
      if mid.quiz_corrects = 1 then
        gained := 5;
      elsif mid.quiz_corrects = 2 then
        gained := 3;
      elsif mid.quiz_corrects = 3 then
        gained := 2;
      else
        gained := 1;
      end if;
    end if;
    mid.quiz_points := mid.quiz_points + gained;
  end if;

  update public.efaa_intermediate_progress
  set
    quiz_points = mid.quiz_points,
    quiz_corrects = mid.quiz_corrects,
    quiz_bundle = mid.quiz_bundle,
    updated_at = now()
  where user_id = p_user_id
  returning * into mid;

  insert into public.efaa_user_gamification (user_id)
  values (p_user_id)
  on conflict (user_id) do nothing;

  select * into rec from public.efaa_user_gamification where user_id = p_user_id for update;

  if gained > 0 then
    combined := rec.total_points + gained;
    diamonds_add := combined / 10000;
    rec.total_points := combined % 10000;
    rec.diamonds_count := rec.diamonds_count + diamonds_add;
    update public.efaa_user_gamification
    set
      total_points = rec.total_points,
      diamonds_count = rec.diamonds_count,
      updated_at = now()
    where user_id = p_user_id
    returning * into rec;
  end if;

  return jsonb_build_object(
    'total_points', rec.total_points,
    'diamonds_count', rec.diamonds_count,
    'points_gained', gained,
    'quiz_points', mid.quiz_points,
    'quiz_corrects', mid.quiz_corrects,
    'quiz_bundle', mid.quiz_bundle
  );
end;
$$;

grant execute on function public.efaa_award_quiz_answer(text, boolean) to anon, authenticated;
