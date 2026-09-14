import { auth } from '@/lib/auth';
import { getForecastServiceStatus } from '@/lib/data';
import { AppTopBar, type TopBarUser } from '@/components/dashboard/AppTopBar';
import { SidebarNav, type ForecastServiceStatus } from '@/components/dashboard/SidebarNav';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const [session, statusInfo] = await Promise.all([auth(), getForecastServiceStatus()]);

  const user = session?.user;

  // Real forecast-service status from the freshest snapshot on record
  // (computed in the data layer; see getForecastServiceStatus).
  const status: ForecastServiceStatus = {
    healthy: statusInfo.healthy,
    label: statusInfo.healthy
      ? 'Operational · forecasts flowing'
      : statusInfo.ageMs === null
        ? 'Standby · awaiting forecast data'
        : 'Standby · forecasts stale (>3h)',
  };

  const topBarUser: TopBarUser | null = user
    ? {
        name: user.name ?? 'Madras Admin',
        email: user.email ?? '',
        role: user.role ?? 'Operator',
        isAdmin: user.role === 'ADMIN',
      }
    : null;

  return (
    <div className="flex min-h-screen bg-[#F7FBFF]">
      {/* Desktop sidebar */}
      <aside className="sticky top-0 hidden h-screen w-[232px] shrink-0 border-r border-[#DCE8F5] bg-white lg:flex lg:flex-col">
        <SidebarNav status={status} isAdmin={user?.role === 'ADMIN'} isSignedIn={!!user} />
      </aside>

      {/* Main column */}
      <div className="flex min-w-0 flex-1 flex-col">
        <AppTopBar status={status} user={topBarUser} />
        <main className="mx-auto w-full max-w-[1400px] flex-1 px-4 pb-14 pt-6 sm:px-6 lg:px-8">
          {children}
        </main>
      </div>
    </div>
  );
}
