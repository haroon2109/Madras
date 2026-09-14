/**
 * Normalization stage: raw Open-Meteo hourly responses → RainfallRecord rows.
 *
 * Handles the four failure classes the pipeline must tolerate:
 *   1. Missing values        — absent fields or null/undefined → rainfall_mm_hr = null (row kept).
 *   2. Duplicate timestamps  — deduplicated per (timestamp, zone_id, model), first wins.
 *   3. Invalid values        — non-numeric / non-finite / negative / >500 mm/h dropped as physically implausible.
 *   4. API failures          — a malformed or error-envelope file is reported and skipped, never aborts the run.
 */

import type { ModelId, RainfallRecord } from "./schema";
import { MODELS } from "./schema";
import { getChennaiZones, getZoneByNumber } from "@/lib/zones";

export interface RawArchiveEnvelope {
  _meta?: {
    model?: unknown;
    zoneId?: unknown;
    zoneNumber?: unknown;
    zoneName?: unknown;
    latitude?: unknown;
    longitude?: unknown;
    fetchedAt?: unknown;
    [k: string]: unknown;
  };
  response?: {
    hourly?: {
      time?: unknown;
      precipitation?: unknown;
      [k: string]: unknown;
    };
    error?: unknown;
    reason?: unknown;
    [k: string]: unknown;
  };
}

export interface NormalizeFileResult {
  ok: boolean;
  /** The archive file this result came from (echoed back for reporting). */
  file: string;
  /** Why the file could not be normalized at all (API-failure envelope, wrong shape). */
  reason?: string;
  records: RainfallRecord[];
  invalidValues: number;
  missingValues: number;
  duplicatesRemoved: number;
  rowsDroppedOutOfRange: number;
}

/** Physical plausibility bounds for hourly precipitation (mm/h). */
export const MAX_PLAUSIBLE_MM_HR = 500;

/** One value of `hourly.precipitation` → mm/h number, or null (missing/invalid). */
export function normalizeRainfallValue(raw: unknown): { value: number | null; status: "ok" | "missing" | "invalid" } {
  if (raw === null || raw === undefined) return { value: null, status: "missing" };
  if (typeof raw === "string") {
    // Some models emit "" or "null" strings; a numeric string is accepted.
    const trimmed = raw.trim();
    if (trimmed === "" || trimmed.toLowerCase() === "null") return { value: null, status: "missing" };
    const parsed = Number(trimmed);
    return Number.isFinite(parsed)
      ? { value: parsed, status: "ok" }
      : { value: null, status: "invalid" };
  }
  if (typeof raw === "number") {
    return Number.isFinite(raw) ? { value: raw, status: "ok" } : { value: null, status: "invalid" };
  }
  return { value: null, status: "invalid" };
}

/** A raw hourly timestamp ("2026-09-09T15:00" IST wall clock, or ISO UTC) → ISO-8601 UTC string, or null. */
export function normalizeTimestamp(raw: unknown): string | null {
  if (typeof raw !== "string" || raw.length === 0) return null;
  // Open-Meteo timezone-aware times arrive as "YYYY-MM-DDTHH:00" (no zone).
  // Archive code appends "+05:30" for IST; accept both, plus full ISO UTC.
  const iso =
    raw.length === 16
      ? `${raw}:00+05:30` // wall-clock IST
      : raw.length === 19
        ? `${raw}+05:30` // second-precision IST
        : raw;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

/** Is this envelope an Open-Meteo API failure (error + reason, no data)? */
export function isApiErrorEnvelope(env: RawArchiveEnvelope): boolean {
  return env.response?.error === true && typeof env.response.reason === "string";
}

/**
 * Normalize one raw archive JSON (envelope from RawStorage) into records.
 * Never throws: shape problems come back as `ok: false` with a reason.
 */
export function normalizeRawResponse(json: unknown, fileName: string): NormalizeFileResult {
  const empty = {
    file: fileName,
    records: [] as RainfallRecord[],
    invalidValues: 0,
    missingValues: 0,
    duplicatesRemoved: 0,
    rowsDroppedOutOfRange: 0,
  };

  if (typeof json !== "object" || json === null || Array.isArray(json)) {
    return { ok: false, reason: "not a JSON object", ...empty };
  }
  const env = json as RawArchiveEnvelope;

  if (isApiErrorEnvelope(env)) {
    return {
      ok: false,
      reason: `API error envelope: ${env.response?.reason}`,
      ...empty,
    };
  }

  const metaModel = env._meta?.model;
  if (typeof metaModel !== "string" || !MODELS.includes(metaModel as ModelId)) {
    return { ok: false, reason: "missing or unknown _meta.model", ...empty };
  }
  const model = metaModel as ModelId;

  // Resolve the archive's zone identity to the STABLE config zone id
  // ("zone-01"…"zone-15"). Raw archives carry the DB cuid as _meta.zoneId,
  // which changes on every reseed — the config id is the portable join key.
  const zoneNumber = env._meta?.zoneNumber;
  const byNumber =
    typeof zoneNumber === "number" && Number.isInteger(zoneNumber)
      ? getZoneByNumber(zoneNumber)
      : undefined;
  const metaZoneIdRaw = env._meta?.zoneId;
  const byId =
    typeof metaZoneIdRaw === "string" && metaZoneIdRaw.length > 0
      ? getChennaiZones().find((z) => z.zoneId === metaZoneIdRaw)
      : undefined;
  const resolvedZone = byNumber ?? byId;
  if (!resolvedZone) {
    return {
      ok: false,
      reason: `zone not in configuration (_meta.zoneId=${String(metaZoneIdRaw)}, zoneNumber=${String(zoneNumber)})`,
      ...empty,
    };
  }
  const metaZoneId = resolvedZone.zoneId;

  const hourly = env.response?.hourly;
  const times = hourly?.time;
  const precipitation = hourly?.precipitation;
  if (!Array.isArray(times) || !Array.isArray(precipitation)) {
    return { ok: false, reason: "response.hourly.time/precipitation missing or not arrays", ...empty };
  }

  const seen = new Set<string>();
  const records: RainfallRecord[] = [];
  let invalidValues = 0;
  let missingValues = 0;
  let duplicatesRemoved = 0;
  let rowsDroppedOutOfRange = 0;

  for (let i = 0; i < times.length; i++) {
    const timestamp = normalizeTimestamp(times[i]);
    if (timestamp === null) {
      invalidValues++;
      continue;
    }

    const key = `${timestamp}|${metaZoneId}|${model}`;
    if (seen.has(key)) {
      duplicatesRemoved++;
      continue;
    }
    seen.add(key);

    const { value, status } = normalizeRainfallValue(precipitation[i]);
    if (status === "missing") missingValues++;
    if (status === "invalid") invalidValues++;

    if (value !== null && (value < 0 || value > MAX_PLAUSIBLE_MM_HR)) {
      rowsDroppedOutOfRange++;
      continue;
    }

    records.push({ timestamp, zone_id: metaZoneId, model, rainfall_mm_hr: value });
  }

  return {
    ok: true,
    file: fileName,
    records,
    invalidValues,
    missingValues,
    duplicatesRemoved,
    rowsDroppedOutOfRange,
  };
}
