import type { Troop } from '../../types';

export function applyGarrisonTraining(
  troops: Troop[],
  xpGain: number,
  getTroopTemplate: (id: string) => Omit<Troop, 'count' | 'xp'> | undefined
): Troop[] {
  const updated = troops.map((t) => ({
    ...t,
    xp: t.xp + (t.id.startsWith('roach_') ? 0 : xpGain)
  }));
  for (let i = 0; i < updated.length; i++) {
    let troop = updated[i];
    while (troop.upgradeTargetId && troop.xp >= troop.maxXp && troop.count > 0) {
      troop = { ...troop, xp: troop.xp - troop.maxXp, count: troop.count - 1 };
      const targetTemplate = getTroopTemplate(troop.upgradeTargetId);
      if (!targetTemplate) break;
      const targetIndex = updated.findIndex((t) => t.id === targetTemplate.id);
      if (targetIndex >= 0) {
        updated[targetIndex] = { ...updated[targetIndex], count: updated[targetIndex].count + 1 };
      } else {
        updated.push({ ...targetTemplate, count: 1, xp: 0 });
      }
    }
    updated[i] = troop;
  }
  return updated.filter((t) => t.count > 0);
}
