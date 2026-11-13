-- Student portraits: storage + avatar_url. Practice and official stay on separate tables.

alter table public.efaa_practice_students
  add column if not exists avatar_url text;

alter table public.efaa_active_students
  add column if not exists avatar_url text;

alter table public.efaa_user_gamification
  add column if not exists avatar_url text;

update public.efaa_practice_students
set avatar_url = photo_url
where avatar_url is null
  and photo_url is not null
  and photo_url like 'http%';

update public.efaa_active_students
set avatar_url = photo_url
where avatar_url is null
  and photo_url is not null
  and photo_url like 'http%';

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'efaa-avatars',
  'efaa-avatars',
  true,
  2097152,
  array['image/webp', 'image/jpeg', 'image/png']::text[]
)
on conflict (id) do update
set
  public = true,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists efaa_avatars_select on storage.objects;
create policy efaa_avatars_select
  on storage.objects for select
  using (bucket_id = 'efaa-avatars');

drop policy if exists efaa_avatars_insert on storage.objects;
create policy efaa_avatars_insert
  on storage.objects for insert
  with check (
    bucket_id = 'efaa-avatars'
    and split_part(name, '/', 1) = 'efaa'
  );

drop policy if exists efaa_avatars_update on storage.objects;
create policy efaa_avatars_update
  on storage.objects for update
  using (
    bucket_id = 'efaa-avatars'
    and split_part(name, '/', 1) = 'efaa'
  )
  with check (
    bucket_id = 'efaa-avatars'
    and split_part(name, '/', 1) = 'efaa'
  );

drop policy if exists efaa_avatars_delete on storage.objects;
create policy efaa_avatars_delete
  on storage.objects for delete
  using (
    bucket_id = 'efaa-avatars'
    and split_part(name, '/', 1) = 'efaa'
  );

create or replace function public.efaa_student_avatar_url(p_user_id text)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (
      select coalesce(nullif(btrim(p.avatar_url), ''), case when p.photo_url like 'http%' then p.photo_url else null end)
      from public.efaa_practice_students p
      where p.id::text = p_user_id
      limit 1
    ),
    (
      select coalesce(nullif(btrim(a.avatar_url), ''), case when a.photo_url like 'http%' then a.photo_url else null end)
      from public.efaa_active_students a
      where a.id::text = p_user_id
      limit 1
    )
  );
$$;

revoke all on function public.efaa_student_avatar_url(text) from public;
grant execute on function public.efaa_student_avatar_url(text) to anon, authenticated;

create or replace function public.efaa_set_student_avatar(
  p_user_id text,
  p_email text,
  p_url text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  mail text := lower(btrim(coalesce(p_email, '')));
  uid text := btrim(coalesce(p_user_id, ''));
  url text := nullif(btrim(coalesce(p_url, '')), '');
  kind text;
begin
  if uid = '' or mail = '' or url is null or url not like 'http%' then
    raise exception 'avatar-invalid';
  end if;
  if uid = 'efaa-admin' then
    raise exception 'avatar-forbidden';
  end if;

  update public.efaa_practice_students
  set avatar_url = url, photo_url = url
  where id::text = uid and lower(email) = mail;
  if found then
    kind := 'practice';
  else
    update public.efaa_active_students
    set avatar_url = url, photo_url = url
    where id::text = uid and lower(email) = mail;
    if found then
      kind := 'official';
    else
      raise exception 'avatar-missing';
    end if;
  end if;

  update public.efaa_user_gamification
  set avatar_url = url, updated_at = timezone('utc', now())
  where user_id = uid;

  return jsonb_build_object('ok', true, 'kind', kind, 'url', url);
end;
$$;

revoke all on function public.efaa_set_student_avatar(text, text, text) from public;
grant execute on function public.efaa_set_student_avatar(text, text, text) to anon, authenticated;

create or replace function public.efaa_leaderboard_for(p_user_id text)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  me public.efaa_user_gamification%rowtype;
  rival public.efaa_user_gamification%rowtype;
  my_rank integer := 1;
  top_rows jsonb;
  gap integer := 0;
  me_name text;
  rival_name text;
begin
  select * into me from public.efaa_user_gamification where user_id = p_user_id;
  me_name := coalesce(nullif(public.efaa_student_board_name(p_user_id), ''), me.display_name);

  select jsonb_agg(row_to_json(t))
    into top_rows
  from (
    select
      g.user_id,
      coalesce(nullif(public.efaa_student_board_name(g.user_id), ''), g.display_name) as display_name,
      g.nationality,
      g.current_streak,
      g.diamonds_count,
      g.total_points,
      public.efaa_student_avatar_url(g.user_id) as photo
    from public.efaa_user_gamification g
    where g.user_id <> 'efaa-admin'
      and btrim(coalesce(nullif(public.efaa_student_board_name(g.user_id), ''), g.display_name, '')) <> ''
      and (
        exists (select 1 from public.efaa_practice_students p where p.id::text = g.user_id)
        or exists (select 1 from public.efaa_active_students a where a.id::text = g.user_id)
      )
    order by g.total_points desc, g.diamonds_count desc, g.current_streak desc, g.user_id asc
  ) t;

  if me.user_id is null then
    return jsonb_build_object('top', coalesce(top_rows, '[]'::jsonb), 'me', null, 'rank', null, 'rival', null, 'gap', 0);
  end if;

  select count(*)::integer + 1
  into my_rank
  from public.efaa_user_gamification g
  where g.user_id <> 'efaa-admin'
    and btrim(coalesce(nullif(public.efaa_student_board_name(g.user_id), ''), g.display_name, '')) <> ''
    and (
      exists (select 1 from public.efaa_practice_students p where p.id::text = g.user_id)
      or exists (select 1 from public.efaa_active_students a where a.id::text = g.user_id)
    )
    and (
      g.total_points > coalesce(me.total_points, 0)
      or (g.total_points = coalesce(me.total_points, 0) and g.diamonds_count > coalesce(me.diamonds_count, 0))
      or (
        g.total_points = coalesce(me.total_points, 0)
        and g.diamonds_count = coalesce(me.diamonds_count, 0)
        and g.current_streak > coalesce(me.current_streak, 0)
      )
      or (
        g.total_points = coalesce(me.total_points, 0)
        and g.diamonds_count = coalesce(me.diamonds_count, 0)
        and g.current_streak = coalesce(me.current_streak, 0)
        and g.user_id < me.user_id
      )
    );

  select *
  into rival
  from public.efaa_user_gamification g
  where g.user_id <> me.user_id
    and g.user_id <> 'efaa-admin'
    and btrim(coalesce(nullif(public.efaa_student_board_name(g.user_id), ''), g.display_name, '')) <> ''
    and (
      exists (select 1 from public.efaa_practice_students p where p.id::text = g.user_id)
      or exists (select 1 from public.efaa_active_students a where a.id::text = g.user_id)
    )
    and g.total_points > coalesce(me.total_points, 0)
  order by g.total_points asc, g.diamonds_count asc, g.user_id asc
  limit 1;

  if rival.user_id is not null then
    gap := rival.total_points - coalesce(me.total_points, 0);
    rival_name := coalesce(nullif(public.efaa_student_board_name(rival.user_id), ''), rival.display_name);
  end if;

  return jsonb_build_object(
    'top', coalesce(top_rows, '[]'::jsonb),
    'me', to_jsonb(me) || jsonb_build_object(
      'display_name', coalesce(me_name, me.display_name),
      'photo', public.efaa_student_avatar_url(me.user_id)
    ),
    'rank', my_rank,
    'rival', case
      when rival.user_id is null then null
      else to_jsonb(rival) || jsonb_build_object(
        'display_name', coalesce(rival_name, rival.display_name),
        'photo', public.efaa_student_avatar_url(rival.user_id)
      )
    end,
    'gap', greatest(gap, 0)
  );
end;
$$;

grant execute on function public.efaa_leaderboard_for(text) to anon, authenticated;
