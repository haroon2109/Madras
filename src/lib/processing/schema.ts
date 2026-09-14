/**
 * Common schema for the meteorological preprocessing pipeline.
 *
 * Every ECMWF and GFS raw response (Open-Meteo hourly archive under
 * `data/raw/`) is normalized into flat `RainfallRecord` rows:
 *
 *   timestamp       ISO-8601 UTC ("2026-09-09T09:30:00.000Z")
 *   zone_id         stable zone identifier from src/config/chennai-zones.json
 *   model           "ecmwf" | "gfs"
 *   rainfall_mm_hr  hourly precipitation (mm/h), null when missing/invalid
 *
 * The schema is intentionally minimal and model-agnostic: both weather
 * models collapse into the same four columns so downstream consumers
 * (analytics, ML training, export) never see vendor-specific shapes.
 */

/** The two weather models archived by the ingestion layer. */
export type ModelId = "ecmwf" | "gfs";

export const MODELS: readonly ModelId[] = ["ecmwf", "gfs"];

/** One normalized hourly observation/forecast row. */
export interface RainfallRecord {
  /** ISO-8601 UTC instant, e.g. "2026-09-09T09:30:00.000Z". */
  timestamp: string;
  /** Stable zone identifier, e.g. "zone-01" (from chennai-zones.json). */
  zone_id: string;
  /** Source weather model. */
  model: ModelId;
  /**
   * Hourly precipitation in mm/h. `null` when the source value was missing
   * or invalid — rows are never dropped silently, so gaps stay visible.
   */
  rainfall_mm_hr: number | null;
}

/** Column order for CSV/Parquet output. */
export const RECORD_COLUMNS = ["timestamp", "zone_id", "model", "rainfall_mm_hr"] as const;

/** Quality/processing report for one pipeline run. */
export interface ProcessingReport {
  filesScanned: number;
  filesParsed: number;
  filesFailed: number;
  /** Files rejected outright (unreadable, wrong shape) with reasons. */
  failures: { file: string; reason: string }[];
  rowsEmitted: number;
  /** Source values that could not be interpreted (set to null). */
  invalidValues: number;
  /** Missing source values (absent from the payload). */
  missingValues: number;
  /** Duplicate (timestamp, zone_id, model) rows removed, keeping the first. */
  duplicatesRemoved: number;
  /** Rows outside the plausible physical range, dropped. */
  rowsDroppedOutOfRange: number;
  /** Hourly timestamps per file missing from a zone×model series (gaps). */
  gapsDetected: number;
  byModel: Record<ModelId, { rows: number; files: number }>;
  startedAt: string;
  finishedAt: string;
  durationMs: number;
}

/** CSV/Parquet output header comment + ordering are derived from this. */
export const SCHEMA_VERSION = 1;
