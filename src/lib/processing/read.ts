/**
 * CSV reader for processed rainfall output.
 *
 * Parses files written by `writeCsv` back into `RainfallRecord`s: skips
 * leading `#` comment lines, validates the header, and restores types
 * (null rainfall for empty fields). Used by round-trip tests and by any
 * downstream consumer that prefers reading the processed artifact over
 * re-running the pipeline.
 */

import { readFileSync } from "node:fs";

import { RECORD_COLUMNS, type ModelId, type RainfallRecord } from "./schema";

/** Parse CSV text (as written by `writeCsv`) into RainfallRecords. */
export function parseCsvRecords(text: string): RainfallRecord[] {
  const lines = text.split(/\r?\n/).filter((l) => l.length > 0 && !l.startsWith("#"));
  if (lines.length === 0) return [];

  const header = lines[0].split(",");
  if (header.join(",") !== RECORD_COLUMNS.join(",")) {
    throw new Error(`unexpected CSV header: "${lines[0]}"`);
  }

  const records: RainfallRecord[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(",");
    if (cols.length !== RECORD_COLUMNS.length) {
      throw new Error(`row ${i}: expected ${RECORD_COLUMNS.length} columns, got ${cols.length}`);
    }
    records.push({
      timestamp: cols[0],
      zone_id: cols[1],
      model: cols[2] as ModelId,
      rainfall_mm_hr: cols[3] === "" ? null : Number(cols[3]),
    });
  }
  return records;
}

/** Read a processed CSV file from disk into RainfallRecords. */
export function readCsvRecords(path: string): RainfallRecord[] {
  return parseCsvRecords(readFileSync(path, "utf8"));
}
