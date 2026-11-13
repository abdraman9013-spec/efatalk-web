"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { clearAdminAuth, isAdminAuthed } from "@/lib/admin";
import { destroyStudentSession, restoreStudent, studentRecordExists } from "@/lib/efaa-db";
import { isFakeAdminStudent, isOfficialStudent, isPracticeProfileComplete, readCurrentStudent } from "@/lib/session";
import { getSupabase } from "@/lib/supabase";

const OPEN = new Set(["/", "/auth", "/auth/callback", "/official", "/privacy", "/terms", "/about", "/vip-dashboard"]);

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const path = usePathname();

  useEffect(() => {
    const keepAdmin =
      path.startsWith("/admin") ||
      path.startsWith("/lobby") ||
      path.startsWith("/live") ||
      path.startsWith("/room") ||
      path.startsWith("/mid") ||
      path.startsWith("/duo") ||
      path.startsWith("/welcome") ||
      path.startsWith("/play") ||
      path.startsWith("/clash") ||
      path.startsWith("/hall") ||
      path.startsWith("/lecture") ||
      path.startsWith("/class") ||
      path.startsWith("/learn") ||
      path.startsWith("/vip-dashboard");
    if (!keepAdmin) {
      clearAdminAuth();
    }

    const supabase = getSupabase();

    const publicPath = OPEN.has(path) || path.startsWith("/admin") || path.startsWith("/challenge");

    async function evict() {
      await destroyStudentSession();
      if (!publicPath) router.replace("/auth");
    }

    async function verify() {
      if (publicPath) return;
      const local = readCurrentStudent();
      if (isOfficialStudent(local)) return;
      if (isFakeAdminStudent(local) && !isAdminAuthed()) {
        await evict();
        return;
      }
      const { data } = await supabase.auth.getSession();
      const user = data.session?.user;
      if (!user?.email) return;
      const fresh = await restoreStudent();
      if (fresh && !isPracticeProfileComplete(fresh)) {
        router.replace("/auth");
        return;
      }
      const exists = await studentRecordExists(user.email, local?.id);
      if (!exists) {
        await evict();
      }
    }

    void verify();

    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        const local = readCurrentStudent();
        if (local && !isOfficialStudent(local)) void evict();
        return;
      }
      void verify();
    });

    const channel = supabase
      .channel("efaa-auth-hard-reset")
      .on("postgres_changes", { event: "DELETE", schema: "public", table: "efaa_practice_students" }, (payload) => {
        const old = payload.old as { id?: string; email?: string };
        const local = readCurrentStudent();
        if (old.id === local?.id || old.email === local?.email) void evict();
      })
      .on("postgres_changes", { event: "DELETE", schema: "public", table: "efaa_active_students" }, (payload) => {
        const old = payload.old as { email?: string };
        const local = readCurrentStudent();
        if (old.email === local?.email) void evict();
      })
      .subscribe();

    const onFocus = () => void verify();
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onFocus);

    return () => {
      data.subscription.unsubscribe();
      void supabase.removeChannel(channel);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onFocus);
    };
  }, [path, router]);

  return children;
}
