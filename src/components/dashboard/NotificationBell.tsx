"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Bell, CheckCircle2 } from "lucide-react";
import type { RiskLevel } from "@/lib/risk";
import { RISK_META } from "@/lib/risk";

export interface AlertNotification {
  id: string;
  level: RiskLevel;
  title: string;
  message: string;
  createdAt: string;
  zone: { number: number; name: string };
}

const LEVEL_DOT: Record<RiskLevel, string> = {
  LOW: "bg-[#188038]",
  WATCH: "bg-[#E37400]",
  WARNING: "bg-[#E37400]",
  ALERT: "bg-[#D93025]",
};

function timeAgo(value: string): string {
  const seconds = Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 1000));
  if (seconds < 60) return "Just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [alerts, setAlerts] = useState<AlertNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await fetch("/api/alerts/active");
        if (res.ok) {
          const data = (await res.json()) as AlertNotification[];
          if (alive) setAlerts(data);
        }
      } catch {
        /* keep empty */
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    function onPointer(e: PointerEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("pointerdown", onPointer);
    return () => document.removeEventListener("pointerdown", onPointer);
  }, []);

  const unread = alerts.length;

  return (
    <div ref={panelRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={unread > 0 ? `${unread} unresolved alerts` : "No unresolved alerts"}
        aria-expanded={open}
        className="pressable relative rounded-full p-2.5 text-[#5F6368] transition-colors duration-200 hover:bg-[#F1F3F4] hover:text-[#202124]"
      >
        <Bell size={20} aria-hidden="true" />
        {unread > 0 && (
          <span
            key={unread}
            className="animate-scale-in absolute right-1 top-1 grid h-[18px] min-w-[18px] place-items-center rounded-full bg-[#D93025] px-1 text-[10px] font-semibold text-white ring-2 ring-white"
          >
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="Active alerts"
          className="animate-scale-in absolute right-0 mt-2 w-[340px] max-w-[90vw] overflow-hidden rounded-2xl border border-[#DADCE0] bg-white shadow-[0_8px_40px_rgba(0,0,0,0.12)]"
        >
          <div className="flex items-center justify-between border-b border-[#EDF0F2] px-4 py-3">
            <div className="text-sm font-semibold text-[#202124]">Active alerts</div>
            <Link
              href="/decisions#alerts"
              onClick={() => setOpen(false)}
              className="text-[13px] font-medium text-[#1A73E8] transition-colors duration-200 hover:text-[#1765CC]"
            >
              View all →
            </Link>
          </div>
          <div className="max-h-[360px] overflow-y-auto">
            {loading ? (
              <div className="px-4 py-8 text-center text-xs text-[#80868B]">Loading…</div>
            ) : unread === 0 ? (
              <div className="flex flex-col items-center gap-2 px-4 py-8 text-center">
                <CheckCircle2 size={28} className="text-[#188038]" aria-hidden="true" />
                <div className="text-sm font-semibold text-[#202124]">All clear</div>
                <div className="text-xs text-[#80868B]">No unresolved alerts right now.</div>
              </div>
            ) : (
              <ul className="stagger-group divide-y divide-[#F1F3F4]">
                {alerts.map((a) => (
                  <li key={a.id} className="flex gap-3 px-4 py-3 transition-colors duration-200 hover:bg-[#F8F9FA]">
                    <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${LEVEL_DOT[a.level]}`} aria-hidden="true" />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="truncate text-[13px] font-semibold text-[#202124]">{a.title}</span>
                        <span className="shrink-0 rounded-full bg-[#F1F3F4] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[#5F6368]">
                          {RISK_META[a.level].label}
                        </span>
                      </div>
                      <div className="truncate text-xs text-[#5F6368]">Zone {a.zone.number} · {a.zone.name}</div>
                      <div className="text-[11px] text-[#80868B]">{timeAgo(a.createdAt)}</div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export function AlertsSinceLastVisit({ alerts }: { alerts: AlertNotification[] }) {
  if (alerts.length === 0) return null;
  return (
    <section
      aria-label="Alerts raised since your last visit"
      className="bento-cell border-[#FDE293] bg-[#FEF7E0] p-5"
    >
      <div className="flex items-center gap-2">
        <Bell size={18} className="text-[#E37400]" aria-hidden="true" />
        <h2 className="text-sm font-semibold uppercase tracking-wide text-[#8a5000]">
          Alerts raised since your last visit
        </h2>
        <span className="rounded-full bg-[#E37400] px-2 py-0.5 text-[11px] font-semibold text-white">
          {alerts.length}
        </span>
      </div>
      <ul className="mt-3 space-y-2">
        {alerts.map((a) => (
          <li key={a.id} className="flex items-center gap-3 rounded-xl bg-white/80 px-3 py-2">
            <span className={`h-2 w-2 shrink-0 rounded-full ${LEVEL_DOT[a.level]}`} aria-hidden="true" />
            <span className="min-w-0 flex-1">
              <span className="truncate text-sm font-semibold text-[#202124]">{a.title}</span>
              <span className="ml-2 text-xs text-[#5F6368]">Zone {a.zone.number} · {a.zone.name}</span>
            </span>
            <span className="shrink-0 rounded-full bg-[#F1F3F4] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[#5F6368]">
              {RISK_META[a.level].label}
            </span>
          </li>
        ))}
      </ul>
      <Link
        href="/decisions#alerts"
        className="mt-3 inline-block text-[13px] font-medium text-[#1A73E8] transition-colors duration-200 hover:text-[#1765CC]"
      >
        Review and resolve alerts →
      </Link>
    </section>
  );
}
