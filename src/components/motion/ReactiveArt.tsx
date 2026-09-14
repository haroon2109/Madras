'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

interface ReactiveArtProps {
  children: React.ReactNode;
  /** Extra classes for the wrapper. */
  className?: string;
  /** Max tilt in degrees while the pointer is near. */
  tilt?: number;
  /** Extra scale while engaged. */
  scale?: number;
  /** Label for assistive tech (decorative by default). */
  label?: string;
}

/**
 * Wraps a duotone illustration and makes it react organically:
 *
 * - Resting: a slow 7s "breathe" float, so the art always feels alive.
 * - Engaged: the art tilts toward the pointer (3D perspective, spring-settled
 *   on exit) and inner `.reactive-art__pop` elements scale up slightly —
 *   the cloud lifts, the gauge leans in.
 * - Proximity: response starts before the pointer arrives, using a pointermove
 *   listener on the window measured against the element rect. Dampened to zero
 *   at 140px out, so nothing snaps.
 *
 * All transforms are compositor-only; React state never re-renders per move.
 */
export function ReactiveArt({
  children,
  className = '',
  tilt = 6,
  scale = 1.03,
  label,
}: ReactiveArtProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [engaged, setEngaged] = useState(false);
  const raf = useRef(0);
  const target = useRef({ x: 0, y: 0 });

  const applyTransform = useCallback(
    (x: number, y: number, isEngaged: boolean) => {
      const el = ref.current;
      if (!el) return;
      const rx = (-y * tilt).toFixed(2);
      const ry = (x * tilt).toFixed(2);
      const s = isEngaged ? scale : 1;
      el.style.transform = `perspective(600px) rotateX(${rx}deg) rotateY(${ry}deg) scale(${s})`;
      el.classList.toggle('reactive-art--engaged', isEngaged);
    },
    [tilt, scale]
  );

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced) return;

    const proximity = 140;

    const onMove = (e: PointerEvent) => {
      const rect = el.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const dx = e.clientX - cx;
      const dy = e.clientY - cy;
      // Distance from the rect edge (0 inside)
      const dist =
        Math.max(Math.abs(dx) - rect.width / 2, 0) +
        Math.max(Math.abs(dy) - rect.height / 2, 0);
      if (dist > proximity) {
        if (engaged) {
          setEngaged(false);
          applyTransform(0, 0, false);
        }
        return;
      }
      // Dampen toward the edges of the proximity ring
      const falloff = 1 - dist / proximity;
      const nx = Math.max(-1, Math.min(1, dx / (rect.width / 2))) * falloff;
      const ny = Math.max(-1, Math.min(1, dy / (rect.height / 2))) * falloff;
      if (!engaged) setEngaged(true);
      target.current = { x: nx, y: ny };
      cancelAnimationFrame(raf.current);
      raf.current = requestAnimationFrame(() => applyTransform(target.current.x, target.current.y, true));
    };

    const onLeave = () => {
      if (engaged) setEngaged(false);
      applyTransform(0, 0, false);
    };

    window.addEventListener('pointermove', onMove, { passive: true });
    window.addEventListener('pointerleave', onLeave);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerleave', onLeave);
      cancelAnimationFrame(raf.current);
    };
  }, [engaged, applyTransform]);

  return (
    <div
      ref={ref}
      className={`reactive-art ${engaged ? 'reactive-art--engaged' : 'reactive-art--resting'} ${className}`}
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
    >
      {children}
    </div>
  );
}

export default ReactiveArt;
