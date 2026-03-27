'use client';

import { useEffect, useState, useMemo } from 'react';
import type { RunningSession, Adaptation } from '@/lib/types';
import dynamic from 'next/dynamic';

const ProgressChart = dynamic(() => import('@/components/progress-chart'), {
  ssr: false,
  loading: () => (
    <div className="h-40 bg-zinc-800/30 rounded-2xl animate-shimmer" />
  ),
});

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
  // Find earliest unlogged session — if you skipped Wednesday, you do Wednesday's workout next
  const earliestUnlogged = sessions.find((s) => s.actualDistance === null);
  const todaySession = sessions.find((s) => s.date === today && s.actualDistance !== null);
  const plannedSession = todaySession || earliestUnlogged;
  const isAdHoc = !plannedSession;
  const isCarryOver = plannedSession && plannedSession.date < today && plannedSession.actualDistance === null;
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

  const [logDate, setLogDate] = useState(today);

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

  async function handleDelete(date: string) {
    await fetch(`/api/running?date=${date}`, { method: 'DELETE' });
    const updated = await fetch('/api/running').then((r) => r.json());
    setSessions(updated);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setAdaptations([]);
    try {
      const res = await fetch('/api/running', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date: logDate, ...form }),
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

  const completedSessions = useMemo(() => sessions.filter((s) => s.actualDistance !== null), [sessions]);
  const distanceData = useMemo(() => completedSessions.map((s) => ({
    label: s.date.slice(5),
    distance: s.actualDistance,
    target: s.targetDistance,
  })), [completedSessions]);
  const elevationData = useMemo(() => completedSessions
    .filter((s) => s.elevationGain !== null)
    .map((s) => ({
      label: s.date.slice(5),
      elevation: s.elevationGain,
    })), [completedSessions]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-7 w-28 bg-zinc-800/60 rounded-lg animate-shimmer" />
        <div className="h-10 bg-zinc-800/40 rounded-xl animate-shimmer delay-1" />
        <div className="h-32 bg-zinc-800/30 rounded-2xl animate-shimmer delay-2" />
        <div className="grid grid-cols-2 gap-3">
          {[0, 1, 2, 3].map(i => <div key={i} className={`h-16 bg-zinc-800/30 rounded-xl animate-shimmer delay-${i + 1}`} />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold tracking-tight animate-fadeInUp">Running</h1>

      {/* Tab switcher */}
      <div className="flex gap-1 bg-zinc-900/50 backdrop-blur-sm rounded-xl p-1 border border-zinc-800/30 animate-fadeInUp delay-1">
        {(['log', 'history', 'charts'] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 py-2 text-sm rounded-lg capitalize transition-all duration-300 font-medium ${
              tab === t
                ? 'bg-emerald-500/10 text-emerald-400 shadow-[inset_0_1px_0_rgba(16,185,129,0.1)]'
                : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {/* LOG TAB */}
      {tab === 'log' && (
        <div className="animate-fadeInUp delay-2">
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Session info card */}
            <div className="bg-zinc-900/50 backdrop-blur-sm rounded-2xl p-4 space-y-2.5 border border-zinc-800/30">
              {isAdHoc && (
                <div className="text-xs font-semibold text-amber-400 bg-amber-500/[0.06] rounded-lg px-3 py-1.5 mb-2 text-center border border-amber-500/15">
                  Ad-hoc session
                </div>
              )}
              {isCarryOver && (
                <div className="text-xs font-semibold text-blue-400 bg-blue-500/[0.06] rounded-lg px-3 py-1.5 mb-2 text-center border border-blue-500/15">
                  Carried over from {currentSession.date} ({currentSession.day})
                </div>
              )}
              <div className="flex justify-between items-center text-sm">
                <span className="text-zinc-500">Date</span>
                <input
                  type="date"
                  max={today}
                  value={logDate}
                  onChange={(e) => setLogDate(e.target.value)}
                  className="bg-transparent text-right font-medium focus:outline-none text-white"
                />
              </div>
              {!isAdHoc && (
                <>
                  <div className="flex justify-between text-sm">
                    <span className="text-zinc-500">Phase</span>
                    <span className="text-xs font-medium text-zinc-300">{currentSession.phase}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-zinc-500">Workout</span>
                    <span className="font-semibold text-emerald-400">{currentSession.workoutType}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-zinc-500">Target</span>
                    <span className="font-medium">{currentSession.targetDistance} km @ {currentSession.targetPace}</span>
                  </div>
                </>
              )}
            </div>

            {/* Performance group */}
            <div className="bg-zinc-900/40 rounded-2xl border border-zinc-800/30 p-4 space-y-3">
              <h3 className="text-[11px] font-semibold text-zinc-500 uppercase tracking-[0.12em]">Performance</h3>
              <div className="grid grid-cols-2 gap-3">
                <Input label="Distance (km)" value={form.actualDistance} onChange={(v) => setForm({ ...form, actualDistance: v })} type="number" step="0.1" accent="emerald" />
                <Input label="Pace (min/km)" value={form.actualPace} onChange={(v) => setForm({ ...form, actualPace: v })} placeholder="6:30" accent="emerald" />
                <Input label="Moving Time" value={form.movingTime} onChange={(v) => setForm({ ...form, movingTime: v })} placeholder="25:30" accent="emerald" />
              </div>
            </div>

            {/* Terrain group */}
            <div className="bg-zinc-900/40 rounded-2xl border border-zinc-800/30 p-4 space-y-3">
              <h3 className="text-[11px] font-semibold text-zinc-500 uppercase tracking-[0.12em]">Terrain</h3>
              <div className="grid grid-cols-2 gap-3">
                <Input label="Elev. Gain (m)" value={form.elevationGain} onChange={(v) => setForm({ ...form, elevationGain: v })} type="number" accent="emerald" />
                <Input label="Max Elev. (m)" value={form.maxElevation} onChange={(v) => setForm({ ...form, maxElevation: v })} type="number" accent="emerald" />
              </div>
            </div>

            {/* Recovery group */}
            <div className="bg-zinc-900/40 rounded-2xl border border-zinc-800/30 p-4 space-y-3">
              <h3 className="text-[11px] font-semibold text-zinc-500 uppercase tracking-[0.12em]">Recovery</h3>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-zinc-400 mb-1.5">Warm-up?</label>
                  <select
                    value={form.warmupDone}
                    onChange={(e) => setForm({ ...form, warmupDone: e.target.value })}
                    className="w-full bg-zinc-900/80 rounded-xl px-3.5 py-2.5 text-sm border border-zinc-800/60 focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/10 focus:outline-none transition-all"
                  >
                    <option value="">--</option>
                    <option value="Yes">Yes</option>
                    <option value="No">No</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-400 mb-1.5">How Legs Feel</label>
                  <select
                    value={form.howLegsFeel}
                    onChange={(e) => setForm({ ...form, howLegsFeel: e.target.value })}
                    className="w-full bg-zinc-900/80 rounded-xl px-3.5 py-2.5 text-sm border border-zinc-800/60 focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/10 focus:outline-none transition-all"
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
              <Input label="Notes" value={form.notes} onChange={(v) => setForm({ ...form, notes: v })} accent="emerald" />
            </div>

            <button
              type="submit"
              disabled={saving}
              className="w-full bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 disabled:from-emerald-600/50 disabled:to-emerald-500/50 text-white py-3.5 rounded-xl font-semibold transition-all duration-200 active:scale-[0.98] shadow-lg shadow-emerald-500/10"
            >
              {saving ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Saving
                </span>
              ) : 'Save Session'}
            </button>

            {toast && (
              <div className={`text-center text-sm font-semibold animate-slideInUp ${
                toast === 'Saved!' ? 'text-emerald-400' : 'text-red-400'
              }`}>
                {toast === 'Saved!' && '✓ '}{toast}
              </div>
            )}

            {adaptations.length > 0 && (
              <div className="space-y-2">
                {adaptations.map((a, i) => (
                  <div key={i} className={`rounded-2xl p-4 text-sm border backdrop-blur-sm animate-fadeInUp ${
                    a.severity === 'warning' ? 'bg-amber-500/[0.04] border-amber-500/15 text-amber-200'
                      : a.severity === 'success' ? 'bg-emerald-500/[0.04] border-emerald-500/15 text-emerald-200'
                      : 'bg-blue-500/[0.04] border-blue-500/15 text-blue-200'
                  }`} style={{ animationDelay: `${i * 80}ms` }}>
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

      {/* HISTORY TAB */}
      {tab === 'history' && (
        <div className="space-y-2">
          {sessions
            .filter((s) => s.actualDistance !== null)
            .reverse()
            .map((s, i) => (
              <div
                key={s.date}
                className="bg-zinc-900/40 backdrop-blur-sm rounded-2xl p-4 border border-zinc-800/30 animate-fadeInUp"
                style={{ animationDelay: `${i * 40}ms` }}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-sm font-semibold">{s.date}</span>
                    <span className="text-xs text-emerald-400/70 font-medium ml-2">{s.workoutType}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-emerald-400 font-bold text-sm">{s.actualDistance} km</span>
                    <button
                      onClick={() => handleDelete(s.date)}
                      className="text-zinc-600 hover:text-red-400 transition-colors"
                      aria-label="Delete session"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14H6L5 6" /><path d="M10 11v6M14 11v6" /><path d="M9 6V4h6v2" />
                      </svg>
                    </button>
                  </div>
                </div>
                <div className="flex gap-3 text-[11px] text-zinc-500 mt-2">
                  {s.actualPace && <span>{s.actualPace} /km</span>}
                  {s.duration && <span>{s.duration} min</span>}
                  {s.elevationGain && <span>+{s.elevationGain}m</span>}
                  {s.howLegsFeel && <span>Legs {s.howLegsFeel}/5</span>}
                </div>
                {s.notes && <p className="text-xs text-zinc-600 mt-2 leading-relaxed">{s.notes}</p>}
              </div>
            ))}
          {completedSessions.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#3f3f46" strokeWidth="1.5" strokeLinecap="round" className="mb-4">
                <circle cx="17" cy="4" r="2" />
                <path d="M15 21l-3-6-4 3-3-3" />
                <path d="M12 15l2-8 4 2 3-3" />
              </svg>
              <p className="text-zinc-400 font-medium text-sm">No runs logged yet</p>
              <p className="text-zinc-600 text-xs mt-1">Complete your first session to see it here</p>
            </div>
          )}
        </div>
      )}

      {/* CHARTS TAB */}
      {tab === 'charts' && (
        <div className="space-y-6 animate-fadeInUp delay-1">
          <div>
            <h3 className="text-[11px] font-semibold text-zinc-600 uppercase tracking-[0.15em] mb-3">Distance (km)</h3>
            <ProgressChart
              data={distanceData}
              lines={[
                { key: 'distance', color: '#10b981', name: 'Actual' },
                { key: 'target', color: '#4b5563', name: 'Target' },
              ]}
              yAxisLabel="km"
            />
          </div>
          {elevationData.length > 0 && (
            <div>
              <h3 className="text-[11px] font-semibold text-zinc-600 uppercase tracking-[0.15em] mb-3">Elevation Gain (m)</h3>
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
  accent = 'emerald',
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
  step?: string;
  accent?: string;
}) {
  const focusColor = accent === 'emerald'
    ? 'focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/10'
    : accent === 'blue'
    ? 'focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/10'
    : 'focus:border-purple-500/50 focus:ring-2 focus:ring-purple-500/10';

  return (
    <div>
      <label className="block text-xs font-medium text-zinc-400 mb-1.5">{label}</label>
      <input
        type={type}
        inputMode={type === 'number' ? 'decimal' : undefined}
        step={step}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={`w-full bg-zinc-900/80 rounded-xl px-3.5 py-2.5 text-sm border ${value ? 'border-zinc-700' : 'border-zinc-800/60'} ${focusColor} focus:outline-none transition-all placeholder:text-zinc-700`}
      />
    </div>
  );
}
