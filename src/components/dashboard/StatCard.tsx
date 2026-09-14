'use client';

import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';

interface StatCardProps {
  label: string;
  value: number | string;
  unit?: string;
  suffix?: string;
  prefix?: string;
  icon?: ReactNode;
  tone?: 'neutral' | 'teal' | 'blue' | 'amber' | 'red' | 'green';
  highlight?: boolean;
  loading?: boolean;
  delay?: number;
}

/** Duotone chips: tint fill + solid glyph, per the illustration system. */
const toneStyles: Record<
  NonNullable<StatCardProps['tone']>,
  { tint: string; solid: string }
> = {
  neutral: { tint: '#F1F3F4', solid: '#5F6368' },
  teal: { tint: '#E4F7FB', solid: '#129EAF' },
  blue: { tint: '#E8F0FE', solid: '#1A73E8' },
  amber: { tint: '#FEF7E0', solid: '#E37400' },
  red: { tint: '#FCE8E6', solid: '#D93025' },
  green: { tint: '#E6F4EA', solid: '#188038' },
};

export default function StatCard({
  label,
  value,
  unit,
  suffix,
  prefix,
  icon,
  tone = 'neutral',
  highlight = false,
  loading = false,
  delay = 0,
}: StatCardProps) {
  const [displayValue, setDisplayValue] = useState(value);
  const [isVisible, setIsVisible] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  const styles = toneStyles[tone];

  // Count-up on mount — 700ms, eased, respects reduced motion via CSS
  useEffect(() => {
    if (loading) return;

    const timer = setTimeout(() => {
      setIsVisible(true);

      if (typeof value === 'number') {
        const duration = 700;
        const startTime = performance.now();
        const startValue = 0;
        const endValue = value;

        const animate = (currentTime: number) => {
          const elapsed = currentTime - startTime;
          const progress = Math.min(elapsed / duration, 1);
          const eased = 1 - Math.pow(1 - progress, 3);
          const currentValue = startValue + (endValue - startValue) * eased;
          setDisplayValue(currentValue);
          if (progress < 1) requestAnimationFrame(animate);
        };

        requestAnimationFrame(animate);
      }
    }, delay);

    return () => clearTimeout(timer);
  }, [value, loading, delay]);

  return (
    <div
      ref={cardRef}
      className="bento-cell bento-cell--interactive group animate-rise p-5"
      style={{ animationDelay: `${delay}ms` }}
      aria-label={`${label}: ${typeof value === 'number' ? Math.round(value) : value}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 space-y-1.5">
          <p className="truncate text-[13px] font-medium text-[#5F6368]">{label}</p>
          <div className="flex items-baseline gap-1">
            {prefix && <span className="text-sm text-[#80868B]">{prefix}</span>}
            <span
              className={`text-3xl font-semibold tabular-nums tracking-tight text-[#202124] ${
                isVisible ? 'animate-count-up' : ''
              }`}
            >
              {typeof displayValue === 'number'
                ? Math.round(displayValue).toLocaleString('en-IN')
                : displayValue}
              {unit && typeof displayValue === 'number' && (
                <span className="ml-0.5 text-base font-normal text-[#5F6368]">{unit}</span>
              )}
              {suffix && !unit && (
                <span className="ml-0.5 text-base font-normal text-[#5F6368]">{suffix}</span>
              )}
            </span>
          </div>
        </div>

        {icon && (
          <div
            className="grid h-10 w-10 shrink-0 place-items-center rounded-xl [&>*]:shrink-0 transition-transform duration-200 group-hover:scale-110"
            style={{ background: styles.tint, color: styles.solid }}
          >
            {icon}
          </div>
        )}
      </div>
    </div>
  );
}
