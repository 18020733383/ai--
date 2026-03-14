import type { Location, Troop } from '../../types';
import { TROOP_TEMPLATES } from '../data';
import { randomInt } from './randomUtils';

export function getBanditCampAge(camp: Location | undefined, playerDay: number): number {
  const spawnDay = camp?.banditSpawnDay ?? camp?.lastRefreshDay ?? playerDay;
  return Math.max(0, playerDay - spawnDay);
}

export function buildBanditTroops(camp: Location | null, playerDay: number): Troop[] {
  const isGoblinCamp = !!camp && camp.type === 'BANDIT_CAMP' && camp.id.startsWith('goblin_camp_');
  const daysAlive = getBanditCampAge(camp ?? undefined, playerDay);
  const growth = Math.floor(daysAlive / 3);
  const troops: Troop[] = [];

  if (isGoblinCamp) {
    const goblinGrowth = Math.floor(daysAlive / 2);
    const t1Count = randomInt(14, 22) + goblinGrowth;
    const t1Pool = ['goblin_scavenger', 'goblin_spear_urchin', 'goblin_slinger', 'goblin_bomber', 'goblin_sneak', 'goblin_wolf_pup_rider', 'goblin_scrap_shield', 'goblin_hex_apprentice', 'goblin_fungal_picker'];
    for (let i = 0; i < Math.max(3, Math.min(6, Math.floor(t1Count / 6))); i++) {
      const id = t1Pool[(randomInt(0, 999) + i) % t1Pool.length];
      troops.push({ ...TROOP_TEMPLATES[id], count: Math.max(2, Math.floor(t1Count / (i + 3))), xp: 0 });
    }
    const t2Chance = Math.min(0.55 + daysAlive * 0.012, 0.92);
    if (Math.random() < t2Chance) {
      const t2Pool = ['goblin_raider', 'goblin_pikeman', 'goblin_sling_leader', 'goblin_grenadier', 'goblin_cutthroat', 'goblin_wolf_rider', 'goblin_tower_shield', 'goblin_hexer', 'goblin_fungus_medic'];
      const t2Count = randomInt(6, 12) + Math.floor(goblinGrowth / 2);
      const picks = Math.max(2, Math.min(4, Math.floor(t2Count / 6)));
      for (let i = 0; i < picks; i++) {
        const id = t2Pool[(randomInt(0, 999) + i) % t2Pool.length];
        troops.push({ ...TROOP_TEMPLATES[id], count: Math.max(1, Math.floor(t2Count / (i + 2))), xp: 0 });
      }
    }
    const t3Chance = Math.min(0.2 + daysAlive * 0.012, 0.65);
    if (Math.random() < t3Chance) {
      const t3Pool = ['goblin_chain_reaver', 'goblin_hob_spear', 'goblin_stone_harrier', 'goblin_sapper', 'goblin_nightblade', 'goblin_warg_rider', 'goblin_scrap_guard', 'goblin_witch_doctor', 'goblin_plague_shaman'];
      const t3Count = randomInt(2, 5) + Math.floor(goblinGrowth / 4);
      const picks = Math.max(1, Math.min(3, t3Count));
      for (let i = 0; i < picks; i++) {
        const id = t3Pool[(randomInt(0, 999) + i) % t3Pool.length];
        troops.push({ ...TROOP_TEMPLATES[id], count: 1 + Math.floor(t3Count / (i + 2)), xp: 0 });
      }
    }
    const t4Chance = Math.min(0.07 + daysAlive * 0.006, 0.25);
    if (Math.random() < t4Chance) {
      const t4Pool = ['goblin_warlord', 'goblin_spear_chief', 'goblin_bombardier', 'goblin_shadow_lord', 'goblin_warg_alpha', 'goblin_witch_king'];
      const t4Id = t4Pool[randomInt(0, t4Pool.length - 1)];
      const t4Count = randomInt(1, 2) + Math.floor(goblinGrowth / 8);
      troops.push({ ...TROOP_TEMPLATES[t4Id], count: Math.max(1, t4Count), xp: 0 });
    }
    const merged = troops.reduce((acc, t) => {
      const existing = acc.get(t.id);
      if (existing) acc.set(t.id, { ...existing, count: existing.count + t.count });
      else acc.set(t.id, t);
      return acc;
    }, new Map<string, Troop>());
    return Array.from(merged.values()).filter((t) => t.count > 0);
  }

  const t1Count = randomInt(12, 20) + growth;
  troops.push({ ...TROOP_TEMPLATES['peasant'], count: t1Count, xp: 0 });

  if (Math.random() < 0.65) {
    const t2Id = Math.random() < 0.5 ? 'militia' : 'hunter';
    const t2Count = randomInt(3, 7) + Math.floor(growth / 2);
    troops.push({ ...TROOP_TEMPLATES[t2Id], count: t2Count, xp: 0 });
  }

  const t3Chance = Math.min(0.15 + daysAlive * 0.01, 0.45);
  if (Math.random() < t3Chance) {
    const t3Id = Math.random() < 0.5 ? 'footman' : 'archer';
    const t3Count = randomInt(1, 3) + Math.floor(growth / 3);
    troops.push({ ...TROOP_TEMPLATES[t3Id], count: t3Count, xp: 0 });
  }

  const t4Chance = Math.min(0.05 + daysAlive * 0.005, 0.2);
  if (Math.random() < t4Chance) {
    const t4Id = Math.random() < 0.5 ? 'knight' : 'sharpshooter';
    const t4Count = randomInt(1, 2) + Math.floor(growth / 6);
    troops.push({ ...TROOP_TEMPLATES[t4Id], count: t4Count, xp: 0 });
  }

  return troops;
}
