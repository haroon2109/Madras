import "dotenv/config";
import { prisma } from "@/lib/prisma";
import rawConfig from "@/config/reservoirs.json";

const config = rawConfig as { version: number; source: string; notes: string; reservoirs: Array<{ key: string; name: string; capacityTmcft: number; latitude: number; longitude: number }> };

async function main() {
  console.log(`Seeding ${config.reservoirs.length} reservoirs...`);

  for (const r of config.reservoirs) {
    await prisma.reservoir.create({
      data: {
        id: `reservoir-${r.key}`,
        name: r.name,
        capacityTmcft: r.capacityTmcft,
        latitude: r.latitude,
        longitude: r.longitude,
        isActive: true,
      },
    });
    console.log(`  Created: ${r.name}`);
  }

  console.log("Reservoir seed complete!");
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error("Seed failed:", e);
  process.exit(1);
});
