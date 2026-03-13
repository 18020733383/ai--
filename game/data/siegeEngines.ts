import type { SiegeEngineType } from '../../types';

export const SIEGE_ENGINE_OPTIONS: { type: SiegeEngineType; name: string; cost: number; days: number; description: string }[] = [
  { type: 'RAM', name: '攻城锤', cost: 400, days: 2, description: '破门专用，短时间内撕开城门。' },
  { type: 'TOWER', name: '攻城塔', cost: 700, days: 3, description: '掩护士兵登墙，减少远程伤亡。' },
  { type: 'CATAPULT', name: '投石机', cost: 900, days: 4, description: '远程轰击，摧毁防御器械。' },
  { type: 'SIMPLE_LADDER', name: '简易攻城梯', cost: 0, days: 0, description: '无需建造，直接攻城（高伤亡风险）。' },
  { type: 'CHAINBREAKER_CANNON', name: '断链者火炮', cost: 1200, days: 5, description: '镶嵌火水晶的重炮，远程粉碎敌方法阵阵地。' },
  { type: 'ARCANE_MISSILE', name: '魔法导弹', cost: 1500, days: 6, description: '法师引导的魔法导弹，精准摧毁关键据点。' }
];

export type SiegeEngineCombatStats = {
  hp: number;
  wallDamage: number;
  attackerRangedHit: number;
  attackerRangedDamage: number;
  attackerMeleeHit: number;
  attackerMeleeDamage: number;
  defenderRangedHitPenalty: number;
  defenderRangedDamagePenalty: number;
};

export const SIEGE_ENGINE_COMBAT_STATS: Record<SiegeEngineType, SiegeEngineCombatStats> = {
  RAM: { hp: 520, wallDamage: 160, attackerRangedHit: 0, attackerRangedDamage: 0, attackerMeleeHit: 0.08, attackerMeleeDamage: 0.12, defenderRangedHitPenalty: 0.03, defenderRangedDamagePenalty: 0 },
  TOWER: { hp: 480, wallDamage: 70, attackerRangedHit: 0.05, attackerRangedDamage: 0.06, attackerMeleeHit: 0.04, attackerMeleeDamage: 0.04, defenderRangedHitPenalty: 0.08, defenderRangedDamagePenalty: 0.05 },
  CATAPULT: { hp: 380, wallDamage: 210, attackerRangedHit: 0.02, attackerRangedDamage: 0.03, attackerMeleeHit: 0, attackerMeleeDamage: 0, defenderRangedHitPenalty: 0.06, defenderRangedDamagePenalty: 0.08 },
  SIMPLE_LADDER: { hp: 160, wallDamage: 35, attackerRangedHit: -0.02, attackerRangedDamage: 0, attackerMeleeHit: 0.06, attackerMeleeDamage: 0.08, defenderRangedHitPenalty: 0, defenderRangedDamagePenalty: 0 },
  CHAINBREAKER_CANNON: { hp: 420, wallDamage: 260, attackerRangedHit: 0.04, attackerRangedDamage: 0.08, attackerMeleeHit: 0, attackerMeleeDamage: 0, defenderRangedHitPenalty: 0.1, defenderRangedDamagePenalty: 0.12 },
  ARCANE_MISSILE: { hp: 260, wallDamage: 300, attackerRangedHit: 0.06, attackerRangedDamage: 0.1, attackerMeleeHit: -0.01, attackerMeleeDamage: 0, defenderRangedHitPenalty: 0.12, defenderRangedDamagePenalty: 0.1 }
};

export const getSiegeEngineName = (type: SiegeEngineType) =>
  SIEGE_ENGINE_OPTIONS.find(s => s.type === type)?.name ?? type;
