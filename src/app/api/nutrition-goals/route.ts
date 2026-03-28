import { NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';

export async function GET() {
  try {
    const sql = neon(process.env.DATABASE_URL!);

    await sql`CREATE TABLE IF NOT EXISTS nutrition_goals (
      id SERIAL PRIMARY KEY,
      calories INT DEFAULT 2500,
      protein INT DEFAULT 150,
      carbs INT DEFAULT 300,
      fat INT DEFAULT 80
    )`;

    const rows = await sql`SELECT * FROM nutrition_goals LIMIT 1`;
    if (rows.length === 0) {
      await sql`INSERT INTO nutrition_goals (calories, protein, carbs, fat) VALUES (2500, 150, 300, 80)`;
      return NextResponse.json({ calories: 2500, protein: 150, carbs: 300, fat: 80 });
    }

    const r = rows[0];
    return NextResponse.json({
      calories: Number(r.calories),
      protein: Number(r.protein),
      carbs: Number(r.carbs),
      fat: Number(r.fat),
    });
  } catch (error) {
    console.error('Failed to fetch nutrition goals:', error);
    return NextResponse.json({ error: 'Failed to fetch nutrition goals' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const sql = neon(process.env.DATABASE_URL!);
    const body = await request.json();
    const { calories, protein, carbs, fat } = body;

    const rows = await sql`SELECT id FROM nutrition_goals LIMIT 1`;
    if (rows.length === 0) {
      await sql`INSERT INTO nutrition_goals (calories, protein, carbs, fat) VALUES (${calories}, ${protein}, ${carbs}, ${fat})`;
    } else {
      await sql`UPDATE nutrition_goals SET calories = ${calories}, protein = ${protein}, carbs = ${carbs}, fat = ${fat} WHERE id = ${rows[0].id}`;
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to update nutrition goals:', error);
    return NextResponse.json({ error: 'Failed to update nutrition goals' }, { status: 500 });
  }
}
