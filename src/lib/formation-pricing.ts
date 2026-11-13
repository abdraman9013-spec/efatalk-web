export type FormationLevel = "level0" | "level1";

export const AZOLO_AIRTEL = "69592822";
export const AZOLO_WHATSAPP = "23569592822";
export const FORMATEUR_WHATSAPP =
  "https://wa.me/36707260359?text=" +
  encodeURIComponent("Bonjour, je souhaite m'inscrire à la formation privée EFA Talk.");

export const FORMATION_VIDEOS = {
  certificate: "https://www.youtube.com/embed/VTHzhPJq7I8",
  attendA: "https://www.youtube.com/embed/ShGaKAel6uY",
  attendB: "https://www.youtube.com/embed/JF02cI6bcTc",
  howWorks: "" as string, // link later
};

export const FORMATION_COUNTRIES = [
  { code: "TR", name: "Turkey" },
  { code: "RU", name: "Russia" },
  { code: "TD", name: "Chad" },
  { code: "CM", name: "Cameroon" },
  { code: "NG", name: "Nigeria" },
  { code: "FR", name: "France" },
  { code: "HU", name: "Hungary" },
  { code: "CF", name: "Central African Republic" },
] as const;

export type FormationOffer = {
  level: FormationLevel;
  label: string;
  duration: string;
  firstAmount: number;
  secondAmount: number;
  total: number;
  listTotal: number;
  /** Amounts accepted on first Airtel transfer */
  acceptedFirst: number[];
};

export const FORMATION_OFFERS: Record<FormationLevel, FormationOffer> = {
  level0: {
    level: "level0",
    label: "Level 0",
    duration: "2 months",
    firstAmount: 7500,
    secondAmount: 5000,
    total: 12500,
    listTotal: 15000,
    acceptedFirst: [7500, 12500, 15000],
  },
  level1: {
    level: "level1",
    label: "Level 1",
    duration: "45 days",
    firstAmount: 10000,
    secondAmount: 7500,
    total: 17500,
    listTotal: 20000,
    acceptedFirst: [10000, 17500, 20000],
  },
};

export const SEATS_DEFAULT = 9;
export const AZOLO_ADMIN_CODE = "4253";

export function formatFcfa(n: number) {
  return `${n.toLocaleString("fr-FR")} F`;
}

/** First inscription amount seen on the SMS → likely level (Azolo still confirms). */
export function formationLevelForPaidAmount(amount: number): FormationLevel | null {
  if (FORMATION_OFFERS.level1.acceptedFirst.includes(amount)) return "level1";
  if (FORMATION_OFFERS.level0.acceptedFirst.includes(amount)) return "level0";
  return null;
}
