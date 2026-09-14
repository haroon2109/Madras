import type { Metadata } from 'next';
import Link from 'next/link';
import { ensureFreshForecasts, getDashboardData } from '@/lib/data';
import StatCard from '@/components/dashboard/StatCard';
import ZoneFilterGrid from '@/components/dashboard/ZoneFilterGrid';
import { CloudRain, Eye, TriangleAlert, Bell, FileBarChart } from 'lucide-react';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Zones | Madras Command Center',
  description: 'Zone-wise rainfall forecasts and risk conditions across Greater Chennai.',
};

export default async function ZonesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const sp = await searchParams;
  const initialQuery = sp.q ?? '';

  await ensureFreshForecasts();
  const { zones, lastUpdated } = await getDashboardData();

  const watchCount = zones.filter((z) => z.today?.risk === 'WATCH').length;
  const warningCount = zones.filter((z) => z.today?.risk === 'WARNING').length;
  const alertCount = zones.filter((z) => z.today?.risk === 'ALERT').length;

  return (
    <div className="space-y-8 animate-in">
        {/* Page header */}
        <div className="animate-rise-up min-w-0">
          <div className="mb-2 flex items-center gap-3">
            <span className="rounded-full border border-[rgba(20,120,242,0.2)] bg-[rgba(20,120,242,0.08)] px-3 py-1 text-xs font-semibold uppercase tracking-wider text-[#1A73E8]">
              Chennai Administration
            </span>
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-[#202124] sm:text-4xl">
            Zone Monitoring
          </h1>
          <p className="mt-2 max-w-2xl text-lg text-[#5F6368]">
            Rainfall forecasts, risk levels, and conditions across all 15 administrative zones
            of Greater Chennai.
          </p>
        </div>

        {/* Stats row */}
        <div className="animate-rise-up stagger-1 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            label="Active Zones"
            value={zones.length}
            icon={<CloudRain size={20} />}
            tone="blue"
            highlight
          />
          <StatCard
            label="Watch Status"
            value={watchCount}
            suffix="zones"
            icon={<Eye size={20} />}
            tone="amber"
          />
          <StatCard
            label="Warning Level"
            value={warningCount}
            suffix="zones"
            icon={<TriangleAlert size={20} />}
            tone="amber"
          />
          <StatCard
            label="Critical Alerts"
            value={alertCount}
            suffix="zones"
            icon={<Bell size={20} />}
            tone="red"
          />
        </div>

        {/* Search + filter + zone grid (client-side, functional) */}
        <ZoneFilterGrid zones={zones} initialQuery={initialQuery} />

        {/* Footer note */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#DADCE0] pt-4 text-sm text-[#5F6368]">
          <p className="flex items-center gap-2">
            <span className="h-2 w-2 animate-pulse-soft rounded-full bg-emerald-500" />
            Live monitoring active
          </p>
          <div className="flex items-center gap-2">
            <Link
              href="/report"
              className="inline-flex items-center gap-1.5 rounded-full border border-[#DADCE0] bg-white px-4 py-2 text-[13px] font-medium text-[#202124] transition-all duration-200 hover:-translate-y-px hover:border-[#BDC1C6] hover:shadow-[0_4px_24px_rgba(0,0,0,0.06)]"
            >
              <FileBarChart size={15} className="text-[#1A73E8]" aria-hidden="true" />
              Briefing reports
            </Link>
            <Link
              href="/report/daily"
              className="inline-flex items-center gap-1.5 rounded-full border border-[#DADCE0] bg-white px-4 py-2 text-[13px] font-medium text-[#202124] transition-all duration-200 hover:-translate-y-px hover:border-[#BDC1C6] hover:shadow-[0_4px_24px_rgba(0,0,0,0.06)]"
            >
              <FileBarChart size={15} className="text-[#1A73E8]" aria-hidden="true" />
              Daily report
            </Link>
          </div>
        </div>
      </div>
  );
}
