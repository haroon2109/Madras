/**
 * Raw-response storage for the ingestion layer.
 *
 * Layout (relative to the project root):
 *
 *   data/raw/{model}/{YYYY-MM-DD}/{zone-XX-{slug}}_{YYYYMMDDTHHmmssZ}.json
 *
 * Each file is the untouched Open-Meteo JSON body wrapped in a small envelope
 * (fetchedAt, model, zone) so raw archives are self-describing. Writes are
 * atomic (temp file + rename) and never throw: a storage failure is logged
 * and reported, but does not fail the ingestion run.
 */

import { mkdirSync, writeFileSync, renameSync } from "node:fs";
import { join, resolve, dirname, basename } from "node:path";
import { createLogger, type Logger } from "./logger";
import type { IngestZone, WeatherModelId, OpenMeteoHourlyResponse } from "./types";

export interface StorageOptions {
  /** Root dir for raw data; defaults to `data/raw`. */
  rawDir?: string;
  logger?: Logger;
}

export interface StoredFile {
  /** Path relative to the raw root, e.g. `ecmwf/2026-09-09/zone-01-tiruvottiyur_...json`. */
  relPath: string;
  /** Absolute path on disk. */
  absPath: string;
}

export function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export class RawStorage {
  readonly rawDir: string;
  private readonly log: Logger;

  constructor(options: StorageOptions = {}) {
    this.rawDir = resolve(/* turbopackIgnore: true */ options.rawDir ?? process.env.INGEST_RAW_DIR ?? "data/raw");
    this.log = options.logger ?? createLogger();
  }

  /**
   * Persist a raw Open-Meteo response and return where it was stored.
   * Returns null if the payload is not a valid JSON object.
   */
  saveRawResponse(
    model: WeatherModelId,
    zone: IngestZone,
    body: OpenMeteoHourlyResponse | null,
    extra: Record<string, unknown> = {}
  ): StoredFile | null {
    if (!body || typeof body !== "object") return null;

    const envelope = {
      _meta: {
        model,
        zoneId: zone.id,
        zoneNumber: zone.number,
        zoneName: zone.name,
        latitude: zone.latitude,
        longitude: zone.longitude,
        fetchedAt: new Date().toISOString(),
        ...extra,
      },
      response: body,
    };

    const date = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Kolkata",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date());
    const stamp = new Date().toISOString().replace(/[:.]/g, "-");
    const relPath = join(model, date, `zone-${String(zone.number).padStart(2, "0")}-${slugify(zone.name)}_${stamp}.json`);
    const absPath = join(this.rawDir, relPath);

    try {
      mkdirSync(dirname(absPath), { recursive: true });
      const tmpPath = join(dirname(absPath), `.${basename(absPath)}.tmp`);
      writeFileSync(tmpPath, JSON.stringify(envelope, null, 2), "utf8");
      renameSync(tmpPath, absPath);
      this.log.debug("stored raw response", { model, zone: zone.name, path: relPath });
      return { relPath, absPath };
    } catch (e) {
      this.log.error("failed to store raw response", {
        model,
        zone: zone.name,
        path: relPath,
        error: (e as Error)?.message ?? String(e),
      });
      return null;
    }
  }
}