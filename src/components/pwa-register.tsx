"use client";

import { installKeepInApp } from "@/lib/keep-in-app";
import { watchInstallPrompt } from "@/lib/pwa-install";

if (typeof window !== "undefined") {
  installKeepInApp();
  watchInstallPrompt();
  if ("serviceWorker" in navigator) {
    void navigator.serviceWorker.register("/sw.js", { scope: "/", updateViaCache: "none" });
  }
}

export function PwaRegister() {
  return null;
}
