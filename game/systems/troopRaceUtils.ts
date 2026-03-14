/**
 * 部队种族构成工具
 * 从 App.tsx 迁出
 */
import type { Troop, TroopRace } from '../../types';
import { IMPOSTER_TROOP_IDS } from '../data';
import { getTroopRace, TROOP_RACE_LABELS } from '../data';

export function buildRaceComposition(troops: Troop[]): string {
  const counts: Partial<Record<TroopRace, number>> = {};
  let total = 0;
  troops.forEach(troop => {
    const count = troop.count ?? 0;
    total += count;
    const race = getTroopRace(troop, IMPOSTER_TROOP_IDS);
    counts[race] = (counts[race] ?? 0) + count;
  });
  if (total <= 0) return '无';
  return Object.entries(counts)
    .sort((a, b) => Number(b[1]) - Number(a[1]))
    .map(([race, count]) => {
      const ratio = Math.round((Number(count) / total) * 100);
      const label = TROOP_RACE_LABELS[race as TroopRace] ?? race;
      return `${label}${count}(${ratio}%)`;
    })
    .join('，');
}
