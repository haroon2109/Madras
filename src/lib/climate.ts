/**
 * Feature 10/11 — Chennai climatology + monsoon/season intelligence.
 *
 * Monthly rainfall normals for Chennai (Meenambakkam/Nungambakkam long-term
 * averages, IMD-published, mm/month). Stored in code — not per-zone sensor
 * data — so anomaly and monsoon math never touches the network.
 *
 * Sources: IMD Chennai climatological normals (rounded, public figures).
 */

export interface MonthlyNormal {
  month: number; // 1–12
  normalMm: number;
}

export const CHENNAI_MONTHLY_NORMALS: MonthlyNormal[] = [
  { month: 1, normalMm: 20 },
  { month: 2, normalMm: 15 },
  { month: 3, normalMm: 18 },
  { month: 4, normalMm: 30 },
  { month: 5, normalMm: 45 },
  { month: 6, normalMm: 60 },
  { month: 7, normalMm: 100 },
  { month: 8, normalMm: 120 },
  { month: 9, normalMm: 130 },
  { month: 10, normalMm: 280 },
  { month: 11, normalMm: 350 },
  { month: 12, normalMm: 180 },
];

/** NE monsoon = Oct–Dec; SW monsoon = Jun–Sep (Chennai definitions). */
export type MonsoonSeason = "NE" | "SW" | "winter" | "summer";

export function seasonForMonth(month: number): MonsoonSeason {
  if (month >= 10) return "NE";
  if (month >= 6) return "SW";
  if (month <= 2) return "winter";
  return "summer";
}

/** Normal rainfall for an IST date key's month (mm). */
export function normalForDateKey(dateKey: string): number {
  const month = Number(dateKey.split("-")[1]);
  return CHENNAI_MONTHLY_NORMALS.find((n) => n.month === month)?.normalMm ?? 0;
}

/**
 * Anomaly classification for a single day vs its monthly normal
 * (pro-rated: normal/30 per day). Multiple of the daily-expected value.
 */
export function anomalyForDay(dayMm: number, dateKey: string): {
  ratio: number;
  label: "NORMAL" | "ABOVE" | "EXTREME";
} {
  const expected = normalForDateKey(dateKey) / 30;
  const ratio = expected > 0 ? dayMm / expected : 0;
  if (ratio >= 3) return { ratio: Math.round(ratio * 10) / 10, label: "EXTREME" };
  if (ratio >= 1.5) return { ratio: Math.round(ratio * 10) / 10, label: "ABOVE" };
  return { ratio: Math.round(ratio * 10) / 10, label: "NORMAL" };
}

export function seasonLabel(season: MonsoonSeason): string {
  switch (season) {
    case "NE": return "NE monsoon (Oct–Dec)";
    case "SW": return "SW monsoon (Jun–Sep)";
    case "winter": return "Winter (Jan–Feb)";
    case "summer": return "Summer (Mar–May)";
  }
}

/** Departure % of actual vs normal, rounded. */
export function departurePct(actualMm: number, normalMm: number): number {
  if (normalMm <= 0) return 0;
  return Math.round(((actualMm - normalMm) / normalMm) * 100);
}

/** Monsoon-season normal totals (sum of the member months). */
export function seasonNormal(season: "NE" | "SW"): number {
  const months = season === "NE" ? [10, 11, 12] : [6, 7, 8, 9];
  return CHENNAI_MONTHLY_NORMALS.filter((n) => months.includes(n.month)).reduce(
    (a, n) => a + n.normalMm,
    0
  );
}
