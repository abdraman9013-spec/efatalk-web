import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let browserClient: SupabaseClient | null = null;

function isVerifierKey(key: string) {
  return key.includes("code-verifier");
}

function cookieDomain() {
  if (typeof window === "undefined") return "";
  return window.location.hostname.endsWith("efatalk.fyi") ? "; Domain=.efatalk.fyi" : "";
}

function readCookie(name: string) {
  if (typeof document === "undefined") return null;
  const hit = document.cookie.split("; ").find((part) => part.startsWith(`${name}=`));
  return hit ? decodeURIComponent(hit.slice(name.length + 1)) : null;
}

function writeCookie(name: string, value: string) {
  if (typeof document === "undefined") return;
  document.cookie = `${name}=${encodeURIComponent(value)}; Path=/; Max-Age=900; SameSite=Lax; Secure${cookieDomain()}`;
}

function clearCookie(name: string) {
  if (typeof document === "undefined") return;
  document.cookie = `${name}=; Path=/; Max-Age=0; SameSite=Lax; Secure${cookieDomain()}`;
}

function authStorage() {
  return {
    getItem(key: string) {
      try {
        if (isVerifierKey(key)) return readCookie(key) || window.localStorage.getItem(key);
        return window.localStorage.getItem(key);
      } catch {
        return readCookie(key);
      }
    },
    setItem(key: string, value: string) {
      try {
        window.localStorage.setItem(key, value);
      } catch {
        /* private mode */
      }
      if (isVerifierKey(key)) writeCookie(key, value);
    },
    removeItem(key: string) {
      try {
        window.localStorage.removeItem(key);
      } catch {
        /* ignore */
      }
      if (isVerifierKey(key)) clearCookie(key);
    },
  };
}

export function getSupabase() {
  if (browserClient) return browserClient;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    throw new Error("Supabase env is missing");
  }
  browserClient = createClient(url, key, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      flowType: "pkce",
      storage: typeof window === "undefined" ? undefined : authStorage(),
    },
  });
  return browserClient;
}
