'use client';

import { useActionState, useEffect, useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  Plus, Trash2, ChevronUp, ChevronDown,
  Loader2, CheckCircle2, AlertCircle, Info,
} from 'lucide-react';
import type { WorkoutActionState } from './actions';
import type { Modality } from '@/types/index';
import { MODALITY_EMOJI, MODALITY_LABELS } from '@/types/index';
import { DEFAULT_EXERCISES, formatExerciseName } from '@/lib/utils/exercise';

// ─── Draft Types ──────────────────────────────────────────────────────────────

interface SetDraft {
  localId: string;
  set_number: number;
  reps: string;
  weight_kg: string;
  is_warmup: boolean;
  rpe: string;
  notes: string;
}

interface BlockDraft {
  localId: string;
  modality: Modality;
  exercise_name: string;
  muscle_group: string;
  duration_min: string;
  distance_km: string;
  avg_pace_min: string;
  avg_speed_kmh: string;
  laps: string;
  notes: string;
  sets: SetDraft[];
}

function uid() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function defaultSet(setNumber: number): SetDraft {
  return {
    localId: uid(),
    set_number: setNumber,
    reps: '',
    weight_kg: '',
    is_warmup: false,
    rpe: '',
    notes: '',
  };
}

function defaultBlock(): BlockDraft {
  return {
    localId: uid(),
    modality: 'musculacao',
    exercise_name: '',
    muscle_group: '',
    duration_min: '',
    distance_km: '',
    avg_pace_min: '',
    avg_speed_kmh: '',
    laps: '',
    notes: '',
    sets: [defaultSet(1)],
  };
}

function toNum(val: string): number | null {
  const n = parseFloat(val);
  return isNaN(n) ? null : n;
}

function toInt(val: string): number | null {
  const n = parseInt(val, 10);
  return isNaN(n) ? null : n;
}

function toLocalDatetime(iso: string): string {
  const d = new Date(iso);
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 16);
}

function nowLocalDatetime(): string {
  return toLocalDatetime(new Date().toISOString());
}

export interface WorkoutFormInitialData {
  title: string;
  notes: string;
  startedAt: string;
  endedAt: string;
  blocks: BlockDraft[];
}

interface WorkoutFormProps {
  action: (prev: WorkoutActionState, formData: FormData) => Promise<WorkoutActionState>;
  initialData?: WorkoutFormInitialData;
  userExercises?: string[]; // Lista dos exercícios anteriores do usuário
  submitLabel?: string;
}

const MODALITY_OPTIONS: Modality[] = ['musculacao', 'corrida', 'natacao', 'aerobico', 'outro'];

const MOD_COLOR: Record<Modality, string> = {
  musculacao: 'bg-blue-500 text-white',
  corrida: 'bg-green-500 text-white',
  natacao: 'bg-cyan-500 text-white',
  aerobico: 'bg-orange-500 text-white',
  outro: 'bg-zinc-500 text-white',
};

export default function WorkoutForm({
  action,
  initialData,
  userExercises = [],
  submitLabel = 'Salvar Treino',
}: WorkoutFormProps) {
  const router = useRouter();
  const initialState: WorkoutActionState = { success: false, message: '' };
  const [state, formAction, isPendingAction] = useActionState(action, initialState);
  const [isPendingTransition, startTransition] = useTransition();

  const isSubmitting = isPendingAction || isPendingTransition;

  const [title, setTitle] = useState(initialData?.title ?? '');
  const [notes, setNotes] = useState(initialData?.notes ?? '');
  const [startedAt, setStartedAt] = useState(initialData?.startedAt ?? '');
  const [endedAt, setEndedAt] = useState(initialData?.endedAt ?? '');
  const [blocks, setBlocks] = useState<BlockDraft[]>([]);
  const [maxDatetime, setMaxDatetime] = useState<string | undefined>(undefined);
  const [clientError, setClientError] = useState<string | null>(null);

  // Lista unificada de sugestões (exercícios anteriores + biblioteca padrão)
  const exerciseSuggestions = useMemo(() => {
    const set = new Set<string>();
    userExercises.forEach((ex) => set.add(formatExerciseName(ex)));
    DEFAULT_EXERCISES.forEach((ex) => set.add(ex));
    return Array.from(set).sort();
  }, [userExercises]);

  useEffect(() => {
    const currentLocal = nowLocalDatetime();
    setMaxDatetime(currentLocal);

    if (initialData) {
      setBlocks(initialData.blocks);
      setStartedAt(initialData.startedAt);
      setEndedAt(initialData.endedAt);
    } else {
      setStartedAt(currentLocal);
      setBlocks([defaultBlock()]);
    }
  }, [initialData]);

  useEffect(() => {
    if (state.success && state.workoutId) {
      router.push(`/treinos/${state.workoutId}`);
    }
  }, [state, router]);

  function validate(): string | null {
    if (!title.trim()) return 'O título do treino é obrigatório.';
    if (!startedAt) return 'A data e horário de início são obrigatórios.';
    if (new Date(startedAt) > new Date()) return 'Não é permitido registrar treinos com data futura.';
    if (endedAt && new Date(endedAt) < new Date(startedAt))
      return 'A data de término deve ser posterior à data de início.';
    if (blocks.length === 0) return 'Adicione pelo menos um bloco de treino.';

    for (let i = 0; i < blocks.length; i++) {
      const block = blocks[i];
      if (block.modality === 'musculacao') {
        if (!block.exercise_name.trim()) {
          return `Bloco #${i + 1} (Musculação): informe o nome do exercício.`;
        }
        if (block.sets.length === 0) {
          return `Bloco #${i + 1} (${block.exercise_name}): adicione pelo menos uma série.`;
        }
      }
    }
    return null;
  }

  function handleFormSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setClientError(null);

    const err = validate();
    if (err) {
      setClientError(err);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    const payloadObj = {
      title: title.trim(),
      notes: notes.trim() || null,
      started_at: startedAt ? new Date(startedAt).toISOString() : '',
      ended_at: endedAt ? new Date(endedAt).toISOString() : null,
      blocks: blocks.map((block, i) => ({
        order_index: i,
        modality: block.modality,
        exercise_name: block.exercise_name ? formatExerciseName(block.exercise_name) : null,
        muscle_group: block.muscle_group.trim() || null,
        duration_min: toNum(block.duration_min),
        distance_km: toNum(block.distance_km),
        avg_pace_min: toNum(block.avg_pace_min),
        avg_speed_kmh: toNum(block.avg_speed_kmh),
        laps: toInt(block.laps),
        notes: block.notes.trim() || null,
        sets:
          block.modality === 'musculacao'
            ? block.sets.map((s) => ({
                set_number: s.set_number,
                reps: toInt(s.reps),
                weight_kg: toNum(s.weight_kg),
                is_warmup: s.is_warmup,
                rpe: toNum(s.rpe),
                notes: s.notes.trim() || null,
              }))
            : [],
      })),
    };

    const fd = new FormData();
    fd.set('payload', JSON.stringify(payloadObj));

    startTransition(() => {
      formAction(fd);
    });
  }

  function addBlock() {
    setBlocks((prev) => [...prev, defaultBlock()]);
  }

  function removeBlock(localId: string) {
    setBlocks((prev) => prev.filter((b) => b.localId !== localId));
  }

  function moveBlock(index: number, dir: 'up' | 'down') {
    setBlocks((prev) => {
      const next = [...prev];
      const target = dir === 'up' ? index - 1 : index + 1;
      if (target < 0 || target >= next.length) return prev;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }

  function updateBlock(localId: string, updates: Partial<Omit<BlockDraft, 'localId' | 'sets'>>) {
    setBlocks((prev) =>
      prev.map((b) => (b.localId === localId ? { ...b, ...updates } : b))
    );
  }

  function changeModality(localId: string, modality: Modality) {
    setBlocks((prev) =>
      prev.map((b) =>
        b.localId !== localId
          ? b
          : {
              ...b,
              modality,
              sets: modality === 'musculacao' && b.sets.length === 0 ? [defaultSet(1)] : b.sets,
            }
      )
    );
  }

  function addSet(blockLocalId: string) {
    setBlocks((prev) =>
      prev.map((b) =>
        b.localId !== blockLocalId
          ? b
          : { ...b, sets: [...b.sets, defaultSet(b.sets.length + 1)] }
      )
    );
  }

  function removeSet(blockLocalId: string, setLocalId: string) {
    setBlocks((prev) =>
      prev.map((b) =>
        b.localId !== blockLocalId
          ? b
          : {
              ...b,
              sets: b.sets
                .filter((s) => s.localId !== setLocalId)
                .map((s, i) => ({ ...s, set_number: i + 1 })),
            }
      )
    );
  }

  function updateSet(blockLocalId: string, setLocalId: string, updates: Partial<SetDraft>) {
    setBlocks((prev) =>
      prev.map((b) =>
        b.localId !== blockLocalId
          ? b
          : {
              ...b,
              sets: b.sets.map((s) => (s.localId === setLocalId ? { ...s, ...updates } : s)),
            }
      )
    );
  }

  return (
    <form onSubmit={handleFormSubmit} noValidate className="space-y-6">
      {/* Datalist global para sugestões de exercícios */}
      <datalist id="exercise-suggestions">
        {exerciseSuggestions.map((ex) => (
          <option key={ex} value={ex} />
        ))}
      </datalist>

      {(clientError || state.message) && !state.success && (
        <div className="flex items-start gap-2.5 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{clientError ?? state.message}</span>
        </div>
      )}

      {state.success && (
        <div className="flex items-start gap-2.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-400">
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{state.message}</span>
        </div>
      )}

      <section className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-zinc-400">
          Informações da Sessão
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="mb-1.5 block text-sm font-medium text-zinc-300">
              Título <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="ex.: Peito + Tríceps — Upper A"
              maxLength={200}
              className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2.5 text-sm text-white placeholder-zinc-500 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/40 transition-colors"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-zinc-300">
              Início <span className="text-red-400">*</span>
            </label>
            <input
              type="datetime-local"
              value={startedAt}
              max={maxDatetime}
              onChange={(e) => setStartedAt(e.target.value)}
              className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2.5 text-sm text-white outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/40 transition-colors"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-zinc-300">
              Término <span className="text-xs font-normal text-zinc-500">(opcional)</span>
            </label>
            <input
              type="datetime-local"
              value={endedAt}
              min={startedAt || undefined}
              max={maxDatetime}
              onChange={(e) => setEndedAt(e.target.value)}
              className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2.5 text-sm text-white outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/40 transition-colors"
            />
          </div>

          <div className="sm:col-span-2">
            <label className="mb-1.5 block text-sm font-medium text-zinc-300">
              Notas gerais <span className="text-xs font-normal text-zinc-500">(opcional)</span>
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Como você está se sentindo hoje? Alguma observação geral?"
              rows={2}
              maxLength={2000}
              className="w-full resize-none rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2.5 text-sm text-white placeholder-zinc-500 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/40 transition-colors"
            />
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-400">
            Blocos de Treino
          </h2>
          <span className="rounded-full bg-zinc-800 px-2.5 py-0.5 text-xs text-zinc-400">
            {blocks.length} {blocks.length === 1 ? 'bloco' : 'blocos'}
          </span>
        </div>

        {blocks.length === 0 && (
          <div className="flex items-start gap-2 rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 text-sm text-zinc-400">
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-zinc-500" />
            Adicione pelo menos um bloco de treino abaixo.
          </div>
        )}

        {blocks.map((block, index) => (
          <BlockCard
            key={block.localId}
            block={block}
            index={index}
            total={blocks.length}
            onMoveUp={() => moveBlock(index, 'up')}
            onMoveDown={() => moveBlock(index, 'down')}
            onRemove={() => removeBlock(block.localId)}
            onChangeModality={(m) => changeModality(block.localId, m)}
            onUpdateBlock={(u) => updateBlock(block.localId, u)}
            onAddSet={() => addSet(block.localId)}
            onRemoveSet={(sid) => removeSet(block.localId, sid)}
            onUpdateSet={(sid, u) => updateSet(block.localId, sid, u)}
          />
        ))}

        <button
          type="button"
          onClick={addBlock}
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-zinc-700 py-4 text-sm font-medium text-zinc-400 hover:border-emerald-500/40 hover:bg-zinc-900/50 hover:text-emerald-400 transition-all"
        >
          <Plus className="h-4 w-4" />
          Adicionar Bloco
        </button>
      </section>

      <button
        type="submit"
        disabled={isSubmitting}
        className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-emerald-500 text-sm font-semibold text-white hover:bg-emerald-400 active:scale-[0.99] disabled:opacity-60 disabled:cursor-not-allowed transition-all shadow-lg shadow-emerald-500/20"
      >
        {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
        {isSubmitting ? 'Salvando...' : submitLabel}
      </button>
    </form>
  );
}

// ─── BlockCard ────────────────────────────────────────────────────────────────

interface BlockCardProps {
  block: BlockDraft;
  index: number;
  total: number;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onRemove: () => void;
  onChangeModality: (m: Modality) => void;
  onUpdateBlock: (updates: Partial<Omit<BlockDraft, 'localId' | 'sets'>>) => void;
  onAddSet: () => void;
  onRemoveSet: (setLocalId: string) => void;
  onUpdateSet: (setLocalId: string, updates: Partial<SetDraft>) => void;
}

function BlockCard({
  block, index, total,
  onMoveUp, onMoveDown, onRemove,
  onChangeModality, onUpdateBlock,
  onAddSet, onRemoveSet, onUpdateSet,
}: BlockCardProps) {
  const isMusc = block.modality === 'musculacao';
  const isNat = block.modality === 'natacao';

  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900">
      <div className="flex items-center gap-3 border-b border-zinc-800 px-5 py-3">
        <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${MOD_COLOR[block.modality]}`}>
          {index + 1}
        </span>
        <span className="flex-1 text-sm font-medium text-zinc-300">
          {MODALITY_EMOJI[block.modality]}{' '}
          {block.exercise_name.trim() || MODALITY_LABELS[block.modality]}
        </span>
        <button
          type="button"
          onClick={onMoveUp}
          disabled={index === 0}
          className="rounded p-1 text-zinc-500 hover:text-white disabled:opacity-30 transition-colors"
          title="Mover para cima"
        >
          <ChevronUp className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={onMoveDown}
          disabled={index === total - 1}
          className="rounded p-1 text-zinc-500 hover:text-white disabled:opacity-30 transition-colors"
          title="Mover para baixo"
        >
          <ChevronDown className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={onRemove}
          className="rounded p-1 text-zinc-500 hover:text-red-400 transition-colors"
          title="Remover bloco"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>

      <div className="p-5 space-y-5">
        <div>
          <p className="mb-2 text-xs font-medium text-zinc-400">Modalidade</p>
          <div className="flex flex-wrap gap-2">
            {MODALITY_OPTIONS.map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => onChangeModality(m)}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                  block.modality === m
                    ? MOD_COLOR[m]
                    : 'bg-zinc-800 text-zinc-400 hover:text-white'
                }`}
              >
                {MODALITY_EMOJI[m]} {MODALITY_LABELS[m]}
              </button>
            ))}
          </div>
        </div>

        {(isMusc || block.modality === 'outro') && (
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-zinc-400">
                Exercício {isMusc && <span className="text-red-400">*</span>}
              </label>
              {/* Input conectado com a lista de sugestões reutilizáveis */}
              <input
                type="text"
                list="exercise-suggestions"
                value={block.exercise_name}
                onChange={(e) => onUpdateBlock({ exercise_name: e.target.value })}
                placeholder="ex.: Puxada Alta"
                maxLength={200}
                className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-white placeholder-zinc-500 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/40 transition-colors"
              />
            </div>
            {isMusc && (
              <div>
                <label className="mb-1.5 block text-xs font-medium text-zinc-400">
                  Grupo muscular
                </label>
                <input
                  type="text"
                  value={block.muscle_group}
                  onChange={(e) => onUpdateBlock({ muscle_group: e.target.value })}
                  placeholder="ex.: Peito, Costas, Pernas..."
                  maxLength={100}
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-white placeholder-zinc-500 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/40 transition-colors"
                />
              </div>
            )}
          </div>
        )}

        {!isMusc && block.modality !== 'outro' && (
          <div>
            <label className="mb-1.5 block text-xs font-medium text-zinc-400">
              Nome / Descrição <span className="text-zinc-600">(opcional)</span>
            </label>
            <input
              type="text"
              value={block.exercise_name}
              onChange={(e) => onUpdateBlock({ exercise_name: e.target.value })}
              placeholder={
                block.modality === 'corrida'
                  ? 'ex.: Corrida na esteira, Rua...'
                  : block.modality === 'natacao'
                  ? 'ex.: Crawl, Nado peito...'
                  : 'ex.: Bike ergométrica...'
              }
              maxLength={200}
              className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-white placeholder-zinc-500 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/40 transition-colors"
            />
          </div>
        )}

        {isMusc && (
          <div>
            <div className="mb-2 flex items-center justify-between">
              <p className="text-xs font-medium text-zinc-400">
                Séries ({block.sets.length})
              </p>
              <button
                type="button"
                onClick={onAddSet}
                className="flex items-center gap-1 rounded-lg bg-zinc-800 px-2.5 py-1 text-xs font-medium text-zinc-300 hover:bg-zinc-700 hover:text-white transition-colors"
              >
                <Plus className="h-3 w-3" />
                Série
              </button>
            </div>

            {block.sets.length > 0 && (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[520px] border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-zinc-800 text-left text-zinc-500">
                      <th className="pb-2 pr-3 font-medium">#</th>
                      <th className="pb-2 pr-3 font-medium">Aquec.?</th>
                      <th className="pb-2 pr-3 font-medium">Reps</th>
                      <th className="pb-2 pr-3 font-medium">Carga (kg)</th>
                      <th className="pb-2 pr-3 font-medium">RPE</th>
                      <th className="pb-2 pr-3 font-medium">Notas</th>
                      <th className="pb-2 font-medium"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800/50">
                    {block.sets.map((set) => (
                      <tr key={set.localId}>
                        <td className="py-1.5 pr-3">
                          <span className={`inline-flex h-5 w-5 items-center justify-center rounded-full text-xs font-bold ${set.is_warmup ? 'bg-amber-500/20 text-amber-400' : 'bg-zinc-700 text-zinc-300'}`}>
                            {set.set_number}
                          </span>
                        </td>
                        <td className="py-1.5 pr-3">
                          <input
                            type="checkbox"
                            checked={set.is_warmup}
                            onChange={(e) => onUpdateSet(set.localId, { is_warmup: e.target.checked })}
                            className="h-4 w-4 rounded border-zinc-600 accent-amber-400"
                          />
                        </td>
                        <td className="py-1.5 pr-3">
                          <input
                            type="number"
                            value={set.reps}
                            onChange={(e) => onUpdateSet(set.localId, { reps: e.target.value })}
                            placeholder="12"
                            min="0"
                            step="1"
                            className="w-16 rounded border border-zinc-700 bg-zinc-800 px-2 py-1 text-xs text-white outline-none focus:border-emerald-500 transition-colors"
                          />
                        </td>
                        <td className="py-1.5 pr-3">
                          <input
                            type="number"
                            value={set.weight_kg}
                            onChange={(e) => onUpdateSet(set.localId, { weight_kg: e.target.value })}
                            placeholder="80"
                            min="0"
                            step="any"
                            className="w-20 rounded border border-zinc-700 bg-zinc-800 px-2 py-1 text-xs text-white outline-none focus:border-emerald-500 transition-colors"
                          />
                        </td>
                        <td className="py-1.5 pr-3">
                          <input
                            type="number"
                            value={set.rpe}
                            onChange={(e) => onUpdateSet(set.localId, { rpe: e.target.value })}
                            placeholder="8"
                            min="1"
                            max="10"
                            step="any"
                            className="w-16 rounded border border-zinc-700 bg-zinc-800 px-2 py-1 text-xs text-white outline-none focus:border-emerald-500 transition-colors"
                          />
                        </td>
                        <td className="py-1.5 pr-3">
                          <input
                            type="text"
                            value={set.notes}
                            onChange={(e) => onUpdateSet(set.localId, { notes: e.target.value })}
                            placeholder="Observação..."
                            maxLength={200}
                            className="w-32 rounded border border-zinc-700 bg-zinc-800 px-2 py-1 text-xs text-white placeholder-zinc-600 outline-none focus:border-emerald-500 transition-colors"
                          />
                        </td>
                        <td className="py-1.5">
                          <button
                            type="button"
                            onClick={() => onRemoveSet(set.localId)}
                            className="rounded p-1 text-zinc-600 hover:text-red-400 transition-colors"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {!isMusc && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-zinc-400">
                Duração (min)
              </label>
              <input
                type="number"
                value={block.duration_min}
                onChange={(e) => onUpdateBlock({ duration_min: e.target.value })}
                placeholder="45"
                min="0"
                step="any"
                className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-white placeholder-zinc-500 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/40 transition-colors"
              />
            </div>

            {!isNat && (
              <div>
                <label className="mb-1.5 block text-xs font-medium text-zinc-400">
                  Distância (km)
                </label>
                <input
                  type="number"
                  value={block.distance_km}
                  onChange={(e) => onUpdateBlock({ distance_km: e.target.value })}
                  placeholder="5.0"
                  min="0"
                  step="any"
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-white placeholder-zinc-500 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/40 transition-colors"
                />
              </div>
            )}

            {block.modality === 'corrida' && (
              <div>
                <label className="mb-1.5 block text-xs font-medium text-zinc-400">
                  Pace médio (min/km)
                </label>
                <input
                  type="number"
                  value={block.avg_pace_min}
                  onChange={(e) => onUpdateBlock({ avg_pace_min: e.target.value })}
                  placeholder="5.30"
                  min="0"
                  step="any"
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-white placeholder-zinc-500 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/40 transition-colors"
                />
              </div>
            )}

            {(block.modality === 'corrida' || block.modality === 'aerobico') && (
              <div>
                <label className="mb-1.5 block text-xs font-medium text-zinc-400">
                  Velocidade média (km/h)
                </label>
                <input
                  type="number"
                  value={block.avg_speed_kmh}
                  onChange={(e) => onUpdateBlock({ avg_speed_kmh: e.target.value })}
                  placeholder="10.5"
                  min="0"
                  step="any"
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-white placeholder-zinc-500 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/40 transition-colors"
                />
              </div>
            )}

            {isNat && (
              <div>
                <label className="mb-1.5 block text-xs font-medium text-zinc-400">
                  Voltas (laps)
                </label>
                <input
                  type="number"
                  value={block.laps}
                  onChange={(e) => onUpdateBlock({ laps: e.target.value })}
                  placeholder="20"
                  min="0"
                  step="1"
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-white placeholder-zinc-500 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/40 transition-colors"
                />
              </div>
            )}
          </div>
        )}

        <div>
          <label className="mb-1.5 block text-xs font-medium text-zinc-400">
            Notas do bloco <span className="text-zinc-600">(opcional)</span>
          </label>
          <textarea
            value={block.notes}
            onChange={(e) => onUpdateBlock({ notes: e.target.value })}
            placeholder="Observações sobre este exercício ou modalidade..."
            rows={2}
            maxLength={500}
            className="w-full resize-none rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-white placeholder-zinc-500 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/40 transition-colors"
          />
        </div>
      </div>
    </div>
  );
}