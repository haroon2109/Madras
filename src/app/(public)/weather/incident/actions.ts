"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getChennaiZones } from "@/lib/zones";

export async function fileCitizenIncident(formData: FormData): Promise<{ ok: boolean; error?: string }> {
  const zoneNumberRaw = String(formData.get("zoneNumber") ?? "").trim();
  const zoneNumber = Number(zoneNumberRaw);
  if (!zoneNumberRaw || !Number.isInteger(zoneNumber) || zoneNumber < 1) {
    return { ok: false, error: "Choose your zone." };
  }

  const zone = getChennaiZones().find((z) => z.number === zoneNumber);
  if (!zone) return { ok: false, error: "Unknown zone." };

  const dbZone = await prisma.zone.findUnique({ where: { number: zoneNumber } });
  if (!dbZone) return { ok: false, error: "Zone not configured." };

  const description = String(formData.get("description") ?? "").trim().slice(0, 500);
  if (!description) return { ok: false, error: "Add a short description of what you see." };

  const depthRaw = String(formData.get("depthCm") ?? "").trim();
  const depthCm = depthRaw === "" ? 0 : Math.max(0, Math.round(Number(depthRaw) || 0));
  if (depthCm > 0 && !Number.isFinite(depthCm)) return { ok: false, error: "Enter a valid water depth if known." };

  const reporterName = String(formData.get("reporterName") ?? "").trim().slice(0, 120) || null;
  const latRaw = String(formData.get("latitude") ?? "").trim();
  const lngRaw = String(formData.get("longitude") ?? "").trim();
  const latitude = latRaw === "" ? dbZone.latitude : Number(latRaw);
  const longitude = lngRaw === "" ? dbZone.longitude : Number(lngRaw);

  if (latRaw !== "" && (!Number.isFinite(latitude) || latitude < -90 || latitude > 90)) {
    return { ok: false, error: "Enter a valid latitude." };
  }
  if (lngRaw !== "" && (!Number.isFinite(longitude) || longitude < -180 || longitude > 180)) {
    return { ok: false, error: "Enter a valid longitude." };
  }

  try {
    await prisma.incident.create({
      data: {
        zoneId: dbZone.id,
        latitude,
        longitude,
        depthCm,
        description,
        photoUrl: null,
        status: "OPEN",
        source: "citizen",
        reporterName,
        createdAt: new Date(),
      },
    });
    revalidatePath("/weather/incident");
    revalidatePath("/weather");
    return { ok: true };
  } catch (e) {
    console.error("fileCitizenIncident failed:", e);
    return { ok: false, error: "Could not file the report. Please try again." };
  }
}
