"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function RefreshButton({ label = "Refresh forecast data" }: { label?: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function handleClick() {
    setLoading(true);
    setMsg(null);
    try {
      const res = await fetch("/api/refresh", { method: "POST" });
      const data = (await res.json()) as { refreshed: string[]; failed: string[] };
      setMsg(
        data.failed.length > 0
          ? `Refreshed ${data.refreshed.length} zones (${data.failed.length} failed)`
          : `Refreshed ${data.refreshed.length} zones`
      );
      router.refresh();
    } catch {
      setMsg("Refresh failed — check the server logs.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex items-center gap-3">
      <button
        onClick={handleClick}
        disabled={loading}
        className="inline-flex items-center gap-2 rounded-md bg-sky-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-sky-700 disabled:opacity-60"
      >
        <span className={loading ? "animate-spin" : ""}>⟳</span>
        {loading ? "Fetching…" : label}
      </button>
      {msg && <span className="text-xs text-slate-500">{msg}</span>}
    </div>
  );
}