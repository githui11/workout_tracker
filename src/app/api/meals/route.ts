import { NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';

export async function GET(request: Request) {
  try {
    const sql = neon(process.env.DATABASE_URL!);

    await sql`CREATE TABLE IF NOT EXISTS meal_entries (
      id SERIAL PRIMARY KEY,
      date DATE NOT NULL,
      meal_type VARCHAR(20) NOT NULL,
      food_id INT,
      food_name VARCHAR(200) NOT NULL,
      servings DECIMAL(4,2) DEFAULT 1.0,
      calories INT NOT NULL,
      protein DECIMAL(5,1) NOT NULL,
      carbs DECIMAL(5,1) NOT NULL,
      fat DECIMAL(5,1) NOT NULL,
      notes TEXT,
      created_at TIMESTAMP DEFAULT NOW()
    )`;

    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date');

    const rows = date
      ? await sql`SELECT * FROM meal_entries WHERE date = ${date} ORDER BY created_at ASC`
      : await sql`SELECT * FROM meal_entries ORDER BY date DESC, created_at ASC LIMIT 200`;

    return NextResponse.json(rows.map((r) => ({
      id: r.id,
      date: r.date instanceof Date ? r.date.toISOString().split('T')[0] : String(r.date).split('T')[0],
      mealType: r.meal_type,
      foodId: r.food_id,
      foodName: r.food_name,
      servings: Number(r.servings),
      calories: Number(r.calories),
      protein: Number(r.protein),
      carbs: Number(r.carbs),
      fat: Number(r.fat),
      notes: r.notes || '',
    })));
  } catch (error) {
    console.error('Failed to fetch meals:', error);
    return NextResponse.json({ error: 'Failed to fetch meals' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const sql = neon(process.env.DATABASE_URL!);
    const body = await request.json();
    const { date, mealType, foodId, foodName, servings, calories, protein, carbs, fat, notes } = body;

    const result = await sql`
      INSERT INTO meal_entries (date, meal_type, food_id, food_name, servings, calories, protein, carbs, fat, notes)
      VALUES (${date}, ${mealType}, ${foodId || null}, ${foodName}, ${servings || 1}, ${calories}, ${protein}, ${carbs}, ${fat}, ${notes || null})
      RETURNING id`;

    return NextResponse.json({ success: true, id: result[0].id });
  } catch (error) {
    console.error('Failed to create meal entry:', error);
    return NextResponse.json({ error: 'Failed to create meal entry' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const sql = neon(process.env.DATABASE_URL!);
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

    await sql`DELETE FROM meal_entries WHERE id = ${id}`;
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete meal entry:', error);
    return NextResponse.json({ error: 'Failed to delete meal entry' }, { status: 500 });
  }
}
