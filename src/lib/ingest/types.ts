/**
 * Shared types for the Open-Meteo weather ingestion layer.
 * ECMWF and GFS are separate Open-Meteo models served by the same API.
 */

export type WeatherModelId = "ecmwf" | "gfs";

/** The exact Open-Meteo `models=` parameter for each ingestion service. */
export const OPEN_METEO_MODELS: Record<WeatherModelId, string> = {
  ecmwf: "ecmwf_ifs04",
  gfs: "gfs_seamless",
};

/** A Chennai zone as consumed by the ingestion layer. */
export interface IngestZone {
  id: string;
  number: number;
  name: string;
  latitude: number;
  longitude: number;
}

/** Subset of the Open-Meteo `/v1/forecast` hourly response we rely on. */
export interface OpenMeteoHourly {
  time: string[];
  precipitation: number[];
  precipitation_probability?: number[];
  temperature_2m?: number[];
  wind_speed_10m?: number[];
}

export interface OpenMeteoHourlyResponse {
  latitude: number;
  longitude: number;
  generationtime_ms?: number;
  utc_offset_seconds?: number;
  timezone?: string;
  timezone_abbreviation?: string;
  elevation?: number;
  hourly_units?: Record<string, string>;
  hourly?: OpenMeteoHourly;
  error?: boolean;
  reason?: string;
}

/** One successfully ingested hourly series (the parsed view of a raw response). */
export interface HourlySeries {
  model: WeatherModelId;
  zoneId: string;
  zoneNumber: number;
  zoneName: string;
  latitude: number;
  longitude: number;
  /** ISO timestamps (Asia/Kolkata, hourly), parallel to `precipitationMm`. */
  times: string[];
  precipitationMm: number[];
  precipitationProbPct: number[];
  temperature2mC: number[];
  windSpeed10mKmh: number[];
  /** Raw response file stored under data/raw, relative to project root. */
  rawFile: string;
  fetchedAt: string;
}

/** Per-zone × per-model outcome of an ingestion run. */
export interface ZoneModelResult {
  zoneNumber: number;
  zoneName: string;
  model: WeatherModelId;
  ok: boolean;
  hours?: number;
  /** Total precipitation over the fetched window, derived from API values only. */
  totalMm?: number;
  /** Sum of the 24 hours starting at the first forecast hour (i.e. today, IST). */
  todayMm?: number;
  maxHourlyMm?: number;
  rawFile?: string;
  error?: string;
  attempts?: number;
}

export interface IngestSummary {
  startedAt: string;
  finishedAt: string;
  durationMs: number;
  zones: number;
  results: ZoneModelResult[];
  succeeded: number;
  failed: number;
  rawFilesWritten: number;
}