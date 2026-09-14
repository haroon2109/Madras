/**
 * Loader CLI: processed CSV → Prisma `HourlyRainfall`.
 *
 *   npm run load                                  # diff load (idempotent)
 *   npm run load -- --upsert                      # overwrite existing rows
 *   npm run load -- --csv data/processed/rainfall.csv --model gfs --zone zone-01
 *
 * Pair with the pipeline for a full refresh:
 *
 *   npm run process && npm run load
 */

import { prisma } from "@/lib/prisma";
import { loadProcessedCsv } from "@/lib/processing";

function usage(): never {
  console.error(
    [
      "Usage: tsx src/scripts/load.ts [options]",
      "",
      "  --csv <path.csv>      processed CSV to load (default data/processed/rainfall.csv)",
      "  --upsert              overwrite existing rows (backfill mode)",
      "  --model <ecmwf|gfs>   load only this model",
      "  --zone <zone-id>      load only this zone id, e.g. zone-01 (repeatable)",
      "  --help                show this help",
    ].join("\n")
  );
  process.exit(2);
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const options: Parameters<typeof loadProcessedCsv>[0] = {};
  const zoneIds: string[] = [];

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case "--help":
        usage();
        break;
      case "--csv":
        options.csvPath = args[++i];
        break;
      case "--upsert":
        options.upsert = true;
        break;
      case "--model": {
        const m = args[++i];
        if (m !== "ecmwf" && m !== "gfs") usage();
        options.model = m;
        break;
      }
      case "--zone": {
        const z = args[++i];
        if (!z) usage();
        zoneIds.push(z);
        options.zoneIds = zoneIds;
        break;
      }
      default:
        usage();
    }
  }

  const report = await loadProcessedCsv({ ...options, prisma });

  console.log("Loaded processed rainfall into the DB:");
  console.log(`  rows read                   : ${report.rowsRead}`);
  console.log(`  rows loaded                 : ${report.rowsLoaded}`);
  console.log(`  rows skipped (existing)     : ${report.rowsSkippedExisting}`);
  console.log(`  unknown-zone rows skipped   : ${report.unknownZoneRows}`);
  console.log(`  invalid-model rows skipped  : ${report.invalidModelRows}`);
  console.log(`  invalid-timestamp rows      : ${report.invalidTimestampRows}`);
  console.log(`  in-CSV duplicates skipped   : ${report.duplicateCsvRows}`);
  console.log(`  zones touched               : ${report.zonesTouched}`);
  console.log(`  duration                    : ${report.durationMs}ms`);
}

main()
  .catch((e) => {
    console.error("load aborted:", e instanceof Error ? e.message : e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
