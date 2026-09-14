'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { signOut } from 'next-auth/react';
import { ChevronDown, Menu, Settings, ShieldCheck, X } from 'lucide-react';
import { NotificationBell } from './NotificationBell';
import { SidebarNav, type ForecastServiceStatus } from './SidebarNav';

export interface TopBarUser {
  name: string;
  email: string;
  role: string;
  isAdmin: boolean;
}

export function AppTopBar({ status, user }: { status: ForecastServiceStatus; user: TopBarUser | null }) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const initial = user && user.name.trim() ? user.name.trim()[0].toUpperCase() : 'M';

  useEffect(() => {
    function onPointerDown(e: PointerEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    }
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, []);

  return (
    <header className="sticky top-0 z-40 border-b border-[#DCE8F5] bg-white/90 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-[1440px] items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setDrawerOpen(true)}
            aria-label="Open navigation"
            className="rounded-lg p-2 text-[#57718F] transition-colors hover:bg-[#F1F6FD] hover:text-[#102A56] lg:hidden"
          >
            <Menu size={20} aria-hidden="true" />
          </button>

        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <NotificationBell />
          <div className="hidden h-6 w-px bg-[#DCE8F5] sm:block" />
          {user ? (
            <div ref={menuRef} className="relative">
              <button
                type="button"
                onClick={() => setMenuOpen((v) => !v)}
                aria-haspopup="menu"
                aria-expanded={menuOpen}
                className="flex items-center gap-2.5 rounded-full py-1.5 pl-1.5 pr-2.5 transition-colors hover:bg-[#F1F6FD]"
              >
                <span
                  aria-hidden="true"
                  className="grid h-9 w-9 place-items-center rounded-full bg-gradient-to-br from-[#1478F2] to-[#4A90E2] text-sm font-extrabold text-white"
                >
                  {initial}
                </span>
                <span className="hidden text-left sm:block">
                  <span className="block text-sm font-bold leading-tight text-[#102A56]">{user.name}</span>
                  <span className="block text-[11px] font-semibold leading-tight text-[#57718F]">{user.role}</span>
                </span>
                <ChevronDown size={16} className="text-[#57718F]" aria-hidden="true" />
              </button>
              {menuOpen && (
                <div role="menu" className="absolute right-0 mt-2 w-64 rounded-2xl border border-[#DCE8F5] bg-white p-2 shadow-xl shadow-blue-900/[0.08]">
                  <div className="px-3 py-2">
                    <div className="text-sm font-bold text-[#102A56]">{user.name}</div>
                    <div className="text-xs text-[#57718F]">{user.email}</div>
                    <div className="mt-1.5 inline-flex items-center gap-1 text-[11px] font-semibold text-[#4A90E2]">
                      <ShieldCheck size={12} aria-hidden="true" />
                      {user.role}
                    </div>
                  </div>
                  <div className="my-1.5 h-px bg-[#DCE8F5]" />
                  <Link href="/settings" role="menuitem" onClick={() => setMenuOpen(false)} className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold text-[#57718F] transition-colors hover:bg-[#F1F6FD] hover:text-[#102A56]">
                    <Settings size={16} aria-hidden="true" />
                    Settings
                  </Link>
                  <div className="my-1.5 h-px bg-[#DCE8F5]" />
                  <button type="button" role="menuitem" onClick={() => signOut({ callbackUrl: '/login' })} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold text-[#57718F] transition-colors hover:bg-[#F1F6FD] hover:text-[#102A56]">
                    Sign out
                  </button>
                </div>
              )}
            </div>
          ) : (
            <Link href="/login" className="rounded-full bg-[#1478F2] px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-[#102A56]">
              Sign in
            </Link>
          )}
        </div>
      </div>
      {drawerOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button type="button" aria-label="Close navigation" onClick={() => setDrawerOpen(false)} className="absolute inset-0 bg-[#102A56]/30 backdrop-blur-sm" />
          <aside className="absolute inset-y-0 left-0 flex w-72 max-w-[85vw] flex-col bg-white shadow-2xl">
            <button type="button" onClick={() => setDrawerOpen(false)} aria-label="Close navigation" className="absolute right-3 top-3 rounded-lg p-2 text-[#57718F] transition-colors hover:bg-[#F1F6FD] hover:text-[#102A56]">
              <X size={18} aria-hidden="true" />
            </button>
            <SidebarNav status={status} isAdmin={user?.isAdmin ?? false} isSignedIn={!!user} onNavigate={() => setDrawerOpen(false)} />
          </aside>
        </div>
      )}
    </header>
  );
}
