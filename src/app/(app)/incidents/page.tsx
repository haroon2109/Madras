import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { getIncidents, incidentSeverity } from "@/lib/data";
import { createIncident, setIncidentStatus } from "./actions";
import IncidentReportForm from "./IncidentReportForm";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Incidents — Madras",
  description: "Waterlogging and flood incident reports across Chennai zones.",
};

const STATUS_STYLES: Record<string, string> = {
  OPEN: "bg-red-50 text-red-700 border border-red-200",
  VERIFIED: "bg-amber-50 text-amber-700 border border-amber-200",
  RESOLVED: "bg-emerald-50 text-emerald-700 border border-emerald-200",
  REJECTED: "bg-slate-100 text-slate-500 border border-slate-200",
};

export default async function IncidentsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const sp = await searchParams;
  const session = await auth();
  if (session?.user?.role !== "ADMIN") redirect("/dashboard?error=forbidden");
  const status = sp.status ?? "ALL";
  const zones = await prisma.zone.findMany({ where: { isActive: true }, orderBy: { number: "asc" } });
  const { incidents } = await getIncidents({ status, limit: 100 });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight text-[#202124]">
          Waterlogging incidents
        </h1>
        <p className="mt-1 text-sm text-[#5F6368]">
          Field-team and citizen flood reports — verify, track and resolve per zone.
        </p>
      </div>

      <IncidentReportForm zones={zones.map((z) => ({ id: z.id, number: z.number, name: z.name }))} createAction={createIncident} />

      <div className="overflow-hidden rounded-2xl border border-[#DADCE0] bg-white">
        <ul className="divide-y divide-[#F1F3F4]">
          {incidents.map((i) => {
            const sev = incidentSeverity(i.depthCm);
            const dot = sev === "SEVERE" ? "bg-red-500" : sev === "MODERATE" ? "bg-amber-500" : "bg-sky-500";
            return (
              <li key={i.id} className="flex flex-wrap items-center gap-3 px-5 py-4">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-slate-100">
                  <span className={`h-3 w-3 rounded-full ${dot}`} />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-bold text-[#202124]">
                      Zone {i.zoneNumber} — {i.zoneName}
                    </span>
                    <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${STATUS_STYLES[i.status] ?? STATUS_STYLES.OPEN}`}>
                      {i.status}
                    </span>
                    <span className="text-[11px] font-semibold text-[#5F6368]">
                      {i.depthCm > 0 ? `${i.depthCm} cm` : "depth n/a"} · {sev.toLowerCase()} · {i.source}
                    </span>
                  </div>
                  <div className="mt-0.5 text-xs text-[#5F6368]">
                    {[i.description, i.reporterName ? `by ${i.reporterName}` : null].filter(Boolean).join(" · ")}
                  </div>
                </div>
                <div className="flex gap-2">
                  {i.status === "OPEN" && (
                    <form action={setIncidentStatus}>
                      <input type="hidden" name="id" value={i.id} />
                      <input type="hidden" name="status" value="VERIFIED" />
                      <button className="rounded-full border border-amber-300 px-3 py-1.5 text-xs font-bold text-amber-700 hover:bg-amber-50">
                        Verify
                      </button>
                    </form>
                  )}
                  {(i.status === "OPEN" || i.status === "VERIFIED") && (
                    <form action={setIncidentStatus}>
                      <input type="hidden" name="id" value={i.id} />
                      <input type="hidden" name="status" value="RESOLVED" />
                      <button className="rounded-full border border-emerald-300 px-3 py-1.5 text-xs font-bold text-emerald-700 hover:bg-emerald-50">
                        Resolve
                      </button>
                    </form>
                  )}
                </div>
              </li>
            );
          })}
          {incidents.length === 0 && (
            <li className="px-5 py-12 text-center text-sm text-[#5F6368]">
              No incidents with this status — file the first report above.
            </li>
          )}
        </ul>
      </div>
    </div>
  );
}
