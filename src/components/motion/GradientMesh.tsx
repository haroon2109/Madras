'use client';

import { useEffect, useRef } from 'react';

/**
 * Ambient gradient mesh field.
 *
 * Three low-opacity color blobs on a fixed layer, gently breathing on their
 * own and drifting a few pixels toward the pointer (perceptual, not literal —
 * the layer moves at 0.5–2% of cursor travel). Everything is transform-only
 * on a `contain: strict` layer, so it never touches layout or paint.
 */
export function GradientMesh() {
  const fieldRef = useRef<HTMLDivElement>(null);
  const blobRefs = useRef<Array<HTMLDivElement | null>>([null, null, null]);
  const pointer = useRef({ x: 0.5, y: 0.5 });
  const raf = useRef<number>(0);

  useEffect(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced) return;

    const field = fieldRef.current;
    if (!field) return;
    if (getComputedStyle(field).display === 'none') return; // small screens: static blobs

    const onPointerMove = (e: PointerEvent) => {
      pointer.current = { x: e.clientX / window.innerWidth, y: e.clientY / window.innerHeight };
    };

    // Per-blob drift: speed (px/frame), float radius (px), parallax factor.
    const config = [
      { speed: 0.0032, float: 26, parallax: 22, phase: 0 },
      { speed: 0.0021, float: 34, parallax: -14, phase: 2.1 },
      { speed: 0.0026, float: 20, parallax: 10, phase: 4.4 },
    ];
    let t = Math.random() * 100;
    let px = 0.5;
    let py = 0.5;

    const tick = () => {
      t += 1;
      // Eased pointer follow for organic lag
      px += (pointer.current.x - px) * 0.04;
      py += (pointer.current.y - py) * 0.04;

      blobRefs.current.forEach((blob, i) => {
        if (!blob) return;
        const c = config[i];
        const breathe = Math.sin(t * c.speed + c.phase);
        const driftX = Math.cos(t * c.speed * 0.8 + c.phase) * c.float;
        const driftY = breathe * c.float;
        const parallaxX = (px - 0.5) * c.parallax;
        const parallaxY = (py - 0.5) * c.parallax;
        blob.style.transform = `translate3d(${(driftX + parallaxX).toFixed(2)}px, ${(driftY + parallaxY).toFixed(2)}px, 0)`;
      });

      raf.current = requestAnimationFrame(tick);
    };

    window.addEventListener('pointermove', onPointerMove, { passive: true });
    raf.current = requestAnimationFrame(tick);

    return () => {
      window.removeEventListener('pointermove', onPointerMove);
      cancelAnimationFrame(raf.current);
    };
  }, []);

  return (
    <div ref={fieldRef} className="mesh-field" aria-hidden="true">
      <div
        ref={(el) => { blobRefs.current[0] = el; }}
        className="mesh-blob"
        style={{ width: 520, height: 520, left: '-8%', top: '-12%', background: 'radial-gradient(circle, #1A73E8 0%, transparent 70%)' }}
      />
      <div
        ref={(el) => { blobRefs.current[1] = el; }}
        className="mesh-blob"
        style={{ width: 460, height: 460, right: '-6%', top: '30%', background: 'radial-gradient(circle, #129EAF 0%, transparent 70%)' }}
      />
      <div
        ref={(el) => { blobRefs.current[2] = el; }}
        className="mesh-blob"
        style={{ width: 400, height: 400, left: '30%', bottom: '-14%', background: 'radial-gradient(circle, #7B1FA2 0%, transparent 70%)' }}
      />
    </div>
  );
}

export default GradientMesh;
