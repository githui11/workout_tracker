import { NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';

const FOODS = [
  { name: 'White Bread',              serving_size: '1 slice (30g)',    calories: 80,  protein: 2.7, carbs: 15.0, fat: 1.0, fiber: 0.6 },
  { name: 'Rice',                     serving_size: '100g cooked',      calories: 130, protein: 2.7, carbs: 28.0, fat: 0.3, fiber: 0.4 },
  { name: 'Beef',                     serving_size: '100g',             calories: 250, protein: 26.0, carbs: 0.0, fat: 17.0, fiber: null },
  { name: 'Whole Egg',                serving_size: '1 egg (50g)',      calories: 72,  protein: 6.0, carbs: 0.4, fat: 5.0, fiber: null },
  { name: 'Egg White',                serving_size: '1 egg white',      calories: 17,  protein: 3.6, carbs: 0.2, fat: 0.1, fiber: null },
  { name: 'Milk',                     serving_size: '250ml',            calories: 150, protein: 8.0, carbs: 12.0, fat: 8.0, fiber: null },
  { name: 'Beef Brawns',              serving_size: '100g',             calories: 200, protein: 14.0, carbs: 2.0, fat: 15.0, fiber: null, brand: "Farmer's Choice" },
  { name: 'Chicken Drumstick',        serving_size: '1 drumstick (100g)', calories: 172, protein: 16.0, carbs: 0.0, fat: 11.0, fiber: null },
  { name: 'Chicken Breast',           serving_size: '100g',             calories: 165, protein: 31.0, carbs: 0.0, fat: 3.6, fiber: null },
  { name: 'Liver',                    serving_size: '100g',             calories: 135, protein: 21.0, carbs: 4.0, fat: 4.0, fiber: null },
  { name: 'Ugali',                    serving_size: '100g',             calories: 130, protein: 3.0, carbs: 28.0, fat: 1.0, fiber: 0.5 },
  { name: 'Githeri',                  serving_size: '100g',             calories: 115, protein: 5.0, carbs: 20.0, fat: 1.0, fiber: 3.5 },
  { name: 'Beans',                    serving_size: '100g cooked',      calories: 127, protein: 8.0, carbs: 23.0, fat: 0.5, fiber: 6.0 },
  { name: 'Njahi',                    serving_size: '100g cooked',      calories: 115, protein: 7.5, carbs: 20.0, fat: 0.4, fiber: 5.0 },
  { name: 'Kamande',                  serving_size: '100g cooked',      calories: 143, protein: 9.0, carbs: 26.0, fat: 0.4, fiber: 5.5 },
  { name: 'Mukimo',                   serving_size: '100g',             calories: 95,  protein: 2.0, carbs: 20.0, fat: 1.0, fiber: 2.0 },
  { name: 'Ndengu',                   serving_size: '100g cooked',      calories: 105, protein: 7.0, carbs: 19.0, fat: 0.4, fiber: 4.5 },
  { name: 'Indomie',                  serving_size: '1 packet (70g)',   calories: 315, protein: 7.0, carbs: 43.0, fat: 13.0, fiber: 1.5, brand: 'Indomie' },
  { name: 'Minced Meat',              serving_size: '100g',             calories: 215, protein: 21.0, carbs: 0.0, fat: 14.0, fiber: null },
];

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
    let skipped = 0;

    for (const f of FOODS) {
      const existing = await sql`SELECT id FROM foods WHERE name = ${f.name} AND (brand = ${f.brand ?? null} OR (brand IS NULL AND ${f.brand ?? null} IS NULL))`;
      if (existing.length > 0) {
        skipped++;
        continue;
      }
      await sql`
        INSERT INTO foods (name, brand, serving_size, calories, protein, carbs, fat, fiber)
        VALUES (${f.name}, ${f.brand ?? null}, ${f.serving_size}, ${f.calories}, ${f.protein}, ${f.carbs}, ${f.fat}, ${f.fiber ?? null})
      `;
      inserted++;
    }

    return NextResponse.json({ success: true, inserted, skipped });
  } catch (error) {
    console.error('Seed foods failed:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
