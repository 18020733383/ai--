import type { Location, Troop } from '../../types';
import { randomInt } from './randomUtils';

export function buildImposterTroops(
  day: number,
  getTroopTemplate: (id: string) => Omit<Troop, 'count' | 'xp'> | undefined
): Troop[] {
  const scale = 0.72 + Math.min(0.28, Math.max(0, day) / 2400);
  const roster = [
    { id: 'void_larva', count: Math.max(1, Math.floor(randomInt(40, 60) * scale)) },
    { id: 'glitch_pawn', count: Math.max(1, Math.floor(randomInt(40, 60) * scale)) },
    { id: 'static_noise_walker', count: Math.max(1, Math.floor(randomInt(30, 50) * scale)) },
    { id: 'imposter_light_infantry', count: Math.max(1, Math.floor(randomInt(40, 70) * scale)) },
    { id: 'imposter_spearman', count: Math.max(1, Math.floor(randomInt(35, 60) * scale)) },
    { id: 'imposter_short_bowman', count: Math.max(1, Math.floor(randomInt(30, 50) * scale)) },
    { id: 'entropy_acolyte', count: Math.max(1, Math.floor(randomInt(20, 30) * (scale * 0.92))) },
    { id: 'pixel_shifter', count: Math.max(1, Math.floor(randomInt(15, 25) * (scale * 0.92))) },
    { id: 'syntax_error_scout', count: Math.max(1, Math.floor(randomInt(15, 25) * (scale * 0.92))) },
    { id: 'imposter_heavy_infantry', count: Math.max(1, Math.floor(randomInt(15, 25) * (scale * 0.92))) },
    { id: 'imposter_longbowman', count: Math.max(1, Math.floor(randomInt(12, 20) * (scale * 0.92))) },
    { id: 'memory_leak_mage', count: Math.max(1, Math.floor(randomInt(5, 10) * (scale * 0.85))) },
    { id: 'recursion_archer', count: Math.max(1, Math.floor(randomInt(8, 15) * (scale * 0.85))) },
    { id: 'buffer_overflow_brute', count: Math.max(1, Math.floor(randomInt(5, 10) * (scale * 0.85))) },
    { id: 'imposter_heavy_knight', count: Math.max(1, Math.floor(randomInt(2, 4) * (scale * 0.8))) },
    { id: 'kernel_panic_knight', count: Math.max(1, Math.floor(randomInt(2, 5) * (scale * 0.8))) },
    { id: 'blue_screen_golem', count: Math.max(1, Math.floor(randomInt(1, 3) * (scale * 0.75))) }
  ];
  return roster
    .map((unit) => {
      const template = getTroopTemplate(unit.id);
      return template ? { ...template, count: unit.count, xp: 0 } : null;
    })
    .filter((x): x is Troop => x != null);
}

export function pickImposterTarget(portal: Location, pool: Location[]): Location | null {
  const candidates = pool.filter(
    (loc) =>
      loc.id !== portal.id &&
      (loc.type === 'CITY' || loc.type === 'CASTLE' || loc.type === 'VILLAGE') &&
      loc.owner !== 'ENEMY' &&
      !loc.activeSiege
  );
  if (candidates.length === 0) return null;
  const ranked = candidates
    .map((loc) => ({
      loc,
      dist: Math.hypot(loc.coordinates.x - portal.coordinates.x, loc.coordinates.y - portal.coordinates.y)
    }))
    .sort((a, b) => a.dist - b.dist);
  const shortlist = ranked.slice(0, Math.min(4, ranked.length));
  return shortlist[Math.floor(Math.random() * shortlist.length)].loc;
}
