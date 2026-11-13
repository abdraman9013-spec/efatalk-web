-- Shared World Cup pit. Matchmaking via REST heartbeat, not Realtime presence.
-- Isolated from live-room streak and from all pro_* tables.

create table if not exists public.efaa_clash_pit (
  seat text primary key,
  room_id text not null,
  user_id text not null,
  name text not null default 'Rival',
  photo text,
  nationality text,
  heartbeat timestamptz not null default now()
);

create index if not exists efaa_clash_pit_room_idx
  on public.efaa_clash_pit (room_id, seat);

alter table public.efaa_clash_pit enable row level security;
alter table public.efaa_clash_pit replica identity full;

drop policy if exists efaa_clash_pit_select on public.efaa_clash_pit;
create policy efaa_clash_pit_select
  on public.efaa_clash_pit for select
  using (true);

grant select on public.efaa_clash_pit to anon, authenticated;

do $$
begin
  begin
    alter publication supabase_realtime add table public.efaa_clash_pit;
  exception
    when duplicate_object then null;
    when undefined_object then null;
  end;
end $$;

create or replace function public.efaa_join_clash_pit(
  p_seat text,
  p_room text,
  p_user text,
  p_name text,
  p_photo text default null,
  p_nat text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  n integer;
  partner jsonb;
begin
  if coalesce(p_seat, '') = '' or coalesce(p_room, '') = '' or coalesce(p_user, '') = '' then
    raise exception 'invalid pit join';
  end if;

  delete from public.efaa_clash_pit
  where heartbeat < now() - interval '8 seconds';

  insert into public.efaa_clash_pit (seat, room_id, user_id, name, photo, nationality, heartbeat)
  values (p_seat, p_room, p_user, coalesce(nullif(p_name, ''), 'Rival'), nullif(p_photo, ''), nullif(p_nat, ''), now())
  on conflict (seat) do update set
    room_id = excluded.room_id,
    user_id = excluded.user_id,
    name = excluded.name,
    photo = excluded.photo,
    nationality = excluded.nationality,
    heartbeat = now();

  select count(*) into n from public.efaa_clash_pit where room_id = p_room;

  with ranked as (
    select
      seat,
      user_id,
      name,
      photo,
      nationality,
      row_number() over (order by seat) as rn
    from public.efaa_clash_pit
    where room_id = p_room
  ),
  mine as (
    select * from ranked where seat = p_seat
  )
  select jsonb_build_object(
    'seat', r.seat,
    'id', r.user_id,
    'name', r.name,
    'photo', r.photo,
    'nationality', r.nationality
  )
  into partner
  from ranked r, mine m
  where r.seat <> m.seat
    and (
      (m.rn % 2 = 1 and r.rn = m.rn + 1)
      or (m.rn % 2 = 0 and r.rn = m.rn - 1)
    );

  return jsonb_build_object(
    'waiting', n,
    'partner', partner
  );
end;
$$;

create or replace function public.efaa_leave_clash_pit(p_seat text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from public.efaa_clash_pit where seat = p_seat;
end;
$$;

grant execute on function public.efaa_join_clash_pit(text, text, text, text, text, text) to anon, authenticated;
grant execute on function public.efaa_leave_clash_pit(text) to anon, authenticated;
