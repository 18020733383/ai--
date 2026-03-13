import type { Location, Troop } from '../../types';
import { isCastleLikeLocation } from './worldInit';

export function getGarrisonLimit(location: Location): number {
  const base =
    location.type === 'CITY'
      ? 8000
      : isCastleLikeLocation(location)
        ? 5000
        : location.type === 'ROACH_NEST'
          ? 15000
          : 2000;
  const hasBarracks = (location.buildings ?? []).includes('BARRACKS');
  return hasBarracks ? Math.floor(base * 1.5) : base;
}

export function getGarrisonCount(troops: Troop[]): number {
  return troops.reduce((sum, t) => sum + t.count, 0);
}

export function mergeTroops(base: Troop[], extra: Troop[]): Troop[] {
  const map = new Map<string, Troop>();
  base.forEach((t) => map.set(t.id, { ...t }));
  extra.forEach((t) => {
    if (t.count <= 0) return;
    const current = map.get(t.id);
    if (current) {
      current.count += t.count;
    } else {
      map.set(t.id, { ...t });
    }
  });
  return Array.from(map.values()).filter((t) => t.count > 0);
}

export function splitTroops(
  troops: Troop[],
  ratio: number
): { attackers: Troop[]; remaining: Troop[] } {
  const attackers: Troop[] = [];
  const remaining: Troop[] = [];
  troops.forEach((t) => {
    const splitCount = Math.max(0, Math.floor(t.count * ratio));
    const remainCount = t.count - splitCount;
    if (splitCount > 0) attackers.push({ ...t, count: splitCount });
    if (remainCount > 0) remaining.push({ ...t, count: remainCount });
  });
  return { attackers, remaining };
}

export function getFactionLocations(
  factionId: string,
  pool: Location[]
): Location[] {
  return pool.filter(
    (loc) =>
      loc.factionId === factionId &&
      loc.owner !== 'PLAYER' &&
      (loc.type === 'CITY' || loc.type === 'CASTLE' || loc.type === 'VILLAGE')
  );
}
