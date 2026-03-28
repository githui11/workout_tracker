import { NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';
import { DEFAULT_FOODS } from '@/lib/default-foods';

export async function GET() {
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

    let inserted = 0;
    let updated = 0;

    for (const f of DEFAULT_FOODS) {
      const existing = await sql`SELECT id FROM foods WHERE name = ${f.name}`;
      if (existing.length > 0) {
        await sql`
          UPDATE foods SET
            brand = ${f.brand},
            serving_size = ${f.serving_size},
            calories = ${f.calories},
            protein = ${f.protein},
            carbs = ${f.carbs},
            fat = ${f.fat},
            fiber = ${f.fiber ?? null}
          WHERE name = ${f.name}
        `;
        updated++;
      } else {
        await sql`
          INSERT INTO foods (name, brand, serving_size, calories, protein, carbs, fat, fiber)
          VALUES (${f.name}, ${f.brand}, ${f.serving_size}, ${f.calories}, ${f.protein}, ${f.carbs}, ${f.fat}, ${f.fiber ?? null})
        `;
        inserted++;
      }
    }

    return NextResponse.json({ success: true, inserted, updated });
  } catch (error) {
    console.error('Seed foods failed:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
