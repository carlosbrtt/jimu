import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { computeWorkoutMetrics } from '@/lib/analytics/metrics';
import { generateAthleticAnalysis } from '@/lib/ai/analyzer';
import type { FeedWorkout } from '@/components/WorkoutFeed';
import type { Profile } from '@/types/index';

function getCurrentWeekStartDate(): string {
  const d = new Date();
  d.setDate(d.getDate() - d.getDay()); // Domingo da semana atual
  d.setHours(0, 0, 0, 0);
  return d.toISOString().slice(0, 10);
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const forceRefresh = !!body.force;
    const weekStartDate = getCurrentWeekStartDate();

    // 1. Checar se já existe análise em cache para esta semana no Supabase
    if (!forceRefresh) {
      const { data: cached } = await supabase
        .from('ai_analyses')
        .select('*')
        .eq('user_id', user.id)
        .eq('week_start_date', weekStartDate)
        .maybeSingle();

      if (cached) {
        return NextResponse.json({
          cached: true,
          analysis: {
            id: cached.id,
            summary: (cached.raw_metrics as any)?.summary || 'Análise da semana em cache.',
            strengths: cached.strengths,
            attention_points: cached.attention_points,
            recommendations: cached.recommendations,
            model_used: cached.model_used,
            created_at: cached.created_at,
          },
        });
      }
    }

    // 2. Carregar perfil do atleta
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single<Profile>();

    // 3. Carregar histórico completo de treinos dos últimos 60 dias
    const sixtyDaysAgo = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString();
    const { data: workoutsData, error: workoutsError } = await supabase
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
      .gte('started_at', sixtyDaysAgo)
      .order('started_at', { ascending: false })
      .returns<FeedWorkout[]>();

    if (workoutsError) {
      throw new Error(`Erro ao buscar treinos: ${workoutsError.message}`);
    }

    const workouts = workoutsData ?? [];

    if (workouts.length === 0) {
      return NextResponse.json(
        { error: 'Você precisa registrar pelo menos um treino antes de solicitar uma análise por IA.' },
        { status: 400 }
      );
    }

    // 4. Camada 1: Executar cálculos matemáticos determinísticos
    const metrics = computeWorkoutMetrics(workouts, profile);

    // 5. Camada 2: Invocar IA com Structured Outputs & Fallback
    const aiResult = await generateAthleticAnalysis(metrics);

    // 6. Salvar ou atualizar no cache do PostgreSQL (ai_analyses)
    const { data: savedAnalysis, error: saveError } = await supabase
      .from('ai_analyses')
      .upsert(
        {
          user_id: user.id,
          week_start_date: weekStartDate,
          model_used: aiResult.model_used,
          strengths: aiResult.strengths,
          attention_points: aiResult.attention_points,
          recommendations: aiResult.recommendations,
          raw_metrics: {
            summary: aiResult.summary,
            computed: metrics,
          },
          created_at: new Date().toISOString(),
        },
        { onConflict: 'user_id, week_start_date' }
      )
      .select()
      .single();

    if (saveError) {
      console.error('[ai_analyses upsert]', saveError);
    }

    return NextResponse.json({
      cached: false,
      analysis: {
        id: savedAnalysis?.id,
        summary: aiResult.summary,
        strengths: aiResult.strengths,
        attention_points: aiResult.attention_points,
        recommendations: aiResult.recommendations,
        model_used: aiResult.model_used,
        created_at: savedAnalysis?.created_at || new Date().toISOString(),
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erro interno ao processar análise.';
    console.error('[/api/analyze POST error]', err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// GET para leitura do cache
export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const weekStartDate = getCurrentWeekStartDate();

    const { data: cached } = await supabase
      .from('ai_analyses')
      .select('*')
      .eq('user_id', user.id)
      .eq('week_start_date', weekStartDate)
      .maybeSingle();

    if (!cached) {
      return NextResponse.json({ analysis: null });
    }

    return NextResponse.json({
      analysis: {
        id: cached.id,
        summary: (cached.raw_metrics as any)?.summary || '',
        strengths: cached.strengths,
        attention_points: cached.attention_points,
        recommendations: cached.recommendations,
        model_used: cached.model_used,
        created_at: cached.created_at,
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erro ao recuperar análise.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}