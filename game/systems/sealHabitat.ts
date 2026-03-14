import type { Location, SealInstance, SealSpecies } from '../../types';

const FISH_PER_DAY: Record<SealSpecies, number> = {
  harbor_seal: 3,
  elephant_seal: 8,
  fur_seal: 5,
  leopard_seal: 10
};

const STARVE_DAYS = 5;

export function processSealHabitatDaily(
  loc: Location,
  _day: number
): { location: Location; starvedNames: string[] } {
  if (loc.type !== 'SEAL_HABITAT' || !loc.sealHabitat) {
    return { location: loc, starvedNames: [] };
  }
  const { seals, fishStock } = loc.sealHabitat;
  if (seals.length === 0) return { location: loc, starvedNames: [] };

  let remainingFish = fishStock;
  const nextSeals: SealInstance[] = [];
  const starvedNames: string[] = [];

  for (const seal of seals) {
    const need = FISH_PER_DAY[seal.species] ?? 5;
    if (remainingFish >= need) {
      remainingFish -= need;
      nextSeals.push({ ...seal, hungerDays: 0 });
    } else {
      const nextHunger = seal.hungerDays + 1;
      if (nextHunger >= STARVE_DAYS) {
        starvedNames.push(seal.name);
      } else {
        nextSeals.push({ ...seal, hungerDays: nextHunger });
      }
    }
  }

  return {
    location: {
      ...loc,
      sealHabitat: {
        ...loc.sealHabitat,
        seals: nextSeals,
        fishStock: remainingFish,
        lastFeedDay: _day
      }
    },
    starvedNames
  };
}
