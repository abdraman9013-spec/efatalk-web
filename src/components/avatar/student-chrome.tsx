"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { AvatarAtelier } from "@/components/avatar/avatar-atelier";
import { StudentPortrait } from "@/components/avatar/student-portrait";
import { useI18n } from "@/i18n/provider";
import { isFakeAdminStudent, readCurrentStudent, studentBoardName, type EfaaStudent } from "@/lib/session";
import { useAvatarBroadcast } from "@/lib/avatar";

const OPEN = new Set(["/", "/auth", "/official", "/privacy", "/terms", "/profile", "/admin"]);

function isStudentChrome(path: string) {
  if (OPEN.has(path) || path.startsWith("/admin") || path.startsWith("/auth")) return false;
  return (
    path.startsWith("/welcome") ||
    path.startsWith("/lobby") ||
    path.startsWith("/live") ||
    path.startsWith("/room") ||
    path.startsWith("/mid") ||
    path.startsWith("/duo") ||
    path.startsWith("/play") ||
    path.startsWith("/clash")
  );
}

export function StudentChrome() {
  const { t } = useI18n();
  const path = usePathname();
  const allowed = isStudentChrome(path);
  const [student, setStudent] = useState<EfaaStudent | null>(null);
  const [open, setOpen] = useState(false);
  useAvatarBroadcast(setStudent);

  useEffect(() => {
    if (!allowed) {
      setStudent(null);
      setOpen(false);
      return;
    }
    const local = readCurrentStudent();
    if (!local?.id || isFakeAdminStudent(local) || !local.email) {
      setStudent(null);
      return;
    }
    setStudent(local);
  }, [allowed, path]);

  if (!allowed || !student) return null;

  return (
    <>
      <button
        type="button"
        className="avatar-orb"
        onClick={() => setOpen(true)}
        aria-label={t.atelier.title}
      >
        <StudentPortrait name={studentBoardName(student)} photo={student.photo} size={54} living />
      </button>
      <AvatarAtelier
        open={open}
        student={student}
        onClose={() => setOpen(false)}
        onSaved={(next) => {
          setStudent(next);
        }}
      />
    </>
  );
}
