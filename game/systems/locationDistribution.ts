/**
 * Location distribution algorithm:
 * - IMPOSTER_PORTAL and WORLD_BOARD near center
 * - Same faction locations clustered together
 * - No overlapping (min distance enforced)
 * - Even spread across map
 */

import type { Location } from '../../types';

const MAP_WIDTH = 960;
const MAP_HEIGHT = 960;
const MIN_DISTANCE = 48;
const CENTER_X = MAP_WIDTH / 2;
const CENTER_Y = MAP_HEIGHT / 2;

function dist(a: { x: number; y: number }, b: { x: number; y: number }): number {
  return Math.hypot(b.x - a.x, b.y - a.y);
}

function clampPos(x: number, y: number): { x: number; y: number } {
  return {
    x: Math.max(20, Math.min(MAP_WIDTH - 20, Math.round(x))),
    y: Math.max(20, Math.min(MAP_HEIGHT - 20, Math.round(y)))
  };
}

/**
 * Redistribute locations to reduce overlap and cluster factions.
 * Returns new coordinates map: locationId -> { x, y }
 */
export function redistributeLocations(locations: Location[]): Map<string, { x: number; y: number }> {
  const result = new Map<string, { x: number; y: number }>();
  const byFaction = new Map<string, Location[]>();
  const special: Location[] = [];
  const rest: Location[] = [];

  for (const loc of locations) {
    const coords = loc.coordinates ?? { x: MAP_WIDTH / 2, y: MAP_HEIGHT / 2 };
    if (loc.type === 'WORLD_BOARD' || loc.type === 'IMPOSTER_PORTAL') {
      special.push(loc);
    } else if (loc.factionId) {
      const list = byFaction.get(loc.factionId) ?? [];
      list.push(loc);
      byFaction.set(loc.factionId, list);
    } else {
      rest.push(loc);
    }
  }

  // 1. Place WORLD_BOARD and IMPOSTER_PORTAL near center
  const centerRadius = 80;
  const usedPositions: { x: number; y: number }[] = [];
  special.forEach((loc, i) => {
    const angle = (i / Math.max(1, special.length)) * Math.PI * 0.5;
    const x = CENTER_X + Math.cos(angle) * centerRadius;
    const y = CENTER_Y - 30 + Math.sin(angle) * centerRadius * 0.5;
    const pos = clampPos(x, y);
    result.set(loc.id, pos);
    usedPositions.push(pos);
  });

  // 2. Assign faction regions (quadrants/sectors)
  const factionIds = Array.from(byFaction.keys());
  const sectorAngles: Record<string, number> = {};
  factionIds.forEach((fid, i) => {
    sectorAngles[fid] = (i / Math.max(1, factionIds.length)) * Math.PI * 2 - Math.PI / 2;
  });

  // 3. Place faction locations in their sector
  const tryPlace = (target: { x: number; y: number }): { x: number; y: number } => {
    const others = [...usedPositions];
    let best = { ...target };
    let bestScore = Infinity;
    for (let dx = -60; dx <= 60; dx += 15) {
      for (let dy = -60; dy <= 60; dy += 15) {
        const cand = clampPos(target.x + dx, target.y + dy);
        const tooClose = others.some(o => dist(cand, o) < MIN_DISTANCE);
        if (tooClose) continue;
        const score = others.reduce((s, o) => s + 1 / Math.max(1, dist(cand, o)), 0);
        if (score < bestScore) {
          bestScore = score;
          best = cand;
        }
      }
    }
    return best;
  };

  byFaction.forEach((locs, factionId) => {
    const angle = sectorAngles[factionId] ?? 0;
    const radius = 220 + Math.random() * 80;
    const cx = CENTER_X + Math.cos(angle) * radius;
    const cy = CENTER_Y + Math.sin(angle) * radius;
    locs.forEach((loc, i) => {
      const jitter = 50 + (i % 3) * 35;
      const a = angle + (i * 0.4) - 0.6;
      const target = { x: cx + Math.cos(a) * jitter, y: cy + Math.sin(a) * jitter };
      const pos = tryPlace(target);
      result.set(loc.id, pos);
      usedPositions.push(pos);
    });
  });

  // 4. Place rest (no faction) in remaining space
  rest.forEach((loc, i) => {
    const coords = loc.coordinates ?? { x: MAP_WIDTH / 2, y: MAP_HEIGHT / 2 };
    const angle = (i / Math.max(1, rest.length)) * Math.PI * 2 + 1.2;
    const radius = 280 + (i % 4) * 60;
    const target = {
      x: CENTER_X + Math.cos(angle) * radius,
      y: CENTER_Y + Math.sin(angle) * radius
    };
    const pos = tryPlace(target);
    result.set(loc.id, pos);
    usedPositions.push(pos);
  });

  return result;
}
