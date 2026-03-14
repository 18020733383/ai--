import type { Location, Troop } from '../../../types';

export type GetTroopTemplate = (id: string) => Partial<Troop> | undefined;

export function processCaravanSpawn(
  locations: Location[],
  playerDay: number,
  dayIndex: number,
  getTroopTemplate: GetTroopTemplate,
  mapWidth: number,
  mapHeight: number
): { locations: Location[]; log: string | null } {
  const activeCaravanCount = locations.filter(l => l.type === 'FIELD_CAMP' && l.owner === 'ENEMY' && l.camp?.kind === 'CARAVAN').length;
  if (activeCaravanCount >= 2 || Math.random() >= 0.12) {
    return { locations, log: null };
  }

  const spawnLeft = Math.random() < 0.5;
  const startX = spawnLeft ? 8 : mapWidth - 8;
  const endX = spawnLeft ? mapWidth - 8 : 8;
  const startY = 20 + Math.floor(Math.random() * Math.max(1, mapHeight - 40));
  const endY = 20 + Math.floor(Math.random() * Math.max(1, mapHeight - 40));
  const totalDays = 7 + Math.floor(Math.random() * 7);
  const goldMultiplier = 2.6 + Math.random() * 1.4;

  const guards: Troop[] = [];
  const addGuard = (id: string, count: number) => {
    const tmpl = getTroopTemplate(id);
    if (!tmpl) return;
    guards.push({ ...tmpl, count, xp: 0 } as Troop);
  };
  addGuard('militia', 10 + Math.floor(Math.random() * 6));
  addGuard('archer', 6 + Math.floor(Math.random() * 4));
  addGuard('footman', 3 + Math.floor(Math.random() * 3));

  const caravan: Location = {
    id: `caravan_${Date.now()}_${dayIndex}`,
    name: '商队临时营地',
    type: 'FIELD_CAMP',
    description: '驮马与货车围成车阵，护卫警惕地守着箱笼。',
    coordinates: { x: startX, y: startY },
    terrain: 'PLAINS',
    lastRefreshDay: 0,
    volunteers: [],
    mercenaries: [],
    owner: 'ENEMY',
    garrison: guards,
    buildings: [],
    camp: {
      kind: 'CARAVAN',
      sourceLocationId: 'caravan_route',
      targetLocationId: 'caravan_route',
      totalDays,
      daysLeft: totalDays,
      attackerName: '商队护卫',
      leaderName: '押镖队长',
      routeStart: { x: startX, y: startY },
      routeEnd: { x: endX, y: endY },
      goldMultiplier
    }
  };

  return {
    locations: [...locations, caravan],
    log: '斥候报告：一支商队出现在地平线，正沿着道路缓慢行军。'
  };
}
