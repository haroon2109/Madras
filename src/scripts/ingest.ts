/**
 * CLI runner for the weather ingestion layer.
 *
 * Usage:
 *   npx tsx src/scripts/ingest.ts                    # all active zones, ECMWF + GFS
 *   npx tsx src/scripts/ingest.ts --model gfs        # GFS only
 *   npx tsx src/scripts/ingest.ts --zone 1 --zone 5  # zones 1 and 5 only
 *   npx tsx src/scripts/ingest.ts --strict           # exit non-zero if anything failed
 *
 * Exits 0 on a fully successful run (or non-strict with failures logged).
 */

import "dotenv/config";
import { ingestAllZones, type IngestOptions } from "@/lib/ingest";
import { createLogger } from "@/lib/ingest";

function usage(): never {
  console.error(
    [
      "Usage: tsx src/scripts/ingest.ts [options]",
      "",
      "  --model <ecmwf|gfs>   fetch only this model (repeatable)",
      "  --zone <number>       fetch only this zone (repeatable)",
      "  --strict              exit 1 if any zone × model fetch failed",
      "  --help                show this help",
    ].join("\n")
  );
  process.exit(2);
}

async function main(): Promise<void> {
  const log = createLogger();
  const args = process.argv.slice(2);

  const options: IngestOptions = {};
  const models = new Set<string>();
  const zones = new Set<number>();
  let strict = false;

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    switch (arg) {
      case "--help":
        usage();
        break;
      case "--model": {
        const m = args[++i];
        if (m !== "ecmwf" && m !== "gfs") usage();
        models.add(m);
        break;
      }
      case "--zone": {
        const z = Number(args[++i]);
        if (!Number.isInteger(z) || z < 1) usage();
        zones.add(z);
        break;
      }
      case "--strict":
        strict = true;
        break;
      default:
        usage();
    }
  }

  if (models.size) options.models = [...models] as IngestOptions["models"];
  if (zones.size) options.zoneNumbers = [...zones].sort((a, b) => a - b);

  const summary = await ingestAllZones(options);

  // Human-readable summary table (structured JSON went out via the logger).
  const table = summary.results.map((r) => ({
    zone: `#${r.zoneNumber} ${r.zoneName}`,
    model: r.model,
    ok: r.ok ? "✓" : "✗",
    hours: r.hours ?? "-",
    todayMm: r.todayMm ?? "-",
    totalMm: r.totalMm ?? "-",
    error: r.error ?? "",
  }));
  console.table(table);
  log.info("ingest summary", {
    zones: summary.zones,
    succeeded: summary.succeeded,
    failed: summary.failed,
    durationMs: summary.durationMs,
    rawFilesWritten: summary.rawFilesWritten,
  });

  if (strict && summary.failed > 0) process.exit(1);
}

main().catch((e) => {
  console.error("ingestion aborted:", e);
  process.exit(1);
});