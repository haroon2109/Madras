type LoginIllustrationVariant = "panel" | "banner";

/**
 * The Chennai coastline scene, drawn once and reused by both variants.
 * All essential content (skyline, sea, boat, beach, lighthouse, palm,
 * umbrella) lives in the lower part of the viewBox so the panel variant
 * can safely crop empty sky from the top without ever cutting the scene.
 * `uid` namespaces gradient/clip ids so panel + banner can coexist.
 */
function Scene({ uid }: { uid: string }) {
  const sky = `${uid}-sky`;
  const sea = `${uid}-sea`;
  const sand = `${uid}-sand`;
  const tower = `${uid}-tower`;

  return (
    <>
      <defs>
        <linearGradient id={sky} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#6FCBEF" />
          <stop offset="0.45" stopColor="#BEEBFB" />
          <stop offset="1" stopColor="#EAF8FD" />
        </linearGradient>
        <linearGradient id={sea} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#2FA9D6" />
          <stop offset="1" stopColor="#1A73E8" />
        </linearGradient>
        <linearGradient id={sand} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#F6E3B8" />
          <stop offset="1" stopColor="#EFD194" />
        </linearGradient>
        <clipPath id={tower}>
          <path d="M676 570 L704 570 L720 880 L660 880 Z" />
        </clipPath>
      </defs>

      <rect width="900" height="1150" fill={`url(#${sky})`} />

      {/* sun */}
      <circle cx="450" cy="445" r="130" fill="#FFE9A8" opacity="0.5" />
      <circle cx="450" cy="445" r="78" fill="#FFD866" />

      {/* clouds */}
      <g fill="#FFFFFF" opacity="0.7" className="animate-cloud-drift">
        <ellipse cx="140" cy="382" rx="36" ry="14" />
        <ellipse cx="762" cy="396" rx="34" ry="13" />
      </g>
      <g fill="#FFFFFF" opacity="0.92" className="animate-cloud-drift-fast">
        <ellipse cx="216" cy="330" rx="44" ry="18" />
        <ellipse cx="254" cy="320" rx="32" ry="15" />
        <ellipse cx="664" cy="316" rx="42" ry="17" />
        <ellipse cx="702" cy="306" rx="30" ry="14" />
      </g>

      {/* birds */}
      <g stroke="#47617E" strokeWidth="4" fill="none" strokeLinecap="round" className="animate-float">
        <path d="M320 450 q10 -12 20 0 q10 -12 20 0" />
        <path d="M560 478 q9 -11 18 0 q9 -11 18 0" />
      </g>

      {/* skyline */}
      <g fill="#9ED2EA" opacity="0.85">
        <rect x="60" y="590" width="60" height="100" />
        <rect x="140" y="570" width="44" height="120" />
        <rect x="200" y="606" width="70" height="84" />
        <rect x="290" y="582" width="50" height="108" />
        <rect x="360" y="602" width="64" height="88" />
        <rect x="445" y="578" width="46" height="112" />
        <rect x="510" y="600" width="72" height="90" />
        <rect x="600" y="585" width="44" height="105" />
        <rect x="660" y="606" width="66" height="84" />
        <rect x="745" y="590" width="52" height="100" />
        <rect x="815" y="610" width="60" height="80" />
      </g>

      {/* sea */}
      <rect x="0" y="690" width="900" height="122" fill={`url(#${sea})`} />
      <rect x="0" y="688" width="900" height="3" fill="#FFFFFF" opacity="0.5" />
      <g stroke="#FFFFFF" strokeWidth="5" fill="none" strokeLinecap="round" opacity="0.45">
        <path d="M30 734 q36 -14 72 0 t72 0 t72 0 t72 0 t72 0 t72 0 t72 0 t72 0 t72 0 t72 0 t72 0 t72 0" />
        <path d="M0 772 q42 -12 84 0 t84 0 t84 0 t84 0 t84 0 t84 0 t84 0 t84 0 t84 0 t84 0 t84 0" />
      </g>

      {/* boat */}
      <g>
        <line x1="292" y1="696" x2="292" y2="740" stroke="#14476E" strokeWidth="4" />
        <polygon points="296,696 296,734 332,734" fill="#FFFFFF" />
        <path d="M266 740 L322 740 L312 758 L276 758 Z" fill="#14476E" />
      </g>

      {/* beach */}
      <rect x="0" y="812" width="900" height="338" fill={`url(#${sand})`} />
      <path d="M0 812 L900 812 L900 834 Q600 850 300 840 T0 836 Z" fill="#E4C48E" opacity="0.8" />
      <path
        d="M0 814 q56 -10 112 0 t112 0 t112 0 t112 0 t112 0 t112 0 t112 0 t112 0"
        stroke="#FFFFFF"
        strokeWidth="6"
        fill="none"
        strokeLinecap="round"
        opacity="0.85"
      />

      {/* lighthouse */}
      <polygon points="690,556 520,478 520,542" fill="#FFF7D6" opacity="0.5" />
      <g>
        <path d="M676 570 L704 570 L720 880 L660 880 Z" fill="#FFFFFF" />
        <g clipPath={`url(#${tower})`}>
          <rect x="640" y="570" width="100" height="45" fill="#F0532F" />
          <rect x="640" y="660" width="100" height="45" fill="#F0532F" />
          <rect x="640" y="750" width="100" height="45" fill="#F0532F" />
          <rect x="640" y="840" width="100" height="50" fill="#F0532F" />
        </g>
        <rect x="662" y="554" width="56" height="14" rx="6" fill="#14506B" />
        <rect x="672" y="524" width="36" height="32" rx="4" fill="#DFF4FF" stroke="#14506B" strokeWidth="4" />
        <path d="M668 524 Q690 498 712 524 Z" fill="#F0532F" />
        <line x1="690" y1="500" x2="690" y2="486" stroke="#14506B" strokeWidth="4" />
        <circle cx="690" cy="482" r="6" fill="#14506B" />
        <rect x="680" y="832" width="24" height="48" rx="12" fill="#14506B" />
        <rect x="646" y="876" width="88" height="18" rx="8" fill="#D9B87E" />
        <ellipse cx="690" cy="902" rx="80" ry="11" fill="#C9A96C" opacity="0.45" />
      </g>

      {/* palm */}
      <g>
        <path
          d="M180 1080 C200 995 190 940 214 872"
          stroke="#8A5A2B"
          strokeWidth="14"
          fill="none"
          strokeLinecap="round"
        />
        <g stroke="#14996B" strokeWidth="10" fill="none" strokeLinecap="round">
          <path d="M214 870 q-56 -28 -104 -8" />
          <path d="M214 870 q-44 -48 -92 -54" />
          <path d="M214 870 q6 -54 52 -70" />
          <path d="M214 870 q58 -24 100 6" />
          <path d="M214 870 q48 8 80 44" />
          <path d="M214 870 q-16 38 -54 50" />
        </g>
        <circle cx="208" cy="878" r="8" fill="#6B4A22" />
        <circle cx="222" cy="880" r="8" fill="#6B4A22" />
        <ellipse cx="196" cy="1088" rx="66" ry="10" fill="#C9A96C" opacity="0.4" />
      </g>

      {/* umbrella */}
      <g>
        <line x1="430" y1="1010" x2="430" y2="1086" stroke="#4A5A6E" strokeWidth="6" />
        <path d="M356 1012 Q430 926 504 1012 Z" fill="#FF6B5B" />
        <path d="M393 1012 Q430 966 430 1012 Z" fill="#FFFFFF" opacity="0.85" />
        <ellipse cx="432" cy="1092" rx="56" ry="9" fill="#C9A96C" opacity="0.4" />
      </g>

      {/* foam dots */}
      <g fill="#FFFFFF" opacity="0.7">
        <circle cx="700" cy="822" r="5" />
        <circle cx="726" cy="826" r="4" />
        <circle cx="748" cy="821" r="3" />
      </g>
    </>
  );
}

/**
 * Login illustration.
 *
 * - `panel` (desktop split-screen): the SVG is anchored to the BOTTOM of the
 *   container and sized by width, so it can only ever overflow empty sky at
 *   the top (hidden by the container). The scene composition — skyline, sea,
 *   beach, lighthouse, palm — is never cropped, and the container's solid
 *   sky-top colour (#6FCBEF, identical to the gradient's first stop) makes
 *   any letterboxed gap seamless. No `object-cover` centre-cropping that
 *   used to decapitate the artwork.
 * - `banner` (mobile header): centre-cropped wide slice of the same scene.
 */
export function LoginIllustration({
  className = "absolute inset-0",
  variant = "panel",
}: {
  className?: string;
  variant?: LoginIllustrationVariant;
}) {
  const ariaLabel = "Stylised Chennai coastline with a lighthouse, palm trees and the Bay of Bengal";

  if (variant === "banner") {
    return (
      <div className={`relative overflow-hidden bg-[#6FCBEF] ${className}`}>
        <svg
          viewBox="0 300 900 700"
          preserveAspectRatio="xMidYMid slice"
          className="absolute inset-0 h-full w-full"
          role="img"
          aria-label={ariaLabel}
        >
          <Scene uid="banner" />
        </svg>
      </div>
    );
  }

  return (
    <div className={`relative overflow-hidden bg-[#6FCBEF] ${className}`}>
      <svg
        viewBox="0 0 900 1150"
        width={900}
        height={1150}
        preserveAspectRatio="xMidYMax meet"
        className="absolute bottom-0 left-0 block h-auto w-full"
        role="img"
        aria-label={ariaLabel}
      >
        <Scene uid="panel" />
      </svg>
    </div>
  );
}
