'use server';

import { createClient } from '@/utils/supabase/server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import type { Modality } from '@/types/index';
import { formatExerciseName } from '@/lib/utils/exercise';

// ============================================================
// Types
// ============================================================

export interface WorkoutActionState {
  success: boolean;
  message: string;
  workoutId?: string;
  fieldErrors?: Record<string, string[]>;
}

// ============================================================
// Zod Schemas
// ============================================================

const SetSchema = z.object({
  set_number: z.number().int().positive(),
  reps: z.number().int().min(0).nullable().optional(),
  weight_kg: z.number().min(0).nullable().optional(),
  is_warmup: z.boolean().default(false),
  rpe: z.number().min(1).max(10).nullable().optional(),
  notes: z.string().max(500).nullable().optional(),
});

const BlockSchema = z.object({
  order_index: z.number().int().min(0),
  modality: z.enum([
    'musculacao', 'corrida', 'natacao', 'aerobico', 'outro',
  ] as [Modality, ...Modality[]]),
  exercise_name: z.string().max(200).nullable().optional(),
  muscle_group: z.string().max(100).nullable().optional(),
  duration_min: z.number().positive().nullable().optional(),
  distance_km: z.number().positive().nullable().optional(),
  avg_pace_min: z.number().positive().nullable().optional(),
  avg_speed_kmh: z.number().positive().nullable().optional(),
  laps: z.number().int().positive().nullable().optional(),
  notes: z.string().max(500).nullable().optional(),
  sets: z.array(SetSchema).optional().default([]),
});

const WorkoutPayloadSchema = z.object({
  title: z
    .string()
    .min(1, 'Título é obrigatório')
    .max(200, 'Título muito longo')
    .trim(),
  notes: z.string().max(2000).nullable().optional(),
  started_at: z
    .string()
    .refine((s) => !isNaN(Date.parse(s)), 'Data de início inválida')
    .refine(
      (s) => new Date(s) <= new Date(),
      'Não é permitido registrar treinos com data futura'
    ),
  ended_at: z
    .string()
    .nullable()
    .optional()
    .refine((s) => !s || !isNaN(Date.parse(s)), 'Data de término inválida'),
  blocks: z
    .array(BlockSchema)
    .min(1, 'Adicione pelo menos um bloco de treino'),
});

type BlockInput = z.infer<typeof BlockSchema>;

// Helper: insert blocks + sets padronizando o nome do exercício
async function insertBlocksAndSets(
  supabase: Awaited<ReturnType<typeof createClient>>,
  workoutId: string,
  userId: string,
  blocks: BlockInput[]
) {
  const { data: insertedBlocks, error: blocksError } = await supabase
    .from('workout_blocks')
    .insert(
      blocks.map((block) => ({
        workout_id: workoutId,
        user_id: userId,
        order_index: block.order_index,
        modality: block.modality,
        exercise_name: block.exercise_name ? formatExerciseName(block.exercise_name) : null,
        muscle_group: block.muscle_group?.trim() || null,
        duration_min: block.duration_min ?? null,
        distance_km: block.distance_km ?? null,
        avg_pace_min: block.avg_pace_min ?? null,
        avg_speed_kmh: block.avg_speed_kmh ?? null,
        laps: block.laps ?? null,
        notes: block.notes?.trim() || null,
      }))
    )
    .select('id, order_index');

  if (blocksError) throw new Error(`Erro ao criar blocos: ${blocksError.message}`);

  const allSets = blocks.flatMap((block) => {
    if (block.modality !== 'musculacao' || !block.sets?.length) return [];
    const inserted = insertedBlocks?.find((b) => b.order_index === block.order_index);
    if (!inserted) return [];
    return block.sets.map((set) => ({
      block_id: inserted.id,
      user_id: userId,
      set_number: set.set_number,
      reps: set.reps ?? null,
      weight_kg: set.weight_kg ?? null,
      is_warmup: set.is_warmup,
      rpe: set.rpe ?? null,
      notes: set.notes?.trim() || null,
    }));
  });

  if (allSets.length > 0) {
    const { error: setsError } = await supabase.from('strength_sets').insert(allSets);
    if (setsError) console.error('[insertSets]', setsError.message);
  }
}

function parsePayload(formData: FormData): WorkoutActionState | z.infer<typeof WorkoutPayloadSchema> {
  let raw: unknown;
  try {
    raw = JSON.parse((formData.get('payload') as string) ?? '{}');
  } catch {
    return { success: false, message: 'Formato de dados inválido.' };
  }

  const parsed = WorkoutPayloadSchema.safeParse(raw);
  if (!parsed.success) {
    const flat = parsed.error.flatten();
    const firstError =
      flat.formErrors[0] ??
      Object.values(flat.fieldErrors).flat()[0] ??
      'Dados inválidos.';
    return {
      success: false,
      message: firstError,
      fieldErrors: flat.fieldErrors as Record<string, string[]>,
    };
  }
  return parsed.data;
}

function isActionState(val: unknown): val is WorkoutActionState {
  return typeof val === 'object' && val !== null && 'success' in val;
}

// CREATE
export async function createWorkout(
  _prevState: WorkoutActionState,
  formData: FormData
): Promise<WorkoutActionState> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, message: 'Não autenticado.' };

  const result = parsePayload(formData);
  if (isActionState(result)) return result;

  const { title, notes, started_at, ended_at, blocks } = result;

  const { data: workout, error: workoutError } = await supabase
    .from('workouts')
    .insert({
      user_id: user.id,
      title,
      notes: notes ?? null,
      started_at: new Date(started_at).toISOString(),
      ended_at: ended_at ? new Date(ended_at).toISOString() : null,
    })
    .select('id')
    .single();

  if (workoutError) {
    if (workoutError.message.includes('futuro') || workoutError.message.includes('future')) {
      return { success: false, message: 'Não é permitido registrar treinos com data futura.' };
    }
    return { success: false, message: `Erro ao criar treino: ${workoutError.message}` };
  }

  try {
    await insertBlocksAndSets(supabase, workout.id, user.id, blocks);
  } catch (err) {
    await supabase.from('workouts').delete().eq('id', workout.id);
    return { success: false, message: err instanceof Error ? err.message : 'Erro ao criar blocos.' };
  }

  revalidatePath('/treinos');
  revalidatePath('/dashboard');

  return { success: true, message: 'Treino criado com sucesso!', workoutId: workout.id };
}

// UPDATE
export async function updateWorkout(
  workoutId: string,
  _prevState: WorkoutActionState,
  formData: FormData
): Promise<WorkoutActionState> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, message: 'Não autenticado.' };

  const result = parsePayload(formData);
  if (isActionState(result)) return result;

  const { title, notes, started_at, ended_at, blocks } = result;

  const { data: existing } = await supabase
    .from('workouts')
    .select('id')
    .eq('id', workoutId)
    .eq('user_id', user.id)
    .single();

  if (!existing) return { success: false, message: 'Treino não encontrado.' };

  const { error: updateError } = await supabase
    .from('workouts')
    .update({
      title,
      notes: notes ?? null,
      started_at: new Date(started_at).toISOString(),
      ended_at: ended_at ? new Date(ended_at).toISOString() : null,
    })
    .eq('id', workoutId)
    .eq('user_id', user.id);

  if (updateError) {
    if (updateError.message.includes('futuro') || updateError.message.includes('future')) {
      return { success: false, message: 'Não é permitido registrar treinos com data futura.' };
    }
    return { success: false, message: `Erro ao atualizar treino: ${updateError.message}` };
  }

  // Deletar blocos antigos (cascade deleta as séries)
  await supabase
    .from('workout_blocks')
    .delete()
    .eq('workout_id', workoutId)
    .eq('user_id', user.id);

  try {
    await insertBlocksAndSets(supabase, workoutId, user.id, blocks);
  } catch (err) {
    return { success: false, message: err instanceof Error ? err.message : 'Erro ao atualizar blocos.' };
  }

  revalidatePath('/treinos');
  revalidatePath(`/treinos/${workoutId}`);
  revalidatePath('/dashboard');

  return { success: true, message: 'Treino atualizado com sucesso!', workoutId };
}

// DELETE
export async function deleteWorkoutAction(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  const workoutId = formData.get('workoutId') as string;
  if (!workoutId) return;

  await supabase
    .from('workouts')
    .delete()
    .eq('id', workoutId)
    .eq('user_id', user.id);

  revalidatePath('/treinos');
  revalidatePath('/dashboard');
  redirect('/treinos');
}