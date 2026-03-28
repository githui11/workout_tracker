import { NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';
import { DEFAULT_FOODS } from '@/lib/default-foods';

export async function GET(request: Request) {
  try {
    const sql = neon(process.env.DATABASE_URL!);

    await sql`CREATE TABLE IF NOT EXISTS foods (
      id SERIAL PRIMARY KEY,
      name VARCHAR(200) NOT NULL,
      brand VARCHAR(100),
      serving_size VARCHAR(50) NOT NULL,
      calories INT NOT NULL,
      protein DECIMAL(5,1) NOT NULL,
      carbs DECIMAL(5,1) NOT NULL,
      fat DECIMAL(5,1) NOT NULL,
      fiber DECIMAL(5,1),
      is_custom BOOLEAN DEFAULT true,
      created_at TIMESTAMP DEFAULT NOW()
    )`;

    // Seed on first load; upsert defaults whenever macros are stale
    const existing = await sql`SELECT name, calories, protein, carbs, fat, serving_size FROM foods`;
    const dbMap = new Map(existing.map((r: { name: string; calories: number; protein: number; carbs: number; fat: number; serving_size: string }) => [r.name, r]));
    for (const f of DEFAULT_FOODS) {
      const row = dbMap.get(f.name);
      if (!row) {
        await sql`
          INSERT INTO foods (name, brand, serving_size, calories, protein, carbs, fat, fiber)
          VALUES (${f.name}, ${f.brand}, ${f.serving_size}, ${f.calories}, ${f.protein}, ${f.carbs}, ${f.fat}, ${f.fiber ?? null})
        `;
      } else if (
        Number(row.calories) !== f.calories ||
        Number(row.protein) !== f.protein ||
        Number(row.carbs) !== f.carbs ||
        Number(row.fat) !== f.fat ||
        row.serving_size !== f.serving_size
      ) {
        await sql`
          UPDATE foods SET brand=${f.brand}, serving_size=${f.serving_size},
            calories=${f.calories}, protein=${f.protein}, carbs=${f.carbs},
            fat=${f.fat}, fiber=${f.fiber ?? null}
          WHERE name=${f.name}
        `;
      }
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search');

    const rows = search
      ? await sql`SELECT * FROM foods WHERE name ILIKE ${'%' + search + '%'} OR brand ILIKE ${'%' + search + '%'} ORDER BY name ASC`
      : await sql`SELECT * FROM foods ORDER BY created_at DESC`;

    return NextResponse.json(rows.map((r) => ({
      id: r.id,
      name: r.name,
      brand: r.brand || '',
      servingSize: r.serving_size,
      calories: Number(r.calories),
      protein: Number(r.protein),
      carbs: Number(r.carbs),
      fat: Number(r.fat),
      fiber: r.fiber !== null ? Number(r.fiber) : null,
      isCustom: r.is_custom,
    })));
  } catch (error) {
    console.error('Failed to fetch foods:', error);
    return NextResponse.json({ error: 'Failed to fetch foods' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const sql = neon(process.env.DATABASE_URL!);
    const body = await request.json();
    const { name, brand, servingSize, calories, protein, carbs, fat, fiber } = body;

    const result = await sql`
      INSERT INTO foods (name, brand, serving_size, calories, protein, carbs, fat, fiber)
      VALUES (${name}, ${brand || null}, ${servingSize}, ${calories}, ${protein}, ${carbs}, ${fat}, ${fiber || null})
      RETURNING id`;

    return NextResponse.json({ success: true, id: result[0].id });
  } catch (error) {
    console.error('Failed to create food:', error);
    return NextResponse.json({ error: 'Failed to create food' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const sql = neon(process.env.DATABASE_URL!);
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

    await sql`DELETE FROM foods WHERE id = ${id}`;
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete food:', error);
    return NextResponse.json({ error: 'Failed to delete food' }, { status: 500 });
  }
}
