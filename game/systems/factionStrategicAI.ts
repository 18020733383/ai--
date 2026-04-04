import type {
  FactionId,
  FactionStrategicDirective,
  FactionStrategyShiftCode,
  Location,
  WorldDiplomacyState
} from '../../types';
import { FACTIONS } from '../data';
import { getFactionLocations, getGarrisonCount } from './garrisonHelpers';
import { getWorldFactionRelation } from './diplomacy';
import { pickStrategyRumorLine } from './factionStrategyCopy';

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

function strategicIntentFingerprint(d: FactionStrategicDirective | undefined): string {
  if (!d) return '';
  return `${d.mode}|${d.focalLocationId}|${d.rivalFactionId ?? ''}`;
}

export type AdvanceFactionStrategiesResult = {
  state: WorldDiplomacyState;
  rumorLines: string[];
};

/**
 * 每日刷新各势力战略指令；带 stableUntilDay 惯性，紧急围城时无视惯性。
 * 仅当模式/焦点/敌向意向变化时刷新 lastShift 与流言；同日仅续期惯性时保留叙事字段。
 */
export function advanceFactionStrategicDirectives(
  state: WorldDiplomacyState,
  locations: Location[],
  day: number,
  opts?: { enableRumors?: boolean; rumorRoll?: () => number }
): AdvanceFactionStrategiesResult {
  const rumorLines: string[] = [];
  const rumorsOn = opts?.enableRumors !== false;
  const roll = opts?.rumorRoll ?? (() => Math.random());

  const prevAll = { ...(state.factionStrategies ?? {}) } as Partial<Record<FactionId, FactionStrategicDirective>>;
  const nextStrat: Partial<Record<FactionId, FactionStrategicDirective>> = { ...prevAll };

  for (const faction of FACTIONS) {
    const myLocs = getFactionLocations(faction.id, locations).filter(l => l.owner !== 'ENEMY');
    if (myLocs.length === 0) {
      delete (nextStrat as any)[faction.id];
      continue;
    }

    const prevDirective = prevAll[faction.id];
    const existing = prevDirective;
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

    let nextBase: FactionStrategicDirective;

    if (threatened) {
      nextBase = {
        mode: 'DEFEND_HOME',
        focalLocationId: threatened.id,
        setDay: day,
        stableUntilDay: day + 3
      };
    } else {
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

      const WARLIKE = -22;

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
          nextBase = {
            mode: 'PRESS_ENEMY',
            focalLocationId: focal.id,
            setDay: day,
            stableUntilDay: day + 5 + (day % 5),
            rivalFactionId: worstId
          };
        } else {
          const sorted = [...myLocs].sort((a, b) => troopStrength(b) - troopStrength(a));
          const capital = sorted.find(l => l.type === 'CITY') ?? sorted.find(l => l.type === 'CASTLE') ?? sorted[0];
          nextBase = {
            mode: 'HOLD',
            focalLocationId: capital.id,
            setDay: day,
            stableUntilDay: day + 7 + (day % 4)
          };
        }
      } else {
        const sorted = [...myLocs].sort((a, b) => troopStrength(b) - troopStrength(a));
        const capital = sorted.find(l => l.type === 'CITY') ?? sorted.find(l => l.type === 'CASTLE') ?? sorted[0];
        nextBase = {
          mode: 'HOLD',
          focalLocationId: capital.id,
          setDay: day,
          stableUntilDay: day + 7 + (day % 4)
        };
      }
    }

    const sameIntent = strategicIntentFingerprint(prevDirective) === strategicIntentFingerprint(nextBase);
    if (sameIntent && prevDirective) {
      nextStrat[faction.id] = {
        ...prevDirective,
        setDay: nextBase.setDay,
        stableUntilDay: nextBase.stableUntilDay
      };
      continue;
    }

    let code: FactionStrategyShiftCode = 'HOLD_RECENTER';
    if (threatened) code = 'SIEGE_HOME';
    else if (nextBase.mode === 'PRESS_ENEMY') code = 'PRESS_WAR';
    else if (!prevDirective) code = 'HOLD_RECENTER';
    else if (!focalOk) code = 'FOCAL_INVALID';
    else if (existing && day >= existing.stableUntilDay) code = 'INERTIA_EXPIRED';
    else code = 'HOLD_RECENTER';

    const focalName = locations.find(l => l.id === nextBase.focalLocationId)?.name ?? nextBase.focalLocationId;
    const rivalShort =
      nextBase.rivalFactionId != null
        ? (FACTIONS.find(f => f.id === nextBase.rivalFactionId)?.shortName ?? nextBase.rivalFactionId)
        : null;

    nextStrat[faction.id] = { ...nextBase, lastShift: { day, code } };

    if (rumorsOn && roll() < 0.34) {
      rumorLines.push(pickStrategyRumorLine(faction.shortName, code, focalName, rivalShort));
    }
  }

  return { state: { ...state, factionStrategies: nextStrat }, rumorLines };
}