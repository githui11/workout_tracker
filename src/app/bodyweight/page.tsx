'use client';

import { useEffect, useState, useMemo } from 'react';
import type { BodyWeightEntry } from '@/lib/types';
import dynamic from 'next/dynamic';

const ProgressChart = dynamic(() => import('@/components/progress-chart'), {
  ssr: false,
  loading: () => <div className="flex items-center justify-center h-40 text-zinc-500 text-sm">Loading chart...</div>,
});

type Tab = 'log' | 'history' | 'charts';

export default function BodyWeightPage() {
  const [entries, setEntries] = useState<BodyWeightEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>('log');
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState('');

  const today = new Date().toISOString().split('T')[0];
  const [form, setForm] = useState({ date: today, weight: '', notes: '' });

  useEffect(() => {
    fetch('/api/bodyweight')
      .then((r) => r.json())
      .then((data: BodyWeightEntry[]) => {
        setEntries(data);
        // Pre-fill if there's an entry for today
        const todayEntry = data.find((e) => e.date === today);
        if (todayEntry) {
          setForm({ date: today, weight: todayEntry.weight.toString(), notes: todayEntry.notes || '' });
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.weight) return;
    setSaving(true);
    try {
      const res = await fetch('/api/bodyweight', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (res.ok) {
        setToast('Saved!');
        setTimeout(() => setToast(''), 2000);
        const updated = await fetch('/api/bodyweight').then((r) => r.json());
        setEntries(updated);
      }
    } catch {
      setToast('Error saving');
    }
    setSaving(false);
  }

  const chartData = useMemo(() => entries.map((e) => ({
    label: e.date.slice(5),
    weight: Number(e.weight),
  })), [entries]);

  const latest = entries.length > 0 ? entries[entries.length - 1] : null;
  const earliest = entries.length > 0 ? entries[0] : null;
  const change = latest && earliest ? (Number(latest.weight) - Number(earliest.weight)).toFixed(1) : null;

  if (loading) return <div className="flex items-center justify-center h-64 text-zinc-500">Loading...</div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Body Weight</h1>
        {latest && (
          <div className="mt-2 bg-zinc-900 rounded-lg p-3">
            <div className="flex justify-between text-sm">
              <span className="text-zinc-400">Current</span>
              <span className="font-bold text-purple-400">{latest.weight} kg</span>
            </div>
            {change && entries.length > 1 && (
              <div className="flex justify-between text-sm mt-1">
                <span className="text-zinc-400">Change</span>
                <span className={Number(change) < 0 ? 'text-green-400' : Number(change) > 0 ? 'text-yellow-400' : 'text-zinc-400'}>
                  {Number(change) > 0 ? '+' : ''}{change} kg
                </span>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="flex gap-1 bg-zinc-900 rounded-lg p-1">
        {(['log', 'history', 'charts'] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 py-2 text-sm rounded-md capitalize transition-colors ${
              tab === t ? 'bg-zinc-700 text-white' : 'text-zinc-500'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === 'log' && (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs text-zinc-400 mb-1">Date</label>
            <input
              type="date"
              value={form.date}
              onChange={(e) => setForm({ ...form, date: e.target.value })}
              className="w-full bg-zinc-800 rounded-lg px-3 py-2.5 text-sm border border-zinc-700 focus:border-purple-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-xs text-zinc-400 mb-1">Weight (kg)</label>
            <input
              type="number"
              inputMode="decimal"
              step="0.1"
              value={form.weight}
              onChange={(e) => setForm({ ...form, weight: e.target.value })}
              placeholder="70.0"
              className="w-full bg-zinc-800 rounded-lg px-3 py-2.5 text-sm border border-zinc-700 focus:border-purple-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-xs text-zinc-400 mb-1">Notes</label>
            <input
              type="text"
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              placeholder="Morning, fasted, etc."
              className="w-full bg-zinc-800 rounded-lg px-3 py-2.5 text-sm border border-zinc-700 focus:border-purple-500 focus:outline-none"
            />
          </div>
          <button
            type="submit"
            disabled={saving || !form.weight}
            className="w-full bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white py-3 rounded-xl font-medium transition-colors"
          >
            {saving ? 'Saving...' : 'Save Weight'}
          </button>
          {toast && <p className={`text-center text-sm ${toast === 'Saved!' ? 'text-green-400' : 'text-red-400'}`}>{toast}</p>}
        </form>
      )}

      {tab === 'history' && (
        <div className="space-y-2">
          {entries
            .slice()
            .reverse()
            .map((e) => (
              <div key={e.date} className="bg-zinc-900 rounded-xl p-3 flex justify-between items-center">
                <span className="text-sm font-medium">{e.date}</span>
                <div className="text-right">
                  <span className="text-purple-400 font-bold">{e.weight} kg</span>
                  {e.notes && <p className="text-xs text-zinc-500">{e.notes}</p>}
                </div>
              </div>
            ))}
          {entries.length === 0 && (
            <p className="text-zinc-500 text-center py-8">No entries yet — start logging your weight</p>
          )}
        </div>
      )}

      {tab === 'charts' && (
        <div>
          <h3 className="text-sm font-semibold text-zinc-400 mb-2">Weight Trend (kg)</h3>
          <ProgressChart
            data={chartData}
            lines={[{ key: 'weight', color: '#a855f7', name: 'Weight' }]}
            yAxisLabel="kg"
          />
        </div>
      )}
    </div>
  );
}
