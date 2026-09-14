"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { dateKeyToDate } from "@/lib/weather";

async function requireAnalyst() {
  const session = await auth();
  if (!session?.user || (session.user.role !== "ADMIN" && session.user.role !== "ANALYST")) {
    return { ok: false as const, error: "Analyst access required." };
  }
  return { ok: true as const };
}

export async function upsertFieldObservation(formData: FormData): Promise<void> {
  const guard = await requireAnalyst();
  if (!guard.ok) return;

  const zoneId = String(formData.get("zoneId") ?? "");
  const dateKey = String(formData.get("date") ?? "").trim();
  if (!zoneId || !/^\d{4}-\d{2}-\d{2}$/.test(dateKey)) return;

  const rainfallRaw = String(formData.get("rainfallMm") ?? "").trim();
  const depthRaw = String(formData.get("depthCm") ?? "").trim();
  const rainfallMm = rainfallRaw === "" ? null : Number(rainfallRaw);
  const depthCm = depthRaw === "" ? null : Math.max(0, Math.round(Number(depthRaw) || 0));

  if (rainfallMm !== null && (!Number.isFinite(rainfallMm) || rainfallMm < 0)) return;
  if (depthCm !== null && (!Number.isFinite(depthCm) || depthCm < 0)) return;

  const note = String(formData.get("note") ?? "").trim().slice(0, 300) || null;

  const zone = await prisma.zone.findUnique({ where: { id: zoneId } });
  if (!zone) return;

  const session = await auth();
  if (!session?.user?.id) return;

  await prisma.fieldObservation.upsert({
    where: { zoneId_date: { zoneId, date: dateKeyToDate(dateKey) } },
    update: { rainfallMm, depthCm, note, source: "field" },
    create: {
      zoneId,
      userId: session.user.id,
      date: dateKeyToDate(dateKey),
      rainfallMm,
      depthCm,
      note,
      source: "field",
    },
  });

  revalidatePath("/accuracy");
  revalidatePath("/analytics");
  revalidatePath("/field-observations");
}
