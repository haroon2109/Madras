/**
 * Ingestion runner.
 *
 * Pulls hourly precipitation forecasts from ECMWF and GFS (Open-Meteo) for
 * every active Chennai zone, stores each raw response under data/raw, and
 * returns a structured summary. Failures are isolated per zone × model:
 * one bad zone or model never aborts the rest of the run.
 *
 * All rainfall numbers come from the API responses — nothing is hardcoded
 * or synthesized here.
 */

import { prisma } from "@/lib/prisma";
import { createLogger, type Logger } from "./logger";
import { fetchEcmwfHourly } from "./ecmwf";
import { fetchGfsHourly } from "./gfs";
import type { HourlyFetchOptions } from "./forecast";
import type { IngestSummary, IngestZone, WeatherModelId, ZoneModelResult } from "./types";

export interface IngestOptions {
  /** Restrict to these zone numbers (e.g. [1, 2]); default: all active zones. */
  zoneNumbers?: number[];
  /** Restrict to these models; default: both ECMWF and GFS. */
  models?: WeatherModelId[];
  /** Passed through to the fetch services (timeout, retries, etc.). */
  fetchOptions?: HourlyFetchOptions;
  logger?: Logger;
}

/** All active zones from the database, in zone-number order. */
export async function getIngestZones(zoneNumbers?: number[]): Promise<IngestZone[]> {
  const zones = await prisma.zone.findMany({
    where: { isActive: true, ...(zoneNumbers && zoneNumbers.length ? { number: { in: zoneNumbers } } : {}) },
    orderBy: { number: "asc" },
  });
  return zones.map((z) => ({
    id: z.id,
    number: z.number,
    name: z.name,
    latitude: z.latitude,
    longitude: z.longitude,
  }));
}

const MODEL_FETCHERS: Record<WeatherModelId, (zone: IngestZone, opts: HourlyFetchOptions) => Promise<ZoneModelResult>> = {
  ecmwf: async (zone, opts) => {
    const out = await fetchEcmwfHourly(zone, opts);
    return {
      zoneNumber: zone.number,
      zoneName: zone.name,
      model: "ecmwf",
      ok: out.ok,
      hours: out.series?.times.length,
      totalMm: out.series ? round1(out.series.precipitationMm.reduce((a, b) => a + b, 0)) : undefined,
      todayMm: out.series ? round1(out.series.precipitationMm.slice(0, 24).reduce((a, b) => a + b, 0)) : undefined,
      maxHourlyMm: out.series ? round1(Math.max(...out.series.precipitationMm)) : undefined,
      rawFile: out.rawFile,
      error: out.error,
      attempts: out.attempts,
    };
  },
  gfs: async (zone, opts) => {
    const out = await fetchGfsHourly(zone, opts);
    return {
      zoneNumber: zone.number,
      zoneName: zone.name,
      model: "gfs",
      ok: out.ok,
      hours: out.series?.times.length,
      totalMm: out.series ? round1(out.series.precipitationMm.reduce((a, b) => a + b, 0)) : undefined,
      todayMm: out.series ? round1(out.series.precipitationMm.slice(0, 24).reduce((a, b) => a + b, 0)) : undefined,
      maxHourlyMm: out.series ? round1(Math.max(...out.series.precipitationMm)) : undefined,
      rawFile: out.rawFile,
      error: out.error,
      attempts: out.attempts,
    };
  },
};

/** Fetch hourly precipitation for every selected zone × model. */
export async function ingestAllZones(options: IngestOptions = {}): Promise<IngestSummary> {
  const log = options.logger ?? createLogger();
  const startedAt = new Date().toISOString();
  const startMs = Date.now();

  const zones = await getIngestZones(options.zoneNumbers);
  const models: WeatherModelId[] = options.models ?? ["ecmwf", "gfs"];

  log.info("ingestion run starting", { zones: zones.length, models: models.join(",") });

  const results: ZoneModelResult[] = [];
  let rawFilesWritten = 0;

  for (const zone of zones) {
    for (const model of models) {
      try {
        const fetcher = MODEL_FETCHERS[model];
        const result = await fetcher(zone, options.fetchOptions ?? {});
        results.push(result);
        if (result.rawFile) rawFilesWritten++;
      } catch (e) {
        // Defensive: a bug in a single fetch path must not kill the run.
        log.error("unexpected ingestion error", {
          model,
          zone: zone.name,
          error: (e as Error)?.message ?? String(e),
        });
        results.push({
          zoneNumber: zone.number,
          zoneName: zone.name,
          model,
          ok: false,
          error: `unexpected: ${(e as Error)?.message ?? String(e)}`,
        });
      }
    }
  }

  const succeeded = results.filter((r) => r.ok).length;
  const failed = results.length - succeeded;
  const summary: IngestSummary = {
    startedAt,
    finishedAt: new Date().toISOString(),
    durationMs: Date.now() - startMs,
    zones: zones.length,
    results,
    succeeded,
    failed,
    rawFilesWritten,
  };

  log.info("ingestion run finished", {
    zones: zones.length,
    succeeded,
    failed,
    durationMs: summary.durationMs,
    rawFilesWritten,
  });

  return summary;
}

function round1(v: number): number {
  return Math.round(v * 10) / 10;
}