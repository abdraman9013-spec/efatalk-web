import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { verifyAdminSession } from "@/lib/challenge-admin-server";
import { rankChallengeBoard } from "@/lib/challenge-logic";
import { academyDate, challengeDb, currentChallenge } from "@/lib/challenge-server";

export const dynamic = "force-dynamic";

function denied() {
  return NextResponse.json({ error: "admin-required" }, { status: 401 });
}

export async function GET(request: NextRequest) {
  if (!verifyAdminSession(request)) return denied();
  try {
    const db = challengeDb();
    const challenge = await currentChallenge(db);
    const [participants, board, referrals, flags, completions, winners] = await Promise.all([
      db.from("efaa_challenge_participants").select("*").eq("challenge_id", challenge.id),
      db
        .from("efaa_challenge_leaderboard_v")
        .select("*")
        .eq("challenge_id", challenge.id)
        .order("rank")
        .limit(100),
      db
        .from("efaa_challenge_referrals")
        .select("*")
        .eq("challenge_id", challenge.id)
        .order("created_at", { ascending: false }),
      db
        .from("efaa_challenge_fraud_flags")
        .select("*")
        .eq("challenge_id", challenge.id)
        .order("created_at", { ascending: false }),
      db
        .from("efaa_challenge_activity_completions")
        .select("user_id,activity_type,academy_day,awarded_points,validation_status")
        .eq("challenge_id", challenge.id),
      db
        .from("efaa_challenge_winner_verifications")
        .select("*")
        .eq("challenge_id", challenge.id)
        .order("proposed_rank"),
    ]);
    const participantRows = participants.data || [];
    const boardRows = rankChallengeBoard(
      (board.data || []) as Array<Record<string, unknown>>,
    );
    const nameById = new Map(
      boardRows.map((row) => [String(row.user_id), String(row.display_name || "")]),
    );
    const userIds = participantRows.map((row) => String(row.user_id)).filter(Boolean);
    if (userIds.length) {
      const [{ data: practice }, { data: official }] = await Promise.all([
        db.from("efaa_practice_students").select("id,first_name,last_name,email").in("id", userIds),
        db.from("efaa_active_students").select("id,first_name,last_name,email").in("id", userIds),
      ]);
      [...(practice || []), ...(official || [])].forEach((row) => {
        const name = `${row.last_name || ""} ${row.first_name || ""}`.replace(/\s+/g, " ").trim();
        if (name) nameById.set(String(row.id), name);
      });
    }
    const referralRows = referrals.data || [];
    const flagRows = flags.data || [];
    const activityRows = completions.data || [];
    const validReferralCounts = new Map<string, number>();
    referralRows
      .filter((row) => row.status === "valid")
      .forEach((row) => {
        validReferralCounts.set(
          row.inviter_participant_id,
          (validReferralCounts.get(row.inviter_participant_id) || 0) + 1,
        );
      });
    const blockedParticipants = new Set(
      flagRows
        .filter(
          (row) =>
            ["high", "critical"].includes(row.severity) &&
            ["open", "reviewing", "confirmed"].includes(row.status),
        )
        .map((row) => row.participant_id)
        .filter(Boolean),
    );

    return NextResponse.json({
      challenge,
      metrics: {
        participants: participantRows.length,
        eligible: participantRows.filter(
          (row) =>
            row.tiktok_declared &&
            row.facebook_declared &&
            row.rules_accepted_at &&
            !blockedParticipants.has(row.id) &&
            row.status === "active",
        ).length,
        activeToday: new Set(
          activityRows
            .filter((row) => row.academy_day === academyDate())
            .map((row) => row.user_id),
        ).size,
        validReferrals: referralRows.filter((row) => row.status === "valid").length,
        suspiciousReferrals: referralRows.filter((row) => row.status === "held").length,
        openFlags: flagRows.filter((row) => row.status === "open" || row.status === "reviewing").length,
        awardedPoints: activityRows.reduce((sum, row) => sum + Number(row.awarded_points || 0), 0),
      },
      leaderboard: boardRows,
      todayBoard: boardRows.slice(0, 3).map((row) => {
        const userId = String(row.user_id || "");
        return {
          rank: Number(row.rank) || 0,
          participant_id: row.participant_id,
          user_id: userId,
          display_name: nameById.get(userId) || String(row.display_name || "Élève"),
          points: Number(row.points) || 0,
          speaking_sessions: Number(row.speaking_sessions) || 0,
        };
      }),
      referrals: referralRows,
      flags: flagRows,
      participants: participantRows.map((row) => ({
        ...row,
        display_name: nameById.get(String(row.user_id)) || String(row.user_id),
      })),
      winners: winners.data || [],
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "admin-challenge-failed" },
      { status: 500 },
    );
  }
}

export async function PATCH(request: NextRequest) {
  if (!verifyAdminSession(request)) return denied();
  try {
    const db = challengeDb();
    const challenge = await currentChallenge(db);
    const body = (await request.json()) as {
      action: string;
      reason?: string;
      status?: string;
      participantId?: string;
      referralId?: string;
      flagId?: string;
      amount?: number;
      settings?: Record<string, unknown>;
    };
    const reason = String(body.reason || "").trim();
    const adminId = "admin-0680";

    if (body.action === "settings") {
      const allowed = [
        "starts_at",
        "ends_at",
        "verification_at",
        "announcement_at",
        "daily_points_cap",
        "referral_points",
        "referral_points_cap",
        "required_referrals",
      ];
      const patch = Object.fromEntries(
        Object.entries(body.settings || {}).filter(([key]) => allowed.includes(key)),
      );
      const { data, error } = await db
        .from("efaa_challenges")
        .update({ ...patch, updated_at: new Date().toISOString() })
        .eq("id", challenge.id)
        .select("*")
        .single();
      if (error) throw error;
      await db.from("efaa_challenge_admin_actions").insert({
        challenge_id: challenge.id,
        administrator_id: adminId,
        action: "settings_update",
        target_type: "challenge",
        target_id: challenge.id,
        reason: reason || "Configuration update",
        before_data: challenge,
        after_data: data,
      });
      return NextResponse.json({ ok: true, challenge: data });
    }

    if (body.action === "status") {
      const status = String(body.status || "");
      if (!["scheduled", "paused", "verification", "final"].includes(status)) {
        return NextResponse.json({ error: "invalid-status" }, { status: 400 });
      }
      const { error } = await db
        .from("efaa_challenges")
        .update({ status, updated_at: new Date().toISOString() })
        .eq("id", challenge.id);
      if (error) throw error;
      await db.from("efaa_challenge_admin_actions").insert({
        challenge_id: challenge.id,
        administrator_id: adminId,
        action: "status_change",
        target_type: "challenge",
        target_id: challenge.id,
        reason: reason || `Status changed to ${status}`,
        before_data: { status: challenge.status },
        after_data: { status },
      });
      return NextResponse.json({ ok: true });
    }

    if (body.action === "review_referral" && body.referralId) {
      const nextStatus = body.status === "valid" ? "valid" : "invalid";
      const { data, error } = await db.rpc("efaa_challenge_review_referral", {
        p_challenge_id: challenge.id,
        p_referral_id: body.referralId,
        p_status: nextStatus,
        p_reason: reason || `Referral marked ${nextStatus}`,
        p_administrator_id: adminId,
      });
      if (error) throw error;
      return NextResponse.json(data);
    }

    if (body.action === "review_flag" && body.flagId) {
      const nextStatus = body.status === "cleared" ? "cleared" : "confirmed";
      const { error } = await db
        .from("efaa_challenge_fraud_flags")
        .update({
          status: nextStatus,
          reviewed_by: adminId,
          reviewed_at: new Date().toISOString(),
        })
        .eq("id", body.flagId);
      if (error) throw error;
      await db.from("efaa_challenge_admin_actions").insert({
        challenge_id: challenge.id,
        administrator_id: adminId,
        action: "fraud_flag_review",
        target_type: "fraud_flag",
        target_id: body.flagId,
        reason: reason || `Flag marked ${nextStatus}`,
        after_data: { status: nextStatus },
      });
      return NextResponse.json({ ok: true });
    }

    if (body.action === "remove" && body.participantId) {
      if (reason.length < 4) {
        return NextResponse.json({ error: "reason-required" }, { status: 400 });
      }
      await db
        .from("efaa_challenge_participants")
        .update({ status: "withdrawn", updated_at: new Date().toISOString() })
        .eq("id", body.participantId)
        .eq("challenge_id", challenge.id);
      await db.from("efaa_challenge_admin_actions").insert({
        challenge_id: challenge.id,
        administrator_id: adminId,
        action: "remove_participant",
        target_type: "participant",
        target_id: body.participantId,
        reason,
      });
      return NextResponse.json({ ok: true });
    }

    if (body.action === "disqualify" && body.participantId) {
      if (reason.length < 4) {
        return NextResponse.json({ error: "reason-required" }, { status: 400 });
      }
      await db
        .from("efaa_challenge_participants")
        .update({ status: "disqualified", updated_at: new Date().toISOString() })
        .eq("id", body.participantId);
      await db.from("efaa_challenge_disqualifications").insert({
        challenge_id: challenge.id,
        participant_id: body.participantId,
        reason,
        administrator_id: adminId,
      });
      await db.from("efaa_challenge_admin_actions").insert({
        challenge_id: challenge.id,
        administrator_id: adminId,
        action: "disqualify",
        target_type: "participant",
        target_id: body.participantId,
        reason,
      });
      return NextResponse.json({ ok: true });
    }

    if (body.action === "restore" && body.participantId) {
      if (reason.length < 4) {
        return NextResponse.json({ error: "reason-required" }, { status: 400 });
      }
      await db
        .from("efaa_challenge_participants")
        .update({ status: "active", updated_at: new Date().toISOString() })
        .eq("id", body.participantId)
        .eq("challenge_id", challenge.id);
      await db
        .from("efaa_challenge_disqualifications")
        .update({
          restored_at: new Date().toISOString(),
          restored_by: adminId,
          restore_reason: reason,
        })
        .eq("challenge_id", challenge.id)
        .eq("participant_id", body.participantId)
        .is("restored_at", null);
      await db.from("efaa_challenge_admin_actions").insert({
        challenge_id: challenge.id,
        administrator_id: adminId,
        action: "restore_participant",
        target_type: "participant",
        target_id: body.participantId,
        reason,
      });
      return NextResponse.json({ ok: true });
    }

    if (body.action === "adjust_points" && body.participantId) {
      const amount = Number(body.amount) || 0;
      if (!amount || reason.length < 4) {
        return NextResponse.json({ error: "amount-and-reason-required" }, { status: 400 });
      }
      const { data, error } = await db.rpc("efaa_challenge_admin_adjust", {
        p_challenge_id: challenge.id,
        p_participant_id: body.participantId,
        p_amount: amount,
        p_reason: reason,
        p_administrator_id: adminId,
      });
      if (error) throw error;
      return NextResponse.json(data);
    }

    if (body.action === "freeze") {
      const { data: board } = await db
        .from("efaa_challenge_leaderboard_v")
        .select("*")
        .eq("challenge_id", challenge.id)
        .order("rank");
      const finalists = (board || []).slice(0, 3);
      const verificationRows = await Promise.all(
        finalists.map(async (row) => {
          const [{ data: participant }, { data: referralRows }, { count: unresolvedFlags }] =
            await Promise.all([
              db.from("efaa_challenge_participants").select("*").eq("id", row.participant_id).single(),
              db
                .from("efaa_challenge_referrals")
                .select("status")
                .eq("challenge_id", challenge.id)
                .eq("inviter_participant_id", row.participant_id),
              db
                .from("efaa_challenge_fraud_flags")
                .select("id", { count: "exact", head: true })
                .eq("challenge_id", challenge.id)
                .eq("participant_id", row.participant_id)
                .in("severity", ["high", "critical"])
                .in("status", ["open", "reviewing", "confirmed"]),
            ]);
          const referrals = referralRows || [];
          const validReferrals = referrals.filter((item) => item.status === "valid").length;
          const invalidReferrals = referrals.filter((item) => item.status === "invalid").length;
          const eligibilityChecks = {
            rules: Boolean(participant?.rules_accepted_at),
            tiktok: Boolean(participant?.tiktok_declared),
            facebook: Boolean(participant?.facebook_declared),
            referrals: true,
            practiced: true,
            active: participant?.status === "active",
            fraudClear: (unresolvedFlags || 0) === 0,
          };
          const eligibilityStatus = Object.values(eligibilityChecks).every(Boolean)
            ? "eligible"
            : "review_required";
          return {
            challenge_id: challenge.id,
            participant_id: row.participant_id,
            proposed_rank: Number(row.rank),
            final_points: Number(row.points),
            learning_points: Number(row.learning_points),
            active_days: Number(row.active_days),
            speaking_sessions: Number(row.speaking_sessions),
            valid_referrals: validReferrals,
            invalid_referrals: invalidReferrals,
            unresolved_flags: unresolvedFlags || 0,
            eligibility_status: eligibilityStatus,
            tie_break: {
              learningPoints: Number(row.learning_points),
              activeDays: Number(row.active_days),
              speakingSessions: Number(row.speaking_sessions),
              scoreAchievedAt: row.score_achieved_at,
            },
            audit_status: "pending",
            report: {
              userId: row.user_id,
              displayName: row.display_name,
              checks: eligibilityChecks,
              generatedAt: new Date().toISOString(),
            },
          };
        }),
      );
      if (verificationRows.length) {
        const { error } = await db
          .from("efaa_challenge_winner_verifications")
          .upsert(verificationRows, { onConflict: "challenge_id,proposed_rank" });
        if (error) throw error;
      }
      await db.from("efaa_challenge_leaderboard_snapshots").insert({
        id: randomUUID(),
        challenge_id: challenge.id,
        snapshot_type: "freeze",
        academy_day: academyDate(),
        payload: board || [],
      });
      await db
        .from("efaa_challenges")
        .update({
          status: "verification",
          leaderboard_locked: true,
          locked_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", challenge.id);
      await db.from("efaa_challenge_admin_actions").insert({
        challenge_id: challenge.id,
        administrator_id: adminId,
        action: "freeze_leaderboard",
        target_type: "challenge",
        target_id: challenge.id,
        reason: reason || "Competition ended; leaderboard frozen for verification.",
      });
      return NextResponse.json({ ok: true });
    }

    if (body.action === "finalize") {
      const { data: reports, error: reportError } = await db
        .from("efaa_challenge_winner_verifications")
        .select("*")
        .eq("challenge_id", challenge.id)
        .in("proposed_rank", [1, 2, 3])
        .order("proposed_rank");
      if (reportError) throw reportError;
      if (
        !challenge.leaderboard_locked ||
        (reports || []).length !== 3 ||
        (reports || []).some(
          (report) => report.eligibility_status !== "eligible" || report.unresolved_flags > 0,
        )
      ) {
        return NextResponse.json({ error: "winner-verification-incomplete" }, { status: 409 });
      }
      const verifiedAt = new Date().toISOString();
      const { error: verifyError } = await db
        .from("efaa_challenge_winner_verifications")
        .update({ audit_status: "verified", verified_by: adminId, verified_at: verifiedAt })
        .eq("challenge_id", challenge.id)
        .in("proposed_rank", [1, 2, 3]);
      if (verifyError) throw verifyError;
      await db
        .from("efaa_challenges")
        .update({ status: "final", updated_at: verifiedAt })
        .eq("id", challenge.id);
      await db.from("efaa_challenge_admin_actions").insert({
        challenge_id: challenge.id,
        administrator_id: adminId,
        action: "publish_final_winners",
        target_type: "challenge",
        target_id: challenge.id,
        reason: reason || "Winner reports verified and final leaderboard published.",
        after_data: { verifiedAt, ranks: [1, 2, 3] },
      });
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ error: "unknown-action" }, { status: 400 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "admin-action-failed" },
      { status: 500 },
    );
  }
}
