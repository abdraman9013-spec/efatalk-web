import { getSupabase } from "@/lib/supabase";
import type { User } from "@supabase/supabase-js";

export async function currentAuthUser(): Promise<User | null> {
  const supabase = getSupabase();
  try {
    const { data } = await supabase.auth.getUser();
    if (data.user?.email) return data.user;
  } catch {
    /* fall through */
  }
  try {
    const { data } = await supabase.auth.getSession();
    return data.session?.user || null;
  } catch {
    return null;
  }
}

export async function finishGoogleRedirect(): Promise<User | null> {
  const supabase = getSupabase();
  const existing = await currentAuthUser();
  if (existing?.email) return existing;

  const url = new URL(window.location.href);
  const code = url.searchParams.get("code");
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) throw error;
    const user = await currentAuthUser();
    if (user) return user;
  }

  if (url.hash.includes("access_token")) {
    await new Promise((resolve) => window.setTimeout(resolve, 250));
    const user = await currentAuthUser();
    if (user) return user;
  }

  return currentAuthUser();
}
