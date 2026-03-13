import { Troop } from '../../../types';
import { calculatePower } from '../../../game/systems/combatPower';

export function calculateFleeChance(
  pTroops: Troop[],
  eTroops: Troop[],
  escapeLevel: number
): number {
  const pPower = calculatePower(pTroops);
  const ePower = calculatePower(eTroops);
  const totalPower = pPower + ePower;
  const diffRatio = totalPower > 0 ? (pPower - ePower) / totalPower : 0;
  const escapeBonus = (escapeLevel ?? 0) * 0.02;
  return Math.min(0.9, Math.max(0.1, 0.5 + diffRatio + escapeBonus));
}

export type RearGuardPlan = { ratio: number; lost: number; successChance: number };

export function calculateRearGuardPlan(
  pTroops: Troop[],
  eTroops: Troop[],
  escapeLevel: number
): RearGuardPlan {
  const pPower = calculatePower(pTroops);
  const ePower = calculatePower(eTroops);
  const totalPower = pPower + ePower;
  const ratioBase = totalPower > 0 ? (ePower / totalPower) * 0.6 : 0.5;
  const ratio = Math.min(0.8, Math.max(0.1, ratioBase));
  const lost = pTroops.reduce((sum, t) => sum + Math.ceil(t.count * ratio), 0);
  const diffRatio = totalPower > 0 ? (pPower - ePower) / totalPower : -0.2;
  const escapeBonus = (escapeLevel ?? 0) * 0.015;
  const successChance = Math.min(0.9, Math.max(0.2, 0.55 + diffRatio + escapeBonus));
  return { ratio, lost, successChance };
}
