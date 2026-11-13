-- Official term started 15 Sep 2026: 4 presence days for every paid student.
-- Level 0 lessons 1–3 already taught.

insert into public.efaa_class_daily (user_id, day, granted)
select s.id::text, d::date, 0
from public.efaa_active_students s
cross join generate_series(date '2026-09-15', date '2026-09-18', interval '1 day') as d
on conflict (user_id, day) do nothing;

update public.efaa_lesson_unlock
set unlocked = true,
    unlocked_at = coalesce(unlocked_at, now()),
    updated_at = now()
where band = '0' and lesson_no in (1, 2, 3);
