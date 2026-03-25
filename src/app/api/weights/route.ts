import { NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';
import { getWeightsDefaults, getWeekForDate } from '@/lib/defaults';
import { applyAdaptations } from '@/lib/adapt';

export async function GET() {
  try {
    const sql = neon(process.env.DATABASE_URL!);

    const sections = await sql`
      SELECT * FROM weights_sections ORDER BY id ASC
    `;

    const result = [];
    for (const section of sections) {
      const sessions = await sql`
        SELECT * FROM weights_sessions
        WHERE section_key = ${section.section_key}
        ORDER BY date ASC
      `;

      result.push({
        sectionKey: section.section_key,
        title: section.title,
        dayOfWeek: section.day_of_week,
        location: section.location,
        exerciseNames: (section.exercises as { name: string }[]).map((e) => e.name),
        sessions: sessions.map((s) => ({
          week: s.week,
          date: s.date instanceof Date ? s.date.toISOString().split('T')[0] : String(s.date).split('T')[0],
          exercises: s.exercises as Record<string, { weight: string; sets: (number | null)[]; total: number | null }>,
        })),
      });
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('Failed to fetch weights data:', error);
    return NextResponse.json({ error: 'Failed to fetch weights data' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const sql = neon(process.env.DATABASE_URL!);
    const body = await request.json();
    const { sectionKey, date, exercises } = body as {
      sectionKey: string;
      date: string;
      exercises: Record<string, { weight?: string; sets: (number | null)[] }>;
    };

    // Fetch existing session exercises
    const existing = await sql`
      SELECT exercises FROM weights_sessions
      WHERE section_key = ${sectionKey} AND date = ${date}
    `;

    let existingExercises: Record<string, { weight: string; sets: (number | null)[]; total: number | null }>;

    if (existing.length === 0) {
      // Create ad-hoc session
      const defaults = await getWeightsDefaults(sql, sectionKey);
      if (!defaults) {
        return NextResponse.json({ error: `Unknown section: ${sectionKey}` }, { status: 404 });
      }
      existingExercises = defaults;
      const week = getWeekForDate(date);
      // Merge submitted data before inserting
      for (const [name, data] of Object.entries(exercises)) {
        const sets = data.sets;
        const total = sets.reduce((sum, s) => (sum as number) + (s || 0), 0) as number;
        existingExercises[name] = {
          weight: data.weight || existingExercises[name]?.weight || '',
          sets,
          total: sets.some((s) => s !== null) ? total : null,
        };
      }
      await sql`
        INSERT INTO weights_sessions (section_key, week, date, exercises)
        VALUES (${sectionKey}, ${week}, ${date}, ${JSON.stringify(existingExercises)})`;
    } else {
      existingExercises = existing[0].exercises as typeof existingExercises;
      // Merge updates
      for (const [name, data] of Object.entries(exercises)) {
        const sets = data.sets;
        const total = sets.reduce((sum, s) => (sum as number) + (s || 0), 0) as number;
        existingExercises[name] = {
          weight: data.weight || existingExercises[name]?.weight || '',
          sets,
          total: sets.some((s) => s !== null) ? total : null,
        };
      }
      await sql`
        UPDATE weights_sessions
        SET exercises = ${JSON.stringify(existingExercises)}
        WHERE section_key = ${sectionKey} AND date = ${date}`;
    }

    const adaptations = await applyAdaptations(sql, 'weights', date, sectionKey);

    return NextResponse.json({ success: true, adaptations });
  } catch (error) {
    console.error('Failed to update weights data:', error);
    return NextResponse.json({ error: 'Failed to update weights data' }, { status: 500 });
  }
}
