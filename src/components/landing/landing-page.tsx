"use client";

import { useState } from "react";
import { AdminThrone } from "./admin-throne";
import { Atmosphere } from "./atmosphere";
import { GamePreview } from "./game-preview";
import { Hero } from "./hero";
import { HowItWorks } from "./how-it-works";
import { OfficialGate } from "./official-gate";
import { Schedule } from "./schedule";
import { SiteFooter } from "./site-footer";
import { SiteHeader } from "./site-header";
import { SplashScreen } from "./splash-screen";
import { Testimonials } from "./testimonials";
import { VipBadge } from "./vip-badge";

export function LandingPage() {
  const [throne, setThrone] = useState(false);

  return (
    <div className="efa-sea-page relative z-10 min-h-dvh overflow-x-hidden overflow-y-visible">
      <Atmosphere />
      <SplashScreen />
      <div className="relative z-10">
        <SiteHeader onLogoPress={() => setThrone(true)} />
        <main className="overflow-visible">
          <Hero onLogoPress={() => setThrone(true)} />
          <GamePreview />
          <HowItWorks />
          <Schedule />
          <Testimonials />
          <OfficialGate />
        </main>
        <SiteFooter />
        <VipBadge />
      </div>
      {throne ? <AdminThrone onClose={() => setThrone(false)} /> : null}
    </div>
  );
}
