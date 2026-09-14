/**
 * Zone configuration sync & validation CLI.
 *
 *   npx tsx src/scripts/sync-zones.ts              # validate + upsert config zones into the DB
 *   npx tsx src/scripts/sync-zones.ts --validate   # validate config + DB only, change nothing
 *   npx tsx src/scripts/sync-zones.ts --no-prune   # do not deactivate DB zones absent from config
 *
 * The zone configuration in src/config/chennai-zones.json is the source of
 * truth for zone identity (number, name, centroid). Application logic never
 * hardcodes zones; runtime rows are hydrated from the validated configuration.
 *
 * Exits 1 if the configuration fails validation or DB zones disagree with it.
 */

import "dotenv/config";
import { prisma } from "@/lib/prisma";
import { validateZoneConfig, zoneConfig } from "@/lib/zones";

interface SyncOptions {
  validateOnly: boolean;
  prune: boolean;
}

function parseArgs(argv: string[]): SyncOptions {
  return {
    validateOnly: argv.includes("--validate"),
    prune: !argv.includes("--no-prune"),
  };
}

/** Compare DB zones against the config; returns human-readable mismatches. */
async function dbMismatches(): Promise<string[]> {
  const config = zoneConfig;
  const dbZones = await prisma.zone.findMany({ orderBy: { number: "asc" } });

  const issues: string[] = [];
  const byNumber = new Map(dbZones.map((z) => [z.number, z]));

  for (const zone of config.zones) {
    const db = byNumber.get(zone.number);
    if (!db) {
      issues.push(`zone ${zone.number} (${zone.name}): missing from DB`);
      continue;
    }
    if (db.name !== zone.name) {
      issues.push(`zone ${zone.number}: name mismatch — DB "${db.name}" vs config "${zone.name}"`);
    }
    if (db.latitude !== zone.centroid.latitude || db.longitude !== zone.centroid.longitude) {
      issues.push(
        `zone ${zone.number}: centroid mismatch — DB (${db.latitude}, ${db.longitude}) vs config (${zone.centroid.latitude}, ${zone.centroid.longitude})`
      );
    }
  }

  for (const db of dbZones) {
    if (!config.zones.some((z) => z.number === db.number)) {
      issues.push(`zone ${db.number} (${db.name}): present in DB but not in config`);
    }
  }
  return issues;
}

async function main(): Promise<void> {
  const options = parseArgs(process.argv.slice(2));

  // 1. Validate the configuration file; print clean errors and exit 1 if invalid.
  const { valid, errors } = validateZoneConfig(zoneConfig);
  if (!valid) {
    console.error(`❌ Invalid Chennai zone configuration:`);
    for (const err of errors) console.error(`   - ${err}`);
    process.exit(1);
  }
  const config = zoneConfig;
  console.log(`✅ Zone config valid — ${config.zones.length} zones (v${config.version})`);
  for (const zone of config.zones) {
    const geometry = zone.geometry ? "with boundary geometry" : "centroid only";
    console.log(
      `   zone ${String(zone.number).padStart(2, "0")} ${zone.name} (${zone.centroid.latitude}, ${zone.centroid.longitude}) — ${geometry}`
    );
  }

  // 2. Validate the DB view of the zones against the config.
  const mismatches = await dbMismatches();
  if (mismatches.length > 0) {
    console.error(`❌ DB zones disagree with config:`);
    for (const issue of mismatches) console.error(`   - ${issue}`);
    if (options.validateOnly) process.exit(1);
  } else {
    console.log(`✅ DB zones match config`);
  }

  if (options.validateOnly) {
    console.log("Validate-only: no changes written.");
    return;
  }

  // 3. Upsert every configured zone into the DB.
  for (const zone of config.zones) {
    await prisma.zone.upsert({
      where: { number: zone.number },
      update: {
        name: zone.name,
        latitude: zone.centroid.latitude,
        longitude: zone.centroid.longitude,
        isActive: true,
      },
      create: {
        number: zone.number,
        name: zone.name,
        latitude: zone.centroid.latitude,
        longitude: zone.centroid.longitude,
      },
    });
  }
  console.log(`✅ Upserted ${config.zones.length} zones into the DB`);

  // 4. Deactivate zones present in the DB but absent from the config, so the
  //    app stops forecasting for them without destroying forecast history.
  if (options.prune && mismatches.some((m) => m.includes("not in config"))) {
    const configNumbers = new Set(config.zones.map((z) => z.number));
    const extras = await prisma.zone.findMany({
      where: { number: { notIn: [...configNumbers] }, isActive: true },
    });
    for (const extra of extras) {
      await prisma.zone.update({ where: { id: extra.id }, data: { isActive: false } });
      console.log(`   deactivated zone ${extra.number} (${extra.name}) — not in config`);
    }
  }
}

main()
  .catch((e) => {
    console.error("zone sync aborted:", e instanceof Error ? e.message : e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
