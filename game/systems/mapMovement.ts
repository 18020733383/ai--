import type { Location } from '../../types';

/** 在给定坐标附近查找据点，距离小于 threshold 即视为命中 */
export function findLocationAtPosition(
  pos: { x: number; y: number },
  locations: Location[],
  threshold = 2
): Location | undefined {
  return locations.find((l) => {
    const dx = l.coordinates.x - pos.x;
    const dy = l.coordinates.y - pos.y;
    return Math.sqrt(dx * dx + dy * dy) < threshold;
  });
}
