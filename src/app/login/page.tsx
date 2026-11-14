'use client';

import { Suspense, useState } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import { Dumbbell, Loader2, Eye, EyeOff, LogIn } from 'lucide-react';
import { createClient } from '@/utils/supabase/client';

function LoginForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const supabase = createClient();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const redirect = searchParams.get('redirect') || '/dashboard';

  async function handleSignIn(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    if (!email.trim() || !email.includes('@')) {
      setError('Por favor, insira um e-mail válido.');
      return;
    }

    if (!password) {
      setError('Por favor, digite sua senha.');
      return;
    }

    setLoading(true);

    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (signInError) throw signInError;

      router.push(redirect);
      router.refresh();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao entrar';
      if (msg.includes('Invalid login credentials')) {
        setError('E-mail ou senha incorretos.');
      } else {
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="w-full max-w-sm">
      <div className="mb-8 flex flex-col items-center gap-2">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500/10 ring-1 ring-emerald-500/30">
          <Dumbbell className="h-7 w-7 text-emerald-400" />
        </div>
        <h1 className="text-2xl font-bold text-white">
          Jimu <span className="text-emerald-400 font-normal text-lg">ジム</span>
        </h1>
        <p className="text-sm text-zinc-400">
          Acesse sua conta para continuar
        </p>
      </div>

      <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-8 shadow-xl">
        <form onSubmit={handleSignIn} noValidate className="flex flex-col gap-4">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-zinc-400">
              E-mail
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="voce@exemplo.com"
              autoComplete="email"
              className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2.5 text-sm text-white placeholder-zinc-500 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/40 transition-colors"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium text-zinc-400">
              Senha
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Sua senha"
                autoComplete="current-password"
                className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2.5 pr-10 text-sm text-white placeholder-zinc-500 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/40 transition-colors"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer text-zinc-500 hover:text-zinc-300 transition-colors"
                tabIndex={-1}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {error && (
            <div className="rounded-lg bg-red-500/10 border border-red-500/30 px-3 py-2.5 text-sm text-red-400">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="mt-2 flex h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-emerald-500 text-sm font-semibold text-white hover:bg-emerald-400 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60 transition-all shadow-lg shadow-emerald-500/20"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Entrando...
              </>
            ) : (
              <>
                <LogIn className="h-4 w-4" />
                Entrar
              </>
            )}
          </button>
        </form>

        <div className="mt-6 border-t border-zinc-800 pt-5 text-center">
          <p className="text-sm text-zinc-400">
            Ainda não tem conta?{' '}
            <Link
              href="/cadastro"
              className="font-medium text-emerald-400 hover:text-emerald-300 hover:underline"
            >
              Criar conta grátis
            </Link>
          </p>
        </div>
      </div>

      <p className="mt-6 text-center text-xs text-zinc-500">
        Seus dados são protegidos por Row Level Security no PostgreSQL.
      </p>
    </div>
  );
}

export default function LoginPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-zinc-950 px-4 py-16">
      <Suspense
        fallback={
          <div className="flex flex-col items-center gap-3 text-zinc-400">
            <Dumbbell className="h-8 w-8 animate-pulse text-emerald-400" />
            <span className="text-sm">Carregando...</span>
          </div>
        }
      >
        <LoginForm />
      </Suspense>
    </main>
  );
}