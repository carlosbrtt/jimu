'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  Calendar, Clock, ChevronDown, ChevronUp, ArrowRight, Activity
} from 'lucide-react';
import type { Modality } from '@/types/index';
import { MODALITY_EMOJI, MODALITY_LABELS } from '@/types/index';

export interface FeedSet {
  id: string;
  set_number: number;
  reps: number | null;
  weight_kg: number | null;
  is_warmup: boolean;
  rpe: number | null;
}

export interface FeedBlock {
  id: string;
  order_index: number;
  modality: Modality;
  exercise_name: string | null;
  muscle_group: string | null;
  duration_min: number | null;
  distance_km: number | null;
  avg_pace_min: number | null;
  avg_speed_kmh: number | null;
  laps: number | null;
  strength_sets: FeedSet[];
}

export interface FeedWorkout {
  id: string;
  title: string;
  notes: string | null;
  started_at: string;
  ended_at: string | null;
  workout_blocks: FeedBlock[];
}

const MOD_BADGE: Record<Modality, string> = {
  musculacao: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  corrida: 'bg-green-500/10 text-green-400 border-green-500/20',
  natacao: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
  aerobico: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
  outro: 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20',
};

function formatPace(paceMin: number | null) {
  if (!paceMin) return null;
  const min = Math.floor(paceMin);
  const sec = Math.round((paceMin - min) * 60);
  return `${min}'${sec.toString().padStart(2, '0')}"/km`;
}

function formatDuration(start: string, end: string | null) {
  if (!end) return null;
  const diff = Math.round((new Date(end).getTime() - new Date(start).getTime()) / 60000);
  if (diff <= 0) return null;
  const h = Math.floor(diff / 60);
  const m = diff % 60;
  if (h === 0) return `${m}min`;
  return m > 0 ? `${h}h ${m}min` : `${h}h`;
}

function calcEpley(weight: number, reps: number) {
  if (!weight || !reps || reps < 1) return 0;
  return Math.round(weight * (1 + reps / 30) * 10) / 10;
}

export default function WorkoutFeed({ workouts }: { workouts: FeedWorkout[] }) {
  const [expandedWorkouts, setExpandedWorkouts] = useState<Record<string, boolean>>({});

  function toggleExpand(id: string) {
    setExpandedWorkouts((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  if (workouts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-zinc-800 bg-zinc-900/50 py-16 text-center">
        <Activity className="h-10 w-10 text-zinc-600 mb-3" />
        <p className="text-zinc-400 font-medium">Nenhuma atividade recente no seu feed</p>
        <p className="text-xs text-zinc-500 mt-1">Registre seus treinos para acompanhar o progresso aqui.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {workouts.map((workout) => {
        const isExpanded = !!expandedWorkouts[workout.id];
        const blocks = [...(workout.workout_blocks ?? [])].sort((a, b) => a.order_index - b.order_index);

        const uniqueModalities = Array.from(new Set(blocks.map((b) => b.modality)));
        const duration = formatDuration(workout.started_at, workout.ended_at);

        let totalVolumeKg = 0;
        let maxOneRM = 0;
        let bestExercise = '';

        let totalDistanceKm = 0;
        let weightedPaceSum = 0;
        let distanceWithPace = 0;

        blocks.forEach((block) => {
          if (block.modality === 'musculacao') {
            block.strength_sets?.forEach((s) => {
              if (!s.is_warmup && s.reps && s.weight_kg) {
                totalVolumeKg += s.reps * s.weight_kg;
                const epley = calcEpley(s.weight_kg, s.reps);
                if (epley > maxOneRM) {
                  maxOneRM = epley;
                  bestExercise = block.exercise_name || 'Musculação';
                }
              }
            });
          } else {
            if (block.distance_km) {
              totalDistanceKm += Number(block.distance_km);
              if (block.avg_pace_min) {
                weightedPaceSum += Number(block.avg_pace_min) * Number(block.distance_km);
                distanceWithPace += Number(block.distance_km);
              }
            }
          }
        });

        const avgPace = distanceWithPace > 0 ? weightedPaceSum / distanceWithPace : null;

        const dateStr = new Date(workout.started_at).toLocaleDateString('pt-BR', {
          weekday: 'short',
          day: 'numeric',
          month: 'short',
          hour: '2-digit',
          minute: '2-digit',
        });

        return (
          <div
            key={workout.id}
            className="rounded-2xl border border-zinc-800 bg-zinc-900 transition-all hover:border-zinc-700/80"
          >
            <div className="p-5 border-b border-zinc-800/60">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                    {/* suppressHydrationWarning impede erro de timezone entre server e client */}
                    <span suppressHydrationWarning className="flex items-center gap-1 text-xs text-zinc-400">
                      <Calendar className="h-3.5 w-3.5 text-zinc-500" />
                      {dateStr}
                    </span>
                    {duration && (
                      <span className="flex items-center gap-1 rounded-full bg-zinc-800/80 px-2 py-0.5 text-xs text-zinc-400">
                        <Clock className="h-3 w-3 text-zinc-500" />
                        {duration}
                      </span>
                    )}
                  </div>
                  <Link
                    href={`/treinos/${workout.id}`}
                    className="text-lg font-bold text-white hover:text-emerald-400 transition-colors inline-block"
                  >
                    {workout.title}
                  </Link>
                  {workout.notes && (
                    <p className="mt-1 text-xs text-zinc-400 italic line-clamp-1">{workout.notes}</p>
                  )}
                </div>

                <div className="flex gap-1.5 flex-wrap">
                  {uniqueModalities.map((mod) => (
                    <span
                      key={mod}
                      className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium ${MOD_BADGE[mod]}`}
                    >
                      {MODALITY_EMOJI[mod]} {MODALITY_LABELS[mod]}
                    </span>
                  ))}
                </div>
              </div>

              {/* Destaques em números grandes */}
              <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4 border-t border-zinc-800/50 pt-3">
                {totalVolumeKg > 0 && (
                  <div>
                    <span className="text-[11px] uppercase tracking-wider text-zinc-500 font-medium">Volume Total</span>
                    <p className="text-base font-bold text-white mt-0.5">
                      {totalVolumeKg.toLocaleString('pt-BR')} <span className="text-xs font-normal text-zinc-400">kg</span>
                    </p>
                  </div>
                )}

                {maxOneRM > 0 && (
                  <div>
                    <span className="text-[11px] uppercase tracking-wider text-zinc-500 font-medium">Melhor 1RM (Epley)</span>
                    <p className="text-base font-bold text-emerald-400 mt-0.5">
                      {maxOneRM} <span className="text-xs font-normal text-zinc-400">kg</span>
                    </p>
                    <span className="text-[10px] text-zinc-500 truncate block">{bestExercise}</span>
                  </div>
                )}

                {totalDistanceKm > 0 && (
                  <div>
                    <span className="text-[11px] uppercase tracking-wider text-zinc-500 font-medium">Distância</span>
                    <p className="text-base font-bold text-cyan-400 mt-0.5">
                      {totalDistanceKm.toFixed(2)} <span className="text-xs font-normal text-zinc-400">km</span>
                    </p>
                  </div>
                )}

                {avgPace && (
                  <div>
                    <span className="text-[11px] uppercase tracking-wider text-zinc-500 font-medium">Pace Médio</span>
                    <p className="text-base font-bold text-orange-400 mt-0.5">
                      {formatPace(avgPace)}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Lista expansível */}
            {isExpanded && (
              <div className="p-5 bg-zinc-950/40 border-b border-zinc-800/50 space-y-3">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-zinc-400">Blocos & Séries</h4>
                {blocks.map((b, idx) => (
                  <div key={b.id} className="rounded-xl border border-zinc-800/80 bg-zinc-900/60 p-3.5">
                    <div className="flex items-center justify-between text-xs mb-2">
                      <span className="font-semibold text-zinc-200">
                        {idx + 1}. {MODALITY_EMOJI[b.modality]} {b.exercise_name || MODALITY_LABELS[b.modality]}
                      </span>
                      {b.muscle_group && <span className="text-zinc-500">{b.muscle_group}</span>}
                    </div>

                    {b.modality === 'musculacao' ? (
                      <div className="flex flex-wrap gap-2 text-xs">
                        {b.strength_sets?.map((s) => (
                          <span
                            key={s.id}
                            className={`rounded-lg px-2 py-1 ${
                              s.is_warmup
                                ? 'bg-amber-500/10 text-amber-400/90 border border-amber-500/20'
                                : 'bg-zinc-800 text-zinc-300'
                            }`}
                          >
                            {s.weight_kg ?? 0}kg × {s.reps ?? 0}
                            {s.rpe ? ` @RPE ${s.rpe}` : ''}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <div className="text-xs text-zinc-400 flex gap-4">
                        {b.duration_min && <span>Duração: {b.duration_min}min</span>}
                        {b.distance_km && <span>Distância: {b.distance_km}km</span>}
                        {b.avg_pace_min && <span>Pace: {formatPace(b.avg_pace_min)}</span>}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            <div className="px-5 py-2.5 flex items-center justify-between text-xs text-zinc-400">
              <button
                type="button"
                onClick={() => toggleExpand(workout.id)}
                className="flex items-center gap-1 hover:text-white transition-colors cursor-pointer"
              >
                {isExpanded ? (
                  <>
                    <ChevronUp className="h-4 w-4" />
                    Ocultar detalhes
                  </>
                ) : (
                  <>
                    <ChevronDown className="h-4 w-4" />
                    Ver {blocks.length} {blocks.length === 1 ? 'bloco' : 'blocos'}
                  </>
                )}
              </button>

              <Link
                href={`/treinos/${workout.id}`}
                className="flex items-center gap-1 font-medium text-emerald-400 hover:text-emerald-300 transition-colors"
              >
                Abrir treino
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>
        );
      })}
    </div>
  );
}