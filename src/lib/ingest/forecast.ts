/**
 * Shared hourly-forecast fetch used by the ECMWF and GFS services.
 * Each service wires this helper to its own Open-Meteo model so the two
 * ingestion paths stay independent (separate URLs, separate raw archives).
 */

import { fetchOpenMeteo, buildForecastUrl, DEFAULT_BASE_URL } from "./client";
import { createLogger, type Logger } from "./logger";
import { RawStorage } from "./storage";
import {
  type IngestZone,
  type WeatherModelId,
  type OpenMeteoHourlyResponse,
  type HourlySeries,
} from "./types";

/** Hourly variables requested from Open-Meteo for every model. */
export const HOURLY_VARIABLES =
  "precipitation,precipitation_probability,temperature_2m,wind_speed_10m";

export const DEFAULT_FORECAST_DAYS = 7;

export interface HourlyFetchOptions {
  baseUrl?: string;
  timeoutMs?: number;
  maxAttempts?: number;
  forecastDays?: number;
  logger?: Logger;
  /** When true, skip writing the raw response to data/raw (used by tests). */
  skipStorage?: boolean;
}

export interface HourlyFetchOutcome {
  ok: boolean;
  series: HourlySeries | null;
  attempts: number;
  error?: string;
  status: number | null;
  rawFile?: string;
}

function asNumberArray(v: unknown): number[] {
  return Array.isArray(v) ? (v as number[]).map((x) => Number(x)) : [];
}

function toIsoLocal(times: string[]): string[] {
  return times.map((t) => {
    // Open-Meteo returns "YYYY-MM-DDTHH:00" in the requested timezone;
    // normalize to a zoned ISO string so consumers can format per-locale.
    return t.length === 16 ? `${t}:00+05:30` : t;
  });
}

export async function fetchModelHourly(
  model: WeatherModelId,
  zone: IngestZone,
  options: HourlyFetchOptions = {}
): Promise<HourlyFetchOutcome> {
  const log = options.logger ?? createLogger();
  const logCtx = { model, zone: zone.name, lat: zone.latitude, lon: zone.longitude };
  const baseUrl = options.baseUrl ?? process.env.OPEN_METEO_BASE_URL ?? DEFAULT_BASE_URL;
  const forecastDays = options.forecastDays ?? DEFAULT_FORECAST_DAYS;

  const url = buildForecastUrl(baseUrl, {
    latitude: zone.latitude,
    longitude: zone.longitude,
    model,
    hourly: HOURLY_VARIABLES,
    timezone: "Asia/Kolkata",
    forecastDays,
  });

  const res = await fetchOpenMeteo(url, {
    timeoutMs: options.timeoutMs,
    maxAttempts: options.maxAttempts,
    logger: log,
  });

  if (!res.ok) {
    log.error("hourly forecast fetch failed", { ...logCtx, error: res.error, attempts: res.attempts });
    return {
      ok: false,
      series: null,
      attempts: res.attempts,
      status: res.status,
      error: res.error ?? "fetch failed",
    };
  }

  const body = res.data as OpenMeteoHourlyResponse | null;
  const hourly = body?.hourly;

  if (!hourly || !Array.isArray(hourly.time) || !Array.isArray(hourly.precipitation)) {
    const reason = body?.reason ?? "response missing hourly.precipitation";
    log.error("unexpected Open-Meteo payload", { ...logCtx, reason });
    return { ok: false, series: null, attempts: res.attempts, status: res.status, error: reason };
  }

  const n = hourly.time.length;
  if (n === 0 || hourly.precipitation.length < n) {
    const reason = "hourly series length mismatch or empty";
    log.error("invalid hourly series", { ...logCtx, reason, hours: n });
    return { ok: false, series: null, attempts: res.attempts, status: res.status, error: reason };
  }

  const storage = new RawStorage({ logger: log });
  const stored = options.skipStorage ? null : storage.saveRawResponse(model, zone, body, { forecastDays });

  const series: HourlySeries = {
    model,
    zoneId: zone.id,
    zoneNumber: zone.number,
    zoneName: zone.name,
    latitude: zone.latitude,
    longitude: zone.longitude,
    times: toIsoLocal(hourly.time),
    precipitationMm: asNumberArray(hourly.precipitation),
    precipitationProbPct: asNumberArray(hourly.precipitation_probability ?? []),
    temperature2mC: asNumberArray(hourly.temperature_2m ?? []),
    windSpeed10mKmh: asNumberArray(hourly.wind_speed_10m ?? []),
    rawFile: stored?.relPath ?? "",
    fetchedAt: new Date().toISOString(),
  };

  const totalMm = series.precipitationMm.reduce((a, b) => a + b, 0);
  const todayMm = series.precipitationMm.slice(0, 24).reduce((a, b) => a + b, 0);
  log.info("hourly forecast ingested", {
    ...logCtx,
    hours: n,
    totalMm: round1(totalMm),
    todayMm: round1(todayMm),
    rawFile: stored?.relPath ?? null,
  });

  return {
    ok: true,
    series,
    attempts: res.attempts,
    status: res.status,
    rawFile: stored?.relPath,
  };
}

function round1(v: number): number {
  return Math.round(v * 10) / 10;
}