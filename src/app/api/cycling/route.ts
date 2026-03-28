import { NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';
import { getCyclingDefaults, getDayName, getWeekForDate } from '@/lib/defaults';
import { applyAdaptations } from '@/lib/adapt';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapRow(r: Record<string, any>) {
  return {
    week: r.week,
    date: r.date instanceof Date ? r.date.toISOString().split('T')[0] : String(r.date).split('T')[0],
    day: r.day,
    time: r.time,
    targetDuration: r.target_duration,
    actualDuration: r.actual_duration ?? null,
    howLegsFeel: r.how_legs_feel ?? '',
    notes: r.notes ?? '',
  };
}

export async function GET() {
  try {
    const sql = neon(process.env.DATABASE_URL!);
    const rows = await sql`SELECT * FROM cycling_sessions ORDER BY date ASC`;
    return NextResponse.json(rows.map(mapRow));
  } catch (error) {
    console.error('Failed to fetch cycling data:', error);
    return NextResponse.json({ error: 'Failed to fetch cycling data' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const sql = neon(process.env.DATABASE_URL!);
    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date');
    if (!date) return NextResponse.json({ error: 'date required' }, { status: 400 });

    const rows = await sql`SELECT time FROM cycling_sessions WHERE date = ${date}`;
    if (rows[0]?.time === 'Ad-hoc') {
      await sql`DELETE FROM cycling_sessions WHERE date = ${date}`;
    } else {
      await sql`UPDATE cycling_sessions SET actual_duration = NULL, how_legs_feel = NULL, notes = NULL WHERE date = ${date}`;
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete cycling session:', error);
    return NextResponse.json({ error: 'Failed to delete' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const sql = neon(process.env.DATABASE_URL!);
    const body = await request.json();
    const { date, actualDuration, howLegsFeel, notes } = body;

    const result = await sql`
      UPDATE cycling_sessions SET
        actual_duration = ${actualDuration || null},
        how_legs_feel = ${howLegsFeel || null},
        notes = ${notes || null}
      WHERE date = ${date}
      RETURNING id`;

    if (result.length === 0) {
      const defaults = await getCyclingDefaults(sql);
      const week = getWeekForDate(date);
      const day = getDayName(date);
      await sql`
        INSERT INTO cycling_sessions
          (week, date, day, time, target_duration, actual_duration, how_legs_feel, notes)
        VALUES
          (${week}, ${date}, ${day}, 'Ad-hoc', ${defaults.targetDuration},
           ${actualDuration || null}, ${howLegsFeel || null}, ${notes || null})`;
    }

    const adaptations = await applyAdaptations(sql, 'cycling', date);

    return NextResponse.json({ success: true, adaptations });
  } catch (error) {
    console.error('Failed to update cycling data:', error);
    return NextResponse.json({ error: 'Failed to update cycling data' }, { status: 500 });
  }
}
