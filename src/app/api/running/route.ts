import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function GET() {
  try {
    const sql = getDb();
    const rows = await sql`SELECT * FROM running_sessions ORDER BY date ASC`;
    return NextResponse.json(rows);
  } catch (error) {
    console.error('Failed to fetch running data:', error);
    return NextResponse.json({ error: 'Failed to fetch running data' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const sql = getDb();
    const body = await request.json();
    const { date, actualDistance, actualPace, duration, movingTime, elevationGain, maxElevation, warmupDone, howLegsFeel, notes } = body;

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

    if (result.length === 0) {
      return NextResponse.json({ error: 'No session found for that date' }, { status: 404 });
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to update running data:', error);
    return NextResponse.json({ error: 'Failed to update running data' }, { status: 500 });
  }
}
