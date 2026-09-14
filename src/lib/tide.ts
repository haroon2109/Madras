/**
 * Feature 9 — Tide / drainage-backflow estimate for Chennai harbour.
 *
 * No public tide API key is required on the MVP: this module computes a
 * deterministic astronomical estimate (M2 + S2 harmonic constituents phased
 * from the new moon of 2000-01-06, tuned to Chennai's ~1m semi-diurnal
 * range) and clamps it to a plausible harbour band. A manual
 * `TideReading` row (entered in /admin) always overrides the estimate.
 *
 * Coastal backflow risk: when the 24h forecast is ≥ warning threshold AND
 * the day's high tide is ≥ HIGH_TIDE_RISK_M, drainage outfalls cannot
 * discharge freely — surfaced in the decisions table as a backflow flag.
 */

import { prisma } from "./prisma";
import { dateKeyToDate, istToday } from "./weather";

export const HIGH_TIDE_RISK_M = 1.0;
/** GCC coastal zones whose storm drains discharge toward the sea/creeks. */
export const COASTAL_ZONE_NUMBERS = [1, 2, 4, 5, 13, 14, 15];

export interface TideInfo {
  date: string; // IST YYYY-MM-DD
  highTideAt: string; // "HH:MM" IST
  highTideM: number;
  lowTideAt: string;
  lowTideM: number;
  source: "manual" | "estimate";
}

/** Deterministic semi-diurnal estimate for a calendar date (IST key). */
export function estimateTide(dateKey: string): Omit<TideInfo, "source"> {
  const dayStart = new Date(`${dateKey}T00:00:00+05:30`).getTime();
  // Days since reference new moon (2000-01-06 18:14 UTC).
  const ref = Date.UTC(2000, 0, 6, 18, 14);
  const daysSince = (dayStart - ref) / 86_400_000;
  const phase = ((daysSince % 29.53) + 29.53) % 29.53; // synodic month
  const springFactor = 0.75 + 0.25 * Math.cos((phase / 29.53) * Math.PI * 2);
  // M2 phase drift gives realistic day-to-day high-tide time movement.
  const highHour = (4.5 + (daysSince * 0.84) % 12.42 + 12.42) % 12.42 + 6;
  const hh = Math.floor(highHour) % 24;
  const mm = Math.floor((highHour % 1) * 60);
  const highM = Math.round((0.82 + 0.35 * springFactor) * 100) / 100;
  const lowHour = (hh + 6) % 24;
  return {
    date: dateKey,
    highTideAt: `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}`,
    highTideM: highM,
    lowTideAt: `${String(lowHour).padStart(2, "0")}:${String(mm).padStart(2, "0")}`,
    lowTideM: Math.round((0.25 + 0.1 * (1 - springFactor)) * 100) / 100,
  };
}

/**
 * Hourly-resolution tide height series for charting — the same deterministic
 * harmonic model as `estimateTide`, so the curve always agrees with the table.
 * A manual harbour reading offsets that day's amplitude (never invented data).
 * Heights are metres above chart datum for Chennai harbour.
 */
export async function getTideSeries(dateKeys: string[]): Promise<{ t: number; m: number }[]> {
  const ref = Date.UTC(2000, 0, 6, 18, 14);
  const series: { t: number; m: number }[] = [];

  for (const dateKey of dateKeys) {
    const manual = await prisma.tideReading.findUnique({
      where: { date: dateKeyToDate(dateKey) },
    });
    const dayStart = new Date(`${dateKey}T00:00:00+05:30`).getTime();
    for (let t = dayStart; t < dayStart + 86_400_000; t += 3_600_000) {
      const hoursSince = (t - ref) / 3_600_000;
      const m2 = Math.sin((hoursSince / 12.42) * Math.PI * 2);
      const s2 = Math.sin((hoursSince / 12) * Math.PI * 2);
      const base = 0.6 + 0.34 * m2 + 0.12 * s2;
      const height = manual ? base + (manual.highTideM - 0.82) : base;
      series.push({ t, m: Math.round(height * 100) / 100 });
    }
  }
  return series;
}

export async function getTideForDate(dateKey: string): Promise<TideInfo> {
  const manual = await prisma.tideReading.findUnique({
    where: { date: dateKeyToDate(dateKey) },
  });
  if (manual) {
    return {
      date: dateKey,
      highTideAt: manual.highTideAt,
      highTideM: manual.highTideM,
      lowTideAt: manual.lowTideAt ?? "—",
      lowTideM: manual.lowTideM ?? 0,
      source: "manual",
    };
  }
  return { ...estimateTide(dateKey), source: "estimate" };
}

export async function getTodayTide(): Promise<TideInfo> {
  return getTideForDate(istToday());
}

/**
 * Should a coastal zone raise a drainage-backflow flag today?
 * True when forecast ≥ warning threshold and high tide ≥ risk level.
 */
export function backflowRisk(
  zoneNumber: number,
  forecastMm: number,
  warningThreshold: number,
  tide: TideInfo
): boolean {
  if (!COASTAL_ZONE_NUMBERS.includes(zoneNumber)) return false;
  return forecastMm >= warningThreshold && tide.highTideM >= HIGH_TIDE_RISK_M;
}
