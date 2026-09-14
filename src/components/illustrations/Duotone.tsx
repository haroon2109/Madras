/**
 * Madras duotone line-art illustration set.
 *
 * House style: 1.5px stroke line-work in the accent color over flat duotone
 * tint fills. No skeuomorphism, no gradients, no third colors — the kind of
 * illustration system that scales from a 24px glyph to a full bento cell.
 */

interface IllustrationProps {
  className?: string;
}

/** Shared duotone palette. */
export const INK = "#1A73E8";
export const TINT = "#E8F0FE";
export const TINT_SOFT = "#F4F8FE";
export const OBSIDIAN = "#202124";

/** House stroke width — every line, every illustration. */
export const STROKE = 1.5;

/** Base SVG props every illustration shares. */
const base = (className = "") => ({
  xmlns: "http://www.w3.org/2000/svg",
  fill: "none" as const,
  className,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
});

/* ------------------------------------------------------------------ */
/* Rain gauge — zone rainfall intelligence                             */
/* ------------------------------------------------------------------ */

export function RainGaugeArt({ className = "" }: IllustrationProps) {
  return (
    <svg viewBox="0 0 160 120" {...base(className)} aria-hidden="true">
      {/* rain drops above gauge */}
      <g stroke={INK} strokeWidth={STROKE} fill={TINT}>
        <path d="M26 8c2.5 3.5 4 5.5 4 7.5a4 4 0 0 1-8 0c0-2 1.5-4 4-7.5Z" />
        <path d="M42 8c2.5 3.5 4 5.5 4 7.5a4 4 0 0 1-8 0c0-2 1.5-4 4-7.5Z" />
      </g>
      {/* gauge body */}
      <rect x="14" y="22" width="40" height="86" rx="8" fill={TINT} stroke={INK} strokeWidth={STROKE} />
      {/* water fill */}
      <path d="M18 66h32v34a6 6 0 0 1-6 6H24a6 6 0 0 1-6-6V66Z" fill={INK} opacity="0.14" />
      <path d="M18 66h32" stroke={INK} strokeWidth={STROKE} />
      {/* scale ticks */}
      <path d="M22 76h10M22 86h10M22 96h10" stroke={INK} strokeWidth={STROKE} opacity="0.65" />
      <path d="M40 76h8M40 86h8M40 96h8" stroke={INK} strokeWidth={STROKE} opacity="0.35" />
      {/* rim */}
      <rect x="14" y="22" width="40" height="10" rx="5" fill="#FFFFFF" stroke={INK} strokeWidth={STROKE} />
      {/* chart card */}
      <rect x="62" y="22" width="86" height="86" rx="10" fill="#FFFFFF" stroke={INK} strokeWidth={STROKE} />
      {/* gridlines */}
      <path d="M62 46h86M62 64h86M62 82h86" stroke={INK} strokeWidth={1} opacity="0.14" />
      {/* area under trend */}
      <path d="M72 92 86 76l16 8 18-22 14 10 14-16v36H72Z" fill={INK} opacity="0.1" stroke="none" />
      {/* trend */}
      <path d="M72 92 86 76l16 8 18-22 14 10 14-16" stroke={INK} strokeWidth={2} />
      <g fill={INK} stroke="none">
        <circle cx="72" cy="92" r="3" />
        <circle cx="86" cy="76" r="3" />
        <circle cx="102" cy="84" r="3" />
        <circle cx="120" cy="62" r="3" />
        <circle cx="134" cy="72" r="3" />
        <circle cx="148" cy="56" r="3" />
      </g>
      <circle cx="120" cy="62" r="5.5" fill="none" stroke={INK} strokeWidth={STROKE} opacity="0.4" />
      {/* baseline */}
      <path d="M70 100h70" stroke={INK} strokeWidth={STROKE} opacity="0.35" />
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/* Flooded street — incident reporting                                 */
/* ------------------------------------------------------------------ */

export function FloodStreetArt({ className = "" }: IllustrationProps) {
  return (
    <svg viewBox="0 0 160 120" {...base(className)} aria-hidden="true">
      {/* sky */}
      <circle cx="132" cy="20" r="10" fill={TINT} stroke={INK} strokeWidth={STROKE} />
      <path d="M14 12h6M17 6v12" stroke={INK} strokeWidth={STROKE} opacity="0.45" />
      {/* back row buildings */}
      <g fill={TINT_SOFT} stroke={INK} strokeWidth={STROKE}>
        <rect x="10" y="28" width="28" height="44" rx="3" />
        <rect x="44" y="18" width="26" height="54" rx="3" />
        <rect x="76" y="32" width="24" height="40" rx="3" />
        <rect x="106" y="22" width="26" height="50" rx="3" />
      </g>
      {/* windows — back row */}
      <g fill={INK} stroke="none" opacity="0.28">
        <rect x="16" y="36" width="6" height="6" rx="1" />
        <rect x="26" y="36" width="6" height="6" rx="1" />
        <rect x="16" y="48" width="6" height="6" rx="1" />
        <rect x="26" y="48" width="6" height="6" rx="1" />
        <rect x="50" y="26" width="6" height="6" rx="1" />
        <rect x="58" y="26" width="6" height="6" rx="1" />
        <rect x="50" y="38" width="6" height="6" rx="1" />
        <rect x="58" y="38" width="6" height="6" rx="1" />
        <rect x="50" y="50" width="6" height="6" rx="1" />
        <rect x="58" y="50" width="6" height="6" rx="1" />
        <rect x="82" y="40" width="5" height="5" rx="1" />
        <rect x="89" y="40" width="5" height="5" rx="1" />
        <rect x="82" y="50" width="5" height="5" rx="1" />
        <rect x="89" y="50" width="5" height="5" rx="1" />
        <rect x="112" y="30" width="6" height="6" rx="1" />
        <rect x="120" y="30" width="6" height="6" rx="1" />
        <rect x="112" y="42" width="6" height="6" rx="1" />
        <rect x="120" y="42" width="6" height="6" rx="1" />
        <rect x="112" y="54" width="6" height="6" rx="1" />
        <rect x="120" y="54" width="6" height="6" rx="1" />
      </g>
      {/* street + kerb */}
      <rect x="6" y="72" width="148" height="10" rx="2" fill="#FFFFFF" stroke={INK} strokeWidth={STROKE} />
      {/* flood water */}
      <path
        d="M6 84h148v14a6 6 0 0 1-6 6H12a6 6 0 0 1-6-6V84Z"
        fill={TINT}
        stroke={INK}
        strokeWidth={STROKE}
      />
      <path
        d="M12 92c10-4 18 4 30 0s20 4 32 0 18 4 30 0 20 4 30 0"
        stroke={INK}
        strokeWidth={STROKE}
        opacity="0.7"
      />
      <path
        d="M20 99c12-3 20 3 32 0s22 3 34 0 20 3 32 0"
        stroke={INK}
        strokeWidth={1.25}
        opacity="0.35"
      />
      {/* reflections */}
      <g stroke={INK} strokeWidth={1} opacity="0.25">
        <path d="M22 74v5M54 74v4M86 74v5M118 74v5" />
      </g>
      {/* warning buoy */}
      <g>
        <rect x="132" y="78" width="10" height="16" rx="3" fill="#FFFFFF" stroke={INK} strokeWidth={STROKE} />
        <path d="M137 78v-5" stroke={INK} strokeWidth={STROKE} />
        <circle cx="137" cy="70" r="2.5" fill={INK} stroke="none" />
        <path d="M134 84h6M134 89h6" stroke={INK} strokeWidth={STROKE} />
      </g>
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/* Tide gauge — coastal backflow                                       */
/* ------------------------------------------------------------------ */

export function TideGaugeArt({ className = "" }: IllustrationProps) {
  return (
    <svg viewBox="0 0 160 120" {...base(className)} aria-hidden="true">
      {/* moon */}
      <circle cx="124" cy="26" r="13" fill={TINT} stroke={INK} strokeWidth={STROKE} />
      <circle cx="119" cy="22" r="3" fill={INK} stroke="none" opacity="0.3" />
      <circle cx="128" cy="29" r="2" fill={INK} stroke="none" opacity="0.3" />
      {/* rays */}
      <path d="M124 6v4M144 26h4M138 12l3-3" stroke={INK} strokeWidth={STROKE} opacity="0.55" />
      {/* gauge pier */}
      <rect x="14" y="18" width="32" height="74" rx="7" fill="#FFFFFF" stroke={INK} strokeWidth={STROKE} />
      <rect x="14" y="18" width="32" height="14" rx="7" fill={TINT} stroke={INK} strokeWidth={STROKE} />
      {/* scale ticks */}
      <g stroke={INK} strokeWidth={STROKE}>
        <path d="M20 44h12" opacity="0.35" />
        <path d="M20 58h12" opacity="0.35" />
        <path d="M20 72h12" opacity="0.35" />
        <path d="M20 84h16" opacity="0.9" />
      </g>
      {/* water level marker */}
      <circle cx="30" cy="84" r="4" fill={INK} stroke="none" />
      {/* waves */}
      <path
        d="M56 72c12-8 20 6 34 0s22 6 34-2"
        stroke={INK}
        strokeWidth={2}
        opacity="0.85"
      />
      <path
        d="M56 86c12-6 20 5 34 0s22 5 34-3"
        stroke={INK}
        strokeWidth={STROKE}
        opacity="0.4"
      />
      <path
        d="M56 99c12-5 20 4 34 0s22 4 34-2"
        stroke={INK}
        strokeWidth={1.25}
        opacity="0.25"
      />
      {/* baseline seabed */}
      <path d="M14 106h120" stroke={INK} strokeWidth={STROKE} opacity="0.35" />
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/* Reservoir dam — storage levels                                      */
/* ------------------------------------------------------------------ */

export function ReservoirArt({ className = "" }: IllustrationProps) {
  return (
    <svg viewBox="0 0 160 120" {...base(className)} aria-hidden="true">
      {/* sky */}
      <circle cx="126" cy="22" r="9" fill={TINT} stroke={INK} strokeWidth={STROKE} />
      <path d="M14 14h14M14 22h8" stroke={INK} strokeWidth={STROKE} opacity="0.4" />
      {/* back hill */}
      <path d="M8 62 38 30l24 20 30-26 34 24 26-12v26H8V62Z" fill={TINT_SOFT} stroke={INK} strokeWidth={STROKE} />
      {/* dam wall */}
      <path d="M18 62h124v34a6 6 0 0 1-6 6H24a6 6 0 0 1-6-6V62Z" fill="#FFFFFF" stroke={INK} strokeWidth={STROKE} />
      {/* stored water */}
      <path d="M22 74h116v22a4 4 0 0 1-4 4H26a4 4 0 0 1-4-4V74Z" fill={INK} opacity="0.12" stroke="none" />
      <path d="M22 74h116" stroke={INK} strokeWidth={STROKE} />
      {/* spillway gates */}
      <g stroke={INK} strokeWidth={STROKE}>
        <path d="M40 74v16M62 74v16M98 74v16M120 74v16" opacity="0.55" />
      </g>
      {/* outflow waves */}
      <path d="M30 94c10-3 16 3 28 0s20 3 30 0 18 3 28 0" stroke={INK} strokeWidth={STROKE} opacity="0.55" />
      {/* level flag */}
      <path d="M70 30V12" stroke={INK} strokeWidth={STROKE} />
      <path d="M70 12h16l-3 4 3 4H70" fill={TINT} stroke={INK} strokeWidth={STROKE} />
      {/* ground */}
      <path d="M8 108h144" stroke={INK} strokeWidth={STROKE} opacity="0.35" />
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/* Decision compass — prioritization                                   */
/* ------------------------------------------------------------------ */

export function CompassArt({ className = "" }: IllustrationProps) {
  return (
    <svg viewBox="0 0 160 120" {...base(className)} aria-hidden="true">
      {/* outer ring */}
      <circle cx="80" cy="60" r="44" fill={TINT_SOFT} stroke={INK} strokeWidth={STROKE} />
      {/* inner face */}
      <circle cx="80" cy="60" r="32" fill="#FFFFFF" stroke={INK} strokeWidth={STROKE} />
      {/* cardinal ticks */}
      <g stroke={INK} strokeWidth={STROKE}>
        <path d="M80 14v8" />
        <path d="M80 98v8" />
        <path d="M34 60h8" />
        <path d="M118 60h8" />
      </g>
      {/* diagonal ticks */}
      <g stroke={INK} strokeWidth={STROKE} opacity="0.35">
        <path d="M48 28l5 5M107 87l5 5M112 28l-5 5M53 87l-5 5" />
      </g>
      {/* needle — north */}
      <path d="M80 34 88 62 80 58 72 62Z" fill={INK} stroke={INK} strokeWidth={STROKE} strokeLinejoin="round" />
      {/* needle — south */}
      <path d="M80 86 87 62 80 65 73 62Z" fill="#FFFFFF" stroke={INK} strokeWidth={STROKE} strokeLinejoin="round" />
      {/* hub */}
      <circle cx="80" cy="61" r="5" fill={TINT} stroke={INK} strokeWidth={STROKE} />
      <circle cx="80" cy="61" r="1.8" fill={INK} stroke="none" />
      {/* N label */}
      <path d="M80 22v0" stroke={INK} strokeWidth={STROKE} />
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/* Map pin — zones & wards                                             */
/* ------------------------------------------------------------------ */

export function MapPinArt({ className = "" }: IllustrationProps) {
  return (
    <svg viewBox="0 0 160 120" {...base(className)} aria-hidden="true">
      {/* orbit ring */}
      <ellipse cx="80" cy="96" rx="42" ry="9" fill={TINT} stroke={INK} strokeWidth={STROKE} />
      {/* map sheet */}
      <rect x="18" y="18" width="60" height="62" rx="8" fill="#FFFFFF" stroke={INK} strokeWidth={STROKE} />
      <path d="M18 36h60M36 18v62M18 52l18-8 18 10 6-4" stroke={INK} strokeWidth={STROKE} opacity="0.55" />
      <path d="M24 64h32" stroke={INK} strokeWidth={STROKE} opacity="0.3" />
      <circle cx="52" cy="60" r="3.5" fill={INK} stroke="none" />
      {/* main pin */}
      <path
        d="M108 16c-16 0-28 12-28 28 0 21 28 44 28 44s28-23 28-44c0-16-12-28-28-28Z"
        fill={TINT_SOFT}
        stroke={INK}
        strokeWidth={2}
      />
      <circle cx="108" cy="44" r="11" fill="#FFFFFF" stroke={INK} strokeWidth={STROKE} />
      <circle cx="108" cy="44" r="4" fill={INK} stroke="none" />
      {/* small satellite pin */}
      <path
        d="M48 78c-7 0-12 5-12 12 0 9 12 18 12 18s12-9 12-18c0-7-5-12-12-12Z"
        fill={TINT}
        stroke={INK}
        strokeWidth={STROKE}
      />
      <circle cx="48" cy="90" r="4" fill="#FFFFFF" stroke={INK} strokeWidth={STROKE} />
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/* Server/analytics — model accuracy                                   */
/* ------------------------------------------------------------------ */

export function ModelCompareArt({ className = "" }: IllustrationProps) {
  return (
    <svg viewBox="0 0 160 120" {...base(className)} aria-hidden="true">
      {/* window frame */}
      <rect x="14" y="14" width="132" height="92" rx="10" fill="#FFFFFF" stroke={INK} strokeWidth={STROKE} />
      {/* title bar */}
      <path d="M14 30h132" stroke={INK} strokeWidth={STROKE} />
      <circle cx="24" cy="22" r="2.5" fill={INK} stroke="none" />
      <circle cx="32" cy="22" r="2.5" fill={INK} stroke="none" opacity="0.35" />
      {/* gridlines */}
      <g stroke={INK} strokeWidth={1} opacity="0.14">
        <path d="M14 52h132M14 70h132M14 88h132" />
      </g>
      {/* ECMWF shaded band */}
      <path d="M24 84 48 62l24 10 28-26 26 12 18-16v42H24Z" fill={INK} opacity="0.1" stroke="none" />
      {/* ECMWF line */}
      <path d="M24 84 48 62l24 10 28-26 26 12 18-16" stroke={INK} strokeWidth={2} />
      {/* GFS dashed line */}
      <path
        d="M24 90 50 74l24 6 26-20 24 10 20-12"
        stroke={INK}
        strokeWidth={STROKE}
        strokeDasharray="5 4"
        opacity="0.55"
      />
      {/* points */}
      <g fill={INK} stroke="none">
        <circle cx="48" cy="62" r="3" />
        <circle cx="100" cy="46" r="3" />
        <circle cx="148" cy="42" r="3" />
      </g>
      <g fill="#FFFFFF" stroke={INK} strokeWidth={STROKE}>
        <circle cx="50" cy="74" r="3" />
        <circle cx="100" cy="60" r="3" />
      </g>
      {/* baseline */}
      <path d="M22 98h116" stroke={INK} strokeWidth={STROKE} opacity="0.35" />
      {/* legend */}
      <rect x="26" y="36" width="14" height="4" rx="2" fill={INK} stroke="none" />
      <rect x="88" y="36" width="14" height="4" rx="2" fill="none" stroke={INK} strokeWidth={STROKE} strokeDasharray="3 2" opacity="0.7" />
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/* Monsoon calendar — season watch                                     */
/* ------------------------------------------------------------------ */

export function SeasonCalendarArt({ className = "" }: IllustrationProps) {
  return (
    <svg viewBox="0 0 160 120" {...base(className)} aria-hidden="true">
      {/* card */}
      <rect x="18" y="18" width="124" height="88" rx="10" fill="#FFFFFF" stroke={INK} strokeWidth={STROKE} />
      {/* header */}
      <path d="M18 40h124" stroke={INK} strokeWidth={STROKE} />
      <rect x="18" y="18" width="124" height="22" rx="10" fill={TINT} stroke="none" />
      <path d="M18 40h124" stroke={INK} strokeWidth={STROKE} />
      <rect x="18" y="18" width="124" height="22" rx="10" fill="none" stroke={INK} strokeWidth={STROKE} />
      {/* binders */}
      <g stroke={INK} strokeWidth={STROKE}>
        <path d="M44 18v-8M116 18v-8" />
      </g>
      <g fill="#FFFFFF" stroke={INK} strokeWidth={STROKE}>
        <circle cx="44" cy="8" r="3" />
        <circle cx="116" cy="8" r="3" />
      </g>
      {/* month dots row 1 */}
      <g fill={INK} stroke="none" opacity="0.3">
        <circle cx="34" cy="54" r="3" />
        <circle cx="48" cy="54" r="3" />
        <circle cx="62" cy="54" r="3" />
        <circle cx="76" cy="54" r="3" />
        <circle cx="90" cy="54" r="3" />
      </g>
      {/* month dots row 2 */}
      <g fill={INK} stroke="none">
        <circle cx="34" cy="70" r="3" opacity="0.3" />
        <circle cx="48" cy="70" r="3" opacity="0.3" />
        <circle cx="62" cy="70" r="3" />
        <circle cx="76" cy="70" r="3" />
        <circle cx="90" cy="70" r="3" />
      </g>
      {/* active monsoon day */}
      <circle cx="62" cy="70" r="6.5" fill="none" stroke={INK} strokeWidth={STROKE} />
      <circle cx="76" cy="70" r="6.5" fill="none" stroke={INK} strokeWidth={STROKE} opacity="0.35" />
      {/* rain badge */}
      <circle cx="118" cy="66" r="14" fill={TINT} stroke={INK} strokeWidth={STROKE} />
      <path d="M118 58c2 2.8 3.2 4.4 3.2 6a3.2 3.2 0 0 1-6.4 0c0-1.6 1.2-3.2 3.2-6Z" fill={INK} stroke="none" />
      <path d="M112 72h12" stroke={INK} strokeWidth={STROKE} />
      {/* footer line */}
      <path d="M30 90h66" stroke={INK} strokeWidth={STROKE} opacity="0.35" />
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/* Hero illustration — simple clean overview                            */
/* ------------------------------------------------------------------ */

export function SimpleCleanHeroArt({ className = "" }: IllustrationProps) {
  return (
    <svg viewBox="0 0 560 360" {...base(className)} aria-hidden="true">
      <g fill="none" stroke={INK} strokeWidth={STROKE} strokeLinecap="round" strokeLinejoin="round">
        <circle cx="450" cy="72" r="24" fill={TINT} />
        <g stroke={INK} strokeWidth={STROKE} opacity="0.5">
          <path d="M450 38v8M484 72h-8M475 46l-6 6M425 46l6 6" />
        </g>

        <g fill={TINT_SOFT}>
          <path d="M78 160c0-18 12-30 28-30 4-17 20-30 38-30 24 0 42 16 46 38 18 3 30 15 30 30 0 5-1 9-2 12H82c-1-4-4-13-4-20Z" />
          <path d="M270 154c0-14 10-26 24-26 4-13 16-21 30-21 18 0 32 12 34 28 12 2 20 10 20 22 0 3-1 6-2 8H272c-2-4-2-8-2-11Z" fill={TINT} />
        </g>

        <g stroke={INK} strokeWidth={STROKE} opacity="0.7">
          <path d="M116 178v18M136 172v24M156 180v16M308 184v20M328 178v26M348 186v18" />
        </g>

        <g fill={TINT_SOFT} stroke={INK} strokeWidth={STROKE}>
          <rect x="60" y="230" width="46" height="76" rx="4" />
          <rect x="118" y="208" width="42" height="98" rx="4" />
          <rect x="170" y="236" width="40" height="70" rx="4" />
        </g>

        <g fill={INK} opacity="0.28">
          <rect x="69" y="246" width="8" height="8" rx="1" />
          <rect x="83" y="246" width="8" height="8" rx="1" />
          <rect x="69" y="260" width="8" height="8" rx="1" />
          <rect x="83" y="260" width="8" height="8" rx="1" />
          <rect x="128" y="224" width="8" height="8" rx="1" />
          <rect x="140" y="224" width="8" height="8" rx="1" />
          <rect x="128" y="238" width="8" height="8" rx="1" />
          <rect x="140" y="238" width="8" height="8" rx="1" />
          <rect x="178" y="252" width="8" height="8" rx="1" />
          <rect x="190" y="252" width="8" height="8" rx="1" />
        </g>

        <g>
          <rect x="257" y="210" width="200" height="96" rx="12" fill="#FFFFFF" stroke={INK} strokeWidth={STROKE} />
          <g stroke={INK} strokeWidth={1} opacity="0.14">
            <path d="M257 234h200M257 258h200M257 282h200" />
          </g>
          <path d="M272 286 300 260l28 16 32-42 34 22 28-34 18 14" fill="none" stroke={INK} strokeWidth={2} />
          <path d="M272 286 300 260l28 16 32-42 34 22 28-34 18 14v34H272Z" fill={INK} opacity="0.08" />
          <g fill={INK}>
            <circle cx="300" cy="260" r="4" />
            <circle cx="360" cy="234" r="4" />
            <circle cx="415" cy="228" r="4" />
          </g>
          <path d="M272 294h168" stroke={INK} strokeWidth={STROKE} opacity="0.35" />
        </g>

        <g>
          <rect x="472" y="236" width="28" height="70" rx="7" fill="#FFFFFF" stroke={INK} strokeWidth={STROKE} />
          <rect x="472" y="236" width="28" height="14" rx="7" fill={TINT} stroke={INK} strokeWidth={STROKE} />
          <path d="M478 264h16M478 278h16M478 292h16" stroke={INK} strokeWidth={STROKE} opacity="0.7" />
          <circle cx="486" cy="292" r="3.5" fill={INK} />
        </g>

        <path d="M58 316c48-16 96 8 150-4 42-10 70 4 100-2 34-7 66 0 104-6 30-5 62 4 98-4" stroke={INK} strokeWidth={STROKE} opacity="0.8" fill="none" />
        <path d="M72 332c52-12 92 8 146-4 38-8 72 4 100-2 38-8 52 4 92-2 30-4 52 0 96-2" stroke={INK} strokeWidth={STROKE} opacity="0.35" fill="none" />
      </g>
    </svg>
  );
}

export function HeroLineArt({ className = "" }: IllustrationProps) {
  return <SimpleCleanHeroArt className={className} />;
}
