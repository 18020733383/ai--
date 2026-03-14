import type { Location, Troop } from '../../types';
import { isCastleLikeLocation } from './worldInit';
import { getLocationGarrison } from './garrisonPresets';

export type GetTroopTemplate = (id: string) => Partial<Troop> & { id: string; name: string } | undefined;

export function buildGarrisonTroops(
  location: Location,
  getTroopTemplate: GetTroopTemplate
): Troop[] {
  return getLocationGarrison(location)
    .map(unit => {
      const troop = getTroopTemplate(unit.troopId);
      return troop ? { ...troop, count: unit.count, xp: 0 } : null;
    })
    .filter(Boolean) as Troop[];
}

export function getDefenderTroops(
  location: Location,
  getTroopTemplate: GetTroopTemplate
): Troop[] {
  const baseGarrison = (location.garrison ?? []).length > 0
    ? (location.garrison ?? []).map(t => ({ ...t }))
    : buildGarrisonTroops(location, getTroopTemplate);
  const stayParties = location.stayParties ?? [];
  const stationedArmies = location.stationedArmies ?? [];
  const stayTroops = stayParties.flatMap(party => party.troops.map(t => ({ ...t })));
  const stationedTroops = stationedArmies.flatMap(army => army.troops.map(t => ({ ...t })));
  return [...baseGarrison, ...stayTroops, ...stationedTroops];
}

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
