/** Frozen official Top 10 — EfaTalk English Challenge 2026 (certificate / QR). */

export type AwardLaureate = {
  code: string;
  rank: number;
  userId: string;
  displayName: string;
  photo: string | null;
  nationality: string;
  points: number;
  learningPoints: number;
  speakingSessions: number;
  activeDays: number;
  validReferrals: number;
  currentStreak: number;
  scoreAchievedAt: string;
  prizeFcfa: number | null;
  titleFr: string;
  titleEn: string;
};

export const AWARDS_2026_META = {
  challengeId: "english-2026",
  challengeName: "EfaTalk English Challenge 2026",
  timezone: "Africa/Ndjamena",
  startsAt: "2026-10-14T23:00:00+00:00",
  endsAt: "2026-10-29T22:59:00+00:00",
  endsLabelFr: "29 octobre 2026",
  endsLabelEn: "29 October 2026",
  verifiedAt: "2026-10-31",
} as const;

export const AWARDS_2026: AwardLaureate[] = [
  {
    code: "2026-01",
    rank: 1,
    userId: "cf244b88-4adf-4ba6-afc1-9f601d0c3c2c",
    displayName: "ADAM AHMAT OUMAR",
    photo:
      "https://pvzkzdaylmwzitlxowmm.supabase.co/storage/v1/object/public/efaa-avatars/efaa/cf244b88-4adf-4ba6-afc1-9f601d0c3c2c/avatar.webp?v=1789502725537",
    nationality: "TD",
    points: 9105,
    learningPoints: 9075,
    speakingSessions: 191,
    activeDays: 15,
    validReferrals: 3,
    currentStreak: 27,
    scoreAchievedAt: "2026-10-29T20:20:18.476654+00:00",
    prizeFcfa: 75000,
    titleFr: "EfaTalk English Champion 2026",
    titleEn: "EfaTalk English Champion 2026",
  },
  {
    code: "2026-02",
    rank: 2,
    userId: "1feea233-6488-4eff-b3d4-27e503c31003",
    displayName: "Zahra Hassan",
    photo:
      "https://pvzkzdaylmwzitlxowmm.supabase.co/storage/v1/object/public/efaa-avatars/efaa/1feea233-6488-4eff-b3d4-27e503c31003/avatar.png?v=1788557183473",
    nationality: "TD",
    points: 8993,
    learningPoints: 8873,
    speakingSessions: 197,
    activeDays: 15,
    validReferrals: 4,
    currentStreak: 20,
    scoreAchievedAt: "2026-10-29T20:21:20.101898+00:00",
    prizeFcfa: 50000,
    titleFr: "Runner-Up du Challenge 2026",
    titleEn: "Challenge Runner-Up 2026",
  },
  {
    code: "2026-03",
    rank: 3,
    userId: "5ec349ce-66e5-485d-a084-504d235ae257",
    displayName: "Raïyan Abba Cheikh",
    photo:
      "https://pvzkzdaylmwzitlxowmm.supabase.co/storage/v1/object/public/efaa-avatars/efaa/5ec349ce-66e5-485d-a084-504d235ae257/avatar.webp?v=1791662685906",
    nationality: "TD",
    points: 8755,
    learningPoints: 8725,
    speakingSessions: 189,
    activeDays: 15,
    validReferrals: 1,
    currentStreak: 17,
    scoreAchievedAt: "2026-10-29T19:43:36.178519+00:00",
    prizeFcfa: 25000,
    titleFr: "Troisième place du Challenge 2026",
    titleEn: "Challenge Third Place 2026",
  },
  {
    code: "2026-04",
    rank: 4,
    userId: "5978c4ff-4df2-4016-a9a6-dd7d287f8488",
    displayName: "Moubarak Daoud",
    photo: null,
    nationality: "TD",
    points: 7375,
    learningPoints: 7375,
    speakingSessions: 168,
    activeDays: 15,
    validReferrals: 0,
    currentStreak: 25,
    scoreAchievedAt: "2026-10-29T19:49:53.393618+00:00",
    prizeFcfa: null,
    titleFr: "Top 10 — 4e place",
    titleEn: "Top 10 — 4th place",
  },
  {
    code: "2026-05",
    rank: 5,
    userId: "4e882a4c-e6be-497b-8ead-88a5f4320fad",
    displayName: "Acheikh Mahamat",
    photo:
      "https://pvzkzdaylmwzitlxowmm.supabase.co/storage/v1/object/public/efaa-avatars/efaa/4e882a4c-e6be-497b-8ead-88a5f4320fad/avatar.webp?v=1791142729928",
    nationality: "TD",
    points: 7237,
    learningPoints: 7237,
    speakingSessions: 149,
    activeDays: 15,
    validReferrals: 0,
    currentStreak: 15,
    scoreAchievedAt: "2026-10-29T05:15:51.495124+00:00",
    prizeFcfa: null,
    titleFr: "Top 10 — 5e place",
    titleEn: "Top 10 — 5th place",
  },
  {
    code: "2026-06",
    rank: 6,
    userId: "6492dd0f-5ed8-405b-b017-e2bf5ed9587d",
    displayName: "OUSMAN GAMAR EMER",
    photo:
      "https://pvzkzdaylmwzitlxowmm.supabase.co/storage/v1/object/public/efaa-avatars/efaa/6492dd0f-5ed8-405b-b017-e2bf5ed9587d/avatar.webp?v=1792272473601",
    nationality: "TD",
    points: 5365,
    learningPoints: 5365,
    speakingSessions: 78,
    activeDays: 14,
    validReferrals: 0,
    currentStreak: 0,
    scoreAchievedAt: "2026-10-29T11:39:12.110367+00:00",
    prizeFcfa: null,
    titleFr: "Top 10 — 6e place",
    titleEn: "Top 10 — 6th place",
  },
  {
    code: "2026-07",
    rank: 7,
    userId: "dda619c1-de21-4c12-ba72-ca37e9c65f2d",
    displayName: "Ummi Suleiman",
    photo:
      "https://pvzkzdaylmwzitlxowmm.supabase.co/storage/v1/object/public/efaa-avatars/efaa/dda619c1-de21-4c12-ba72-ca37e9c65f2d/avatar.webp?v=1788379468700",
    nationality: "NG",
    points: 5355,
    learningPoints: 5295,
    speakingSessions: 92,
    activeDays: 14,
    validReferrals: 2,
    currentStreak: 3,
    scoreAchievedAt: "2026-10-29T08:28:05.434871+00:00",
    prizeFcfa: null,
    titleFr: "Top 10 — 7e place",
    titleEn: "Top 10 — 7th place",
  },
  {
    code: "2026-08",
    rank: 8,
    userId: "d569f412-956e-44b6-b9f2-756afbb33e80",
    displayName: "ISSA HASSAN ISSA",
    photo:
      "https://pvzkzdaylmwzitlxowmm.supabase.co/storage/v1/object/public/efaa-avatars/efaa/d569f412-956e-44b6-b9f2-756afbb33e80/avatar.webp?v=1792697562646",
    nationality: "TD",
    points: 4350,
    learningPoints: 4350,
    speakingSessions: 120,
    activeDays: 12,
    validReferrals: 0,
    currentStreak: 11,
    scoreAchievedAt: "2026-10-29T09:09:28.075798+00:00",
    prizeFcfa: null,
    titleFr: "Top 10 — 8e place",
    titleEn: "Top 10 — 8th place",
  },
  {
    code: "2026-09",
    rank: 9,
    userId: "7b21f4fb-8d21-4253-84c5-7016492e429b",
    displayName: "FARIS AHMAT",
    photo:
      "https://pvzkzdaylmwzitlxowmm.supabase.co/storage/v1/object/public/efaa-avatars/efaa/7b21f4fb-8d21-4253-84c5-7016492e429b/avatar.webp?v=1792229362030",
    nationality: "TD",
    points: 4305,
    learningPoints: 4305,
    speakingSessions: 115,
    activeDays: 12,
    validReferrals: 0,
    currentStreak: 4,
    scoreAchievedAt: "2026-10-29T19:59:14.955785+00:00",
    prizeFcfa: null,
    titleFr: "Top 10 — 9e place",
    titleEn: "Top 10 — 9th place",
  },
  {
    code: "2026-10",
    rank: 10,
    userId: "185ac48c-d042-424c-a577-427af17dda16",
    displayName: "ADAMA MAHAMAT FADOUL",
    photo:
      "https://pvzkzdaylmwzitlxowmm.supabase.co/storage/v1/object/public/efaa-avatars/efaa/185ac48c-d042-424c-a577-427af17dda16/avatar.webp?v=1789073287020",
    nationality: "TD",
    points: 4045,
    learningPoints: 3985,
    speakingSessions: 72,
    activeDays: 9,
    validReferrals: 2,
    currentStreak: 0,
    scoreAchievedAt: "2026-10-27T11:19:18.076244+00:00",
    prizeFcfa: null,
    titleFr: "Top 10 — 10e place",
    titleEn: "Top 10 — 10th place",
  },
];

export function awardByCode(code: string) {
  return AWARDS_2026.find((row) => row.code === code) || null;
}

export function awardPublicUrl(code: string) {
  return `https://www.efatalk.fyi/awards/${code}`;
}
