import { NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';

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

    if (existing.length === 0) {
      return NextResponse.json({ error: `No session found for date ${date} in ${sectionKey}` }, { status: 404 });
    }

    const existingExercises = existing[0].exercises as Record<string, { weight: string; sets: (number | null)[]; total: number | null }>;

    // Merge updates
    const updated = { ...existingExercises };
    for (const [name, data] of Object.entries(exercises)) {
      const sets = data.sets;
      const total = sets.reduce((sum, s) => (sum as number) + (s || 0), 0) as number;
      updated[name] = {
        weight: data.weight || updated[name]?.weight || '',
        sets,
        total: sets.some((s) => s !== null) ? total : null,
      };
    }

    await sql`
      UPDATE weights_sessions
      SET exercises = ${JSON.stringify(updated)}
      WHERE section_key = ${sectionKey} AND date = ${date}
    `;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to update weights data:', error);
    return NextResponse.json({ error: 'Failed to update weights data' }, { status: 500 });
  }
}
