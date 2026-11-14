'use client';

import { useState, useTransition } from 'react';
import { Trash2, AlertTriangle, Loader2 } from 'lucide-react';
import { deleteWorkoutAction } from './actions';

export default function DeleteWorkoutButton({ workoutId }: { workoutId: string }) {
  const [step, setStep] = useState<'idle' | 'confirm'>('idle');
  const [isPending, startTransition] = useTransition();

  function handleDelete() {
    const fd = new FormData();
    fd.set('workoutId', workoutId);
    startTransition(() => deleteWorkoutAction(fd));
  }

  if (step === 'confirm') {
    return (
      <div className="flex items-center gap-2 rounded-xl border border-red-500/30 bg-red-500/5 p-3">
        <AlertTriangle className="h-4 w-4 shrink-0 text-red-400" />
        <span className="text-xs text-red-300">Excluir permanentemente?</span>
        <button
          onClick={handleDelete}
          disabled={isPending}
          className="ml-auto flex items-center gap-1 rounded-lg bg-red-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-400 disabled:opacity-60 transition-colors"
        >
          {isPending && <Loader2 className="h-3 w-3 animate-spin" />}
          Sim, excluir
        </button>
        <button
          onClick={() => setStep('idle')}
          disabled={isPending}
          className="rounded-lg border border-zinc-700 px-3 py-1.5 text-xs text-zinc-400 hover:text-white transition-colors"
        >
          Cancelar
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={() => setStep('confirm')}
      className="inline-flex items-center gap-2 rounded-xl border border-zinc-700 px-4 py-2.5 text-sm font-medium text-red-400 hover:border-red-500/40 hover:bg-red-500/5 transition-colors"
    >
      <Trash2 className="h-4 w-4" />
      Excluir Treino
    </button>
  );
}