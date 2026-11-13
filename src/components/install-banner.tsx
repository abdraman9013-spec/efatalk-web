"use client";

import { useEffect, useState } from "react";
import { useI18n } from "@/i18n/provider";
import { usePwaInstall } from "@/lib/use-pwa-install";

function isInAppBrowser() {
  const ua = window.navigator.userAgent;
  return /FBAN|FBAV|Instagram|TikTok|Bytedance|Line\/|Snapchat|Twitter|Pinterest|WhatsApp/i.test(ua);
}

export function InstallBanner() {
  const { t } = useI18n();
  const { canInstall, standalone, install } = usePwaInstall();
  const [hidden, setHidden] = useState(true);
  const [ios, setIos] = useState(false);
  const [inApp, setInApp] = useState(false);

  useEffect(() => {
    if (standalone) return;
    const ua = window.navigator.userAgent;
    setIos(/iPhone|iPad|iPod/i.test(ua));
    setInApp(isInAppBrowser());
    if (window.localStorage.getItem("efaa_install_hide") === "1") return;
    setHidden(false);
  }, [standalone]);

  if (standalone) return null;

  async function onInstall() {
    const ok = await install();
    if (ok) setHidden(true);
  }

  function dismiss() {
    window.localStorage.setItem("efaa_install_hide", "1");
    setHidden(true);
  }

  if (hidden) {
    if (!canInstall || ios || inApp) return null;
    return (
      <div className="install-banner">
        <p className="install-title">{t.install.title}</p>
        <div className="install-actions">
          <button type="button" className="kingdom-cta px-3 py-2 text-[12px]" onClick={() => void onInstall()}>
            {t.install.action}
          </button>
        </div>
      </div>
    );
  }

  const hint = inApp ? t.install.openChrome : ios ? t.install.iosSteps : t.install.androidSteps;

  return (
    <div className="install-banner">
      <div className="install-icons" aria-hidden>
        <span className="install-chip">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/icons/icon-192.png?v=6" alt="" width={18} height={18} />
          {t.install.android}
        </span>
        <span className="install-chip">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/icons/icon-192.png?v=6" alt="" width={18} height={18} />
          {t.install.iphone}
        </span>
      </div>
      <p className="install-title">{t.install.title}</p>
      <p className="install-hint">{hint}</p>
      {!inApp && !ios && !canInstall && <p className="install-hint">{t.install.androidHint}</p>}
      <div className="install-actions">
        {!ios && !inApp && canInstall ? (
          <button type="button" className="kingdom-cta px-3 py-2 text-[12px]" onClick={() => void onInstall()}>
            {t.install.action}
          </button>
        ) : null}
        <button type="button" className="kingdom-cta-ghost px-3 py-2 text-[12px]" onClick={dismiss}>
          OK
        </button>
      </div>
    </div>
  );
}
