-- Level 0 lessons 9–12 exist in the app. Keep them locked until admin opens each one.

insert into public.efaa_lesson_unlock (band, lesson_no, unlocked)
select '0', g, false from generate_series(9, 12) as g
on conflict (band, lesson_no) do nothing;
