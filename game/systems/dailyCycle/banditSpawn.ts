import type { Location } from '../../../types';

export function processBanditSpawn(
  locations: Location[],
  playerDay: number,
  dayIndex: number,
  mapWidth: number,
  mapHeight: number
): { locations: Location[]; log: string | null } {
  const banditCampCount = locations.filter(l => l.type === 'BANDIT_CAMP').length;
  if (banditCampCount >= 15 || Math.random() >= 0.03) {
    return { locations, log: null };
  }

  const spawnX = Math.floor(Math.random() * mapWidth);
  const spawnY = Math.floor(Math.random() * mapHeight);
  const newCamp: Location = {
    id: `bandit_camp_${Date.now()}_${dayIndex}`,
    name: '劫匪窝点',
    type: 'BANDIT_CAMP',
    description: '一群法外之徒聚集的临时营地。',
    coordinates: { x: spawnX, y: spawnY },
    terrain: 'BANDIT_CAMP',
    lastRefreshDay: 0,
    banditSpawnDay: playerDay,
    volunteers: [],
    mercenaries: [],
    owner: 'NEUTRAL',
    isUnderSiege: false,
    siegeProgress: 0,
    siegeEngines: [],
    garrison: [],
    buildings: [],
    constructionQueue: [],
    siegeEngineQueue: [],
    lastIncomeDay: 0
  };

  return {
    locations: [...locations, newCamp],
    log: '侦察兵报告：发现了一处新的劫匪窝点！'
  };
}
