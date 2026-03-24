import { RunningSession, CyclingSession, WeightsSection, WeeklySummary } from './types';

const PLAN_START = new Date('2026-03-24');

export function getCurrentWeek(): number {
  const now = new Date();
  const diff = now.getTime() - PLAN_START.getTime();
  return Math.max(1, Math.floor(diff / (7 * 24 * 60 * 60 * 1000)) + 1);
}

export function getWeekDateRange(week: number): string {
  const start = new Date(PLAN_START);
  start.setDate(start.getDate() + (week - 1) * 7);
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  const fmt = (d: Date) => d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
  return `${fmt(start)} - ${fmt(end)}`;
}

function parsePace(pace: string | null): number | null {
  if (!pace) return null;
  // Parse "6:30" -> 6.5 (minutes)
  const match = pace.match(/(\d+):(\d+)/);
  if (!match) return null;
  return parseInt(match[1]) + parseInt(match[2]) / 60;
}

function formatPace(minutes: number): string {
  const mins = Math.floor(minutes);
  const secs = Math.round((minutes - mins) * 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export function buildWeeklySummary(
  running: RunningSession[],
  cycling: CyclingSession[],
  weights: WeightsSection[],
  week: number
): WeeklySummary {
  const weekRunning = running.filter((s) => s.week === week);
  const weekCycling = cycling.filter((s) => s.week === week);

  const completedRuns = weekRunning.filter((s) => s.actualDistance !== null);
  const totalKm = completedRuns.reduce((sum, s) => sum + (s.actualDistance || 0), 0);
  const paces = completedRuns.map((s) => parsePace(s.actualPace)).filter((p): p is number => p !== null);
  const avgPace = paces.length > 0 ? formatPace(paces.reduce((a, b) => a + b, 0) / paces.length) : null;

  const completedCycling = weekCycling.filter((s) => s.actualDuration !== null);
  const totalMin = completedCycling.reduce((sum, s) => sum + (s.actualDuration || 0), 0);
  const rpes = completedCycling.map((s) => s.rpe).filter((r): r is number => r !== null);
  const avgRpe = rpes.length > 0 ? Math.round((rpes.reduce((a, b) => a + b, 0) / rpes.length) * 10) / 10 : null;

  // Weights: count sessions with any data filled in for this week
  let weightSessionsPlanned = 0;
  let weightSessionsCompleted = 0;
  let totalReps = 0;

  for (const section of weights) {
    const weekSessions = section.sessions.filter((s) => s.week === week);
    weightSessionsPlanned += weekSessions.length;
    for (const session of weekSessions) {
      const hasData = Object.values(session.exercises).some((ex) => ex.sets.some((s) => s !== null));
      if (hasData) {
        weightSessionsCompleted++;
        totalReps += Object.values(session.exercises).reduce((sum, ex) => sum + (ex.total || 0), 0);
      }
    }
  }

  return {
    week,
    dateRange: getWeekDateRange(week),
    running: {
      sessionsPlanned: weekRunning.length,
      sessionsCompleted: completedRuns.length,
      totalKm: Math.round(totalKm * 10) / 10,
      avgPace,
    },
    cycling: {
      sessionsPlanned: weekCycling.length,
      sessionsCompleted: completedCycling.length,
      totalMinutes: totalMin,
      avgRpe,
    },
    weights: {
      sessionsPlanned: weightSessionsPlanned,
      sessionsCompleted: weightSessionsCompleted,
      totalReps,
    },
  };
}
