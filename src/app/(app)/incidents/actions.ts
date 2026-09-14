"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { dateKeyToDate } from "@/lib/weather";

const INCIDENT_STATUSES = ["OPEN", "VERIFIED", "RESOLVED", "REJECTED"] as const;

/** Incident actions are admin-only — /incidents is an admin-only surface. */
async function requireAdmin() {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") {
    return { ok: false as const, error: "Admin access required." };
  }
  return { ok: true as const };
}

/** Manual reservoir/tide entry (features 8 & 9) stays open to analysts too. */
async function requireStaff() {
  const session = await auth();
  if (session?.user?.role !== "ADMIN" && session?.user?.role !== "ANALYST") {
    return { ok: false as const, error: "Staff access required." };
  }
  return { ok: true as const };
}

/** Feature 2 — file a waterlogging / flood incident for a zone. */
export async function createIncident(formData: FormData): Promise<void> {
  const guard = await requireAdmin();
  if (!guard.ok) return;
  const zoneId = String(formData.get("zoneId") ?? "");
  if (!zoneId) return;
  const zone = await prisma.zone.findUnique({ where: { id: zoneId } });
  if (!zone) return;
  const num = (key: string, fallback: number) => {
    const n = Number(String(formData.get(key) ?? ""));
    return Number.isFinite(n) ? n : fallback;
  };
  await prisma.incident.create({
    data: {
      zoneId,
      latitude: num("latitude", zone.latitude),
      longitude: num("longitude", zone.longitude),
      depthCm: Math.max(0, Math.round(num("depthCm", 0))),
      description: String(formData.get("description") ?? "").trim().slice(0, 500),
      source: String(formData.get("source") ?? "field") === "citizen" ? "citizen" : "field",
      reporterName: String(formData.get("reporterName") ?? "").trim().slice(0, 120) || null,
      photoUrl: String(formData.get("photoDataUrl") ?? "").trim() || null,
      status: "OPEN",
    },
  });
  revalidatePath("/incidents");
  revalidatePath("/dashboard");
}

export async function setIncidentStatus(formData: FormData): Promise<void> {
  const guard = await requireAdmin();
  if (!guard.ok) return;
  const id = String(formData.get("id") ?? "");
  const status = String(formData.get("status") ?? "");
  if (!id || !INCIDENT_STATUSES.includes(status as (typeof INCIDENT_STATUSES)[number])) return;
  await prisma.incident.update({
    where: { id },
    data: {
      status,
      resolvedAt: status === "RESOLVED" ? new Date() : null,
    },
  });
  revalidatePath("/incidents");
  revalidatePath("/dashboard");
}

/** Feature 8 — manual reservoir reading entry (admin/analyst). */
export async function upsertReservoirReading(formData: FormData): Promise<void> {
  const guard = await requireStaff();
  if (!guard.ok) return;
  const reservoirId = String(formData.get("reservoirId") ?? "");
  const dateKey = String(formData.get("date") ?? "").trim();
  if (!reservoirId || !/^\d{4}-\d{2}-\d{2}$/.test(dateKey)) return;
  const reservoir = await prisma.reservoir.findUnique({ where: { id: reservoirId } });
  if (!reservoir) return;
  const level = Number(String(formData.get("levelTmcft") ?? ""));
  if (!Number.isFinite(level) || level < 0) return;
  const inflow = Number(String(formData.get("inflowCusec") ?? "0")) || 0;
  const outflow = Number(String(formData.get("outflowCusec") ?? "0")) || 0;
  const pct = Math.round((level / reservoir.capacityTmcft) * 1000) / 10;
  await prisma.reservoirReading.upsert({
    where: { reservoirId_date: { reservoirId, date: dateKeyToDate(dateKey) } },
    update: { levelTmcft: level, storagePct: pct, inflowCusec: inflow, outflowCusec: outflow },
    create: {
      reservoirId,
      date: dateKeyToDate(dateKey),
      levelTmcft: level,
      storagePct: pct,
      inflowCusec: inflow,
      outflowCusec: outflow,
      source: "manual",
    },
  });
  revalidatePath("/dashboard");
  revalidatePath("/season");
  revalidatePath("/admin");
}

/** Feature 9 — manual harbour tide reading overrides the estimate. */
export async function upsertTideReading(formData: FormData): Promise<void> {
  const guard = await requireStaff();
  if (!guard.ok) return;
  const dateKey = String(formData.get("date") ?? "").trim();
  const highTideAt = String(formData.get("highTideAt") ?? "").trim();
  const highTideM = Number(String(formData.get("highTideM") ?? ""));
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateKey)) return;
  if (!/^\d{2}:\d{2}$/.test(highTideAt)) return;
  if (!Number.isFinite(highTideM) || highTideM < 0 || highTideM > 5) return;
  const lowRaw = String(formData.get("lowTideAt") ?? "").trim();
  const lowM = Number(String(formData.get("lowTideM") ?? ""));
  await prisma.tideReading.upsert({
    where: { date: dateKeyToDate(dateKey) },
    update: {
      highTideAt,
      highTideM,
      lowTideAt: /^\d{2}:\d{2}$/.test(lowRaw) ? lowRaw : null,
      lowTideM: Number.isFinite(lowM) ? lowM : null,
      source: "manual",
    },
    create: {
      date: dateKeyToDate(dateKey),
      highTideAt,
      highTideM,
      lowTideAt: /^\d{2}:\d{2}$/.test(lowRaw) ? lowRaw : null,
      lowTideM: Number.isFinite(lowM) ? lowM : null,
      source: "manual",
    },
  });
  revalidatePath("/decisions");
  revalidatePath("/dashboard");
}
