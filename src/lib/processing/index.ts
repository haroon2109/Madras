/**
 * Meteorological preprocessing pipeline (ECMWF + GFS → common schema).
 *
 * Public API:
 *   runProcessing()            — full pipeline over data/raw → CSV + report
 *   normalizeRawResponse()     — one raw file → RainfallRecords
 *   writeCsv / appendCsv       — RFC 4180 output writers
 *   validateRecords / validateZoneCoverage / assertValidOutput
 */

export { runProcessing, dedupeRecords, sortRecords, detectGaps, DEFAULT_OUTPUT_CSV, DEFAULT_LOAD_CSV } from "./pipeline";
export type { ProcessOptions } from "./pipeline";
export { loadProcessedCsv } from "./load";
export type { LoadReport, LoadOptions } from "./load";
export { parseCsvRecords, readCsvRecords } from "./read";
export {
  normalizeRawResponse,
  normalizeRainfallValue,
  normalizeTimestamp,
  isApiErrorEnvelope,
  MAX_PLAUSIBLE_MM_HR,
} from "./normalize";
export type { RawArchiveEnvelope, NormalizeFileResult } from "./normalize";
export { writeCsv, appendCsv, createCsvWriteStream, recordToCsvLine, csvHeader } from "./csv";
export { validateRecords, validateZoneCoverage, assertValidOutput, validateCsvRoundTrip } from "./validate";
export type { RecordValidation } from "./validate";
export {
  MODELS,
  RECORD_COLUMNS,
  SCHEMA_VERSION,
  type ModelId,
  type RainfallRecord,
  type ProcessingReport,
} from "./schema";
