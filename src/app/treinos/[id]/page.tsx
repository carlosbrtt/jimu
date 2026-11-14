import { createClient } from '@/utils/supabase/server';
import { redirect, notFound } from 'next/navigation';
import Navbar from '@/components/Navbar';
import Link from 'next/link';
import DeleteWorkoutButton from '../DeleteWorkoutButton';
import {
  ChevronLeft, Pencil, Clock, Calendar,
  Dumbbell, Flame,
} from 'lucide-react';
import type { Modality } from '@/types/index';
import { MODALITY_EMOJI, MODALITY_LABELS } from '@/types/index';

export const instant = false;

type StrengthSetRow = {
  id: string;
  set_number: number;
  reps: number | null;
  weight_kg: number | null;
  is_warmup: boolean;
  rpe: number | null;
  notes: string | null;
};

type BlockRow = {
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
  notes: string | null;
  strength_sets: StrengthSetRow[];
};

type WorkoutDetail = {
  id: string;
  title: string;
  notes: string | null;
  started_at: string;
  ended_at: string | null;
  workout_blocks: BlockRow[];
};

function calcOneRM(weight: number | null, reps: number | null): number | null {
  if (!weight || !reps || reps < 1) return null;
  return Math.round(weight * (1 + reps / 30) * 10) / 10;
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

function formatPace(paceMin: number | null) {
  if (!paceMin) return null;
  const min = Math.floor(paceMin);
  const sec = Math.round((paceMin - min) * 60);
  return `${min}'${sec.toString().padStart(2, '0')}"/km`;
}

const MOD_BADGE: Record<Modality, string> = {
  musculacao: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  corrida: 'bg-green-500/10 text-green-400 border-green-500/20',
  natacao: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
  aerobico: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
  outro: 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20',
};

export default async function WorkoutDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: workout } = await supabase
    .from('workouts')
    .select(`
      id, title, notes, started_at, ended_at,
      workout_blocks (
        id, order_index, modality, exercise_name, muscle_group,
        duration_min, distance_km, avg_pace_min, avg_speed_kmh, laps, notes,
        strength_sets (
          id, set_number, reps, weight_kg, is_warmup, rpe, notes
        )
      )
    `)
    .eq('id', id)
    .eq('user_id', user.id)
    .single<WorkoutDetail>();

  if (!workout) notFound();

  // Ordenar blocos e séries
  const blocks = [...(workout.workout_blocks ?? [])].sort(
    (a, b) => a.order_index - b.order_index
  );
  blocks.forEach((block) => {
    block.strength_sets?.sort((a, b) => a.set_number - b.set_number);
  });

  const startDate = new Date(workout.started_at);
  const duration = formatDuration(workout.started_at, workout.ended_at);

  return (
    <div className="min-h-screen bg-zinc-950">
      <Navbar />
      <main className="mx-auto max-w-4xl px-4 py-10">
        {/* Breadcrumb */}
        <div className="mb-6 flex items-center gap-3 text-sm">
          <Link href="/treinos" className="flex items-center gap-1 text-zinc-400 hover:text-white transition-colors">
            <ChevronLeft className="h-4 w-4" />
            Meus Treinos
          </Link>
          <span className="text-zinc-700">/</span>
          <span className="truncate text-zinc-300">{workout.title}</span>
        </div>

        {/* Header */}
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">{workout.title}</h1>
            <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-zinc-400">
              <span className="flex items-center gap-1.5">
                <Calendar className="h-4 w-4 text-zinc-500" />
                {startDate.toLocaleDateString('pt-BR', {
                  weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
                  hour: '2-digit', minute: '2-digit',
                })}
              </span>
              {duration && (
                <span className="flex items-center gap-1.5">
                  <Clock className="h-4 w-4 text-zinc-500" />
                  {duration}
                </span>
              )}
            </div>
            {workout.notes && (
              <p className="mt-3 text-sm text-zinc-400 italic">{workout.notes}</p>
            )}
          </div>

          {/* Ações */}
          <div className="flex items-center gap-2">
            <Link
              href={`/treinos/${workout.id}/editar`}
              className="inline-flex items-center gap-2 rounded-xl border border-zinc-700 px-4 py-2.5 text-sm font-medium text-zinc-300 hover:bg-zinc-800 hover:text-white transition-colors"
            >
              <Pencil className="h-4 w-4" />
              Editar
            </Link>
            <DeleteWorkoutButton workoutId={workout.id} />
          </div>
        </div>

        {/* Blocos */}
        <div className="space-y-4">
          {blocks.map((block, i) => (
            <div key={block.id} className="rounded-2xl border border-zinc-800 bg-zinc-900">
              {/* Block header */}
              <div className="flex items-center gap-3 border-b border-zinc-800 px-5 py-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-zinc-700 text-xs font-bold text-zinc-300">
                  {i + 1}
                </span>
                <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium ${MOD_BADGE[block.modality]}`}>
                  {MODALITY_EMOJI[block.modality]} {MODALITY_LABELS[block.modality]}
                </span>
                {block.exercise_name && (
                  <span className="text-sm font-semibold text-white">{block.exercise_name}</span>
                )}
                {block.muscle_group && (
                  <span className="ml-auto text-xs text-zinc-500">{block.muscle_group}</span>
                )}
              </div>

              {/* Block body */}
              <div className="p-5">
                {/* ── Musculação: tabela de séries ── */}
                {block.modality === 'musculacao' && block.strength_sets.length > 0 && (
                  <>
                    <div className="overflow-x-auto">
                      <table className="w-full min-w-[480px] text-sm">
                        <thead>
                          <tr className="border-b border-zinc-800 text-left text-xs text-zinc-500">
                            <th className="pb-2 pr-4 font-medium">Série</th>
                            <th className="pb-2 pr-4 font-medium">Reps</th>
                            <th className="pb-2 pr-4 font-medium">Carga</th>
                            <th className="pb-2 pr-4 font-medium">RPE</th>
                            <th className="pb-2 pr-4 font-medium">1RM est.</th>
                            {block.strength_sets.some((s) => s.notes) && (
                              <th className="pb-2 font-medium">Notas</th>
                            )}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-800/50">
                          {block.strength_sets.map((set) => {
                            const oneRM = set.is_warmup
                              ? null
                              : calcOneRM(set.weight_kg, set.reps);
                            return (
                              <tr key={set.id} className={set.is_warmup ? 'opacity-60' : ''}>
                                <td className="py-2 pr-4">
                                  <div className="flex items-center gap-2">
                                    <span className="font-medium text-zinc-300">
                                      {set.set_number}
                                    </span>
                                    {set.is_warmup && (
                                      <span className="rounded-full bg-amber-500/20 px-1.5 py-0.5 text-xs text-amber-400">
                                        Aquec.
                                      </span>
                                    )}
                                  </div>
                                </td>
                                <td className="py-2 pr-4 text-zinc-200">
                                  {set.reps != null ? `${set.reps} reps` : '—'}
                                </td>
                                <td className="py-2 pr-4 font-semibold text-white">
                                  {set.weight_kg != null ? `${set.weight_kg} kg` : '—'}
                                </td>
                                <td className="py-2 pr-4 text-zinc-400">
                                  {set.rpe != null ? set.rpe : '—'}
                                </td>
                                <td className="py-2 pr-4">
                                  {oneRM ? (
                                    <span className="font-medium text-emerald-400">
                                      {oneRM} kg
                                    </span>
                                  ) : '—'}
                                </td>
                                {block.strength_sets.some((s) => s.notes) && (
                                  <td className="py-2 text-xs text-zinc-500">
                                    {set.notes ?? ''}
                                  </td>
                                )}
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>

                    {/* Volume total (séries de trabalho) */}
                    {(() => {
                      const workingSets = block.strength_sets.filter(
                        (s) => !s.is_warmup && s.reps && s.weight_kg
                      );
                      if (!workingSets.length) return null;
                      const volume = workingSets.reduce(
                        (acc, s) => acc + (s.reps ?? 0) * (s.weight_kg ?? 0),
                        0
                      );
                      const maxOneRM = Math.max(
                        ...workingSets.map(
                          (s) => calcOneRM(s.weight_kg, s.reps) ?? 0
                        )
                      );
                      return (
                        <div className="mt-4 flex flex-wrap gap-4 border-t border-zinc-800 pt-4">
                          <div className="flex items-center gap-1.5 text-sm">
                            <Dumbbell className="h-4 w-4 text-zinc-500" />
                            <span className="text-zinc-500">Volume:</span>
                            <span className="font-semibold text-zinc-200">
                              {volume.toLocaleString('pt-BR')} kg
                            </span>
                          </div>
                          {maxOneRM > 0 && (
                            <div className="flex items-center gap-1.5 text-sm">
                              <Flame className="h-4 w-4 text-emerald-500" />
                              <span className="text-zinc-500">1RM est. máx.:</span>
                              <span className="font-semibold text-emerald-400">
                                {maxOneRM} kg
                              </span>
                            </div>
                          )}
                        </div>
                      );
                    })()}
                  </>
                )}

                {/* ── Cardio: stats ── */}
                {block.modality !== 'musculacao' && (
                  <div className="flex flex-wrap gap-6">
                    {block.duration_min && (
                      <div>
                        <p className="text-xs text-zinc-500">Duração</p>
                        <p className="mt-0.5 text-lg font-semibold text-white">
                          {block.duration_min >= 60
                            ? `${Math.floor(block.duration_min / 60)}h ${Math.round(block.duration_min % 60)}min`
                            : `${block.duration_min}min`}
                        </p>
                      </div>
                    )}
                    {block.distance_km && (
                      <div>
                        <p className="text-xs text-zinc-500">Distância</p>
                        <p className="mt-0.5 text-lg font-semibold text-white">
                          {block.distance_km} km
                        </p>
                      </div>
                    )}
                    {block.avg_pace_min && (
                      <div>
                        <p className="text-xs text-zinc-500">Pace médio</p>
                        <p className="mt-0.5 text-lg font-semibold text-emerald-400">
                          {formatPace(block.avg_pace_min)}
                        </p>
                      </div>
                    )}
                    {block.avg_speed_kmh && (
                      <div>
                        <p className="text-xs text-zinc-500">Velocidade</p>
                        <p className="mt-0.5 text-lg font-semibold text-white">
                          {block.avg_speed_kmh} km/h
                        </p>
                      </div>
                    )}
                    {block.laps && (
                      <div>
                        <p className="text-xs text-zinc-500">Voltas</p>
                        <p className="mt-0.5 text-lg font-semibold text-white">
                          {block.laps}
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {/* Notas do bloco */}
                {block.notes && (
                  <p className="mt-4 border-t border-zinc-800 pt-4 text-sm text-zinc-400 italic">
                    {block.notes}
                  </p>
                )}

                {/* Estado vazio */}
                {block.modality === 'musculacao' && block.strength_sets.length === 0 && (
                  <p className="text-sm text-zinc-500">Nenhuma série registrada neste bloco.</p>
                )}
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}