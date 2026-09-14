import { prisma } from "@/lib/prisma";
import { riskLevelFor } from "@/lib/risk";
import { istToday, dateKeyToDate } from "@/lib/weather";

export interface PublicAlertItem {
  id: string;
  level: string;
  title: string;
  message: string;
  zoneNumber: number;
  zoneName: string;
  createdAt: Date;
  resolvedAt: Date | null;
  actions: string[];
}

export async function getPublicAlerts(limit = 8): Promise<PublicAlertItem[]> {
  const rows = await prisma.alert.findMany({
    orderBy: { createdAt: "desc" },
    take: limit,
    include: { zone: true },
  });

  return rows.map((r) => ({
    id: r.id,
    level: r.level,
    title: r.title,
    message: r.message,
    zoneNumber: r.zone.number,
    zoneName: r.zone.name,
    createdAt: r.createdAt,
    resolvedAt: r.resolvedAt,
    actions: JSON.parse(r.actions) as string[],
  }));
}

export interface CitizenActionAdvice {
  risk: string;
  headline: string;
  bullets: string[];
}

export function citizenActionAdviceFor(zoneId: string, precipMm: number, thresholds: {
  watchThreshold: number;
  warningThreshold: number;
  alertThreshold: number;
}): CitizenActionAdvice {
  const risk = riskLevelFor(precipMm, {
    watchThreshold: thresholds.watchThreshold,
    warningThreshold: thresholds.warningThreshold,
    alertThreshold: thresholds.alertThreshold,
  });

  const map: Record<string, CitizenActionAdvice> = {
    LOW: {
      risk: "Low",
      headline: "Conditions look calm today.",
      bullets: [
        "No unusual rainfall expected.",
        "Normal movement and routines are fine.",
        "Keep an eye on local news if the weather changes.",
      ],
    },
    WATCH: {
      risk: "Watch",
      headline: "Light to moderate rain possible — stay aware.",
      bullets: [
        "Plan ahead if you need to travel.",
        "Avoid known low-lying pockets if rain starts.",
        "Keep phones charged in case conditions worsen.",
      ],
    },
    WARNING: {
      risk: "Warning",
      headline: "Heavy rain likely — take simple precautions.",
      bullets: [
        "Avoid low-lying and flood-prone streets.",
        "Move valuables and vehicles to higher ground if possible.",
        "Keep children and pets away from drains and open water.",
        "Prepare a small emergency bag: phone, torch, documents, medicine.",
      ],
    },
    ALERT: {
      risk: "Alert",
      headline: "Very heavy rain expected — act now.",
      bullets: [
        "Do not walk or drive through flooded roads.",
        "Move to safer ground early if you live in a flood-prone area.",
        "Follow instructions from local authorities immediately.",
        "Keep family and neighbours informed, especially older residents.",
        "Call emergency services only for urgent, life-threatening situations.",
      ],
    },
  };

  return map[risk] ?? map.LOW;
}
