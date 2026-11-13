import { LEVEL0_LESSONS, type Level0Lesson } from "@/lib/level0-lessons";
import { LEVEL1_LESSONS } from "@/lib/level1-lessons";

export function lessonsForBand(band: "0" | "1"): Level0Lesson[] {
  return band === "1" ? LEVEL1_LESSONS : LEVEL0_LESSONS;
}

export function lessonForBand(band: "0" | "1", n: number) {
  return lessonsForBand(band).find((row) => row.n === n) || null;
}
