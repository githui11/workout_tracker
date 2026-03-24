import { WeightsSection, WeightsSession, WeightsExerciseData } from './types';

const SECTION_PATTERNS: { key: string; pattern: RegExp }[] = [
  { key: 'push1', pattern: /PUSH 1/i },
  { key: 'pull1', pattern: /PULL 1/i },
  { key: 'legs1', pattern: /LEGS 1/i },
  { key: 'push2', pattern: /PUSH 2/i },
  { key: 'pull2', pattern: /PULL 2/i },
  { key: 'legs2', pattern: /LEGS 2/i },
];

function extractSectionMeta(title: string): { dayOfWeek: string; location: string } {
  const dayMatch = title.match(/(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)s?/i);
  const locMatch = title.match(/(Juja|Kileleshwa)/i);
  return {
    dayOfWeek: dayMatch ? dayMatch[1] : '',
    location: locMatch ? locMatch[1] : '',
  };
}

interface ColumnMap {
  exerciseName: string;
  weightCol: number | null; // null for BW exercises
  setCols: number[];        // indices for S1-S4
  totalCol: number;
}

function buildColumnMap(headerRow: string[]): ColumnMap[] {
  const exercises: ColumnMap[] = [];
  const seen = new Set<string>();

  for (let i = 2; i < headerRow.length; i++) {
    const cell = headerRow[i]?.trim();
    if (!cell || cell === 'Notes') continue;

    // Extract exercise name from header like "Dips S1" or "DB Rows (stacked) Wt"
    const wtMatch = cell.match(/^(.+?)\s+Wt$/);
    const setMatch = cell.match(/^(.+?)\s+S(\d)$/);
    const totalMatch = cell.match(/^(.+?)\s+Total$/);

    if (wtMatch) {
      const name = wtMatch[1];
      if (!seen.has(name)) {
        seen.add(name);
        exercises.push({ exerciseName: name, weightCol: i, setCols: [], totalCol: -1 });
      }
    } else if (setMatch) {
      const name = setMatch[1];
      if (!seen.has(name)) {
        seen.add(name);
        exercises.push({ exerciseName: name, weightCol: null, setCols: [], totalCol: -1 });
      }
      const ex = exercises.find((e) => e.exerciseName === name);
      if (ex) ex.setCols.push(i);
    } else if (totalMatch) {
      const name = totalMatch[1];
      const ex = exercises.find((e) => e.exerciseName === name);
      if (ex) ex.totalCol = i;
    }
  }

  return exercises;
}

export function parseWeights(rows: string[][]): WeightsSection[] {
  const sections: WeightsSection[] = [];
  let i = 0;

  // Skip instruction rows (rows 0-3)
  while (i < rows.length && i < 4) i++;

  while (i < rows.length) {
    const firstCell = rows[i]?.[0]?.trim() || '';

    // Check if this is a section title row
    const sectionMatch = SECTION_PATTERNS.find((sp) => sp.pattern.test(firstCell));
    if (!sectionMatch) {
      i++;
      continue;
    }

    const title = firstCell;
    const { dayOfWeek, location } = extractSectionMeta(title);
    const titleSheetRow = i + 1; // 1-indexed

    // Next row is header
    i++;
    if (i >= rows.length) break;
    const headerRow = rows[i];
    const columnMap = buildColumnMap(headerRow);

    const section: WeightsSection = {
      title,
      sectionKey: sectionMatch.key,
      dayOfWeek,
      location,
      exerciseNames: columnMap.map((c) => c.exerciseName),
      sessions: [],
    };

    // Data rows follow until blank row or next section
    i++;
    while (i < rows.length) {
      const row = rows[i];
      const cell0 = row?.[0]?.trim() || '';

      // Blank row or next section title = end of this section
      if (!cell0 || SECTION_PATTERNS.some((sp) => sp.pattern.test(cell0))) break;

      const week = parseInt(cell0);
      if (isNaN(week)) { i++; continue; }

      const exercises: Record<string, WeightsExerciseData> = {};

      for (const col of columnMap) {
        const weight = col.weightCol !== null ? (row[col.weightCol]?.trim() || '') : 'BW';
        const sets = col.setCols.map((ci) => {
          const v = row[ci]?.trim();
          if (!v || v === '') return null;
          const n = parseInt(v);
          return isNaN(n) ? null : n;
        });
        const totalVal = row[col.totalCol]?.trim();
        const total = totalVal && totalVal !== '' ? parseInt(totalVal) : null;

        exercises[col.exerciseName] = { weight, sets, total: isNaN(total as number) ? null : total };
      }

      section.sessions.push({
        sheetRow: i + 1, // 1-indexed
        week,
        date: row[1]?.trim() || '',
        exercises,
      });

      i++;
    }

    sections.push(section);
  }

  return sections;
}

/**
 * Find the column letter(s) for a given column index (0-based).
 * Used when writing back to the sheet.
 */
export function colLetter(idx: number): string {
  let result = '';
  let n = idx + 1;
  while (n > 0) {
    n--;
    result = String.fromCharCode(65 + (n % 26)) + result;
    n = Math.floor(n / 26);
  }
  return result;
}

/**
 * Re-parse header to get column indices for writing.
 * Returns a map: exerciseName -> { weightCol, setCols, totalCol } as column letters.
 */
export function getColumnLetters(headerRow: string[]): Record<string, { weightCol: string | null; setCols: string[]; totalCol: string }> {
  const map = buildColumnMap(headerRow);
  const result: Record<string, { weightCol: string | null; setCols: string[]; totalCol: string }> = {};
  for (const col of map) {
    result[col.exerciseName] = {
      weightCol: col.weightCol !== null ? colLetter(col.weightCol) : null,
      setCols: col.setCols.map(colLetter),
      totalCol: colLetter(col.totalCol),
    };
  }
  return result;
}
