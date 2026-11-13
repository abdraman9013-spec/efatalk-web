-- Referral points must be credited when a friend signs up.
-- The review function is service-role only, so the site was marking
-- friends valid and then dropping the 30 points.

create or replace function efaa_private.challenge_award_referral(
  p_challenge_id text,
  p_referral_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  referral public.efaa_challenge_referrals%rowtype;
  inviter public.efaa_challenge_participants%rowtype;
  campaign public.efaa_challenges%rowtype;
  game public.efaa_user_gamification%rowtype;
  already integer := 0;
  award integer := 0;
  inserted integer := 0;
  lifetime bigint := 0;
  next_lifetime bigint := 0;
begin
  select * into referral
  from public.efaa_challenge_referrals
  where id = p_referral_id and challenge_id = p_challenge_id
  for update;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'missing');
  end if;
  if referral.status in ('held', 'invalid') or referral.risk_score >= 70 then
    return jsonb_build_object('ok', true, 'skipped', true, 'points', 0);
  end if;

  select * into campaign from public.efaa_challenges where id = p_challenge_id;
  if not found then
    return jsonb_build_object('ok', true, 'skipped', true, 'points', 0);
  end if;
  select * into inviter
  from public.efaa_challenge_participants
  where id = referral.inviter_participant_id and status = 'active'
  for update;
  if not found then
    return jsonb_build_object('ok', true, 'skipped', true, 'points', 0);
  end if;

  if exists (
    select 1 from public.efaa_challenge_points_transactions t
    where t.challenge_id = p_challenge_id
      and t.participant_id = inviter.id
      and t.source_type = 'referral'
      and t.amount > 0
      and (
        t.source_event_id = 'referral:' || referral.id::text
        or t.metadata->>'referral_id' = referral.id::text
      )
  ) then
    update public.efaa_challenge_referrals
    set status = 'valid',
        first_activity_at = coalesce(first_activity_at, now()),
        activated_at = coalesce(activated_at, now()),
        validated_at = coalesce(validated_at, now()),
        updated_at = now()
    where id = referral.id;
    return jsonb_build_object('ok', true, 'points', 0, 'status', 'valid');
  end if;

  select coalesce(sum(t.amount), 0)::integer into already
  from public.efaa_challenge_points_transactions t
  where t.challenge_id = p_challenge_id
    and t.participant_id = inviter.id
    and t.source_type = 'referral'
    and t.counts_for_ranking;
  award := greatest(least(campaign.referral_points, campaign.referral_points_cap - already), 0);

  if award > 0 then
    insert into public.efaa_user_gamification (user_id)
    values (inviter.user_id)
    on conflict (user_id) do nothing;
    select * into game from public.efaa_user_gamification
    where user_id = inviter.user_id
    for update;
    if found then
      lifetime := (game.diamonds_count::bigint * 10000) + game.total_points;
      next_lifetime := lifetime + award;
      update public.efaa_user_gamification
      set diamonds_count = floor(next_lifetime / 10000)::integer,
          total_points = (next_lifetime % 10000)::integer,
          updated_at = now()
      where user_id = inviter.user_id;
    end if;

    insert into public.efaa_challenge_points_transactions (
      challenge_id, participant_id, user_id, amount, reason, source_type,
      source_event_id, academy_day, metadata
    ) values (
      p_challenge_id, inviter.id, inviter.user_id, award,
      'Friend signed up for the Challenge', 'referral',
      'referral:' || referral.id::text, public.efaa_academy_today(),
      jsonb_build_object('referral_id', referral.id)
    )
    on conflict (challenge_id, participant_id, source_event_id) do nothing;
    get diagnostics inserted = row_count;
    if inserted > 0 then
      insert into public.efaa_challenge_daily_stats (
        challenge_id, participant_id, academy_day, referral_points
      ) values (
        p_challenge_id, inviter.id, public.efaa_academy_today(), award
      )
      on conflict (challenge_id, participant_id, academy_day) do update
      set referral_points = public.efaa_challenge_daily_stats.referral_points + excluded.referral_points,
          updated_at = now();
    else
      award := 0;
    end if;
  end if;

  update public.efaa_challenge_referrals
  set status = 'valid',
      first_activity_at = coalesce(first_activity_at, now()),
      activated_at = coalesce(activated_at, now()),
      validated_at = coalesce(validated_at, now()),
      updated_at = now()
  where id = referral.id;

  return jsonb_build_object('ok', true, 'points', award, 'status', 'valid');
end;
$$;

revoke all on function efaa_private.challenge_award_referral(text, uuid)
from public, anon, authenticated;

create or replace function public.efaa_challenge_award_my_referral()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  row record;
  awards jsonb := '[]'::jsonb;
begin
  if auth.uid() is null then
    return jsonb_build_object('ok', false, 'error', 'auth-required');
  end if;
  for row in
    select r.challenge_id, r.id
    from public.efaa_challenge_referrals r
    where r.invited_auth_user_id = auth.uid()
      and r.status in ('registered', 'activated', 'valid')
      and r.risk_score < 70
  loop
    awards := awards || jsonb_build_array(
      efaa_private.challenge_award_referral(row.challenge_id, row.id)
    );
  end loop;
  return jsonb_build_object('ok', true, 'awards', awards);
end;
$$;

revoke all on function public.efaa_challenge_award_my_referral() from public, anon;
grant execute on function public.efaa_challenge_award_my_referral() to authenticated, service_role;

do $$
declare
  rec record;
begin
  for rec in
    select r.challenge_id, r.id
    from public.efaa_challenge_referrals r
    where r.status = 'valid'
      and r.risk_score < 70
      and not exists (
        select 1
        from public.efaa_challenge_points_transactions t
        where t.amount > 0
          and t.source_type = 'referral'
          and (
            t.source_event_id = 'referral:' || r.id::text
            or t.metadata->>'referral_id' = r.id::text
          )
      )
  loop
    perform efaa_private.challenge_award_referral(rec.challenge_id, rec.id);
  end loop;
end $$;
