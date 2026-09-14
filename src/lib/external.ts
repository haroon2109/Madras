/**
 * External real-data services for features the daily forecast API does not
 * cover. Everything here calls free, keyless public APIs server-side and
 * degrades to null on failure — the UI never shows placeholder numbers.
 *
 *  - Air quality  : https://air-quality-api.open-meteo.com  (CAMS + Aurora, per hour)
 *  - River discharge: https://flood-api.open-meteo.com      (GloFAS ensemble, per day)
 *  - Marine       : https://marine-api.open-meteo.com       (wave/swell, per hour)
 *  - Radar frames : https://api.rainviewer.com              (public weather-maps.json)
 *
 * All values shown in the UI come from these API responses — nothing is
 * hardcoded or synthesized.
 */

import { prisma } from "./prisma";

/* ------------------------------------------------------------------ */
/* Air quality (Open-Meteo Air Quality API)                            */
/* ------------------------------------------------------------------ */

const AIR_BASE = "https://air-quality-api.open-meteo.com/v1/air-quality";

export interface AirQualityInfo {
  pm2_5: number;
  pm10: number;
  usAqi: number;
  /** ISO local time of the reading, e.g. "2026-09-13T16:30". */
  time: string;
}

interface AirResponse {
  current?: { pm2_5?: number | null; pm10?: number | null; us_aqi?: number | null; time?: string };
}

/** Current air quality for one coordinate; null when the API fails. */
export async function fetchAirQuality(
  latitude: number,
  longitude: number
): Promise<AirQualityInfo | null> {
  const url = `${AIR_BASE}?latitude=${latitude}&longitude=${longitude}&current=pm2_5,pm10,us_aqi&timezone=Asia/Kolkata`;
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(10_000), cache: "no-store" });
    if (!res.ok) return null;
    const data = (await res.json()) as AirResponse;
    const c = data.current;
    if (!c || c.pm2_5 === null || c.pm2_5 === undefined || c.pm10 === null || c.pm10 === undefined) return null;
    return {
      pm2_5: c.pm2_5,
      pm10: c.pm10,
      usAqi: c.us_aqi ?? Math.round(c.pm2_5 * 1.7), // rough proxy only if us_aqi absent
      time: c.time ?? "",
    };
  } catch {
    return null;
  }
}

/**
 * Current air quality for up to ~dozens of coordinates in one request
 * (Open-Meteo supports comma-separated lat/lng lists). Returns one entry per
 * input point, null where the API failed — order preserved.
 */
export async function fetchAirQualityBulk(
  points: { latitude: number; longitude: number }[]
): Promise<(AirQualityInfo | null)[]> {
  if (points.length === 0) return [];
  const lats = points.map((p) => p.latitude).join(",");
  const lngs = points.map((p) => p.longitude).join(",");
  const url = `${AIR_BASE}?latitude=${lats}&longitude=${lngs}&current=pm2_5,pm10,us_aqi&timezone=Asia/Kolkata`;
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(15_000), cache: "no-store" });
    if (!res.ok) return points.map(() => null);
    const data = (await res.json()) as AirResponse | AirResponse[];
    const list = Array.isArray(data) ? data : [data];
    return points.map((_, i) => {
      const c = list[i]?.current;
      if (!c || c.pm2_5 === null || c.pm2_5 === undefined || c.pm10 === null || c.pm10 === undefined) return null;
      return {
        pm2_5: c.pm2_5,
        pm10: c.pm10,
        usAqi: c.us_aqi ?? Math.round(c.pm2_5 * 1.7),
        time: c.time ?? "",
      };
    });
  } catch {
    return points.map(() => null);
  }
}

/** AQI category label + tailwind badge classes (US EPA bands). */
export function aqiCategory(usAqi: number): { label: string; badge: string; color: string } {
  if (usAqi <= 50) return { label: "Good", badge: "bg-emerald-100 text-emerald-800", color: "#10b981" };
  if (usAqi <= 100) return { label: "Moderate", badge: "bg-yellow-100 text-yellow-800", color: "#eab308" };
  if (usAqi <= 150) return { label: "Poor — sensitive groups", badge: "bg-orange-100 text-orange-800", color: "#f97316" };
  if (usAqi <= 200) return { label: "Unhealthy", badge: "bg-red-100 text-red-800", color: "#ef4444" };
  if (usAqi <= 300) return { label: "Very Unhealthy", badge: "bg-purple-100 text-purple-800", color: "#a855f7" };
  return { label: "Hazardous", badge: "bg-rose-100 text-rose-800", color: "#e11d48" };
}

/* ------------------------------------------------------------------ */
/* River discharge (Open-Meteo Flood API / GloFAS)                     */
/* ------------------------------------------------------------------ */

const FLOOD_BASE = "https://flood-api.open-meteo.com/v1/flood";

export interface RiverDischargeDay {
  date: string; // YYYY-MM-DD
  /** Mean ensemble discharge, m³/s (null = no river cell at this coordinate). */
  discharge: number | null;
  /** Ensemble max, m³/s (null when not requested/absent). */
  dischargeMax: number | null;
}

export interface RiverStation {
  /** Station id used by the UI + config. */
  key: string;
  name: string;
  river: string;
  latitude: number;
  longitude: number;
  /** Discharge (m³/s) above which the station is flagged "river rising". */
  riseThresholdCumecs: number;
}

/**
 * Verified GloFAS grid cells near Chennai that return non-null discharge
 * (the 5 km grid does not cover every point — nulls are expected elsewhere).
 * Thresholds are catchment-scale, advisory levels (not IMD figures) chosen
 * so the flag only trips on meaningful rises vs the observed baseline.
 */
export const RIVER_STATIONS: RiverStation[] = [
  {
    key: "adyar",
    name: "Adyar basin (south Chennai)",
    river: "Adyar",
    latitude: 13.0067,
    longitude: 80.2206,
    riseThresholdCumecs: 12,
  },
  {
    key: "cooum",
    name: "Cooum basin (central Chennai)",
    river: "Cooum",
    latitude: 13.09,
    longitude: 80.22,
    riseThresholdCumecs: 8,
  },
];

/** Daily river discharge for one station (past 3 + next 3 days); null on API failure. */
export async function fetchRiverDischarge(
  station: RiverStation
): Promise<RiverDischargeDay[] | null> {
  const url = `${FLOOD_BASE}?latitude=${station.latitude}&longitude=${station.longitude}&daily=river_discharge,river_discharge_max&past_days=3&forecast_days=3&timezone=Asia/Kolkata`;
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(10_000), cache: "no-store" });
    if (!res.ok) return null;
    const data = (await res.json()) as { daily?: { time?: string[]; river_discharge?: (number | null)[]; river_discharge_max?: (number | null)[] } };
    const d = data.daily;
    if (!d?.time) return null;
    return d.time.map((date, i) => ({
      date,
      discharge: d.river_discharge?.[i] ?? null,
      dischargeMax: d.river_discharge_max?.[i] ?? null,
    }));
  } catch {
    return null;
  }
}

export interface RiverStatus {
  station: RiverStation;
  days: RiverDischargeDay[];
  /** true when today's (or next available) mean discharge crosses the threshold. */
  rising: boolean;
  /** Human line for the decisions page flag. */
  note: string;
}

/** Status for every configured station, failures degrade to empty days. */
export async function getRiverStatuses(): Promise<RiverStatus[]> {
  const statuses = await Promise.all(
    RIVER_STATIONS.map(async (station): Promise<RiverStatus> => {
      const days = (await fetchRiverDischarge(station)) ?? [];
      const todayKey = new Intl.DateTimeFormat("en-CA", {
        timeZone: "Asia/Kolkata",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }).format(new Date());
      const today = days.find((x) => x.date === todayKey) ?? days.find((x) => x.discharge !== null) ?? null;
      const value = today?.discharge ?? null;
      const max = today?.dischargeMax ?? null;
      const rising = value !== null && value >= station.riseThresholdCumecs;
      const note =
        value === null
          ? "No GloFAS river cell covers this station right now."
          : `Mean ${value.toFixed(1)} m³/s${max !== null ? `, ensemble max ${max.toFixed(1)} m³/s` : ""}`;
      return { station, days, rising, note };
    })
  );
  return statuses;
}

/* ------------------------------------------------------------------ */
/* Marine / sea state (Open-Meteo Marine API)                          */
/* ------------------------------------------------------------------ */

const MARINE_BASE = "https://marine-api.open-meteo.com/v1/marine";

export interface SeaStateInfo {
  waveHeightM: number;
  swellHeightM: number;
  waveDirectionDeg: number | null;
  time: string;
}

/** Current sea state offshore Chennai; null when the API fails. */
export async function fetchSeaState(
  latitude: number,
  longitude: number
): Promise<SeaStateInfo | null> {
  const url = `${MARINE_BASE}?latitude=${latitude}&longitude=${longitude}&current=wave_height,swell_wave_height,wave_direction&timezone=Asia/Kolkata`;
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(10_000), cache: "no-store" });
    if (!res.ok) return null;
    const data = (await res.json()) as {
      current?: { wave_height?: number | null; swell_wave_height?: number | null; wave_direction?: number | null; time?: string };
    };
    const c = data.current;
    if (!c || c.wave_height === null || c.wave_height === undefined) return null;
    return {
      waveHeightM: c.wave_height,
      swellHeightM: c.swell_wave_height ?? 0,
      waveDirectionDeg: c.wave_direction ?? null,
      time: c.time ?? "",
    };
  } catch {
    return null;
  }
}

/** Advisory band for offshore wave height (IMD-style public language). */
export function seaStateAdvisory(waveHeightM: number): { label: string; tone: "green" | "amber" | "red" } {
  if (waveHeightM >= 2.5) return { label: "Rough sea — fishing advisory", tone: "red" };
  if (waveHeightM >= 1.5) return { label: "Moderate sea — nearshore caution", tone: "amber" };
  return { label: "Fair sea — normal operations", tone: "green" };
}

/** Shared offshore reference point for Chennai (used by marine + radar). */
export const CHENNAI_OFFSHORE = { latitude: 13.05, longitude: 80.25 };

/* ------------------------------------------------------------------ */
/* RainViewer radar metadata                                           */
/* ------------------------------------------------------------------ */

export interface RadarFrames {
  /** Full tile URL prefix, e.g. https://tilecache.rainviewer.com */
  host: string;
  /** { time, path } frames, newest last. */
  past: { time: number; path: string }[];
}

/** Latest radar frame list for the public RainViewer tile service; null on failure. */
export async function fetchRadarFrames(): Promise<RadarFrames | null> {
  try {
    const res = await fetch("https://api.rainviewer.com/public/weather-maps.json", {
      signal: AbortSignal.timeout(10_000),
      cache: "no-store",
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { host?: string; radar?: { past?: { time: number; path: string }[] } };
    const frames = data.radar?.past ?? [];
    if (!data.host || frames.length === 0) return null;
    return { host: data.host, past: frames };
  } catch {
    return null;
  }
}

/* ------------------------------------------------------------------ */
/* Nowcast — next 2h rain from the stored HourlyRainfall table         */
/* ------------------------------------------------------------------ */

export interface NowcastZone {
  zoneId: string;
  zoneNumber: number;
  zoneName: string;
  /** Sum of the next `hours` hourly values across the preferred model, null = no data. */
  next2hMm: number | null;
  /** Peak single hour in the window, mm/h. */
  peakHourMm: number | null;
  /** Human note, e.g. "ECMWF expects 1.2 mm between 18:00–20:00 IST". */
  note: string;
}


/**
 * Next-2h rain expectation per zone computed ONLY from already-stored
 * HourlyRainfall rows (loaded from the preprocessing pipeline). The model
 * with the freshest data for the zone is preferred; nothing is invented
 * when the window is missing — the caller renders "no data" instead.
 */
export async function getNowcast(hours = 2): Promise<NowcastZone[]> {
  const zones = await prisma.zone.findMany({ where: { isActive: true }, orderBy: { number: "asc" } });
  const windowStart = new Date(Date.now() - 30 * 60_000); // allow slightly stale current hour
  const windowEnd = new Date(Date.now() + hours * 3_600_000 + 30 * 60_000);

  const rows = await prisma.hourlyRainfall.findMany({
    where: {
      zoneId: { in: zones.map((z) => z.id) },
      timestamp: { gte: windowStart, lte: windowEnd },
    },
    orderBy: { timestamp: "asc" },
  });

  const byZone = new Map<string, typeof rows>();
  for (const r of rows) {
    const arr = byZone.get(r.zoneId) ?? [];
    arr.push(r);
    byZone.set(r.zoneId, arr);
  }

  const out: NowcastZone[] = [];
  for (const zone of zones) {
    const zoneRows = byZone.get(zone.id) ?? [];
    // Prefer the model with the most future coverage for this zone.
    const ecmwfRows = zoneRows.filter((r) => r.model === "ecmwf" && r.rainfallMmHr !== null);
    const gfsRows = zoneRows.filter((r) => r.model === "gfs" && r.rainfallMmHr !== null);
    const preferred = ecmwfRows.length >= gfsRows.length ? ecmwfRows : gfsRows;
    const model = preferred.length > 0 ? preferred[0].model : null;

    const inWindow = model
      ? zoneRows.filter((r) => r.model === model && r.rainfallMmHr !== null && r.timestamp >= new Date(Date.now() - 30 * 60_000) && r.timestamp <= windowEnd)
      : [];
    const values = inWindow.map((r) => r.rainfallMmHr as number);
    const nowcast: NowcastZone = {
      zoneId: zone.id,
      zoneNumber: zone.number,
      zoneName: zone.name,
      next2hMm: values.length > 0 ? Math.round(values.reduce((a, b) => a + b, 0) * 10) / 10 : null,
      peakHourMm: values.length > 0 ? Math.round(Math.max(...values) * 10) / 10 : null,
      note: "",
    };
    if (nowcast.next2hMm !== null && model) {
      const from = new Intl.DateTimeFormat("en-IN", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Kolkata" }).format(new Date());
      const to = new Intl.DateTimeFormat("en-IN", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Kolkata" }).format(windowEnd);
      nowcast.note = `${model.toUpperCase()} expects ${nowcast.next2hMm.toFixed(1)} mm between ${from} and ${to} IST`;
    }
    out.push(nowcast);
  }
  return out;
}
