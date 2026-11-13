import { getSupabase } from "@/lib/supabase";

export type AttendanceRow = {
  user_id: string;
  first_name: string;
  last_name: string;
  level: string;
  photo?: string | null;
  source: "lecture" | "match";
  present: boolean;
};

export async function markPresent(userId: string, source: "lecture" | "match" = "lecture") {
  if (!userId || userId === "efaa-admin") return false;
  const { data, error } = await getSupabase().rpc("efaa_mark_present", {
    p_user_id: userId,
    p_source: source,
  });
  if (error) return false;
  return Boolean((data as { ok?: boolean } | null)?.ok);
}

export async function fetchAttendanceDays(userId: string) {
  if (!userId) return 0;
  const { data, error } = await getSupabase().rpc("efaa_attendance_days", { p_user_id: userId });
  if (error) return 0;
  return Number(data) || 0;
}

export async function fetchTonightAttendance(levels: string[] = ["beginner", "intermediate"]) {
  const { data, error } = await getSupabase().rpc("efaa_tonight_attendance", { p_levels: levels });
  if (error) return [] as AttendanceRow[];
  return (data || []) as AttendanceRow[];
}
