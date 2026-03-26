import { NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';
import { buildWeeklySummary, getCurrentWeek } from '@/lib/aggregations';
import type { RunningSession, CyclingSession } from '@/lib/types';

export async function GET(request: Request) {
  try {
    const sql = neon(process.env.DATABASE_URL!);
    const { searchParams } = new URL(request.url);
    const weekParam = searchParams.get('week');
    const week = weekParam ? parseInt(weekParam) : getCurrentWeek();

    const [runningRows, cyclingRows] = await Promise.all([
      sql`SELECT * FROM running_sessions WHERE week = ${week} ORDER BY date ASC`,
      sql`SELECT * FROM cycling_sessions WHERE week = ${week} ORDER BY date ASC`,
    ]);

    const running: RunningSession[] = runningRows.map((r) => ({
      week: r.week,
      date: r.date instanceof Date ? r.date.toISOString().split('T')[0] : String(r.date).split('T')[0],
      day: r.day,
      time: r.time,
      phase: r.phase,
      workoutType: r.workout_type,
      targetDistance: Number(r.target_distance),
      targetPace: r.target_pace,
      actualDistance: r.actual_distance !== null ? Number(r.actual_distance) : null,
      actualPace: r.actual_pace,
      duration: r.duration !== null ? Number(r.duration) : null,
      movingTime: r.moving_time,
      elevationGain: r.elevation_gain,
      maxElevation: r.max_elevation,
      warmupDone: r.warmup_done || '',
      howLegsFeel: r.how_legs_feel || '',
      notes: r.notes || '',
    }));

    const cycling: CyclingSession[] = cyclingRows.map((r) => ({
      week: r.week,
      date: r.date instanceof Date ? r.date.toISOString().split('T')[0] : String(r.date).split('T')[0],
      day: r.day,
      time: r.time,
      targetDuration: r.target_duration,
      actualDuration: r.actual_duration,
      notes: r.notes || '',
    }));

    const summary = buildWeeklySummary(running, cycling, week);
    return NextResponse.json(summary);
  } catch (error) {
    console.error('Failed to build summary:', error);
    return NextResponse.json({ error: 'Failed to build summary' }, { status: 500 });
  }
}
