import { prisma } from "./prisma";
import { riskLevelFor } from "./risk";

const BASE_URL =
  process.env.OPEN_METEO_BASE_URL ?? "https://api.open-meteo.com/v1/forecast";

export interface DailyForecast {
  /** Calendar date (Asia/Kolkata) as YYYY-MM-DD */
  date: string;
  precipSumMm: number;
  precipProbMax: number;
  tempMaxC: number;
  tempMinC: number;
  windMaxKmh: number;
}

/** Parse "YYYY-MM-DD" into a Date at UTC midnight (used as a calendar-date key). */
export function dateKeyToDate(key: string): Date {
  return new Date(`${key}T00:00:00Z`);
}

/** Current calendar date in Asia/Kolkata as YYYY-MM-DD. */
export function istToday(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

interface OpenMeteoDaily {
  time: string[];
  precipitation_sum: number[];
  precipitation_probability_max: number[];
  temperature_2m_max: number[];
  temperature_2m_min: number[];
  wind_speed_10m_max: number[];
}

/** Fetch a daily forecast (past + future) for one zone from Open-Meteo. */
export async function fetchZoneDailyForecast(
  zone: { latitude: number; longitude: number },
  opts: { pastDays?: number; forecastDays?: number } = {}
): Promise<DailyForecast[]> {
  const { pastDays = 7, forecastDays = 7 } = opts;
  const params = new URLSearchParams({
    latitude: String(zone.latitude),
    longitude: String(zone.longitude),
    daily:
      "precipitation_sum,precipitation_probability_max,temperature_2m_max,temperature_2m_min,wind_speed_10m_max",
    timezone: "Asia/Kolkata",
    past_days: String(pastDays),
    forecast_days: String(forecastDays),
  });

  const res = await fetch(`${BASE_URL}?${params.toString()}`, {
    next: { revalidate: 1800 }, // 30 min cache
    signal: AbortSignal.timeout(15_000),
  });
  if (!res.ok) {
    throw new Error(`Open-Meteo error ${res.status} for ${zone.latitude},${zone.longitude}`);
  }

  const data = (await res.json()) as { daily?: OpenMeteoDaily };
  const d = data.daily;
  if (!d) throw new Error("Open-Meteo returned no daily data");

  const rows: DailyForecast[] = [];
  for (let i = 0; i < d.time.length; i++) {
    rows.push({
      date: d.time[i],
      precipSumMm: d.precipitation_sum[i] ?? 0,
      precipProbMax: d.precipitation_probability_max[i] ?? 0,
      tempMaxC: d.temperature_2m_max[i] ?? 0,
      tempMinC: d.temperature_2m_min[i] ?? 0,
      windMaxKmh: d.wind_speed_10m_max[i] ?? 0,
    });
  }
  return rows;
}

/**
 * Pull a fresh daily forecast for a zone from Open-Meteo and replace
 * snapshots in the database. Past days are re-fetched too, so the stored
 * "history" converges to the model's final (analysis-corrected) values
 * for each date instead of freezing at whatever the first capture said.
 */
export async function refreshZoneSnapshots(
  zone: { id: string; latitude: number; longitude: number; watchThreshold: number; warningThreshold: number; alertThreshold: number }
): Promise<{ inserted: number }> {
  const rows = await fetchZoneDailyForecast(zone, { pastDays: 14, forecastDays: 7 });

  const forecastDates = rows.map((r) => dateKeyToDate(r.date));

  await prisma.forecastSnapshot.deleteMany({
    where: { zoneId: zone.id, source: "open-meteo", forecastDate: { in: forecastDates } },
  });

  await prisma.forecastSnapshot.createMany({
    data: rows.map((r) => ({
      zoneId: zone.id,
      forecastDate: dateKeyToDate(r.date),
      capturedAt: new Date(),
      precipSumMm: r.precipSumMm,
      precipProbMax: r.precipProbMax,
      tempMaxC: r.tempMaxC,
      tempMinC: r.tempMinC,
      windMaxKmh: r.windMaxKmh,
      riskLevel: riskLevelFor(r.precipSumMm, zone),
      source: "open-meteo",
      rawJson: JSON.stringify(r),
    })),
  });

  return { inserted: rows.length };
}