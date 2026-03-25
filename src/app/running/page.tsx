'use client';

import { useEffect, useState } from 'react';
import type { RunningSession, Adaptation } from '@/lib/types';
import ProgressChart from '@/components/progress-chart';

type Tab = 'log' | 'history' | 'charts';

export default function RunningPage() {
  const [sessions, setSessions] = useState<RunningSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>('log');
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState('');
  const [adaptations, setAdaptations] = useState<Adaptation[]>([]);

  useEffect(() => {
    fetch('/api/running')
      .then((r) => r.json())
      .then(setSessions)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const today = new Date().toISOString().split('T')[0];
  const todayDow = new Date().toLocaleDateString('en-US', { weekday: 'long' });
  const todaySession = sessions.find((s) => s.date === today);
  const nextSession = sessions.find((s) => s.date >= today && s.actualDistance === null);
  const plannedSession = todaySession || nextSession;
  const isAdHoc = !plannedSession;
  const currentSession = plannedSession || {
    date: today,
    day: todayDow,
    phase: 'Ad-hoc',
    workoutType: 'Free Run',
    targetDistance: 0,
    targetPace: '-',
    week: 0,
    time: 'Ad-hoc',
    actualDistance: null,
    actualPace: null,
    duration: null,
    movingTime: null,
    elevationGain: null,
    maxElevation: null,
    warmupDone: '',
    howLegsFeel: '',
    notes: '',
  } as RunningSession;

  const [form, setForm] = useState({
    actualDistance: '',
    actualPace: '',
    duration: '',
    movingTime: '',
    elevationGain: '',
    maxElevation: '',
    warmupDone: '',
    howLegsFeel: '',
    notes: '',
  });

  // Pre-fill form when currentSession loads
  useEffect(() => {
    if (currentSession && currentSession.actualDistance !== null) {
      setForm({
        actualDistance: currentSession.actualDistance?.toString() || '',
        actualPace: currentSession.actualPace || '',
        duration: currentSession.duration?.toString() || '',
        movingTime: currentSession.movingTime || '',
        elevationGain: currentSession.elevationGain?.toString() || '',
        maxElevation: currentSession.maxElevation?.toString() || '',
        warmupDone: currentSession.warmupDone || '',
        howLegsFeel: currentSession.howLegsFeel || '',
        notes: currentSession.notes || '',
      });
    }
  }, [currentSession]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setAdaptations([]);
    try {
      const res = await fetch('/api/running', {
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
        const updated = await fetch('/api/running').then((r) => r.json());
        setSessions(updated);
      }
    } catch {
      setToast('Error saving');
    }
    setSaving(false);
  }

  if (loading) return <div className="flex items-center justify-center h-64 text-zinc-500">Loading...</div>;

  // Chart data
  const completedSessions = sessions.filter((s) => s.actualDistance !== null);
  const distanceData = completedSessions.map((s) => ({
    label: s.date.slice(5),
    distance: s.actualDistance,
    target: s.targetDistance,
  }));
  const elevationData = completedSessions
    .filter((s) => s.elevationGain !== null)
    .map((s) => ({
      label: s.date.slice(5),
      elevation: s.elevationGain,
    }));

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Running</h1>

      {/* Tab switcher */}
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

      {/* LOG TAB */}
      {tab === 'log' && (
        <div>
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Target info */}
              <div className="bg-zinc-900 rounded-xl p-4 space-y-2">
                {isAdHoc && (
                  <div className="text-xs font-medium text-yellow-400 bg-yellow-500/10 rounded-lg px-2 py-1 mb-2 text-center">
                    Ad-hoc session
                  </div>
                )}
                <div className="flex justify-between text-sm">
                  <span className="text-zinc-400">Date</span>
                  <span>{currentSession.date} ({currentSession.day})</span>
                </div>
                {!isAdHoc && (
                  <>
                    <div className="flex justify-between text-sm">
                      <span className="text-zinc-400">Phase</span>
                      <span className="text-xs">{currentSession.phase}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-zinc-400">Workout</span>
                      <span className="font-medium text-green-400">{currentSession.workoutType}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-zinc-400">Target</span>
                      <span>{currentSession.targetDistance} km @ {currentSession.targetPace}</span>
                    </div>
                  </>
                )}
              </div>

              {/* Actual inputs */}
              <div className="grid grid-cols-2 gap-3">
                <Input label="Distance (km)" value={form.actualDistance} onChange={(v) => setForm({ ...form, actualDistance: v })} type="number" step="0.1" />
                <Input label="Pace (min/km)" value={form.actualPace} onChange={(v) => setForm({ ...form, actualPace: v })} placeholder="6:30" />
                <Input label="Duration (min)" value={form.duration} onChange={(v) => setForm({ ...form, duration: v })} type="number" />
                <Input label="Moving Time" value={form.movingTime} onChange={(v) => setForm({ ...form, movingTime: v })} placeholder="25:30" />
                <Input label="Elev. Gain (m)" value={form.elevationGain} onChange={(v) => setForm({ ...form, elevationGain: v })} type="number" />
                <Input label="Max Elev. (m)" value={form.maxElevation} onChange={(v) => setForm({ ...form, maxElevation: v })} type="number" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-zinc-400 mb-1">Warm-up?</label>
                  <select
                    value={form.warmupDone}
                    onChange={(e) => setForm({ ...form, warmupDone: e.target.value })}
                    className="w-full bg-zinc-800 rounded-lg px-3 py-2.5 text-sm border border-zinc-700"
                  >
                    <option value="">--</option>
                    <option value="Yes">Yes</option>
                    <option value="No">No</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-zinc-400 mb-1">How Legs Feel</label>
                  <select
                    value={form.howLegsFeel}
                    onChange={(e) => setForm({ ...form, howLegsFeel: e.target.value })}
                    className="w-full bg-zinc-800 rounded-lg px-3 py-2.5 text-sm border border-zinc-700"
                  >
                    <option value="">--</option>
                    <option value="1">1 - Wrecked</option>
                    <option value="2">2 - Sore</option>
                    <option value="3">3 - OK</option>
                    <option value="4">4 - Good</option>
                    <option value="5">5 - Fresh</option>
                  </select>
                </div>
              </div>

              <Input label="Notes" value={form.notes} onChange={(v) => setForm({ ...form, notes: v })} />

              <button
                type="submit"
                disabled={saving}
                className="w-full bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white py-3 rounded-xl font-medium transition-colors"
              >
                {saving ? 'Saving...' : 'Save Session'}
              </button>

              {toast && (
                <p className={`text-center text-sm ${toast === 'Saved!' ? 'text-green-400' : 'text-red-400'}`}>
                  {toast}
                </p>
              )}

              {adaptations.length > 0 && (
                <div className="space-y-2">
                  {adaptations.map((a, i) => (
                    <div key={i} className={`rounded-xl p-3 text-sm border ${
                      a.severity === 'warning' ? 'bg-yellow-500/5 border-yellow-500/30 text-yellow-200'
                        : a.severity === 'success' ? 'bg-green-500/5 border-green-500/30 text-green-200'
                        : 'bg-blue-500/5 border-blue-500/30 text-blue-200'
                    }`}>
                      <p>{a.message}</p>
                      {a.applied && a.adjustedValue && (
                        <p className="text-xs mt-1 opacity-75">Next session adjusted to {a.adjustedValue}</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </form>
        </div>
      )}

      {/* HISTORY TAB */}
      {tab === 'history' && (
        <div className="space-y-2">
          {sessions
            .filter((s) => s.actualDistance !== null)
            .reverse()
            .map((s) => (
              <div key={s.date} className="bg-zinc-900 rounded-xl p-3 space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="font-medium">{s.date}</span>
                  <span className="text-green-400">{s.workoutType}</span>
                </div>
                <div className="flex gap-4 text-xs text-zinc-400">
                  <span>{s.actualDistance} km</span>
                  {s.actualPace && <span>{s.actualPace} /km</span>}
                  {s.duration && <span>{s.duration} min</span>}
                  {s.elevationGain && <span>+{s.elevationGain}m</span>}
                  {s.howLegsFeel && <span>Legs: {s.howLegsFeel}/5</span>}
                </div>
                {s.notes && <p className="text-xs text-zinc-500">{s.notes}</p>}
              </div>
            ))}
          {completedSessions.length === 0 && (
            <p className="text-zinc-500 text-center py-8">No sessions logged yet</p>
          )}
        </div>
      )}

      {/* CHARTS TAB */}
      {tab === 'charts' && (
        <div className="space-y-6">
          <div>
            <h3 className="text-sm font-semibold text-zinc-400 mb-2">Distance (km)</h3>
            <ProgressChart
              data={distanceData}
              lines={[
                { key: 'distance', color: '#22c55e', name: 'Actual' },
                { key: 'target', color: '#4b5563', name: 'Target' },
              ]}
              yAxisLabel="km"
            />
          </div>
          {elevationData.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-zinc-400 mb-2">Elevation Gain (m)</h3>
              <ProgressChart
                data={elevationData}
                lines={[{ key: 'elevation', color: '#f59e0b', name: 'Elevation' }]}
                yAxisLabel="m"
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function Input({
  label,
  value,
  onChange,
  type = 'text',
  placeholder,
  step,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
  step?: string;
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
        className="w-full bg-zinc-800 rounded-lg px-3 py-2.5 text-sm border border-zinc-700 focus:border-green-500 focus:outline-none"
      />
    </div>
  );
}
