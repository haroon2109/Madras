/**
 * CSV output stage (RFC 4180).
 *
 * Parquet was considered but the project has no Parquet dependency; CSV is
 * dependency-free, stable, and universally readable. The four-column schema
 * matches `RECORD_COLUMNS` exactly so a future Parquet writer can slot in
 * behind the same interface.
 */

import { createWriteStream } from "node:fs";
import { mkdir, rename, stat, writeFile } from "node:fs/promises";
import { dirname } from "node:path";

import { RECORD_COLUMNS, type RainfallRecord } from "./schema";

/** Quote a field per RFC 4180 when required (comma, quote, newline). */
function csvField(value: string): string {
  return /[",\r\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

/** Render one record as a CSV line (no trailing newline). */
export function recordToCsvLine(record: RainfallRecord): string {
  const rainfall =
    record.rainfall_mm_hr === null ? "" : formatNumber(record.rainfall_mm_hr);
  return [
    record.timestamp,
    csvField(record.zone_id),
    record.model,
    rainfall,
  ].join(",");
}

function formatNumber(n: number): string {
  // Keep precision stable and avoid float noise (0.30000000000000004).
  return String(Math.round(n * 1000) / 1000);
}

/** Write a header comment + column header (best-effort metadata block). */
export function csvHeader(): string {
  return [
    `# madras processed rainfall (schema v1)`,
    `# columns: ${RECORD_COLUMNS.join(",")}`,
    `# rainfall_mm_hr empty = missing/invalid at source; rows are UTC ISO-8601`,
    RECORD_COLUMNS.join(","),
  ].join("\n");
}

export interface CsvWriteResult {
  rowsWritten: number;
  path: string;
}

/**
 * Write records to `path`, atomically replacing any previous file.
 * Trailing-newline terminated so appends stay clean.
 */
export async function writeCsv(
  path: string,
  records: RainfallRecord[]
): Promise<CsvWriteResult> {
  const lines = [csvHeader(), ...records.map(recordToCsvLine)];
  const body = `${lines.join("\n")}\n`;
  await mkdir(dirname(path), { recursive: true });
  const tmp = `${path}.tmp`;
  await writeFile(tmp, body, "utf8");
  await rename(tmp, path);
  return { rowsWritten: records.length, path };
}

/**
 * Append records to an existing CSV (creating it with a header if needed).
 * Used by incremental runs; dedup against existing data is the caller's job.
 */
export async function appendCsv(
  path: string,
  records: RainfallRecord[]
): Promise<CsvWriteResult> {
  let exists = true;
  try {
    await stat(path);
  } catch {
    exists = false;
  }

  const chunk = records.length
    ? `${records.map(recordToCsvLine).join("\n")}\n`
    : "";

  if (!exists) {
    await writeCsv(path, records);
    return { rowsWritten: records.length, path };
  }

  await writeFile(path, chunk, { flag: "a", encoding: "utf8" });
  return { rowsWritten: records.length, path };
}

/** Buffered CSV stream writer for very large record sets. */
export function createCsvWriteStream(path: string) {
  const stream = createWriteStream(path, { encoding: "utf8" });
  let rows = 0;
  let headerPending = true;

  return {
    write(records: RainfallRecord[]): void {
      if (headerPending && records.length > 0) {
        stream.write(`${csvHeader()}\n`);
        headerPending = false;
      }
      for (const r of records) {
        stream.write(`${recordToCsvLine(r)}\n`);
        rows++;
      }
    },
    end(): Promise<void> {
      return new Promise((resolve, reject) => {
        stream.end(() => resolve());
        stream.on("error", reject);
      });
    },
    rowsWritten: () => rows,
  };
}
