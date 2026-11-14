import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';
import Navbar from '@/components/Navbar';
import WorkoutForm from '../WorkoutForm';
import { createWorkout } from '../actions';
import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';

export const metadata = { title: 'Novo Treino · Jimu' };
export const instant = false;

export default async function NovoTreinoPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const formKey = `novo-treino-${Date.now()}`;

  return (
    <div className="min-h-screen bg-zinc-950">
      <Navbar />
      <main className="mx-auto max-w-3xl px-4 py-10">
        <div className="mb-6 flex items-center gap-3">
          <Link
            href="/treinos"
            className="flex items-center gap-1 text-sm text-zinc-400 hover:text-white transition-colors"
          >
            <ChevronLeft className="h-4 w-4" />
            Meus Treinos
          </Link>
          <span className="text-zinc-700">/</span>
          <span className="text-sm text-zinc-300">Novo Treino</span>
        </div>

        <div className="mb-8">
          <h1 className="text-2xl font-bold text-white">Registrar Treino</h1>
          <p className="mt-1 text-sm text-zinc-400">
            Adicione todos os blocos da sessão de hoje (ou retroativa).
          </p>
        </div>

        <WorkoutForm key={formKey} action={createWorkout} submitLabel="Criar Treino" />
      </main>
    </div>
  );
}