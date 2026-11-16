// ============================================================
// Jimu (ジム) — Padronização e Biblioteca de Exercícios
// ============================================================

// Palavras que devem ficar em minúsculo no Title Case em português
const LOWERCASE_WORDS = new Set(['de', 'da', 'do', 'das', 'dos', 'com', 'e', 'em', 'no', 'na', 'nos', 'nas']);

/**
 * Normaliza e padroniza o nome do exercício em Title Case.
 * Ex: "PUXADA ALTA COM TRIANGULO" -> "Puxada Alta com Triangulo"
 */
export function formatExerciseName(rawName: string): string {
  if (!rawName) return '';

  const clean = rawName.trim().replace(/\s+/g, ' ');
  if (!clean) return '';

  return clean
    .split(' ')
    .map((word, index) => {
      const lower = word.toLowerCase();
      // Primeira palavra sempre com inicial maiúscula; conectivos em minúsculo
      if (index > 0 && LOWERCASE_WORDS.has(lower)) {
        return lower;
      }
      return lower.charAt(0).toUpperCase() + lower.slice(1);
    })
    .join(' ');
}

// Exercícios padrão comuns para sugerir caso o usuário esteja começando
export const DEFAULT_EXERCISES = [
  // Peito
  'Supino Reto com Barra',
  'Supino Inclinado com Halteres',
  'Crucifixo na Máquina',
  'Crossover Polia Média',
  // Costas
  'Puxada Alta',
  'Puxada Triângulo',
  'Remada Baixa',
  'Remada Curvada',
  'Levantamento Terra',
  // Pernas
  'Agachamento Livre',
  'Leg Press 45',
  'Cadeira Extensora',
  'Mesa Flexora',
  'Elevação Pélvica',
  'Panturrilha no Leg Press',
  // Ombros
  'Desenvolvimento com Halteres',
  'Elevação Lateral na Polia',
  'Crucifixo Invertido',
  // Braços
  'Rosca Direta com Barra W',
  'Rosca Martelo com Halteres',
  'Tríceps Corda',
  'Tríceps Testa',
];