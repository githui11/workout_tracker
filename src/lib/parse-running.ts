import { RunningSession } from './types';

function num(val: string | undefined): number | null {
  if (!val || val.trim() === '') return null;
  const n = parseFloat(val);
  return isNaN(n) ? null : n;
}

function str(val: string | undefined): string {
  return val?.trim() || '';
}

export function parseRunning(rows: string[][]): RunningSession[] {
  if (rows.length < 2) return [];

  // Row 0 is header, data starts at row 1
  // Sheet row numbers are 1-indexed (header = row 1, first data = row 2)
  return rows.slice(1).map((row, idx) => ({
    sheetRow: idx + 2,
    week: parseInt(row[0]) || 0,
    date: str(row[1]),
    day: str(row[2]),
    time: str(row[3]),
    phase: str(row[4]),
    workoutType: str(row[5]),
    targetDistance: parseFloat(row[6]) || 0,
    targetPace: str(row[7]),
    actualDistance: num(row[8]),
    actualPace: row[9]?.trim() || null,
    duration: num(row[10]),
    movingTime: row[11]?.trim() || null,
    elevationGain: num(row[12]),
    maxElevation: num(row[13]),
    warmupDone: str(row[14]),
    howLegsFeel: str(row[15]),
    notes: str(row[16]),
  }));
}
