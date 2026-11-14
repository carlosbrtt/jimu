import { Suspense } from 'react';
import { connection } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';
import Navbar from '@/components/Navbar';
import Link from 'next/link';
import { Plus, TrendingUp, Brain, Activity, Loader2 } from 'lucide-react';
import type { Profile } from '@/types/index';
import TodayDate from './TodayDate';
import WorkoutFeed, { type FeedWorkout } from '@/components/WorkoutFeed';
import EvolucaoCharts from '@/components/EvolucaoCharts';
import DashboardStats from '@/components/DashboardStats';
import AiAnalysisCard from '@/components/AiAnalysisCard';

export const metadata = { title: 'Dashboard · Jimu' };

async function DashboardContent() {
  await connection();

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single<Profile>();

  const { data: workoutsData } = await supabase
    .from('workouts')
    .select(`
      id, title, notes, started_at, ended_at,
      workout_blocks (
        id, order_index, modality, exercise_name, muscle_group,
        duration_min, distance_km, avg_pace_min, avg_speed_kmh, laps,
        strength_sets (
          id, set_number, reps, weight_kg, is_warmup, rpe
        )
      )
    `)
    .eq('user_id', user.id)
    .order('started_at', { ascending: false })
    .returns<FeedWorkout[]>();

  const workouts: FeedWorkout[] = workoutsData ?? [];

  // Buscar cache da análise semanal atual
  const now = new Date();
  now.setDate(now.getDate() - now.getDay());
  const currentWeekStart = now.toISOString().slice(0, 10);

  const { data: cachedAnalysisRow } = await supabase
    .from('ai_analyses')
    .select('*')
    .eq('user_id', user.id)
    .eq('week_start_date', currentWeekStart)
    .maybeSingle();

  const initialAnalysis = cachedAnalysisRow
    ? {
        summary: (cachedAnalysisRow.raw_metrics as any)?.summary || '',
        strengths: cachedAnalysisRow.strengths,
        attention_points: cachedAnalysisRow.attention_points,
        recommendations: cachedAnalysisRow.recommendations,
        model_used: cachedAnalysisRow.model_used,
        created_at: cachedAnalysisRow.created_at,
      }
    : null;

  const profileComplete =
    profile?.division && profile?.main_goal && profile?.weekly_frequency;

  const displayName =
    profile?.display_name ?? user.email?.split('@')[0] ?? 'Atleta';

  return (
    <main className="mx-auto max-w-7xl px-4 py-8">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">
            Olá, {displayName}! 👋
          </h1>
          <TodayDate />
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/treinos/novo"
            className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-emerald-500 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-400 active:scale-[0.99] transition-all shadow-lg shadow-emerald-500/20"
          >
            <Plus className="h-4 w-4" />
            Registrar Treino
          </Link>
        </div>
      </div>

      {!profileComplete && (
        <div className="mb-8 flex items-start gap-3 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4">
          <Brain className="mt-0.5 h-5 w-5 shrink-0 text-amber-400" />
          <div>
            <p className="text-sm font-medium text-amber-300">
              Complete seu perfil para calibrar a Inteligência Artificial
            </p>
            <p className="mt-0.5 text-xs text-amber-400/80">
              A IA precisa do seu objetivo e metodologia para gerar recomendações precisas.{' '}
              <Link href="/perfil" className="underline font-semibold hover:text-amber-200">
                Configurar agora →
              </Link>
            </p>
          </div>
        </div>
      )}

      {/* Stats Numéricos */}
      <DashboardStats
        workouts={workouts}
        weeklyFrequency={profile?.weekly_frequency ?? null}
      />

      {/* Card da Fase 4: Inteligência Artificial */}
      <section className="mb-12">
        <AiAnalysisCard initialAnalysis={initialAnalysis} />
      </section>

      {/* Gráficos Recharts */}
      <section className="mb-12">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-emerald-400" />
            Evolução Real de Desempenho
          </h2>
          <span className="text-xs text-zinc-500">Métricas dinâmicas</span>
        </div>

        <EvolucaoCharts workouts={workouts} />
      </section>

      {/* Feed Estilo Strava */}
      <section>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Activity className="h-5 w-5 text-emerald-400" />
            Feed de Atividades
          </h2>
          <Link
            href="/treinos"
            className="text-xs font-medium text-emerald-400 hover:text-emerald-300 transition-colors"
          >
            Ver todos os treinos →
          </Link>
        </div>

        <WorkoutFeed workouts={workouts} />
      </section>
    </main>
  );
}

export default function DashboardPage() {
  return (
    <div className="min-h-screen bg-zinc-950 pb-20">
      <Navbar />
      <Suspense
        fallback={
          <div className="mx-auto max-w-7xl px-4 py-24 flex flex-col items-center justify-center gap-3 text-zinc-500">
            <Loader2 className="h-8 w-8 animate-spin text-emerald-400" />
            <span className="text-sm">Carregando painel do atleta...</span>
          </div>
        }
      >
        <DashboardContent />
      </Suspense>
    </div>
  );
}