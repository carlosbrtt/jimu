// ============================================================
// Jimu (ジム) — Motor Matemático Determinístico (Camada 1)
// ============================================================

import type { FeedWorkout } from '@/components/WorkoutFeed';
import type { Profile } from '@/types/index';

export interface MuscleGroupVolume {
  muscleGroup: string;
  totalVolumeKg: number;
  totalSets: number;
}

export interface StagnantExercise {
  exerciseName: string;
  muscleGroup: string;
  currentMaxOneRM: number;
  weeksStagnant: number;
  lastIncreaseDate: string;
}

export interface CardioProgression {
  totalDistanceKm: number;
  totalDurationMin: number;
  avgPaceMin: number | null;
  distanceChangePercent: number | null;
  paceChangePercent: number | null;
}

export interface CalculatedMetrics {
  periodDays: number;
  totalWorkouts: number;
  weeklyAdherenceRate: number;
  volumeByMuscleGroup: MuscleGroupVolume[];
  weeklyVolumeProgression: { weekLabel: string; volumeKg: number }[];
  volumeChangePercentVsPrevWeek: number | null;
  stagnantExercises: StagnantExercise[];
  cardio: CardioProgression;
  userContext: {
    name: string;
    division: string;
    mainGoal: string;
    targetWeeklyFrequency: number;
    bodyWeightKg: number | null;
  };
}

function calcEpley(weight: number, reps: number): number {
  if (!weight || !reps || reps < 1) return 0;
  return Math.round(weight * (1 + reps / 30) * 10) / 10;
}

export function computeWorkoutMetrics(
  workouts: FeedWorkout[],
  profile: Profile | null
): CalculatedMetrics {
  const now = Date.now();
  const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000;

  const recentWorkouts = workouts
    .filter((w) => new Date(w.started_at).getTime() >= thirtyDaysAgo)
    .sort((a, b) => new Date(a.started_at).getTime() - new Date(b.started_at).getTime());

  // 1. Volume por Grupo Muscular
  const muscleMap: Record<string, { totalVolume: number; totalSets: number }> = {};

  recentWorkouts.forEach((w) => {
    w.workout_blocks?.forEach((b) => {
      if (b.modality === 'musculacao') {
        const group = (b.muscle_group?.trim() || 'Geral').toUpperCase();
        if (!muscleMap[group]) {
          muscleMap[group] = { totalVolume: 0, totalSets: 0 };
        }

        b.strength_sets?.forEach((s) => {
          if (!s.is_warmup && s.weight_kg && s.reps) {
            muscleMap[group].totalVolume += s.weight_kg * s.reps;
            muscleMap[group].totalSets += 1;
          }
        });
      }
    });
  });

  const volumeByMuscleGroup: MuscleGroupVolume[] = Object.entries(muscleMap)
    .map(([group, data]) => ({
      muscleGroup: group,
      totalVolumeKg: Math.round(data.totalVolume),
      totalSets: data.totalSets,
    }))
    .sort((a, b) => b.totalVolumeKg - a.totalVolumeKg);

  // 2. Volume Semanal & Variação contra semana anterior
  const weeksMap: Record<string, number> = {};
  recentWorkouts.forEach((w) => {
    const d = new Date(w.started_at);
    const sunday = new Date(d);
    sunday.setDate(d.getDate() - d.getDay());
    const key = sunday.toISOString().slice(0, 10);

    if (!weeksMap[key]) weeksMap[key] = 0;

    w.workout_blocks?.forEach((b) => {
      if (b.modality === 'musculacao') {
        b.strength_sets?.forEach((s) => {
          if (!s.is_warmup && s.weight_kg && s.reps) {
            weeksMap[key] += s.weight_kg * s.reps;
          }
        });
      }
    });
  });

  const sortedWeeks = Object.entries(weeksMap)
    .sort(([dateA], [dateB]) => dateA.localeCompare(dateB))
    .map(([date, vol]) => {
      const d = new Date(date);
      return {
        weekLabel: `${d.getDate()}/${d.getMonth() + 1}`,
        volumeKg: Math.round(vol),
      };
    });

  let volumeChangePercentVsPrevWeek: number | null = null;
  if (sortedWeeks.length >= 2) {
    const last = sortedWeeks[sortedWeeks.length - 1].volumeKg;
    const prev = sortedWeeks[sortedWeeks.length - 2].volumeKg;
    if (prev > 0) {
      volumeChangePercentVsPrevWeek = Math.round(((last - prev) / prev) * 100);
    }
  }

  // 3. Detecção de Exercícios Estagnados há 2+ semanas
  const exerciseHistory: Record<
    string,
    { muscleGroup: string; sessions: { date: string; maxOneRM: number }[] }
  > = {};

  workouts.forEach((w) => {
    w.workout_blocks?.forEach((b) => {
      if (b.modality === 'musculacao' && b.exercise_name?.trim()) {
        const name = b.exercise_name.trim();
        if (!exerciseHistory[name]) {
          exerciseHistory[name] = {
            muscleGroup: b.muscle_group?.trim() || 'Geral',
            sessions: [],
          };
        }

        let maxOneRMInSession = 0;
        b.strength_sets?.forEach((s) => {
          if (!s.is_warmup && s.weight_kg && s.reps) {
            const epley = calcEpley(s.weight_kg, s.reps);
            if (epley > maxOneRMInSession) maxOneRMInSession = epley;
          }
        });

        if (maxOneRMInSession > 0) {
          exerciseHistory[name].sessions.push({
            date: w.started_at,
            maxOneRM: maxOneRMInSession,
          });
        }
      }
    });
  });

  const stagnantExercises: StagnantExercise[] = [];
  const twoWeeksMs = 14 * 24 * 60 * 60 * 1000;

  Object.entries(exerciseHistory).forEach(([name, data]) => {
    const sessions = data.sessions.sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    if (sessions.length >= 3) {
      const latest = sessions[sessions.length - 1];
      const oldestSessionInCheck = sessions[sessions.length - 3];
      const timeSpan = new Date(latest.date).getTime() - new Date(oldestSessionInCheck.date).getTime();

      if (timeSpan >= twoWeeksMs) {
        const firstOneRM = oldestSessionInCheck.maxOneRM;
        const currentOneRM = latest.maxOneRM;

        if (currentOneRM <= firstOneRM * 1.01) {
          const weeks = Math.round(timeSpan / (7 * 24 * 60 * 60 * 1000));
          stagnantExercises.push({
            exerciseName: name,
            muscleGroup: data.muscleGroup,
            currentMaxOneRM: currentOneRM,
            weeksStagnant: weeks,
            lastIncreaseDate: oldestSessionInCheck.date,
          });
        }
      }
    }
  });

  // 4. Métricas de Cardio / Aeróbico
  let totalDistanceKm = 0;
  let totalDurationMin = 0;
  let weightedPaceSum = 0;
  let distanceWithPace = 0;

  recentWorkouts.forEach((w) => {
    w.workout_blocks?.forEach((b) => {
      if (b.modality === 'corrida' || b.modality === 'aerobico' || b.modality === 'natacao') {
        if (b.distance_km) totalDistanceKm += Number(b.distance_km);
        if (b.duration_min) totalDurationMin += Number(b.duration_min);
        if (b.avg_pace_min && b.distance_km) {
          weightedPaceSum += Number(b.avg_pace_min) * Number(b.distance_km);
          distanceWithPace += Number(b.distance_km);
        }
      }
    });
  });

  const avgPaceMin = distanceWithPace > 0 ? Number((weightedPaceSum / distanceWithPace).toFixed(2)) : null;

  // 5. Aderência à Frequência Alvo
  const targetFreq = profile?.weekly_frequency ?? 4;
  const workoutsLast7Days = workouts.filter(
    (w) => new Date(w.started_at).getTime() >= now - 7 * 24 * 60 * 60 * 1000
  ).length;

  const weeklyAdherenceRate = Math.min(
    Math.round((workoutsLast7Days / targetFreq) * 100),
    150
  );

  return {
    periodDays: 30,
    totalWorkouts: recentWorkouts.length,
    weeklyAdherenceRate,
    volumeByMuscleGroup,
    weeklyVolumeProgression: sortedWeeks,
    volumeChangePercentVsPrevWeek,
    stagnantExercises,
    cardio: {
      totalDistanceKm: Number(totalDistanceKm.toFixed(2)),
      totalDurationMin: Math.round(totalDurationMin),
      avgPaceMin,
      distanceChangePercent: null,
      paceChangePercent: null,
    },
    userContext: {
      name: profile?.display_name || 'Atleta',
      division: profile?.division || 'Não especificada',
      mainGoal: profile?.main_goal || 'Geral',
      targetWeeklyFrequency: targetFreq,
      bodyWeightKg: profile?.body_weight_kg ? Number(profile.body_weight_kg) : null,
    },
  };
}