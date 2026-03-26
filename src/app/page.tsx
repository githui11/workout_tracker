'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import StatCard from '@/components/stat-card';
import type { WeeklySummary, Adaptation, BodyWeightEntry } from '@/lib/types';

export default function Dashboard() {
  const [summary, setSummary] = useState<WeeklySummary | null>(null);
  const [adaptations, setAdaptations] = useState<Adaptation[]>([]);
  const [latestWeight, setLatestWeight] = useState<BodyWeightEntry | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch('/api/summary').then((r) => r.json()),
      fetch('/api/adapt').then((r) => r.json()),
      fetch('/api/bodyweight').then((r) => r.json()),
    ])
      .then(([sum, adapt, weightEntries]) => {
        setSummary(sum);
        setAdaptations(adapt.adaptations || []);
        if (Array.isArray(weightEntries) && weightEntries.length > 0) {
          setLatestWeight(weightEntries[weightEntries.length - 1]);
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3">
        <div className="w-8 h-8 border-2 border-zinc-700 border-t-blue-400 rounded-full animate-spin" />
        <span className="text-sm text-zinc-500">Loading dashboard...</span>
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

  const pct = (done: number, total: number) =>
    total > 0 ? `${Math.round((done / total) * 100)}%` : '--';

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Workout Tracker</h1>
        <p className="text-zinc-500 text-sm mt-1">
          Week {summary.week} &middot; {summary.dateRange}
        </p>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <Link href="/running">
          <StatCard
            title="Running"
            value={`${summary.running.totalKm} km`}
            subtitle={`${pct(summary.running.sessionsCompleted, summary.running.sessionsPlanned)} done`}
            color="green"
          />
        </Link>
        <Link href="/cycling">
          <StatCard
            title="Cycling"
            value={`${summary.cycling.totalMinutes} min`}
            subtitle={`${pct(summary.cycling.sessionsCompleted, summary.cycling.sessionsPlanned)} done`}
            color="blue"
          />
        </Link>
        <Link href="/bodyweight">
          <StatCard
            title="Weight"
            value={latestWeight ? `${latestWeight.weight} kg` : '--'}
            subtitle={latestWeight ? latestWeight.date : 'No data'}
            color="purple"
          />
        </Link>
      </div>

      <div className="space-y-3">
        <h2 className="text-xs font-semibold text-zinc-500 uppercase tracking-widest">This Week</h2>
        <div className="bg-zinc-900/60 backdrop-blur-sm rounded-2xl p-4 space-y-3 border border-zinc-800/50">
          <div className="flex justify-between items-center text-sm">
            <span className="text-zinc-400">Running</span>
            <span className="font-medium">{summary.running.sessionsCompleted}/{summary.running.sessionsPlanned} sessions &middot; {summary.running.totalKm} km</span>
          </div>
          {summary.running.avgPace && (
            <div className="flex justify-between items-center text-sm">
              <span className="text-zinc-400">Avg pace</span>
              <span className="font-medium text-green-400">{summary.running.avgPace} /km</span>
            </div>
          )}
          <div className="h-px bg-zinc-800/60" />
          <div className="flex justify-between items-center text-sm">
            <span className="text-zinc-400">Cycling</span>
            <span className="font-medium">{summary.cycling.sessionsCompleted}/{summary.cycling.sessionsPlanned} sessions &middot; {summary.cycling.totalMinutes} min</span>
          </div>
        </div>
      </div>

      {adaptations.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-xs font-semibold text-zinc-500 uppercase tracking-widest">Recommendations</h2>
          <div className="space-y-2">
            {adaptations.map((a, i) => (
              <div
                key={i}
                className={`rounded-2xl p-4 text-sm border backdrop-blur-sm ${
                  a.severity === 'warning'
                    ? 'bg-amber-500/5 border-amber-500/20 text-amber-200'
                    : a.severity === 'success'
                    ? 'bg-emerald-500/5 border-emerald-500/20 text-emerald-200'
                    : 'bg-blue-500/5 border-blue-500/20 text-blue-200'
                }`}
              >
                <span className="font-semibold capitalize">{a.category}</span>
                <p className="mt-1 text-zinc-300 leading-relaxed">{a.message}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
