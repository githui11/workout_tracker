import { NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';
import { getRunningDefaults, getDayName, getWeekForDate } from '@/lib/defaults';
import { applyAdaptations } from '@/lib/adapt';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapRow(r: Record<string, any>) {
  return {
    week: r.week,
    date: r.date,
    day: r.day,
    time: r.time,
    phase: r.phase,
    workoutType: r.workout_type,
    targetDistance: r.target_distance,
    targetPace: r.target_pace,
    actualDistance: r.actual_distance ?? null,
    actualPace: r.actual_pace ?? null,
    duration: r.duration ?? null,
    movingTime: r.moving_time ?? null,
    elevationGain: r.elevation_gain ?? null,
    maxElevation: r.max_elevation ?? null,
    warmupDone: r.warmup_done ?? '',
    howLegsFeel: r.how_legs_feel ?? '',
    notes: r.notes ?? '',
  };
}

export async function GET() {
  try {
    const sql = neon(process.env.DATABASE_URL!);
    const rows = await sql`SELECT * FROM running_sessions ORDER BY date ASC`;
    return NextResponse.json(rows.map(mapRow));
  } catch (error) {
    console.error('Failed to fetch running data:', error);
    return NextResponse.json({ error: 'Failed to fetch running data' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const sql = neon(process.env.DATABASE_URL!);
    const body = await request.json();
    const { date, actualDistance, actualPace, duration, movingTime, elevationGain, maxElevation, warmupDone, howLegsFeel, notes } = body;

    // Try UPDATE first
    const result = await sql`
      UPDATE running_sessions SET
        actual_distance = ${actualDistance || null},
        actual_pace = ${actualPace || null},
        duration = ${duration || null},
        moving_time = ${movingTime || null},
        elevation_gain = ${elevationGain || null},
        max_elevation = ${maxElevation || null},
        warmup_done = ${warmupDone || null},
        how_legs_feel = ${howLegsFeel || null},
        notes = ${notes || null}
      WHERE date = ${date}
      RETURNING id`;

    // If no existing row, INSERT an ad-hoc session
    if (result.length === 0) {
      const defaults = await getRunningDefaults(sql);
      const week = getWeekForDate(date);
      const day = getDayName(date);
      await sql`
        INSERT INTO running_sessions
          (week, date, day, time, phase, workout_type, target_distance, target_pace,
           actual_distance, actual_pace, duration, moving_time, elevation_gain, max_elevation,
           warmup_done, how_legs_feel, notes)
        VALUES
          (${week}, ${date}, ${day}, 'Ad-hoc', ${defaults.phase}, ${defaults.workoutType},
           ${defaults.targetDistance}, ${defaults.targetPace},
           ${actualDistance || null}, ${actualPace || null}, ${duration || null},
           ${movingTime || null}, ${elevationGain || null}, ${maxElevation || null},
           ${warmupDone || null}, ${howLegsFeel || null}, ${notes || null})`;
    }

    // Apply adaptations to next session
    const adaptations = await applyAdaptations(sql, 'running', date);

    return NextResponse.json({ success: true, adaptations });
  } catch (error) {
    console.error('Failed to update running data:', error);
    return NextResponse.json({ error: 'Failed to update running data' }, { status: 500 });
  }
}
