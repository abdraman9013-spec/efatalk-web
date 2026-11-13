import type { Level } from "@/i18n/translations";
import { clearStudentSession, type EfaaStudent } from "@/lib/session";

const ADMIN_KEY = "efaa_admin_token";
const ADMIN_VISIT_KEY = "efaa_admin_visit";
const LEDGER_KEY = "efaa_admin_ledger";
const TOPICS_KEY = "efaa_admin_topics";

export const ADMIN_CODE = "0680";

export type PaymentRow = {
  id: string;
  name: string;
  whatsapp: string;
  amount: string;
  status: "pending" | "validated";
};

export type SecretCode = {
  id: string;
  name: string;
  whatsapp: string;
  level: Level;
  code: string;
};

export type AdminLedger = {
  payments: PaymentRow[];
  codes: SecretCode[];
};

const seed: AdminLedger = {
  payments: [
    {
      id: "p1",
      name: "Fatime Cherif",
      whatsapp: "+23560000011",
      amount: "12,500 FCFA",
      status: "pending",
    },
    {
      id: "p2",
      name: "Saleh Moussa",
      whatsapp: "+23460000012",
      amount: "17,500 FCFA",
      status: "pending",
    },
  ],
  codes: [],
};

function stores() {
  if (typeof window === "undefined") return [];
  return [window.sessionStorage, window.localStorage];
}

function readFlag(key: string) {
  if (typeof window === "undefined") return null;
  return window.sessionStorage.getItem(key) || window.localStorage.getItem(key);
}

function writeFlag(key: string, value: string) {
  stores().forEach((store) => {
    try {
      store.setItem(key, value);
    } catch {
      /* private mode */
    }
  });
}

function dropFlag(key: string) {
  stores().forEach((store) => {
    try {
      store.removeItem(key);
    } catch {
      /* private mode */
    }
  });
}

export function isAdminAuthed() {
  return readFlag(ADMIN_KEY) === "1";
}

export function clearAdminAuth() {
  dropFlag(ADMIN_KEY);
  dropFlag(ADMIN_VISIT_KEY);
  if (typeof window !== "undefined") {
    window.localStorage.removeItem("efaa_admin_session");
  }
}

export function loginAdmin(code: string) {
  const ok = code.replace(/\D/g, "") === ADMIN_CODE;
  if (!ok) return false;
  writeFlag(ADMIN_KEY, "1");
  return true;
}

export function logoutAdmin() {
  clearAdminAuth();
  clearStudentSession();
}

export function setAdminVisit(level: Level) {
  writeFlag(ADMIN_VISIT_KEY, level);
}

export function readAdminVisit(): Level | null {
  const value = readFlag(ADMIN_VISIT_KEY);
  if (value === "beginner" || value === "intermediate" || value === "advanced") return value;
  return null;
}

export function clearAdminVisit() {
  dropFlag(ADMIN_VISIT_KEY);
}

export function isFakeAdminStudent(student: { id?: string; email?: string } | null) {
  if (!student) return false;
  return student.id === "efaa-admin" || student.email === "admin@efatalk.fyi";
}

export function adminHost(level: Level): EfaaStudent {
  return {
    id: "efaa-admin",
    firstName: "Admin",
    lastName: "EFAA",
    status: "other",
    nationality: "TD",
    city: "N'Djamena",
    whatsapp: "+23569592822",
    email: "admin@efatalk.fyi",
    level,
    streak: 99,
    kind: "practice",
  };
}

export function readLedger(): AdminLedger {
  if (typeof window === "undefined") return seed;
  const raw = window.localStorage.getItem(LEDGER_KEY);
  if (!raw) return seed;
  try {
    return JSON.parse(raw) as AdminLedger;
  } catch {
    return seed;
  }
}

export function writeLedger(ledger: AdminLedger) {
  window.localStorage.setItem(LEDGER_KEY, JSON.stringify(ledger));
}

export function makeSecretCode(name: string) {
  const token = Math.random().toString(36).slice(2, 6).toUpperCase();
  const slug = name.replace(/[^A-Za-z]/g, "").slice(0, 6).toUpperCase() || "EFAA";
  return `EFAA-${slug}-${token}`;
}

export function readAdminTopics() {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(TOPICS_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as Record<Level, string>;
  } catch {
    return null;
  }
}

export function writeAdminTopics(topics: Record<Level, string>) {
  window.localStorage.setItem(TOPICS_KEY, JSON.stringify(topics));
}
