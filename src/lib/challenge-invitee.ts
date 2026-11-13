import { createClient } from "@supabase/supabase-js";

/** Credit the inviter. Runs as the invited student, so a missing server key cannot drop the points. */
export async function awardInviteeReferrals(accessToken: string) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key || !accessToken) return { ok: false, awarded: 0 };
  const db = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
  });
  const { data, error } = await db.rpc("efaa_challenge_award_my_referral");
  if (error) return { ok: false, awarded: 0 };
  const payload = data as { awards?: unknown } | null;
  const awards = Array.isArray(payload?.awards) ? payload.awards : [];
  return { ok: true, awarded: awards.length };
}
