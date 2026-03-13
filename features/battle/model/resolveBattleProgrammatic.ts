import type {
  BattleEngagementMeta,
  BattleResult,
  BattleRound,
  EnemyForce,
  Location,
  PlayerState,
  SiegeEngineType,
  TerrainType,
  Troop
} from '../../../types';
import { TroopTier } from '../../../types';
import { rollBinomial } from '../../../game/systems/randomUtils';
import { DEFAULT_BATTLE_LAYERS } from './battleLayers';
import type { SiegeEngineCombatStats } from '../../../game/data/siegeEngines';

export type BattlePlan = {
  stance: 'ATTACK' | 'DEFEND' | 'PROTECT';
  layers: { id: string; name: string; hint: string }[];
  assignments: Record<string, string | null>;
  protectedTroopIds: string[];
};

export type LocationDefenseDetails = {
  wallHp: number;
  mechanismHp: number;
  rangedHitBonus: number;
  rangedDamageBonus: number;
  meleeDamageReduction: number;
};

export type ResolveBattleContext = {
  getTroopTemplate: (id: string) => Partial<Troop> | undefined;
  battlePlan: BattlePlan;
  locations: Location[];
  getLocationDefenseDetails: (loc: Location) => LocationDefenseDetails & { wallLevel?: number; wallName?: string; wallDesc?: string; mechanisms?: { name: string; description: string }[]; flavorText?: string; antiAirPowerBonus?: number; airstrikeDamageReduction?: number };
  getSiegeEngineName: (type: SiegeEngineType) => string;
  siegeEngineCombatStats: Record<SiegeEngineType, SiegeEngineCombatStats>;
};

const getTroopLayerDescriptor = (troop: Troop, getTroopTemplate: ResolveBattleContext['getTroopTemplate']) => {
  const template = getTroopTemplate(troop.id);
  const source = template ?? troop;
  const equipment = Array.isArray(source.equipment) ? source.equipment.join(' ') : '';
  const description = source.description ?? '';
  return `${troop.id} ${troop.name} ${equipment} ${description}`.toLowerCase();
};

const getDefaultLayerId = (
  troop: Troop,
  layers: { id: string; name: string; hint: string }[],
  getTroopTemplate: ResolveBattleContext['getTroopTemplate']
) => {
  const text = getTroopLayerDescriptor(troop, getTroopTemplate);
  const template = getTroopTemplate(troop.id);
  const supportRole = template?.supportRole ?? troop.supportRole;
  const isHeavy = (template?.category ?? troop.category) === 'HEAVY' || troop.id.startsWith('heavy_');
  const isRanged = /archer|bow|crossbow|ranger|marksman|sharpshooter|弓|弩|游侠|神射|猎手|射/.test(text);
  const isMage = /mage|wizard|sorcerer|法师|术士|巫师/.test(text);
  const isBard = /bard|吟游/.test(text);
  const isShield = /shield|盾|phalanx|wall|守护/.test(text);
  const isCavalry = /cavalry|rider|horse|knight|paladin|骑/.test(text);
  if (troop.id === 'player_main') return layers[1]?.id ?? layers[0]?.id;
  if (isHeavy) {
    if (supportRole === 'ARTILLERY' || supportRole === 'RADAR') return layers[3]?.id ?? layers[layers.length - 1]?.id;
    if (supportRole === 'TANK') return layers[0]?.id ?? layers[1]?.id;
    return layers[2]?.id ?? layers[1]?.id;
  }
  if (isRanged || isMage || isBard) return layers[3]?.id ?? layers[layers.length - 1]?.id;
  if (isShield) return layers[0]?.id ?? layers[1]?.id;
  if (isCavalry) return layers[1]?.id ?? layers[0]?.id;
  return layers[1]?.id ?? layers[0]?.id;
};

export function resolveBattleProgrammatic(
  battleTroops: Troop[],
  enemyForce: EnemyForce,
  terrain: TerrainType,
  currentPlayer: PlayerState,
  battleInfo: BattleEngagementMeta | undefined,
  ctx: ResolveBattleContext
): BattleResult {
  const { getTroopTemplate, battlePlan, locations, getLocationDefenseDetails, getSiegeEngineName, siegeEngineCombatStats } = ctx;
  const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
  const isLegacyAttributes = (attrs: Troop['attributes']) => {
    if (!attrs) return false;
    const values = [attrs.attack, attrs.defense, attrs.agility, attrs.hp, attrs.range, attrs.morale];
    return values.every(v => v >= 0 && v <= 10);
  };
  const scaleAttributes = (attrs: Troop['attributes']) => {
    if (!attrs) return attrs;
    const scale = isLegacyAttributes(attrs) ? 12 : 1;
    return {
      attack: attrs.attack * scale,
      defense: attrs.defense * scale,
      agility: attrs.agility * scale,
      hp: attrs.hp * scale,
      range: attrs.range * scale,
      morale: attrs.morale * scale
    };
  };
  const fallbackAttributes = (tier: TroopTier) => {
    const base = tier === TroopTier.TIER_1 ? 35 : tier === TroopTier.TIER_2 ? 55 : tier === TroopTier.TIER_3 ? 80 : tier === TroopTier.TIER_4 ? 110 : 140;
    return { attack: base, defense: base, agility: base * 0.75, hp: base * 0.9, range: base * 0.2, morale: base * 0.8 };
  };
  const normalizeTroop = (troop: Troop): Troop => {
    const template = getTroopTemplate(troop.id);
    const source = template ? ({ ...template, count: troop.count, xp: troop.xp ?? 0 } as Troop) : troop;
    const rawAttrs = source.attributes ?? fallbackAttributes((source.tier ?? TroopTier.TIER_1) as TroopTier);
    return {
      ...source,
      name: source.name ?? troop.name ?? troop.id,
      tier: (source.tier ?? troop.tier ?? TroopTier.TIER_1) as TroopTier,
      attributes: scaleAttributes(rawAttrs),
      category: source.category ?? troop.category,
      supportRole: (source as any).supportRole ?? troop.supportRole
    };
  };
  const getLayerIndex = (troop: Troop, side: 'A' | 'B') => {
    if (side === 'A') {
      const layerIds = battlePlan.layers.map(l => l.id);
      const assigned = battlePlan.assignments[troop.id];
      const fallback = getDefaultLayerId(troop, battlePlan.layers, getTroopTemplate);
      const target = assigned && layerIds.includes(assigned) ? assigned : fallback;
      const idx = layerIds.indexOf(target);
      return idx >= 0 ? idx : 0;
    }
    const enemyLayers = DEFAULT_BATTLE_LAYERS;
    const target = getDefaultLayerId(troop, enemyLayers, getTroopTemplate);
    const idx = enemyLayers.findIndex(l => l.id === target);
    return idx >= 0 ? idx : 0;
  };
  const getTerrainMods = (value: TerrainType) => {
    if (value === 'FOREST') return { rangedHit: -0.12, meleeHit: 0.03, damage: -0.02, defense: 0.05 };
    if (value === 'MOUNTAIN') return { rangedHit: -0.05, meleeHit: -0.02, damage: 0.0, defense: 0.08 };
    if (value === 'SNOW') return { rangedHit: -0.03, meleeHit: -0.03, damage: -0.02, defense: 0.05 };
    if (value === 'DESERT') return { rangedHit: -0.06, meleeHit: -0.02, damage: -0.03, defense: 0.0 };
    if (value === 'RUINS' || value === 'GRAVEYARD') return { rangedHit: -0.04, meleeHit: 0.02, damage: 0.02, defense: 0.04 };
    if (value === 'CAVE') return { rangedHit: -0.15, meleeHit: 0.04, damage: 0.02, defense: 0.05 };
    return { rangedHit: 0.04, meleeHit: 0.0, damage: 0.03, defense: 0.0 };
  };
  const countTroops = (troops: Troop[]) => troops.reduce((sum, t) => sum + (t.count ?? 0), 0);
  const sumAttrs = (troops: Troop[]) => {
    return troops.reduce(
      (acc, t) => {
        const attrs = t.attributes ?? fallbackAttributes((t.tier ?? TroopTier.TIER_1) as TroopTier);
        const count = t.count ?? 0;
        acc.attack += attrs.attack * count;
        acc.defense += attrs.defense * count;
        acc.agility += attrs.agility * count;
        acc.hp += attrs.hp * count;
        acc.range += attrs.range * count;
        acc.morale += attrs.morale * count;
        return acc;
      },
      { attack: 0, defense: 0, agility: 0, hp: 0, range: 0, morale: 0 }
    );
  };
  const avgAttrs = (troops: Troop[]) => {
    const count = Math.max(1, countTroops(troops));
    const total = sumAttrs(troops);
    return {
      attack: total.attack / count,
      defense: total.defense / count,
      agility: total.agility / count,
      hp: total.hp / count,
      range: total.range / count,
      morale: total.morale / count
    };
  };
  const getPhaseCause = (phase: string) => {
    const table: Record<string, string[]> = {
      ranged: ['被乱箭射倒', '被劲弩贯穿', '被箭雨覆盖'],
      heavy: ['被重型火力撕裂', '被巨型投石砸中', '被爆裂炮火吞没'],
      melee: ['在白刃战中倒下', '被长枪贯穿', '被乱刃砍倒'],
      pursuit: ['溃退中被斩杀', '被骑兵追杀', '惊慌踩踏而亡'],
      morale: ['士气崩溃', '阵线溃散', '混乱踩踏']
    };
    const pool = table[phase] ?? table.melee;
    return pool[Math.floor(Math.random() * pool.length)];
  };
  const applyLosses = (troops: Troop[], totalLoss: number, phase: string, sideLabel: 'A' | 'B') => {
    const ordered = [...troops].filter(t => t.count > 0).sort((a, b) => {
      const layerA = getLayerIndex(a, sideLabel);
      const layerB = getLayerIndex(b, sideLabel);
      if (phase === 'ranged' || phase === 'pursuit') return layerB - layerA;
      return layerA - layerB;
    });
    let remaining = totalLoss;
    const casualties: Array<{ name: string; count: number; cause: string }> = [];
    for (const troop of ordered) {
      if (remaining <= 0) break;
      const lost = Math.min(troop.count, remaining);
      if (lost > 0) {
        troop.count -= lost;
        casualties.push({ name: troop.name, count: lost, cause: getPhaseCause(phase) });
        remaining -= lost;
      }
    }
    return casualties;
  };
  const isHeavyUnit = (troop: Troop) => (troop.category ?? (getTroopTemplate(troop.id)?.category)) === 'HEAVY' || troop.id.startsWith('heavy_');
  const isRangedUnit = (troop: Troop) => {
    const attrs = troop.attributes ?? fallbackAttributes((troop.tier ?? TroopTier.TIER_1) as TroopTier);
    return attrs.range >= 60;
  };
  const getActionPhase = (troop: Troop) => {
    if (isRangedUnit(troop)) return 'ranged';
    if (isHeavyUnit(troop)) return 'heavy';
    return 'melee';
  };
  const isCavalryUnit = (troop: Troop) => {
    const text = `${troop.id} ${troop.name}`.toLowerCase();
    return /cavalry|knight|horse|rider|骑|马/.test(text);
  };
  const buildActionQueue = (side: 'A' | 'B', troops: Troop[], width: number) => {
    const result: Array<{
      side: 'A' | 'B';
      troop: Troop;
      groupCount: number;
      nextAct: number;
      interval: number;
      rangedFirst: boolean;
      agility: number;
      range: number;
    }> = [];
    troops.filter(t => t.count > 0).forEach(troop => {
      const attrs = troop.attributes ?? fallbackAttributes((troop.tier ?? TroopTier.TIER_1) as TroopTier);
      const agility = Math.max(20, attrs.agility);
      const range = attrs.range ?? 0;
      const rangedFirst = isRangedUnit(troop);
      const speed = clamp(agility / 100, 0.5, 2.4);
      const interval = 100 / speed;
      const initBoost = (rangedFirst ? 18 : 0) + Math.min(12, range / 20);
      const groups = Math.max(1, Math.min(60, Math.ceil(Math.max(1, troop.count) / Math.max(1, width))));
      for (let i = 0; i < groups; i++) {
        const jitter = Math.random() * 10 + i * 1.5;
        result.push({
          side,
          troop,
          groupCount: Math.max(1, Math.min(width, troop.count)),
          nextAct: Math.max(1, interval - initBoost + jitter),
          interval,
          rangedFirst,
          agility,
          range
        });
      }
    });
    return result;
  };
  const computeLoss = (attacker: Troop, attackerCount: number, defender: Troop[], phase: string, mods: { hit: number; damage: number }, cap: number) => {
    const defCount = countTroops(defender);
    if (attackerCount <= 0 || defCount <= 0) return 0;
    const att = attacker.attributes ?? fallbackAttributes((attacker.tier ?? TroopTier.TIER_1) as TroopTier);
    const defAvg = avgAttrs(defender);
    const phaseBase = phase === 'ranged' ? 0.042 : phase === 'heavy' ? 0.06 : phase === 'pursuit' ? 0.04 : 0.055;
    const hit = clamp(
      0.55 + (att.agility - defAvg.agility) * 0.003 + mods.hit + (phase === 'ranged' ? (att.range - defAvg.range) * 0.0015 : 0),
      0.08,
      0.9
    );
    const moraleFactor = 1 + (att.morale - defAvg.morale) * 0.0025;
    const cavFactor = isCavalryUnit(attacker) ? 1.1 : 1.0;
    const phaseFactor = phase === 'ranged' ? 0.95 : phase === 'heavy' ? 1.05 : phase === 'pursuit' ? 0.9 : 1.0;
    const attScore = (att.attack * 1.0 + att.range * 0.2) * cavFactor * phaseFactor;
    const defScore = defAvg.defense * 1.1 + defAvg.hp * 0.9;
    const ratio = attScore / Math.max(1, attScore + defScore);
    const randomFactor = 0.75 + Math.random() * 0.6;
    const rawP = phaseBase * (0.35 + ratio * 1.25) * hit * moraleFactor * (1 + mods.damage) * randomFactor;
    const minP = 0.0006 + ratio * 0.002;
    const maxP = 0.6;
    const pKill = Math.max(minP, Math.min(maxP, rawP));
    const kills = rollBinomial(attackerCount, pKill);
    return Math.min(defCount, kills, cap);
  };
  let troopsA = battleTroops.map(normalizeTroop);
  let troopsB = enemyForce.troops.map(normalizeTroop);
  const totalCount = countTroops(troopsA) + countTroops(troopsB);
  const battleWidth = Math.max(4, Math.min(20, Math.floor(6 + Math.sqrt(Math.max(1, totalCount)) / 2.5)));
  const keyUnitsA = battleTroops.filter(t => t.id === 'player_main' || t.id.startsWith('hero_')).map(normalizeTroop);
  const enemyLeader = enemyForce.troops.map(normalizeTroop).sort((a, b) => (b.basePower ?? 0) - (a.basePower ?? 0))[0];
  const terrainMods = getTerrainMods(terrain);
  const siegeTarget = battleInfo?.targetLocationId ? locations.find(l => l.id === battleInfo.targetLocationId) ?? null : null;
  const defenderSide: 'A' | 'B' | null = battleInfo?.mode === 'SIEGE' ? 'B' : battleInfo?.mode === 'DEFENSE_AID' ? 'A' : null;
  const defenseDetails = siegeTarget ? getLocationDefenseDetails(siegeTarget) : null;
  const attackerEngines = defenderSide
    ? defenderSide === 'B'
      ? (siegeTarget?.siegeEngines ?? [])
      : (enemyForce.siegeEngines ?? [])
    : [];
  const siegeEngineTotals = attackerEngines.reduce((acc, type) => {
    const stats = siegeEngineCombatStats[type];
    if (!stats) return acc;
    return {
      wallDamage: acc.wallDamage + stats.wallDamage,
      attackerRangedHit: acc.attackerRangedHit + stats.attackerRangedHit,
      attackerRangedDamage: acc.attackerRangedDamage + stats.attackerRangedDamage,
      attackerMeleeHit: acc.attackerMeleeHit + stats.attackerMeleeHit,
      attackerMeleeDamage: acc.attackerMeleeDamage + stats.attackerMeleeDamage,
      defenderRangedHitPenalty: acc.defenderRangedHitPenalty + stats.defenderRangedHitPenalty,
      defenderRangedDamagePenalty: acc.defenderRangedDamagePenalty + stats.defenderRangedDamagePenalty
    };
  }, { wallDamage: 0, attackerRangedHit: 0, attackerRangedDamage: 0, attackerMeleeHit: 0, attackerMeleeDamage: 0, defenderRangedHitPenalty: 0, defenderRangedDamagePenalty: 0 });
  const defenseTotalHp = defenderSide && defenseDetails ? Math.max(0, defenseDetails.wallHp + defenseDetails.mechanismHp) : 0;
  let defenseHp = defenseTotalHp;
  const maxDefenseHp = defenseTotalHp;
  const getPhaseMods = (side: 'A' | 'B', phaseKey: string, defenseActive: boolean) => {
    const baseHit = phaseKey === 'ranged' ? terrainMods.rangedHit : terrainMods.meleeHit;
    let hit = baseHit;
    let damage = terrainMods.damage;
    const stance = battlePlan.stance;
    if (stance === 'ATTACK') {
      if (side === 'A') {
        hit += 0.03;
        damage += 0.05;
      } else {
        hit += 0.02;
        damage += 0.03;
      }
    } else if (stance === 'DEFEND') {
      if (side === 'A') {
        hit -= 0.01;
        damage -= 0.02;
      } else {
        hit -= 0.03;
        damage -= 0.05;
      }
    } else {
      if (side === 'A') {
        hit -= 0.01;
        damage -= 0.03;
      } else {
        hit -= 0.04;
        damage -= 0.07;
      }
    }
    const isDefender = defenseActive && defenderSide === side;
    const isAttacker = defenderSide !== null && defenderSide !== side;
    if (phaseKey === 'ranged') {
      if (isDefender && defenseDetails) {
        hit += defenseDetails.rangedHitBonus - siegeEngineTotals.defenderRangedHitPenalty;
        damage += defenseDetails.rangedDamageBonus - siegeEngineTotals.defenderRangedDamagePenalty;
      } else if (isAttacker) {
        hit += siegeEngineTotals.attackerRangedHit;
        damage += siegeEngineTotals.attackerRangedDamage;
      }
    } else {
      if (isDefender && defenseDetails) {
        hit -= defenseDetails.meleeDamageReduction;
        damage -= defenseDetails.meleeDamageReduction;
      } else if (isAttacker) {
        hit += siegeEngineTotals.attackerMeleeHit;
        damage += siegeEngineTotals.attackerMeleeDamage;
      }
    }
    return { hit: clamp(hit, -0.4, 0.6), damage: clamp(damage, -0.5, 0.65) };
  };
  const rounds: BattleRound[] = [];
  while (countTroops(troopsA) > 0 && countTroops(troopsB) > 0) {
    const roundStartA = countTroops(troopsA);
    const roundStartB = countTroops(troopsB);
    const roundCasualtiesA: Array<{ name: string; count: number; cause: string }> = [];
    const roundCasualtiesB: Array<{ name: string; count: number; cause: string }> = [];
    const keyUnitDamageA: Array<{ name: string; hpLoss: number; cause: string }> = [];
    const keyUnitDamageB: Array<{ name: string; hpLoss: number; cause: string }> = [];
    let siegeDamage = 0;
    const defenseActive = defenderSide !== null && defenseHp > 0;
    if (defenderSide && defenseActive) {
      const attackerCount = defenderSide === 'B' ? countTroops(troopsA) : countTroops(troopsB);
      const pressure = Math.max(8, Math.floor(Math.sqrt(Math.max(1, attackerCount)) * 5));
      const engineDamage = siegeEngineTotals.wallDamage * (0.75 + Math.random() * 0.5);
      siegeDamage = Math.floor(engineDamage + pressure);
      defenseHp = Math.max(0, defenseHp - siegeDamage);
    }
    const actionQueue = [
      ...buildActionQueue('A', troopsA, battleWidth),
      ...buildActionQueue('B', troopsB, battleWidth)
    ].sort((a, b) => {
      if (a.nextAct !== b.nextAct) return a.nextAct - b.nextAct;
      if (a.rangedFirst !== b.rangedFirst) return a.rangedFirst ? -1 : 1;
      if (a.agility !== b.agility) return b.agility - a.agility;
      return b.range - a.range;
    });
    const actionQueuePreview = actionQueue.slice(0, 14).map(item => ({
      name: item.troop.name,
      side: item.side
    }));
    const actionBudget = Math.min(90, Math.max(16, Math.floor(battleWidth * 3 + 8)));
    for (let step = 0; step < actionBudget; step++) {
      if (countTroops(troopsA) <= 0 || countTroops(troopsB) <= 0) break;
      const actor = actionQueue.shift();
      if (!actor) break;
      if (actor.troop.count <= 0) continue;
      const defSide = actor.side === 'A' ? 'B' : 'A';
      const defenders = defSide === 'A' ? troopsA : troopsB;
      if (countTroops(defenders) <= 0) break;
      const actionPhase = getActionPhase(actor.troop);
      const mods = getPhaseMods(actor.side, actionPhase, defenseActive);
      const actionStrength = Math.min(actor.troop.count, actor.groupCount, battleWidth);
      const attackCount = Math.max(1, Math.floor(actionStrength));
      const loss = computeLoss(actor.troop, attackCount, defenders, actionPhase, mods, attackCount);
      if (loss > 0) {
        if (defSide === 'A') roundCasualtiesA.push(...applyLosses(troopsA, loss, actionPhase, 'A'));
        else roundCasualtiesB.push(...applyLosses(troopsB, loss, actionPhase, 'B'));
      }
      actor.nextAct += actor.interval;
      actionQueue.push(actor);
      actionQueue.sort((a, b) => a.nextAct - b.nextAct);
    }
    const lossRatioA = (roundStartA - countTroops(troopsA)) / Math.max(1, roundStartA);
    const lossRatioB = (roundStartB - countTroops(troopsB)) / Math.max(1, roundStartB);
    const moraleAvgA = avgAttrs(troopsA).morale;
    const moraleAvgB = avgAttrs(troopsB).morale;
    if (lossRatioA > 0.3 && Math.random() < 0.35 + clamp((40 - moraleAvgA) / 100, 0, 0.25)) {
      const extraLoss = Math.min(countTroops(troopsA), Math.max(1, Math.floor(roundStartA * (0.03 + Math.random() * 0.05))));
      roundCasualtiesA.push(...applyLosses(troopsA, extraLoss, 'morale', 'A'));
    }
    if (lossRatioB > 0.3 && Math.random() < 0.35 + clamp((40 - moraleAvgB) / 100, 0, 0.25)) {
      const extraLoss = Math.min(countTroops(troopsB), Math.max(1, Math.floor(roundStartB * (0.03 + Math.random() * 0.05))));
      roundCasualtiesB.push(...applyLosses(troopsB, extraLoss, 'morale', 'B'));
    }
    const injuryChanceA = battlePlan.stance === 'ATTACK' ? 0.42 : battlePlan.stance === 'DEFEND' ? 0.32 : 0.22;
    if (roundCasualtiesA.length > 0 && Math.random() < injuryChanceA && keyUnitsA.length > 0) {
      const unit = keyUnitsA[Math.floor(Math.random() * keyUnitsA.length)];
      keyUnitDamageA.push({ name: unit.name, hpLoss: Math.floor(6 + Math.random() * 18), cause: getPhaseCause('melee') });
    }
    if (roundCasualtiesB.length > 0 && Math.random() < 0.35 && enemyLeader) {
      keyUnitDamageB.push({ name: enemyLeader.name, hpLoss: Math.floor(6 + Math.random() * 18), cause: getPhaseCause('melee') });
    }
    const siegeReport = defenderSide
      ? [
        attackerEngines.length > 0 ? `攻城器械：${attackerEngines.map(getSiegeEngineName).join('、')}` : '攻城器械：无',
        defenseHp > 0 ? `城防耐久${defenseHp}/${maxDefenseHp}` : '城防已被击穿',
        siegeDamage > 0 ? `城防受损${siegeDamage}` : ''
      ].filter(Boolean).join('，')
      : '';
    const phaseSummary = `战场宽度${battleWidth}（每方同时接战人数），随机捉对厮杀，每回合行动步数${actionBudget}。行动按敏捷轮转，远程单位优先出手。${siegeReport ? ` ${siegeReport}。` : ''}`;
    rounds.push({
      roundNumber: rounds.length + 1,
      description: phaseSummary,
      casualtiesA: roundCasualtiesA,
      keyUnitDamageA,
      keyUnitDamageB,
      casualtiesB: roundCasualtiesB,
      actionQueue: actionQueuePreview
    });
    if (roundCasualtiesA.length === 0 && roundCasualtiesB.length === 0) {
      const pressureLossA = Math.min(countTroops(troopsA), Math.max(1, Math.floor(roundStartA * 0.01)));
      const pressureLossB = Math.min(countTroops(troopsB), Math.max(1, Math.floor(roundStartB * 0.01)));
      if (pressureLossA > 0) roundCasualtiesA.push(...applyLosses(troopsA, pressureLossA, 'fatigue', 'A'));
      if (pressureLossB > 0) roundCasualtiesB.push(...applyLosses(troopsB, pressureLossB, 'fatigue', 'B'));
    }
  }
  const remainingA = countTroops(troopsA);
  const remainingB = countTroops(troopsB);
  const remainingTroopsA = troopsA.filter(t => t.count > 0).map(t => ({ ...t }));
  const remainingTroopsB = troopsB.filter(t => t.count > 0).map(t => ({ ...t }));
  const outcome: BattleResult['outcome'] = remainingA <= 0 && remainingB <= 0 ? 'B' : remainingB <= 0 ? 'A' : remainingA <= 0 ? 'B' : remainingA >= remainingB ? 'A' : 'B';
  return {
    rounds,
    outcome,
    lootGold: 0,
    renownGained: 0,
    xpGained: 0,
    remainingA: remainingTroopsA,
    remainingB: remainingTroopsB
  };
}
