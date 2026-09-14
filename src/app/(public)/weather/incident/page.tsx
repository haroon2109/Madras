import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { getChennaiZones } from "@/lib/zones";
import { incidentSeverity, getIncidents } from "@/lib/data";
import { fileCitizenIncident } from "./actions";

import PublicIncidentForm from "./PublicIncidentForm";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Report waterlogging — Madras",
  description: "Report waterlogging or flooding in your Chennai zone. Reports go to the operations team for verification.",
};

export default async function PublicIncidentPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const sp = await searchParams;
  const session = await auth();
  const status = sp.status ?? "ALL";

  const zones = getChennaiZones();
  const dbZones = await prisma.zone.findMany({ where: { isActive: true }, orderBy: { number: "asc" } });
  const dbByNumber = new Map(dbZones.map((z) => [z.number, z]));

  const { incidents } = await getIncidents({ status, limit: 100 });

  const mapped = incidents.map((i) => {
    const dbZone = dbByNumber.get(i.zoneNumber);
    return {
      ...i,
      latitude: dbZone ? dbZone.latitude : i.latitude,
      longitude: dbZone ? dbZone.longitude : i.longitude,
    };
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-50 via-white to-blue-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <a href="/weather" className="rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-600 transition-colors hover:bg-slate-50">
              Back to weather
            </a>
          </div>
          <div className="flex items-center gap-2">
            <a
              href="/"
              className="rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-600 transition-colors hover:bg-slate-50"
            >
              Home
            </a>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8">
        <div className="bg-gradient-to-r from-sky-500 to-blue-600 rounded-3xl p-6 sm:p-8 mb-8 text-white shadow-xl">
          <h1 className="text-2xl sm:text-3xl font-extrabold mb-2">Report waterlogging or flooding</h1>
          <p className="text-blue-100 text-sm sm:text-base max-w-lg">
            Tell the operations team where water is accumulating. Include your zone and a safe location if possible.
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-base font-bold text-slate-900 mb-1">File a report</h2>
          <p className="text-sm text-slate-500 mb-4">
            Your report is reviewed by the Greater Chennai operations team. You do not need an account, but signing in
            lets you follow updates.
          </p>
          <PublicIncidentForm
            zones={zones.map((z) => ({ number: z.number, name: z.name }))}
            createAction={fileCitizenIncident}
            signedIn={!!session?.user}
          />
        </div>

        <div className="mt-6 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 px-5 py-3.5">
            <h2 className="text-sm font-bold uppercase tracking-wide text-slate-500">Recent reports</h2>
            <div className="mt-1 flex items-center gap-2 text-xs text-slate-400">
              {incidents.length} report{incidents.length === 1 ? "" : "s"}
            </div>
          </div>
          <ul className="divide-y divide-slate-100">
            {mapped.map((i) => {
              const sev = incidentSeverity(i.depthCm);
              const dot = sev === "SEVERE" ? "bg-red-500" : sev === "MODERATE" ? "bg-amber-500" : "bg-sky-500";
              return (
                <li key={i.id} className="flex flex-wrap items-start gap-3 px-5 py-4">
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-slate-100">
                    <span className={`h-3 w-3 rounded-full ${dot}`} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-bold text-slate-900">
                        Zone {i.zoneNumber} — {i.zoneName}
                      </span>
                      <span className="rounded-full px-2.5 py-0.5 text-xs font-bold bg-slate-100 text-slate-600">
                        {i.status}
                      </span>
                      <span className="text-xs font-semibold text-slate-500">
                        {i.depthCm > 0 ? `${i.depthCm} cm` : "depth n/a"} · {sev.toLowerCase()} · {i.source}
                      </span>
                    </div>
                    <p className="mt-0.5 text-xs text-slate-500">
                      {[i.description, i.reporterName ? `by ${i.reporterName}` : null].filter(Boolean).join(" · ")}
                    </p>
                  </div>
                </li>
              );
            })}
            {mapped.length === 0 && (
              <li className="px-5 py-12 text-center text-sm text-slate-500">No reports yet. Be the first to file one above.</li>
            )}
          </ul>
        </div>
      </main>
    </div>
  );
}
