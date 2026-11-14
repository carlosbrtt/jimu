// ============================================================
// Jimu — Tipos Globais (alinhados com o schema do Supabase)
// ============================================================

export type Division =
  | 'upper_lower'
  | 'full_body'
  | 'push_pull_legs'
  | 'abcde'
  | 'hibrido'
  | 'corrida_endurance'
  | 'natacao'
  | 'personalizado';

export type MainGoal =
  | 'hipertrofia'
  | 'emagrecimento'
  | 'forca'
  | 'resistencia'
  | 'saude_geral'
  | 'performance';

export type Modality =
  | 'musculacao'
  | 'corrida'
  | 'natacao'
  | 'aerobico'
  | 'outro';

export interface Profile {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  division: Division | null;
  main_goal: MainGoal | null;
  weekly_frequency: number | null;
  body_weight_kg: number | null;
  updated_at: string;
}

export interface Workout {
  id: string;
  user_id: string;
  title: string;
  notes: string | null;
  started_at: string;
  ended_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface WorkoutBlock {
  id: string;
  workout_id: string;
  user_id: string;
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
  created_at: string;
}

export interface StrengthSet {
  id: string;
  block_id: string;
  user_id: string;
  set_number: number;
  reps: number | null;
  weight_kg: number | null;
  is_warmup: boolean;
  rpe: number | null;
  notes: string | null;
  created_at: string;
}

export interface AiAnalysis {
  id: string;
  user_id: string;
  week_start_date: string;
  model_used: string;
  strengths: string[];
  attention_points: string[];
  recommendations: string[];
  raw_metrics: Record<string, unknown> | null;
  created_at: string;
}

export interface WorkoutWithBlocks extends Workout {
  workout_blocks: (WorkoutBlock & { strength_sets: StrengthSet[] })[];
}

export const DIVISION_LABELS: Record<Division, string> = {
  upper_lower: 'Upper / Lower',
  full_body: 'Full Body',
  push_pull_legs: 'Push / Pull / Legs',
  abcde: 'ABCDE',
  hibrido: 'Híbrido (Musculação + Cardio)',
  corrida_endurance: 'Corrida / Endurance',
  natacao: 'Natação',
  personalizado: 'Personalizado',
};

export const GOAL_LABELS: Record<MainGoal, string> = {
  hipertrofia: 'Hipertrofia',
  emagrecimento: 'Emagrecimento',
  forca: 'Força Máxima',
  resistencia: 'Resistência',
  saude_geral: 'Saúde Geral',
  performance: 'Performance Atlética',
};

export const MODALITY_LABELS: Record<Modality, string> = {
  musculacao: 'Musculação',
  corrida: 'Corrida',
  natacao: 'Natação',
  aerobico: 'Aeróbico',
  outro: 'Outro',
};

export const MODALITY_EMOJI: Record<Modality, string> = {
  musculacao: '🏋️',
  corrida: '🏃',
  natacao: '🏊',
  aerobico: '🚴',
  outro: '⚡',
};