import { NextResponse } from 'next/server';
import { readTab, updateCells } from '@/lib/sheets';
import { parseCycling } from '@/lib/parse-cycling';

export async function GET() {
  try {
    const rows = await readTab('Cycling');
    const sessions = parseCycling(rows);
    return NextResponse.json(sessions);
  } catch (error) {
    console.error('Failed to fetch cycling data:', error);
    return NextResponse.json({ error: 'Failed to fetch cycling data' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { date, actualDuration, movingTime, resistanceLevel, avgHeartRate, avgSpeed, elevationGain, maxElevation, calories, rpe, notes } = body;

    const rows = await readTab('Cycling');
    const sessions = parseCycling(rows);
    const session = sessions.find((s) => s.date === date);

    if (!session) {
      return NextResponse.json({ error: `No session found for date ${date}` }, { status: 404 });
    }

    // Update columns F through O (6th to 15th, 0-indexed: 5-14)
    // F=Actual Duration, G=Moving Time, H=Resistance, I=Avg HR,
    // J=Avg Speed, K=Elevation Gain, L=Max Elevation, M=Calories, N=RPE, O=Notes
    const row = session.sheetRow;
    await updateCells('Cycling', `F${row}:O${row}`, [
      [
        actualDuration ?? '',
        movingTime ?? '',
        resistanceLevel ?? '',
        avgHeartRate ?? '',
        avgSpeed ?? '',
        elevationGain ?? '',
        maxElevation ?? '',
        calories ?? '',
        rpe ?? '',
        notes ?? '',
      ],
    ]);

    return NextResponse.json({ success: true, row });
  } catch (error) {
    console.error('Failed to update cycling data:', error);
    return NextResponse.json({ error: 'Failed to update cycling data' }, { status: 500 });
  }
}
