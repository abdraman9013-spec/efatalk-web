import { randomBytes } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { awardInviteeReferrals } from "@/lib/challenge-invitee";
import {
  challengeDb,
  challengeIdentity,
  currentChallenge,
  requestSignals,
} from "@/lib/challenge-server";

export const dynamic = "force-dynamic";

function token() {
  return randomBytes(9).toString("base64url").toUpperCase();
}

export async function POST(request: NextRequest) {
  try {
    const identity = await challengeIdentity(request);
    if (!identity) {
      return NextResponse.json({ error: "verified-account-required" }, { status: 401 });
    }
    const body = (await request.json().catch(() => ({}))) as {
      acceptRules?: boolean;
      tiktok?: boolean;
      facebook?: boolean;
      referralToken?: string;
    };
    if (!body.acceptRules) {
      return NextResponse.json({ error: "rules-required" }, { status: 400 });
    }
    if (!body.tiktok || !body.facebook) {
      return NextResponse.json({ error: "social-declaration-required" }, { status: 400 });
    }

    const db = challengeDb();
    const challenge = await currentChallenge(db);
    if (challenge.status === "draft" || challenge.status === "final") {
      return NextResponse.json({ error: "registration-closed" }, { status: 409 });
    }

    const userId = identity.student.id;
    let { data: participant } = await db
      .from("efaa_challenge_participants")
      .select("*")
      .eq("challenge_id", challenge.id)
      .eq("auth_user_id", identity.authUser.id)
      .maybeSingle();

    if (!participant) {
      let insertError: { code?: string; message?: string } | null = null;
      for (let attempt = 0; attempt < 3 && !participant; attempt += 1) {
        const result = await db
          .from("efaa_challenge_participants")
          .insert({
            challenge_id: challenge.id,
            user_id: userId,
            auth_user_id: identity.authUser.id,
            rules_version: challenge.rules_version,
            rules_accepted_at: new Date().toISOString(),
            tiktok_declared: Boolean(body.tiktok),
            facebook_declared: Boolean(body.facebook),
            social_declaration_at:
              body.tiktok || body.facebook ? new Date().toISOString() : null,
            onboarding_completed: true,
            referral_token: token(),
          })
          .select("*")
          .single();
        participant = result.data;
        insertError = result.error;
        if (result.error?.code !== "23505") break;
      }
      if (!participant) throw insertError || new Error("join-failed");
    } else {
      const { data, error } = await db
        .from("efaa_challenge_participants")
        .update({
          rules_version: challenge.rules_version,
          rules_accepted_at: participant.rules_accepted_at || new Date().toISOString(),
          tiktok_declared: participant.tiktok_declared || Boolean(body.tiktok),
          facebook_declared: participant.facebook_declared || Boolean(body.facebook),
          social_declaration_at:
            participant.social_declaration_at ||
            (body.tiktok || body.facebook ? new Date().toISOString() : null),
          updated_at: new Date().toISOString(),
        })
        .eq("id", participant.id)
        .select("*")
        .single();
      if (error) throw error;
      participant = data;
    }

    const referralToken = String(body.referralToken || "")
      .trim()
      .toUpperCase()
      .slice(0, 64);
    if (referralToken && referralToken !== participant.referral_token) {
      const { data: inviter } = await db
        .from("efaa_challenge_participants")
        .select("id,user_id,referral_token")
        .eq("challenge_id", challenge.id)
        .eq("referral_token", referralToken)
        .eq("status", "active")
        .maybeSingle();

      if (inviter && inviter.user_id !== userId) {
        const { data: existing } = await db
          .from("efaa_challenge_referrals")
          .select("id")
          .eq("challenge_id", challenge.id)
          .eq("invited_auth_user_id", identity.authUser.id)
          .maybeSingle();

        if (!existing) {
          const signals = requestSignals(request);
          let riskScore = 0;
          const reasons: string[] = [];
          if (signals.deviceHash) {
            const { count } = await db
              .from("efaa_challenge_referrals")
              .select("id", { count: "exact", head: true })
              .eq("challenge_id", challenge.id)
              .eq("inviter_participant_id", inviter.id)
              .eq("device_hash", signals.deviceHash);
            if ((count || 0) >= 2) {
              riskScore += 25;
              reasons.push("repeated_device_signal");
            }
          }

          const { data: referral, error } = await db
            .from("efaa_challenge_referrals")
            .insert({
              challenge_id: challenge.id,
              inviter_participant_id: inviter.id,
              invited_participant_id: participant.id,
              invited_auth_user_id: identity.authUser.id,
              invited_user_id: userId,
              referral_token: referralToken,
              status: riskScore >= 70 ? "held" : "registered",
              registered_at: new Date().toISOString(),
              onboarded_at: new Date().toISOString(),
              risk_score: riskScore,
              risk_reasons: reasons,
              ip_hash: signals.ipHash,
              device_hash: signals.deviceHash,
            })
            .select("id")
            .maybeSingle();
          if (riskScore > 0 && referral && !error) {
            await db.from("efaa_challenge_fraud_flags").insert({
              challenge_id: challenge.id,
              participant_id: participant.id,
              referral_id: referral.id,
              severity: riskScore >= 70 ? "high" : "medium",
              signal_type: "referral_device_pattern",
              reason: "Several referrals share a device signal; manual review required.",
              evidence: { reasons },
            });
          }
        }
      } else if (inviter?.user_id === userId) {
        await db.from("efaa_challenge_fraud_flags").insert({
          challenge_id: challenge.id,
          participant_id: participant.id,
          severity: "high",
          signal_type: "self_referral",
          reason: "Participant attempted to use their own referral token.",
        });
      }
    }

    const header = request.headers.get("authorization") || "";
    const accessToken = header.startsWith("Bearer ") ? header.slice(7).trim() : "";
    await awardInviteeReferrals(accessToken);

    return NextResponse.json({
      ok: true,
      participantId: participant.id,
      referralToken: participant.referral_token,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "join-failed" },
      { status: 500 },
    );
  }
}
