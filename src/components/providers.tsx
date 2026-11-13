"use client";

import { I18nProvider } from "@/i18n/provider";
import { InstallBanner } from "@/components/install-banner";
import { FlameWatch } from "@/components/flame-watch";
import { PulseHost } from "@/components/pulse-host";
import { PwaRegister } from "@/components/pwa-register";
import { AuthGuard } from "@/components/auth-guard";
import { StudentChrome } from "@/components/avatar/student-chrome";
import { WhatsAppGroupFab } from "@/components/whatsapp-group-fab";
import type { ReactNode } from "react";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <I18nProvider>
      <PwaRegister />
      <AuthGuard>
        <div className="min-h-dvh w-full">
          <InstallBanner />
          <FlameWatch />
          {children}
          <StudentChrome />
          <WhatsAppGroupFab />
          <PulseHost />
        </div>
      </AuthGuard>
    </I18nProvider>
  );
}
