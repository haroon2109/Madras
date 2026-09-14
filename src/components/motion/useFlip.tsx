'use client';

import { useCallback, useLayoutEffect, useRef } from 'react';

/**
 * FLIP (First–Last–Invert–Play) layout morphing.
 *
 * Call `record` before a filter/sort change re-renders the grid, then `play`
 * in a layout effect after the DOM updates. Each surviving element springs
 * from its old position to its new one — the grid appears to *morph* instead
 * of re-layout. Entering elements fade-rise; exiting ones are simply gone
 * (React removes them before paint, so no exit animation is possible without
 * a portal buffer — acceptable for filter operations).
 *
 * Transform-only, so the whole sequence stays on the compositor at 60fps.
 */
export function useFlip<T extends HTMLElement = HTMLDivElement>() {
  const rects = useRef(new Map<string, DOMRect>());

  /** FIRST: capture positions. Call synchronously before setState. */
  const record = useCallback((container: HTMLElement | null) => {
    if (!container) return;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced) return;
    rects.current.clear();
    for (const child of Array.from(container.children)) {
      const el = child as HTMLElement;
      const key = el.dataset.flipId;
      if (key) rects.current.set(key, el.getBoundingClientRect());
    }
  }, []);

  /** LAST + INVERT + PLAY: animate from old positions to new. */
  const play = useCallback((container: HTMLElement | null) => {
    if (!container) return;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced) return;

    for (const child of Array.from(container.children)) {
      const el = child as HTMLElement;
      const key = el.dataset.flipId;
      if (!key) continue;
      const first = rects.current.get(key);
      const last = el.getBoundingClientRect();
      if (!first) {
        // Entering element: spring rise-in
        el.animate(
          [
            { opacity: 0, transform: 'translate3d(0, 15px, 0) scale(0.98)' },
            { opacity: 1, transform: 'translate3d(0, 0, 0) scale(1)' },
          ],
          {
            duration: 480,
            easing: 'var(--ease-spring-soft, cubic-bezier(0.3, 1.06, 0.4, 1))',
            fill: 'both',
          }
        );
        continue;
      }

      const dx = first.left - last.left;
      const dy = first.top - last.top;
      const sx = first.width / last.width;
      const sy = first.height / last.height;
      const moved = Math.abs(dx) > 1 || Math.abs(dy) > 1 || Math.abs(sx - 1) > 0.01 || Math.abs(sy - 1) > 0.01;
      if (!moved) continue;

      // INVERT: snap to the old position…
      el.style.transformOrigin = 'top left';
      el.style.transform = `translate3d(${dx}px, ${dy}px, 0) scale(${sx}, ${sy})`;
      el.style.transition = 'none';

      // …then PLAY: spring to identity
      requestAnimationFrame(() => {
        el.style.transition = 'transform 480ms var(--ease-spring-soft, cubic-bezier(0.3, 1.06, 0.4, 1))';
        el.style.transform = 'translate3d(0, 0, 0) scale(1, 1)';
        const clear = () => {
          el.style.transition = '';
          el.style.transform = '';
        };
        el.addEventListener('transitionend', clear, { once: true });
        // Safety: clear if transitionend never fires (tab hidden, etc.)
        setTimeout(clear, 600);
      });
    }
    rects.current.clear();
  }, []);

  return { record, play };
}
