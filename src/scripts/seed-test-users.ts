/**
 * Dev fixture: upsert non-admin test users so role-aware UI can be verified
 * by signing in with each role. Local dev database only.
 *
 *   npx tsx src/scripts/seed-test-users.ts
 */
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

async function main() {
  const passwordHash = await bcrypt.hash("Madras@2026", 10);

  await prisma.user.upsert({
    where: { email: "analyst@madras.local" },
    update: { role: "ANALYST" },
    create: { email: "analyst@madras.local", name: "Test Analyst", passwordHash, role: "ANALYST" },
  });
  await prisma.user.upsert({
    where: { email: "viewer@madras.local" },
    update: { role: "VIEWER" },
    create: { email: "viewer@madras.local", name: "Test Viewer", passwordHash, role: "VIEWER" },
  });

  const users = await prisma.user.findMany({
    select: { email: true, role: true },
    orderBy: { email: "asc" },
  });
  console.log("Users:", users);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
