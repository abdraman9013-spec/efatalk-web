import type { Level } from "@/i18n/translations";
import type { EfaaStudent } from "./session";

export const topics: Record<Level, { en: string; fr: string; ar: string }> = {
  beginner: {
    en: "Introduce your family in 4 simple sentences.",
    fr: "Présente ta famille en 4 phrases simples.",
    ar: "قدّم عائلتك في أربع جمل بسيطة.",
  },
  intermediate: {
    en: "Describe a challenge you overcame this month.",
    fr: "Décris un défi que tu as relevé ce mois-ci.",
    ar: "صف تحدياً تجاوزته هذا الشهر.",
  },
  advanced: {
    en: "Should English be required for every online job?",
    fr: "L'anglais devrait-il être obligatoire pour tout métier en ligne ?",
    ar: "هل يجب أن تكون الإنجليزية شرطاً لكل عمل عبر الإنترنت؟",
  },
};

const roster: Record<Level, EfaaStudent[]> = {
  beginner: [
    {
      id: "b-ahmat",
      firstName: "Ahmat",
      lastName: "Idriss",
      status: "student",
      nationality: "TD",
      city: "N'Djamena",
      whatsapp: "+23560000001",
      email: "ahmat@efaa.local",
      level: "beginner",
      streak: 4,
    },
    {
      id: "b-ali",
      firstName: "Ali",
      lastName: "Mahamat",
      status: "student",
      nationality: "TD",
      city: "Moundou",
      whatsapp: "+23560000002",
      email: "ali@efaa.local",
      level: "beginner",
      streak: 2,
    },
    {
      id: "b-yousouf",
      firstName: "Yousouf",
      lastName: "Hassan",
      status: "worker",
      nationality: "CM",
      city: "Maroua",
      whatsapp: "+23760000003",
      email: "yousouf@efaa.local",
      level: "beginner",
      streak: 1,
    },
  ],
  intermediate: [
    {
      id: "i-fatime",
      firstName: "Fatime",
      lastName: "Cherif",
      status: "student",
      nationality: "TD",
      city: "N'Djamena",
      whatsapp: "+23560000011",
      email: "fatime@efaa.local",
      level: "intermediate",
      streak: 5,
    },
    {
      id: "i-saleh",
      firstName: "Saleh",
      lastName: "Moussa",
      status: "entrepreneur",
      nationality: "NG",
      city: "Maiduguri",
      whatsapp: "+23460000012",
      email: "saleh@efaa.local",
      level: "intermediate",
      streak: 3,
    },
    {
      id: "i-raya",
      firstName: "Raiyan",
      lastName: "Abba",
      status: "student",
      nationality: "TD",
      city: "Abéché",
      whatsapp: "+23560000013",
      email: "raya@efaa.local",
      level: "intermediate",
      streak: 2,
    },
  ],
  advanced: [
    {
      id: "a-achta",
      firstName: "Achta",
      lastName: "Ali",
      status: "worker",
      nationality: "FR",
      city: "Lyon",
      whatsapp: "+33600000021",
      email: "achta@efaa.local",
      level: "advanced",
      streak: 7,
    },
    {
      id: "a-mahamat",
      firstName: "Mahamat",
      lastName: "Nour",
      status: "entrepreneur",
      nationality: "US",
      city: "Houston",
      whatsapp: "+17130000022",
      email: "mahamat@efaa.local",
      level: "advanced",
      streak: 4,
    },
    {
      id: "a-rakhis",
      firstName: "Rakhis",
      lastName: "Abdoulaye",
      status: "student",
      nationality: "HU",
      city: "Budapest",
      whatsapp: "+36700000023",
      email: "rakhis@efaa.local",
      level: "advanced",
      streak: 2,
    },
  ],
};

export function rosterFor(level: Level, me: EfaaStudent | null): EfaaStudent[] {
  const peers = roster[level].filter((p) => p.whatsapp !== me?.whatsapp);
  const mine = me && me.level === level ? [me] : [];
  return [...mine, ...peers].sort((a, b) => b.streak - a.streak || a.firstName.localeCompare(b.firstName));
}
