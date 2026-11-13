import type { Level } from "@/i18n/translations";
import type { DayKey } from "@/lib/schedule";
import { getSupabase } from "@/lib/supabase";
import {
  clearStudentSession,
  isFakeAdminStudent,
  isPracticeProfileComplete,
  readCurrentStudent,
  officialDisplayName,
  saveCurrentStudent,
  type EfaaStudent,
  type StudentStatus,
} from "@/lib/session";
import { slimAvatarUrl } from "@/lib/avatar";
import { ensureGamification } from "@/lib/gamification";
import type { User } from "@supabase/supabase-js";

const portraitMemo = new Map<string, string | null>();
const portraitInflight = new Map<string, Promise<string | undefined>>();

export type EfaaWebRow = {
  id: string;
  session_days: DayKey[];
  session_start: string;
  session_end: string;
  topics: Record<Level, string>;
  next_student_n: number;
  issued_codes: string[];
  practice_students?: EfaaActiveRow[];
};

export type InvitationCodeRow = {
  id: string;
  code: string;
  is_used: boolean;
  created_at: string;
};

export type EfaaActiveRow = {
  id: string;
  access_code: string;
  email: string;
  first_name: string;
  last_name: string;
  status: StudentStatus;
  nationality: string;
  city: string;
  whatsapp: string;
  level: Level;
  photo_url: string | null;
  avatar_url?: string | null;
  amount_paid: number | string;
  amount_due: number | string;
  created_at?: string;
};

function rowPhoto(row: { avatar_url?: string | null; photo_url?: string | null }) {
  return row.avatar_url || row.photo_url || undefined;
}

export function rowToStudent(row: EfaaActiveRow): EfaaStudent {
  return {
    id: row.id,
    firstName: row.first_name,
    lastName: row.last_name,
    status: row.status,
    nationality: row.nationality,
    city: row.city,
    whatsapp: row.whatsapp,
    email: row.email.toLowerCase(),
    level: row.level,
    photo: rowPhoto(row),
    streak: 1,
    accessCode: row.access_code,
    amountPaid: Number(row.amount_paid) || 0,
    amountDue: Number(row.amount_due) || 0,
    kind: "official",
    createdAt: row.created_at,
  };
}

function practiceToStudent(row: EfaaActiveRow): EfaaStudent {
  return { ...rowToStudent(row), kind: "practice", accessCode: undefined };
}

type PracticeTableRow = {
  id: string;
  auth_user_id: string | null;
  email: string;
  first_name: string;
  last_name: string;
  status: StudentStatus;
  nationality: string;
  city: string;
  whatsapp: string;
  level: Level;
  photo_url: string | null;
  avatar_url?: string | null;
  created_at?: string;
};

function tableToStudent(row: PracticeTableRow): EfaaStudent {
  return {
    id: row.id,
    firstName: row.first_name,
    lastName: row.last_name,
    status: row.status,
    nationality: row.nationality,
    city: row.city,
    whatsapp: row.whatsapp,
    email: row.email.toLowerCase(),
    level: row.level,
    photo: rowPhoto(row),
    streak: 1,
    kind: "practice",
    createdAt: row.created_at,
  };
}

export async function fetchWebSettings() {
  const { data, error } = await getSupabase()
    .from("efaa_web")
    .select("id, session_days, session_start, session_end, topics, next_student_n, issued_codes")
    .eq("id", "main")
    .single();
  if (error) throw error;
  return { ...(data as EfaaWebRow), practice_students: [] };
}

export async function saveWebSettings(patch: Partial<EfaaWebRow>) {
  const { data, error } = await getSupabase()
    .from("efaa_web")
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq("id", "main")
    .select("*")
    .single();
  if (error) throw error;
  return data as EfaaWebRow;
}

export function officialCodeEmail(code: string) {
  return `${code.trim().toLowerCase()}@code.efatalk.fyi`;
}

export async function findStudentByEmail(email: string) {
  const { data, error } = await getSupabase()
    .from("efaa_active_students")
    .select("*")
    .eq("email", email.trim().toLowerCase())
    .maybeSingle();
  if (error) return null;
  return data ? rowToStudent(data as EfaaActiveRow) : null;
}

export async function findPracticeByWhatsapp(whatsapp: string) {
  const digits = whatsapp.replace(/\D/g, "");
  if (digits.length < 8) return null;
  const { data } = await getSupabase()
    .from("efaa_practice_students")
    .select("*")
    .ilike("whatsapp", `%${digits.slice(-8)}%`)
    .limit(1)
    .maybeSingle();
  return data ? tableToStudent(data as PracticeTableRow) : null;
}

export async function findStudentByCode(code: string) {
  const { data, error } = await getSupabase()
    .from("efaa_active_students")
    .select("*")
    .eq("access_code", code.trim().toLowerCase())
    .maybeSingle();
  if (error) throw error;
  return data ? repairOfficialTypedName(rowToStudent(data as EfaaActiveRow)) : null;
}

/** Keep the full typed name in first_name so the throne never flips family-name first. */
export async function repairOfficialTypedName(student: EfaaStudent) {
  if (student.kind !== "official") return student;
  const full = officialDisplayName(student);
  if (!student.lastName?.trim() || !full) return student;
  const next = { ...student, firstName: full, lastName: "" };
  const { error } = await getSupabase()
    .from("efaa_active_students")
    .update({ first_name: full, last_name: "" })
    .eq("id", student.id);
  if (error) return { ...student, firstName: full, lastName: "" };
  void getSupabase()
    .from("efaa_user_gamification")
    .update({ display_name: full, updated_at: new Date().toISOString() })
    .eq("user_id", student.id);
  return next;
}

export async function unlockOfficialCode(code: string) {
  const accessCode = code.trim().toLowerCase();
  if (!accessCode) return { status: "invalid" as const };

  const existing = await findStudentByCode(accessCode);
  if (existing) return { status: "profile" as const, student: existing, code: accessCode };

  const supabase = getSupabase();
  const { data: invitation } = await supabase
    .from("invitation_codes")
    .select("code, is_used")
    .eq("code", accessCode)
    .maybeSingle();

  if (invitation) {
    if (invitation.is_used) return { status: "invalid" as const };
    return { status: "register" as const, code: accessCode };
  }

  const settings = await fetchWebSettings();
  if (!settings.issued_codes.map((c) => c.toLowerCase()).includes(accessCode)) {
    return { status: "invalid" as const };
  }
  return { status: "register" as const, code: accessCode };
}

export async function findPracticeByEmail(email: string) {
  const mail = email.trim().toLowerCase();
  const { data } = await getSupabase()
    .from("efaa_practice_students")
    .select("*")
    .eq("email", mail)
    .maybeSingle();
  return data ? tableToStudent(data as PracticeTableRow) : null;
}

export async function fetchStudentCreatedAt(student: EfaaStudent): Promise<string | null> {
  if (student.createdAt) return student.createdAt;
  const supabase = getSupabase();
  const table = student.kind === "official" ? "efaa_active_students" : "efaa_practice_students";
  const byId = await supabase.from(table).select("created_at").eq("id", student.id).maybeSingle();
  const fromId = (byId.data as { created_at?: string } | null)?.created_at;
  if (fromId) return fromId;
  const mail = student.email?.trim().toLowerCase();
  if (!mail) return null;
  const byEmail = await supabase.from(table).select("created_at").eq("email", mail).maybeSingle();
  return (byEmail.data as { created_at?: string } | null)?.created_at || null;
}

export async function studentRecordExists(email: string, id?: string) {
  const mail = email.trim().toLowerCase();
  const supabase = getSupabase();
  const [practice, official] = await Promise.all([
    supabase.from("efaa_practice_students").select("id").eq("email", mail).maybeSingle(),
    supabase.from("efaa_active_students").select("id").eq("email", mail).maybeSingle(),
  ]);
  if (practice.data || official.data) return true;
  if (id) {
    const byId = await supabase.from("efaa_practice_students").select("id").eq("id", id).maybeSingle();
    if (byId.data) return true;
  }
  return false;
}

export function pendingGoogleStudent(email: string, authUserId: string): EfaaStudent {
  return {
    id: authUserId,
    firstName: "",
    lastName: "",
    status: "student",
    nationality: "",
    city: "",
    whatsapp: "",
    email,
    level: "beginner",
    streak: 0,
    kind: "practice",
  };
}

export async function sessionFromGoogle(user: User): Promise<EfaaStudent | null> {
  const email = (user.email || "").trim().toLowerCase();
  if (!email) return null;

  if (email.endsWith("@code.efatalk.fyi")) {
    const official = await findStudentByEmail(email);
    if (official) {
      saveCurrentStudent(official);
      return official;
    }
  }

  const existing = await findPracticeByEmail(email);
  if (existing) {
    try {
      await getSupabase().from("efaa_practice_students").update({ auth_user_id: user.id }).eq("email", email);
    } catch {
      /* row still usable */
    }
    if (isPracticeProfileComplete(existing)) saveCurrentStudent(existing);
    return existing;
  }

  return pendingGoogleStudent(email, user.id);
}

export async function completePracticeProfile(
  user: User,
  input: {
    firstName: string;
    lastName: string;
    status: StudentStatus;
    nationality: string;
    city: string;
    whatsapp: string;
    level: Level;
    photo?: string;
  },
) {
  const email = (user.email || "").trim().toLowerCase();
  if (!email) throw new Error("no-email");
  const photo = input.photo && input.photo.length < 8000 ? input.photo : null;
  const row = {
    auth_user_id: user.id,
    email,
    first_name: input.firstName.trim(),
    last_name: input.lastName.trim(),
    status: input.status,
    nationality: input.nationality,
    city: input.city.trim(),
    whatsapp: input.whatsapp,
    level: input.level,
    photo_url: photo,
  };

  const supabase = getSupabase();
  const existing = await supabase.from("efaa_practice_students").select("id").eq("email", email).maybeSingle();
  const query = existing.data
    ? supabase.from("efaa_practice_students").update(row).eq("email", email)
    : supabase.from("efaa_practice_students").insert(row);

  let { data, error } = await query.select("*").single();
  if (error && photo) {
    const retry = existing.data
      ? await supabase.from("efaa_practice_students").update({ ...row, photo_url: null }).eq("email", email).select("*").single()
      : await supabase.from("efaa_practice_students").insert({ ...row, photo_url: null }).select("*").single();
    data = retry.data;
    error = retry.error;
  }
  if (error) {
    const again = await supabase.from("efaa_practice_students").select("*").eq("email", email).maybeSingle();
    if (again.data) {
      const student = tableToStudent(again.data as PracticeTableRow);
      saveCurrentStudent(student);
      await persistStudentBoardName(student);
      return student;
    }
    throw error;
  }
  const student = tableToStudent(data as PracticeTableRow);
  saveCurrentStudent(student);
  await persistStudentBoardName(student);
  return student;
}

async function persistStudentBoardName(student: EfaaStudent) {
  try {
    await ensureGamification(student);
  } catch {
    /* lobby retries display_name on next enter */
  }
}

export async function restoreStudent(): Promise<EfaaStudent | null> {
  const supabase = getSupabase();
  const local = readCurrentStudent();
  if (isFakeAdminStudent(local)) {
    clearStudentSession();
  }

  const { data } = await supabase.auth.getSession();
  const user = data.session?.user;
  const googleEmail = (user?.email || "").trim().toLowerCase();
  if (googleEmail && !googleEmail.endsWith("@code.efatalk.fyi")) {
    const practice = await findPracticeByEmail(googleEmail);
    if (!practice) return pendingGoogleStudent(googleEmail, user!.id);
    const merged = { ...practice, photo: practice.photo || (local?.kind === "practice" ? local.photo : undefined) };
    if (isPracticeProfileComplete(merged)) saveCurrentStudent(merged);
    return merged;
  }

  if (local?.kind === "official" && (local.email || local.accessCode)) {
    const official =
      (local.email ? await findStudentByEmail(local.email) : null) ||
      (local.accessCode ? await findStudentByCode(local.accessCode) : null);
    if (!official) return local;
    saveCurrentStudent(official);
    return official;
  }

  if (local?.kind === "practice") return local;

  clearStudentSession();
  return null;
}

export async function destroyStudentSession() {
  try {
    await getSupabase().auth.signOut();
  } catch {
    /* no session */
  }
  clearStudentSession();
}

export async function registerPracticeStudent(input: {
  email: string;
  firstName: string;
  lastName: string;
  status: StudentStatus;
  nationality: string;
  city: string;
  whatsapp: string;
  level: Level;
  photo?: string;
}) {
  const email = input.email.trim().toLowerCase();
  const existing = await findPracticeByEmail(email);
  if (existing) return { student: existing, duplicate: true as const };

  const settings = await fetchWebSettings();
  const row: EfaaActiveRow = {
    id: `practice_${email.replace(/[^a-z0-9]/g, "")}`,
    access_code: "",
    email,
    first_name: input.firstName,
    last_name: input.lastName,
    status: input.status,
    nationality: input.nationality,
    city: input.city,
    whatsapp: input.whatsapp,
    level: input.level,
    photo_url: input.photo || null,
    amount_paid: 0,
    amount_due: 0,
  };
  await saveWebSettings({
    practice_students: [...(settings.practice_students || []), row],
  });
  return { student: practiceToStudent(row), duplicate: false as const };
}

export async function listActiveStudents() {
  const { data, error } = await getSupabase()
    .from("efaa_active_students")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return ((data || []) as EfaaActiveRow[]).map(rowToStudent);
}

export async function registerActiveStudent(input: {
  accessCode: string;
  email?: string;
  firstName: string;
  lastName: string;
  status: StudentStatus;
  nationality: string;
  city: string;
  whatsapp: string;
  level: Level;
  photo?: string;
}) {
  const accessCode = input.accessCode.trim().toLowerCase();
  const email = (input.email || officialCodeEmail(accessCode)).trim().toLowerCase();
  const existingCode = await findStudentByCode(accessCode);
  if (existingCode) return { student: existingCode, duplicate: true as const };
  const existingEmail = await findStudentByEmail(email);
  if (existingEmail) return { student: existingEmail, duplicate: true as const };

  const settings = await fetchWebSettings();
  const legacyOk = settings.issued_codes.map((c) => c.toLowerCase()).includes(accessCode);
  const { data: invitation } = await getSupabase()
    .from("invitation_codes")
    .select("code, is_used")
    .eq("code", accessCode)
    .maybeSingle();
  if (!legacyOk && !invitation) throw new Error("code-unknown");
  if (invitation?.is_used) throw new Error("code-used");

  const { data, error } = await getSupabase()
    .from("efaa_active_students")
    .insert({
      access_code: accessCode,
      email,
      first_name: input.firstName,
      last_name: input.lastName,
      status: input.status,
      nationality: input.nationality,
      city: input.city,
      whatsapp: input.whatsapp,
      level: input.level,
      photo_url: input.photo || null,
    })
    .select("*")
    .single();
  if (error) throw error;
  const student = rowToStudent(data as EfaaActiveRow);
  await persistStudentBoardName(student);
  await markInvitationUsed(accessCode);
  return { student, duplicate: false as const };
}

/** Marks a private code as consumed after successful student registration. */
async function markInvitationUsed(code: string) {
  await getSupabase()
    .from("invitation_codes")
    .update({ is_used: true })
    .eq("code", code.trim().toLowerCase());
}

function randomPrivateCode() {
  const n = Math.floor(1000 + Math.random() * 9000);
  return `efaa_${n}`;
}

export async function listInvitationCodes() {
  const { data, error } = await getSupabase()
    .from("invitation_codes")
    .select("id, code, is_used, created_at")
    .order("created_at", { ascending: false })
    .limit(100);
  if (error) throw error;
  return (data || []) as InvitationCodeRow[];
}

/** Generates efaa_XXXX, persists to invitation_codes + legacy issued_codes list. */
export async function generateInvitationCode() {
  const supabase = getSupabase();
  let code = randomPrivateCode();
  for (let attempt = 0; attempt < 24; attempt += 1) {
    const { data: clash } = await supabase.from("invitation_codes").select("code").eq("code", code).maybeSingle();
    if (!clash) break;
    code = randomPrivateCode();
  }

  const { data: row, error } = await supabase
    .from("invitation_codes")
    .insert({ code, is_used: false })
    .select("id, code, is_used, created_at")
    .single();
  if (error) throw error;

  const settings = await fetchWebSettings();
  const issued = settings.issued_codes.includes(code)
    ? settings.issued_codes
    : [...settings.issued_codes, code];
  const nextSettings = await saveWebSettings({
    next_student_n: settings.next_student_n + 1,
    issued_codes: issued,
  });

  return { row: row as InvitationCodeRow, settings: nextSettings };
}

export async function issueNextAccessCode() {
  const { row, settings } = await generateInvitationCode();
  return { code: row.code, settings };
}

export async function fetchStudentPortrait(userId: string): Promise<string | undefined> {
  if (!userId) return undefined;
  if (portraitMemo.has(userId)) return portraitMemo.get(userId) || undefined;
  const pending = portraitInflight.get(userId);
  if (pending) return pending;
  const job = (async () => {
    try {
      const supabase = getSupabase();
      const gami = await supabase.from("efaa_user_gamification").select("avatar_url").eq("user_id", userId).maybeSingle();
      let url = slimAvatarUrl((gami.data as { avatar_url?: string | null } | null)?.avatar_url);
      if (!url) {
        const practice = await supabase
          .from("efaa_practice_students")
          .select("avatar_url, photo_url")
          .eq("id", userId)
          .maybeSingle();
        url = slimAvatarUrl(rowPhoto(practice.data || {}));
      }
      if (!url) {
        const official = await supabase
          .from("efaa_active_students")
          .select("avatar_url, photo_url")
          .eq("id", userId)
          .maybeSingle();
        url = slimAvatarUrl(rowPhoto(official.data || {}));
      }
      portraitMemo.set(userId, url || null);
      return url;
    } catch {
      portraitMemo.set(userId, null);
      return undefined;
    }
  })();
  portraitInflight.set(userId, job);
  try {
    return await job;
  } finally {
    portraitInflight.delete(userId);
  }
}

export async function updateStudentMoney(id: string, amountPaid: number, amountDue: number) {
  const { data, error } = await getSupabase()
    .from("efaa_active_students")
    .update({ amount_paid: amountPaid, amount_due: amountDue })
    .eq("id", id)
    .select("*")
    .single();
  if (error) throw error;
  return rowToStudent(data as EfaaActiveRow);
}
