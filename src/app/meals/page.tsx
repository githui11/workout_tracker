'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import type { MealEntry, MealType, Food, NutritionGoals } from '@/lib/types';

type Tab = 'today' | 'history' | 'goals';

const MEAL_TYPES: { key: MealType; label: string; icon: string }[] = [
  { key: 'breakfast', label: 'Breakfast', icon: '🌅' },
  { key: 'lunch', label: 'Lunch', icon: '☀️' },
  { key: 'dinner', label: 'Dinner', icon: '🌙' },
  { key: 'snack', label: 'Snacks', icon: '🍎' },
];

export default function MealsPage() {
  const [meals, setMeals] = useState<MealEntry[]>([]);
  const [foods, setFoods] = useState<Food[]>([]);
  const [goals, setGoals] = useState<NutritionGoals>({ calories: 2500, protein: 150, carbs: 300, fat: 80 });
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>('today');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [addingTo, setAddingTo] = useState<MealType | null>(null);
  const [toast, setToast] = useState('');

  // History state
  const [historyMeals, setHistoryMeals] = useState<MealEntry[]>([]);
  const [historyLoaded, setHistoryLoaded] = useState(false);

  const today = new Date().toISOString().split('T')[0];

  const loadMeals = useCallback(async (date: string) => {
    const res = await fetch(`/api/meals?date=${date}`);
    return res.json();
  }, []);

  useEffect(() => {
    Promise.all([
      loadMeals(selectedDate),
      fetch('/api/foods').then((r) => r.json()),
      fetch('/api/nutrition-goals').then((r) => r.json()),
    ])
      .then(([m, f, g]) => {
        setMeals(m);
        setFoods(Array.isArray(f) ? f : []);
        if (g && !g.error) setGoals(g);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [selectedDate, loadMeals]);

  // Load history (all meals) when switching to history tab
  useEffect(() => {
    if (tab === 'history' && !historyLoaded) {
      fetch('/api/meals')
        .then((r) => r.json())
        .then((m) => {
          setHistoryMeals(Array.isArray(m) ? m : []);
          setHistoryLoaded(true);
        })
        .catch(console.error);
    }
  }, [tab, historyLoaded]);

  const totals = useMemo(() => {
    return meals.reduce(
      (acc, m) => ({
        calories: acc.calories + m.calories * m.servings,
        protein: acc.protein + m.protein * m.servings,
        carbs: acc.carbs + m.carbs * m.servings,
        fat: acc.fat + m.fat * m.servings,
      }),
      { calories: 0, protein: 0, carbs: 0, fat: 0 }
    );
  }, [meals]);

  const mealsByType = useMemo(() => {
    const grouped: Record<MealType, MealEntry[]> = { breakfast: [], lunch: [], dinner: [], snack: [] };
    meals.forEach((m) => {
      if (grouped[m.mealType]) grouped[m.mealType].push(m);
    });
    return grouped;
  }, [meals]);

  // Group history by date
  const historyByDate = useMemo(() => {
    const grouped: Record<string, MealEntry[]> = {};
    historyMeals.forEach((m) => {
      if (!grouped[m.date]) grouped[m.date] = [];
      grouped[m.date].push(m);
    });
    return Object.entries(grouped).sort(([a], [b]) => b.localeCompare(a));
  }, [historyMeals]);

  async function handleDeleteMeal(id: number) {
    await fetch(`/api/meals?id=${id}`, { method: 'DELETE' });
    setMeals(await loadMeals(selectedDate));
  }

  async function handleSaveGoals(newGoals: NutritionGoals) {
    await fetch('/api/nutrition-goals', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newGoals),
    });
    setGoals(newGoals);
    setToast('Goals saved!');
    setTimeout(() => setToast(''), 2000);
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-7 w-24 bg-zinc-800/60 rounded-lg animate-shimmer" />
        <div className="h-24 bg-zinc-800/30 rounded-2xl animate-shimmer delay-1" />
        <div className="h-10 bg-zinc-800/40 rounded-xl animate-shimmer delay-2" />
        <div className="h-40 bg-zinc-800/30 rounded-2xl animate-shimmer delay-3" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold tracking-tight animate-fadeInUp">Meals</h1>

      {/* Daily progress bar */}
      <div className="bg-zinc-900/50 backdrop-blur-sm rounded-2xl p-4 border border-zinc-800/30 animate-fadeInUp delay-1">
        <div className="flex justify-between items-end mb-2">
          <div>
            <p className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider">Calories</p>
            <p className="text-xl font-bold text-orange-400 mt-0.5">
              {Math.round(totals.calories)}<span className="text-sm font-medium text-zinc-500 ml-1">/ {goals.calories}</span>
            </p>
          </div>
          <span className="text-2xl font-bold text-zinc-800">
            {Math.min(100, Math.round((totals.calories / goals.calories) * 100))}%
          </span>
        </div>
        <div className="w-full bg-zinc-800/50 rounded-full h-2 overflow-hidden">
          <div
            className="bg-gradient-to-r from-orange-600 via-orange-500 to-amber-400 h-full rounded-full transition-all duration-700"
            style={{ width: `${Math.min(100, (totals.calories / goals.calories) * 100)}%` }}
          />
        </div>

        {/* Macro bars */}
        <div className="grid grid-cols-3 gap-3 mt-3">
          <MacroBar label="Protein" value={totals.protein} goal={goals.protein} color="from-blue-500 to-blue-400" unit="g" />
          <MacroBar label="Carbs" value={totals.carbs} goal={goals.carbs} color="from-emerald-500 to-emerald-400" unit="g" />
          <MacroBar label="Fat" value={totals.fat} goal={goals.fat} color="from-purple-500 to-purple-400" unit="g" />
        </div>
      </div>

      {/* Tab switcher */}
      <div className="flex gap-1 bg-zinc-900/50 backdrop-blur-sm rounded-xl p-1 border border-zinc-800/30 animate-fadeInUp delay-2">
        {(['today', 'history', 'goals'] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 py-2 text-sm rounded-lg capitalize transition-all duration-300 font-medium ${
              tab === t
                ? 'bg-orange-500/10 text-orange-400 shadow-[inset_0_1px_0_rgba(249,115,22,0.1)]'
                : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {/* TODAY TAB */}
      {tab === 'today' && (
        <div className="space-y-3 animate-fadeInUp delay-3">
          {/* Date picker */}
          <div className="flex items-center justify-between bg-zinc-900/40 rounded-xl px-4 py-2.5 border border-zinc-800/30">
            <span className="text-xs text-zinc-500 font-medium">Date</span>
            <input
              type="date"
              max={today}
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="bg-transparent text-right text-sm font-medium focus:outline-none text-white"
            />
          </div>

          {/* Meal type sections */}
          {MEAL_TYPES.map(({ key, label, icon }) => (
            <div key={key} className="bg-zinc-900/40 rounded-2xl border border-zinc-800/30 p-3.5">
              <div className="flex justify-between items-center mb-2">
                <h3 className="text-sm font-semibold">
                  <span className="mr-1.5">{icon}</span>{label}
                </h3>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-zinc-500">
                    {Math.round(mealsByType[key].reduce((sum, m) => sum + m.calories * m.servings, 0))} cal
                  </span>
                  <button
                    onClick={() => setAddingTo(addingTo === key ? null : key)}
                    className="w-7 h-7 flex items-center justify-center rounded-lg bg-orange-500/10 text-orange-400 hover:bg-orange-500/20 transition-colors"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                      <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* Food entries */}
              {mealsByType[key].map((entry) => (
                <div key={entry.id} className="flex justify-between items-center py-1.5 text-sm border-t border-zinc-800/20">
                  <div className="flex-1 min-w-0">
                    <span className="text-zinc-300 truncate block">{entry.foodName}</span>
                    <span className="text-[10px] text-zinc-600">
                      {entry.servings > 1 ? `${entry.servings}x · ` : ''}{Math.round(entry.protein * entry.servings)}p · {Math.round(entry.carbs * entry.servings)}c · {Math.round(entry.fat * entry.servings)}f
                    </span>
                  </div>
                  <div className="flex items-center gap-2 ml-2">
                    <span className="text-xs font-semibold text-orange-400">{Math.round(entry.calories * entry.servings)}</span>
                    <button
                      onClick={() => handleDeleteMeal(entry.id)}
                      className="text-zinc-700 hover:text-red-400 transition-colors"
                    >
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                        <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                      </svg>
                    </button>
                  </div>
                </div>
              ))}

              {mealsByType[key].length === 0 && !addingTo && (
                <p className="text-xs text-zinc-700 py-1">No items yet</p>
              )}

              {/* Add food form */}
              {addingTo === key && (
                <AddFoodForm
                  mealType={key}
                  date={selectedDate}
                  foods={foods}
                  onSave={async () => {
                    setMeals(await loadMeals(selectedDate));
                    setAddingTo(null);
                    // Refresh foods list in case a new one was created
                    const f = await fetch('/api/foods').then((r) => r.json());
                    setFoods(Array.isArray(f) ? f : []);
                  }}
                  onCancel={() => setAddingTo(null)}
                />
              )}
            </div>
          ))}
        </div>
      )}

      {/* HISTORY TAB */}
      {tab === 'history' && (
        <div className="space-y-3 animate-fadeInUp delay-1">
          {historyByDate.map(([date, entries], i) => {
            const dayTotal = entries.reduce((sum, m) => sum + m.calories * m.servings, 0);
            return (
              <div
                key={date}
                className="bg-zinc-900/40 backdrop-blur-sm rounded-2xl p-4 border border-zinc-800/30 animate-fadeInUp"
                style={{ animationDelay: `${i * 40}ms` }}
              >
                <div className="flex justify-between items-center">
                  <span className="text-sm font-semibold">{date}</span>
                  <span className="text-orange-400 font-bold text-sm">{Math.round(dayTotal)} cal</span>
                </div>
                <div className="flex gap-3 text-[11px] text-zinc-500 mt-1.5">
                  <span>{Math.round(entries.reduce((s, m) => s + m.protein * m.servings, 0))}g protein</span>
                  <span>{Math.round(entries.reduce((s, m) => s + m.carbs * m.servings, 0))}g carbs</span>
                  <span>{Math.round(entries.reduce((s, m) => s + m.fat * m.servings, 0))}g fat</span>
                </div>
                <div className="mt-2 text-xs text-zinc-600">
                  {entries.map((e) => e.foodName).join(', ')}
                </div>
              </div>
            );
          })}
          {historyByDate.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <p className="text-zinc-400 font-medium text-sm">No meals logged yet</p>
              <p className="text-zinc-600 text-xs mt-1">Start logging to see your history</p>
            </div>
          )}
        </div>
      )}

      {/* GOALS TAB */}
      {tab === 'goals' && (
        <GoalsEditor goals={goals} onSave={handleSaveGoals} />
      )}

      {toast && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 text-sm font-semibold text-emerald-400 animate-slideInUp">
          ✓ {toast}
        </div>
      )}
    </div>
  );
}

/* ─── Macro Bar ─── */
function MacroBar({ label, value, goal, color, unit }: {
  label: string; value: number; goal: number; color: string; unit: string;
}) {
  const pct = Math.min(100, (value / goal) * 100);
  return (
    <div>
      <div className="flex justify-between text-[10px] mb-1">
        <span className="text-zinc-500 font-medium">{label}</span>
        <span className="text-zinc-400">{Math.round(value)}/{goal}{unit}</span>
      </div>
      <div className="w-full bg-zinc-800/50 rounded-full h-1.5 overflow-hidden">
        <div
          className={`bg-gradient-to-r ${color} h-full rounded-full transition-all duration-700`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

const ADD_ONS = [
  { id: 'carrot',        name: 'Carrot',         serving: '1 medium', calories: 33, protein: 0.7, carbs: 7.7,  fat: 0.1 },
  { id: 'pepper_green',  name: 'Green Pepper',   serving: '1 medium', calories: 24, protein: 1.0, carbs: 5.5,  fat: 0.2 },
  { id: 'pepper_yellow', name: 'Yellow Pepper',  serving: '1 medium', calories: 50, protein: 1.5, carbs: 12.0, fat: 0.3 },
  { id: 'pepper_red',    name: 'Red Pepper',     serving: '1 medium', calories: 37, protein: 1.2, carbs: 9.0,  fat: 0.3 },
  { id: 'zucchini',      name: 'Zucchini',       serving: '100g',     calories: 17, protein: 1.2, carbs: 3.1,  fat: 0.3 },
  { id: 'green_peas',    name: 'Green Peas',     serving: '100g',     calories: 81, protein: 5.4, carbs: 14.0, fat: 0.4 },
];

/* ─── Add Food Form ─── */
function AddFoodForm({ mealType, date, foods, onSave, onCancel }: {
  mealType: MealType;
  date: string;
  foods: Food[];
  onSave: () => void;
  onCancel: () => void;
}) {
  const [mode, setMode] = useState<'search' | 'quick'>('search');
  const [search, setSearch] = useState('');
  const [saving, setSaving] = useState(false);
  const [selectedFood, setSelectedFood] = useState<Food | null>(null);
  const [selectedAddOns, setSelectedAddOns] = useState<Set<string>>(new Set());
  const [quickForm, setQuickForm] = useState({
    foodName: '', calories: '', protein: '', carbs: '', fat: '', servings: '1', saveAsFood: false,
  });

  const filtered = search
    ? foods.filter((f) =>
        f.name.toLowerCase().includes(search.toLowerCase()) ||
        f.brand.toLowerCase().includes(search.toLowerCase())
      )
    : foods.slice(0, 10);

  function toggleAddOn(id: string) {
    setSelectedAddOns((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  async function addFromFood(food: Food) {
    setSaving(true);
    const addOns = ADD_ONS.filter((a) => selectedAddOns.has(a.id));
    const extraCal  = addOns.reduce((s, a) => s + a.calories, 0);
    const extraProt = addOns.reduce((s, a) => s + a.protein, 0);
    const extraCarb = addOns.reduce((s, a) => s + a.carbs, 0);
    const extraFat  = addOns.reduce((s, a) => s + a.fat, 0);
    const name = addOns.length > 0
      ? `${food.name} + ${addOns.map((a) => a.name).join(', ')}`
      : food.name;
    await fetch('/api/meals', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        date, mealType, foodId: food.id, foodName: name,
        servings: 1,
        calories: food.calories + extraCal,
        protein: food.protein + extraProt,
        carbs: food.carbs + extraCarb,
        fat: food.fat + extraFat,
      }),
    });
    setSaving(false);
    onSave();
  }

  async function addQuick() {
    if (!quickForm.foodName || !quickForm.calories) return;
    setSaving(true);

    const data = {
      calories: Number(quickForm.calories),
      protein: Number(quickForm.protein) || 0,
      carbs: Number(quickForm.carbs) || 0,
      fat: Number(quickForm.fat) || 0,
    };

    // Optionally save as reusable food
    let foodId = null;
    if (quickForm.saveAsFood) {
      const res = await fetch('/api/foods', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: quickForm.foodName,
          servingSize: '1 serving',
          ...data,
        }),
      });
      const result = await res.json();
      foodId = result.id;
    }

    await fetch('/api/meals', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        date, mealType, foodId, foodName: quickForm.foodName,
        servings: Number(quickForm.servings) || 1, ...data,
      }),
    });

    setSaving(false);
    onSave();
  }

  return (
    <div className="mt-3 pt-3 border-t border-zinc-800/30 space-y-3">
      {/* Mode toggle */}
      <div className="flex gap-1 bg-zinc-800/30 rounded-lg p-0.5">
        <button
          onClick={() => setMode('search')}
          className={`flex-1 py-1.5 text-xs rounded-md font-medium transition-all ${
            mode === 'search' ? 'bg-zinc-700/50 text-white' : 'text-zinc-500'
          }`}
        >
          Saved Foods
        </button>
        <button
          onClick={() => setMode('quick')}
          className={`flex-1 py-1.5 text-xs rounded-md font-medium transition-all ${
            mode === 'quick' ? 'bg-zinc-700/50 text-white' : 'text-zinc-500'
          }`}
        >
          Quick Add
        </button>
      </div>

      {mode === 'search' && (
        <div className="space-y-2">
          {!selectedFood ? (
            <>
              <input
                type="text"
                placeholder="Search foods..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-zinc-900/80 rounded-xl px-3.5 py-2 text-sm border border-zinc-800/60 focus:border-orange-500/50 focus:ring-2 focus:ring-orange-500/10 focus:outline-none transition-all placeholder:text-zinc-700"
                autoFocus
              />
              {filtered.length > 0 ? (
                <div className="max-h-40 overflow-y-auto space-y-1">
                  {filtered.map((f) => (
                    <button
                      key={f.id}
                      onClick={() => { setSelectedFood(f); setSearch(''); }}
                      className="w-full flex justify-between items-center px-3 py-2 rounded-lg bg-zinc-800/30 hover:bg-zinc-800/50 transition-colors text-left"
                    >
                      <div>
                        <p className="text-xs font-medium text-zinc-300">{f.name}</p>
                        <p className="text-[10px] text-zinc-600">{f.servingSize} · {f.protein}p {f.carbs}c {f.fat}f</p>
                      </div>
                      <span className="text-xs font-semibold text-orange-400">{f.calories}</span>
                    </button>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-zinc-600 text-center py-2">
                  {foods.length === 0 ? 'No saved foods yet. Use Quick Add to create one.' : 'No matches found.'}
                </p>
              )}
            </>
          ) : (
            <div className="space-y-3">
              {/* Selected food header */}
              <div className="flex justify-between items-center px-3 py-2 rounded-lg bg-orange-500/10 border border-orange-500/20">
                <div>
                  <p className="text-xs font-semibold text-orange-300">{selectedFood.name}</p>
                  <p className="text-[10px] text-zinc-500">{selectedFood.servingSize} · {selectedFood.calories} cal</p>
                </div>
                <button onClick={() => { setSelectedFood(null); setSelectedAddOns(new Set()); }} className="text-zinc-600 hover:text-zinc-400 text-[10px]">
                  Change
                </button>
              </div>

              {/* Add-ons */}
              <div>
                <p className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider mb-1.5">Add extras (optional)</p>
                <div className="grid grid-cols-2 gap-1.5">
                  {ADD_ONS.map((a) => {
                    const on = selectedAddOns.has(a.id);
                    return (
                      <button
                        key={a.id}
                        onClick={() => toggleAddOn(a.id)}
                        className={`flex items-center gap-2 px-2.5 py-2 rounded-lg border text-left transition-all ${
                          on
                            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                            : 'bg-zinc-800/30 border-zinc-800/40 text-zinc-400 hover:bg-zinc-800/50'
                        }`}
                      >
                        <span className={`w-3.5 h-3.5 rounded flex-shrink-0 flex items-center justify-center border ${on ? 'bg-emerald-500 border-emerald-500' : 'border-zinc-600'}`}>
                          {on && <svg width="8" height="8" viewBox="0 0 10 10" fill="none"><path d="M2 5l2.5 2.5L8 3" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                        </span>
                        <div>
                          <p className="text-[11px] font-medium leading-tight">{a.name}</p>
                          <p className="text-[9px] text-zinc-600">{a.serving} · {a.calories} cal</p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Totals preview */}
              {selectedAddOns.size > 0 && (() => {
                const addOns = ADD_ONS.filter((a) => selectedAddOns.has(a.id));
                const total = {
                  calories: selectedFood.calories + addOns.reduce((s, a) => s + a.calories, 0),
                  protein:  selectedFood.protein  + addOns.reduce((s, a) => s + a.protein, 0),
                  carbs:    selectedFood.carbs    + addOns.reduce((s, a) => s + a.carbs, 0),
                  fat:      selectedFood.fat      + addOns.reduce((s, a) => s + a.fat, 0),
                };
                return (
                  <div className="text-[10px] text-zinc-500 px-1">
                    Total: <span className="text-orange-400 font-semibold">{Math.round(total.calories)} cal</span>
                    {' · '}{Math.round(total.protein)}p {Math.round(total.carbs)}c {Math.round(total.fat)}f
                  </div>
                );
              })()}

              <button
                onClick={() => addFromFood(selectedFood)}
                disabled={saving}
                className="w-full bg-gradient-to-r from-orange-600 to-orange-500 hover:from-orange-500 hover:to-orange-400 disabled:from-orange-600/50 disabled:to-orange-500/50 text-white py-2.5 rounded-xl text-sm font-semibold transition-all active:scale-[0.98]"
              >
                {saving ? 'Adding...' : 'Add to Meal'}
              </button>
            </div>
          )}
        </div>
      )}

      {mode === 'quick' && (
        <div className="space-y-2">
          <input
            type="text"
            placeholder="Food name"
            value={quickForm.foodName}
            onChange={(e) => setQuickForm({ ...quickForm, foodName: e.target.value })}
            className="w-full bg-zinc-900/80 rounded-xl px-3.5 py-2 text-sm border border-zinc-800/60 focus:border-orange-500/50 focus:ring-2 focus:ring-orange-500/10 focus:outline-none transition-all placeholder:text-zinc-700"
            autoFocus
          />
          <div className="grid grid-cols-2 gap-2">
            <QuickInput label="Calories" value={quickForm.calories} onChange={(v) => setQuickForm({ ...quickForm, calories: v })} />
            <QuickInput label="Protein (g)" value={quickForm.protein} onChange={(v) => setQuickForm({ ...quickForm, protein: v })} />
            <QuickInput label="Carbs (g)" value={quickForm.carbs} onChange={(v) => setQuickForm({ ...quickForm, carbs: v })} />
            <QuickInput label="Fat (g)" value={quickForm.fat} onChange={(v) => setQuickForm({ ...quickForm, fat: v })} />
          </div>
          <QuickInput label="Servings" value={quickForm.servings} onChange={(v) => setQuickForm({ ...quickForm, servings: v })} />
          <label className="flex items-center gap-2 text-xs text-zinc-400 cursor-pointer">
            <input
              type="checkbox"
              checked={quickForm.saveAsFood}
              onChange={(e) => setQuickForm({ ...quickForm, saveAsFood: e.target.checked })}
              className="rounded border-zinc-700 bg-zinc-900 text-orange-500 focus:ring-orange-500/20"
            />
            Save to food library for reuse
          </label>
          <button
            onClick={addQuick}
            disabled={saving || !quickForm.foodName || !quickForm.calories}
            className="w-full bg-gradient-to-r from-orange-600 to-orange-500 hover:from-orange-500 hover:to-orange-400 disabled:from-orange-600/50 disabled:to-orange-500/50 text-white py-2.5 rounded-xl text-sm font-semibold transition-all active:scale-[0.98]"
          >
            {saving ? 'Adding...' : 'Add'}
          </button>
        </div>
      )}

      <button
        onClick={onCancel}
        className="w-full py-2 text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
      >
        Cancel
      </button>
    </div>
  );
}

function QuickInput({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <label className="block text-[10px] font-medium text-zinc-500 mb-1">{label}</label>
      <input
        type="number"
        inputMode="decimal"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-zinc-900/80 rounded-lg px-3 py-2 text-sm border border-zinc-800/60 focus:border-orange-500/50 focus:ring-2 focus:ring-orange-500/10 focus:outline-none transition-all"
      />
    </div>
  );
}

/* ─── Goals Editor ─── */
function GoalsEditor({ goals, onSave }: { goals: NutritionGoals; onSave: (g: NutritionGoals) => void }) {
  const [form, setForm] = useState({
    calories: goals.calories.toString(),
    protein: goals.protein.toString(),
    carbs: goals.carbs.toString(),
    fat: goals.fat.toString(),
  });

  return (
    <div className="bg-zinc-900/40 rounded-2xl border border-zinc-800/30 p-4 space-y-4 animate-fadeInUp delay-1">
      <h3 className="text-[11px] font-semibold text-zinc-500 uppercase tracking-[0.12em]">Daily Targets</h3>
      <div className="grid grid-cols-2 gap-3">
        <GoalInput label="Calories" value={form.calories} onChange={(v) => setForm({ ...form, calories: v })} />
        <GoalInput label="Protein (g)" value={form.protein} onChange={(v) => setForm({ ...form, protein: v })} />
        <GoalInput label="Carbs (g)" value={form.carbs} onChange={(v) => setForm({ ...form, carbs: v })} />
        <GoalInput label="Fat (g)" value={form.fat} onChange={(v) => setForm({ ...form, fat: v })} />
      </div>
      <button
        onClick={() => onSave({
          calories: Number(form.calories) || 2500,
          protein: Number(form.protein) || 150,
          carbs: Number(form.carbs) || 300,
          fat: Number(form.fat) || 80,
        })}
        className="w-full bg-gradient-to-r from-orange-600 to-orange-500 hover:from-orange-500 hover:to-orange-400 text-white py-3 rounded-xl font-semibold transition-all active:scale-[0.98] shadow-lg shadow-orange-500/10"
      >
        Save Goals
      </button>
    </div>
  );
}

function GoalInput({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <label className="block text-xs font-medium text-zinc-400 mb-1.5">{label}</label>
      <input
        type="number"
        inputMode="decimal"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-zinc-900/80 rounded-xl px-3.5 py-2.5 text-sm border border-zinc-800/60 focus:border-orange-500/50 focus:ring-2 focus:ring-orange-500/10 focus:outline-none transition-all"
      />
    </div>
  );
}
