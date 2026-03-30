'use client';

import { useEffect, useState, useMemo } from 'react';
import type { CyclingSession, Adaptation } from '@/lib/types';
import dynamic from 'next/dynamic';
import DurationPicker, { formatDuration } from '@/components/duration-picker';

const ProgressChart = dynamic(() => import('@/components/progress-chart'), {
  ssr: false,
  loading: () => (
    <div className="h-40 bg-zinc-800/30 rounded-2xl animate-shimmer" />
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
  // Find earliest unlogged session — skipped sessions get served next
  const earliestUnlogged = sessions.find((s) => s.actualDuration === null);
  const todaySession = sessions.find((s) => s.date === today && s.actualDuration !== null);
  const plannedSession = todaySession || earliestUnlogged;
  const isAdHoc = !plannedSession;
  const isCarryOver = plannedSession && plannedSession.date < today && plannedSession.actualDuration === null;
  const currentSession = plannedSession || {
    date: today,
    day: todayDow,
    week: 0,
    time: 'Ad-hoc',
    targetDuration: 0,
    actualDuration: null,
    howLegsFeel: '',
    notes: '',
  } as CyclingSession;

  const [logDate, setLogDate] = useState(currentSession.date);

  const [durationSeconds, setDurationSeconds] = useState(0);
  const [form, setForm] = useState({ howLegsFeel: '', notes: '' });

  useEffect(() => {
    setLogDate(currentSession.date);
    if (currentSession.actualDuration !== null) {
      // existing data stored as minutes → convert to seconds
      setDurationSeconds((currentSession.actualDuration ?? 0) * 60);
      setForm({
        howLegsFeel: currentSession.howLegsFeel || '',
        notes: currentSession.notes || '',
      });
    }
  }, [currentSession]);

  function handleEdit(s: CyclingSession) {
    setLogDate(s.date);
    setDurationSeconds((s.actualDuration ?? 0) * 60);
    setForm({ howLegsFeel: s.howLegsFeel || '', notes: s.notes || '' });
    setTab('log');
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setAdaptations([]);
    try {
      const res = await fetch('/api/cycling', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date: logDate, actualDuration: Math.round(durationSeconds / 60), ...form }),
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
        setDurationSeconds(0);
        setForm({ howLegsFeel: '', notes: '' });
        setLogDate(new Date().toISOString().split('T')[0]);
      } else {
        const err = await res.json().catch(() => ({}));
        setToast('Error: ' + (err.error || res.status));
      }
    } catch (e) {
      setToast('Error saving: ' + (e instanceof Error ? e.message : 'unknown'));
    }
    setSaving(false);
  }

  const completedSessions = useMemo(() => sessions.filter((s) => s.actualDuration !== null), [sessions]);
  const durationData = useMemo(() => completedSessions.map((s) => ({
    label: s.date.slice(5),
    actual: s.actualDuration,
    target: s.targetDuration,
  })), [completedSessions]);
  const totalDuration = useMemo(() => completedSessions.reduce((sum, s) => sum + (s.actualDuration || 0), 0), [completedSessions]);
  const goalProgress = useMemo(() => Math.min(100, Math.round((totalDuration / 180) * 100)), [totalDuration]);

  if (loading) {
    return (
      <div className="space-y-3">
        <div className="h-7 w-28 bg-zinc-800/60 rounded-lg animate-shimmer" />
        <div className="h-24 bg-zinc-800/30 rounded-2xl animate-shimmer delay-1" />
        <div className="h-10 bg-zinc-800/40 rounded-xl animate-shimmer delay-2" />
        <div className="h-32 bg-zinc-800/30 rounded-2xl animate-shimmer delay-3" />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="animate-fadeInUp">
        <h1 className="text-2xl font-bold tracking-tight">Cycling</h1>

        {/* Goal progress */}
        <div className="mt-2 bg-zinc-900/50 backdrop-blur-sm rounded-2xl p-3.5 border border-zinc-800/30">
          <div className="flex justify-between items-end mb-2">
            <div>
              <p className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider">Goal Progress</p>
              <p className="text-xl font-bold text-blue-400 mt-0.5">
                {totalDuration}<span className="text-sm font-medium text-zinc-500 ml-1">/ 180 min</span>
              </p>
            </div>
            <span className="text-2xl font-bold text-zinc-800">{goalProgress}%</span>
          </div>
          <div className="w-full bg-zinc-800/50 rounded-full h-2 overflow-hidden">
            <div
              className="bg-gradient-to-r from-blue-600 via-blue-500 to-cyan-400 h-full rounded-full transition-all duration-700"
              style={{ width: `${goalProgress}%` }}
            />
          </div>
        </div>
      </div>

      {/* Tab switcher */}
      <div className="flex gap-1 bg-zinc-900/50 backdrop-blur-sm rounded-xl p-1 border border-zinc-800/30 animate-fadeInUp delay-1">
        {(['log', 'history', 'charts'] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 py-2 text-sm rounded-lg capitalize transition-all duration-300 font-medium ${
              tab === t
                ? 'bg-blue-500/10 text-blue-400 shadow-[inset_0_1px_0_rgba(59,130,246,0.1)]'
                : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === 'log' && (
        <div className="animate-fadeInUp delay-2">
          <form onSubmit={handleSubmit} className="space-y-3">
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
                <div className="flex justify-between text-sm">
                  <span className="text-zinc-500">Target</span>
                  <span className="font-semibold text-blue-400">{currentSession.targetDuration} min</span>
                </div>
              )}
            </div>

            <div className="bg-zinc-900/40 rounded-2xl border border-zinc-800/30 p-3.5 space-y-1">
              <h3 className="text-[11px] font-semibold text-zinc-500 uppercase tracking-[0.12em]">Duration</h3>
              <DurationPicker value={durationSeconds} onChange={setDurationSeconds} />
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1.5">Notes</label>
                <textarea
                  rows={1}
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  className={`w-full bg-zinc-900/80 rounded-xl px-3.5 py-2.5 text-sm border ${form.notes ? 'border-zinc-700' : 'border-zinc-800/60'} focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/10 focus:outline-none transition-all placeholder:text-zinc-700 resize-none`}
                />
              </div>
            </div>

            {/* Recovery group */}
            <div className="bg-zinc-900/40 rounded-2xl border border-zinc-800/30 p-3.5 space-y-2.5">
              <h3 className="text-[11px] font-semibold text-zinc-500 uppercase tracking-[0.12em]">Recovery</h3>
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1.5">How Legs Feel</label>
                <select
                  value={form.howLegsFeel}
                  onChange={(e) => setForm({ ...form, howLegsFeel: e.target.value })}
                  className="w-full bg-zinc-900/80 rounded-xl px-3.5 py-2.5 text-sm border border-zinc-800/60 focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/10 focus:outline-none transition-all"
                >
                  <option value="">--</option>
                  <option value="1">1 - Wrecked</option>
                  <option value="2">2 - Sore</option>
                  <option value="3">3 - Tired</option>
                  <option value="4">4 - OK</option>
                  <option value="5">5 - Good</option>
                  <option value="6">6 - Fresh</option>
                </select>
              </div>
            </div>

            <button
              type="submit"
              disabled={saving}
              className="w-full bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 disabled:from-blue-600/50 disabled:to-blue-500/50 text-white py-3 rounded-xl font-semibold transition-all duration-200 active:scale-[0.98] shadow-lg shadow-blue-500/10"
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

      {tab === 'history' && (
        <div className="space-y-2">
          {completedSessions
            .slice()
            .reverse()
            .map((s, i) => (
              <div
                key={s.date}
                className="bg-zinc-900/40 backdrop-blur-sm rounded-2xl p-4 border border-zinc-800/30 animate-fadeInUp"
                style={{ animationDelay: `${i * 40}ms` }}
              >
                <div className="flex justify-between items-center">
                  <span className="text-sm font-semibold">{s.date}</span>
                  <div className="flex items-center gap-3">
                    <span className="text-blue-400 font-bold text-sm">{formatDuration((s.actualDuration ?? 0) * 60)}</span>
                    <button
                      onClick={() => handleEdit(s)}
                      className="text-zinc-600 hover:text-blue-400 transition-colors"
                      aria-label="Edit session"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                      </svg>
                    </button>
                  </div>
                </div>
                <div className="flex gap-3 text-[11px] text-zinc-500 mt-2">
                  {s.howLegsFeel && <span>Legs {s.howLegsFeel}/6</span>}
                </div>
                {s.notes && <p className="text-xs text-zinc-600 mt-2 leading-relaxed">{s.notes}</p>}
              </div>
            ))}
          {completedSessions.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#3f3f46" strokeWidth="1.5" strokeLinecap="round" className="mb-4">
                <circle cx="6" cy="17" r="3.5" />
                <circle cx="18" cy="17" r="3.5" />
                <path d="M6 17l3-8h4l3 8" />
                <path d="M9 9l3 3" />
              </svg>
              <p className="text-zinc-400 font-medium text-sm">No rides logged yet</p>
              <p className="text-zinc-600 text-xs mt-1">Complete your first session to see it here</p>
            </div>
          )}
        </div>
      )}

      {tab === 'charts' && (
        <div className="space-y-6 animate-fadeInUp delay-1">
          <div>
            <h3 className="text-[11px] font-semibold text-zinc-600 uppercase tracking-[0.15em] mb-3">Duration (min)</h3>
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
