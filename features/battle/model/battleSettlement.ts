import {
  BattleBrief,
  BattleResult,
  EnemyForce,
  FallenHeroRecord,
  FallenRecord,
  Hero,
  Location,
  PlayerState,
  SoldierInstance,
  Troop,
  WoundedTroopEntry,
  WorldBattleReport
} from '../../../types';
import { BattleEngagementMeta } from './battleRuntime';
import { PRESTIGE, computeUnderdogBonus } from '../../../game/systems/prestige';

export type LocalBattleRewards = { gold: number; renown: number; xp: number };

export function calculateLocalBattleRewards(
  enemy: EnemyForce,
  playerLevel: number,
  trainingLevel: number,
  outcome: BattleResult['outcome']
): LocalBattleRewards {
  if (outcome !== 'A') return { gold: 0, renown: 0, xp: 0 };
  const enemyCount = enemy.troops.reduce((sum, t) => sum + (t.count ?? 0), 0);
  const weightedTier = enemy.troops.reduce((sum, t) => sum + (t.tier ?? 1) * (t.count ?? 0), 0);
  const avgTier = enemyCount > 0 ? weightedTier / enemyCount : 1;
  const sizeFactor = Math.max(1, Math.sqrt(Math.max(1, enemyCount)));
  const levelBracket = Math.min(5, 1 + Math.floor(Math.max(0, playerLevel - 1) / 6));
  const tierDelta = Math.max(-4, Math.min(4, avgTier - levelBracket));
  const diffFactor = Math.max(0.6, Math.min(2.0, 1 + tierDelta * 0.25));
  const trainingFactor = 1 + Math.max(0, trainingLevel) * 0.05;
  const baseXp = sizeFactor * Math.max(1, avgTier) * 21;
  const caravanBonus = enemy.difficulty === 'CARAVAN' || enemy.baseTroopId === 'caravan' ? 3.5 : 1;
  const baseGold = sizeFactor * Math.max(1, avgTier) * 14 * Math.max(0.5, enemy.lootPotential ?? 1) * caravanBonus;
  const baseRenown = Math.max(1, Math.round(Math.max(1, avgTier) * Math.log2(enemyCount + 1)));
  return {
    xp: Math.max(10, Math.round(baseXp * diffFactor * trainingFactor)),
    gold: Math.max(0, Math.round(baseGold * diffFactor)),
    renown: Math.max(0, Math.round(baseRenown * (1 + Math.max(0, tierDelta) * 0.08)))
  };
}

export type BattleSettlementInput = {
  prev: PlayerState;
  heroes: Hero[];
  finalResult: BattleResult;
  battleTroops: Troop[];
  activeEnemy: EnemyForce;
  battleInfo: BattleEngagementMeta;
  battleLocationText: string;
  localRewards: { gold: number; renown: number; xp: number };
  locations: Location[];
  getTroopTemplate: (id: string) => Partial<Troop> | undefined;
  getTroopRace: (t: { id: string; name?: string; doctrine?: string; evangelist?: boolean; race?: string }, imposterIds?: Set<string>) => string;
  IMPOSTER_TROOP_IDS: Set<string>;
  canHeroBattle: (hero: Hero) => boolean;
  normalizePlayerSoldiers: (player: PlayerState) => PlayerState;
  markSoldiersWounded: (soldiers: SoldierInstance[], ids: string[], recoverDay: number, note: string) => SoldierInstance[];
  removeSoldiersById: (soldiers: SoldierInstance[], ids: string[]) => SoldierInstance[];
  buildTroopsFromSoldiers: (soldiers: SoldierInstance[]) => Troop[];
  buildWoundedEntriesFromSoldiers: (soldiers: SoldierInstance[], day: number) => WoundedTroopEntry[];
  calculateXpGain: (xp: number, level: number, points: number, maxXp: number, amount: number) => { xp: number; level: number; attributePoints: number; maxXp: number; logs: string[] };
};

export type BattleSettlementResult = {
  nextPlayer: PlayerState;
  nextHeroes: Hero[];
  logs: string[];
  garrisonUpdate?: { locationId: string; garrison: Troop[] };
  battleBrief: BattleBrief;
  worldBattleReport: WorldBattleReport;
};

export function computeBattleSettlement(input: BattleSettlementInput): BattleSettlementResult {
  const {
    prev,
    heroes,
    finalResult,
    battleTroops,
    activeEnemy,
    battleInfo,
    battleLocationText,
    localRewards,
    locations,
    getTroopTemplate,
    getTroopRace,
    IMPOSTER_TROOP_IDS,
    canHeroBattle,
    normalizePlayerSoldiers,
    markSoldiersWounded,
    removeSoldiersById,
    buildTroopsFromSoldiers,
    buildWoundedEntriesFromSoldiers,
    calculateXpGain
  } = input;

  const lootMultiplier = 1 + (prev.attributes.looting * 0.1);
  const newGold = prev.gold + Math.floor(localRewards.gold * lootMultiplier);
  const newRenown = prev.renown + localRewards.renown;

  const logsToAdd: string[] = [];
  let prestigeDelta = 0;
  const outcome = finalResult.outcome;
  if (outcome === 'A') {
    if (battleInfo.mode === 'DEFENSE_AID') {
      prestigeDelta += PRESTIGE.DEFENSE_AID_SUCCESS;
    }
    const playerCount = battleTroops.reduce((s, t) => s + (t.count ?? 0), 0);
    const enemyCount = (activeEnemy.troops ?? []).reduce((s, t) => s + (t.count ?? 0), 0);
    prestigeDelta += computeUnderdogBonus(playerCount, enemyCount);
    if (battleInfo.mode === 'SIEGE' && battleInfo.targetLocationId) {
      const target = locations.find(l => l.id === battleInfo.targetLocationId);
      if (target?.type === 'IMPOSTER_PORTAL') {
        prestigeDelta += PRESTIGE.LIBERATE_SIEGE;
      } else if (target?.factionId && (target.type === 'VILLAGE' || target.type === 'CASTLE' || target.type === 'CITY')) {
        prestigeDelta += target.type === 'VILLAGE' ? PRESTIGE.SACK_VILLAGE : target.type === 'CASTLE' ? PRESTIGE.SACK_CASTLE : PRESTIGE.SACK_CITY;
      }
    }
    const isCaravan = activeEnemy.difficulty === 'CARAVAN' || activeEnemy.baseTroopId === 'caravan';
    if (isCaravan) {
      prestigeDelta += PRESTIGE.RAID_CARAVAN;
    }
  }
  const newPrestige = (prev.prestige ?? 0) + prestigeDelta;
  if (prestigeDelta !== 0) {
    logsToAdd.push(prestigeDelta > 0 ? `威望 +${prestigeDelta}` : `威望 ${prestigeDelta}`);
  }

  const totalPlayerCasualties: Record<string, number> = {};
  const totalPlayerCasualtyDetails: Record<string, { count: number; causes: string[] }> = {};
  const newFallenRecords: FallenRecord[] = [];

  const battleHeroNames = new Set(heroes.filter(canHeroBattle).map(h => h.name));
  const totalPlayerInjuries: Record<string, { hpLoss: number; causes: string[] }> = {};

  const enemyNamePool = (activeEnemy.troops ?? [])
    .filter(t => (t.count ?? 0) > 0)
    .flatMap(t => Array.from({ length: Math.max(1, Math.min(5, Math.floor(t.count / 3))) }).map(() => t.name));
  const pickEnemyName = () =>
    enemyNamePool.length > 0 ? enemyNamePool[Math.floor(Math.random() * enemyNamePool.length)] : activeEnemy.name;
  const resolveEnemyNameFromCause = (cause?: string) => {
    if (!cause) return '';
    const raw = String(cause);
    const match = (activeEnemy.troops ?? []).find(t => raw.includes(t.name));
    return match?.name ?? '';
  };
  const formatDeathCause = (cause?: string) => {
    const base = (cause ?? '').trim();
    const matched = resolveEnemyNameFromCause(base);
    if (matched) return base.includes('击') || base.includes('斩') || base.includes('杀') || base.includes('射') ? base : `被${matched}击杀`;
    if (base) return base;
    return `被${pickEnemyName()}击杀`;
  };
  const formatWoundCause = (cause?: string) => {
    const base = (cause ?? '').trim();
    const matched = resolveEnemyNameFromCause(base);
    if (matched) return base.includes('击') || base.includes('斩') || base.includes('杀') || base.includes('射') ? base : `被${matched}重创`;
    if (base) return base;
    return `被${pickEnemyName()}重创`;
  };

  finalResult.rounds?.forEach(round => {
    const roundCasualtiesA = round.casualtiesA ?? (round as any).playerCasualties ?? [];
    roundCasualtiesA.forEach((c: { name: string; count: number; cause?: string }) => {
      totalPlayerCasualties[c.name] = (totalPlayerCasualties[c.name] || 0) + c.count;
      if (!totalPlayerCasualtyDetails[c.name]) totalPlayerCasualtyDetails[c.name] = { count: 0, causes: [] };
      totalPlayerCasualtyDetails[c.name].count += c.count;
      if (c.cause) totalPlayerCasualtyDetails[c.name].causes.push(c.cause);
    });
    const injuries = round.keyUnitDamageA ?? (round as any).heroInjuries ?? (round as any).playerInjuries ?? [];
    injuries.forEach((injury: any) => {
      const name = String(injury?.name ?? '').trim();
      const loss = Math.max(0, Math.floor(injury?.hpLoss ?? 0));
      if (!name || loss <= 0) return;
      if (!totalPlayerInjuries[name]) totalPlayerInjuries[name] = { hpLoss: 0, causes: [] };
      totalPlayerInjuries[name].hpLoss += loss;
      if (injury.cause) totalPlayerInjuries[name].causes.push(injury.cause);
    });
  });

  const playerSide =
    battleTroops
      .filter(t => (t?.count ?? 0) > 0)
      .slice(0, 16)
      .map(t => `${t.name}x${t.count}`)
      .join('、') || '（无）';
  const enemySide =
    (activeEnemy.troops ?? [])
      .filter(t => (t?.count ?? 0) > 0)
      .slice(0, 16)
      .map(t => `${t.name}x${t.count}`)
      .join('、') || '（无）';
  const includedNames = new Set<string>([...Array.from(battleHeroNames), prev.name]);
  const keyUnitDamageSummary = (() => {
    const events = (finalResult.rounds ?? []).flatMap(round => {
      const roundNumber = typeof round?.roundNumber === 'number' ? round.roundNumber : 0;
      const playerInjuries = round.keyUnitDamageA ?? (round as any).heroInjuries ?? (round as any).playerInjuries ?? [];
      const enemyInjuries = round.keyUnitDamageB ?? (round as any).enemyInjuries ?? [];
      const mapItems = (injuries: any[], sideLabel: string, filterNames?: Set<string>) => {
        if (!Array.isArray(injuries)) return [];
        return injuries
          .map((injury: any) => {
            const name = String(injury?.name ?? '').trim();
            const loss = Math.max(0, Math.floor(injury?.hpLoss ?? 0));
            const cause = String(injury?.cause ?? '').trim();
            return { roundNumber, name, loss, cause, sideLabel };
          })
          .filter(item => item.name && item.loss > 0 && (!filterNames || filterNames.has(item.name)));
      };
      return [...mapItems(playerInjuries, 'A', includedNames), ...mapItems(enemyInjuries, 'B')];
    });
    if (events.length === 0) return '（无）';
    return events
      .slice(0, 24)
      .map(e => `R${e.roundNumber || '?'} ${e.sideLabel}方 ${e.name}(HP -${e.loss})${e.cause ? `：${e.cause}` : ''}`)
      .join('；');
  })();

  const battleBrief: BattleBrief = {
    day: prev.day,
    battleLocation: battleLocationText,
    enemyName: activeEnemy.name,
    outcome: finalResult.outcome,
    playerSide,
    enemySide,
    keyUnitDamageSummary
  };

  const worldBattleReport: WorldBattleReport = {
    id: `battle_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    day: prev.day,
    createdAt: new Date().toLocaleString('zh-CN', { hour12: false }),
    battleLocation: battleLocationText,
    enemyName: activeEnemy.name,
    outcome: finalResult.outcome,
    playerSide,
    enemySide,
    keyUnitDamageSummary,
    rounds: Array.isArray(finalResult.rounds) ? finalResult.rounds.map(r => ({ ...r })) : []
  };

  const playerInjury = totalPlayerInjuries[prev.name];
  const playerCasualtyCount = totalPlayerCasualties[prev.name] || 0;
  let hpLoss = playerInjury?.hpLoss ?? 0;
  if (playerCasualtyCount > 0) {
    hpLoss = Math.max(hpLoss, prev.currentHp);
  }
  const newHp = Math.floor(Math.max(0, prev.currentHp - hpLoss));
  const newStatus = newHp <= 10 ? 'INJURED' : prev.status;

  if (hpLoss > 0) {
    const causeText = playerInjury?.causes?.length ? `，原因：${playerInjury.causes[0]}` : '';
    if (newHp <= 0 || playerCasualtyCount > 0) {
      logsToAdd.push(`你在战斗中重伤退场！${causeText}`);
    } else {
      logsToAdd.push(`你在战斗中受了伤 (HP -${Math.floor(hpLoss)})${causeText}`);
    }
  }
  if (newStatus === 'INJURED' && prev.status !== 'INJURED') logsToAdd.push('你受了重伤，无法继续参与战斗！');

  const medicineSaveChance = prev.attributes.medicine * 0.05;
  const woundedRecoveryDays = Math.max(3, 8 - Math.floor((prev.attributes.medicine ?? 0) / 4));
  const normalizedPlayer = normalizePlayerSoldiers(prev);
  let roster = Array.isArray(normalizedPlayer.soldiers) ? normalizedPlayer.soldiers.map(s => ({ ...s })) : [];
  const playerTroopIds = new Set(prev.troops.map(t => t.id));
  roster = roster.map(s => {
    if (s.status !== 'ACTIVE') return s;
    if (!playerTroopIds.has(s.troopId)) return s;
    const line = `Day ${prev.day} · ${activeEnemy.name} · 参战`;
    if ((s.history ?? []).includes(line)) return s;
    return { ...s, history: [...(s.history ?? []), line] };
  });

  let remainingCasualties = { ...totalPlayerCasualties };
  let garrisonUpdate: { locationId: string; garrison: Troop[] } | undefined;

  if (battleInfo.mode === 'DEFENSE_AID' && battleInfo.targetLocationId) {
    const loc = locations.find(l => l.id === battleInfo.targetLocationId);
    if (loc) {
      const garrison = loc.garrison ?? [];
      const supportLimits = (battleInfo.supportTroops ?? garrison).reduce<Record<string, number>>((acc, troop) => {
        acc[troop.name] = (acc[troop.name] || 0) + troop.count;
        return acc;
      }, {});
      const updatedGarrison = garrison
        .map(t => {
          let loss = remainingCasualties[t.name] || 0;
          if (!supportLimits[t.name]) return t;
          const cap = supportLimits[t.name];
          const actualLoss = Math.min(t.count, loss, cap);
          if (actualLoss > 0) {
            remainingCasualties[t.name] -= actualLoss;
            supportLimits[t.name] -= actualLoss;
          }
          return { ...t, count: t.count - actualLoss };
        })
        .filter(t => t.count > 0);
      garrisonUpdate = { locationId: loc.id, garrison: updatedGarrison };
    }
  }

  const deadByName: Record<string, number> = {};
  const woundedByName: Record<string, number> = {};
  Object.entries(remainingCasualties).forEach(([name, rawCount]) => {
    const casualties = Math.max(0, Math.floor(rawCount || 0));
    if (casualties <= 0) return;
    const troop = prev.troops.find(t => t.name === name);
    if (!troop) return;
    const pool = roster.filter(s => s.troopId === troop.id && s.status === 'ACTIVE');
    if (pool.length === 0) return;
    const shuffled = [...pool].sort(() => Math.random() - 0.5).slice(0, casualties);
    const savedIds: string[] = [];
    const deadIds: string[] = [];
    const causeList = totalPlayerCasualtyDetails[name]?.causes ?? [];
    let causeIndex = 0;
    const nextCause = () => {
      if (causeList.length === 0) return '';
      const cause = causeList[causeIndex % causeList.length];
      causeIndex += 1;
      return cause;
    };
    shuffled.forEach(s => {
      if (Math.random() < medicineSaveChance) savedIds.push(s.id);
      else deadIds.push(s.id);
    });
    if (savedIds.length > 0) {
      const groups = savedIds.reduce<Record<string, string[]>>((acc, id) => {
        const cause = nextCause();
        const key = cause || '受伤';
        (acc[key] ??= []).push(id);
        return acc;
      }, {});
      Object.entries(groups).forEach(([cause, ids]) => {
        const note = `Day ${prev.day} · ${activeEnemy.name} · 负伤（${formatWoundCause(cause)}）`;
        roster = markSoldiersWounded(roster, ids, prev.day + woundedRecoveryDays, note);
      });
      woundedByName[name] = (woundedByName[name] ?? 0) + savedIds.length;
    }
    if (deadIds.length > 0) {
      roster = removeSoldiersById(roster, deadIds);
      deadByName[name] = (deadByName[name] ?? 0) + deadIds.length;
    }
  });

  Object.entries(woundedByName).forEach(([name, count]) => {
    if (count > 0) logsToAdd.push(`医术救回了 ${count} 名 ${name}（重伤，预计 ${woundedRecoveryDays} 天恢复）。`);
  });
  Object.entries(deadByName).forEach(([name, count]) => {
    if (count > 0) {
      const sampleCause = totalPlayerCasualtyDetails[name]?.causes?.[0];
      newFallenRecords.push({
        id: `fallen_${Date.now()}_${Math.random()}`,
        unitName: name,
        count,
        day: prev.day,
        battleName: activeEnemy.name,
        cause: formatDeathCause(sampleCause)
      });
    }
  });

  const survivingTroops = buildTroopsFromSoldiers(roster);
  const survivingTroopsMeta = survivingTroops.map(t => {
    const tmpl = getTroopTemplate(t.id);
    const isRoach = t.id.startsWith('roach_') || getTroopRace(t, IMPOSTER_TROOP_IDS) === 'ROACH';
    const isMaxed = !(tmpl?.upgradeTargetId ?? t.upgradeTargetId);
    return { troop: t, isRoach, isMaxed };
  });

  const deadHeroRecords: FallenHeroRecord[] = [];
  const updatedHeroesBase = heroes.map(hero => {
    if (!canHeroBattle(hero)) return hero;
    const heroInjury = totalPlayerInjuries[hero.name];
    let nextHero = hero;
    if (heroInjury?.hpLoss) {
      const newHeroHp = Math.max(0, Math.floor(hero.currentHp - heroInjury.hpLoss));
      const status = newHeroHp / hero.maxHp >= 0.8 ? 'ACTIVE' : 'INJURED';
      const causeText = heroInjury.causes.length > 0 ? `，原因：${heroInjury.causes[0]}` : '';
      nextHero = { ...nextHero, currentHp: newHeroHp, status };
      if (newHeroHp <= 0) {
        logsToAdd.push(`${hero.name} 重伤退场！${causeText}`);
      } else {
        logsToAdd.push(`${hero.name} 受伤 (HP -${heroInjury.hpLoss})${causeText}`);
      }
    }
    const casualtyCount = totalPlayerCasualties[hero.name] || 0;
    if (casualtyCount > 0) {
      nextHero = { ...nextHero, currentHp: 0, status: 'INJURED' };
      logsToAdd.push(`${hero.name} 重伤退场！`);
    }
    if (nextHero.currentHp <= 0) {
      const injurySeverity = heroInjury?.hpLoss ? Math.min(1, heroInjury.hpLoss / Math.max(1, hero.maxHp)) : 0;
      let deathChance = 0.08 + injurySeverity * 0.1 + (casualtyCount > 0 ? 0.08 : 0);
      deathChance *= 1 - Math.min(0.9, prev.attributes.medicine * 0.06);
      deathChance = Math.max(0.01, Math.min(0.35, deathChance));
      if (Math.random() < deathChance) {
        nextHero = { ...nextHero, status: 'DEAD', currentExpression: 'DEAD', currentHp: 0 };
        newFallenRecords.push({
          id: `fallen_${Date.now()}_${Math.random()}`,
          unitName: `${hero.name}（英雄）`,
          count: 1,
          day: prev.day,
          battleName: activeEnemy.name,
          cause: heroInjury?.causes?.[0] ? `英雄殒命：${heroInjury.causes[0]}` : '英雄殒命'
        });
        deadHeroRecords.push({
          id: `fallen_hero_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
          hero: { ...hero, ...nextHero, recruited: false },
          day: prev.day,
          battleName: activeEnemy.name,
          cause: heroInjury?.causes?.[0] ? `英雄殒命：${heroInjury.causes[0]}` : '英雄殒命'
        });
        logsToAdd.push(`【噩耗】${hero.name} 没能撑过这次重伤，永远离开了队伍。`);
      }
    }
    return nextHero;
  });

  const eligibleTroops = survivingTroopsMeta.filter(item => !item.isRoach && !item.isMaxed);
  const eligibleHeroes = updatedHeroesBase.filter(
    hero => hero.recruited && hero.status !== 'DEAD' && battleHeroNames.has(hero.name)
  );
  const playerEligible = prev.status === 'ACTIVE';
  const shareCount = eligibleTroops.length + eligibleHeroes.length + (playerEligible ? 1 : 0);
  const xpShare = shareCount > 0 ? Math.floor(localRewards.xp / shareCount) : 0;

  if (xpShare > 0) {
    roster = roster.map(s => {
      if (s.status !== 'ACTIVE') return s;
      const tmpl = getTroopTemplate(s.troopId);
      const race = tmpl
        ? getTroopRace({ id: tmpl.id, name: tmpl.name, doctrine: tmpl.doctrine, evangelist: tmpl.evangelist, race: tmpl.race })
        : getTroopRace({ id: s.troopId, name: s.name } as any);
      const isRoach = race === 'ROACH';
      const isMaxed = !(tmpl?.upgradeTargetId ?? (tmpl?.upgradeTargetIds?.[0] ?? ''));
      if (isRoach) return { ...s, xp: 0 };
      if (isMaxed) return s;
      return { ...s, xp: Math.min(s.maxXp, s.xp + xpShare) };
    });
  }
  const nextTroopsFromRoster = buildTroopsFromSoldiers(roster);

  const updatedHeroes = updatedHeroesBase.map(hero => {
    const eligible = hero.recruited && hero.status !== 'DEAD' && battleHeroNames.has(hero.name);
    if (!eligible || xpShare <= 0) return hero;
    const { xp, level, attributePoints, maxXp, logs: heroLogs } = calculateXpGain(
      hero.xp,
      hero.level,
      hero.attributePoints,
      hero.maxXp,
      xpShare
    );
    if (heroLogs.length > 0) logsToAdd.push(...heroLogs.map(log => `${hero.name}：${log}`));
    return { ...hero, xp, level, attributePoints, maxXp };
  });

  const playerXpResult =
    playerEligible && xpShare > 0
      ? calculateXpGain(prev.xp, prev.level, prev.attributePoints, prev.maxXp, xpShare)
      : { xp: prev.xp, level: prev.level, attributePoints: prev.attributePoints, maxXp: prev.maxXp, logs: [] as string[] };
  logsToAdd.push(...playerXpResult.logs);

  const nextPlayer: PlayerState = {
    ...normalizedPlayer,
    gold: newGold,
    renown: newRenown,
    prestige: newPrestige,
    soldiers: roster,
    troops: nextTroopsFromRoster,
    woundedTroops: buildWoundedEntriesFromSoldiers(roster, prev.day),
    currentHp: newHp,
    status: newStatus as 'ACTIVE' | 'INJURED',
    fallenRecords: [...prev.fallenRecords, ...newFallenRecords],
    fallenHeroes: [...(prev.fallenHeroes ?? []), ...deadHeroRecords],
    xp: playerXpResult.xp,
    level: playerXpResult.level,
    attributePoints: playerXpResult.attributePoints,
    maxXp: playerXpResult.maxXp
  };

  return {
    nextPlayer,
    nextHeroes: updatedHeroes.filter(h => h.status !== 'DEAD'),
    logs: logsToAdd,
    garrisonUpdate,
    battleBrief,
    worldBattleReport
  };
}

export type TrainingXpRewardsInput = {
  prev: PlayerState;
  heroes: Hero[];
  xpAmount: number;
  getTroopTemplate: (id: string) => Partial<Troop> | undefined;
  getTroopRace: (t: { id: string; name?: string; doctrine?: string; evangelist?: boolean; race?: string }, imposterIds?: Set<string>) => string;
  IMPOSTER_TROOP_IDS: Set<string>;
  canHeroBattle: (hero: Hero) => boolean;
  normalizePlayerSoldiers: (player: PlayerState) => PlayerState;
  buildTroopsFromSoldiers: (soldiers: SoldierInstance[]) => Troop[];
  buildWoundedEntriesFromSoldiers: (soldiers: SoldierInstance[], day: number) => WoundedTroopEntry[];
  calculateXpGain: (xp: number, level: number, points: number, maxXp: number, amount: number) => { xp: number; level: number; attributePoints: number; maxXp: number; logs?: string[] };
};

export type TrainingXpRewardsResult = {
  nextPlayer: PlayerState;
  nextHeroes: Hero[];
  log: string;
};

export function computeTrainingXpRewards(input: TrainingXpRewardsInput): TrainingXpRewardsResult | null {
  const {
    prev,
    heroes,
    xpAmount,
    getTroopTemplate,
    getTroopRace,
    IMPOSTER_TROOP_IDS,
    canHeroBattle,
    normalizePlayerSoldiers,
    buildTroopsFromSoldiers,
    buildWoundedEntriesFromSoldiers,
    calculateXpGain
  } = input;

  const eligibleTroops = prev.troops.filter(t => t.count > 0 && getTroopRace(t, IMPOSTER_TROOP_IDS) !== 'ROACH');
  const eligibleHeroes = heroes.filter(hero => hero.recruited && canHeroBattle(hero) && hero.currentHp > 0);
  const playerEligible = prev.currentHp > 0;
  const shareCount = eligibleTroops.length + eligibleHeroes.length + (playerEligible ? 1 : 0);
  const xpShare = shareCount > 0 ? Math.floor(xpAmount / shareCount) : 0;

  if (xpShare <= 0) return null;

  const normalized = normalizePlayerSoldiers(prev);
  let roster = Array.isArray(normalized.soldiers) ? normalized.soldiers.map(s => ({ ...s })) : [];
  roster = roster.map(s => {
    if (s.status !== 'ACTIVE') return s;
    const tmpl = getTroopTemplate(s.troopId);
    const race = tmpl
      ? getTroopRace({ id: tmpl.id, name: tmpl.name, doctrine: tmpl.doctrine, evangelist: tmpl.evangelist, race: tmpl.race }, IMPOSTER_TROOP_IDS)
      : getTroopRace({ id: s.troopId, name: s.name } as any, IMPOSTER_TROOP_IDS);
    if (race === 'ROACH') return { ...s, xp: 0 };
    return { ...s, xp: Math.min(s.maxXp, s.xp + xpShare) };
  });
  const nextTroops = buildTroopsFromSoldiers(roster);
  const updatedHeroes = heroes.map(hero => {
    if (!hero.recruited) return hero;
    if (!canHeroBattle(hero) || hero.currentHp <= 0) return hero;
    const { xp, level, attributePoints, maxXp } = calculateXpGain(hero.xp, hero.level, hero.attributePoints, hero.maxXp, xpShare);
    return { ...hero, xp, level, attributePoints, maxXp };
  });
  const playerXpResult = playerEligible
    ? calculateXpGain(prev.xp, prev.level, prev.attributePoints, prev.maxXp, xpShare)
    : { xp: prev.xp, level: prev.level, attributePoints: prev.attributePoints, maxXp: prev.maxXp };

  const nextPlayer: PlayerState = {
    ...prev,
    troops: nextTroops,
    soldiers: roster,
    woundedTroops: buildWoundedEntriesFromSoldiers(roster, prev.day),
    xp: playerXpResult.xp,
    level: playerXpResult.level,
    attributePoints: playerXpResult.attributePoints,
    maxXp: playerXpResult.maxXp
  };

  return {
    nextPlayer,
    nextHeroes: updatedHeroes,
    log: `训练场演练结束，获得经验 +${xpAmount}（每单位分配 ${xpShare}）。`
  };
}
