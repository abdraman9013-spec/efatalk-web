-- During Bonus 24h the class-board daily max is 1500; otherwise 700.

create or replace function public.efaa_grant_class_points(p_user_id text, p_points integer)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  rec public.efaa_user_gamification%rowtype;
  today date := public.efaa_academy_today();
  wanted integer := greatest(coalesce(p_points, 0), 0);
  already integer := 0;
  room integer;
  awarded integer := 0;
  combined integer;
  diamonds_add integer := 0;
  daily_cap integer := case when public.efaa_bonus_active() then 1500 else 700 end;
begin
  if p_user_id is null or length(trim(p_user_id)) = 0 or p_user_id = 'efaa-admin' then
    return jsonb_build_object(
      'points_gained', 0,
      'diamonds_gained', 0,
      'daily_remaining', daily_cap,
      'daily_cap', daily_cap
    );
  end if;

  insert into public.efaa_user_gamification (user_id)
  values (p_user_id)
  on conflict (user_id) do nothing;

  select * into rec
  from public.efaa_user_gamification
  where user_id = p_user_id
  for update;

  insert into public.efaa_class_daily (user_id, day, granted)
  values (p_user_id, today, 0)
  on conflict (user_id, day) do nothing;

  select granted into already
  from public.efaa_class_daily
  where user_id = p_user_id and day = today
  for update;

  room := greatest(daily_cap - coalesce(already, 0), 0);
  awarded := least(wanted, room);

  if awarded > 0 then
    combined := rec.total_points + awarded;
    diamonds_add := combined / 10000;
    rec.total_points := combined % 10000;
    rec.diamonds_count := rec.diamonds_count + diamonds_add;

    update public.efaa_user_gamification
    set total_points = rec.total_points,
        diamonds_count = rec.diamonds_count,
        updated_at = now()
    where user_id = p_user_id
    returning * into rec;

    update public.efaa_class_daily
    set granted = public.efaa_class_daily.granted + awarded
    where user_id = p_user_id and day = today;
  end if;

  return jsonb_build_object(
    'total_points', rec.total_points,
    'diamonds_count', rec.diamonds_count,
    'points_gained', awarded,
    'diamonds_gained', diamonds_add,
    'daily_granted', coalesce(already, 0) + awarded,
    'daily_cap', daily_cap,
    'daily_remaining', greatest(daily_cap - (coalesce(already, 0) + awarded), 0)
  );
end;
$$;
