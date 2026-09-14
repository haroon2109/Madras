import type { ZoneAccuracy } from "@/lib/data";

function fmt(n: number, digits = 1): string {
  return n.toFixed(digits);
}

export default function ModelAccuracyTable({ zones }: { zones: ZoneAccuracy[] }) {
  const hasData = zones.some((z) => z.rows.some((r) => r.days > 0));
  return (
    <div className="overflow-hidden rounded-2xl border border-[#DADCE0] bg-white">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-[#F8F9FA] text-xs uppercase tracking-wide text-[#5F6368]">
            <tr>
              <th className="px-5 py-2.5 font-semibold">Zone</th>
              <th className="px-5 py-2.5 font-semibold">Model</th>
              <th className="px-5 py-2.5 font-semibold">Days</th>
              <th className="px-5 py-2.5 font-semibold">MAE (mm)</th>
              <th className="px-5 py-2.5 font-semibold">Bias (mm)</th>
              <th className="px-5 py-2.5 font-semibold">Rain hit-rate</th>
              <th className="px-5 py-2.5 font-semibold">Verdict</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#F1F3F4]">
            {zones.map((z) => (
              z.rows.map((r) => (
                <tr key={`${z.zoneId}-${r.model}`} className="hover:bg-[#F8F9FA]/60">
                  <td className="px-5 py-2.5 font-semibold text-[#202124]">
                    Z{z.zoneNumber} {z.zoneName}
                  </td>
                  <td className="px-5 py-2.5">
                    <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${r.model === "ecmwf" ? "bg-blue-50 text-blue-700" : "bg-violet-50 text-violet-700"}`}>
                      {r.model.toUpperCase()}
                    </span>
                  </td>
                  <td className="px-5 py-2.5 tabular-nums text-[#3C4043]">{r.days}</td>
                  <td className="px-5 py-2.5 tabular-nums font-bold text-[#202124]">{r.days > 0 ? fmt(r.maeMm) : "—"}</td>
                  <td className="px-5 py-2.5 tabular-nums text-[#5F6368]">
                    {r.days > 0 ? `${r.biasMm > 0 ? "+" : ""}${fmt(r.biasMm)}` : "—"}
                  </td>
                  <td className="px-5 py-2.5 tabular-nums text-[#5F6368]">
                    {r.days > 0 ? `${Math.round(r.hitRate * 100)}%` : "—"}
                  </td>
                  <td className="px-5 py-2.5 text-xs font-bold text-[#1A73E8]">
                    {z.winner === r.model && r.days > 0 ? "★ better" : ""}
                  </td>
                </tr>
              ))
            ))}
          </tbody>
        </table>
      </div>
      {!hasData && (
        <p className="px-5 py-8 text-center text-sm text-[#5F6368]">
          No overlapping model + observation days yet — run ingest → process → load, then refresh forecasts.
        </p>
      )}
      <p className="border-t border-[#F1F3F4] px-5 py-3 text-[11px] text-[#5F6368]">
        Bias + means the model over-predicts; − under-predicts. Hit-rate = share of observed rainy days (≥0.5 mm) the model also called rainy.
      </p>
    </div>
  );
}
