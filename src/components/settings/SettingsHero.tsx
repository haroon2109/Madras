/**
 * Compact coastal hero illustration for the Settings page.
 * Original inline SVG: Marina-style shoreline, city skyline, palms,
 * light rain — calm civic palette, no stock assets.
 */
function CoastalIllustration({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 560 220" fill="none" className={className} role="img" aria-label="Chennai coastline illustration">
      <defs>
        <linearGradient id="set-sky" x1="0" y1="0" x2="0" y2="220" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#D8ECFF" />
          <stop offset="70%" stopColor="#EEF7FF" />
          <stop offset="100%" stopColor="#F8F9FA" />
        </linearGradient>
        <linearGradient id="set-sea" x1="0" y1="0" x2="0" y2="60" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#7CC4E8" />
          <stop offset="100%" stopColor="#BFE6F7" />
        </linearGradient>
      </defs>

      <rect width="560" height="220" fill="url(#set-sky)" />

      {/* sun glow */}
      <circle cx="120" cy="52" r="26" fill="#FFF7DC" opacity="0.9" />
      <circle cx="120" cy="52" r="38" fill="#FFF7DC" opacity="0.35" />

      {/* clouds */}
      <g fill="#FFFFFF" opacity="0.95">
        <ellipse cx="250" cy="42" rx="34" ry="12" />
        <ellipse cx="278" cy="36" rx="24" ry="11" />
        <ellipse cx="228" cy="37" rx="18" ry="9" />
        <ellipse cx="420" cy="30" rx="28" ry="10" />
        <ellipse cx="442" cy="25" rx="18" ry="8" />
      </g>

      {/* distant skyline */}
      <g fill="#B9D4EC">
        <rect x="300" y="78" width="18" height="42" rx="2" />
        <rect x="322" y="68" width="22" height="52" rx="2" />
        <rect x="348" y="82" width="14" height="38" rx="2" />
        <rect x="366" y="72" width="20" height="48" rx="2" />
        <rect x="390" y="84" width="16" height="36" rx="2" />
      </g>
      {/* lighthouse tower */}
      <g>
        <rect x="472" y="56" width="16" height="64" rx="2" fill="#C96A5A" />
        <rect x="472" y="66" width="16" height="7" fill="#FFFFFF" opacity="0.9" />
        <rect x="472" y="84" width="16" height="7" fill="#FFFFFF" opacity="0.9" />
        <rect x="472" y="102" width="16" height="7" fill="#FFFFFF" opacity="0.9" />
        <rect x="468" y="48" width="24" height="10" rx="2" fill="#8A4A3E" />
      </g>
      {/* greenery base */}
      <path d="M280 122 Q360 108 430 118 L470 122 L470 132 L280 132 Z" fill="#9CCB9E" />
      <path d="M0 128 Q120 112 260 124 L260 134 L0 134 Z" fill="#9CCB9E" opacity="0.7" />

      {/* sea */}
      <path d="M0 134 Q140 124 280 134 Q420 144 560 130 L560 178 Q420 190 280 180 Q140 170 0 182 Z" fill="url(#set-sea)" />
      {/* wave lines */}
      <g stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" opacity="0.7">
        <path d="M60 156 q10 -6 20 0 t20 0" />
        <path d="M200 164 q10 -6 20 0 t20 0" />
        <path d="M350 158 q10 -6 20 0 t20 0" />
      </g>
      {/* sand */}
      <path d="M0 182 Q140 172 280 182 Q420 192 560 178 L560 220 L0 220 Z" fill="#F3E6C8" />
      <path d="M0 182 Q140 172 280 182 Q420 192 560 178" stroke="#E3D3AC" strokeWidth="2" fill="none" />

      {/* palms */}
      <g strokeLinecap="round">
        <path d="M500 200 Q502 186 500 176" stroke="#7A5C3E" strokeWidth="4" />
        <g stroke="#4E9B6A" strokeWidth="4">
          <path d="M500 176 q-14 -8 -26 -4" />
          <path d="M500 176 q14 -8 26 -4" />
          <path d="M500 176 q-4 -14 -14 -18" />
          <path d="M500 176 q4 -14 14 -18" />
        </g>
        <path d="M36 206 Q38 194 36 186" stroke="#7A5C3E" strokeWidth="4" />
        <g stroke="#4E9B6A" strokeWidth="4">
          <path d="M36 186 q-12 -7 -22 -4" />
          <path d="M36 186 q12 -7 22 -4" />
          <path d="M36 186 q-3 -12 -12 -15" />
        </g>
      </g>

      {/* light rain */}
      <g stroke="#5AA4C8" strokeWidth="1.6" strokeLinecap="round" opacity="0.45">
        <path d="M170 60 l-6 12" />
        <path d="M190 52 l-6 12" />
        <path d="M210 62 l-6 12" />
        <path d="M250 56 l-6 12" />
        <path d="M330 48 l-6 12" />
        <path d="M350 58 l-6 12" />
      </g>
    </svg>
  );
}

export function SettingsHero() {
  return (
    <section
      aria-label="Settings overview"
      className="animate-hero-in relative overflow-hidden rounded-[24px] border border-[#DADCE0] bg-gradient-to-br from-[#EDF6FF] via-[#F8F9FA] to-white shadow-[0_1px_2px_rgba(16,42,86,0.04)]"
    >
      <div className="pointer-events-none absolute -left-16 -top-20 h-64 w-64 rounded-full bg-[#1A73E8]/10 blur-3xl" />
      <div className="relative z-10 grid items-center gap-2 px-6 py-7 sm:px-8 lg:grid-cols-[1fr_1.1fr] lg:py-5 lg:pl-10 lg:pr-0">
        <div className="py-1">
          <p className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-[#1A73E8]">Settings</p>
          <h1 className="mt-2 text-[26px] font-extrabold leading-tight tracking-tight text-[#202124] sm:text-[32px]">
            Account &amp; System Settings
          </h1>
          <p className="mt-2.5 max-w-md text-sm font-medium leading-relaxed text-[#5F6368]">
            Manage your profile, notifications and application preferences for a better experience.
          </p>
        </div>
        <div className="pointer-events-none relative -mb-2 hidden lg:block" aria-hidden="true">
          <CoastalIllustration className="h-auto w-full" />
        </div>
        <div className="pointer-events-none -mx-1 lg:hidden" aria-hidden="true">
          <CoastalIllustration className="h-32 w-full rounded-xl object-cover" />
        </div>
      </div>
    </section>
  );
}
