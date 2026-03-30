'use client';

interface Props {
  value: number; // total seconds
  onChange: (seconds: number) => void;
}

/** Simple text input for duration in minutes. */
export default function DurationPicker({ value, onChange }: Props) {
  const minutes = value ? Math.round(value / 60) : '';
  return (
    <input
      type="text"
      inputMode="numeric"
      value={minutes}
      onChange={(e) => {
        const raw = e.target.value;
        if (raw === '') { onChange(0); return; }
        const n = Number(raw);
        if (!isNaN(n)) onChange(Math.round(n * 60));
      }}
      placeholder="Minutes"
      className="w-full bg-zinc-900/80 rounded-xl px-3.5 py-2.5 text-sm font-mono border border-zinc-800/60 focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/10 focus:outline-none transition-all placeholder:text-zinc-700 text-center"
    />
  );
}

/** Format total seconds → "1h 32m" or "45m 10s" or "5m" */
export function formatDuration(totalSeconds: number): string {
  if (!totalSeconds) return '0m';
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  const parts: string[] = [];
  if (h) parts.push(`${h}h`);
  if (m) parts.push(`${m}m`);
  if (s && !h) parts.push(`${s}s`);
  return parts.join(' ');
}

/** Parse "MM:SS" or "H:MM:SS" string → total seconds */
export function parseTimeString(t: string): number {
  if (!t) return 0;
  const parts = t.split(':').map(Number);
  if (parts.some(isNaN)) return 0;
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  return 0;
}

/** Total seconds → "H:MM:SS" or "MM:SS" string */
export function secondsToTimeString(secs: number): string {
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = secs % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  return `${m}:${String(s).padStart(2, '0')}`;
}
