import { getSupabase } from "@/lib/supabase";

export type IntermediateProgress = {
  user_id: string;
  day_index: number;
  last_formation_date: string | null;
  learned_slang_ids: string[];
  warmup_points_today: number;
  warmup_date: string | null;
  quiz_points: number;
  quiz_corrects: number;
  quiz_bundle: number;
};

function todayStamp() {
  return new Date().toISOString().slice(0, 10);
}

export function intermediateFormationDoneToday(row: IntermediateProgress | null) {
  if (!row?.last_formation_date) return false;
  return row.last_formation_date.slice(0, 10) === todayStamp();
}

export async function ensureIntermediateProgress(userId: string) {
  const { data, error } = await getSupabase().rpc("efaa_ensure_intermediate", { p_user_id: userId });
  if (error) throw error;
  return data as IntermediateProgress;
}

export async function completeIntermediateDay(
  userId: string,
  slangIds: string[],
  displayName: string,
  nationality: string,
) {
  const { data, error } = await getSupabase().rpc("efaa_complete_intermediate_day", {
    p_user_id: userId,
    p_slang_ids: slangIds,
    p_display_name: displayName,
    p_nationality: nationality,
  });
  if (error) throw error;
  return data as IntermediateProgress;
}

export async function awardQuizAnswer(userId: string, correct: boolean) {
  const { data, error } = await getSupabase().rpc("efaa_award_quiz_answer", {
    p_user_id: userId,
    p_correct: correct,
  });
  if (error) throw error;
  return data as {
    total_points: number;
    diamonds_count: number;
    points_gained: number;
    quiz_points: number;
    quiz_corrects: number;
    quiz_bundle: number;
  };
}
