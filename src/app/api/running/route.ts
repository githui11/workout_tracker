import { NextResponse } from 'next/server';
import { readTab, updateCells } from '@/lib/sheets';
import { parseRunning } from '@/lib/parse-running';

export async function GET() {
  try {
    const rows = await readTab('Running');
    const sessions = parseRunning(rows);
    return NextResponse.json(sessions);
  } catch (error) {
    console.error('Failed to fetch running data:', error);
    return NextResponse.json({ error: 'Failed to fetch running data' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { date, actualDistance, actualPace, duration, movingTime, elevationGain, maxElevation, warmupDone, howLegsFeel, notes } = body;

    // Find the row by date
    const rows = await readTab('Running');
    const sessions = parseRunning(rows);
    const session = sessions.find((s) => s.date === date);

    if (!session) {
      return NextResponse.json({ error: `No session found for date ${date}` }, { status: 404 });
    }

    // Update columns I through Q (9th to 17th columns, 0-indexed: 8-16)
    // I=Actual Distance, J=Actual Pace, K=Duration, L=Moving Time,
    // M=Elevation Gain, N=Max Elevation, O=Warm-up, P=How Legs Feel, Q=Notes
    const row = session.sheetRow;
    await updateCells('Running', `I${row}:Q${row}`, [
      [
        actualDistance ?? '',
        actualPace ?? '',
        duration ?? '',
        movingTime ?? '',
        elevationGain ?? '',
        maxElevation ?? '',
        warmupDone ?? '',
        howLegsFeel ?? '',
        notes ?? '',
      ],
    ]);

    return NextResponse.json({ success: true, row });
  } catch (error) {
    console.error('Failed to update running data:', error);
    return NextResponse.json({ error: 'Failed to update running data' }, { status: 500 });
  }
}
