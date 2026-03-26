import { NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';

export async function GET() {
  try {
    const sql = neon(process.env.DATABASE_URL!);

    // Auto-create table if it doesn't exist
    await sql`
      CREATE TABLE IF NOT EXISTS body_weight (
        id SERIAL PRIMARY KEY,
        date DATE UNIQUE NOT NULL,
        weight DECIMAL(5,1) NOT NULL,
        notes TEXT
      )`;

    const rows = await sql`SELECT * FROM body_weight ORDER BY date ASC`;
    return NextResponse.json(rows);
  } catch (error) {
    console.error('Failed to fetch body weight data:', error);
    return NextResponse.json({ error: 'Failed to fetch body weight data' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const sql = neon(process.env.DATABASE_URL!);
    const { date, weight, notes } = await request.json();

    await sql`
      INSERT INTO body_weight (date, weight, notes)
      VALUES (${date}, ${weight}, ${notes || null})
      ON CONFLICT (date) DO UPDATE SET weight = ${weight}, notes = ${notes || null}`;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to save body weight:', error);
    return NextResponse.json({ error: 'Failed to save body weight' }, { status: 500 });
  }
}
