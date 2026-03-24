import { NextResponse } from 'next/server';
import { readTab, batchUpdate } from '@/lib/sheets';
import { parseWeights, getColumnLetters } from '@/lib/parse-weights';

export async function GET() {
  try {
    const rows = await readTab('Weights');
    const sections = parseWeights(rows);
    return NextResponse.json(sections);
  } catch (error) {
    console.error('Failed to fetch weights data:', error);
    return NextResponse.json({ error: 'Failed to fetch weights data' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { sectionKey, date, exercises } = body as {
      sectionKey: string;
      date: string;
      exercises: Record<string, { weight?: string; sets: (number | null)[] }>;
    };

    // Re-read the sheet to find exact row and column positions
    const rows = await readTab('Weights');
    const sections = parseWeights(rows);
    const section = sections.find((s) => s.sectionKey === sectionKey);

    if (!section) {
      return NextResponse.json({ error: `Section ${sectionKey} not found` }, { status: 404 });
    }

    const session = section.sessions.find((s) => s.date === date);
    if (!session) {
      return NextResponse.json({ error: `No session found for date ${date} in ${sectionKey}` }, { status: 404 });
    }

    // Find the header row for this section (it's the row before the first data row, or we re-scan)
    // The header row is at sheetRow - (session index in section + 1)
    const sessionIdx = section.sessions.indexOf(session);
    const headerSheetRow = section.sessions[0].sheetRow - 1;
    const headerRow = rows[headerSheetRow - 1]; // Convert to 0-indexed

    const colLetters = getColumnLetters(headerRow);
    const updates: { range: string; values: (string | number)[][] }[] = [];
    const row = session.sheetRow;

    for (const [exerciseName, data] of Object.entries(exercises)) {
      const cols = colLetters[exerciseName];
      if (!cols) continue;

      // Update weight if provided and column exists
      if (data.weight && cols.weightCol) {
        updates.push({
          range: `${cols.weightCol}${row}`,
          values: [[data.weight]],
        });
      }

      // Update sets (S1-S4)
      if (data.sets && cols.setCols.length > 0) {
        const firstSetCol = cols.setCols[0];
        const lastSetCol = cols.setCols[cols.setCols.length - 1];
        updates.push({
          range: `${firstSetCol}${row}:${lastSetCol}${row}`,
          values: [data.sets.map((s) => s ?? '')],
        });
      }
    }

    if (updates.length > 0) {
      await batchUpdate('Weights', updates);
    }

    return NextResponse.json({ success: true, row, updatesCount: updates.length });
  } catch (error) {
    console.error('Failed to update weights data:', error);
    return NextResponse.json({ error: 'Failed to update weights data' }, { status: 500 });
  }
}
