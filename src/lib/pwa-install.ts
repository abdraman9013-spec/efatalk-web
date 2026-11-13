type BeforeInstall = Event & {
  prompt: () => Promise<void>;
  userChoice?: Promise<{ outcome: "accepted" | "dismissed" }>;
};

let deferred: BeforeInstall | null = null;
let listening = false;
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((fn) => fn());
}

export function isStandalonePwa() {
  if (typeof window === "undefined") return false;
  const nav = window.navigator as Navigator & { standalone?: boolean };
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    window.matchMedia("(display-mode: fullscreen)").matches ||
    nav.standalone === true
  );
}

export function watchInstallPrompt() {
  if (typeof window === "undefined" || listening) return;
  listening = true;
  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    deferred = event as BeforeInstall;
    emit();
  });
  window.addEventListener("appinstalled", () => {
    deferred = null;
    emit();
  });
}

export function getDeferredInstall() {
  return deferred;
}

export function subscribeInstall(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export async function promptPwaInstall() {
  if (!deferred) return false;
  const event = deferred;
  try {
    await event.prompt();
    const choice = await event.userChoice?.catch(() => null);
    deferred = null;
    emit();
    return choice?.outcome === "accepted";
  } catch {
    return false;
  }
}

if (typeof window !== "undefined") {
  watchInstallPrompt();
}
