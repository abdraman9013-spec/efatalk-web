create table if not exists public.efaa_intermediate_progress (
  user_id text primary key,
  day_index integer not null default 0 check (day_index >= 0),
  last_formation_date date,
  learned_slang_ids text[] not null default '{}'::text[],
  warmup_points_today integer not null default 0 check (warmup_points_today >= 0),
  warmup_date date,
  updated_at timestamptz not null default now()
);

alter table public.efaa_intermediate_progress enable row level security;

drop policy if exists efaa_intermediate_progress_select on public.efaa_intermediate_progress;
create policy efaa_intermediate_progress_select
  on public.efaa_intermediate_progress for select
  using (true);

drop policy if exists efaa_intermediate_progress_insert on public.efaa_intermediate_progress;
create policy efaa_intermediate_progress_insert
  on public.efaa_intermediate_progress for insert
  with check (true);

drop policy if exists efaa_intermediate_progress_update on public.efaa_intermediate_progress;
create policy efaa_intermediate_progress_update
  on public.efaa_intermediate_progress for update
  using (true)
  with check (true);

grant select, insert, update on public.efaa_intermediate_progress to anon, authenticated;

create or replace function public.efaa_ensure_intermediate(p_user_id text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  rec public.efaa_intermediate_progress%rowtype;
begin
  if p_user_id is null or length(trim(p_user_id)) = 0 then
    raise exception 'user_id required';
  end if;

  insert into public.efaa_intermediate_progress (user_id)
  values (p_user_id)
  on conflict (user_id) do nothing;

  select * into rec from public.efaa_intermediate_progress where user_id = p_user_id;
  return to_jsonb(rec);
end;
$$;

create or replace function public.efaa_complete_intermediate_day(
  p_user_id text,
  p_slang_ids text[],
  p_display_name text default null,
  p_nationality text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  rec public.efaa_intermediate_progress%rowtype;
  today date := (timezone('utc', now()))::date;
begin
  if p_user_id is null or length(trim(p_user_id)) = 0 then
    raise exception 'user_id required';
  end if;

  insert into public.efaa_intermediate_progress (user_id)
  values (p_user_id)
  on conflict (user_id) do nothing;

  select * into rec from public.efaa_intermediate_progress where user_id = p_user_id for update;

  if rec.last_formation_date is distinct from today then
    rec.day_index := rec.day_index + 1;
    rec.last_formation_date := today;
    rec.learned_slang_ids := (
      select coalesce(array_agg(distinct phrase), '{}'::text[])
      from unnest(coalesce(rec.learned_slang_ids, '{}'::text[]) || coalesce(p_slang_ids, '{}'::text[])) as phrase
    );
    update public.efaa_intermediate_progress
    set
      day_index = rec.day_index,
      last_formation_date = rec.last_formation_date,
      learned_slang_ids = rec.learned_slang_ids,
      updated_at = now()
    where user_id = p_user_id
    returning * into rec;
  end if;

  insert into public.efaa_user_gamification (user_id, display_name, nationality)
  values (p_user_id, coalesce(p_display_name, ''), coalesce(p_nationality, ''))
  on conflict (user_id) do nothing;

  if p_display_name is not null or p_nationality is not null then
    update public.efaa_user_gamification
    set
      display_name = coalesce(nullif(p_display_name, ''), display_name),
      nationality = coalesce(nullif(p_nationality, ''), nationality),
      updated_at = now()
    where user_id = p_user_id;
  end if;

  return to_jsonb(rec);
end;
$$;

create or replace function public.efaa_award_warmup_points(
  p_user_id text,
  p_points integer
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  rec public.efaa_user_gamification%rowtype;
  mid public.efaa_intermediate_progress%rowtype;
  today date := (timezone('utc', now()))::date;
  gained integer := least(greatest(coalesce(p_points, 0), 5), 10);
  combined integer;
  diamonds_add integer;
  daily_cap integer := 40;
begin
  if p_user_id is null or length(trim(p_user_id)) = 0 then
    raise exception 'user_id required';
  end if;

  insert into public.efaa_intermediate_progress (user_id)
  values (p_user_id)
  on conflict (user_id) do nothing;

  select * into mid from public.efaa_intermediate_progress where user_id = p_user_id for update;

  if mid.warmup_date is distinct from today then
    mid.warmup_points_today := 0;
    mid.warmup_date := today;
  end if;

  if mid.warmup_points_today >= daily_cap then
    gained := 0;
  elsif mid.warmup_points_today + gained > daily_cap then
    gained := daily_cap - mid.warmup_points_today;
  end if;

  update public.efaa_intermediate_progress
  set
    warmup_points_today = mid.warmup_points_today + gained,
    warmup_date = today,
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
    'warmup_points_today', mid.warmup_points_today
  );
end;
$$;

grant execute on function public.efaa_ensure_intermediate(text) to anon, authenticated;
grant execute on function public.efaa_complete_intermediate_day(text, text[], text, text) to anon, authenticated;
grant execute on function public.efaa_award_warmup_points(text, integer) to anon, authenticated;
