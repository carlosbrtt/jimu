'use client';

import { useMemo } from 'react';
import { Dumbbell, Calendar, TrendingUp } from 'lucide-react';
import type { FeedWorkout } from './WorkoutFeed';

interface DashboardStatsProps {
  workouts: FeedWorkout[];
  weeklyFrequency: number | null;
}

export default function DashboardStats({ workouts, weeklyFrequency }: DashboardStatsProps) {
  const totalWorkouts = workouts.length;

  const weekWorkouts = useMemo(() => {
    const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    return workouts.filter((w) => new Date(w.started_at).getTime() >= sevenDaysAgo).length;
  }, [workouts]);

  const activeWeeks = useMemo(() => {
    return totalWorkouts ? Math.ceil(totalWorkouts / (weeklyFrequency ?? 3)) : 0;
  }, [totalWorkouts, weeklyFrequency]);

  return (
    <div className="mb-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <StatCard
        icon={Dumbbell}
        label="Total de Treinos"
        value={totalWorkouts}
        unit="sessões registradas"
        color="emerald"
      />
      <StatCard
        icon={Calendar}
        label="Treinos Últimos 7 Dias"
        value={weekWorkouts}
        unit={`de ${weeklyFrequency ?? '—'} alvos semanais`}
        color="blue"
      />
      <StatCard
        icon={TrendingUp}
        label="Semanas Ativas"
        value={activeWeeks}
        unit="semanas consistentes"
        color="violet"
      />
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  unit,
  color,
}: {
  icon: React.ElementType;
  label: string;
  value: number;
  unit: string;
  color: 'emerald' | 'blue' | 'violet';
}) {
  const colorMap = {
    emerald: 'text-emerald-400 bg-emerald-500/10',
    blue: 'text-blue-400 bg-blue-500/10',
    violet: 'text-violet-400 bg-violet-500/10',
  };

  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5 shadow-lg">
      <div className={`mb-3 inline-flex rounded-xl p-2.5 ${colorMap[color]}`}>
        <Icon className={`h-5 w-5 ${colorMap[color].split(' ')[0]}`} />
      </div>
      <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
        {label}
      </p>
      <p className="mt-1 text-3xl font-bold text-white">{value}</p>
      <p className="mt-0.5 text-xs text-zinc-500">{unit}</p>
    </div>
  );
}