import { Location, PlayerState, Troop } from '../../../types';

export type BattleEngagementMeta = {
  mode: 'FIELD' | 'SIEGE' | 'DEFENSE_AID';
  targetLocationId?: string;
  siegeContext?: string;
  supportTroops?: Troop[];
  supportLabel?: string;
};

export const appendDefenseAidTroops = (
  baseTroops: Troop[],
  locations: Location[],
  battleInfo: BattleEngagementMeta
): Troop[] => {
  if (battleInfo.mode !== 'DEFENSE_AID' || !battleInfo.targetLocationId) return baseTroops;
  const loc = locations.find(l => l.id === battleInfo.targetLocationId);
  if (!loc) return baseTroops;

  const supportTroops = (() => {
    if (battleInfo.supportTroops) return battleInfo.supportTroops;
    if (loc.type === 'HIDEOUT') {
      const hideout = loc.hideout;
      const layers = hideout?.layers ?? [];
      const layerIndex = loc.activeSiege?.hideoutLayerIndex ?? hideout?.selectedLayer ?? 0;
      const layer = layers[Math.max(0, Math.min(layers.length - 1, Math.floor(layerIndex)))];
      return layer?.garrison ?? [];
    }
    return loc.garrison ?? [];
  })();

  if (supportTroops.length === 0) return baseTroops;
  const taggedGarrison = supportTroops.map(t => ({ ...t, id: `garrison_${t.id}` }));
  return [...baseTroops, ...taggedGarrison];
};

export const describeBattleLocationText = (
  battleInfo: BattleEngagementMeta,
  locations: Location[],
  currentLocation: Location | null,
  currentPlayer: PlayerState
): string => {
  const byId = battleInfo.targetLocationId ? locations.find(l => l.id === battleInfo.targetLocationId) : null;
  const loc = byId ?? currentLocation;
  if (loc) {
    const prefix = battleInfo.mode === 'SIEGE' ? '攻城：' : battleInfo.mode === 'DEFENSE_AID' ? '守城协助：' : '';
    return `${prefix}${loc.name}（${loc.type} / ${loc.terrain}）`;
  }
  const pos = currentPlayer.position;
  const nearest = locations.reduce<{ loc: Location | null; dist: number }>((best, l) => {
    const dx = (l.coordinates?.x ?? 0) - (pos?.x ?? 0);
    const dy = (l.coordinates?.y ?? 0) - (pos?.y ?? 0);
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (!best.loc || dist < best.dist) return { loc: l, dist };
    return best;
  }, { loc: null, dist: Infinity });
  return nearest.loc ? `野外（靠近 ${nearest.loc.name}，距离约 ${nearest.dist.toFixed(1)}）` : '野外（未知位置）';
};
