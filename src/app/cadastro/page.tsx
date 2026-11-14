'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Dumbbell, Loader2, Eye, EyeOff, UserPlus } from 'lucide-react';
import { createClient } from '@/utils/supabase/client';

export default function CadastroPage() {
  const router = useRouter();
  const supabase = createClient();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function handleSignUp(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!name.trim()) {
      setError('Por favor, informe seu nome completo.');
      return;
    }

    if (!email.trim() || !email.includes('@')) {
      setError('Por favor, insira um e-mail válido.');
      return;
    }

    if (!password || password.length < 6) {
      setError('A senha deve ter no mínimo 6 caracteres.');
      return;
    }

    setLoading(true);

    try {
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: {
            full_name: name.trim(),
          },
        },
      });

      if (signUpError) throw signUpError;

      if (data.session) {
        router.push('/dashboard');
        router.refresh();
        return;
      }

      setSuccess('Conta criada com sucesso! Verifique seu e-mail para confirmar o cadastro antes de entrar.');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao cadastrar';
      if (msg.includes('User already registered') || msg.includes('already registered')) {
        setError('Este e-mail já está cadastrado. Faça login na sua conta existente.');
      } else if (msg.includes('Password should be at least')) {
        setError('A senha deve ter pelo menos 6 caracteres.');
      } else {
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-zinc-950 px-4 py-16">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center gap-2">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500/10 ring-1 ring-emerald-500/30">
            <Dumbbell className="h-7 w-7 text-emerald-400" />
          </div>
          <h1 className="text-2xl font-bold text-white">
            Jimu <span className="text-emerald-400 font-normal text-lg">ジム</span>
          </h1>
          <p className="text-sm text-zinc-400">
            Crie sua conta gratuitamente
          </p>
        </div>

        <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-8 shadow-xl">
          <form onSubmit={handleSignUp} noValidate className="flex flex-col gap-4">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-zinc-400">
                Nome completo <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="ex.: Carlos Silva"
                className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2.5 text-sm text-white placeholder-zinc-500 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/40 transition-colors"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-medium text-zinc-400">
                E-mail <span className="text-red-400">*</span>
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
                Senha <span className="text-red-400">*</span>
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Mínimo 6 caracteres"
                  autoComplete="new-password"
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
            {success && (
              <div className="rounded-lg bg-emerald-500/10 border border-emerald-500/30 px-3 py-2.5 text-sm text-emerald-400">
                {success}
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
                  Criando conta...
                </>
              ) : (
                <>
                  <UserPlus className="h-4 w-4" />
                  Criar Conta
                </>
              )}
            </button>
          </form>

          <div className="mt-6 border-t border-zinc-800 pt-5 text-center">
            <p className="text-sm text-zinc-400">
              Já tem uma conta?{' '}
              <Link
                href="/login"
                className="font-medium text-emerald-400 hover:text-emerald-300 hover:underline"
              >
                Fazer login
              </Link>
            </p>
          </div>
        </div>

        <p className="mt-6 text-center text-xs text-zinc-500">
          Seus dados são protegidos por Row Level Security no PostgreSQL.
        </p>
      </div>
    </main>
  );
}