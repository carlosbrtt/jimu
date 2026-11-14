'use server';

import { createClient } from '@/utils/supabase/server';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import type { Division, MainGoal } from '@/types/index';

const ProfileSchema = z.object({
  display_name: z
    .string()
    .min(1, 'Nome não pode ser vazio')
    .max(80, 'Nome muito longo')
    .trim(),
  division: z
    .enum([
      'upper_lower', 'full_body', 'push_pull_legs',
      'abcde', 'hibrido', 'corrida_endurance',
      'natacao', 'personalizado',
    ] as [Division, ...Division[]])
    .nullable()
    .optional(),
  main_goal: z
    .enum([
      'hipertrofia', 'emagrecimento', 'forca',
      'resistencia', 'saude_geral', 'performance',
    ] as [MainGoal, ...MainGoal[]])
    .nullable()
    .optional(),
  weekly_frequency: z.number().int().min(1).max(14).nullable().optional(),
  body_weight_kg: z
    .number()
    .positive('Peso deve ser positivo')
    .max(500)
    .nullable()
    .optional(),
});

// Exportar o tipo do estado para uso no ProfileForm
export interface ProfileFormState {
  success: boolean;
  message: string;
  errors?: Record<string, string[]>;
}

export async function updateProfile(
  _prevState: ProfileFormState,
  formData: FormData
): Promise<ProfileFormState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, message: 'Não autenticado.' };
  }

  const raw = {
    display_name: formData.get('display_name') as string,
    division: (formData.get('division') as Division) || null,
    main_goal: (formData.get('main_goal') as MainGoal) || null,
    weekly_frequency: formData.get('weekly_frequency')
      ? Number(formData.get('weekly_frequency'))
      : null,
    body_weight_kg: formData.get('body_weight_kg')
      ? Number(formData.get('body_weight_kg'))
      : null,
  };

  const parsed = ProfileSchema.safeParse(raw);

  if (!parsed.success) {
    return {
      success: false,
      message: 'Dados inválidos. Corrija os campos abaixo.',
      errors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    };
  }

  const { error } = await supabase
    .from('profiles')
    .update({
      ...parsed.data,
      updated_at: new Date().toISOString(),
    })
    .eq('id', user.id);

  if (error) {
    console.error('[updateProfile] Supabase error:', error);
    return { success: false, message: 'Erro ao salvar. Tente novamente.' };
  }

  revalidatePath('/perfil');
  return { success: true, message: 'Perfil atualizado com sucesso!' };
}