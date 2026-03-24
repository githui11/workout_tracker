import { RunningSession, CyclingSession, WeightsSection, Adaptation } from './types';

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
