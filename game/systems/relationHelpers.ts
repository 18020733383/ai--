import type { EnemyForce, Location, PlayerState, RaceId } from '../../types';
import { IMPOSTER_TROOP_IDS } from '../data';
import { INITIAL_PLAYER_STATE } from '../../constants';
import { isCastleLikeLocation, isUndeadFortressLocation } from './worldInit';

export const getLocationRace = (location?: Location | null): RaceId | null => {
  if (!location) return null;
  if (location.type === 'ROACH_NEST') return 'ROACH';
  if (location.type === 'GRAVEYARD' || location.type === 'COFFEE') return 'UNDEAD';
  if (location.type === 'IMPOSTER_PORTAL') return 'IMPOSTER';
  if (location.type === 'BANDIT_CAMP') return location.id.startsWith('goblin_camp_') ? 'GOBLIN' : 'BANDIT';
  if (location.id.startsWith('village_goblin_')) return 'GOBLIN';
  if (location.type === 'MYSTERIOUS_CAVE') return 'VOID';
  if (location.type === 'ASYLUM') return 'MADNESS';
  return null;
};

export const getLocationRelationTarget = (location?: Location | null) => {
  if (!location) return null;
  if (location.factionId) return { type: 'FACTION' as const, id: location.factionId };
  const race = getLocationRace(location);
  return race ? { type: 'RACE' as const, id: race } : null;
};

export const getLocationRecruitId = (location: Location): string => {
  const race = getLocationRace(location);
  if (race === 'GOBLIN') return 'goblin_scavenger';
  if (location.type === 'CITY') return 'militia';
  if (isUndeadFortressLocation(location)) return 'zombie';
  if (isCastleLikeLocation(location)) return 'footman';
  return 'peasant';
};

export const getRelationScale = (relationValue: number) => {
  if (relationValue <= -70) return 1.45;
  if (relationValue <= -55) return 1.3;
  if (relationValue <= -35) return 1.2;
  if (relationValue >= 50) return 0.75;
  if (relationValue >= 30) return 0.85;
  return 1;
};

export const getEncounterChance = (baseChance: number, relationValue: number) => {
  if (relationValue >= 60) return Math.min(baseChance, 0.06);
  if (relationValue >= 40) return Math.min(baseChance, 0.1);
  if (relationValue >= 20) return Math.min(baseChance, 0.14);
  if (relationValue <= -70) return Math.max(baseChance, 0.45);
  if (relationValue <= -50) return Math.max(baseChance, 0.35);
  if (relationValue <= -30) return Math.max(baseChance, 0.28);
  return baseChance;
};

export const getEnemyRace = (enemy?: EnemyForce | null): RaceId | null => {
  if (!enemy) return null;
  const baseId = String(enemy.baseTroopId ?? '').trim();
  if (IMPOSTER_TROOP_IDS.has(baseId)) return 'IMPOSTER';
  if (baseId.startsWith('roach_')) return 'ROACH';
  if (baseId.startsWith('undead_') || baseId.startsWith('skeleton') || baseId.startsWith('zombie') || baseId.startsWith('specter')) return 'UNDEAD';
  if (baseId.startsWith('automaton') || baseId.startsWith('ai_')) return 'AUTOMATON';
  if (baseId.startsWith('void_')) return 'VOID';
  if (baseId.startsWith('mad_') || baseId.includes('patient')) return 'MADNESS';
  if (baseId.startsWith('goblin_')) return 'GOBLIN';
  const name = String(enemy.name ?? '');
  if (name.includes('匪') || name.includes('盗') || name.includes('强盗') || name.includes('劫匪')) return 'BANDIT';
  return null;
};

export const buildSupportTroops = (location: Location, ratio: number) => {
  const garrison = location.garrison ?? [];
  return garrison
    .map(t => ({ ...t, count: Math.max(0, Math.ceil(t.count * ratio)) }))
    .filter(t => t.count > 0);
};

export const getCityReligionTierCap = (faith: number) => {
  const f = Math.max(0, Math.min(100, Math.floor(faith)));
  if (f >= 80) return 4;
  if (f >= 60) return 3;
  if (f >= 40) return 2;
  if (f >= 20) return 1;
  return 0;
};

export const computePreachPlan = (loc: Location, relationValue: number) => {
  const faith = Math.max(0, Math.min(100, Math.floor(loc.religion?.faith ?? 0)));
  const rel = Math.max(-100, Math.min(100, Math.floor(relationValue ?? 0)));
  const costBase = 60 + Math.floor(faith * 0.9);
  const relFactor = rel >= 0 ? (1 - Math.min(0.35, rel * 0.005)) : (1 + Math.min(0.6, Math.abs(rel) * 0.008));
  const hasChapel = (loc.buildings ?? []).includes('CHAPEL');
  const cost = Math.max(20, Math.min(800, Math.floor(costBase * relFactor * (hasChapel ? 0.9 : 1))));
  const gainBase = 6 + Math.round(rel / 30);
  const damp = Math.max(0.15, 1 - faith / 115);
  const gain = Math.max(1, Math.min(14, Math.floor(gainBase * damp) + (hasChapel ? 2 : 0)));
  return { cost, gain, faith };
};

export const normalizeRelationMatrix = (matrix?: PlayerState['relationMatrix']) => ({
  factions: {
    VERDANT_COVENANT: matrix?.factions?.VERDANT_COVENANT ?? INITIAL_PLAYER_STATE.relationMatrix.factions.VERDANT_COVENANT,
    FROST_OATH: matrix?.factions?.FROST_OATH ?? INITIAL_PLAYER_STATE.relationMatrix.factions.FROST_OATH,
    RED_DUNE: matrix?.factions?.RED_DUNE ?? INITIAL_PLAYER_STATE.relationMatrix.factions.RED_DUNE,
    AUREATE_LEAGUE: (matrix as any)?.factions?.AUREATE_LEAGUE ?? (INITIAL_PLAYER_STATE as any).relationMatrix.factions.AUREATE_LEAGUE ?? 0,
    ARCANE_CONCORD: (matrix as any)?.factions?.ARCANE_CONCORD ?? (INITIAL_PLAYER_STATE as any).relationMatrix.factions.ARCANE_CONCORD ?? 0
  },
  races: {
    HUMAN: matrix?.races?.HUMAN ?? INITIAL_PLAYER_STATE.relationMatrix.races.HUMAN,
    ROACH: matrix?.races?.ROACH ?? INITIAL_PLAYER_STATE.relationMatrix.races.ROACH,
    UNDEAD: matrix?.races?.UNDEAD ?? INITIAL_PLAYER_STATE.relationMatrix.races.UNDEAD,
    IMPOSTER: matrix?.races?.IMPOSTER ?? INITIAL_PLAYER_STATE.relationMatrix.races.IMPOSTER,
    BANDIT: matrix?.races?.BANDIT ?? INITIAL_PLAYER_STATE.relationMatrix.races.BANDIT,
    AUTOMATON: matrix?.races?.AUTOMATON ?? INITIAL_PLAYER_STATE.relationMatrix.races.AUTOMATON,
    VOID: matrix?.races?.VOID ?? INITIAL_PLAYER_STATE.relationMatrix.races.VOID,
    MADNESS: matrix?.races?.MADNESS ?? INITIAL_PLAYER_STATE.relationMatrix.races.MADNESS,
    BEAST: (matrix as any)?.races?.BEAST ?? (INITIAL_PLAYER_STATE as any).relationMatrix.races.BEAST ?? -10,
    GOBLIN: (matrix as any)?.races?.GOBLIN ?? (INITIAL_PLAYER_STATE as any).relationMatrix.races.GOBLIN ?? -20
  }
});

export const getRelationTone = (value: number): { label: string; color: string } => {
  if (value >= 60) return { label: '同盟', color: 'text-emerald-400' };
  if (value >= 40) return { label: '友好', color: 'text-emerald-300' };
  if (value >= 20) return { label: '缓和', color: 'text-emerald-200' };
  if (value <= -60) return { label: '死敌', color: 'text-red-400' };
  if (value <= -40) return { label: '敌对', color: 'text-red-300' };
  if (value <= -20) return { label: '紧张', color: 'text-red-200' };
  if (value >= -5 && value <= 5) return { label: '陌生', color: 'text-stone-300' };
  return { label: '中立', color: 'text-stone-300' };
};

export const getRelationValue = (state: PlayerState, targetType: 'FACTION' | 'RACE', targetId: string) => {
  const matrix = normalizeRelationMatrix(state.relationMatrix);
  if (targetType === 'FACTION') {
    return matrix.factions[targetId as keyof typeof matrix.factions] ?? 0;
  }
  return matrix.races[targetId as keyof typeof matrix.races] ?? 0;
};
