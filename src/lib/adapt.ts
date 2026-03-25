import type { NeonQueryFunction } from '@neondatabase/serverless';
import { RunningSession, CyclingSession, WeightsSection, Adaptation } from './types';
import { getCurrentWeek } from './aggregations';

/**
 * Analyze recent sessions and generate adaptation recommendations.
 * Looks at the last 2-3 weeks of data to detect patterns.
 */
export function generateAdaptations(
  running: RunningSession[],
  cycling: CyclingSession[],
  weights: WeightsSection[],
  currentWeek: number
): Adaptation[] {
  const adaptations: Adaptation[] = [];

  adaptations.push(...analyzeRunning(running, currentWeek));
  adaptations.push(...analyzeCycling(cycling, currentWeek));
  adaptations.push(...analyzeWeights(weights, currentWeek));

  // If no issues found, add an "on track" message
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

  // Check "How Legs Feel" — look for pattern of soreness
  const recentCompleted = sessions.filter(
    (s) => recentWeeks.includes(s.week) && s.actualDistance !== null
  );

  // Parse leg feel as number (1-5 scale, or text)
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

  // Check if pace is consistently slower than target
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
    if (allFast && legFeelScores.length > 0 && legFeelScores.every((s) => s >= 4)) {
      adaptations.push({
        type: 'increase_volume',
        category: 'running',
        message: 'You\'re consistently beating pace targets and feeling good. Bumping next week\'s volume by 5%.',
        severity: 'success',
      });
    }
  }

  // Check for missed sessions
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
    (s) => recentWeeks.includes(s.week) && s.rpe !== null
  );

  if (recentCompleted.length >= 2) {
    const avgRpe = recentCompleted.reduce((sum, s) => sum + (s.rpe || 0), 0) / recentCompleted.length;

    if (avgRpe >= 8) {
      adaptations.push({
        type: 'reduce_volume',
        category: 'cycling',
        message: `Cycling RPE averaging ${avgRpe.toFixed(1)} — that's very hard. Reducing target duration by 10%.`,
        severity: 'warning',
      });
    } else if (avgRpe <= 4) {
      adaptations.push({
        type: 'increase_volume',
        category: 'cycling',
        message: `Cycling RPE averaging ${avgRpe.toFixed(1)} — you can push harder. Adding 10 minutes to targets.`,
        severity: 'success',
      });
    }
  }

  return adaptations;
}

function analyzeWeights(sections: WeightsSection[], currentWeek: number): Adaptation[] {
  const adaptations: Adaptation[] = [];

  for (const section of sections) {
    for (const exerciseName of section.exerciseNames) {
      // Get last 3 weeks of total reps for this exercise
      const recentSessions = section.sessions
        .filter((s) => s.week >= currentWeek - 3 && s.week < currentWeek)
        .sort((a, b) => a.week - b.week);

      const totals = recentSessions
        .map((s) => s.exercises[exerciseName]?.total)
        .filter((t): t is number => t !== null);

      if (totals.length < 2) continue;

      // Check for progressive overload (reps going up)
      const increasing = totals.length >= 2 && totals.every((t, i) => i === 0 || t > totals[i - 1]);
      if (increasing) {
        adaptations.push({
          type: 'increase_weight',
          category: 'weights',
          exercise: exerciseName,
          message: `${exerciseName}: total reps up ${totals.length} weeks in a row (${totals.join(' → ')}). Time to increase weight!`,
          severity: 'success',
        });
      }

      // Check for plateau or decline (3+ weeks flat/down)
      if (totals.length >= 3) {
        const declining = totals.every((t, i) => i === 0 || t <= totals[i - 1]);
        if (declining) {
          adaptations.push({
            type: 'deload',
            category: 'weights',
            exercise: exerciseName,
            message: `${exerciseName}: reps flat/declining for ${totals.length} weeks (${totals.join(' → ')}). Consider a deload.`,
            severity: 'warning',
          });
        }
      }
    }
  }

  // Check for overreaching (multiple exercises declining)
  const warningCount = adaptations.filter((a) => a.type === 'deload').length;
  if (warningCount >= 3) {
    adaptations.push({
      type: 'deload',
      category: 'weights',
      message: `Multiple exercises declining — your body may need a full deload week. Reduce volume across the board.`,
      severity: 'warning',
    });
  }

  return adaptations;
}

// Helpers
function parsePaceRange(pace: string): number | null {
  // Parse "6:30 - 6:45" -> midpoint in minutes
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
  category: 'running' | 'cycling' | 'weights',
  savedDate: string,
  sectionKey?: string
): Promise<Adaptation[]> {
  const currentWeek = getCurrentWeek();

  // Fetch all data needed for adaptation analysis
  const [runningRows, cyclingRows, sectionRows] = await Promise.all([
    sql`SELECT * FROM running_sessions ORDER BY date ASC`,
    sql`SELECT * FROM cycling_sessions ORDER BY date ASC`,
    sql`SELECT * FROM weights_sections ORDER BY id ASC`,
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
    actualDuration: r.actual_duration, movingTime: r.moving_time,
    resistanceLevel: r.resistance_level || '', avgHeartRate: r.avg_heart_rate,
    avgSpeed: r.avg_speed !== null ? Number(r.avg_speed) : null,
    elevationGain: r.elevation_gain, maxElevation: r.max_elevation,
    calories: r.calories, rpe: r.rpe, notes: r.notes || '',
  }));

  const weights: WeightsSection[] = [];
  for (const section of sectionRows) {
    const sessions = await sql`
      SELECT * FROM weights_sessions WHERE section_key = ${section.section_key} ORDER BY date ASC
    `;
    weights.push({
      sectionKey: section.section_key, title: section.title,
      dayOfWeek: section.day_of_week, location: section.location,
      exerciseNames: (section.exercises as { name: string }[]).map((e) => e.name),
      sessions: sessions.map((s) => ({
        week: s.week,
        date: s.date instanceof Date ? s.date.toISOString().split('T')[0] : String(s.date).split('T')[0],
        exercises: s.exercises as Record<string, { weight: string; sets: (number | null)[]; total: number | null }>,
      })),
    });
  }

  const allAdaptations = generateAdaptations(running, cycling, weights, currentWeek);
  const relevant = allAdaptations.filter((a) => a.category === category);
  const applied: Adaptation[] = [];

  if (category === 'running') {
    const nextRow = await sql`
      SELECT id, target_distance FROM running_sessions
      WHERE date > ${savedDate} AND actual_distance IS NULL
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
    const nextRow = await sql`
      SELECT id, target_duration FROM cycling_sessions
      WHERE date > ${savedDate} AND actual_duration IS NULL
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

  if (category === 'weights' && sectionKey) {
    const nextRow = await sql`
      SELECT id, exercises FROM weights_sessions
      WHERE section_key = ${sectionKey} AND date > ${savedDate}
      ORDER BY date ASC LIMIT 1
    `;
    if (nextRow.length > 0) {
      const nextId = nextRow[0].id;
      const nextExercises = nextRow[0].exercises as Record<string, { weight: string; sets: (number | null)[]; total: number | null }>;
      let modified = false;
      for (const a of relevant) {
        if (a.type === 'increase_weight' && a.exercise && nextExercises[a.exercise]) {
          const ex = nextExercises[a.exercise];
          const w = parseFloat(ex.weight);
          if (!isNaN(w)) {
            ex.weight = String(w + 2.5);
            modified = true;
            applied.push({ ...a, applied: true, adjustedValue: `${ex.weight} kg` });
          } else {
            applied.push({ ...a, applied: false });
          }
        } else if (a.type === 'deload' && a.exercise && nextExercises[a.exercise]) {
          const ex = nextExercises[a.exercise];
          if (ex.sets.length > 3) {
            ex.sets = ex.sets.slice(0, 3);
            modified = true;
            applied.push({ ...a, applied: true, adjustedValue: '3 sets' });
          } else {
            applied.push({ ...a, applied: false });
          }
        } else {
          applied.push({ ...a, applied: false });
        }
      }
      if (modified) {
        await sql`UPDATE weights_sessions SET exercises = ${JSON.stringify(nextExercises)} WHERE id = ${nextId}`;
      }
    }
  }

  return applied.length > 0 ? applied : relevant;
}
