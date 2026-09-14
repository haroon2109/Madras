"use client";

import { useMemo, useState } from "react";
import { Download } from "lucide-react";

export interface ExportOption {
  /** `type` query value consumed by /api/report/export. */
  type: string;
  label: string;
}

/**
 * CSV export button: builds /api/report/export URLs from the current view
 * (type + date/zone context) and downloads the selected file.
 */
export default function ExportButton({ options }: { options: ExportOption[] }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);

  const qs = useMemo(() => {
    if (typeof window === "undefined") return "";
    const sp = new URLSearchParams(window.location.search);
    const date = sp.get("date");
    const zone = sp.get("zone");
    return date ? `&date=${encodeURIComponent(date)}` : zone ? `&zone=${encodeURIComponent(zone)}` : "";
  }, []);

  async function download(type: string) {
    setBusy(type);
    try {
      const res = await fetch(`/api/report/export?type=${type}${qs}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const disposition = res.headers.get("Content-Disposition") ?? "";
      const match = /filename="?([^";]+)"?/.exec(disposition);
      a.download = match?.[1] ?? "report.csv";
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      setOpen(false);
    } catch {
      // Keep the menu open so the user can retry.
    } finally {
      setBusy(null);
    }
  }

  if (options.length === 1) {
    const only = options[0];
    return (
      <button
        type="button"
        onClick={() => download(only.type)}
        disabled={busy !== null}
        className="inline-flex items-center gap-2 rounded-full border border-[#BCD9F5] bg-white px-4 py-2 text-sm font-bold text-[#1A73E8] transition-colors hover:bg-[#E8F0FE] disabled:opacity-60 print:hidden"
      >
        <Download size={16} aria-hidden="true" />
        {busy ? "Exporting…" : "Export CSV"}
      </button>
    );
  }

  return (
    <div className="relative print:hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        disabled={busy !== null}
        className="inline-flex items-center gap-2 rounded-full border border-[#BCD9F5] bg-white px-4 py-2 text-sm font-bold text-[#1A73E8] transition-colors hover:bg-[#E8F0FE] disabled:opacity-60"
      >
        <Download size={16} aria-hidden="true" />
        {busy ? "Exporting…" : "Export"}
      </button>
      {open && (
        <div role="menu" className="absolute right-0 z-20 mt-2 w-56 rounded-xl border border-[#DADCE0] bg-white p-1.5 shadow-lg shadow-blue-900/10">
          {options.map((o) => (
            <button
              key={o.type}
              type="button"
              role="menuitem"
              onClick={() => download(o.type)}
              className="block w-full rounded-lg px-3 py-2 text-left text-sm font-semibold text-[#202124] transition-colors hover:bg-[#F1F3F4]"
            >
              {o.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
