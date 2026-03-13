import type { Hero, Lord, PlayerState, Troop } from '../../types';
import { TroopTier } from '../../types';

const clampValue = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
const clampTroopAttr = (value: number, min = 1, max = 10) => Math.max(min, Math.min(max, Math.round(value)));

export const getHpRatio = (current: number, max: number) => {
  if (max <= 0) return 0;
  return clampValue(current / max, 0.2, 1);
};

export const HERO_BASE_MULTIPLIER = 0.075;

export const getHeroRoleLabel = (role: Hero['role']) => {
  if (role === 'MAGE') return '法师';
  if (role === 'SWORDSMAN') return '近战剑士';
  if (role === 'ARCHER') return '弓箭手';
  if (role === 'SHIELD') return '近战盾兵';
  return '吟游诗人';
};

export const getHeroPower = (hero: Hero) => {
  const attackScore = hero.attributes.attack * 6;
  const agilityScore = hero.attributes.agility * 4;
  const hpScore = hero.attributes.hp * 0.4;
  const roleBonus = hero.role === 'BARD' ? 8 : hero.role === 'SHIELD' ? 12 : 15;
  const rawPower = attackScore + agilityScore + hpScore + roleBonus;
  const hpRatio = getHpRatio(hero.currentHp, hero.maxHp);
  return Math.max(1, Math.round(rawPower * hpRatio * HERO_BASE_MULTIPLIER * 0.833));
};

export const canHeroBattle = (hero: Hero) => {
  if (!hero.recruited) return false;
  if (hero.maxHp <= 0) return false;
  return hero.currentHp / hero.maxHp >= 0.8 && hero.status === 'ACTIVE';
};

export const buildHeroAttributes = (hero: Hero) => {
  const attack = clampTroopAttr(hero.attributes.attack / 2);
  const agility = clampTroopAttr(hero.attributes.agility / 2);
  const defense = clampTroopAttr(hero.attributes.agility / 2);
  const hp = clampTroopAttr(hero.attributes.hp / 10);
  const range = hero.role === 'ARCHER' || hero.role === 'MAGE' || hero.role === 'BARD' ? 7 : 2;
  const morale = 7;
  return { attack, defense, agility, hp, range, morale };
};

export const buildPlayerAttributes = (current: PlayerState) => {
  const attack = clampTroopAttr(current.attributes.attack / 2);
  const defense = clampTroopAttr(current.attributes.defense / 2);
  const agility = clampTroopAttr((current.attributes.escape ?? 0) + 3);
  const hp = clampTroopAttr(current.maxHp / 12);
  const range = 2;
  const morale = clampTroopAttr(6 + Math.floor(current.level / 8));
  return { attack, defense, agility, hp, range, morale };
};

export const buildHeroTroop = (hero: Hero): Troop => ({
  id: `hero_${hero.id}`,
  name: hero.name,
  tier: TroopTier.TIER_1,
  count: 1,
  xp: hero.xp,
  maxXp: hero.maxXp,
  basePower: getHeroPower(hero),
  cost: 0,
  upgradeCost: 0,
  description: `${hero.personality}。${hero.background}`,
  equipment: [getHeroRoleLabel(hero.role), hero.portrait],
  attributes: buildHeroAttributes(hero)
});

export const buildHeroAttributesFromTroop = (troop: Troop) => {
  if (!troop.attributes) {
    return { attack: 12, hp: 90, agility: 12, leadership: 0 };
  }
  return {
    attack: clampValue(Math.round(troop.attributes.attack / 5), 8, 30),
    hp: clampValue(Math.round(troop.attributes.hp * 1.4), 60, 220),
    agility: clampValue(Math.round(troop.attributes.agility / 5), 8, 30),
    leadership: 0
  };
};

export const buildEnemyLordHero = (lord: Lord, locationId: string): Hero => ({
  id: `enemy_lord_${locationId}`,
  name: lord.name,
  title: lord.title,
  role: 'SWORDSMAN',
  background: `${lord.title}，${lord.temperament}`,
  personality: lord.temperament,
  portrait: `${lord.title}`,
  level: 2,
  xp: 0,
  maxXp: 200,
  attributePoints: 0,
  attributes: { attack: 14, hp: 100, agility: 12, leadership: 0 },
  currentHp: 100,
  maxHp: 100,
  status: 'ACTIVE',
  recruited: false,
  traits: lord.traits ?? [],
  quotes: [],
  chatMemory: [],
  permanentMemory: [],
  chatRounds: 0,
  currentExpression: 'IDLE'
});

export const buildEnemyCommanderHero = (troop: Troop): Hero => {
  const attributes = buildHeroAttributesFromTroop(troop);
  return {
    id: `enemy_commander_${troop.id}`,
    name: troop.name,
    title: '战力最高单位',
    role: 'SWORDSMAN',
    background: troop.description ?? '由战力最高的单位临时担任指挥。',
    personality: '冷静',
    portrait: troop.name,
    level: 2,
    xp: 0,
    maxXp: 200,
    attributePoints: 0,
    attributes,
    currentHp: attributes.hp,
    maxHp: attributes.hp,
    status: 'ACTIVE',
    recruited: false,
    traits: [],
    quotes: [],
    chatMemory: [],
    permanentMemory: [],
    chatRounds: 0,
    currentExpression: 'IDLE'
  };
};

export const pickBestTroop = (troops: Troop[]) => {
  let best: Troop | null = null;
  let bestPower = -Infinity;
  troops.forEach(troop => {
    const unitPower = troop.basePower ?? troop.tier * 10;
    if (unitPower > bestPower) {
      best = troop;
      bestPower = unitPower;
    }
  });
  return best;
};

export const ensureEnemyHeroTroops = (troops: Troop[], lord?: Lord | null, locationId?: string) => {
  if (troops.some(t => t.id.startsWith('hero_'))) return troops;
  if (lord) {
    return [buildHeroTroop(buildEnemyLordHero(lord, locationId ?? lord.fiefId)), ...troops];
  }
  const bestTroop = pickBestTroop(troops);
  if (!bestTroop) return troops;
  return [buildHeroTroop(buildEnemyCommanderHero(bestTroop)), ...troops];
};

export const buildPlayerTroop = (current: PlayerState): Troop => ({
  id: 'player_main',
  name: current.name,
  tier: TroopTier.TIER_1,
  count: 1,
  xp: current.xp,
  maxXp: current.maxXp,
  basePower: Math.max(1, Math.round((current.attributes.attack * 6 + current.attributes.defense * 5 + current.attributes.hp * 0.5) * getHpRatio(current.currentHp, current.maxHp) * HERO_BASE_MULTIPLIER * 0.833)),
  cost: 0,
  upgradeCost: 0,
  description: `指挥官单位（与普通单位同档强度），等级 ${current.level}。`,
  equipment: ['指挥官', '披风'],
  attributes: buildPlayerAttributes(current)
});

export const getBattleTroops = (currentPlayer: PlayerState, currentHeroes: Hero[]) => {
  const heroTroops = currentHeroes.filter(canHeroBattle).map(buildHeroTroop);
  const playerTroops = currentPlayer.status === 'ACTIVE' ? [buildPlayerTroop(currentPlayer)] : [];
  return [...currentPlayer.troops, ...heroTroops, ...playerTroops];
};
