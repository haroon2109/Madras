'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { AlertCircle, CheckCircle, X, AlertTriangle, ArrowRight } from 'lucide-react';

type AlertSeverity = 'info' | 'warning' | 'critical' | 'success';

interface AlertBannerProps {
  severity: AlertSeverity;
  title: string;
  message: string;
  /** Optional action rendered as a real link. */
  actionHref?: string;
  actionLabel?: string;
  dismissible?: boolean;
  onDismiss?: () => void;
  duration?: number; // Auto-dismiss after ms
}

/** Duotone banners: tint surface + solid accent, no gradients. */
const severityConfig: Record<
  AlertSeverity,
  { bg: string; accent: string; iconColor: string }
> = {
  info: { bg: '#E8F0FE', accent: '#1A73E8', iconColor: '#1A73E8' },
  warning: { bg: '#FEF7E0', accent: '#E37400', iconColor: '#E37400' },
  critical: { bg: '#FCE8E6', accent: '#D93025', iconColor: '#D93025' },
  success: { bg: '#E6F4EA', accent: '#188038', iconColor: '#188038' },
};

const icons = {
  info: AlertCircle,
  warning: AlertTriangle,
  critical: AlertCircle,
  success: CheckCircle,
};

export default function AlertBanner({
  severity,
  title,
  message,
  actionHref,
  actionLabel,
  dismissible = false,
  onDismiss,
  duration,
}: AlertBannerProps) {
  const [isVisible, setIsVisible] = useState(true);
  const [isAnimatingOut, setIsAnimatingOut] = useState(false);

  const config = severityConfig[severity];
  const Icon = icons[severity];

  const handleDismiss = () => {
    if (!dismissible) return;

    setIsAnimatingOut(true);
    setTimeout(() => {
      setIsVisible(false);
      setIsAnimatingOut(false);
      onDismiss?.();
    }, 200);
  };

  useEffect(() => {
    if (duration && isVisible) {
      const timer = setTimeout(() => {
        handleDismiss();
      }, duration);

      return () => clearTimeout(timer);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [duration, isVisible]);

  if (!isVisible) return null;

  return (
    <div
      className={`animate-slide-down flex items-start gap-4 rounded-2xl p-4 transition-all duration-200 ${
        isAnimatingOut ? 'translate-x-3 opacity-0' : 'translate-x-0 opacity-100'
      }`}
      style={{ background: config.bg }}
      role={severity === 'critical' ? 'alert' : 'status'}
    >
      <div
        className="mt-0.5 grid h-10 w-10 shrink-0 place-items-center rounded-full bg-white"
        style={{ color: config.iconColor }}
      >
        <Icon size={19} />
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold text-[#202124]">{title}</h3>
          {severity === 'critical' && (
            <span
              className="h-2 w-2 animate-pulse-soft rounded-full"
              style={{ background: config.accent }}
            />
          )}
        </div>

        <p className="mt-1 text-sm leading-relaxed text-[#5F6368]">{message}</p>

        {actionHref && actionLabel && (
          <Link
            href={actionHref}
            className="mt-3 inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-[13px] font-medium text-white transition-all duration-200 hover:opacity-90 active:scale-[0.98]"
            style={{ background: config.accent }}
          >
            {actionLabel}
            <ArrowRight size={13} />
          </Link>
        )}
      </div>

      {dismissible && (
        <button
          onClick={handleDismiss}
          className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-[#80868B] transition-colors duration-200 hover:bg-white/70 hover:text-[#202124]"
          aria-label="Dismiss"
        >
          <X size={15} />
        </button>
      )}
    </div>
  );
}
