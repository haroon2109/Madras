/**
 * Automated validation tests for the pipeline + validation stages.
 * Run: npm test
 */

import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { runProcessing, dedupeRecords, sortRecords, detectGaps } from "./pipeline";
import { validateRecords, validateZoneCoverage, assertValidOutput } from "./validate";
import { readCsvRecords } from "./read";
import type { RainfallRecord } from "./schema";

let rawDir: string;
let outDir: string;

beforeEach(() => {
  rawDir = mkdtempSync(join(tmpdir(), "madras-raw-"));
  outDir = mkdtempSync(join(tmpdir(), "madras-out-"));
});

afterEach(() => {
  rmSync(rawDir, { recursive: true, force: true });
  rmSync(outDir, { recursive: true, force: true });
});

function rawEnvelope(o: {
  model: string;
  zoneId: string;
  time?: string[];
  precip?: unknown[];
  error?: boolean;
  reason?: string;
}) {
  return {
    _meta: {
      model: o.model,
      zoneId: o.zoneId,
      zoneNumber: Number(o.zoneId.slice(5)),
      zoneName: "Test",
      latitude: 13,
      longitude: 80,
      fetchedAt: "2026-09-09T15:00:00.000Z",
    },
    response: {
      ...(o.error ? { error: true, reason: o.reason ?? "boom" } : {}),
      hourly: { time: o.time ?? [], precipitation: o.precip ?? [] },
    },
  };
}

function writeRaw(model: string, zoneId: string, name: string, body: unknown): void {
  const dir = join(rawDir, model, "2026-09-09");
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, name), JSON.stringify(body), "utf8");
}

function rec(over: Partial<RainfallRecord> = {}): RainfallRecord {
  return { timestamp: "2026-09-09T09:00:00.000Z", zone_id: "zone-01", model: "ecmwf", rainfall_mm_hr: 0, ...over };
}

describe("dedupeRecords / sortRecords / detectGaps", () => {
  it("dedupes across files per (timestamp, zone, model), first wins", () => {
    const a = rec({ rainfall_mm_hr: 1 });
    const b = rec({ rainfall_mm_hr: 2 });
    const { records, duplicatesRemoved } = dedupeRecords([a, b]);
    assert.equal(records.length, 1);
    assert.equal(records[0].rainfall_mm_hr, 1);
    assert.equal(duplicatesRemoved, 1);
  });

  it("sorts by timestamp, then zone_id, then model", () => {
    const sorted = sortRecords([
      rec({ timestamp: "2026-09-09T10:00:00.000Z", zone_id: "zone-02" }),
      rec({ timestamp: "2026-09-09T09:00:00.000Z", model: "gfs" }),
      rec({ timestamp: "2026-09-09T09:00:00.000Z", model: "ecmwf" }),
    ]);
    assert.deepEqual(
      sorted.map((r) => [r.timestamp, r.zone_id, r.model]),
      [
        ["2026-09-09T09:00:00.000Z", "zone-01", "ecmwf"],
        ["2026-09-09T09:00:00.000Z", "zone-01", "gfs"],
        ["2026-09-09T10:00:00.000Z", "zone-02", "ecmwf"],
      ]
    );
  });

  it("counts hourly gaps within a series but not across series", () => {
    const gaps = detectGaps([
      rec({ timestamp: "2026-09-09T09:00:00.000Z" }),
      rec({ timestamp: "2026-09-09T11:00:00.000Z" }),
      rec({ timestamp: "2026-09-09T09:00:00.000Z", model: "gfs" }),
    ]);
    assert.equal(gaps, 1); // one missing hour in the ecmwf series only
  });
});

describe("validateRecords", () => {
  it("accepts a valid batch, including null rainfall rows", () => {
    const v = validateRecords([
      rec({ rainfall_mm_hr: 2.5 }),
      rec({ timestamp: "2026-09-09T10:00:00.000Z", rainfall_mm_hr: null }),
    ]);
    assert.equal(v.valid, true, v.errors.join("; "));
  });

  it("flags bad timestamps, unknown models, negatives and duplicates", () => {
    const bad = {
      ...rec({ rainfall_mm_hr: 1 }),
      timestamp: "2026-09-09 09:00",
    };
    const v = validateRecords([
      bad as RainfallRecord,
      rec({ model: "nope" as RainfallRecord["model"], rainfall_mm_hr: 1 }),
      rec({ rainfall_mm_hr: -3 }),
      rec({ rainfall_mm_hr: 1 }),
      rec({ rainfall_mm_hr: 1 }), // duplicate of previous row
    ]);
    assert.equal(v.valid, false);
    assert.ok(v.errors.length >= 4);
  });

  it("warns on empty batches", () => {
    const v = validateRecords([]);
    assert.equal(v.valid, true); // empty is valid but warned
    assert.equal(v.warnings.length, 1);
  });
});

describe("validateZoneCoverage", () => {
  it("errors on unknown zone ids", () => {
    const v = validateZoneCoverage([
      rec({ zone_id: "zone-XX" }),
    ]);
    assert.equal(v.valid, false);
    assert.ok(v.errors.some((e) => e.includes("zone-XX")));
  });

  it("passes for configured zones and warns about absent ones", () => {
    const v = validateZoneCoverage([rec()]);
    assert.equal(v.valid, true);
    assert.ok(v.warnings.length > 0); // other 14 zones have no rows
  });
});

describe("assertValidOutput", () => {
  it("throws on invalid records", () => {
    assert.throws(() => assertValidOutput([rec({ timestamp: "bad" as string })]));
  });

  it("accepts valid records including null rainfall", () => {
    assertValidOutput([rec({ rainfall_mm_hr: null })]);
  });
});

describe("runProcessing end-to-end", () => {
  it("processes healthy, missing-value, duplicate and failed files into one CSV", async () => {
    writeRaw("ecmwf", "zone-01", "a.json", rawEnvelope({
      model: "ecmwf", zoneId: "zone-01",
      time: ["2026-09-09T15:00", "2026-09-09T16:00"],
      precip: [1.5, null],
    }));
    writeRaw("ecmwf", "zone-01", "b.json", rawEnvelope({
      model: "ecmwf", zoneId: "zone-01",
      time: ["2026-09-09T15:00"],
      precip: [9],
    }));
    writeRaw("gfs", "zone-01", "c.json", rawEnvelope({
      model: "gfs", zoneId: "zone-01",
      time: ["2026-09-09T15:00"],
      precip: [2],
    }));
    writeRaw("ecmwf", "zone-01", "d.json", rawEnvelope({
      model: "ecmwf", zoneId: "zone-01",
      error: true, reason: "mock upstream failure",
    }));

    const out = join(outDir, "rainfall.csv");
    const report = await runProcessing({ rawDir, outputPath: out });

    assert.equal(report.filesScanned, 4);
    assert.equal(report.filesParsed, 3);
    assert.equal(report.filesFailed, 1);
    assert.equal(report.duplicatesRemoved, 1);
    assert.equal(report.rowsEmitted, 3);
    assert.equal(report.byModel.ecmwf.files, 2);
    assert.equal(report.byModel.gfs.files, 1);

    const records = readCsvRecords(out);
    assert.equal(records.length, 3);
    assert.ok(records.some((r) => r.rainfall_mm_hr === null));
    assert.ok(records.some((r) => r.rainfall_mm_hr === 1.5));
    assert.ok(records.some((r) => r.model === "gfs" && r.rainfall_mm_hr === 2));
  });

  it("filters by model and counts API-failure files without aborting", async () => {
    writeRaw("ecmwf", "zone-01", "e.json", rawEnvelope({
      model: "ecmwf", zoneId: "zone-01",
      time: ["2026-09-09T15:00"], precip: [3],
    }));
    writeRaw("gfs", "zone-01", "f.json", rawEnvelope({
      model: "gfs", zoneId: "zone-01", error: true,
    }));
    const out = join(outDir, "filtered.csv");
    const report = await runProcessing({ rawDir, outputPath: out, model: "ecmwf" });
    assert.equal(report.filesScanned, 2);
    assert.equal(report.filesParsed, 1);
    assert.equal(report.filesFailed, 1);
    assert.equal(report.rowsEmitted, 1);
    assert.equal(report.byModel.gfs.files, 0);
  });

  it("reports unknown-zone files as failures without aborting the run", async () => {
    writeRaw("ecmwf", "zone-99", "g.json", rawEnvelope({
      model: "ecmwf", zoneId: "zone-99",
      time: ["2026-09-09T15:00"], precip: [1],
    }));
    const out = join(outDir, "x.csv");
    const report = await runProcessing({ rawDir, outputPath: out });
    assert.equal(report.filesFailed, 1);
    assert.match(report.failures[0]?.reason ?? "", /zone not in configuration/);
    // Nothing to write — output exists but is header-only.
    assert.equal(readCsvRecords(out).length, 0);
  });
});
