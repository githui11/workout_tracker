import { NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';
import { generateAdaptations } from '@/lib/adapt';
import { getCurrentWeek } from '@/lib/aggregations';
import type { RunningSession, CyclingSession, WeightsSection } from '@/lib/types';

export async function GET() {
  try {
    const sql = neon(process.env.DATABASE_URL!);

    const currentWeek = getCurrentWeek();
    // Adaptation only needs last 3 weeks of data
    const minWeek = Math.max(1, currentWeek - 3);

    const [runningRows, cyclingRows, sectionRows, weightSessionRows] = await Promise.all([
      sql`SELECT * FROM running_sessions WHERE week >= ${minWeek} ORDER BY date ASC`,
      sql`SELECT * FROM cycling_sessions WHERE week >= ${minWeek} ORDER BY date ASC`,
      sql`SELECT * FROM weights_sections ORDER BY id ASC`,
      sql`SELECT * FROM weights_sessions WHERE week >= ${minWeek} ORDER BY date ASC`,
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
      movingTime: r.moving_time,
      resistanceLevel: r.resistance_level || '',
      avgHeartRate: r.avg_heart_rate,
      avgSpeed: r.avg_speed !== null ? Number(r.avg_speed) : null,
      elevationGain: r.elevation_gain,
      maxElevation: r.max_elevation,
      calories: r.calories,
      rpe: r.rpe,
      notes: r.notes || '',
    }));

    // Group weight sessions by section_key (eliminates N+1)
    const sessionsBySection = new Map<string, typeof weightSessionRows>();
    for (const s of weightSessionRows) {
      const key = s.section_key as string;
      if (!sessionsBySection.has(key)) sessionsBySection.set(key, []);
      sessionsBySection.get(key)!.push(s);
    }

    const weights: WeightsSection[] = sectionRows.map((section) => ({
      sectionKey: section.section_key,
      title: section.title,
      dayOfWeek: section.day_of_week,
      location: section.location,
      exerciseNames: (section.exercises as { name: string }[]).map((e) => e.name),
      sessions: (sessionsBySection.get(section.section_key as string) || []).map((s) => ({
        week: s.week,
        date: s.date instanceof Date ? s.date.toISOString().split('T')[0] : String(s.date).split('T')[0],
        exercises: s.exercises as Record<string, { weight: string; sets: (number | null)[]; total: number | null }>,
      })),
    }));
    const adaptations = generateAdaptations(running, cycling, weights, currentWeek);
    return NextResponse.json({ week: currentWeek, adaptations });
  } catch (error) {
    console.error('Failed to generate adaptations:', error);
    return NextResponse.json({ error: 'Failed to generate adaptations' }, { status: 500 });
  }
}
