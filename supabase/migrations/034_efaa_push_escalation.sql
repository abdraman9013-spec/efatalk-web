-- Escalating match alerts + level on push subs + cron via pg_net.

alter table public.efaa_push_subs
  add column if not exists level text not null default 'beginner';

create index if not exists efaa_push_subs_level_idx on public.efaa_push_subs (level);

create or replace function public.efaa_claim_push(p_kind text, p_user_id text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  today date := public.efaa_academy_today();
  inserted integer := 0;
begin
  if p_kind is null or length(trim(p_kind)) = 0 then
    return false;
  end if;
  insert into public.efaa_push_log (kind, day, user_id)
  values (trim(p_kind), today, coalesce(p_user_id, ''))
  on conflict (kind, day, user_id) do nothing;
  get diagnostics inserted = row_count;
  return inserted > 0;
end;
$$;

grant execute on function public.efaa_claim_push(text, text) to anon, authenticated;
