-- EfaTalk English Challenge 2026
-- One lifetime score, one auditable dated Challenge ledger.
-- Challenge window: 15–29 October 2026, Africa/Ndjamena.

create extension if not exists pgcrypto;

create schema if not exists efaa_private;
revoke all on schema efaa_private from public, anon, authenticated;

create table if not exists public.efaa_challenges (
  id text primary key,
  name text not null,
  tagline text not null,
  timezone text not null default 'Africa/Ndjamena',
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  verification_at timestamptz,
  announcement_at timestamptz,
  status text not null default 'draft'
    check (status in ('draft', 'scheduled', 'paused', 'verification', 'final')),
  rules_version text not null default '2026.1',
  required_referrals integer not null default 2 check (required_referrals between 0 and 20),
  referral_points integer not null default 30 check (referral_points between 0 and 200),
  referral_points_cap integer not null default 300 check (referral_points_cap between 0 and 2000),
  daily_points_cap integer not null default 230 check (daily_points_cap between 1 and 5000),
  prizes jsonb not null default
    '{"first":75000,"second":50000,"third":25000,"currency":"FCFA"}'::jsonb,
  leaderboard_locked boolean not null default false,
  locked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_at > starts_at)
);

create table if not exists public.efaa_challenge_participants (
  id uuid primary key default gen_random_uuid(),
  challenge_id text not null references public.efaa_challenges(id) on delete cascade,
  user_id text not null,
  auth_user_id uuid not null,
  rules_version text not null,
  rules_accepted_at timestamptz not null,
  tiktok_declared boolean not null default false,
  facebook_declared boolean not null default false,
  social_declaration_at timestamptz,
  social_verification text not null default 'self_declared'
    check (social_verification in ('self_declared', 'admin_verified', 'rejected')),
  onboarding_completed boolean not null default true,
  referral_token text not null,
  public_country boolean not null default true,
  public_city boolean not null default false,
  status text not null default 'active'
    check (status in ('active', 'held', 'disqualified', 'withdrawn')),
  highest_rank integer,
  joined_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (challenge_id, user_id),
  unique (challenge_id, auth_user_id),
  unique (challenge_id, referral_token)
);

create table if not exists public.efaa_challenge_referrals (
  id uuid primary key default gen_random_uuid(),
  challenge_id text not null references public.efaa_challenges(id) on delete cascade,
  inviter_participant_id uuid not null
    references public.efaa_challenge_participants(id) on delete cascade,
  invited_participant_id uuid
    references public.efaa_challenge_participants(id) on delete set null,
  invited_auth_user_id uuid,
  invited_user_id text,
  referral_token text not null,
  status text not null default 'registered'
    check (status in ('clicked', 'registered', 'activated', 'valid', 'held', 'invalid')),
  registered_at timestamptz,
  onboarded_at timestamptz,
  first_activity_at timestamptz,
  activated_at timestamptz,
  validated_at timestamptz,
  invalidated_at timestamptz,
  risk_score integer not null default 0 check (risk_score between 0 and 100),
  risk_reasons text[] not null default '{}'::text[],
  ip_hash text,
  device_hash text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (challenge_id, invited_auth_user_id),
  unique (challenge_id, invited_user_id),
  check (invited_participant_id is null or invited_participant_id <> inviter_participant_id)
);

create table if not exists public.efaa_challenge_activities (
  challenge_id text not null references public.efaa_challenges(id) on delete cascade,
  activity_type text not null,
  label text not null,
  points integer not null check (points >= 0),
  daily_points_cap integer not null check (daily_points_cap >= 0),
  min_duration_seconds integer not null default 0 check (min_duration_seconds >= 0),
  max_completions_per_day integer not null default 1 check (max_completions_per_day >= 0),
  meaningful boolean not null default true,
  enabled boolean not null default true,
  validation_method text not null default 'server_event',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (challenge_id, activity_type)
);

create table if not exists public.efaa_challenge_activity_completions (
  id uuid primary key default gen_random_uuid(),
  challenge_id text not null references public.efaa_challenges(id) on delete cascade,
  participant_id uuid not null
    references public.efaa_challenge_participants(id) on delete cascade,
  user_id text not null,
  activity_type text not null,
  source_event_id text not null,
  academy_day date not null,
  started_at timestamptz,
  completed_at timestamptz not null default now(),
  duration_seconds integer not null default 0 check (duration_seconds >= 0),
  requested_points integer not null default 0,
  awarded_points integer not null default 0,
  validation_status text not null default 'valid'
    check (validation_status in ('valid', 'held', 'invalid')),
  validation_method text not null default 'server_event',
  metadata jsonb not null default '{}'::jsonb,
  unique (challenge_id, participant_id, source_event_id)
);

create table if not exists public.efaa_challenge_points_transactions (
  id uuid primary key default gen_random_uuid(),
  challenge_id text not null references public.efaa_challenges(id) on delete cascade,
  participant_id uuid not null
    references public.efaa_challenge_participants(id) on delete cascade,
  user_id text not null,
  amount integer not null check (amount <> 0),
  reason text not null,
  source_type text not null,
  source_event_id text not null,
  academy_day date not null,
  counts_for_ranking boolean not null default true,
  reverses_transaction_id uuid
    references public.efaa_challenge_points_transactions(id) on delete restrict,
  administrator_id text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (challenge_id, participant_id, source_event_id)
);

create table if not exists public.efaa_challenge_daily_stats (
  challenge_id text not null references public.efaa_challenges(id) on delete cascade,
  participant_id uuid not null
    references public.efaa_challenge_participants(id) on delete cascade,
  academy_day date not null,
  learning_points integer not null default 0 check (learning_points >= 0),
  referral_points integer not null default 0 check (referral_points >= 0),
  valid_completions integer not null default 0 check (valid_completions >= 0),
  speaking_sessions integer not null default 0 check (speaking_sessions >= 0),
  card_corrects integer not null default 0 check (card_corrects >= 0),
  meaningful_activity boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (challenge_id, participant_id, academy_day)
);

create table if not exists public.efaa_challenge_matches (
  id uuid primary key default gen_random_uuid(),
  challenge_id text not null references public.efaa_challenges(id) on delete cascade,
  room_key text not null,
  game_type text not null,
  started_at timestamptz not null,
  ended_at timestamptz,
  status text not null default 'started'
    check (status in ('started', 'completed', 'cancelled', 'held', 'invalid')),
  validation_method text not null default 'server_session',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.efaa_challenge_match_participants (
  match_id uuid not null references public.efaa_challenge_matches(id) on delete cascade,
  participant_id uuid not null
    references public.efaa_challenge_participants(id) on delete cascade,
  user_id text not null,
  joined_at timestamptz not null default now(),
  left_at timestamptz,
  speech_seconds integer not null default 0 check (speech_seconds >= 0),
  score integer not null default 0,
  result text,
  validated boolean not null default false,
  primary key (match_id, participant_id)
);

create table if not exists public.efaa_challenge_fraud_flags (
  id uuid primary key default gen_random_uuid(),
  challenge_id text not null references public.efaa_challenges(id) on delete cascade,
  participant_id uuid
    references public.efaa_challenge_participants(id) on delete cascade,
  referral_id uuid references public.efaa_challenge_referrals(id) on delete cascade,
  severity text not null check (severity in ('low', 'medium', 'high', 'critical')),
  signal_type text not null,
  reason text not null,
  evidence jsonb not null default '{}'::jsonb,
  status text not null default 'open'
    check (status in ('open', 'reviewing', 'cleared', 'confirmed')),
  reviewed_by text,
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.efaa_challenge_disqualifications (
  id uuid primary key default gen_random_uuid(),
  challenge_id text not null references public.efaa_challenges(id) on delete cascade,
  participant_id uuid not null
    references public.efaa_challenge_participants(id) on delete cascade,
  reason text not null,
  evidence jsonb not null default '{}'::jsonb,
  administrator_id text not null,
  disqualified_at timestamptz not null default now(),
  restored_at timestamptz,
  restored_by text,
  restore_reason text
);

create table if not exists public.efaa_challenge_admin_actions (
  id uuid primary key default gen_random_uuid(),
  challenge_id text references public.efaa_challenges(id) on delete set null,
  administrator_id text not null,
  action text not null,
  target_type text,
  target_id text,
  reason text not null,
  before_data jsonb,
  after_data jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.efaa_challenge_daily_challenges (
  challenge_id text not null references public.efaa_challenges(id) on delete cascade,
  day_number integer not null check (day_number between 1 and 365),
  academy_day date not null,
  title_fr text not null,
  title_en text not null,
  title_ar text not null,
  prompt_fr text not null,
  prompt_en text not null,
  prompt_ar text not null,
  activity_type text not null default 'daily_challenge',
  points integer not null default 30 check (points >= 0),
  published boolean not null default true,
  primary key (challenge_id, day_number),
  unique (challenge_id, academy_day)
);

create table if not exists public.efaa_challenge_leaderboard_snapshots (
  id uuid primary key default gen_random_uuid(),
  challenge_id text not null references public.efaa_challenges(id) on delete cascade,
  snapshot_type text not null check (snapshot_type in ('daily', 'freeze', 'final')),
  academy_day date not null,
  payload jsonb not null,
  created_at timestamptz not null default now()
);

create table if not exists public.efaa_challenge_winner_verifications (
  id uuid primary key default gen_random_uuid(),
  challenge_id text not null references public.efaa_challenges(id) on delete cascade,
  participant_id uuid not null
    references public.efaa_challenge_participants(id) on delete cascade,
  proposed_rank integer not null check (proposed_rank > 0),
  final_points integer not null,
  learning_points integer not null,
  active_days integer not null,
  speaking_sessions integer not null,
  valid_referrals integer not null,
  invalid_referrals integer not null,
  unresolved_flags integer not null,
  eligibility_status text not null,
  tie_break jsonb not null default '{}'::jsonb,
  audit_status text not null default 'pending'
    check (audit_status in ('pending', 'verified', 'rejected')),
  verified_by text,
  verified_at timestamptz,
  report jsonb not null default '{}'::jsonb,
  unique (challenge_id, proposed_rank)
);

create index if not exists efaa_challenge_tx_rank_idx
  on public.efaa_challenge_points_transactions
  (challenge_id, counts_for_ranking, user_id, created_at);
create index if not exists efaa_challenge_referral_inviter_idx
  on public.efaa_challenge_referrals (challenge_id, inviter_participant_id, status);
create index if not exists efaa_challenge_completion_day_idx
  on public.efaa_challenge_activity_completions
  (challenge_id, participant_id, academy_day, activity_type);
create index if not exists efaa_challenge_flags_queue_idx
  on public.efaa_challenge_fraud_flags (challenge_id, status, severity, created_at);
create index if not exists efaa_challenge_completion_participant_idx
  on public.efaa_challenge_activity_completions (participant_id);
create index if not exists efaa_challenge_admin_challenge_idx
  on public.efaa_challenge_admin_actions (challenge_id);
create index if not exists efaa_challenge_daily_participant_idx
  on public.efaa_challenge_daily_stats (participant_id);
create index if not exists efaa_challenge_disqualification_challenge_idx
  on public.efaa_challenge_disqualifications (challenge_id);
create index if not exists efaa_challenge_disqualification_participant_idx
  on public.efaa_challenge_disqualifications (participant_id);
create index if not exists efaa_challenge_flag_participant_idx
  on public.efaa_challenge_fraud_flags (participant_id);
create index if not exists efaa_challenge_flag_referral_idx
  on public.efaa_challenge_fraud_flags (referral_id);
create index if not exists efaa_challenge_snapshot_challenge_idx
  on public.efaa_challenge_leaderboard_snapshots (challenge_id);
create index if not exists efaa_challenge_match_participant_idx
  on public.efaa_challenge_match_participants (participant_id);
create index if not exists efaa_challenge_match_challenge_idx
  on public.efaa_challenge_matches (challenge_id);
create index if not exists efaa_challenge_tx_participant_idx
  on public.efaa_challenge_points_transactions (participant_id);
create index if not exists efaa_challenge_tx_reversal_idx
  on public.efaa_challenge_points_transactions (reverses_transaction_id);
create index if not exists efaa_challenge_referral_invited_participant_idx
  on public.efaa_challenge_referrals (invited_participant_id);
create index if not exists efaa_challenge_winner_participant_idx
  on public.efaa_challenge_winner_verifications (participant_id);
create index if not exists efaa_challenge_referral_inviter_id_idx
  on public.efaa_challenge_referrals (inviter_participant_id);

alter table public.efaa_challenges enable row level security;
alter table public.efaa_challenge_participants enable row level security;
alter table public.efaa_challenge_referrals enable row level security;
alter table public.efaa_challenge_activities enable row level security;
alter table public.efaa_challenge_activity_completions enable row level security;
alter table public.efaa_challenge_points_transactions enable row level security;
alter table public.efaa_challenge_daily_stats enable row level security;
alter table public.efaa_challenge_matches enable row level security;
alter table public.efaa_challenge_match_participants enable row level security;
alter table public.efaa_challenge_fraud_flags enable row level security;
alter table public.efaa_challenge_disqualifications enable row level security;
alter table public.efaa_challenge_admin_actions enable row level security;
alter table public.efaa_challenge_daily_challenges enable row level security;
alter table public.efaa_challenge_leaderboard_snapshots enable row level security;
alter table public.efaa_challenge_winner_verifications enable row level security;

revoke all on
  public.efaa_challenges,
  public.efaa_challenge_participants,
  public.efaa_challenge_referrals,
  public.efaa_challenge_activities,
  public.efaa_challenge_activity_completions,
  public.efaa_challenge_points_transactions,
  public.efaa_challenge_daily_stats,
  public.efaa_challenge_matches,
  public.efaa_challenge_match_participants,
  public.efaa_challenge_fraud_flags,
  public.efaa_challenge_disqualifications,
  public.efaa_challenge_admin_actions,
  public.efaa_challenge_daily_challenges,
  public.efaa_challenge_leaderboard_snapshots,
  public.efaa_challenge_winner_verifications
from public, anon, authenticated;

create or replace function efaa_private.challenge_for_scoring()
returns public.efaa_challenges
language sql
stable
security definer
set search_path = public, efaa_private
as $$
  select c
  from public.efaa_challenges c
  where c.status = 'scheduled'
    and c.leaderboard_locked = false
    and now() >= c.starts_at
    and now() <= c.ends_at
  order by c.starts_at desc
  limit 1;
$$;

create or replace function efaa_private.challenge_participant_owned(
  p_challenge_id text,
  p_user_id text
)
returns public.efaa_challenge_participants
language sql
stable
security definer
set search_path = public, auth, efaa_private
as $$
  select p
  from public.efaa_challenge_participants p
  where p.challenge_id = p_challenge_id
    and p.user_id = p_user_id
    and p.auth_user_id = auth.uid()
    and p.status = 'active'
  limit 1;
$$;

create or replace function efaa_private.challenge_allowed_points(
  p_user_id text,
  p_requested integer,
  p_source_type text,
  p_source_event_id text
)
returns integer
language plpgsql
security definer
set search_path = public, efaa_private
as $$
declare
  campaign public.efaa_challenges%rowtype;
  participant public.efaa_challenge_participants%rowtype;
  activity public.efaa_challenge_activities%rowtype;
  today date := public.efaa_academy_today();
  used_daily integer := 0;
  used_source integer := 0;
begin
  select * into campaign from efaa_private.challenge_for_scoring();
  if campaign.id is null then
    return greatest(coalesce(p_requested, 0), 0);
  end if;

  select * into participant
  from efaa_private.challenge_participant_owned(campaign.id, p_user_id);
  if participant.id is null then
    return greatest(coalesce(p_requested, 0), 0);
  end if;

  if exists (
    select 1 from public.efaa_challenge_points_transactions t
    where t.challenge_id = campaign.id
      and t.participant_id = participant.id
      and t.source_event_id = p_source_event_id
  ) then
    return 0;
  end if;

  select * into activity
  from public.efaa_challenge_activities a
  where a.challenge_id = campaign.id
    and a.activity_type = p_source_type
    and a.enabled = true;

  if activity.activity_type is null then
    return greatest(coalesce(p_requested, 0), 0);
  end if;
  if activity.daily_points_cap <= 0 then
    return 0;
  end if;

  select coalesce(sum(greatest(t.amount, 0)), 0)::integer into used_daily
  from public.efaa_challenge_points_transactions t
  where t.challenge_id = campaign.id
    and t.participant_id = participant.id
    and t.academy_day = today
    and t.counts_for_ranking
    and t.source_type <> 'referral';

  select coalesce(sum(greatest(t.amount, 0)), 0)::integer into used_source
  from public.efaa_challenge_points_transactions t
  where t.challenge_id = campaign.id
    and t.participant_id = participant.id
    and t.academy_day = today
    and t.counts_for_ranking
    and t.source_type = activity.activity_type;

  return greatest(least(
    greatest(coalesce(p_requested, 0), 0),
    campaign.daily_points_cap - used_daily,
    activity.daily_points_cap - used_source
  ), 0);
end;
$$;

create or replace function efaa_private.challenge_activate_referral(
  p_challenge_id text,
  p_invited_participant_id uuid,
  p_first_activity_at timestamptz
)
returns void
language plpgsql
security definer
set search_path = public, efaa_private
as $$
declare
  referral public.efaa_challenge_referrals%rowtype;
  campaign public.efaa_challenges%rowtype;
  inviter public.efaa_challenge_participants%rowtype;
  already integer := 0;
  award integer := 0;
  rec public.efaa_user_gamification%rowtype;
  combined integer;
  diamonds_add integer;
begin
  select * into referral
  from public.efaa_challenge_referrals r
  where r.challenge_id = p_challenge_id
    and r.invited_participant_id = p_invited_participant_id
    and r.status in ('registered', 'activated')
  for update;

  if referral.id is null then return; end if;

  select * into campaign from public.efaa_challenges where id = p_challenge_id;
  select * into inviter
  from public.efaa_challenge_participants
  where id = referral.inviter_participant_id and status = 'active'
  for update;
  if inviter.id is null then return; end if;

  update public.efaa_challenge_referrals
  set status = case when risk_score >= 70 then 'held' else 'valid' end,
      first_activity_at = coalesce(first_activity_at, p_first_activity_at),
      activated_at = coalesce(activated_at, p_first_activity_at),
      validated_at = case when risk_score < 70 then coalesce(validated_at, now()) else validated_at end,
      updated_at = now()
  where id = referral.id;

  if referral.risk_score >= 70 then return; end if;

  select coalesce(sum(greatest(amount, 0)), 0)::integer into already
  from public.efaa_challenge_points_transactions
  where challenge_id = p_challenge_id
    and participant_id = inviter.id
    and source_type = 'referral'
    and counts_for_ranking;

  award := greatest(least(campaign.referral_points, campaign.referral_points_cap - already), 0);
  if award <= 0 then return; end if;

  if exists (
    select 1 from public.efaa_challenge_points_transactions
    where challenge_id = p_challenge_id
      and participant_id = inviter.id
      and source_event_id = 'referral:' || referral.id::text
  ) then return; end if;

  insert into public.efaa_user_gamification (user_id)
  values (inviter.user_id)
  on conflict (user_id) do nothing;

  select * into rec from public.efaa_user_gamification
  where user_id = inviter.user_id for update;
  combined := rec.total_points + award;
  diamonds_add := combined / 10000;

  update public.efaa_user_gamification
  set total_points = combined % 10000,
      diamonds_count = diamonds_count + diamonds_add,
      updated_at = now()
  where user_id = inviter.user_id;

  insert into public.efaa_challenge_points_transactions (
    challenge_id, participant_id, user_id, amount, reason, source_type,
    source_event_id, academy_day, metadata
  ) values (
    p_challenge_id, inviter.id, inviter.user_id, award,
    'Activated referral', 'referral', 'referral:' || referral.id::text,
    public.efaa_academy_today(), jsonb_build_object('referral_id', referral.id)
  );

  insert into public.efaa_challenge_daily_stats (
    challenge_id, participant_id, academy_day, referral_points
  ) values (
    p_challenge_id, inviter.id, public.efaa_academy_today(), award
  )
  on conflict (challenge_id, participant_id, academy_day) do update
  set referral_points = public.efaa_challenge_daily_stats.referral_points + excluded.referral_points,
      updated_at = now();
end;
$$;

create or replace function efaa_private.challenge_record_award(
  p_user_id text,
  p_amount integer,
  p_source_type text,
  p_source_event_id text,
  p_metadata jsonb default '{}'::jsonb
)
returns void
language plpgsql
security definer
set search_path = public, efaa_private
as $$
declare
  campaign public.efaa_challenges%rowtype;
  participant public.efaa_challenge_participants%rowtype;
  today date := public.efaa_academy_today();
  meaningful boolean := true;
  completion_inserted integer := 0;
begin
  if coalesce(p_amount, 0) <= 0 then return; end if;
  select * into campaign from efaa_private.challenge_for_scoring();
  if campaign.id is null then return; end if;
  select * into participant
  from efaa_private.challenge_participant_owned(campaign.id, p_user_id);
  if participant.id is null then return; end if;

  if not exists (
    select 1 from public.efaa_challenge_activities a
    where a.challenge_id = campaign.id
      and a.activity_type = p_source_type
      and a.enabled = true
  ) then
    return;
  end if;
  select coalesce(a.meaningful, true) into meaningful
  from public.efaa_challenge_activities a
  where a.challenge_id = campaign.id and a.activity_type = p_source_type;

  insert into public.efaa_challenge_activity_completions (
    challenge_id, participant_id, user_id, activity_type, source_event_id,
    academy_day, duration_seconds, requested_points, awarded_points,
    validation_method, metadata
  ) values (
    campaign.id, participant.id, p_user_id, p_source_type, p_source_event_id,
    today, greatest(coalesce((p_metadata->>'duration_seconds')::integer, 0), 0),
    p_amount, p_amount, 'server_event', coalesce(p_metadata, '{}'::jsonb)
  )
  on conflict (challenge_id, participant_id, source_event_id) do nothing;
  get diagnostics completion_inserted = row_count;
  if completion_inserted = 0 then return; end if;

  insert into public.efaa_challenge_points_transactions (
    challenge_id, participant_id, user_id, amount, reason, source_type,
    source_event_id, academy_day, metadata
  ) values (
    campaign.id, participant.id, p_user_id, p_amount,
    'Validated EfaTalk activity', p_source_type, p_source_event_id,
    today, coalesce(p_metadata, '{}'::jsonb)
  )
  on conflict (challenge_id, participant_id, source_event_id) do nothing;

  insert into public.efaa_challenge_daily_stats (
    challenge_id, participant_id, academy_day, learning_points,
    valid_completions, speaking_sessions, meaningful_activity
  ) values (
    campaign.id, participant.id, today, p_amount, 1,
    case when p_source_type = 'speaking' then 1 else 0 end,
    meaningful
  )
  on conflict (challenge_id, participant_id, academy_day) do update
  set learning_points = public.efaa_challenge_daily_stats.learning_points + excluded.learning_points,
      valid_completions = public.efaa_challenge_daily_stats.valid_completions + 1,
      speaking_sessions = public.efaa_challenge_daily_stats.speaking_sessions + excluded.speaking_sessions,
      meaningful_activity = public.efaa_challenge_daily_stats.meaningful_activity or excluded.meaningful_activity,
      updated_at = now();

  if meaningful then
    perform efaa_private.challenge_activate_referral(campaign.id, participant.id, now());
  end if;
end;
$$;

-- During the Challenge, enrolled participants have one identical lifetime and
-- competitive award. Outside it, the existing EfaTalk economy is unchanged.
create or replace function public.efaa_grant_class_points(p_user_id text, p_points integer)
returns jsonb
language plpgsql
security definer
set search_path = public, efaa_private
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
  campaign public.efaa_challenges%rowtype;
  participant public.efaa_challenge_participants%rowtype;
  source_type text := coalesce(nullif(current_setting('efaa.challenge_source', true), ''), 'learning');
  source_event_id text := coalesce(
    nullif(current_setting('efaa.challenge_event_id', true), ''),
    source_type || ':' || p_user_id || ':' || gen_random_uuid()::text
  );
  metadata jsonb := '{}'::jsonb;
begin
  if p_user_id is null or length(trim(p_user_id)) = 0 or p_user_id = 'efaa-admin' then
    return jsonb_build_object('points_gained', 0, 'diamonds_gained', 0,
      'daily_remaining', daily_cap, 'daily_cap', daily_cap);
  end if;

  select * into campaign from efaa_private.challenge_for_scoring();
  if campaign.id is not null then
    select * into participant
    from efaa_private.challenge_participant_owned(campaign.id, p_user_id);
    if participant.id is not null
      and exists (
        select 1 from public.efaa_challenge_activities a
        where a.challenge_id = campaign.id
          and a.activity_type = source_type
          and a.enabled = true
      )
    then
      perform pg_advisory_xact_lock(
        hashtextextended(campaign.id || ':' || participant.id::text, 0)
      );
      daily_cap := campaign.daily_points_cap;
      wanted := efaa_private.challenge_allowed_points(
        p_user_id, wanted, source_type, source_event_id
      );
    end if;
  end if;

  insert into public.efaa_user_gamification (user_id)
  values (p_user_id) on conflict (user_id) do nothing;
  select * into rec from public.efaa_user_gamification
  where user_id = p_user_id for update;

  insert into public.efaa_class_daily (user_id, day, granted)
  values (p_user_id, today, 0) on conflict (user_id, day) do nothing;
  select granted into already from public.efaa_class_daily
  where user_id = p_user_id and day = today for update;

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
    where user_id = p_user_id returning * into rec;

    update public.efaa_class_daily
    set granted = public.efaa_class_daily.granted + awarded
    where user_id = p_user_id and day = today;

    metadata := case when source_type = 'speaking'
      then jsonb_build_object(
        'duration_seconds',
        greatest(coalesce(nullif(current_setting('efaa.challenge_duration', true), '')::integer, 0), 0)
      )
      else '{}'::jsonb end;
    perform efaa_private.challenge_record_award(
      p_user_id, awarded, source_type, source_event_id, metadata
    );
  end if;

  perform set_config('efaa.challenge_source', '', true);
  perform set_config('efaa.challenge_event_id', '', true);
  perform set_config('efaa.challenge_duration', '', true);

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

revoke all on function public.efaa_grant_class_points(text, integer) from public, anon, authenticated;

create or replace function public.efaa_complete_formation(
  p_user_id text,
  p_phrase_ids text[],
  p_age integer default null,
  p_color text default null,
  p_display_name text default null,
  p_nationality text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, efaa_private
as $$
declare
  rec public.efaa_user_gamification%rowtype;
  today date := public.efaa_academy_today();
  already_today boolean := false;
begin
  if p_user_id is null or length(trim(p_user_id)) = 0 then raise exception 'user_id required'; end if;
  insert into public.efaa_user_gamification (user_id, display_name, nationality)
  values (p_user_id, coalesce(p_display_name, ''), coalesce(p_nationality, ''))
  on conflict (user_id) do nothing;
  select * into rec from public.efaa_user_gamification where user_id = p_user_id for update;
  already_today := rec.last_formation_at is not null
    and (timezone('Africa/Ndjamena', rec.last_formation_at))::date = today;
  update public.efaa_user_gamification
  set learned_phrases = (
        select coalesce(array_agg(distinct phrase), '{}'::text[])
        from unnest(coalesce(learned_phrases, '{}'::text[]) || coalesce(p_phrase_ids, '{}'::text[])) as phrase
      ),
      last_formation_at = now(),
      age = coalesce(p_age, age),
      favorite_color = coalesce(nullif(p_color, ''), favorite_color),
      display_name = coalesce(nullif(p_display_name, ''), display_name),
      nationality = coalesce(nullif(p_nationality, ''), nationality),
      updated_at = now()
  where user_id = p_user_id;
  if not already_today then
    perform set_config('efaa.challenge_source', 'formation', true);
    perform set_config('efaa.challenge_event_id', 'formation:' || p_user_id || ':' || today::text, true);
    perform public.efaa_grant_class_points(p_user_id, 50);
  end if;
  select * into rec from public.efaa_user_gamification where user_id = p_user_id;
  return to_jsonb(rec);
end;
$$;

grant execute on function public.efaa_complete_formation(text, text[], integer, text, text, text)
to anon, authenticated;

create or replace function public.efaa_award_match_points(
  p_user_id text,
  p_speech_seconds integer
)
returns jsonb
language plpgsql
security definer
set search_path = public, efaa_private
as $$
declare
  rec public.efaa_user_gamification%rowtype;
  today date := public.efaa_academy_today();
  speech integer := least(greatest(coalesce(p_speech_seconds, 0), 0), 1800);
  wanted integer;
  grant_row jsonb;
  daily_award jsonb;
  daily_points integer := 0;
  total_gained integer := 0;
  total_diamonds integer := 0;
  missed integer := 0;
  grace integer := 1;
  campaign public.efaa_challenges%rowtype;
  participant public.efaa_challenge_participants%rowtype;
begin
  if p_user_id is null or length(trim(p_user_id)) = 0 then raise exception 'user_id required'; end if;
  wanted := 10 + (speech / 10);
  if public.efaa_bonus_active() then wanted := least(wanted, 50); end if;

  select * into campaign from efaa_private.challenge_for_scoring();
  if campaign.id is not null then
    select * into participant
    from efaa_private.challenge_participant_owned(campaign.id, p_user_id);
    if participant.id is not null then
      wanted := case when speech >= 30 then 100 else 0 end;
    end if;
  end if;

  insert into public.efaa_user_gamification (user_id)
  values (p_user_id) on conflict (user_id) do nothing;
  select * into rec from public.efaa_user_gamification where user_id = p_user_id for update;
  if rec.last_activity_date is distinct from today then rec.matchs_tonight_count := 0; end if;
  missed := public.efaa_missed_days(rec.last_activity_date, today);
  grace := public.efaa_streak_grace(rec.current_streak);
  if rec.last_activity_date is null then rec.current_streak := 1;
  elsif rec.last_activity_date = today then null;
  elsif rec.last_activity_date = today - 1 then rec.current_streak := rec.current_streak + 1;
  elsif missed < grace then rec.current_streak := rec.current_streak + 1;
  else rec.current_streak := 1;
  end if;
  rec.matchs_tonight_count := rec.matchs_tonight_count + 1;
  rec.last_activity_date := today;
  update public.efaa_user_gamification
  set current_streak = rec.current_streak,
      last_activity_date = rec.last_activity_date,
      matchs_tonight_count = rec.matchs_tonight_count,
      updated_at = now()
  where user_id = p_user_id returning * into rec;

  perform set_config('efaa.challenge_source', 'speaking', true);
  perform set_config('efaa.challenge_event_id', 'speaking:' || p_user_id || ':' || today::text, true);
  perform set_config('efaa.challenge_duration', speech::text, true);
  grant_row := public.efaa_grant_class_points(p_user_id, wanted);
  total_gained := coalesce((grant_row->>'points_gained')::integer, 0);
  total_diamonds := coalesce((grant_row->>'diamonds_gained')::integer, 0);

  if participant.id is not null and speech >= 30 then
    select coalesce(d.points, 0) into daily_points
    from public.efaa_challenge_daily_challenges d
    where d.challenge_id = campaign.id
      and d.academy_day = today
      and d.published = true;
    if daily_points > 0 then
      perform set_config('efaa.challenge_source', 'daily_challenge', true);
      perform set_config(
        'efaa.challenge_event_id',
        'daily_challenge:' || p_user_id || ':' || today::text,
        true
      );
      daily_award := public.efaa_grant_class_points(p_user_id, daily_points);
      total_gained := total_gained + coalesce((daily_award->>'points_gained')::integer, 0);
      total_diamonds := total_diamonds + coalesce((daily_award->>'diamonds_gained')::integer, 0);
      if coalesce((daily_award->>'points_gained')::integer, 0) > 0 then
        grant_row := daily_award;
      end if;
    end if;
  end if;
  perform public.efaa_mark_present(p_user_id, 'match');

  return jsonb_build_object(
    'total_points', (grant_row->>'total_points')::integer,
    'diamonds_count', (grant_row->>'diamonds_count')::integer,
    'current_streak', rec.current_streak,
    'matchs_tonight_count', rec.matchs_tonight_count,
    'points_gained', total_gained,
    'diamonds_gained', total_diamonds,
    'daily_remaining', (grant_row->>'daily_remaining')::integer
  );
end;
$$;

grant execute on function public.efaa_award_match_points(text, integer) to anon, authenticated;

create or replace function public.efaa_flush_game_board_bonus(p_user_id text)
returns integer
language plpgsql
security definer
set search_path = public, efaa_private
as $$
declare
  rec public.efaa_user_game_state%rowtype;
  bonus boolean := public.efaa_bonus_active();
  watermark integer;
  pts integer;
  prev_blocks integer;
  next_blocks integer;
  awarded integer := 0;
  new_watermark integer;
  grant_row jsonb;
begin
  if p_user_id is null or length(trim(p_user_id)) = 0 or p_user_id = 'efaa-admin' then return 0; end if;
  select * into rec from public.efaa_user_game_state where user_id = p_user_id for update;
  if rec.user_id is null then return 0; end if;
  watermark := coalesce(rec.last_board_threshold, 0);
  pts := coalesce(rec.personal_points, 0);
  if bonus then
    prev_blocks := floor(watermark / 100.0)::integer;
    next_blocks := floor(pts / 100.0)::integer;
    awarded := greatest(next_blocks - prev_blocks, 0) * 15;
    new_watermark := next_blocks * 100;
  else
    prev_blocks := floor(watermark / 20.0)::integer;
    next_blocks := floor(pts / 20.0)::integer;
    awarded := greatest(next_blocks - prev_blocks, 0);
    new_watermark := next_blocks * 20;
  end if;
  if awarded <= 0 then return 0; end if;
  update public.efaa_user_game_state
  set last_board_threshold = new_watermark, updated_at = now()
  where user_id = p_user_id;
  perform set_config('efaa.challenge_source', 'card_progress', true);
  perform set_config(
    'efaa.challenge_event_id',
    'card_progress:' || p_user_id || ':' || new_watermark::text,
    true
  );
  grant_row := public.efaa_grant_class_points(p_user_id, awarded);
  return coalesce((grant_row->>'points_gained')::integer, 0);
end;
$$;

create or replace function public.efaa_award_game_win(p_user_id text)
returns jsonb
language plpgsql
security definer
set search_path = public, efaa_private
as $$
declare
  rec public.efaa_user_game_state%rowtype;
  board public.efaa_countries_leaderboard%rowtype;
  bonus integer := 0;
  campaign public.efaa_challenges%rowtype;
  participant public.efaa_challenge_participants%rowtype;
  stats public.efaa_challenge_daily_stats%rowtype;
  today date := public.efaa_academy_today();
  card_award jsonb;
begin
  if p_user_id is null or length(trim(p_user_id)) = 0 then raise exception 'user_id required'; end if;
  select * into rec from public.efaa_user_game_state where user_id = p_user_id for update;
  if rec.user_id is null then raise exception 'game state missing'; end if;
  update public.efaa_user_game_state
  set personal_points = personal_points + 2, updated_at = now()
  where user_id = p_user_id returning * into rec;
  insert into public.efaa_countries_leaderboard (country_code, country_name, flag_emoji, total_score)
  values (rec.country_code, rec.country_code, public.efaa_flag_emoji(rec.country_code), 20)
  on conflict (country_code) do update
  set total_score = efaa_countries_leaderboard.total_score + 20, updated_at = now()
  returning * into board;
  bonus := public.efaa_flush_game_board_bonus(p_user_id);

  select * into campaign from efaa_private.challenge_for_scoring();
  if campaign.id is not null then
    select * into participant
    from efaa_private.challenge_participant_owned(campaign.id, p_user_id);
    if participant.id is not null then
      insert into public.efaa_challenge_daily_stats (
        challenge_id, participant_id, academy_day, card_corrects
      ) values (campaign.id, participant.id, today, 1)
      on conflict (challenge_id, participant_id, academy_day) do update
      set card_corrects = public.efaa_challenge_daily_stats.card_corrects + 1,
          updated_at = now()
      returning * into stats;
      if stats.card_corrects >= 10 then
        perform set_config('efaa.challenge_source', 'card', true);
        perform set_config('efaa.challenge_event_id', 'card:' || p_user_id || ':' || today::text, true);
        card_award := public.efaa_grant_class_points(p_user_id, 30);
      end if;
    end if;
  end if;

  select * into rec from public.efaa_user_game_state where user_id = p_user_id;
  return jsonb_build_object(
    'personal_points', rec.personal_points,
    'lightning_bolts', rec.lightning_bolts,
    'country_code', rec.country_code,
    'country_score', board.total_score,
    'personal_gained', 2,
    'country_gained', 20,
    'board_bonus', bonus,
    'challenge_card_points', coalesce((card_award->>'points_gained')::integer, 0)
  );
end;
$$;

grant execute on function public.efaa_award_game_win(text) to anon, authenticated;

create or replace function public.efaa_award_warmup_points(
  p_user_id text,
  p_points integer
)
returns jsonb
language plpgsql
security definer
set search_path = public, efaa_private
as $$
declare
  mid public.efaa_intermediate_progress%rowtype;
  today date := public.efaa_academy_today();
  gained integer := least(greatest(coalesce(p_points, 0), 5), 10);
  daily_cap integer := 40;
  grant_row jsonb;
begin
  if p_user_id is null or length(trim(p_user_id)) = 0 then raise exception 'user_id required'; end if;
  insert into public.efaa_intermediate_progress (user_id)
  values (p_user_id) on conflict (user_id) do nothing;
  select * into mid from public.efaa_intermediate_progress
  where user_id = p_user_id for update;
  if mid.warmup_date is distinct from today then
    mid.warmup_points_today := 0;
    mid.warmup_date := today;
  end if;
  gained := greatest(least(gained, daily_cap - mid.warmup_points_today), 0);
  update public.efaa_intermediate_progress
  set warmup_points_today = mid.warmup_points_today + gained,
      warmup_date = today, updated_at = now()
  where user_id = p_user_id returning * into mid;
  perform set_config('efaa.challenge_source', 'learning', true);
  perform set_config(
    'efaa.challenge_event_id',
    'warmup:' || p_user_id || ':' || today::text || ':' || mid.warmup_points_today::text,
    true
  );
  grant_row := public.efaa_grant_class_points(p_user_id, gained);
  return grant_row || jsonb_build_object('warmup_points_today', mid.warmup_points_today);
end;
$$;

create or replace function public.efaa_award_quiz_answer(
  p_user_id text,
  p_correct boolean
)
returns jsonb
language plpgsql
security definer
set search_path = public, efaa_private
as $$
declare
  mid public.efaa_intermediate_progress%rowtype;
  gained integer := 0;
  grant_row jsonb;
begin
  if p_user_id is null or length(trim(p_user_id)) = 0 then raise exception 'user_id required'; end if;
  insert into public.efaa_intermediate_progress (user_id)
  values (p_user_id) on conflict (user_id) do nothing;
  select * into mid from public.efaa_intermediate_progress
  where user_id = p_user_id for update;
  if coalesce(p_correct, false) then
    if mid.quiz_points >= 30 then
      mid.quiz_bundle := mid.quiz_bundle + 1;
      if mid.quiz_bundle >= 3 then gained := 1; mid.quiz_bundle := 0; end if;
    else
      mid.quiz_corrects := mid.quiz_corrects + 1;
      gained := case mid.quiz_corrects when 1 then 5 when 2 then 3 when 3 then 2 else 1 end;
    end if;
    mid.quiz_points := mid.quiz_points + gained;
  end if;
  update public.efaa_intermediate_progress
  set quiz_points = mid.quiz_points, quiz_corrects = mid.quiz_corrects,
      quiz_bundle = mid.quiz_bundle, updated_at = now()
  where user_id = p_user_id returning * into mid;
  perform set_config('efaa.challenge_source', 'quiz', true);
  perform set_config(
    'efaa.challenge_event_id',
    'quiz:' || p_user_id || ':' || public.efaa_academy_today()::text || ':' ||
      mid.quiz_points::text || ':' || mid.quiz_bundle::text,
    true
  );
  grant_row := public.efaa_grant_class_points(p_user_id, gained);
  return grant_row || jsonb_build_object(
    'quiz_points', mid.quiz_points,
    'quiz_corrects', mid.quiz_corrects,
    'quiz_bundle', mid.quiz_bundle
  );
end;
$$;

grant execute on function public.efaa_award_warmup_points(text, integer) to anon, authenticated;
grant execute on function public.efaa_award_quiz_answer(text, boolean) to anon, authenticated;

create or replace function efaa_private.prevent_competition_history_mutation()
returns trigger
language plpgsql
set search_path = pg_catalog, efaa_private
as $$
begin
  raise exception 'Competition history is immutable';
end;
$$;

drop trigger if exists efaa_challenge_points_immutable
  on public.efaa_challenge_points_transactions;
create trigger efaa_challenge_points_immutable
before update or delete on public.efaa_challenge_points_transactions
for each row execute function efaa_private.prevent_competition_history_mutation();

drop trigger if exists efaa_challenge_admin_actions_immutable
  on public.efaa_challenge_admin_actions;
create trigger efaa_challenge_admin_actions_immutable
before update or delete on public.efaa_challenge_admin_actions
for each row execute function efaa_private.prevent_competition_history_mutation();

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
  dense_rank() over (
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

revoke all on public.efaa_challenge_leaderboard_v from public, anon, authenticated;

create or replace function public.efaa_challenge_admin_adjust(
  p_challenge_id text,
  p_participant_id uuid,
  p_amount integer,
  p_reason text,
  p_administrator_id text
)
returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  participant public.efaa_challenge_participants%rowtype;
  game public.efaa_user_gamification%rowtype;
  lifetime bigint;
  next_lifetime bigint;
  event_id text := 'admin:' || gen_random_uuid()::text;
begin
  if coalesce(p_amount, 0) = 0 then raise exception 'amount must be non-zero'; end if;
  if length(trim(coalesce(p_reason, ''))) < 4 then raise exception 'reason required'; end if;
  select * into participant
  from public.efaa_challenge_participants
  where id = p_participant_id and challenge_id = p_challenge_id
  for update;
  if participant.id is null then raise exception 'participant not found'; end if;

  insert into public.efaa_user_gamification (user_id)
  values (participant.user_id) on conflict (user_id) do nothing;
  select * into game from public.efaa_user_gamification
  where user_id = participant.user_id for update;
  lifetime := (game.diamonds_count::bigint * 10000) + game.total_points;
  next_lifetime := greatest(lifetime + p_amount, 0);

  insert into public.efaa_challenge_points_transactions (
    challenge_id, participant_id, user_id, amount, reason, source_type,
    source_event_id, academy_day, administrator_id, metadata
  ) values (
    p_challenge_id, participant.id, participant.user_id, p_amount, p_reason,
    'admin_adjustment', event_id, public.efaa_academy_today(), p_administrator_id,
    jsonb_build_object('lifetime_before', lifetime, 'lifetime_after', next_lifetime)
  );

  update public.efaa_user_gamification
  set diamonds_count = floor(next_lifetime / 10000)::integer,
      total_points = (next_lifetime % 10000)::integer,
      updated_at = now()
  where user_id = participant.user_id;

  insert into public.efaa_challenge_admin_actions (
    challenge_id, administrator_id, action, target_type, target_id,
    reason, before_data, after_data
  ) values (
    p_challenge_id, p_administrator_id, 'points_adjustment', 'participant',
    participant.id::text, p_reason,
    jsonb_build_object('challenge_points_delta', 0, 'lifetime_points', lifetime),
    jsonb_build_object('challenge_points_delta', p_amount, 'lifetime_points', next_lifetime)
  );
  return jsonb_build_object('ok', true, 'event_id', event_id, 'lifetime_points', next_lifetime);
end;
$$;

revoke all on function public.efaa_challenge_admin_adjust(text, uuid, integer, text, text)
from public, anon, authenticated;
grant execute on function public.efaa_challenge_admin_adjust(text, uuid, integer, text, text)
to service_role;

create or replace function public.efaa_challenge_review_referral(
  p_challenge_id text,
  p_referral_id uuid,
  p_status text,
  p_reason text,
  p_administrator_id text
)
returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  referral public.efaa_challenge_referrals%rowtype;
  inviter public.efaa_challenge_participants%rowtype;
  campaign public.efaa_challenges%rowtype;
  game public.efaa_user_gamification%rowtype;
  original_tx public.efaa_challenge_points_transactions%rowtype;
  award integer := 0;
  net_referral_points integer := 0;
  lifetime bigint := 0;
  next_lifetime bigint := 0;
begin
  if p_status not in ('valid', 'invalid') then raise exception 'invalid referral status'; end if;
  if length(trim(coalesce(p_reason, ''))) < 4 then raise exception 'reason required'; end if;

  select * into referral
  from public.efaa_challenge_referrals
  where id = p_referral_id and challenge_id = p_challenge_id
  for update;
  if referral.id is null then raise exception 'referral not found'; end if;

  select * into campaign from public.efaa_challenges where id = p_challenge_id;
  select * into inviter
  from public.efaa_challenge_participants
  where id = referral.inviter_participant_id
  for update;
  if inviter.id is null then raise exception 'inviter not found'; end if;

  insert into public.efaa_user_gamification (user_id)
  values (inviter.user_id) on conflict (user_id) do nothing;
  select * into game from public.efaa_user_gamification
  where user_id = inviter.user_id for update;
  lifetime := (game.diamonds_count::bigint * 10000) + game.total_points;

  select * into original_tx
  from public.efaa_challenge_points_transactions t
  where t.challenge_id = p_challenge_id
    and t.participant_id = inviter.id
    and t.source_type = 'referral'
    and t.amount > 0
    and t.metadata->>'referral_id' = referral.id::text
  order by t.created_at
  limit 1;

  if p_status = 'valid' then
    if referral.first_activity_at is null and referral.activated_at is null then
      raise exception 'referral has no meaningful activity';
    end if;
    if original_tx.id is null then
      select coalesce(sum(t.amount), 0)::integer into net_referral_points
      from public.efaa_challenge_points_transactions t
      where t.challenge_id = p_challenge_id
        and t.participant_id = inviter.id
        and t.source_type = 'referral'
        and t.counts_for_ranking;
      award := greatest(
        least(campaign.referral_points, campaign.referral_points_cap - net_referral_points),
        0
      );
      if award > 0 then
        next_lifetime := lifetime + award;
        update public.efaa_user_gamification
        set diamonds_count = floor(next_lifetime / 10000)::integer,
            total_points = (next_lifetime % 10000)::integer,
            updated_at = now()
        where user_id = inviter.user_id;

        insert into public.efaa_challenge_points_transactions (
          challenge_id, participant_id, user_id, amount, reason, source_type,
          source_event_id, academy_day, administrator_id, metadata
        ) values (
          p_challenge_id, inviter.id, inviter.user_id, award,
          'Referral approved after manual review', 'referral',
          'referral:' || referral.id::text, public.efaa_academy_today(),
          p_administrator_id, jsonb_build_object('referral_id', referral.id)
        );
        insert into public.efaa_challenge_daily_stats (
          challenge_id, participant_id, academy_day, referral_points
        ) values (
          p_challenge_id, inviter.id, public.efaa_academy_today(), award
        )
        on conflict (challenge_id, participant_id, academy_day) do update
        set referral_points = public.efaa_challenge_daily_stats.referral_points + excluded.referral_points,
            updated_at = now();
      end if;
    end if;
    update public.efaa_challenge_referrals
    set status = 'valid', validated_at = coalesce(validated_at, now()),
        invalidated_at = null, updated_at = now()
    where id = referral.id;
  else
    if original_tx.id is not null and not exists (
      select 1 from public.efaa_challenge_points_transactions t
      where t.reverses_transaction_id = original_tx.id
    ) then
      award := original_tx.amount;
      next_lifetime := greatest(lifetime - award, 0);
      update public.efaa_user_gamification
      set diamonds_count = floor(next_lifetime / 10000)::integer,
          total_points = (next_lifetime % 10000)::integer,
          updated_at = now()
      where user_id = inviter.user_id;

      insert into public.efaa_challenge_points_transactions (
        challenge_id, participant_id, user_id, amount, reason, source_type,
        source_event_id, academy_day, reverses_transaction_id,
        administrator_id, metadata
      ) values (
        p_challenge_id, inviter.id, inviter.user_id, -award,
        'Fraudulent referral reversal', 'referral',
        'referral-reversal:' || referral.id::text, public.efaa_academy_today(),
        original_tx.id, p_administrator_id,
        jsonb_build_object('referral_id', referral.id, 'reason', p_reason)
      );
      update public.efaa_challenge_daily_stats
      set referral_points = greatest(referral_points - award, 0), updated_at = now()
      where challenge_id = p_challenge_id
        and participant_id = inviter.id
        and academy_day = original_tx.academy_day;
    end if;
    update public.efaa_challenge_referrals
    set status = 'invalid', invalidated_at = coalesce(invalidated_at, now()),
        updated_at = now()
    where id = referral.id;
  end if;

  insert into public.efaa_challenge_admin_actions (
    challenge_id, administrator_id, action, target_type, target_id,
    reason, before_data, after_data
  ) values (
    p_challenge_id, p_administrator_id, 'referral_review', 'referral',
    referral.id::text, p_reason, to_jsonb(referral),
    jsonb_build_object('status', p_status, 'points_delta',
      case when p_status = 'invalid' then -award else award end)
  );
  return jsonb_build_object('ok', true, 'status', p_status, 'points_delta',
    case when p_status = 'invalid' then -award else award end);
end;
$$;

revoke all on function public.efaa_challenge_review_referral(text, uuid, text, text, text)
from public, anon, authenticated;
grant execute on function public.efaa_challenge_review_referral(text, uuid, text, text, text)
to service_role;

insert into public.efaa_challenges (
  id, name, tagline, starts_at, ends_at, verification_at, announcement_at,
  status, required_referrals, referral_points, referral_points_cap, daily_points_cap
) values (
  'english-2026',
  'EfaTalk English Challenge 2026',
  '15 DAYS. ONE MISSION. SPEAK ENGLISH.',
  timestamptz '2026-10-15 00:00:00+01',
  timestamptz '2026-10-29 23:59:59+01',
  timestamptz '2026-10-30 09:00:00+01',
  timestamptz '2026-10-31 18:00:00+01',
  'scheduled', 2, 30, 300, 230
)
on conflict (id) do update set
  required_referrals = 2,
  updated_at = now();

insert into public.efaa_challenge_activities (
  challenge_id, activity_type, label, points, daily_points_cap,
  min_duration_seconds, max_completions_per_day, meaningful, validation_method
) values
  ('english-2026', 'formation', 'Five daily phrases', 50, 50, 0, 1, true, 'server_event'),
  ('english-2026', 'speaking', 'Live speaking practice', 100, 100, 30, 1, true, 'room_completion'),
  ('english-2026', 'card', 'Card practice', 30, 30, 0, 1, true, 'ten_correct_cards'),
  ('english-2026', 'quiz', 'English quiz', 20, 20, 0, 1, true, 'server_event'),
  ('english-2026', 'daily_challenge', 'Daily English challenge', 30, 30, 0, 1, true, 'server_review'),
  ('english-2026', 'learning', 'Other verified learning', 10, 30, 0, 3, true, 'server_event')
on conflict (challenge_id, activity_type) do update set
  label = excluded.label,
  points = excluded.points,
  daily_points_cap = excluded.daily_points_cap,
  min_duration_seconds = excluded.min_duration_seconds,
  max_completions_per_day = excluded.max_completions_per_day,
  meaningful = excluded.meaningful,
  validation_method = excluded.validation_method,
  updated_at = now();

insert into public.efaa_challenge_daily_challenges (
  challenge_id, day_number, academy_day,
  title_fr, title_en, title_ar, prompt_fr, prompt_en, prompt_ar
) values
  ('english-2026', 1, '2026-10-15', 'Présente-toi', 'Introduce yourself', 'عرّف بنفسك', 'Présente-toi en anglais en cinq phrases.', 'Introduce yourself in five English sentences.', 'عرّف بنفسك بالإنجليزية في خمس جمل.'),
  ('english-2026', 2, '2026-10-16', 'Ma famille', 'My family', 'عائلتي', 'Parle de ta famille.', 'Talk about your family.', 'تحدث عن عائلتك.'),
  ('english-2026', 3, '2026-10-17', 'Ma ville', 'My city', 'مدينتي', 'Décris ta ville.', 'Describe your city.', 'صف مدينتك.'),
  ('english-2026', 4, '2026-10-18', 'Ma routine', 'My routine', 'روتيني', 'Décris ta journée habituelle.', 'Describe your daily routine.', 'صف روتينك اليومي.'),
  ('english-2026', 5, '2026-10-19', 'Mon métier de rêve', 'My dream job', 'وظيفة أحلامي', 'Parle du métier que tu rêves de faire.', 'Talk about your dream job.', 'تحدث عن وظيفة أحلامك.'),
  ('english-2026', 6, '2026-10-20', 'Cinq réponses', 'Five answers', 'خمس إجابات', 'Réponds à cinq questions en anglais.', 'Answer five questions in English.', 'أجب عن خمسة أسئلة بالإنجليزية.'),
  ('english-2026', 7, '2026-10-21', 'Bataille de vocabulaire', 'Vocabulary battle', 'معركة المفردات', 'Utilise dix nouveaux mots.', 'Use ten new words.', 'استخدم عشر كلمات جديدة.'),
  ('english-2026', 8, '2026-10-22', 'Mon meilleur souvenir', 'My best memory', 'أفضل ذكرى', 'Raconte un bon souvenir.', 'Share a good memory.', 'احكِ ذكرى جميلة.'),
  ('english-2026', 9, '2026-10-23', 'Un problème, une solution', 'A problem, a solution', 'مشكلة وحل', 'Explique un problème et propose une solution.', 'Explain a problem and propose a solution.', 'اشرح مشكلة واقترح حلاً.'),
  ('english-2026', 10, '2026-10-24', 'Mon objectif', 'My goal', 'هدفي', 'Explique ton objectif pour cette année.', 'Explain your goal for this year.', 'اشرح هدفك لهذه السنة.'),
  ('english-2026', 11, '2026-10-25', 'Je donne mon avis', 'My opinion', 'رأيي', 'Donne ton avis sur un sujet simple.', 'Give your opinion on a simple topic.', 'أعط رأيك في موضوع بسيط.'),
  ('english-2026', 12, '2026-10-26', 'Une histoire courte', 'A short story', 'قصة قصيرة', 'Raconte une histoire en une minute.', 'Tell a one-minute story.', 'احكِ قصة في دقيقة واحدة.'),
  ('english-2026', 13, '2026-10-27', 'Je convaincs', 'Convince me', 'أقنعني', 'Essaie de convaincre ton partenaire.', 'Try to convince your partner.', 'حاول إقناع شريكك.'),
  ('english-2026', 14, '2026-10-28', 'Ce que j’ai appris', 'What I learned', 'ما تعلمته', 'Explique ce que tu as appris pendant le Challenge.', 'Explain what you learned during the Challenge.', 'اشرح ما تعلمته خلال التحدي.'),
  ('english-2026', 15, '2026-10-29', 'Mon message final', 'My final message', 'رسالتي الأخيرة', 'Donne ton message final à la communauté EfaTalk.', 'Give your final message to the EfaTalk community.', 'قدم رسالتك الأخيرة لمجتمع EfaTalk.')
on conflict (challenge_id, day_number) do update set
  academy_day = excluded.academy_day,
  title_fr = excluded.title_fr,
  title_en = excluded.title_en,
  title_ar = excluded.title_ar,
  prompt_fr = excluded.prompt_fr,
  prompt_en = excluded.prompt_en,
  prompt_ar = excluded.prompt_ar;
