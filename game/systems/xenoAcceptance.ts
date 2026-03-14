export function getXenoAcceptanceScore(temperament: string, traits: string[]): number {
  const temperamentScores: Record<string, number> = {
    强硬: -18,
    稳重: 6,
    多疑: -26,
    豪爽: 18,
    谨慎: 0,
    冷峻: -22,
    宽厚: 24,
    冷静: 4
  };
  const traitScores: Record<string, number> = {
    好战: -16,
    务实: -2,
    忠诚: 0,
    谨慎: -6,
    野心: -10,
    仁慈: 18,
    狡黠: -6,
    守旧: -20,
    热情: 12,
    冷静: 0
  };
  const base = temperamentScores[temperament] ?? 0;
  const traitSum = (traits || []).reduce((sum, trait) => sum + (traitScores[trait] ?? 0), 0);
  return Math.max(-40, Math.min(30, base + traitSum));
}
