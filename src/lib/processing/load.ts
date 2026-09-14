/**
 * Prisma loader for the processed rainfall CSV.
 *
 * Reads the pipeline's processed output (see ./read.ts) and writes it into
 * the `HourlyRainfall` table. `zone_id` in the CSV is the STABLE config id
 * ("zone-01"…, chennai-zones.json); the DB keys rows by the Zone cuid, so
 * the loader maps config id → Zone row (auto-syncing the config into the
 * Zone table first, same upsert as the zones:sync script).
 *
 * Two modes:
 *   - diff (default): rows already present (zone×model×timestamp) are kept —
 *     idempotent, safe to re-run; nothing existing is mutated or deleted.
 *   - upsert (--upsert): existing rows are overwritten from the CSV. Use to
 *     backfill nulls once their hours arrive in a newer processed file.
 *
 * The loader never invents rainfall values: a CSV null stays a DB null.
 */

import type { PrismaClient, Prisma } from "@prisma/client";

import { getChennaiZones } from "@/lib/zones";
import { readCsvRecords } from "./read";
import type { RainfallRecord } from "./schema";
import { MODELS, type ModelId } from "./schema";
import { DEFAULT_LOAD_CSV } from "./pipeline";

/** Result of loading processed CSV rows into Prisma. */
export interface LoadReport {
  /** CSV data rows considered (after parsing). */
  rowsRead: number;
  /** Rows written (create or upsert). */
  rowsLoaded: number;
  /** Rows skipped because they already existed (diff mode only). */
  rowsSkippedExisting: number;
  /** CSV rows whose zone_id is not in the zone configuration. */
  unknownZoneRows: number;
  /** CSV rows with a model outside ecmwf|gfs. */
  invalidModelRows: number;
  /** CSV rows with an unparseable timestamp. */
  invalidTimestampRows: number;
  /** Duplicate keys within the CSV itself (first wins, rest ignored). */
  duplicateCsvRows: number;
  /** Zone cuids involved in the load. */
  zonesTouched: number;
  startedAt: string;
  finishedAt: string;
  durationMs: number;
}

export interface LoadOptions {
  /** Processed CSV to load; defaults to the pipeline's output path. */
  csvPath?: string;
  /** Overwrite existing rows instead of skipping them (backfill mode). */
  upsert?: boolean;
  /** Restrict to one model; default: both. */
  model?: ModelId;
  /** Restrict to zone config ids, e.g. ["zone-01"]; default: all. */
  zoneIds?: string[];
  /** Rows per createMany batch (SQLite variable limit aware). */
  batchSize?: number;
  /** Test seam: use this PrismaClient instead of the shared one. */
  prisma?: PrismaClient;
}

const DEFAULT_BATCH_SIZE = 80;

/** Reconcile the zone config into the Zone table; returns config id → cuid. */
async function ensureZones(db: PrismaClient): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  for (const zone of getChennaiZones()) {
    const row = await db.zone.upsert({
      where: { number: zone.number },
      update: { name: zone.name, latitude: zone.centroid.latitude, longitude: zone.centroid.longitude },
      create: {
        number: zone.number,
        name: zone.name,
        latitude: zone.centroid.latitude,
        longitude: zone.centroid.longitude,
      },
    });
    map.set(zone.zoneId, row.id);
  }
  return map;
}

interface Mapped {
  rows: { zoneId: string; model: ModelId; timestamp: Date; rainfallMmHr: number | null }[];
  unknownZoneRows: number;
  invalidModelRows: number;
  invalidTimestampRows: number;
  duplicateCsvRows: number;
}

/** CSV records → DB rows (config-id → cuid mapping, validation, in-file dedup). */
function mapRecords(records: RainfallRecord[], zoneCuidByConfigId: Map<string, string>, options: LoadOptions): Mapped {
  const rows: Mapped["rows"] = [];
  let unknownZoneRows = 0;
  let invalidModelRows = 0;
  let invalidTimestampRows = 0;
  let duplicateCsvRows = 0;

  const seen = new Set<string>();
  const zoneFilter = options.zoneIds?.length ? new Set(options.zoneIds) : null;
  const modelFilter = options.model ?? null;

  for (const r of records) {
    if (modelFilter && r.model !== modelFilter) continue;
    if (zoneFilter && !zoneFilter.has(r.zone_id)) continue;

    const cuid = zoneCuidByConfigId.get(r.zone_id);
    if (!cuid) {
      unknownZoneRows++;
      continue;
    }
    if (!MODELS.includes(r.model)) {
      invalidModelRows++;
      continue;
    }
    const ts = new Date(r.timestamp);
    if (Number.isNaN(ts.getTime())) {
      invalidTimestampRows++;
      continue;
    }

    const key = `${r.timestamp}|${r.zone_id}|${r.model}`;
    if (seen.has(key)) {
      duplicateCsvRows++;
      continue;
    }
    seen.add(key);

    rows.push({ zoneId: cuid, model: r.model, timestamp: ts, rainfallMmHr: r.rainfall_mm_hr });
  }

  return { rows, unknownZoneRows, invalidModelRows, invalidTimestampRows, duplicateCsvRows };
}

/**
 * Load processed CSV records into the `HourlyRainfall` table.
 * Idempotent in the default diff mode; `options.upsert` overwrites existing rows.
 */
export async function loadProcessedCsv(options: LoadOptions = {}): Promise<LoadReport> {
  const startedAt = new Date().toISOString();
  const startMs = Date.now();
  const db = options.prisma; // caller-provided client (tests) or shared
  if (!db) throw new Error("loadProcessedCsv requires a PrismaClient (options.prisma)");

  const csvPath = options.csvPath ?? DEFAULT_LOAD_CSV;
  const records = readCsvRecords(csvPath);

  const zoneCuidByConfigId = await ensureZones(db);
  const mapped = mapRecords(records, zoneCuidByConfigId, options);

  let rowsLoaded = 0;
  let rowsSkippedExisting = 0;
  const batchSize = options.batchSize ?? DEFAULT_BATCH_SIZE;

  if (options.upsert) {
    // Overwrite mode: one upsert per row (bounded, keeps existing extras).
    for (const row of mapped.rows) {
      await db.hourlyRainfall.upsert({
        where: {
          zoneId_model_timestamp: {
            zoneId: row.zoneId,
            model: row.model,
            timestamp: row.timestamp,
          },
        },
        update: { rainfallMmHr: row.rainfallMmHr },
        create: {
          zoneId: row.zoneId,
          model: row.model,
          timestamp: row.timestamp,
          rainfallMmHr: row.rainfallMmHr,
        },
      });
      rowsLoaded++;
    }
  } else {
    // Diff mode: skip keys already in the DB, batch-insert the rest.
    const existing = new Set<string>();
    for (let i = 0; i < mapped.rows.length; i += batchSize) {
      const slice = mapped.rows.slice(i, i + batchSize);
      const found = await db.hourlyRainfall.findMany({
        where: {
          OR: slice.map((r) => ({
            zoneId: r.zoneId,
            model: r.model,
            timestamp: r.timestamp,
          })),
        },
        select: { zoneId: true, model: true, timestamp: true },
      });
      for (const f of found) existing.add(`${f.timestamp.toISOString()}|${f.zoneId}|${f.model}`);
    }

    const fresh = mapped.rows.filter((r) => !existing.has(`${r.timestamp.toISOString()}|${r.zoneId}|${r.model}`));
    rowsSkippedExisting = mapped.rows.length - fresh.length;

    for (let i = 0; i < fresh.length; i += batchSize) {
      const slice = fresh.slice(i, i + batchSize);
      await db.hourlyRainfall.createMany({
        data: slice.map((r) => ({
          zoneId: r.zoneId,
          model: r.model,
          timestamp: r.timestamp,
          rainfallMmHr: r.rainfallMmHr,
        })) as Prisma.HourlyRainfallCreateManyInput[],
      });
      rowsLoaded += slice.length;
    }
  }

  const report: LoadReport = {
    rowsRead: records.length,
    rowsLoaded,
    rowsSkippedExisting,
    unknownZoneRows: mapped.unknownZoneRows,
    invalidModelRows: mapped.invalidModelRows,
    invalidTimestampRows: mapped.invalidTimestampRows,
    duplicateCsvRows: mapped.duplicateCsvRows,
    zonesTouched: new Set(mapped.rows.map((r) => r.zoneId)).size,
    startedAt,
    finishedAt: new Date().toISOString(),
    durationMs: Date.now() - startMs,
  };
  return report;
}
