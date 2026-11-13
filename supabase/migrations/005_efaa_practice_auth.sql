create table if not exists public.efaa_practice_students (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid unique,
  email text not null unique,
  first_name text not null,
  last_name text not null,
  status text not null default 'student',
  nationality text not null default 'TD',
  city text not null default '',
  whatsapp text not null default '',
  level text not null default 'beginner' check (level in ('beginner', 'intermediate', 'advanced')),
  photo_url text,
  created_at timestamptz not null default now()
);

create index if not exists efaa_practice_students_email_idx on public.efaa_practice_students (email);

alter table public.efaa_practice_students enable row level security;

drop policy if exists efaa_practice_students_select on public.efaa_practice_students;
create policy efaa_practice_students_select
  on public.efaa_practice_students for select
  using (true);

drop policy if exists efaa_practice_students_insert on public.efaa_practice_students;
create policy efaa_practice_students_insert
  on public.efaa_practice_students for insert
  with check (true);

drop policy if exists efaa_practice_students_update on public.efaa_practice_students;
create policy efaa_practice_students_update
  on public.efaa_practice_students for update
  using (true)
  with check (true);

grant select, insert, update on public.efaa_practice_students to anon, authenticated;

do $$
begin
  begin
    alter publication supabase_realtime add table public.efaa_practice_students;
  exception
    when duplicate_object then null;
    when undefined_object then null;
  end;
  begin
    alter publication supabase_realtime add table public.efaa_active_students;
  exception
    when duplicate_object then null;
    when undefined_object then null;
  end;
end $$;

create or replace function public.efaa_sync_broken_streak(p_user_id text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  rec public.efaa_user_gamification%rowtype;
  today date := (timezone('utc', now()))::date;
begin
  select * into rec from public.efaa_user_gamification where user_id = p_user_id;
  if rec.user_id is null then
    return jsonb_build_object('current_streak', 0);
  end if;
  if rec.last_activity_date is not null and rec.last_activity_date < today - 1 then
    update public.efaa_user_gamification
    set current_streak = 0, updated_at = now()
    where user_id = p_user_id
    returning * into rec;
  end if;
  return to_jsonb(rec);
end;
$$;

grant execute on function public.efaa_sync_broken_streak(text) to anon, authenticated;

create or replace function public.efaa_award_match_points(
  p_user_id text,
  p_speech_seconds integer
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  rec public.efaa_user_gamification%rowtype;
  today date := (timezone('utc', now()))::date;
  speech integer := greatest(coalesce(p_speech_seconds, 0), 0);
  points_gained integer;
  combined integer;
  diamonds_add integer;
begin
  if p_user_id is null or length(trim(p_user_id)) = 0 then
    raise exception 'user_id required';
  end if;

  points_gained := 10 + (speech / 10);

  insert into public.efaa_user_gamification (user_id)
  values (p_user_id)
  on conflict (user_id) do nothing;

  select * into rec
  from public.efaa_user_gamification
  where user_id = p_user_id
  for update;

  if rec.last_activity_date is distinct from today then
    rec.matchs_tonight_count := 0;
  end if;

  if rec.last_activity_date is null then
    rec.current_streak := 1;
  elsif rec.last_activity_date = today then
    null;
  elsif rec.last_activity_date = today - 1 then
    rec.current_streak := rec.current_streak + 1;
  else
    rec.current_streak := 1;
  end if;

  combined := rec.total_points + points_gained;
  diamonds_add := combined / 10000;
  rec.total_points := combined % 10000;
  rec.diamonds_count := rec.diamonds_count + diamonds_add;
  rec.matchs_tonight_count := rec.matchs_tonight_count + 1;
  rec.last_activity_date := today;

  update public.efaa_user_gamification
  set
    total_points = rec.total_points,
    diamonds_count = rec.diamonds_count,
    current_streak = rec.current_streak,
    last_activity_date = rec.last_activity_date,
    matchs_tonight_count = rec.matchs_tonight_count,
    updated_at = now()
  where user_id = p_user_id
  returning * into rec;

  return jsonb_build_object(
    'total_points', rec.total_points,
    'diamonds_count', rec.diamonds_count,
    'current_streak', rec.current_streak,
    'matchs_tonight_count', rec.matchs_tonight_count,
    'points_gained', points_gained,
    'diamonds_gained', diamonds_add
  );
end;
$$;
