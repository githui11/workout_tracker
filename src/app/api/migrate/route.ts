import { NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';

/**
 * GET /api/migrate — Adds missing Friday cycling sessions without touching existing data.
 */
export async function GET() {
  try {
    const sql = neon(process.env.DATABASE_URL!);

    const START = new Date('2026-03-24');
    const END = new Date('2026-12-31');

    function weekNum(d: Date) {
      return Math.floor((d.getTime() - START.getTime()) / (7 * 24 * 60 * 60 * 1000)) + 1;
    }

    let inserted = 0;
    let skipped = 0;

    for (let d = new Date(START); d <= END; d.setDate(d.getDate() + 1)) {
      const dow = d.getDay(); // 5 = Friday
      if (dow !== 5) continue;

      const wk = weekNum(d);
      const isDeload = wk % 4 === 0;
      const base = 45 + (wk - 1) * 1.0;
      let target = Math.min(Math.round(base), 90);
      if (isDeload) target = Math.round(target * 0.85);
      const note = isDeload ? 'DELOAD - easy spin' : 'Short Friday ride';

      const dateStr = d.toISOString().split('T')[0];

      const result = await sql`
        INSERT INTO cycling_sessions (week, date, day, time, target_duration, notes)
        VALUES (${wk}, ${dateStr}, 'Friday', 'Evening', ${target}, ${note})
        ON CONFLICT (date) DO NOTHING
      `;

      // neon returns affected row count via rowCount
      if ((result as unknown as { rowCount: number }).rowCount > 0) {
        inserted++;
      } else {
        skipped++;
      }
    }

    return NextResponse.json({
      success: true,
      message: `Friday cycling sessions added`,
      inserted,
      skipped,
    });
  } catch (error) {
    console.error('Migration failed:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
