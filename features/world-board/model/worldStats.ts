import { Location, PlayerState, Troop, TroopTier } from '../../../types';

type CollectWorldTroopsInput = {
  player: PlayerState;
  locations: Location[];
  getTroopTemplate: (id: string) => Omit<Troop, 'count' | 'xp'> | undefined;
  buildGarrisonTroops: (location: Location) => Troop[];
};

export const collectWorldTroops = ({
  player,
  locations,
  getTroopTemplate,
  buildGarrisonTroops
}: CollectWorldTroopsInput) => {
  const gathered: Troop[] = [];
  const addTroops = (troops?: Troop[]) => {
    if (!troops) return;
    troops.forEach(t => {
      if (!t || t.count <= 0) return;
      const template = getTroopTemplate(t.id);
      if (template) {
        gathered.push({ ...template, count: t.count, xp: t.xp ?? 0 } as Troop);
      } else {
        gathered.push(t);
      }
    });
  };

  addTroops(player.troops);

  locations.forEach(loc => {
    const garrison = loc.garrison ?? [];
    if (loc.owner === 'PLAYER') addTroops(garrison);
    else if (garrison.length > 0) addTroops(garrison);
    else addTroops(buildGarrisonTroops(loc));

    (loc.stayParties ?? []).forEach(party => addTroops(party.troops));
    (loc.stationedArmies ?? []).forEach(army => addTroops(army.troops));

    if (loc.activeSiege?.troops) {
      addTroops(loc.activeSiege.troops);
    }
  });

  return gathered;
};

export const getBelieverStats = (
  troopIds: string[],
  input: CollectWorldTroopsInput
) => {
  const ids = new Set(troopIds.filter(Boolean));
  const stats = {
    total: 0,
    byTier: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
  };
  if (ids.size === 0) return stats;

  const gathered = collectWorldTroops(input);
  gathered.forEach(troop => {
    if (!ids.has(troop.id)) return;
    const tier = (input.getTroopTemplate(troop.id)?.tier ?? troop.tier ?? 1) as TroopTier;
    const key = Math.min(5, Math.max(1, tier)) as 1 | 2 | 3 | 4 | 5;
    stats.total += troop.count;
    stats.byTier[key] += troop.count;
  });
  return stats;
};
