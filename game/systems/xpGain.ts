export type XpGainResult = {
  xp: number;
  level: number;
  attributePoints: number;
  maxXp: number;
  logs: string[];
};

export function calculateXpGain(
  currentXp: number,
  currentLevel: number,
  currentPoints: number,
  currentMaxXp: number,
  amount: number
): XpGainResult {
  let xp = currentXp + amount;
  let level = currentLevel;
  let points = currentPoints;
  let maxXp = currentMaxXp;
  const logs: string[] = [];

  while (xp >= maxXp) {
    xp -= maxXp;
    level++;
    points += 2;
    maxXp = Math.floor(maxXp * 1.5);
    logs.push(`升级了！当前等级：${level}，获得属性点！`);
  }
  return { xp, level, attributePoints: points, maxXp, logs };
}
