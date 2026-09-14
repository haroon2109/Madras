/**
 * Weather ingestion layer (Open-Meteo).
 *
 * Separate ECMWF and GFS services fetch hourly precipitation forecasts for
 * the Chennai zone coordinates; every raw response is archived under
 * data/raw. All values come from the API — nothing is hardcoded.
 */

export { fetchEcmwfHourly, ECMWF_MODEL } from "./ecmwf";
export { fetchGfsHourly, GFS_MODEL } from "./gfs";
export { ingestAllZones, getIngestZones } from "./runner";
export type { IngestOptions } from "./runner";
export { fetchOpenMeteo, buildForecastUrl, DEFAULT_BASE_URL } from "./client";
export { RawStorage, slugify } from "./storage";
export { createLogger, logger } from "./logger";
export type { Logger, LoggerOptions } from "./logger";
export type {
  WeatherModelId,
  IngestZone,
  HourlySeries,
  ZoneModelResult,
  IngestSummary,
  OpenMeteoHourlyResponse,
  OpenMeteoHourly,
} from "./types";
export type { HourlyFetchOptions, HourlyFetchOutcome } from "./forecast";
export type { FetchResult, FetchOptions, ForecastQuery } from "./client";
export type { StorageOptions, StoredFile } from "./storage";