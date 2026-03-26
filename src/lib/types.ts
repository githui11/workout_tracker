// ============================================================
// RUNNING
// ============================================================
export interface RunningSession {
  week: number;
  date: string;
  day: string;
  time: string;
  phase: string;
  workoutType: string;
  targetDistance: number;
  targetPace: string;
  actualDistance: number | null;
  actualPace: string | null;
  duration: number | null;
  movingTime: string | null;
  elevationGain: number | null;
  maxElevation: number | null;
  warmupDone: string;
  howLegsFeel: string;
  notes: string;
}

// ============================================================
// CYCLING
// ============================================================
export interface CyclingSession {
  week: number;
  date: string;
  day: string;
  time: string;
  targetDuration: number;
  actualDuration: number | null;
  notes: string;
}

// ============================================================
// SUMMARY & ADAPT
// ============================================================
export interface WeeklySummary {
  week: number;
  dateRange: string;
  running: {
    sessionsPlanned: number;
    sessionsCompleted: number;
    totalKm: number;
    avgPace: string | null;
  };
  cycling: {
    sessionsPlanned: number;
    sessionsCompleted: number;
    totalMinutes: number;
  };
}

export type AdaptationType = 'reduce_volume' | 'hold_progress' | 'increase_volume' | 'on_track';

export interface Adaptation {
  type: AdaptationType;
  category: 'running' | 'cycling';
  message: string;
  severity: 'info' | 'warning' | 'success';
  applied?: boolean;
  adjustedValue?: string;
}
