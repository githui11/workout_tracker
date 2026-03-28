'use client';

import { useRef, useEffect, useCallback } from 'react';

const ITEM_H = 36; // px per row
const VISIBLE = 3; // rows shown

interface Props {
  value: number; // total seconds
  onChange: (seconds: number) => void;
}

function Column({
  max,
  selected,
  onSelect,
  label,
}: {
  max: number;
  selected: number;
  onSelect: (v: number) => void;
  label: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const isTouching = useRef(false);
  const items = Array.from({ length: max + 1 }, (_, i) => i);

  const scrollToIndex = useCallback((idx: number, smooth = false) => {
    ref.current?.scrollTo({ top: idx * ITEM_H, behavior: smooth ? 'smooth' : 'instant' });
  }, []);

  // Scroll to selected on mount or when value changes externally
  useEffect(() => {
    if (!isTouching.current) {
      scrollToIndex(selected);
    }
  }, [selected, scrollToIndex]);

  function handleScroll() {
    if (!ref.current) return;
    const idx = Math.round(ref.current.scrollTop / ITEM_H);
    const clamped = Math.min(Math.max(idx, 0), max);
    if (clamped !== selected) onSelect(clamped);
  }

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative" style={{ height: ITEM_H * VISIBLE, width: 52 }}>
        {/* Selection band */}
        <div
          className="absolute inset-x-0 pointer-events-none border-y border-zinc-600/40 bg-zinc-700/20 rounded-lg z-10"
          style={{ top: ITEM_H * 2, height: ITEM_H }}
        />
        {/* Top and bottom fade */}
        <div className="absolute inset-x-0 top-0 pointer-events-none z-20 bg-gradient-to-b from-zinc-950 to-transparent" style={{ height: ITEM_H * 1.5 }} />
        <div className="absolute inset-x-0 bottom-0 pointer-events-none z-20 bg-gradient-to-t from-zinc-950 to-transparent" style={{ height: ITEM_H * 1.5 }} />

        <div
          ref={ref}
          onScroll={handleScroll}
          onTouchStart={() => { isTouching.current = true; }}
          onTouchEnd={() => {
            isTouching.current = false;
            // Snap to nearest after touch ends
            if (ref.current) {
              const idx = Math.round(ref.current.scrollTop / ITEM_H);
              scrollToIndex(Math.min(Math.max(idx, 0), max), true);
            }
          }}
          className="h-full overflow-y-scroll no-scrollbar"
          style={{ scrollSnapType: 'y mandatory' }}
        >
          <div style={{ height: ITEM_H * 2 }} />
          {items.map((v) => (
            <div
              key={v}
              style={{ height: ITEM_H, scrollSnapAlign: 'center' }}
              className={`flex items-center justify-center font-mono font-semibold transition-all duration-100 select-none ${
                v === selected
                  ? 'text-white text-xl'
                  : 'text-zinc-600 text-base'
              }`}
            >
              {String(v).padStart(2, '0')}
            </div>
          ))}
          <div style={{ height: ITEM_H * 2 }} />
        </div>
      </div>
      <span className="text-[10px] font-semibold text-zinc-500 uppercase tracking-widest">{label}</span>
    </div>
  );
}

export default function DurationPicker({ value, onChange }: Props) {
  const hours = Math.floor(value / 3600);
  const minutes = Math.floor((value % 3600) / 60);
  const seconds = value % 60;

  return (
    <div className="flex items-end justify-center gap-1 py-2">
      <Column max={23} selected={hours} onSelect={(h) => onChange(h * 3600 + minutes * 60 + seconds)} label="hr" />
      <span className="text-zinc-600 font-bold text-2xl pb-10">:</span>
      <Column max={59} selected={minutes} onSelect={(m) => onChange(hours * 3600 + m * 60 + seconds)} label="min" />
      <span className="text-zinc-600 font-bold text-2xl pb-10">:</span>
      <Column max={59} selected={seconds} onSelect={(s) => onChange(hours * 3600 + minutes * 60 + s)} label="sec" />
    </div>
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
