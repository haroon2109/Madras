import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { BrandMark } from "@/components/auth/BrandMark";
import { getChennaiZones } from "@/lib/zones";
import { istToday } from "@/lib/weather";
import { riskLevelFor, RISK_META } from "@/lib/risk";
import { getTodayTide } from "@/lib/tide";
import { getChennaiWards } from "@/lib/wards";
import {
  fetchAirQualityBulk,
  fetchSeaState,
  seaStateAdvisory,
  getRiverStatuses,
  getNowcast,
  aqiCategory,
  CHENNAI_OFFSHORE,
} from "@/lib/external";
import {
  CalendarDays, CloudRain, MapPin, Shield, AlertTriangle, CheckCircle, Waves,
  Bell, Info, ArrowRight, Wind,
} from "lucide-react";
import { getPublicAlerts, citizenActionAdviceFor } from "./alerts-helpers";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Chennai Weather — Madras",
  description: "Check today's rainfall forecast and flood risk for your Chennai zone. Real-time weather monitoring for all 15 zones and 200 wards.",
};

function ZoneWeatherCard({ zone, today, tide }: {
  zone: { number: number; name: string; latitude: number; longitude: number; watchThreshold: number; warningThreshold: number; alertThreshold: number };
  today: { precipMm: number; precipProbMax: number; tempMaxC: number; tempMinC: number; windMaxKmh: number; risk: string } | null;
  tide: { highTideM: number; highTideAt: string };
}) {
  const advice = today ? citizenActionAdviceFor(String(zone.number), today.precipMm, {
    watchThreshold: zone.watchThreshold,
    warningThreshold: zone.warningThreshold,
    alertThreshold: zone.alertThreshold,
  }) : null;
  const risk = today?.risk ?? "LOW";
  const meta = RISK_META[risk as keyof typeof RISK_META];
  const isCoastal = [1, 2, 4, 5, 13, 14, 15].includes(zone.number);
  const backflowRisk = isCoastal && today && today.precipMm >= zone.warningThreshold && tide.highTideM >= 1.0;

  const RISK_BORDER: Record<string, string> = {
    ALERT: "border-red-500/40",
    WARNING: "border-orange-500/40",
    WATCH: "border-yellow-500/40",
    LOW: "border-emerald-500/30",
  };

  return (
    <div className={`rounded-2xl border p-5 transition-all ${today ? `bg-white ${RISK_BORDER[risk] ?? "border-slate-200"}` : "bg-white border-slate-200"}`}>
      <div className="flex items-start justify-between mb-3">
        <div>
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wide">Zone {zone.number}</span>
          <h3 className="text-lg font-bold text-slate-900 mt-0.5">{zone.name}</h3>
        </div>
        {today && (
          <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold ${meta.badge}`}>
            <span className={`h-1.5 w-1.5 rounded-full`} style={{ backgroundColor: meta.color }} />
            {meta.label}
          </span>
        )}
      </div>

      {today ? (
        <>
          <div className="grid grid-cols-2 gap-3 mt-4">
            <div className="bg-slate-50 rounded-xl p-3">
              <div className="flex items-center gap-1.5 text-xs text-slate-500 mb-1">
                <CloudRain size={14} />
                <span>24h Rainfall</span>
              </div>
              <div className="text-2xl font-extrabold text-slate-900 tabular-nums">
                {today.precipMm.toFixed(1)} <span className="text-sm font-medium text-slate-500">mm</span>
              </div>
              <div className="text-xs text-slate-500 mt-0.5">{today.precipProbMax}% chance of rain</div>
            </div>
            <div className="bg-slate-50 rounded-xl p-3">
              <div className="flex items-center gap-1.5 text-xs text-slate-500 mb-1">
                <MapPin size={14} />
                <span>Temperature</span>
              </div>
              <div className="text-2xl font-extrabold text-slate-900 tabular-nums">
                {today.tempMinC.toFixed(1)}° <span className="text-sm font-medium text-slate-500">/</span> {today.tempMaxC.toFixed(1)}° <span className="text-sm font-medium text-slate-500">C</span>
              </div>
              <div className="text-xs text-slate-500 mt-0.5">Wind up to {today.windMaxKmh.toFixed(0)} km/h</div>
            </div>
          </div>

          {backflowRisk && (
            <div className="mt-3 flex items-start gap-2 p-3 rounded-xl bg-cyan-50 border border-cyan-200">
              <Waves size={16} className="text-cyan-600 mt-0.5" />
              <div>
                <div className="text-sm font-bold text-cyan-800">Drainage backflow risk</div>
                <div className="text-xs text-cyan-700 mt-0.5">High tide ({tide.highTideM.toFixed(2)}m) combined with heavy rain may cause drainage backflow in coastal areas.</div>
              </div>
            </div>
          )}

          <div className="mt-3">
            <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
              <span>Rainfall intensity</span>
              <span className={today.precipMm > 50 ? "text-red-500 font-semibold" : today.precipMm > 20 ? "text-orange-500 font-semibold" : today.precipMm > 5 ? "text-yellow-500 font-semibold" : "text-green-500 font-semibold"}>
                {today.precipMm < 5 ? "Light" : today.precipMm < 20 ? "Moderate" : today.precipMm < 50 ? "Heavy" : "Very Heavy"}
              </span>
            </div>
            <div className="h-2 rounded-full bg-slate-200 overflow-hidden">
              <div className={`h-full rounded-full transition-all ${today.precipMm > 50 ? "bg-red-500" : today.precipMm > 20 ? "bg-orange-500" : today.precipMm > 5 ? "bg-yellow-500" : "bg-green-500"}`} style={{ width: `${Math.min((today.precipMm / 60) * 100, 100)}%` }} />
            </div>
          </div>

          {advice && (
            <div className="mt-4 border-t border-slate-100 pt-4">
              <div className="flex items-start gap-2 text-xs text-slate-500 mb-2">
                <Info size={13} className="shrink-0 text-slate-400" />
                <span className="font-semibold text-slate-500">What this means for you</span>
              </div>
              <div className="rounded-xl bg-slate-50 p-3">
                <p className="text-sm font-bold text-slate-900">{advice.headline}</p>
                <ul className="mt-2 space-y-1.5">
                  {advice.bullets.map((b, i) => (
                    <li key={i} className="flex items-start gap-2 text-xs text-slate-600">
                      <span className="mt-0.5 shrink-0 h-1.5 w-1.5 rounded-full bg-slate-300" />
                      {b}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </>
      ) : (
        <div className="mt-4 text-center py-4">
          <div className="text-slate-400 text-sm">Forecast data not available yet</div>
        </div>
      )}
    </div>
  );
}

function AqiChip({ aqi, pm25 }: { aqi: number; pm25: number }) {
  const cat = aqiCategory(aqi);
  return (
    <div className="mt-3 flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2">
      <div className="flex items-center gap-1.5 text-xs text-slate-500">
        <Wind size={14} />
        <span>Air quality</span>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-xs font-semibold text-slate-500">PM2.5 {pm25.toFixed(0)}</span>
        <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-bold ${cat.badge}`}>
          AQI {aqi} · {cat.label}
        </span>
      </div>
    </div>
  );
}

function WardList({ zoneNumber, wards }: { zoneNumber: number; wards: Array<{ wardNumber: number; name: string }> }) {
  return (
    <div className="mt-4 pt-4 border-t border-slate-200">
      <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
        <MapPin size={12} />
        <span>{wards.length} Wards in this Zone</span>
      </div>
      <div className="grid grid-cols-2 gap-1">
        {wards.map((w) => (
          <div key={w.wardNumber} className="flex items-center gap-2 py-1.5 px-2 rounded-lg bg-slate-50 text-sm">
            <span className="text-xs font-mono text-slate-400 w-8">W{w.wardNumber}</span>
            <span className="text-slate-700 truncate">{w.name}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function TodaySummary({ zones, tide }: { zones: Array<{ zone: { number: number; name: string }; today: { precipMm: number; risk: string } | null }>; tide: { highTideM: number; highTideAt: string; source: string } }) {
  const alertZones = zones.filter(z => z.today?.risk === "ALERT");
  const warningZones = zones.filter(z => z.today?.risk === "WARNING");
  const watchZones = zones.filter(z => z.today?.risk === "WATCH");
  const rainyZones = zones.filter(z => z.today && z.today.precipMm > 0);
  const maxRain = zones.filter(z => z.today).reduce((max, z) => z.today!.precipMm > (max?.mm ?? 0) ? { zone: z.zone.name, mm: z.today!.precipMm } : max, null as { zone: string; mm: number } | null);

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
      <div className="bg-white rounded-xl border border-slate-200 p-4 text-center">
        <div className="flex items-center justify-center gap-1.5 text-xs text-slate-500 mb-1">
          <CloudRain size={14} className="text-sky-600" />
          <span>Rainy Zones</span>
        </div>
        <div className="text-2xl font-extrabold text-slate-900">{rainyZones.length}</div>
        <div className="text-xs text-slate-500">out of 15 zones</div>
      </div>
      <div className="bg-white rounded-xl border border-slate-200 p-4 text-center">
        <div className="flex items-center justify-center gap-1.5 text-xs text-slate-500 mb-1">
          <AlertTriangle size={14} className="text-amber-600" />
          <span>Under Warning</span>
        </div>
        <div className="text-2xl font-extrabold text-amber-600">{warningZones.length}</div>
        <div className="text-xs text-slate-500">heavy rain expected</div>
      </div>
      <div className="bg-white rounded-xl border border-slate-200 p-4 text-center">
        <div className="flex items-center justify-center gap-1.5 text-xs text-slate-500 mb-1">
          <Shield size={14} className="text-red-600" />
          <span>Critical Alert</span>
        </div>
        <div className="text-2xl font-extrabold text-red-600">{alertZones.length}</div>
        <div className="text-xs text-slate-500">activate response</div>
      </div>
      <div className="bg-white rounded-xl border border-slate-200 p-4 text-center">
        <div className="flex items-center justify-center gap-1.5 text-xs text-slate-500 mb-1">
          <Waves size={14} className="text-cyan-600" />
          <span>High Tide</span>
        </div>
        <div className="flex flex-wrap items-baseline justify-center gap-x-1">
          <span className="text-2xl font-extrabold text-slate-900 tabular-nums">{tide.highTideM.toFixed(2)}</span>
          <span className="text-sm font-medium text-slate-500">m</span>
        </div>
        <div className="text-xs text-slate-500">at {tide.highTideAt} IST</div>
        <div className="mt-0.5 text-[11px] font-semibold text-slate-400">
          {tide.source === "manual" ? "harbour reading" : "astronomical estimate"}
        </div>
      </div>
    </div>
  );
}

async function getZoneData() {
  const zones = getChennaiZones();
  const todayKey = istToday();
  const tide = await getTodayTide();
  const wards = getChennaiWards();
  const wardsByZone = new Map<number, typeof wards>();
  for (const w of wards) {
    const arr = wardsByZone.get(w.zoneNumber) ?? [];
    arr.push(w);
    wardsByZone.set(w.zoneNumber, arr);
  }

  const dbZones = await prisma.zone.findMany({ where: { isActive: true } });
  const dbByNumber = new Map(dbZones.map((z) => [z.number, z]));

  const zoneData = await Promise.all(
    zones.map(async (zone) => {
      const dbZone = dbByNumber.get(zone.number);
      const configZone = {
        number: zone.number,
        name: zone.name,
        latitude: zone.centroid.latitude,
        longitude: zone.centroid.longitude,
        watchThreshold: dbZone?.watchThreshold ?? 15,
        warningThreshold: dbZone?.warningThreshold ?? 30,
        alertThreshold: dbZone?.alertThreshold ?? 60,
      };

      const snapshot = dbZone
        ? await prisma.forecastSnapshot.findFirst({
            where: {
              zoneId: dbZone.id,
              source: "open-meteo",
              forecastDate: { gte: new Date(`${todayKey}T00:00:00Z`) },
            },
            orderBy: { forecastDate: "asc" },
          })
        : null;

      let today: { precipMm: number; precipProbMax: number; tempMaxC: number; tempMinC: number; windMaxKmh: number; risk: string } | null = null;
      if (snapshot) {
        const precipMm = snapshot.precipSumMm;
        today = {
          precipMm,
          precipProbMax: snapshot.precipProbMax,
          tempMaxC: snapshot.tempMaxC,
          tempMinC: snapshot.tempMinC,
          windMaxKmh: snapshot.windMaxKmh,
          risk: riskLevelFor(precipMm, configZone),
        };
      }

      return { zone: configZone, today, wards: wardsByZone.get(zone.number) ?? [] };
    })
  );

  // Feature: per-zone air quality in one bulk API call (real CAMS/Aurora data).
  const air = await fetchAirQualityBulk(
    zoneData.map((zd) => ({ latitude: zd.zone.latitude, longitude: zd.zone.longitude }))
  );
  const airByZone = new Map(zoneData.map((zd, i) => [zd.zone.number, air[i] ?? null]));

  // Feature: next-2h rain nowcast from the stored hourly ingestion (real data).
  const nowcast = await getNowcast(2);
  const nowcastByZone = new Map(nowcast.map((n) => [n.zoneNumber, n]));

  // Feature: citywide sea state + river-basin advisories (real GloFAS/marine data).
  const [sea, rivers] = await Promise.all([
    fetchSeaState(CHENNAI_OFFSHORE.latitude, CHENNAI_OFFSHORE.longitude),
    getRiverStatuses(),
  ]);

  return { zoneData, tide, airByZone, nowcastByZone, sea, rivers };
}

export default async function PublicWeatherPage() {
  const { zoneData, tide, airByZone, nowcastByZone, sea, rivers } = await getZoneData();
  const alerts = await getPublicAlerts(8);

  const zonesWithToday = zoneData.filter(z => z.today !== null);

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-50 via-white to-blue-50">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <BrandMark className="h-10 w-10" />
            <div>
              <h1 className="text-lg font-bold text-slate-900">Chennai Weather</h1>
              <p className="text-xs text-slate-500">Madras Weather Monitor</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="hidden items-center gap-1 text-xs font-medium text-slate-500 md:flex">
              <span className="h-2 w-2 animate-pulse rounded-full bg-green-500" />
              Live · Open-Meteo
            </span>
            <Link
              href="/"
              className="rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-900"
            >
              Home
            </Link>
            <Link
              href="/login"
              className="inline-flex items-center gap-1.5 rounded-full bg-[#1A73E8] px-4 py-2 text-xs font-semibold text-white shadow-sm transition-all hover:-translate-y-px hover:bg-[#1765CC] hover:shadow-md"
            >
              <Shield size={13} aria-hidden="true" />
              Staff sign in
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8">
        <div className="bg-gradient-to-r from-sky-500 to-blue-600 rounded-3xl p-6 sm:p-8 mb-8 text-white shadow-xl">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold mb-2">Chennai Weather Today</h1>
              <p className="text-blue-100 text-sm sm:text-base max-w-lg">
                Check rainfall forecasts, flood risk levels, and tide conditions for all 15 zones across Greater Chennai.
                Helps citizens and emergency teams stay prepared.
              </p>
            </div>
            <div className="hidden sm:flex items-center gap-2 bg-white/20 rounded-xl px-4 py-2 backdrop-blur-sm">
              <CalendarDays size={16} />
              <span className="text-sm font-semibold">{new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "Asia/Kolkata" })}</span>
            </div>
          </div>
        </div>

        <TodaySummary zones={zoneData} tide={tide} />

        {/* Sea state + river advisories — real marine/GloFAS data, hidden when unavailable */}
        {(sea || rivers.some((r) => r.rising)) && (
          <section className="mb-6 grid gap-3 sm:grid-cols-2">
            {sea && (
              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-slate-500">
                  <Waves size={14} className="text-cyan-600" />
                  Offshore sea state · Chennai harbour approach
                </div>
                <div className="mt-2 flex flex-wrap items-baseline gap-x-3 gap-y-1">
                  <span className="text-2xl font-extrabold tabular-nums text-slate-900">{sea.waveHeightM.toFixed(1)} m</span>
                  <span className="text-xs text-slate-500">waves · swell {sea.swellHeightM.toFixed(1)} m</span>
                  <span
                    className={`rounded-full px-2.5 py-1 text-xs font-bold ${
                      seaStateAdvisory(sea.waveHeightM).tone === "red"
                        ? "bg-red-100 text-red-700"
                        : seaStateAdvisory(sea.waveHeightM).tone === "amber"
                          ? "bg-amber-100 text-amber-700"
                          : "bg-emerald-100 text-emerald-700"
                    }`}
                  >
                    {seaStateAdvisory(sea.waveHeightM).label}
                  </span>
                </div>
              </div>
            )}
            {rivers.filter((r) => r.rising).map((r) => (
              <div key={r.station.key} className="rounded-2xl border border-amber-200 bg-amber-50 p-4 shadow-sm">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-amber-700">
                  <Waves size={14} />
                  River advisory · {r.station.river} basin
                </div>
                <p className="mt-2 text-sm font-semibold text-amber-900">
                  Discharge above advisory level — {r.note} (GloFAS).
                </p>
              </div>
            ))}
          </section>
        )}

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm mb-6">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Bell size={16} className="text-amber-600" />
              <h2 className="text-base font-bold text-slate-900">Active alerts</h2>
            </div>
            <Link
              href="/public-report"
              className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-600 transition-colors hover:bg-slate-50"
            >
              Full report <ArrowRight size={12} />
            </Link>
          </div>
          <ul className="divide-y divide-slate-100">
            {alerts.length > 0 ? (
              alerts.map((a) => (
                <li key={a.id} className="flex items-start gap-3 py-3">
                  <span className={`mt-0.5 shrink-0 rounded-full px-2 py-0.5 text-xs font-bold ${RISK_META[a.level as keyof typeof RISK_META]?.badge ?? "bg-slate-100 text-slate-600"}`}>
                    {RISK_META[a.level as keyof typeof RISK_META]?.label ?? a.level}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold text-slate-900">{a.title}</p>
                    <p className="mt-0.5 text-xs text-slate-500">
                      Zone {a.zoneNumber} — {a.zoneName} · {new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Kolkata" }).format(a.createdAt)} IST
                    </p>
                  </div>
                </li>
              ))
            ) : (
              <li className="py-4 text-center text-sm text-slate-500">No active alerts right now.</li>
            )}
          </ul>
        </section>

        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-slate-900">All Zones — 24hr Forecast</h2>
            <span className="text-sm text-slate-500">{zonesWithToday.length} zones reporting</span>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {zoneData.map((zd, i) => {
              const air = airByZone.get(zd.zone.number) ?? null;
              const nc = nowcastByZone.get(zd.zone.number) ?? null;
              return (
                <div key={zd.zone.number} className="animate-fade-in" style={{ animationDelay: `${i * 50}ms` }}>
                  <ZoneWeatherCard zone={zd.zone} today={zd.today} tide={tide} />
                  {zd.today && air && <div className="px-1"><AqiChip aqi={air.usAqi} pm25={air.pm2_5} /></div>}
                  {zd.today && nc && nc.next2hMm !== null && nc.next2hMm > 0 && (
                    <div className="mx-1 mt-2 flex items-center gap-2 rounded-xl bg-sky-50 px-3 py-2 text-xs font-semibold text-sky-800">
                      <CloudRain size={13} className="shrink-0" />
                      Rain next 2h: {nc.next2hMm.toFixed(1)} mm ({nc.note.split(" ")[0]} model)
                    </div>
                  )}
                  {zd.wards.length > 0 && <WardList zoneNumber={zd.zone.number} wards={zd.wards} />}
                </div>
              );
            })}
          </div>
        </div>

        <div className="mt-12 bg-white rounded-2xl border border-slate-200 p-6 sm:p-8">
          <h2 className="text-lg font-bold text-slate-900 mb-4">How to use this page</h2>
          <div className="grid sm:grid-cols-3 gap-4">
            <div className="flex gap-3">
              <div className="w-10 h-10 rounded-full bg-sky-100 flex items-center justify-center flex-shrink-0">
                <MapPin size={18} className="text-sky-600" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-sm">Find your zone</h3>
                <p className="text-xs text-slate-500 mt-1">Look for your zone name above. Chennai has 15 administrative zones covering 200 wards.</p>
              </div>
            </div>
            <div className="flex gap-3">
              <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
                <AlertTriangle size={18} className="text-amber-600" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-sm">Check the risk level</h3>
                <p className="text-xs text-slate-500 mt-1">Green = safe, Yellow = watch, Orange = warning, Red = alert. Higher risk means more likely flooding.</p>
              </div>
            </div>
            <div className="flex gap-3">
              <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0">
                <CheckCircle size={18} className="text-emerald-600" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-sm">Take action if needed</h3>
                <p className="text-xs text-slate-500 mt-1">If your zone shows warning or alert, avoid low-lying areas, move valuables upstairs, and follow local authorities' guidance.</p>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-8 bg-white rounded-2xl border border-slate-200 p-6 sm:p-8">
          <h2 className="text-lg font-bold text-slate-900 mb-4">Frequently Asked Questions</h2>
          <div className="space-y-4">
            <div className="border-b border-slate-100 pb-4">
              <h3 className="font-bold text-slate-900 text-sm">How accurate is this forecast?</h3>
              <p className="text-xs text-slate-500 mt-1">We use data from Open-Meteo which aggregates forecasts from ECMWF and GFS weather models. These are the same models used by meteorological departments worldwide. Forecasts are updated every 3 hours.</p>
            </div>
            <div className="border-b border-slate-100 pb-4">
              <h3 className="font-bold text-slate-900 text-sm">What do the risk levels mean?</h3>
              <p className="text-xs text-slate-500 mt-1">
                <span className="font-semibold text-emerald-600">Low</span> — No significant rain expected. Normal conditions.
                <br /><span className="font-semibold text-yellow-600">Watch</span> — Moderate rain possible. Keep an eye on low-lying areas.
                <br /><span className="font-semibold text-orange-600">Warning</span> — Heavy rain likely. Prepare for possible waterlogging.
                <br /><span className="font-semibold text-red-600">Alert</span> — Very heavy rain expected. Activate flood precautions now.
              </p>
            </div>
            <div className="border-b border-slate-100 pb-4">
              <h3 className="font-bold text-slate-900 text-sm">What is backflow risk?</h3>
              <p className="text-xs text-slate-500 mt-1">When heavy rain coincides with high tide, seawater can prevent storm drains from emptying into the ocean. This causes water to back up into streets and homes in coastal areas. Zones 1, 2, 4, 5, 13, 14, and 15 are coastal.</p>
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-sm">Can I report flooding in my area?</h3>
              <p className="text-xs text-slate-500 mt-1">Yes — use the "Report waterlogging" link below to file a citizen report for your zone. You can also subscribe to zone alerts if you create a free citizen account.</p>
            </div>
          </div>
        </div>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-3 text-sm">
          <Link
            href="/weather/incident"
            className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50"
          >
            <AlertTriangle size={14} className="text-amber-600" />
            Report waterlogging
          </Link>
          <Link
            href="/weather/subscribe"
            className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50"
          >
            <Bell size={14} className="text-sky-600" />
            Follow zones
          </Link>
          <Link
            href="/signup/citizen"
            className="inline-flex items-center gap-2 rounded-full bg-[#1A73E8] px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[#1765CC]"
          >
            Create citizen account
          </Link>
        </div>

        <div className="mt-8 text-center text-xs text-slate-400">
          <p>Weather data sourced from Open-Meteo (ECMWF & GFS models). Tide data computed from astronomical estimates.</p>
          <p className="mt-1">Madras Weather Monitor — Helping Chennai stay prepared, one zone at a time.</p>
        </div>
      </main>
    </div>
  );
}
