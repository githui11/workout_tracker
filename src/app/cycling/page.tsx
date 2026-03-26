'use client';

import { useEffect, useState, useMemo } from 'react';
import type { CyclingSession, Adaptation } from '@/lib/types';
import dynamic from 'next/dynamic';

const ProgressChart = dynamic(() => import('@/components/progress-chart'), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-40 gap-2">
      <div className="w-5 h-5 border-2 border-zinc-700 border-t-blue-400 rounded-full animate-spin" />
      <span className="text-zinc-500 text-sm">Loading chart...</span>
    </div>
  ),
});

type Tab = 'log' | 'history' | 'charts';

export default function CyclingPage() {
  const [sessions, setSessions] = useState<CyclingSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>('log');
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState('');
  const [adaptations, setAdaptations] = useState<Adaptation[]>([]);

  useEffect(() => {
    fetch('/api/cycling')
      .then((r) => r.json())
      .then(setSessions)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const today = new Date().toISOString().split('T')[0];
  const todayDow = new Date().toLocaleDateString('en-US', { weekday: 'long' });
  const todaySession = sessions.find((s) => s.date === today);
  const nextSession = sessions.find((s) => s.date >= today && s.actualDuration === null);
  const plannedSession = todaySession || nextSession;
  const isAdHoc = !plannedSession;
  const currentSession = plannedSession || {
    date: today,
    day: todayDow,
    week: 0,
    time: 'Ad-hoc',
    targetDuration: 0,
    actualDuration: null,
    notes: '',
  } as CyclingSession;

  const [form, setForm] = useState({
    actualDuration: '',
    notes: '',
  });

  useEffect(() => {
    if (currentSession && currentSession.actualDuration !== null) {
      setForm({
        actualDuration: currentSession.actualDuration?.toString() || '',
        notes: currentSession.notes || '',
      });
    }
  }, [currentSession]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setAdaptations([]);
    try {
      const res = await fetch('/api/cycling', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date: currentSession.date, ...form }),
      });
      if (res.ok) {
        const data = await res.json();
        setToast('Saved!');
        setTimeout(() => setToast(''), 2000);
        if (data.adaptations?.length > 0) {
          setAdaptations(data.adaptations);
        }
        const updated = await fetch('/api/cycling').then((r) => r.json());
        setSessions(updated);
      }
    } catch {
      setToast('Error saving');
    }
    setSaving(false);
  }

  const completedSessions = useMemo(() => sessions.filter((s) => s.actualDuration !== null), [sessions]);
  const durationData = useMemo(() => completedSessions.map((s) => ({
    label: s.date.slice(5),
    actual: s.actualDuration,
    target: s.targetDuration,
  })), [completedSessions]);
  const maxDuration = useMemo(() => completedSessions.reduce((max, s) => Math.max(max, s.actualDuration || 0), 0), [completedSessions]);
  const goalProgress = useMemo(() => Math.min(100, Math.round((maxDuration / 180) * 100)), [maxDuration]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3">
        <div className="w-8 h-8 border-2 border-zinc-700 border-t-blue-400 rounded-full animate-spin" />
        <span className="text-sm text-zinc-500">Loading sessions...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Cycling</h1>
        <div className="mt-3 bg-zinc-900/60 backdrop-blur-sm rounded-2xl p-4 border border-zinc-800/40">
          <div className="flex justify-between text-xs text-zinc-400 mb-2">
            <span className="font-medium">Goal: 3 hours</span>
            <span className="font-semibold text-blue-400">{maxDuration} / 180 min ({goalProgress}%)</span>
          </div>
          <div className="w-full bg-zinc-800 rounded-full h-2.5 overflow-hidden">
            <div
              className="bg-gradient-to-r from-blue-600 to-blue-400 h-full rounded-full transition-all duration-500"
              style={{ width: `${goalProgress}%` }}
            />
          </div>
        </div>
      </div>

      <div className="flex gap-1 bg-zinc-900/60 backdrop-blur-sm rounded-xl p-1 border border-zinc-800/40">
        {(['log', 'history', 'charts'] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 py-2 text-sm rounded-lg capitalize transition-all duration-200 font-medium ${
              tab === t
                ? 'bg-blue-500/15 text-blue-400 shadow-sm'
                : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === 'log' && (
        <div>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="bg-zinc-900/60 backdrop-blur-sm rounded-2xl p-4 space-y-2.5 border border-zinc-800/40">
              {isAdHoc && (
                <div className="text-xs font-semibold text-amber-400 bg-amber-500/10 rounded-lg px-3 py-1.5 mb-2 text-center border border-amber-500/20">
                  Ad-hoc session
                </div>
              )}
              <div className="flex justify-between text-sm">
                <span className="text-zinc-400">Date</span>
                <span className="font-medium">{currentSession.date} ({currentSession.day})</span>
              </div>
              {!isAdHoc && (
                <div className="flex justify-between text-sm">
                  <span className="text-zinc-400">Target</span>
                  <span className="font-semibold text-blue-400">{currentSession.targetDuration} min</span>
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1.5">Duration (min)</label>
              <input
                type="number"
                inputMode="decimal"
                value={form.actualDuration}
                onChange={(e) => setForm({ ...form, actualDuration: e.target.value })}
                className="w-full bg-zinc-900 rounded-xl px-3 py-2.5 text-sm border border-zinc-800 focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/10 focus:outline-none transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1.5">Notes</label>
              <input
                type="text"
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                className="w-full bg-zinc-900 rounded-xl px-3 py-2.5 text-sm border border-zinc-800 focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/10 focus:outline-none transition-all"
              />
            </div>

            <button
              type="submit"
              disabled={saving}
              className="w-full bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 disabled:opacity-50 disabled:hover:from-blue-600 disabled:hover:to-blue-500 text-white py-3 rounded-xl font-semibold transition-all active:scale-[0.98] shadow-lg shadow-blue-500/10"
            >
              {saving ? 'Saving...' : 'Save Session'}
            </button>

            {toast && <p className={`text-center text-sm font-medium ${toast === 'Saved!' ? 'text-green-400' : 'text-red-400'}`}>{toast}</p>}

            {adaptations.length > 0 && (
              <div className="space-y-2">
                {adaptations.map((a, i) => (
                  <div key={i} className={`rounded-2xl p-4 text-sm border backdrop-blur-sm ${
                    a.severity === 'warning' ? 'bg-amber-500/5 border-amber-500/20 text-amber-200'
                      : a.severity === 'success' ? 'bg-emerald-500/5 border-emerald-500/20 text-emerald-200'
                      : 'bg-blue-500/5 border-blue-500/20 text-blue-200'
                  }`}>
                    <p>{a.message}</p>
                    {a.applied && a.adjustedValue && (
                      <p className="text-xs mt-1.5 opacity-70">Next session adjusted to {a.adjustedValue}</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </form>
        </div>
      )}

      {tab === 'history' && (
        <div className="space-y-2">
          {completedSessions
            .slice()
            .reverse()
            .map((s) => (
              <div key={s.date} className="bg-zinc-900/60 backdrop-blur-sm rounded-2xl p-4 space-y-1.5 border border-zinc-800/40">
                <div className="flex justify-between text-sm">
                  <span className="font-semibold">{s.date}</span>
                  <span className="text-blue-400 font-medium">{s.actualDuration} min</span>
                </div>
                {s.notes && <p className="text-xs text-zinc-500 leading-relaxed">{s.notes}</p>}
              </div>
            ))}
          {completedSessions.length === 0 && (
            <p className="text-zinc-500 text-center py-12 text-sm">No sessions logged yet</p>
          )}
        </div>
      )}

      {tab === 'charts' && (
        <div className="space-y-6">
          <div>
            <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-widest mb-3">Duration (min)</h3>
            <ProgressChart
              data={durationData}
              lines={[
                { key: 'actual', color: '#3b82f6', name: 'Actual' },
                { key: 'target', color: '#4b5563', name: 'Target' },
              ]}
              yAxisLabel="min"
            />
          </div>
        </div>
      )}
    </div>
  );
}
