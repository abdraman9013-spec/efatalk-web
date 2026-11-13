# EfaTalk English Challenge 2026 — implementation plan

## Product rule

- Lifetime EfaTalk points, ranks, diamonds and streaks remain unchanged.
- Every point earned during the campaign is still a normal lifetime EfaTalk point.
- The Challenge leaderboard is a dated view of the auditable points ledger from
  `2026-10-15 00:00:00` through `2026-10-29 23:59:59`,
  `Africa/Ndjamena`.
- All participants therefore start the prize race at zero without losing their
  prior EfaTalk progress.
- Prize eligibility requires: accepted rules, completed onboarding, TikTok and
  Facebook self-declarations (never falsely marked API-verified), and two
  activated referrals.
- A referral activates only after the referred account is verified, onboarded,
  and completes a meaningful scored learning activity.

## Architecture

- Keep Next.js App Router, the existing Supabase project, Google authentication,
  practice profiles, live rooms, formation, games and lifetime leaderboard.
- Add an isolated `efaa_challenge_*` schema family in `public`, with RLS enabled
  and no direct public writes.
- Use server routes for identity-bound Challenge joins and private participant
  data. Resolve `auth.uid()` to `efaa_practice_students.auth_user_id`; never
  trust a `user_id` sent by the browser.
- Keep public reads limited to a privacy-safe leaderboard RPC.
- Mirror awarded class points into an immutable Challenge ledger only when:
  the campaign is active, the participant exists, the authenticated identity
  owns the student profile, and the event passes caps/idempotency.
- Store reversals as negative transactions. Never edit a score silently.

## Database

- `efaa_challenges`: dates, status, timezone, prizes and configurable caps.
- `efaa_challenge_participants`: acceptance, social declarations, referral
  token, eligibility, highest rank and public-display consent.
- `efaa_challenge_referrals`: inviter/invitee state, activation, risk score and
  fraud status.
- `efaa_challenge_activities`: configurable point/cap rules.
- `efaa_challenge_activity_completions`: validated completion events and
  idempotency keys.
- `efaa_challenge_points_transactions`: immutable signed ledger.
- `efaa_challenge_daily_stats`: active day, daily cap and streak facts.
- `efaa_challenge_matches` and `efaa_challenge_match_participants`: auditable
  speaking and competitive sessions.
- `efaa_challenge_fraud_flags`, `efaa_challenge_disqualifications`,
  `efaa_challenge_admin_actions`: review and immutable administration history.
- `efaa_challenge_daily_challenges`: the 15 progressive daily prompts.
- `efaa_challenge_leaderboard_snapshots` and
  `efaa_challenge_winner_verifications`: frozen final evidence.

## APIs and services

- `GET /api/challenge`: public campaign summary and privacy-safe leaderboard.
- `GET /api/challenge/me`: authenticated participant progress.
- `POST /api/challenge/join`: accept rules/social declarations and create the
  cryptographically random referral token.
- `POST /api/challenge/referral`: bind a captured referral once.
- `POST /api/challenge/activity`: identity-bound validated completion for
  activities that cannot be proven by an existing server event.
- `POST /api/admin/session`: server-verified admin session.
- `/api/admin/challenge/*`: settings, fraud review, adjustments, freeze and
  export. Every mutation writes `efaa_challenge_admin_actions`.

## Participant pages

- `/challenge`: one mobile-first dashboard: prize, countdown, eligibility,
  own progress, today's action and top leaderboard.
- `/challenge/rules`: dates, scoring, two-friend requirement, social
  self-declaration, anti-cheat, tie-break and prize verification.
- `/challenge/leaderboard`: live Challenge window, own rank and next target.
- `/challenge/winners`: pending verification until the final board is locked.
- `/challenge/invite`: referral link and Pending / Registered / Activated /
  Valid states.
- Homepage: one explicit `Participer au Challenge` CTA.

## Scoring and anti-abuse

- Central daily competitive cap: configurable; initial target 230 points.
- Five daily formation phrases: once per academy day.
- Speaking: requires a completed real room/match event and minimum duration;
  one full competitive award per academy day.
- Cards/quiz: capped and idempotent; repeated grinding remains practice-only.
- Referral: 30 points after activation, capped independently. Two activated
  friends determine prize eligibility, not access to practice.
- Signals create explainable risk flags; one shared IP never auto-bans.
- Tie-break: verified learning points, active days, speaking sessions, then
  earliest final-score timestamp.

## Admin

- Replace the long page with top-level tabs:
  `Vue d'ensemble`, `Challenge`, `Élèves`, `Contenu`, `Accès`, `Sécurité`.
- Challenge tab contains metrics, settings, leaderboard, referral review,
  fraud queue, point adjustments and finalization.
- Existing room/lesson/payment tools remain available under their categories.

## Verification and deployment

1. Apply migration and verify every new table has RLS.
2. Exercise join, duplicate join, referral, self-referral, activation,
   idempotency, daily cap, reversal, ranking and tie-break cases.
3. Build and type-check Next.js.
4. Test the complete mobile flow with two real test accounts.
5. Deploy web, verify production routes, then enable campaign status.
6. On October 30: freeze, recalculate, review flags, lock and generate the
   winner verification records before publishing.
