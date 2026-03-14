/**
 * 宗教相关工具
 * 从 App.tsx 迁出
 */
import type { Hero, Location } from '../../types';

export type PlayerReligion = {
  religionName: string;
  troopIds: string[];
};

export function getPlayerReligion(locations: Location[]): PlayerReligion | null {
  const altars = (locations ?? []).filter(l => l && l.type === 'ALTAR' && l.altar?.doctrine?.religionName);
  if (altars.length === 0) return null;
  const picked = altars.find(l => (l.altar?.troopIds ?? []).length > 0) ?? altars[0];
  const doctrine = picked.altar?.doctrine;
  if (!doctrine?.religionName) return null;
  return {
    religionName: doctrine.religionName,
    troopIds: picked.altar?.troopIds ?? []
  };
}
