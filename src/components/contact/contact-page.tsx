"use client";

import { SiteFooter } from "@/components/landing/site-footer";
import { PageTopBar } from "@/components/site/page-top-bar";
import { useI18n } from "@/i18n/provider";

const PHONE = "+235 69 59 28 22";
const WHATSAPP = "https://wa.me/36707260359";
const FACEBOOK = "https://www.facebook.com/share/19kRFNnujW/";

export function ContactPage() {
  const { locale, dir } = useI18n();
  const back = locale === "ar" ? "رجوع" : locale === "en" ? "Back" : "Retour";
  const title = locale === "ar" ? "اتصل بنا" : locale === "en" ? "Contact" : "Contact";
  const intro =
    locale === "ar"
      ? "تواصل مع English For All Academy — EFA Talk."
      : locale === "en"
        ? "Reach English For All Academy — EFA Talk."
        : "Contactez English For All Academy — EFA Talk.";

  const channels = [
    {
      label: "WhatsApp",
      href: WHATSAPP,
      hint: locale === "en" ? "Message Mr. AAG" : "Écrire à Mr. AAG",
    },
    {
      label: locale === "en" ? "Phone" : "Téléphone",
      href: "tel:+23569592822",
      hint: PHONE,
    },
    {
      label: "Facebook",
      href: FACEBOOK,
      hint: "English For All Academy",
    },
  ];

  return (
    <div className="efa-sea-page relative z-10 min-h-dvh" dir={dir}>
      <header className="border-b border-[#0c1b4d]/10 px-4 py-3 md:px-8">
        <PageTopBar backHref="/" backLabel={back} />
        <div className="mx-auto mt-5 w-full max-w-3xl">
          <p className="text-[10px] font-black uppercase tracking-[0.28em] text-[#8a6a12]">EFA Talk</p>
          <h1 className="mt-2 font-display text-3xl md:text-5xl">{title}</h1>
          <p className="mt-3 text-sm text-[#1a2a4a]">{intro}</p>
        </div>
      </header>
      <main className="mx-auto w-full max-w-3xl space-y-3 px-4 py-8 pb-16 md:px-8">
        {channels.map((row) => (
          <a
            key={row.label}
            href={row.href}
            target={row.href.startsWith("http") ? "_blank" : undefined}
            rel={row.href.startsWith("http") ? "noopener noreferrer" : undefined}
            className="block rounded-[22px] border border-[#c9a227]/28 bg-white/85 px-5 py-4 shadow-[0_12px_36px_rgba(12,27,77,0.04)] transition hover:border-[#c9a227]/55"
          >
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#8a6a12]">{row.label}</p>
            <p className="mt-1 font-display text-xl">{row.hint}</p>
          </a>
        ))}
      </main>
      <SiteFooter />
    </div>
  );
}
