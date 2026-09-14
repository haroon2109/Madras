import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import type { ReactNode } from "react";
import { BrandMark } from "@/components/auth/BrandMark";

/**
 * Shared split layout for the auth screens (login / signup / forgot-password).
 * Left: observation-deck illustration + brand message that links back to the
 * landing page. Right: centered card holding the supplied form content.
 *
 * Clip-safe layout model (works at any zoom level / viewport height):
 * - The root is in natural document flow (`min-h-screen`, never `fixed`,
 *   never `overflow-hidden`). When the card is taller than the viewport the
 *   PAGE itself scrolls, so the topmost ("Back to home", logo) and bottommost
 *   ("Sign up") elements are always reachable — the old `fixed` +
 *   `justify-center` + `overflow-y-auto` combination clipped them.
 * - The left panel is `sticky` + `h-screen`: it always fills the viewport
 *   while the right column scrolls past it.
 * - The MADRAS wordmark is real HTML text overlaying the artwork (the SVG
 *   scene is bottom-anchored and only ever crops empty sky), so the brand
 *   can never be clipped by the illustration.
 */
export function AuthSplitLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen w-full flex-col bg-white md:flex-row">
      {/* Left Panel: illustration + brand message */}
      <aside className="relative hidden overflow-hidden bg-[#6FCBEF] md:sticky md:top-0 md:block md:h-screen md:w-[45%] lg:w-[48%]">
        <div className="pointer-events-none absolute inset-0" />

        {/* Wordmark — plain text treatment */}
        <div className="pointer-events-none absolute inset-x-0 top-[6vh] z-10 flex flex-col items-center text-center">
          <span className="text-[44px] font-extrabold leading-none tracking-[0.14em] text-white lg:text-[56px] xl:text-[64px]">
            MADRAS
          </span>
          <span className="mt-3 text-[13px] font-semibold tracking-[0.42em] text-[#E4F7FF] lg:text-sm">
            WEATHER INTELLIGENCE
          </span>
        </div>

        <div className="pointer-events-none absolute inset-x-0 top-[24vh] z-10 px-[11%]">
          <h2 className="text-3xl font-bold leading-[1.18] text-[#202124] lg:text-4xl xl:text-5xl">
            Smarter data.
            <br />
            Safer communities.
          </h2>
          <p className="mt-5 max-w-md text-base leading-relaxed text-[#202124]/80 lg:mt-6 lg:text-lg xl:text-xl">
            Real-time rainfall insights for a resilient and prepared Chennai.
          </p>
        </div>

        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-40">
          <svg viewBox="0 0 500 160" preserveAspectRatio="none" className="h-full w-full">
            <path d="M0,160 L500,160 L500,60 Q390,132 290,64 T90,76 T0,96 Z" fill="#DBEEFF" opacity="0.55" />
            <path d="M0,160 L500,160 L500,100 Q390,164 290,110 T90,118 T0,132 Z" fill="#B7D9F7" opacity="0.35" />
            <path d="M0,160 L500,160 L500,150 Q440,130 380,150 T260,156 T140,148 T0,156 Z" fill="#F8F9FA" />
          </svg>
        </div>
      </aside>

      {/* Right Panel: auth card (natural flow — grows and scrolls with the page) */}
      <main className="relative flex flex-1 flex-col bg-[#F8F9FA] md:bg-white">
        <div className="mx-auto flex w-full max-w-[560px] flex-1 flex-col justify-center px-6 py-10 md:px-8 md:py-12 lg:py-14">
          <div className="animate-card-in mx-auto w-full max-w-[440px]">
            {/* Back to landing */}
            <Link
              href="/"
              className="mb-8 inline-flex items-center gap-2 text-sm font-semibold text-[#5F6368] transition-colors hover:text-[#202124]"
            >
              <ArrowLeft size={16} className="text-[#1A73E8]" />
              Back to home
            </Link>

            {/* Brand (logo links back to the landing page) */}
            <div className="mb-8 flex flex-col items-center text-center">
              <Link href="/" aria-label="Madras home" className="animate-logo-enter mb-4">
                <BrandMark className="h-16 w-16" />
              </Link>
              <h1 className="text-2xl font-bold text-[#202124]">Madras</h1>
              <p className="mt-1 text-sm font-medium text-[#5F6368]">Smarter Forecasts. Safer Chennai.</p>
            </div>

            {/* Card */}
            <div className="rounded-[32px] border border-[#DADCE0] bg-white p-8 shadow-xl shadow-blue-900/[0.06] md:p-10">
              {children}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}