const KEY = "efaa_formation_enroll";

export type FormationEnrollState = {
  applicationId: string;
  token: string;
  level: "level0" | "level1";
  amount: number;
};

export function rememberFormationEnroll(state: FormationEnrollState) {
  try {
    sessionStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    /* private */
  }
}

export function readFormationEnroll(): FormationEnrollState | null {
  try {
    const raw = sessionStorage.getItem(KEY);
    if (!raw) return null;
    return JSON.parse(raw) as FormationEnrollState;
  } catch {
    return null;
  }
}

export function clearFormationEnroll() {
  try {
    sessionStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}
