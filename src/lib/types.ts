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
  movingTime: string | null;
  resistanceLevel: string;
  avgHeartRate: number | null;
  avgSpeed: number | null;
  elevationGain: number | null;
  maxElevation: number | null;
  calories: number | null;
  rpe: number | null;
  notes: string;
}

// ============================================================
// WEIGHTS
// ============================================================
export interface WeightsExerciseData {
  weight: string;
  sets: (number | null)[];
  total: number | null;
}

export interface WeightsSession {
  week: number;
  date: string;
  exercises: Record<string, WeightsExerciseData>;
}

export interface WeightsSection {
  title: string;
  sectionKey: string; // "push1", "pull1", etc.
  dayOfWeek: string;
  location: string;
  exerciseNames: string[];
  sessions: WeightsSession[];
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
    avgRpe: number | null;
  };
  weights: {
    sessionsPlanned: number;
    sessionsCompleted: number;
    totalReps: number;
  };
}

export type AdaptationType = 'reduce_volume' | 'hold_progress' | 'increase_volume' | 'increase_weight' | 'deload' | 'on_track';

export interface Adaptation {
  type: AdaptationType;
  category: 'running' | 'cycling' | 'weights';
  exercise?: string;
  message: string;
  severity: 'info' | 'warning' | 'success';
  applied?: boolean;
  adjustedValue?: string;
}
