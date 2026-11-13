-- Study points board (Level 0 / Level 1).
-- First attempt of each exo / test locks forever; retries never change points.
-- All official students of the band appear, even with 0 points.

alter table public.efaa_lesson_work
  add column if not exists exo_locked boolean not null default false,
  add column if not exists test_locked boolean not null default false,
  add column if not exists test_first integer not null default 0;

-- Grandfather existing completed work as the locked first attempt.
update public.efaa_lesson_work
set exo_locked = true
where exo_done = true and exo_locked = false;

update public.efaa_lesson_work
set test_locked = true,
    test_first = case when test_first > 0 then test_first else test_best end
where test_best > 0 and test_locked = false;

create or replace function public.efaa_save_lesson_work(
  p_user_id text,
  p_band text,
  p_lesson_no integer,
  p_watched boolean,
  p_exo_done boolean,
  p_exo_score integer,
  p_exo_total integer,
  p_test_best integer
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  rec public.efaa_lesson_work%rowtype;
  band_ok text := case when p_band = '1' then '1' else '0' end;
  lesson integer := greatest(coalesce(p_lesson_no, 1), 1);
begin
  if coalesce(p_user_id, '') = '' then
    raise exception 'missing user';
  end if;

  insert into public.efaa_lesson_work (
    user_id, band, lesson_no, watched, exo_done, exo_score, exo_total,
    test_best, test_first, exo_locked, test_locked, updated_at
  )
  values (
    p_user_id,
    band_ok,
    lesson,
    coalesce(p_watched, false),
    coalesce(p_exo_done, false),
    coalesce(p_exo_score, 0),
    coalesce(p_exo_total, 0),
    coalesce(p_test_best, 0),
    case when coalesce(p_test_best, 0) > 0 then coalesce(p_test_best, 0) else 0 end,
    coalesce(p_exo_done, false) and p_exo_score is not null,
    coalesce(p_test_best, 0) > 0,
    now()
  )
  on conflict (user_id, band, lesson_no) do update
    set watched = case
          when p_watched is null then efaa_lesson_work.watched
          else (efaa_lesson_work.watched or p_watched)
        end,
        -- First exo attempt locks score forever.
        exo_done = case
          when efaa_lesson_work.exo_locked then true
          when p_exo_done is null then efaa_lesson_work.exo_done
          else p_exo_done
        end,
        exo_score = case
          when efaa_lesson_work.exo_locked then efaa_lesson_work.exo_score
          when p_exo_score is null then efaa_lesson_work.exo_score
          else p_exo_score
        end,
        exo_total = case
          when efaa_lesson_work.exo_locked then efaa_lesson_work.exo_total
          when p_exo_total is null then efaa_lesson_work.exo_total
          else p_exo_total
        end,
        exo_locked = case
          when efaa_lesson_work.exo_locked then true
          when p_exo_score is not null and coalesce(p_exo_done, false) then true
          else efaa_lesson_work.exo_locked
        end,
        -- First test attempt locks; keep a separate display best that never rises past first for points.
        test_first = case
          when efaa_lesson_work.test_locked then efaa_lesson_work.test_first
          when coalesce(p_test_best, 0) > 0 then p_test_best
          else efaa_lesson_work.test_first
        end,
        test_best = case
          when efaa_lesson_work.test_locked then efaa_lesson_work.test_first
          when coalesce(p_test_best, 0) > 0 then p_test_best
          else efaa_lesson_work.test_best
        end,
        test_locked = case
          when efaa_lesson_work.test_locked then true
          when coalesce(p_test_best, 0) > 0 then true
          else efaa_lesson_work.test_locked
        end,
        updated_at = now();

  select * into rec from public.efaa_lesson_work
  where user_id = p_user_id and band = band_ok and lesson_no = lesson;
  return to_jsonb(rec);
end;
$$;

grant execute on function public.efaa_save_lesson_work(text, text, integer, boolean, boolean, integer, integer, integer) to anon, authenticated;

-- Badge helper: each correct answer on first attempt = 10 pts.
create or replace function public.efaa_study_badge(p_points integer)
returns text
language sql
immutable
as $$
  select case
    when coalesce(p_points, 0) >= 1000 then 'legend'
    when coalesce(p_points, 0) >= 500 then 'diamond'
    when coalesce(p_points, 0) >= 200 then 'gold'
    when coalesce(p_points, 0) >= 100 then 'silver'
    when coalesce(p_points, 0) >= 50 then 'bronze'
    else 'rookie'
  end;
$$;

create or replace function public.efaa_study_board(p_band text)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  band_ok text := case when p_band = '1' then '1' else '0' end;
  level_ok text := case when band_ok = '1' then 'intermediate' else 'beginner' end;
  rows jsonb;
begin
  select coalesce(jsonb_agg(to_jsonb(ranked) order by ranked.rank, ranked.display_name), '[]'::jsonb)
  into rows
  from (
    select
      s.id::text as user_id,
      trim(both from coalesce(s.first_name, '') || ' ' || coalesce(s.last_name, '')) as display_name,
      coalesce(nullif(s.avatar_url, ''), nullif(s.photo_url, '')) as photo,
      coalesce(pts.points, 0)::integer as points,
      public.efaa_study_badge(coalesce(pts.points, 0)) as badge,
      row_number() over (
        order by coalesce(pts.points, 0) desc,
                 trim(both from coalesce(s.first_name, '') || ' ' || coalesce(s.last_name, ''))
      )::integer as rank
    from public.efaa_active_students s
    left join (
      select
        w.user_id,
        (
          coalesce(sum(case when w.exo_locked then w.exo_score else 0 end), 0) * 10
          + coalesce(sum(case when w.test_locked then w.test_first else 0 end), 0) * 10
        )::integer as points
      from public.efaa_lesson_work w
      where w.band = band_ok
      group by w.user_id
    ) pts on pts.user_id = s.id::text
    where s.level = level_ok
  ) ranked;

  return jsonb_build_object(
    'band', band_ok,
    'rows', coalesce(rows, '[]'::jsonb)
  );
end;
$$;

grant execute on function public.efaa_study_board(text) to anon, authenticated;
grant execute on function public.efaa_study_badge(integer) to anon, authenticated;
