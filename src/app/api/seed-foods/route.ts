import { NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';

const FOODS = [
  // Plain / no stew additions
  { name: 'White Bread',              serving_size: '1 slice (30g)',      calories: 80,  protein: 2.7,  carbs: 15.0, fat: 1.0,  fiber: 0.6 },
  { name: 'Rice',                     serving_size: '100g cooked',        calories: 130, protein: 2.7,  carbs: 28.0, fat: 0.3,  fiber: 0.4 },
  { name: 'Whole Egg',                serving_size: '1 egg (50g)',        calories: 72,  protein: 6.0,  carbs: 0.4,  fat: 5.0,  fiber: null },
  { name: 'Egg White',                serving_size: '1 egg white',        calories: 17,  protein: 3.6,  carbs: 0.2,  fat: 0.1,  fiber: null },
  { name: 'Milk',                     serving_size: '250ml',              calories: 150, protein: 8.0,  carbs: 12.0, fat: 8.0,  fiber: null },
  { name: 'Beef Brawns',              serving_size: '100g',               calories: 200, protein: 14.0, carbs: 2.0,  fat: 15.0, fiber: null, brand: "Farmer's Choice" },
  { name: 'Ugali',                    serving_size: '100g',               calories: 130, protein: 3.0,  carbs: 28.0, fat: 1.0,  fiber: 0.5 },
  { name: 'Indomie',                  serving_size: '1 packet (70g)',     calories: 315, protein: 7.0,  carbs: 43.0, fat: 13.0, fiber: 1.5, brand: 'Indomie' },

  // Meats — cooked with onions, tomatoes, ~1 tbsp oil per pot (+45 cal, +4g carbs, +3.5g fat per 100g)
  { name: 'Beef',                     serving_size: '100g as prepared',   calories: 300, protein: 26.0, carbs: 4.0,  fat: 20.5, fiber: null },
  { name: 'Chicken Drumstick',        serving_size: '1 drumstick (100g) as prepared', calories: 220, protein: 16.0, carbs: 4.0, fat: 14.5, fiber: null },
  { name: 'Chicken Breast',           serving_size: '100g as prepared',   calories: 215, protein: 31.0, carbs: 4.0,  fat: 7.0,  fiber: null },
  { name: 'Liver',                    serving_size: '100g as prepared',   calories: 185, protein: 21.0, carbs: 8.0,  fat: 7.5,  fiber: null },
  { name: 'Minced Meat',              serving_size: '100g as prepared',   calories: 265, protein: 21.0, carbs: 4.0,  fat: 17.5, fiber: null },

  // Kenyan legume dishes — cooked with onions, tomatoes, ~1 tbsp oil per pot
  { name: 'Githeri',                  serving_size: '100g as prepared',   calories: 165, protein: 5.0,  carbs: 24.0, fat: 4.5,  fiber: 3.5 },
  { name: 'Beans',                    serving_size: '100g as prepared',   calories: 175, protein: 8.0,  carbs: 27.0, fat: 4.0,  fiber: 6.0 },
  { name: 'Njahi',                    serving_size: '100g as prepared',   calories: 165, protein: 7.5,  carbs: 24.0, fat: 4.0,  fiber: 5.0 },
  { name: 'Kamande',                  serving_size: '100g as prepared',   calories: 190, protein: 9.0,  carbs: 30.0, fat: 4.0,  fiber: 5.5 },
  { name: 'Ndengu',                   serving_size: '100g as prepared',   calories: 155, protein: 7.0,  carbs: 23.0, fat: 4.0,  fiber: 4.5 },
  { name: 'Mukimo',                   serving_size: '100g as prepared',   calories: 145, protein: 2.0,  carbs: 24.0, fat: 4.5,  fiber: 2.0 },

  // Vegetables
  { name: 'Green Bell Pepper',        serving_size: '1 medium (120g)',    calories: 24,  protein: 1.0,  carbs: 5.5,  fat: 0.2,  fiber: 2.0 },
  { name: 'Yellow Bell Pepper',       serving_size: '1 medium (120g)',    calories: 50,  protein: 1.5,  carbs: 12.0, fat: 0.3,  fiber: 2.0 },
  { name: 'Red Bell Pepper',          serving_size: '1 medium (120g)',    calories: 37,  protein: 1.2,  carbs: 9.0,  fat: 0.3,  fiber: 2.0 },
  { name: 'Carrot',                   serving_size: '1 medium (80g)',     calories: 33,  protein: 0.7,  carbs: 7.7,  fat: 0.1,  fiber: 2.3 },
  { name: 'Zucchini',                 serving_size: '100g',               calories: 17,  protein: 1.2,  carbs: 3.1,  fat: 0.3,  fiber: 1.0 },
  { name: 'Green Peas',               serving_size: '100g',               calories: 81,  protein: 5.4,  carbs: 14.0, fat: 0.4,  fiber: 5.1 },
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
    let updated = 0;

    for (const f of FOODS) {
      const existing = await sql`SELECT id FROM foods WHERE name = ${f.name}`;
      if (existing.length > 0) {
        await sql`
          UPDATE foods SET
            brand = ${f.brand ?? null},
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
          VALUES (${f.name}, ${f.brand ?? null}, ${f.serving_size}, ${f.calories}, ${f.protein}, ${f.carbs}, ${f.fat}, ${f.fiber ?? null})
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
