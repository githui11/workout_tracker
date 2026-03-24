'use client';

import { useEffect, useState } from 'react';
import type { CyclingSession } from '@/lib/types';
import ProgressChart from '@/components/progress-chart';

type Tab = 'log' | 'history' | 'charts';

export default function CyclingPage() {
  const [sessions, setSessions] = useState<CyclingSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>('log');
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState('');

  useEffect(() => {
    fetch('/api/cycling')
      .then((r) => r.json())
      .then(setSessions)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const today = new Date().toISOString().split('T')[0];
  const todaySession = sessions.find((s) => s.date === today);
  const nextSession = sessions.find((s) => s.date >= today && s.actualDuration === null);
  const currentSession = todaySession || nextSession;

  const [form, setForm] = useState({
    actualDuration: '',
    movingTime: '',
    resistanceLevel: '',
    avgHeartRate: '',
    avgSpeed: '',
    elevationGain: '',
    maxElevation: '',
    calories: '',
    rpe: '',
    notes: '',
  });

  useEffect(() => {
    if (currentSession && currentSession.actualDuration !== null) {
      setForm({
        actualDuration: currentSession.actualDuration?.toString() || '',
        movingTime: currentSession.movingTime || '',
        resistanceLevel: currentSession.resistanceLevel || '',
        avgHeartRate: currentSession.avgHeartRate?.toString() || '',
        avgSpeed: currentSession.avgSpeed?.toString() || '',
        elevationGain: currentSession.elevationGain?.toString() || '',
        maxElevation: currentSession.maxElevation?.toString() || '',
        calories: currentSession.calories?.toString() || '',
        rpe: currentSession.rpe?.toString() || '',
        notes: currentSession.notes || '',
      });
    }
  }, [currentSession]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!currentSession) return;
    setSaving(true);
    try {
      const res = await fetch('/api/cycling', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date: currentSession.date, ...form }),
      });
      if (res.ok) {
        setToast('Saved!');
        setTimeout(() => setToast(''), 2000);
        const updated = await fetch('/api/cycling').then((r) => r.json());
        setSessions(updated);
      }
    } catch {
      setToast('Error saving');
    }
    setSaving(false);
  }

  if (loading) return <div className="flex items-center justify-center h-64 text-zinc-500">Loading...</div>;

  const completedSessions = sessions.filter((s) => s.actualDuration !== null);
  const durationData = completedSessions.map((s) => ({
    label: s.date.slice(5),
    actual: s.actualDuration,
    target: s.targetDuration,
  }));
  const rpeData = completedSessions
    .filter((s) => s.rpe !== null)
    .map((s) => ({
      label: s.date.slice(5),
      rpe: s.rpe,
    }));

  // Goal tracking: 180 min target
  const maxDuration = completedSessions.reduce((max, s) => Math.max(max, s.actualDuration || 0), 0);
  const goalProgress = Math.min(100, Math.round((maxDuration / 180) * 100));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Cycling</h1>
        <div className="mt-2 bg-zinc-900 rounded-lg p-3">
          <div className="flex justify-between text-xs text-zinc-400 mb-1">
            <span>Goal: 3 hours</span>
            <span>{maxDuration} / 180 min ({goalProgress}%)</span>
          </div>
          <div className="w-full bg-zinc-800 rounded-full h-2">
            <div className="bg-blue-500 h-2 rounded-full transition-all" style={{ width: `${goalProgress}%` }} />
          </div>
        </div>
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
        <div>
          {currentSession ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="bg-zinc-900 rounded-xl p-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-zinc-400">Date</span>
                  <span>{currentSession.date} ({currentSession.day})</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-zinc-400">Target</span>
                  <span className="font-medium text-blue-400">{currentSession.targetDuration} min</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Input label="Duration (min)" value={form.actualDuration} onChange={(v) => setForm({ ...form, actualDuration: v })} type="number" />
                <Input label="Moving Time" value={form.movingTime} onChange={(v) => setForm({ ...form, movingTime: v })} placeholder="55:00" />
                <Input label="Resistance" value={form.resistanceLevel} onChange={(v) => setForm({ ...form, resistanceLevel: v })} />
                <Input label="Avg HR (bpm)" value={form.avgHeartRate} onChange={(v) => setForm({ ...form, avgHeartRate: v })} type="number" />
                <Input label="Avg Speed (km/h)" value={form.avgSpeed} onChange={(v) => setForm({ ...form, avgSpeed: v })} type="number" step="0.1" />
                <Input label="Elev. Gain (m)" value={form.elevationGain} onChange={(v) => setForm({ ...form, elevationGain: v })} type="number" />
                <Input label="Max Elev. (m)" value={form.maxElevation} onChange={(v) => setForm({ ...form, maxElevation: v })} type="number" />
                <Input label="Calories" value={form.calories} onChange={(v) => setForm({ ...form, calories: v })} type="number" />
              </div>

              <div>
                <label className="block text-xs text-zinc-400 mb-1">RPE (1-10)</label>
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => setForm({ ...form, rpe: n.toString() })}
                      className={`flex-1 py-2 text-xs rounded-lg border transition-colors ${
                        form.rpe === n.toString()
                          ? 'bg-blue-600 border-blue-500 text-white'
                          : 'bg-zinc-800 border-zinc-700 text-zinc-400'
                      }`}
                    >
                      {n}
                    </button>
                  ))}
                </div>
              </div>

              <Input label="Notes" value={form.notes} onChange={(v) => setForm({ ...form, notes: v })} />

              <button
                type="submit"
                disabled={saving}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white py-3 rounded-xl font-medium transition-colors"
              >
                {saving ? 'Saving...' : 'Save Session'}
              </button>

              {toast && <p className={`text-center text-sm ${toast === 'Saved!' ? 'text-green-400' : 'text-red-400'}`}>{toast}</p>}
            </form>
          ) : (
            <p className="text-zinc-500 text-center py-8">No cycling session scheduled today</p>
          )}
        </div>
      )}

      {tab === 'history' && (
        <div className="space-y-2">
          {completedSessions
            .slice()
            .reverse()
            .map((s) => (
              <div key={s.date} className="bg-zinc-900 rounded-xl p-3 space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="font-medium">{s.date}</span>
                  <span className="text-blue-400">{s.actualDuration} min</span>
                </div>
                <div className="flex gap-4 text-xs text-zinc-400">
                  {s.rpe && <span>RPE {s.rpe}/10</span>}
                  {s.avgHeartRate && <span>{s.avgHeartRate} bpm</span>}
                  {s.calories && <span>{s.calories} cal</span>}
                  {s.elevationGain && <span>+{s.elevationGain}m</span>}
                </div>
              </div>
            ))}
          {completedSessions.length === 0 && (
            <p className="text-zinc-500 text-center py-8">No sessions logged yet</p>
          )}
        </div>
      )}

      {tab === 'charts' && (
        <div className="space-y-6">
          <div>
            <h3 className="text-sm font-semibold text-zinc-400 mb-2">Duration (min)</h3>
            <ProgressChart
              data={durationData}
              lines={[
                { key: 'actual', color: '#3b82f6', name: 'Actual' },
                { key: 'target', color: '#4b5563', name: 'Target' },
              ]}
              yAxisLabel="min"
            />
          </div>
          {rpeData.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-zinc-400 mb-2">RPE Trend</h3>
              <ProgressChart
                data={rpeData}
                lines={[{ key: 'rpe', color: '#f59e0b', name: 'RPE' }]}
                yAxisLabel="RPE"
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function Input({
  label, value, onChange, type = 'text', placeholder, step,
}: {
  label: string; value: string; onChange: (v: string) => void;
  type?: string; placeholder?: string; step?: string;
}) {
  return (
    <div>
      <label className="block text-xs text-zinc-400 mb-1">{label}</label>
      <input
        type={type}
        inputMode={type === 'number' ? 'decimal' : undefined}
        step={step}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full bg-zinc-800 rounded-lg px-3 py-2.5 text-sm border border-zinc-700 focus:border-blue-500 focus:outline-none"
      />
    </div>
  );
}
