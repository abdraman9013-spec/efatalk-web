import { FORMATION_DISCOUNT_END_MS } from "@/lib/formation-discount";
import type { FormationLevel } from "@/lib/formation-pricing";

export type FormationPublicSettings = {
  discountEndsAt: string;
  discountActive: boolean;
  seats: { level: FormationLevel; seatsTotal: number }[];
  caisseBalance: number;
};

export const FORMATION_DEFAULT_DISCOUNT_MS = FORMATION_DISCOUNT_END_MS;
