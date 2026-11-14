'use client';

import { useState, useEffect } from 'react';
import {
  Brain, Sparkles, CheckCircle2, AlertTriangle,
  Lightbulb, RefreshCw, Loader2, Bot
} from 'lucide-react';

interface AnalysisData {
  summary: string;
  strengths: string[];
  attention_points: string[];
  recommendations: string[];
  model_used: string;
  created_at: string;
}

export default function AiAnalysisCard({ initialAnalysis }: { initialAnalysis?: AnalysisData | null }) {
  const [analysis, setAnalysis] = useState<AnalysisData | null>(initialAnalysis ?? null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!initialAnalysis) {
      fetch('/api/analyze')
        .then((res) => res.json())
        .then((data) => {
          if (data?.analysis) setAnalysis(data.analysis);
        })
        .catch(() => {});
    }
  }, [initialAnalysis]);

  async function handleGenerateAnalysis(force = false) {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ force }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Erro ao gerar análise por IA.');
      }

      setAnalysis(data.analysis);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erro ao conectar com a IA.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-3xl border border-emerald-500/20 bg-gradient-to-b from-emerald-950/20 via-zinc-900 to-zinc-900 p-6 sm:p-8 shadow-2xl relative overflow-hidden">
      <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />

      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-zinc-800/80 pb-5 mb-6">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
            <Brain className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-bold text-white tracking-tight">Análise Semanal por Inteligência Artificial</h3>
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[11px] font-semibold text-emerald-400 border border-emerald-500/20">
                <Sparkles className="h-3 w-3" />
                Gemini 3.5 & Gemma
              </span>
            </div>
            <p className="text-xs text-zinc-400 mt-0.5">
              Diagnóstico fisiológico cruzando suas cargas, volume e objetivos
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => handleGenerateAnalysis(!!analysis)}
          disabled={loading}
          className="flex cursor-pointer items-center gap-2 rounded-xl bg-emerald-500 px-4 py-2 text-xs font-semibold text-white shadow-lg shadow-emerald-500/20 hover:bg-emerald-400 active:scale-[0.99] disabled:opacity-60 disabled:cursor-not-allowed transition-all"
        >
          {loading ? (
            <>
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Processando Métricas...
            </>
          ) : analysis ? (
            <>
              <RefreshCw className="h-3.5 w-3.5" />
              Recalcular Análise
            </>
          ) : (
            <>
              <Sparkles className="h-3.5 w-3.5" />
              Gerar Análise por IA
            </>
          )}
        </button>
      </div>

      {error && (
        <div className="mb-6 rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-xs text-red-400">
          {error}
        </div>
      )}

      {!analysis && !loading && !error && (
        <div className="py-10 text-center flex flex-col items-center justify-center">
          <Bot className="h-12 w-12 text-zinc-600 mb-3" />
          <h4 className="text-sm font-semibold text-zinc-200">Sua análise semanal está pronta para ser calculada</h4>
          <p className="text-xs text-zinc-500 max-w-md mt-1 mb-5">
            O motor do Jimu calculará sua progressão de cargas, grupos musculares trabalhados e eventuais estagnações para gerar orientações personalizadas.
          </p>
          <button
            type="button"
            onClick={() => handleGenerateAnalysis(false)}
            className="flex cursor-pointer items-center gap-2 rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-5 py-2.5 text-xs font-semibold text-emerald-400 hover:bg-emerald-500 hover:text-white transition-all shadow-md"
          >
            <Sparkles className="h-4 w-4" />
            Executar Diagnóstico Agora
          </button>
        </div>
      )}

      {loading && (
        <div className="py-16 text-center flex flex-col items-center justify-center space-y-3">
          <Loader2 className="h-8 w-8 animate-spin text-emerald-400" />
          <p className="text-sm font-medium text-zinc-200">Executando Camadas 1 & 2...</p>
          <p className="text-xs text-zinc-500 max-w-sm">
            Processando cálculos determinísticos de 1RM e consultando o modelo de linguagem estruturado.
          </p>
        </div>
      )}

      {analysis && !loading && (
        <div className="space-y-6">
          {analysis.summary && (
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900/80 p-4 text-sm text-zinc-300 leading-relaxed italic border-l-4 border-l-emerald-500">
              "{analysis.summary}"
            </div>
          )}

          <div className="grid gap-4 md:grid-cols-3">
            {/* Pontos Fortes */}
            <div className="rounded-2xl border border-emerald-500/20 bg-emerald-950/10 p-5 space-y-3">
              <h4 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-emerald-400">
                <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
                Pontos Fortes
              </h4>
              <ul className="space-y-2 text-xs text-zinc-300">
                {analysis.strengths.map((item, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span className="text-emerald-500 mt-0.5">•</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Pontos de Atenção */}
            <div className="rounded-2xl border border-amber-500/20 bg-amber-950/10 p-5 space-y-3">
              <h4 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-amber-400">
                <AlertTriangle className="h-4 w-4 shrink-0 text-amber-400" />
                Pontos de Atenção
              </h4>
              <ul className="space-y-2 text-xs text-zinc-300">
                {analysis.attention_points.map((item, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span className="text-amber-500 mt-0.5">•</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Recomendações */}
            <div className="rounded-2xl border border-cyan-500/20 bg-cyan-950/10 p-5 space-y-3">
              <h4 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-cyan-400">
                <Lightbulb className="h-4 w-4 shrink-0 text-cyan-400" />
                Próxima Semana
              </h4>
              <ul className="space-y-2 text-xs text-zinc-300">
                {analysis.recommendations.map((item, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span className="text-cyan-500 mt-0.5">•</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between text-[11px] text-zinc-500 pt-2 border-t border-zinc-800/60">
            <span>
              Modelo gerador: <code className="text-zinc-400 font-mono bg-zinc-800/50 px-1.5 py-0.5 rounded">{analysis.model_used}</code>
            </span>
            <span>
              Atualizado em:{' '}
              {new Date(analysis.created_at).toLocaleDateString('pt-BR', {
                day: '2-digit',
                month: 'short',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}