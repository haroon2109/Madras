'use client';

import { useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { Search, X } from 'lucide-react';
import { RISK_META, type RiskLevel } from '@/lib/risk';
import type { ZoneForecastSummary } from '@/lib/data';
import ZoneCard from '@/components/ZoneCard';
import { useFlip } from '@/components/motion/useFlip';

const LEVELS: RiskLevel[] = ['LOW', 'WATCH', 'WARNING', 'ALERT'];

export default function ZoneFilterGrid({
  zones,
  initialQuery = '',
}: {
  zones: ZoneForecastSummary[];
  initialQuery?: string;
}) {
  const [query, setQuery] = useState(initialQuery);
  const [risk, setRisk] = useState<'ALL' | RiskLevel>('ALL');
  const gridRef = useRef<HTMLDivElement>(null);
  const pending = useRef(false);
  const { record, play } = useFlip<HTMLDivElement>();
  const router = useRouter();
  const pathname = usePathname();
  const urlParams = useSearchParams();

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return zones.filter((z) => {
      const matchesQuery =
        q === '' ||
        z.zone.name.toLowerCase().includes(q) ||
        String(z.zone.number).includes(q);
      const matchesRisk = risk === 'ALL' || z.today?.risk === risk;
      return matchesQuery && matchesRisk;
    });
  }, [zones, query, risk]);

  /** FIRST: snapshot card positions before React re-renders the grid. */
  const mutate = (setter: () => void) => {
    record(gridRef.current);
    pending.current = true;
    setter();
  };

  /** Sync the search query with the URL so it is shareable and bookmarkable. */
  useLayoutEffect(() => {
    const params = new URLSearchParams(urlParams.toString());
    if (query.trim()) {
      params.set('q', query.trim());
    } else {
      params.delete('q');
    }
    const qs = params.toString();
    const url = qs ? `${pathname}?${qs}` : pathname;
    // Replace (not push) to avoid flooding browser history with every keystroke.
    router.replace(url, { scroll: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, pathname, router]);

  const clearSearch = () => {
    mutate(() => setQuery(''));
  };

  /** LAST + INVERT + PLAY: spring cards from old positions to new, pre-paint. */
  useLayoutEffect(() => {
    if (!pending.current) return;
    pending.current = false;
    play(gridRef.current);
  });

  const inputCls =
    'h-11 rounded-full border border-[#DADCE0] bg-white px-4 text-sm font-medium text-[#202124] focus:border-[#1A73E8] focus:outline-none transition-colors duration-200';

  const resultCount = filtered.length;
  const totalCount = zones.length;
  const isSearching = query.trim().length > 0;

  return (
    <div className="space-y-5">
      <div className="stagger-group flex flex-col gap-3 sm:flex-row">
        <div className="relative max-w-md flex-1">
          <Search
            size={18}
            className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#80868B]"
            aria-hidden="true"
          />
          <input
            type="text"
            placeholder="Search zones by name or number…"
            value={query}
            onChange={(e) => mutate(() => setQuery(e.target.value))}
            aria-label="Search zones"
            className={`h-12 w-full rounded-full border border-[#DADCE0] bg-white pl-12 text-sm text-[#202124] placeholder:text-[#80868B] transition-all duration-200 focus:border-[#1A73E8] focus:outline-none focus:ring-1 focus:ring-[#1A73E8] ${isSearching ? 'pr-20' : 'pr-4'}`}
          />
          {isSearching && (
            <button
              type="button"
              onClick={clearSearch}
              aria-label="Clear search"
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-2 text-[#80868B] transition-colors hover:bg-[#F1F3F4] hover:text-[#202124]"
            >
              <X size={16} aria-hidden="true" />
            </button>
          )}
        </div>

        <select
          value={risk}
          onChange={(e) => mutate(() => setRisk(e.target.value as 'ALL' | RiskLevel))}
          aria-label="Filter by risk level"
          className={inputCls}
        >
          <option value="ALL">All risk levels</option>
          {LEVELS.map((level) => (
            <option key={level} value={level}>
              {RISK_META[level].label}
            </option>
          ))}
        </select>
      </div>

      {/* Results count */}
      <div className="flex items-center gap-2 text-sm text-[#5F6368]">
        {isSearching ? (
          <span>
            Found <strong className="text-[#202124]">{resultCount}</strong> of {totalCount} zones
            matching &ldquo;{query.trim()}&rdquo;
          </span>
        ) : (
          <span>Showing all {totalCount} zones</span>
        )}
      </div>

      {filtered.length === 0 ? (
        <div className="animate-in rounded-xl border border-dashed border-[#DADCE0] bg-white p-10 text-center">
          <p className="text-sm font-medium text-[#5F6368]">
            No zones match &ldquo;{query.trim()}&rdquo;.
          </p>
          <button
            type="button"
            onClick={clearSearch}
            className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-[#1A73E8] transition-colors hover:text-[#102A56]"
          >
            <X size={14} aria-hidden="true" />
            Clear search
          </button>
        </div>
      ) : (
        <div
          ref={gridRef}
          className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
        >
          {filtered.map((zone) => (
            <div key={zone.zone.id} data-flip-id={zone.zone.id}>
              <ZoneCard summary={zone} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
