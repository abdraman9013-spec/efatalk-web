-- Level 1 first-day revision. Locked until admin opens it.

insert into public.efaa_lesson_unlock (band, lesson_no, unlocked)
values ('1', 1, false)
on conflict (band, lesson_no) do nothing;
