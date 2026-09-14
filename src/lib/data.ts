import { prisma } from "./prisma";
import { refreshZoneSnapshots, istToday, dateKeyToDate } from "./weather";
import {
  RiskLevel,
  RISK_META,
  riskLevelFor,
  recommendationsFor,
  riskTitle,
  riskMessage,
} from "./risk";

const STALE_AFTER_MS = 3 * 60 * 60 * 1000; // 3 hours

export interface ForecastServiceStatusInfo {
  healthy: boolean;
  /** Age of the freshest snapshot in ms; null when nothing is stored yet. */
  ageMs: number | null;
}

/** Health of the forecast pipeline: is the freshest stored snapshot recent? */
export async function getForecastServiceStatus(): Promise<ForecastServiceStatusInfo> {
  const latest = await prisma.forecastSnapshot.findFirst({
    orderBy: { capturedAt: "desc" },
    select: { capturedAt: true },
  });
  if (!latest) return { healthy: false, ageMs: null };
  const ageMs = Date.now() - latest.capturedAt.getTime();
  return { healthy: ageMs < STALE_AFTER_MS, ageMs };
}

export interface ZoneForecastSummary {
  zone: {
    id: string;
    number: number;
    name: string;
    latitude: number;
    longitude: number;
    watchThreshold: number;
    warningThreshold: number;
    alertThreshold: number;
  };
  today: {
    date: string;
    precipMm: number;
    precipProbMax: number;
    tempMaxC: number;
    tempMinC: number;
    windMaxKmh: number;
    risk: RiskLevel;
  } | null;
  week: {
    date: string;
    precipMm: number;
    precipProbMax: number;
    risk: RiskLevel;
  }[];
  lastUpdated: Date | null;
}

/** Refresh forecasts for any zone whose latest snapshot is stale. */
export async function ensureFreshForecasts(): Promise<{ refreshed: string[]; failed: string[] }> {
  const zones = await prisma.zone.findMany({ where: { isActive: true } });
  const refreshed: string[] = [];
  const failed: string[] = [];

  for (const zone of zones) {
    const latest = await prisma.forecastSnapshot.findFirst({
      where: { zoneId: zone.id, source: "open-meteo" },
      orderBy: { capturedAt: "desc" },
    });
    if (latest && Date.now() - latest.capturedAt.getTime() < STALE_AFTER_MS) continue;

    try {
      await refreshZoneSnapshots(zone);
      refreshed.push(zone.name);
    } catch (e) {
      console.error(`Failed to refresh ${zone.name}:`, e);
      failed.push(zone.name);
    }
  }
  return { refreshed, failed };
}

/** Force-refresh every active zone regardless of staleness. */
export async function refreshAllZones(): Promise<{ refreshed: string[]; failed: string[] }> {
  const zones = await prisma.zone.findMany({ where: { isActive: true } });
  const refreshed: string[] = [];
  const failed: string[] = [];

  for (const zone of zones) {
    try {
      await refreshZoneSnapshots(zone);
      refreshed.push(zone.name);
    } catch (e) {
      console.error(`Failed to refresh ${zone.name}:`, e);
      failed.push(zone.name);
    }
  }
  return { refreshed, failed };
}

/** Dashboard data: every active zone with today's forecast and 7-day outlook. */
export async function getDashboardData(): Promise<{
  zones: ZoneForecastSummary[];
  citySummary: {
    total: number;
    alert: number;
    warning: number;
    watch: number;
    maxPrecip: { mm: number; zoneName: string } | null;
  };
  lastUpdated: Date | null;
}> {
  const zones = await prisma.zone.findMany({ where: { isActive: true }, orderBy: { number: "asc" } });
  const todayKey = istToday();

  const summaries: ZoneForecastSummary[] = [];
  let lastUpdated: Date | null = null;

  for (const zone of zones) {
    const snapshots = await prisma.forecastSnapshot.findMany({
      where: { zoneId: zone.id, source: "open-meteo" },
      orderBy: { forecastDate: "asc" },
    });
    const latestCapture =
      snapshots.length > 0
        ? snapshots.reduce((a, b) => (a.capturedAt > b.capturedAt ? a : b)).capturedAt
        : null;
    if (latestCapture && (!lastUpdated || latestCapture > lastUpdated)) lastUpdated = latestCapture;

    const todayRow = snapshots.find((s) => istDateKey(s.forecastDate) === todayKey) ?? snapshots.at(-1) ?? null;

    const week = snapshots
      .filter((s) => istDateKey(s.forecastDate) >= todayKey)
      .slice(0, 7)
      .map((s) => ({
        date: istDateKey(s.forecastDate),
        precipMm: s.precipSumMm,
        precipProbMax: s.precipProbMax,
        risk: riskLevelFor(s.precipSumMm, zone),
      }));

    summaries.push({
      zone: {
        id: zone.id,
        number: zone.number,
        name: zone.name,
        latitude: zone.latitude,
        longitude: zone.longitude,
        watchThreshold: zone.watchThreshold,
        warningThreshold: zone.warningThreshold,
        alertThreshold: zone.alertThreshold,
      },
      today: todayRow
        ? {
            date: istDateKey(todayRow.forecastDate),
            precipMm: todayRow.precipSumMm,
            precipProbMax: todayRow.precipProbMax,
            tempMaxC: todayRow.tempMaxC,
            tempMinC: todayRow.tempMinC,
            windMaxKmh: todayRow.windMaxKmh,
            risk: riskLevelFor(todayRow.precipSumMm, zone),
          }
        : null,
      week,
      lastUpdated: latestCapture,
    });
  }

  const counts = { alert: 0, warning: 0, watch: 0 };
  let maxPrecip: { mm: number; zoneName: string } | null = null;
  for (const s of summaries) {
    const today = s.today;
    if (!today) continue;
    if (today.risk === "ALERT") counts.alert++;
    else if (today.risk === "WARNING") counts.warning++;
    else if (today.risk === "WATCH") counts.watch++;
    if (!maxPrecip || today.precipMm > maxPrecip.mm) {
      maxPrecip = { mm: today.precipMm, zoneName: s.zone.name };
    }
  }

  return {
    zones: summaries,
    citySummary: { total: zones.length, ...counts, maxPrecip },
    lastUpdated,
  };
}

/** Generate/refresh alerts for zones crossing their watch threshold today. */
export async function assessAndAlert(): Promise<number> {
  const zones = await prisma.zone.findMany({ where: { isActive: true } });
  const todayKey = istToday();
  let created = 0;

  for (const zone of zones) {
    const snapshot = await prisma.forecastSnapshot.findFirst({
      where: { zoneId: zone.id, forecastDate: dateKeyToDate(todayKey), source: "open-meteo" },
      orderBy: { capturedAt: "desc" },
    });
    if (!snapshot) continue;

    const { level, actions } = recommendationsFor(snapshot.precipSumMm, zone);
    if (level === "LOW") continue;

    const existing = await prisma.alert.findFirst({
      where: {
        zoneId: zone.id,
        level,
        createdAt: { gte: dateKeyToDate(todayKey) },
        resolvedAt: null,
      },
    });
    if (existing) continue;

    await prisma.alert.create({
      data: {
        zoneId: zone.id,
        level,
        title: riskTitle(level, zone.name),
        message: riskMessage(level, snapshot.precipSumMm),
        actions: JSON.stringify(actions),
      },
    });
    created++;
  }
  return created;
}

export interface AlertDTO {
  id: string;
  level: RiskLevel;
  title: string;
  message: string;
  actions: string[];
  createdAt: Date;
  resolvedAt: Date | null;
  zone: { id: string; number: number; name: string };
}

/** Active (unresolved) alerts for the notification bell — newest first. */
export async function getActiveAlerts(limit = 20): Promise<AlertDTO[]> {
  const rows = await prisma.alert.findMany({
    where: { resolvedAt: null },
    orderBy: { createdAt: "desc" },
    take: limit,
    include: { zone: true },
  });
  return rows.map((r) => ({
    id: r.id,
    level: r.level as RiskLevel,
    title: r.title,
    message: r.message,
    actions: JSON.parse(r.actions) as string[],
    createdAt: r.createdAt,
    resolvedAt: r.resolvedAt,
    zone: { id: r.zone.id, number: r.zone.number, name: r.zone.name },
  }));
}

/** Total count of unresolved alerts (for the badge). */
export async function getActiveAlertCount(): Promise<number> {
  return prisma.alert.count({ where: { resolvedAt: null } });
}

const MODELS_FOR_HOURLY = ["ecmwf", "gfs"] as const;

export interface HourlyModelPoint {
  /** IST hour key, "YYYY-MM-DDTHH" (local wall clock). */
  hour: string;
  ecmwf: number | null;
  gfs: number | null;
}

/**
 * Analytics: normalized hourly rainfall by model for one zone, last `hours`.
 *
 * Reads the processed `HourlyRainfall` table (loaded from the preprocessing
 * pipeline output). Hours are re-keyed to IST wall clock for display; a null
 * value means missing/invalid at the source — kept, never interpolated.
 * Returns null when the zone has no hourly data at all.
 */
export async function getZoneHourlyModels(
  zoneId: string,
  hours = 48
): Promise<{ zone: { id: string; number: number; name: string }; points: HourlyModelPoint[]; models: string[] } | null> {
  const zone = await prisma.zone.findUnique({ where: { id: zoneId } });
  if (!zone) return null;

  const since = new Date(Date.now() - hours * 3_600_000);
  const rows = await prisma.hourlyRainfall.findMany({
    where: { zoneId, model: { in: [...MODELS_FOR_HOURLY] }, timestamp: { gte: since } },
    orderBy: { timestamp: "asc" },
  });
  if (rows.length === 0) return null;

  // Group rows by IST wall-clock hour, one slot per model.
  // Group rows by IST wall-clock hour, one slot per model. IST is fixed
  // UTC+05:30 (no DST), so a constant offset keeps hour keys deterministic.
  const IST_OFFSET_MS = 5.5 * 3_600_000;
  const byHour = new Map<string, { ecmwf: number | null; gfs: number | null }>();
  for (const r of rows) {
    const hourKey = new Date(r.timestamp.getTime() + IST_OFFSET_MS).toISOString().slice(0, 13);
    const slot = byHour.get(hourKey) ?? { ecmwf: null, gfs: null };
    slot[r.model as "ecmwf" | "gfs"] = r.rainfallMmHr;
    byHour.set(hourKey, slot);
  }

  const points: HourlyModelPoint[] = [...byHour.entries()]
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([hour, slot]) => ({ hour, ecmwf: slot.ecmwf, gfs: slot.gfs }));

  return {
    zone: { id: zone.id, number: zone.number, name: zone.name },
    points,
    models: [...MODELS_FOR_HOURLY],
  };
}

/** Analytics: forecast snapshots for one zone, newest first. */
export async function getZoneHistory(zoneId: string, days = 30) {
  const zone = await prisma.zone.findUnique({ where: { id: zoneId } });
  if (!zone) return null;

  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);

  const snapshots = await prisma.forecastSnapshot.findMany({
    where: { zoneId, forecastDate: { gte: cutoff } },
    orderBy: { forecastDate: "asc" },
  });

  return { zone, snapshots };
}

export function istDateKey(date: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

/* ------------------------------------------------------------------ */
/* Feature 2 — incidents                                               */
/* ------------------------------------------------------------------ */

export type IncidentStatus = "OPEN" | "VERIFIED" | "RESOLVED" | "REJECTED";

export interface IncidentDTO {
  id: string;
  zoneId: string;
  zoneNumber: number;
  zoneName: string;
  latitude: number;
  longitude: number;
  depthCm: number;
  description: string;
  photoUrl: string | null;
  status: string;
  source: string;
  reporterName: string | null;
  createdAt: Date;
  resolvedAt: Date | null;
}

/** Active (unresolved) incidents for the dashboard map layer + counts. */
export async function getActiveIncidents(): Promise<IncidentDTO[]> {
  const rows = await prisma.incident.findMany({
    where: { status: { in: ["OPEN", "VERIFIED"] } },
    include: { zone: true },
    orderBy: { createdAt: "desc" },
  });
  return rows.map((r) => ({
    id: r.id, zoneId: r.zoneId, zoneNumber: r.zone.number, zoneName: r.zone.name,
    latitude: r.latitude, longitude: r.longitude, depthCm: r.depthCm,
    description: r.description, photoUrl: r.photoUrl, status: r.status,
    source: r.source, reporterName: r.reporterName,
    createdAt: r.createdAt, resolvedAt: r.resolvedAt,
  }));
}

/** Paginated incident history for /incidents (newest first). */
export async function getIncidents(
  opts: { status?: string; zoneId?: string; limit?: number } = {}
): Promise<{
  incidents: IncidentDTO[];
  counts: { open: number; verified: number; resolved: number };
}> {
  const where: { status?: string; zoneId?: string } = {};
  if (opts.status && opts.status !== "ALL") where.status = opts.status;
  if (opts.zoneId) where.zoneId = opts.zoneId;
  const [rows, open, verified, resolved] = await Promise.all([
    prisma.incident.findMany({
      where, include: { zone: true },
      orderBy: { createdAt: "desc" },
      take: opts.limit ?? 100,
    }),
    prisma.incident.count({ where: { status: "OPEN" } }),
    prisma.incident.count({ where: { status: "VERIFIED" } }),
    prisma.incident.count({ where: { status: "RESOLVED" } }),
  ]);
  return {
    incidents: rows.map((r) => ({
      id: r.id, zoneId: r.zoneId, zoneNumber: r.zone.number, zoneName: r.zone.name,
      latitude: r.latitude, longitude: r.longitude, depthCm: r.depthCm,
      description: r.description, photoUrl: r.photoUrl, status: r.status,
      source: r.source, reporterName: r.reporterName,
      createdAt: r.createdAt, resolvedAt: r.resolvedAt,
    })),
    counts: { open, verified, resolved },
  };
}

/** Depth severity bucket for map-marker styling. */
export function incidentSeverity(depthCm: number): "MINOR" | "MODERATE" | "SEVERE" {
  if (depthCm >= 60) return "SEVERE";
  if (depthCm >= 20) return "MODERATE";
  return "MINOR";
}

/* ------------------------------------------------------------------ */
/* Feature 3 — forecast accuracy / model scorecard                     */
/* Compares daily-aggregate ECMWF vs GFS (from HourlyRainfall) against  */
/* the stored Open-Meteo daily analysis for the same date.             */
/* ------------------------------------------------------------------ */

export interface ModelAccuracyRow {
  model: "ecmwf" | "gfs";
  days: number;
  maeMm: number;
  biasMm: number;
  hitRate: number;
  totalForecastMm: number;
  totalObservedMm: number;
}

export interface ZoneAccuracy {
  zoneId: string;
  zoneNumber: number;
  zoneName: string;
  rows: ModelAccuracyRow[];
  winner: "ecmwf" | "gfs" | null;
}

/**
 * Per-zone accuracy over the past `days`: aggregate each model's hourly
 * rows into IST daily totals, compare with daily analysis snapshots.
 * Only dates having BOTH a model aggregate and an observed value count.
 */
export async function getModelAccuracy(days = 14): Promise<{
  zones: ZoneAccuracy[];
  cityMae: { ecmwf: number; gfs: number };
  daysEvaluated: number;
}> {
  const zones = await prisma.zone.findMany({ where: { isActive: true }, orderBy: { number: "asc" } });
  const todayKey = istToday();
  const cutoffDate = new Date();
  cutoffDate.setUTCDate(cutoffDate.getUTCDate() - days);
  const cutoffKey = istDateKey(cutoffDate);

  const zoneAcc: ZoneAccuracy[] = [];
  let ecmwfErr = 0;
  let gfsErr = 0;
  let ecmwfN = 0;
  let gfsN = 0;
  const evaluatedDates = new Set<string>();
  const IST_OFFSET_MS = 5.5 * 3_600_000;

  for (const zone of zones) {
    const [hourly, snaps] = await Promise.all([
      prisma.hourlyRainfall.findMany({
        where: { zoneId: zone.id, model: { in: ["ecmwf", "gfs"] } },
      }),
      prisma.forecastSnapshot.findMany({
        where: { zoneId: zone.id, source: "open-meteo" },
        orderBy: { forecastDate: "asc" },
      }),
    ]);

    const observed = new Map<string, number>();
    for (const s of snaps) {
      const key = istDateKey(s.forecastDate);
      if (key >= todayKey || key < cutoffKey) continue;
      observed.set(key, s.precipSumMm);
    }

    const perModel = new Map<"ecmwf" | "gfs", Map<string, number>>();
    for (const r of hourly) {
      const dayKey = new Date(r.timestamp.getTime() + IST_OFFSET_MS).toISOString().slice(0, 10);
      if (dayKey >= todayKey || dayKey < cutoffKey) continue;
      if (r.rainfallMmHr === null) continue;
      const m = r.model as "ecmwf" | "gfs";
      if (m !== "ecmwf" && m !== "gfs") continue;
      let day = perModel.get(m);
      if (!day) {
        day = new Map();
        perModel.set(m, day);
      }
      day.set(dayKey, (day.get(dayKey) ?? 0) + r.rainfallMmHr);
    }

    const buildRow = (model: "ecmwf" | "gfs"): ModelAccuracyRow => {
      const fc = perModel.get(model) ?? new Map<string, number>();
      let n = 0;
      let absErr = 0;
      let bias = 0;
      let hits = 0;
      let rainyObs = 0;
      let fcTotal = 0;
      let obTotal = 0;
      for (const [date, obs] of observed) {
        const f = fc.get(date);
        if (f === undefined) continue;
        n++;
        absErr += Math.abs(f - obs);
        bias += f - obs;
        fcTotal += f;
        obTotal += obs;
        if (obs >= 0.5) {
          rainyObs++;
          if (f >= 0.5) hits++;
        }
      }
      return {
        model, days: n,
        maeMm: n > 0 ? round2(absErr / n) : 0,
        biasMm: n > 0 ? round2(bias / n) : 0,
        hitRate: rainyObs > 0 ? Math.round((hits / rainyObs) * 100) / 100 : 0,
        totalForecastMm: round2(fcTotal),
        totalObservedMm: round2(obTotal),
      };
    };

    const eRow = buildRow("ecmwf");
    const gRow = buildRow("gfs");
    for (const [date] of observed) {
      if (perModel.get("ecmwf")?.has(date) || perModel.get("gfs")?.has(date)) {
        evaluatedDates.add(date);
      }
    }
    ecmwfErr += eRow.maeMm * eRow.days;
    gfsErr += gRow.maeMm * gRow.days;
    ecmwfN += eRow.days;
    gfsN += gRow.days;

    zoneAcc.push({
      zoneId: zone.id,
      zoneNumber: zone.number,
      zoneName: zone.name,
      rows: [eRow, gRow],
      winner: eRow.days === 0 && gRow.days === 0 ? null : eRow.maeMm <= gRow.maeMm ? "ecmwf" : "gfs",
    });
  }

  return {
    zones: zoneAcc,
    cityMae: {
      ecmwf: ecmwfN > 0 ? round2(ecmwfErr / ecmwfN) : 0,
      gfs: gfsN > 0 ? round2(gfsErr / gfsN) : 0,
    },
    daysEvaluated: evaluatedDates.size,
  };
}

/* ------------------------------------------------------------------ */
/* Feature 8 — reservoirs                                              */
/* ------------------------------------------------------------------ */

export interface ReservoirDTO {
  id: string;
  name: string;
  capacityTmcft: number;
  storagePct: number | null;
  levelTmcft: number | null;
  date: string | null;
  inflowCusec: number | null;
  outflowCusec: number | null;
}

export async function getReservoirStatus(): Promise<{
  reservoirs: ReservoirDTO[];
  combinedPct: number | null;
  readingsToday: number;
}> {
  const rows = await prisma.reservoir.findMany({
    where: { isActive: true },
    include: { readings: { orderBy: { date: "desc" }, take: 1 } },
    orderBy: { name: "asc" },
  });
  const todayKey = istToday();
  let capSum = 0;
  let lvlSum = 0;
  let readingsToday = 0;
  const reservoirs: ReservoirDTO[] = rows.map((r) => {
    const latest = r.readings[0] ?? null;
    if (latest) {
      capSum += r.capacityTmcft;
      lvlSum += latest.levelTmcft;
      if (istDateKey(latest.date) === todayKey) readingsToday++;
    }
    return {
      id: r.id,
      name: r.name,
      capacityTmcft: r.capacityTmcft,
      storagePct: latest ? latest.storagePct : null,
      levelTmcft: latest ? latest.levelTmcft : null,
      date: latest ? istDateKey(latest.date) : null,
      inflowCusec: latest ? latest.inflowCusec : null,
      outflowCusec: latest ? latest.outflowCusec : null,
    };
  });
  return {
    reservoirs,
    combinedPct: capSum > 0 ? Math.round((lvlSum / capSum) * 1000) / 10 : null,
    readingsToday,
  };
}

/* ------------------------------------------------------------------ */
/* Feature 12 — zone subscriptions                                     */
/* Public-citizen opt-in per zone; used by alert dispatch and the       */
/* public subscription UI.                                             */
/* ------------------------------------------------------------------ */

export interface SubscriptionDTO {
  id: string;
  zoneId: string;
  zoneNumber: number;
  zoneName: string;
  channel: string;
  phone: string | null;
  active: boolean;
  createdAt: Date;
  /** Display name of the subscribing user (name or email). */
  subscriber: string;
}

/** Subscriptions for one citizen user. */
export async function getSubscriptionsForUser(userId: string): Promise<SubscriptionDTO[]> {
  const rows = await prisma.zoneSubscription.findMany({
    where: { userId, active: true },
    include: { zone: true, user: true },
    orderBy: { zone: { number: "asc" } },
  });
  return rows.map((r) => ({
    id: r.id,
    zoneId: r.zoneId,
    zoneNumber: r.zone.number,
    zoneName: r.zone.name,
    channel: r.channel,
    phone: r.phone,
    active: r.active,
    createdAt: r.createdAt,
    subscriber: r.user.name ?? r.user.email,
  }));
}

/** Active subscriptions for one zone — used by alert dispatch. */
export async function getSubscriptionsForZone(zoneId: string): Promise<SubscriptionDTO[]> {
  const rows = await prisma.zoneSubscription.findMany({
    where: { zoneId, active: true },
    include: { zone: true, user: true },
    orderBy: { user: { name: "asc" } },
  });
  return rows.map((r) => ({
    id: r.id,
    zoneId: r.zoneId,
    zoneNumber: r.zone.number,
    zoneName: r.zone.name,
    channel: r.channel,
    phone: r.phone,
    active: r.active,
    createdAt: r.createdAt,
    subscriber: r.user.name ?? r.user.email,
  }));
}

/** All active subscriptions across zones (staff view). */
export async function getAllSubscriptions(): Promise<SubscriptionDTO[]> {
  const rows = await prisma.zoneSubscription.findMany({
    where: { active: true },
    include: { zone: true, user: true },
    orderBy: { zone: { number: "asc" }, user: { name: "asc" } },
  });
  return rows.map((r) => ({
    id: r.id,
    zoneId: r.zoneId,
    zoneNumber: r.zone.number,
    zoneName: r.zone.name,
    channel: r.channel,
    phone: r.phone,
    active: r.active,
    createdAt: r.createdAt,
    subscriber: r.user.name ?? r.user.email,
  }));
}


/** Lightweight helper: does a given user follow a given zone? */
export async function userSubscribesToZone(userId: string, zoneId: string): Promise<boolean> {
  const row = await prisma.zoneSubscription.findFirst({ where: { userId, zoneId, active: true } });
  return row !== null;
}

/* ------------------------------------------------------------------ */
/* Feature 13 — analyst-entered ground-truth observations              */
/* ------------------------------------------------------------------ */

export interface FieldObservationDTO {
  id: string;
  zoneNumber: number;
  zoneName: string;
  userId: string;
  observerName: string | null;
  date: string; // IST key YYYY-MM-DD
  rainfallMm: number | null;
  depthCm: number | null;
  note: string | null;
  source: string;
  createdAt: Date;
}

/** Observations for one zone over the past `days`. */
export async function getObservationsForZone(zoneId: string, days = 30): Promise<FieldObservationDTO[]> {
  const zone = await prisma.zone.findUnique({ where: { id: zoneId } });
  if (!zone) return [];

  const cutoff = new Date();
  cutoff.setUTCDate(cutoff.getUTCDate() - days);

  const rows = await prisma.fieldObservation.findMany({
    where: { zoneId, date: { gte: cutoff } },
    orderBy: { date: "desc" },
    include: { user: true },
  });

  return rows.map((r) => ({
    id: r.id,
    zoneNumber: zone.number,
    zoneName: zone.name,
    userId: r.userId,
    observerName: r.user.name ?? null,
    date: new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(r.date),
    rainfallMm: r.rainfallMm,
    depthCm: r.depthCm,
    note: r.note,
    source: r.source,
    createdAt: r.createdAt,
  }));
}

/** Latest observation for a zone (used as an observed series point). */
export async function getLatestObservationForZone(zoneId: string): Promise<FieldObservationDTO | null> {
  const zone = await prisma.zone.findUnique({ where: { id: zoneId } });
  if (!zone) return null;

  const row = await prisma.fieldObservation.findFirst({
    where: { zoneId },
    orderBy: { date: "desc" },
    include: { user: true },
  });
  if (!row) return null;

  return {
    id: row.id,
    zoneNumber: zone.number,
    zoneName: zone.name,
    userId: row.userId,
    observerName: row.user.name ?? null,
    date: new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(row.date),
    rainfallMm: row.rainfallMm,
    depthCm: row.depthCm,
    note: row.note,
    source: row.source,
    createdAt: row.createdAt,
  };
}

/* ------------------------------------------------------------------ */
/* Feature 10 — anomaly detection                                      */
/* Days where rainfall was >=1.5x the pro-rated monthly normal.        */
/* ------------------------------------------------------------------ */

export interface AnomalyDay {
  date: string;
  zoneId: string;
  zoneNumber: number;
  zoneName: string;
  mm: number;
  ratio: number;
  label: "ABOVE" | "EXTREME";
}

export async function getAnomalies(days = 30, limit = 20): Promise<AnomalyDay[]> {
  const { anomalyForDay } = await import("./climate");
  const zones = await prisma.zone.findMany({ where: { isActive: true } });
  const cutoff = new Date();
  cutoff.setUTCHours(0, 0, 0, 0);
  cutoff.setUTCDate(cutoff.getUTCDate() - (days - 1));
  const out: AnomalyDay[] = [];
  for (const zone of zones) {
    const snaps = await prisma.forecastSnapshot.findMany({
      where: { zoneId: zone.id, source: "open-meteo", forecastDate: { gte: cutoff } },
      orderBy: { forecastDate: "desc" },
    });
    const seen = new Set<string>();
    for (const s of snaps) {
      const key = istDateKey(s.forecastDate);
      if (seen.has(key)) continue;
      seen.add(key);
      if (s.precipSumMm < 1) continue;
      const { ratio, label } = anomalyForDay(s.precipSumMm, key);
      if (label === "NORMAL") continue;
      out.push({
        date: key, zoneId: zone.id, zoneNumber: zone.number, zoneName: zone.name,
        mm: round2(s.precipSumMm), ratio, label,
      });
    }
  }
  out.sort((a, b) => b.ratio - a.ratio);
  return out.slice(0, limit);
}

/* ------------------------------------------------------------------ */
/* Feature 11 — seasonal / monsoon dashboard                           */
/* ------------------------------------------------------------------ */

export interface SeasonStats {
  season: "NE" | "SW" | "winter" | "summer";
  seasonMonths: number[];
  normalMm: number;
  actualMm: number;
  departurePct: number;
  rainyDays: number;
  wettestDay: { date: string; mm: number } | null;
  wettestZone: { name: string; mm: number } | null;
  monthly: { month: number; normalMm: number; actualMm: number }[];
}

export async function getSeasonStats(): Promise<SeasonStats> {
  const { CHENNAI_MONTHLY_NORMALS, seasonForMonth, departurePct } = await import("./climate");
  const istNow = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" }));
  const y = istNow.getFullYear();
  const season = seasonForMonth(istNow.getMonth() + 1);
  const seasonMonths =
    season === "NE" ? [10, 11, 12]
    : season === "SW" ? [6, 7, 8, 9]
    : season === "winter" ? [1, 2]
    : [3, 4, 5];

  const zones = await prisma.zone.findMany({ where: { isActive: true } });
  const start = new Date(Date.UTC(y, seasonMonths[0] - 1, 1));
  const end = new Date(Date.UTC(y, seasonMonths[seasonMonths.length - 1], 1));
  end.setUTCMonth(end.getUTCMonth() + 1);

  const perMonth = new Map<number, number>();
  const perZone = new Map<string, { name: string; mm: number }>();
  let actualMm = 0;
  let rainyDays = 0;
  let wettestDay: { date: string; mm: number } | null = null;
  const seenDayZone = new Set<string>();

  for (const zone of zones) {
    const snaps = await prisma.forecastSnapshot.findMany({
      where: { zoneId: zone.id, source: "open-meteo", forecastDate: { gte: start, lt: end } },
    });
    for (const s of snaps) {
      const key = istDateKey(s.forecastDate);
      const month = Number(key.split("-")[1]);
      if (!seasonMonths.includes(month)) continue;
      const dzKey = `${key}:${zone.id}`;
      if (seenDayZone.has(dzKey)) continue;
      seenDayZone.add(dzKey);
      actualMm += s.precipSumMm;
      perMonth.set(month, (perMonth.get(month) ?? 0) + s.precipSumMm);
      const z = perZone.get(zone.id) ?? { name: zone.name, mm: 0 };
      z.mm += s.precipSumMm;
      perZone.set(zone.id, z);
      if (s.precipSumMm >= 0.5) rainyDays++;
      if (!wettestDay || s.precipSumMm > wettestDay.mm) {
        wettestDay = { date: key, mm: round2(s.precipSumMm) };
      }
    }
  }

  const zoneCount = Math.max(1, zones.length);
  const monthly = CHENNAI_MONTHLY_NORMALS.filter((m) => seasonMonths.includes(m.month)).map((m) => ({
    month: m.month,
    normalMm: m.normalMm,
    actualMm: round2((perMonth.get(m.month) ?? 0) / zoneCount),
  }));
  const cityActual = round2(actualMm / zoneCount);
  const normalMm = monthly.reduce((a, m) => a + m.normalMm, 0);
  let wettestZone: { name: string; mm: number } | null = null;
  for (const z of perZone.values()) {
    if (!wettestZone || z.mm > wettestZone.mm) wettestZone = { name: z.name, mm: round2(z.mm) };
  }

  return {
    season, seasonMonths, normalMm,
    actualMm: cityActual,
    departurePct: departurePct(cityActual, normalMm),
    rainyDays, wettestDay, wettestZone, monthly,
  };
}

/* ------------------------------------------------------------------ */
/* City report aggregation (all values from stored Open-Meteo data)    */
/* ------------------------------------------------------------------ */

export interface ReportZoneRow {
  zoneId: string;
  number: number;
  name: string;
  /** Days with ≥0.5 mm in the window. */
  rainyDays: number;
  /** Sum of daily precip over the window (mm). */
  totalMm: number;
  /** Wettest single day in the window. */
  wettestDay: { date: string; mm: number } | null;
  /** Forecast for today (IST) when available. */
  todayMm: number | null;
  risk: RiskLevel | null;
}

export interface ReportDay {
  date: string;
  /** City-wide mean of daily precip across reporting zones (mm). */
  cityMm: number;
  /** Highest single-zone daily precip this day (mm). */
  maxZoneMm: number;
  /** City-wide mean temp max/min across reporting zones (°C). */
  tempMaxC: number;
  tempMinC: number;
  /** Mean of daily max wind across reporting zones (km/h). */
  windMaxKmh: number;
}

export interface CityReport {
  windowDays: number;
  zones: ReportZoneRow[];
  days: ReportDay[];
  /** Next 7 days: per-zone precip, city mean per day. */
  outlook: { date: string; cityMm: number; zoneMm: number[] }[];
  generatedAt: string;
}

/**
 * Build the city report from stored Open-Meteo snapshots (real data only —
 * nothing is synthesized here). `windowDays` counts the past daily window
 * per zone; the outlook covers the next 7 forecast days.
 */
export async function getCityReport(windowDays = 14): Promise<CityReport | null> {
  const zones = await prisma.zone.findMany({ where: { isActive: true }, orderBy: { number: "asc" } });
  if (zones.length === 0) return null;

  const cutoff = new Date();
  cutoff.setUTCHours(0, 0, 0, 0);
  cutoff.setUTCDate(cutoff.getUTCDate() - (windowDays - 1));
  // Outlook window ends 7 days ahead (UTC midnight keys match forecastDate).
  const outlookEnd = new Date(cutoff);
  outlookEnd.setUTCDate(outlookEnd.getUTCDate() + windowDays - 1 + 7);

  const zoneRows: ReportZoneRow[] = [];
  const perDay = new Map<string, { mm: number; maxMm: number; tMax: number; tMin: number; wind: number; n: number }>();
  const outlookMap = new Map<string, { cityMm: number; zoneMm: number[]; perZone: Map<string, number> }>();
  const todayKey = istToday();

  for (const zone of zones) {
    const snapshots = await prisma.forecastSnapshot.findMany({
      where: {
        zoneId: zone.id,
        source: "open-meteo",
        forecastDate: { gte: cutoff, lte: outlookEnd },
      },
      orderBy: { forecastDate: "asc" },
    });
    if (snapshots.length === 0) continue;

    let rainyDays = 0;
    let totalMm = 0;
    let wettestDay: ReportZoneRow["wettestDay"] = null;
    let todayMm: number | null = null;

    for (const s of snapshots) {
      const key = istDateKey(s.forecastDate);
      const isOutlook = key >= todayKey;
      if (!isOutlook) {
        // Past window: observations/analysis days count toward zone stats.
        if (s.precipSumMm >= 0.5) rainyDays++;
        totalMm += s.precipSumMm;
        if (!wettestDay || s.precipSumMm > wettestDay.mm) {
          wettestDay = { date: key, mm: s.precipSumMm };
        }
        if (key === todayKey) todayMm = s.precipSumMm;
      }

      // Past window: city-wide daily means/maxima.
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

      // Next 7 days: outlook grid (zone × date).
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
      rainyDays,
      totalMm,
      wettestDay,
      todayMm,
      risk: todayMm !== null ? riskLevelFor(todayMm, zone) : null,
    });
  }

  const days: ReportDay[] = [...perDay.entries()]
    .sort(([a], [b]) => (a < b ? -1 : 1))
    .map(([date, b]) => ({
      date,
      cityMm: round2(b.mm / b.n),
      maxZoneMm: round2(b.maxMm),
      tempMaxC: round2(b.tMax / b.n),
      tempMinC: round2(b.tMin / b.n),
      windMaxKmh: round2(b.wind / b.n),
    }));

  const outlook = [...outlookMap.entries()]
    .sort(([a], [b]) => (a < b ? -1 : 1))
    .slice(0, 7)
    .map(([date, slot]) => {
      const zoneMm = zones.map((z) => slot.perZone.get(z.id) ?? 0);
      return { date, cityMm: round2(zoneMm.reduce((a, b) => a + b, 0) / (zoneMm.length || 1)), zoneMm };
    });

  return {
    windowDays,
    zones: zoneRows,
    days,
    outlook,
    generatedAt: new Date().toISOString(),
  };
}

/* ------------------------------------------------------------------ */
/* Daily report (one IST date, all zones)                              */
/* ------------------------------------------------------------------ */

export interface DailyReportZoneRow {
  zoneId: string;
  number: number;
  name: string;
  precipMm: number;
  precipProbMax: number;
  tempMaxC: number;
  tempMinC: number;
  windMaxKmh: number;
  /** Difference vs the previous day's precip for the same zone (mm). */
  prevDayDiffMm: number | null;
  risk: RiskLevel;
}

export interface DailyReport {
  date: string;
  /** Previous available date (IST key) with data, when any. */
  prevDate: string | null;
  zones: DailyReportZoneRow[];
  /** City aggregates — always present when the report itself is non-null. */
  city: {
    totalMm: number;
    meanMm: number;
    wettestZone: { zoneId: string; name: string; mm: number } | null;
    driestZone: { zoneId: string; name: string; mm: number } | null;
    tempMaxC: number;
    tempMinC: number;
    windMaxKmh: number;
    meanProbMax: number;
  };
  riskCounts: { alert: number; warning: number; watch: number };
  /** Next 7 days for the same zones: city mean precip per day. */
  outlook: { date: string; cityMm: number }[];
  generatedAt: string;
}

/**
 * Distinct IST dates that have at least one stored Open-Meteo snapshot,
 * sorted ascending. Backs the daily-report date picker.
 */
export async function getAvailableReportDates(): Promise<string[]> {
  const snapshots = await prisma.forecastSnapshot.findMany({
    where: { source: "open-meteo" },
    select: { forecastDate: true },
    distinct: ["forecastDate"],
    orderBy: { forecastDate: "asc" },
  });
  return [...new Set(snapshots.map((s) => istDateKey(s.forecastDate)))].sort();
}

/**
 * Build the daily report for one IST date: per-zone daily values from stored
 * Open-Meteo snapshots, city aggregates, day-over-day comparison and the
 * 7-day city outlook. Returns null when no zone has data for that date.
 */
export async function getDailyReport(dateKey: string): Promise<DailyReport | null> {
  const zones = await prisma.zone.findMany({ where: { isActive: true }, orderBy: { number: "asc" } });
  if (zones.length === 0) return null;

  const dayDate = dateKeyToDate(dateKey);
  const prevDate = new Date(dayDate);
  prevDate.setUTCDate(prevDate.getUTCDate() - 1);
  // Outlook ends 7 days after the selected day (UTC midnight keys).
  const outlookEnd = new Date(dayDate);
  outlookEnd.setUTCDate(outlookEnd.getUTCDate() + 7);

  const zoneRows: DailyReportZoneRow[] = [];
  const perZoneMm = new Map<string, { name: string; mm: number; prob: number; tMax: number; tMin: number; wind: number }>();
  const prevMm = new Map<string, number>();
  const outlookMap = new Map<string, { sum: number; n: number }>();

  for (const zone of zones) {
    const snapshots = await prisma.forecastSnapshot.findMany({
      where: {
        zoneId: zone.id,
        source: "open-meteo",
        forecastDate: { gte: prevDate, lte: outlookEnd },
      },
      orderBy: { forecastDate: "asc" },
    });

    const dayRow = snapshots.find((s) => istDateKey(s.forecastDate) === dateKey);
    const prevRow = snapshots.find((s) => istDateKey(s.forecastDate) === istDateKey(prevDate));
    if (!dayRow) continue;

    if (prevRow) prevMm.set(zone.id, prevRow.precipSumMm);

    zoneRows.push({
      zoneId: zone.id,
      number: zone.number,
      name: zone.name,
      precipMm: round2(dayRow.precipSumMm),
      precipProbMax: dayRow.precipProbMax,
      tempMaxC: dayRow.tempMaxC,
      tempMinC: dayRow.tempMinC,
      windMaxKmh: dayRow.windMaxKmh,
      prevDayDiffMm: prevRow ? round2(dayRow.precipSumMm - prevRow.precipSumMm) : null,
      risk: riskLevelFor(dayRow.precipSumMm, zone),
    });

    perZoneMm.set(zone.id, {
      name: zone.name,
      mm: dayRow.precipSumMm,
      prob: dayRow.precipProbMax,
      tMax: dayRow.tempMaxC,
      tMin: dayRow.tempMinC,
      wind: dayRow.windMaxKmh,
    });

    for (const s of snapshots) {
      const key = istDateKey(s.forecastDate);
      if (key > dateKey && key <= istDateKey(outlookEnd)) {
        const slot = outlookMap.get(key) ?? { sum: 0, n: 0 };
        slot.sum += s.precipSumMm;
        slot.n += 1;
        outlookMap.set(key, slot);
      }
    }
  }

  if (zoneRows.length === 0) return null;

  const n = perZoneMm.size || 1;
  let wettest: { zoneId: string; name: string; mm: number } | null = null;
  let driest: { zoneId: string; name: string; mm: number } | null = null;
  let sumMm = 0;
  let sumProb = 0;
  let sumTMax = 0;
  let sumTMin = 0;
  let sumWind = 0;
  for (const [zoneId, v] of perZoneMm) {
    sumMm += v.mm;
    sumProb += v.prob;
    sumTMax += v.tMax;
    sumTMin += v.tMin;
    sumWind += v.wind;
    if (!wettest || v.mm > wettest.mm) wettest = { zoneId, name: v.name, mm: round2(v.mm) };
    if (!driest || v.mm < driest.mm) driest = { zoneId, name: v.name, mm: round2(v.mm) };
  }

  const riskCounts = { alert: 0, warning: 0, watch: 0 };
  for (const z of zoneRows) {
    if (z.risk === "ALERT") riskCounts.alert++;
    else if (z.risk === "WARNING") riskCounts.warning++;
    else if (z.risk === "WATCH") riskCounts.watch++;
  }

  const allDates = await getAvailableReportDates();
  const prevAvailable = allDates.filter((d) => d < dateKey).at(-1) ?? null;

  const outlook = [...outlookMap.entries()]
    .sort(([a], [b]) => (a < b ? -1 : 1))
    .slice(0, 7)
    .map(([date, slot]) => ({ date, cityMm: round2(slot.sum / (slot.n || 1)) }));

  return {
    date: dateKey,
    prevDate: prevAvailable,
    zones: zoneRows,
    city: {
      totalMm: round2(sumMm),
      meanMm: round2(sumMm / n),
      wettestZone: wettest,
      driestZone: driest,
      tempMaxC: round2(sumTMax / n),
      tempMinC: round2(sumTMin / n),
      windMaxKmh: round2(sumWind / n),
      meanProbMax: round2(sumProb / n),
    },
    riskCounts,
    outlook,
    generatedAt: new Date().toISOString(),
  };
}

/* ------------------------------------------------------------------ */
/* Zone report (one zone, daily window + outlook)                      */
/* ------------------------------------------------------------------ */

export interface ZoneReportDay {
  date: string;
  precipMm: number;
  precipProbMax: number;
  tempMaxC: number;
  tempMinC: number;
  windMaxKmh: number;
  risk: RiskLevel;
}

export interface ZoneReport {
  zone: { id: string; number: number; name: string; latitude: number; longitude: number };
  windowDays: number;
  days: ZoneReportDay[];
  outlook: ZoneReportDay[];
  stats: {
    totalMm: number;
    meanMm: number;
    rainyDays: number;
    wettestDay: { date: string; mm: number } | null;
    warningDays: number;
    tempMaxC: number;
    tempMinC: number;
  } | null;
  cityMeanMmByDay: { date: string; cityMm: number }[];
  generatedAt: string;
}

/**
 * Build a per-zone report: `windowDays` of past daily values, the next-7-day
 * outlook, window stats, and the city-mean series for context.
 * Returns null when the zone does not exist.
 */
export async function getZoneReport(zoneId: string, windowDays = 14): Promise<ZoneReport | null> {
  const zone = await prisma.zone.findUnique({ where: { id: zoneId } });
  if (!zone) return null;

  const todayKey = istToday();
  const cutoff = new Date();
  cutoff.setUTCHours(0, 0, 0, 0);
  cutoff.setUTCDate(cutoff.getUTCDate() - (windowDays - 1));
  const end = new Date(cutoff);
  end.setUTCDate(end.getUTCDate() + windowDays - 1 + 7);

  // City-mean series over the same past window, across all active zones.
  const activeZones = await prisma.zone.findMany({ where: { isActive: true }, select: { id: true } });
  const citySnapshots = await prisma.forecastSnapshot.findMany({
    where: {
      zoneId: { in: activeZones.map((z) => z.id) },
      source: "open-meteo",
      forecastDate: { gte: cutoff, lte: end },
    },
    select: { forecastDate: true, precipSumMm: true },
  });
  const perDay = new Map<string, { sum: number; n: number }>();
  for (const s of citySnapshots) {
    const key = istDateKey(s.forecastDate);
    if (key >= todayKey) continue;
    const slot = perDay.get(key) ?? { sum: 0, n: 0 };
    slot.sum += s.precipSumMm;
    slot.n += 1;
    perDay.set(key, slot);
  }
  const cityMeanMmByDay = [...perDay.entries()]
    .sort(([a], [b]) => (a < b ? -1 : 1))
    .map(([date, slot]) => ({ date, cityMm: round2(slot.sum / (slot.n || 1)) }));

  const snapshots = await prisma.forecastSnapshot.findMany({
    where: {
      zoneId: zone.id,
      source: "open-meteo",
      forecastDate: { gte: cutoff, lte: end },
    },
    orderBy: { forecastDate: "asc" },
  });

  const toDay = (s: (typeof snapshots)[number]): ZoneReportDay => ({
    date: istDateKey(s.forecastDate),
    precipMm: round2(s.precipSumMm),
    precipProbMax: s.precipProbMax,
    tempMaxC: s.tempMaxC,
    tempMinC: s.tempMinC,
    windMaxKmh: s.windMaxKmh,
    risk: riskLevelFor(s.precipSumMm, zone),
  });

  const past = snapshots.filter((s) => istDateKey(s.forecastDate) < todayKey);
  const outlook = snapshots.filter((s) => istDateKey(s.forecastDate) >= todayKey).slice(0, 7).map(toDay);

  let totalMm = 0;
  let rainyDays = 0;
  let warningDays = 0;
  let wettestDay: { date: string; mm: number } | null = null;
  let sumTMax = 0;
  let sumTMin = 0;
  for (const d of past.map(toDay)) {
    totalMm += d.precipMm;
    if (d.precipMm >= 0.5) rainyDays++;
    if (d.risk === "WARNING" || d.risk === "ALERT") warningDays++;
    if (!wettestDay || d.precipMm > wettestDay.mm) wettestDay = { date: d.date, mm: d.precipMm };
    sumTMax += d.tempMaxC;
    sumTMin += d.tempMinC;
  }

  return {
    zone: { id: zone.id, number: zone.number, name: zone.name, latitude: zone.latitude, longitude: zone.longitude },
    windowDays,
    days: past.map(toDay),
    outlook,
    stats:
      past.length > 0
        ? {
            totalMm: round2(totalMm),
            meanMm: round2(totalMm / past.length),
            rainyDays,
            wettestDay,
            warningDays,
            tempMaxC: round2(sumTMax / past.length),
            tempMinC: round2(sumTMin / past.length),
          }
        : null,
    cityMeanMmByDay,
    generatedAt: new Date().toISOString(),
  };
}

function round2(v: number): number {
  return Math.round(v * 100) / 100;
}

/* ------------------------------------------------------------------ */
/* Historical rainfall heatmap (zones × dates matrix)                  */
/* ------------------------------------------------------------------ */

export interface HeatmapCell {
  zoneId: string;
  zoneNumber: number;
  zoneName: string;
  date: string; // IST date key YYYY-MM-DD
  precipMm: number;
  risk: RiskLevel;
}

export interface HeatmapData {
  zones: { id: string; number: number; name: string }[];
  wards: { wardNumber: number; name: string; zoneNumber: number }[];
  dates: string[]; // sorted ascending IST date keys
  cells: HeatmapCell[];
  /** City-wide daily average rainfall (mm) keyed by IST date. */
  cityDaily: { date: string; avgMm: number }[];
  maxMm: number;
  generatedAt: string;
}

/**
 * Build the historical rainfall heatmap matrix: every active zone × every
 * available date in the past `days` window. Returns the flat cell array
 * plus metadata the client component needs to render the grid.
 */
export async function getHeatmapData(days = 30): Promise<HeatmapData | null> {
  const zones = await prisma.zone.findMany({ where: { isActive: true }, orderBy: { number: "asc" } });
  if (zones.length === 0) return null;

  const cutoff = new Date();
  cutoff.setUTCHours(0, 0, 0, 0);
  cutoff.setUTCDate(cutoff.getUTCDate() - (days - 1));

  const snapshots = await prisma.forecastSnapshot.findMany({
    where: {
      zoneId: { in: zones.map((z) => z.id) },
      source: "open-meteo",
      forecastDate: { gte: cutoff },
    },
    orderBy: { forecastDate: "asc" },
  });

  // Collect unique IST date keys.
  const dateSet = new Set<string>();
  for (const s of snapshots) dateSet.add(istDateKey(s.forecastDate));
  const dates = [...dateSet].sort();

  let maxMm = 0;
  const cells: HeatmapCell[] = [];
  // Per-date accumulator for the city-wide average row.
  const perDate = new Map<string, { sum: number; n: number }>();
  for (const s of snapshots) {
    const date = istDateKey(s.forecastDate);
    const zone = zones.find((z) => z.id === s.zoneId);
    if (!zone) continue;
    if (s.precipSumMm > maxMm) maxMm = s.precipSumMm;
    cells.push({
      zoneId: s.zoneId,
      zoneNumber: zone.number,
      zoneName: zone.name,
      date,
      precipMm: round2(s.precipSumMm),
      risk: riskLevelFor(s.precipSumMm, zone),
    });
    const bucket = perDate.get(date) ?? { sum: 0, n: 0 };
    bucket.sum += s.precipSumMm;
    bucket.n += 1;
    perDate.set(date, bucket);
  }

  const cityDaily = dates.map((date) => {
    const b = perDate.get(date);
    return { date, avgMm: b ? round2(b.sum / b.n) : 0 };
  });

  // Load wards and build zone→ward mapping.
  const { getChennaiWards } = await import("./wards");
  const allWards = getChennaiWards();
  const zoneLookup = new Map(zones.map((z) => [z.number, z]));

  // Build a lookup: zoneNumber → date → zone cell (for inheriting rainfall).
  const zoneDateCell = new Map<number, Map<string, HeatmapCell>>();
  for (const c of cells) {
    let dm = zoneDateCell.get(c.zoneNumber);
    if (!dm) {
      dm = new Map();
      zoneDateCell.set(c.zoneNumber, dm);
    }
    dm.set(c.date, c);
  }

  // Generate ward cells: each ward inherits its parent zone's rainfall.
  const wardCells: HeatmapCell[] = [];
  for (const ward of allWards) {
    const parentZone = zoneLookup.get(ward.zoneNumber);
    const zoneCells = zoneDateCell.get(ward.zoneNumber);
    if (!parentZone || !zoneCells) continue;
    for (const date of dates) {
      const zc = zoneCells.get(date);
      wardCells.push({
        zoneId: parentZone.id,
        zoneNumber: ward.zoneNumber,
        zoneName: `${ward.name} (W${ward.wardNumber})`,
        date,
        precipMm: zc?.precipMm ?? 0,
        risk: zc?.risk ?? "LOW",
      });
    }
  }

  return {
    zones: zones.map((z) => ({ id: z.id, number: z.number, name: z.name })),
    wards: allWards.map((w) => ({ wardNumber: w.wardNumber, name: w.name, zoneNumber: w.zoneNumber })),
    dates,
    cells: [...cells, ...wardCells],
    cityDaily,
    maxMm,
    generatedAt: new Date().toISOString(),
  };
}

export { RISK_META };