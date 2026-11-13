import type { Level } from "@/i18n/translations";

export type StudentStatus = "pupil" | "student" | "worker" | "entrepreneur" | "other";

export type EfaaStudent = {
  id: string;
  firstName: string;
  lastName: string;
  status: StudentStatus;
  nationality: string;
  city: string;
  whatsapp: string;
  email: string;
  level: Level;
  photo?: string;
  streak: number;
  accessCode?: string;
  amountPaid?: number;
  amountDue?: number;
  kind?: "practice" | "official";
  createdAt?: string;
};

/** Public board name: nom (family) then prenom (given). */
export function composeBoardName(nom?: string | null, prenom?: string | null) {
  return `${nom ?? ""} ${prenom ?? ""}`.replace(/\s+/g, " ").trim();
}

/** Name in the order the student typed it (not family-name-first). */
export function officialDisplayName(student: { firstName?: string | null; lastName?: string | null } | null | undefined) {
  const typed = `${student?.firstName ?? ""} ${student?.lastName ?? ""}`.replace(/\s+/g, " ").trim();
  if (typed) return typed;
  return composeBoardName(student?.lastName, student?.firstName);
}

export function isOfficialStudent(
  student?: { kind?: string; accessCode?: string; email?: string } | null,
) {
  if (!student) return false;
  if (student.kind === "official") return true;
  if (student.accessCode) return true;
  return Boolean(student.email?.toLowerCase().endsWith("@code.efatalk.fyi"));
}

/** Practice board: family name then given name. Official: the name they typed. */
export function studentBoardName(
  student: {
    firstName?: string | null;
    lastName?: string | null;
    kind?: string;
    accessCode?: string;
    email?: string;
  } | null | undefined,
) {
  if (isOfficialStudent(student)) return officialDisplayName(student);
  return composeBoardName(student?.lastName, student?.firstName);
}

export function visibleBoardName(name?: string | null) {
  return (name ?? "").replace(/\s+/g, " ").trim();
}

const SESSION_KEY = "efaa_current_student";
const OFFICIAL_KEY = "efaa_official_student";
const EMAIL_KEY = "efaa_student_email";
const REGISTRY_KEY = "efaa_students_registry";
const COOKIE_KEY = "efaa_student";

function slimStudent(student: EfaaStudent): EfaaStudent {
  return { ...student, photo: undefined };
}

function writeCookie(student: EfaaStudent) {
  if (typeof document === "undefined") return;
  try {
    document.cookie = `${COOKIE_KEY}=${encodeURIComponent(JSON.stringify(slimStudent(student)))}; Path=/; Max-Age=31536000; SameSite=Lax`;
  } catch {
    /* cookie blocked */
  }
}

function readCookieStudent(): EfaaStudent | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.split("; ").find((part) => part.startsWith(`${COOKIE_KEY}=`));
  if (!match) return null;
  try {
    return JSON.parse(decodeURIComponent(match.slice(COOKIE_KEY.length + 1))) as EfaaStudent;
  } catch {
    return null;
  }
}

function writeStore(key: string, value: string) {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    /* quota or private mode */
  }
}

export function isFakeAdminStudent(student: { id?: string; email?: string } | null) {
  if (!student) return false;
  return student.id === "efaa-admin" || student.email === "admin@efatalk.fyi";
}

export function isPracticeProfileComplete(student: EfaaStudent | null) {
  if (!student || isOfficialStudent(student)) return false;
  return Boolean(
    student.email.trim() &&
      student.firstName.trim() &&
      student.lastName.trim() &&
      student.nationality.trim() &&
      student.city.trim() &&
      student.whatsapp.trim() &&
      student.status &&
      student.level,
  );
}

export function readCurrentStudent(): EfaaStudent | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(SESSION_KEY);
  if (raw) {
    try {
      const parsed = JSON.parse(raw) as EfaaStudent;
      if (parsed?.level && !isFakeAdminStudent(parsed)) return parsed;
    } catch {
      /* ignore */
    }
  }
  const cookie = readCookieStudent();
  if (cookie && !isFakeAdminStudent(cookie)) return cookie;
  return null;
}

export function clearStudentSession() {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(SESSION_KEY);
    window.localStorage.removeItem(EMAIL_KEY);
    window.localStorage.removeItem(REGISTRY_KEY);
  } catch {
    /* private mode */
  }
  document.cookie = `${COOKIE_KEY}=; Path=/; Max-Age=0; SameSite=Lax`;
}

export function readOfficialStudent(): EfaaStudent | null {
  if (typeof window === "undefined") return null;
  const current = readCurrentStudent();
  if (current && isOfficialStudent(current)) return current;
  try {
    const raw = window.localStorage.getItem(OFFICIAL_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as EfaaStudent;
    if (parsed && isOfficialStudent(parsed)) return parsed;
  } catch {
    /* ignore */
  }
  return null;
}

export function saveCurrentStudent(student: EfaaStudent) {
  if (typeof window === "undefined") return;
  const slim = slimStudent(student);
  try {
    window.localStorage.setItem(SESSION_KEY, JSON.stringify(student));
  } catch {
    writeStore(SESSION_KEY, JSON.stringify(slim));
  }
  if (isOfficialStudent(student)) {
    try {
      window.localStorage.setItem(OFFICIAL_KEY, JSON.stringify(slim));
    } catch {
      writeStore(OFFICIAL_KEY, JSON.stringify(slim));
    }
  }
  if (student.email) writeStore(EMAIL_KEY, student.email.toLowerCase());
  try {
    const registry = [slim, ...readRegistry().filter((item) => item.email !== student.email).map(slimStudent)];
    window.localStorage.setItem(REGISTRY_KEY, JSON.stringify(registry.slice(0, 20)));
  } catch {
    /* skip registry if full */
  }
  writeCookie(slim);
}

export function readRememberedEmail() {
  if (typeof window === "undefined") return "";
  const stored = window.localStorage.getItem(EMAIL_KEY) || "";
  if (stored) return stored;
  return readCookieStudent()?.email || "";
}

export function readRegistry(): EfaaStudent[] {
  if (typeof window === "undefined") return [];
  const raw = window.localStorage.getItem(REGISTRY_KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as EfaaStudent[];
  } catch {
    return [];
  }
}

export function loginByWhatsapp(whatsapp: string): EfaaStudent | null {
  const needle = whatsapp.replace(/\D/g, "");
  const found = readRegistry().find((item) => item.whatsapp.replace(/\D/g, "") === needle);
  if (!found) return null;
  saveCurrentStudent(found);
  return found;
}

export function roomPath(level: Level) {
  return `/room/${level}`;
}

export function lobbyPath(level: Level) {
  return `/lobby/${level}`;
}

export function duoPath(pairId: string) {
  return `/duo/${pairId}`;
}

export function livePath(level: Level, roomId: string) {
  return `/live/${level}/${encodeURIComponent(roomId)}`;
}

/** Official lecture hall (Level 0 / Level 1) — not the practice mesh. */
export function lectureBand(level: Level): "0" | "1" {
  return level === "intermediate" || level === "advanced" ? "1" : "0";
}

export function lecturePath(level: Level) {
  return `/lecture/${lectureBand(level)}`;
}

/** Level 0 term is 60 days from 15 Sep. Level 1 term is 45 days. */
export function officialTermDays(level: Level) {
  return lectureBand(level) === "1" ? 45 : 60;
}

export const OFFICIAL_TERM_START = "2026-09-15";

/** Prefer fetchAttendanceDays(userId). Sync stub kept at 0 — no more fake calendar fills. */
export function officialPresenceFilled(level: Level) {
  void level;
  return 0;
}

/** Shared evening class hall — not the intermediate practice mesh. */
export function classRoomPath(level: Level) {
  return lecturePath(level);
}

export function splitFullName(full: string) {
  const name = full.replace(/\s+/g, " ").trim();
  if (!name) return { firstName: "", lastName: "" };
  return { firstName: name, lastName: "" };
}

export function playPath() {
  return "/play";
}

export function clashPath() {
  return "/clash";
}

export function isLevel(value: string): value is Level {
  return value === "beginner" || value === "intermediate" || value === "advanced";
}
