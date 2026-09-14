import { getIngestHealth, ageLabel } from "@/lib/ingest-health";
import { Activity, CheckCircle2, AlertTriangle, Database, FileJson } from "lucide-react";

/**
 * Feature 6 — ingestion health panel (admin).
 *
 * Shows the real state of the data pipeline: raw archive files on disk,
 * hourly-table freshness, and daily-snapshot age, so analysts know when the
 * numbers can be trusted. All values are measured live from disk + DB.
 */
export default async function IngestHealthPanel() {
  const health = await getIngestHealth();

  const hourlyStale = health.hourlyAgeMs === null || health.hourlyAgeMs > 6 * 3_600_000;
  const snapshotStale = health.snapshotAgeMs === null || health.snapshotAgeMs > 3 * 3_600_000;
  const ok = !hourlyStale && !snapshotStale && health.zonesMissingHourly.length === 0;

  return (
    <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-slate-50 px-5 py-4">
        <div className="flex items-center gap-2">
          <Activity size={16} className="text-sky-600" aria-hidden="true" />
          <h2 className="text-sm font-bold uppercase tracking-wide text-slate-500">
            Ingestion &amp; pipeline health
          </h2>
        </div>
        <span
          className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold ${
            ok ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"
          }`}
        >
          {ok ? <CheckCircle2 size={13} /> : <AlertTriangle size={13} />}
          {ok ? "All pipelines fresh" : "Attention needed"}
        </span>
      </div>

      <div className="grid gap-4 px-5 py-5 sm:grid-cols-2 lg:grid-cols-4">
        {health.models.map((m) => (
          <div key={m.model} className="rounded-lg bg-slate-50 px-4 py-3">
            <div className="flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-wide text-slate-500">
              <FileJson size={12} aria-hidden="true" />
              {m.model} raw archive
            </div>
            <div className="mt-1 text-xl font-extrabold tabular-nums text-slate-900">
              {m.filesToday}
              <span className="ml-1 text-xs font-semibold text-slate-400">files today</span>
            </div>
            <div className="mt-0.5 text-xs text-slate-500">
              {m.zonesToday}/15 zones · newest {ageLabel(m.newestFileAgeMs)}
            </div>
          </div>
        ))}

        <div className="rounded-lg bg-slate-50 px-4 py-3">
          <div className="flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-wide text-slate-500">
            <Database size={12} aria-hidden="true" />
            Hourly table
          </div>
          <div className="mt-1 text-xl font-extrabold tabular-nums text-slate-900">
            {health.hourlyRowCount.toLocaleString("en-IN")}
            <span className="ml-1 text-xs font-semibold text-slate-400">rows</span>
          </div>
          <div className={`mt-0.5 text-xs ${hourlyStale ? "font-bold text-amber-600" : "text-slate-500"}`}>
            newest {ageLabel(health.hourlyAgeMs)} {hourlyStale ? "· stale >6h" : ""}
          </div>
        </div>

        <div className="rounded-lg bg-slate-50 px-4 py-3">
          <div className="flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-wide text-slate-500">
            <Database size={12} aria-hidden="true" />
            Daily snapshots
          </div>
          <div className={`mt-1 text-xl font-extrabold tabular-nums ${snapshotStale ? "text-amber-600" : "text-slate-900"}`}>
            {ageLabel(health.snapshotAgeMs)}
          </div>
          <div className={`mt-0.5 text-xs ${snapshotStale ? "font-bold text-amber-600" : "text-slate-500"}`}>
            forecast capture {snapshotStale ? "· stale >3h" : "· fresh"}
          </div>
        </div>
      </div>

      {health.zonesMissingHourly.length > 0 && (
        <div className="border-t border-amber-100 bg-amber-50 px-5 py-3">
          <p className="text-xs font-semibold text-amber-800">
            Zones with no hourly data ({health.zonesMissingHourly.length}):{" "}
            {health.zonesMissingHourly.join(", ")}. Run{" "}
            <code className="rounded bg-amber-100 px-1">npm run ingest &amp;&amp; npm run process &amp;&amp; npm run load</code>{" "}
            to backfill.
          </p>
        </div>
      )}
      {!health.archiveExists && (
        <div className="border-t border-slate-100 bg-slate-50 px-5 py-3">
          <p className="text-xs text-slate-500">
            The raw archive (<code>data/raw/</code>) does not exist yet — the hourly ingestion has
            never run on this deployment.
          </p>
        </div>
      )}
    </section>
  );
}
