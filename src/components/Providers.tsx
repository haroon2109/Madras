'use client';

/**
 * App-level providers. Theme is handled purely in CSS (light design system);
 * no client theme state is needed, so this is a thin pass-through kept for
 * future context providers (auth listeners, analytics, etc.).
 */
export function Providers({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

export default Providers;
