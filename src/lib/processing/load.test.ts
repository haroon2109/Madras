/**
 * Automated validation tests for the Prisma CSV loader.
 * Run: npm test
 *
 * Uses a throwaway SQLite file through the project's real Prisma client +
 * better-sqlite3 adapter so the tests exercise the actual schema and upsert
 * semantics, not a mock. The schema is pushed into the temp DB with
 * `prisma db push` (DATABASE_URL env override; prisma.config.ts reads it via
 * process.env, which dotenv does not override).
 */

import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

import { PrismaClient } from "@prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";

import { loadProcessedCsv } from "./load";
import { writeCsv } from "./csv";
import type { RainfallRecord } from "./schema";

let dir: string;
let dbPath: string;
let db: PrismaClient;

/** Push prisma/schema.prisma into a fresh SQLite file (no client regen). */
function pushSchema(targetDbPath: string): void {
  // Note: Prisma 7 removed --skip-generate; db push is schema-sync only here.
  const res = spawnSync("npx", ["prisma", "db", "push"], {
    cwd: process.cwd(),
    env: { ...process.env, DATABASE_URL: `file:${targetDbPath}` },
    encoding: "utf8",
    shell: process.platform === "win32",
  });
  if (res.status !== 0) {
    throw new Error(`prisma db push failed:\n${res.stdout}\n${res.stderr}`);
  }
}

before(async () => {
  // The `prisma db push` below shells out to the CLI and takes a few seconds.
  dir = mkdtempSync(join(tmpdir(), "madras-load-"));
  dbPath = join(dir, "test.db");
  pushSchema(dbPath);

  db = new PrismaClient({ adapter: new PrismaBetterSqlite3({ url: `file:${dbPath}` }) });
  // Minimal Zone rows so foreign keys resolve (config ids zone-01..zone-03).
  for (const n of [1, 2, 3]) {
    await db.zone.create({
      data: { number: n, name: `Zone ${n}`, latitude: 13.0 + n / 100, longitude: 80.2 },
    });
  }
});

after(async () => {
  await db.$disconnect();
  rmSync(dir, { recursive: true, force: true });
});

function rec(over: Partial<RainfallRecord> = {}): RainfallRecord {
  return { timestamp: "2026-09-09T09:00:00.000Z", zone_id: "zone-01", model: "ecmwf", rainfall_mm_hr: 1.5, ...over };
}

async function csv(records: RainfallRecord[]): Promise<string> {
  const p = join(dir, `load-${Math.random().toString(36).slice(2)}.csv`);
  await writeCsv(p, records);
  return p;
}

describe("loadProcessedCsv", () => {
  it("loads rows with config-id → cuid mapping and null preservation", async () => {
    const path = await csv([
      rec(),
      rec({ timestamp: "2026-09-09T10:00:00.000Z", rainfall_mm_hr: null }),
      rec({ timestamp: "2026-09-09T11:00:00.000Z", zone_id: "zone-02", model: "gfs", rainfall_mm_hr: 0.4 }),
    ]);
    const report = await loadProcessedCsv({ prisma: db, csvPath: path });
    assert.equal(report.rowsRead, 3);
    assert.equal(report.rowsLoaded, 3);
    assert.equal(report.unknownZoneRows, 0);
    assert.equal(report.zonesTouched, 2);
    assert.equal(report.invalidTimestampRows, 0);

    const zone2 = await db.zone.findUniqueOrThrow({ where: { number: 2 } });
    const row = await db.hourlyRainfall.findFirstOrThrow({
      where: { zoneId: zone2.id, model: "gfs" },
    });
    assert.equal(row.rainfallMmHr, 0.4);

    const nulled = await db.hourlyRainfall.findFirstOrThrow({ where: { rainfallMmHr: null } });
    assert.equal(nulled.model, "ecmwf");
  });

  it("is idempotent: re-running the diff load skips existing rows", async () => {
    const path = await csv([rec({ timestamp: "2026-09-09T20:00:00.000Z", rainfall_mm_hr: 2 }), rec({ timestamp: "2026-09-09T21:00:00.000Z" })]);
    const first = await loadProcessedCsv({ prisma: db, csvPath: path });
    assert.equal(first.rowsLoaded, 2);

    const second = await loadProcessedCsv({ prisma: db, csvPath: path });
    assert.equal(second.rowsLoaded, 0);
    assert.equal(second.rowsSkippedExisting, 2);

    // Value kept from the first load — diff mode never mutates existing rows.
    const zone1 = await db.zone.findUniqueOrThrow({ where: { number: 1 } });
    const row = await db.hourlyRainfall.findFirstOrThrow({
      where: { zoneId: zone1.id, model: "ecmwf", timestamp: new Date("2026-09-09T20:00:00.000Z") },
    });
    assert.equal(row.rainfallMmHr, 2);
  });

  it("upsert mode overwrites existing rows (backfill nulls)", async () => {
    const zone1 = await db.zone.findUniqueOrThrow({ where: { number: 1 } });
    const path1 = await csv([rec({ timestamp: "2026-09-09T22:00:00.000Z", rainfall_mm_hr: null })]);
    await loadProcessedCsv({ prisma: db, csvPath: path1, upsert: true });

    const path2 = await csv([rec({ timestamp: "2026-09-09T22:00:00.000Z", rainfall_mm_hr: 7.5 })]);
    const report = await loadProcessedCsv({ prisma: db, csvPath: path2, upsert: true });

    assert.equal(report.rowsLoaded, 1);
    const row = await db.hourlyRainfall.findFirstOrThrow({
      where: { zoneId: zone1.id, model: "ecmwf", timestamp: new Date("2026-09-09T22:00:00.000Z") },
    });
    assert.equal(row.rainfallMmHr, 7.5);
  });

  it("skips unknown zones, invalid models and in-CSV duplicates with accounting", async () => {
    const path = await csv([
      rec({ zone_id: "zone-XX", timestamp: "2026-09-09T23:00:00.000Z" }),
      rec({ model: "nope" as RainfallRecord["model"], timestamp: "2026-09-09T23:00:00.000Z" }),
      rec({ rainfall_mm_hr: 3, timestamp: "2026-09-09T23:00:00.000Z" }),
      rec({ rainfall_mm_hr: 9, timestamp: "2026-09-09T23:00:00.000Z" }), // same key → in-CSV duplicate
      rec({ timestamp: "not-a-date" }),
    ]);
    const report = await loadProcessedCsv({ prisma: db, csvPath: path });
    assert.equal(report.rowsRead, 5);
    assert.equal(report.unknownZoneRows, 1);
    assert.equal(report.invalidModelRows, 1);
    assert.equal(report.duplicateCsvRows, 1);
    assert.equal(report.invalidTimestampRows, 1);
    assert.equal(report.rowsLoaded, 1);
  });

  it("filters by zone and model", async () => {
    const path = await csv([
      rec({ zone_id: "zone-03", model: "gfs", timestamp: "2026-09-10T01:00:00.000Z", rainfall_mm_hr: 1 }),
      rec({ zone_id: "zone-03", model: "ecmwf", timestamp: "2026-09-10T01:00:00.000Z", rainfall_mm_hr: 2 }),
      rec({ timestamp: "2026-09-10T01:00:00.000Z", rainfall_mm_hr: 3 }),
    ]);
    const report = await loadProcessedCsv({
      prisma: db,
      csvPath: path,
      zoneIds: ["zone-03"],
      model: "gfs",
    });
    assert.equal(report.rowsLoaded, 1);
    assert.equal(report.zonesTouched, 1);
  });

  it("throws a clear error when the CSV is missing", async () => {
    const missing = join(dir, "missing.csv");
    assert.equal(existsSync(missing), false);
    await assert.rejects(
      () => loadProcessedCsv({ prisma: db, csvPath: missing }),
      /ENOENT|no such file/i
    );
  });
});
