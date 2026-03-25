'use client';

import { useEffect, useState } from 'react';
import type { WeightsSection, Adaptation } from '@/lib/types';
import ProgressChart from '@/components/progress-chart';

type Tab = 'log' | 'history' | 'charts';

const DAY_TO_SECTION: Record<number, string> = {
  6: 'push1', // Saturday
  0: 'pull1', // Sunday
  1: 'legs1', // Monday
  2: 'push2', // Tuesday
  3: 'pull2', // Wednesday
  4: 'legs2', // Thursday
};

export default function WeightsPage() {
  const [sections, setSections] = useState<WeightsSection[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>('log');
  const [selectedSection, setSelectedSection] = useState('');
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState('');
  const [formData, setFormData] = useState<Record<string, { weight: string; sets: string[] }>>({});
  const [adaptations, setAdaptations] = useState<Adaptation[]>([]);

  useEffect(() => {
    fetch('/api/weights')
      .then((r) => r.json())
      .then((data: WeightsSection[]) => {
        setSections(data);
        const todayDow = new Date().getDay();
        const todayKey = DAY_TO_SECTION[todayDow];
        const match = data.find((s) => s.sectionKey === todayKey);
        setSelectedSection(match?.sectionKey || data[0]?.sectionKey || '');
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const section = sections.find((s) => s.sectionKey === selectedSection);
  const today = new Date().toISOString().split('T')[0];
  const existingSession = section?.sessions.find((s) => s.date === today) ||
    section?.sessions.find((s) => s.date >= today);

  // If no existing session, create a synthetic ad-hoc one from the section template
  const isAdHoc = !existingSession && !!section;
  const currentSession = existingSession || (section ? {
    week: 0,
    date: today,
    exercises: Object.fromEntries(
      section.exerciseNames.map((name) => [name, { weight: '', sets: [null, null, null, null], total: null }])
    ),
  } : null);

  // Initialize form when section/session changes
  useEffect(() => {
    if (!section || !currentSession) return;
    const initial: Record<string, { weight: string; sets: string[] }> = {};
    for (const name of section.exerciseNames) {
      const ex = currentSession.exercises[name];
      initial[name] = {
        weight: ex?.weight || '',
        sets: ex?.sets.map((s) => s?.toString() || '') || ['', '', '', ''],
      };
    }
    setFormData(initial);
  }, [selectedSection, currentSession?.date]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!section || !currentSession) return;
    setSaving(true);
    setAdaptations([]);
    try {
      const exercises: Record<string, { weight?: string; sets: (number | null)[] }> = {};
      for (const [name, data] of Object.entries(formData)) {
        exercises[name] = {
          weight: data.weight || undefined,
          sets: data.sets.map((s) => (s ? parseInt(s) : null)),
        };
      }
      const res = await fetch('/api/weights', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sectionKey: selectedSection,
          date: currentSession.date,
          exercises,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setToast('Saved!');
        setTimeout(() => setToast(''), 2000);
        if (data.adaptations?.length > 0) {
          setAdaptations(data.adaptations);
        }
        const updated = await fetch('/api/weights').then((r) => r.json());
        setSections(updated);
      }
    } catch {
      setToast('Error saving');
    }
    setSaving(false);
  }

  if (loading) return <div className="flex items-center justify-center h-64 text-zinc-500">Loading...</div>;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Weights</h1>

      {/* Section selector */}
      <select
        value={selectedSection}
        onChange={(e) => setSelectedSection(e.target.value)}
        className="w-full bg-zinc-900 rounded-lg px-3 py-2.5 text-sm border border-zinc-700"
      >
        {sections.map((s) => (
          <option key={s.sectionKey} value={s.sectionKey}>
            {s.title.split('—')[0].trim()} — {s.dayOfWeek} ({s.location})
          </option>
        ))}
      </select>

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
      {tab === 'log' && section && (
        <div>
          {currentSession ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="bg-zinc-900 rounded-xl p-3">
                {isAdHoc && (
                  <div className="text-xs font-medium text-yellow-400 bg-yellow-500/10 rounded-lg px-2 py-1 mb-2 text-center">
                    Ad-hoc session
                  </div>
                )}
                <div className="flex justify-between text-sm">
                  <span className="text-zinc-400">Date</span>
                  <span>{currentSession.date}</span>
                </div>
              </div>

              {section.exerciseNames.map((name) => {
                const data = formData[name] || { weight: '', sets: ['', '', '', ''] };
                const isBw = currentSession.exercises[name]?.weight === 'BW';
                const total = data.sets.reduce((sum, s) => sum + (parseInt(s) || 0), 0);

                return (
                  <div key={name} className="bg-zinc-900 rounded-xl p-4 space-y-3">
                    <div className="flex justify-between items-center">
                      <h3 className="text-sm font-medium">{name}</h3>
                      {total > 0 && (
                        <span className="text-xs text-orange-400 font-medium">Total: {total}</span>
                      )}
                    </div>

                    {!isBw && (
                      <div>
                        <label className="block text-xs text-zinc-500 mb-1">Weight (kg)</label>
                        <input
                          type="number"
                          inputMode="decimal"
                          step="0.5"
                          value={data.weight}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              [name]: { ...data, weight: e.target.value },
                            })
                          }
                          className="w-full bg-zinc-800 rounded-lg px-3 py-2 text-sm border border-zinc-700 focus:border-orange-500 focus:outline-none"
                        />
                      </div>
                    )}

                    <div className="grid grid-cols-4 gap-2">
                      {data.sets.map((s, i) => (
                        <div key={i}>
                          <label className="block text-xs text-zinc-500 mb-1 text-center">S{i + 1}</label>
                          <input
                            type="number"
                            inputMode="numeric"
                            value={s}
                            onChange={(e) => {
                              const newSets = [...data.sets];
                              newSets[i] = e.target.value;
                              setFormData({
                                ...formData,
                                [name]: { ...data, sets: newSets },
                              });
                            }}
                            className="w-full bg-zinc-800 rounded-lg px-2 py-3 text-center text-lg font-bold border border-zinc-700 focus:border-orange-500 focus:outline-none"
                            placeholder="0"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}

              <button
                type="submit"
                disabled={saving}
                className="w-full bg-orange-600 hover:bg-orange-700 disabled:opacity-50 text-white py-3 rounded-xl font-medium transition-colors"
              >
                {saving ? 'Saving...' : 'Save Workout'}
              </button>

              {toast && <p className={`text-center text-sm ${toast === 'Saved!' ? 'text-green-400' : 'text-red-400'}`}>{toast}</p>}

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
          ) : (
            <p className="text-zinc-500 text-center py-8">Select a section above</p>
          )}
        </div>
      )}

      {/* HISTORY TAB */}
      {tab === 'history' && section && (
        <div className="space-y-2">
          {section.sessions
            .filter((s) => Object.values(s.exercises).some((ex) => ex.sets.some((set) => set !== null)))
            .reverse()
            .map((s) => (
              <div key={s.date} className="bg-zinc-900 rounded-xl p-3 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="font-medium">{s.date}</span>
                  <span className="text-zinc-400">Wk {s.week}</span>
                </div>
                {section.exerciseNames.map((name) => {
                  const ex = s.exercises[name];
                  if (!ex || ex.sets.every((set) => set === null)) return null;
                  return (
                    <div key={name} className="flex justify-between text-xs">
                      <span className="text-zinc-400">{name} {ex.weight !== 'BW' ? `(${ex.weight}kg)` : ''}</span>
                      <span>
                        {ex.sets.filter((s) => s !== null).join(' / ')} = <span className="text-orange-400 font-medium">{ex.total}</span>
                      </span>
                    </div>
                  );
                })}
              </div>
            ))}
          {section.sessions.every((s) =>
            Object.values(s.exercises).every((ex) => ex.sets.every((set) => set === null))
          ) && (
            <p className="text-zinc-500 text-center py-8">No sessions logged yet</p>
          )}
        </div>
      )}

      {/* CHARTS TAB */}
      {tab === 'charts' && section && (
        <div className="space-y-6">
          {section.exerciseNames.map((name) => {
            const chartData = section.sessions
              .filter((s) => s.exercises[name]?.total !== null)
              .map((s) => ({
                label: `Wk${s.week}`,
                total: s.exercises[name]?.total,
              }));

            if (chartData.length === 0) return null;

            return (
              <div key={name}>
                <h3 className="text-sm font-semibold text-zinc-400 mb-2">{name} — Total Reps</h3>
                <ProgressChart
                  data={chartData}
                  lines={[{ key: 'total', color: '#f97316', name: 'Total Reps' }]}
                  yAxisLabel="reps"
                  height={200}
                />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
