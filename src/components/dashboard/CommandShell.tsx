'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { signOut } from 'next-auth/react';
import {
  Activity,
  BarChart3,
  CloudRain,
  LayoutDashboard,
  LogOut,
  Menu,
  Search,
  Shield,
  TrendingUp,
  Waves,
  X,
} from 'lucide-react';
import { NotificationBell } from './NotificationBell';
import { BrandMark } from '@/components/auth/BrandMark';

type Role = 'ADMIN' | 'ANALYST' | 'VIEWER';

interface NavItem {
  href: string;
  label: string;
  icon: React.ReactNode;
  /** Roles allowed to see this entry. Omitted = every signed-in role. */
  roles?: Role[];
}

interface ShellUser {
  name?: string | null;
  email?: string | null;
  role?: string | null;
}

interface CommandShellProps {
  children: React.ReactNode;
  user: ShellUser | null;
}

export default function CommandShell({ children, user }: CommandShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const pathname = usePathname();
  const role = user?.role as Role | undefined;

  const navItems: NavItem[] = [
    { href: '/dashboard', label: 'Dashboard', icon: <LayoutDashboard size={18} /> },
    { href: '/zones', label: 'Zones', icon: <Activity size={18} /> },
    { href: '/analytics', label: 'Analytics', icon: <BarChart3 size={18} /> },
    { href: '/decisions', label: 'Decisions', icon: <TrendingUp size={18} /> },
    { href: '/incidents', label: 'Incidents', icon: <CloudRain size={18} />, roles: ['ADMIN'] },
    { href: '/season', label: 'Season Watch', icon: <CloudRain size={18} /> },
    { href: '/tide', label: 'Tide Monitor', icon: <Waves size={18} /> },
    { href: '/accuracy', label: 'Model Accuracy', icon: <BarChart3 size={18} />, roles: ['ADMIN'] },
    { href: '/admin', label: 'Administration', icon: <Shield size={18} />, roles: ['ADMIN'] },
  ];

  const visibleNav = navItems.filter((item) => !item.roles || (role && item.roles.includes(role)));

  const isActive = (href: string) => {
    if (href === '/dashboard') return pathname === '/dashboard';
    return pathname.startsWith(href);
  };

  // Page title in the glass top bar — fall back to a matching nav label so a
  // role-filtered item (or an unlisted route) still titles itself correctly.
  const activeLabel =
    visibleNav.find((item) => isActive(item.href))?.label ??
    navItems.find((item) => isActive(item.href))?.label ??
    'Dashboard';

  const roleLabel = role === 'ADMIN' ? 'Administrator' : role === 'ANALYST' ? 'Analyst' : 'Viewer';
  const roleChipCls =
    role === 'ADMIN'
      ? 'bg-[#FCE8E6] text-[#D93025]'
      : role === 'ANALYST'
        ? 'bg-[#E8F0FE] text-[#1A73E8]'
        : 'bg-[#F1F3F4] text-[#5F6368]';
  const initials =
    (user?.name ?? user?.email ?? 'M')
      .split(/[\s@.]+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]!.toUpperCase())
      .join('') || 'M';

  async function handleSignOut() {
    await signOut({ callbackUrl: '/' });
  }

  return (
    <div className="flex min-h-screen bg-[#F8F9FA]">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="drawer-overlay fixed inset-0 z-40 bg-[#202124]/25 backdrop-blur-[2px] lg:hidden"
          onClick={() => setSidebarOpen(false)}
          style={{ animation: 'fadeIn 200ms cubic-bezier(0.2, 0, 0, 1) both' }}
        />
      )}

      {/* Sidebar — spring drawer on mobile, always-visible column on desktop.
          The transform classes are applied under lg: so they can never shift
          the static desktop column off-screen. */}
      <aside
        className={
          `fixed inset-y-0 left-0 z-50 w-64 flex-col overflow-y-auto border-r border-[#EDF0F2] bg-white
          lg:sticky lg:top-0 lg:z-auto lg:h-screen lg:shrink-0 lg:translate-x-0 lg:overflow-hidden
          drawer-panel
          ${sidebarOpen ? 'drawer-panel--open' : 'drawer-panel--closed'}`
        }
      >
        {/* Logo */}
        <div className="flex h-16 items-center justify-between border-b border-[#EDF0F2] px-5">
          <Link href="/dashboard" className="flex items-center gap-3">
            <BrandMark className="h-9 w-9" />
            <div>
              <span className="block text-[15px] font-semibold tracking-tight text-[#202124]">
                Madras
              </span>
              <span className="block text-[10px] font-medium uppercase tracking-[0.1em] text-[#80868B]">
                Command Center
              </span>
            </div>
          </Link>
          <button
            onClick={() => setSidebarOpen(false)}
            aria-label="Close navigation"
            className="rounded-full p-2 text-[#80868B] transition-colors duration-200 hover:bg-[#F1F3F4] hover:text-[#202124] lg:hidden"
          >
            <X size={18} />
          </button>
        </div>

        {/* Search */}
        <div className="px-4 py-4">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const q = searchQuery.trim();
              window.location.href = q ? `/zones?q=${encodeURIComponent(q)}` : '/zones';
            }}
          >
            <div className="relative">
              <Search
                size={16}
                className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[#80868B]"
                aria-hidden="true"
              />
              <input
                type="text"
                placeholder="Search zones…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                aria-label="Search zones"
                className="h-10 w-full rounded-full border border-[#DADCE0] bg-[#F8F9FA] pl-10 pr-4 text-sm text-[#202124] placeholder:text-[#80868B] transition-all duration-200 focus:border-[#1A73E8] focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#1A73E8]"
              />
            </div>
          </form>
        </div>

        {/* Navigation — staggered entry, spring press states, role-filtered */}
        <nav className="stagger-group flex-1 space-y-1 overflow-y-auto px-3 pt-3" aria-label="Primary">
          {visibleNav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setSidebarOpen(false)}
              aria-current={isActive(item.href) ? 'page' : undefined}
              className={`
                flex items-center gap-3 rounded-full px-4 py-2.5
                text-sm transition-all duration-200
                active:scale-[0.97]
                ${isActive(item.href)
                  ? 'bg-[#E8F0FE] font-semibold text-[#1A73E8]'
                  : 'font-medium text-[#5F6368] hover:bg-[#F1F3F4] hover:text-[#202124]'
                }
              `}
            >
              {item.icon}
              <span>{item.label}</span>
            </Link>
          ))}
        </nav>

        {/* Footer — signed-in user chip + settings + sign-out */}
        <div className="mt-auto border-t border-[#EDF0F2] px-4 py-4">
          {user && (
            <div className="mb-2 flex items-center gap-3 rounded-2xl bg-[#F8F9FA] px-3 py-3">
              <span
                aria-hidden="true"
                className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[#1A73E8] text-xs font-bold text-white"
              >
                {initials}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[13px] font-semibold text-[#202124]">
                  {user.name ?? user.email}
                </span>
                <span
                  className={`mt-0.5 inline-block rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${roleChipCls}`}
                >
                  {roleLabel}
                </span>
              </span>
              <button
                type="button"
                onClick={handleSignOut}
                title="Sign out"
                aria-label="Sign out"
                className="pressable rounded-full p-2 text-[#80868B] transition-colors duration-200 hover:bg-white hover:text-[#D93025]"
              >
                <LogOut size={16} aria-hidden="true" />
              </button>
            </div>
          )}
          <Link
            href="/settings"
            className="flex items-center gap-3 rounded-full px-4 py-2.5 text-sm font-medium text-[#5F6368] transition-all duration-200 hover:bg-[#F1F3F4] hover:text-[#202124]"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
            </svg>
            Settings
          </Link>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex min-h-screen flex-1 flex-col">
        {/* Top bar — glass at blur(8px) */}
        <header className="sticky top-0 z-30 h-16 border-b border-[#EDF0F2] bg-white/78 backdrop-blur-[8px]">
          <div className="flex h-full items-center justify-between px-4 lg:px-8">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setSidebarOpen(true)}
                aria-label="Open navigation"
                className="rounded-full p-2 text-[#5F6368] transition-colors duration-200 hover:bg-[#F1F3F4] hover:text-[#202124] lg:hidden"
              >
                <Menu size={20} />
              </button>
              <div className="hidden sm:block">
                <h1 className="text-base font-semibold text-[#202124]">{activeLabel}</h1>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <NotificationBell />
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1">
          <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">{children}</div>
        </main>
      </div>
    </div>
  );
}
