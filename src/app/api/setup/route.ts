import { NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';

/**
 * GET /api/setup — Creates tables and seeds the training plan.
 * Run once after creating the database.
 */
export async function GET() {
  try {
    const sql = neon(process.env.DATABASE_URL!);

    // Create tables
    await sql`
      CREATE TABLE IF NOT EXISTS running_sessions (
        id SERIAL PRIMARY KEY,
        week INT NOT NULL,
        date DATE UNIQUE NOT NULL,
        day VARCHAR(10) NOT NULL,
        time VARCHAR(10) DEFAULT 'Morning',
        phase VARCHAR(50),
        workout_type VARCHAR(30),
        target_distance DECIMAL(5,1),
        target_pace VARCHAR(20),
        actual_distance DECIMAL(5,1),
        actual_pace VARCHAR(20),
        duration DECIMAL(5,1),
        moving_time VARCHAR(20),
        elevation_gain INT,
        max_elevation INT,
        warmup_done VARCHAR(5),
        how_legs_feel VARCHAR(20),
        notes TEXT
      )`;

    await sql`
      CREATE TABLE IF NOT EXISTS cycling_sessions (
        id SERIAL PRIMARY KEY,
        week INT NOT NULL,
        date DATE UNIQUE NOT NULL,
        day VARCHAR(10) NOT NULL,
        time VARCHAR(10) DEFAULT 'Evening',
        target_duration INT,
        actual_duration INT,
        moving_time VARCHAR(20),
        resistance_level VARCHAR(20),
        avg_heart_rate INT,
        avg_speed DECIMAL(5,1),
        elevation_gain INT,
        max_elevation INT,
        calories INT,
        rpe INT,
        notes TEXT
      )`;

    await sql`
      CREATE TABLE IF NOT EXISTS weights_sections (
        id SERIAL PRIMARY KEY,
        section_key VARCHAR(10) UNIQUE NOT NULL,
        title TEXT NOT NULL,
        day_of_week VARCHAR(15),
        location VARCHAR(20),
        exercises JSONB NOT NULL
      )`;

    await sql`
      CREATE TABLE IF NOT EXISTS weights_sessions (
        id SERIAL PRIMARY KEY,
        section_key VARCHAR(10) NOT NULL REFERENCES weights_sections(section_key),
        week INT NOT NULL,
        date DATE NOT NULL,
        exercises JSONB NOT NULL,
        UNIQUE(section_key, date)
      )`;

    // Seed running
    const START = new Date('2026-03-24');
    const END = new Date('2026-12-31');
    const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

    function weekNum(d: Date) {
      return Math.floor((d.getTime() - START.getTime()) / (7 * 24 * 60 * 60 * 1000)) + 1;
    }

    // Clear existing data
    await sql`DELETE FROM weights_sessions`;
    await sql`DELETE FROM weights_sections`;
    await sql`DELETE FROM cycling_sessions`;
    await sql`DELETE FROM running_sessions`;

    // --- RUNNING ---
    const runningRows: { week: number; date: string; day: string; phase: string; workoutType: string; targetDist: number; targetPace: string }[] = [];

    for (let d = new Date(START); d <= END; d.setDate(d.getDate() + 1)) {
      const dow = d.getDay(); // 0=Sun
      const jsDay = (dow + 6) % 7; // Convert to 0=Mon
      if (![0, 2, 4].includes(jsDay)) continue; // Mon, Wed, Fri

      const wk = weekNum(d);
      let phase: string, weekKm: number;

      if (wk <= 4) { phase = 'Phase 1: Foundation'; weekKm = 9.0; }
      else if (wk <= 14) { phase = 'Phase 2: Base Building'; weekKm = Math.min(9.0 * Math.pow(1.10, wk - 4), 25); }
      else if (wk <= 26) { phase = 'Phase 3: Marathon Build'; weekKm = Math.min(25 * Math.pow(1.05, wk - 14), 50); }
      else if (wk <= 36) { phase = 'Phase 4: Peak'; weekKm = Math.min(50 * Math.pow(1.02, wk - 26), 60); }
      else { phase = 'Phase 5: Taper'; weekKm = Math.max(60 * Math.pow(0.85, wk - 36), 30); }

      let workout: string, dist: number, pace: string;

      if (jsDay === 0) {
        workout = 'Easy Run';
        dist = Math.round(weekKm * 0.25 * 10) / 10;
        pace = wk <= 4 ? '6:30 - 6:45' : wk <= 14 ? '6:15 - 6:30' : '6:00 - 6:20';
      } else if (jsDay === 2) {
        if (wk <= 4) { workout = 'Hill Strength'; dist = Math.round(weekKm * 0.30 * 10) / 10; pace = '6:00 - 6:30'; }
        else if (wk <= 14) { workout = 'Interval Run'; dist = Math.round(weekKm * 0.28 * 10) / 10; pace = '5:45 - 6:15'; }
        else if (wk <= 26) { workout = 'Tempo Run'; dist = Math.round(weekKm * 0.25 * 10) / 10; pace = '5:30 - 5:50'; }
        else { workout = 'Marathon Pace Run'; dist = Math.round(weekKm * 0.25 * 10) / 10; pace = '5:20 - 5:40'; }
      } else {
        workout = 'Long Run';
        if (wk <= 4) { dist = Math.round(weekKm * 0.45 * 10) / 10; pace = '6:15 - 6:30'; }
        else if (wk <= 14) { dist = Math.round(weekKm * 0.47 * 10) / 10; pace = '6:00 - 6:20'; }
        else if (wk <= 26) { dist = Math.round(weekKm * 0.50 * 10) / 10; pace = '5:50 - 6:15'; }
        else if (wk <= 36) { dist = Math.min(Math.round(weekKm * 0.53 * 10) / 10, 32); pace = '5:45 - 6:10'; }
        else { dist = Math.round(weekKm * 0.45 * 10) / 10; pace = '5:50 - 6:10'; }
      }

      const dateStr = d.toISOString().split('T')[0];
      runningRows.push({ week: wk, date: dateStr, day: DAYS[jsDay], phase, workoutType: workout, targetDist: dist, targetPace: pace });
    }

    for (const r of runningRows) {
      await sql`INSERT INTO running_sessions (week, date, day, time, phase, workout_type, target_distance, target_pace)
        VALUES (${r.week}, ${r.date}, ${r.day}, 'Morning', ${r.phase}, ${r.workoutType}, ${r.targetDist}, ${r.targetPace})
        ON CONFLICT (date) DO NOTHING`;
    }

    // --- CYCLING ---
    for (let d = new Date(START); d <= END; d.setDate(d.getDate() + 1)) {
      const dow = d.getDay();
      if (dow !== 6 && dow !== 0) continue; // Sat, Sun

      const wk = weekNum(d);
      const isDeload = wk % 4 === 0;
      let target: number, note: string;

      if (dow === 6) { // Saturday
        const base = 55 + (wk - 1) * 1.5;
        target = Math.min(Math.round(base), 120);
        if (isDeload) target = Math.round(target * 0.85);
        note = isDeload ? 'DELOAD - easy spin' : 'Moderate intensity';
      } else { // Sunday
        const base = 60 + (wk - 1) * 3.5;
        target = Math.min(Math.round(base), 195);
        if (isDeload) target = Math.round(target * 0.85);
        note = isDeload ? 'DELOAD - easy spin' : 'Zone 2 endurance - long ride';
      }

      const dateStr = d.toISOString().split('T')[0];
      const dayName = dow === 6 ? 'Saturday' : 'Sunday';

      await sql`INSERT INTO cycling_sessions (week, date, day, time, target_duration, notes)
        VALUES (${wk}, ${dateStr}, ${dayName}, 'Evening', ${target}, ${note})
        ON CONFLICT (date) DO NOTHING`;
    }

    // --- WEIGHTS SECTIONS ---
    const sections: { key: string; title: string; dayOfWeek: string; location: string; exercises: { name: string; bw: boolean; defaultWeight?: string }[] }[] = [
      { key: 'push1', title: 'PUSH 1 — Chest & Triceps (BW)', dayOfWeek: 'Saturday', location: 'Juja',
        exercises: [
          { name: 'Dips', bw: true },
          { name: 'Push-ups', bw: true },
          { name: 'Diamond Push-ups', bw: true },
          { name: 'Tricep Bench Dips', bw: true },
        ]},
      { key: 'pull1', title: 'PULL 1 — Back & Biceps', dayOfWeek: 'Sunday', location: 'Kileleshwa',
        exercises: [
          { name: 'DB Rows (stacked)', bw: false, defaultWeight: '25' },
          { name: 'Bicep Curls', bw: false, defaultWeight: '' },
          { name: 'Hammer Curls', bw: false, defaultWeight: '' },
          { name: 'Wrist Curls', bw: false, defaultWeight: '15' },
        ]},
      { key: 'legs1', title: 'LEGS 1', dayOfWeek: 'Monday', location: 'Kileleshwa',
        exercises: [
          { name: 'Bulgarian Split Squats', bw: false, defaultWeight: '' },
          { name: 'Goblet Squats', bw: false, defaultWeight: '15' },
          { name: 'Calf Raises', bw: false, defaultWeight: '15' },
        ]},
      { key: 'push2', title: 'PUSH 2 — Shoulders & Triceps', dayOfWeek: 'Tuesday', location: 'Kileleshwa',
        exercises: [
          { name: 'DB Shoulder Press', bw: false, defaultWeight: '' },
          { name: 'Lateral Raises', bw: false, defaultWeight: '' },
          { name: 'OH DB Extensions', bw: false, defaultWeight: '' },
          { name: 'DB Floor Press', bw: false, defaultWeight: '' },
        ]},
      { key: 'pull2', title: 'PULL 2 — Back & Biceps', dayOfWeek: 'Wednesday', location: 'Kileleshwa',
        exercises: [
          { name: 'DB Rows (stacked)', bw: false, defaultWeight: '25' },
          { name: 'Bicep Curls', bw: false, defaultWeight: '' },
          { name: 'Hammer Curls', bw: false, defaultWeight: '' },
          { name: 'Wrist Curls', bw: false, defaultWeight: '15' },
        ]},
      { key: 'legs2', title: 'LEGS 2', dayOfWeek: 'Thursday', location: 'Kileleshwa',
        exercises: [
          { name: 'Bulgarian Split Squats', bw: false, defaultWeight: '' },
          { name: 'Goblet Squats', bw: false, defaultWeight: '15' },
          { name: 'Calf Raises', bw: false, defaultWeight: '15' },
        ]},
    ];

    const dayToNum: Record<string, number> = {
      'Monday': 1, 'Tuesday': 2, 'Wednesday': 3, 'Thursday': 4,
      'Friday': 5, 'Saturday': 6, 'Sunday': 0,
    };

    for (const s of sections) {
      await sql`INSERT INTO weights_sections (section_key, title, day_of_week, location, exercises)
        VALUES (${s.key}, ${s.title}, ${s.dayOfWeek}, ${s.location}, ${JSON.stringify(s.exercises)})
        ON CONFLICT (section_key) DO NOTHING`;

      // Create empty sessions for each week
      for (let d = new Date(START); d <= END; d.setDate(d.getDate() + 1)) {
        if (d.getDay() !== dayToNum[s.dayOfWeek]) continue;
        const wk = weekNum(d);
        const dateStr = d.toISOString().split('T')[0];

        // Build default exercises JSON
        const exerciseData: Record<string, { weight: string; sets: (number | null)[]; total: number | null }> = {};
        for (const ex of s.exercises) {
          exerciseData[ex.name] = {
            weight: ex.bw ? 'BW' : (ex.defaultWeight || ''),
            sets: [null, null, null, null],
            total: null,
          };
        }

        await sql`INSERT INTO weights_sessions (section_key, week, date, exercises)
          VALUES (${s.key}, ${wk}, ${dateStr}, ${JSON.stringify(exerciseData)})
          ON CONFLICT (section_key, date) DO NOTHING`;
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Database setup and seeded',
      counts: {
        running: runningRows.length,
      },
    });
  } catch (error) {
    console.error('Setup failed:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
