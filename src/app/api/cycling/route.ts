import { NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';
import { getCyclingDefaults, getDayName, getWeekForDate } from '@/lib/defaults';
import { applyAdaptations } from '@/lib/adapt';

export async function GET() {
  try {
    const sql = neon(process.env.DATABASE_URL!);
    const rows = await sql`SELECT * FROM cycling_sessions ORDER BY date ASC`;
    return NextResponse.json(rows);
  } catch (error) {
    console.error('Failed to fetch cycling data:', error);
    return NextResponse.json({ error: 'Failed to fetch cycling data' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const sql = neon(process.env.DATABASE_URL!);
    const body = await request.json();
    const { date, actualDuration, movingTime, resistanceLevel, avgHeartRate, avgSpeed, elevationGain, maxElevation, calories, rpe, notes } = body;

    const result = await sql`
      UPDATE cycling_sessions SET
        actual_duration = ${actualDuration || null},
        moving_time = ${movingTime || null},
        resistance_level = ${resistanceLevel || null},
        avg_heart_rate = ${avgHeartRate || null},
        avg_speed = ${avgSpeed || null},
        elevation_gain = ${elevationGain || null},
        max_elevation = ${maxElevation || null},
        calories = ${calories || null},
        rpe = ${rpe || null},
        notes = ${notes || null}
      WHERE date = ${date}
      RETURNING id`;

    if (result.length === 0) {
      const defaults = await getCyclingDefaults(sql);
      const week = getWeekForDate(date);
      const day = getDayName(date);
      await sql`
        INSERT INTO cycling_sessions
          (week, date, day, time, target_duration,
           actual_duration, moving_time, resistance_level, avg_heart_rate, avg_speed,
           elevation_gain, max_elevation, calories, rpe, notes)
        VALUES
          (${week}, ${date}, ${day}, 'Ad-hoc', ${defaults.targetDuration},
           ${actualDuration || null}, ${movingTime || null}, ${resistanceLevel || null},
           ${avgHeartRate || null}, ${avgSpeed || null}, ${elevationGain || null},
           ${maxElevation || null}, ${calories || null}, ${rpe || null}, ${notes || null})`;
    }

    const adaptations = await applyAdaptations(sql, 'cycling', date);

    return NextResponse.json({ success: true, adaptations });
  } catch (error) {
    console.error('Failed to update cycling data:', error);
    return NextResponse.json({ error: 'Failed to update cycling data' }, { status: 500 });
  }
}
