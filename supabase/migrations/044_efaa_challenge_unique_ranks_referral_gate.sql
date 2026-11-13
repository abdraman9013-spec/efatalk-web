-- Unique Challenge ranks (one person per place) and referral validation
-- after the spoken test or the first 5 phrases.

create or replace view public.efaa_challenge_leaderboard_v
with (security_invoker = true)
as
with scores as (
  select
    p.id as participant_id,
    p.challenge_id,
    p.user_id,
    p.status,
    p.joined_at,
    coalesce(sum(t.amount) filter (where t.counts_for_ranking), 0)::integer as points,
    coalesce(sum(t.amount) filter (
      where t.counts_for_ranking and t.source_type <> 'referral'
    ), 0)::integer as learning_points,
    max(t.created_at) filter (where t.counts_for_ranking) as score_achieved_at
  from public.efaa_challenge_participants p
  left join public.efaa_challenge_points_transactions t
    on t.participant_id = p.id and t.challenge_id = p.challenge_id
  group by p.id
),
facts as (
  select
    s.*,
    count(distinct d.academy_day) filter (where d.meaningful_activity)::integer as active_days,
    coalesce(sum(d.speaking_sessions), 0)::integer as speaking_sessions,
    (
      select count(*)::integer
      from public.efaa_challenge_referrals r
      where r.inviter_participant_id = s.participant_id and r.status = 'valid'
    ) as valid_referrals
  from scores s
  left join public.efaa_challenge_daily_stats d
    on d.participant_id = s.participant_id and d.challenge_id = s.challenge_id
  group by s.participant_id, s.challenge_id, s.user_id, s.status, s.joined_at,
           s.points, s.learning_points, s.score_achieved_at
)
select
  row_number() over (
    partition by f.challenge_id
    order by f.points desc, f.learning_points desc, f.active_days desc,
             f.speaking_sessions desc, f.score_achieved_at asc nulls last, f.user_id
  )::integer as rank,
  f.participant_id,
  f.challenge_id,
  f.user_id,
  coalesce(nullif(public.efaa_student_board_name(f.user_id), ''), g.display_name, 'EfaTalk learner') as display_name,
  public.efaa_student_avatar_url(f.user_id) as photo,
  g.nationality,
  f.points,
  f.learning_points,
  f.active_days,
  f.speaking_sessions,
  f.valid_referrals,
  g.current_streak,
  f.score_achieved_at
from facts f
left join public.efaa_user_gamification g on g.user_id = f.user_id
where f.status = 'active';

create or replace function efaa_private.challenge_try_validate_invitee(p_user_id text)
returns void
language plpgsql
security definer
set search_path = public, efaa_private
as $$
declare
  row record;
begin
  for row in
    select r.challenge_id, r.invited_participant_id
    from public.efaa_challenge_referrals r
    where r.invited_user_id = p_user_id
      and r.status in ('registered', 'activated')
      and r.invited_participant_id is not null
  loop
    perform efaa_private.challenge_activate_referral(row.challenge_id, row.invited_participant_id, now());
  end loop;
end;
$$;

create or replace function public.efaa_complete_survival_test(p_user_id text)
returns jsonb
language plpgsql
security definer
set search_path = public, efaa_private
as $$
begin
  if p_user_id is null or length(trim(p_user_id)) = 0 then
    raise exception 'user_id required';
  end if;
  perform efaa_private.challenge_try_validate_invitee(p_user_id);
  return jsonb_build_object('ok', true);
end;
$$;

grant execute on function public.efaa_complete_survival_test(text) to anon, authenticated;
