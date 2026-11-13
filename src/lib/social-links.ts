export const TIKTOK_PROFILE = "https://www.tiktok.com/@efaa_english";

/** Open the academy profile. Android leaves the site and opens the TikTok app. */
export function openTikTokProfile(event?: { preventDefault(): void }) {
  if (typeof navigator === "undefined" || !/Android/i.test(navigator.userAgent)) return;
  event?.preventDefault();
  const fallback = encodeURIComponent(TIKTOK_PROFILE);
  window.location.href = `intent://www.tiktok.com/@efaa_english#Intent;scheme=https;package=com.zhiliaoapp.musically;S.browser_fallback_url=${fallback};end`;
}
