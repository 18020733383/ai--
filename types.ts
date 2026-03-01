
export enum TroopTier {
  TIER_1 = 1, // 农民
  TIER_2 = 2, // 民兵
  TIER_3 = 3, // 正规军
  TIER_4 = 4, // 精锐
  TIER_5 = 5, // 传奇/怪物
}

export type AIProvider = 'CUSTOM' | 'GPT' | 'GEMINI' | 'DOUBAO';

export type MineralId = 'NULL_CRYSTAL' | 'STACK_OVERFLOW' | 'DEADLOCK_SHARD' | 'HERO_CRYSTAL';
export type MineralPurity = 1 | 2 | 3 | 4 | 5;
export type MineralInventory = Record<MineralId, Record<MineralPurity, number>>;
export type AnomalyInventory = Record<string, number>;

export type EnchantmentCategory = '空间逻辑类' | '运算过载类' | '逻辑锁死类' | '系统底层类';
export type Enchantment = {
  id: string;
  name: string;
  category: EnchantmentCategory;
  description: string;
  powerBonus: number;
};

export type Anomaly = {
  id: string;
  name: string;
  crystal: MineralId;
  troopId: string;
  tier: TroopTier;
  description: string;
};

export type TroopAttributes = {
  attack: number;
  defense: number;
  agility: number;
  hp: number;
  range: number;
  morale: number;
  air?: number;
  antiAir?: number;
};

export type TroopCategory = 'NORMAL' | 'HEAVY';
export type HeavySupportRole = 'ARTILLERY' | 'TANK' | 'RADAR' | 'OTHER';
export type CombatDomain = 'GROUND' | 'AIR' | 'HYBRID';

export interface Troop {
  id: string;
  name: string;
  race?: TroopRace;
  tier: TroopTier;
  count: number;
  xp: number; 
  maxXp: number; 
  basePower: number;
  cost: number; 
  upgradeCost: number; 
  upgradeTargetId?: string; 
  description: string;
  equipment: string[]; 
  attributes: TroopAttributes;
  enchantments?: Enchantment[];
  category?: TroopCategory;
  heavyTier?: number;
  ammoPerUnit?: number;
  supportRole?: HeavySupportRole;
  supportRules?: string;
  combatDomain?: CombatDomain;
  attackVsAir?: number;
  attackVsGround?: number;
  canCapture?: boolean;
  doctrine?: string;
  evangelist?: boolean;
}

export type AltarDoctrine = {
  religionName: string;
  domain: string;
  spread: string;
  blessing: string;
};

export type AltarTroopDraft = {
  slot?: number;
  tier: number;
  name: string;
  basePower: number;
  maxXp: number;
  upgradeCost: number;
  description: string;
  equipment: string[];
  attributes: TroopAttributes;
};

export type AltarState = {
  doctrine?: AltarDoctrine;
  troopIds?: string[];
  createdDay?: number;
  lastRebuildDay?: number;
};

export type ParrotPersonality = 'SARCASTIC' | 'GLOOMY' | 'MANIC' | 'WISE';

export interface ParrotVariant {
  name: string;
  type: string;
  color: string;
  description: string;
  price: number;
  personality: ParrotPersonality;
}

export interface Parrot extends ParrotVariant {
  id: string;
  daysWithYou: number;
  tauntCount: number;
  goldLost: number;
  nextMischiefDay: number;
}

export interface PlayerAttributes {
  attack: number;    // 增加战斗胜率权重
  defense: number;   // 减少受到伤害的概率
  hp: number;        // 决定玩家是否受伤
  leadership: number; // 决定最大带兵数量 (base 20 + leadership * 5) 和 志愿兵招募数量
  medicine: number;  // 战斗结束后复活伤亡士兵的概率
  looting: number;   // 增加战利品金币
  training: number;  // 每日少量训练士兵
  commerce: number;  // 增加打工收入
  escape: number;    // 增加逃跑成功率
  negotiation: number;
}

export interface FallenRecord {
  id: string;
  unitName: string;
  count: number;
  day: number;
  battleName: string;
  cause: string;
}

export type FallenHeroRecord = {
  id: string;
  hero: Hero;
  day: number;
  battleName: string;
  cause: string;
};

export type HeroGiftRecord = {
  id: string;
  day: number;
  heroId: string;
  heroName: string;
  itemName: string;
  itemType: 'COFFEE' | 'FOOD';
  price: number;
  sourceLocationName?: string;
};

export type HeroRole = 'MAGE' | 'SWORDSMAN' | 'ARCHER' | 'SHIELD' | 'BARD';

export interface HeroAttributes {
  attack: number;
  hp: number;
  agility: number;
}

export type HeroChatLine = { role: 'PLAYER' | 'HERO'; text: string; day?: number };
export type HeroEmotion = 'ANGRY' | 'IDLE' | 'SILENT' | 'AWKWARD' | 'HAPPY' | 'SAD' | 'AFRAID' | 'SURPRISED' | 'DEAD';
export type HeroPermanentMemory = { id: string; text: string; createdAt: string; createdDay: number; roundIndex: number };
export type PartyDiaryEntry = { id: string; text: string; authorId?: string; authorName: string; createdAt: string; createdDay: number; roundIndex: number };

export type HeroAffinityLabel = '陌生' | '熟悉' | '友好' | '亲近' | '信赖' | '生死之交';

export type HeroProfile = {
  age: number;
  birthplaceId: string;
  birthplaceName: string;
  likes: string[];
  dislikes: string[];
};

export interface Hero {
  id: string;
  name: string;
  race?: RaceId;
  role: HeroRole;
  title: string;
  background: string;
  traits: string[];
  portrait: string;
  personality: string;
  profile?: HeroProfile;
  currentExpression: HeroEmotion;
  level: number;
  xp: number;
  maxXp: number;
  attributePoints: number;
  attributes: HeroAttributes;
  currentHp: number;
  maxHp: number;
  status: 'ACTIVE' | 'INJURED' | 'DEAD';
  recruited: boolean;
  joinedDay?: number;
  affinity?: HeroAffinityLabel;
  locationId?: string;
  stayDays?: number;
  quotes: string[];
  chatMemory: HeroChatLine[];
  permanentMemory: HeroPermanentMemory[];
  chatRounds: number;
}

export interface PlayerState {
  gold: number;
  renown: number;
  troops: Troop[];
  parrots: Parrot[];
  fallenRecords: FallenRecord[]; // Record of dead soldiers
  fallenHeroes?: FallenHeroRecord[];
  giftRecords: HeroGiftRecord[];
  day: number;
  name: string;
  level: number;
  xp: number;
  maxXp: number;
  attributePoints: number;
  attributes: PlayerAttributes;
  currentHp: number;
  maxHp: number;
  status: 'ACTIVE' | 'INJURED'; // 受伤状态无法战斗，随时间恢复
  position: { x: number; y: number }; // Map coordinates (Now 0-200)
  minerals: MineralInventory;
  anomalies: AnomalyInventory;
  relationMatrix: RelationMatrix;
  relationEvents: RelationEvent[];
  locationRelations: Record<string, number>;
  story?: {
    introSeen?: boolean;
    mainQuest?: string;
    mainQuestStage?: number;
    gameOverReason?: string;
  };
}

export interface EnemyForce {
  id?: string;
  name: string;
  description: string;
  troops: Troop[];
  difficulty: string;
  lootPotential: number;
  terrain: TerrainType;
  baseTroopId: string; // Used for identifying faction for taunts
  siegeEngines?: SiegeEngineType[];
}

export type TerrainType = 'PLAINS' | 'FOREST' | 'MOUNTAIN' | 'SNOW' | 'DESERT' | 'RUINS' | 'GRAVEYARD' | 'MARKET' | 'RESTAURANT' | 'BANDIT_CAMP' | 'CAVE';

export type FactionId = 'VERDANT_COVENANT' | 'FROST_OATH' | 'RED_DUNE';
export type FactionSpecialization = 'MELEE' | 'RANGED' | 'CAVALRY';

export type FactionInfo = {
  id: FactionId;
  name: string;
  shortName: string;
  description: string;
  focus: FactionSpecialization;
  color: string;
  specialTroopIds: string[];
};

export type LordFocus = 'WAR' | 'TRADE' | 'DEFENSE' | 'DIPLOMACY';

export type LordState = 'PATROLLING' | 'BESIEGING' | 'MARSHALLING' | 'FEASTING' | 'RESTING';

export type RaceId = 'HUMAN' | 'ROACH' | 'UNDEAD' | 'IMPOSTER' | 'BANDIT' | 'AUTOMATON' | 'VOID' | 'MADNESS' | 'BEAST' | 'GOBLIN';

export type TroopRace = RaceId | 'UNKNOWN';

export type BugSummonRecipe = {
  id: string;
  name: string;
  components: string[];
  troopId: string;
  tier: TroopTier;
  description: string;
};

export type RelationEvent = {
  id: string;
  day: number;
  targetType: 'FACTION' | 'RACE';
  targetId: string;
  delta: number;
  text: string;
};

export type RelationMatrix = {
  factions: Record<FactionId, number>;
  races: Record<RaceId, number>;
};

export type WorldDiplomacyEvent = {
  id: string;
  day: number;
  kind: 'FACTION_FACTION' | 'FACTION_RACE' | 'RACE_RACE';
  aId: string;
  bId: string;
  delta: number;
  text: string;
};

export type WorldDiplomacyState = {
  factionRelations: Record<FactionId, Record<FactionId, number>>;
  raceRelations: Record<RaceId, Record<RaceId, number>>;
  factionRaceRelations: Record<FactionId, Record<RaceId, number>>;
  events: WorldDiplomacyEvent[];
};

export interface Lord {
  id: string;
  name: string;
  title: string;
  factionId?: FactionId;
  fiefId: string;
  traits: string[];
  temperament: string;
  focus: LordFocus;
  relation: number;
  currentLocationId: string;
  state: LordState;
  stateSinceDay: number;
  targetLocationId?: string;
  travelDaysLeft?: number;
  travelPurpose?: string;
  arrivedDay?: number;
  visitPurpose?: string;
  partyTroops: Troop[];
  partyMaxCount?: number;
  lastAction?: { day: number; text: string };
  memories?: { day: number; text: string }[];
}

export type LocalLogEntry = {
  day: number;
  text: string;
};

export type NegotiationDecision = 'REFUSE' | 'RETREAT' | 'CONDITIONAL';

export type NegotiationResult = {
  decision: NegotiationDecision;
  reply: string;
  goldPercent?: number;
};

export interface BattleRound {
  roundNumber: number;
  description: string;
  casualtiesA: { name: string; count: number; cause: string }[];
  keyUnitDamageA: { name: string; hpLoss: number; cause: string }[];
  keyUnitDamageB: { name: string; hpLoss: number; cause: string }[];
  casualtiesB: { name: string; count: number; cause: string }[];
  actionQueue?: { name: string; side: 'A' | 'B' }[];
}

export interface BattleResult {
  rounds: BattleRound[];
  outcome: 'A' | 'B';
  lootGold: number;
  renownGained: number;
  xpGained: number; 
  remainingA?: Troop[];
  remainingB?: Troop[];
}

export type BattleBrief = {
  day: number;
  battleLocation: string;
  enemyName: string;
  outcome: BattleResult['outcome'];
  playerSide: string;
  enemySide: string;
  keyUnitDamageSummary: string;
};

export type BuildingType =
  | 'FACTORY'
  | 'TRAINING_CAMP'
  | 'BARRACKS'
  | 'DEFENSE'
  | 'RECRUITER'
  | 'AA_TOWER_I'
  | 'AA_TOWER_II'
  | 'AA_TOWER_III'
  | 'AA_NET_I'
  | 'AA_NET_II'
  | 'AA_RADAR_I'
  | 'AA_RADAR_II';
export type SiegeEngineType = 'RAM' | 'TOWER' | 'CATAPULT' | 'SIMPLE_LADDER';

export interface ConstructionQueueItem {
  type: BuildingType;
  daysLeft: number;
  totalDays: number;
}

export interface SiegeEngineQueueItem {
  type: SiegeEngineType;
  daysLeft: number;
  totalDays: number;
}

export type GameView = 'INTRO' | 'MAP' | 'TOWN' | 'BATTLE' | 'BATTLE_RESULT' | 'GAME_OVER' | 'PARTY' | 'CHARACTER' | 'TRAINING' | 'ASYLUM' | 'MARKET' | 'BANDIT_ENCOUNTER' | 'CAVE' | 'HERO_CHAT' | 'WORLD_BOARD' | 'TROOP_ARCHIVE' | 'RELATIONS';

export interface RecruitOffer {
  troopId: string;
  count: number;
  cost: number;
}

export interface StayParty {
  id: string;
  name: string;
  troops: Troop[];
  owner?: 'PLAYER' | 'ENEMY' | 'NEUTRAL';
  lordId?: string;
}

export type FieldCampKind = 'FACTION_RAID' | 'IMPOSTER_RAID' | 'LORD_MARCH' | 'CARAVAN';

export type FieldCampMeta = {
  kind: FieldCampKind;
  sourceLocationId: string;
  targetLocationId: string;
  totalDays: number;
  daysLeft: number;
  attackerName: string;
  leaderName: string;
  routeStart?: { x: number; y: number };
  routeEnd?: { x: number; y: number };
  goldMultiplier?: number;
};

export type HideoutLayer = {
  id: string;
  depth: number;
  name: string;
  garrison: Troop[];
  buildings: BuildingType[];
  constructionQueue: ConstructionQueueItem[];
  lastIncomeDay?: number;
  lastTrainingDay?: number;
  lastRecruitDay?: number;
  guardianHeroId?: string;
  garrisonBaseLimit?: number;
};

export type HideoutState = {
  layers: HideoutLayer[];
  selectedLayer?: number;
  lastRaidDay?: number;
};

export interface Location {
  id: string;
  name: string;
  type: 'VILLAGE' | 'CASTLE' | 'CITY' | 'RUINS' | 'TRAINING_GROUNDS' | 'ASYLUM' | 'GRAVEYARD' | 'MARKET' | 'HOTPOT_RESTAURANT' | 'BANDIT_CAMP' | 'MYSTERIOUS_CAVE' | 'COFFEE' | 'IMPOSTER_PORTAL' | 'WORLD_BOARD' | 'VOID_BUFFER_MINE' | 'MEMORY_OVERFLOW_MINE' | 'LOGIC_PARADOX_MINE' | 'HERO_CRYSTAL_MINE' | 'BLACKSMITH' | 'ROACH_NEST' | 'HEAVY_TRIAL_GROUNDS' | 'ALTAR' | 'MAGICIAN_LIBRARY' | 'SOURCE_RECOMPILER' | 'FIELD_CAMP' | 'HABITAT' | 'HIDEOUT';
  description: string;
  coordinates: { x: number; y: number };
  terrain: TerrainType;
  factionId?: FactionId;
  claimFactionId?: FactionId;
  
  // Dynamic Recruitment System
  lastRefreshDay: number;
  volunteers: RecruitOffer[]; // Low tier, cheap, resets often
  mercenaries: RecruitOffer[]; // High tier, expensive
  altar?: AltarState;

  owner?: 'PLAYER' | 'ENEMY' | 'NEUTRAL';
  isUnderSiege?: boolean;
  siegeProgress?: number;
  siegeEngines?: SiegeEngineType[];
  garrison?: Troop[];
  buildings?: BuildingType[];
  constructionQueue?: ConstructionQueueItem[];
  siegeEngineQueue?: SiegeEngineQueueItem[];
  lastIncomeDay?: number;
  lastTrainingDay?: number;
  lastRecruitDay?: number;
  banditSpawnDay?: number;
  lastInvasionDay?: number;
  imposterStayDays?: number;
  imposterRaidTargetId?: string;
  imposterRaidEtaDay?: number;
  imposterAlertUntilDay?: number;
  factionRaidTargetId?: string;
  factionRaidEtaDay?: number;
  factionRaidTroops?: Troop[];
  factionRaidAttackerName?: string;
  factionRaidFactionId?: FactionId;
  sackedUntilDay?: number;
  stayParties?: StayParty[];
  stationedArmies?: EnemyForce[];
  lord?: Lord;
  garrisonBaseLimit?: number;
  localLogs?: LocalLogEntry[];
  hideout?: HideoutState;
  activeSiege?: {
    attackerName: string;
    attackerFactionId?: FactionId;
    troops: Troop[];
    startDay: number;
    totalPower: number;
    siegeEngines?: SiegeEngineType[];
    hideoutLayerIndex?: number;
  };
  camp?: FieldCampMeta;
}

export type WorldBattleReport = {
  id: string;
  day: number;
  createdAt: string;
  battleLocation: string;
  enemyName: string;
  outcome: BattleResult['outcome'];
  playerSide: string;
  enemySide: string;
  keyUnitDamageSummary: string;
  rounds: BattleRound[];
};
