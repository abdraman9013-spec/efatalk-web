import type { MetadataRoute } from "next";

const SITE = "https://www.efatalk.fyi";

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();
  return [
    { url: SITE, lastModified, changeFrequency: "daily", priority: 1 },
    { url: `${SITE}/about`, lastModified, changeFrequency: "weekly", priority: 0.9 },
    { url: `${SITE}/about.txt`, lastModified, changeFrequency: "weekly", priority: 0.8 },
    { url: `${SITE}/llms.txt`, lastModified, changeFrequency: "weekly", priority: 0.8 },
    { url: `${SITE}/auth`, lastModified, changeFrequency: "monthly", priority: 0.7 },
    { url: `${SITE}/challenge`, lastModified, changeFrequency: "daily", priority: 1 },
    { url: `${SITE}/challenge/rules`, lastModified, changeFrequency: "monthly", priority: 0.8 },
    { url: `${SITE}/challenge/leaderboard`, lastModified, changeFrequency: "daily", priority: 0.9 },
    { url: `${SITE}/challenge/winners`, lastModified, changeFrequency: "daily", priority: 0.7 },
    { url: `${SITE}/privacy`, lastModified, changeFrequency: "yearly", priority: 0.3 },
    { url: `${SITE}/terms`, lastModified, changeFrequency: "yearly", priority: 0.3 },
  ];
}
