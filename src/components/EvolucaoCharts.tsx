'use client';

import { useState, useMemo, useEffect } from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import { Dumbbell, Activity, Calendar, Trophy } from 'lucide-react';
import type { FeedWorkout } from './WorkoutFeed';
import { formatExerciseName } from '@/lib/utils/exercise';

function calcEpley(weight: number, reps: number): number {
  if (!weight || !reps || reps < 1) return 0;
  return Math.round(weight * (1 + reps / 30) * 10) / 10;
}

export default function EvolucaoCharts({ workouts }: { workouts: FeedWorkout[] }) {
  const [mounted, setMounted] = useState(false);
  const [activeTab, setActiveTab] = useState<'1rm' | 'cardio' | 'volume'>('1rm');

  useEffect(() => {
    setMounted(true);
  }, []);

  // 1. Extrair lista única de exercícios padronizados em Title Case
  const exercisesList = useMemo(() => {
    const map = new Map<string, string>(); // key lower -> display formatted
    workouts.forEach((w) => {
      w.workout_blocks?.forEach((b) => {
        if (b.modality === 'musculacao' && b.exercise_name?.trim()) {
          const formatted = formatExerciseName(b.exercise_name);
          const lowerKey = formatted.toLowerCase();
          if (!map.has(lowerKey)) {
            map.set(lowerKey, formatted);
          }
        }
      });
    });
    return Array.from(map.values()).sort();
  }, [workouts]);

  const [selectedExercise, setSelectedExercise] = useState<string>('');

  useEffect(() => {
    if (exercisesList.length > 0 && (!selectedExercise || !exercisesList.includes(selectedExercise))) {
      setSelectedExercise(exercisesList[0]);
    }
  }, [exercisesList, selectedExercise]);

  // 2. Unificação de 1RM do exercício selecionado (case-insensitive)
  const oneRMData = useMemo(() => {
    if (!selectedExercise) return [];
    const targetKey = selectedExercise.toLowerCase().trim();

    const chronological = [...workouts].sort(
      (a, b) => new Date(a.started_at).getTime() - new Date(b.started_at).getTime()
    );

    const points: { date: string; fullDate: string; oneRM: number; weight: number; reps: number }[] = [];

    chronological.forEach((w) => {
      let maxEpleyThisWorkout = 0;
      let topWeight = 0;
      let topReps = 0;

      w.workout_blocks?.forEach((b) => {
        if (
          b.modality === 'musculacao' &&
          b.exercise_name &&
          b.exercise_name.trim().toLowerCase() === targetKey
        ) {
          b.strength_sets?.forEach((s) => {
            if (!s.is_warmup && s.weight_kg && s.reps) {
              const epley = calcEpley(s.weight_kg, s.reps);
              if (epley > maxEpleyThisWorkout) {
                maxEpleyThisWorkout = epley;
                topWeight = s.weight_kg;
                topReps = s.reps;
              }
            }
          });
        }
      });

      if (maxEpleyThisWorkout > 0) {
        const d = new Date(w.started_at);
        points.push({
          date: `${d.getDate()}/${d.getMonth() + 1}`,
          fullDate: d.toLocaleDateString('pt-BR'),
          oneRM: maxEpleyThisWorkout,
          weight: topWeight,
          reps: topReps,
        });
      }
    });

    return points;
  }, [workouts, selectedExercise]);

  // 3. Dados de Corrida / Cardio
  const cardioData = useMemo(() => {
    const chronological = [...workouts].sort(
      (a, b) => new Date(a.started_at).getTime() - new Date(b.started_at).getTime()
    );

    const points: { date: string; fullDate: string; distancia: number; pace: number }[] = [];

    chronological.forEach((w) => {
      let totalDist = 0;
      let paceSum = 0;
      let paceCount = 0;

      w.workout_blocks?.forEach((b) => {
        if (b.modality === 'corrida' || b.modality === 'aerobico') {
          if (b.distance_km) totalDist += Number(b.distance_km);
          if (b.avg_pace_min) {
            paceSum += Number(b.avg_pace_min);
            paceCount++;
          }
        }
      });

      if (totalDist > 0 || paceCount > 0) {
        const d = new Date(w.started_at);
        points.push({
          date: `${d.getDate()}/${d.getMonth() + 1}`,
          fullDate: d.toLocaleDateString('pt-BR'),
          distancia: Number(totalDist.toFixed(2)),
          pace: paceCount > 0 ? Number((paceSum / paceCount).toFixed(2)) : 0,
        });
      }
    });

    return points;
  }, [workouts]);

  // 4. Dados de Volume Semanal
  const volumeData = useMemo(() => {
    const weeksMap: Record<string, { weekLabel: string; volumeKg: number; workoutsCount: number; timestamp: number }> = {};

    workouts.forEach((w) => {
      const d = new Date(w.started_at);
      const firstDayOfWeek = new Date(d);
      firstDayOfWeek.setDate(d.getDate() - d.getDay());
      firstDayOfWeek.setHours(0, 0, 0, 0);

      const key = firstDayOfWeek.toISOString().slice(0, 10);
      const label = `${firstDayOfWeek.getDate()}/${firstDayOfWeek.getMonth() + 1}`;

      if (!weeksMap[key]) {
        weeksMap[key] = {
          weekLabel: `Semana ${label}`,
          volumeKg: 0,
          workoutsCount: 0,
          timestamp: firstDayOfWeek.getTime(),
        };
      }

      weeksMap[key].workoutsCount++;

      w.workout_blocks?.forEach((b) => {
        if (b.modality === 'musculacao') {
          b.strength_sets?.forEach((s) => {
            if (!s.is_warmup && s.weight_kg && s.reps) {
              weeksMap[key].volumeKg += s.weight_kg * s.reps;
            }
          });
        }
      });
    });

    return Object.values(weeksMap)
      .sort((a, b) => a.timestamp - b.timestamp)
      .slice(-8);
  }, [workouts]);

  if (!mounted) {
    return (
      <div className="h-72 rounded-2xl border border-zinc-800 bg-zinc-900 p-6 flex items-center justify-center text-zinc-500 text-sm">
        Carregando gráficos...
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6 shadow-xl">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-zinc-800 pb-4 mb-6">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('1rm')}
            className={`cursor-pointer flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
              activeTab === '1rm'
                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
            }`}
          >
            <Trophy className="h-3.5 w-3.5" />
            1RM Estimado
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('cardio')}
            className={`cursor-pointer flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
              activeTab === 'cardio'
                ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/30'
                : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
            }`}
          >
            <Activity className="h-3.5 w-3.5" />
            Corrida & Cardio
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('volume')}
            className={`cursor-pointer flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
              activeTab === 'volume'
                ? 'bg-purple-500/10 text-purple-400 border border-purple-500/30'
                : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
            }`}
          >
            <Dumbbell className="h-3.5 w-3.5" />
            Volume Semanal
          </button>
        </div>

        {activeTab === '1rm' && exercisesList.length > 0 && (
          <div className="flex items-center gap-2">
            <label className="text-xs text-zinc-400">Exercício:</label>
            <select
              value={selectedExercise}
              onChange={(e) => setSelectedExercise(e.target.value)}
              className="rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-1.5 text-xs font-medium text-white outline-none focus:border-emerald-500"
            >
              {exercisesList.map((ex) => (
                <option key={ex} value={ex}>
                  {ex}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {activeTab === '1rm' && (
        <div>
          {oneRMData.length === 0 ? (
            <div className="h-64 flex flex-col items-center justify-center text-center text-zinc-500 text-sm">
              <Dumbbell className="h-8 w-8 text-zinc-600 mb-2" />
              Nenhum dado de séries registrado para este exercício ainda.
            </div>
          ) : (
            <div>
              <div className="mb-4 flex items-center justify-between text-xs text-zinc-400">
                <span>Evolução de Força Máxima: <span className="text-emerald-400 font-bold">{selectedExercise}</span></span>
                <span className="text-[11px] text-zinc-500">Fórmula de Epley: Carga × (1 + Reps / 30)</span>
              </div>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={oneRMData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                    <XAxis dataKey="date" stroke="#71717a" fontSize={11} tickLine={false} />
                    <YAxis stroke="#71717a" fontSize={11} tickLine={false} domain={['dataMin - 5', 'dataMax + 5']} unit="kg" />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a', borderRadius: '0.75rem', fontSize: '12px' }}
                      formatter={(value: any, name: any) => [`${value} kg`, name === 'oneRM' ? '1RM Est.' : 'Carga Real']}
                      labelFormatter={(label: any, payload: any) => payload?.[0]?.payload?.fullDate || label}
                    />
                    <Line
                      type="monotone"
                      dataKey="oneRM"
                      stroke="#10b981"
                      strokeWidth={3}
                      dot={{ r: 4, fill: '#10b981' }}
                      activeDot={{ r: 6 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="weight"
                      stroke="#3b82f6"
                      strokeWidth={1.5}
                      strokeDasharray="4 4"
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'cardio' && (
        <div>
          {cardioData.length === 0 ? (
            <div className="h-64 flex flex-col items-center justify-center text-center text-zinc-500 text-sm">
              <Activity className="h-8 w-8 text-zinc-600 mb-2" />
              Nenhuma sessão de corrida ou aeróbico registrada.
            </div>
          ) : (
            <div>
              <div className="mb-4 text-xs text-zinc-400">
                Distância percorrida (km) ao longo das sessões
              </div>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={cardioData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                    <XAxis dataKey="date" stroke="#71717a" fontSize={11} tickLine={false} />
                    <YAxis stroke="#71717a" fontSize={11} tickLine={false} unit="km" />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a', borderRadius: '0.75rem', fontSize: '12px' }}
                      formatter={(val: any) => [`${val} km`, 'Distância']}
                      labelFormatter={(label: any, payload: any) => payload?.[0]?.payload?.fullDate || label}
                    />
                    <Bar dataKey="distancia" fill="#06b6d4" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'volume' && (
        <div>
          {volumeData.length === 0 ? (
            <div className="h-64 flex flex-col items-center justify-center text-center text-zinc-500 text-sm">
              <Calendar className="h-8 w-8 text-zinc-600 mb-2" />
              Nenhum dado de volume acumulado nas últimas semanas.
            </div>
          ) : (
            <div>
              <div className="mb-4 text-xs text-zinc-400">
                Tonelagem total levantada (Carga × Reps) por semana
              </div>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={volumeData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                    <XAxis dataKey="weekLabel" stroke="#71717a" fontSize={11} tickLine={false} />
                    <YAxis stroke="#71717a" fontSize={11} tickLine={false} tickFormatter={(val) => `${(val / 1000).toFixed(0)}t`} />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a', borderRadius: '0.75rem', fontSize: '12px' }}
                      formatter={(val: any) => [`${Number(val).toLocaleString('pt-BR')} kg`, 'Volume Total']}
                    />
                    <Bar dataKey="volumeKg" fill="#a855f7" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}