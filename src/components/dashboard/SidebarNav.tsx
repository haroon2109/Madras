'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  MapPin,
  BarChart3,
  ShieldCheck,
  Settings,
  Droplets,
  FlaskConical,
  CloudSunRain,
  Printer,
  CalendarDays,
  MapPinned,
} from 'lucide-react';
import { BrandMark } from '@/components/auth/BrandMark';

const NAV_SECTIONS: {
  heading: string;
  items: { href: string; label: string; icon: typeof LayoutDashboard; adminOnly?: boolean; staffOnly?: boolean }[];
}[] = [
  {
    heading: 'MONITOR',
    items: [
      { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
      { href: '/zones', label: 'Zones', icon: MapPin },
      { href: '/analytics', label: 'Analytics', icon: BarChart3 },
      { href: '/decisions', label: 'Decisions', icon: ShieldCheck },
    ],
  },
  {
    heading: 'WATCH',
    items: [
      { href: '/season', label: 'Season Watch', icon: CloudSunRain },
      { href: '/incidents', label: 'Incidents', icon: Droplets, adminOnly: true },
    ],
  },
  {
    heading: 'REPORT',
    items: [
      { href: '/report', label: 'City report', icon: Printer, staffOnly: true },
      { href: '/report/daily', label: 'Daily report', icon: CalendarDays, staffOnly: true },
      { href: '/report/zone', label: 'Zone report', icon: MapPinned, staffOnly: true },
    ],
  },
  {
    heading: 'SYSTEM',
    items: [
      { href: '/accuracy', label: 'Model Accuracy', icon: FlaskConical, adminOnly: true },
      { href: '/admin', label: 'Administration', icon: ShieldCheck, adminOnly: true },
      { href: '/settings', label: 'Settings', icon: Settings, staffOnly: true },
    ],
  },
];

function isActive(href: string, pathname: string): boolean {
  if (href === '/dashboard') return pathname === '/dashboard' || pathname === '/';
  if (href === '/decisions') return pathname === '/decisions';
  return pathname === href || pathname.startsWith(href + '/');
}

export interface ForecastServiceStatus {
  healthy: boolean;
  label: string;
}

export function SidebarNav({
  status,
  isAdmin,
  isSignedIn,
  onNavigate,
}: {
  status: ForecastServiceStatus;
  isAdmin: boolean;
  isSignedIn: boolean;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();

  return (
    <nav className="flex h-full flex-col" aria-label="Primary">
      <div className="flex h-16 shrink-0 items-center gap-3 border-b border-[#DCE8F5] px-5">
        <BrandMark className="h-9 w-9 shrink-0" />
        <Link href="/dashboard" onClick={onNavigate} className="text-[15px] font-extrabold tracking-tight text-[#102A56]">
          Madras
        </Link>
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-2">
        {NAV_SECTIONS.map((section) => {
          const visible = section.items.filter((n) => {
            if (n.adminOnly && !isAdmin) return false;
            if (n.staffOnly && !isSignedIn) return false;
            return true;
          });
          if (visible.length === 0) return null;
          return (
            <div key={section.heading} className="mb-3">
              <div className="mb-1 px-2 text-[10px] font-extrabold uppercase tracking-[0.14em] text-[#89A0BF]">
                {section.heading}
              </div>
              <div className="space-y-0.5">
                {visible.map((item) => {
                  const active = isActive(item.href, pathname);
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={onNavigate}
                      aria-current={active ? 'page' : undefined}
                      className={`flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-semibold transition-colors ${
                        active ? 'bg-[#E7F1FE] text-[#1478F2]' : 'text-[#57718F] hover:bg-[#F1F6FD] hover:text-[#102A56]'
                      }`}
                    >
                      <Icon size={18} strokeWidth={active ? 2.4 : 2} aria-hidden="true" />
                      {item.label}
                    </Link>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      <div className="shrink-0 p-4">
        <div className="rounded-xl border border-[#DCE8F5] bg-[#F7FBFF] px-3.5 py-3">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className={`absolute inline-flex h-full w-full rounded-full opacity-60 ${status.healthy ? 'animate-ping bg-emerald-400' : 'bg-amber-400'}`} />
              <span className={`relative inline-flex h-2 w-2 rounded-full ${status.healthy ? 'bg-emerald-500' : 'bg-amber-500'}`} />
            </span>
            <span className="text-xs font-bold text-[#102A56]">Forecast service</span>
          </div>
          <p className="mt-1 text-[11px] font-medium leading-relaxed text-[#57718F]">{status.label}</p>
        </div>
      </div>
    </nav>
  );
}
