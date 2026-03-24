import { CyclingSession } from './types';

function num(val: string | undefined): number | null {
  if (!val || val.trim() === '') return null;
  const n = parseFloat(val);
  return isNaN(n) ? null : n;
}

function str(val: string | undefined): string {
  return val?.trim() || '';
}

export function parseCycling(rows: string[][]): CyclingSession[] {
  if (rows.length < 2) return [];

  return rows.slice(1).map((row, idx) => ({
    sheetRow: idx + 2,
    week: parseInt(row[0]) || 0,
    date: str(row[1]),
    day: str(row[2]),
    time: str(row[3]),
    targetDuration: parseFloat(row[4]) || 0,
    actualDuration: num(row[5]),
    movingTime: row[6]?.trim() || null,
    resistanceLevel: str(row[7]),
    avgHeartRate: num(row[8]),
    avgSpeed: num(row[9]),
    elevationGain: num(row[10]),
    maxElevation: num(row[11]),
    calories: num(row[12]),
    rpe: num(row[13]),
    notes: str(row[14]),
  }));
}
