import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';
import Navbar from '@/components/Navbar';
import ProfileForm from './ProfileForm';
import type { Profile } from '@/types/index';

export const metadata = { title: 'Meu Perfil · Jimu' };

// Next.js 16: define rota bloqueante sob demanda em runtime
export const instant = false;

export default async function PerfilPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  return (
    <div className="min-h-screen bg-zinc-950">
      <Navbar />
      <main className="mx-auto max-w-2xl px-4 py-10">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-white">Meu Perfil</h1>
          <p className="mt-1 text-sm text-zinc-400">
            Essas informações contextualizam a análise da IA para seu perfil específico.
          </p>
        </div>
        <ProfileForm profile={profile as Profile | null} />
      </main>
    </div>
  );
}