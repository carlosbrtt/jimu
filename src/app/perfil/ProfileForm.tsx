'use client';

import { useActionState } from 'react';
import { updateProfile } from './actions';
import type { ProfileFormState } from './actions'; // ← importa o tipo do actions
import type { Profile, Division, MainGoal } from '@/types/index';
import { DIVISION_LABELS, GOAL_LABELS } from '@/types/index';
import { Loader2, CheckCircle2, AlertCircle } from 'lucide-react';

const DIVISIONS = Object.entries(DIVISION_LABELS) as [Division, string][];
const GOALS = Object.entries(GOAL_LABELS) as [MainGoal, string][];

// ↓ Tipagem explícita: resolve o erro "errors não existe no tipo"
const initialState: ProfileFormState = { success: false, message: '' };

function FieldError({
  errors,
  field,
}: {
  errors?: Record<string, string[]>;
  field: string;
}) {
  const msgs = errors?.[field];
  if (!msgs?.length) return null;
  return <p className="mt-1 text-xs text-red-400">{msgs[0]}</p>;
}

export default function ProfileForm({ profile }: { profile: Profile | null }) {
  const [state, formAction, isPending] = useActionState(
    updateProfile,
    initialState
  );

  return (
    <form action={formAction} className="space-y-6">
      {/* Feedback global */}
      {state.message && (
        <div
          className={`flex items-start gap-2.5 rounded-xl border px-4 py-3 text-sm ${
            state.success
              ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400'
              : 'border-red-500/30 bg-red-500/10 text-red-400'
          }`}
        >
          {state.success ? (
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
          ) : (
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          )}
          {state.message}
        </div>
      )}

      {/* Card: Informações Pessoais */}
      <section className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-zinc-400">
          Informações Pessoais
        </h2>
        <div className="space-y-4">
          <div>
            <label
              htmlFor="display_name"
              className="mb-1.5 block text-sm font-medium text-zinc-300"
            >
              Nome de exibição
            </label>
            <input
              id="display_name"
              name="display_name"
              type="text"
              defaultValue={profile?.display_name ?? ''}
              placeholder="Como você quer ser chamado"
              className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2.5 text-sm text-white placeholder-zinc-500 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/40 transition-colors"
            />
            <FieldError errors={state.errors} field="display_name" />
          </div>

          <div>
            <label
              htmlFor="body_weight_kg"
              className="mb-1.5 block text-sm font-medium text-zinc-300"
            >
              Peso corporal atual (kg)
            </label>
            <input
              id="body_weight_kg"
              name="body_weight_kg"
              type="number"
              step="0.1"
              min="20"
              max="400"
              defaultValue={profile?.body_weight_kg ?? ''}
              placeholder="ex.: 78.5"
              className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2.5 text-sm text-white placeholder-zinc-500 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/40 transition-colors"
            />
            <FieldError errors={state.errors} field="body_weight_kg" />
          </div>
        </div>
      </section>

      {/* Card: Configuração de Treino */}
      <section className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-zinc-400">
          Configuração de Treino
        </h2>
        <div className="space-y-4">
          <div>
            <label
              htmlFor="division"
              className="mb-1.5 block text-sm font-medium text-zinc-300"
            >
              Divisão / Metodologia
            </label>
            <select
              id="division"
              name="division"
              defaultValue={profile?.division ?? ''}
              className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2.5 text-sm text-white outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/40 transition-colors"
            >
              <option value="">Selecione sua metodologia</option>
              {DIVISIONS.map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              htmlFor="main_goal"
              className="mb-1.5 block text-sm font-medium text-zinc-300"
            >
              Objetivo Principal
            </label>
            <select
              id="main_goal"
              name="main_goal"
              defaultValue={profile?.main_goal ?? ''}
              className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2.5 text-sm text-white outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/40 transition-colors"
            >
              <option value="">Selecione seu objetivo</option>
              {GOALS.map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              htmlFor="weekly_frequency"
              className="mb-1.5 block text-sm font-medium text-zinc-300"
            >
              Frequência semanal alvo (dias)
            </label>
            <input
              id="weekly_frequency"
              name="weekly_frequency"
              type="number"
              min="1"
              max="14"
              defaultValue={profile?.weekly_frequency ?? ''}
              placeholder="ex.: 4"
              className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2.5 text-sm text-white placeholder-zinc-500 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/40 transition-colors"
            />
            <FieldError errors={state.errors} field="weekly_frequency" />
          </div>
        </div>
      </section>

      {/* Botão Salvar */}
      <button
        type="submit"
        disabled={isPending}
        className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-emerald-500 text-sm font-semibold text-white hover:bg-emerald-400 disabled:opacity-60 disabled:cursor-not-allowed transition-all"
      >
        {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
        {isPending ? 'Salvando...' : 'Salvar Perfil'}
      </button>
    </form>
  );
}