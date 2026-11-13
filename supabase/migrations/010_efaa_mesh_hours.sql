create table if not exists public.efaa_open_hours (
  weekday smallint primary key check (weekday >= 0 and weekday <= 6),
  open_at time not null default '21:00',
  close_at time not null default '22:00',
  enabled boolean not null default false
);

insert into public.efaa_open_hours (weekday, open_at, close_at, enabled) values
  (0, '21:00', '22:00', true),
  (1, '21:00', '22:00', false),
  (2, '21:00', '22:00', true),
  (3, '21:00', '22:00', false),
  (4, '21:00', '22:00', true),
  (5, '21:00', '22:00', false),
  (6, '21:00', '22:00', true)
on conflict (weekday) do nothing;

alter table public.efaa_open_hours enable row level security;

drop policy if exists efaa_open_hours_select on public.efaa_open_hours;
create policy efaa_open_hours_select on public.efaa_open_hours for select using (true);

drop policy if exists efaa_open_hours_write on public.efaa_open_hours;
create policy efaa_open_hours_write on public.efaa_open_hours for all using (true) with check (true);

grant select, insert, update, delete on public.efaa_open_hours to anon, authenticated;

create or replace function public.efaa_award_reaction_points(
  p_speaker_id text,
  p_sender_id text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  rec public.efaa_user_gamification%rowtype;
  gained integer := 1;
  combined integer;
  diamonds_add integer := 0;
begin
  if p_speaker_id is null or length(trim(p_speaker_id)) = 0 then
    raise exception 'speaker required';
  end if;
  if p_speaker_id = p_sender_id then
    gained := 0;
  end if;

  insert into public.efaa_user_gamification (user_id)
  values (p_speaker_id)
  on conflict (user_id) do nothing;

  select * into rec from public.efaa_user_gamification where user_id = p_speaker_id for update;

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
    where user_id = p_speaker_id
    returning * into rec;
  end if;

  return jsonb_build_object(
    'total_points', rec.total_points,
    'diamonds_count', rec.diamonds_count,
    'points_gained', gained
  );
end;
$$;

grant execute on function public.efaa_award_reaction_points(text, text) to anon, authenticated;
