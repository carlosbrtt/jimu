import Link from 'next/link';
import { Dumbbell, TrendingUp, Brain, Shield, UserPlus, LogIn } from 'lucide-react';

const FEATURES = [
  {
    icon: Dumbbell,
    title: 'Sessões Multimodais',
    description:
      'Registre musculação, corrida, natação e cardio numa única sessão com blocos flexíveis e ordenáveis.',
  },
  {
    icon: TrendingUp,
    title: 'Evolução Real',
    description:
      'Gráficos interativos de 1RM estimado, pace, volume semanal e progressão de carga ao longo do tempo.',
  },
  {
    icon: Brain,
    title: 'Análise por IA',
    description:
      'Gemini analisa seus treinos e entrega pontos fortes, alertas de estagnação e recomendações personalizadas.',
  },
  {
    icon: Shield,
    title: 'Seus Dados, Só Seus',
    description:
      'Isolamento total por Row Level Security no PostgreSQL. Nenhum dado seu é acessível por outros usuários.',
  },
];

export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col bg-zinc-950">
      {/* Header público */}
      <header className="border-b border-zinc-800 px-4 py-4">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <div className="flex items-center gap-2 font-bold text-white">
            <Dumbbell className="h-6 w-6 text-emerald-400" />
            <span>
              Jimu <span className="text-emerald-400 text-sm font-normal">ジム</span>
            </span>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="cursor-pointer rounded-lg border border-zinc-700 px-4 py-2 text-sm font-semibold text-zinc-200 hover:bg-zinc-800 transition-colors"
            >
              Entrar
            </Link>
            <Link
              href="/cadastro"
              className="cursor-pointer rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-400 transition-colors shadow-lg shadow-emerald-500/20"
            >
              Cadastrar
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="flex flex-1 flex-col items-center justify-center px-4 py-24 text-center">
        <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-4 py-1.5 text-sm text-emerald-400">
          <Brain className="h-3.5 w-3.5" />
          Powered by Gemini AI
        </div>
        <h1 className="mb-6 max-w-3xl text-5xl font-extrabold leading-tight tracking-tight text-white sm:text-6xl">
          Sua evolução{' '}
          <span className="bg-gradient-to-r from-emerald-400 to-teal-400 bg-clip-text text-transparent">
            em dados reais
          </span>
        </h1>
        <p className="mb-10 max-w-xl text-lg text-zinc-400">
          Centralize seu histórico de treinos, acompanhe sua progressão com
          gráficos e receba análises personalizadas geradas por IA — tudo em
          um único lugar.
        </p>
        <div className="flex flex-col gap-3 sm:flex-row">
          <Link
            href="/cadastro"
            className="flex cursor-pointer items-center justify-center gap-2 rounded-xl bg-emerald-500 px-8 py-3.5 text-base font-semibold text-white shadow-lg shadow-emerald-500/20 hover:bg-emerald-400 transition-all"
          >
            <UserPlus className="h-5 w-5" />
            Criar Conta Gratuita
          </Link>
          <Link
            href="/login"
            className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-zinc-700 px-8 py-3.5 text-base font-semibold text-zinc-300 hover:bg-zinc-800 transition-colors"
          >
            <LogIn className="h-5 w-5" />
            Já tenho conta
          </Link>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="border-t border-zinc-800 px-4 py-20">
        <div className="mx-auto max-w-7xl">
          <h2 className="mb-12 text-center text-3xl font-bold text-white">
            Tudo que você precisa para evoluir
          </h2>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {FEATURES.map(({ icon: Icon, title, description }) => (
              <div
                key={title}
                className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6 hover:border-emerald-500/30 transition-colors"
              >
                <div className="mb-4 inline-flex rounded-xl bg-emerald-500/10 p-3">
                  <Icon className="h-6 w-6 text-emerald-400" />
                </div>
                <h3 className="mb-2 font-semibold text-white">{title}</h3>
                <p className="text-sm text-zinc-400">{description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <footer className="border-t border-zinc-800 py-8 text-center text-sm text-zinc-500">
        <p>Jimu ジム · Feito com 💪 e Next.js</p>
      </footer>
    </main>
  );
}