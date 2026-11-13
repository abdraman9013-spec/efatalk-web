"use client";

import Link from "next/link";
import { useI18n } from "@/i18n/provider";
import { openTikTokProfile, TIKTOK_PROFILE } from "@/lib/social-links";

const PHONE_HREF = "tel:+23569592822";
const WHATSAPP_HREF = "https://wa.me/36707260359";
const FACEBOOK_HREF = "https://www.facebook.com/share/19kRFNnujW/";
const TIKTOK_HREF = TIKTOK_PROFILE;

/** Official brand marks — white glyphs on black discs (Coursera-style). */
function PhoneGlyph() {
  return (
    <svg viewBox="0 0 24 24" className="site-social-glyph" aria-hidden>
      <path
        fill="currentColor"
        d="M6.6 10.8c1.4 2.8 3.8 5.1 6.6 6.6l2.2-2.2c.3-.3.7-.4 1.1-.2 1.2.4 2.5.6 3.8.6.6 0 1 .4 1 1V20c0 .6-.4 1-1 1C10.6 21 3 13.4 3 4c0-.6.4-1 1-1h3.5c.6 0 1 .4 1 1 0 1.3.2 2.6.6 3.8.1.4 0 .8-.3 1.1L6.6 10.8Z"
      />
    </svg>
  );
}

function WhatsAppGlyph() {
  return (
    <svg viewBox="0 0 24 24" className="site-social-glyph" aria-hidden>
      <path
        fill="currentColor"
        d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38c1.45.79 3.08 1.21 4.74 1.21 5.46 0 9.91-4.45 9.91-9.91S17.5 2 12.04 2zm5.79 14.1c-.24.68-1.42 1.25-1.97 1.33-.5.07-1.14.1-1.84-.12-.42-.13-.97-.32-1.67-.62-2.94-1.27-4.85-4.24-5-4.43-.14-.19-1.18-1.57-1.18-3 0-1.42.74-2.12 1.01-2.41.26-.28.58-.35.77-.35h.55c.18 0 .41-.07.64.49.24.58.82 2 .89 2.14.07.14.12.31.02.5-.1.19-.14.31-.28.48-.14.16-.3.37-.42.49-.14.14-.29.29-.12.57.16.28.73 1.2 1.57 1.95 1.08.96 1.99 1.26 2.27 1.4.28.14.44.12.61-.07.16-.19.71-.83.9-1.11.19-.28.38-.23.64-.14.26.09 1.67.79 1.95.93.28.14.47.21.54.33.07.12.07.68-.17 1.36z"
      />
    </svg>
  );
}

function FacebookGlyph() {
  return (
    <svg viewBox="0 0 24 24" className="site-social-glyph" aria-hidden>
      <path
        fill="currentColor"
        d="M14 8.2V6.1c0-.7.1-1 .9-1H16V2h-2.3C11 2 10 3.5 10 5.8v2.4H8v3.1h2V22h3.2V11.3H16l.4-3.1H14z"
      />
    </svg>
  );
}

function TikTokGlyph() {
  return (
    <svg viewBox="0 0 24 24" className="site-social-glyph" aria-hidden>
      <path
        fill="currentColor"
        d="M19.6 8.7a6.5 6.5 0 0 1-3.8-1.2v7a5.7 5.7 0 1 1-4.9-5.6v2.9a2.9 2.9 0 1 0 2 2.7V2.1h2.9c.2 1.6 1.1 3 2.4 3.9A6.4 6.4 0 0 0 21 7.3v1.4h-1.4z"
      />
    </svg>
  );
}

const LINKS = [
  { href: PHONE_HREF, key: "phone" as const, Glyph: PhoneGlyph, external: false },
  { href: WHATSAPP_HREF, key: "whatsapp" as const, Glyph: WhatsAppGlyph, external: true },
  { href: FACEBOOK_HREF, key: "facebook" as const, Glyph: FacebookGlyph, external: true },
  { href: TIKTOK_HREF, key: "tiktok" as const, Glyph: TikTokGlyph, external: true },
];

export function SiteFooter() {
  const { t } = useI18n();

  return (
    <footer className="site-page-footer">
      <div className="site-page-footer-inner">
        <p className="site-page-footer-copy">English For All Academy</p>
        <nav className="site-social-row" aria-label="Contact">
          {LINKS.map(({ href, key, Glyph, external }) => (
            <a
              key={key}
              href={href}
              className="site-social-disc"
              aria-label={t.footer[key]}
              {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
              onClick={key === "tiktok" ? openTikTokProfile : undefined}
            >
              <Glyph />
            </a>
          ))}
        </nav>
        <Link
          href="/about"
          className="mt-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#1a3a7a]/80 underline-offset-4 hover:underline"
        >
          {t.footer.about}
        </Link>
      </div>
    </footer>
  );
}
