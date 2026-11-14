// ============================================================
// Jimu (ジム) — Camada 2: Inteligência Contextual (Gemini + Gemma)
// ============================================================

import { GoogleGenAI } from '@google/genai';
import { z } from 'zod';
import type { CalculatedMetrics } from '../analytics/metrics';

export const AiAnalysisResultSchema = z.object({
  summary: z.string().describe('Resumo geral da performance em 2 a 3 frases motivadoras e analíticas.'),
  strengths: z
    .array(z.string())
    .min(1)
    .max(5)
    .describe('Pontos fortes comprovados pelos dados (progressão de carga, consistência, etc).'),
  attention_points: z
    .array(z.string())
    .min(1)
    .max(5)
    .describe('Alertas de atenção (estagnação em exercícios específicos, risco de overtraining, desequilíbrio muscular).'),
  recommendations: z
    .array(z.string())
    .min(1)
    .max(5)
    .describe('Recomendações acionáveis para a próxima semana baseadas na divisão e objetivo do atleta.'),
});

export type AiAnalysisResult = z.infer<typeof AiAnalysisResultSchema> & {
  model_used: string;
};

const SYSTEM_INSTRUCTION = `
Você é o treinador principal e fisiologista esportivo do Jimu (ジム), uma plataforma de alta performance atlética.
Seu objetivo é analisar as métricas determinísticas calculadas de um atleta e fornecer uma análise crítica, precisa e personalizada.

DIRETRIZES:
1. NUNCA dê conselhos genéricos. Use SEMPRE os nomes reais dos exercícios, cargas em kg, grupos musculares e métricas fornecidas.
2. Se houver exercícios estagnados informados nas métricas, cite-os nominalmente e sugira técnicas práticas (ex.: deload estratégico, variação de faixa de repetições, aumento de densidade ou tempo sob tensão).
3. Considere o objetivo principal do atleta (Hipertrofia, Força, Emagrecimento, etc.) e sua metodologia de treino.
4. Mantenha um tom técnico, encorajador, porém direto ao ponto.
5. Retorne ESTRITAMENTE o formato JSON solicitado.
`;

export async function generateAthleticAnalysis(
  metrics: CalculatedMetrics
): Promise<AiAnalysisResult> {
  const apiKey = process.env.GOOGLE_AI_API_KEY;
  if (!apiKey) {
    throw new Error('GOOGLE_AI_API_KEY não configurada no .env.local');
  }

  const ai = new GoogleGenAI({ apiKey });

  const prompt = `
Analise os dados reais do atleta abaixo:

[PERFIL DO ATLETA]
- Nome: ${metrics.userContext.name}
- Objetivo: ${metrics.userContext.mainGoal}
- Divisão de Treino: ${metrics.userContext.division}
- Frequência Alvo: ${metrics.userContext.targetWeeklyFrequency}x por semana
- Peso Corporal: ${metrics.userContext.bodyWeightKg ? `${metrics.userContext.bodyWeightKg}kg` : 'Não informado'}

[MÉTRICAS DETERMINÍSTICAS (ÚLTIMOS 30 DIAS)]
- Total de sessões realizadas: ${metrics.totalWorkouts}
- Aderência à frequência alvo na última semana: ${metrics.weeklyAdherenceRate}%
- Variação de volume total vs semana anterior: ${
    metrics.volumeChangePercentVsPrevWeek !== null
      ? `${metrics.volumeChangePercentVsPrevWeek}%`
      : 'Dados insuficientes'
  }
- Volume por grupo muscular: ${JSON.stringify(metrics.volumeByMuscleGroup)}
- Exercícios com estagnação detectada (>= 2 semanas sem subir carga): ${JSON.stringify(
    metrics.stagnantExercises
  )}
- Métricas aeróbicas / cardio: ${JSON.stringify(metrics.cardio)}

Retorne um JSON com a seguinte estrutura:
{
  "summary": "Resumo executivo de 2-3 frases",
  "strengths": ["ponto forte 1 com dados", "ponto forte 2"],
  "attention_points": ["ponto de atenção 1 com dados", "ponto 2"],
  "recommendations": ["recomendação acionável 1", "recomendação 2"]
}
`;

  const PRIMARY_MODEL = 'gemini-3.5-flash-lite';
  const FALLBACK_MODEL = 'gemma-4-31b-it';

  // Tentativa 1: Modelo Primário
  try {
    const response = await ai.models.generateContent({
      model: PRIMARY_MODEL,
      contents: prompt,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        responseMimeType: 'application/json',
      },
    });

    const text = response.text || '{}';
    const parsedJson = JSON.parse(text);
    const validated = AiAnalysisResultSchema.parse(parsedJson);

    return {
      ...validated,
      model_used: PRIMARY_MODEL,
    };
  } catch (primaryError) {
    console.warn(`[Jimu AI] Falha no modelo primário (${PRIMARY_MODEL}). Ativando fallback para ${FALLBACK_MODEL}...`, primaryError);

    // Tentativa 2: Fallback Automático para Gemma
    try {
      const fallbackResponse = await ai.models.generateContent({
        model: FALLBACK_MODEL,
        contents: `${prompt}\nIMPORTANTE: responda apenas com JSON puro válido.`,
        config: {
          systemInstruction: SYSTEM_INSTRUCTION,
        },
      });

      const fallbackText = fallbackResponse.text || '{}';
      const cleanedJson = fallbackText.replace(/```json/g, '').replace(/```/g, '').trim();
      const parsedJson = JSON.parse(cleanedJson);
      const validated = AiAnalysisResultSchema.parse(parsedJson);

      return {
        ...validated,
        model_used: FALLBACK_MODEL,
      };
    } catch (fallbackError) {
      console.error(`[Jimu AI] Falha crítica em ambos os modelos:`, fallbackError);
      throw new Error('Falha ao processar análise por IA em ambos os modelos.');
    }
  }
}