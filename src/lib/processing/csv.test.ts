/**
 * Automated validation tests for the CSV output stage.
 * Run: npm test
 */

import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync, readFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { writeCsv, appendCsv, recordToCsvLine, csvHeader } from "./csv";
import type { RainfallRecord } from "./schema";

let dir: string;

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "madras-csv-"));
});

afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
});

const rec = (over: Partial<RainfallRecord> = {}): RainfallRecord => ({
  timestamp: "2026-09-09T09:30:00.000Z",
  zone_id: "zone-01",
  model: "ecmwf",
  rainfall_mm_hr: 1.5,
  ...over,
});

describe("recordToCsvLine", () => {
  it("renders the four schema columns in order", () => {
    assert.equal(recordToCsvLine(rec()), "2026-09-09T09:30:00.000Z,zone-01,ecmwf,1.5");
  });

  it("renders null rainfall as empty field", () => {
    assert.equal(recordToCsvLine(rec({ rainfall_mm_hr: null })), "2026-09-09T09:30:00.000Z,zone-01,ecmwf,");
  });

  it("avoids float noise", () => {
    assert.equal(recordToCsvLine(rec({ rainfall_mm_hr: 0.1 + 0.2 })), "2026-09-09T09:30:00.000Z,zone-01,ecmwf,0.3");
  });
});

describe("writeCsv", () => {
  it("writes header comment block + column header + rows atomically", async () => {
    const path = join(dir, "out.csv");
    const res = await writeCsv(path, [
      rec(),
      rec({ timestamp: "2026-09-09T10:30:00.000Z", model: "gfs", rainfall_mm_hr: null }),
    ]);
    assert.equal(res.rowsWritten, 2);
    const text = readFileSync(path, "utf8");
    assert.match(text, /^# madras processed rainfall \(schema v1\)/);
    assert.match(text, /# columns: timestamp,zone_id,model,rainfall_mm_hr/);
    const lines = text.trim().split("\n");
    assert.equal(lines[3], "timestamp,zone_id,model,rainfall_mm_hr");
    assert.equal(lines[4], "2026-09-09T09:30:00.000Z,zone-01,ecmwf,1.5");
    assert.equal(lines[5], "2026-09-09T10:30:00.000Z,zone-01,gfs,");
  });

  it("round-trips through validateCsvRoundTrip", async () => {
    const path = join(dir, "out.csv");
    await writeCsv(path, [rec(), rec({ rainfall_mm_hr: null })]);
    const { validateCsvRoundTrip } = await import("./validate");
    const rt = validateCsvRoundTrip(path);
    assert.equal(rt.ok, true, rt.errors.join("; "));
    assert.equal(rt.rows, 2);
  });
});

describe("appendCsv", () => {
  it("creates a file with header when it does not exist", async () => {
    const path = join(dir, "new.csv");
    await appendCsv(path, [rec()]);
    assert.equal(existsSync(path), true);
    assert.match(readFileSync(path, "utf8"), /^# madras/);
  });

  it("appends without duplicating the header", async () => {
    const path = join(dir, "log.csv");
    await appendCsv(path, [rec()]);
    await appendCsv(path, [rec({ timestamp: "2026-09-09T10:30:00.000Z" })]);
    const text = readFileSync(path, "utf8");
    // The column header appears exactly once as a data header (the `# columns:`
    // comment intentionally repeats the same string, so anchor to line start).
    assert.equal(text.match(/^timestamp,zone_id,model,rainfall_mm_hr$/gm)?.length, 1);
    assert.equal(text.trim().split("\n").length, 6); // 3 comments + header + 2 rows
  });
});

describe("csvHeader", () => {
  it("documents the schema version and columns", () => {
    const h = csvHeader();
    assert.match(h, /schema v1/);
    assert.match(h, /timestamp,zone_id,model,rainfall_mm_hr/);
  });
});
