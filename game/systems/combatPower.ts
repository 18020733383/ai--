import { Troop } from '../../types';

export function calculatePower(troops: Troop[]): number {
  return troops.reduce((acc, t) => {
    const bonusRatio = (t.enchantments ?? []).reduce((sum, e) => sum + e.powerBonus, 0);
    if (t.id === 'player_main' || t.id.startsWith('hero_')) return acc + t.basePower * (1 + bonusRatio);
    return acc + t.count * t.tier * 10 * (1 + bonusRatio);
  }, 0);
}
