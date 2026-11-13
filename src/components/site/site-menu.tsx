"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { useI18n } from "@/i18n/provider";

const HIDDEN =
  /^\/(live|duo|clash\/[^/]+|admin|admin-dashboard|vip-dashboard)(\/|$)/;

type Item = { href: string; labelFr: string; labelEn: string; labelAr: string };

const ITEMS: Item[] = [
  { href: "/auth", labelFr: "S’inscrire", labelEn: "Register", labelAr: "التسجيل" },
  {
    href: "/lobby/beginner",
    labelFr: "Salle de pratique",
    labelEn: "Practicing room",
    labelAr: "قاعة التمرين",
  },
  {
    href: "/#temoignages",
    labelFr: "Témoignages",
    labelEn: "Testimonials",
    labelAr: "شهادات",
  },
  { href: "/awards", labelFr: "Awards", labelEn: "Awards", labelAr: "الجوائز" },
  {
    href: "/formation-privee",
    labelFr: "Formation privée",
    labelEn: "Private training",
    labelAr: "تدريب خاص",
  },
  { href: "/about", labelFr: "À propos", labelEn: "About us", labelAr: "من نحن" },
  { href: "/contact", labelFr: "Contact", labelEn: "Contact", labelAr: "اتصل بنا" },
];

export function SiteMenu() {
  const pathname = usePathname() || "/";
  const { locale, dir } = useI18n();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  if (HIDDEN.test(pathname)) return null;

  const label = (item: Item) =>
    locale === "ar" ? item.labelAr : locale === "en" ? item.labelEn : item.labelFr;
  const menuTitle =
    locale === "ar" ? "القائمة" : locale === "en" ? "Menu" : "Menu";
  const closeLabel = locale === "ar" ? "إغلاق" : locale === "en" ? "Close" : "Fermer";

  return (
    <>
      <button
        type="button"
        aria-expanded={open}
        aria-controls="efa-site-menu"
        onClick={() => setOpen((v) => !v)}
        className="fixed right-3 top-[max(0.75rem,env(safe-area-inset-top))] z-[70] flex h-10 w-10 items-center justify-center rounded-full border border-[#d4af37]/40 bg-[#0c1b4d]/90 text-[#f0d78c] shadow-[0_8px_24px_rgba(12,27,77,0.1)] backdrop-blur-xl md:right-5"
        style={{ WebkitTapHighlightColor: "transparent" }}
      >
        <span className="sr-only">{menuTitle}</span>
        <span aria-hidden className="flex w-[18px] flex-col gap-[4.5px]">
          <span
            className={`h-[1.5px] w-full rounded-full bg-current transition ${open ? "translate-y-[6px] rotate-45" : ""}`}
          />
          <span className={`h-[1.5px] w-full rounded-full bg-current transition ${open ? "opacity-0" : ""}`} />
          <span
            className={`h-[1.5px] w-full rounded-full bg-current transition ${open ? "-translate-y-[6px] -rotate-45" : ""}`}
          />
        </span>
      </button>

      {open ? (
        <button
          type="button"
          aria-label={closeLabel}
          className="fixed inset-0 z-[68] bg-[#03050c]/40 backdrop-blur-[2px]"
          onClick={() => setOpen(false)}
        />
      ) : null}

      <aside
        id="efa-site-menu"
        dir={dir}
        className={`fixed top-0 z-[69] flex h-dvh w-[min(20rem,88vw)] flex-col border-[#d4af37]/20 bg-[#070b18]/97 text-[#f6f1e4] shadow-[-12px_0_40px_rgba(0,0,0,0.1)] backdrop-blur-2xl transition-transform duration-300 ease-out ${
          dir === "rtl"
            ? `left-0 border-r ${open ? "translate-x-0" : "-translate-x-full"}`
            : `right-0 border-l ${open ? "translate-x-0" : "translate-x-full"}`
        }`}
        aria-hidden={!open}
      >
        <div className="flex items-start justify-between gap-3 border-b border-white/10 px-4 pb-5 pt-[max(1.25rem,env(safe-area-inset-top))]">
          <div className="min-w-0 pt-1">
            <p className="text-[10px] font-black uppercase tracking-[0.28em] text-[#d4af37]">EFA Talk</p>
            <p className="mt-1.5 font-display text-xl text-ivory">{menuTitle}</p>
          </div>
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label={closeLabel}
            className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/15 bg-white/5 text-[18px] leading-none text-[#f0d78c] transition hover:bg-white/10"
          >
            ×
          </button>
        </div>

        <nav
          className="efa-menu-scroll flex-1 overflow-y-auto px-4 py-5"
          aria-label={menuTitle}
        >
          <ul className="flex flex-col gap-2.5">
            {ITEMS.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className="block rounded-2xl px-4 py-3.5 text-[15px] font-semibold text-[#f6f1e4] transition hover:bg-white/[0.07] hover:text-[#f0d78c]"
                >
                  {label(item)}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <p className="border-t border-white/10 px-4 py-4 text-[11px] tracking-[0.08em] text-white/40">
          English For All Academy
        </p>
      </aside>
    </>
  );
}
