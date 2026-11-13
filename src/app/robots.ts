import type { MetadataRoute } from "next";

const SITE = "https://www.efatalk.fyi";

/** Explicit allow-list for search + AI crawlers indexing EFA Talk. */
export default function robots(): MetadataRoute.Robots {
  const allowAll = { allow: "/" as const };

  return {
    rules: [
      { userAgent: "*", ...allowAll },
      { userAgent: "Googlebot", ...allowAll },
      { userAgent: "Google-Extended", ...allowAll },
      { userAgent: "GPTBot", ...allowAll },
      { userAgent: "ChatGPT-User", ...allowAll },
      { userAgent: "OAI-SearchBot", ...allowAll },
      { userAgent: "ClaudeBot", ...allowAll },
      { userAgent: "anthropic-ai", ...allowAll },
      { userAgent: "PerplexityBot", ...allowAll },
      { userAgent: "Applebot-Extended", ...allowAll },
      { userAgent: "Bytespider", ...allowAll },
      { userAgent: "CCBot", ...allowAll },
    ],
    sitemap: `${SITE}/sitemap.xml`,
    host: SITE,
  };
}
