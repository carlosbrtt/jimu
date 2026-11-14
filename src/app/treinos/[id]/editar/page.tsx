import { createClient } from '@/utils/supabase/server';
import { redirect, notFound } from 'next/navigation';
import Navbar from '@/components/Navbar';
import WorkoutForm from '../../WorkoutForm';
import { updateWorkout } from '../../actions';
import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import type { WorkoutFormInitialData } from '../../WorkoutForm';
import type { Modality } from '@/types/index';

export const instant = false;

function toLocalDatetime(iso: string): string {
  const d = new Date(iso);
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 16);
}

export default async function EditarTreinoPage({
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
    .single();

  if (!workout) notFound();

  // Converter para o formato de draft do WorkoutForm
  const sortedBlocks = [...(workout.workout_blocks ?? [])].sort(
    (a, b) => a.order_index - b.order_index
  );

  const initialData: WorkoutFormInitialData = {
    title: workout.title,
    notes: workout.notes ?? '',
    startedAt: toLocalDatetime(workout.started_at),
    endedAt: workout.ended_at ? toLocalDatetime(workout.ended_at) : '',
    blocks: sortedBlocks.map((block) => ({
      localId: block.id,
      modality: block.modality as Modality,
      exercise_name: block.exercise_name ?? '',
      muscle_group: block.muscle_group ?? '',
      duration_min: block.duration_min?.toString() ?? '',
      distance_km: block.distance_km?.toString() ?? '',
      avg_pace_min: block.avg_pace_min?.toString() ?? '',
      avg_speed_kmh: block.avg_speed_kmh?.toString() ?? '',
      laps: block.laps?.toString() ?? '',
      notes: block.notes ?? '',
      sets: [...(block.strength_sets ?? [])]
        .sort((a, b) => a.set_number - b.set_number)
        .map((set) => ({
          localId: set.id,
          set_number: set.set_number,
          reps: set.reps?.toString() ?? '',
          weight_kg: set.weight_kg?.toString() ?? '',
          is_warmup: set.is_warmup,
          rpe: set.rpe?.toString() ?? '',
          notes: set.notes ?? '',
        })),
    })),
  };

  // Vincula o ID do treino à Server Action
  const updateWorkoutWithId = updateWorkout.bind(null, id);

  return (
    <div className="min-h-screen bg-zinc-950">
      <Navbar />
      <main className="mx-auto max-w-3xl px-4 py-10">
        <div className="mb-6 flex items-center gap-3 text-sm">
          <Link
            href={`/treinos/${id}`}
            className="flex items-center gap-1 text-zinc-400 hover:text-white transition-colors"
          >
            <ChevronLeft className="h-4 w-4" />
            Voltar ao Treino
          </Link>
          <span className="text-zinc-700">/</span>
          <span className="text-zinc-300">Editar</span>
        </div>

        <div className="mb-8">
          <h1 className="text-2xl font-bold text-white">Editar Treino</h1>
          <p className="mt-1 text-sm text-zinc-400">
            Atualize os dados da sessão e seus blocos.
          </p>
        </div>

        <WorkoutForm
          action={updateWorkoutWithId}
          initialData={initialData}
          submitLabel="Salvar Alterações"
        />
      </main>
    </div>
  );
}