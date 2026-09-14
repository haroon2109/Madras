import RefreshButton from "@/components/RefreshButton";
import HeroIllustration from "./HeroIllustration";

function greeting(): string {
  const hour = new Intl.DateTimeFormat("en-GB", {
    hour: "numeric",
    hour12: false,
    timeZone: "Asia/Kolkata",
  }).format(new Date());
  const h = Number(hour) % 24;
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

function formatUpdated(lastUpdated: Date | null): string {
  if (!lastUpdated) return "Forecast data not yet available";
  return `Last updated ${new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Kolkata",
  }).format(lastUpdated)} (IST)`;
}

export default function HeroBanner({
  userName,
  lastUpdated,
}: {
  userName: string;
  lastUpdated: Date | null;
}) {
  const firstName = userName.trim().split(" ")[0] || userName;

  return (
    <section
      aria-label="City rainfall overview"
      className="animate-hero-in relative overflow-hidden rounded-[28px] border border-[#DADCE0] bg-gradient-to-br from-[#EDF6FF] via-[#F8F9FA] to-white shadow-[0_1px_2px_rgba(16,42,86,0.04)]"
    >
      {/* Soft background glows */}
      <div className="pointer-events-none absolute -left-20 -top-24 h-80 w-80 rounded-full bg-[#1A73E8]/10 blur-3xl" />
      <div className="pointer-events-none absolute bottom-0 right-40 h-64 w-64 rounded-full bg-[#1A73E8]/5 blur-3xl" />

      <div className="relative z-10 px-7 pb-8 pt-8 sm:px-10 lg:pb-12 lg:pl-12 lg:pr-0 lg:pt-11">
        <div className="max-w-xl">
          <span className="inline-flex items-center gap-2 rounded-full border border-[#BCD9F5] bg-white/80 px-3.5 py-1.5 text-[11px] font-bold uppercase tracking-[0.14em] text-[#1A73E8] shadow-sm">
            <span className="relative flex h-2 w-2" aria-hidden="true">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#1A73E8] opacity-60" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-[#1A73E8]" />
            </span>
            Chennai urban rainfall monitoring
          </span>

          <h1 className="mt-5 text-[30px] font-extrabold leading-[1.12] tracking-tight text-[#202124] sm:text-[38px] lg:text-[42px]">
            {greeting()},
            <br />
            <span className="text-[#1A73E8]">{firstName}</span>
          </h1>

          <p className="mt-4 max-w-md text-[15px] font-medium leading-relaxed text-[#5F6368]">
            Here&apos;s the latest rainfall forecast and city-wide overview for Chennai.
          </p>

          <p className="mt-5 flex items-center gap-2 text-[13px] font-semibold text-[#5F6368]">
            <span className="relative flex h-2 w-2" aria-hidden="true">
              <span
                className={`absolute inline-flex h-full w-full rounded-full opacity-60 ${
                  lastUpdated ? "animate-ping bg-emerald-400" : "bg-amber-400"
                }`}
              />
              <span
                className={`relative inline-flex h-2 w-2 rounded-full ${lastUpdated ? "bg-emerald-500" : "bg-amber-500"}`}
              />
            </span>
            {formatUpdated(lastUpdated)}
          </p>
        </div>
      </div>

      {/* Refresh — top right on large screens */}
      <div className="absolute right-6 top-6 z-10 hidden sm:block">
        <RefreshButton label="Refresh forecast" />
      </div>

      {/* Illustration — right side on desktop */}
      <div className="pointer-events-none absolute inset-y-0 right-0 hidden w-[46%] lg:block">
        <HeroIllustration className="h-full w-full" />
      </div>

      {/* Compact illustration on mobile/tablet */}
      <div className="relative z-0 h-44 w-full sm:h-52 lg:hidden">
        <HeroIllustration className="h-full w-full" />
      </div>
    </section>
  );
}