import type { NeonQueryFunction } from '@neondatabase/serverless';
import { getCurrentWeek } from './aggregations';

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export function getDayName(date: string): string {
  return DAYS[new Date(date + 'T00:00:00').getDay()];
}

export function getWeekForDate(date: string): number {
  const PLAN_START = new Date('2026-03-24');
  const d = new Date(date + 'T00:00:00');
  const diff = d.getTime() - PLAN_START.getTime();
  return Math.max(1, Math.floor(diff / (7 * 24 * 60 * 60 * 1000)) + 1);
}

export async function getRunningDefaults(sql: NeonQueryFunction<false, false>) {
  const rows = await sql`
    SELECT phase, workout_type, target_distance, target_pace
    FROM running_sessions
    WHERE actual_distance IS NOT NULL
    ORDER BY date DESC LIMIT 1
  `;
  if (rows.length > 0) {
    return {
      phase: rows[0].phase,
      workoutType: rows[0].workout_type,
      targetDistance: Number(rows[0].target_distance),
      targetPace: rows[0].target_pace,
    };
  }
  return {
    phase: 'Phase 1: Foundation',
    workoutType: 'Easy Run',
    targetDistance: 3.0,
    targetPace: '6:30 - 6:45',
  };
}

export async function getCyclingDefaults(sql: NeonQueryFunction<false, false>) {
  const rows = await sql`
    SELECT target_duration
    FROM cycling_sessions
    WHERE actual_duration IS NOT NULL
    ORDER BY date DESC LIMIT 1
  `;
  if (rows.length > 0) {
    return { targetDuration: Number(rows[0].target_duration) };
  }
  return { targetDuration: 55 };
}

export async function getWeightsDefaults(sql: NeonQueryFunction<false, false>, sectionKey: string) {
  const rows = await sql`
    SELECT exercises FROM weights_sections WHERE section_key = ${sectionKey}
  `;
  if (rows.length === 0) return null;
  const exerciseList = rows[0].exercises as { name: string; bw: boolean; defaultWeight?: string }[];
  const exercises: Record<string, { weight: string; sets: (number | null)[]; total: number | null }> = {};
  for (const ex of exerciseList) {
    exercises[ex.name] = {
      weight: ex.bw ? 'BW' : (ex.defaultWeight || ''),
      sets: [null, null, null, null],
      total: null,
    };
  }
  return exercises;
}
