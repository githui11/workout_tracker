'use client';

import { useEffect, useState, useMemo } from 'react';
import type { BodyWeightEntry } from '@/lib/types';
import dynamic from 'next/dynamic';

const ProgressChart = dynamic(() => import('@/components/progress-chart'), {
  ssr: false,
  loading: () => (
    <div className="h-40 bg-zinc-800/30 rounded-2xl animate-shimmer" />
  ),
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
        const todayEntry = data.find((e) => e.date.split('T')[0] === today);
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
    label: e.date.split('T')[0].slice(5),
    weight: Number(e.weight),
  })), [entries]);

  const latest = entries.length > 0 ? entries[entries.length - 1] : null;
  const earliest = entries.length > 0 ? entries[0] : null;
  const change = latest && earliest ? (Number(latest.weight) - Number(earliest.weight)).toFixed(1) : null;

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-7 w-36 bg-zinc-800/60 rounded-lg animate-shimmer" />
        <div className="h-24 bg-zinc-800/30 rounded-2xl animate-shimmer delay-1" />
        <div className="h-10 bg-zinc-800/40 rounded-xl animate-shimmer delay-2" />
        <div className="h-40 bg-zinc-800/30 rounded-2xl animate-shimmer delay-3" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="animate-fadeInUp">
        <h1 className="text-2xl font-bold tracking-tight">Body Weight</h1>

        {/* Weight summary */}
        {latest && (
          <div className="mt-3 bg-zinc-900/50 backdrop-blur-sm rounded-2xl p-5 border border-zinc-800/30">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider">Current Weight</p>
                <p className="text-3xl font-bold text-purple-400 mt-1 tracking-tight">
                  {latest.weight}<span className="text-sm font-medium text-zinc-500 ml-1">kg</span>
                </p>
              </div>
              {change && entries.length > 1 && (
                <div className={`text-right px-3 py-1.5 rounded-xl text-sm font-bold ${
                  Number(change) < 0 ? 'bg-emerald-500/10 text-emerald-400' :
                  Number(change) > 0 ? 'bg-amber-500/10 text-amber-400' :
                  'bg-zinc-800/50 text-zinc-400'
                }`}>
                  {Number(change) > 0 ? '+' : ''}{change} kg
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Tab switcher */}
      <div className="flex gap-1 bg-zinc-900/50 backdrop-blur-sm rounded-xl p-1 border border-zinc-800/30 animate-fadeInUp delay-1">
        {(['log', 'history', 'charts'] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 py-2 text-sm rounded-lg capitalize transition-all duration-300 font-medium ${
              tab === t
                ? 'bg-purple-500/10 text-purple-400 shadow-[inset_0_1px_0_rgba(168,85,247,0.1)]'
                : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === 'log' && (
        <div className="animate-fadeInUp delay-2">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="bg-zinc-900/40 rounded-2xl border border-zinc-800/30 p-4 space-y-3">
              <h3 className="text-[11px] font-semibold text-zinc-500 uppercase tracking-[0.12em]">Log Entry</h3>
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1.5">Date</label>
                <input
                  type="date"
                  max={today}
                  value={form.date}
                  onChange={(e) => setForm({ ...form, date: e.target.value })}
                  className={`w-full bg-zinc-900/80 rounded-xl px-3.5 py-2.5 text-sm border ${form.date ? 'border-zinc-700' : 'border-zinc-800/60'} focus:border-purple-500/50 focus:ring-2 focus:ring-purple-500/10 focus:outline-none transition-all`}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1.5">Weight (kg)</label>
                <input
                  type="number"
                  inputMode="decimal"
                  step="0.1"
                  value={form.weight}
                  onChange={(e) => setForm({ ...form, weight: e.target.value })}
                  placeholder="70.0"
                  className={`w-full bg-zinc-900/80 rounded-xl px-3.5 py-2.5 text-sm border ${form.weight ? 'border-zinc-700' : 'border-zinc-800/60'} focus:border-purple-500/50 focus:ring-2 focus:ring-purple-500/10 focus:outline-none transition-all placeholder:text-zinc-700`}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1.5">Notes</label>
                <input
                  type="text"
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  placeholder="Morning, fasted, etc."
                  className={`w-full bg-zinc-900/80 rounded-xl px-3.5 py-2.5 text-sm border ${form.notes ? 'border-zinc-700' : 'border-zinc-800/60'} focus:border-purple-500/50 focus:ring-2 focus:ring-purple-500/10 focus:outline-none transition-all placeholder:text-zinc-700`}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={saving || !form.weight}
              className="w-full bg-gradient-to-r from-purple-600 to-purple-500 hover:from-purple-500 hover:to-purple-400 disabled:from-purple-600/50 disabled:to-purple-500/50 text-white py-3.5 rounded-xl font-semibold transition-all duration-200 active:scale-[0.98] shadow-lg shadow-purple-500/10"
            >
              {saving ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Saving
                </span>
              ) : 'Save Weight'}
            </button>

            {toast && (
              <div className={`text-center text-sm font-semibold animate-slideInUp ${
                toast === 'Saved!' ? 'text-emerald-400' : 'text-red-400'
              }`}>
                {toast === 'Saved!' && '✓ '}{toast}
              </div>
            )}
          </form>
        </div>
      )}

      {tab === 'history' && (
        <div className="space-y-2">
          {entries
            .slice()
            .reverse()
            .map((e, i) => (
              <div
                key={e.date}
                className="bg-zinc-900/40 backdrop-blur-sm rounded-2xl p-4 flex justify-between items-center border border-zinc-800/30 animate-fadeInUp"
                style={{ animationDelay: `${i * 40}ms` }}
              >
                <span className="text-sm font-semibold">{e.date.split('T')[0]}</span>
                <div className="text-right">
                  <span className="text-purple-400 font-bold">{e.weight} kg</span>
                  {e.notes && <p className="text-xs text-zinc-600 mt-0.5">{e.notes}</p>}
                </div>
              </div>
            ))}
          {entries.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#3f3f46" strokeWidth="1.5" strokeLinecap="round" className="mb-4">
                <path d="M12 3a4 4 0 00-4 4h8a4 4 0 00-4-4z" />
                <rect x="2" y="7" width="20" height="14" rx="2" />
                <line x1="12" y1="11" x2="12" y2="17" />
                <line x1="9" y1="14" x2="15" y2="14" />
              </svg>
              <p className="text-zinc-400 font-medium text-sm">No entries yet</p>
              <p className="text-zinc-600 text-xs mt-1">Start logging your weight to track trends</p>
            </div>
          )}
        </div>
      )}

      {tab === 'charts' && (
        <div className="animate-fadeInUp delay-1">
          <h3 className="text-[11px] font-semibold text-zinc-600 uppercase tracking-[0.15em] mb-3">Weight Trend (kg)</h3>
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
