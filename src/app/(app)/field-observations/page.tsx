import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { getObservationsForZone, getLatestObservationForZone } from "@/lib/data";
import { upsertFieldObservation } from "./actions";
import { getChennaiZones } from "@/lib/zones";
import { istToday } from "@/lib/weather";
import RiskBadge from "@/components/RiskBadge";
import { CloudRain, Droplets, Save, CalendarDays, MapPin } from "lucide-react";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Field observations — Madras",
  description: "Analyst-entered rainfall and waterlogging observations for Chennai zones.",
};

export default async function FieldObservationsPage() {
  const session = await auth();
  if (!session?.user || (session.user.role !== "ADMIN" && session.user.role !== "ANALYST")) {
    redirect("/dashboard?error=forbidden");
  }

  const zones = getChennaiZones();
  const dbZones = await prisma.zone.findMany({ where: { isActive: true }, orderBy: { number: "asc" } });
  const dbByNumber = new Map(dbZones.map((z) => [z.number, z]));

  const selectedNumber = 1;
  const selectedZone = dbByNumber.get(selectedNumber);
  const observations = selectedZone
    ? await getObservationsForZone(selectedZone.id, 30)
    : [];

  const latest = selectedZone ? await getLatestObservationForZone(selectedZone.id) : null;

  const selectedZoneConfig = zones.find((z) => z.number === selectedNumber);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight text-[#202124]">Field observations</h1>
        <p className="mt-1 text-sm text-[#5F6368]">
          Enter manual rainfall and waterlogging observations for a zone. These feed the accuracy and analytics views as field data.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Zone picker */}
        <div className="rounded-2xl border border-[#DADCE0] bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <MapPin size={16} className="text-[#1A73E8]" />
            <h2 className="text-sm font-bold uppercase tracking-wide text-[#5F6368]">Select zone</h2>
          </div>
          <div className="space-y-1">
            {zones.slice(0, 8).map((z) => {
              const active = dbByNumber.get(z.number);
              const on = active?.number === selectedNumber;
              return (
                <button
                  key={z.number}
                  type="button"
                  onClick={() => {
                    const a = document.getElementById("observation-form") as HTMLFormElement | null;
                    if (a) a.requestSubmit();
                    window.location.href = `/field-observations?zone=${z.number}`;
                  }}
                  className={`w-full flex items-center justify-between rounded-xl px-4 py-2.5 text-sm transition-colors ${on ? "bg-[#E8F0FE] text-[#1A73E8] font-semibold" : "hover:bg-[#F8F9FA] text-[#202124]"}`}
                >
                  <span className="truncate">Zone {z.number} — {z.name}</span>
                  {active && (
                    <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-bold text-emerald-700">
                      Active
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Latest observation */}
        {latest && (
          <div className="rounded-2xl border border-[#DADCE0] bg-white p-5 shadow-sm lg:col-span-2">
            <div className="flex items-center gap-2 mb-3">
              <CalendarDays size={16} className="text-[#1A73E8]" />
              <h2 className="text-sm font-bold uppercase tracking-wide text-[#5F6368]">Latest observation</h2>
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="bg-slate-50 rounded-xl p-4">
                <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Date</div>
                <div className="mt-1 text-lg font-bold text-slate-900">{latest.date}</div>
              </div>
              <div className="bg-slate-50 rounded-xl p-4">
                <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Rainfall</div>
                <div className="mt-1 text-lg font-bold text-slate-900">{latest.rainfallMm !== null ? `${latest.rainfallMm.toFixed(1)} mm` : "—"}</div>
                <div className="text-xs text-slate-400">{latest.source}</div>
              </div>
              <div className="bg-slate-50 rounded-xl p-4">
                <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Waterlogging</div>
                <div className="mt-1 text-lg font-bold text-slate-900">{latest.depthCm !== null ? `${latest.depthCm} cm` : "—"}</div>
                {latest.note && <div className="mt-1 text-xs text-slate-400 truncate">{latest.note}</div>}
              </div>
            </div>
            <div className="mt-3 text-xs text-slate-400">
              Observer: {latest.observerName ?? "Unknown"}
            </div>
          </div>
        )}

        {/* Observation form */}
        <div className="rounded-2xl border border-[#DADCE0] bg-white p-5 shadow-sm lg:col-span-2" id="observation-form">
          <div className="flex items-center gap-2 mb-4">
            <Save size={16} className="text-[#1A73E8]" />
            <h2 className="text-sm font-bold uppercase tracking-wide text-[#5F6368]">New observation</h2>
          </div>
          <form action={upsertFieldObservation} className="space-y-4">
            <input type="hidden" name="zoneId" value={selectedZone?.id ?? ""} />

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <label htmlFor="date" className="text-sm font-semibold text-[#202124]">
                  Date *
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-[#80868B]">
                    <CalendarDays size={15} />
                  </div>
                  <input
                    id="date"
                    name="date"
                    type="date"
                    required
                    defaultValue={istToday()}
                    className="block h-11 w-full rounded-xl border border-slate-200 bg-white pl-9 focus:border-[#1A73E8] focus:outline-none focus:ring-1 focus:ring-[#1A73E8]"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label htmlFor="rainfallMm" className="text-sm font-semibold text-[#202124]">
                  Rainfall (mm/day, optional)
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-[#80868B]">
                    <CloudRain size={15} />
                  </div>
                  <input
                    id="rainfallMm"
                    name="rainfallMm"
                    type="number"
                    min="0"
                    step="0.1"
                    className="block h-11 w-full rounded-xl border border-slate-200 bg-white pl-9 focus:border-[#1A73E8] focus:outline-none focus:ring-1 focus:ring-[#1A73E8]"
                    placeholder="e.g. 12.5"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <label htmlFor="depthCm" className="text-sm font-semibold text-[#202124]">
                Waterlogging depth (cm, optional)
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-[#80868B]">
                  <Droplets size={15} />
                </div>
                <input
                  id="depthCm"
                  name="depthCm"
                  type="number"
                  min="0"
                  max="500"
                  className="block h-11 w-full rounded-xl border border-slate-200 bg-white pl-9 focus:border-[#1A73E8] focus:outline-none focus:ring-1 focus:ring-[#1A73E8]"
                  placeholder="e.g. 15"
                />
              </div>
              <p className="text-xs text-slate-400">
                Ankle-deep is about 10–15 cm. Leave blank if not measured.
              </p>
            </div>

            <div className="space-y-2">
              <label htmlFor="note" className="text-sm font-semibold text-[#202124]">
                Note (optional)
              </label>
              <textarea
                id="note"
                name="note"
                rows={3}
                maxLength={300}
                className="block h-24 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus:border-[#1A73E8] focus:outline-none focus:ring-1 focus:ring-[#1A73E8]"
                placeholder="Location, conditions, anything that helps interpret the reading."
              />
            </div>

            <div className="flex items-center gap-3">
              <button
                type="submit"
                className="inline-flex items-center gap-2 rounded-full bg-[#1A73E8] px-5 py-2.5 text-sm font-bold text-white shadow-sm transition-colors hover:bg-[#1765CC]"
              >
                <Save size={15} />
                Save observation
              </button>
              <span className="text-xs text-slate-400">
                Same date replaces the previous reading for this zone.
              </span>
            </div>
          </form>
        </div>
      </div>

      {/* Observation history */}
      {observations.length > 0 && (
        <div className="overflow-hidden rounded-2xl border border-[#DADCE0] bg-white shadow-sm">
          <div className="border-b border-[#F1F3F4] px-5 py-3.5">
            <h2 className="text-sm font-bold uppercase tracking-wide text-[#5F6368]">Observation history</h2>
            <p className="mt-0.5 text-xs text-[#5F6368]">Most recent first.</p>
          </div>
          <ul className="divide-y divide-[#F1F3F4]">
            {observations.map((o) => (
              <li key={o.id} className="flex flex-wrap items-center gap-3 px-5 py-3">
                <span className="w-24 shrink-0 text-sm font-semibold text-[#202124]">{o.date}</span>
                <span className="w-24 shrink-0 text-sm text-slate-600">
                  {o.rainfallMm !== null ? `${o.rainfallMm.toFixed(1)} mm` : "—"}
                </span>
                <span className="w-24 shrink-0 text-sm text-slate-600">
                  {o.depthCm !== null ? `${o.depthCm} cm` : "—"}
                </span>
                <span className="text-xs text-slate-400">{o.source}</span>
                {o.note && <span className="flex-1 truncate text-sm text-slate-500">{o.note}</span>}
                <span className="text-xs text-slate-400 shrink-0">by {o.observerName ?? "unknown"}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
