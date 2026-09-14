/**
 * Preprocessing CLI.
 *
 *   npx tsx src/scripts/process.ts                     # process all raw files → data/processed/rainfall.csv
 *   npx tsx src/scripts/process.ts --model gfs         # one model only
 *   npx tsx src/scripts/process.ts --zone zone-01      # repeatable, by zone id
 *   npx tsx src/scripts/process.ts --since 2026-09-01  # only files under that date dir
 *   npx tsx src/scripts/process.ts --strict            # exit 1 if any file failed
 *   npx tsx src/scripts/process.ts --out path.csv      # custom output path
 */

import { runProcessing } from "@/lib/processing";
import type { ModelId } from "@/lib/processing";

function usage(): never {
  console.error(
    [
      "Usage: tsx src/scripts/process.ts [options]",
      "",
      "  --model <ecmwf|gfs>   process only this model",
      "  --zone <zone-id>      process only this zone id, e.g. zone-01 (repeatable)",
      "  --since <YYYY-MM-DD>  only files whose path includes this date segment",
      "  --out <path.csv>      output path (default data/processed/rainfall.csv)",
      "  --raw-dir <dir>       raw archive root (default data/raw)",
      "  --strict              exit 1 if any file failed to normalize",
      "  --help                show this help",
    ].join("\n")
  );
  process.exit(2);
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const options: Parameters<typeof runProcessing>[0] = {};
  const zoneIds: string[] = [];
  let strict = false;
  let out: string | undefined;
  let rawDir: string | undefined;

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    switch (arg) {
      case "--help":
        usage();
        break;
      case "--model": {
        const m = args[++i];
        if (m !== "ecmwf" && m !== "gfs") usage();
        options.model = m as ModelId;
        break;
      }
      case "--zone": {
        const z = args[++i];
        if (!z) usage();
        zoneIds.push(z);
        options.zoneIds = zoneIds;
        break;
      }
      case "--since": {
        const d = args[++i];
        if (!/^\d{4}-\d{2}-\d{2}$/.test(d ?? "")) usage();
        options.sinceDate = d;
        break;
      }
      case "--out": {
        out = args[++i];
        break;
      }
      case "--raw-dir": {
        rawDir = args[++i];
        break;
      }
      case "--strict":
        strict = true;
        break;
      default:
        usage();
    }
  }
  if (out) options.outputPath = out;
  if (rawDir) options.rawDir = rawDir;

  const report = await runProcessing(options);

  console.log("Processed rainfall output:");
  console.log(`  files scanned/parsed/failed : ${report.filesScanned}/${report.filesParsed}/${report.filesFailed}`);
  console.log(`  rows emitted                : ${report.rowsEmitted}`);
  console.log(`  invalid values nulled       : ${report.invalidValues}`);
  console.log(`  missing values nulled       : ${report.missingValues}`);
  console.log(`  duplicates removed          : ${report.duplicatesRemoved}`);
  console.log(`  out-of-range rows dropped   : ${report.rowsDroppedOutOfRange}`);
  console.log(`  hourly gaps in series       : ${report.gapsDetected}`);
  console.log(
    `  by model                    : ecmwf=${report.byModel.ecmwf.rows} rows / ${report.byModel.ecmwf.files} files, ` +
      `gfs=${report.byModel.gfs.rows} rows / ${report.byModel.gfs.files} files`
  );
  for (const f of report.failures.slice(0, 10)) {
    console.log(`  ✗ ${f.file}: ${f.reason}`);
  }
  if (report.failures.length > 10) {
    console.log(`  … and ${report.failures.length - 10} more failures`);
  }
  console.log(`  output                      : ${options.outputPath ?? "data/processed/rainfall.csv"}`);
  console.log(`  duration                    : ${report.durationMs}ms`);

  if (strict && report.filesFailed > 0) process.exit(1);
}

main().catch((e) => {
  console.error("processing aborted:", e instanceof Error ? e.message : e);
  process.exit(1);
});
