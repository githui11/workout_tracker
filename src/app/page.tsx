'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import StatCard from '@/components/stat-card';
import type { WeeklySummary, Adaptation } from '@/lib/types';

export default function Dashboard() {
  const [summary, setSummary] = useState<WeeklySummary | null>(null);
  const [adaptations, setAdaptations] = useState<Adaptation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch('/api/summary').then((r) => r.json()),
      fetch('/api/adapt').then((r) => r.json()),
    ])
      .then(([sum, adapt]) => {
        setSummary(sum);
        setAdaptations(adapt.adaptations || []);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="flex items-center justify-center h-64 text-zinc-500">Loading...</div>;
  }

  if (!summary) {
    return <div className="text-red-400">Failed to load data</div>;
  }

  const pct = (done: number, total: number) =>
    total > 0 ? `${Math.round((done / total) * 100)}%` : '--';

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Workout Tracker</h1>
        <p className="text-zinc-400 text-sm mt-1">
          Week {summary.week} &middot; {summary.dateRange}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
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
      </div>

      <div className="space-y-3">
        <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wide">This Week</h2>
        <div className="bg-zinc-900 rounded-xl p-4 space-y-3">
          <div className="flex justify-between text-sm">
            <span className="text-zinc-400">Running</span>
            <span>{summary.running.sessionsCompleted}/{summary.running.sessionsPlanned} sessions &middot; {summary.running.totalKm} km</span>
          </div>
          {summary.running.avgPace && (
            <div className="flex justify-between text-sm">
              <span className="text-zinc-400">Avg pace</span>
              <span>{summary.running.avgPace} /km</span>
            </div>
          )}
          <div className="flex justify-between text-sm">
            <span className="text-zinc-400">Cycling</span>
            <span>{summary.cycling.sessionsCompleted}/{summary.cycling.sessionsPlanned} sessions &middot; {summary.cycling.totalMinutes} min</span>
          </div>
        </div>
      </div>

      {adaptations.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wide">Recommendations</h2>
          <div className="space-y-2">
            {adaptations.map((a, i) => (
              <div
                key={i}
                className={`rounded-xl p-3 text-sm border ${
                  a.severity === 'warning'
                    ? 'bg-yellow-500/5 border-yellow-500/30 text-yellow-200'
                    : a.severity === 'success'
                    ? 'bg-green-500/5 border-green-500/30 text-green-200'
                    : 'bg-blue-500/5 border-blue-500/30 text-blue-200'
                }`}
              >
                <span className="font-medium capitalize">{a.category}</span>
                <p className="mt-1 text-zinc-300">{a.message}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
