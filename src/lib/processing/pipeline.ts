/**
 * Preprocessing pipeline orchestration.
 *
 * Reads every raw ECMWF/GFS archive file under `data/raw/**`, normalizes
 * each into `RainfallRecord`s (dedup, missing/invalid handling), aggregates
 * per (timestamp, zone_id, model), validates, and writes CSV output.
 * One bad file never aborts the run — failures are reported per file.
 */

import { readFileSync, readdirSync } from "node:fs";
import { join, relative } from "node:path";

import { type ModelId, type RainfallRecord, type ProcessingReport } from "./schema";
import { normalizeRawResponse } from "./normalize";
import { writeCsv } from "./csv";
import { assertValidOutput } from "./validate";

/** Default output location (gitignored data dir, like data/raw). */
export const DEFAULT_OUTPUT_CSV = "data/processed/rainfall.csv";

/** Default CSV the Prisma loader consumes (same file the pipeline writes). */
export const DEFAULT_LOAD_CSV = DEFAULT_OUTPUT_CSV;

export interface ProcessOptions {
  /** Root of the raw archive; defaults to data/raw (or INGEST_RAW_DIR). */
  rawDir?: string;
  /** Output CSV path; defaults to data/processed/rainfall.csv. */
  outputPath?: string;
  /** Restrict to one model; default: both. */
  model?: ModelId;
  /** Restrict to zone ids, e.g. ["zone-01"]; default: all. */
  zoneIds?: string[];
  /** Restrict to files whose JSON was written on/after this UTC date (YYYY-MM-DD, matches dir names). */
  sinceDate?: string;
  /** Skip the final assertValidOutput gate (not recommended). */
  skipValidation?: boolean;
}

interface NormalizeTotals {
  invalidValues: number;
  missingValues: number;
  duplicatesRemoved: number;
  rowsDroppedOutOfRange: number;
}

function emptyTotals(): NormalizeTotals {
  return { invalidValues: 0, missingValues: 0, duplicatesRemoved: 0, rowsDroppedOutOfRange: 0 };
}

type NormalizeFileResultLike = {
  invalidValues: number;
  missingValues: number;
  duplicatesRemoved: number;
  rowsDroppedOutOfRange: number;
};

function mergeTotals(totals: NormalizeTotals, norm: NormalizeFileResultLike): void {
  totals.invalidValues += norm.invalidValues;
  totals.missingValues += norm.missingValues;
  totals.duplicatesRemoved += norm.duplicatesRemoved;
  totals.rowsDroppedOutOfRange += norm.rowsDroppedOutOfRange;
}

/** Recursively list *.json files under `dir`. */
function listJsonFiles(dir: string): string[] {
  const files: string[] = [];
  try {
    const entries = readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const full = join(dir, entry.name);
      if (entry.isDirectory()) {
        files.push(...listJsonFiles(full));
      } else if (entry.name.endsWith(".json") && !entry.name.startsWith(".")) {
        files.push(full);
      }
    }
  } catch {
    // Unreadable/missing dir → treated as empty archive.
  }
  return files.sort();
}

/** Aggregate + dedup records across files per (timestamp, zone_id, model); first file wins. */
export function dedupeRecords(records: RainfallRecord[]): { records: RainfallRecord[]; duplicatesRemoved: number } {
  const seen = new Set<string>();
  const out: RainfallRecord[] = [];
  let duplicatesRemoved = 0;
  for (const r of records) {
    const key = `${r.timestamp}|${r.zone_id}|${r.model}`;
    if (seen.has(key)) {
      duplicatesRemoved++;
      continue;
    }
    seen.add(key);
    out.push(r);
  }
  return { records: out, duplicatesRemoved };
}

/** Stable sort: timestamp → zone_id → model (so output is deterministic). */
export function sortRecords(records: RainfallRecord[]): RainfallRecord[] {
  return [...records].sort((a, b) => {
    if (a.timestamp !== b.timestamp) return a.timestamp < b.timestamp ? -1 : 1;
    if (a.zone_id !== b.zone_id) return a.zone_id < b.zone_id ? -1 : 1;
    return a.model < b.model ? -1 : a.model > b.model ? 1 : 0;
  });
}

/**
 * Run the full pipeline. Never throws for per-file problems — those are
 * collected in the report. Throws only if the final validation gate fails.
 */
export async function runProcessing(options: ProcessOptions = {}): Promise<ProcessingReport> {
  const startedAt = new Date().toISOString();
  const startMs = Date.now();
  const rawDir = options.rawDir ?? process.env.INGEST_RAW_DIR ?? "data/raw";
  const outputPath = options.outputPath ?? DEFAULT_OUTPUT_CSV;

  const failures: ProcessingReport["failures"] = [];
  const totals = emptyTotals();
  const byModel: ProcessingReport["byModel"] = {
    ecmwf: { rows: 0, files: 0 },
    gfs: { rows: 0, files: 0 },
  };
  const allRecords: RainfallRecord[] = [];
  let filesScanned = 0;
  let filesParsed = 0;

  for (const file of listJsonFiles(rawDir)) {
    filesScanned++;
    const rel = relative(rawDir, file);
    try {
      const json: unknown = JSON.parse(readFileSync(file, "utf8"));
      const norm = normalizeRawResponse(json, rel);

      if (options.model && norm.records.length > 0 && norm.records[0].model !== options.model) {
        continue; // filtered out by model selection
      }
      if (options.zoneIds && norm.records.length > 0 && !options.zoneIds.includes(norm.records[0].zone_id)) {
        continue; // filtered out by zone selection
      }
      if (options.sinceDate && rel.includes(options.sinceDate) === false) {
        continue; // filtered out by date (path segment)
      }

      if (!norm.ok) {
        failures.push({ file: norm.file || rel, reason: norm.reason ?? "unknown" });
        continue;
      }

      filesParsed++;
      byModel[norm.records[0].model].files++;
      byModel[norm.records[0].model].rows += norm.records.length;
      allRecords.push(...norm.records);
      mergeTotals(totals, norm);
    } catch (e) {
      failures.push({ file: rel, reason: `unreadable JSON: ${(e as Error).message}` });
    }
  }

  const { records: deduped, duplicatesRemoved } = dedupeRecords(allRecords);
  const records = sortRecords(deduped);
  const duplicatesRemovedTotal = totals.duplicatesRemoved + duplicatesRemoved;

  const report: ProcessingReport = {
    filesScanned,
    filesParsed,
    filesFailed: failures.length,
    failures,
    rowsEmitted: records.length,
    invalidValues: totals.invalidValues,
    missingValues: totals.missingValues,
    duplicatesRemoved: duplicatesRemovedTotal,
    rowsDroppedOutOfRange: totals.rowsDroppedOutOfRange,
    gapsDetected: detectGaps(records),
    byModel,
    startedAt,
    finishedAt: new Date().toISOString(),
    durationMs: Date.now() - startMs,
  };

  if (!options.skipValidation) {
    assertValidOutput(records);
  }

  await writeCsv(outputPath, records);
  return report;
}

/** Count hour-gaps inside each (zone, model) series (by UTC hour buckets). */
export function detectGaps(records: RainfallRecord[]): number {
  const bySeries = new Map<string, Set<number>>();
  for (const r of records) {
    if (r.rainfall_mm_hr === null) continue; // null rows are tracked separately
    const key = `${r.zone_id}|${r.model}`;
    const bucket = Math.floor(new Date(r.timestamp).getTime() / 3_600_000);
    if (!bySeries.has(key)) bySeries.set(key, new Set());
    bySeries.get(key)!.add(bucket);
  }
  let gaps = 0;
  for (const buckets of bySeries.values()) {
    if (buckets.size < 2) continue;
    const sorted = [...buckets].sort((a, b) => a - b);
    for (let i = 1; i < sorted.length; i++) {
      gaps += sorted[i] - sorted[i - 1] - 1;
    }
  }
  return gaps;
}
