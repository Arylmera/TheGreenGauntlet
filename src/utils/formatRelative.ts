const rtf = new Intl.RelativeTimeFormat('en-US', { numeric: 'auto' });

const UNITS: [Intl.RelativeTimeFormatUnit, number][] = [
  ['year', 60 * 60 * 24 * 365],
  ['month', 60 * 60 * 24 * 30],
  ['day', 60 * 60 * 24],
  ['hour', 60 * 60],
  ['minute', 60],
  ['second', 1],
];

export function formatRelative(iso: string | null, now: Date = new Date()): string {
  if (!iso) return '—';
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return '—';
  const diffSec = Math.round((then - now.getTime()) / 1000);
  const abs = Math.abs(diffSec);
  if (abs < 10) return 'just now';
  for (const [unit, secs] of UNITS) {
    if (abs >= secs || unit === 'second') {
      const value = Math.round(diffSec / secs);
      return rtf.format(value, unit);
    }
  }
  return 'just now';
}
