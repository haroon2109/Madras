/**
 * Automated validation tests for the normalization stage.
 * Run: npm test
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";

import {
  normalizeRainfallValue,
  normalizeTimestamp,
  normalizeRawResponse,
  isApiErrorEnvelope,
} from "./normalize";

describe("normalizeRainfallValue", () => {
  it("accepts finite numbers", () => {
    assert.deepEqual(normalizeRainfallValue(0), { value: 0, status: "ok" });
    assert.deepEqual(normalizeRainfallValue(12.5), { value: 12.5, status: "ok" });
  });

  it("accepts numeric strings", () => {
    assert.deepEqual(normalizeRainfallValue("3.2"), { value: 3.2, status: "ok" });
  });

  it("treats null/undefined/empty as missing", () => {
    assert.equal(normalizeRainfallValue(null).status, "missing");
    assert.equal(normalizeRainfallValue(undefined).status, "missing");
    assert.equal(normalizeRainfallValue("").status, "missing");
    assert.equal(normalizeRainfallValue("null").status, "missing");
  });

  it("treats NaN/Infinity/non-numeric as invalid", () => {
    assert.equal(normalizeRainfallValue(Number.NaN).status, "invalid");
    assert.equal(normalizeRainfallValue(Number.POSITIVE_INFINITY).status, "invalid");
    assert.equal(normalizeRainfallValue("abc").status, "invalid");
    assert.equal(normalizeRainfallValue({ mm: 1 }).status, "invalid");
  });
});

describe("normalizeTimestamp", () => {
  it("converts IST wall-clock times to ISO UTC", () => {
    // 15:00 IST == 09:30 UTC
    assert.equal(normalizeTimestamp("2026-09-09T15:00"), "2026-09-09T09:30:00.000Z");
  });

  it("accepts second-precision and full ISO inputs", () => {
    assert.equal(normalizeTimestamp("2026-09-09T15:00:00"), "2026-09-09T09:30:00.000Z");
    assert.equal(normalizeTimestamp("2026-09-09T09:30:00.000Z"), "2026-09-09T09:30:00.000Z");
  });

  it("rejects garbage timestamps", () => {
    assert.equal(normalizeTimestamp("not-a-date"), null);
    assert.equal(normalizeTimestamp(""), null);
    assert.equal(normalizeTimestamp(42 as unknown as string), null);
  });
});

describe("isApiErrorEnvelope", () => {
  it("detects Open-Meteo error envelopes", () => {
    assert.equal(
      isApiErrorEnvelope({ response: { error: true, reason: "boom" } }),
      true
    );
    assert.equal(isApiErrorEnvelope({ response: { hourly: {} } }), false);
  });
});

function envelope(overrides: {
  time?: unknown[];
  precipitation?: unknown[];
  zoneId?: string;
  model?: string;
  error?: boolean;
  reason?: string;
}) {
  return {
    _meta: {
      model: overrides.model ?? "ecmwf",
      zoneId: overrides.zoneId ?? "zone-01",
      zoneNumber: 1,
      zoneName: "Tiruvottiyur",
      latitude: 13.157,
      longitude: 80.302,
      fetchedAt: "2026-09-09T15:35:52.000Z",
    },
    response: {
      ...(overrides.error ? { error: true, reason: overrides.reason ?? "upstream down" } : {}),
      hourly: {
        time: overrides.time ?? [],
        precipitation: overrides.precipitation ?? [],
      },
    },
  };
}

describe("normalizeRawResponse", () => {
  it("normalizes a healthy response into the common schema", () => {
    const res = normalizeRawResponse(
      envelope({ time: ["2026-09-09T15:00", "2026-09-09T16:00"], precipitation: [0.0, 1.4] }),
      "test.json"
    );
    assert.equal(res.ok, true);
    assert.equal(res.records.length, 2);
    assert.deepEqual(res.records[0], {
      timestamp: "2026-09-09T09:30:00.000Z",
      zone_id: "zone-01",
      model: "ecmwf",
      rainfall_mm_hr: 0,
    });
    assert.equal(res.records[1].rainfall_mm_hr, 1.4);
  });

  it("keeps rows for missing values as null rainfall and counts them", () => {
    const res = normalizeRawResponse(
      envelope({ time: ["2026-09-09T15:00", "2026-09-09T16:00"], precipitation: [null, undefined] }),
      "test.json"
    );
    assert.equal(res.ok, true);
    assert.equal(res.records.length, 2);
    assert.equal(res.records[0].rainfall_mm_hr, null);
    assert.equal(res.records[1].rainfall_mm_hr, null);
    assert.equal(res.missingValues, 2);
  });

  it("nulls invalid values but keeps the rows", () => {
    const res = normalizeRawResponse(
      envelope({ time: ["2026-09-09T15:00", "2026-09-09T16:00"], precipitation: ["abc", Number.NaN] }),
      "test.json"
    );
    assert.equal(res.records.length, 2);
    assert.equal(res.records[0].rainfall_mm_hr, null);
    assert.equal(res.records[1].rainfall_mm_hr, null);
    assert.equal(res.invalidValues, 2);
  });

  it("deduplicates duplicate timestamps within a file, keeping the first", () => {
    const res = normalizeRawResponse(
      envelope({
        time: ["2026-09-09T15:00", "2026-09-09T15:00", "2026-09-09T17:00"],
        precipitation: [1, 9, 0],
      }),
      "test.json"
    );
    assert.equal(res.records.length, 2);
    assert.equal(res.records[0].rainfall_mm_hr, 1);
    assert.equal(res.duplicatesRemoved, 1);
  });

  it("drops physically implausible values (negative, > 500 mm/h)", () => {
    const res = normalizeRawResponse(
      envelope({ time: ["2026-09-09T15:00", "2026-09-09T16:00"], precipitation: [-1, 900] }),
      "test.json"
    );
    assert.equal(res.records.length, 0);
    assert.equal(res.rowsDroppedOutOfRange, 2);
  });

  it("reports API error envelopes instead of throwing", () => {
    const res = normalizeRawResponse(envelope({ error: true, reason: "quota exceeded" }), "test.json");
    assert.equal(res.ok, false);
    assert.match(res.reason ?? "", /quota exceeded/);
    assert.equal(res.records.length, 0);
  });

  it("rejects wrong shapes with a reason", () => {
    assert.equal(normalizeRawResponse("nope", "f").ok, false);
    assert.equal(normalizeRawResponse({}, "f").ok, false); // no _meta
    assert.equal(normalizeRawResponse(envelope({ model: "hrrr" }), "f").ok, false);
  });

  it("counts unparseable timestamps as invalid values", () => {
    const res = normalizeRawResponse(
      envelope({ time: ["nope", "2026-09-09T15:00"], precipitation: [0, 1] }),
      "test.json"
    );
    assert.equal(res.ok, true); // file-level shape is fine
    assert.equal(res.records.length, 1); // only the valid hour survives
    assert.equal(res.invalidValues, 1);
  });
});
