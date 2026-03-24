import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function GET() {
  try {
    const sql = getDb();
    const rows = await sql`SELECT * FROM cycling_sessions ORDER BY date ASC`;
    return NextResponse.json(rows);
  } catch (error) {
    console.error('Failed to fetch cycling data:', error);
    return NextResponse.json({ error: 'Failed to fetch cycling data' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const sql = getDb();
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
      return NextResponse.json({ error: 'No session found for that date' }, { status: 404 });
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to update cycling data:', error);
    return NextResponse.json({ error: 'Failed to update cycling data' }, { status: 500 });
  }
}
