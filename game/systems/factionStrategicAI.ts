import type { FactionId, FactionStrategicDirective, FactionStrategicMode, Location, WorldDiplomacyState } from '../../types';
import { FACTIONS } from '../data';
import { getFactionLocations, getGarrisonCount } from './garrisonHelpers';
import { getWorldFactionRelation } from './diplomacy';

function troopStrength(loc: Location): number {
  const g = loc.garrison ?? [];
  if (g.length > 0) return getGarrisonCount(g);
  return loc.type === 'CITY' ? 150 : loc.type === 'CASTLE' ? 120 : 55;
}

function avgCoord(locs: Location[]): { x: number; y: number } {
  if (locs.length === 0) return { x: 0, y: 0 };
  let sx = 0;
  let sy = 0;
  for (const l of locs) {
    sx += l.coordinates.x;
    sy += l.coordinates.y;
  }
  return { x: sx / locs.length, y: sy / locs.length };
}

/**
 * 每日刷新各势力战略指令；带 stableUntilDay 惯性，紧急围城时无视惯性。
 */
export function advanceFactionStrategicDirectives(
  state: WorldDiplomacyState,
  locations: Location[],
  day: number
): WorldDiplomacyState {
  const prev = { ...(state.factionStrategies ?? {}) } as Partial<Record<FactionId, FactionStrategicDirective>>;
  const nextStrat: Partial<Record<FactionId, FactionStrategicDirective>> = { ...prev };

  for (const faction of FACTIONS) {
    const myLocs = getFactionLocations(faction.id, locations).filter(l => l.owner !== 'ENEMY');
    if (myLocs.length === 0) {
      delete (nextStrat as any)[faction.id];
      continue;
    }

    const existing = nextStrat[faction.id];
    const focalOk =
      existing &&
      locations.some(
        l =>
          l.id === existing.focalLocationId &&
          !(l.type === 'FIELD_CAMP' || l.type === 'BANDIT_CAMP')
      );

    const threatened = myLocs.filter(l => !!l.activeSiege).sort((a, b) => troopStrength(a) - troopStrength(b))[0];

    const allowRefresh = !existing || day >= existing.stableUntilDay || !focalOk || !!threatened;

    if (!allowRefresh && focalOk) continue;

    if (threatened) {
      nextStrat[faction.id] = {
        mode: 'DEFEND_HOME',
        focalLocationId: threatened.id,
        setDay: day,
        stableUntilDay: day + 3
      };
      continue;
    }

    let worstId: FactionId | null = null;
    let worstRel = 0;
    for (const other of FACTIONS) {
      if (other.id === faction.id) continue;
      const r = getWorldFactionRelation(state, faction.id, other.id);
      if (r < worstRel) {
        worstRel = r;
        worstId = other.id;
      }
    }

    const WARLIKE = -32;

    if (worstId && worstRel <= WARLIKE) {
      const enemyHeld = locations.filter(
        l =>
          (l.type === 'CITY' || l.type === 'CASTLE' || l.type === 'VILLAGE') &&
          l.factionId === worstId &&
          l.owner !== 'PLAYER'
      );
      if (enemyHeld.length > 0) {
        const origin = avgCoord(myLocs);
        const ranked = enemyHeld
          .map(loc => ({
            loc,
            d: Math.hypot(loc.coordinates.x - origin.x, loc.coordinates.y - origin.y)
          }))
          .sort((a, b) => a.d - b.d);
        const focal = ranked[0]?.loc ?? enemyHeld[0];
        nextStrat[faction.id] = {
          mode: 'PRESS_ENEMY',
          focalLocationId: focal.id,
          setDay: day,
          stableUntilDay: day + 5 + (day % 5),
          rivalFactionId: worstId
        };
        continue;
      }
    }

    const sorted = [...myLocs].sort((a, b) => troopStrength(b) - troopStrength(a));
    const capital = sorted.find(l => l.type === 'CITY') ?? sorted.find(l => l.type === 'CASTLE') ?? sorted[0];
    if (capital) {
      const mode: FactionStrategicMode = 'HOLD';
      nextStrat[faction.id] = {
        mode,
        focalLocationId: capital.id,
        setDay: day,
        stableUntilDay: day + 7 + (day % 4)
      };
    }
  }

  return { ...state, factionStrategies: nextStrat };
}
