import type { NeonQueryFunction } from '@neondatabase/serverless';
import { RunningSession, CyclingSession, Adaptation } from './types';
import { getCurrentWeek } from './aggregations';

/**
 * Analyze recent sessions and generate adaptation recommendations.
 * Looks at the last 2-3 weeks of data to detect patterns.
 */
export function generateAdaptations(
  running: RunningSession[],
  cycling: CyclingSession[],
  currentWeek: number
): Adaptation[] {
  const adaptations: Adaptation[] = [];

  adaptations.push(...analyzeRunning(running, currentWeek));
  adaptations.push(...analyzeCycling(cycling, currentWeek));

  if (adaptations.length === 0) {
    adaptations.push({
      type: 'on_track',
      category: 'running',
      message: 'All systems go — keep following the plan.',
      severity: 'success',
    });
  }

  return adaptations;
}

function analyzeRunning(sessions: RunningSession[], currentWeek: number): Adaptation[] {
  const adaptations: Adaptation[] = [];
  const recentWeeks = [currentWeek - 1, currentWeek - 2].filter((w) => w > 0);

  const recentCompleted = sessions.filter(
    (s) => recentWeeks.includes(s.week) && s.actualDistance !== null
  );

  const legFeelScores = recentCompleted
    .map((s) => {
      const n = parseInt(s.howLegsFeel);
      if (!isNaN(n)) return n;
      const lower = s.howLegsFeel.toLowerCase();
      if (lower.includes('terrible') || lower.includes('awful')) return 1;
      if (lower.includes('sore') || lower.includes('bad')) return 2;
      if (lower.includes('ok') || lower.includes('decent')) return 3;
      if (lower.includes('good') || lower.includes('fine')) return 4;
      if (lower.includes('great') || lower.includes('fresh')) return 5;
      return null;
    })
    .filter((n): n is number => n !== null);

  if (legFeelScores.length >= 2) {
    const avgFeel = legFeelScores.reduce((a, b) => a + b, 0) / legFeelScores.length;
    if (avgFeel <= 2) {
      adaptations.push({
        type: 'reduce_volume',
        category: 'running',
        message: `Your legs have been consistently sore (avg ${avgFeel.toFixed(1)}/5). Reducing next week's distances by 15%.`,
        severity: 'warning',
      });
    }
  }

  const paceComparisons = recentCompleted.map((s) => {
    const target = parsePaceRange(s.targetPace);
    const actual = parseSinglePace(s.actualPace);
    if (target === null || actual === null) return null;
    return { actual, targetMid: target };
  }).filter((p): p is { actual: number; targetMid: number } => p !== null);

  if (paceComparisons.length >= 2) {
    const allSlow = paceComparisons.every((p) => p.actual > p.targetMid * 1.2);
    if (allSlow) {
      adaptations.push({
        type: 'reduce_volume',
        category: 'running',
        message: 'Pace has been 20%+ slower than targets. Consider dropping back a phase for recovery.',
        severity: 'warning',
      });
    }

    const allFast = paceComparisons.every((p) => p.actual < p.targetMid * 0.95);
    // Only progress if: beating pace targets AND legs feel good (4+) AND no missed sessions last week
    const lastWeekSessionsForPace = sessions.filter((s) => s.week === currentWeek - 1);
    const lastWeekCompletedForPace = lastWeekSessionsForPace.filter((s) => s.actualDistance !== null);
    const noMissedLastWeek = lastWeekSessionsForPace.length === 0 || lastWeekCompletedForPace.length >= lastWeekSessionsForPace.length;
    if (allFast && legFeelScores.length > 0 && legFeelScores.every((s) => s >= 4) && noMissedLastWeek) {
      adaptations.push({
        type: 'increase_volume',
        category: 'running',
        message: 'You\'re consistently beating pace targets, feeling good, and completed all sessions. Bumping next week\'s volume by 5%.',
        severity: 'success',
      });
    }
  }

  const lastWeekSessions = sessions.filter((s) => s.week === currentWeek - 1);
  const lastWeekCompleted = lastWeekSessions.filter((s) => s.actualDistance !== null);
  if (lastWeekSessions.length >= 3 && lastWeekCompleted.length < 2) {
    adaptations.push({
      type: 'hold_progress',
      category: 'running',
      message: `Only ${lastWeekCompleted.length}/${lastWeekSessions.length} runs completed last week. Holding targets instead of progressing.`,
      severity: 'info',
    });
  }

  return adaptations;
}

function analyzeCycling(sessions: CyclingSession[], currentWeek: number): Adaptation[] {
  const adaptations: Adaptation[] = [];
  const recentWeeks = [currentWeek - 1, currentWeek - 2].filter((w) => w > 0);

  const recentCompleted = sessions.filter(
    (s) => recentWeeks.includes(s.week) && s.actualDuration !== null
  );

  // Check for missed sessions
  const lastWeekSessions = sessions.filter((s) => s.week === currentWeek - 1);
  const lastWeekCompleted = lastWeekSessions.filter((s) => s.actualDuration !== null);
  if (lastWeekSessions.length >= 2 && lastWeekCompleted.length < 1) {
    adaptations.push({
      type: 'hold_progress',
      category: 'cycling',
      message: `Only ${lastWeekCompleted.length}/${lastWeekSessions.length} cycling sessions completed last week. Holding targets.`,
      severity: 'info',
    });
  }

  // Check if consistently exceeding targets — only progress if no missed sessions
  if (recentCompleted.length >= 2) {
    const allOverTarget = recentCompleted.every((s) => (s.actualDuration || 0) > s.targetDuration * 1.15);
    const noMissedLastWeek = lastWeekSessions.length === 0 || lastWeekCompleted.length >= lastWeekSessions.length;
    if (allOverTarget && noMissedLastWeek) {
      adaptations.push({
        type: 'increase_volume',
        category: 'cycling',
        message: 'You\'re consistently exceeding duration targets and completed all sessions. Adding 10 minutes to next target.',
        severity: 'success',
      });
    }
  }

  return adaptations;
}

// Helpers
function parsePaceRange(pace: string): number | null {
  const matches = pace.match(/(\d+):(\d+)/g);
  if (!matches || matches.length === 0) return null;
  const parsed = matches.map((m) => {
    const [min, sec] = m.split(':').map(Number);
    return min + sec / 60;
  });
  return parsed.reduce((a, b) => a + b, 0) / parsed.length;
}

function parseSinglePace(pace: string | null): number | null {
  if (!pace) return null;
  const match = pace.match(/(\d+):(\d+)/);
  if (!match) return null;
  return parseInt(match[1]) + parseInt(match[2]) / 60;
}

/**
 * After saving a session, run adaptation logic and apply changes to the next
 * upcoming session's targets in the database.
 */
export async function applyAdaptations(
  sql: NeonQueryFunction<false, false>,
  category: 'running' | 'cycling',
  savedDate: string,
): Promise<Adaptation[]> {
  const currentWeek = getCurrentWeek();
  const minWeek = Math.max(1, currentWeek - 3);

  const [runningRows, cyclingRows] = await Promise.all([
    sql`SELECT * FROM running_sessions WHERE week >= ${minWeek} ORDER BY date ASC`,
    sql`SELECT * FROM cycling_sessions WHERE week >= ${minWeek} ORDER BY date ASC`,
  ]);

  const running: RunningSession[] = runningRows.map((r) => ({
    week: r.week,
    date: r.date instanceof Date ? r.date.toISOString().split('T')[0] : String(r.date).split('T')[0],
    day: r.day, time: r.time, phase: r.phase, workoutType: r.workout_type,
    targetDistance: Number(r.target_distance), targetPace: r.target_pace,
    actualDistance: r.actual_distance !== null ? Number(r.actual_distance) : null,
    actualPace: r.actual_pace,
    duration: r.duration !== null ? Number(r.duration) : null,
    movingTime: r.moving_time, elevationGain: r.elevation_gain, maxElevation: r.max_elevation,
    warmupDone: r.warmup_done || '', howLegsFeel: r.how_legs_feel || '', notes: r.notes || '',
  }));

  const cycling: CyclingSession[] = cyclingRows.map((r) => ({
    week: r.week,
    date: r.date instanceof Date ? r.date.toISOString().split('T')[0] : String(r.date).split('T')[0],
    day: r.day, time: r.time, targetDuration: r.target_duration,
    actualDuration: r.actual_duration, notes: r.notes || '',
  }));

  const allAdaptations = generateAdaptations(running, cycling, currentWeek);
  const relevant = allAdaptations.filter((a) => a.category === category);
  const applied: Adaptation[] = [];

  if (category === 'running') {
    // Find earliest unlogged session (not date > savedDate) so skipped sessions are served next
    const nextRow = await sql`
      SELECT id, target_distance FROM running_sessions
      WHERE actual_distance IS NULL
      ORDER BY date ASC LIMIT 1
    `;
    if (nextRow.length > 0) {
      const nextId = nextRow[0].id;
      let currentTarget = Number(nextRow[0].target_distance);
      for (const a of relevant) {
        if (a.type === 'reduce_volume') {
          const newTarget = Math.round(currentTarget * 0.85 * 10) / 10;
          await sql`UPDATE running_sessions SET target_distance = ${newTarget} WHERE id = ${nextId}`;
          applied.push({ ...a, applied: true, adjustedValue: `${newTarget} km` });
          currentTarget = newTarget;
        } else if (a.type === 'increase_volume') {
          const newTarget = Math.round(currentTarget * 1.05 * 10) / 10;
          await sql`UPDATE running_sessions SET target_distance = ${newTarget} WHERE id = ${nextId}`;
          applied.push({ ...a, applied: true, adjustedValue: `${newTarget} km` });
          currentTarget = newTarget;
        } else {
          applied.push({ ...a, applied: false });
        }
      }
    }
  }

  if (category === 'cycling') {
    // Find earliest unlogged session so skipped sessions are served next
    const nextRow = await sql`
      SELECT id, target_duration FROM cycling_sessions
      WHERE actual_duration IS NULL
      ORDER BY date ASC LIMIT 1
    `;
    if (nextRow.length > 0) {
      const nextId = nextRow[0].id;
      let currentTarget = Number(nextRow[0].target_duration);
      for (const a of relevant) {
        if (a.type === 'reduce_volume') {
          const newTarget = Math.round(currentTarget * 0.90);
          await sql`UPDATE cycling_sessions SET target_duration = ${newTarget} WHERE id = ${nextId}`;
          applied.push({ ...a, applied: true, adjustedValue: `${newTarget} min` });
          currentTarget = newTarget;
        } else if (a.type === 'increase_volume') {
          const newTarget = currentTarget + 10;
          await sql`UPDATE cycling_sessions SET target_duration = ${newTarget} WHERE id = ${nextId}`;
          applied.push({ ...a, applied: true, adjustedValue: `${newTarget} min` });
          currentTarget = newTarget;
        } else {
          applied.push({ ...a, applied: false });
        }
      }
    }
  }

  return applied.length > 0 ? applied : relevant;
}
