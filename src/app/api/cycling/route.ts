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
    const { date, actualDuration, notes } = body;

    const result = await sql`
      UPDATE cycling_sessions SET
        actual_duration = ${actualDuration || null},
        notes = ${notes || null}
      WHERE date = ${date}
      RETURNING id`;

    if (result.length === 0) {
      const defaults = await getCyclingDefaults(sql);
      const week = getWeekForDate(date);
      const day = getDayName(date);
      await sql`
        INSERT INTO cycling_sessions
          (week, date, day, time, target_duration, actual_duration, notes)
        VALUES
          (${week}, ${date}, ${day}, 'Ad-hoc', ${defaults.targetDuration},
           ${actualDuration || null}, ${notes || null})`;
    }

    const adaptations = await applyAdaptations(sql, 'cycling', date);

    return NextResponse.json({ success: true, adaptations });
  } catch (error) {
    console.error('Failed to update cycling data:', error);
    return NextResponse.json({ error: 'Failed to update cycling data' }, { status: 500 });
  }
}
