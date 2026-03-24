import { NextResponse } from 'next/server';
import { readTab } from '@/lib/sheets';
import { parseRunning } from '@/lib/parse-running';
import { parseCycling } from '@/lib/parse-cycling';
import { parseWeights } from '@/lib/parse-weights';
import { buildWeeklySummary, getCurrentWeek } from '@/lib/aggregations';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const weekParam = searchParams.get('week');
    const week = weekParam ? parseInt(weekParam) : getCurrentWeek();

    const [runningRows, cyclingRows, weightsRows] = await Promise.all([
      readTab('Running'),
      readTab('Cycling'),
      readTab('Weights'),
    ]);

    const running = parseRunning(runningRows);
    const cycling = parseCycling(cyclingRows);
    const weights = parseWeights(weightsRows);

    const summary = buildWeeklySummary(running, cycling, weights, week);

    return NextResponse.json(summary);
  } catch (error) {
    console.error('Failed to build summary:', error);
    return NextResponse.json({ error: 'Failed to build summary' }, { status: 500 });
  }
}
