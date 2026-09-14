import Link from 'next/link';
import { ArrowRight, Shield } from 'lucide-react';
import { TOTAL_WARD_COUNT } from '@/lib/wards';
import { BrandMark } from '@/components/auth/BrandMark';
import {
  RainGaugeArt,
  FloodStreetArt,
  TideGaugeArt,
  ReservoirArt,
  CompassArt,
  MapPinArt,
  ModelCompareArt,
  HeroLineArt,
} from '@/components/illustrations/Duotone';
import { ReactiveArt } from '@/components/motion/ReactiveArt';

export const metadata = {
  title: 'Madras — Chennai Rainfall Forecasting & Flood Decision Support',
  description:
    'Real-time zone-wise rainfall forecasts, flood-risk alerts, and decision support for Greater Chennai. Built on open data from Open-Meteo (ECMWF & GFS models).',
};

const bentoCells = [
  {
    title: 'Rainfall intelligence',
    description:
      '24-hour precipitation forecasts for all 15 zones, scored against configurable watch, warning and alert thresholds.',
    Art: RainGaugeArt,
    span: 'lg:col-span-2 lg:row-span-1',
    cta: { label: 'Check your zone', href: '/weather' },
  },
  {
    title: `${TOTAL_WARD_COUNT} wards, 15 zones`,
    description:
      'Every ward of Greater Chennai grouped into the 15 GCC administrative zones, on one interactive map.',
    Art: MapPinArt,
    span: '',
    cta: { label: 'Open dashboard', href: '/dashboard' },
  },
  {
    title: 'Waterlogging reports',
    description:
      'Field-team flood reports verified and tracked per zone, rendered live on the map.',
    Art: FloodStreetArt,
    span: '',
  },
  {
    title: 'Tide & backflow risk',
    description:
      'Astronomical tide estimates flag coastal zones where storm drains cannot discharge.',
    Art: TideGaugeArt,
    span: '',
  },
  {
    title: 'Reservoir storage',
    description:
      'Combined levels across Poondi, Cholavaram, Red Hills, Chembarambakkam and Veeranam.',
    Art: ReservoirArt,
    span: '',
  },
  {
    title: 'Model accuracy scorecard',
    description:
      'ECMWF vs GFS forecasts scored against stored observations — MAE, bias and rain hit-rate, per zone.',
    Art: ModelCompareArt,
    span: 'hidden lg:block',
  },
  {
    title: 'Decision support',
    description:
      'Chronic vulnerability combined with forecast risk ranks which zone needs crews, pumps and closures first.',
    Art: CompassArt,
    span: 'lg:col-span-2',
    cta: { label: 'See decisions', href: '/decisions' },
  },
];

const stats = [
  { label: 'Zones monitored', value: '15' },
  { label: 'Wards covered', value: `${TOTAL_WARD_COUNT}` },
  { label: 'Forecast refresh', value: '3h' },
  { label: 'Weather models', value: '2' },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white">
      <header className="sticky top-0 z-40 border-b border-[#EDF0F2] bg-white/78 backdrop-blur-[8px]">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-2.5">
            <BrandMark className="h-9 w-9" />
            <span className="text-lg font-semibold tracking-tight text-[#202124]">Madras</span>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/weather" className="rounded-full px-4 py-2 text-sm font-medium text-[#5F6368] transition-colors duration-200 hover:bg-[#F1F3F4] hover:text-[#202124]">
              Public weather
            </Link>
            <Link href="/login" className="hidden rounded-full border border-[#DADCE0] bg-white px-5 py-2.5 text-sm font-medium text-[#202124] transition-all duration-200 hover:border-[#BDC1C6] hover:shadow-[0_4px_24px_rgba(0,0,0,0.06)] sm:block">
              Staff sign in
            </Link>
          </div>
        </div>
      </header>

      <section className="relative mx-auto max-w-6xl px-4 pb-16 pt-20 sm:px-6 sm:pt-28 lg:px-8">
        <div className="grid items-center gap-12 lg:grid-cols-2">
          <div className="stagger-group">
            <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-[#DADCE0] bg-white px-4 py-2 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
              <span className="h-2 w-2 animate-pulse-soft rounded-full bg-[#188038]" />
              <span className="text-sm font-medium text-[#5F6368]">Live from Open-Meteo · refreshed every 3 hours</span>
            </div>
            <h1 className="text-display max-w-xl text-[#202124]">Rainfall foresight for Chennai</h1>
            <p className="mt-6 max-w-lg text-lg leading-relaxed text-[#5F6368]">
              Zone-wise forecasts, flood-risk alerts and decision support for Greater Chennai&apos;s {TOTAL_WARD_COUNT} wards — built entirely on open data, free for the public.
            </p>
            <div className="mt-10 flex flex-col gap-3 sm:flex-row">
              <Link href="/weather" className="inline-flex items-center justify-center gap-2 rounded-full bg-[#1A73E8] px-7 py-3.5 text-base font-medium text-white shadow-[0_1px_2px_rgba(0,0,0,0.04)] transition-all duration-200 hover:-translate-y-px hover:bg-[#1765CC] hover:shadow-[0_4px_24px_rgba(26,115,232,0.25)]">
                Check your zone <ArrowRight size={18} />
              </Link>
              <Link href="/login" className="inline-flex items-center justify-center gap-2 rounded-full border border-[#DADCE0] bg-white px-7 py-3.5 text-base font-medium text-[#202124] transition-all duration-200 hover:-translate-y-px hover:border-[#BDC1C6] hover:shadow-[0_4px_24px_rgba(0,0,0,0.06)]">
                <Shield size={17} className="text-[#1A73E8]" aria-hidden="true" /> Staff sign in
              </Link>
            </div>
            <p className="mt-4 text-[13px] text-[#80868B]">Free for the public — no account needed. Staff sign in for operations tools (incidents, reports, admin).</p>
            <dl className="mt-14 grid grid-cols-2 gap-x-6 gap-y-8 border-t border-[#EDF0F2] pt-8 sm:grid-cols-4">
              {stats.map((stat) => (
                <div key={stat.label}>
                  <dd className="text-3xl font-semibold tabular-nums tracking-tight text-[#202124]">{stat.value}</dd>
                  <dt className="mt-1 text-[13px] font-medium text-[#80868B]">{stat.label}</dt>
                </div>
              ))}
            </dl>
          </div>
          <div className="relative hidden justify-self-center lg:block">
            <div aria-hidden="true" className="absolute inset-0 -z-10 scale-90 rounded-[28px] bg-[#F8F9FA]" />
            <ReactiveArt tilt={7} scale={1.02} label="Illustration of rainfall over the Chennai coastline with a live gauge">
              <HeroLineArt className="w-[520px] max-w-full" />
            </ReactiveArt>
          </div>
        </div>
      </section>

      <section id="features" className="border-t border-[#EDF0F2] bg-[#F8F9FA] py-24">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto mb-14 max-w-2xl text-center">
            <h2 className="text-3xl font-semibold tracking-tight text-[#202124] sm:text-4xl">One platform, the whole monsoon</h2>
            <p className="mt-4 text-lg text-[#5F6368]">Everything Chennai&apos;s emergency operations and citizens need — nothing invented, nothing hidden.</p>
          </div>
          <div className="stagger-group grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {bentoCells.map(({ title, description, Art, span, cta }) => (
              <div key={title} className={`bento-cell bento-cell--interactive group flex flex-col p-6 ${span}`}>
                <div className="flex flex-1 items-start justify-between gap-4">
                  <div className="min-w-0">
                    <h3 className="text-lg font-semibold text-[#202124]">{title}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-[#5F6368]">{description}</p>
                  </div>
                  <ReactiveArt tilt={5} scale={1.05} className="shrink-0 overflow-hidden rounded-xl">
                    <Art className="h-20 w-28" />
                  </ReactiveArt>
                </div>
                {cta && <Link href={cta.href} className="mt-5 inline-flex items-center gap-1.5 text-sm font-medium text-[#1A73E8] transition-colors duration-200 hover:text-[#1765CC]">{cta.label}<ArrowRight size={15} className="transition-transform duration-200 group-hover:translate-x-0.5" /></Link>}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-t border-[#EDF0F2] py-24">
        <div className="mx-auto max-w-4xl px-4 text-center sm:px-6 lg:px-8">
          <h2 className="text-3xl font-semibold tracking-tight text-[#202124]">Open data, stated plainly</h2>
          <div className="mt-12 grid gap-5 text-left sm:grid-cols-3">
            {[
              { title: 'Rainfall & forecasts', body: 'Every value comes from the Open-Meteo API (ECMWF IFS and NOAA GFS) — never fabricated, never interpolated.' },
              { title: 'Tides', body: 'Tide times are labelled as astronomical estimates, overridden by official harbour readings when staff enter them.' },
              { title: 'Reservoirs & incidents', body: 'Storage and waterlogging data appear only when entered by staff — the UI shows pending states, not placeholder numbers.' },
            ].map((item) => (
              <div key={item.title} className="rounded-2xl bg-[#F8F9FA] p-6">
                <h3 className="text-sm font-semibold uppercase tracking-wide text-[#1A73E8]">{item.title}</h3>
                <p className="mt-3 text-sm leading-relaxed text-[#5F6368]">{item.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-t border-[#EDF0F2] bg-[#F8F9FA] py-24">
        <div className="mx-auto max-w-3xl px-4 text-center sm:px-6 lg:px-8">
          <h2 className="text-3xl font-semibold tracking-tight text-[#202124] sm:text-4xl">Ready before the next northeast monsoon</h2>
          <p className="mx-auto mt-4 max-w-xl text-lg text-[#5F6368]">Check your zone&apos;s forecast now, or sign in for the full operations dashboard.</p>
          <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link href="/weather" className="inline-flex items-center gap-2 rounded-full bg-[#1A73E8] px-7 py-3.5 text-base font-medium text-white transition-all duration-200 hover:-translate-y-px hover:bg-[#1765CC] hover:shadow-[0_4px_24px_rgba(26,115,232,0.25)]">Check your zone <ArrowRight size={18} /></Link>
            <Link href="/login" className="inline-flex items-center gap-2 rounded-full border border-[#DADCE0] bg-white px-7 py-3.5 text-base font-medium text-[#202124] transition-all duration-200 hover:-translate-y-px hover:border-[#BDC1C6] hover:shadow-[0_4px_24px_rgba(0,0,0,0.06)]"><Shield size={17} className="text-[#1A73E8]" aria-hidden="true" /> Staff sign in</Link>
          </div>
        </div>
      </section>

      <footer className="border-t border-[#EDF0F2] py-10">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-4 sm:flex-row sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <BrandMark className="h-9 w-9" />
            <div>
              <p className="text-sm font-semibold text-[#202124]">Madras</p>
              <p className="text-xs text-[#80868B]">Open data · Open-Meteo (ECMWF &amp; GFS) · GCC zone numbering</p>
            </div>
          </div>
          <p className="text-xs text-[#80868B]">For awareness and preparedness. In an emergency, call 100 / 108 / 1913.</p>
        </div>
      </footer>
    </div>
  );
}
