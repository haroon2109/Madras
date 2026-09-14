import { PrismaClient } from "@prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaPg } from "@prisma/adapter-pg";
import "dotenv/config";
import bcrypt from "bcryptjs";
import { getChennaiZones } from "@/lib/zones";
import { fetchZoneDailyForecast } from "@/lib/weather";
import { riskLevelFor } from "@/lib/risk";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error(
    "DATABASE_URL is not set. Copy .env.example to .env and fill in a database connection string."
  );
}
// Local MVP uses SQLite (file:.), production uses Postgres.
const adapter = connectionString.startsWith("file:")
  ? new PrismaBetterSqlite3({ url: connectionString })
  : new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

// The 15 Greater Chennai Corporation zones come from the validated zone
// configuration (src/config/chennai-zones.json) — never hardcoded here.
const ZONES = getChennaiZones().map((z) => ({
  number: z.number,
  name: z.name,
  latitude: z.centroid.latitude,
  longitude: z.centroid.longitude,
}));

/** Polite spacing between Open-Meteo calls (free tier: 600 req/min). */
const INTER_ZONE_DELAY_MS = 250;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function main() {
  console.log("🌧  Seeding Madras platform...");

  const zones: Record<number, { id: string; watchThreshold: number; warningThreshold: number; alertThreshold: number }> = {};

  for (const z of ZONES) {
    const zone = await prisma.zone.upsert({
      where: { number: z.number },
      update: { latitude: z.latitude, longitude: z.longitude, isActive: true },
      create: z,
    });
    zones[z.number] = zone;
    console.log(`  zone ${z.number} ${z.name} (${z.latitude}, ${z.longitude})`);
  }

  // Purge any legacy synthetic rows from older seeds — the platform only
  // stores real forecast/observation data from Open-Meteo.
  const purged = await prisma.forecastSnapshot.deleteMany({ where: { source: { not: "open-meteo" } } });
  if (purged.count > 0) console.log(`  purged ${purged.count} non-open-meteo (synthetic) snapshot rows`);

  // Seed REAL history per zone: 29 days of past observed daily rainfall plus
  // the 7-day forecast, straight from Open-Meteo. This replaces the old
  // synthetic PRNG backfill — every stored value comes from the API.
  let failed = 0;
  for (const z of ZONES) {
    const zone = zones[z.number];
    try {
      const rows = await fetchZoneDailyForecast(
        { latitude: z.latitude, longitude: z.longitude },
        { pastDays: 29, forecastDays: 7 }
      );

      const forecastDates = rows.map((r) => new Date(`${r.date}T00:00:00.000Z`));
      await prisma.forecastSnapshot.deleteMany({
        where: { zoneId: zone.id, source: "open-meteo", forecastDate: { in: forecastDates } },
      });
      await prisma.forecastSnapshot.createMany({
        data: rows.map((r) => ({
          zoneId: zone.id,
          forecastDate: new Date(`${r.date}T00:00:00.000Z`),
          capturedAt: new Date(),
          precipSumMm: r.precipSumMm,
          precipProbMax: r.precipProbMax,
          tempMaxC: r.tempMaxC,
          tempMinC: r.tempMinC,
          windMaxKmh: r.windMaxKmh,
          riskLevel: riskLevelFor(r.precipSumMm, zone),
          source: "open-meteo",
          rawJson: JSON.stringify(r),
        })),
      });
      console.log(`  zone ${z.number} ${z.name}: stored ${rows.length} days of real Open-Meteo data`);
    } catch (e) {
      failed++;
      console.error(`  zone ${z.number} ${z.name}: Open-Meteo fetch failed — ${(e as Error).message}`);
      console.error("    (the app will backfill this zone automatically on first page load)");
    }
    await sleep(INTER_ZONE_DELAY_MS);
  }

  const stored = await prisma.forecastSnapshot.count({ where: { source: "open-meteo" } });
  console.log(`  stored ${stored} real snapshot rows across ${ZONES.length - failed}/${ZONES.length} zones`);

  // Feature 8 — hydrate Reservoir rows from src/config/reservoirs.json.
  const { getReservoirConfigs } = await import("@/lib/reservoirs");
  for (const r of getReservoirConfigs()) {
    await prisma.reservoir.upsert({
      where: { name: r.name },
      update: { capacityTmcft: r.capacityTmcft, latitude: r.latitude, longitude: r.longitude, isActive: true },
      create: { name: r.name, capacityTmcft: r.capacityTmcft, latitude: r.latitude, longitude: r.longitude },
    });
  }
  const resCount = await prisma.reservoir.count();
  console.log(`  reservoirs: ${resCount} configured`);

  // Feature 2 — incidents are intentionally NOT seeded. Every waterlogging
  // report must come from a real field-team or citizen submission so the
  // public never sees fabricated incident data.

  const passwordHash = await bcrypt.hash("Madras@2026", 10);
  const admin = await prisma.user.upsert({
    where: { email: "admin@madras.local" },
    update: { role: "ADMIN" },
    create: {
      name: "Madras Admin",
      email: "admin@madras.local",
      passwordHash,
      role: "ADMIN",
    },
  });
  console.log(`  admin user: ${admin.email} / Madras@2026`);

  console.log("✅ Seed complete.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
