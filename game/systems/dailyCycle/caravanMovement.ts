import type { Location } from '../../../types';

export function processCaravanMovement(
  locations: Location[],
  mapWidth: number,
  mapHeight: number
): Location[] {
  const caravanCamps = locations.filter(l => l.type === 'FIELD_CAMP' && l.owner === 'ENEMY' && l.camp?.kind === 'CARAVAN');
  if (caravanCamps.length === 0) return locations;

  return locations.flatMap(loc => {
    if (loc.type !== 'FIELD_CAMP' || loc.owner !== 'ENEMY' || loc.camp?.kind !== 'CARAVAN') return [loc];
    const camp = loc.camp;
    const daysLeft = Math.max(0, Math.floor((camp.daysLeft ?? 0) - 1));
    if (daysLeft <= 0) return [];
    const total = Math.max(1, Math.floor(camp.totalDays ?? 1));
    const progressed = total - daysLeft;
    const ratio = Math.max(0, Math.min(1, progressed / total));
    const start = camp.routeStart ?? { x: 0, y: 80 };
    const end = camp.routeEnd ?? { x: mapWidth, y: mapHeight - 80 };
    const x = Math.round(start.x + (end.x - start.x) * ratio);
    const y = Math.round(start.y + (end.y - start.y) * ratio);
    return [{ ...loc, coordinates: { x, y }, camp: { ...camp, daysLeft } }];
  });
}
