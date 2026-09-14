/**
 * Ingestion health — real status of the forecast data pipeline, read from
 * the same places the pipeline itself writes to: the raw Open-Meteo archive
 * under data/raw, the HourlyRainfall table, and the ForecastSnapshot table.
 *
 * Every number here is measured from disk/database — nothing is mocked.
 */

import { readdirSync, statSync, existsSync } from "node:fs";
import { join, resolve } from "node:path";
import { prisma } from "./prisma";

export interface ModelHealth {
  model: string;
  /** Newest raw archive file for this model, with age. */
  newestFileAgeMs: number | null;
  /** Raw files archived today (IST). */
  filesToday: number;
  /** Distinct zones with raw files today. */
  zonesToday: number;
}

export interface IngestHealth {
  models: ModelHealth[];
  /** Newest HourlyRainfall row age. */
  hourlyAgeMs: number | null;
  hourlyRowCount: number;
  /** Newest ForecastSnapshot capture age (daily pipeline). */
  snapshotAgeMs: number | null;
  /** Zones with NO hourly data at all (potential ingestion gaps). */
  zonesMissingHourly: string[];
  /** True when the raw archive directory exists (i.e. ingest has ever run). */
  archiveExists: boolean;
}

function istDateKey(d: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

/** Scan the raw archive for one model directory. */
function scanModelDir(rawDir: string, model: string, todayKey: string): ModelHealth {
  const modelDir = join(rawDir, model);
  const base: ModelHealth = { model, newestFileAgeMs: null, filesToday: 0, zonesToday: 0 };
  if (!existsSync(/*turbopackIgnore: true*/ modelDir)) return base;

  const zones = new Set<string>();
  let newestMs: number | null = null;
  let filesToday = 0;

  let dayDirs: string[] = [];
  try {
    dayDirs = readdirSync(/*turbopackIgnore: true*/ modelDir).filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(d));
  } catch {
    return base;
  }

  for (const day of dayDirs) {
    const dayPath = join(rawDir, model, day);
    let files: string[] = [];
    try {
      files = readdirSync(/*turbopackIgnore: true*/ dayPath).filter((f) => f.endsWith(".json"));
    } catch {
      continue;
    }
    if (day === todayKey) filesToday += files.length;
    for (const f of files) {
      // zone-01-tiruvottiyur_... → zone-01
      const zoneMatch = f.match(/^zone-(\d{2})-/);
      if (zoneMatch && day === todayKey) zones.add(zoneMatch[1]);
      try {
        const mtime = statSync(/*turbopackIgnore: true*/ join(dayPath, f)).mtimeMs;
        if (newestMs === null || mtime > newestMs) newestMs = mtime;
      } catch {
        // file vanished between readdir and stat — ignore
      }
    }
  }

  return {
    model,
    newestFileAgeMs: newestMs !== null ? Date.now() - newestMs : null,
    filesToday,
    zonesToday: zones.size,
  };
}

export async function getIngestHealth(): Promise<IngestHealth> {
  // On serverless (Vercel) there is no persistent local filesystem, so the
  // raw `data/raw` archive may not exist. DB-backed signals always work;
  // filesystem signals degrade to "never" instead of crashing the page.
  let rawDir: string | null = null;
  try {
    rawDir = resolve(process.env.INGEST_RAW_DIR ?? "data/raw");
  } catch {
    rawDir = null;
  }
  const todayKey = istDateKey(new Date());

  const [ecmwf, gfs, hourlyLatest, hourlyCount, snapshotLatest, zones] = await Promise.all([
    Promise.resolve(rawDir ? scanModelDir(rawDir, "ecmwf", todayKey) : { model: "ecmwf", newestFileAgeMs: null, filesToday: 0, zonesToday: 0 }),
    Promise.resolve(rawDir ? scanModelDir(rawDir, "gfs", todayKey) : { model: "gfs", newestFileAgeMs: null, filesToday: 0, zonesToday: 0 }),
    prisma.hourlyRainfall.findFirst({ orderBy: { timestamp: "desc" }, select: { timestamp: true } }),
    prisma.hourlyRainfall.count(),
    prisma.forecastSnapshot.findFirst({ orderBy: { capturedAt: "desc" }, select: { capturedAt: true } }),
    prisma.zone.findMany({ where: { isActive: true }, select: { id: true, name: true } }),
  ]);

  const zoneIds = zones.map((z) => z.id);
  const zonesWithHourly = new Set(
    (
      await prisma.hourlyRainfall.findMany({
        where: { zoneId: { in: zoneIds } },
        select: { zoneId: true },
        distinct: ["zoneId"],
      })
    ).map((r) => r.zoneId)
  );
  const zonesMissingHourly = zones.filter((z) => !zonesWithHourly.has(z.id)).map((z) => z.name);

  return {
    models: [ecmwf, gfs],
    hourlyAgeMs: hourlyLatest ? Date.now() - hourlyLatest.timestamp.getTime() : null,
    hourlyRowCount: hourlyCount,
    snapshotAgeMs: snapshotLatest ? Date.now() - snapshotLatest.capturedAt.getTime() : null,
    zonesMissingHourly,
    archiveExists: rawDir ? existsSync(/*turbopackIgnore: true*/ rawDir) : false,
  };
}

/** Human "time ago" label, coarse granularity. */
export function ageLabel(ageMs: number | null): string {
  if (ageMs === null) return "never";
  const mins = Math.round(ageMs / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs} h ago`;
  return `${Math.round(hrs / 24)} d ago`;
}
