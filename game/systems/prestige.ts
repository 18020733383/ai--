/**
 * 玩家威望系统
 * 威望影响领主态度，可为负数（各地领主不欢迎）
 */

export const PRESTIGE = {
  // 增加威望
  BANDIT_CAMP_DESTROY: 8,
  GOBLIN_CAMP_DESTROY: 6,
  UNDERDOG_VICTORY: 12,
  DEFENSE_AID_SUCCESS: 15,
  SEAL_HABITAT_PER_SEAL: 1,
  SEAL_HABITAT_INTERVAL_DAYS: 5,
  WORK_CONTRACT_COMPLETE: 3,
  LIBERATE_SIEGE: 5,

  // 减少威望
  SACK_VILLAGE: -25,
  SACK_CASTLE: -35,
  SACK_CITY: -45,
  RAID_CARAVAN: -15,
  ATTACK_FRIENDLY: -20
} as const;

export function computeUnderdogBonus(playerCount: number, enemyCount: number): number {
  if (playerCount >= enemyCount || playerCount <= 0) return 0;
  const ratio = enemyCount / playerCount;
  if (ratio < 1.5) return 0;
  if (ratio < 2) return Math.floor(PRESTIGE.UNDERDOG_VICTORY * 0.5);
  if (ratio < 3) return PRESTIGE.UNDERDOG_VICTORY;
  return Math.min(25, PRESTIGE.UNDERDOG_VICTORY + Math.floor((ratio - 3) * 3));
}

export function computeSealHabitatPrestige(sealCount: number): number {
  if (sealCount <= 0) return 0;
  return sealCount * PRESTIGE.SEAL_HABITAT_PER_SEAL;
}

export function shouldAddSealPrestige(lastDay: number | undefined, currentDay: number): boolean {
  if (lastDay == null) return true;
  return currentDay - lastDay >= PRESTIGE.SEAL_HABITAT_INTERVAL_DAYS;
}
