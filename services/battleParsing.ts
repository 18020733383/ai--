import { BattleResult } from '../types';

export const parseOutcome = (value: unknown): BattleResult["outcome"] | null => {
  if (value === "A" || value === "B") return value;
  if (value === "VICTORY") return "A";
  if (value === "DEFEAT" || value === "RETREAT") return "B";
  const text = typeof value === 'string' ? value : '';
  if (!text) return null;
  if (text.trim() === 'A' || text.includes('A方') || text.includes('A 方')) return "A";
  if (text.trim() === 'B' || text.includes('B方') || text.includes('B 方')) return "B";
  if (text.includes('胜')) return "A";
  if (text.includes('撤') || text.includes('逃')) return "B";
  if (text.includes('败') || text.includes('负') || text.includes('溃')) return "B";
  if (text.includes('我方') || text.includes('玩家')) return "A";
  if (text.includes('敌军') || text.includes('敌方')) return "B";
  return null;
};

const parseCasualtyValue = (raw: unknown) => {
  if (typeof raw === 'number') return { count: Math.max(0, Math.floor(raw)), cause: "阵亡" };
  if (typeof raw !== 'string') return { count: 0, cause: "阵亡" };
  const countMatch = raw.match(/(\d+)/);
  const count = countMatch ? Math.max(0, parseInt(countMatch[1], 10)) : 0;
  const causeMatch = raw.match(/死因[:：]\s*([^)]*)/);
  const cause = causeMatch?.[1]?.trim() || raw.replace(/^\d+\s*人?\s*阵亡\s*/i, '').replace(/[()]/g, '').trim() || "阵亡";
  return { count, cause };
};

const parseCasualtiesFromString = (raw: string) => {
  if (!raw || raw.trim() === '0') return [];
  return raw.split(/[,，]/g)
    .map(part => part.trim())
    .filter(Boolean)
    .map(part => {
      const match = part.match(/(\d+)\s*[xX×]\s*([^\d]+)$/);
      if (match) {
        const count = Math.max(0, parseInt(match[1], 10));
        const name = match[2].trim();
        return { name, count, cause: "阵亡" };
      }
      return null;
    })
    .filter((item): item is { name: string; count: number; cause: string } => !!item && item.name.length > 0);
};

export const parseCasualties = (record: unknown) => {
  if (!record) return [];
  if (Array.isArray(record)) {
    return record
      .map((item: any) => ({
        name: typeof item?.name === 'string' ? item.name : '',
        count: typeof item?.count === 'number' ? Math.max(0, Math.floor(item.count)) : 0,
        cause: typeof item?.cause === 'string' && item.cause ? item.cause : "阵亡"
      }))
      .filter(item => item.name && item.count >= 0);
  }
  if (typeof record === 'string') {
    return parseCasualtiesFromString(record);
  }
  if (typeof record !== 'object') return [];
  return Object.entries(record as Record<string, unknown>)
    .map(([name, value]) => {
      const { count, cause } = parseCasualtyValue(value);
      return { name, count, cause };
    })
    .filter(item => item.name && item.count >= 0);
};

const parseInjuryValue = (raw: unknown) => {
  if (typeof raw === 'number') return { hpLoss: Math.max(0, Math.floor(raw)), cause: "受伤" };
  if (typeof raw !== 'string') return { hpLoss: 0, cause: "受伤" };
  const lossMatch = raw.match(/(\d+)/);
  const hpLoss = lossMatch ? Math.max(0, parseInt(lossMatch[1], 10)) : 0;
  const causeMatch = raw.match(/原因[:：]\s*([^)]*)/);
  const cause = causeMatch?.[1]?.trim() || raw.replace(/^\d+\s*(hp|血|点)?\s*/i, '').replace(/[()]/g, '').trim() || "受伤";
  return { hpLoss, cause };
};

export const parseInjuries = (record: unknown) => {
  if (!record) return [];
  if (Array.isArray(record)) {
    return record
      .map((item: any) => ({
        name: typeof item?.name === 'string' ? item.name : '',
        hpLoss: typeof item?.hpLoss === 'number' ? Math.max(0, Math.floor(item.hpLoss)) : 0,
        cause: typeof item?.cause === 'string' && item.cause ? item.cause : "受伤"
      }))
      .filter(item => item.name);
  }
  if (typeof record === 'string') {
    return record.split(/[,，]/g)
      .map(part => part.trim())
      .filter(Boolean)
      .map(part => {
        const match = part.match(/([^\d]+)\s*[-–—]?\s*(\d+)/);
        if (match) {
          const name = match[1].trim();
          const hpLoss = Math.max(0, parseInt(match[2], 10));
          return { name, hpLoss, cause: "受伤" };
        }
        return null;
      })
      .filter((item): item is { name: string; hpLoss: number; cause: string } => !!item && item.name.length > 0);
  }
  if (typeof record !== 'object') return [];
  return Object.entries(record as Record<string, unknown>)
    .map(([name, value]) => {
      const { hpLoss, cause } = parseInjuryValue(value);
      return { name, hpLoss, cause };
    })
    .filter(item => item.name);
};

export const normalizeOpenAIBattle = (parsed: any): BattleResult | null => {
  if (!parsed) return null;
  if (Array.isArray(parsed.rounds) && parsed.outcome) {
    const rounds = parsed.rounds.map((round: any, index: number) => {
      const number = round.roundNumber ?? round.round_number ?? round.round ?? index + 1;
      const description = round.description ?? round.summary ?? '';
      const casualtiesA = parseCasualties(
        round.casualtiesA ??
        round.casualties_a ??
        round.playerCasualties ??
        round.player_casualties ??
        {}
      );
      const keyUnitDamageA = parseInjuries(
        round.keyUnitDamageA ??
        round.key_unit_damage_a ??
        round.heroInjuries ??
        round.hero_injuries ??
        round.playerInjuries ??
        round.player_injuries ??
        {}
      );
      const keyUnitDamageB = parseInjuries(
        round.keyUnitDamageB ??
        round.key_unit_damage_b ??
        round.enemyInjuries ??
        round.enemy_injuries ??
        {}
      );
      const casualtiesB = parseCasualties(
        round.casualtiesB ??
        round.casualties_b ??
        round.enemyCasualties ??
        round.enemy_casualties ??
        {}
      );
      return { roundNumber: number, description, casualtiesA, keyUnitDamageA, keyUnitDamageB, casualtiesB };
    });
    return {
      rounds,
      outcome: parsed.outcome,
      lootGold: Number.isFinite(parsed.lootGold) ? parsed.lootGold : 0,
      renownGained: Number.isFinite(parsed.renownGained) ? parsed.renownGained : 0,
      xpGained: Number.isFinite(parsed.xpGained) ? parsed.xpGained : 0
    };
  }
  const source = parsed.battle_report ?? parsed.battleReport ?? parsed.report ?? parsed;
  const outcome = parseOutcome(
    source?.final_result?.battle_status ??
    source?.battle_status ??
    source?.battle_summary?.outcome ??
    source?.outcome ??
    parsed?.outcome ??
    source?.final_result?.winner ??
    source?.winner
  );
  const roundsInput = Array.isArray(source?.rounds) ? source.rounds : Array.isArray(parsed?.rounds) ? parsed.rounds : [];
  if (!outcome || roundsInput.length === 0) return null;
  const rounds = roundsInput.map((round: any, index: number) => {
    const number = round.roundNumber ?? round.round_number ?? round.round ?? index + 1;
    const description = round.description ?? round.summary ?? '';
    const casualties = round.casualties_this_round ?? {};
    const casualtiesA = parseCasualties(
      round.casualtiesA ??
      round.casualties_a ??
      round.playerCasualties ??
      round.player_casualties ??
      casualties.A ??
      casualties.a ??
      casualties.player ??
      {}
    );
    const keyUnitDamageA = parseInjuries(
      round.keyUnitDamageA ??
      round.key_unit_damage_a ??
      round.heroInjuries ??
      round.hero_injuries ??
      round.playerInjuries ??
      round.player_injuries ??
      casualties.keyUnitDamageA ??
      casualties.key_unit_damage_a ??
      casualties.heroInjuries ??
      casualties.hero_injuries ??
      casualties.playerInjuries ??
      casualties.player_injuries ??
      {}
    );
    const keyUnitDamageB = parseInjuries(
      round.keyUnitDamageB ??
      round.key_unit_damage_b ??
      round.enemyInjuries ??
      round.enemy_injuries ??
      casualties.keyUnitDamageB ??
      casualties.key_unit_damage_b ??
      casualties.enemyInjuries ??
      casualties.enemy_injuries ??
      {}
    );
    const casualtiesB = parseCasualties(
      round.casualtiesB ??
      round.casualties_b ??
      round.enemyCasualties ??
      round.enemy_casualties ??
      casualties.B ??
      casualties.b ??
      casualties.enemy ??
      {}
    );
    return { roundNumber: number, description, casualtiesA, keyUnitDamageA, keyUnitDamageB, casualtiesB };
  });
  const lootGold = Number.isFinite(source?.lootGold) ? source.lootGold : 0;
  const renownGained = Number.isFinite(source?.renownGained) ? source.renownGained : 0;
  const xpGained = Number.isFinite(source?.xpGained) ? source.xpGained : 0;
  return { rounds, outcome, lootGold, renownGained, xpGained };
};
