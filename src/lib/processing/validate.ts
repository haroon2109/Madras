/**
 * Validation stage: schema-level assertions over normalized rainfall data.
 *
 * `validateRecords` enforces the common schema contract and physical
 * plausibility; `validateZoneCoverage` cross-checks emitted zone_ids against
 * the authoritative zone configuration. `assertValidOutput` is the gate the
 * pipeline (and the automated test-suite) runs before accepting an output
 * file.
 */

import { readFileSync } from "node:fs";

import { MODELS, RECORD_COLUMNS, type ModelId, type RainfallRecord } from "./schema";
import { MAX_PLAUSIBLE_MM_HR } from "./normalize";
import { getChennaiZones } from "@/lib/zones";

/** Result of validating a set of in-memory records. */
export interface RecordValidation {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

const ISO_UTC_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;

/** Structural + plausibility validation of normalized records. */
export function validateRecords(records: RainfallRecord[]): RecordValidation {
  const errors: string[] = [];
  const warnings: string[] = [];

  const seen = new Set<string>();
  const perKeyCounts = new Map<string, number>();

  records.forEach((r, i) => {
    const label = `record[${i}]`;

    if (typeof r.timestamp !== "string" || !ISO_UTC_RE.test(r.timestamp)) {
      errors.push(`${label}: timestamp must be ISO-8601 UTC ("...T00:00:00.000Z"), got "${r.timestamp}"`);
    }
    if (typeof r.zone_id !== "string" || r.zone_id.length === 0) {
      errors.push(`${label}: zone_id must be a non-empty string`);
    }
    if (!MODELS.includes(r.model)) {
      errors.push(`${label}: model must be one of ${MODELS.join("|")}, got "${r.model}"`);
    }
    if (
      r.rainfall_mm_hr !== null &&
      (typeof r.rainfall_mm_hr !== "number" || !Number.isFinite(r.rainfall_mm_hr) || r.rainfall_mm_hr < 0)
    ) {
      errors.push(`${label}: rainfall_mm_hr must be a non-negative finite number or null`);
    }
    if (r.rainfall_mm_hr !== null && r.rainfall_mm_hr > MAX_PLAUSIBLE_MM_HR) {
      errors.push(`${label}: rainfall_mm_hr ${r.rainfall_mm_hr} exceeds plausible max ${MAX_PLAUSIBLE_MM_HR}`);
    }

    const key = `${r.timestamp}|${r.zone_id}|${r.model}`;
    perKeyCounts.set(key, (perKeyCounts.get(key) ?? 0) + 1);
    if (perKeyCounts.get(key)! > 1) {
      errors.push(`${label}: duplicate row for (${r.timestamp}, ${r.zone_id}, ${r.model})`);
    }
    seen.add(key);
  });

  if (records.length === 0) {
    warnings.push("no records — is data/raw populated or did every file fail?");
  }

  return { valid: errors.length === 0, errors, warnings };
}

/**
 * Cross-check emitted zone_ids against the authoritative zone configuration
 * (src/config/chennai-zones.json). Unknown zone_ids are errors; configured
 * zones with no rows at all are surfaced as warnings.
 */
export function validateZoneCoverage(records: RainfallRecord[]): RecordValidation {
  const errors: string[] = [];
  const warnings: string[] = [];

  const configured = new Set(getChennaiZones().map((z) => z.zoneId));
  const seen = new Set(records.map((r) => r.zone_id));

  for (const id of seen) {
    if (!configured.has(id)) {
      errors.push(`unknown zone_id "${id}" — not in chennai-zones.json`);
    }
  }
  for (const id of configured) {
    if (!seen.has(id)) {
      warnings.push(`configured zone "${id}" has no rows in this batch`);
    }
  }
  return { valid: errors.length === 0, errors, warnings };
}

/** Full validation used before accepting a processed output file. */
export function assertValidOutput(records: RainfallRecord[]): void {
  const schema = validateRecords(records);
  const coverage = validateZoneCoverage(records);
  const problems = [...schema.errors, ...coverage.errors];
  if (problems.length > 0) {
    throw new Error(`processed output failed validation:\n  - ${problems.join("\n  - ")}`);
  }
}

/**
 * Re-read a written CSV and validate it round-trips into the schema
 * (columns intact, types preserved, header comment lines skipped).
 */
export function validateCsvRoundTrip(path: string): { ok: boolean; rows: number; errors: string[] } {
  const errors: string[] = [];
  let text: string;
  try {
    text = readFileSync(path, "utf8");
  } catch (e) {
    return { ok: false, rows: 0, errors: [`cannot read ${path}: ${(e as Error).message}`] };
  }

  const lines = text.split(/\r?\n/).filter((l) => l.length > 0);
  const dataLines = lines.filter((l) => !l.startsWith("#"));
  if (dataLines.length === 0) return { ok: false, rows: 0, errors: ["no data rows"] };

  const header = dataLines[0].split(",");
  if (header.join(",") !== RECORD_COLUMNS.join(",")) {
    errors.push(`header mismatch: expected ${RECORD_COLUMNS.join(",")}, got ${dataLines[0]}`);
  }

  let rows = 0;
  for (const line of dataLines.slice(1)) {
    rows++;
    const cols = line.split(",");
    if (cols.length !== RECORD_COLUMNS.length) {
      errors.push(`row ${rows}: expected ${RECORD_COLUMNS.length} columns, got ${cols.length}`);
      continue;
    }
    if (!ISO_UTC_RE.test(cols[0])) errors.push(`row ${rows}: bad timestamp "${cols[0]}"`);
    if (cols[1].length === 0) errors.push(`row ${rows}: empty zone_id`);
    if (!MODELS.includes(cols[2] as ModelId)) errors.push(`row ${rows}: bad model "${cols[2]}"`);
    if (cols[3] !== "" && !Number.isFinite(Number(cols[3]))) {
      errors.push(`row ${rows}: bad rainfall_mm_hr "${cols[3]}"`);
    }
  }
  return { ok: errors.length === 0, rows, errors };
}
