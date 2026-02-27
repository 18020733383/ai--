
import React, { useState, useEffect, useRef } from 'react';
import { AIProvider, AltarDoctrine, AltarTroopDraft, Troop, PlayerState, GameView, Location, EnemyForce, BattleResult, BattleBrief, TroopTier, TerrainType, BattleRound, PlayerAttributes, RecruitOffer, Parrot, ParrotVariant, FallenRecord, BuildingType, SiegeEngineType, ConstructionQueueItem, SiegeEngineQueueItem, Hero, HeroChatLine, HeroPermanentMemory, PartyDiaryEntry, WorldBattleReport, MineralId, MineralPurity, Enchantment, StayParty, LordFocus, RaceId, TroopRace, Lord, NegotiationResult, WorldDiplomacyState } from './types';
import { FACTIONS, INITIAL_PLAYER_STATE, INITIAL_HERO_ROSTER, LOCATIONS, ENEMY_TYPES, TROOP_TEMPLATES, createTroop, MAP_WIDTH, MAP_HEIGHT, PARROT_VARIANTS, ENEMY_QUOTES, parrotMischiefEvents, parrotChatter, IMPOSTER_TROOP_IDS, WORLD_BOOK, RACE_RELATION_MATRIX, RACE_LABELS, getTroopRace, TROOP_RACE_LABELS } from './constants';
import { AltarTroopTreeResult, buildBattlePrompt, buildHeroChatPrompt, chatWithHero, chatWithUndead, listOpenAIModels, proposeShapedTroop, resolveBattle, resolveNegotiation, ShaperDecision } from './services/geminiService';
import { Button } from './components/Button';
import { BigMapView } from './components/BigMapView';
import { BattleView } from './components/BattleView';
import { BattleResultView } from './components/BattleResultView';
import { ChangelogModal } from './components/ChangelogModal';
import { SettingsModal } from './components/SettingsModal';
import { MapListModal } from './components/MapListModal';
import { WorldTroopStatsModal } from './components/WorldTroopStatsModal';
import { CHANGELOG } from './data/changelog';
import { WorldBoardView } from './views/WorldBoardView';
import { TroopArchiveView } from './views/TroopArchiveView';
import { PartyView } from './views/PartyView';
import { TownView } from './views/TownView';
import { AsylumView } from './views/AsylumView';
import { MarketView } from './views/MarketView';
import { MysteriousCaveView } from './views/MysteriousCaveView';
import { TrainingView } from './views/TrainingView';
import { CharacterView } from './views/CharacterView';
import { BanditEncounterView } from './views/BanditEncounterView';
import { HeroChatView } from './views/HeroChatView';
import { GameOverView } from './views/GameOverView';
import { 
  Map as MapIcon, MapPin, Coins, Trophy, Users, ShieldAlert, Skull, ArrowRight, Home, Swords, 
  Trees, Mountain, Snowflake, Sun, Tent, Shield, Ghost, Crosshair, Zap, 
  Flame, Flag, Scroll, User, Heart, Plus, Sword, Anchor, Trash2,
  Syringe, Brain, Beer, Bird, ShoppingBag, MessageCircle, ChevronUp, ChevronDown, Utensils, EyeOff, Bomb, Info, Settings, Hammer, AlertTriangle, RefreshCw, Coffee, Star, History, Lock, Activity
} from 'lucide-react';

// Helper for XP calculation to avoid duplication and state race conditions
const calculateXpGain = (currentXp: number, currentLevel: number, currentPoints: number, currentMaxXp: number, amount: number) => {
  let xp = currentXp + amount;
  let level = currentLevel;
  let points = currentPoints;
  let maxXp = currentMaxXp;
  const logs: string[] = [];
  
  while (xp >= maxXp) {
    xp -= maxXp;
    level++;
    points += 2; 
    maxXp = Math.floor(maxXp * 1.5);
    logs.push(`升级了！当前等级：${level}，获得属性点！`);
  }
  return { xp, level, attributePoints: points, maxXp, logs };
};

const DEFAULT_BATTLE_LAYERS = [
  { id: 'layer-1', name: '先锋', hint: '承受正面冲击，适合盾兵与重装近战。' },
  { id: 'layer-2', name: '前锋', hint: '主力突击与机动部队，短兵相接。' },
  { id: 'layer-3', name: '中坚', hint: '稳定战线，承担主力输出与支援。' },
  { id: 'layer-4', name: '后卫', hint: '远程火力与施法单位，保持安全距离。' },
  { id: 'layer-5', name: '预备', hint: '保留机动与护卫，随时补位。' }
];

const HERO_EMOTIONS: Hero['currentExpression'][] = ['ANGRY', 'IDLE', 'SILENT', 'AWKWARD', 'HAPPY', 'SAD', 'AFRAID', 'SURPRISED', 'DEAD'];
type NegotiationState = {
  status: 'idle' | 'loading' | 'result';
  result: NegotiationResult | null;
  locked: boolean;
};
type NegotiationLine = { role: 'PLAYER' | 'ENEMY'; text: string };

const MINERAL_PURITY_LABELS: Record<MineralPurity, string> = {
  1: '裂纹',
  2: '粗炼',
  3: '稳定',
  4: '高纯',
  5: '完美'
};

const MINERAL_META: Record<MineralId, { name: string; effect: string }> = {
  NULL_CRYSTAL: { name: '空指针结晶', effect: '无视防御、闪避、隐匿' },
  STACK_OVERFLOW: { name: '溢出堆栈', effect: '攻速加成、多重打击、冷却缩减' },
  DEADLOCK_SHARD: { name: '死循环碎片', effect: '反伤、永动续航、控制免疫' }
};

const STAY_PARTY_LOCATION_TYPES: Location['type'][] = ['CITY', 'CASTLE', 'ROACH_NEST', 'IMPOSTER_PORTAL'];

const isUndeadFortressLocation = (location: Location) => location.type === 'GRAVEYARD' && location.id === 'death_city';
const isCastleLikeLocation = (location: Location) => location.type === 'CASTLE' || isUndeadFortressLocation(location);

const buildStayPartyTroops = (entries: Array<{ id: string; count: number }>) =>
  entries
    .map(entry => {
      const template = TROOP_TEMPLATES[entry.id];
      return template ? { ...template, count: entry.count, xp: 0 } : null;
    })
    .filter(Boolean) as Troop[];

const buildStayPartiesForLocation = (location: Location): StayParty[] => {
  const seed = location.id.split('').reduce((sum, ch) => sum + ch.charCodeAt(0), 0);
  const firstIndex = (seed % 90) + 1;
  const secondIndex = ((seed + 17) % 90) + 1;
  const faction = FACTIONS.find(f => f.id === location.factionId);
  const factionLabel = faction?.shortName ?? '帝国';
  const cityTitles = ['城卫团', '巡防团', '商路护卫团', '苍弦弓团', '长街守军'];
  const cityMobileTitles = ['机动旅', '斥候营', '巡猎队', '游击团', '轻骑团'];
  const castleTitles = ['要塞守备团', '铁壁卫队', '壁垒军', '山脊卫团'];
  const roachTitles = ['啃噬虫群', '裂甲虫潮', '腐蚀虫巢', '黑潮虫群'];
  const imposterTitles = ['裂隙先锋群', '故障行军群', '镜像突袭群', '扭曲军势'];
  const pickTitle = (titles: string[], index: number) => titles[index % titles.length];
  if (location.type === 'CITY') {
    const titleA = pickTitle(cityTitles, firstIndex);
    const titleB = pickTitle(cityMobileTitles, secondIndex);
    return [
      {
        id: `${location.id}_legion_${firstIndex}`,
        name: `${factionLabel}·${location.name}${titleA}`,
        troops: buildStayPartyTroops([
          { id: 'imperial_swordsman', count: 240 },
          { id: 'imperial_shieldbearer', count: 180 },
          { id: 'imperial_crossbowman', count: 140 },
          { id: 'knight', count: 60 }
        ]),
        owner: 'NEUTRAL'
      },
      {
        id: `${location.id}_legion_${secondIndex}`,
        name: `${factionLabel}·${location.name}${titleB}`,
        troops: buildStayPartyTroops([
          { id: 'footman', count: 200 },
          { id: 'imperial_shieldbearer', count: 160 },
          { id: 'imperial_crossbowman', count: 120 },
          { id: 'knight', count: 50 }
        ]),
        owner: 'NEUTRAL'
      }
    ];
  }
  if (location.type === 'CASTLE') {
    const title = pickTitle(castleTitles, firstIndex);
    return [
      {
        id: `${location.id}_legion_${firstIndex}`,
        name: `${factionLabel}·${location.name}${title}`,
        troops: buildStayPartyTroops([
          { id: 'footman', count: 160 },
          { id: 'imperial_shieldbearer', count: 120 },
          { id: 'imperial_crossbowman', count: 90 },
          { id: 'knight', count: 35 }
        ]),
        owner: 'NEUTRAL'
      }
    ];
  }
  if (location.type === 'ROACH_NEST') {
    const titleA = pickTitle(roachTitles, firstIndex);
    const titleB = pickTitle(roachTitles, secondIndex + 3);
    return [
      {
        id: `${location.id}_swarm_${firstIndex}`,
        name: `蟑螂${titleA}`,
        troops: buildStayPartyTroops([
          { id: 'roach_brawler', count: 260 },
          { id: 'roach_pikeman', count: 260 },
          { id: 'roach_slinger', count: 180 },
          { id: 'roach_shieldling', count: 180 },
          { id: 'roach_aerial_duelist', count: 60 }
        ]),
        owner: 'ENEMY'
      },
      {
        id: `${location.id}_swarm_${secondIndex}`,
        name: `蟑螂${titleB}`,
        troops: buildStayPartyTroops([
          { id: 'roach_aerial_lancer', count: 80 },
          { id: 'roach_aerial_harrier', count: 80 },
          { id: 'roach_aerial_guard', count: 80 },
          { id: 'roach_chitin_commander', count: 30 },
          { id: 'roach_giant_halberdier', count: 40 }
        ]),
        owner: 'ENEMY'
      }
    ];
  }
  if (location.type === 'IMPOSTER_PORTAL') {
    const titleA = pickTitle(imposterTitles, firstIndex);
    const titleB = pickTitle(imposterTitles, secondIndex + 2);
    return [
      {
        id: `${location.id}_legion_${firstIndex}`,
        name: `伪人${titleA}`,
        troops: buildStayPartyTroops([
          { id: 'void_larva', count: 380 },
          { id: 'glitch_pawn', count: 380 },
          { id: 'static_noise_walker', count: 260 },
          { id: 'null_fragment', count: 260 },
          { id: 'imposter_light_infantry', count: 220 },
          { id: 'imposter_short_bowman', count: 140 }
        ]),
        owner: 'ENEMY'
      },
      {
        id: `${location.id}_legion_${secondIndex}`,
        name: `伪人${titleB}`,
        troops: buildStayPartyTroops([
          { id: 'imposter_spearman', count: 260 },
          { id: 'imposter_slinger', count: 240 },
          { id: 'entropy_acolyte', count: 140 },
          { id: 'pixel_shifter', count: 120 },
          { id: 'syntax_error_scout', count: 120 },
          { id: 'imposter_heavy_infantry', count: 80 },
          { id: 'imposter_longbowman', count: 80 }
        ]),
        owner: 'ENEMY'
      }
    ];
  }
  return [];
};

const seedStayParties = (locations: Location[]) =>
  locations.map(location => {
    if (!STAY_PARTY_LOCATION_TYPES.includes(location.type)) return location;
    if (location.stayParties && location.stayParties.length > 0) return location;
    return { ...location, stayParties: buildStayPartiesForLocation(location) };
  });

const MINE_CONFIGS: Partial<Record<Location['type'], { mineralId: MineralId; crystalName: string; effect: string }>> = {
  VOID_BUFFER_MINE: { mineralId: 'NULL_CRYSTAL', crystalName: '空指针结晶', effect: '无视防御、闪避、隐匿' },
  MEMORY_OVERFLOW_MINE: { mineralId: 'STACK_OVERFLOW', crystalName: '溢出堆栈', effect: '攻速加成、多重打击、冷却缩减' },
  LOGIC_PARADOX_MINE: { mineralId: 'DEADLOCK_SHARD', crystalName: '死循环碎片', effect: '反伤、永动续航、控制免疫' }
};

const ENCHANTMENT_RECIPES: Array<{ enchantment: Enchantment; costs: { mineralId: MineralId; purityMin: MineralPurity; amount: number }[] }> = [
  {
    enchantment: {
      id: 'null_pointer',
      name: '空指针异常',
      category: '空间逻辑类',
      description: '每次攻击有25%概率无视护甲，造成130%伤害。战力+10%。',
      powerBonus: 0.1
    },
    costs: [{ mineralId: 'NULL_CRYSTAL', purityMin: 2, amount: 1 }]
  },
  {
    enchantment: {
      id: 'stealth_process',
      name: '隐匿进程',
      category: '空间逻辑类',
      description: '战斗前2回合远程命中率-25%，近战命中率-10%。战力+8%。',
      powerBonus: 0.08
    },
    costs: [{ mineralId: 'NULL_CRYSTAL', purityMin: 2, amount: 1 }]
  },
  {
    enchantment: {
      id: 'coordinate_offset',
      name: '坐标偏移',
      category: '空间逻辑类',
      description: '被远程攻击时有30%概率完全闪避。战力+7%。',
      powerBonus: 0.07
    },
    costs: [{ mineralId: 'NULL_CRYSTAL', purityMin: 1, amount: 1 }]
  },
  {
    enchantment: {
      id: 'phase_cut',
      name: '相位切割',
      category: '空间逻辑类',
      description: '攻击有20%概率穿透格挡并追加20%伤害。战力+11%。',
      powerBonus: 0.11
    },
    costs: [{ mineralId: 'NULL_CRYSTAL', purityMin: 3, amount: 1 }]
  },
  {
    enchantment: {
      id: 'recursive_strike',
      name: '递归打击',
      category: '运算过载类',
      description: '每次普攻追加2次命中（总3段），追加段为45%伤害。战力+12%。',
      powerBonus: 0.12
    },
    costs: [{ mineralId: 'STACK_OVERFLOW', purityMin: 2, amount: 1 }]
  },
  {
    enchantment: {
      id: 'multi_threading',
      name: '多线程并行',
      category: '运算过载类',
      description: '攻速+20%，控制持续时间-20%。战力+9%。',
      powerBonus: 0.09
    },
    costs: [{ mineralId: 'STACK_OVERFLOW', purityMin: 2, amount: 1 }]
  },
  {
    enchantment: {
      id: 'cache_boost',
      name: '高速缓冲区',
      category: '运算过载类',
      description: '技能冷却-25%，每3回合额外获得1次行动。战力+13%。',
      powerBonus: 0.13
    },
    costs: [{ mineralId: 'STACK_OVERFLOW', purityMin: 3, amount: 1 }]
  },
  {
    enchantment: {
      id: 'instruction_reorder',
      name: '指令乱序',
      category: '运算过载类',
      description: '命中后有25%概率令目标下回合失去行动。战力+10%。',
      powerBonus: 0.1
    },
    costs: [{ mineralId: 'STACK_OVERFLOW', purityMin: 1, amount: 1 }]
  },
  {
    enchantment: {
      id: 'infinite_loop',
      name: '死循环护盾',
      category: '逻辑锁死类',
      description: '受到的35%伤害延迟到下一回合结算。战力+12%。',
      powerBonus: 0.12
    },
    costs: [{ mineralId: 'DEADLOCK_SHARD', purityMin: 2, amount: 1 }]
  },
  {
    enchantment: {
      id: 'read_only',
      name: '只读模式',
      category: '逻辑锁死类',
      description: '每5回合触发1回合免疫控制与负面状态，但该回合无法被治疗。战力+10%。',
      powerBonus: 0.1
    },
    costs: [{ mineralId: 'DEADLOCK_SHARD', purityMin: 2, amount: 1 }]
  },
  {
    enchantment: {
      id: 'boolean_not',
      name: '逻辑反转',
      category: '逻辑锁死类',
      description: '25%概率将受到的直接伤害转为等量治疗，25%概率将治疗转为伤害。战力+14%。',
      powerBonus: 0.14
    },
    costs: [{ mineralId: 'DEADLOCK_SHARD', purityMin: 3, amount: 1 }]
  },
  {
    enchantment: {
      id: 'state_freeze',
      name: '状态冻结',
      category: '逻辑锁死类',
      description: '被控制时持续时间减半（向上取整），硬直-40%。战力+11%。',
      powerBonus: 0.11
    },
    costs: [{ mineralId: 'DEADLOCK_SHARD', purityMin: 1, amount: 1 }]
  },
  {
    enchantment: {
      id: 'root_access',
      name: '权限提升',
      category: '系统底层类',
      description: '攻击有30%概率打断施法或蓄力，并使目标下回合伤害-20%。战力+16%。',
      powerBonus: 0.16
    },
    costs: [
      { mineralId: 'NULL_CRYSTAL', purityMin: 3, amount: 1 },
      { mineralId: 'STACK_OVERFLOW', purityMin: 3, amount: 1 }
    ]
  },
  {
    enchantment: {
      id: 'rollback',
      name: '回滚机制',
      category: '系统底层类',
      description: '生命低于30%时触发一次，回复最大生命40%并清除负面状态（每战1次）。战力+20%。',
      powerBonus: 0.2
    },
    costs: [
      { mineralId: 'STACK_OVERFLOW', purityMin: 4, amount: 1 },
      { mineralId: 'DEADLOCK_SHARD', purityMin: 4, amount: 1 }
    ]
  },
  {
    enchantment: {
      id: 'junk_code',
      name: '乱码污染',
      category: '系统底层类',
      description: '命中后使目标命中率-25%、防御-15%，持续2回合。战力+15%。',
      powerBonus: 0.15
    },
    costs: [
      { mineralId: 'NULL_CRYSTAL', purityMin: 3, amount: 1 },
      { mineralId: 'DEADLOCK_SHARD', purityMin: 3, amount: 1 }
    ]
  },
  {
    enchantment: {
      id: 'kernel_fault',
      name: '内核错断',
      category: '系统底层类',
      description: '战斗前2回合敌军速度-20%、命中-15%。战力+17%。',
      powerBonus: 0.17
    },
    costs: [
      { mineralId: 'NULL_CRYSTAL', purityMin: 4, amount: 1 },
      { mineralId: 'STACK_OVERFLOW', purityMin: 4, amount: 1 }
    ]
  }
];

const lordFamilyNames = ['洛', '伊', '雷', '凯', '萨', '赫', '沃', '格', '塞', '艾', '菲', '卡'];
const lordGivenNames = ['兰', '维恩', '赫尔', '赛恩', '米娅', '罗莎', '阿什', '卡尔', '诺亚', '艾琳', '里昂', '希尔'];
const lordTemperaments = ['强硬', '稳重', '多疑', '豪爽', '谨慎', '冷峻', '宽厚', '冷静'];
const lordTraits = ['好战', '务实', '忠诚', '谨慎', '野心', '仁慈', '狡黠', '守旧', '热情', '冷静'];
const lordFocuses: LordFocus[] = ['WAR', 'TRADE', 'DEFENSE', 'DIPLOMACY'];
const lordTitleByType = (type: Location['type']) => type === 'CITY' ? '城主' : type === 'CASTLE' ? '堡主' : type === 'GRAVEYARD' ? '墓主' : type === 'ROACH_NEST' ? '巢主' : '领主';
const getLordSeed = (id: string) => id.split('').reduce((sum, ch) => sum + ch.charCodeAt(0), 0);
const pickLordValue = <T,>(list: T[], seed: number, offset: number = 0) => list[(seed + offset) % list.length];
const roachLordNames = ['甲壳母', '壳鸣者', '孵化主', '触须王', '蜕壳者', '螯刃统领', '脉囊司巢'];
const undeadLordNames = ['黯焰守陵者', '骨律祀官', '腐棺司主', '冥火执令', '遗誓看守者', '黑纱侯影', '亡钟聆者'];
const getDefaultGarrisonBaseLimit = (location: Location) => {
  const existingCount = (location.garrison ?? []).reduce((sum, t) => sum + t.count, 0);
  if (existingCount > 0) return existingCount;
  if (location.type === 'CITY') return 1940;
  if (location.type === 'CASTLE') return 600;
  if (location.type === 'VILLAGE') return 67;
  return 0;
};
const buildLordPartyTroops = (location: Location) => {
  const pickTroop = (id: string, count: number) => {
    const template = TROOP_TEMPLATES[id];
    return template ? { ...template, count, xp: 0 } : null;
  };
  if (location.type === 'CITY') {
    return [pickTroop('militia', 120), pickTroop('footman', 80), pickTroop('hunter', 50)].filter(Boolean) as Troop[];
  }
  if (location.type === 'CASTLE') {
    return [pickTroop('footman', 60), pickTroop('hunter', 30)].filter(Boolean) as Troop[];
  }
  if (location.type === 'GRAVEYARD') {
    return [
      pickTroop('skeleton_warrior', 80),
      pickTroop('undead_bone_javelin', 70),
      pickTroop('undead_grave_arbalist', 60),
      pickTroop('specter', 40),
      pickTroop('undead_musician', 30)
    ].filter(Boolean) as Troop[];
  }
  if (location.type === 'VILLAGE') {
    return [pickTroop('peasant', 30), pickTroop('hunter', 15)].filter(Boolean) as Troop[];
  }
  if (location.type === 'ROACH_NEST') {
    return [
      pickTroop('roach_brawler', 80),
      pickTroop('roach_pikeman', 70),
      pickTroop('roach_slinger', 60),
      pickTroop('roach_shieldling', 50)
    ].filter(Boolean) as Troop[];
  }
  return [];
};
const getTroopCount = (troops: Troop[]) => troops.reduce((sum, t) => sum + t.count, 0);
const buildLordStayParty = (locationId: string, lord: Lord) => ({
  id: `lord_party_${lord.id}`,
  name: `${lord.name}的部队`,
  troops: lord.partyTroops,
  owner: 'NEUTRAL' as const,
  lordId: lord.id
});
const buildLocationLord = (location: Location) => {
  const isUndeadFortress = location.type === 'GRAVEYARD' && location.id === 'death_city';
  if (location.type !== 'CITY' && location.type !== 'CASTLE' && location.type !== 'VILLAGE' && location.type !== 'ROACH_NEST' && !isUndeadFortress) return null;
  const seed = getLordSeed(location.id);
  const traitA = pickLordValue(lordTraits, seed, 5);
  const traitB = pickLordValue(lordTraits, seed, 9);
  const traits = traitA === traitB ? [traitA] : [traitA, traitB];
  const focus = pickLordValue(lordFocuses, seed, 7);
  const faction = FACTIONS.find(f => f.id === location.factionId);
  const roachName = roachLordNames[seed % roachLordNames.length];
  const undeadName = undeadLordNames[seed % undeadLordNames.length];
  const partyTroops = buildLordPartyTroops(location);
  const partyMaxCount = getTroopCount(partyTroops);
  return {
    id: `lord_${location.id}`,
    name: location.type === 'ROACH_NEST' ? roachName : location.type === 'GRAVEYARD' ? undeadName : `${pickLordValue(lordFamilyNames, seed)}${pickLordValue(lordGivenNames, seed, 3)}`,
    title: lordTitleByType(location.type),
    factionId: faction?.id ?? location.factionId,
    fiefId: location.id,
    traits,
    temperament: pickLordValue(lordTemperaments, seed, 12),
    focus,
    relation: 0,
    currentLocationId: location.id,
    state: 'RESTING',
    stateSinceDay: 1,
    partyTroops,
    partyMaxCount
  };
};
const ensureLocationLords = (list: Location[]) => {
  return list.map(loc => {
    const isUndeadFortress = loc.type === 'GRAVEYARD' && loc.id === 'death_city';
    if (loc.type !== 'CITY' && loc.type !== 'CASTLE' && loc.type !== 'VILLAGE' && loc.type !== 'ROACH_NEST' && !isUndeadFortress) return loc;
    const currentLord = loc.lord && loc.lord.factionId === loc.factionId && loc.lord.fiefId === loc.id ? loc.lord : null;
    const lord = currentLord ?? buildLocationLord(loc);
    if (!lord) return loc;
    const baseLimit = loc.garrisonBaseLimit ?? getDefaultGarrisonBaseLimit(loc);
    return { ...loc, lord, garrisonBaseLimit: baseLimit };
  });
};
const syncLordPresence = (list: Location[], lords: Lord[]) => {
  const lordsById = new Map(lords.map(lord => [lord.id, lord]));
  return list.map(loc => {
    const owner = loc.lord ? lordsById.get(loc.lord.id) ?? loc.lord : loc.lord;
    const preservedParties = (loc.stayParties ?? []).filter(party => !party.lordId || !lordsById.has(party.lordId));
    const visitingLords = lords.filter(lord => lord.currentLocationId === loc.id && !lord.travelDaysLeft);
    const lordParties = visitingLords.map(lord => buildLordStayParty(loc.id, lord));
    return { ...loc, lord: owner, stayParties: [...preservedParties, ...lordParties] };
  });
};
const buildInitialWorld = () => {
  const seeded = seedStayParties(LOCATIONS);
  const withLords = ensureLocationLords(seeded);
  const lords = withLords.flatMap(loc => (loc.lord ? [{ ...loc.lord }] : []));
  const syncedLocations = syncLordPresence(withLords, lords).map(loc => {
    if (loc.claimFactionId) return loc;
    if (loc.factionId) return { ...loc, claimFactionId: loc.factionId };
    return loc;
  });
  return { locations: syncedLocations, lords };
};

export default function App() {
  const initialWorld = React.useMemo(() => buildInitialWorld(), []);
  const [player, setPlayer] = useState<PlayerState>(INITIAL_PLAYER_STATE);
  const [heroes, setHeroes] = useState<Hero[]>(() => {
    const cityIds = LOCATIONS.filter(l => l.type === 'CITY').map(l => l.id);
    return INITIAL_HERO_ROSTER.map(hero => {
      if (cityIds.length === 0 || Math.random() < 0.45) return { ...hero };
      const cityId = cityIds[Math.floor(Math.random() * cityIds.length)];
      const stayDays = Math.floor(Math.random() * 4) + 2;
      return { ...hero, locationId: cityId, stayDays };
    });
  });
  const [locations, setLocations] = useState<Location[]>(() => initialWorld.locations);
  const [lords, setLords] = useState<Lord[]>(() => initialWorld.lords);
  const [view, setView] = useState<GameView>('MAP');
  const [currentLocation, setCurrentLocation] = useState<Location | null>(null);
  const [activeEnemy, setActiveEnemy] = useState<EnemyForce | null>(null);
  const [negotiationState, setNegotiationState] = useState<NegotiationState>({
    status: 'idle',
    result: null,
    locked: false
  });
  const [negotiationDialogue, setNegotiationDialogue] = useState<NegotiationLine[]>([]);
  const [negotiationInput, setNegotiationInput] = useState('');
  const [negotiationOpen, setNegotiationOpen] = useState(false);
  const [negotiationError, setNegotiationError] = useState<string | null>(null);
  const [battleResult, setBattleResult] = useState<BattleResult | null>(null);
  const [currentRoundIndex, setCurrentRoundIndex] = useState(0); 
  const [isBattling, setIsBattling] = useState(false);
  const [battleSnapshot, setBattleSnapshot] = useState<{ playerTroops: Troop[]; enemyTroops: Troop[] } | null>(null);
  const [recentBattleBriefs, setRecentBattleBriefs] = useState<BattleBrief[]>([]);
  const [worldBattleReports, setWorldBattleReports] = useState<WorldBattleReport[]>([]);
  const [worldDiplomacy, setWorldDiplomacy] = useState<WorldDiplomacyState>(() => buildInitialWorldDiplomacy());
  const [battleTimeline, setBattleTimeline] = useState<{ day: number; count: number }[]>(() => ([
    { day: INITIAL_PLAYER_STATE.day, count: initialWorld.locations.filter(loc => loc.activeSiege).length }
  ]));
  const [battlePlan, setBattlePlan] = useState<{
    stance: 'ATTACK' | 'DEFEND' | 'PROTECT';
    layers: { id: string; name: string; hint: string }[];
    assignments: Record<string, string | null>;
    protectedTroopIds: string[];
  }>({
    stance: 'ATTACK',
    layers: DEFAULT_BATTLE_LAYERS,
    assignments: {},
    protectedTroopIds: []
  });
  const [draggingTroopId, setDraggingTroopId] = useState<string | null>(null);
  
  // Camera & Movement
  const [camera, setCamera] = useState({ x: 0, y: 0 }); // Offset in pixels
  const [zoom, setZoom] = useState(1); // Map zoom level
  const [targetZoom, setTargetZoom] = useState(1);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  
  // Movement State - JS Animation for smooth zoom/move
  const [targetPosition, setTargetPosition] = useState<{x: number, y: number} | null>(null);
  const movementRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);
  const zoomRef = useRef(zoom);
  const targetZoomRef = useRef(targetZoom);
  const cameraRef = useRef(camera);
  const isDraggingRef = useRef(isDragging);
  const zoomAnchorRef = useRef<{ screen: { x: number; y: number }; world: { x: number; y: number } } | null>(null);

  // Training Ground State
  const [trainingMyArmy, setTrainingMyArmy] = useState<{id: string, count: number}[]>([{id: 'knight', count: 10}]);
  const [trainingEnemyArmy, setTrainingEnemyArmy] = useState<{id: string, count: number}[]>([{id: 'skeleton_warrior', count: 20}]);
  const [trainInputMy, setTrainInputMy] = useState({ id: 'militia', count: 10 });
  const [trainInputEnemy, setTrainInputEnemy] = useState({ id: 'peasant', count: 10 });

  // Town View State
  const [townTab, setTownTab] = useState<'RECRUIT' | 'TAVERN' | 'GARRISON' | 'LOCAL_GARRISON' | 'DEFENSE' | 'MEMORIAL' | 'WORK' | 'SIEGE' | 'OWNED' | 'COFFEE_CHAT' | 'MINING' | 'FORGE' | 'ROACH_LURE' | 'IMPOSTER_STATIONED' | 'LORD' | 'ALTAR' | 'ALTAR_RECRUIT' | 'MAGICIAN_LIBRARY'>('RECRUIT');
  const [workDays, setWorkDays] = useState(1);
  const [miningDays, setMiningDays] = useState(2);
  const [roachLureDays, setRoachLureDays] = useState(2);
  const [miningState, setMiningState] = useState<{
    isActive: boolean;
    locationId: string;
    mineralId: MineralId;
    totalDays: number;
    daysPassed: number;
    yieldByPurity: Record<MineralPurity, number>;
  } | null>(null);
  const [roachLureState, setRoachLureState] = useState<{
    isActive: boolean;
    locationId: string;
    totalDays: number;
    daysPassed: number;
    recruitedByTroopId: Record<string, number>;
  } | null>(null);
  const [forgeTroopIndex, setForgeTroopIndex] = useState<number | null>(null);
  const [forgeEnchantmentId, setForgeEnchantmentId] = useState<string | null>(null);
  const [undeadChatInput, setUndeadChatInput] = useState('');
  const [undeadDialogue, setUndeadDialogue] = useState<{ role: 'PLAYER' | 'UNDEAD'; text: string }[]>([
    { role: 'UNDEAD', text: '欢迎光临，咖啡不热，但记忆还在冒烟。' }
  ]);
  const [isUndeadChatLoading, setIsUndeadChatLoading] = useState(false);
  const [activeHeroChatId, setActiveHeroChatId] = useState<string | null>(null);
  const [heroChatInput, setHeroChatInput] = useState('');
  const [isHeroChatLoading, setIsHeroChatLoading] = useState(false);
  const [partyDiary, setPartyDiary] = useState<PartyDiaryEntry[]>([]);

  // Asylum State
  const [gachaResult, setGachaResult] = useState<Troop | null>(null);

  // Hover state for Battle Tooltip
  const [hoveredTroop, setHoveredTroop] = useState<Troop | null>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [hoveredLocation, setHoveredLocation] = useState<Location | null>(null);

  const [customTroopTemplates, setCustomTroopTemplates] = useState<Record<string, Omit<Troop, 'count' | 'xp'>>>({});
  const [shaperDialogue, setShaperDialogue] = useState<{ role: 'PLAYER' | 'NPC'; text: string }[]>([
    { role: 'NPC', text: '别站门口挡风。说吧，你想让我缝出什么兵？' }
  ]);
  const [shaperInput, setShaperInput] = useState('');
  const [shaperProposal, setShaperProposal] = useState<{
    decision: ShaperDecision;
    npcReply: string;
    price: number;
    troopTemplate?: Omit<Troop, 'count' | 'xp'>;
    troopForPrompt?: Pick<Troop, 'name' | 'tier' | 'basePower' | 'maxXp' | 'upgradeCost' | 'upgradeTargetId' | 'description' | 'equipment' | 'attributes'>;
  } | null>(null);
  const [isShaperLoading, setIsShaperLoading] = useState(false);
  const [altarDialogues, setAltarDialogues] = useState<Record<string, { role: 'PLAYER' | 'NPC'; text: string }[]>>({});
  const [altarDrafts, setAltarDrafts] = useState<Record<string, AltarDoctrine>>({});
  const [altarProposals, setAltarProposals] = useState<Record<string, { doctrine: AltarDoctrine; result: AltarTroopTreeResult; prevResult?: AltarTroopTreeResult }>>({});
  const [isAltarLoading, setIsAltarLoading] = useState(false);
  const [altarRecruitDays, setAltarRecruitDays] = useState(2);
  const [altarRecruitState, setAltarRecruitState] = useState<{
    isActive: boolean;
    locationId: string;
    totalDays: number;
    daysPassed: number;
    recruitedByTroopId: Record<string, number>;
  } | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [openAIBaseUrl, setOpenAIBaseUrl] = useState('https://api.openai.com');
  const [openAIKey, setOpenAIKey] = useState('');
  const [openAIModel, setOpenAIModel] = useState('');
  const [aiProvider, setAIProvider] = useState<AIProvider>('CUSTOM');
  const [doubaoApiKey, setDoubaoApiKey] = useState('');
  const [geminiApiKey, setGeminiApiKey] = useState('');
  const [openAIProfiles, setOpenAIProfiles] = useState<{ id: string; name: string; baseUrl: string; key: string; model: string }[]>([]);
  const [activeOpenAIProfileId, setActiveOpenAIProfileId] = useState<string | null>(null);
  const [openAIProfileName, setOpenAIProfileName] = useState('默认');
  const [openAIModels, setOpenAIModels] = useState<string[]>([]);
  const [isModelsLoading, setIsModelsLoading] = useState(false);
  const [battleStreamEnabled, setBattleStreamEnabled] = useState(false);
  const [battleResolutionMode, setBattleResolutionMode] = useState<'AI' | 'PROGRAM'>('AI');
  const [settingsError, setSettingsError] = useState<string | null>(null);
  const [saveDataText, setSaveDataText] = useState('');
  const [saveDataNotice, setSaveDataNotice] = useState<string | null>(null);
  const [battleError, setBattleError] = useState<string | null>(null);
  const [battleMeta, setBattleMeta] = useState<{ mode: 'FIELD' | 'SIEGE' | 'DEFENSE_AID'; targetLocationId?: string; siegeContext?: string; supportTroops?: Troop[]; supportLabel?: string } | null>(null);
  const [pendingBattleMeta, setPendingBattleMeta] = useState<{ mode: 'FIELD' | 'SIEGE' | 'DEFENSE_AID'; targetLocationId?: string; siegeContext?: string; supportTroops?: Troop[]; supportLabel?: string } | null>(null);
  const [pendingBattleIsTraining, setPendingBattleIsTraining] = useState(false);
  const [isBattleStreaming, setIsBattleStreaming] = useState(false);
  const [isBattleResultFinal, setIsBattleResultFinal] = useState(true);
  const [isChangelogOpen, setIsChangelogOpen] = useState(false);
  const [isMapListOpen, setIsMapListOpen] = useState(false);
  const [mapListQuery, setMapListQuery] = useState('');
  const [mapListTypeFilter, setMapListTypeFilter] = useState<Location['type'] | 'ALL' | 'MINE'>('ALL');
  const [isWorldTroopStatsOpen, setIsWorldTroopStatsOpen] = useState(false);
  const [worldTroopRaceFilter, setWorldTroopRaceFilter] = useState<TroopRace | 'ALL'>('ALL');
  const [worldTroopTierFilter, setWorldTroopTierFilter] = useState<TroopTier | 'ALL'>('ALL');
  const [worldTroopIdFilter, setWorldTroopIdFilter] = useState('ALL');
  const [troopArchiveQuery, setTroopArchiveQuery] = useState('');
  const [troopArchiveFactionFilter, setTroopArchiveFactionFilter] = useState<'ALL' | 'HUMAN' | 'ROACH' | 'IMPOSTER' | 'ASYLUM' | 'UNDEAD' | 'HOTPOT' | 'CUSTOM'>('ALL');
  const [troopArchiveTierFilter, setTroopArchiveTierFilter] = useState<TroopTier | 'ALL'>('ALL');
  const [troopArchiveCategoryFilter, setTroopArchiveCategoryFilter] = useState<'ALL' | 'NORMAL' | 'HEAVY'>('ALL');
  const [troopArchiveSort, setTroopArchiveSort] = useState<'TIER' | 'NAME' | 'TOTAL' | 'ATTACK' | 'DEFENSE' | 'AGILITY' | 'HP' | 'RANGE' | 'MORALE'>('TIER');
  const [troopArchivePage, setTroopArchivePage] = useState(1);
  const [troopArchivePageSize, setTroopArchivePageSize] = useState(12);
  const [partyCategoryFilter, setPartyCategoryFilter] = useState<'ALL' | 'NORMAL' | 'HEAVY'>('ALL');
  const [heroDialogue, setHeroDialogue] = useState<{ heroId: string; text: string } | null>(null);

  // Work State
  const [workState, setWorkState] = useState<{
    isActive: boolean;
    totalDays: number;
    daysPassed: number;
    dailyIncome: number;
    accumulatedIncome: number;
  } | null>(null);

  // Logs
  const [logs, setLogs] = useState<string[]>(["欢迎来到《卡拉迪亚编年史》。拖动地图探索，滚轮缩放，点击据点移动。"]);
  const [isLogExpanded, setIsLogExpanded] = useState(false);
  const mapRef = useRef<HTMLDivElement>(null);
  const hasArrivedRef = useRef(false);
  const travelTokenRef = useRef(0);
  const activeTravelTokenRef = useRef(0);
  const processedTravelTokenRef = useRef<number | null>(null);
  const playerRef = useRef(player);
  const heroesRef = useRef(heroes);
  const lordsRef = useRef(lords);
  const battleTimelineRef = useRef(battleTimeline);
  const worldDiplomacyRef = useRef(worldDiplomacy);
  const partyDiaryRef = useRef(partyDiary);
  const defenseAidMetaRef = useRef<{ locationId: string; delta: number; ratio: number } | null>(null);
  const undeadChatListRef = useRef<HTMLDivElement>(null);
  const shaperChatListRef = useRef<HTMLDivElement>(null);
  const altarChatListRef = useRef<HTMLDivElement>(null);
  const heroChatListRef = useRef<HTMLDivElement>(null);
  const heroChatTimersRef = useRef<Record<string, number[]>>({});

  useEffect(() => {
    setNegotiationState({
      status: 'idle',
      result: null,
      locked: false
    });
    setNegotiationDialogue([]);
    setNegotiationInput('');
    setNegotiationOpen(false);
    setNegotiationError(null);
  }, [activeEnemy?.id, activeEnemy?.name, activeEnemy?.troops?.length]);

    // Work Loop
    useEffect(() => {
        if (!workState?.isActive) return;
        
        if (workState.daysPassed >= workState.totalDays) {
          const finishTimer = setTimeout(() => {
            addLog(`打工结束，共获得 ${workState.accumulatedIncome} 第纳尔。`);
            setWorkState(null);
            
            // Return to town view after work is finished
            if (currentLocation) {
              setView('TOWN');
              setTownTab('WORK');
            }
          }, 1500);
          return () => clearTimeout(finishTimer);
        }
    
        const timer = setTimeout(() => {
          if (!currentLocation) return;
          processDailyCycle(currentLocation, 0, 1, workState.dailyIncome, true);
          
          setWorkState(prev => prev ? {
            ...prev,
            daysPassed: prev.daysPassed + 1,
            accumulatedIncome: prev.accumulatedIncome + prev.dailyIncome
          } : null);
        }, 1200); // 1.2s per day
    
        return () => clearTimeout(timer);
    }, [workState]);

    useEffect(() => {
      if (!miningState?.isActive) return;
      if (miningState.daysPassed >= miningState.totalDays) {
        const finishTimer = setTimeout(() => {
          const summary = Object.keys(miningState.yieldByPurity)
            .map(key => Number(key) as MineralPurity)
            .map(purity => {
              const amount = miningState.yieldByPurity[purity];
              return amount > 0 ? `${MINERAL_PURITY_LABELS[purity]}${amount}` : null;
            })
            .filter(Boolean)
            .join('，');
          addLog(summary ? `采矿结束，收获：${summary}。` : '采矿结束，但没有挖到有效矿石。');
          setMiningState(null);
          if (currentLocation) {
            setView('TOWN');
            setTownTab('MINING');
          }
        }, 1500);
        return () => clearTimeout(finishTimer);
      }

      const timer = setTimeout(() => {
        if (!currentLocation) return;
        const config = MINE_CONFIGS[currentLocation.type];
        if (!config) return;
        processDailyCycle(currentLocation, 0, 1, 0, true);
        const purity = rollMineralPurity();
        const crystalName = MINERAL_PURITY_LABELS[purity] + config.crystalName;
        setPlayer(prev => {
          const nextMinerals = { ...prev.minerals };
          const record = { ...nextMinerals[config.mineralId] };
          record[purity] = (record[purity] ?? 0) + 1;
          nextMinerals[config.mineralId] = record;
          return { ...prev, minerals: nextMinerals };
        });
        addLog(`挖矿：获得 ${crystalName}。`);
        setMiningState(prev => prev ? {
          ...prev,
          daysPassed: prev.daysPassed + 1,
          yieldByPurity: {
            ...prev.yieldByPurity,
            [purity]: prev.yieldByPurity[purity] + 1
          }
        } : null);
      }, 1200);

      return () => clearTimeout(timer);
    }, [miningState]);

    useEffect(() => {
      if (!roachLureState?.isActive) return;
      if (roachLureState.daysPassed >= roachLureState.totalDays) {
        const finishTimer = setTimeout(() => {
          const summary = Object.entries(roachLureState.recruitedByTroopId)
            .filter(([, count]) => count > 0)
            .map(([troopId, count]) => {
              const name = getTroopTemplate(troopId)?.name ?? troopId;
              return `${name}x${count}`;
            })
            .join('，');
          addLog(summary ? `吸引蟑螂结束，收获：${summary}。` : '吸引蟑螂结束，但它们好像都跑去钻地板缝了。');
          setRoachLureState(null);
          if (currentLocation) {
            setView('TOWN');
            setTownTab('ROACH_LURE');
          }
        }, 1500);
        return () => clearTimeout(finishTimer);
      }

      const timer = setTimeout(() => {
        if (!currentLocation) return;
        processDailyCycle(currentLocation, 0, 1, 0, true);

        const tier1Pool = ['roach_brawler', 'roach_pikeman', 'roach_slinger', 'roach_shieldling'];
        const troopId = tier1Pool[Math.floor(Math.random() * tier1Pool.length)];
        const current = playerRef.current;
        const currentCount = current.troops.reduce((a, b) => a + b.count, 0);
        const maxTroops = 20 + current.attributes.leadership * 5;
        const availableSpace = maxTroops - currentCount;
        if (availableSpace <= 0) {
          addLog('队伍人数已达上限，吸引蟑螂中止。');
          setRoachLureState(null);
          if (currentLocation) {
            setView('TOWN');
            setTownTab('ROACH_LURE');
          }
          return;
        }

        let count = Math.min(randomInt(1, 3), availableSpace);
        if (Math.random() < 0.2) {
          count = 0;
          addLog('蟑螂从阴影里发出嘲讽：就这点诱饵？你还是去喂鸽子吧。');
        }
        const template = getTroopTemplate(troopId);
        if (template && count > 0) {
          setPlayer(prev => {
            const existing = prev.troops.find(t => t.id === troopId);
            const troops = existing
              ? prev.troops.map(t => t.id === troopId ? { ...t, count: t.count + count } : t)
              : [...prev.troops, { ...template, count, xp: 0 }];
            return { ...prev, troops };
          });
          addLog(`吸引蟑螂：${template.name} +${count}。`);
        }

        setRoachLureState(prev => prev ? {
          ...prev,
          daysPassed: prev.daysPassed + 1,
          recruitedByTroopId: {
            ...prev.recruitedByTroopId,
            [troopId]: (prev.recruitedByTroopId[troopId] ?? 0) + count
          }
        } : null);
      }, 1200);

      return () => clearTimeout(timer);
    }, [roachLureState]);

  useEffect(() => {
    if (!altarRecruitState?.isActive) return;
    if (altarRecruitState.daysPassed >= altarRecruitState.totalDays) {
      const finishTimer = setTimeout(() => {
        const summary = Object.entries(altarRecruitState.recruitedByTroopId)
          .filter(([, count]) => count > 0)
          .map(([troopId, count]) => {
            const name = getTroopTemplate(troopId)?.name ?? troopId;
            return `${name}x${count}`;
          })
          .join('，');
        addLog(summary ? `传教结束，收获：${summary}。` : '传教结束，但信徒没有回应。');
        setAltarRecruitState(null);
        if (currentLocation) {
          setView('TOWN');
          setTownTab('ALTAR');
        }
      }, 1500);
      return () => clearTimeout(finishTimer);
    }

    const timer = setTimeout(() => {
      if (!currentLocation) return;
      if (currentLocation.type !== 'ALTAR') return;
      processDailyCycle(currentLocation, 0, 1, 0, true);

      const altarState = currentLocation.altar;
      const troopIds = altarState?.troopIds ?? [];
      if (troopIds.length === 0) {
        addLog('祭坛尚未确立兵种树，传教被迫中止。');
        setAltarRecruitState(null);
        if (currentLocation) {
          setView('TOWN');
          setTownTab('ALTAR');
        }
        return;
      }

      const tier1Pool = troopIds.filter(id => (getTroopTemplate(id)?.tier ?? 1) === 1);
      const pool = tier1Pool.length > 0 ? tier1Pool : troopIds;
      const troopId = pool[Math.floor(Math.random() * pool.length)];
      const current = playerRef.current;
      const currentCount = current.troops.reduce((a, b) => a + b.count, 0);
      const maxTroops = getMaxTroops();
      const availableSpace = maxTroops - currentCount;
      if (availableSpace <= 0) {
        addLog('队伍人数已达上限，传教中止。');
        setAltarRecruitState(null);
        if (currentLocation) {
          setView('TOWN');
          setTownTab('ALTAR');
        }
        return;
      }

      let count = Math.min(randomInt(1, 3), availableSpace);
      if (Math.random() < 0.4) {
        count = 0;
        addLog('神秘人嘲讽：信徒被迷雾吞没，你的言辞太过虚弱。');
      }
      const template = getTroopTemplate(troopId);
      if (template && count > 0) {
        setPlayer(prev => {
          const existing = prev.troops.find(t => t.id === troopId);
          const troops = existing
            ? prev.troops.map(t => t.id === troopId ? { ...t, count: t.count + count } : t)
            : [...prev.troops, { ...template, count, xp: 0 }];
          return { ...prev, troops };
        });
        addLog(`传教：${template.name} +${count}。`);
      }

      setAltarRecruitState(prev => prev ? {
        ...prev,
        daysPassed: prev.daysPassed + 1,
        recruitedByTroopId: {
          ...prev.recruitedByTroopId,
          [troopId]: (prev.recruitedByTroopId[troopId] ?? 0) + count
        }
      } : null);
    }, 1200);

    return () => clearTimeout(timer);
  }, [altarRecruitState]);

    useEffect(() => {
      playerRef.current = player;
    }, [player]);

  useEffect(() => {
    heroesRef.current = heroes;
  }, [heroes]);

  useEffect(() => {
    lordsRef.current = lords;
  }, [lords]);

  useEffect(() => {
    battleTimelineRef.current = battleTimeline;
  }, [battleTimeline]);

  useEffect(() => {
    worldDiplomacyRef.current = worldDiplomacy;
  }, [worldDiplomacy]);

  useEffect(() => {
    partyDiaryRef.current = partyDiary;
  }, [partyDiary]);

  useEffect(() => {
    if (view !== 'TOWN' || townTab !== 'COFFEE_CHAT') return;
    const el = undeadChatListRef.current;
    if (!el) return;
    requestAnimationFrame(() => {
      el.scrollTop = el.scrollHeight;
    });
  }, [undeadDialogue.length, townTab, view]);

  useEffect(() => {
    if (view !== 'CAVE') return;
    const el = shaperChatListRef.current;
    if (!el) return;
    requestAnimationFrame(() => {
      el.scrollTop = el.scrollHeight;
    });
  }, [shaperDialogue.length, view]);

  useEffect(() => {
    if (view !== 'TOWN' || townTab !== 'ALTAR') return;
    const el = altarChatListRef.current;
    if (!el) return;
    requestAnimationFrame(() => {
      el.scrollTop = el.scrollHeight;
    });
  }, [altarDialogues, townTab, view]);

  useEffect(() => {
    if (!activeHeroChatId) return;
    const el = heroChatListRef.current;
    if (!el) return;
    requestAnimationFrame(() => {
      el.scrollTop = el.scrollHeight;
    });
  }, [activeHeroChatId, heroes]);

  const addLog = (msg: string) => {
    const safe = String(msg ?? '').trim();
    if (!safe) return;
    setLogs(prev => {
      // Simple deduplication for consecutive identical logs to prevent spam
      if (prev.length > 0 && prev[0] === safe) return prev;
      return [safe, ...(Array.isArray(prev) ? prev : [])].slice(0, 120);
    });
  };

  const addLocationLog = (locationId: string, text: string, day: number = playerRef.current.day) => {
    const safe = String(text ?? '').trim();
    if (!safe) return;
    setLocations(prev => prev.map(loc => {
      if (loc.id !== locationId) return loc;
      const existing = Array.isArray(loc.localLogs) ? loc.localLogs : [];
      if (existing.length > 0 && existing[0].text === safe) return loc;
      const nextLogs = [{ day, text: safe }, ...existing].slice(0, 30);
      return { ...loc, localLogs: nextLogs };
    }));
    setCurrentLocation(prev => {
      if (!prev || prev.id !== locationId) return prev;
      const existing = Array.isArray(prev.localLogs) ? prev.localLogs : [];
      if (existing.length > 0 && existing[0].text === safe) return prev;
      const nextLogs = [{ day, text: safe }, ...existing].slice(0, 30);
      return { ...prev, localLogs: nextLogs };
    });
  };

  const normalizeRelationMatrix = (matrix?: PlayerState['relationMatrix']) => ({
    factions: {
      VERDANT_COVENANT: matrix?.factions?.VERDANT_COVENANT ?? INITIAL_PLAYER_STATE.relationMatrix.factions.VERDANT_COVENANT,
      FROST_OATH: matrix?.factions?.FROST_OATH ?? INITIAL_PLAYER_STATE.relationMatrix.factions.FROST_OATH,
      RED_DUNE: matrix?.factions?.RED_DUNE ?? INITIAL_PLAYER_STATE.relationMatrix.factions.RED_DUNE
    },
    races: {
      HUMAN: matrix?.races?.HUMAN ?? INITIAL_PLAYER_STATE.relationMatrix.races.HUMAN,
      ROACH: matrix?.races?.ROACH ?? INITIAL_PLAYER_STATE.relationMatrix.races.ROACH,
      UNDEAD: matrix?.races?.UNDEAD ?? INITIAL_PLAYER_STATE.relationMatrix.races.UNDEAD,
      IMPOSTER: matrix?.races?.IMPOSTER ?? INITIAL_PLAYER_STATE.relationMatrix.races.IMPOSTER,
      BANDIT: matrix?.races?.BANDIT ?? INITIAL_PLAYER_STATE.relationMatrix.races.BANDIT,
      AUTOMATON: matrix?.races?.AUTOMATON ?? INITIAL_PLAYER_STATE.relationMatrix.races.AUTOMATON,
      VOID: matrix?.races?.VOID ?? INITIAL_PLAYER_STATE.relationMatrix.races.VOID,
      MADNESS: matrix?.races?.MADNESS ?? INITIAL_PLAYER_STATE.relationMatrix.races.MADNESS
    }
  });

  const getLocationRace = (location?: Location | null): RaceId | null => {
    if (!location) return null;
    if (location.type === 'ROACH_NEST') return 'ROACH';
    if (location.type === 'GRAVEYARD' || location.type === 'COFFEE') return 'UNDEAD';
    if (location.type === 'IMPOSTER_PORTAL') return 'IMPOSTER';
    if (location.type === 'BANDIT_CAMP') return 'BANDIT';
    if (location.type === 'MYSTERIOUS_CAVE') return 'VOID';
    if (location.type === 'ASYLUM') return 'MADNESS';
    return null;
  };

  const getLocationRelationTarget = (location?: Location | null) => {
    if (!location) return null;
    if (location.factionId) return { type: 'FACTION' as const, id: location.factionId };
    const race = getLocationRace(location);
    return race ? { type: 'RACE' as const, id: race } : null;
  };

  const getEncounterChance = (baseChance: number, relationValue: number) => {
    if (relationValue >= 60) return Math.min(baseChance, 0.08);
    if (relationValue >= 40) return Math.min(baseChance, 0.12);
    if (relationValue >= 20) return Math.min(baseChance, 0.18);
    if (relationValue <= -50) return Math.max(baseChance, 0.5);
    if (relationValue <= -30) return Math.max(baseChance, 0.4);
    return baseChance;
  };

  const buildSupportTroops = (location: Location, ratio: number) => {
    const garrison = location.garrison ?? [];
    return garrison
      .map(t => ({ ...t, count: Math.max(0, Math.ceil(t.count * ratio)) }))
      .filter(t => t.count > 0);
  };

  const getEnemyRace = (enemy?: EnemyForce | null): RaceId | null => {
    if (!enemy) return null;
    const baseId = String(enemy.baseTroopId ?? '').trim();
    if (IMPOSTER_TROOP_IDS.has(baseId)) return 'IMPOSTER';
    if (baseId.startsWith('roach_')) return 'ROACH';
    if (baseId.startsWith('undead_') || baseId.startsWith('skeleton') || baseId.startsWith('zombie') || baseId.startsWith('specter')) return 'UNDEAD';
    if (baseId.startsWith('automaton') || baseId.startsWith('ai_')) return 'AUTOMATON';
    if (baseId.startsWith('void_')) return 'VOID';
    if (baseId.startsWith('mad_') || baseId.includes('patient')) return 'MADNESS';
    const name = String(enemy.name ?? '');
    if (name.includes('匪') || name.includes('盗') || name.includes('强盗') || name.includes('劫匪')) return 'BANDIT';
    return null;
  };

  const clampRelation = (value: number) => Math.max(-100, Math.min(100, Math.round(value)));

  const buildInitialWorldDiplomacy = (): WorldDiplomacyState => {
    const factionIds = FACTIONS.map(f => f.id);
    const raceIds = Object.keys(RACE_LABELS) as RaceId[];
    const factionRelations = factionIds.reduce((acc, a) => {
      acc[a] = factionIds.reduce((row, b) => {
        row[b] = 0;
        return row;
      }, {} as Record<string, number>) as Record<typeof factionIds[number], number>;
      return acc;
    }, {} as Record<string, Record<string, number>>) as WorldDiplomacyState['factionRelations'];
    if (factionIds.includes('VERDANT_COVENANT') && factionIds.includes('FROST_OATH')) {
      (factionRelations as any).VERDANT_COVENANT.FROST_OATH = -18;
      (factionRelations as any).FROST_OATH.VERDANT_COVENANT = -18;
    }
    if (factionIds.includes('VERDANT_COVENANT') && factionIds.includes('RED_DUNE')) {
      (factionRelations as any).VERDANT_COVENANT.RED_DUNE = -10;
      (factionRelations as any).RED_DUNE.VERDANT_COVENANT = -10;
    }
    if (factionIds.includes('FROST_OATH') && factionIds.includes('RED_DUNE')) {
      (factionRelations as any).FROST_OATH.RED_DUNE = -22;
      (factionRelations as any).RED_DUNE.FROST_OATH = -22;
    }
    const raceRelations = raceIds.reduce((acc, a) => {
      acc[a] = raceIds.reduce((row, b) => {
        row[b] = clampRelation(RACE_RELATION_MATRIX[a]?.[b] ?? 0);
        return row;
      }, {} as Record<string, number>) as Record<typeof raceIds[number], number>;
      return acc;
    }, {} as WorldDiplomacyState['raceRelations']);
    const factionRaceRelations = factionIds.reduce((acc, factionId) => {
      acc[factionId] = raceIds.reduce((row, raceId) => {
        row[raceId] = clampRelation(RACE_RELATION_MATRIX.HUMAN?.[raceId] ?? 0);
        return row;
      }, {} as Record<string, number>) as Record<typeof raceIds[number], number>;
      return acc;
    }, {} as WorldDiplomacyState['factionRaceRelations']);
    return { factionRelations, raceRelations, factionRaceRelations, events: [] };
  };

  const normalizeWorldDiplomacy = (raw?: any): WorldDiplomacyState => {
    const base = buildInitialWorldDiplomacy();
    const factionIds = FACTIONS.map(f => f.id);
    const raceIds = Object.keys(RACE_LABELS) as RaceId[];
    const next: WorldDiplomacyState = {
      factionRelations: { ...base.factionRelations },
      raceRelations: { ...base.raceRelations },
      factionRaceRelations: { ...base.factionRaceRelations },
      events: Array.isArray(raw?.events) ? raw.events.filter((e: any) => e && typeof e.text === 'string').slice(0, 60) : []
    };
    factionIds.forEach(a => {
      const row = raw?.factionRelations?.[a];
      const nextRow: Record<string, number> = { ...(next.factionRelations as any)[a] };
      factionIds.forEach(b => {
        nextRow[b] = clampRelation(Number(row?.[b] ?? nextRow[b] ?? 0));
      });
      (next.factionRelations as any)[a] = nextRow;
    });
    raceIds.forEach(a => {
      const row = raw?.raceRelations?.[a];
      const nextRow: Record<string, number> = { ...(next.raceRelations as any)[a] };
      raceIds.forEach(b => {
        nextRow[b] = clampRelation(Number(row?.[b] ?? nextRow[b] ?? 0));
      });
      (next.raceRelations as any)[a] = nextRow;
    });
    factionIds.forEach(factionId => {
      const row = raw?.factionRaceRelations?.[factionId];
      const nextRow: Record<string, number> = { ...(next.factionRaceRelations as any)[factionId] };
      raceIds.forEach(raceId => {
        nextRow[raceId] = clampRelation(Number(row?.[raceId] ?? nextRow[raceId] ?? 0));
      });
      (next.factionRaceRelations as any)[factionId] = nextRow;
    });
    next.events = next.events.map((e: any) => ({
      id: String(e?.id ?? `dip_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`),
      day: typeof e?.day === 'number' ? e.day : playerRef.current.day,
      kind: e?.kind === 'FACTION_FACTION' || e?.kind === 'FACTION_RACE' || e?.kind === 'RACE_RACE' ? e.kind : 'FACTION_FACTION',
      aId: String(e?.aId ?? ''),
      bId: String(e?.bId ?? ''),
      delta: clampRelation(Number(e?.delta ?? 0)),
      text: String(e?.text ?? '').trim()
    })).filter((e: any) => e.text);
    return next;
  };

  const getWorldFactionRelation = (state: WorldDiplomacyState, a: string, b: string) => clampRelation(Number((state.factionRelations as any)?.[a]?.[b] ?? 0));
  const getWorldRaceRelation = (state: WorldDiplomacyState, a: string, b: string) => clampRelation(Number((state.raceRelations as any)?.[a]?.[b] ?? 0));
  const getWorldFactionRaceRelation = (state: WorldDiplomacyState, factionId: string, raceId: string) => clampRelation(Number((state.factionRaceRelations as any)?.[factionId]?.[raceId] ?? 0));

  const applyWorldDiplomacyDelta = (state: WorldDiplomacyState, payload: { kind: WorldDiplomacyState['events'][number]['kind']; aId: string; bId: string; delta: number; text: string; day: number }) => {
    const delta = clampRelation(payload.delta);
    if (!delta) return state;
    const id = `dip_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const event = { id, day: payload.day, kind: payload.kind, aId: payload.aId, bId: payload.bId, delta, text: payload.text };
    if (payload.kind === 'FACTION_FACTION') {
      const current = getWorldFactionRelation(state, payload.aId, payload.bId);
      const nextValue = clampRelation(current + delta);
      if (nextValue === current) return state;
      return {
        ...state,
        factionRelations: {
          ...state.factionRelations,
          [payload.aId]: { ...(state.factionRelations as any)[payload.aId], [payload.bId]: nextValue }
        } as any,
        events: [event, ...(state.events ?? [])].slice(0, 60)
      };
    }
    if (payload.kind === 'RACE_RACE') {
      const current = getWorldRaceRelation(state, payload.aId, payload.bId);
      const nextValue = clampRelation(current + delta);
      if (nextValue === current) return state;
      return {
        ...state,
        raceRelations: {
          ...state.raceRelations,
          [payload.aId]: { ...(state.raceRelations as any)[payload.aId], [payload.bId]: nextValue }
        } as any,
        events: [event, ...(state.events ?? [])].slice(0, 60)
      };
    }
    const current = getWorldFactionRaceRelation(state, payload.aId, payload.bId);
    const nextValue = clampRelation(current + delta);
    if (nextValue === current) return state;
    return {
      ...state,
      factionRaceRelations: {
        ...state.factionRaceRelations,
        [payload.aId]: { ...(state.factionRaceRelations as any)[payload.aId], [payload.bId]: nextValue }
      } as any,
      events: [event, ...(state.events ?? [])].slice(0, 60)
    };
  };

  const getRelationValue = (state: PlayerState, targetType: 'FACTION' | 'RACE', targetId: string) => {
    const matrix = normalizeRelationMatrix(state.relationMatrix);
    if (targetType === 'FACTION') {
      return matrix.factions[targetId as keyof typeof matrix.factions] ?? 0;
    }
    return matrix.races[targetId as keyof typeof matrix.races] ?? 0;
  };

  const updateRelation = (targetType: 'FACTION' | 'RACE', targetId: string, delta: number, text: string) => {
    if (!delta) return;
    setPlayer(prev => {
      const matrix = normalizeRelationMatrix(prev.relationMatrix);
      const currentValue = getRelationValue(prev, targetType, targetId);
      const nextValue = clampRelation(currentValue + delta);
      if (nextValue === currentValue) return prev;
      const nextMatrix = {
        factions: { ...matrix.factions },
        races: { ...matrix.races }
      };
      if (targetType === 'FACTION') {
        nextMatrix.factions[targetId as keyof typeof matrix.factions] = nextValue;
      } else {
        nextMatrix.races[targetId as keyof typeof matrix.races] = nextValue;
      }
      const eventText = String(text || '').trim();
      const nextEvents = eventText
        ? [
            {
              id: `rel_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
              day: prev.day,
              targetType,
              targetId,
              delta: nextValue - currentValue,
              text: eventText
            },
            ...(prev.relationEvents ?? [])
          ].slice(0, 24)
        : (prev.relationEvents ?? []);
      return { ...prev, relationMatrix: nextMatrix, relationEvents: nextEvents };
    });
  };

  const updateLordRelation = (locationId: string, delta: number, text?: string) => {
    if (!delta) return;
    const nextDay = playerRef.current.day;
    const safeText = String(text ?? '').trim();
    setLocations(prev => prev.map(loc => {
      if (loc.id !== locationId || !loc.lord) return loc;
      const nextValue = clampRelation(loc.lord.relation + delta);
      if (nextValue === loc.lord.relation) return loc;
      const nextMemories = safeText
        ? [{ day: nextDay, text: safeText }, ...(loc.lord.memories ?? [])].slice(0, 10)
        : loc.lord.memories;
      return { ...loc, lord: { ...loc.lord, relation: nextValue, memories: nextMemories } };
    }));
    setCurrentLocation(prev => {
      if (!prev || prev.id !== locationId || !prev.lord) return prev;
      const nextValue = clampRelation(prev.lord.relation + delta);
      if (nextValue === prev.lord.relation) return prev;
      const nextMemories = safeText
        ? [{ day: nextDay, text: safeText }, ...(prev.lord.memories ?? [])].slice(0, 10)
        : prev.lord.memories;
      return { ...prev, lord: { ...prev.lord, relation: nextValue, memories: nextMemories } };
    });
  };

  const getDefenseAidRelationDelta = (location: Location, attacker: EnemyForce) => {
    const attackerPower = Math.max(1, calculatePower(attacker.troops));
    const defenderPower = Math.max(1, calculatePower(getDefenderTroops(location)));
    const playerPower = Math.max(1, calculatePower(getBattleTroops(playerRef.current, heroesRef.current)));
    const balanceRatio = defenderPower / attackerPower;
    const impactRatio = playerPower / attackerPower;
    let delta = 2;
    if (balanceRatio < 0.2) delta = 10;
    else if (balanceRatio < 0.4) delta = 8;
    else if (balanceRatio < 0.6) delta = 6;
    else if (balanceRatio < 0.8) delta = 4;
    delta += Math.min(4, Math.max(0, Math.floor(impactRatio * 6)));
    return Math.max(2, Math.min(14, delta));
  };

  const handleDefenseAidJoin = (location: Location, attacker: EnemyForce) => {
    const defenderPower = Math.max(1, calculatePower(getDefenderTroops(location)));
    const attackerPower = Math.max(1, calculatePower(attacker.troops));
    const ratio = defenderPower / attackerPower;
    const delta = getDefenseAidRelationDelta(location, attacker);
    defenseAidMetaRef.current = { locationId: location.id, delta, ratio };
    addLocationLog(location.id, `${playerRef.current.name} 协助守城，守军战力比 ${ratio.toFixed(2)}。`);
  };

  const getRelationTone = (value: number) => {
    if (value >= 60) return { label: '同盟', color: 'text-emerald-400' };
    if (value >= 40) return { label: '友好', color: 'text-emerald-300' };
    if (value >= 20) return { label: '缓和', color: 'text-emerald-200' };
    if (value <= -60) return { label: '死敌', color: 'text-red-400' };
    if (value <= -40) return { label: '敌对', color: 'text-red-300' };
    if (value <= -20) return { label: '紧张', color: 'text-red-200' };
    if (value >= -5 && value <= 5) return { label: '陌生', color: 'text-stone-300' };
    return { label: '中立', color: 'text-stone-300' };
  };

  const buildUndeadReply = (question: string) => {
    const recent = logs.slice(0, 5).map(l => `「${l}」`).join('、') || '无';
    const troopSummary = player.troops.length > 0
      ? player.troops.map(t => `${t.name}x${t.count}`).join('、')
      : '你现在没有部队';
    const parrotSummary = player.parrots.length > 0
      ? `还有你的鹦鹉：${player.parrots.map(p => p.name).join('、')}。它们吵得连亡灵都皱眉。`
      : '';
    const asked = question.trim();
    const prompt = asked ? `你问的是「${asked}」。` : '你没有提问。';
    return `亡灵搅动冷咖啡，低声说：${prompt}最近发生的事我都知道：${recent}。你的队伍构成是：${troopSummary}。${parrotSummary}`;
  };

  const normalizeHeroChat = (memory: HeroChatLine[], currentDay = player.day) => {
    const minDay = Math.max(0, currentDay - 2);
    return memory
      .filter(line => line && (line.role === 'PLAYER' || line.role === 'HERO') && typeof line.text === 'string')
      .map(line => ({
        role: line.role,
        text: String(line.text).trim(),
        day: typeof line.day === 'number' ? line.day : currentDay
      }))
      .filter(line => line.text.length > 0 && line.day >= minDay)
      .slice(-24);
  };

  const normalizeHeroMemory = (memory: HeroPermanentMemory[]) => (Array.isArray(memory) ? memory : [])
    .map(item => ({
      id: String(item?.id ?? '').trim() || `mem_${String(item?.createdAt ?? '').trim()}_${String(item?.roundIndex ?? '')}_${String(item?.text ?? '').trim()}`,
      text: String(item?.text ?? '').trim(),
      createdAt: String(item?.createdAt ?? '').trim(),
      createdDay: typeof item?.createdDay === 'number' ? item.createdDay : 0,
      roundIndex: typeof item?.roundIndex === 'number' ? item.roundIndex : 0
    }))
    .filter(item => item.text.length > 0)
    .slice(-30);

  const normalizePartyDiary = (entries: PartyDiaryEntry[], currentDay = player.day) => (Array.isArray(entries) ? entries : [])
    .map(item => ({
      id: String(item?.id ?? '').trim() || `diary_${String(item?.createdAt ?? '').trim()}_${String(item?.roundIndex ?? '')}_${String(item?.text ?? '').trim()}`,
      text: String(item?.text ?? '').trim(),
      authorId: String((item as any)?.authorId ?? '').trim(),
      authorName: String((item as any)?.authorName ?? (item as any)?.author ?? '').trim() || '未知',
      createdAt: String(item?.createdAt ?? '').trim(),
      createdDay: typeof item?.createdDay === 'number' ? item.createdDay : currentDay,
      roundIndex: typeof item?.roundIndex === 'number' ? item.roundIndex : 0
    }))
    .filter(item => item.text.length > 0)
    .slice(-40);

  const normalizeMemoryEdits = (raw: any) => (Array.isArray(raw) ? raw : [])
    .map(item => ({
      action: String(item?.action ?? '').trim().toUpperCase(),
      id: String(item?.id ?? '').trim(),
      text: String(item?.text ?? '').trim()
    }))
    .filter(item => item.action && (item.id || item.text));

  const normalizeDiaryEdits = (raw: any) => (Array.isArray(raw) ? raw : [])
    .map(item => ({
      action: String(item?.action ?? '').trim().toUpperCase(),
      id: String(item?.id ?? '').trim(),
      text: String(item?.text ?? '').trim()
    }))
    .filter(item => item.action && (item.id || item.text));

  const applyMemoryEdits = (
    memory: HeroPermanentMemory[],
    edits: { action: string; id?: string; text?: string }[],
    nowText: string,
    day: number,
    roundIndex: number
  ) => {
    let next = [...memory];
    edits.forEach(edit => {
      if (edit.action === 'DELETE') {
        if (edit.id) {
          next = next.filter(item => item.id !== edit.id);
        } else if (edit.text) {
          next = next.filter(item => item.text !== edit.text);
        }
      }
      if (edit.action === 'UPDATE') {
        if (!edit.id || !edit.text) return;
        const index = next.findIndex(item => item.id === edit.id);
        if (index >= 0) {
          next[index] = {
            ...next[index],
            text: edit.text,
            createdAt: nowText,
            createdDay: day,
            roundIndex
          };
        }
      }
      if (edit.action === 'ADD') {
        if (!edit.text) return;
        if (next.some(item => item.text === edit.text)) return;
        next.push({
          id: `mem_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
          text: edit.text,
          createdAt: nowText,
          createdDay: day,
          roundIndex
        });
      }
    });
    return next.slice(-30);
  };

  const applyPartyDiaryEdits = (
    entries: PartyDiaryEntry[],
    edits: { action: string; id?: string; text?: string }[],
    nowText: string,
    day: number,
    roundIndex: number,
    authorName: string,
    authorId?: string
  ) => {
    let next = [...entries];
    edits.forEach(edit => {
      if (edit.action === 'DELETE') {
        if (edit.id) {
          next = next.filter(item => item.id !== edit.id);
        } else if (edit.text) {
          next = next.filter(item => item.text !== edit.text);
        }
      }
      if (edit.action === 'UPDATE') {
        const targetId = edit.id || (edit.text ? next.find(item => item.text === edit.text)?.id : undefined);
        if (!targetId || !edit.text) return;
        const index = next.findIndex(item => item.id === targetId);
        if (index >= 0) {
          next[index] = {
            ...next[index],
            text: edit.text,
            authorName,
            authorId,
            createdAt: nowText,
            createdDay: day,
            roundIndex
          };
        }
      }
      if (edit.action === 'ADD') {
        if (!edit.text) return;
        if (next.some(item => item.text === edit.text)) return;
        next.push({
          id: `diary_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
          text: edit.text,
          authorName,
          authorId,
          createdAt: nowText,
          createdDay: day,
          roundIndex
        });
      }
    });
    return normalizePartyDiary(next, day);
  };

  const addPartyDiaryEntry = (authorId: string, authorName: string, text: string, roundIndex: number, day: number) => {
    const nowText = new Date().toLocaleString('zh-CN', { hour12: false });
    const entry: PartyDiaryEntry = {
      id: `diary_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      text: text.trim(),
      authorId,
      authorName,
      createdAt: nowText,
      createdDay: day,
      roundIndex
    };
    setPartyDiary(prev => normalizePartyDiary([...(Array.isArray(prev) ? prev : []), entry], day));
  };

  const updatePartyDiaryEntry = (entryId: string, nextText: string, authorId: string, authorName: string, roundIndex: number, day: number) => {
    const nowText = new Date().toLocaleString('zh-CN', { hour12: false });
    setPartyDiary(prev => normalizePartyDiary((Array.isArray(prev) ? prev : []).map(item => item.id === entryId ? {
      ...item,
      text: nextText.trim(),
      authorId,
      authorName,
      createdAt: nowText,
      createdDay: day,
      roundIndex
    } : item), day));
  };

  const deletePartyDiaryEntry = (entryId: string, day: number) => {
    setPartyDiary(prev => normalizePartyDiary((Array.isArray(prev) ? prev : []).filter(item => item.id !== entryId), day));
  };

  const normalizeHeroEmotion = (value?: string) => {
    const raw = String(value || '').trim();
    const upper = raw.toUpperCase();
    if (HERO_EMOTIONS.includes(upper as Hero['currentExpression'])) return upper as Hero['currentExpression'];
    const aliases: Record<string, Hero['currentExpression']> = {
      '愤怒': 'ANGRY',
      '空闲': 'IDLE',
      '无语': 'SILENT',
      '尴尬': 'AWKWARD',
      '高兴': 'HAPPY',
      '难过': 'SAD',
      '害怕': 'AFRAID',
      '惊讶': 'SURPRISED',
      '生无可恋': 'DEAD'
    };
    return aliases[raw] ?? 'IDLE';
  };

  const splitHeroReply = (raw: string) => {
    const text = String(raw ?? '').trim();
    if (!text) return [];
    const byLine = text.split(/\n+/).map(line => line.trim()).filter(Boolean);
    if (byLine.length > 1) return byLine;
    const parts = text.match(/[^。！？!?]+[。！？!?]?/g)?.map(line => line.trim()).filter(Boolean);
    if (parts && parts.length > 1) return parts;
    return [text];
  };

  const buildHeroReply = (hero: Hero, question: string) => {
    const recent = logs.slice(0, 4).map(l => `「${l}」`).join('、') || '无';
    const asked = question.trim();
    const prompt = asked ? `你问的是「${asked}」。` : '你没有提问。';
    return `${hero.name} 轻声回应：${prompt}我记得这些：${recent}。`;
  };

  const clearHeroChatTimers = (heroId: string) => {
    const timers = heroChatTimersRef.current[heroId] ?? [];
    timers.forEach(timerId => window.clearTimeout(timerId));
    heroChatTimersRef.current[heroId] = [];
  };

  const scheduleHeroReplyLines = (heroId: string, lines: string[], day: number) => {
    clearHeroChatTimers(heroId);
    const safeLines = lines.map(l => String(l ?? '').trim()).filter(Boolean);
    if (safeLines.length === 0) return;
    const delayMs = 520;
    heroChatTimersRef.current[heroId] = safeLines.map((line, index) => window.setTimeout(() => {
      setHeroes(prev => prev.map(h => h.id === heroId ? {
        ...h,
        chatMemory: normalizeHeroChat([...(h.chatMemory ?? []), { role: 'HERO', text: line, day }], day)
      } : h));
      if (index === safeLines.length - 1) setIsHeroChatLoading(false);
    }, index * delayMs));
  };

  const buildHeroChatLocationContext = () => {
    const pos = playerRef.current.position;
    const here = currentLocation;
    if (here) {
      const owner = here.owner ?? 'NEUTRAL';
      const siege = here.isUnderSiege ? `（围攻中：进度 ${Math.round((here.siegeProgress ?? 0) * 100)}%）` : '';
      return `当前位于：${here.name}（${here.type} / ${here.terrain} / owner=${owner}）${siege}\n描述：${here.description}`;
    }
    const nearest = locations.reduce<{ loc: Location | null; dist: number }>((best, loc) => {
      const dx = (loc.coordinates?.x ?? 0) - (pos?.x ?? 0);
      const dy = (loc.coordinates?.y ?? 0) - (pos?.y ?? 0);
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (!best.loc || dist < best.dist) return { loc, dist };
      return best;
    }, { loc: null, dist: Infinity });
    const nearText = nearest.loc
      ? `最近据点：${nearest.loc.name}（${nearest.loc.type} / ${nearest.loc.terrain}，距离约 ${nearest.dist.toFixed(1)}）`
      : '最近据点：（无）';
    return `当前在野外行军。\n地图坐标：(${(pos?.x ?? 0).toFixed(1)}, ${(pos?.y ?? 0).toFixed(1)})\n${nearText}`;
  };

  const buildAIConfig = () => {
    if (aiProvider === 'GEMINI') {
      const key = geminiApiKey.trim();
      if (!key) return undefined;
      return {
        baseUrl: '',
        apiKey: key,
        model: 'gemini-3-flash-preview',
        provider: aiProvider
      };
    }
    if (aiProvider === 'DOUBAO') {
      const key = doubaoApiKey.trim();
      const model = openAIModel.trim();
      if (!key || !model) return undefined;
      return {
        baseUrl: openAIBaseUrl.trim() || 'https://ark.cn-beijing.volces.com/api/v3',
        apiKey: key,
        model,
        provider: aiProvider
      };
    }
    const key = openAIKey.trim();
    const model = openAIModel.trim();
    if (!key || !model) return undefined;
    return {
      baseUrl: openAIBaseUrl.trim() || 'https://api.openai.com',
      apiKey: key,
      model,
      provider: aiProvider
    };
  };

  const buildHeroChatBattleBriefsContext = () => {
    const items = (recentBattleBriefs ?? []).slice(0, 3);
    if (items.length === 0) return '（无）';
    const outcomeLabel = (outcome: BattleBrief['outcome']) => outcome === 'A' ? '胜利' : '战败';
    return items.map((b, index) => {
      const dayText = typeof b.day === 'number' ? `第 ${b.day} 天` : '（未知天数）';
      const enemyName = String(b.enemyName ?? '').trim() || '（未知敌军）';
      return [
        `#${index + 1} ${dayText} 对阵 ${enemyName}：${outcomeLabel(b.outcome)}`,
        `- 地点：${String(b.battleLocation ?? '').trim() || '（未知）'}`,
        `- 我方：${String(b.playerSide ?? '').trim() || '（无）'}`,
        `- 敌方：${String(b.enemySide ?? '').trim() || '（无）'}`,
        `- 关键单位伤情：${String(b.keyUnitDamageSummary ?? '').trim() || '（无）'}`
      ].join('\n');
    }).join('\n');
  };

  const copyPendingHeroChatPrompt = async () => {
    if (isHeroChatLoading) return false;
    if (!activeHeroChatId) return false;
    const text = heroChatInput.trim();
    if (!text) return false;
    const activeHero = heroes.find(h => h.id === activeHeroChatId && h.recruited);
    if (!activeHero) return false;
    const day = playerRef.current.day;
    const nextDialogue = normalizeHeroChat([...(activeHero.chatMemory ?? []), { role: 'PLAYER', text, day }], day);
    const nextRoundIndex = (activeHero.chatRounds ?? 0) + 1;
    const heroForPrompt = { ...activeHero, chatRounds: nextRoundIndex };
    const partyHeroes = heroesRef.current.filter(h => h.recruited);
    const prompt = buildHeroChatPrompt(
      nextDialogue,
      heroForPrompt,
      playerRef.current,
      logs.slice(0, 12),
      partyHeroes,
      buildHeroChatLocationContext(),
      buildHeroChatBattleBriefsContext(),
      normalizePartyDiary(partyDiaryRef.current, day)
    );
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(prompt);
      } else {
        const textarea = document.createElement('textarea');
        textarea.value = prompt;
        textarea.style.position = 'fixed';
        textarea.style.left = '-9999px';
        textarea.style.top = '0';
        document.body.appendChild(textarea);
        textarea.focus();
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }
      return true;
    } catch {
      return false;
    }
  };

  const sendToHero = async () => {
    if (isHeroChatLoading) return;
    if (!activeHeroChatId) return;
    const text = heroChatInput.trim();
    if (!text) return;
    const activeHero = heroes.find(h => h.id === activeHeroChatId && h.recruited);
    if (!activeHero) return;

    clearHeroChatTimers(activeHero.id);
    const day = playerRef.current.day;
    const nextDialogue = normalizeHeroChat([...(activeHero.chatMemory ?? []), { role: 'PLAYER', text, day }], day);
    const nextRoundIndex = (activeHero.chatRounds ?? 0) + 1;
    setHeroes(prev => prev.map(h => h.id === activeHero.id ? { ...h, chatMemory: nextDialogue, chatRounds: (h.chatRounds ?? 0) + 1 } : h));
    setHeroChatInput('');
    setIsHeroChatLoading(true);

    try {
      const aiConfig = buildAIConfig();
      const heroForPrompt = { ...activeHero, chatRounds: nextRoundIndex };
      const response = await chatWithHero(
        nextDialogue,
        heroForPrompt,
        playerRef.current,
        logs.slice(0, 12),
        heroesRef.current.filter(h => h.recruited),
        buildHeroChatLocationContext(),
        buildHeroChatBattleBriefsContext(),
        normalizePartyDiary(partyDiaryRef.current, day),
        aiConfig
      );
      const reply = response.reply;
      const emotion = normalizeHeroEmotion(response.emotion);
      const memoryText = String((response as any)?.memory ?? '').trim();
      const affinityRaw = String((response as any)?.affinity ?? '').trim();
      const memoryEdits = normalizeMemoryEdits((response as any)?.memoryEdits ?? (response as any)?.memory_edits);
      const diaryEdits = normalizeDiaryEdits((response as any)?.diaryEdits ?? (response as any)?.diary_edits);
      const nowText = new Date().toLocaleString('zh-CN', { hour12: false });
      const replyLines = splitHeroReply(reply);
      const lines = replyLines.length > 0 ? replyLines : [reply || `${activeHero.name} 看着你，没有说话。`];
      setHeroes(prev => prev.map(h => h.id === activeHero.id ? {
        ...h,
        currentExpression: emotion,
        affinity: (() => {
          const allowed = ['陌生', '熟悉', '友好', '亲近', '信赖', '生死之交'] as const;
          const current = String((h as any)?.affinity ?? '陌生').trim();
          const currentIndex = Math.max(0, allowed.indexOf(current as any));
          const nextIndexRaw = affinityRaw ? allowed.indexOf(affinityRaw as any) : -1;
          if (nextIndexRaw < 0) return current as any;
          if (Math.abs(nextIndexRaw - currentIndex) > 1) return allowed[currentIndex];
          return allowed[nextIndexRaw];
        })(),
        permanentMemory: (() => {
          const existing = normalizeHeroMemory(h.permanentMemory ?? []);
          const afterEdits = memoryEdits.length > 0
            ? applyMemoryEdits(existing, memoryEdits, nowText, day, nextRoundIndex)
            : existing;
          const lastMemoryRound = afterEdits.reduce((max, item) => Math.max(max, item.roundIndex), 0);
          const canAdd = afterEdits.length === 0 || nextRoundIndex - lastMemoryRound >= 2;
          if (!memoryText || !canAdd) return afterEdits;
          if (afterEdits.some(item => item.text === memoryText)) return afterEdits;
          return [
            ...afterEdits,
            {
              id: `mem_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
              text: memoryText,
              createdAt: nowText,
              createdDay: day,
              roundIndex: nextRoundIndex
            }
          ];
        })()
      } : h));
      if (diaryEdits.length > 0) {
        setPartyDiary(prev => applyPartyDiaryEdits(prev, diaryEdits, nowText, day, nextRoundIndex, activeHero.name, activeHero.id));
      }
      scheduleHeroReplyLines(activeHero.id, lines, day);
    } catch (error) {
      console.error('Hero chat failed:', error);
      const fallbackLines = splitHeroReply(buildHeroReply(activeHero, text));
      const lines = fallbackLines.length > 0 ? fallbackLines : [buildHeroReply(activeHero, text)];
      setHeroes(prev => prev.map(h => h.id === activeHero.id ? { ...h, currentExpression: 'SILENT' } : h));
      scheduleHeroReplyLines(activeHero.id, lines, day);
    }
  };

  const sendToUndead = async () => {
    if (!currentLocation || currentLocation.type !== 'COFFEE') return;
    if (isUndeadChatLoading) return;
    const text = undeadChatInput.trim();
    if (!text) return;

    const nextDialogue = [...undeadDialogue, { role: 'PLAYER' as const, text }];
    setUndeadDialogue(nextDialogue);
    setUndeadChatInput('');
    setIsUndeadChatLoading(true);

    try {
      const aiConfig = buildAIConfig();
      const reply = await chatWithUndead(
        nextDialogue,
        player,
        logs.slice(0, 12),
        aiConfig
      );
      setUndeadDialogue(prev => [...prev, { role: 'UNDEAD', text: reply }]);
    } catch (error) {
      console.error('Undead chat failed:', error);
      setUndeadDialogue(prev => [...prev, { role: 'UNDEAD', text: buildUndeadReply(text) }]);
    } finally {
      setIsUndeadChatLoading(false);
    }
  };

  const getTroopTemplate = (id: string) => {
    const realId = id.startsWith('garrison_') ? id.replace('garrison_', '') : id;
    return customTroopTemplates[realId] ?? TROOP_TEMPLATES[realId];
  };

  const randomInt = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;

  const getBanditCampAge = (camp?: Location) => {
    const spawnDay = camp?.banditSpawnDay ?? camp?.lastRefreshDay ?? player.day;
    return Math.max(0, player.day - spawnDay);
  };

  const buildBanditTroops = () => {
    const daysAlive = getBanditCampAge(currentLocation ?? undefined);
    const growth = Math.floor(daysAlive / 3);
    const troops: Troop[] = [];
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
  };

  const getHeroRoleLabel = (role: Hero['role']) => {
    if (role === 'MAGE') return '法师';
    if (role === 'SWORDSMAN') return '近战剑士';
    if (role === 'ARCHER') return '弓箭手';
    if (role === 'SHIELD') return '近战盾兵';
    return '吟游诗人';
  };

  const clampValue = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

  const getHpRatio = (current: number, max: number) => {
    if (max <= 0) return 0;
    return clampValue(current / max, 0.2, 1);
  };

  const HERO_BASE_MULTIPLIER = 0.075;

  const getHeroPower = (hero: Hero) => {
    const attackScore = hero.attributes.attack * 6;
    const agilityScore = hero.attributes.agility * 4;
    const hpScore = hero.attributes.hp * 0.4;
    const roleBonus = hero.role === 'BARD' ? 8 : hero.role === 'SHIELD' ? 12 : 15;
    const rawPower = attackScore + agilityScore + hpScore + roleBonus;
    const hpRatio = getHpRatio(hero.currentHp, hero.maxHp);
    return Math.max(1, Math.round(rawPower * hpRatio * HERO_BASE_MULTIPLIER * 0.833));
  };

  const canHeroBattle = (hero: Hero) => {
    if (!hero.recruited) return false;
    if (hero.maxHp <= 0) return false;
    return hero.currentHp / hero.maxHp >= 0.8 && hero.status === 'ACTIVE';
  };

  const clampTroopAttr = (value: number, min: number = 1, max: number = 10) => Math.max(min, Math.min(max, Math.round(value)));

  const buildHeroAttributes = (hero: Hero) => {
    const attack = clampTroopAttr(hero.attributes.attack / 2);
    const agility = clampTroopAttr(hero.attributes.agility / 2);
    const defense = clampTroopAttr(hero.attributes.agility / 2);
    const hp = clampTroopAttr(hero.attributes.hp / 10);
    const range = hero.role === 'ARCHER' || hero.role === 'MAGE' || hero.role === 'BARD' ? 7 : 2;
    const morale = 7;
    return { attack, defense, agility, hp, range, morale };
  };

  const buildPlayerAttributes = (current: PlayerState) => {
    const attack = clampTroopAttr(current.attributes.attack / 2);
    const defense = clampTroopAttr(current.attributes.defense / 2);
    const agility = clampTroopAttr((current.attributes.escape ?? 0) + 3);
    const hp = clampTroopAttr(current.maxHp / 12);
    const range = 2;
    const morale = clampTroopAttr(6 + Math.floor(current.level / 8));
    return { attack, defense, agility, hp, range, morale };
  };

  const buildHeroTroop = (hero: Hero): Troop => ({
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

  const buildHeroAttributesFromTroop = (troop: Troop) => {
    if (!troop.attributes) {
      return { attack: 12, hp: 90, agility: 12 };
    }
    return {
      attack: clampValue(Math.round(troop.attributes.attack / 5), 8, 30),
      hp: clampValue(Math.round(troop.attributes.hp * 1.4), 60, 220),
      agility: clampValue(Math.round(troop.attributes.agility / 5), 8, 30)
    };
  };

  const buildEnemyLordHero = (lord: Lord, locationId: string): Hero => ({
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
    attributes: { attack: 14, hp: 100, agility: 12 },
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

  const buildEnemyCommanderHero = (troop: Troop): Hero => {
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

  const pickBestTroop = (troops: Troop[]) => {
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

  const ensureEnemyHeroTroops = (troops: Troop[], lord?: Lord | null, locationId?: string) => {
    if (troops.some(t => t.id.startsWith('hero_'))) return troops;
    if (lord) {
      return [buildHeroTroop(buildEnemyLordHero(lord, locationId ?? lord.fiefId)), ...troops];
    }
    const bestTroop = pickBestTroop(troops);
    if (!bestTroop) return troops;
    return [buildHeroTroop(buildEnemyCommanderHero(bestTroop)), ...troops];
  };

  const buildPlayerTroop = (current: PlayerState): Troop => ({
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

  const getBattleTroops = (currentPlayer: PlayerState, currentHeroes: Hero[]) => {
    const heroTroops = currentHeroes.filter(canHeroBattle).map(buildHeroTroop);
    const playerTroops = currentPlayer.status === 'ACTIVE' ? [buildPlayerTroop(currentPlayer)] : [];
    return [...currentPlayer.troops, ...heroTroops, ...playerTroops];
  };

  const getTroopLayerDescriptor = (troop: Troop) => {
    const template = getTroopTemplate(troop.id);
    const source = template ?? troop;
    const equipment = Array.isArray(source.equipment) ? source.equipment.join(' ') : '';
    const description = source.description ?? '';
    return `${troop.id} ${troop.name} ${equipment} ${description}`.toLowerCase();
  };

  const getDefaultLayerId = (troop: Troop, layers: { id: string; name: string; hint: string }[]) => {
    const text = getTroopLayerDescriptor(troop);
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

  const parrotChatter: Record<Parrot['personality'], string[]> = {
    'SARCASTIC': [
      "你的指挥真是...独具一格。", 
      "刚才那个农民本来可以活下来的。", 
      "嘎！笨蛋！嘎！",
      "看那个贡丸，它滚得比你跑得快。",
      "我打赌这次又要亏本了。",
      "你这走位像在找坟位。",
      "要不要我替你当指挥？至少我会飞。",
      "我见过更聪明的石头。",
      "你现在看起来就像个被收税的英雄。",
      "再这样下去，我要申请换主人。"
    ],
    'GLOOMY': [
      "我们都会死在这里...", 
      "天空是灰色的，像我的心情。", 
      "今天的风里有血腥味。",
      "那个亡灵唢呐手吹得我抑郁症都犯了。",
      "毫无希望...",
      "我梦见我们明天还是欠债。",
      "别挣扎了，命运已经写好结局。",
      "你笑什么？那是崩溃前的征兆。",
      "我数过了，坏事比好事多三倍。",
      "活着只是暂时的。"
    ],
    'MANIC': [
      "杀！杀！杀！还要更多瓜子！", 
      "颜色！好多颜色！嘎哈哈哈哈！", 
      "我要飞到太阳上去！",
      "火锅！好烫！好香！再来点！",
      "那是敌人的眼珠子吗？看起来很好吃！",
      "我要把你的头盔当窝！",
      "快！把地图撕了！我们靠直觉！",
      "我听见金币在哭！嘎哈哈！",
      "冲！去跟那只熊抱一下！",
      "今天适合干点违法的事！"
    ],
    'WISE': [
      "星象显示今日不宜出行。", 
      "命运的齿轮开始转动了...", 
      "嘎，如果你给我吃的，我就告诉你宇宙的终极答案。",
      "注意那个红油法师，他看谁的眼神都像在看食材。",
      "战争没有赢家，只有活下来的鸟。",
      "当你凝视深渊时，深渊也在数你的钱。",
      "失误不可怕，可怕的是你觉得那是风格。",
      "谨记：士气比面包更贵。",
      "你若不改战略，历史会改写你。",
      "一只鸟的沉默，胜过十个将军的嘴硬。"
    ]
  };

  const parrotMischiefEvents: { action: string; cost: number; taunt: string }[] = [
    { action: "啃坏了你的旗杆支架，临时找木匠修补", cost: 2, taunt: "你那旗杆松得像你的意志。我替你测试了强度，结果你看到了。" },
    { action: "在你的地图上拉了一坨，只能重新买一份地图", cost: 5, taunt: "这叫标记领地。你不懂战略——你只懂折叠。" },
    { action: "把帐篷角啄出个洞，夜里漏风漏雨", cost: 3, taunt: "你睡得太香了，我给你加点现实的寒意。" },
    { action: "啄穿了粮袋，顺手把几把麦子撒给路人", cost: 2, taunt: "别这么小气，社会需要流动性。你的粮食也需要。" },
    { action: "把罗盘指针叼走当玩具，只能换一个新的", cost: 4, taunt: "方向？你又不用。你靠‘感觉’迷路。" },
    { action: "把你的笔记啄得满是洞，重新誊写买纸买墨", cost: 3, taunt: "你那战术写得像遗书，我帮你做了删改。" },
    { action: "偷喝了酒馆桌上的麦酒，被迫赔礼道歉", cost: 2, taunt: "我只是替你社交。你连赔钱都不会赔得体面。" },
    { action: "把马缰绳咬出毛边，换了条新缰", cost: 4, taunt: "你骑马的技术配不上完整的缰绳。" },
    { action: "把你珍藏的干果叼去‘投资’，投资回报为零", cost: 2, taunt: "别看我，我这是替你体验创业失败。" },
    { action: "把炊具踢翻烫坏了锅底，重新打了一口小锅", cost: 3, taunt: "你指挥打仗不行，煮饭也不行。至少我让你知道锅会反抗。" }
  ];

  const rollMineralPurity = (): MineralPurity => {
    const roll = Math.random();
    if (roll < 0.35) return 1;
    if (roll < 0.65) return 2;
    if (roll < 0.85) return 3;
    if (roll < 0.95) return 4;
    return 5;
  };

  useEffect(() => {
    sessionStorage.removeItem('game.logs');

    const baseUrl = localStorage.getItem('openai.baseUrl');
    const key = localStorage.getItem('openai.key');
    const model = localStorage.getItem('openai.model');
    const provider = localStorage.getItem('ai.provider');
    const doubaoKey = localStorage.getItem('doubao.key');
    const geminiKey = localStorage.getItem('gemini.key');
    const profilesRaw = localStorage.getItem('openai.profiles');
    const activeProfileId = localStorage.getItem('openai.profile.active');
    const battleStream = localStorage.getItem('battle.stream');
    const battleMode = localStorage.getItem('battle.mode');
    let profiles: { id: string; name: string; baseUrl: string; key: string; model: string }[] = [];
    if (profilesRaw) {
      try {
        const parsed = JSON.parse(profilesRaw);
        if (Array.isArray(parsed)) {
          profiles = parsed.filter(p => p && typeof p.id === 'string');
        }
      } catch {
      }
    }
    if (profiles.length === 0) {
      const defaultProfile = {
        id: `profile_${Date.now()}`,
        name: '默认',
        baseUrl: baseUrl ?? 'https://api.openai.com',
        key: key ?? '',
        model: model ?? ''
      };
      profiles = [defaultProfile];
      localStorage.setItem('openai.profiles', JSON.stringify(profiles));
      localStorage.setItem('openai.profile.active', defaultProfile.id);
      setOpenAIProfiles(profiles);
      setActiveOpenAIProfileId(defaultProfile.id);
      setOpenAIProfileName(defaultProfile.name);
      setOpenAIBaseUrl(defaultProfile.baseUrl);
      setOpenAIKey(defaultProfile.key);
      setOpenAIModel(defaultProfile.model);
    } else {
      setOpenAIProfiles(profiles);
      const activeProfile = profiles.find(p => p.id === activeProfileId) ?? profiles[0];
      setActiveOpenAIProfileId(activeProfile.id);
      setOpenAIProfileName(activeProfile.name);
      setOpenAIBaseUrl(activeProfile.baseUrl);
      setOpenAIKey(activeProfile.key);
      setOpenAIModel(activeProfile.model);
    }
    const normalizedProvider = provider === 'GPT' || provider === 'GEMINI' || provider === 'DOUBAO' || provider === 'CUSTOM'
      ? provider
      : 'CUSTOM';
    setAIProvider(normalizedProvider as AIProvider);
    setDoubaoApiKey(doubaoKey ?? '');
    setGeminiApiKey(geminiKey ?? '');
    if (battleStream) setBattleStreamEnabled(battleStream === '1' || battleStream === 'true');
    if (battleMode === 'AI' || battleMode === 'PROGRAM') setBattleResolutionMode(battleMode);
  }, []);

  useEffect(() => {
    try {
      sessionStorage.setItem('game.logs', JSON.stringify(logs.slice(0, 120)));
    } catch {
    }
  }, [logs]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePos({ x: e.clientX, y: e.clientY });
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  useEffect(() => {
    if (view !== 'MAP') {
      setHoveredLocation(null);
    }
  }, [view]);

  useEffect(() => {
    const battleTroops = getBattleTroops(player, heroes);
    const ids = new Set(battleTroops.map(t => t.id));
    setBattlePlan(prev => {
      const layers = prev.layers.length === DEFAULT_BATTLE_LAYERS.length ? prev.layers : DEFAULT_BATTLE_LAYERS;
      const layerIds = new Set(layers.map(layer => layer.id));
      const assignments: Record<string, string | null> = {};
      battleTroops.forEach(troop => {
        const existing = prev.assignments[troop.id];
        if (existing === null) {
          assignments[troop.id] = null;
          return;
        }
        if (existing && layerIds.has(existing)) {
          assignments[troop.id] = existing;
          return;
        }
        assignments[troop.id] = getDefaultLayerId(troop, layers);
      });
      const protectedTroopIds = prev.protectedTroopIds.filter(id => ids.has(id));
      return { ...prev, layers, assignments, protectedTroopIds };
    });
  }, [player.troops, heroes]);

  useEffect(() => {
    const el = mapRef.current;
    if (!el) return;
    const wheelHandler = (e: WheelEvent) => {
      e.preventDefault();
      e.stopPropagation();

      const zoomSensitivity = 0.001;
      const delta = -e.deltaY * zoomSensitivity;
      const current = targetZoomRef.current;
      const next = Math.min(Math.max(0.5, current + delta), 3);

      const rect = mapRef.current?.getBoundingClientRect();
      if (rect) {
        const screen = { x: e.clientX - rect.left, y: e.clientY - rect.top };
        const unitSize = 10 * zoomRef.current;
        const translateX = -200 * unitSize + cameraRef.current.x;
        const translateY = -200 * unitSize + cameraRef.current.y;
        const world = { x: (screen.x - translateX) / unitSize, y: (screen.y - translateY) / unitSize };
        zoomAnchorRef.current = { screen, world };
      }

      if (next !== current) setTargetZoom(next);
    };
    el.addEventListener('wheel', wheelHandler, { passive: false });
    return () => el.removeEventListener('wheel', wheelHandler);
  }, [view]);

  useEffect(() => {
    zoomRef.current = zoom;
  }, [zoom]);

  useEffect(() => {
    targetZoomRef.current = targetZoom;
  }, [targetZoom]);

  useEffect(() => {
    cameraRef.current = camera;
  }, [camera]);

  useEffect(() => {
    isDraggingRef.current = isDragging;
  }, [isDragging]);

  // --- Animation Loop for Movement ---
  useEffect(() => {
    const animate = (time: number) => {
      if (lastTimeRef.current === 0) lastTimeRef.current = time;
      const deltaTime = (time - lastTimeRef.current) / 1000;
      lastTimeRef.current = time;

      if (targetPosition) {
        setPlayer(prev => {
          const dx = targetPosition.x - prev.position.x;
          const dy = targetPosition.y - prev.position.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          const speed = 36; // Units per second (Reduced from 60 to 36 for 0.6x speed)

          if (dist < 0.5) {
             // Arrived
             const finalPos = targetPosition;
             if (!hasArrivedRef.current) {
               hasArrivedRef.current = true;
               const token = activeTravelTokenRef.current;
               setTimeout(() => finishTravel(finalPos, token), 0);
             }
             return { ...prev, position: finalPos };
          }

          // Normalize and move
          const moveDist = Math.min(dist, speed * deltaTime);
          const moveX = (dx / dist) * moveDist;
          const moveY = (dy / dist) * moveDist;

          return {
            ...prev,
            position: { x: prev.position.x + moveX, y: prev.position.y + moveY }
          };
        });
      }

      const currentZoom = zoomRef.current;
      const desiredZoom = targetZoomRef.current;
      const zoomDiff = desiredZoom - currentZoom;
      if (Math.abs(zoomDiff) > 0.0005) {
        const t = Math.min(1, 12 * deltaTime);
        const nextZoom = currentZoom + zoomDiff * t;
        const roundedZoom = Math.round(nextZoom * 1000) / 1000;
        zoomRef.current = roundedZoom;
        setZoom(roundedZoom);

        const anchor = zoomAnchorRef.current;
        if (anchor && mapRef.current && !isDraggingRef.current) {
          const unitSize = 10 * roundedZoom;
          const nextCamera = {
            x: anchor.screen.x - anchor.world.x * unitSize + 200 * unitSize,
            y: anchor.screen.y - anchor.world.y * unitSize + 200 * unitSize
          };
          const roundedCamera = {
            x: Math.round(nextCamera.x * 10) / 10,
            y: Math.round(nextCamera.y * 10) / 10
          };
          cameraRef.current = roundedCamera;
          setCamera(roundedCamera);
        }
      } else if (Math.abs(zoomDiff) > 0) {
        zoomRef.current = desiredZoom;
        setZoom(desiredZoom);
        zoomAnchorRef.current = null;
      }

      movementRef.current = requestAnimationFrame(animate);
    };
    movementRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(movementRef.current);
  }, [targetPosition]);

  // --- Parrot Chatter Effect ---
  useEffect(() => {
     if (player.parrots.length === 0) return;

     const chatterInterval = setInterval(() => {
        if (Math.random() < 0.25) { 
           const prev = playerRef.current;
           if (prev.parrots.length === 0) return;

           const index = Math.floor(Math.random() * prev.parrots.length);
           const p = prev.parrots[index];
           const list = parrotChatter[p.personality] ?? parrotChatter.SARCASTIC;
           const msg = list[Math.floor(Math.random() * list.length)];
           
           addLog(`[${p.name}]: ${msg}`);
           const nextParrots = prev.parrots.map((x, i) => i === index ? { ...x, tauntCount: (x.tauntCount ?? 0) + 1 } : x);
           setPlayer({ ...prev, parrots: nextParrots });
        }
     }, 10000);
     return () => clearInterval(chatterInterval);
  }, [player.parrots.length]);

  // --- RPG Logic ---

  const gainXp = (amount: number) => {
     const prev = playerRef.current;
     const { xp, level, attributePoints, maxXp, logs } = calculateXpGain(prev.xp, prev.level, prev.attributePoints, prev.maxXp, amount);
     
     setPlayer({
       ...prev,
       xp,
       level,
       attributePoints,
       maxXp
     });
     logs.forEach(addLog);
   };

  const spendAttributePoint = (attr: keyof PlayerAttributes) => {
    setPlayer(prev => {
      if (prev.attributePoints <= 0) return prev;
      const newAttrs = { ...prev.attributes, [attr]: prev.attributes[attr] + 1 };
      
      // Update derived stats
      let extraUpdates = {};
      if (attr === 'hp') {
        extraUpdates = { maxHp: prev.maxHp + 10, currentHp: prev.currentHp + 10 };
      }

      return {
        ...prev,
        attributePoints: prev.attributePoints - 1,
        attributes: newAttrs,
        ...extraUpdates
      };
    });
  };

  const spendHeroAttributePoint = (heroId: string, key: 'attack' | 'hp' | 'agility') => {
    setHeroes(prev => prev.map(hero => {
      if (hero.id !== heroId) return hero;
      if (hero.attributePoints <= 0) return hero;
      const nextAttributes = { ...hero.attributes, [key]: hero.attributes[key] + 1 };
      const extra = key === 'hp'
        ? { maxHp: hero.maxHp + 10, currentHp: hero.currentHp + 10 }
        : {};
      return {
        ...hero,
        attributePoints: hero.attributePoints - 1,
        attributes: nextAttributes,
        ...extra
      };
    }));
  };

  const getMaxTroops = () => 20 + player.attributes.leadership * 5;

  const recoverHp = () => {
    if (player.currentHp < player.maxHp) {
      const healAmount = 5 + Math.floor(player.maxHp * 0.1);
      const newHp = Math.min(player.maxHp, player.currentHp + healAmount);
      const newStatus = newHp > 20 ? 'ACTIVE' : player.status;
      return { currentHp: newHp, status: newStatus as 'ACTIVE' | 'INJURED' };
    }
    return {};
  };

  // --- Map Interaction ---

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX - camera.x, y: e.clientY - camera.y });
    zoomAnchorRef.current = null;
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    const newX = e.clientX - dragStart.x;
    const newY = e.clientY - dragStart.y;
    setCamera({ x: newX, y: newY });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const moveTo = (targetX: number, targetY: number, locationId?: string) => {
    if (isDragging) return;
    if (targetPosition) return; // Already moving
    
    // Find location object if ID provided
    const loc = locations.find(l => l.id === locationId);
    if (loc) {
      const dx = loc.coordinates.x - player.position.x;
      const dy = loc.coordinates.y - player.position.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < 2) {
        addLog(`你已经在 ${loc.name}。`);
        enterLocation(loc);
        return;
      }
    }

    hasArrivedRef.current = false;
    travelTokenRef.current += 1;
    activeTravelTokenRef.current = travelTokenRef.current;
    setTargetPosition({ x: targetX, y: targetY });
  };

  const focusLocationOnMap = (location: Location) => {
    setIsMapListOpen(false);
    setView('MAP');

    const desiredZoom = 1.4;
    zoomAnchorRef.current = null;
    zoomRef.current = desiredZoom;
    targetZoomRef.current = desiredZoom;
    setZoom(desiredZoom);
    setTargetZoom(desiredZoom);

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const el = mapRef.current;
        if (!el) return;
        const rect = el.getBoundingClientRect();
        const unitSize = 10 * desiredZoom;
        const centerX = rect.width / 2;
        const centerY = rect.height / 2;
        const nextCamera = {
          x: centerX - (location.coordinates.x - 200) * unitSize,
          y: centerY - (location.coordinates.y - 200) * unitSize
        };
        cameraRef.current = nextCamera;
        setCamera(nextCamera);
      });
    });
  };

  // Modified to accept arrivalPos explicitly to avoid stale state closure issues
  const finishTravel = (arrivalPos: {x: number, y: number}, travelToken: number) => {
    setTargetPosition(null);
    hasArrivedRef.current = false;
    if (processedTravelTokenRef.current === travelToken) return;
    processedTravelTokenRef.current = travelToken;
    
    // Find if we hit a location using the explicit arrival position
    const hitLocation = locations.find(l => {
       const dx = l.coordinates.x - arrivalPos.x;
       const dy = l.coordinates.y - arrivalPos.y;
       return Math.sqrt(dx*dx + dy*dy) < 2;
    });

    if (hitLocation?.type === 'FIELD_CAMP') {
      setPlayer(prev => ({ ...prev, position: arrivalPos }));
      enterLocation(hitLocation);
      return;
    }

    processDailyCycle(hitLocation);
  };

  const siegeEngineOptions: { type: SiegeEngineType; name: string; cost: number; days: number; description: string }[] = [
    { type: 'RAM', name: '攻城锤', cost: 400, days: 2, description: '破门专用，短时间内撕开城门。' },
    { type: 'TOWER', name: '攻城塔', cost: 700, days: 3, description: '掩护士兵登墙，减少远程伤亡。' },
    { type: 'CATAPULT', name: '投石机', cost: 900, days: 4, description: '远程轰击，摧毁防御器械。' },
    { type: 'SIMPLE_LADDER', name: '简易攻城梯', cost: 0, days: 0, description: '无需建造，直接攻城（高伤亡风险）。' }
  ];
  const siegeEngineCombatStats: Record<SiegeEngineType, { hp: number; wallDamage: number; attackerRangedHit: number; attackerRangedDamage: number; attackerMeleeHit: number; attackerMeleeDamage: number; defenderRangedHitPenalty: number; defenderRangedDamagePenalty: number }> = {
    RAM: { hp: 520, wallDamage: 160, attackerRangedHit: 0, attackerRangedDamage: 0, attackerMeleeHit: 0.08, attackerMeleeDamage: 0.12, defenderRangedHitPenalty: 0.03, defenderRangedDamagePenalty: 0 },
    TOWER: { hp: 480, wallDamage: 70, attackerRangedHit: 0.05, attackerRangedDamage: 0.06, attackerMeleeHit: 0.04, attackerMeleeDamage: 0.04, defenderRangedHitPenalty: 0.08, defenderRangedDamagePenalty: 0.05 },
    CATAPULT: { hp: 380, wallDamage: 210, attackerRangedHit: 0.02, attackerRangedDamage: 0.03, attackerMeleeHit: 0, attackerMeleeDamage: 0, defenderRangedHitPenalty: 0.06, defenderRangedDamagePenalty: 0.08 },
    SIMPLE_LADDER: { hp: 160, wallDamage: 35, attackerRangedHit: -0.02, attackerRangedDamage: 0, attackerMeleeHit: 0.06, attackerMeleeDamage: 0.08, defenderRangedHitPenalty: 0, defenderRangedDamagePenalty: 0 }
  };

  const buildingOptions: { type: BuildingType; name: string; cost: number; days: number; description: string }[] = [
    { type: 'FACTORY', name: '工厂', cost: 600, days: 3, description: '每隔数天带来稳定收益。' },
    { type: 'TRAINING_CAMP', name: '训练营', cost: 500, days: 3, description: '驻军获得经验并自动晋升。' },
    { type: 'BARRACKS', name: '兵营', cost: 800, days: 4, description: '驻军容量提升 50%。' },
    { type: 'DEFENSE', name: '防御建筑', cost: 700, days: 4, description: '增强据点防御强度。' },
    { type: 'RECRUITER', name: '征兵官', cost: 650, days: 3, description: '定期招募新兵加入驻军。' }
  ];

  const getBuildingName = (type: BuildingType) => buildingOptions.find(b => b.type === type)?.name ?? type;
  const getSiegeEngineName = (type: SiegeEngineType) => siegeEngineOptions.find(s => s.type === type)?.name ?? type;

  const getGarrisonLimit = (location: Location) => {
    const base = location.type === 'CITY'
      ? 8000
      : isCastleLikeLocation(location)
        ? 5000
        : location.type === 'ROACH_NEST'
          ? 15000
          : 2000;
    const hasBarracks = (location.buildings ?? []).includes('BARRACKS');
    return hasBarracks ? Math.floor(base * 1.5) : base;
  };

  const getGarrisonCount = (troops: Troop[]) => troops.reduce((sum, t) => sum + t.count, 0);
  const mergeTroops = (base: Troop[], extra: Troop[]) => {
    const map = new Map<string, Troop>();
    base.forEach(t => map.set(t.id, { ...t }));
    extra.forEach(t => {
      if (t.count <= 0) return;
      const current = map.get(t.id);
      if (current) {
        current.count += t.count;
      } else {
        map.set(t.id, { ...t });
      }
    });
    return Array.from(map.values()).filter(t => t.count > 0);
  };
  const splitTroops = (troops: Troop[], ratio: number) => {
    const attackers: Troop[] = [];
    const remaining: Troop[] = [];
    troops.forEach(t => {
      const splitCount = Math.max(0, Math.floor(t.count * ratio));
      const remainCount = t.count - splitCount;
      if (splitCount > 0) attackers.push({ ...t, count: splitCount });
      if (remainCount > 0) remaining.push({ ...t, count: remainCount });
    });
    return { attackers, remaining };
  };
  const getFactionLocations = (factionId: string, pool: Location[]) => {
    return pool.filter(loc => (
      loc.factionId === factionId &&
      loc.owner !== 'PLAYER' &&
      (loc.type === 'CITY' || loc.type === 'CASTLE' || loc.type === 'VILLAGE')
    ));
  };
  const getLocationTroops = (loc: Location) => {
    return (loc.garrison && loc.garrison.length > 0 ? loc.garrison : buildGarrisonTroops(loc)).map(t => ({ ...t }));
  };

  const buildImposterTroops = () => {
    // Generate a random attack force
    const roster = [
      // Tier 1
      { id: 'void_larva', count: randomInt(40, 60) },
      { id: 'glitch_pawn', count: randomInt(40, 60) },
      { id: 'static_noise_walker', count: randomInt(30, 50) },
      { id: 'imposter_light_infantry', count: randomInt(40, 70) },
      { id: 'imposter_spearman', count: randomInt(35, 60) },
      { id: 'imposter_short_bowman', count: randomInt(30, 50) },
      // Tier 2
      { id: 'entropy_acolyte', count: randomInt(20, 30) },
      { id: 'pixel_shifter', count: randomInt(15, 25) },
      { id: 'syntax_error_scout', count: randomInt(15, 25) },
      { id: 'imposter_heavy_infantry', count: randomInt(15, 25) },
      { id: 'imposter_longbowman', count: randomInt(12, 20) },
      // Tier 3
      { id: 'memory_leak_mage', count: randomInt(5, 10) },
      { id: 'recursion_archer', count: randomInt(8, 15) },
      { id: 'buffer_overflow_brute', count: randomInt(5, 10) },
      { id: 'imposter_heavy_knight', count: randomInt(2, 4) },
      // Tier 4
      { id: 'kernel_panic_knight', count: randomInt(2, 5) },
      { id: 'blue_screen_golem', count: randomInt(1, 3) }
    ];
    
    return roster
      .map(unit => {
        const template = getTroopTemplate(unit.id);
        return template ? { ...template, count: unit.count, xp: 0 } : null;
      })
      .filter(Boolean) as Troop[];
  };

  const pickImposterTarget = (portal: Location, pool: Location[]) => {
    const candidates = pool.filter(loc => (
      loc.id !== portal.id &&
      (loc.type === 'CITY' || loc.type === 'CASTLE' || loc.type === 'VILLAGE') &&
      loc.owner !== 'ENEMY' &&
      !loc.activeSiege
    ));
    if (candidates.length === 0) return null;
    const ranked = candidates
      .map(loc => ({
        loc,
        dist: Math.hypot(loc.coordinates.x - portal.coordinates.x, loc.coordinates.y - portal.coordinates.y)
      }))
      .sort((a, b) => a.dist - b.dist);
    const shortlist = ranked.slice(0, Math.min(4, ranked.length));
    return shortlist[Math.floor(Math.random() * shortlist.length)].loc;
  };

  const applyGarrisonTraining = (troops: Troop[], xpGain: number) => {
    const updated = troops.map(t => ({ ...t, xp: t.xp + (t.id.startsWith('roach_') ? 0 : xpGain) }));
    for (let i = 0; i < updated.length; i++) {
      let troop = updated[i];
      while (troop.upgradeTargetId && troop.xp >= troop.maxXp && troop.count > 0) {
        troop = { ...troop, xp: troop.xp - troop.maxXp, count: troop.count - 1 };
        const targetTemplate = getTroopTemplate(troop.upgradeTargetId);
        if (!targetTemplate) break;
        const targetIndex = updated.findIndex(t => t.id === targetTemplate.id);
        if (targetIndex >= 0) {
          updated[targetIndex] = { ...updated[targetIndex], count: updated[targetIndex].count + 1 };
        } else {
          updated.push({ ...targetTemplate, count: 1, xp: 0 });
        }
      }
      updated[i] = troop;
    }
    return updated.filter(t => t.count > 0);
  };

  const processDailyCycle = (location?: Location, rentCost: number = 0, days: number = 1, workIncomePerDay: number = 0, suppressEncounter: boolean = false) => {
    let newLocations = [...locations];
    let nextPlayer = { ...playerRef.current };
    let nextHeroes = heroesRef.current.map(h => ({ ...h }));
    let nextLords = lordsRef.current.map(lord => ({ ...lord, partyTroops: lord.partyTroops.map(t => ({ ...t })) }));
    let nextBattleTimeline = [...battleTimelineRef.current];
    let nextWorldDiplomacy = worldDiplomacyRef.current;
    const logsToAdd: string[] = [];
    const isRoachId = (id: string) => id.startsWith('roach_');
    const isImposterControlledLocation = (loc: Location) => {
      if (loc.owner !== 'ENEMY') return false;
      const troops = loc.garrison ?? [];
      if (troops.length === 0) return false;
      const total = troops.reduce((sum, t) => sum + (t.count ?? 0), 0);
      if (total <= 0) return false;
      const imposter = troops.reduce((sum, t) => sum + (IMPOSTER_TROOP_IDS.has(t.id) ? (t.count ?? 0) : 0), 0);
      return imposter / total >= 0.6;
    };
    const rollBinomial = (n: number, p: number) => {
      if (n <= 0) return 0;
      if (p <= 0) return 0;
      if (p >= 1) return n;
      if (n <= 80) {
        let k = 0;
        for (let i = 0; i < n; i++) if (Math.random() < p) k++;
        return k;
      }
      const mean = n * p;
      const variance = n * p * (1 - p);
      const std = Math.sqrt(Math.max(0, variance));
      let u = 0;
      let v = 0;
      while (u === 0) u = Math.random();
      while (v === 0) v = Math.random();
      const z = Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
      const approx = Math.round(mean + z * std);
      return Math.max(0, Math.min(n, approx));
    };

    for (let dayIndex = 0; dayIndex < days; dayIndex++) {
      const banditCampCount = newLocations.filter(l => l.type === 'BANDIT_CAMP').length;
      if (banditCampCount < 15 && Math.random() < 0.03) {
        const spawnX = Math.floor(Math.random() * MAP_WIDTH);
        const spawnY = Math.floor(Math.random() * MAP_HEIGHT);
        const newCamp: Location = {
          id: `bandit_camp_${Date.now()}_${dayIndex}`,
          name: '劫匪窝点',
          type: 'BANDIT_CAMP',
          description: '一群法外之徒聚集的临时营地。',
          coordinates: { x: spawnX, y: spawnY },
          terrain: 'BANDIT_CAMP',
          lastRefreshDay: 0,
          banditSpawnDay: nextPlayer.day,
          volunteers: [],
          mercenaries: [],
          owner: 'NEUTRAL',
          isUnderSiege: false,
          siegeProgress: 0,
          siegeEngines: [],
          garrison: [],
          buildings: [],
          constructionQueue: [],
          siegeEngineQueue: [],
          lastIncomeDay: 0
        };
        newLocations.push(newCamp);
        logsToAdd.push("侦察兵报告：发现了一处新的劫匪窝点！");
      }

      const nextDay = nextPlayer.day + 1;
      const getGarrisonCap = (loc: Location) => Math.floor((loc.garrisonBaseLimit ?? getDefaultGarrisonBaseLimit(loc)) * 1.2);
      const appendLocalLog = (loc: Location, text: string) => {
        const safe = String(text ?? '').trim();
        if (!safe) return loc;
        const existing = Array.isArray(loc.localLogs) ? loc.localLogs : [];
        if (existing.length > 0 && existing[0].text === safe) return loc;
        const nextLogs = [{ day: nextDay, text: safe }, ...existing].slice(0, 30);
        return { ...loc, localLogs: nextLogs };
      };
      const addLocalLog = (locationId: string, text: string) => {
        newLocations = newLocations.map(loc => loc.id === locationId ? appendLocalLog(loc, text) : loc);
      };
      const applyRecruitment = (troops: Troop[], loc: Location, amount: number) => {
        if (amount <= 0) return troops;
        const recruitId = loc.type === 'CITY'
          ? 'militia'
          : isUndeadFortressLocation(loc)
            ? 'zombie'
            : isCastleLikeLocation(loc)
              ? 'footman'
              : 'peasant';
        const template = getTroopTemplate(recruitId);
        if (!template) return troops;
        const updated = [...troops];
        const index = updated.findIndex(t => t.id === template.id);
        if (index >= 0) {
          updated[index] = { ...updated[index], count: updated[index].count + amount };
        } else {
          updated.push({ ...template, count: amount, xp: 0 });
        }
        return updated;
      };
      const updateLordAction = (loc: Location, text: string) => {
        if (!loc.lord) return loc;
        const safe = String(text ?? '').trim();
        const existingMemories = Array.isArray(loc.lord.memories) ? loc.lord.memories : [];
        const nextMemories = safe
          ? [{ day: nextDay, text: safe }, ...existingMemories].slice(0, 10)
          : existingMemories;
        const updated = appendLocalLog(loc, safe);
        return { ...updated, lord: { ...updated.lord!, lastAction: { day: nextDay, text: safe }, memories: nextMemories } };
      };
      const updateStayPartyTroops = (loc: Location, partyId: string, troops: Troop[]) => {
        const parties = loc.stayParties ?? [];
        const nextParties = parties.map(p => p.id === partyId ? { ...p, troops } : p);
        return { ...loc, stayParties: nextParties };
      };

      let hpUpdate = {};
      if (nextPlayer.currentHp < nextPlayer.maxHp) {
        const healAmount = 5 + Math.floor(nextPlayer.maxHp * 0.1);
        const newHp = Math.min(nextPlayer.maxHp, nextPlayer.currentHp + healAmount);
        const newStatus = newHp > 20 ? 'ACTIVE' : nextPlayer.status;
        hpUpdate = { currentHp: newHp, status: newStatus as 'ACTIVE' | 'INJURED' };
      }

      let newGold = Math.max(0, nextPlayer.gold - rentCost) + workIncomePerDay;

      const cityPool = newLocations.filter(l => l.type === 'CITY');
      const cityIds = cityPool.map(l => l.id);
      const pickCityId = (excludeId?: string) => {
        if (cityIds.length === 0) return null;
        if (cityIds.length === 1) return cityIds[0];
        const candidates = cityIds.filter(id => id !== excludeId);
        const pool = candidates.length > 0 ? candidates : cityIds;
        return pool[Math.floor(Math.random() * pool.length)];
      };
      const getXenoAcceptanceScore = (temperament: string, traits: string[]) => {
        const temperamentScores: Record<string, number> = {
          强硬: -18,
          稳重: 6,
          多疑: -26,
          豪爽: 18,
          谨慎: 0,
          冷峻: -22,
          宽厚: 24,
          冷静: 4
        };
        const traitScores: Record<string, number> = {
          好战: -16,
          务实: -2,
          忠诚: 0,
          谨慎: -6,
          野心: -10,
          仁慈: 18,
          狡黠: -6,
          守旧: -20,
          热情: 12,
          冷静: 0
        };
        const base = temperamentScores[temperament] ?? 0;
        const traitSum = (traits || []).reduce((sum, trait) => sum + (traitScores[trait] ?? 0), 0);
        return Math.max(-40, Math.min(30, base + traitSum));
      };

      nextHeroes = nextHeroes.map(hero => {
        if (hero.recruited) {
          if (hero.currentHp < hero.maxHp) {
            const medicine = nextPlayer.attributes.medicine ?? 0;
            const healRatio = 0.08 + medicine * 0.02;
            const healAmount = Math.max(1, Math.floor(hero.maxHp * healRatio));
            const newHp = Math.min(hero.maxHp, hero.currentHp + healAmount);
            const newStatus = newHp / hero.maxHp >= 0.8 ? 'ACTIVE' : 'INJURED';
            return { ...hero, currentHp: newHp, status: newStatus };
          }
          return hero;
        }

        const currentCityId = hero.locationId;
        if (currentCityId && !cityIds.includes(currentCityId)) {
          return { ...hero, locationId: undefined, stayDays: undefined };
        }

        if (currentCityId) {
          const currentCity = newLocations.find(loc => loc.id === currentCityId);
          const heroRace = hero.race ?? 'HUMAN';
          if (currentCity?.lord && heroRace !== 'HUMAN') {
            const acceptance = getXenoAcceptanceScore(currentCity.lord.temperament, currentCity.lord.traits || []);
            if (acceptance <= -10 && Math.random() < 0.35) {
              const nextCityId = pickCityId(currentCityId);
              if (!nextCityId) {
                logsToAdd.push(`【英雄流动】${hero.name} 在 ${currentCity.name} 被排外驱逐。`);
                addLocalLog(currentCity.id, `异族英雄${hero.name}被城主驱逐。`);
                return { ...hero, locationId: undefined, stayDays: undefined };
              }
              const nextCityName = newLocations.find(loc => loc.id === nextCityId)?.name ?? '其他城市';
              const nextStay = randomInt(2, 5);
              logsToAdd.push(`【英雄流动】${hero.name} 在 ${currentCity.name} 被排外驱逐，前往 ${nextCityName}。`);
              addLocalLog(currentCity.id, `异族英雄${hero.name}被城主驱逐。`);
              return { ...hero, locationId: nextCityId, stayDays: nextStay };
            }
          }
          const remaining = (hero.stayDays ?? randomInt(2, 5)) - 1;
          if (remaining > 0) {
            return { ...hero, stayDays: remaining };
          }
          const nextCityId = pickCityId(currentCityId);
          if (!nextCityId) return { ...hero, locationId: undefined, stayDays: undefined };
          const nextStay = randomInt(2, 5);
          return { ...hero, locationId: nextCityId, stayDays: nextStay };
        }

        if (Math.random() < 0.25) {
          const nextCityId = pickCityId();
          if (!nextCityId) return hero;
          const nextStay = randomInt(2, 5);
          return { ...hero, locationId: nextCityId, stayDays: nextStay };
        }

        return hero;
      });

      let nextTroops = nextPlayer.troops.map(t => ({ ...t }));
      const trainingLevel = nextPlayer.attributes.training ?? 0;
      const trainableTroops = nextTroops.filter(t => !isRoachId(t.id));
      const trainableUnits = trainableTroops.reduce((sum, t) => sum + t.count, 0);
      if (trainingLevel > 0 && trainableUnits > 0) {
        const trainees = randomInt(1, Math.min(5, trainableUnits));
        const xpPerUnit = 2 + trainingLevel;
        for (let i = 0; i < trainees; i++) {
          let roll = Math.random() * trainableUnits;
          let pickedId = trainableTroops[0]?.id ?? '';
          for (let j = 0; j < trainableTroops.length; j++) {
            roll -= trainableTroops[j].count;
            if (roll < 0) {
              pickedId = trainableTroops[j].id;
              break;
            }
          }
          const idx = nextTroops.findIndex(t => t.id === pickedId);
          if (idx >= 0) nextTroops[idx].xp += xpPerUnit;
        }
        logsToAdd.push(`训练：${trainees} 名士兵获得了经验（+${xpPerUnit}）。`);
      }

      nextTroops = nextTroops.map(t => {
        if (!isRoachId(t.id)) return t;
        const tmpl = getTroopTemplate(t.id);
        if (!tmpl) return { ...t, xp: 0 };
        return { ...tmpl, count: t.count, xp: 0, enchantments: t.enchantments ?? [] };
      });

      const roachUpgrades: Array<{ fromId: string; toId: string; count: number }> = [];
      for (const troop of nextTroops) {
        if (!isRoachId(troop.id)) continue;
        const tmpl = getTroopTemplate(troop.id);
        const tier = tmpl?.tier ?? troop.tier;
        if (tier !== TroopTier.TIER_1 && tier !== TroopTier.TIER_2) continue;
        const p = tier === TroopTier.TIER_1 ? 0.04 : 0.005;
        const toId = tmpl?.upgradeTargetId ?? troop.upgradeTargetId;
        if (!toId) continue;
        const k = rollBinomial(troop.count, p);
        if (k > 0) roachUpgrades.push({ fromId: troop.id, toId, count: k });
      }

      if (roachUpgrades.length > 0) {
        const troopMap = new Map(nextTroops.map(t => [t.id, { ...t }]));
        const order = nextTroops.map(t => t.id);

        for (const up of roachUpgrades) {
          const from = troopMap.get(up.fromId);
          const fromTemplate = getTroopTemplate(up.fromId);
          if (!from || !fromTemplate) continue;
          const toTemplate = getTroopTemplate(up.toId);
          if (!toTemplate) continue;

          const move = Math.min(up.count, from.count);
          if (move <= 0) continue;

          const nextFromCount = from.count - move;
          troopMap.set(up.fromId, { ...fromTemplate, count: nextFromCount, xp: 0, enchantments: from.enchantments ?? [] });

          const existingTo = troopMap.get(up.toId);
          if (existingTo) {
            troopMap.set(up.toId, { ...toTemplate, count: existingTo.count + move, xp: 0, enchantments: existingTo.enchantments ?? [] });
          } else {
            troopMap.set(up.toId, { ...toTemplate, count: move, xp: 0 });
          }
        }

        const seen = new Set(order);
        nextTroops = order
          .map(id => troopMap.get(id))
          .filter(Boolean)
          .map(t => t as Troop)
          .filter(t => t.count > 0);
        for (const [id, t] of troopMap.entries()) {
          if (seen.has(id)) continue;
          if (t.count > 0) nextTroops.push(t);
        }

        const details = roachUpgrades
          .filter(u => u.count > 0)
          .map(u => {
            const fromName = getTroopTemplate(u.fromId)?.name ?? u.fromId;
            const toName = getTroopTemplate(u.toId)?.name ?? u.toId;
            return `${fromName}→${toName}x${u.count}`;
          })
          .join('，');
        if (details) logsToAdd.push(`蟑螂吞噬了队伍里的粮食，发生蜕变：${details}。`);
      }

      let nextParrots = nextPlayer.parrots.map(p => ({
        ...p,
        daysWithYou: (p.daysWithYou ?? 0) + 1,
        tauntCount: p.tauntCount ?? 0,
        goldLost: p.goldLost ?? 0,
        nextMischiefDay: p.nextMischiefDay ?? (nextDay + randomInt(2, 4))
      }));

      for (let i = 0; i < nextParrots.length; i++) {
        const p = nextParrots[i];
        if (nextDay >= p.nextMischiefDay) {
          const ev = parrotMischiefEvents[Math.floor(Math.random() * parrotMischiefEvents.length)];
          newGold = Math.max(0, newGold - ev.cost);
          nextParrots[i] = {
            ...p,
            tauntCount: p.tauntCount + 1,
            goldLost: p.goldLost + ev.cost,
            nextMischiefDay: nextDay + randomInt(2, 4)
          };
          logsToAdd.push(`[${p.name}]: ${ev.taunt}`);
          logsToAdd.push(`【鹦鹉事故】${ev.action}（-${ev.cost} 第纳尔）`);
        }
      }

      newLocations = newLocations.map(loc => {
        let updated = { ...loc };
        const siegeEngineQueue = (updated.siegeEngineQueue ?? []).map(q => ({ ...q, daysLeft: q.daysLeft - 1 }));
        const finishedEngines = siegeEngineQueue.filter(q => q.daysLeft <= 0);
        const remainingEngines = siegeEngineQueue.filter(q => q.daysLeft > 0);
        if (finishedEngines.length > 0) {
          const existing = updated.siegeEngines ?? [];
          const counts = existing.reduce((acc, type) => {
            acc[type] = (acc[type] ?? 0) + 1;
            return acc;
          }, {} as Record<SiegeEngineType, number>);
          const ready: SiegeEngineType[] = [];
          const overflow: SiegeEngineType[] = [];
          finishedEngines.forEach(engine => {
            if ((counts[engine.type] ?? 0) < 3) {
              ready.push(engine.type);
              counts[engine.type] = (counts[engine.type] ?? 0) + 1;
              return;
            }
            overflow.push(engine.type);
          });
          if (ready.length > 0) {
            updated.siegeEngines = [...existing, ...ready];
            ready.forEach(type => logsToAdd.push(`${updated.name} 的 ${getSiegeEngineName(type)} 已准备完毕。`));
          }
          if (overflow.length > 0) {
            const overflowSummary = Object.entries(overflow.reduce((acc, type) => {
              acc[type] = (acc[type] ?? 0) + 1;
              return acc;
            }, {} as Record<SiegeEngineType, number>))
              .map(([type, count]) => `${getSiegeEngineName(type as SiegeEngineType)}x${count}`)
              .join('、');
            logsToAdd.push(`${updated.name} 的攻城器械已达上限，额外器械无法入列：${overflowSummary}`);
          }
        }
        updated.siegeEngineQueue = remainingEngines;

        const constructionQueue = (updated.constructionQueue ?? []).map(q => ({ ...q, daysLeft: q.daysLeft - 1 }));
        const finishedBuildings = constructionQueue.filter(q => q.daysLeft <= 0);
        const remainingBuildings = constructionQueue.filter(q => q.daysLeft > 0);
        if (finishedBuildings.length > 0) {
          const builtTypes = finishedBuildings.map(q => q.type);
          const existing = updated.buildings ?? [];
          updated.buildings = Array.from(new Set([...existing, ...builtTypes]));
          finishedBuildings.forEach(building => logsToAdd.push(`${updated.name} 的 ${getBuildingName(building.type)} 已建成。`));
        }
        updated.constructionQueue = remainingBuildings;

        if (updated.imposterAlertUntilDay && nextDay > updated.imposterAlertUntilDay) {
          updated.imposterAlertUntilDay = undefined;
        }
        // Removed automatic expiration for sackedUntilDay so the tag persists until liberation
        // if (updated.sackedUntilDay && nextDay > updated.sackedUntilDay) {
        //   updated.sackedUntilDay = undefined;
        // }

        if (updated.owner === 'PLAYER') {
          const buildings = updated.buildings ?? [];

          if (buildings.includes('FACTORY')) {
            const lastIncomeDay = updated.lastIncomeDay ?? 0;
            if (nextDay - lastIncomeDay >= 3) {
              const income = updated.type === 'CITY' ? 120 : isCastleLikeLocation(updated) ? 80 : 50;
              newGold += income;
              updated.lastIncomeDay = nextDay;
              logsToAdd.push(`【工厂】${updated.name} 贡献了 ${income} 第纳尔。`);
            }
          }

          if (buildings.includes('TRAINING_CAMP')) {
            const lastTrainingDay = updated.lastTrainingDay ?? 0;
            if (nextDay - lastTrainingDay >= 3) {
              updated.lastTrainingDay = nextDay;
              if ((updated.garrison ?? []).length > 0) {
                updated.garrison = applyGarrisonTraining(updated.garrison ?? [], 4);
                logsToAdd.push(`【训练营】${updated.name} 的驻军获得了经验。`);
              }
            }
          }

          if (buildings.includes('RECRUITER')) {
            const lastRecruitDay = updated.lastRecruitDay ?? 0;
            if (nextDay - lastRecruitDay >= 4) {
              updated.lastRecruitDay = nextDay;
              const limit = Math.floor((updated.garrisonBaseLimit ?? getDefaultGarrisonBaseLimit(updated)) * 1.2);
              const garrison = updated.garrison ?? [];
              const currentCount = getGarrisonCount(garrison);
              if (currentCount < limit) {
                const recruitCount = updated.type === 'CITY' ? 12 : isCastleLikeLocation(updated) ? 8 : 5;
                const available = Math.min(limit - currentCount, recruitCount);
                if (available > 0) {
                  const recruitId = updated.type === 'CITY'
                    ? 'militia'
                    : isUndeadFortressLocation(updated)
                      ? 'zombie'
                      : isCastleLikeLocation(updated)
                        ? 'footman'
                        : 'peasant';
                  const template = getTroopTemplate(recruitId);
                  if (template) {
                    const index = garrison.findIndex(t => t.id === template.id);
                    if (index >= 0) {
                      garrison[index] = { ...garrison[index], count: garrison[index].count + available };
                    } else {
                      garrison.push({ ...template, count: available, xp: 0 });
                    }
                    updated.garrison = garrison;
                    logsToAdd.push(`【征兵官】${updated.name} 新增了 ${available} 名守军。`);
                  }
                }
              }
            }
          }
        }

        return updated;
      });

      // Process Active Sieges (Daily Auto-Resolve)
      newLocations = newLocations.map(loc => {
         if (!loc.activeSiege) return loc;
         
         const siege = { ...loc.activeSiege };
         const defenderFactionId = loc.factionId;
         const claimFactionId = loc.claimFactionId ?? loc.factionId;
         const attackerFactionId = siege.attackerFactionId;
         const sampleTroop = siege.troops?.[0];
         const inferredRace = sampleTroop ? getTroopRace(sampleTroop) : 'UNKNOWN';
         const attackerRaceId: RaceId | null = attackerFactionId
           ? 'HUMAN'
           : (inferredRace && inferredRace !== 'UNKNOWN' ? (inferredRace as RaceId) : null);
         const siegeFactionName = siege.attackerFactionId ? (FACTIONS.find(f => f.id === siege.attackerFactionId)?.name ?? siege.attackerName) : siege.attackerName;
         let garrison = loc.garrison && loc.garrison.length > 0 ? [...loc.garrison] : buildGarrisonTroops(loc);
         const stayParties = (loc.stayParties ?? []).map(party => ({
           ...party,
           troops: party.troops.map(t => ({ ...t }))
         }));
         const stationedArmies = (loc.stationedArmies ?? []).map(army => ({
           ...army,
           troops: army.troops.map(t => ({ ...t }))
         }));
         let attackers = [...siege.troops];
         
         const attackerPower = calculatePower(attackers);
         const defenderPower = calculatePower([
           ...garrison,
           ...stayParties.flatMap(party => party.troops),
           ...stationedArmies.flatMap(army => army.troops)
         ]);
         const defense = getLocationDefenseDetails(loc);
         const wallBonus = 1 + (defense.wallLevel * 0.2);
         const effectiveDefenderPower = defenderPower * wallBonus;
         
         // Casualties (Simplified auto-resolve)
         // Base daily loss is 5-10%, modified by power ratio
         const baseLoss = 0.05 + (Math.random() * 0.05);
         const powerRatio = effectiveDefenderPower > 0 ? attackerPower / effectiveDefenderPower : 10;
         
         const defenderLossRate = Math.min(0.5, baseLoss * powerRatio);
         const attackerLossRate = Math.min(0.5, baseLoss * (1 / powerRatio));
         
         // Apply losses
         const applyLoss = (troops: Troop[], rate: number) => {
             return troops.map(t => ({
                 ...t,
                 count: Math.max(0, Math.floor(t.count * (1 - rate)))
             })).filter(t => t.count > 0);
         };
         
         garrison = applyLoss(garrison, defenderLossRate);
         const nextStayParties = stayParties
           .map(party => ({ ...party, troops: applyLoss(party.troops, defenderLossRate) }))
           .filter(party => party.troops.length > 0);
         const nextStationedArmies = stationedArmies
           .map(army => ({ ...army, troops: applyLoss(army.troops, defenderLossRate) }))
           .filter(army => army.troops.length > 0);
         attackers = applyLoss(attackers, attackerLossRate);
         
         siege.troops = attackers;
         
         const garrisonCount = getGarrisonCount([
           ...garrison,
           ...nextStayParties.flatMap(party => party.troops),
           ...nextStationedArmies.flatMap(army => army.troops)
         ]);
         const attackerCount = getGarrisonCount(attackers);

        if ((nextDay - siege.startDay) % 2 === 0) {
          addLocalLog(loc.id, `围攻仍在继续：攻${attackerCount} 守${garrisonCount}。`);
        }
         
         if (garrisonCount <= 0) {
             logsToAdd.push(`【据点陷落】${loc.name} 的守军全军覆没，据点被 ${siegeFactionName} 占领！`);
             addLocalLog(loc.id, `${loc.name} 守军覆灭，城池陷落。`);
             if (attackerFactionId && defenderFactionId && attackerFactionId !== defenderFactionId) {
               nextWorldDiplomacy = applyWorldDiplomacyDelta(nextWorldDiplomacy, { kind: 'FACTION_FACTION', aId: attackerFactionId, bId: defenderFactionId, delta: -18, text: `占领 ${loc.name}`, day: nextDay });
               nextWorldDiplomacy = applyWorldDiplomacyDelta(nextWorldDiplomacy, { kind: 'FACTION_FACTION', aId: defenderFactionId, bId: attackerFactionId, delta: -26, text: `失去 ${loc.name}`, day: nextDay });
             }
             if (!attackerFactionId && attackerRaceId && claimFactionId) {
               const raceLabel = RACE_LABELS[attackerRaceId] ?? '未知势力';
               nextWorldDiplomacy = applyWorldDiplomacyDelta(nextWorldDiplomacy, { kind: 'FACTION_RACE', aId: claimFactionId, bId: attackerRaceId, delta: -28, text: `${raceLabel} 占领 ${loc.name}`, day: nextDay });
               nextWorldDiplomacy = applyWorldDiplomacyDelta(nextWorldDiplomacy, { kind: 'RACE_RACE', aId: 'HUMAN', bId: attackerRaceId, delta: -6, text: `${raceLabel} 攻陷据点`, day: nextDay });
               nextWorldDiplomacy = applyWorldDiplomacyDelta(nextWorldDiplomacy, { kind: 'RACE_RACE', aId: attackerRaceId, bId: 'HUMAN', delta: -6, text: `攻陷人类据点`, day: nextDay });
             }
             return {
                 ...loc,
                 owner: 'ENEMY',
                 factionId: attackerFactionId ?? undefined,
                 claimFactionId: attackerFactionId ?? claimFactionId,
                 garrison: siege.troops, // Attackers move in
                 stayParties: [],
                 stationedArmies: [],
                 activeSiege: undefined,
                 sackedUntilDay: undefined,
                 lastRefreshDay: nextDay,
                 volunteers: [],
                 mercenaries: [],
                 lord: undefined,
                 isUnderSiege: false
             };
         }
         
        if (attackerCount <= 0) {
             // Attackers wiped - Siege Broken
             logsToAdd.push(`【围攻解除】${loc.name} 的守军击溃了 ${siegeFactionName} 的进攻部队！`);
             addLocalLog(loc.id, `围攻被击溃，守军守住城池。`);
             return {
                 ...loc,
                 garrison: garrison,
                 stayParties: nextStayParties,
                 stationedArmies: nextStationedArmies,
                activeSiege: undefined,
                isUnderSiege: false
             };
         }
         
         // Siege continues
         // AI Siege Engine Building Logic
         const currentEngines = siege.siegeEngines ?? [];
        if (Math.random() < 0.3) {
            const counts = currentEngines.reduce((acc, type) => {
                acc[type] = (acc[type] ?? 0) + 1;
                return acc;
            }, {} as Record<SiegeEngineType, number>);
            const candidates: SiegeEngineType[] = ['RAM', 'TOWER'];
            const available = candidates.filter(type => (counts[type] ?? 0) < 3);
            if (available.length > 0) {
                const newEngine = available[Math.floor(Math.random() * available.length)];
                siege.siegeEngines = [...currentEngines, newEngine];
                logsToAdd.push(`【围攻情报】围攻 ${loc.name} 的 ${siegeFactionName} 制造了 ${getSiegeEngineName(newEngine)}。`);
            }
        }

         return {
             ...loc,
             garrison: garrison,
             stayParties: nextStayParties,
             stationedArmies: nextStationedArmies,
             activeSiege: siege
         };
      });

      const portalIndex = newLocations.findIndex(loc => loc.type === 'IMPOSTER_PORTAL');
      if (portalIndex >= 0) {
        const portal = { ...newLocations[portalIndex] };
        
        // 1. Ensure Massive Garrison (One-time Init for Boss Fight)
        const currentGarrison = portal.garrison ?? [];
        if (currentGarrison.length < 1000) { 
             // Force refill with massive army using updated getLocationGarrison
             const massiveGarrison = buildGarrisonTroops(portal);
             portal.garrison = massiveGarrison;
             // Silent init or log if needed
        }

        // 2. Spawn Attack Waves into Stationed Armies
        const spawnCooldown = 6;
        const lastInvasionDay = portal.lastInvasionDay ?? 0;
        const stationedArmies = portal.stationedArmies ?? [];

          if (nextDay - lastInvasionDay >= spawnCooldown) {
            const newForces = buildImposterTroops();
            const newArmy: EnemyForce = {
               name: `伪人裂隙浪潮·${Math.floor(nextDay / 6)}`,
               description: '从裂隙中涌出的攻击部队。',
               troops: newForces,
               difficulty: '困难',
               lootPotential: 1.2,
               terrain: 'CAVE',
               baseTroopId: 'imposter_stalker'
            };
            
            portal.stationedArmies = [...stationedArmies, newArmy];
            portal.lastInvasionDay = nextDay;
            logsToAdd.push(`【伪人传送门】裂隙喷涌出新的军团（${getGarrisonCount(newForces)}人），正在集结。`);
          }

        // 3. March Logic (Use first stationed army)
        const updatedStationed = portal.stationedArmies ?? [];
        const hasRaidingArmy = updatedStationed.length > 0;
        const isRaiding = !!portal.imposterRaidTargetId;

          if (hasRaidingArmy && !isRaiding) {
             const target = pickImposterTarget(portal, newLocations);
             if (target) {
               const marchDays = randomInt(2, 4);
               const etaDay = nextDay + marchDays;
               const raidingArmy = updatedStationed[0];
               portal.stationedArmies = updatedStationed.slice(1);
               portal.imposterRaidTargetId = target.id;
               portal.imposterRaidEtaDay = etaDay;
               const campId = `field_camp_${portal.id}_${target.id}_${nextDay}`;
               const dx = target.coordinates.x - portal.coordinates.x;
               const dy = target.coordinates.y - portal.coordinates.y;
               const distance = Math.hypot(dx, dy);
               const fraction = distance > 0 ? Math.min(0.18, 1 / Math.max(2, Math.round(marchDays * 1.2))) : 0;
               const initialCoordinates = {
                 x: portal.coordinates.x + dx * fraction,
                 y: portal.coordinates.y + dy * fraction
               };
               const camp: Location = {
                 id: campId,
                 name: `${raidingArmy.name}·行军营地`,
                 type: 'FIELD_CAMP',
                 description: `裂隙军团正在行军。目标：${target.name}。`,
                 coordinates: initialCoordinates,
                 terrain: portal.terrain,
                 factionId: undefined,
                 lastRefreshDay: 0,
                 volunteers: [],
                 mercenaries: [],
                 owner: 'ENEMY',
                 isUnderSiege: false,
                 siegeProgress: 0,
                 siegeEngines: [],
                 garrison: raidingArmy.troops.map(t => ({ ...t })),
                 buildings: ['DEFENSE'],
                 constructionQueue: [],
                 siegeEngineQueue: [],
                 lastIncomeDay: 0,
                 camp: {
                   kind: 'IMPOSTER_RAID',
                   sourceLocationId: portal.id,
                   targetLocationId: target.id,
                   totalDays: marchDays,
                   daysLeft: marchDays,
                   attackerName: raidingArmy.name,
                   leaderName: '裂隙军官'
                 },
                 lord: undefined
               };
               newLocations = newLocations.map(loc => loc.id === target.id ? {
                 ...loc,
                 imposterAlertUntilDay: etaDay
               } : loc);
               logsToAdd.push(`【伪人入侵】传送门的部队正向 ${target.name} 逼近。`);
               newLocations.push(camp);
             }
          }

        newLocations[portalIndex] = portal;
      }

      const camps = newLocations.filter(loc => loc.type === 'FIELD_CAMP' && loc.camp);
      camps.forEach(camp => {
        const meta = camp.camp!;
        const targetIndex = newLocations.findIndex(loc => loc.id === meta.targetLocationId);
        const sourceIndex = newLocations.findIndex(loc => loc.id === meta.sourceLocationId);
        if (targetIndex < 0) {
          newLocations = newLocations.filter(loc => loc.id !== camp.id);
          if (sourceIndex >= 0) {
            const source = newLocations[sourceIndex];
            newLocations[sourceIndex] = meta.kind === 'IMPOSTER_RAID'
              ? { ...source, imposterRaidTargetId: undefined, imposterRaidEtaDay: undefined }
              : {
                  ...source,
                  factionRaidTargetId: undefined,
                  factionRaidEtaDay: undefined,
                  factionRaidAttackerName: undefined,
                  factionRaidFactionId: undefined
                };
          }
          return;
        }
        const target = { ...newLocations[targetIndex] };
        const daysLeft = Math.max(1, Math.floor(meta.daysLeft));
        const nextDaysLeft = Math.max(0, daysLeft - 1);
        const stepX = (target.coordinates.x - camp.coordinates.x) / daysLeft;
        const stepY = (target.coordinates.y - camp.coordinates.y) / daysLeft;
        const nextCamp: Location = {
          ...camp,
          description: `一支正在行军的远征军临时扎营。目标：${target.name}。剩余 ${nextDaysLeft} 天。`,
          coordinates: nextDaysLeft <= 0
            ? { ...target.coordinates }
            : { x: camp.coordinates.x + stepX, y: camp.coordinates.y + stepY },
          camp: { ...meta, daysLeft: nextDaysLeft }
        };
        newLocations = newLocations.map(loc => loc.id === camp.id ? nextCamp : loc);
        if (nextDaysLeft > 0) return;
        newLocations = newLocations.filter(loc => loc.id !== camp.id);
        if (sourceIndex >= 0) {
          const sourceLoc = newLocations[sourceIndex];
          newLocations[sourceIndex] = meta.kind === 'IMPOSTER_RAID'
            ? { ...sourceLoc, imposterRaidTargetId: undefined, imposterRaidEtaDay: undefined }
            : {
                ...sourceLoc,
                factionRaidTargetId: undefined,
                factionRaidEtaDay: undefined,
                factionRaidAttackerName: undefined,
                factionRaidFactionId: undefined
              };
        }
        if (target.activeSiege || target.isUnderSiege) {
          logsToAdd.push(`【行军营地】${meta.attackerName} 抵达 ${target.name} 时战场已被占据，选择撤回。`);
          return;
        }
        const raidTroops = (camp.garrison ?? []).map(t => ({ ...t }));
        const raidPower = calculatePower(raidTroops);
        target.activeSiege = {
          attackerName: meta.attackerName,
          attackerFactionId: camp.factionId,
          troops: raidTroops,
          startDay: nextDay,
          totalPower: raidPower,
          siegeEngines: ['SIMPLE_LADDER']
        };
        target.isUnderSiege = true;
        if (meta.kind === 'IMPOSTER_RAID') {
          target.imposterAlertUntilDay = undefined;
        }
        newLocations[targetIndex] = target;
        logsToAdd.push(`【行军营地】${meta.attackerName} 抵达 ${target.name}，开始围攻。`);
        addLocalLog(target.id, `遭到 ${meta.attackerName} 围攻。`);
      });

      const hostileFactions = FACTIONS.filter(faction => getRelationValue(playerRef.current, 'FACTION', faction.id) <= -40);
      const playerTargets = newLocations.filter(loc => (
        loc.owner === 'PLAYER' &&
        !loc.activeSiege &&
        (loc.type === 'CITY' || loc.type === 'CASTLE' || loc.type === 'VILLAGE')
      ));
      hostileFactions.forEach(faction => {
        if (playerTargets.length === 0) return;
        const relationValue = getRelationValue(playerRef.current, 'FACTION', faction.id);
        const baseChance = relationValue <= -70 ? 0.5 : relationValue <= -55 ? 0.35 : 0.22;
        if (Math.random() > baseChance) return;
        const factionLocations = getFactionLocations(faction.id, newLocations);
        if (factionLocations.length === 0) return;
        const source = [...factionLocations].sort((a, b) => getGarrisonCount(getLocationTroops(b)) - getGarrisonCount(getLocationTroops(a)))[0];
        if (!source) return;
        const target = playerTargets[Math.floor(Math.random() * playerTargets.length)];
        if (source.factionRaidTargetId || source.factionRaidEtaDay || target.activeSiege || target.isUnderSiege) return;
        const sourceLordParty = source.lord ? (source.stayParties ?? []).find(p => p.lordId === source.lord?.id) ?? null : null;
        const useLordParty = !!sourceLordParty && sourceLordParty.troops.some(t => t.count > 0);
        const sourceTroops = useLordParty ? sourceLordParty?.troops ?? [] : getLocationTroops(source);
        const { attackers, remaining } = splitTroops(sourceTroops, 0.5);
        if (getGarrisonCount(attackers) < 50) return;
        const marchDays = 2 + Math.floor(Math.random() * 3);
        const etaDay = nextDay + marchDays;
        logsToAdd.push(`【报复】${faction.name} 远征军从 ${source.name} 出发，目标 ${target.name}，预计 ${marchDays} 天后抵达。`);
        addLocalLog(target.id, `侦查到 ${faction.name} 远征军正向此地逼近。`);
        const attackerName = `${faction.name}远征军`;
        const leaderName = source.lord ? `${source.lord.title}${source.lord.name}` : `${faction.name}军官`;
        const campId = `field_camp_${source.id}_${target.id}_${nextDay}`;
        const dx = target.coordinates.x - source.coordinates.x;
        const dy = target.coordinates.y - source.coordinates.y;
        const distance = Math.hypot(dx, dy);
        const fraction = distance > 0 ? Math.min(0.18, 1 / Math.max(2, Math.round(marchDays * 1.2))) : 0;
        const initialCoordinates = {
          x: source.coordinates.x + dx * fraction,
          y: source.coordinates.y + dy * fraction
        };
        const camp: Location = {
          id: campId,
          name: `${attackerName}·行军营地`,
          type: 'FIELD_CAMP',
          description: `一支正在行军的远征军临时扎营。目标：${target.name}。`,
          coordinates: initialCoordinates,
          terrain: source.terrain,
          factionId: faction.id,
          lastRefreshDay: 0,
          volunteers: [],
          mercenaries: [],
          owner: 'ENEMY',
          isUnderSiege: false,
          siegeProgress: 0,
          siegeEngines: [],
          garrison: attackers.map(t => ({ ...t })),
          buildings: ['DEFENSE'],
          constructionQueue: [],
          siegeEngineQueue: [],
          lastIncomeDay: 0,
          camp: {
            kind: 'FACTION_RAID',
            sourceLocationId: source.id,
            targetLocationId: target.id,
            totalDays: marchDays,
            daysLeft: marchDays,
            attackerName,
            leaderName
          },
          lord: source.lord ? { ...source.lord } : undefined
        };
        const sourceIndex = newLocations.findIndex(loc => loc.id === source.id);
        if (sourceIndex >= 0) {
          const sourceLoc = newLocations[sourceIndex];
          const nextLoc = useLordParty && sourceLordParty
            ? updateStayPartyTroops(sourceLoc, sourceLordParty.id, remaining)
            : { ...sourceLoc, garrison: remaining };
          newLocations[sourceIndex] = updateLordAction({
            ...nextLoc,
            factionRaidTargetId: target.id,
            factionRaidEtaDay: etaDay,
            factionRaidAttackerName: attackerName,
            factionRaidFactionId: faction.id
          }, `奉命讨伐玩家据点 ${target.name}`);
        }
        newLocations.push(camp);
      });

      if (nextDay % 7 === 0) {
        const councilFactions = FACTIONS.filter(faction => getFactionLocations(faction.id, newLocations).length > 0);
        councilFactions.forEach(faction => {
          const factionLocations = getFactionLocations(faction.id, newLocations);
          const totalTroops = factionLocations.reduce((sum, loc) => sum + getGarrisonCount(getLocationTroops(loc)), 0);
          let decision: 'EXPAND' | 'HOLD' | 'ATTACK' = 'HOLD';
          const roll = Math.random();
          if (totalTroops < factionLocations.length * 700) {
            decision = roll < 0.7 ? 'EXPAND' : 'HOLD';
          } else {
            decision = roll < 0.4 ? 'ATTACK' : roll < 0.7 ? 'EXPAND' : 'HOLD';
          }
          if (decision === 'HOLD') {
            logsToAdd.push(`【议会】${faction.name} 决定按兵不动。`);
            return;
          }
          if (decision === 'EXPAND') {
            logsToAdd.push(`【议会】${faction.name} 决定扩军整备。`);
            const sortedLocations = [...factionLocations].sort((a, b) => getGarrisonCount(getLocationTroops(a)) - getGarrisonCount(getLocationTroops(b)));
            const reinforceTargets = sortedLocations.slice(0, Math.min(2, sortedLocations.length));
            reinforceTargets.forEach(target => {
              const baseTroops = getLocationTroops(target);
              const cap = getGarrisonCap(target);
              const currentCount = getGarrisonCount(baseTroops);
              if (currentCount >= cap) return;
              const recruitCount = target.type === 'CITY' ? 30 : target.type === 'CASTLE' ? 20 : 12;
              const available = Math.min(cap - currentCount, recruitCount);
              const nextGarrison = applyRecruitment(baseTroops, target, available);
              newLocations = newLocations.map(loc => loc.id === target.id ? { ...loc, garrison: nextGarrison } : loc);
            });
            return;
          }
          const source = [...factionLocations].sort((a, b) => getGarrisonCount(getLocationTroops(b)) - getGarrisonCount(getLocationTroops(a)))[0];
          const targetCandidates = newLocations.filter(loc => {
            if (!(loc.type === 'CITY' || loc.type === 'CASTLE' || loc.type === 'VILLAGE')) return false;
            if (loc.owner === 'PLAYER') return false;
            if (loc.factionId && FACTIONS.some(f => f.id === loc.factionId) && loc.factionId !== faction.id) {
              const relation = getWorldFactionRelation(nextWorldDiplomacy, faction.id, loc.factionId);
              return relation <= -20;
            }
            if (isImposterControlledLocation(loc) && loc.claimFactionId === faction.id) return true;
            return false;
          });
          if (!source || targetCandidates.length === 0) {
            logsToAdd.push(`【议会】${faction.name} 决定保持戒备。`);
            return;
          }
          const target = targetCandidates[Math.floor(Math.random() * targetCandidates.length)];
          if (source.factionRaidTargetId || source.factionRaidEtaDay || target.activeSiege || target.isUnderSiege) {
            logsToAdd.push(`【议会】${faction.name} 决定保持戒备。`);
            return;
          }
          const sourceLordParty = source.lord ? (source.stayParties ?? []).find(p => p.lordId === source.lord?.id) ?? null : null;
          const useLordParty = !!sourceLordParty && sourceLordParty.troops.some(t => t.count > 0);
          const sourceTroops = useLordParty ? sourceLordParty?.troops ?? [] : getLocationTroops(source);
          const { attackers, remaining } = splitTroops(sourceTroops, 0.55);
          if (getGarrisonCount(attackers) < 40) {
            logsToAdd.push(`【议会】${faction.name} 决定暂缓出兵。`);
            return;
          }
          const defenderFactionName = FACTIONS.find(f => f.id === target.factionId)?.name ?? target.name;
          const defenderFactionId = target.factionId as any;
          if (defenderFactionId && defenderFactionId !== faction.id) {
            logsToAdd.push(`【宣战】${faction.name} 向 ${defenderFactionName} 宣战。`);
            logsToAdd.push(`【议会】${faction.name} 决定出兵。`);
            const currentAB = getWorldFactionRelation(nextWorldDiplomacy, faction.id, defenderFactionId);
            const currentBA = getWorldFactionRelation(nextWorldDiplomacy, defenderFactionId, faction.id);
            if (currentAB > -80) {
              nextWorldDiplomacy = applyWorldDiplomacyDelta(nextWorldDiplomacy, { kind: 'FACTION_FACTION', aId: faction.id, bId: defenderFactionId, delta: -80 - currentAB, text: `对 ${defenderFactionName} 宣战`, day: nextDay });
            }
            if (currentBA > -80) {
              nextWorldDiplomacy = applyWorldDiplomacyDelta(nextWorldDiplomacy, { kind: 'FACTION_FACTION', aId: defenderFactionId, bId: faction.id, delta: -80 - currentBA, text: `被 ${faction.name} 宣战`, day: nextDay });
            }
          } else {
            logsToAdd.push(`【反攻】${faction.name} 组织军队，准备收复 ${target.name}。`);
            nextWorldDiplomacy = applyWorldDiplomacyDelta(nextWorldDiplomacy, { kind: 'FACTION_RACE', aId: faction.id, bId: 'IMPOSTER', delta: -6, text: `收复 ${target.name}`, day: nextDay });
          }
          const marchDays = 2 + Math.floor(Math.random() * 3);
          const etaDay = nextDay + marchDays;
          logsToAdd.push(`【远征军】${faction.name} 远征军从 ${source.name} 出发，目标 ${target.name}，预计 ${marchDays} 天后抵达。`);
          addLocalLog(target.id, `侦查到 ${faction.name} 远征军正向此地逼近。`);
          const attackerName = `${faction.name}远征军`;
          const leaderName = source.lord ? `${source.lord.title}${source.lord.name}` : `${faction.name}军官`;
          const campId = `field_camp_${source.id}_${target.id}_${nextDay}`;
          const dx = target.coordinates.x - source.coordinates.x;
          const dy = target.coordinates.y - source.coordinates.y;
          const distance = Math.hypot(dx, dy);
          const fraction = distance > 0 ? Math.min(0.18, 1 / Math.max(2, Math.round(marchDays * 1.2))) : 0;
          const initialCoordinates = {
            x: source.coordinates.x + dx * fraction,
            y: source.coordinates.y + dy * fraction
          };
          const camp: Location = {
            id: campId,
            name: `${attackerName}·行军营地`,
            type: 'FIELD_CAMP',
            description: `一支正在行军的远征军临时扎营。目标：${target.name}。`,
            coordinates: initialCoordinates,
            terrain: source.terrain,
            factionId: faction.id,
            lastRefreshDay: 0,
            volunteers: [],
            mercenaries: [],
            owner: 'ENEMY',
            isUnderSiege: false,
            siegeProgress: 0,
            siegeEngines: [],
            garrison: attackers.map(t => ({ ...t })),
            buildings: ['DEFENSE'],
            constructionQueue: [],
            siegeEngineQueue: [],
            lastIncomeDay: 0,
            camp: {
              kind: 'FACTION_RAID',
              sourceLocationId: source.id,
              targetLocationId: target.id,
              totalDays: marchDays,
              daysLeft: marchDays,
              attackerName,
              leaderName
            },
            lord: source.lord ? { ...source.lord } : undefined
          };
          const sourceIndex = newLocations.findIndex(loc => loc.id === source.id);
          if (sourceIndex >= 0) {
            const sourceLoc = newLocations[sourceIndex];
            const nextLoc = useLordParty && sourceLordParty
              ? updateStayPartyTroops(sourceLoc, sourceLordParty.id, remaining)
              : { ...sourceLoc, garrison: remaining };
            newLocations[sourceIndex] = updateLordAction({
              ...nextLoc,
              factionRaidTargetId: target.id,
              factionRaidEtaDay: etaDay,
              factionRaidAttackerName: attackerName,
              factionRaidFactionId: faction.id
            }, `奉命出兵，攻打了 ${target.name}`);
          }
          newLocations.push(camp);
        });
        const strongholds = newLocations.filter(loc => (
          loc.type === 'CITY' || loc.type === 'CASTLE' || loc.type === 'VILLAGE'
        ));
        const getLocationById = (id: string) => newLocations.find(loc => loc.id === id);
        const estimateTravelDays = (from: Location, to: Location) => {
          const dist = Math.hypot(from.coordinates.x - to.coordinates.x, from.coordinates.y - to.coordinates.y);
          return Math.max(1, Math.ceil(dist / 120));
        };
        const findNearestLocation = (origin: Location, candidates: Location[]) => {
          if (candidates.length === 0) return null;
          const ranked = candidates
            .map(loc => ({
              loc,
              dist: Math.hypot(loc.coordinates.x - origin.coordinates.x, loc.coordinates.y - origin.coordinates.y)
            }))
            .sort((a, b) => a.dist - b.dist);
          return ranked[0]?.loc ?? null;
        };
        const recordLordAction = (lord: Lord, locationId: string, text: string) => {
          const safe = String(text ?? '').trim();
          if (!safe) return lord;
          addLocalLog(locationId, safe);
          const nextMemories = [{ day: nextDay, text: safe }, ...(lord.memories ?? [])].slice(0, 10);
          return { ...lord, lastAction: { day: nextDay, text: safe }, memories: nextMemories };
        };
        const friendlyStrongholds = (factionId?: string) => strongholds.filter(loc => loc.factionId === factionId && loc.owner !== 'ENEMY');
        const findNearbyBanditCamp = (origin: Location) => {
          const camps = newLocations.filter(loc => loc.type === 'BANDIT_CAMP');
          if (camps.length === 0) return null;
          const ranked = camps
            .map(loc => ({
              loc,
              dist: Math.hypot(loc.coordinates.x - origin.coordinates.x, loc.coordinates.y - origin.coordinates.y)
            }))
            .sort((a, b) => a.dist - b.dist);
          const candidate = ranked[0]?.loc ?? null;
          return candidate && ranked[0].dist <= 160 ? candidate : null;
        };
        nextLords = nextLords.map(lord => {
          const fief = getLocationById(lord.fiefId);
          const currentLoc = getLocationById(lord.currentLocationId) ?? fief;
          if (!currentLoc) return lord;
          let nextLord = { ...lord };
          if (nextLord.travelDaysLeft && nextLord.targetLocationId) {
            const remaining = nextLord.travelDaysLeft - 1;
            if (remaining <= 0) {
              nextLord = { ...nextLord, currentLocationId: nextLord.targetLocationId, travelDaysLeft: undefined, targetLocationId: undefined };
              const arrivedLoc = getLocationById(nextLord.currentLocationId);
              if (arrivedLoc) {
                nextLord = recordLordAction(nextLord, arrivedLoc.id, `${nextLord.title}${nextLord.name} 抵达了 ${arrivedLoc.name}`);
              }
            } else {
              return { ...nextLord, travelDaysLeft: remaining };
            }
          }
          const partyCount = getTroopCount(nextLord.partyTroops);
          const partyMax = nextLord.partyMaxCount ?? Math.max(1, partyCount);
          const needsRest = partyCount < Math.max(20, Math.floor(partyMax * 0.6));
          const raidSources = newLocations.filter(loc => (
            loc.factionId === nextLord.factionId &&
            loc.factionRaidTargetId &&
            loc.factionRaidEtaDay &&
            loc.factionRaidEtaDay >= nextDay
          ));
          const raidSource = raidSources.sort((a, b) => (a.factionRaidEtaDay ?? 0) - (b.factionRaidEtaDay ?? 0))[0];
          let desiredState: LordState = nextLord.state;
          if (needsRest) {
            desiredState = 'RESTING';
          } else if (raidSource) {
            desiredState = nextLord.fiefId === raidSource.id || nextLord.focus !== 'WAR' ? 'MARSHALLING' : 'BESIEGING';
          } else if (nextDay % 14 === 0) {
            desiredState = 'FEASTING';
          } else {
            desiredState = 'PATROLLING';
          }
          if (desiredState !== nextLord.state) {
            nextLord = { ...nextLord, state: desiredState, stateSinceDay: nextDay };
          }
          const moveTo = (target: Location | null) => {
            if (!target || nextLord.currentLocationId === target.id) return nextLord;
            const from = getLocationById(nextLord.currentLocationId) ?? fief ?? target;
            if (!from) return nextLord;
            return { ...nextLord, targetLocationId: target.id, travelDaysLeft: estimateTravelDays(from, target) };
          };
          if (nextLord.state === 'RESTING') {
            const restLoc = (currentLoc.factionId === nextLord.factionId && currentLoc.owner !== 'ENEMY')
              ? currentLoc
              : (fief && fief.factionId === nextLord.factionId ? fief : (friendlyStrongholds(nextLord.factionId)[0] ?? currentLoc));
            if (restLoc.id !== nextLord.currentLocationId) {
              return moveTo(restLoc);
            }
            const available = Math.max(0, Math.min(partyMax - partyCount, restLoc.type === 'CITY' ? 18 : restLoc.type === 'CASTLE' ? 12 : 8));
            const recruited = applyRecruitment(nextLord.partyTroops, restLoc, available);
            const trained = applyGarrisonTraining(recruited, 3);
            nextLord = recordLordAction(nextLord, restLoc.id, `在${restLoc.name}休整补员`);
            return { ...nextLord, partyTroops: trained };
          }
          if (nextLord.state === 'MARSHALLING') {
            const gatherLoc = raidSource ? getLocationById(raidSource.id) ?? fief ?? currentLoc : fief ?? currentLoc;
            if (gatherLoc.id !== nextLord.currentLocationId) {
              return moveTo(gatherLoc);
            }
            const trained = applyGarrisonTraining(nextLord.partyTroops, 3);
            nextLord = recordLordAction(nextLord, gatherLoc.id, `在${gatherLoc.name}集结待命`);
            return { ...nextLord, partyTroops: trained };
          }
          if (nextLord.state === 'BESIEGING') {
            const targetLoc = raidSource ? getLocationById(raidSource.factionRaidTargetId ?? '') : null;
            if (targetLoc && targetLoc.id !== nextLord.currentLocationId) {
              return moveTo(targetLoc);
            }
            if (targetLoc && targetLoc.id === nextLord.currentLocationId) {
              if (!targetLoc.activeSiege && targetLoc.owner !== 'PLAYER') {
                const raidPower = calculatePower(nextLord.partyTroops);
                const updatedTarget = {
                  ...targetLoc,
                  activeSiege: {
                    attackerName: `${nextLord.title}${nextLord.name}`,
                    troops: nextLord.partyTroops.map(t => ({ ...t })),
                    startDay: nextDay,
                    totalPower: raidPower,
                    siegeEngines: ['SIMPLE_LADDER']
                  },
                  isUnderSiege: true
                };
                newLocations = newLocations.map(loc => loc.id === targetLoc.id ? updatedTarget : loc);
                logsToAdd.push(`【围攻】${nextLord.title}${nextLord.name} 抵达 ${targetLoc.name}，开始围攻。`);
                addLocalLog(targetLoc.id, `${nextLord.title}${nextLord.name} 率军围攻。`);
              }
              nextLord = recordLordAction(nextLord, targetLoc.id, `在${targetLoc.name}指挥围攻`);
            }
            return nextLord;
          }
          if (nextLord.state === 'FEASTING') {
            const options = friendlyStrongholds(nextLord.factionId).filter(loc => loc.type === 'CITY' || loc.type === 'CASTLE');
            const feastHost = options.length > 0
              ? [...options].sort((a, b) => getGarrisonCount(getLocationTroops(b)) - getGarrisonCount(getLocationTroops(a)))[0]
              : currentLoc;
            if (feastHost.id !== nextLord.currentLocationId) {
              return moveTo(feastHost);
            }
            nextLord = recordLordAction(nextLord, feastHost.id, `在${feastHost.name}参加宴会`);
            return nextLord;
          }
          const patrolBase = currentLoc;
          const nearbyCamp = findNearbyBanditCamp(patrolBase);
          if (nearbyCamp) {
            newLocations = newLocations.filter(loc => loc.id !== nearbyCamp.id);
            logsToAdd.push(`【巡逻】${nextLord.title}${nextLord.name} 剿灭了 ${nearbyCamp.name}。`);
            nextLord = recordLordAction(nextLord, patrolBase.id, `率军清剿了 ${nearbyCamp.name}`);
          } else {
            const patrolTargets = friendlyStrongholds(nextLord.factionId).filter(loc => loc.id !== nextLord.currentLocationId);
            const patrolTarget = patrolTargets.length > 0 ? findNearestLocation(patrolBase, patrolTargets) : null;
            if (patrolTarget) {
              return moveTo(patrolTarget);
            }
            nextLord = recordLordAction(nextLord, patrolBase.id, `在${patrolBase.name}附近巡逻`);
          }
          const trained = applyGarrisonTraining(nextLord.partyTroops, 2);
          return { ...nextLord, partyTroops: trained };
        });
      }

      const activeBattleCount = newLocations.filter(loc => loc.activeSiege).length;
      if (nextBattleTimeline.length === 0 || nextBattleTimeline[nextBattleTimeline.length - 1].day !== nextDay) {
        nextBattleTimeline.push({ day: nextDay, count: activeBattleCount });
      } else {
        nextBattleTimeline[nextBattleTimeline.length - 1] = { day: nextDay, count: activeBattleCount };
      }

      if (rentCost > 0) logsToAdd.push(`在城内休息一天（-${rentCost} 第纳尔）。`);
      if (workIncomePerDay > 0) logsToAdd.push(`打工收入 +${workIncomePerDay} 第纳尔。`);

      nextPlayer = { 
        ...nextPlayer, 
        day: nextDay, 
        gold: newGold,
        troops: nextTroops,
        parrots: nextParrots,
        ...hpUpdate
      };
    }

    const syncedLocations = syncLordPresence(ensureLocationLords(newLocations), nextLords);
    setLocations(syncedLocations);
    setPlayer(nextPlayer);
    setHeroes(nextHeroes);
    setLords(nextLords);
    setWorldDiplomacy(nextWorldDiplomacy);
    setBattleTimeline(nextBattleTimeline.slice(-60));
    logsToAdd.forEach(addLog);

    const finalLocation = location ? syncedLocations.find(l => l.id === location.id) ?? location : undefined;
    if (!suppressEncounter && finalLocation && finalLocation.type !== 'TRAINING_GROUNDS' && finalLocation.type !== 'ASYLUM' && finalLocation.type !== 'CITY' && finalLocation.type !== 'MARKET' && finalLocation.type !== 'HOTPOT_RESTAURANT' && finalLocation.type !== 'BANDIT_CAMP' && finalLocation.type !== 'MYSTERIOUS_CAVE' && finalLocation.type !== 'COFFEE' && finalLocation.type !== 'IMPOSTER_PORTAL' && finalLocation.type !== 'WORLD_BOARD' && finalLocation.type !== 'ROACH_NEST' && finalLocation.type !== 'MAGICIAN_LIBRARY') {
      const relationTarget = getLocationRelationTarget(finalLocation);
      const relationValue = relationTarget ? getRelationValue(playerRef.current, relationTarget.type, relationTarget.id) : 0;
      const encounterChance = getEncounterChance(0.25, relationValue);
      if (Math.random() < encounterChance) {
        triggerRandomEncounter(finalLocation.terrain, finalLocation);
      }
    } else if (finalLocation) {
      if (suppressEncounter) {
        enterLocation(finalLocation);
        return;
      }
      // Check for Ambush (Impostor/Enemy)
      const enemyParties = finalLocation.stayParties?.filter(p => p.owner === 'ENEMY') ?? [];
      const isEnemyHeld = finalLocation.owner === 'ENEMY';
      const enemyGarrison = isEnemyHeld ? (finalLocation.garrison ?? []) : [];
      
      const allEnemyTroops = [
        ...enemyParties.flatMap(p => p.troops),
        ...enemyGarrison
      ];

      // 35% chance to be ambushed if enemies are present
      if (allEnemyTroops.length > 0) {
         const relationTarget = getLocationRelationTarget(finalLocation);
         const relationValue = relationTarget ? getRelationValue(playerRef.current, relationTarget.type, relationTarget.id) : 0;
         const ambushChance = getEncounterChance(0.35, relationValue);
         if (Math.random() < ambushChance) {
         const attackRatio = 0.2 + Math.random() * 0.3; // 20-50%
         const ambushTroops = allEnemyTroops.map(t => ({
            ...t,
            count: Math.ceil(t.count * attackRatio)
         })).filter(t => t.count > 0);

         if (ambushTroops.length > 0) {
            const enemyTroops = ensureEnemyHeroTroops(ambushTroops, finalLocation.lord, finalLocation.id);
            const isImposterAmbush = ambushTroops.every(t => IMPOSTER_TROOP_IDS.has(t.id));
            const ambushLabel = isImposterAmbush ? '伪人部队' : '伏兵';
            addLog(`刚踏入 ${finalLocation.name}，你就遭到了${ambushLabel}的伏击！`);
            const enemy: EnemyForce = {
               id: `ambush_${Date.now()}`,
               name: isImposterAmbush ? '伪人伏击队' : `${finalLocation.name}伏兵`,
               description: isImposterAmbush ? '埋伏在据点里的伪人。' : '埋伏在据点里的敌人。',
               troops: enemyTroops,
               difficulty: '一般',
               lootPotential: 1.0,
               terrain: finalLocation.terrain,
               baseTroopId: enemyTroops[0]?.id ?? 'militia'
            };
            let supportTroops: Troop[] | null = null;
            let supportLabel = '';
            const relationTarget = getLocationRelationTarget(finalLocation);
            const relationValue = relationTarget ? getRelationValue(playerRef.current, relationTarget.type, relationTarget.id) : 0;
            const locationRace = getLocationRace(finalLocation);
            const enemyRace = getEnemyRace(enemy);
            if (relationValue >= 20 && (enemyRace ? enemyRace !== locationRace : true)) {
              const ratio = relationValue >= 60 ? 0.35 : relationValue >= 40 ? 0.25 : 0.15;
              const supportCandidates = buildSupportTroops(finalLocation, ratio);
              if (supportCandidates.length > 0) {
                supportTroops = supportCandidates;
                supportLabel = relationTarget?.type === 'FACTION'
                  ? `${FACTIONS.find(f => f.id === relationTarget.id)?.name ?? finalLocation.name}援军`
                  : relationTarget?.type === 'RACE'
                    ? `${RACE_LABELS[relationTarget.id as RaceId]}援军`
                    : `${finalLocation.name}援军`;
                addLog(`${finalLocation.name}派出援军协助迎敌。`);
                addLocationLog(finalLocation.id, `守军增援前来迎敌。`);
              }
            }
            setActiveEnemy(enemy);
            if (supportTroops) {
              setPendingBattleMeta({ mode: 'DEFENSE_AID', targetLocationId: finalLocation.id, supportTroops, supportLabel });
            } else {
              setPendingBattleMeta({ mode: 'FIELD' });
            }
            setPendingBattleIsTraining(false);
            setView('BATTLE');
            return;
         }
        }
      }

      enterLocation(finalLocation);
    }
  };

  const updateLocationState = (updatedLocation: Location) => {
    setLocations(prev => prev.map(l => l.id === updatedLocation.id ? updatedLocation : l));
    setCurrentLocation(updatedLocation);
  };

  const updateLord = (updatedLord: Lord) => {
    setLords(prev => {
      const exists = prev.some(lord => lord.id === updatedLord.id);
      const next = exists ? prev.map(lord => lord.id === updatedLord.id ? updatedLord : lord) : [...prev, updatedLord];
      setLocations(prevLocations => syncLordPresence(ensureLocationLords(prevLocations), next));
      setCurrentLocation(prevLocation => {
        if (!prevLocation) return prevLocation;
        const synced = syncLordPresence([prevLocation], next)[0];
        return synced ?? prevLocation;
      });
      return next;
    });
  };

  const getLocationGarrison = (location: Location) => {
    if (location.type === 'WORLD_BOARD') {
      return [];
    }
    if (location.type === 'ALTAR') {
      return [];
    }
    const factionId = location.factionId;
    const isVerdant = factionId === 'VERDANT_COVENANT';
    const isFrost = factionId === 'FROST_OATH';
    const isRedDune = factionId === 'RED_DUNE';
    if (location.type === 'ROACH_NEST') {
      return [
        { troopId: 'roach_brawler', count: 520 },
        { troopId: 'roach_pikeman', count: 520 },
        { troopId: 'roach_slinger', count: 520 },
        { troopId: 'roach_shieldling', count: 520 },
        { troopId: 'roach_aerial_duelist', count: 240 },
        { troopId: 'roach_aerial_lancer', count: 240 },
        { troopId: 'roach_aerial_harrier', count: 240 },
        { troopId: 'roach_aerial_guard', count: 240 },
        { troopId: 'roach_chitin_commander', count: 50 },
        { troopId: 'roach_giant_halberdier', count: 60 },
        { troopId: 'roach_giant_gunner', count: 60 },
        { troopId: 'roach_carapace_titan', count: 40 }
      ];
    }
    if (location.type === 'CITY') {
      if (isVerdant) {
        return [
          { troopId: 'imperial_swordsman', count: 600 },
          { troopId: 'imperial_shieldbearer', count: 420 },
          { troopId: 'imperial_crossbowman', count: 420 },
          { troopId: 'hunter', count: 320 },
          { troopId: 'verdant_scout_archer', count: 280 },
          { troopId: 'verdant_skybow', count: 120 }
        ];
      }
      if (isFrost) {
        return [
          { troopId: 'footman', count: 520 },
          { troopId: 'imperial_shieldbearer', count: 420 },
          { troopId: 'imperial_swordsman', count: 380 },
          { troopId: 'frost_oath_halberdier', count: 280 },
          { troopId: 'frost_oath_bladeguard', count: 140 },
          { troopId: 'imperial_crossbowman', count: 200 }
        ];
      }
      if (isRedDune) {
        return [
          { troopId: 'imperial_light_cavalry', count: 360 },
          { troopId: 'imperial_elite_knight', count: 200 },
          { troopId: 'red_dune_lancer', count: 340 },
          { troopId: 'red_dune_cataphract', count: 160 },
          { troopId: 'imperial_horse_archer', count: 280 },
          { troopId: 'imperial_shieldbearer', count: 240 },
          { troopId: 'imperial_crossbowman', count: 200 },
          { troopId: 'footman', count: 180 }
        ];
      }
      return [
        { troopId: 'imperial_swordsman', count: 820 },
        { troopId: 'imperial_shieldbearer', count: 620 },
        { troopId: 'imperial_crossbowman', count: 320 },
        { troopId: 'knight', count: 180 }
      ];
    }
    if (location.type === 'CASTLE') {
      if (isVerdant) {
        return [
          { troopId: 'imperial_shieldbearer', count: 150 },
          { troopId: 'imperial_crossbowman', count: 120 },
          { troopId: 'verdant_scout_archer', count: 120 },
          { troopId: 'hunter', count: 90 },
          { troopId: 'footman', count: 90 },
          { troopId: 'verdant_skybow', count: 30 }
        ];
      }
      if (isFrost) {
        return [
          { troopId: 'footman', count: 180 },
          { troopId: 'imperial_shieldbearer', count: 150 },
          { troopId: 'frost_oath_halberdier', count: 120 },
          { troopId: 'imperial_crossbowman', count: 80 },
          { troopId: 'frost_oath_bladeguard', count: 40 },
          { troopId: 'imperial_swordsman', count: 30 }
        ];
      }
      if (isRedDune) {
        return [
          { troopId: 'imperial_light_cavalry', count: 140 },
          { troopId: 'red_dune_lancer', count: 160 },
          { troopId: 'imperial_horse_archer', count: 120 },
          { troopId: 'red_dune_cataphract', count: 40 },
          { troopId: 'footman', count: 70 },
          { troopId: 'imperial_shieldbearer', count: 70 }
        ];
      }
      return [
        { troopId: 'footman', count: 240 },
        { troopId: 'imperial_shieldbearer', count: 180 },
        { troopId: 'imperial_crossbowman', count: 120 },
        { troopId: 'knight', count: 60 }
      ];
    }
    if (location.type === 'VILLAGE') {
      if (isVerdant) {
        return [
          { troopId: 'militia', count: 40 },
          { troopId: 'hunter', count: 25 },
          { troopId: 'verdant_scout_archer', count: 12 }
        ];
      }
      if (isFrost) {
        return [
          { troopId: 'militia', count: 45 },
          { troopId: 'footman', count: 18 },
          { troopId: 'frost_oath_halberdier', count: 8 }
        ];
      }
      if (isRedDune) {
        return [
          { troopId: 'militia', count: 35 },
          { troopId: 'imperial_light_cavalry', count: 12 },
          { troopId: 'red_dune_lancer', count: 10 }
        ];
      }
      return [
        { troopId: 'militia', count: 45 },
        { troopId: 'hunter', count: 22 }
      ];
    }
    if (location.type === 'HOTPOT_RESTAURANT') {
      return [
        { troopId: 'meatball_soldier', count: 160 },
        { troopId: 'tofu_shield', count: 90 },
        { troopId: 'spicy_soup_mage', count: 40 }
      ];
    }
    if (location.type === 'GRAVEYARD') {
      return [
        { troopId: 'zombie', count: 50 },
        { troopId: 'skeleton_warrior', count: 30 },
        { troopId: 'specter', count: 20 }
      ];
    }
    if (location.type === 'COFFEE') {
      return [
        { troopId: 'zombie', count: 40 },
        { troopId: 'skeleton_warrior', count: 28 }
      ];
    }
    if (location.type === 'RUINS') {
      return [
        { troopId: 'zealot', count: 70 },
        { troopId: 'flagellant', count: 40 }
      ];
    }
    if (location.type === 'BANDIT_CAMP') {
      return [
        { troopId: 'peasant', count: 60 },
        { troopId: 'militia', count: 50 },
        { troopId: 'hunter', count: 40 }
      ];
    }
    if (location.type === 'IMPOSTER_PORTAL') {
      return [
        // Tier 1 (Total 14000)
        { troopId: 'void_larva', count: 2000 },
        { troopId: 'glitch_pawn', count: 2000 },
        { troopId: 'static_noise_walker', count: 2000 },
        { troopId: 'null_fragment', count: 2000 },
        { troopId: 'imposter_light_infantry', count: 750 },
        { troopId: 'imposter_spearman', count: 750 },
        { troopId: 'imposter_short_bowman', count: 750 },
        { troopId: 'imposter_slinger', count: 750 },
        { troopId: 'imposter_shield_conscript', count: 750 },
        { troopId: 'imposter_axeman', count: 750 },
        { troopId: 'imposter_javelin_thrower', count: 750 },
        { troopId: 'imposter_scout_rider', count: 750 },
        // Tier 2 (Total 7200)
        { troopId: 'entropy_acolyte', count: 1000 },
        { troopId: 'pixel_shifter', count: 1000 },
        { troopId: 'null_pointer_hound', count: 1000 },
        { troopId: 'syntax_error_scout', count: 1000 },
        { troopId: 'imposter_heavy_infantry', count: 400 },
        { troopId: 'imposter_pikeman', count: 400 },
        { troopId: 'imposter_swordsman', count: 400 },
        { troopId: 'imposter_longbowman', count: 400 },
        { troopId: 'imposter_crossbowman', count: 400 },
        { troopId: 'imposter_halberdier', count: 400 },
        { troopId: 'imposter_mace_guard', count: 400 },
        { troopId: 'imposter_raider_rider', count: 400 },
        // Tier 3 (Total 2800)
        { troopId: 'imposter_stalker', count: 500 },
        { troopId: 'memory_leak_mage', count: 500 },
        { troopId: 'recursion_archer', count: 500 },
        { troopId: 'deadlock_sentinel', count: 500 },
        { troopId: 'imposter_heavy_knight', count: 200 },
        { troopId: 'imposter_horse_archer', count: 200 },
        { troopId: 'imposter_pike_guard', count: 200 },
        { troopId: 'imposter_reaper_blade', count: 200 },
        // Tier 4 (Total 800)
        { troopId: 'blue_screen_golem', count: 200 },
        { troopId: 'kernel_panic_knight', count: 200 },
        { troopId: 'segmentation_fault_dragon', count: 200 },
        { troopId: 'not_found_assassin', count: 200 },
        // Tier 5 (Bosses)
        { troopId: 'legacy_code_abomination', count: 50 },
        { troopId: 'system_crash_titan', count: 50 },
        { troopId: 'infinite_loop_devourer', count: 50 }
      ];
    }
    return [
      { troopId: 'militia', count: 80 }
    ];
  };

  const getLocationDefenseDetails = (location: Location) => {
    const details = {
      wallLevel: 0,
      wallName: "无",
      wallDesc: "没有任何防御工事。",
      mechanisms: [] as { name: string; description: string }[],
      flavorText: "这里毫无设防。",
      wallHp: 0,
      mechanismHp: 0,
      rangedHitBonus: 0,
      rangedDamageBonus: 0,
      meleeDamageReduction: 0
    };

    if (location.type === 'CITY') {
      details.wallLevel = 3;
      details.wallName = "巨石城墙";
      details.wallDesc = "坚不可摧的防御体系，足以抵御长时间围攻。";
      details.mechanisms = [
        { name: "重型投石机", description: "投掷巨大的石块，对攻城塔和密集步兵造成毁灭性打击。" },
        { name: "燃烧油锅", description: "向城墙下倾倒滚烫的热油，主要用于防御云梯攀爬者。" },
        { name: "多重箭塔", description: "提供交叉火力覆盖，没有任何死角。" },
        { name: "护城沟", description: "充满尖刺和污水的壕沟，阻碍攻城器械靠近。" }
      ];
      details.flavorText = "这座城市的防御固若金汤，是敌人的噩梦。";
    } else if (location.type === 'CASTLE') {
      details.wallLevel = 2;
      details.wallName = "加固石墙";
      details.wallDesc = "坚固的石墙，配合地形易守难攻。";
      details.mechanisms = [
        { name: "床弩", description: "发射巨大的弩箭，可以贯穿攻城锤的护板。" },
        { name: "滚石", description: "从城头推下的巨石，简单但致命。" },
        { name: "拒马木桩", description: "布置在城门前的障碍物，防止骑兵直接冲击城门。" }
      ];
      details.flavorText = "扼守要道的堡垒，每一块石头都浸透了鲜血。";
    } else if (location.type === 'VILLAGE') {
      details.wallLevel = 1;
      details.wallName = "木栅栏";
      details.wallDesc = "提供远程防御加成，阻挡骑兵冲锋。";
      details.mechanisms = [
        { name: "瞭望塔", description: "提供早期预警，增加弓箭手的射程。" },
        { name: "简易壕沟", description: "挖出的浅坑，用来绊倒马匹。" }
      ];
      details.flavorText = "这座据点的防御工事看起来聊胜于无。";
    } else if (location.type === 'HOTPOT_RESTAURANT') {
        details.wallLevel = 1;
        details.wallName = "蒸汽管道";
        details.wallDesc = "迷宫般的后厨和高温蒸汽管道。";
        details.mechanisms = [
          { name: "火油陷阱", description: "伪装成地滑的油污，点火后会引发大火。" },
          { name: "高压蒸汽喷口", description: "突然喷出的高温蒸汽，能瞬间煮熟铠甲里的肉。" }
        ];
        details.flavorText = "想要攻下这里，先得问问厨师长答不答应。";
    } else if (location.type === 'GRAVEYARD') {
        details.wallLevel = 2;
        details.wallName = "白骨围栏";
        details.wallDesc = "由不知名生物的骸骨堆砌而成的围墙。";
        details.mechanisms = [
          { name: "亡灵哨塔", description: "由骷髅弓箭手驻守的哨塔，永不疲倦。" },
          { name: "灵魂枷锁", description: "看不见的幽灵触手，会减缓敌人的移动速度。" }
        ];
        details.flavorText = "生者勿进。";
    } else if (location.type === 'RUINS') {
        details.wallLevel = 1;
        details.wallName = "残垣断壁";
        details.wallDesc = "曾经辉煌的建筑如今只剩下危险的废墟。";
        details.mechanisms = [
          { name: "碎石迷阵", description: "不稳定的地形，容易导致攻城器械损坏。" },
          { name: "陷坑机关", description: "古代遗留的陷阱，至今依然有效。" }
        ];
        details.flavorText = "在这里，地形本身就是致命的武器。";
    } else if (location.type === 'BANDIT_CAMP') {
        details.wallLevel = 1;
        details.wallName = "简陋木墙";
        details.wallDesc = "甚至漏风的木板墙。";
        details.mechanisms = [
          { name: "陷阱网", description: "从树上落下的捕兽网，用于捕捉活口。" },
          { name: "警铃", description: "挂满空罐头的绳子，一碰就响。" }
        ];
        details.flavorText = "一群乌合之众的窝点。";
    } else if (location.type === 'FIELD_CAMP') {
        details.wallLevel = 1;
        details.wallName = "木栅与拒马";
        details.wallDesc = "临时搭建的木栅与拒马，能提供有限的掩护。";
        details.mechanisms = [
          { name: "简易壕沟", description: "浅沟与土堆，能拖慢冲锋并提供掩体。" },
          { name: "岗哨旗台", description: "升起旗帜、传递信号，便于组织防御。" }
        ];
        details.flavorText = "行军中的部队在此扎营，警戒森严。";
    } else if (location.type === 'ASYLUM') {
        details.wallLevel = 4;
        details.wallName = "高压电网";
        details.wallDesc = "通了高压电的加固围墙，防止病人逃跑（或入侵）。";
        details.mechanisms = [
          { name: "镇静剂喷雾", description: "全覆盖的喷淋系统，能让狂暴的战士变得温顺。" },
          { name: "电击陷阱", description: "踩中地板会释放高压电流，不仅麻痹身体，还治疗网瘾。" },
          { name: "拘束网发射器", description: "自动发射拘束衣的炮台，命中率惊人。" }
        ];
        details.flavorText = "即使是苍蝇飞进去，也要穿上拘束衣。";
    } else if (location.type === 'MARKET') {
        details.wallLevel = 1;
        details.wallName = "鸟笼阵列";
        details.wallDesc = "无数的鸟笼构成了独特的防御迷宫。";
        details.mechanisms = [
          { name: "声波攻击(鸟叫)", description: "数万只鸟同时尖叫，对耳膜造成物理伤害。" },
          { name: "高空坠物", description: "不仅是鸟粪，还有花盆和鸟食罐。" }
        ];
        details.flavorText = "在这里作战，你需要一把好伞。";
    } else if (location.type === 'TRAINING_GROUNDS') {
        details.wallLevel = 2;
        details.wallName = "演习护栏";
        details.wallDesc = "用于模拟攻城战的训练设施。";
        details.mechanisms = [
          { name: "训练假人", description: "看起来像真人，会吸引敌人的火力。" },
          { name: "钝头弩炮", description: "发射钝头弩箭，虽然不会死人，但会被打飞很远。" }
        ];
        details.flavorText = "虽然是演习，但打在身上还是很疼。";
    } else if (location.type === 'ROACH_NEST') {
        details.wallLevel = 3;
        details.wallName = "纸箱堡垒";
        details.wallDesc = "用纸箱、胶带和发霉木板堆出来的“工事”，看起来很敷衍，但数量多到你绕不过去。";
        details.mechanisms = [
          { name: "快递纸盒城墙", description: "层层叠叠的纸盒吸收冲击，冲车撞上去像撞进一堆“缓冲区”。" },
          { name: "胶带拒马", description: "黏到鞋底的那种，跑得越快摔得越惨。" },
          { name: "瓶盖地雷阵", description: "踩上去会‘啪’一声响，伤害不大，但羞辱性极强。" },
          { name: "方便面蒸汽烟幕", description: "热气与怪味形成烟幕，弓弩手命中率下降，指挥官心态也下降。" },
          { name: "家具脚轮滚桶", description: "看似垃圾桶，其实能顺坡滚下来，把阵型直接撞成‘散列表’。" }
        ];
        details.flavorText = "你听见了很多‘嗡——’，以及某个角落里在认真开会的声音。";
    } else if (location.type === 'IMPOSTER_PORTAL') {
        details.wallLevel = 6;
        details.wallName = "维度防火墙";
        details.wallDesc = "由扭曲的现实、错误代码和绝望构成的不可视之墙。物理攻击经常会被判定为无效。";
        details.mechanisms = [
          // 基础防御 (Tier 1-2 Link)
          { name: "空指针陷阱 (Null Pointer Trap)", description: "踏入其中的单位会因为找不到自身坐标而瞬间消失。" },
          { name: "无限循环护城河 (Infinite Loop Moat)", description: "掉进去的人会永远在同一个动作中循环，直到饿死。" },
          { name: "堆栈溢出屏障 (Stack Overflow Barrier)", description: "试图翻越的敌人会被过量的数据流冲垮，大脑过载。" },
          { name: "静电噪音发生器", description: "持续播放白噪音，干扰指挥官的命令传递。" },
          { name: "像素迷彩网", description: "防御设施在视觉上是马赛克，难以瞄准。" },
          { name: "乱码投掷机", description: "投掷出的不是石块，而是实体化的乱码字符，锋利无比。" },
          { name: "语法错误地雷", description: "触发后会修改周围的物理规则，比如重力反转。" },
          { name: "逻辑死锁门 (Deadlock Gate)", description: "两扇门互相等待对方开启，导致永远无法打开，坚不可摧。" },
          { name: "资源耗尽力场", description: "在这个范围内，体力和魔法值恢复速度归零。" },
          { name: "内存泄漏池 (Memory Leak Pool)", description: "站在上面的单位会随着时间推移逐渐失去生命上限。" },
          // 进阶防御 (Tier 3-4 Link)
          { name: "递归箭塔 (Recursive Turret)", description: "射出一支箭，这支箭会分裂成两支，然后继续分裂..." },
          { name: "分形护盾发生器", description: "护盾由无数个小护盾组成，每一个都拥有整体的强度。" },
          { name: "蓝屏冲击波 (BSOD Blast)", description: "周期性释放蓝色光波，强制敌方机械单位重启。" },
          { name: "内核恐慌诱发装置", description: "让周围的生物感到莫名的、源自灵魂深处的恐慌。" },
          { name: "段错误切割网 (Segfault Mesh)", description: "接触到的物体会被判定为“非法访问”而被直接切断。" },
          { name: "404 虚空投射器", description: "将被击中的区域标记为“未找到”，该区域内的任何东西都会坠入虚空。" },
          { name: "非法操作拦截网", description: "拦截所有飞行道具，并将其标记为非法操作而删除。" },
          { name: "数据包丢弃区", description: "进入该区域的单位有50%的概率“丢包”，即动作无法执行。" },
          { name: "延迟尖刺陷阱 (Lag Spike)", description: "当你以为安全通过时，尖刺会在3秒后突然判定命中你。" },
          { name: "丢包率干扰器", description: "让远程攻击的命中率大幅下降。" },
          { name: "强制垃圾回收站 (GC Station)", description: "周期性清除战场上的尸体和虚弱单位（斩杀低血量）。" },
          { name: "并发冲突雷区", description: "多人同时踩踏会引发巨大的爆炸。" },
          { name: "野指针触手阵", description: "从地下伸出的触手，胡乱攻击周围的一切。" },
          { name: "浮点误差力场", description: "所有的伤害计算都会产生微小的误差，积少成多导致护甲失效。" },
          { name: "类型不匹配屏障", description: "只有特定类型的兵种才能通过，其他类型会被弹开。" },
          { name: "未捕获异常发射井", description: "发射不稳定的能量球，爆炸效果完全随机。" },
          { name: "死循环漩涡", description: "将附近的敌人吸入中心，无法逃脱。" },
          { name: "版本回退时光机", description: "将小范围内的敌人状态回退到受伤前...或者更糟的状态。" },
          // 核心/Boss防御 (Tier 5 Link)
          { name: "祖传代码屎山 (Legacy Code Mountain)", description: "看起来摇摇欲坠，但没人敢动它。任何攻击都会引发不可预知的连锁反应。" },
          { name: "系统崩溃核心 (System Crash Core)", description: "一旦防御被突破，核心会自爆，试图拉着整个世界一起崩溃。" },
          { name: "全服回档按钮", description: "极低概率触发，让战斗时间倒流。" },
          { name: "停机维护倒计时", description: "给攻城方施加巨大的心理压力，时间耗尽则判负。" },
          { name: "数据抹除光束", description: "被击中的单位不仅会死亡，还会被从历史上抹去（无法复活）。" },
          { name: "账号封禁法阵", description: "踏入法阵的英雄会被暂时“封号”，无法使用技能。" },
          { name: "防沉迷结界", description: "战斗时间越长，攻城方属性越低。" },
          { name: "氪金验证通道", description: "只有消耗大量第纳尔才能通过的快速通道（其实是陷阱）。" },
          { name: "外挂检测哨塔", description: "对属性异常高的单位（如玩家）造成额外伤害。" },
          { name: "DDOS 洪流炮", description: "发射高密度的垃圾数据流，瘫痪敌人的行动。" },
          { name: "服务器熔断器", description: "当受到过量伤害时，暂时免疫一切伤害。" },
          { name: "热更新补丁网", description: "受损的城墙会在战斗中自动修复。" },
          { name: "维度防火墙 (Firewall)", description: "字面意义上的火墙，燃烧着绿色的代码之火。" }
        ];
        details.flavorText = "这里是世界的伤口，任何靠近的人都会被存在本身排斥。在这里，物理法则只是建议，不是铁律。";
    }

    const mechanismCount = details.mechanisms.length;
    const hasDefenseBuilding = (location.buildings ?? []).includes('DEFENSE');
    details.wallHp = Math.max(0, details.wallLevel) * 650 + (hasDefenseBuilding ? 260 : 0);
    details.mechanismHp = mechanismCount * 140;
    details.rangedHitBonus = clampValue(0.02 + details.wallLevel * 0.05 + mechanismCount * 0.007 + (hasDefenseBuilding ? 0.02 : 0), 0, 0.45);
    details.rangedDamageBonus = clampValue(details.wallLevel * 0.05 + mechanismCount * 0.007 + (hasDefenseBuilding ? 0.03 : 0), 0, 0.38);
    details.meleeDamageReduction = clampValue(details.wallLevel * 0.04 + mechanismCount * 0.008 + (hasDefenseBuilding ? 0.02 : 0), 0, 0.4);
    return details;
  };

  const buildGarrisonTroops = (location: Location) => {
    return getLocationGarrison(location)
      .map(unit => {
        const troop = getTroopTemplate(unit.troopId);
        return troop ? { ...troop, count: unit.count, xp: 0 } : null;
      })
      .filter(Boolean) as Troop[];
  };

  const getDefenderTroops = (location: Location) => {
    const baseGarrison = (location.garrison ?? []).length > 0
      ? (location.garrison ?? []).map(t => ({ ...t }))
      : buildGarrisonTroops(location);
    const stayParties = location.stayParties ?? [];
    const stationedArmies = location.stationedArmies ?? [];
    const stayTroops = stayParties.flatMap(party => party.troops.map(t => ({ ...t })));
    const stationedTroops = stationedArmies.flatMap(army => army.troops.map(t => ({ ...t })));
    return [...baseGarrison, ...stayTroops, ...stationedTroops];
  };

  const enterLocation = (location: Location) => {
     if (location.type === 'FIELD_CAMP') {
       if (location.owner === 'ENEMY') {
         const troops = (location.garrison ?? []).map(t => ({ ...t }));
         const militiaTemplate = getTroopTemplate('militia');
         const defenseAddon = militiaTemplate ? [{ ...militiaTemplate, count: 8, xp: 0 }] : [];
         const withDefense = (location.buildings ?? []).includes('DEFENSE')
           ? mergeTroops(troops, defenseAddon)
           : troops;
         const enemy: EnemyForce = {
           id: `field_camp_${Date.now()}`,
           name: location.camp?.attackerName ?? location.name,
           description: `${location.description}${(location.buildings ?? []).includes('DEFENSE') ? '营地四周有简易木栅与拒马。' : ''}`,
           troops: withDefense,
           difficulty: '一般',
           lootPotential: 1.0,
           terrain: location.terrain,
           baseTroopId: withDefense[0]?.id ?? 'militia'
         };
         addLog(`你接近了 ${location.name}，敌军立即出营迎战！`);
         setActiveEnemy(enemy);
         setPendingBattleMeta({ mode: 'FIELD', targetLocationId: location.id, siegeContext: '临时营地：有简易木栅、拒马与壕沟，适合防守反击。' });
         setPendingBattleIsTraining(false);
         setView('BATTLE');
         return;
       }
       setCurrentLocation(location);
       setView('TOWN');
       addLog(`进入了 ${location.name}。`);
       return;
     }
     if (location.type === 'BANDIT_CAMP') {
        setCurrentLocation(location);
        setView('BANDIT_ENCOUNTER');
        addLog(`发现了 ${location.name}。`);
        return;
     }

     if (location.type === 'WORLD_BOARD') {
       setCurrentLocation(location);
       if (!workState?.isActive) {
         setView('WORLD_BOARD');
       }
       addLog(`抵达了 ${location.name}。`);
       return;
     }

     if (location.type === 'COFFEE') {
       setUndeadChatInput('');
       setUndeadDialogue([{ role: 'UNDEAD', text: '欢迎光临，咖啡不热，但记忆还在冒烟。' }]);
       setIsUndeadChatLoading(false);
     }

     if (location.type === 'MYSTERIOUS_CAVE') {
       setShaperInput('');
       setShaperDialogue([{ role: 'NPC', text: '别站门口挡风。说吧，你想让我缝出什么兵？' }]);
       setShaperProposal(null);
       setIsShaperLoading(false);
     }
    if (location.type === 'ALTAR') {
      setIsAltarLoading(false);
      setAltarDialogues(prev => {
        if (prev[location.id]) return prev;
        return {
          ...prev,
          [location.id]: [
            { role: 'NPC', text: '黑纱之下传来低语：说出你的教义。回答三件事。' },
            { role: 'NPC', text: '你的神明掌管什么权柄？' },
            { role: 'NPC', text: '你的信徒如何散播恐惧？' },
            { role: 'NPC', text: '赐予他们何种禁忌的祝福？' }
          ]
        };
      });
      setAltarDrafts(prev => prev[location.id] ? prev : { ...prev, [location.id]: { domain: '', spread: '', blessing: '' } });
    }

    const relationTarget = getLocationRelationTarget(location);
    if (relationTarget?.type === 'FACTION' && location.owner !== 'PLAYER' && (location.type === 'CITY' || location.type === 'CASTLE' || location.type === 'VILLAGE')) {
      const relationValue = getRelationValue(playerRef.current, relationTarget.type, relationTarget.id);
      if (relationValue <= -40) {
        const factionName = FACTIONS.find(f => f.id === relationTarget.id)?.name ?? location.name;
        addLog(`${factionName} 对你拒绝入城。`);
        addLocationLog(location.id, `城门关闭，拒绝 ${playerRef.current.name} 入城。`);
        return;
      }
    }

     // Check for Recruit Refresh
     const REFRESH_INTERVAL = 3;
     let updatedLoc = { ...location };
     let locUpdated = false;

     const isHeavyTrialGrounds = location.type === 'HEAVY_TRIAL_GROUNDS';
    const isRecruitRefreshExcluded = location.type === 'MYSTERIOUS_CAVE' || location.type === 'IMPOSTER_PORTAL' || location.type === 'ALTAR' || location.type === 'FIELD_CAMP';
     const shouldRefreshRecruit =
       !isRecruitRefreshExcluded &&
       (player.day - location.lastRefreshDay >= REFRESH_INTERVAL || (isHeavyTrialGrounds && location.mercenaries.length === 0));

     if (shouldRefreshRecruit) {
        // Generate Volunteers (Low tier, cheap)
        const volunteerPool = getRecruitmentPool(location, 'VOLUNTEER');
        const volunteerOffers: RecruitOffer[] = [];
        if (volunteerPool.length > 0) {
            // Count boosted by leadership
            const count = Math.floor(Math.random() * 5) + 3 + player.attributes.leadership; 
            const templateId = volunteerPool[Math.floor(Math.random() * volunteerPool.length)];
            const template = TROOP_TEMPLATES[templateId];
            volunteerOffers.push({ troopId: templateId, count, cost: template.cost });
        }

        // Generate Mercenaries (Mid-High tier, expensive)
        const mercPool = getRecruitmentPool(location, 'MERCENARY');
        const mercOffers: RecruitOffer[] = [];
        if (mercPool.length > 0) {
          if (isHeavyTrialGrounds) {
            mercPool.forEach(templateId => {
              const template = TROOP_TEMPLATES[templateId];
              mercOffers.push({ troopId: templateId, count: 1, cost: template.cost });
            });
          } else if (Math.random() > 0.3) {
            const count = Math.floor(Math.random() * 4) + 1;
            const templateId = mercPool[Math.floor(Math.random() * mercPool.length)];
            const template = TROOP_TEMPLATES[templateId];
            mercOffers.push({ troopId: templateId, count, cost: Math.floor(template.cost * 1.5) });
          }
        }

        updatedLoc = {
           ...location,
           lastRefreshDay: player.day,
           volunteers: volunteerOffers,
           mercenaries: mercOffers
        };
        locUpdated = true;
     }

     if (locUpdated) {
        setLocations(prev => prev.map(l => l.id === updatedLoc.id ? updatedLoc : l));
        setCurrentLocation(updatedLoc);
     } else {
        setCurrentLocation(location);
     }

     if (location.type === 'TRAINING_GROUNDS') {
       setView('TRAINING');
     } else if (location.type === 'ASYLUM') {
       setView('ASYLUM');
     } else if (location.type === 'MARKET') {
       setView('MARKET');
     } else if (location.type === 'MYSTERIOUS_CAVE') {
       setView('CAVE');
    } else if (location.type === 'IMPOSTER_PORTAL') {
       setView('TOWN');
       setTownTab('LOCAL_GARRISON');
    } else if (location.type === 'ALTAR') {
      if (!workState?.isActive && !miningState?.isActive && !roachLureState?.isActive && !altarRecruitState?.isActive) {
        setView('TOWN');
        setTownTab('ALTAR');
      }
    } else if (MINE_CONFIGS[location.type]) {
      if (!workState?.isActive && !miningState?.isActive && !roachLureState?.isActive) {
        setView('TOWN');
        setTownTab('MINING');
      }
    } else if (location.type === 'BLACKSMITH') {
      if (!workState?.isActive && !miningState?.isActive && !roachLureState?.isActive) {
        setView('TOWN');
        setTownTab('FORGE');
      }
    } else if (location.type === 'MAGICIAN_LIBRARY') {
      if (!workState?.isActive && !miningState?.isActive && !roachLureState?.isActive && !altarRecruitState?.isActive) {
        setView('TOWN');
        setTownTab('MAGICIAN_LIBRARY');
      }
     } else {
       // Only set view to TOWN if not working.
       // The work loop will handle the view.
      if (!workState?.isActive && !miningState?.isActive && !roachLureState?.isActive) {
        setView('TOWN');
        setTownTab('RECRUIT');
       }
     }
    addLocationLog(location.id, `有部队抵达：${playerRef.current.name}。`);
     addLog(`抵达了 ${location.name}。`);
  };

  const getRecruitmentPool = (location: Location, mode: 'VOLUNTEER' | 'MERCENARY'): string[] => {
    const type = location.type;
    const factionId = location.factionId;
    const factionMercs = factionId === 'VERDANT_COVENANT'
      ? ['verdant_scout_archer', 'verdant_skybow']
      : factionId === 'FROST_OATH'
        ? ['frost_oath_halberdier', 'frost_oath_bladeguard']
        : factionId === 'RED_DUNE'
          ? ['red_dune_lancer', 'red_dune_cataphract']
          : [];
    if (type === 'HEAVY_TRIAL_GROUNDS') {
      if (mode === 'VOLUNTEER') return [];
      return [
        'heavy_ballista',
        'heavy_catapult',
        'heavy_bulwark_carriage',
        'heavy_fire_cannon',
        'heavy_light_tank',
        'heavy_arcane_radar',
        'roach_egg_thrower',
        'imposter_flux_mortar',
        'undead_soul_obelisk',
        'hotpot_broth_howler'
      ];
    }
     if (type === 'GRAVEYARD') {
        if (mode === 'VOLUNTEER') return ['zombie', 'undead_grave_thrall', 'undead_rot_scout', 'undead_mire_digger', 'undead_bone_crawler', 'undead_ashen_runner', 'undead_coffin_bearer'];
        return ['skeleton_warrior', 'specter', 'skeleton_archer', 'undead_musician', 'undead_bone_javelin', 'undead_grave_arbalist', 'undead_bone_slinger', 'undead_tomb_guard', 'undead_plague_bearer'];
     }
     if (type === 'HOTPOT_RESTAURANT') {
        // Special Hotpot Units
        return ['meatball_soldier', 'tofu_shield', 'spicy_soup_mage'];
     }
    if (type === 'COFFEE') {
       if (mode === 'VOLUNTEER') return ['zombie', 'undead_grave_thrall', 'undead_ashen_runner', 'skeleton_warrior'];
       return [];
    }
    if (type === 'MARKET') return [];
    if (type === 'IMPOSTER_PORTAL') return [];
     if (type === 'MYSTERIOUS_CAVE') return [];
    if (type === 'ROACH_NEST') return [];
     
     // General locations
     if (mode === 'VOLUNTEER') {
        return [
          'peasant',
          'militia',
          'hunter',
          'zealot',
          'imperial_shield_conscript',
          'imperial_recruit_archer',
          'imperial_recruit_crossbow',
          'imperial_light_attendant',
          'imperial_spear_initiate',
          'imperial_squire_cavalry',
          'imperial_rider_trainee'
        ];
     } else {
        const basePool = ['footman', 'archer', 'wolf_rider', 'alchemist', 'flagellant'];
        if (location.type === 'CITY' || location.type === 'CASTLE' || location.type === 'VILLAGE') {
          return [...basePool, ...factionMercs];
        }
        return basePool;
     }
  };

  const triggerRandomEncounter = (terrain: TerrainType, atLocation?: Location) => {
    const enemyType = ENEMY_TYPES[Math.floor(Math.random() * ENEMY_TYPES.length)];
    const baseTroopTemplate = TROOP_TEMPLATES[enemyType.baseTroopId];
    if (!baseTroopTemplate) return;

    const count = Math.floor(Math.random() * (enemyType.countRange[1] - enemyType.countRange[0] + 1)) + enemyType.countRange[0];
    const enemyTroops: Troop[] = [{ ...baseTroopTemplate, count: count, xp: 0 }];
    const enemyTroopsWithHero = ensureEnemyHeroTroops(enemyTroops);

    const enemy: EnemyForce = {
      name: enemyType.name,
      description: `一伙游荡的 ${count} 人 ${enemyType.name}。`,
      troops: enemyTroopsWithHero,
      difficulty: enemyType.difficulty,
      lootPotential: 1.5,
      terrain: terrain,
      baseTroopId: enemyType.baseTroopId
    };

    let supportTroops: Troop[] | null = null;
    let supportLabel = '';
    if (atLocation) {
      setCurrentLocation(atLocation);
      const relationTarget = getLocationRelationTarget(atLocation);
      const relationValue = relationTarget ? getRelationValue(playerRef.current, relationTarget.type, relationTarget.id) : 0;
      const locationRace = getLocationRace(atLocation);
      const enemyRace = getEnemyRace(enemy);
      if (relationValue >= 20 && (enemyRace ? enemyRace !== locationRace : true)) {
        const ratio = relationValue >= 60 ? 0.35 : relationValue >= 40 ? 0.25 : 0.15;
        const supportCandidates = buildSupportTroops(atLocation, ratio);
        if (supportCandidates.length > 0) {
          supportTroops = supportCandidates;
          supportLabel = relationTarget?.type === 'FACTION'
            ? `${FACTIONS.find(f => f.id === relationTarget.id)?.name ?? atLocation.name}援军`
            : relationTarget?.type === 'RACE'
              ? `${RACE_LABELS[relationTarget.id as RaceId]}援军`
              : `${atLocation.name}援军`;
          addLog(`${atLocation.name}派出援军协助迎敌。`);
          addLocationLog(atLocation.id, `守军增援前来迎敌。`);
        }
      }
    }
    setActiveEnemy(enemy);
    if (atLocation && supportTroops) {
      setPendingBattleMeta({ mode: 'DEFENSE_AID', targetLocationId: atLocation.id, supportTroops, supportLabel });
    } else {
      setPendingBattleMeta(atLocation ? { mode: 'FIELD', targetLocationId: atLocation.id } : { mode: 'FIELD' });
    }
    setPendingBattleIsTraining(false);
    setView('BATTLE');
    addLog(atLocation ? `在 ${atLocation.name} 遭遇了 ${enemy.name} 的伏击！` : `在 ${terrain} 遭遇了 ${enemy.name} 的伏击！`);
  };

  // --- Battle Logic ---

  const calculatePower = (troops: Troop[]) => troops.reduce((acc, t) => {
    const bonusRatio = (t.enchantments ?? []).reduce((sum, e) => sum + e.powerBonus, 0);
    if (t.id === 'player_main' || t.id.startsWith('hero_')) return acc + t.basePower * (1 + bonusRatio);
    return acc + t.count * t.tier * 10 * (1 + bonusRatio);
  }, 0);

  const buildRaceComposition = (troops: Troop[]) => {
    const counts: Partial<Record<TroopRace, number>> = {};
    let total = 0;
    troops.forEach(troop => {
      const count = troop.count ?? 0;
      total += count;
      const race = getTroopRace(troop, IMPOSTER_TROOP_IDS);
      counts[race] = (counts[race] ?? 0) + count;
    });
    if (total <= 0) return '无';
    return Object.entries(counts)
      .sort((a, b) => Number(b[1]) - Number(a[1]))
      .map(([race, count]) => {
        const ratio = Math.round((Number(count) / total) * 100);
        const label = TROOP_RACE_LABELS[race as TroopRace] ?? race;
        return `${label}${count}(${ratio}%)`;
      })
      .join('，');
  };

  const calculateLocalBattleRewards = (enemy: EnemyForce, playerLevel: number, outcome: BattleResult['outcome']) => {
    if (outcome !== 'A') return { gold: 0, renown: 0, xp: 0 };
    const enemyCount = enemy.troops.reduce((sum, t) => sum + (t.count ?? 0), 0);
    const weightedTier = enemy.troops.reduce((sum, t) => sum + (t.tier ?? 1) * (t.count ?? 0), 0);
    const avgTier = enemyCount > 0 ? weightedTier / enemyCount : 1;
    const sizeFactor = Math.max(1, Math.sqrt(Math.max(1, enemyCount)));
    const levelFactor = 1 + Math.max(0, playerLevel) * 0.05;
    const baseXp = sizeFactor * Math.max(1, avgTier) * 12;
    const baseGold = sizeFactor * Math.max(1, avgTier) * 14 * Math.max(0.5, enemy.lootPotential ?? 1);
    const baseRenown = Math.max(1, Math.round(Math.max(1, avgTier) * Math.log2(enemyCount + 1)));
    return {
      xp: Math.max(10, Math.round(baseXp * levelFactor)),
      gold: Math.max(0, Math.round(baseGold * levelFactor)),
      renown: Math.max(0, Math.round(baseRenown * (1 + Math.max(0, playerLevel) * 0.02)))
    };
  };

  const calculateFleeChance = (pTroops: Troop[], eTroops: Troop[], escapeLevel: number) => {
      const pPower = calculatePower(pTroops);
      const ePower = calculatePower(eTroops);
      const totalPower = pPower + ePower;
      const diffRatio = totalPower > 0 ? (pPower - ePower) / totalPower : 0;
      const escapeBonus = (escapeLevel ?? 0) * 0.02;
      return Math.min(0.9, Math.max(0.1, 0.5 + diffRatio + escapeBonus));
  };

  const calculateRearGuardPlan = (pTroops: Troop[], eTroops: Troop[], escapeLevel: number) => {
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
  };

  const getEncounterPlayerTroops = (currentPlayer: PlayerState, currentHeroes: Hero[]) => {
    const baseTroops = getBattleTroops(currentPlayer, currentHeroes);
    if (pendingBattleMeta?.mode === 'DEFENSE_AID') {
      const loc = pendingBattleMeta.targetLocationId
        ? locations.find(l => l.id === pendingBattleMeta.targetLocationId)
        : null;
      const garrison = loc?.garrison ?? [];
      return [...baseTroops, ...garrison, ...(pendingBattleMeta.supportTroops ?? [])];
    }
    return baseTroops;
  };

  const concludeNegotiationRetreat = (message: string, goldSpent: number = 0) => {
    addLog(message);
    if (goldSpent > 0) addLog(`交出了 ${goldSpent} 第纳尔。`);
    if (pendingBattleMeta?.mode === 'SIEGE' && pendingBattleMeta.targetLocationId) {
      const target = locations.find(l => l.id === pendingBattleMeta.targetLocationId);
      if (target) {
        const updated = {
          ...target,
          owner: 'PLAYER' as const,
          isUnderSiege: false,
          siegeProgress: 0,
          siegeEngines: [],
          siegeEngineQueue: [],
          sackedUntilDay: undefined,
          garrison: []
        };
        updateLocationState(updated);
        addLocationLog(target.id, `谈判撤军，${target.name} 被玩家接管。`);
        addLog(`守军撤离，${target.name} 落入你手。`);
      }
    }
    setActiveEnemy(null);
    setPendingBattleMeta(null);
    setPendingBattleIsTraining(false);
    setView('MAP');
  };

  const startNegotiation = () => {
    if (!activeEnemy) return;
    setNegotiationOpen(true);
    setNegotiationError(null);
    if (negotiationDialogue.length === 0) {
      setNegotiationDialogue([{ role: 'ENEMY', text: `${activeEnemy.name} 正注视着你，等待你的条件。` }]);
    }
  };

  const sendNegotiationMessage = async () => {
    if (!activeEnemy) return;
    if (negotiationState.locked || negotiationState.status === 'loading') return;
    const text = negotiationInput.trim();
    if (!text) return;
    const openAI = buildAIConfig();
    if (!openAI) {
      setNegotiationError('未配置 AI 模型，无法谈判。');
      return;
    }
    const currentPlayer = playerRef.current;
    const playerTroops = getEncounterPlayerTroops(currentPlayer, heroesRef.current);
    const playerPower = calculatePower(playerTroops);
    const enemyPower = calculatePower(activeEnemy.troops);
    const powerRatio = enemyPower > 0 ? Number((playerPower / enemyPower).toFixed(2)) : playerPower;
    const nextDialogue = [...negotiationDialogue, { role: 'PLAYER' as const, text }];
    setNegotiationDialogue(nextDialogue);
    setNegotiationInput('');
    setNegotiationError(null);
    setNegotiationState({ status: 'loading', result: negotiationState.result, locked: negotiationState.locked });
    try {
      const negotiationLevel = currentPlayer.attributes.negotiation ?? 0;
      const findNegotiationLeader = () => {
        if (pendingBattleMeta?.mode === 'SIEGE' && pendingBattleMeta.targetLocationId) {
          const target = locations.find(loc => loc.id === pendingBattleMeta.targetLocationId);
          if (target?.lord) return target.lord;
        }
        const named = lordsRef.current.find(lord => activeEnemy.name.includes(lord.name) || activeEnemy.name.includes(`${lord.title}${lord.name}`));
        return named ?? null;
      };
      const leader = findNegotiationLeader();
      const leaderName = leader ? `${leader.title}${leader.name}` : activeEnemy.name;
      const leaderType = leader ? 'LORD' : 'COMMANDER';
      const result = await resolveNegotiation({
        enemyName: activeEnemy.name,
        enemyDescription: activeEnemy.description,
        leaderName,
        leaderType,
        leaderRelation: leader?.relation ?? null,
        playerPower,
        enemyPower,
        powerRatio,
        playerRaceSummary: buildRaceComposition(playerTroops),
        enemyRaceSummary: buildRaceComposition(activeEnemy.troops),
        negotiationLevel,
        playerGold: currentPlayer.gold,
        playerMessage: text,
        history: nextDialogue
      }, openAI);
      setNegotiationDialogue(prev => [...prev, { role: 'ENEMY', text: result.reply }]);
      if (result.decision === 'RETREAT') {
        setNegotiationState({ status: 'result', result, locked: false });
        concludeNegotiationRetreat(result.reply);
        return;
      }
      if (result.decision === 'REFUSE') {
        setNegotiationState({ status: 'result', result, locked: true });
        return;
      }
      setNegotiationState({ status: 'result', result, locked: false });
    } catch (e: any) {
      setNegotiationError(`谈判失败：${e.message || '未知错误'}`);
      setNegotiationState({ status: 'idle', result: negotiationState.result, locked: negotiationState.locked });
    }
  };

  const acceptNegotiationTerms = () => {
    const result = negotiationState.result;
    if (!result || result.decision !== 'CONDITIONAL') return;
    const percent = clampValue(result.goldPercent ?? 0, 0, 95);
    const goldSpent = Math.floor(playerRef.current.gold * (percent / 100));
    if (goldSpent > playerRef.current.gold) {
      addLog('金币不足，无法满足谈判条件。');
      setNegotiationState(prev => ({ ...prev, locked: true }));
      return;
    }
    if (goldSpent > 0) {
      setPlayer(prev => ({ ...prev, gold: Math.max(0, prev.gold - goldSpent) }));
    }
    concludeNegotiationRetreat(result.reply, goldSpent);
  };

  const rejectNegotiationTerms = () => {
    addLog('你拒绝了谈判条件，谈判破裂。');
    setNegotiationState(prev => ({ ...prev, locked: true }));
  };

  const resolveBattleProgrammatic = (
    battleTroops: Troop[],
    enemyForce: EnemyForce,
    terrain: TerrainType,
    currentPlayer: PlayerState,
    battleInfo?: { mode: 'FIELD' | 'SIEGE' | 'DEFENSE_AID'; targetLocationId?: string; supportTroops?: Troop[] }
  ): BattleResult => {
    const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
    const isLegacyAttributes = (attrs: Troop['attributes']) => {
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
        const fallback = getDefaultLayerId(troop, battlePlan.layers);
        const target = assigned && layerIds.includes(assigned) ? assigned : fallback;
        const idx = layerIds.indexOf(target);
        return idx >= 0 ? idx : 0;
      }
      const enemyLayers = DEFAULT_BATTLE_LAYERS;
      const target = getDefaultLayerId(troop, enemyLayers);
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
    const buildActionQueue = (side: 'A' | 'B', troops: Troop[]) => {
      return troops.filter(t => t.count > 0).map(troop => {
        const attrs = troop.attributes ?? fallbackAttributes((troop.tier ?? TroopTier.TIER_1) as TroopTier);
        const agility = Math.max(20, attrs.agility);
        const range = attrs.range ?? 0;
        const rangedFirst = isRangedUnit(troop);
        const speed = clamp(agility / 100, 0.5, 2.4);
        const interval = 100 / speed;
        const initBoost = (rangedFirst ? 18 : 0) + Math.min(12, range / 20);
        return {
          side,
          troop,
          nextAct: Math.max(1, interval - initBoost),
          interval,
          rangedFirst,
          agility,
          range
        };
      });
    };
    const computeLoss = (attacker: Troop[], defender: Troop[], phase: string, mods: { hit: number; damage: number }, cap: number) => {
      const attCount = countTroops(attacker);
      const defCount = countTroops(defender);
      if (attCount <= 0 || defCount <= 0) return 0;
      const attAvg = avgAttrs(attacker);
      const defAvg = avgAttrs(defender);
      const phaseBaseHit = phase === 'ranged' ? 0.5 : phase === 'heavy' ? 0.55 : phase === 'pursuit' ? 0.65 : 0.6;
      const hit = clamp(
        phaseBaseHit + (attAvg.agility - defAvg.agility) * 0.004 + mods.hit + (phase === 'ranged' ? (attAvg.range - defAvg.range) * 0.002 : 0),
        0.1,
        0.9
      );
      const moraleFactor = 1 + (attAvg.morale - defAvg.morale) * 0.003;
      const phasePower = phase === 'ranged' ? 0.9 : phase === 'heavy' ? 1.15 : phase === 'pursuit' ? 0.75 : 1.0;
      const randomFactor = 0.85 + Math.random() * 0.3;
      const defenseFactor = 1 / (1 + defAvg.defense / 120 + defAvg.hp / 160);
      const totalDamage = attAvg.attack * attCount * hit * moraleFactor * phasePower * randomFactor * (1 + mods.damage) * defenseFactor;
      const unitEhp = Math.max(18, defAvg.hp * 6 + defAvg.defense * 2);
      return Math.min(defCount, Math.floor(totalDamage / unitEhp), cap);
    };
    const keyUnitsA = battleTroops.filter(t => t.id === 'player_main' || t.id.startsWith('hero_')).map(normalizeTroop);
    const enemyLeader = enemyForce.troops.map(normalizeTroop).sort((a, b) => (b.basePower ?? 0) - (a.basePower ?? 0))[0];
    let troopsA = battleTroops.map(normalizeTroop);
    let troopsB = enemyForce.troops.map(normalizeTroop);
    const totalCount = countTroops(troopsA) + countTroops(troopsB);
    const battleWidth = Math.max(60, Math.min(220, Math.floor(Math.sqrt(Math.max(1, totalCount)) * 10 + 40)));
    const engagementCap = Math.max(20, Math.floor(Math.min(totalCount, 40 + Math.sqrt(Math.max(1, totalCount)) * 12)));
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
        ...buildActionQueue('A', troopsA),
        ...buildActionQueue('B', troopsB)
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
      const actionBudget = Math.max(10, Math.floor(engagementCap));
      for (let step = 0; step < actionBudget; step++) {
        if (countTroops(troopsA) <= 0 || countTroops(troopsB) <= 0) break;
        const actor = actionQueue.shift();
        if (!actor) break;
        if (actor.troop.count <= 0) continue;
        const defenderSide = actor.side === 'A' ? 'B' : 'A';
        const defenders = defenderSide === 'A' ? troopsA : troopsB;
        if (countTroops(defenders) <= 0) break;
        const actionPhase = getActionPhase(actor.troop);
        const mods = getPhaseMods(actor.side, actionPhase, defenseActive);
        const actionStrength = Math.min(actor.troop.count, engagementCap);
        const attackCount = Math.max(1, Math.floor(actionStrength * 0.25));
        const loss = computeLoss([{ ...actor.troop, count: attackCount }], defenders, actionPhase, mods, attackCount);
        if (loss > 0) {
          if (defenderSide === 'A') roundCasualtiesA.push(...applyLosses(troopsA, loss, actionPhase, 'A'));
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
      if (roundCasualtiesA.length > 0 && Math.random() < 0.35 && keyUnitsA.length > 0) {
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
      const phaseSummary = `战场宽度${battleWidth}，接战上限${engagementCap}。行动按敏捷轮转，远程单位优先出手。${siegeReport ? ` ${siegeReport}。` : ''}`;
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
  };

  const attemptFlee = () => {
     if (!activeEnemy) return;
     const prev = playerRef.current;
     const chance = calculateFleeChance(prev.troops, activeEnemy.troops, prev.attributes.escape ?? 0);

     addLog(`尝试逃跑... (成功率: ${Math.floor(chance * 100)}%)`);

     if (Math.random() < chance) {
        addLog("逃跑成功！你带着部队消失在尘土中。");
        setActiveEnemy(null);
       setPendingBattleMeta(null);
       setPendingBattleIsTraining(false);
        setView('MAP');
     } else {
        addLog("逃跑失败！敌人追上了你们，被迫应战！");
        // Penalty? Maybe morale or initiative, but for now just start battle
        startBattle(pendingBattleIsTraining, pendingBattleMeta ?? undefined);
     }
  };

  const sacrificeRetreat = () => {
    if (!activeEnemy) return;
    const prev = playerRef.current;
    const plan = calculateRearGuardPlan(prev.troops, activeEnemy.troops, prev.attributes.escape ?? 0);
    
    setPlayer(current => {
        let troopsLost = 0;
        const newFallenRecords: FallenRecord[] = [];

        const newTroops = current.troops.map(t => {
           const lostCount = Math.ceil(t.count * plan.ratio);
           troopsLost += lostCount;
           
           if (lostCount > 0) {
               newFallenRecords.push({
                   id: `fallen_rear_${Date.now()}_${Math.random()}`,
                   unitName: t.name,
                   count: lostCount,
                   day: current.day,
                   battleName: activeEnemy.name,
                   cause: "为大部队断后牺牲"
               });
           }

           return { ...t, count: Math.max(0, t.count - lostCount) };
        }).filter(t => t.count > 0);

        addLog(`你留下了 ${troopsLost} 名士兵断后（成功率: ${Math.floor(plan.successChance * 100)}%）。`);
        
        return { 
            ...current, 
            troops: newTroops,
            fallenRecords: [...current.fallenRecords, ...newFallenRecords]
        };
    });

    if (Math.random() < plan.successChance) {
      addLog("殿后成功！你带着部队撤离了战场。");
      setActiveEnemy(null);
      setPendingBattleMeta(null);
      setPendingBattleIsTraining(false);
      setView('MAP');
    } else {
      addLog("殿后失败！敌人追了上来，被迫应战！");
      startBattle(pendingBattleIsTraining, pendingBattleMeta ?? undefined);
    }
  };

  const buildDeploymentContext = (currentPlayer: PlayerState, currentHeroes: Hero[], enemyForce: EnemyForce, troopsOverride?: Troop[]) => {
    const stanceLabel = battlePlan.stance === 'ATTACK' ? '进攻' : battlePlan.stance === 'DEFEND' ? '防守' : '重点保护';
    const layers = battlePlan.layers;
    const assignments = battlePlan.assignments;
    const protectedIds = battlePlan.protectedTroopIds;
    const battleTroops = troopsOverride ?? getBattleTroops(currentPlayer, currentHeroes);
    const playerHpRatio = getHpRatio(currentPlayer.currentHp, currentPlayer.maxHp);
    const battleHeroes = currentHeroes.filter(h => h.recruited);
    const battleHeroLines = battleHeroes.map(hero => {
      const hpRatio = getHpRatio(hero.currentHp, hero.maxHp);
      return `- ${hero.name}（随行者）：攻击 ${hero.attributes.attack} / 防御（由敏捷与装备折算，无独立数值）/ 敏捷 ${hero.attributes.agility} / 体魄 ${hero.attributes.hp}；血量 ${hero.currentHp}/${hero.maxHp}（血量系数 ${Math.round(hpRatio * 100)}%）`;
    });
    const commanderLineA = `- ${currentPlayer.name}（A方指挥核心）：攻击 ${currentPlayer.attributes.attack} / 防御 ${currentPlayer.attributes.defense} / 体魄 ${currentPlayer.attributes.hp}；血量 ${currentPlayer.currentHp}/${currentPlayer.maxHp}（血量系数 ${Math.round(playerHpRatio * 100)}%）${currentPlayer.status === 'ACTIVE' ? '' : '；重伤状态，无法参战'}`;
    const hpRuleLine = `- 规则：同一单位血量越低，战斗力与承伤能力越弱（按 当前血量/上限 折算，最低保留 20%）`;

    const formatTroop = (troop: Troop) => {
      const tmpl = getTroopTemplate(troop.id);
      const source = tmpl ? ({ ...tmpl, count: troop.count, xp: troop.xp ?? 0 } as Troop) : troop;
      const equipment = Array.isArray(source.equipment) ? source.equipment.join(', ') : '';
      const description = String(source.description ?? '').trim();
      const attrs = source.attributes
        ? `, 属性: 攻击${source.attributes.attack} 防御${source.attributes.defense} 敏捷${source.attributes.agility} 体魄${source.attributes.hp} 远程${source.attributes.range} 士气${source.attributes.morale}`
        : '';
      const enchantments = (troop.enchantments ?? source.enchantments ?? [])
        .map(e => `【${e.name}】`)
        .join('');
      const enchantText = enchantments ? `, 词条: ${enchantments}` : '';
      return `${source.count}x ${source.name} (Tier ${source.tier}, 装备: ${equipment || '无'}, 描述: ${description || '无'}${attrs}${enchantText})`;
    };

    const buildSideBlock = (
      sideLabel: 'A' | 'B',
      sideStance: string,
      troops: Troop[],
      layerList: { id: string; name: string; hint: string }[],
      layerAssignments: Record<string, string | null>,
      commanderLine: string,
      heroLines: string[],
      garrisonText?: string | null,
      protectedText?: string
    ) => {
      const layerBlocks = layerList.map(layer => {
        const layerTroops = troops.filter(t => layerAssignments[t.id] === layer.id);
        const troopLines = layerTroops.length > 0 ? layerTroops.map(formatTroop).join('\n') : '（空）';
        return `${layer.name}（${layer.hint}）:\n${troopLines}`;
      });
      const unassignedTroops = troops.filter(t => !layerAssignments[t.id]);
      const unassignedText = unassignedTroops.length > 0
        ? `未分配:\n${unassignedTroops.map(formatTroop).join('\n')}`
        : `未分配:\n（无）`;
      return [
        `${sideLabel}方部署：姿态=${sideStance}`,
        `${sideLabel}方指挥核心与随行者状态：`,
        commanderLine,
        ...(heroLines.length > 0 ? heroLines : ['- （无随行者）']),
        hpRuleLine,
        `层级顺序从外到内：`,
        ...(garrisonText ? [garrisonText] : []),
        ...(layerBlocks.length > 0 ? layerBlocks : ['（未设置层级）']),
        unassignedText,
        protectedText ?? `重点保护:\n（无）`
      ].join('\n');
    };

    const playerTroopsOnly = battleTroops.filter(t => !t.id.startsWith('garrison_'));
    const garrisonTroops = battleTroops.filter(t => t.id.startsWith('garrison_'));
    const garrisonText = garrisonTroops.length > 0
      ? `盟军守军（固定阵地/城墙/第一线）:\n${garrisonTroops.map(formatTroop).join('\n')}`
      : null;
    const protectedTroops = protectedIds
      .map(id => battleTroops.find(t => t.id === id))
      .filter(Boolean) as Troop[];
    const protectedText = protectedTroops.length > 0
      ? `重点保护:\n${protectedTroops.map(formatTroop).join('\n')}`
      : `重点保护:\n（无）`;
    const blockA = buildSideBlock(
      'A',
      stanceLabel,
      playerTroopsOnly,
      layers,
      assignments,
      commanderLineA,
      battleHeroLines,
      garrisonText,
      protectedText
    );

    const enemyTroops = enemyForce.troops ?? [];
    const defaultLayers = DEFAULT_BATTLE_LAYERS;
    const enemyAssignments = enemyTroops.reduce<Record<string, string | null>>((acc, troop) => {
      acc[troop.id] = getDefaultLayerId(troop, defaultLayers);
      return acc;
    }, {});
    const enemyCommander = enemyTroops.reduce<{ troop: Troop | null; score: number }>((best, troop) => {
      const attrs = troop.attributes;
      const score = attrs
        ? (attrs.attack + attrs.defense + attrs.agility + attrs.hp + attrs.range + attrs.morale) * 10
        : 0;
      const tierWeight = typeof troop.tier === 'number' ? troop.tier * 50 : 0;
      const countWeight = Math.max(0, troop.count ?? 0);
      const total = score + tierWeight + countWeight;
      if (!best.troop || total > best.score) return { troop, score: total };
      return best;
    }, { troop: null, score: -Infinity }).troop;
    const enemyCommanderAttrs = enemyCommander?.attributes ?? { attack: 1, defense: 1, agility: 1, hp: 1, range: 1, morale: 1 };
    const enemyCommanderHp = Math.max(1, Math.round(enemyCommanderAttrs.hp));
    const enemyCommanderName = enemyCommander?.name ? `${enemyCommander.name}核心` : '灵魂核心';
    const commanderLineB = `- ${enemyCommanderName}（B方指挥核心）：攻击 ${enemyCommanderAttrs.attack} / 防御 ${enemyCommanderAttrs.defense} / 体魄 ${enemyCommanderAttrs.hp}；血量 ${enemyCommanderHp}/${enemyCommanderHp}（血量系数 100%）`;
    const blockB = buildSideBlock(
      'B',
      '默认',
      enemyTroops,
      defaultLayers,
      enemyAssignments,
      commanderLineB,
      [],
      null,
      `重点保护:\n（无）`
    );

    return [blockA, blockB].join('\n\n');
  };

  const copyPendingBattlePrompt = async () => {
    const enemy = activeEnemy;
    if (!enemy) return;
    const meta = pendingBattleMeta ?? { mode: 'FIELD' as const };
    const currentPlayer = playerRef.current;
    const currentHeroes = heroesRef.current;
    let battleTroops = getBattleTroops(currentPlayer, currentHeroes);

    if (meta.mode === 'DEFENSE_AID' && meta.targetLocationId) {
        const loc = locations.find(l => l.id === meta.targetLocationId);
        const supportTroops = meta.supportTroops ?? loc?.garrison ?? [];
        const taggedGarrison = supportTroops.map(t => ({ ...t, id: `garrison_${t.id}` }));
        battleTroops = [...battleTroops, ...taggedGarrison];
    }

    const deploymentContext = buildDeploymentContext(currentPlayer, currentHeroes, enemy, battleTroops);
    const prompt = buildBattlePrompt(
      battleTroops,
      enemy,
      enemy.terrain,
      currentPlayer,
      meta.siegeContext,
      deploymentContext,
      battleStreamEnabled ? 'ndjson' : 'json'
    );

    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(prompt);
      } else {
        const textarea = document.createElement('textarea');
        textarea.value = prompt;
        textarea.style.position = 'fixed';
        textarea.style.left = '-9999px';
        textarea.style.top = '0';
        document.body.appendChild(textarea);
        textarea.focus();
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }
      addLog('已复制准备发送的战斗 prompt。');
    } catch {
      addLog('复制失败：浏览器未授权剪贴板。');
    }
  };

  const startBattle = async (isTraining: boolean = false, meta?: { mode: 'FIELD' | 'SIEGE' | 'DEFENSE_AID'; targetLocationId?: string; siegeContext?: string; supportTroops?: Troop[]; supportLabel?: string }) => {
    if (!activeEnemy) return;
    const battleInfo = meta ?? { mode: 'FIELD' as const };
    const currentPlayer = playerRef.current;
    let battleTroops = getBattleTroops(currentPlayer, heroesRef.current);

    if (battleInfo.mode === 'DEFENSE_AID' && battleInfo.targetLocationId) {
        const loc = locations.find(l => l.id === battleInfo.targetLocationId);
        const supportTroops = battleInfo.supportTroops ?? loc?.garrison ?? [];
        const taggedGarrison = supportTroops.map(t => ({ ...t, id: `garrison_${t.id}` }));
        battleTroops = [...battleTroops, ...taggedGarrison];
    }

    const battleLocationText = (() => {
      const byId = battleInfo.targetLocationId ? locations.find(l => l.id === battleInfo.targetLocationId) : null;
      const loc = byId ?? currentLocation;
      if (loc) {
        const prefix = battleInfo.mode === 'SIEGE' ? '攻城：' : battleInfo.mode === 'DEFENSE_AID' ? '守城协助：' : '';
        return `${prefix}${loc.name}（${loc.type} / ${loc.terrain}）`;
      }
      const pos = currentPlayer.position;
      const nearest = locations.reduce<{ loc: Location | null; dist: number }>((best, l) => {
        const dx = (l.coordinates?.x ?? 0) - (pos?.x ?? 0);
        const dy = (l.coordinates?.y ?? 0) - (pos?.y ?? 0);
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (!best.loc || dist < best.dist) return { loc: l, dist };
        return best;
      }, { loc: null, dist: Infinity });
      return nearest.loc ? `野外（靠近 ${nearest.loc.name}，距离约 ${nearest.dist.toFixed(1)}）` : '野外（未知位置）';
    })();
    setBattleMeta(battleInfo);
    setBattleSnapshot({ playerTroops: battleTroops.map(t => ({ ...t })), enemyTroops: activeEnemy.troops.map(t => ({ ...t })) });
    setBattleError(null);
    setIsBattling(true);
    setBattleResult(null);
    const aiConfig = buildAIConfig();
    const useAiMode = battleResolutionMode === 'AI' && !!aiConfig;
    const useStreaming = !!(useAiMode && battleStreamEnabled);
    if (!useAiMode && battleResolutionMode === 'AI') {
      addLog("未配置 AI 模型，已改用程序演算。");
    }
    setIsBattleStreaming(useStreaming);
    setIsBattleResultFinal(!useStreaming);
    if (isTraining) addLog("模拟战开始...");
    else addLog("战斗开始！生成战报中...");

    try {
      let streamedRounds: BattleRound[] = [];
      let firstRoundReady = false;
      const result = useAiMode && aiConfig
        ? await resolveBattle(
            battleTroops,
            activeEnemy,
            activeEnemy.terrain,
            currentPlayer,
            aiConfig,
            battleInfo.siegeContext,
            buildDeploymentContext(currentPlayer, heroesRef.current, activeEnemy, battleTroops),
            useStreaming ? {
              stream: true,
              onRound: (round) => {
                streamedRounds = [...streamedRounds, round];
                setBattleResult(prev => ({
                  rounds: streamedRounds,
                  outcome: prev?.outcome ?? 'A',
                  lootGold: prev?.lootGold ?? 0,
                  renownGained: prev?.renownGained ?? 0,
                  xpGained: prev?.xpGained ?? 0
                }));
                setCurrentRoundIndex(streamedRounds.length - 1);
                if (!firstRoundReady) {
                  firstRoundReady = true;
                  setView('BATTLE_RESULT');
                  setIsBattling(false);
                }
              }
            } : undefined
          )
        : resolveBattleProgrammatic(
            battleTroops,
            activeEnemy,
            activeEnemy.terrain,
            currentPlayer,
            battleInfo
          );
      const localRewards = isTraining ? { gold: 0, renown: 0, xp: 0 } : calculateLocalBattleRewards(activeEnemy, currentPlayer.level, result.outcome);
      const finalResult = {
        ...result,
        lootGold: localRewards.gold,
        renownGained: localRewards.renown,
        xpGained: localRewards.xp
      };
      setBattleResult(finalResult);
      const shouldStep = battleResolutionMode === 'PROGRAM' && (finalResult.rounds?.length ?? 0) > 1;
      setIsBattleResultFinal(!shouldStep);
      setIsBattleStreaming(false);
      if (!firstRoundReady) {
        setView('BATTLE_RESULT');
        setCurrentRoundIndex(0);
        setIsBattling(false);
      } else {
        setCurrentRoundIndex(prevIndex => Math.min(prevIndex, Math.max(0, finalResult.rounds.length - 1)));
      }
      
      if (!isTraining) {
        const prev = playerRef.current;
        
        // Loot: affected by Looting skill
        const lootMultiplier = 1 + (prev.attributes.looting * 0.1);
        const newGold = prev.gold + Math.floor(localRewards.gold * lootMultiplier);
        const newRenown = prev.renown + localRewards.renown;
        
        // Casualties & Medicine
        const totalPlayerCasualties: Record<string, number> = {};
        const newFallenRecords: FallenRecord[] = [];
        const logsToAdd: string[] = [];

        const battleHeroNames = new Set(heroesRef.current.filter(canHeroBattle).map(h => h.name));

        const totalPlayerInjuries: Record<string, { hpLoss: number; causes: string[] }> = {};

        finalResult.rounds.forEach(round => {
          const roundCasualtiesA = round.casualtiesA ?? (round as any).playerCasualties ?? [];
          roundCasualtiesA.forEach(c => {
            totalPlayerCasualties[c.name] = (totalPlayerCasualties[c.name] || 0) + c.count;
            if (c.count > 0) {
                if (battleHeroNames.has(c.name) || c.name === prev.name) return;
                newFallenRecords.push({
                    id: `fallen_${Date.now()}_${Math.random()}`,
                    unitName: c.name,
                    count: c.count,
                    day: prev.day,
                    battleName: activeEnemy.name,
                    cause: c.cause
                });
            }
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

        const playerSide = battleTroops
          .filter(t => (t?.count ?? 0) > 0)
          .slice(0, 16)
          .map(t => `${t.name}x${t.count}`)
          .join('、') || '（无）';
        const enemySide = (activeEnemy.troops ?? [])
          .filter(t => (t?.count ?? 0) > 0)
          .slice(0, 16)
          .map(t => `${t.name}x${t.count}`)
          .join('、') || '（无）';
        const keyUnitDamageSummary = (() => {
          const includedNames = new Set<string>([...Array.from(battleHeroNames), prev.name]);
          const events = (finalResult.rounds ?? []).flatMap(round => {
            const roundNumber = typeof round?.roundNumber === 'number' ? round.roundNumber : 0;
            const playerInjuries = round.keyUnitDamageA ?? (round as any).heroInjuries ?? (round as any).playerInjuries ?? [];
            const enemyInjuries = round.keyUnitDamageB ?? (round as any).enemyInjuries ?? [];
            const mapItems = (injuries: any[], sideLabel: string, filterNames?: Set<string>) => {
              if (!Array.isArray(injuries)) return [];
              return injuries.map((injury: any) => {
                const name = String(injury?.name ?? '').trim();
                const loss = Math.max(0, Math.floor(injury?.hpLoss ?? 0));
                const cause = String(injury?.cause ?? '').trim();
                return { roundNumber, name, loss, cause, sideLabel };
              }).filter(item => item.name && item.loss > 0 && (!filterNames || filterNames.has(item.name)));
            };
            return [
              ...mapItems(playerInjuries, 'A', includedNames),
              ...mapItems(enemyInjuries, 'B')
            ];
          });
          if (events.length === 0) return '（无）';
          return events
            .slice(0, 24)
            .map(e => `R${e.roundNumber || '?'} ${e.sideLabel}方 ${e.name}(HP -${e.loss})${e.cause ? `：${e.cause}` : ''}`)
            .join('；');
        })();

        setRecentBattleBriefs(prevBriefs => {
          const next: BattleBrief = {
            day: prev.day,
            battleLocation: battleLocationText,
            enemyName: activeEnemy.name,
            outcome: finalResult.outcome,
            playerSide,
            enemySide,
            keyUnitDamageSummary
          };
          return [next, ...(Array.isArray(prevBriefs) ? prevBriefs : [])].slice(0, 3);
        });

        setWorldBattleReports(prevReports => {
          const next: WorldBattleReport = {
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
          return [next, ...(Array.isArray(prevReports) ? prevReports : [])].slice(0, 12);
        });

        // Player HP Loss Logic (only from battle report injuries)
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
        if (newStatus === 'INJURED' && prev.status !== 'INJURED') logsToAdd.push("你受了重伤，无法继续参与战斗！");

        // Apply Casualties with Medicine Check
        const medicineSaveChance = prev.attributes.medicine * 0.05; // 5% per point
        
        let remainingCasualties = { ...totalPlayerCasualties };

        // 1. Deduct from Garrison if DEFENSE_AID
        if (battleInfo.mode === 'DEFENSE_AID' && battleInfo.targetLocationId) {
             const loc = locations.find(l => l.id === battleInfo.targetLocationId);
             if (loc) {
                 const garrison = loc.garrison ?? [];
                 const supportLimits = (battleInfo.supportTroops ?? garrison).reduce<Record<string, number>>((acc, troop) => {
                   acc[troop.name] = (acc[troop.name] || 0) + troop.count;
                   return acc;
                 }, {});
                 const updatedGarrison = garrison.map(t => {
                     let loss = remainingCasualties[t.name] || 0;
                     if (!supportLimits[t.name]) return t;
                     const cap = supportLimits[t.name];
                     const actualLoss = Math.min(t.count, loss, cap);
                     if (actualLoss > 0) {
                         remainingCasualties[t.name] -= actualLoss;
                         supportLimits[t.name] -= actualLoss;
                     }
                     return { ...t, count: t.count - actualLoss };
                 }).filter(t => t.count > 0);
                 
                 updateLocationState({ ...loc, garrison: updatedGarrison });
             }
        }

        const survivingTroopsMeta = prev.troops.map(t => {
          let lostCount = remainingCasualties[t.name] || 0;

          let savedCount = 0;
          for (let i = 0; i < lostCount; i++) {
            if (Math.random() < medicineSaveChance) savedCount++;
          }
          if (savedCount > 0) logsToAdd.push(`医术救回了 ${savedCount} 名 ${t.name}。`);
          lostCount -= savedCount;

          const remainingCount = Math.max(0, t.count - lostCount);
          if (remainingCount <= 0) return null;
          const isRoach = t.id.startsWith('roach_');
          const isMaxed = !t.upgradeTargetId;
          return { troop: t, remainingCount, isRoach, isMaxed };
        }).filter((item): item is { troop: Troop; remainingCount: number; isRoach: boolean; isMaxed: boolean } => item !== null);

        const updatedHeroesBase = heroesRef.current.map(hero => {
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
          return nextHero;
        });

        const eligibleTroops = survivingTroopsMeta.filter(item => !item.isRoach && !item.isMaxed);
        const eligibleHeroes = updatedHeroesBase.filter(hero => canHeroBattle(hero) && hero.currentHp > 0);
        const playerEligible = newHp > 0;
        const shareCount = eligibleTroops.length + eligibleHeroes.length + (playerEligible ? 1 : 0);
        const xpShare = shareCount > 0 ? Math.floor(localRewards.xp / shareCount) : 0;

        const survivingTroops = survivingTroopsMeta.map(({ troop, remainingCount, isRoach, isMaxed }) => {
          if (isRoach) {
            const tmpl = getTroopTemplate(troop.id);
            if (tmpl) return { ...tmpl, count: remainingCount, xp: 0, enchantments: troop.enchantments ?? [] };
            return { ...troop, count: remainingCount, xp: 0 };
          }
          if (isMaxed || xpShare <= 0) return { ...troop, count: remainingCount };
          return { ...troop, count: remainingCount, xp: (troop.xp ?? 0) + xpShare };
        }).filter(t => t.count > 0);

        const updatedHeroes = updatedHeroesBase.map(hero => {
          if (!canHeroBattle(hero)) return hero;
          if (hero.currentHp <= 0 || xpShare <= 0) return hero;
          const { xp, level, attributePoints, maxXp, logs: heroLogs } = calculateXpGain(hero.xp, hero.level, hero.attributePoints, hero.maxXp, xpShare);
          if (heroLogs.length > 0) logsToAdd.push(...heroLogs.map(log => `${hero.name}：${log}`));
          return { ...hero, xp, level, attributePoints, maxXp };
        });

        const playerXpResult = playerEligible && xpShare > 0
          ? calculateXpGain(prev.xp, prev.level, prev.attributePoints, prev.maxXp, xpShare)
          : { xp: prev.xp, level: prev.level, attributePoints: prev.attributePoints, maxXp: prev.maxXp, logs: [] as string[] };
        logsToAdd.push(...playerXpResult.logs);

        setPlayer({
          ...prev,
          gold: newGold,
          renown: newRenown,
          troops: survivingTroops,
          currentHp: newHp,
          status: newStatus as 'ACTIVE' | 'INJURED',
          fallenRecords: [...prev.fallenRecords, ...newFallenRecords],
          xp: playerXpResult.xp,
          level: playerXpResult.level,
          attributePoints: playerXpResult.attributePoints,
          maxXp: playerXpResult.maxXp
        });
        setHeroes(updatedHeroes);
        
        logsToAdd.forEach(addLog);
      }

    } catch (e: any) {
      console.error("Battle failed:", e);
      addLog("战斗演算出错: " + (e.message || "未知错误"));
      setBattleError(e.message || "未知错误");
      setIsBattling(false);
      setIsBattleStreaming(false);
      setIsBattleResultFinal(true);
    }
  };

  const handleRecruitOffer = (offer: RecruitOffer, type: 'VOLUNTEER' | 'MERCENARY', amountToRecruit?: number) => {
    if (!currentLocation) return;

    const countToRecruit = amountToRecruit || offer.count;
    const currentCount = player.troops.reduce((a, b) => a + b.count, 0);
    const max = getMaxTroops();
    const totalCost = offer.cost * countToRecruit;

    // Strict validation
    if (currentCount + countToRecruit > max) {
      addLog("队伍人数已达上限，无法招募。");
      return; 
    }

    if (player.gold < totalCost) {
       addLog("资金不足！");
       return;
    }

    const template = getTroopTemplate(offer.troopId);
    if (!template) {
      addLog("这个兵种的模板丢失了。");
      return;
    }
    
    setPlayer(prev => {
        const existingTroop = prev.troops.find(t => t.id === template.id);
        let newTroops = [...prev.troops];
        
        if (existingTroop) {
          newTroops = newTroops.map(t => t.id === template.id ? { ...t, count: t.count + countToRecruit } : t);
        } else {
          newTroops.push({ ...template, count: countToRecruit, xp: 0 });
        }

        return {
          ...prev,
          gold: prev.gold - totalCost,
          troops: newTroops
        };
    });

    // Remove recruit from pool (simplified: remove offer if fully recruited, or decrement)
    // For simplicity, we just decrement count or remove if 0
    const updatedLoc = { ...currentLocation };
    const updatePool = (pool: RecruitOffer[]) => {
        return pool.map(o => {
            if (o === offer) {
                return { ...o, count: o.count - countToRecruit };
            }
            return o;
        }).filter(o => o.count > 0);
    };

    if (type === 'VOLUNTEER') {
       updatedLoc.volunteers = updatePool(updatedLoc.volunteers);
    } else {
       updatedLoc.mercenaries = updatePool(updatedLoc.mercenaries);
    }
    
    setLocations(prev => prev.map(l => l.id === updatedLoc.id ? updatedLoc : l));
    setCurrentLocation(updatedLoc);
    addLog(`招募了 ${countToRecruit} 名 ${template.name}。`);
  };

  const handleUpgrade = (troopId: string) => {
    const prev = playerRef.current;
    
    const troopIndex = prev.troops.findIndex(t => t.id === troopId);
    if (troopIndex === -1) return;
    const troop = prev.troops[troopIndex];
    if (!troop.upgradeTargetId || troop.xp < troop.maxXp || prev.gold < troop.upgradeCost) return;
    
    const newTroops = [...prev.troops];
    newTroops[troopIndex] = { ...troop, count: troop.count - 1, xp: troop.xp - troop.maxXp };
    const targetTemplate = getTroopTemplate(troop.upgradeTargetId);
    if (!targetTemplate) return;
    const existingTargetIndex = newTroops.findIndex(t => t.id === targetTemplate.id);

    if (existingTargetIndex !== -1) {
      newTroops[existingTargetIndex].count += 1;
    } else {
      newTroops.push({ ...targetTemplate, count: 1, xp: 0 });
    }

    addLog(`一名 ${troop.name} 晋升为 ${targetTemplate.name}！`);
    setPlayer({ ...prev, gold: prev.gold - troop.upgradeCost, troops: newTroops.filter(t => t.count > 0) });
  };

  const startSiegeBattle = (location: Location) => {
    if (location.owner === 'PLAYER') {
      addLog("这里已经被你占领。");
      return;
    }
    const siegeEngines = location.siegeEngines ?? [];
    if (siegeEngines.length === 0) {
      addLog("没有准备好的攻城器械，无法发动攻城。");
      return;
    }
    const defenderTroops = ensureEnemyHeroTroops(getDefenderTroops(location), location.lord, location.id);
    if (defenderTroops.length === 0) {
      addLog("守军空虚，轻松占领！");
      const updated = { ...location, owner: 'PLAYER' as const, isUnderSiege: false, siegeEngines: [], siegeEngineQueue: [] };
      updateLocationState(updated);
      setView('MAP');
      return;
    }
    const defenseDetails = getLocationDefenseDetails(location);
    const defenseBuildings = (location.buildings ?? []).includes('DEFENSE') ? "有额外防御建筑" : "无额外防御建筑";
    const siegeContext = `攻城地点：${location.name}（${location.type}）。防御工事：${defenseDetails.wallName}（Lv.${defenseDetails.wallLevel}），设施：${defenseDetails.mechanisms.map(m => m.name).join('、') || '无'}。${defenseBuildings}。攻城器械：${siegeEngines.map(getSiegeEngineName).join('、')}。守军人数：${getGarrisonCount(defenderTroops)}。请综合攻城器械与防御设施影响战局。`;
    const enemy: EnemyForce = {
      name: `${location.name}守军`,
      description: defenseDetails.wallDesc,
      troops: defenderTroops,
      difficulty: location.type === 'CITY' ? '困难' : (location.type === 'CASTLE' || location.type === 'ROACH_NEST') ? '一般' : '简单',
      lootPotential: 1.5,
      terrain: location.terrain,
      baseTroopId: defenderTroops[0]?.id ?? 'militia'
    };
    const updatedLocation = { ...location, isUnderSiege: true };
    updateLocationState(updatedLocation);
    addLocationLog(location.id, `玩家军队开始围攻 ${location.name}。`);
    if (location.type === 'CITY' || location.type === 'CASTLE' || location.type === 'VILLAGE') {
      const relationTarget = getLocationRelationTarget(location);
      const factionPenalty = location.type === 'CITY' ? -20 : location.type === 'CASTLE' ? -16 : -12;
      const lordPenalty = location.type === 'CITY' ? -18 : location.type === 'CASTLE' ? -14 : -10;
      if (relationTarget?.type === 'FACTION') {
        updateRelation(relationTarget.type, relationTarget.id, factionPenalty, `进攻 ${location.name}`);
      }
      if (location.lord) {
        updateLordRelation(location.id, lordPenalty, `遭到玩家围攻`);
      }
    }
    setActiveEnemy(enemy);
    setPendingBattleMeta({ mode: 'SIEGE', targetLocationId: location.id, siegeContext });
    setPendingBattleIsTraining(false);
    setView('BATTLE');
  };

  const closeBattleResult = () => {
    if (battleMeta?.mode === 'SIEGE' && battleMeta.targetLocationId) {
      const target = locations.find(l => l.id === battleMeta.targetLocationId);
      if (target && battleResult) {
        if (battleResult.outcome === 'A') {
          const updated = {
            ...target,
             owner: 'PLAYER' as const,
            isUnderSiege: false,
            siegeProgress: 0,
            siegeEngines: [],
            siegeEngineQueue: [],
            sackedUntilDay: undefined,
            garrison: [] // Ensure enemy garrison is wiped out
          };
          updateLocationState(updated);
          addLog(`你攻占了 ${target.name}，解放了这座据点。`);
          addLocationLog(target.id, `围攻结束，${target.name} 被玩家攻占。`);
        } else {
          const updated = {
            ...target,
            isUnderSiege: false,
            siegeProgress: 0,
            siegeEngines: [],
            siegeEngineQueue: []
          };
          updateLocationState(updated);
          addLog(`攻城失败，${target.name} 的守军击退了你。攻城器械全部损毁。`);
          addLocationLog(target.id, `围攻被击退，${target.name} 守住城池。`);
        }
      }
      setBattleResult(null);
      setActiveEnemy(null);
      setIsBattling(false);
      setIsBattleStreaming(false);
      setIsBattleResultFinal(true);
      setBattleMeta(null);
      setBattleSnapshot(null);
      setPendingBattleMeta(null);
      setPendingBattleIsTraining(false);
      setView('MAP');
      return;
    }

    if (battleMeta?.mode === 'FIELD' && battleMeta.targetLocationId) {
      const camp = locations.find(l => l.id === battleMeta.targetLocationId && l.type === 'FIELD_CAMP');
      if (camp && battleResult) {
        if (battleResult.outcome === 'A') {
          const meta = camp.camp;
          setLocations(prev => {
            let next = prev.filter(l => l.id !== camp.id);
            if (meta) {
              next = next.map(l => {
                if (l.id !== meta.sourceLocationId) return l;
                return meta.kind === 'IMPOSTER_RAID'
                  ? { ...l, imposterRaidTargetId: undefined, imposterRaidEtaDay: undefined }
                  : {
                      ...l,
                      factionRaidTargetId: undefined,
                      factionRaidEtaDay: undefined,
                      factionRaidAttackerName: undefined,
                      factionRaidFactionId: undefined
                    };
              });
              if (meta.kind === 'IMPOSTER_RAID') {
                next = next.map(l => l.id === meta.targetLocationId ? { ...l, imposterAlertUntilDay: undefined } : l);
              }
            }
            return next;
          });
          addLog(`你摧毁了 ${camp.name}。`);
          if (meta?.targetLocationId) addLocalLog(meta.targetLocationId, `${meta.attackerName} 的行军营地被击溃。`);
        } else {
          addLog(`你未能击溃 ${camp.name}。`);
        }
      }
      setBattleResult(null);
      setActiveEnemy(null);
      setIsBattling(false);
      setIsBattleStreaming(false);
      setIsBattleResultFinal(true);
      setBattleMeta(null);
      setBattleSnapshot(null);
      setPendingBattleMeta(null);
      setPendingBattleIsTraining(false);
      setView('MAP');
      return;
    }

    if (battleMeta?.mode === 'DEFENSE_AID' && battleMeta.targetLocationId) {
      const target = locations.find(l => l.id === battleMeta.targetLocationId);
      if (target && battleResult) {
        const relationTarget = getLocationRelationTarget(target);
        const supportLabel = battleMeta.supportLabel || `${target.name}援军`;
        if (battleResult.outcome === 'A') {
           const storedMeta = defenseAidMetaRef.current?.locationId === target.id ? defenseAidMetaRef.current : null;
           const relationDelta = storedMeta?.delta ?? (activeEnemy ? getDefenseAidRelationDelta(target, activeEnemy) : 3);
           const ratioValue = storedMeta?.ratio ?? (() => {
             if (!activeEnemy) return null;
             const defenderPower = Math.max(1, calculatePower(getDefenderTroops(target)));
             const attackerPower = Math.max(1, calculatePower(activeEnemy.troops));
             return defenderPower / attackerPower;
           })();
           if (relationTarget) {
             const ratioText = ratioValue !== null ? `（战力比 ${ratioValue.toFixed(2)}）` : '';
             updateRelation(relationTarget.type, relationTarget.id, relationDelta, `协助 ${target.name} 守城${ratioText}`);
           }
           if (target.lord) {
             updateLordRelation(target.id, relationDelta, `协助 ${target.name} 守城`);
           }
           const updated = target.activeSiege ? { ...target, activeSiege: undefined, isUnderSiege: false } : target;
           if (updated !== target) updateLocationState(updated);
           if (target.activeSiege) {
             addLog(`你协助 ${target.name} 的守军击溃了伪人！围攻解除了。`);
             addLocationLog(target.id, `围攻解除，伪人军团被击溃。`);
           } else {
             addLog(`你与 ${supportLabel} 击退了 ${activeEnemy?.name ?? '敌军'}。`);
             addLocationLog(target.id, `守军援助成功，击退了来犯之敌。`);
           }
           defenseAidMetaRef.current = null;
        } else {
           if (target.activeSiege) {
             addLog(`战斗失利，${target.name} 的围攻仍在继续。`);
             addLocationLog(target.id, `围攻仍在继续，防线吃紧。`);
           } else {
             addLog(`战斗失利，${supportLabel} 未能挡住敌军。`);
             addLocationLog(target.id, `援军被击退，战况不利。`);
           }
        }
      }
      defenseAidMetaRef.current = null;
      setBattleResult(null);
      setActiveEnemy(null);
      setIsBattling(false);
      setIsBattleStreaming(false);
      setIsBattleResultFinal(true);
      setBattleMeta(null);
      setBattleSnapshot(null);
      setPendingBattleMeta(null);
      setPendingBattleIsTraining(false);
      setView('TOWN');
      return;
    }

    // Check if we just defeated a Bandit Camp
    if (activeEnemy && currentLocation && currentLocation.type === 'BANDIT_CAMP' && battleResult?.outcome === 'A') {
        setLocations(prev => prev.filter(l => l.id !== currentLocation.id));
        addLog("你成功捣毁了劫匪窝点！这地方以后安全了。");
        // Extra loot logic could go here, but AI handles loot gold.
    }

    setBattleResult(null);
    setActiveEnemy(null);
    setIsBattling(false);
    setIsBattleStreaming(false);
    setIsBattleResultFinal(true);
    setBattleMeta(null);
    setBattleSnapshot(null);
    setPendingBattleMeta(null);
    setPendingBattleIsTraining(false);
    
    const troopCount = player.troops.reduce((acc, t) => acc + t.count, 0);
    if (troopCount <= 0) {
      setView('GAME_OVER');
    } else if (currentLocation?.type === 'TRAINING_GROUNDS') {
      setView('TRAINING');
    } else if (currentLocation?.type === 'ASYLUM') {
      setView('ASYLUM');
    } else if (currentLocation?.type === 'MARKET') {
        setView('MARKET');
    } else {
      setView('MAP');
    }
  };

  // --- Bandit Camp Logic ---
  const handleBanditAction = (action: 'ATTACK' | 'SNEAK') => {
      if (action === 'ATTACK') {
          const banditTroops = buildBanditTroops();
          
          const enemy: EnemyForce = {
              name: '劫匪大本营',
              description: '聚集了大量亡命之徒。',
              troops: banditTroops,
              difficulty: '一般',
              lootPotential: 3.0, // High reward
              terrain: 'BANDIT_CAMP',
              baseTroopId: 'peasant'
          };
          setActiveEnemy(enemy);
          setPendingBattleMeta({ mode: 'FIELD' });
          setPendingBattleIsTraining(false);
          setView('BATTLE');
      } else {
          // Sneak
          if (Math.random() > 0.7) { // 30% fail
              addLog("潜行失败！哨兵发现了你的踪迹！");
              handleBanditAction('ATTACK');
          } else {
              addLog("你带着部队悄悄溜走了，没有惊动任何人。");
              setView('MAP');
          }
      }
  };

  // --- Asylum Logic ---
  const handleAsylumGacha = () => {
    const COST = 250;
    if (player.gold < COST) {
      addLog("你的钱不够！院长不喜欢穷鬼。");
      return;
    }
    const currentCount = player.troops.reduce((a, b) => a + b.count, 0);
    if (currentCount >= getMaxTroops()) {
      addLog("床位满了（队伍已达上限）。");
      return;
    }

    const roll = Math.random() * 100;
    let targetTier = TroopTier.TIER_1;
    if (roll > 99) targetTier = TroopTier.TIER_5;
    else if (roll > 95) targetTier = TroopTier.TIER_4;
    else if (roll > 85) targetTier = TroopTier.TIER_3;
    else if (roll > 60) targetTier = TroopTier.TIER_2;

    const asylumTroops = Object.values(TROOP_TEMPLATES).filter(t => {
      const asylumIds = [
        // Tier 1
        'mad_patient', 'finger_thrower', 'headbanger', 'delusional_king',
        // Tier 2
        'screaming_drummer', 'torch_man', 'stitch_crossbow', 'electroshock_survivor', 'paranoid_guard',
        // Tier 3
        'wolf_rider', 'headless_arbiter', 'drug_tester', 'dung_beetle_knight', 
        'alchemist', 'hypnotist_imposter', 'split_personality_swordsman',
        // Tier 4
        'war_bear', 'multi_armed_reaver', 'cthulhu_shadow', 'sleepwalking_fencer', 
        'plague_doctor', 'tesla_walker', 'nightmare_weaver', 'automaton', 'imaginary_friend_summoner',
        // Tier 5
        'behemoth', 'biomutant', 'doomsayer', 'asylum_director', 'god_complex_patient', 'ai_overlord'
      ];
      return asylumIds.includes(t.id) && t.tier === targetTier;
    });

    if (asylumTroops.length === 0) {
      addLog("箱子是空的？（Bug: No troops found for tier）");
      return;
    }

    const wonTroopTemplate = asylumTroops[Math.floor(Math.random() * asylumTroops.length)];

    setPlayer(prev => {
        const existingTroop = prev.troops.find(t => t.id === wonTroopTemplate.id);
        let newTroops = [...prev.troops];
        
        if (existingTroop) {
          newTroops = newTroops.map(t => t.id === wonTroopTemplate.id ? { ...t, count: t.count + 1 } : t);
        } else {
          newTroops.push({ ...wonTroopTemplate, count: 1, xp: 0 });
        }

        return {
          ...prev,
          gold: prev.gold - COST,
          troops: newTroops
        };
    });

    setGachaResult(createTroop(wonTroopTemplate.id));
    addLog(`你抽中了：${wonTroopTemplate.name}！`);
  };

  const handleBuyParrot = (parrotTemplate: ParrotVariant) => {
     const prev = playerRef.current;

     if (prev.parrots.some(p => p.type === parrotTemplate.type)) {
        addLog(`你已经有一只 ${parrotTemplate.name} 了。它看着你，仿佛在嘲笑你的重复消费。`);
        return;
     }
     if (prev.gold < parrotTemplate.price) {
        addLog("资金不足！这鸟儿可不便宜。");
        return;
     }
     const nextMischiefDay = prev.day + randomInt(2, 4);
     addLog(`你购买了 ${parrotTemplate.name}！它立刻开始在你的肩膀上拉屎。`);
     
     setPlayer({
       ...prev,
       gold: prev.gold - parrotTemplate.price,
       parrots: [...prev.parrots, { ...parrotTemplate, id: `parrot_${Date.now()}`, daysWithYou: 0, tauntCount: 0, goldLost: 0, nextMischiefDay }]
     });
  };

  const sendToShaper = async () => {
    if (!currentLocation || currentLocation.type !== 'MYSTERIOUS_CAVE') return;
    const text = shaperInput.trim();
    if (!text) return;

    const nextDialogue = [...shaperDialogue, { role: 'PLAYER' as const, text }];
    setShaperDialogue(nextDialogue);
    setShaperInput('');
    setIsShaperLoading(true);

    try {
      const aiConfig = buildAIConfig();
      const proposal = await proposeShapedTroop(nextDialogue, player, aiConfig, shaperProposal ? {
        lastProposal: {
          decision: shaperProposal.decision,
          npcReply: shaperProposal.npcReply,
          price: shaperProposal.price,
          troop: shaperProposal.troopForPrompt
        }
      } : undefined);
      setShaperDialogue(prev => [...prev, { role: 'NPC', text: proposal.npcReply }]);

      const clampInt = (v: unknown, min: number, max: number) => {
        const n = typeof v === 'number' ? v : Number(v);
        if (!Number.isFinite(n)) return min;
        return Math.min(max, Math.max(min, Math.round(n)));
      };
      const buildShaperAttributes = (tier: TroopTier) => {
        if (tier === TroopTier.TIER_1) return { attack: 3, defense: 2, agility: 3, hp: 3, range: 2, morale: 4 };
        if (tier === TroopTier.TIER_2) return { attack: 4, defense: 3, agility: 4, hp: 4, range: 3, morale: 5 };
        if (tier === TroopTier.TIER_3) return { attack: 6, defense: 4, agility: 5, hp: 5, range: 3, morale: 6 };
        if (tier === TroopTier.TIER_4) return { attack: 7, defense: 5, agility: 6, hp: 6, range: 4, morale: 7 };
        return { attack: 9, defense: 7, agility: 6, hp: 8, range: 5, morale: 9 };
      };

      const troop = proposal.troop;
      const troopTemplate = troop ? (() => {
        const id = `shaped_${Date.now()}`;
        const tier = clampInt((troop as any).tier, 1, 5) as TroopTier;
        const basePower = clampInt((troop as any).basePower, 1, 9999);
        const maxXp = clampInt((troop as any).maxXp, 10, 2000);
        const upgradeCost = clampInt((troop as any).upgradeCost, 0, 1000000);
        const name = String((troop as any).name || '裁缝的造物').slice(0, 40);
        const description = String((troop as any).description || '沉默的造物。').slice(0, 500);
        const equipmentRaw = Array.isArray((troop as any).equipment) ? (troop as any).equipment : [];
        const equipment = equipmentRaw.map((x: any) => String(x)).filter(Boolean).slice(0, 5);
        const upgradeTargetId = String((troop as any).upgradeTargetId || '').trim();
        return {
          id,
          name,
          tier,
          basePower,
          cost: Math.max(0, clampInt(proposal.price, 0, 1000000)),
          upgradeCost,
          maxXp,
          upgradeTargetId: upgradeTargetId ? upgradeTargetId : undefined,
          description,
          equipment: equipment.length > 0 ? equipment : ['破剪刀'],
          attributes: buildShaperAttributes(tier)
        } as Omit<Troop, 'count' | 'xp'>;
      })() : undefined;

      setShaperProposal({
        decision: proposal.decision,
        npcReply: proposal.npcReply,
        price: Math.max(0, proposal.price),
        troopTemplate,
        troopForPrompt: troop ? {
          name: troopTemplate?.name ?? String((troop as any).name || '裁缝的造物').slice(0, 40),
          tier: troopTemplate?.tier ?? (clampInt((troop as any).tier, 1, 5) as any),
          basePower: troopTemplate?.basePower ?? clampInt((troop as any).basePower, 1, 9999),
          maxXp: troopTemplate?.maxXp ?? clampInt((troop as any).maxXp, 10, 2000),
          upgradeCost: troopTemplate?.upgradeCost ?? clampInt((troop as any).upgradeCost, 0, 1000000),
          upgradeTargetId: troopTemplate?.upgradeTargetId,
          description: troopTemplate?.description ?? String((troop as any).description || '沉默的造物。').slice(0, 500),
          equipment: troopTemplate?.equipment ?? (Array.isArray((troop as any).equipment) ? (troop as any).equipment : []).map((x: any) => String(x)).filter(Boolean).slice(0, 5),
          attributes: troopTemplate?.attributes ?? buildShaperAttributes((clampInt((troop as any).tier, 1, 5) as TroopTier))
        } : undefined
      });
    } finally {
      setIsShaperLoading(false);
    }
  };

  const applyAltarProposal = () => {
    if (!currentLocation || currentLocation.type !== 'ALTAR') return;
    const proposal = altarProposals[currentLocation.id];
    if (!proposal) {
      addLog('还没有可应用的兵种草案。');
      return;
    }

    const hasTree = (currentLocation.altar?.troopIds ?? []).length > 0;
    const rebuildCost = 300;
    if (hasTree && player.gold < rebuildCost) {
      addLog('资金不足，无法重构教义。');
      return;
    }

    const { doctrine, result } = proposal;
    const clampInt = (v: unknown, min: number, max: number) => {
      const n = typeof v === 'number' ? v : Number(v);
      if (!Number.isFinite(n)) return min;
      return Math.min(max, Math.max(min, Math.round(n)));
    };
    const fallbackAttributes = (tier: number) => {
      if (tier === 1) return { attack: 3, defense: 2, agility: 3, hp: 3, range: 2, morale: 4 };
      if (tier === 2) return { attack: 5, defense: 4, agility: 4, hp: 4, range: 3, morale: 5 };
      if (tier === 3) return { attack: 7, defense: 6, agility: 5, hp: 6, range: 4, morale: 6 };
      if (tier === 4) return { attack: 10, defense: 8, agility: 6, hp: 8, range: 5, morale: 7 };
      return { attack: 13, defense: 10, agility: 7, hp: 10, range: 6, morale: 9 };
    };

    const tierCaps: Record<number, number> = { 1: 6, 2: 4, 3: 3, 4: 2, 5: 1 };
    const clampTroopsByTier = (list: AltarTroopDraft[]) => {
      const counts: Record<number, number> = {};
      const output: AltarTroopDraft[] = [];
      list.forEach(item => {
        const tier = typeof item?.tier === 'number' ? item.tier : 1;
        const cap = tierCaps[tier] ?? 0;
        const nextCount = (counts[tier] ?? 0) + 1;
        if (cap > 0 && nextCount <= cap) {
          counts[tier] = nextCount;
          output.push(item);
        }
      });
      return output;
    };
    const sortedTroops = clampTroopsByTier((result.troops ?? [])
      .map(t => ({ ...t, tier: clampInt(t.tier, 1, 5) }))
      .sort((a, b) => a.tier - b.tier));
    const baseId = `altar_${currentLocation.id}_${Date.now()}`;
    const costByTier = [0, 20, 60, 140, 300, 600];
    const tierCounts: Record<number, number> = {};
    const doctrineSuffix = `隶属于${doctrine.domain}教义`;
    const appendDoctrineSuffix = (value: string) => {
      const trimmed = value.trim();
      if (!trimmed) return doctrineSuffix;
      if (trimmed.includes(doctrineSuffix)) return trimmed;
      const tail = trimmed.endsWith('。') ? trimmed : `${trimmed}。`;
      return `${tail}${doctrineSuffix}`;
    };
    const templates = sortedTroops.map(troop => {
      const tier = clampInt(troop.tier, 1, 5);
      const nextCount = (tierCounts[tier] ?? 0) + 1;
      tierCounts[tier] = nextCount;
      const id = `${baseId}_t${tier}_${nextCount}`;
      const attrs = troop.attributes ?? fallbackAttributes(tier);
      return {
        id,
        name: String(troop.name || `神坛教徒${tier}`).slice(0, 40),
        tier: tier as TroopTier,
        basePower: clampInt(troop.basePower, 1, 9999),
        cost: costByTier[tier] ?? 10 * tier,
        upgradeCost: clampInt(troop.upgradeCost, 0, 1000000),
        maxXp: clampInt(troop.maxXp, 10, 2000),
        upgradeTargetId: undefined as string | undefined,
        description: appendDoctrineSuffix(String(troop.description || `教义：${doctrine.domain}。`)).slice(0, 500),
        equipment: (() => {
          const list = (troop.equipment ?? []).map(item => String(item)).filter(Boolean).slice(0, 5);
          return list.length > 0 ? list : ['布袍'];
        })(),
        attributes: {
          attack: clampInt(attrs.attack, 1, 300),
          defense: clampInt(attrs.defense, 1, 300),
          agility: clampInt(attrs.agility, 1, 300),
          hp: clampInt(attrs.hp, 1, 300),
          range: clampInt(attrs.range, 1, 300),
          morale: clampInt(attrs.morale, 1, 300)
        },
        doctrine: doctrine.domain,
        evangelist: true
      } as Omit<Troop, 'count' | 'xp'>;
    });

    const troopIds = templates.map(t => t.id);
    templates.forEach((template, index) => {
      let nextTarget: string | undefined;
      for (let i = index + 1; i < templates.length; i += 1) {
        if (templates[i].tier > template.tier) {
          nextTarget = templates[i].id;
          break;
        }
      }
      template.upgradeTargetId = nextTarget;
    });

    setCustomTroopTemplates(prev => ({
      ...prev,
      ...templates.reduce((acc, template) => {
        acc[template.id] = template;
        return acc;
      }, {} as Record<string, Omit<Troop, 'count' | 'xp'>>)
    }));

    if (hasTree) {
      setPlayer(prev => ({ ...prev, gold: prev.gold - rebuildCost }));
    }

    const nextAltar = {
      doctrine,
      troopIds,
      createdDay: currentLocation.altar?.createdDay ?? player.day,
      lastRebuildDay: hasTree ? player.day : undefined
    };
    const updatedLocation: Location = { ...currentLocation, altar: nextAltar };
    updateLocationState(updatedLocation);
    setAltarProposals(prev => {
      const next = { ...prev };
      delete next[currentLocation.id];
      return next;
    });
    addLog(hasTree ? '教义已重构，神秘人满意地点头。' : '教义已确立，神秘人献上兵种树。');
  };

  const craftShapedTroop = () => {
    if (!currentLocation || currentLocation.type !== 'MYSTERIOUS_CAVE') return;
    if (!shaperProposal || shaperProposal.decision !== 'OK' || !shaperProposal.troopTemplate) return;
    if (player.gold < shaperProposal.price) {
      addLog("钱不够。歪嘴裁缝已经开始磨剪刀了。");
      return;
    }

    const template = shaperProposal.troopTemplate;

    setPlayer(prev => ({ ...prev, gold: prev.gold - shaperProposal.price }));
    setCustomTroopTemplates(prev => ({ ...prev, [template.id]: template }));

    const updatedLoc: Location = {
      ...currentLocation,
      volunteers: [{ troopId: template.id, count: 1, cost: 0 }, ...currentLocation.volunteers]
    };
    setLocations(prev => prev.map(l => l.id === updatedLoc.id ? updatedLoc : l));
    setCurrentLocation(updatedLoc);
    setShaperDialogue(prev => [...prev, { role: 'NPC', text: `缝好了。去招募吧，别把血滴在我的线轴上。` }]);
    addLog(`在神秘洞窟塑形出了：${template.name}。`);
    setShaperProposal(null);
  };

  const saveOpenAISettings = () => {
    const normalizedProfiles = openAIProfiles.length > 0 ? openAIProfiles : [{
      id: activeOpenAIProfileId ?? `profile_${Date.now()}`,
      name: openAIProfileName || '默认',
      baseUrl: openAIBaseUrl,
      key: openAIKey,
      model: openAIModel
    }];
    const activeId = activeOpenAIProfileId ?? normalizedProfiles[0].id;
    const updatedProfiles = normalizedProfiles.map(p => {
      if (p.id !== activeId) return p;
      return {
        ...p,
        name: openAIProfileName || p.name,
        baseUrl: openAIBaseUrl,
        key: openAIKey,
        model: openAIModel
      };
    });
    setOpenAIProfiles(updatedProfiles);
    setActiveOpenAIProfileId(activeId);
    localStorage.setItem('openai.profiles', JSON.stringify(updatedProfiles));
    localStorage.setItem('openai.profile.active', activeId);
    localStorage.setItem('openai.baseUrl', openAIBaseUrl.trim());
    localStorage.setItem('openai.key', openAIKey.trim());
    localStorage.setItem('openai.model', openAIModel.trim());
    localStorage.setItem('ai.provider', aiProvider);
    localStorage.setItem('doubao.key', doubaoApiKey.trim());
    localStorage.setItem('gemini.key', geminiApiKey.trim());
    localStorage.setItem('battle.stream', battleStreamEnabled ? '1' : '0');
    localStorage.setItem('battle.mode', battleResolutionMode);
  };

  const selectOpenAIProfile = (profileId: string) => {
    const profile = openAIProfiles.find(p => p.id === profileId);
    if (!profile) return;
    setActiveOpenAIProfileId(profile.id);
    setOpenAIProfileName(profile.name);
    setOpenAIBaseUrl(profile.baseUrl);
    setOpenAIKey(profile.key);
    setOpenAIModel(profile.model);
    setOpenAIModels([]);
    localStorage.setItem('openai.profile.active', profile.id);
    localStorage.setItem('openai.baseUrl', profile.baseUrl.trim());
    localStorage.setItem('openai.key', profile.key.trim());
    localStorage.setItem('openai.model', profile.model.trim());
  };

  const addOpenAIProfile = () => {
    const name = `新配置 ${openAIProfiles.length + 1}`;
    const newProfile = {
      id: `profile_${Date.now()}`,
      name,
      baseUrl: 'https://api.openai.com',
      key: '',
      model: ''
    };
    const updated = [...openAIProfiles, newProfile];
    setOpenAIProfiles(updated);
    setActiveOpenAIProfileId(newProfile.id);
    setOpenAIProfileName(newProfile.name);
    setOpenAIBaseUrl(newProfile.baseUrl);
    setOpenAIKey('');
    setOpenAIModel('');
    setOpenAIModels([]);
    localStorage.setItem('openai.profiles', JSON.stringify(updated));
    localStorage.setItem('openai.profile.active', newProfile.id);
    localStorage.setItem('openai.baseUrl', newProfile.baseUrl);
    localStorage.setItem('openai.key', '');
    localStorage.setItem('openai.model', '');
  };

  const buildSaveData = () => ({
    version: 1,
    savedAt: Date.now(),
    player,
    heroes,
    lords,
    locations,
    logs,
    recentBattleBriefs,
    worldBattleReports,
    worldDiplomacy,
    view,
    currentLocationId: currentLocation?.id ?? null,
    townTab,
    workDays,
    trainingMyArmy,
    trainingEnemyArmy,
    trainInputMy,
    trainInputEnemy,
    customTroopTemplates,
    shaperDialogue,
    shaperInput,
    shaperProposal,
    altarDialogues,
    altarDrafts,
    altarProposals,
    altarRecruitDays,
    altarRecruitState,
    battleStreamEnabled,
    battleResolutionMode,
    openAIProfiles,
    openAIActiveProfileId: activeOpenAIProfileId,
    aiProvider,
    doubaoApiKey,
    geminiApiKey,
    openAI: {
      baseUrl: openAIBaseUrl,
      key: openAIKey,
      model: openAIModel
    }
  });

  const exportSaveData = () => {
    try {
      const payload = buildSaveData();
      const json = JSON.stringify(payload, null, 2);
      setSaveDataText(json);
      setSaveDataNotice('存档已生成，已填入文本框。');
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `calradia-save-day-${player.day}.json`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
    } catch (e: any) {
      setSaveDataNotice(e?.message || '导出失败。');
    }
  };

  const buildWorldBoardMarkdown = () => {
    const nowText = new Date().toLocaleString('zh-CN', { hour12: false });
    const outcomeLabel = (outcome: BattleResult['outcome']) => outcome === 'A' ? '胜利' : '战败';
    const logLines = (logs ?? []).map(item => `- ${item}`).join('\n') || '（无）';
    const pct = (value: number) => `${Math.round(value * 100)}%`;
    const factionPairs = FACTIONS.flatMap((a, idx) => {
      return FACTIONS.slice(idx + 1).map(b => {
        const value = Math.max(-100, Math.min(100, Math.round(Number((worldDiplomacy.factionRelations as any)?.[a.id]?.[b.id] ?? 0))));
        return `- ${a.name} ↔ ${b.name}：${value}`;
      });
    }).join('\n') || '（无）';
    const factionRaceLines = FACTIONS.map(faction => {
      const row = (worldDiplomacy.factionRaceRelations as any)?.[faction.id] ?? {};
      const imposter = Math.max(-100, Math.min(100, Math.round(Number(row.IMPOSTER ?? 0))));
      const roach = Math.max(-100, Math.min(100, Math.round(Number(row.ROACH ?? 0))));
      const undead = Math.max(-100, Math.min(100, Math.round(Number(row.UNDEAD ?? 0))));
      return `- ${faction.name}：伪人${imposter}，蟑螂${roach}，亡灵${undead}`;
    }).join('\n') || '（无）';
    const diplomacyEvents = (worldDiplomacy.events ?? []).slice(0, 24).map(e => `- 第${e.day}天：${e.text}（${e.delta >= 0 ? `+${e.delta}` : e.delta}）`).join('\n') || '（无）';
    const reportBlocks = (worldBattleReports ?? []).map((report, index) => {
      const roundLines = (report.rounds ?? []).map(round => {
        const roundCasualtiesA = round.casualtiesA ?? (round as any).playerCasualties ?? [];
        const roundCasualtiesB = round.casualtiesB ?? (round as any).enemyCasualties ?? [];
        const playerLoss = roundCasualtiesA.length > 0
          ? roundCasualtiesA.map(c => `${c.count}x${c.name}${c.cause ? `(${c.cause})` : ''}`).join('，')
          : '无';
        const playerKeyLoss = round.keyUnitDamageA ?? (round as any).heroInjuries ?? [];
        const enemyKeyLossList = round.keyUnitDamageB ?? (round as any).enemyInjuries ?? [];
        const heroLoss = playerKeyLoss.length > 0
          ? playerKeyLoss.map(c => `${c.name} HP-${c.hpLoss}${c.cause ? `(${c.cause})` : ''}`).join('，')
          : '无';
        const enemyKeyLoss = enemyKeyLossList.length > 0
          ? enemyKeyLossList.map(c => `${c.name} HP-${c.hpLoss}${c.cause ? `(${c.cause})` : ''}`).join('，')
          : '无';
        const enemyLoss = roundCasualtiesB.length > 0
          ? roundCasualtiesB.map(c => `${c.count}x${c.name}${c.cause ? `(${c.cause})` : ''}`).join('，')
          : '无';
        return [
          `#### 回合 ${round.roundNumber}`,
          round.description ? `- 描述：${round.description}` : '- 描述：',
          `- 我方伤亡：${playerLoss}`,
          `- 我方关键单位受伤：${heroLoss}`,
          `- 敌方关键单位受伤：${enemyKeyLoss}`,
          `- 敌方伤亡：${enemyLoss}`
        ].join('\n');
      }).join('\n\n') || '（无回合记录）';
      return [
        `### 战斗 ${worldBattleReports.length - index}`,
        `- 日期：第 ${report.day} 天`,
        `- 记录时间：${report.createdAt || nowText}`,
        `- 地点：${report.battleLocation}`,
        `- 敌军：${report.enemyName}`,
        `- 结果：${outcomeLabel(report.outcome)}`,
        `- 我方：${report.playerSide || '（无）'}`,
        `- 敌方：${report.enemySide || '（无）'}`,
        `- 伤情：${report.keyUnitDamageSummary || '（无）'}`,
        '',
        roundLines
      ].join('\n');
    }).join('\n\n') || '（无）';
    const siegeLines = siegeEngineOptions.map(option => {
      const stats = siegeEngineCombatStats[option.type];
      return `- ${option.name}(${option.type})：成本${option.cost}，工期${option.days}天，耐久${stats.hp}，破墙${stats.wallDamage}，远程命中+${pct(stats.attackerRangedHit)}，远程伤害+${pct(stats.attackerRangedDamage)}，近战命中+${pct(stats.attackerMeleeHit)}，近战伤害+${pct(stats.attackerMeleeDamage)}，守方远程命中-${pct(stats.defenderRangedHitPenalty)}，守方远程伤害-${pct(stats.defenderRangedDamagePenalty)}。${option.description}`;
    }).join('\n') || '（无）';
    const defenseLines = Array.from(new Map(locations.map(loc => [loc.type, loc])).values())
      .map(loc => {
        const defense = getLocationDefenseDetails(loc);
        if (defense.wallLevel <= 0 && defense.mechanisms.length === 0) return null;
        const mechanisms = defense.mechanisms.map(m => m.name).join('、') || '无';
        return `- ${loc.name}(${loc.type})：${defense.wallName}(Lv.${defense.wallLevel})，城墙耐久${defense.wallHp}，器械耐久${defense.mechanismHp}，远程命中+${pct(defense.rangedHitBonus)}，远程伤害+${pct(defense.rangedDamageBonus)}，近战减伤${pct(defense.meleeDamageReduction)}，器械：${mechanisms}`;
      })
      .filter(Boolean)
      .join('\n') || '（无）';

    return [
      '# 世界公告栏',
      `导出时间：${nowText}`,
      '',
      '## 事件日志',
      logLines,
      '',
      '## 外交与关系',
      '',
      '### 势力关系（两两）',
      factionPairs,
      '',
      '### 势力对物种态度',
      factionRaceLines,
      '',
      '### 近期外交事件',
      diplomacyEvents,
      '',
      '## 战斗详情',
      reportBlocks,
      '',
      '## 攻城/守城设施档案',
      '',
      '### 攻城设施',
      siegeLines,
      '',
      '### 守城设施',
      defenseLines
    ].join('\n');
  };

  const exportWorldBoardMarkdown = () => {
    try {
      const markdown = buildWorldBoardMarkdown();
      const blob = new Blob([markdown], { type: 'text/markdown' });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `world-board-day-${player.day}.md`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
    } catch (e: any) {
      addLog(e?.message || '导出失败。');
    }
  };

  const normalizeView = (raw: unknown, hasLocation: boolean): GameView => {
    const value = typeof raw === 'string' ? raw : 'MAP';
    const safe = value as GameView;
    const allowed: GameView[] = ['MAP', 'TOWN', 'PARTY', 'CHARACTER', 'TRAINING', 'ASYLUM', 'MARKET', 'CAVE', 'GAME_OVER', 'HERO_CHAT', 'WORLD_BOARD', 'TROOP_ARCHIVE'];
    if (!allowed.includes(safe)) return 'MAP';
    if (safe === 'TOWN' && !hasLocation) return 'MAP';
    return safe;
  };

  const normalizeHero = (hero: Hero): Hero => {
    const fallback = INITIAL_HERO_ROSTER.find(h => h.id === hero.id);
    const base = fallback ? { ...fallback } : hero;
    const personalityRaw = typeof hero.personality === 'string' ? hero.personality : '';
    const chatRaw = Array.isArray(hero.chatMemory) ? hero.chatMemory : base.chatMemory;
    const memoryRaw = Array.isArray(hero.permanentMemory) ? hero.permanentMemory : base.permanentMemory;
    const expressionRaw = typeof hero.currentExpression === 'string' ? hero.currentExpression : base.currentExpression;

    const hashSeed = (value: string) => {
      let hash = 2166136261;
      for (let i = 0; i < value.length; i += 1) {
        hash ^= value.charCodeAt(i);
        hash = Math.imul(hash, 16777619);
      }
      return hash >>> 0;
    };

    const pickBySeed = <T,>(items: T[], seed: number, offset: number) => {
      if (!items || items.length === 0) return null;
      const index = (seed + offset) % items.length;
      return items[index] ?? null;
    };

    const uniquePicks = (pool: string[], seed: number, count: number) => {
      const safePool = Array.isArray(pool) ? pool.filter(Boolean) : [];
      const picked: string[] = [];
      const max = Math.min(count, safePool.length);
      for (let i = 0; i < safePool.length && picked.length < max; i += 1) {
        const candidate = safePool[(seed + i * 7) % safePool.length];
        if (candidate && !picked.includes(candidate)) picked.push(candidate);
      }
      return picked;
    };

    const buildHeroProfile = () => {
      const seed = hashSeed(String(hero.id ?? base.id ?? 'hero'));
      const birthplacePool = LOCATIONS.filter(l => l.type === 'CITY' || l.type === 'VILLAGE' || l.type === 'CASTLE');
      const birthplace = pickBySeed(birthplacePool, seed, 3) ?? birthplacePool[0];
      const ageBase = base.role === 'BARD' ? 26 : base.role === 'SHIELD' ? 24 : base.role === 'SWORDSMAN' ? 22 : 20;
      const age = Math.max(16, Math.min(55, ageBase + (seed % 18)));
      const likePool = [
        '热汤与篝火',
        '干净的武器',
        '靠谱的补给',
        '直来直去的实话',
        '夜行与星空',
        '战术配合',
        '记录与地图',
        '安静的清晨',
        '小额赌局',
        '会做饭的人'
      ];
      const dislikePool = [
        '空话与鸡汤',
        '拖延与瞎指挥',
        '靴子里的沙子',
        '没擦干的血',
        '无意义的炫耀',
        '吵闹',
        '临阵逃跑',
        '浪费粮草',
        '被鹦鹉学舌',
        '潮湿的斗篷'
      ];
      const likes = uniquePicks(likePool, seed, 3);
      const dislikes = uniquePicks(dislikePool, seed ^ 0x9e3779b9, 3);
      const birthplaceId = String(birthplace?.id ?? '');
      const birthplaceName = String(birthplace?.name ?? '（未知）');
      return { age, birthplaceId, birthplaceName, likes, dislikes };
    };

    const mergedProfile = (() => {
      const existing = (hero as any)?.profile;
      const baseProfile = buildHeroProfile();
      const age = typeof existing?.age === 'number' && Number.isFinite(existing.age) ? Math.floor(existing.age) : baseProfile.age;
      const birthplaceId = String(existing?.birthplaceId ?? baseProfile.birthplaceId);
      const birthplaceName = String(existing?.birthplaceName ?? baseProfile.birthplaceName);
      const likes = Array.isArray(existing?.likes) ? existing.likes.map((x: any) => String(x)).filter(Boolean).slice(0, 6) : baseProfile.likes;
      const dislikes = Array.isArray(existing?.dislikes) ? existing.dislikes.map((x: any) => String(x)).filter(Boolean).slice(0, 6) : baseProfile.dislikes;
      return { age, birthplaceId, birthplaceName, likes, dislikes };
    })();

    const mergedJoinedDay = (() => {
      const existing = (hero as any)?.joinedDay;
      if (typeof existing === 'number' && Number.isFinite(existing) && existing >= 0) return Math.floor(existing);
      const recruited = !!(hero as any)?.recruited;
      if (!recruited) return undefined;
      const chatDays = (Array.isArray(chatRaw) ? chatRaw : []).map((l: any) => l?.day).filter((d: any) => typeof d === 'number' && Number.isFinite(d) && d >= 0) as number[];
      const memDays = (Array.isArray(memoryRaw) ? memoryRaw : []).map((m: any) => m?.createdDay).filter((d: any) => typeof d === 'number' && Number.isFinite(d) && d >= 0) as number[];
      const inferred = Math.min(...chatDays, ...memDays);
      if (Number.isFinite(inferred)) return inferred;
      return undefined;
    })();

    const mergedAffinity = (() => {
      const allowed = ['陌生', '熟悉', '友好', '亲近', '信赖', '生死之交'] as const;
      const raw = String((hero as any)?.affinity ?? '').trim();
      if (raw && allowed.includes(raw as any)) return raw as any;
      if (!!(hero as any)?.recruited) return '陌生' as any;
      return undefined;
    })();
    const mergedRace = (() => {
      const allowed = ['HUMAN', 'ROACH', 'UNDEAD', 'IMPOSTER', 'BANDIT', 'AUTOMATON', 'VOID', 'MADNESS'] as const;
      const raw = String((hero as any)?.race ?? (base as any)?.race ?? '').trim();
      if (raw && allowed.includes(raw as any)) return raw as any;
      return 'HUMAN';
    })();

    return {
      ...base,
      ...hero,
      race: mergedRace,
      personality: personalityRaw.trim() ? personalityRaw : (base.personality || '沉稳可靠'),
      profile: mergedProfile,
      joinedDay: mergedJoinedDay,
      affinity: mergedAffinity,
      currentExpression: normalizeHeroEmotion(expressionRaw),
      chatMemory: normalizeHeroChat(chatRaw ?? [], player.day),
      permanentMemory: normalizeHeroMemory(memoryRaw ?? []),
      chatRounds: typeof hero.chatRounds === 'number' ? hero.chatRounds : (base.chatRounds ?? 0)
    };
  };

  useEffect(() => {
    setHeroes(prev => prev.map(normalizeHero));
  }, []);

  const importSaveData = () => {
    try {
      const parsed = JSON.parse(saveDataText);
      const nextPlayer = parsed?.player as PlayerState | undefined;
      const nextLocations = parsed?.locations as Location[] | undefined;
      const nextHeroes = parsed?.heroes as Hero[] | undefined;
      if (!nextPlayer || !Array.isArray(nextPlayer.troops)) throw new Error('存档缺少玩家信息。');
      if (!Array.isArray(nextLocations)) throw new Error('存档缺少据点信息。');
    const normalizedPlayer = {
        ...nextPlayer,
        minerals: nextPlayer.minerals ?? INITIAL_PLAYER_STATE.minerals,
        relationMatrix: normalizeRelationMatrix((nextPlayer as any)?.relationMatrix),
        relationEvents: Array.isArray((nextPlayer as any)?.relationEvents) ? (nextPlayer as any).relationEvents : []
      };
      setPlayer(normalizedPlayer);
      const normalizedHeroes = Array.isArray(nextHeroes) && nextHeroes.length > 0
        ? nextHeroes.map(normalizeHero)
        : heroesRef.current.map(normalizeHero);
      setHeroes(normalizedHeroes);
      const normalizedLocations = ensureLocationLords(seedStayParties(nextLocations)).map(loc => {
        if (loc.claimFactionId) return loc;
        if (loc.factionId) return { ...loc, claimFactionId: loc.factionId };
        return loc;
      });
      setLocations(normalizedLocations);
      const nextLogs = Array.isArray(parsed?.logs) ? parsed.logs.filter((x: any) => typeof x === 'string').slice(0, 120) : [];
      setLogs(nextLogs);
      const nextBriefsRaw = Array.isArray(parsed?.recentBattleBriefs) ? parsed.recentBattleBriefs : [];
      const nextBriefs = nextBriefsRaw.map((b: any) => ({
        day: typeof b?.day === 'number' ? b.day : normalizedPlayer.day,
        battleLocation: String(b?.battleLocation ?? '').trim(),
        enemyName: String(b?.enemyName ?? '').trim() || '（未知敌军）',
        outcome: b?.outcome === 'A'
          ? 'A'
          : (b?.outcome === 'B' || b?.outcome === 'DEFEAT' || b?.outcome === 'RETREAT')
            ? 'B'
            : (b?.outcome === 'VICTORY' ? 'A' : 'A'),
        playerSide: String(b?.playerSide ?? '').trim(),
        enemySide: String(b?.enemySide ?? '').trim(),
        keyUnitDamageSummary: String(b?.keyUnitDamageSummary ?? b?.heroInjuries ?? '').trim()
      })).slice(0, 3);
      setRecentBattleBriefs(nextBriefs);
      const nextReportsRaw = Array.isArray(parsed?.worldBattleReports) ? parsed.worldBattleReports : [];
      const nextReports = nextReportsRaw.map((b: any) => ({
        id: String(b?.id ?? `battle_import_${Math.random().toString(36).slice(2, 8)}`),
        day: typeof b?.day === 'number' ? b.day : normalizedPlayer.day,
        createdAt: String(b?.createdAt ?? ''),
        battleLocation: String(b?.battleLocation ?? '').trim(),
        enemyName: String(b?.enemyName ?? '').trim() || '（未知敌军）',
        outcome: b?.outcome === 'A'
          ? 'A'
          : (b?.outcome === 'B' || b?.outcome === 'DEFEAT' || b?.outcome === 'RETREAT')
            ? 'B'
            : (b?.outcome === 'VICTORY' ? 'A' : 'A'),
        playerSide: String(b?.playerSide ?? '').trim(),
        enemySide: String(b?.enemySide ?? '').trim(),
        keyUnitDamageSummary: String(b?.keyUnitDamageSummary ?? b?.heroInjuries ?? '').trim(),
        rounds: Array.isArray(b?.rounds) ? b.rounds.map((round: any, index: number) => ({
          roundNumber: typeof round?.roundNumber === 'number' ? round.roundNumber : index + 1,
          description: String(round?.description ?? ''),
          casualtiesA: Array.isArray(round?.casualtiesA)
            ? round.casualtiesA.map((c: any) => ({
                name: String(c?.name ?? ''),
                count: Math.max(0, Math.floor(c?.count ?? 0)),
                cause: String(c?.cause ?? '')
              }))
            : Array.isArray(round?.playerCasualties)
              ? round.playerCasualties.map((c: any) => ({
                  name: String(c?.name ?? ''),
                  count: Math.max(0, Math.floor(c?.count ?? 0)),
                  cause: String(c?.cause ?? '')
                }))
              : [],
          keyUnitDamageA: Array.isArray(round?.keyUnitDamageA)
            ? round.keyUnitDamageA.map((c: any) => ({
                name: String(c?.name ?? ''),
                hpLoss: Math.max(0, Math.floor(c?.hpLoss ?? 0)),
                cause: String(c?.cause ?? '')
              }))
            : Array.isArray(round?.heroInjuries)
              ? round.heroInjuries.map((c: any) => ({
                  name: String(c?.name ?? ''),
                  hpLoss: Math.max(0, Math.floor(c?.hpLoss ?? 0)),
                  cause: String(c?.cause ?? '')
                }))
              : [],
          keyUnitDamageB: Array.isArray(round?.keyUnitDamageB)
            ? round.keyUnitDamageB.map((c: any) => ({
                name: String(c?.name ?? ''),
                hpLoss: Math.max(0, Math.floor(c?.hpLoss ?? 0)),
                cause: String(c?.cause ?? '')
              }))
            : [],
          casualtiesB: Array.isArray(round?.casualtiesB)
            ? round.casualtiesB.map((c: any) => ({
                name: String(c?.name ?? ''),
                count: Math.max(0, Math.floor(c?.count ?? 0)),
                cause: String(c?.cause ?? '')
              }))
            : Array.isArray(round?.enemyCasualties)
              ? round.enemyCasualties.map((c: any) => ({
                  name: String(c?.name ?? ''),
                  count: Math.max(0, Math.floor(c?.count ?? 0)),
                  cause: String(c?.cause ?? '')
                }))
              : []
        })) : []
      })).slice(0, 12);
      setWorldBattleReports(nextReports);
      setWorldDiplomacy(normalizeWorldDiplomacy(parsed?.worldDiplomacy));
      const nextLocationId = typeof parsed?.currentLocationId === 'string' ? parsed.currentLocationId : null;
      const nextLocation = normalizedLocations.find(l => l.id === nextLocationId) ?? null;
      setCurrentLocation(nextLocation);
      const safeView = normalizeView(parsed?.view, !!nextLocation);
      setView(safeView);
      setTownTab(parsed?.townTab ?? 'RECRUIT');
      setWorkDays(typeof parsed?.workDays === 'number' ? parsed.workDays : 1);
      setTrainingMyArmy(Array.isArray(parsed?.trainingMyArmy) ? parsed.trainingMyArmy : trainingMyArmy);
      setTrainingEnemyArmy(Array.isArray(parsed?.trainingEnemyArmy) ? parsed.trainingEnemyArmy : trainingEnemyArmy);
      setTrainInputMy(parsed?.trainInputMy ?? trainInputMy);
      setTrainInputEnemy(parsed?.trainInputEnemy ?? trainInputEnemy);
      setCustomTroopTemplates(parsed?.customTroopTemplates ?? {});
      setShaperDialogue(Array.isArray(parsed?.shaperDialogue) ? parsed.shaperDialogue : shaperDialogue);
      setShaperInput(typeof parsed?.shaperInput === 'string' ? parsed.shaperInput : '');
      setShaperProposal(parsed?.shaperProposal ?? null);
      setAltarDialogues(parsed?.altarDialogues ?? {});
      setAltarDrafts(parsed?.altarDrafts ?? {});
      setAltarProposals(parsed?.altarProposals ?? {});
      setAltarRecruitDays(typeof parsed?.altarRecruitDays === 'number' ? parsed.altarRecruitDays : 2);
      setAltarRecruitState(parsed?.altarRecruitState ?? null);
      const importedProfiles = Array.isArray(parsed?.openAIProfiles)
        ? parsed.openAIProfiles.filter((p: any) => p && typeof p.id === 'string')
        : [];
      if (importedProfiles.length > 0) {
        const importedActiveId = typeof parsed?.openAIActiveProfileId === 'string' ? parsed.openAIActiveProfileId : null;
        const activeProfile = importedProfiles.find((p: any) => p.id === importedActiveId) ?? importedProfiles[0];
        setOpenAIProfiles(importedProfiles);
        setActiveOpenAIProfileId(activeProfile.id);
        setOpenAIProfileName(activeProfile.name ?? '默认');
        setOpenAIBaseUrl(activeProfile.baseUrl ?? openAIBaseUrl);
        setOpenAIKey(activeProfile.key ?? openAIKey);
        setOpenAIModel(activeProfile.model ?? openAIModel);
        localStorage.setItem('openai.profiles', JSON.stringify(importedProfiles));
        localStorage.setItem('openai.profile.active', activeProfile.id);
        localStorage.setItem('openai.baseUrl', String(activeProfile.baseUrl ?? '').trim());
        localStorage.setItem('openai.key', String(activeProfile.key ?? '').trim());
        localStorage.setItem('openai.model', String(activeProfile.model ?? '').trim());
      } else if (parsed?.openAI) {
        const baseUrl = typeof parsed.openAI.baseUrl === 'string' ? parsed.openAI.baseUrl : openAIBaseUrl;
        const key = typeof parsed.openAI.key === 'string' ? parsed.openAI.key : openAIKey;
        const model = typeof parsed.openAI.model === 'string' ? parsed.openAI.model : openAIModel;
        setOpenAIBaseUrl(baseUrl);
        setOpenAIKey(key);
        setOpenAIModel(model);
        localStorage.setItem('openai.baseUrl', baseUrl.trim());
        localStorage.setItem('openai.key', key.trim());
        localStorage.setItem('openai.model', model.trim());
      }
      const importedProvider = typeof parsed?.aiProvider === 'string' ? parsed.aiProvider : aiProvider;
      const normalizedProvider = importedProvider === 'GPT' || importedProvider === 'GEMINI' || importedProvider === 'DOUBAO' || importedProvider === 'CUSTOM'
        ? importedProvider
        : 'CUSTOM';
      setAIProvider(normalizedProvider as AIProvider);
      localStorage.setItem('ai.provider', normalizedProvider);
      const importedDoubaoKey = typeof parsed?.doubaoApiKey === 'string' ? parsed.doubaoApiKey : doubaoApiKey;
      const importedGeminiKey = typeof parsed?.geminiApiKey === 'string' ? parsed.geminiApiKey : geminiApiKey;
      setDoubaoApiKey(importedDoubaoKey);
      setGeminiApiKey(importedGeminiKey);
      localStorage.setItem('doubao.key', String(importedDoubaoKey ?? '').trim());
      localStorage.setItem('gemini.key', String(importedGeminiKey ?? '').trim());
      if (typeof parsed?.battleStreamEnabled === 'boolean') {
        setBattleStreamEnabled(parsed.battleStreamEnabled);
        localStorage.setItem('battle.stream', parsed.battleStreamEnabled ? '1' : '0');
      }
      if (parsed?.battleResolutionMode === 'AI' || parsed?.battleResolutionMode === 'PROGRAM') {
        setBattleResolutionMode(parsed.battleResolutionMode);
        localStorage.setItem('battle.mode', parsed.battleResolutionMode);
      }
      setOpenAIModels([]);
      setActiveEnemy(null);
      setBattleResult(null);
      setIsBattling(false);
      setIsBattleStreaming(false);
      setIsBattleResultFinal(true);
      setBattleMeta(null);
      setBattleSnapshot(null);
      setBattleError(null);
      setSaveDataNotice('存档已导入。');
    } catch (e: any) {
      setSaveDataNotice(e?.message || '导入失败。');
    }
  };

  const fetchOpenAIModelList = async () => {
    setSettingsError(null);
    if (aiProvider === 'GEMINI' || aiProvider === 'DOUBAO') {
      setSettingsError('当前供应商不支持模型列表。');
      return;
    }
    if (!openAIKey.trim()) {
      setSettingsError('请先填写 Key。');
      return;
    }
    setIsModelsLoading(true);
    try {
      const models = await listOpenAIModels(aiProvider, openAIBaseUrl.trim() || 'https://api.openai.com', openAIKey.trim());
      setOpenAIModels(models);
      if (!openAIModel.trim() && models.length > 0) setOpenAIModel(models[0]);
    } catch (e: any) {
      setSettingsError(e?.message || '获取模型列表失败。');
    } finally {
      setIsModelsLoading(false);
    }
  };

  // --- Views ---

  const collectWorldTroops = () => {
    const gathered: Troop[] = [];
    const addTroops = (troops?: Troop[]) => {
      if (!troops) return;
      troops.forEach(t => {
        if (!t || t.count <= 0) return;
        const template = getTroopTemplate(t.id);
        if (template) {
          gathered.push({ ...template, count: t.count, xp: t.xp ?? 0 } as Troop);
        } else {
          gathered.push(t);
        }
      });
    };

    addTroops(player.troops);

    locations.forEach(loc => {
      const garrison = loc.garrison ?? [];
      if (loc.owner === 'PLAYER') {
        addTroops(garrison);
      } else if (garrison.length > 0) {
        addTroops(garrison);
      } else {
        addTroops(buildGarrisonTroops(loc));
      }

      const stayParties = loc.stayParties ?? [];
      stayParties.forEach(party => addTroops(party.troops));

      const stationedArmies = loc.stationedArmies ?? [];
      stationedArmies.forEach(army => addTroops(army.troops));

      if (loc.activeSiege?.troops) {
        addTroops(loc.activeSiege.troops);
      }
    });

    return gathered;
  };

  const getBelieverStats = (troopIds: string[]) => {
    const ids = new Set(troopIds.filter(Boolean));
    const stats = {
      total: 0,
      byTier: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
    };
    if (ids.size === 0) return stats;
    const gathered = collectWorldTroops();
    gathered.forEach(troop => {
      if (!ids.has(troop.id)) return;
      const tier = (getTroopTemplate(troop.id)?.tier ?? troop.tier ?? 1) as TroopTier;
      const key = Math.min(5, Math.max(1, tier)) as 1 | 2 | 3 | 4 | 5;
      stats.total += troop.count;
      stats.byTier[key] += troop.count;
    });
    return stats;
  };

  const copyEndgameBattlePrompt = async () => {
    const gathered = collectWorldTroops();
    if (gathered.length === 0) {
      addLog('没有可统计的士兵。');
      return;
    }
    const imposterMap: Record<string, Troop> = {};
    const nonImposterMap: Record<string, Troop> = {};
    const normalizeTroop = (troop: Troop) => {
      const template = getTroopTemplate(troop.id);
      if (template) {
        return { ...template, count: troop.count, xp: troop.xp ?? 0 } as Troop;
      }
      return {
        id: troop.id,
        name: troop.name ?? troop.id,
        tier: (troop.tier ?? 1) as TroopTier,
        count: troop.count,
        xp: troop.xp ?? 0,
        maxXp: troop.maxXp ?? 0,
        basePower: troop.basePower ?? 1,
        cost: troop.cost ?? 0,
        upgradeCost: troop.upgradeCost ?? 0,
        upgradeTargetId: troop.upgradeTargetId,
        description: troop.description ?? '',
        equipment: troop.equipment ?? []
      } as Troop;
    };
    gathered.forEach(troop => {
      const normalized = normalizeTroop(troop);
      const target = IMPOSTER_TROOP_IDS.has(normalized.id) ? imposterMap : nonImposterMap;
      const existing = target[normalized.id];
      if (existing) {
        existing.count += normalized.count;
      } else {
        target[normalized.id] = { ...normalized };
      }
    });

    const imposterTroops = Object.values(imposterMap);
    const nonImposterTroops = Object.values(nonImposterMap);
    if (imposterTroops.length === 0 || nonImposterTroops.length === 0) {
      addLog('终局之战需要同时拥有伪人与非伪人单位。');
      return;
    }

    const portalLocation = locations.find(loc => loc.type === 'IMPOSTER_PORTAL') ?? locations[0];
    if (!portalLocation) {
      addLog('无法生成终局之战：缺少据点信息。');
      return;
    }
    const defenseDetails = getLocationDefenseDetails(portalLocation);
    const siegeEngines: SiegeEngineType[] = ['RAM', 'TOWER', 'CATAPULT', 'SIMPLE_LADDER'];
    const siegeEngineNames = siegeEngines
      .map(type => type === 'SIMPLE_LADDER' ? '简易云梯' : getSiegeEngineName(type))
      .join('、');
    const defenseBuildings = (portalLocation.buildings ?? []).includes('DEFENSE') ? '有额外防御建筑' : '无额外防御建筑';
    const siegeContext = `攻城地点：${portalLocation.name}（${portalLocation.type}）。防御工事：${defenseDetails.wallName}（Lv.${defenseDetails.wallLevel}），设施：${defenseDetails.mechanisms.map(item => item.name).join('、') || '无'}。${defenseBuildings}。攻城器械：${siegeEngineNames}（免费）。`;
    const enemy: EnemyForce = {
      name: '伪人终局守军',
      description: defenseDetails.wallDesc,
      troops: imposterTroops,
      difficulty: '终局',
      lootPotential: 0,
      terrain: portalLocation.terrain,
      baseTroopId: imposterTroops[0]?.id ?? 'void_larva'
    };
    const prompt = buildBattlePrompt(
      nonImposterTroops,
      enemy,
      portalLocation.terrain,
      playerRef.current,
      siegeContext
    );

    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(prompt);
      } else {
        const textarea = document.createElement('textarea');
        textarea.value = prompt;
        textarea.style.position = 'fixed';
        textarea.style.left = '-9999px';
        textarea.style.top = '0';
        document.body.appendChild(textarea);
        textarea.focus();
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }
      addLog('已复制终局之战 prompt。');
    } catch {
      addLog('复制失败：浏览器未授权剪贴板。');
    }
  };

  const renderHeader = () => (
    <header className="bg-stone-900 border-b border-stone-700 p-2 md:p-4 sticky top-0 z-30 shadow-lg flex flex-wrap gap-4 items-center justify-between">
       <div className="flex items-center gap-2">
         <div 
            onClick={() => setView('CHARACTER')}
            className="flex items-center gap-2 cursor-pointer hover:bg-stone-800 p-1 rounded transition-colors"
          >
             <div className="w-8 h-8 rounded-full bg-stone-700 border border-stone-500 flex items-center justify-center">
               <User size={16} className={player.status === 'INJURED' ? 'text-red-500' : 'text-stone-300'} />
             </div>
             <div className="flex flex-col">
               <span className="text-xs font-bold text-stone-300 leading-none">{player.name} Lv.{player.level}</span>
               <div className="w-16 h-1.5 bg-stone-800 rounded mt-1">
                 <div className="h-full bg-red-600" style={{width: `${(player.currentHp / player.maxHp) * 100}%`}}></div>
               </div>
               <span className="text-[10px] text-stone-500">{player.currentHp} / {player.maxHp}</span>
             </div>
          </div>
          {player.attributePoints > 0 && <span className="animate-pulse text-yellow-500 text-xs font-bold">● 加点</span>}
       </div>

       <div className="flex gap-4 text-sm items-center">
          <div className="flex items-center gap-2 text-stone-400" title="天数">
             <span className="font-serif">Day {player.day}</span>
          </div>
          <div className="flex items-center gap-1 text-yellow-500" title="第纳尔">
            <Coins size={14} /> <span>{player.gold}</span>
          </div>
          <button 
            onClick={() => setView(view === 'PARTY' ? 'MAP' : 'PARTY')}
            className="flex items-center gap-1 text-stone-200 hover:text-white px-2 rounded transition-colors" 
          >
             <Users size={14} /> <span>{player.troops.reduce((a, b) => a + b.count, 0)} / {getMaxTroops()}</span>
          </button>
          <button
            onClick={() => setIsMapListOpen(true)}
            className="flex items-center gap-1 text-stone-400 hover:text-white px-2 rounded transition-colors"
            title="据点列表"
          >
            <MapIcon size={14} /> <span className="hidden md:inline">据点</span>
          </button>
          <button
            onClick={() => setIsWorldTroopStatsOpen(true)}
            className="flex items-center gap-1 text-stone-400 hover:text-white px-2 rounded transition-colors"
            title="士兵统计"
          >
            <Activity size={14} /> <span className="hidden md:inline">统计</span>
          </button>
          <button
            onClick={() => setView('RELATIONS')}
            className="flex items-center gap-1 text-stone-400 hover:text-white px-2 rounded transition-colors"
            title="关系"
          >
            <Flag size={14} /> <span className="hidden md:inline">关系</span>
          </button>
          <button
            onClick={() => setIsChangelogOpen(true)}
            className="flex items-center gap-1 text-stone-400 hover:text-white px-2 rounded transition-colors"
            title="更新日志"
          >
            <MessageCircle size={14} /> <span className="hidden md:inline">更新</span>
          </button>
          <button
            onClick={() => {
              setSettingsError(null);
              setIsSettingsOpen(true);
            }}
            className="flex items-center gap-1 text-stone-400 hover:text-white px-2 rounded transition-colors"
            title="设置"
          >
            <Settings size={14} /> <span className="hidden md:inline">设置</span>
          </button>
       </div>
    </header>
  );

  const renderMapListModal = () => (
    <MapListModal
      locations={locations}
      playerDay={player.day}
      mapListQuery={mapListQuery}
      setMapListQuery={setMapListQuery}
      mapListTypeFilter={mapListTypeFilter}
      setMapListTypeFilter={setMapListTypeFilter}
      focusLocationOnMap={focusLocationOnMap}
      onClose={() => setIsMapListOpen(false)}
    />
  );

  const renderWorldTroopStatsModal = () => (
    <WorldTroopStatsModal
      collectWorldTroops={collectWorldTroops}
      getTroopTemplate={getTroopTemplate}
      worldTroopRaceFilter={worldTroopRaceFilter}
      setWorldTroopRaceFilter={setWorldTroopRaceFilter}
      worldTroopTierFilter={worldTroopTierFilter}
      setWorldTroopTierFilter={setWorldTroopTierFilter}
      worldTroopIdFilter={worldTroopIdFilter}
      setWorldTroopIdFilter={setWorldTroopIdFilter}
      copyEndgameBattlePrompt={copyEndgameBattlePrompt}
      onClose={() => setIsWorldTroopStatsOpen(false)}
    />
  );

  const renderCharacter = () => (
    <CharacterView
      player={player}
      spendAttributePoint={spendAttributePoint}
      onBackToMap={() => setView('MAP')}
    />
  );

  const renderBanditEncounter = () => (
    <BanditEncounterView onAction={handleBanditAction} />
  );

  const renderWorldBoard = () => {
    const troopTypeCount = Object.keys({ ...TROOP_TEMPLATES, ...customTroopTemplates }).length;
    const activeBattles = locations
      .filter(loc => loc.activeSiege)
      .map(loc => {
        const siege = loc.activeSiege!;
        return {
          id: loc.id,
          locationName: loc.name,
          attackerName: siege.attackerName,
          defenderName: loc.lord ? `${loc.lord.title}${loc.lord.name}` : `${loc.name}守军`,
          startDay: siege.startDay,
          attackerTroops: siege.troops,
          defenderTroops: getDefenderTroops(loc)
        };
      });
    const factionSnapshots = FACTIONS.map(faction => {
      const factionLocations = locations.filter(loc => loc.factionId === faction.id);
      const cities = factionLocations.filter(loc => loc.type === 'CITY').length;
      const castles = factionLocations.filter(loc => loc.type === 'CASTLE').length;
      const villages = factionLocations.filter(loc => loc.type === 'VILLAGE').length;
      const soldiers = factionLocations.reduce((sum, loc) => sum + getGarrisonCount(getDefenderTroops(loc)), 0);
      return {
        ...faction,
        cities,
        castles,
        villages,
        soldiers
      };
    });
    const siegeEngineArchive = siegeEngineOptions.map(option => {
      const stats = siegeEngineCombatStats[option.type];
      return {
        ...option,
        ...stats
      };
    });
    const defenseArchive = Array.from(new Map(locations.map(loc => [loc.type, loc])).values())
      .map(loc => {
        const defense = getLocationDefenseDetails(loc);
        if (defense.wallLevel <= 0 && defense.mechanisms.length === 0) return null;
        return {
          type: loc.type,
          sampleName: loc.name,
          wallName: defense.wallName,
          wallLevel: defense.wallLevel,
          wallHp: defense.wallHp,
          mechanismHp: defense.mechanismHp,
          rangedHitBonus: defense.rangedHitBonus,
          rangedDamageBonus: defense.rangedDamageBonus,
          meleeDamageReduction: defense.meleeDamageReduction,
          mechanisms: defense.mechanisms
        };
      })
      .filter(Boolean) as Array<{
        type: Location['type'];
        sampleName: string;
        wallName: string;
        wallLevel: number;
        wallHp: number;
        mechanismHp: number;
        rangedHitBonus: number;
        rangedDamageBonus: number;
        meleeDamageReduction: number;
        mechanisms: { name: string; description: string }[];
      }>;
    return (
      <WorldBoardView
        currentLocation={currentLocation}
        logs={logs}
        worldBattleReports={worldBattleReports}
        worldDiplomacy={worldDiplomacy}
        activeBattles={activeBattles}
        battleTimeline={battleTimeline}
        troopTypeCount={troopTypeCount}
        factionSnapshots={factionSnapshots}
        siegeEngineArchive={siegeEngineArchive}
        defenseArchive={defenseArchive}
        onOpenTroopArchive={() => setView('TROOP_ARCHIVE')}
        onBackToMap={() => setView('MAP')}
        onExportMarkdown={exportWorldBoardMarkdown}
      />
    );
  };

  const renderRelations = () => {
    const matrix = normalizeRelationMatrix(player.relationMatrix);
    const factionItems = FACTIONS.map(faction => ({
      id: faction.id,
      name: faction.name,
      value: matrix.factions[faction.id] ?? 0
    }));
    type MatrixEntityId = 'PLAYER' | RaceId;
    const matrixIds: MatrixEntityId[] = ['PLAYER', ...(Object.keys(RACE_LABELS) as RaceId[])];
    const matrixLabels: Record<MatrixEntityId, string> = { PLAYER: player.name || '流浪领主', ...RACE_LABELS };
    const getMatrixValue = (rowId: MatrixEntityId, colId: MatrixEntityId) => {
      if (rowId === colId) return null;
      if (rowId === 'PLAYER' && colId !== 'PLAYER') return matrix.races[colId] ?? 0;
      if (colId === 'PLAYER' && rowId !== 'PLAYER') return matrix.races[rowId] ?? 0;
      return 0;
    };
    const getCellStyle = (value: number) => {
      const intensity = Math.min(1, Math.abs(value) / 100);
      if (value > 0) {
        return { backgroundColor: `rgba(16,185,129, ${0.15 + intensity * 0.55})`, color: '#ecfdf5' };
      }
      if (value < 0) {
        return { backgroundColor: `rgba(239,68,68, ${0.15 + intensity * 0.55})`, color: '#fee2e2' };
      }
      return { backgroundColor: 'rgba(120,113,108,0.2)', color: '#e7e5e4' };
    };
    const lordItems = Array.from(new Map(
      locations
        .filter(loc => loc.lord)
        .map(loc => [
          loc.lord!.id,
          {
            id: loc.lord!.id,
            name: loc.lord!.name,
            title: loc.lord!.title,
            fief: loc.name,
            value: loc.lord!.relation
          }
        ])
    ).values()).sort((a, b) => b.value - a.value);
    const events = (player.relationEvents ?? []).slice(0, 18);

    return (
      <div className="max-w-5xl mx-auto px-4">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-serif text-amber-400">关系网络</h2>
          <Button onClick={() => setView('MAP')} variant="secondary">返回地图</Button>
        </div>
        <div className="grid md:grid-cols-2 gap-6">
          <div className="bg-stone-900 border border-stone-700 rounded-lg p-4">
            <div className="text-stone-200 font-semibold mb-3">人类势力关系</div>
            <div className="space-y-2">
              {factionItems.map(item => {
                const tone = getRelationTone(item.value);
                return (
                  <div key={item.id} className="flex items-center justify-between">
                    <span className="text-stone-200">{item.name}</span>
                    <div className="flex items-center gap-3">
                      <span className={`text-xs ${tone.color}`}>{tone.label}</span>
                      <span className="text-sm text-stone-300">{item.value}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          <div className="bg-stone-900 border border-stone-700 rounded-lg p-4 md:col-span-2">
            <div className="text-stone-200 font-semibold mb-3">种族关系矩阵</div>
            <div className="overflow-x-auto">
              <table className="min-w-[640px] w-full border-collapse text-xs">
                <thead>
                  <tr>
                    <th className="px-3 py-2 text-left text-stone-400 border border-stone-800">阵营</th>
                    {matrixIds.map(colId => (
                      <th key={colId} className="px-3 py-2 text-center text-stone-300 border border-stone-800 whitespace-nowrap">
                        {matrixLabels[colId]}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {matrixIds.map(rowId => (
                    <tr key={rowId}>
                      <th className="px-3 py-2 text-left text-stone-300 border border-stone-800 whitespace-nowrap">
                        {matrixLabels[rowId]}
                      </th>
                      {matrixIds.map(colId => {
                        const isSelf = rowId === colId;
                        const value = getMatrixValue(rowId, colId);
                        const style = isSelf ? { backgroundColor: 'rgba(30,41,59,0.4)', color: '#94a3b8' } : getCellStyle(value ?? 0);
                        return (
                          <td key={`${rowId}-${colId}`} className="px-2 py-2 text-center border border-stone-800 font-medium" style={style}>
                            {isSelf ? '—' : value}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
        <div className="bg-stone-900 border border-stone-700 rounded-lg p-4 mt-6">
          <div className="text-stone-200 font-semibold mb-3">领主关系</div>
          {lordItems.length > 0 ? (
            <div className="max-h-72 overflow-y-auto pr-2 space-y-3">
              {lordItems.map(item => (
                <div key={item.id} className="border-b border-stone-800 pb-3">
                  <div className="flex items-center justify-between">
                    <span className="text-stone-200">{item.title} {item.name}</span>
                    <span className="text-xs text-stone-500">{item.fief}</span>
                  </div>
                  <div className="flex items-center gap-3 mt-2">
                    <input
                      type="range"
                      min={-100}
                      max={100}
                      value={item.value}
                      readOnly
                      className="w-full accent-amber-500"
                    />
                    <span className="text-sm text-stone-300 w-10 text-right">{item.value}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-sm text-stone-500">暂无领主关系。</div>
          )}
        </div>
        <div className="bg-stone-900 border border-stone-700 rounded-lg p-4 mt-6">
          <div className="text-stone-200 font-semibold mb-3">近期关系事件</div>
          {events.length > 0 ? (
            <div className="space-y-2">
              {events.map(event => (
                <div key={event.id} className="flex items-center justify-between text-sm">
                  <span className="text-stone-400">第 {event.day} 天</span>
                  <span className="text-stone-200 flex-1 px-3">{event.text}</span>
                  <span className={event.delta >= 0 ? 'text-emerald-300' : 'text-red-300'}>
                    {event.delta >= 0 ? `+${event.delta}` : event.delta}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-sm text-stone-500">暂无关系变动记录。</div>
          )}
        </div>
      </div>
    );
  };

  const renderTroopArchive = () => (
    <TroopArchiveView
      troopTemplates={TROOP_TEMPLATES}
      customTroopTemplates={customTroopTemplates}
      troopArchiveQuery={troopArchiveQuery}
      setTroopArchiveQuery={setTroopArchiveQuery}
      troopArchiveFactionFilter={troopArchiveFactionFilter}
      setTroopArchiveFactionFilter={setTroopArchiveFactionFilter}
      troopArchiveTierFilter={troopArchiveTierFilter}
      setTroopArchiveTierFilter={setTroopArchiveTierFilter}
      troopArchiveCategoryFilter={troopArchiveCategoryFilter}
      setTroopArchiveCategoryFilter={setTroopArchiveCategoryFilter}
      troopArchiveSort={troopArchiveSort}
      setTroopArchiveSort={setTroopArchiveSort}
      troopArchivePage={troopArchivePage}
      setTroopArchivePage={setTroopArchivePage}
      troopArchivePageSize={troopArchivePageSize}
      setTroopArchivePageSize={setTroopArchivePageSize}
      onBackToWorldBoard={() => setView('WORLD_BOARD')}
      onBackToMap={() => setView('MAP')}
    />
  );

  const renderAsylum = () => (
    <AsylumView
      gachaResult={gachaResult}
      onGacha={handleAsylumGacha}
      onBackToMap={() => setView('MAP')}
    />
  );

  const renderMarket = () => (
    <MarketView
      player={player}
      parrotVariants={PARROT_VARIANTS}
      onBuyParrot={handleBuyParrot}
      onBackToMap={() => setView('MAP')}
    />
  );

  const renderMysteriousCave = () => {
    if (!currentLocation) return null;

    return (
      <MysteriousCaveView
        player={player}
        currentLocation={currentLocation}
        shaperDialogue={shaperDialogue}
        shaperInput={shaperInput}
        isShaperLoading={isShaperLoading}
        shaperProposal={shaperProposal}
        shaperChatListRef={shaperChatListRef}
        getTroopTemplate={getTroopTemplate}
        getMaxTroops={getMaxTroops}
        onChangeShaperInput={setShaperInput}
        onSendToShaper={sendToShaper}
        onCraftShapedTroop={craftShapedTroop}
        onRecruitOffer={handleRecruitOffer}
        onBackToMap={() => setView('MAP')}
      />
    );
  };

  const renderSettingsModal = () => (
    <SettingsModal
      openAIBaseUrl={openAIBaseUrl}
      setOpenAIBaseUrl={setOpenAIBaseUrl}
      openAIKey={openAIKey}
      setOpenAIKey={setOpenAIKey}
      openAIModel={openAIModel}
      setOpenAIModel={setOpenAIModel}
      aiProvider={aiProvider}
      setAIProvider={setAIProvider}
      doubaoApiKey={doubaoApiKey}
      setDoubaoApiKey={setDoubaoApiKey}
      geminiApiKey={geminiApiKey}
      setGeminiApiKey={setGeminiApiKey}
      openAIProfiles={openAIProfiles}
      activeOpenAIProfileId={activeOpenAIProfileId}
      openAIProfileName={openAIProfileName}
      setOpenAIProfileName={setOpenAIProfileName}
      selectOpenAIProfile={selectOpenAIProfile}
      addOpenAIProfile={addOpenAIProfile}
      openAIModels={openAIModels}
      isModelsLoading={isModelsLoading}
      fetchOpenAIModelList={fetchOpenAIModelList}
      settingsError={settingsError}
      battleStreamEnabled={battleStreamEnabled}
      setBattleStreamEnabled={setBattleStreamEnabled}
      battleResolutionMode={battleResolutionMode}
      setBattleResolutionMode={setBattleResolutionMode}
      saveDataText={saveDataText}
      setSaveDataText={setSaveDataText}
      saveDataNotice={saveDataNotice}
      exportSaveData={exportSaveData}
      importSaveData={importSaveData}
      onClose={() => setIsSettingsOpen(false)}
      onSave={saveOpenAISettings}
    />
  );

  const renderParty = () => (
    <PartyView
      player={player}
      heroes={heroes}
      partyCategoryFilter={partyCategoryFilter}
      setPartyCategoryFilter={setPartyCategoryFilter}
      getTroopTemplate={getTroopTemplate}
      handleUpgrade={handleUpgrade}
      getHeroRoleLabel={getHeroRoleLabel}
      spendHeroAttributePoint={spendHeroAttributePoint}
      onOpenHeroChat={(heroId) => {
        setActiveHeroChatId(heroId);
        setHeroChatInput('');
        setView('HERO_CHAT');
      }}
      onBackToMap={() => setView('MAP')}
    />
  );

  const renderHeroChat = () => {
    const activeHeroChat = activeHeroChatId
      ? heroes.find(hero => hero.id === activeHeroChatId && hero.recruited) ?? null
      : null;

    return (
      <HeroChatView
        activeHeroChat={activeHeroChat}
        worldbookContent={WORLD_BOOK}
        chatInput={heroChatInput}
        isLoading={isHeroChatLoading}
        onInputChange={setHeroChatInput}
        onSend={sendToHero}
        onCopyPrompt={copyPendingHeroChatPrompt}
        partyDiary={normalizePartyDiary(partyDiary, player.day)}
        onAddDiaryEntry={(text) => {
          if (!activeHeroChat) return;
          const day = playerRef.current.day;
          addPartyDiaryEntry(activeHeroChat.id, activeHeroChat.name, text, activeHeroChat.chatRounds ?? 0, day);
        }}
        onUpdateDiaryEntry={(entryId, nextText) => {
          if (!activeHeroChat) return;
          const day = playerRef.current.day;
          updatePartyDiaryEntry(entryId, nextText, activeHeroChat.id, activeHeroChat.name, activeHeroChat.chatRounds ?? 0, day);
        }}
        onDeleteDiaryEntry={(entryId) => {
          const day = playerRef.current.day;
          deletePartyDiaryEntry(entryId, day);
        }}
        onUpdateMemory={(memoryId, nextText) => {
          if (!activeHeroChat) return;
          const nowText = new Date().toLocaleString('zh-CN', { hour12: false });
          setHeroes(prev => prev.map(h => {
            if (h.id !== activeHeroChat.id) return h;
            const nextMemory = normalizeHeroMemory(h.permanentMemory ?? [])
              .map(item => item.id === memoryId ? {
                ...item,
                text: nextText,
                createdAt: nowText,
                createdDay: player.day,
                roundIndex: h.chatRounds ?? 0
              } : item)
              .filter(item => item.text.length > 0);
            return { ...h, permanentMemory: nextMemory };
          }));
        }}
        onDeleteMemory={(memoryId) => {
          if (!activeHeroChat) return;
          setHeroes(prev => prev.map(h => {
            if (h.id !== activeHeroChat.id) return h;
            const nextMemory = normalizeHeroMemory(h.permanentMemory ?? [])
              .filter(item => item.id !== memoryId);
            return { ...h, permanentMemory: nextMemory };
          }));
        }}
        onSpendAttribute={(key) => {
          if (!activeHeroChat) return;
          spendHeroAttributePoint(activeHeroChat.id, key);
        }}
        onClose={() => {
          if (activeHeroChat) {
            clearHeroChatTimers(activeHeroChat.id);
          }
          setIsHeroChatLoading(false);
          setHeroChatInput('');
          setActiveHeroChatId(null);
          setView('PARTY');
        }}
        onBackToParty={() => setView('PARTY')}
        listRef={heroChatListRef}
      />
    );
  };

  const renderTraining = () => (
    <TrainingView
      trainingEnemyArmy={trainingEnemyArmy}
      setTrainingEnemyArmy={setTrainingEnemyArmy}
      troopTemplates={TROOP_TEMPLATES}
      createTroop={createTroop}
      onStartTrainingBattle={(enemy) => {
        setActiveEnemy(enemy);
        setPendingBattleMeta({ mode: 'FIELD' });
        setPendingBattleIsTraining(true);
        setView('BATTLE');
      }}
      onBackToMap={() => setView('MAP')}
    />
  );

  const renderBattle = () => (
    <BattleView
      activeEnemy={activeEnemy}
      player={player}
      heroes={heroes}
      pendingBattleMeta={pendingBattleMeta}
      pendingBattleIsTraining={pendingBattleIsTraining}
      locations={locations}
      negotiationState={negotiationState}
      negotiationOpen={negotiationOpen}
      negotiationDialogue={negotiationDialogue}
      negotiationInput={negotiationInput}
      negotiationError={negotiationError}
      setNegotiationInput={setNegotiationInput}
      onSendNegotiation={sendNegotiationMessage}
      onCloseNegotiation={() => setNegotiationOpen(false)}
      battlePlan={battlePlan}
      draggingTroopId={draggingTroopId}
      hoveredTroop={hoveredTroop}
      mousePos={mousePos}
      getBattleTroops={getBattleTroops}
      calculatePower={calculatePower}
      calculateFleeChance={calculateFleeChance}
      calculateRearGuardPlan={calculateRearGuardPlan}
      getTroopTemplate={getTroopTemplate}
      setHoveredTroop={setHoveredTroop}
      setBattlePlan={setBattlePlan}
      setDraggingTroopId={setDraggingTroopId}
      startBattle={startBattle}
      attemptFlee={attemptFlee}
      sacrificeRetreat={sacrificeRetreat}
      onStartNegotiation={startNegotiation}
      onAcceptNegotiation={acceptNegotiationTerms}
      onRejectNegotiation={rejectNegotiationTerms}
      copyPendingBattlePrompt={copyPendingBattlePrompt}
      getLocationDefenseDetails={getLocationDefenseDetails}
      getSiegeEngineName={getSiegeEngineName}
      siegeEngineOptions={siegeEngineOptions}
    />
  );

  const renderBattleResult = () => (
    <BattleResultView
      battleResult={battleResult}
      isBattleResultFinal={isBattleResultFinal}
      currentRoundIndex={currentRoundIndex}
      setCurrentRoundIndex={setCurrentRoundIndex}
      battleSnapshot={battleSnapshot}
      player={player}
      heroes={heroes}
      activeEnemy={activeEnemy}
      getBattleTroops={getBattleTroops}
      closeBattleResult={closeBattleResult}
      isProgramMode={battleResolutionMode === 'PROGRAM'}
      onAdvanceRound={() => {
        if (!battleResult?.rounds || battleResult.rounds.length === 0) return;
        setCurrentRoundIndex(prev => {
          const next = Math.min(prev + 1, Math.max(0, battleResult.rounds.length - 1));
          if (next >= battleResult.rounds.length - 1) setIsBattleResultFinal(true);
          return next;
        });
      }}
    />
  );

  const restartGame = () => {
    setPlayer(INITIAL_PLAYER_STATE);
    setLocations(ensureLocationLords(seedStayParties(LOCATIONS)));
    setView('MAP');
    setLogs(["新的一天开始了..."]);
    setActiveEnemy(null);
    setBattleResult(null);
  };

  const renderGameOver = () => (
    <GameOverView player={player} onRestart={restartGame} />
  );

  const renderBattleSimulation = () => (
     <div className="fixed inset-0 bg-black/90 z-50 flex flex-col items-center justify-center text-center p-4">
        {battleError ? (
           <div className="animate-fade-in flex flex-col items-center">
              <AlertTriangle size={64} className="text-red-500 mb-6" />
              <h2 className="text-3xl font-serif font-bold text-red-500 mb-4">战局推演失败</h2>
              <p className="text-stone-400 max-w-md mb-8">{battleError}</p>
              
              <div className="flex gap-4">
                 <Button onClick={() => setBattleError(null)} variant="secondary">
                    取消
                 </Button>
                 <Button onClick={() => setIsSettingsOpen(true)} variant="secondary">
                    设置
                 </Button>
                 <Button 
                    onClick={() => startBattle(currentLocation?.type === 'TRAINING_GROUNDS', battleMeta ?? undefined)} 
                    size="lg"
                    className="flex items-center gap-2"
                 >
                    <RefreshCw size={20}/> 重试
                 </Button>
              </div>
           </div>
        ) : (
           <>
              <div className="w-16 h-16 border-4 border-amber-600 border-t-transparent rounded-full animate-spin mb-8"></div>
              <h2 className="text-3xl font-serif text-amber-500 mb-2">正在推演战局...</h2>
              <div className="text-xs text-stone-500 mb-3">传输方式：{isBattleStreaming ? '流式' : '一次性'}</div>
              <p className="text-stone-400 italic max-w-md animate-pulse">
                 "战争的胜负往往在第一支箭射出之前就已经注定了。"
              </p>
           </>
        )}
     </div>
  );

  return (
    <div className="min-h-screen bg-stone-950 text-stone-200 font-sans selection:bg-amber-900 selection:text-white overflow-hidden flex flex-col">
      {view !== 'GAME_OVER' && view !== 'BATTLE' && view !== 'BATTLE_RESULT' && view !== 'BANDIT_ENCOUNTER' && view !== 'HERO_CHAT' && renderHeader()}
      
      <main className={view === 'MAP' || view === 'HERO_CHAT' ? "flex-1 w-full flex" : "flex-1 container mx-auto pb-8 pt-4"}>
        {view === 'MAP' && (
          <BigMapView
            zoom={zoom}
            camera={camera}
            locations={locations}
            player={player}
            workState={workState}
            miningState={miningState}
            roachLureState={roachLureState}
            hoveredLocation={hoveredLocation}
            mousePos={mousePos}
            mapRef={mapRef}
            handleMouseDown={handleMouseDown}
            handleMouseMove={handleMouseMove}
            handleMouseUp={handleMouseUp}
            moveTo={moveTo}
            setHoveredLocation={setHoveredLocation}
          />
        )}
        {view === 'RELATIONS' && renderRelations()}
        {view === 'WORLD_BOARD' && renderWorldBoard()}
        {view === 'TROOP_ARCHIVE' && renderTroopArchive()}
        {view === 'TOWN' && (
          <TownView
            currentLocation={currentLocation}
            locations={locations}
            lords={lords}
            player={player}
            heroes={heroes}
            heroDialogue={heroDialogue}
            setHeroDialogue={setHeroDialogue}
            setHeroes={setHeroes}
            addLog={addLog}
            playerRef={playerRef}
            townTab={townTab}
            setTownTab={setTownTab}
            workDays={workDays}
            setWorkDays={setWorkDays}
            miningDays={miningDays}
            setMiningDays={setMiningDays}
            roachLureDays={roachLureDays}
            setRoachLureDays={setRoachLureDays}
            workState={workState}
            setWorkState={setWorkState}
            miningState={miningState}
            setMiningState={setMiningState}
            roachLureState={roachLureState}
            setRoachLureState={setRoachLureState}
            altarRecruitDays={altarRecruitDays}
            setAltarRecruitDays={setAltarRecruitDays}
            altarRecruitState={altarRecruitState}
            setAltarRecruitState={setAltarRecruitState}
            forgeTroopIndex={forgeTroopIndex}
            setForgeTroopIndex={setForgeTroopIndex}
            forgeEnchantmentId={forgeEnchantmentId}
            setForgeEnchantmentId={setForgeEnchantmentId}
            undeadDialogue={undeadDialogue}
            undeadChatInput={undeadChatInput}
            setUndeadChatInput={setUndeadChatInput}
            sendToUndead={sendToUndead}
            isUndeadChatLoading={isUndeadChatLoading}
            undeadChatListRef={undeadChatListRef}
            altarDialogues={altarDialogues}
            setAltarDialogues={setAltarDialogues}
            altarDrafts={altarDrafts}
            setAltarDrafts={setAltarDrafts}
            altarProposals={altarProposals}
            setAltarProposals={setAltarProposals}
            isAltarLoading={isAltarLoading}
            setIsAltarLoading={setIsAltarLoading}
            applyAltarProposal={applyAltarProposal}
            altarChatListRef={altarChatListRef}
            getBelieverStats={getBelieverStats}
            getMaxTroops={getMaxTroops}
            getTroopTemplate={getTroopTemplate}
            buildGarrisonTroops={buildGarrisonTroops}
            getGarrisonCount={getGarrisonCount}
            getGarrisonLimit={getGarrisonLimit}
            getLocationDefenseDetails={getLocationDefenseDetails}
            getSiegeEngineName={getSiegeEngineName}
            siegeEngineOptions={siegeEngineOptions}
            startSiegeBattle={startSiegeBattle}
            handleRecruitOffer={handleRecruitOffer}
            updateLocationState={updateLocationState}
            setPlayer={setPlayer}
            setActiveEnemy={setActiveEnemy}
            setPendingBattleMeta={setPendingBattleMeta}
            setPendingBattleIsTraining={setPendingBattleIsTraining}
            onDefenseAidJoin={handleDefenseAidJoin}
            onBackToMap={() => setView('MAP')}
            onEnterBattle={() => setView('BATTLE')}
            isBattling={isBattling}
            calculatePower={calculatePower}
            getHeroRoleLabel={getHeroRoleLabel}
            enchantmentRecipes={ENCHANTMENT_RECIPES}
            mineralMeta={MINERAL_META}
            mineralPurityLabels={MINERAL_PURITY_LABELS}
            mineConfigs={MINE_CONFIGS}
            initialMinerals={INITIAL_PLAYER_STATE.minerals}
            buildingOptions={buildingOptions}
            getBuildingName={getBuildingName}
            processDailyCycle={processDailyCycle}
            updateLord={updateLord}
            aiProvider={aiProvider}
            doubaoApiKey={doubaoApiKey}
            geminiApiKey={geminiApiKey}
            openAIBaseUrl={openAIBaseUrl}
            openAIKey={openAIKey}
            openAIModel={openAIModel}
            recentLogs={logs.slice(0, 12)}
          />
        )}
        {view === 'BANDIT_ENCOUNTER' && renderBanditEncounter()}
        {view === 'ASYLUM' && renderAsylum()}
        {view === 'MARKET' && renderMarket()}
        {view === 'CAVE' && renderMysteriousCave()}
        {view === 'PARTY' && renderParty()}
        {view === 'CHARACTER' && renderCharacter()}
        {view === 'HERO_CHAT' && renderHeroChat()}
        {view === 'TRAINING' && renderTraining()}
        {view === 'BATTLE' && renderBattle()}
        {view === 'BATTLE_RESULT' && renderBattleResult()}
        {view === 'GAME_OVER' && renderGameOver()}
      </main>

      {isSettingsOpen && renderSettingsModal()}
      {isChangelogOpen && <ChangelogModal entries={CHANGELOG} onClose={() => setIsChangelogOpen(false)} />}
      {isMapListOpen && renderMapListModal()}
      {isWorldTroopStatsOpen && renderWorldTroopStatsModal()}

      {/* AI Simulation Overlay */}
      {(isBattling || battleError) && renderBattleSimulation()}

      {/* Log Console */}
      {view !== 'BATTLE' && view !== 'BATTLE_RESULT' && view !== 'BANDIT_ENCOUNTER' && view !== 'HERO_CHAT' && !isBattling && (
        <div className={`fixed bottom-0 left-0 w-full md:w-96 md:left-4 md:bottom-4 bg-black/80 backdrop-blur-sm border-t md:border border-stone-800 transition-all duration-300 z-40 flex flex-col ${isLogExpanded ? 'h-96' : 'h-32'}`}>
           <div className="flex justify-between items-center p-2 bg-stone-900/50 border-b border-stone-800">
              <h4 className="text-xs uppercase text-stone-600 font-bold">日志 ({logs.length})</h4>
              <button 
                 onClick={() => setIsLogExpanded(!isLogExpanded)}
                 className="text-stone-500 hover:text-stone-300 p-1"
              >
                 {isLogExpanded ? <ChevronDown size={14}/> : <ChevronUp size={14}/>}
              </button>
           </div>
           <div className="flex-1 overflow-y-auto scrollbar-hide p-4">
               {logs.length === 0 ? (
                 <div className="text-sm text-stone-600">（暂无日志）</div>
               ) : (
                 <div className="flex flex-col gap-1">
                   {logs.map((log, i) => (
                  <p key={i} className={`text-sm ${i === 0 ? 'text-yellow-400 font-bold log-slide-in' : 'text-stone-400'}`}>
                    <span className="mr-2 text-stone-600">➜</span>{log}
                  </p>
                ))}
                 </div>
               )}
           </div>
        </div>
      )}
    </div>
  );
}
