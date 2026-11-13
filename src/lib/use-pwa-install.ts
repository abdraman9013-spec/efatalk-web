"use client";

import { useEffect, useState } from "react";
import {
  getDeferredInstall,
  isStandalonePwa,
  promptPwaInstall,
  subscribeInstall,
  watchInstallPrompt,
} from "@/lib/pwa-install";

export function usePwaInstall() {
  const [canInstall, setCanInstall] = useState(false);
  const [standalone, setStandalone] = useState(false);

  useEffect(() => {
    watchInstallPrompt();
    setStandalone(isStandalonePwa());
    const sync = () => setCanInstall(Boolean(getDeferredInstall()) && !isStandalonePwa());
    sync();
    return subscribeInstall(sync);
  }, []);

  return { canInstall, standalone, install: promptPwaInstall };
}
