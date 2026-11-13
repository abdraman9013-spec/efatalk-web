import { getSupabase } from "@/lib/supabase";

const VIP_CODE_KEY = "efaa_vip_pending_code";
const AUTH_RETURN_KEY = "efaa_auth_return_path";

export function setAuthReturnPath(path: string) {
  try {
    sessionStorage.setItem(AUTH_RETURN_KEY, path);
  } catch {
    /* ignore */
  }
}

export function readAuthReturnPath() {
  try {
    return sessionStorage.getItem(AUTH_RETURN_KEY) || "";
  } catch {
    return "";
  }
}

export function clearAuthReturnPath() {
  try {
    sessionStorage.removeItem(AUTH_RETURN_KEY);
  } catch {
    /* ignore */
  }
}

/** Remembers the official code so Google OAuth can return to VIP onboarding. */
export function rememberVipCode(code: string) {
  try {
    sessionStorage.setItem(VIP_CODE_KEY, code.trim().toLowerCase());
  } catch {
    /* private mode */
  }
}

export function readVipCode() {
  try {
    return (sessionStorage.getItem(VIP_CODE_KEY) || "").trim().toLowerCase();
  } catch {
    return "";
  }
}

export function clearVipCode() {
  try {
    sessionStorage.removeItem(VIP_CODE_KEY);
  } catch {
    /* ignore */
  }
}

export async function startGoogleAuth(returnPath?: string) {
  if (returnPath) setAuthReturnPath(returnPath);
  const supabase = getSupabase();
  const origin = window.location.origin;
  const { error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${origin}/auth/callback`,
      queryParams: { prompt: "select_account" },
    },
  });
  if (error) throw error;
}
