import type { ReservoirDTO } from "@/lib/data";
import type { TideInfo } from "@/lib/tide";

function pctColor(pct: number | null): string {
  if (pct === null) return "bg-slate-200";
  if (pct >= 80) return "bg-sky-500";
  if (pct >= 50) return "bg-sky-400";
  if (pct >= 25) return "bg-amber-400";
  return "bg-red-400";
}

export default function ReservoirPanel({
  reservoirs,
  tide,
  todayKey,
  readingAction,
  tideAction,
}: {
  reservoirs: ReservoirDTO[];
  tide: TideInfo;
  todayKey: string;
  readingAction: (formData: FormData) => Promise<void>;
  tideAction: (formData: FormData) => Promise<void>;
}) {
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <section className="rounded-2xl border border-[#DADCE0] bg-white p-5">
        <h2 className="text-sm font-bold uppercase tracking-wide text-[#5F6368]">
          Reservoir storage
        </h2>
        <ul className="mt-3 space-y-3">
          {reservoirs.map((r) => (
            <li key={r.id}>
              <div className="flex items-baseline justify-between gap-2 text-sm">
                <span className="font-bold text-[#202124]">{r.name}</span>
                <span className="text-xs font-semibold tabular-nums text-[#5F6368]">
                  {r.levelTmcft !== null ? `${r.levelTmcft.toFixed(2)} / ${r.capacityTmcft} TMC` : `${r.capacityTmcft} TMC capacity`}
                  {r.storagePct !== null && <strong className="ml-1 text-[#0284c7]">{r.storagePct}%</strong>}
                </span>
              </div>
              <div className="mt-1 h-2 overflow-hidden rounded-full bg-slate-100">
                <div className={`h-full rounded-full ${pctColor(r.storagePct)}`} style={{ width: `${Math.min(100, r.storagePct ?? 0)}%` }} />
              </div>
              {r.date && <div className="mt-0.5 text-[11px] text-[#5F6368]">reading {r.date}</div>}
            </li>
          ))}
          {reservoirs.length === 0 && (
            <li className="py-6 text-center text-sm text-[#5F6368]">No reservoirs seeded yet.</li>
          )}
        </ul>

        {reservoirs.length > 0 && (
          <form action={readingAction} className="mt-4 rounded-xl bg-[#F8F9FA] p-3">
            <div className="text-xs font-bold text-[#5F6368]">Log reading (analyst/admin)</div>
            <div className="mt-2 grid grid-cols-2 gap-2">
              <select name="reservoirId" className="rounded-lg border border-slate-300 px-2 py-1.5 text-xs">
                {reservoirs.map((r) => (
                  <option key={r.id} value={r.id}>{r.name}</option>
                ))}
              </select>
              <input name="date" type="date" defaultValue={todayKey} className="rounded-lg border border-slate-300 px-2 py-1.5 text-xs" />
              <input name="levelTmcft" type="number" step="any" min={0} placeholder="Level (TMC ft)" className="rounded-lg border border-slate-300 px-2 py-1.5 text-xs" />
              <input name="inflowCusec" type="number" step="any" min={0} placeholder="Inflow (cusec)" className="rounded-lg border border-slate-300 px-2 py-1.5 text-xs" />
            </div>
            <button className="mt-2 rounded-full bg-[#0284c7] px-4 py-1.5 text-xs font-bold text-white hover:bg-[#0369a1]">
              Save reading
            </button>
          </form>
        )}
      </section>

      <section className="rounded-2xl border border-[#DADCE0] bg-white p-5">
        <h2 className="text-sm font-bold uppercase tracking-wide text-[#5F6368]">
          Harbour tide &amp; backflow
        </h2>
        <div className="mt-3 rounded-xl bg-[#F0F9FF] p-4 text-sm">
          <div className="flex items-baseline justify-between">
            <span className="font-bold text-[#0c4a6e]">High tide {tide.highTideAt} IST</span>
            <span className="text-2xl font-extrabold tabular-nums text-[#0c4a6e]">{tide.highTideM.toFixed(2)} m</span>
          </div>
          <div className="mt-1 text-xs text-[#5F6368]">
            Low {tide.lowTideAt} · {tide.lowTideM.toFixed(2)} m · {tide.source === "manual" ? "harbour reading" : "astronomical estimate"}
          </div>
          <p className="mt-2 text-xs leading-relaxed text-[#3C4043]">
            When high tide is ≥ 1.0 m, coastal storm drains cannot discharge freely.
            Any coastal zone at warning level or above gets a backflow flag on the decisions table.
          </p>
        </div>
        <form action={tideAction} className="mt-3 rounded-xl bg-[#F8F9FA] p-3">
          <div className="text-xs font-bold text-[#5F6368]">Override with harbour reading</div>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <input name="date" type="date" defaultValue={todayKey} className="rounded-lg border border-slate-300 px-2 py-1.5 text-xs" />
            <input name="highTideAt" placeholder="HH:MM" pattern="\d{2}:\d{2}" className="rounded-lg border border-slate-300 px-2 py-1.5 text-xs" />
            <input name="highTideM" type="number" step="any" min={0} max={5} placeholder="High (m)" className="rounded-lg border border-slate-300 px-2 py-1.5 text-xs" />
            <input name="lowTideM" type="number" step="any" min={0} max={5} placeholder="Low (m, opt)" className="rounded-lg border border-slate-300 px-2 py-1.5 text-xs" />
          </div>
          <button className="mt-2 rounded-full bg-[#0e7490] px-4 py-1.5 text-xs font-bold text-white hover:bg-[#155e75]">
            Save tide reading
          </button>
        </form>
      </section>
    </div>
  );
}
