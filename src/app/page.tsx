'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import StatCard from '@/components/stat-card';
import type { WeeklySummary, Adaptation, BodyWeightEntry, MealEntry, NutritionGoals } from '@/lib/types';

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 5) return 'Good night';
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

export default function Dashboard() {
  const [summary, setSummary] = useState<WeeklySummary | null>(null);
  const [adaptations, setAdaptations] = useState<Adaptation[]>([]);
  const [latestWeight, setLatestWeight] = useState<BodyWeightEntry | null>(null);
  const [todayCalories, setTodayCalories] = useState<number>(0);
  const [calorieGoal, setCalorieGoal] = useState<number>(2500);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const today = new Date().toISOString().split('T')[0];
    Promise.all([
      fetch('/api/summary').then((r) => r.json()),
      fetch('/api/adapt').then((r) => r.json()),
      fetch('/api/bodyweight').then((r) => r.json()),
      fetch(`/api/meals?date=${today}`).then((r) => r.json()).catch(() => []),
      fetch('/api/nutrition-goals').then((r) => r.json()).catch(() => null),
    ])
      .then(([sum, adapt, weightEntries, meals, goals]) => {
        setSummary(sum);
        setAdaptations(adapt.adaptations || []);
        if (Array.isArray(weightEntries) && weightEntries.length > 0) {
          setLatestWeight(weightEntries[weightEntries.length - 1]);
        }
        if (Array.isArray(meals)) {
          setTodayCalories(Math.round(meals.reduce((s: number, m: MealEntry) => s + m.calories * m.servings, 0)));
        }
        if (goals && !goals.error) {
          setCalorieGoal(goals.calories);
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="space-y-8">
        <div className="space-y-2">
          <div className="h-5 w-32 bg-zinc-800/60 rounded-lg animate-shimmer" />
          <div className="h-7 w-44 bg-zinc-800/60 rounded-lg animate-shimmer delay-1" />
          <div className="h-4 w-28 bg-zinc-800/40 rounded-md animate-shimmer delay-2" />
        </div>
        <div className="grid grid-cols-3 gap-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className={`h-32 bg-zinc-800/40 rounded-2xl animate-shimmer delay-${i + 1}`} />
          ))}
        </div>
        <div className="space-y-3">
          <div className="h-3 w-20 bg-zinc-800/40 rounded animate-shimmer delay-3" />
          <div className="h-28 bg-zinc-800/30 rounded-2xl animate-shimmer delay-4" />
        </div>
      </div>
    );
  }

  if (!summary) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <p className="text-red-400 font-medium">Failed to load data</p>
          <p className="text-zinc-500 text-sm mt-1">Check your connection and refresh</p>
        </div>
      </div>
    );
  }

  const runProgress = summary.running.sessionsPlanned > 0
    ? Math.round((summary.running.sessionsCompleted / summary.running.sessionsPlanned) * 100)
    : 0;
  const cycleProgress = summary.cycling.sessionsPlanned > 0
    ? Math.round((summary.cycling.sessionsCompleted / summary.cycling.sessionsPlanned) * 100)
    : 0;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="animate-fadeInUp">
        <p className="text-sm font-medium text-zinc-500">{getGreeting()}</p>
        <h1 className="text-2xl font-bold tracking-tight mt-0.5">Your Week</h1>
        <p className="text-zinc-600 text-xs mt-1 font-medium">
          Week {summary.week} &middot; {summary.dateRange}
        </p>
      </div>

      {/* Stat Cards with Progress Rings */}
      <div className="grid grid-cols-3 gap-3 animate-fadeInUp delay-1">
        <Link href="/running">
          <StatCard
            title="Running"
            value={`${summary.running.totalKm} km`}
            subtitle={`${summary.running.sessionsCompleted}/${summary.running.sessionsPlanned} sessions`}
            color="green"
            progress={runProgress}
          />
        </Link>
        <Link href="/cycling">
          <StatCard
            title="Cycling"
            value={`${summary.cycling.totalMinutes} min`}
            subtitle={`${summary.cycling.sessionsCompleted}/${summary.cycling.sessionsPlanned} sessions`}
            color="blue"
            progress={cycleProgress}
          />
        </Link>
        <Link href="/bodyweight">
          <StatCard
            title="Weight"
            value={latestWeight ? `${latestWeight.weight} kg` : '--'}
            subtitle={latestWeight ? latestWeight.date.split('T')[0] : 'No data'}
            color="purple"
          />
        </Link>
      </div>

      {/* This Week Details */}
      <div className="space-y-3 animate-fadeInUp delay-3">
        <h2 className="text-[11px] font-semibold text-zinc-600 uppercase tracking-[0.15em]">This Week</h2>
        <div className="bg-zinc-900/50 backdrop-blur-sm rounded-2xl border border-zinc-800/30 divide-y divide-zinc-800/30">
          <div className="px-4 py-3.5 flex justify-between items-center">
            <div className="flex items-center gap-2.5">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              <span className="text-sm text-zinc-400">Running</span>
            </div>
            <div className="text-right">
              <span className="text-sm font-semibold">{summary.running.totalKm} km</span>
              <span className="text-xs text-zinc-500 ml-2">{summary.running.sessionsCompleted}/{summary.running.sessionsPlanned} runs</span>
            </div>
          </div>
          {summary.running.avgPace && (
            <div className="px-4 py-3 flex justify-between items-center">
              <span className="text-sm text-zinc-500 pl-4">Avg pace</span>
              <span className="text-sm font-semibold text-emerald-400 font-[var(--font-mono)]">{summary.running.avgPace} /km</span>
            </div>
          )}
          <div className="px-4 py-3.5 flex justify-between items-center">
            <div className="flex items-center gap-2.5">
              <div className="w-1.5 h-1.5 rounded-full bg-blue-400" />
              <span className="text-sm text-zinc-400">Cycling</span>
            </div>
            <div className="text-right">
              <span className="text-sm font-semibold">{summary.cycling.totalMinutes} min</span>
              <span className="text-xs text-zinc-500 ml-2">{summary.cycling.sessionsCompleted}/{summary.cycling.sessionsPlanned} rides</span>
            </div>
          </div>
          <div className="px-4 py-3.5 flex justify-between items-center">
            <div className="flex items-center gap-2.5">
              <div className="w-1.5 h-1.5 rounded-full bg-orange-400" />
              <span className="text-sm text-zinc-400">Nutrition today</span>
            </div>
            <div className="text-right">
              <span className="text-sm font-semibold">{todayCalories} cal</span>
              <span className="text-xs text-zinc-500 ml-2">/ {calorieGoal}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Recommendations */}
      {adaptations.length > 0 && (
        <div className="space-y-3 animate-fadeInUp delay-4">
          <h2 className="text-[11px] font-semibold text-zinc-600 uppercase tracking-[0.15em]">Recommendations</h2>
          <div className="space-y-2">
            {adaptations.map((a, i) => (
              <div
                key={i}
                className={`rounded-2xl p-4 text-sm border backdrop-blur-sm animate-fadeInUp ${
                  a.severity === 'warning'
                    ? 'bg-amber-500/[0.04] border-amber-500/15'
                    : a.severity === 'success'
                    ? 'bg-emerald-500/[0.04] border-emerald-500/15'
                    : 'bg-blue-500/[0.04] border-blue-500/15'
                }`}
                style={{ animationDelay: `${300 + i * 80}ms` }}
              >
                <div className="flex items-start gap-3">
                  <span className="text-base mt-px">
                    {a.severity === 'warning' ? '!' : a.severity === 'success' ? '✓' : 'i'}
                  </span>
                  <div>
                    <span className={`font-semibold text-xs uppercase tracking-wide ${
                      a.severity === 'warning' ? 'text-amber-400' : a.severity === 'success' ? 'text-emerald-400' : 'text-blue-400'
                    }`}>{a.category}</span>
                    <p className="mt-1 text-zinc-300 leading-relaxed text-[13px]">{a.message}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
