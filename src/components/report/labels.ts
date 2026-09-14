/** Shared axis/tooltip label helpers for the report charts. */

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** "2026-09-09" → "Sep 09" */
export function shortLabel(dateKey: string): string {
  const [, m, d] = dateKey.split("-");
  return `${MONTHS[Number(m) - 1] ?? m} ${d}`;
}

/** "2026-09-09" → "Tue, Sep 09" */
export function weekdayLabel(dateKey: string): string {
  const [y, m, d] = dateKey.split("-").map(Number);
  const date = new Date(Date.UTC(y, (m ?? 1) - 1, d ?? 1));
  const wd = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][date.getUTCDay()];
  return `${wd}, ${shortLabel(dateKey)}`;
}
