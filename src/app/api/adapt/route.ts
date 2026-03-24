import { NextResponse } from 'next/server';
import { readTab } from '@/lib/sheets';
import { parseRunning } from '@/lib/parse-running';
import { parseCycling } from '@/lib/parse-cycling';
import { parseWeights } from '@/lib/parse-weights';
import { generateAdaptations } from '@/lib/adapt';
import { getCurrentWeek } from '@/lib/aggregations';

export async function GET() {
  try {
    const [runningRows, cyclingRows, weightsRows] = await Promise.all([
      readTab('Running'),
      readTab('Cycling'),
      readTab('Weights'),
    ]);

    const running = parseRunning(runningRows);
    const cycling = parseCycling(cyclingRows);
    const weights = parseWeights(weightsRows);
    const currentWeek = getCurrentWeek();

    const adaptations = generateAdaptations(running, cycling, weights, currentWeek);

    return NextResponse.json({ week: currentWeek, adaptations });
  } catch (error) {
    console.error('Failed to generate adaptations:', error);
    return NextResponse.json({ error: 'Failed to generate adaptations' }, { status: 500 });
  }
}
