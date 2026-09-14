import { prisma } from "./prisma";
import { riskLevelFor, type RiskLevel } from "./risk";
import { istDateKey } from "./data";

/** Public report: city-wide risk mix, trend, 7-day outlook and zone table.
 * Everything is derived from stored Open-Meteo snapshots; nothing is staff-only. */
export interface PublicZoneRow {
  zoneId: string;
  number: number;
  name: string;
  todayMm: number | null;
  risk: RiskLevel | null;
  totalMm: number;
  rainyDays: number;
  wettestDay: { date: string; mm: number } | null;
}

export interface PublicDay {
  date: string;
  cityMm: number;
  maxZoneMm: number;
  tempMaxC: number;
  tempMinC: number;
  windMaxKmh: number;
}

export interface PublicOutlook {
  date: string;
  cityMm: number;
  zoneMm: number[];
}

export interface PublicReport {
  windowDays: number;
  zones: PublicZoneRow[];
  days: PublicDay[];
  outlook: PublicOutlook[];
  generatedAt: string;
}

export async function getPublicReport(windowDays = 14): Promise<PublicReport | null> {
  const zones = await prisma.zone.findMany({ where: { isActive: true }, orderBy: { number: "asc" } });
  if (zones.length === 0) return null;

  const cutoff = new Date();
  cutoff.setUTCHours(0, 0, 0, 0);
  cutoff.setUTCDate(cutoff.getUTCDate() - (windowDays - 1));
  const outlookEnd = new Date(cutoff);
  outlookEnd.setUTCDate(outlookEnd.getUTCDate() + windowDays - 1 + 7);

  const zoneRows: PublicZoneRow[] = [];
  const perDay = new Map<string, { mm: number; maxMm: number; tMax: number; tMin: number; wind: number; n: number }>();
  const outlookMap = new Map<string, { cityMm: number; zoneMm: number[]; perZone: Map<string, number> }>();
  const todayKey = istDateKey(new Date());

  for (const zone of zones) {
    const snapshots = await prisma.forecastSnapshot.findMany({
      where: { zoneId: zone.id, source: "open-meteo", forecastDate: { gte: cutoff, lte: outlookEnd } },
      orderBy: { forecastDate: "asc" },
    });
    if (snapshots.length === 0) continue;

    let rainyDays = 0;
    let totalMm = 0;
    let wettestDay: PublicZoneRow["wettestDay"] = null;
    let todayMm: number | null = null;

    for (const s of snapshots) {
      const key = istDateKey(s.forecastDate);
      const isOutlook = key >= todayKey;
      if (!isOutlook) {
        if (s.precipSumMm >= 0.5) rainyDays++;
        totalMm += s.precipSumMm;
        if (!wettestDay || s.precipSumMm > wettestDay.mm) {
          wettestDay = { date: key, mm: s.precipSumMm };
        }
        if (key === todayKey) todayMm = s.precipSumMm;
      }

      if (!isOutlook) {
        const bucket = perDay.get(key) ?? { mm: 0, maxMm: 0, tMax: 0, tMin: 0, wind: 0, n: 0 };
        bucket.mm += s.precipSumMm;
        bucket.maxMm = Math.max(bucket.maxMm, s.precipSumMm);
        bucket.tMax += s.tempMaxC;
        bucket.tMin += s.tempMinC;
        bucket.wind += s.windMaxKmh;
        bucket.n += 1;
        perDay.set(key, bucket);
      }

      if (isOutlook) {
        let slot = outlookMap.get(key);
        if (!slot) {
          slot = { cityMm: 0, zoneMm: [], perZone: new Map() };
          outlookMap.set(key, slot);
        }
        slot.perZone.set(zone.id, s.precipSumMm);
      }
    }

    zoneRows.push({
      zoneId: zone.id,
      number: zone.number,
      name: zone.name,
      todayMm,
      risk: todayMm !== null ? riskLevelFor(todayMm, zone) : null,
      totalMm,
      rainyDays,
      wettestDay,
    });
  }

  const days: PublicDay[] = [...perDay.entries()]
    .sort(([a], [b]) => (a < b ? -1 : 1))
    .map(([date, b]) => ({
      date,
      cityMm: b.mm / b.n,
      maxZoneMm: b.maxMm,
      tempMaxC: b.tMax / b.n,
      tempMinC: b.tMin / b.n,
      windMaxKmh: b.wind / b.n,
    }));

  const outlook = [...outlookMap.entries()]
    .sort(([a], [b]) => (a < b ? -1 : 1))
    .slice(0, 7)
    .map(([date, slot]) => {
      const zoneMm = zones.map((z) => slot.perZone.get(z.id) ?? 0);
      return { date, cityMm: zoneMm.reduce((a, b) => a + b, 0) / (zoneMm.length || 1), zoneMm };
    });

  return {
    windowDays,
    zones: zoneRows,
    days,
    outlook,
    generatedAt: new Date().toISOString(),
  };
}
