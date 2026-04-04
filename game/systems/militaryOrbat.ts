import type {
  FactionFormalUnitRow,
  FactionId,
  FactionMilitaryHoldingRow,
  FactionMilitaryOverview,
  FactionStrategicDirective,
  Location,
  Lord,
  MilitaryPosture,
  Troop,
  TroopTier
} from '../../types';
import { FACTIONS } from '../data/factions';
import { isUndeadFortressLocation } from './worldInit';
import { getDefenderTroops, getGarrisonCount, mergeTroops, splitTroops } from './garrisonHelpers';
import type { GetTroopTemplate } from './garrisonHelpers';

export const MILITARY_POSTURE_LABELS: Record<MilitaryPosture, string> = {
  DEFEND: '固守',
  RESERVE: '预备队',
  OFFENSE: '主力攻势',
  BUILDUP: '扩编整训',
  REST: '休整'
};

const ECHELON_LABELS = ['战区本部', '野战军', '兵团', '师团', '旅战斗队', '独立营群', '守备集群'];

const tierOf = (t: Troop, getTroopTemplate: GetTroopTemplate): TroopTier => {
  const tmpl = getTroopTemplate(t.id);
  return (tmpl?.tier ?? t.tier ?? 1) as TroopTier;
};

const spreadFromTroops = (troops: Troop[], getTroopTemplate: GetTroopTemplate): { tier: TroopTier; count: number }[] => {
  const map = new Map<number, number>();
  troops.forEach(t => {
    if (!t || t.count <= 0) return;
    const tier = Math.min(5, Math.max(1, tierOf(t, getTroopTemplate))) as number;
    map.set(tier, (map.get(tier) ?? 0) + t.count);
  });
  return [1, 2, 3, 4, 5].map(tier => ({
    tier: tier as TroopTier,
    count: map.get(tier) ?? 0
  }));
};

const mergeSpreads = (a: { tier: TroopTier; count: number }[], b: { tier: TroopTier; count: number }[]) => {
  const map = new Map<number, number>();
  [...a, ...b].forEach(x => map.set(x.tier, (map.get(x.tier) ?? 0) + x.count));
  return [1, 2, 3, 4, 5].map(tier => ({ tier: tier as TroopTier, count: map.get(tier) ?? 0 }));
};

const postureForAnchor = (
  anchorId: string,
  focalId: string | undefined,
  mode: FactionStrategicDirective['mode'] | undefined,
  locType: Location['type']
): MilitaryPosture => {
  const focal = focalId && focalId === anchorId;
  if (focal) {
    if (mode === 'PRESS_ENEMY') return 'OFFENSE';
    if (mode === 'DEFEND_HOME') return 'DEFEND';
    return 'RESERVE';
  }
  if (locType === 'CASTLE') return 'DEFEND';
  if (locType === 'CITY') return 'RESERVE';
  if (locType === 'VILLAGE') return 'BUILDUP';
  if (locType === 'ROACH_NEST') return 'DEFEND';
  if (locType === 'GRAVEYARD') return 'DEFEND';
  return 'REST';
};

const isFactionMilitaryAnchor = (loc: Location) =>
  loc.type === 'CITY' ||
  loc.type === 'CASTLE' ||
  loc.type === 'VILLAGE' ||
  loc.type === 'ROACH_NEST' ||
  isUndeadFortressLocation(loc);

/** 据点排序：城 > 堡 > 亡灵堡 > 虫巢 > 村 */
const anchorSortRank = (loc: Location): number => {
  if (loc.type === 'CITY') return 0;
  if (loc.type === 'CASTLE') return 1;
  if (isUndeadFortressLocation(loc)) return 2;
  if (loc.type === 'ROACH_NEST') return 3;
  if (loc.type === 'VILLAGE') return 4;
  return 9;
};

/**
 * AI 给出的出战比例与编制规则混合（偏「不会动员全城」）。
 */
export const resolveLordAttackDeployRatio = (
  aiSuggested: number | undefined,
  lord: Lord,
  strat?: FactionStrategicDirective
): number => {
  const base = getLordDeployRatio(lord, strat);
  const ai = Number.isFinite(aiSuggested) ? Math.min(0.95, Math.max(0.12, Number(aiSuggested))) : 0.42;
  return Math.min(0.88, Math.max(0.2, ai * 0.42 + base * 0.58));
};

/** 领主围城 / 出击时投入行营比例（与王国战略、性情、状态挂钩） */
export const getLordDeployRatio = (lord: Lord, strat?: FactionStrategicDirective): number => {
  let r = 0.48;
  const temp = String(lord.temperament ?? '');
  if (/烈|狂|战|桀|悍/.test(temp)) r += 0.1;
  if (/慎|退|懦|和|儒/.test(temp)) r -= 0.08;
  if (lord.state === 'BESIEGING') r += 0.12;
  if (lord.state === 'MARSHALLING') r += 0.08;
  if (lord.state === 'RESTING') r -= 0.12;
  if (lord.focus === 'WAR') r += 0.08;
  if (lord.focus === 'DEFENSE') r -= 0.06;
  if (lord.focus === 'TRADE' || lord.focus === 'DIPLOMACY') r -= 0.04;
  if (strat?.mode === 'PRESS_ENEMY') r += 0.06;
  if (strat?.mode === 'DEFEND_HOME') r -= 0.05;
  return Math.min(0.88, Math.max(0.24, r));
};

export const splitLordPartyForCommitment = (
  troops: Troop[],
  ratio: number
): { committed: Troop[]; retained: Troop[] } => {
  const safeR = Math.min(0.9, Math.max(0.18, ratio));
  const { attackers, remaining } = splitTroops(troops.map(t => ({ ...t })), safeR);
  if (getGarrisonCount(attackers) < 1 && getGarrisonCount(troops) > 0) {
    const fallback = splitTroops(troops.map(t => ({ ...t })), 0.28);
    return { committed: fallback.attackers, retained: fallback.remaining };
  }
  return { committed: attackers, retained: remaining };
};

type BuildInput = {
  locations: Location[];
  lords: Lord[];
  factionStrategies: Partial<Record<FactionId, FactionStrategicDirective>>;
  getTroopTemplate: GetTroopTemplate;
};

export function buildFactionMilitaryOverviews(input: BuildInput): FactionMilitaryOverview[] {
  const { locations, lords, factionStrategies, getTroopTemplate } = input;

  return FACTIONS.map(faction => {
    const factionId = faction.id;
    const friendly = locations.filter(loc => loc.factionId === factionId && loc.owner !== 'ENEMY');

    const strongholds = friendly
      .filter(isFactionMilitaryAnchor)
      .sort((a, b) => {
        const ra = anchorSortRank(a);
        const rb = anchorSortRank(b);
        if (ra !== rb) return ra - rb;
        return getGarrisonCount(getDefenderTroops(b, getTroopTemplate)) - getGarrisonCount(getDefenderTroops(a, getTroopTemplate));
      });

    const strat = factionStrategies[factionId];
    const focalId = strat?.focalLocationId;
    const mode = strat?.mode;

    const holdings: FactionMilitaryHoldingRow[] = strongholds.map(loc => {
      const defender = getDefenderTroops(loc, getTroopTemplate);
      const strength = getGarrisonCount(defender);
      const hereLords = lords.filter(
        l =>
          l.factionId === factionId &&
          l.currentLocationId === loc.id &&
          !(l.travelDaysLeft && l.travelDaysLeft > 0)
      );
      const lordRows = hereLords.map(l => ({
        id: l.id,
        name: l.name,
        title: l.title,
        partyStrength: getGarrisonCount(l.partyTroops ?? []),
        state: l.state
      }));
      return {
        locationId: loc.id,
        locationName: loc.name,
        locationType: loc.type,
        strength,
        byTier: spreadFromTroops(defender, getTroopTemplate),
        lords: lordRows
      };
    });

    const anchors = strongholds.slice(0, 7);
    const formalUnits: FactionFormalUnitRow[] = anchors.map((loc, i) => {
      const troops = getDefenderTroops(loc, getTroopTemplate);
      const posture = postureForAnchor(loc.id, focalId, mode, loc.type);
      return {
        id: `orb_${factionId}_${loc.id}`,
        echelonLabel: ECHELON_LABELS[Math.min(i, ECHELON_LABELS.length - 1)],
        posture,
        postureLabel: MILITARY_POSTURE_LABELS[posture],
        anchorLocationId: loc.id,
        anchorName: loc.name,
        bookStrength: getGarrisonCount(troops),
        byTier: spreadFromTroops(troops, getTroopTemplate)
      };
    });

    const movingLords = lords.filter(
      l => l.factionId === factionId && l.travelDaysLeft && l.travelDaysLeft > 0 && (l.partyTroops?.length ?? 0) > 0
    );
    if (movingLords.length > 0) {
      const partyTroops = mergeTroops([], movingLords.flatMap(l => l.partyTroops ?? []));
      const ms = getGarrisonCount(partyTroops);
      if (ms > 0) {
        formalUnits.push({
          id: `orb_${factionId}_en_route`,
          echelonLabel: '机动支队',
          posture: 'OFFENSE',
          postureLabel: MILITARY_POSTURE_LABELS.OFFENSE,
          anchorLocationId: '',
          anchorName: `在途（${movingLords.length} 支）`,
          bookStrength: ms,
          byTier: spreadFromTroops(partyTroops, getTroopTemplate)
        });
        holdings.push({
          locationId: '_en_route',
          locationName: '在途行军',
          locationType: 'FIELD_CAMP',
          strength: ms,
          byTier: spreadFromTroops(partyTroops, getTroopTemplate),
          lords: movingLords.map(l => ({
            id: l.id,
            name: l.name,
            title: l.title,
            partyStrength: getGarrisonCount(l.partyTroops ?? []),
            state: l.state
          }))
        });
      }
    }

    const totalStrength = holdings.reduce((sum, h) => sum + h.strength, 0);
    const byTier = holdings.reduce(
      (acc, h) => mergeSpreads(acc, h.byTier),
      ([1, 2, 3, 4, 5] as const).map(tier => ({ tier: tier as TroopTier, count: 0 }))
    );

    return {
      factionId,
      factionName: faction.name,
      color: faction.color,
      totalStrength,
      byTier,
      holdings,
      formalUnits
    };
  });
}
