"use client";

const LAST_PATH = "efaa-last-app-path";

function dailyHost(url: string) {
  try {
    return new URL(url, typeof window === "undefined" ? "https://www.efatalk.fyi" : window.location.href)
      .hostname
      .toLowerCase()
      .endsWith("daily.co");
  } catch {
    return /daily\.co/i.test(url);
  }
}

function rememberAppPath() {
  if (typeof window === "undefined") return;
  if (window.location.hostname.toLowerCase().endsWith("daily.co")) return;
  try {
    sessionStorage.setItem(LAST_PATH, `${window.location.pathname}${window.location.search}`);
  } catch {
    /* quota */
  }
}

function bounceOffDaily() {
  if (typeof window === "undefined") return;
  if (!window.location.hostname.toLowerCase().endsWith("daily.co")) return;
  let back = "/lobby/beginner";
  try {
    back = sessionStorage.getItem(LAST_PATH) || back;
  } catch {
    /* ignore */
  }
  window.location.replace(back.startsWith("/") ? back : "/lobby/beginner");
}

/** Daily stays inside daily-js. Never let the document become a Daily room page. */
export function installKeepInApp() {
  if (typeof window === "undefined") return;
  const w = window as Window & { __efaaKeepInApp?: boolean };
  if (w.__efaaKeepInApp) return;
  w.__efaaKeepInApp = true;

  bounceOffDaily();
  rememberAppPath();

  document.addEventListener(
    "click",
    (event) => {
      const target = event.target as Element | null;
      const link = target?.closest?.("a");
      if (link?.href && dailyHost(link.href)) {
        event.preventDefault();
        event.stopPropagation();
      }
    },
    true,
  );

  document.addEventListener(
    "submit",
    (event) => {
      const form = event.target as HTMLFormElement | null;
      const action = form?.getAttribute("action") || "";
      if (action && dailyHost(action)) {
        event.preventDefault();
        event.stopPropagation();
      }
    },
    true,
  );

  const rawOpen = window.open.bind(window);
  window.open = ((url?: string | URL, target?: string, features?: string) => {
    if (url && dailyHost(String(url))) return null;
    return rawOpen(url, target, features);
  }) as typeof window.open;

  window.addEventListener("pagehide", rememberAppPath);
  window.addEventListener("popstate", () => {
    bounceOffDaily();
    rememberAppPath();
  });
}

export function isDailyUrl(url: string) {
  return dailyHost(url);
}
