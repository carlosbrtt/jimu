import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';
import Navbar from '@/components/Navbar';
import Link from 'next/link';
import { Plus, Dumbbell, Clock, ChevronRight } from 'lucide-react';
import type { Modality } from '@/types/index';
import { MODALITY_EMOJI, MODALITY_LABELS } from '@/types/index';

export const metadata = { title: 'Meus Treinos · Jimu' };
export const instant = false;

type WorkoutListItem = {
  id: string;
  title: string;
  notes: string | null;
  started_at: string;
  ended_at: string | null;
  workout_blocks: { modality: Modality; exercise_name: string | null }[];
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('pt-BR', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
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

const MODALITY_BADGE: Record<Modality, string> = {
  musculacao: 'bg-blue-500/10 text-blue-400 border border-blue-500/20',
  corrida: 'bg-green-500/10 text-green-400 border border-green-500/20',
  natacao: 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20',
  aerobico: 'bg-orange-500/10 text-orange-400 border border-orange-500/20',
  outro: 'bg-zinc-500/10 text-zinc-400 border border-zinc-500/20',
};

export default async function TreinosPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: workouts } = await supabase
    .from('workouts')
    .select(`
      id, title, notes, started_at, ended_at,
      workout_blocks ( modality, exercise_name )
    `)
    .eq('user_id', user.id)
    .order('started_at', { ascending: false })
    .limit(100)
    .returns<WorkoutListItem[]>();

  const list = workouts ?? [];

  return (
    <div className="min-h-screen bg-zinc-950">
      <Navbar />
      <main className="mx-auto max-w-4xl px-4 py-10">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">Meus Treinos</h1>
            <p className="mt-1 text-sm text-zinc-400">
              {list.length} {list.length === 1 ? 'sessão registrada' : 'sessões registradas'}
            </p>
          </div>
          <Link
            href="/treinos/novo"
            className="inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-400 transition-colors"
          >
            <Plus className="h-4 w-4" />
            Novo Treino
          </Link>
        </div>

        {/* Estado vazio */}
        {list.length === 0 && (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-zinc-700 bg-zinc-900/50 py-20 text-center">
            <div className="mb-4 inline-flex rounded-2xl bg-zinc-800 p-5">
              <Dumbbell className="h-10 w-10 text-zinc-500" />
            </div>
            <h2 className="mb-2 text-lg font-semibold text-white">Nenhum treino ainda</h2>
            <p className="mb-6 max-w-xs text-sm text-zinc-400">
              Registre sua primeira sessão para começar a acompanhar sua evolução.
            </p>
            <Link
              href="/treinos/novo"
              className="inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-400 transition-colors"
            >
              <Plus className="h-4 w-4" />
              Registrar Primeiro Treino
            </Link>
          </div>
        )}

        {/* Lista de treinos */}
        <div className="space-y-3">
          {list.map((workout) => {
            const uniqueModalities = [
              ...new Set(workout.workout_blocks?.map((b) => b.modality) ?? []),
            ] as Modality[];
            const duration = formatDuration(workout.started_at, workout.ended_at);
            const blockCount = workout.workout_blocks?.length ?? 0;

            return (
              <Link
                key={workout.id}
                href={`/treinos/${workout.id}`}
                className="group flex items-center gap-4 rounded-2xl border border-zinc-800 bg-zinc-900 p-5 hover:border-emerald-500/30 hover:bg-zinc-800/50 transition-all"
              >
                {/* Ícone da primeira modalidade */}
                <div className="hidden sm:flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-zinc-800 text-2xl">
                  {MODALITY_EMOJI[uniqueModalities[0] ?? 'outro']}
                </div>

                {/* Info principal */}
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="font-semibold text-white group-hover:text-emerald-400 transition-colors truncate">
                      {workout.title}
                    </h2>
                    {duration && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-zinc-800 px-2 py-0.5 text-xs text-zinc-400">
                        <Clock className="h-3 w-3" />
                        {duration}
                      </span>
                    )}
                  </div>
                  <p className="mt-0.5 text-sm text-zinc-500">{formatDate(workout.started_at)}</p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {uniqueModalities.map((mod) => (
                      <span
                        key={mod}
                        className={`rounded-full px-2 py-0.5 text-xs font-medium ${MODALITY_BADGE[mod]}`}
                      >
                        {MODALITY_EMOJI[mod]} {MODALITY_LABELS[mod]}
                      </span>
                    ))}
                    <span className="rounded-full bg-zinc-800 px-2 py-0.5 text-xs text-zinc-500">
                      {blockCount} {blockCount === 1 ? 'bloco' : 'blocos'}
                    </span>
                  </div>
                </div>

                <ChevronRight className="h-5 w-5 shrink-0 text-zinc-600 group-hover:text-emerald-400 transition-colors" />
              </Link>
            );
          })}
        </div>
      </main>
    </div>
  );
}