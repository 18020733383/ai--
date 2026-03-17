import React from 'react';
import { AlertTriangle, Beer, Brain, Coins, Ghost, Hammer, History, Home, MapPin, MessageCircle, Mountain, Plus, Scroll, Shield, ShieldAlert, Skull, Star, Swords, Users, Utensils, Zap } from 'lucide-react';
import { Button } from '../components/Button';
import { ThinkingBubble } from '../components/ThinkingBubble';
import { TroopCard } from '../components/TroopCard';
import { AltarRecruitSection, AltarSection, CoffeeChatSection, ForgeSection, GarrisonSection, HabitatSection, MagicianLibrarySection, MiningSection, RecompilerSection, RecruitSection, RoachLureSection, SealHabitatSection, TavernSection, WorkSection } from '../features/town';
import { chatWithCampLeader, chatWithLord } from '../services/geminiService';
import { ANOMALY_CATALOG } from '../constants';
import { CROP_DEFS, CROP_DEF_MAP, createFarmState, FARM_MAX_PLOTS, FARM_PLOT_UNLOCK_COST, getTroopRace, TROOP_RACE_LABELS } from '../game/data';
import { AIProvider, AltarDoctrine, AltarTroopDraft, Anomaly, BuildingType, CropId, EnemyForce, Enchantment, Hero, Location, Lord, LordFocus, MineralId, MineralPurity, PlayerState, RecruitOffer, SiegeEngineType, SoldierInstance, StayParty, Troop, TroopTier } from '../types';
import type { AltarRecruitState, HabitatStayState, HideoutStayState, MiningState, RoachLureState, TownTab, WorkState } from '../features/town/model/types';

export type TownViewProps = {
  currentLocation: Location | null;
  locations: Location[];
  lords: Lord[];
  player: PlayerState;
  heroes: Hero[];
  heroDialogue: { heroId: string; text: string } | null;
  setHeroDialogue: (value: { heroId: string; text: string } | null) => void;
  setHeroes: React.Dispatch<React.SetStateAction<Hero[]>>;
  addLog: (text: string) => void;
  playerRef: React.MutableRefObject<PlayerState>;
  townTab: TownTab;
  setTownTab: (tab: TownTab) => void;
  workDays: number;
  setWorkDays: (value: number) => void;
  miningDays: number;
  setMiningDays: (value: number) => void;
  roachLureDays: number;
  setRoachLureDays: (value: number) => void;
  hideoutStayDays: number;
  setHideoutStayDays: (value: number) => void;
  workState: WorkState | null;
  setWorkState: (value: WorkState | null) => void;
  miningState: MiningState | null;
  setMiningState: (value: MiningState | null) => void;
  roachLureState: RoachLureState | null;
  setRoachLureState: (value: RoachLureState | null) => void;
  habitatStayState: HabitatStayState | null;
  setHabitatStayState: (value: HabitatStayState | null) => void;
  hideoutStayState: HideoutStayState | null;
  setHideoutStayState: (value: HideoutStayState | null) => void;
  altarRecruitDays: number;
  setAltarRecruitDays: (value: number) => void;
  altarRecruitState: AltarRecruitState | null;
  setAltarRecruitState: (value: AltarRecruitState | null) => void;
  forgeTroopIndex: number | null;
  setForgeTroopIndex: (value: number | null) => void;
  forgeEnchantmentId: string | null;
  setForgeEnchantmentId: (value: string | null) => void;
  undeadDialogue: { role: 'PLAYER' | 'UNDEAD'; text: string }[];
  undeadChatInput: string;
  setUndeadChatInput: (value: string) => void;
  sendToUndead: () => void;
  isUndeadChatLoading: boolean;
  undeadChatListRef: React.RefObject<HTMLDivElement>;
  altarDialogues: Record<string, { role: 'PLAYER' | 'NPC'; text: string }[]>;
  setAltarDialogues: React.Dispatch<React.SetStateAction<Record<string, { role: 'PLAYER' | 'NPC'; text: string }[]>>>;
  altarDrafts: Record<string, AltarDoctrine>;
  setAltarDrafts: React.Dispatch<React.SetStateAction<Record<string, AltarDoctrine>>>;
  altarProposals: Record<string, { doctrine: AltarDoctrine; result: { npcReply: string; doctrineSummary: string; troops: AltarTroopDraft[] }; prevResult?: { npcReply: string; doctrineSummary: string; troops: AltarTroopDraft[] } }>;
  setAltarProposals: React.Dispatch<React.SetStateAction<Record<string, { doctrine: AltarDoctrine; result: { npcReply: string; doctrineSummary: string; troops: AltarTroopDraft[] }; prevResult?: { npcReply: string; doctrineSummary: string; troops: AltarTroopDraft[] } }>>>;
  isAltarLoading: boolean;
  setIsAltarLoading: React.Dispatch<React.SetStateAction<boolean>>;
  applyAltarProposal: () => void;
  altarChatListRef: React.RefObject<HTMLDivElement>;
  getBelieverStats: (troopIds: string[]) => { total: number; byTier: Record<number, number> };
  getMaxTroops: () => number;
  getTroopTemplate: (id: string) => Omit<Troop, 'count' | 'xp'> | undefined;
  buildGarrisonTroops: (location: Location) => Troop[];
  getGarrisonCount: (troops: Troop[]) => number;
  getGarrisonLimit: (location: Location) => number;
  getLocationDefenseDetails: (location: Location) => { wallLevel: number; wallName: string; wallDesc: string; mechanisms: { name: string; description: string }[]; flavorText: string; wallHp: number; mechanismHp: number; rangedHitBonus: number; rangedDamageBonus: number; meleeDamageReduction: number; antiAirPowerBonus: number; airstrikeDamageReduction: number };
  getSiegeEngineName: (type: SiegeEngineType) => string;
  siegeEngineOptions: { type: SiegeEngineType; name: string; cost: number; days: number; description: string }[];
  startSiegeBattle: (location: Location) => void;
  handleRecruitOffer: (offer: RecruitOffer, type: 'VOLUNTEER' | 'MERCENARY', amountToRecruit?: number) => void;
  updateLocationState: (location: Location) => void;
  setPlayer: React.Dispatch<React.SetStateAction<PlayerState>>;
  onRecruitHero: (hero: Hero) => void;
  onLordProvoked: (lord: Lord, location: Location) => void;
  setActiveEnemy: React.Dispatch<React.SetStateAction<EnemyForce | null>>;
  setPendingBattleMeta: React.Dispatch<React.SetStateAction<{ mode: 'FIELD' | 'SIEGE' | 'DEFENSE_AID'; targetLocationId?: string; siegeContext?: string } | null>>;
  setPendingBattleIsTraining: React.Dispatch<React.SetStateAction<boolean>>;
  onDefenseAidJoin: (location: Location, attacker: EnemyForce) => void;
  onBackToMap: () => void;
  onEnterBattle: () => void;
  isBattling: boolean;
  calculatePower: (troops: Troop[]) => number;
  getHeroRoleLabel: (role: Hero['role']) => string;
  enchantmentRecipes: Array<{ enchantment: Enchantment; costs: { mineralId: MineralId; purityMin: MineralPurity; amount: number }[] }>;
  mineralMeta: Record<MineralId, { name: string; effect: string }>;
  mineralPurityLabels: Record<MineralPurity, string>;
  mineConfigs: Partial<Record<Location['type'], { mineralId: MineralId; crystalName: string; effect: string }>>;
  initialMinerals: PlayerState['minerals'];
  buildingOptions: { type: BuildingType; name: string; cost: number; days: number; description: string }[];
  getBuildingName: (type: BuildingType) => string;
  processDailyCycle: (location?: Location, rentCost?: number, days?: number, workIncomePerDay?: number, suppressEncounter?: boolean) => void;
  updateLord: (lord: Lord) => void;
  aiProvider: AIProvider;
  doubaoApiKey: string;
  geminiApiKey: string;
  openAIBaseUrl: string;
  openAIKey: string;
  openAIModel: string;
  recentLogs: string[];
  playerReligionName: string | null;
  onPreachInCity: (locationId: string) => void;
  onInspectHideout: (layerIndex: number) => void;
  onConsumeRecompilerSoldier: (payload: { soldierId: string; troopId: string; goldCost: number; crystalTier: number }) => void;
};

export const TownView = ({
  currentLocation,
  locations,
  lords,
  player,
  heroes,
  heroDialogue,
  setHeroDialogue,
  setHeroes,
  addLog,
  playerRef,
  townTab,
  setTownTab,
  workDays,
  setWorkDays,
  miningDays,
  setMiningDays,
  roachLureDays,
  setRoachLureDays,
  hideoutStayDays,
  setHideoutStayDays,
  workState,
  setWorkState,
  miningState,
  setMiningState,
  roachLureState,
  setRoachLureState,
  habitatStayState,
  setHabitatStayState,
  hideoutStayState,
  setHideoutStayState,
  altarRecruitDays,
  setAltarRecruitDays,
  altarRecruitState,
  setAltarRecruitState,
  forgeTroopIndex,
  setForgeTroopIndex,
  forgeEnchantmentId,
  setForgeEnchantmentId,
  undeadDialogue,
  undeadChatInput,
  setUndeadChatInput,
  sendToUndead,
  isUndeadChatLoading,
  undeadChatListRef,
  altarDialogues,
  setAltarDialogues,
  altarDrafts,
  setAltarDrafts,
  altarProposals,
  setAltarProposals,
  isAltarLoading,
  setIsAltarLoading,
  applyAltarProposal,
  altarChatListRef,
  getBelieverStats,
  getMaxTroops,
  getTroopTemplate,
  buildGarrisonTroops,
  getGarrisonCount,
  getGarrisonLimit,
  getLocationDefenseDetails,
  getSiegeEngineName,
  siegeEngineOptions,
  startSiegeBattle,
  handleRecruitOffer,
  updateLocationState,
  setPlayer,
  onRecruitHero,
  onLordProvoked,
  setActiveEnemy,
  setPendingBattleMeta,
  setPendingBattleIsTraining,
  onDefenseAidJoin,
  onBackToMap,
  onEnterBattle,
  isBattling,
  calculatePower,
  getHeroRoleLabel,
  enchantmentRecipes,
  mineralMeta,
  mineralPurityLabels,
  mineConfigs,
  initialMinerals,
  buildingOptions,
  getBuildingName,
  processDailyCycle,
  updateLord,
  aiProvider,
  doubaoApiKey,
  geminiApiKey,
  openAIBaseUrl,
  openAIKey,
  openAIModel,
  recentLogs,
  playerReligionName,
  onPreachInCity,
  onInspectHideout,
  onConsumeRecompilerSoldier
}: TownViewProps) => {
  if (!currentLocation) return null;

  const getBgImageStyle = () => {
    const type = currentLocation.type;
    const bgType = type === 'FIELD_CAMP'
      ? 'BANDIT_CAMP'
      : type === 'HIDEOUT'
        ? 'RUINS'
        : type === 'CRYSTAL_FOUNDRY'
          ? 'BLACKSMITH'
          : type === 'MEGA_FARM'
            ? 'VILLAGE'
            : type;
    return {
      backgroundImage: `url("/image/locations/${bgType}.png"), url("/image/locations/${bgType}.jpg"), url("/image/locations/${bgType}.jpeg"), url("/image/${bgType}.webp"), url("/image/${bgType}.png"), url("/image/${bgType}.jpg"), url("/image/${bgType}.jpeg")`,
      backgroundSize: 'cover',
      backgroundPosition: 'center'
    };
  };

  const isCity = currentLocation.type === 'CITY';
  const isCastle = currentLocation.type === 'CASTLE';
  const isVillage = currentLocation.type === 'VILLAGE';
  const isRoachNest = currentLocation.type === 'ROACH_NEST';
  const isGraveyard = currentLocation.type === 'GRAVEYARD';
  const isUndeadFortress = isGraveyard && currentLocation.id.startsWith('death_');
  const isSiegeTarget = isCity || isCastle || isVillage || isRoachNest || isUndeadFortress;
  const isHotpot = currentLocation.type === 'HOTPOT_RESTAURANT';
  const isCoffee = currentLocation.type === 'COFFEE';
  const isHabitat = currentLocation.type === 'HABITAT';
  const isSealHabitat = currentLocation.type === 'SEAL_HABITAT';
  const isHideout = currentLocation.type === 'HIDEOUT';
  const isHeavyTrialGrounds = currentLocation.type === 'HEAVY_TRIAL_GROUNDS';
  const isImposterPortal = currentLocation.type === 'IMPOSTER_PORTAL';
  const isAltar = currentLocation.type === 'ALTAR';
  const mineConfig = mineConfigs[currentLocation.type];
  const isMine = !!mineConfig;
  const isBlacksmith = currentLocation.type === 'BLACKSMITH';
  const isCrystalFoundry = currentLocation.type === 'CRYSTAL_FOUNDRY';
  const isMegaFarm = currentLocation.type === 'MEGA_FARM';
  const isMagicianLibrary = currentLocation.type === 'MAGICIAN_LIBRARY';
  const isRecompiler = currentLocation.type === 'SOURCE_RECOMPILER';
  const isFieldCamp = currentLocation.type === 'FIELD_CAMP';
  const isSpecialLocation = isMine || isBlacksmith || isCrystalFoundry || isMegaFarm || isAltar || isMagicianLibrary || isRecompiler || isSealHabitat;
  const isOwnedByPlayer = currentLocation.owner === 'PLAYER';
  const locationRelationValue = player.locationRelations?.[currentLocation.id] ?? 0;
  const isWantedHere = !isOwnedByPlayer && (isCity || isCastle || isVillage) && locationRelationValue <= -60;
  const isRestrictedEnemyHeld = currentLocation.owner === 'ENEMY' && (isCity || isCastle || isVillage) && !currentLocation.factionId;
  const isRestricted = (currentLocation.sackedUntilDay ?? 0) >= player.day || isRestrictedEnemyHeld || !!currentLocation.isUnderSiege;
  const restrictedTabs = ['RECRUIT', 'TAVERN', 'WORK', 'MEMORIAL', 'COFFEE_CHAT', 'OWNED', 'MINING', 'FORGE', 'ROACH_LURE', 'LORD', 'MAGICIAN_LIBRARY', 'RECOMPILER'];
  const specialHiddenTabs = ['RECRUIT', 'GARRISON', 'LOCAL_GARRISON', 'DEFENSE', 'SIEGE', 'OWNED', 'TAVERN', 'WORK', 'MEMORIAL', 'COFFEE_CHAT', 'LORD'];
  const specialFallbackTab = isMine ? 'MINING' : isBlacksmith ? 'FORGE' : isCrystalFoundry ? 'FOUNDRY' : isMegaFarm ? 'FARM' : isAltar ? 'ALTAR' : isMagicianLibrary ? 'MAGICIAN_LIBRARY' : isRecompiler ? 'RECOMPILER' : isSealHabitat ? 'SEAL_HABITAT' : 'LOCAL_GARRISON';
  const activeTownTab = isHideout
    ? 'HIDEOUT'
    : (isOwnedByPlayer && townTab === 'LORD')
    ? 'LOCAL_GARRISON'
    : (isFieldCamp && townTab !== 'SIEGE' && townTab !== 'DEFENSE' && townTab !== 'LORD')
      ? 'SIEGE'
    : (isSpecialLocation && specialHiddenTabs.includes(townTab))
      ? specialFallbackTab
      : (isRestricted && restrictedTabs.includes(townTab))
        ? 'LOCAL_GARRISON'
        : (isImposterPortal && townTab !== 'IMPOSTER_STATIONED' && townTab !== 'DEFENSE' && townTab !== 'LOCAL_GARRISON' && townTab !== 'SIEGE')
          ? 'LOCAL_GARRISON'
          : townTab;

  const recruitLabel = isGraveyard ? "挖掘尸体" : isHotpot ? "点菜 (招募)" : isCoffee ? "招募亡灵" : isHabitat ? "招募野兽" : isHeavyTrialGrounds ? "采购重型单位" : "征募志愿兵";
  const [habitatStayDays, setHabitatStayDays] = React.useState(10);

  const coffeeGiftItems = [
    { id: 'coffee_black', name: '黑咖啡', price: 30, itemType: 'COFFEE' as const },
    { id: 'coffee_milk', name: '奶咖', price: 60, itemType: 'COFFEE' as const },
    { id: 'coffee_sigil', name: '符文浓缩咖啡', price: 120, itemType: 'COFFEE' as const },
    { id: 'cake_bone', name: '骨粉小蛋糕', price: 80, itemType: 'FOOD' as const },
    { id: 'stew_midnight', name: '午夜炖肉', price: 160, itemType: 'FOOD' as const }
  ];
  const giftableHeroes = heroes.filter(h => h.recruited && h.status !== 'DEAD');
  const [coffeeGiftHeroId, setCoffeeGiftHeroId] = React.useState<string>(() => giftableHeroes[0]?.id ?? '');
  const [coffeeGiftItemId, setCoffeeGiftItemId] = React.useState<string>(() => coffeeGiftItems[0].id);
  const [coffeeGiftError, setCoffeeGiftError] = React.useState<string | null>(null);
  const [farmNow, setFarmNow] = React.useState(() => Date.now());
  const tavernLabel = "前往酒馆";

  const woundedTroopCount = (player.woundedTroops ?? []).reduce((sum, e) => sum + (e.count ?? 0), 0);
  const activeTroopCount = player.troops.reduce((a, b) => a + b.count, 0);
  const currentTroopCount = activeTroopCount + woundedTroopCount;
  const maxTroops = getMaxTroops();
  const cityRestCost = 5;
  const canRestInCity = player.gold >= cityRestCost;
  const altarDialogue = altarDialogues[currentLocation.id] ?? [];
  const altarDraft = { religionName: '', domain: '', spread: '', blessing: '', ...(altarDrafts[currentLocation.id] ?? {}) };
  const altarProposal = altarProposals[currentLocation.id];
  const altarHasTree = (currentLocation.altar?.troopIds ?? []).length > 0;
  const altarState = currentLocation.altar;
  const believerStats = getBelieverStats(altarState?.troopIds ?? []);
  const prevAltarTroops = altarProposal?.prevResult?.troops ?? [];
  const prevDoctrineSummary = altarProposal?.prevResult?.doctrineSummary ?? '';
  const doctrineSummaryChanged = !!prevDoctrineSummary && prevDoctrineSummary !== (altarProposal?.result?.doctrineSummary ?? '');
  const isAltarRecruiting = altarRecruitState?.isActive && altarRecruitState.locationId === currentLocation.id;
  const tavernHeroes = isCity ? heroes.filter(h => !h.recruited && h.locationId === currentLocation.id) : [];
  const activeHero = heroDialogue ? heroes.find(h => h.id === heroDialogue.heroId) ?? null : null;
  const ownerLord = currentLocation.lord
    ? lords.find(lord => lord.id === currentLocation.lord?.id) ?? currentLocation.lord
    : null;
  const lordsHere = isFieldCamp
    ? (ownerLord ? [ownerLord] : [])
    : lords.filter(lord => lord.currentLocationId === currentLocation.id && !lord.travelDaysLeft);
  const [selectedLordId, setSelectedLordId] = React.useState<string | null>(null);
  const selectedLord = lordsHere.find(lord => lord.id === selectedLordId) ?? lordsHere[0] ?? null;
  const currentLord = selectedLord;

  React.useEffect(() => {
    if (isAltar && activeTownTab === 'ALTAR_RECRUIT' && !altarHasTree) {
      setTownTab('ALTAR');
    }
  }, [isAltar, activeTownTab, altarHasTree, setTownTab]);
  React.useEffect(() => {
    if (!isMegaFarm || activeTownTab !== 'FARM') return;
    const timer = window.setInterval(() => setFarmNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [isMegaFarm, activeTownTab]);
  const hasLord = (!!ownerLord || lordsHere.length > 0) && !isOwnedByPlayer;
  const lordFocusLabels: Record<LordFocus, string> = {
    WAR: '扩张',
    TRADE: '贸易',
    DEFENSE: '防御',
    DIPLOMACY: '外交'
  };
  const getLordRelationLabel = (value: number) => {
    if (value >= 60) return '亲密';
    if (value >= 30) return '友好';
    if (value >= 10) return '熟悉';
    if (value >= -10) return '中立';
    if (value >= -30) return '疏远';
    return '敌视';
  };
  const getLocationRelationLabel = (value: number) => {
    if (value >= 60) return '拥戴';
    if (value >= 30) return '友善';
    if (value >= 10) return '熟悉';
    if (value >= -10) return '中立';
    if (value >= -30) return '冷淡';
    if (value >= -60) return '敌视';
    return '通缉';
  };
  const getLocationRelationFlavor = (value: number) => {
    if (value >= 60) return '这里的人把你当作英雄般谈论。';
    if (value >= 30) return '这里的居民都用友善的目光看着你。';
    if (value >= 10) return '你在这里已经不算陌生人了。';
    if (value >= -10) return '人们对你不冷不热，各做各的事。';
    if (value >= -30) return '你能感觉到一些躲闪与警惕。';
    if (value >= -60) return '守卫会盯着你，手始终没离开武器。';
    return '你发现自己在通缉令上。';
  };
  const getStayPartyOwnerLabel = (party: StayParty) => {
    if (party.owner === 'PLAYER') return '玩家';
    if (party.lordId) {
      const partyLord = lords.find(lord => lord.id === party.lordId);
      return partyLord?.name ?? '领主';
    }
    if (party.owner === 'ENEMY') return '敌军';
    return '中立';
  };
  const getLocationNameById = (locationId?: string | null) => {
    if (!locationId) return '未知';
    return locations.find(loc => loc.id === locationId)?.name ?? '未知';
  };
  const [lordDialogue, setLordDialogue] = React.useState<{ role: 'PLAYER' | 'LORD'; text: string }[]>([]);
  const [lordChatInput, setLordChatInput] = React.useState('');
  const [isLordChatLoading, setIsLordChatLoading] = React.useState(false);
  React.useEffect(() => {
    if (lordsHere.length === 0) {
      setSelectedLordId(null);
      setLordDialogue([]);
      return;
    }
    if (!selectedLordId || !lordsHere.some(lord => lord.id === selectedLordId)) {
      setSelectedLordId(lordsHere[0].id);
    }
  }, [currentLocation.id, lordsHere.length, selectedLordId]);
  React.useEffect(() => {
    if (!selectedLord) {
      setLordDialogue([]);
      return;
    }
    setLordDialogue([{ role: 'LORD', text: `${selectedLord.title}${selectedLord.name} 正在 ${currentLocation.name} 接见来访者。` }]);
  }, [currentLocation.id, selectedLord?.id]);

  const talkToHero = (hero: Hero) => {
    const line = hero.quotes[Math.floor(Math.random() * hero.quotes.length)] ?? `${hero.name} 静静地看着你。`;
    setHeroDialogue({ heroId: hero.id, text: line });
  };

  const getHeroRecruitCost = (hero: Hero) => {
    const atk = Math.max(0, hero.attributes?.attack ?? 0);
    const agi = Math.max(0, hero.attributes?.agility ?? 0);
    const hp = Math.max(0, hero.attributes?.hp ?? 0);
    const lvl = Math.max(0, hero.level ?? 0);
    const base = 120;
    const statCost = atk * 8 + agi * 8 + hp * 2;
    const levelCost = lvl * 18;
    return Math.max(60, Math.min(500, Math.floor(base + statCost + levelCost)));
  };

  const recruitHero = (hero: Hero) => {
    if (hero.recruited) return;
    const cost = getHeroRecruitCost(hero);
    if (player.gold < cost) {
      addLog("资金不足，无法招募该英雄。");
      return;
    }
    setPlayer(prev => ({ ...prev, gold: Math.max(0, prev.gold - cost) }));
    setHeroes(prev => prev.map(h => h.id === hero.id ? {
      ...h,
      recruited: true,
      joinedDay: playerRef.current.day,
      affinity: '陌生',
      locationId: undefined,
      stayDays: undefined
    } : h));
    setHeroDialogue(null);
    onRecruitHero(hero);
    addLog(`你花费 ${cost} 第纳尔招募了 ${hero.name}。`);
  };
  const workIncomePerDay = 20 + Math.max(0, player.attributes.commerce ?? 0) * 5;
  const mineralInventory = player.minerals ?? initialMinerals;
  const anomalyInventory = player.anomalies ?? {};
  const anomalyPools = (Object.keys(mineralMeta) as MineralId[]).reduce((acc, mineralId) => {
    acc[mineralId] = ANOMALY_CATALOG.filter(anomaly => anomaly.crystal === mineralId);
    return acc;
  }, {} as Record<MineralId, Anomaly[]>);
  const ownedAnomalies = Object.entries(anomalyInventory)
    .map(([id, count]) => ({
      anomaly: ANOMALY_CATALOG.find(item => item.id === id),
      count
    }))
    .filter(item => item.anomaly && item.count > 0)
    .sort((a, b) => (a.anomaly?.tier ?? 0) - (b.anomaly?.tier ?? 0));
  const BULLET_YIELD_BY_PURITY: Record<MineralPurity, number> = { 1: 1, 2: 2, 3: 4, 4: 7, 5: 11 };
  const foundryRecruitTemplate = getTroopTemplate('magic_flintlock_recruit');
  const farmState = isMegaFarm ? (currentLocation.farm ?? createFarmState(2)) : null;
  const getFoundryBulletYield = (mineralId: MineralId) => {
    const record = mineralInventory[mineralId] ?? { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    return ([1, 2, 3, 4, 5] as MineralPurity[]).reduce((sum, purity) => sum + (record[purity] ?? 0) * BULLET_YIELD_BY_PURITY[purity], 0);
  };
  const getFarmUnlockCost = (unlockedPlots: number) => FARM_PLOT_UNLOCK_COST + Math.max(0, unlockedPlots - 2) * 140;
  const formatCountdown = (targetMs?: number) => {
    if (!targetMs) return '未种植';
    const remaining = Math.max(0, targetMs - farmNow);
    if (remaining <= 0) return '已成熟';
    const totalSeconds = Math.ceil(remaining / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    if (hours > 0) return `${hours}小时${minutes}分`;
    if (minutes > 0) return `${minutes}分${seconds}秒`;
    return `${seconds}秒`;
  };
  const pushLordLine = (role: 'PLAYER' | 'LORD', text: string) => {
    setLordDialogue(prev => [...prev, { role, text }].slice(-16));
  };
  const summarizeTroops = (troops: Troop[]) => {
    const lines = troops
      .filter(t => t.count > 0)
      .map(t => {
        const template = getTroopTemplate(t.id);
        const name = template?.name ?? t.name ?? t.id;
        return `${name}x${t.count}`;
      });
    return lines.length > 0 ? lines.join('、') : '（无）';
  };
  const buildLordGarrisonSummary = () => {
    const garrison = currentLocation.garrison ?? [];
    const lordParty = (currentLocation.stayParties ?? []).find(p => p.lordId && p.lordId === currentLord?.id);
    const lordTroops = lordParty ? [...garrison, ...lordParty.troops] : garrison;
    const lordPower = calculatePower(lordTroops);
    const playerPower = calculatePower(player.troops);
    const ratio = playerPower > 0 ? lordPower / playerPower : lordPower > 0 ? 2 : 1;
    const ratioText = playerPower > 0 ? `约为玩家的${ratio.toFixed(1)}倍` : '无法比较';
    const parts = [
      `驻军：${summarizeTroops(garrison)}`,
      lordParty ? `亲卫：${summarizeTroops(lordParty.troops)}` : null,
      `战力对比：领主约${Math.round(lordPower)}，玩家约${Math.round(playerPower)}（${ratioText}）`
    ].filter(Boolean) as string[];
    return parts.join('\n');
  };
  const hashString = (value: string) => {
    let hash = 0;
    for (let i = 0; i < value.length; i += 1) {
      hash = (hash << 5) - hash + value.charCodeAt(i);
      hash |= 0;
    }
    return Math.abs(hash);
  };
  const clampValue = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));
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
    return clampValue(base + traitSum, -40, 30);
  };
  const buildXenoRelation = (lord: NonNullable<Location['lord']>, otherRace: 'HUMAN' | 'ROACH') => {
    const acceptance = getXenoAcceptanceScore(lord.temperament, lord.traits || []);
    const base = otherRace === 'ROACH' ? -48 : -42;
    const jitter = (hashString(`${lord.id}:${otherRace}`) % 9) - 4;
    return clampValue(base + Math.round(acceptance / 2) + jitter, -80, 20);
  };
  const buildSameRaceRelation = (lord: NonNullable<Location['lord']>, other: NonNullable<Location['lord']>, sameFactionBonus: number) => {
    const base = (hashString(`${lord.id}:${other.id}`) % 61) - 30;
    const temperamentBias = Math.round(getXenoAcceptanceScore(lord.temperament, lord.traits || []) / 4);
    return clampValue(base + temperamentBias + sameFactionBonus, -60, 60);
  };
  const buildLordRaceContext = () => {
    if (!currentLord) return null;
    const getLocationRaceTag = (loc: Location): 'ROACH' | 'HUMAN' | 'UNDEAD' =>
      loc.type === 'ROACH_NEST' ? 'ROACH' : loc.type === 'GRAVEYARD' ? 'UNDEAD' : 'HUMAN';
    const currentRace = getLocationRaceTag(currentLocation);
    const otherRace: 'ROACH' | 'HUMAN' = currentRace === 'ROACH' ? 'HUMAN' : 'ROACH';
    const resolvedOtherRace: 'ROACH' | 'HUMAN' = currentRace === 'UNDEAD' ? 'HUMAN' : otherRace;
    const playerTroops = playerRef.current.troops ?? [];
    const playerTotal = playerTroops.reduce((sum, troop) => sum + troop.count, 0);
    const playerRaceCounts = playerTroops.reduce((acc, troop) => {
      const race = getTroopRace(troop);
      acc[race] = (acc[race] ?? 0) + troop.count;
      return acc;
    }, {} as Record<string, number>);
    const playerRaceEntries = Object.entries(playerRaceCounts)
      .map(([race, count]) => ({
        id: race,
        label: TROOP_RACE_LABELS[race as keyof typeof TROOP_RACE_LABELS] ?? '未知',
        count,
        ratio: playerTotal > 0 ? Math.round((count / playerTotal) * 100) : 0
      }))
      .sort((a, b) => b.count - a.count);
    const sameRaceLocations = locations.filter(loc => loc.lord && getLocationRaceTag(loc) === currentRace);
    const sameRaceLords = sameRaceLocations
      .filter(loc => loc.lord && loc.lord.id !== currentLord.id)
      .map(loc => {
        const other = loc.lord!;
        const sameFactionBonus = currentRace === 'HUMAN' && other.factionId === currentLord.factionId ? 8 : 0;
        return {
          id: other.id,
          name: other.name,
          title: other.title,
          temperament: other.temperament,
          traits: other.traits || [],
          relation: buildSameRaceRelation(currentLord, other, sameFactionBonus)
        };
      })
      .slice(0, 12);
    const otherRaceCandidates = locations.filter(loc => loc.lord && getLocationRaceTag(loc) === resolvedOtherRace);
    const otherRaceLeader = resolvedOtherRace === 'HUMAN'
      ? otherRaceCandidates.find(loc => loc.type === 'CITY') ?? otherRaceCandidates.find(loc => loc.type === 'CASTLE') ?? otherRaceCandidates[0]
      : otherRaceCandidates[0];
    const otherRaceRelation = buildXenoRelation(currentLord, resolvedOtherRace);
    const leaderAttitude = otherRaceLeader?.lord
      ? clampValue(otherRaceRelation + ((hashString(`${currentLord.id}:${otherRaceLeader.lord.id}`) % 11) - 5), -90, 30)
      : undefined;
    const otherCount = playerTotal - (playerRaceCounts[currentRace] ?? 0);
    const otherRatio = playerTotal > 0 ? otherCount / playerTotal : 0;
    const xenoScore = getXenoAcceptanceScore(currentLord.temperament, currentLord.traits || []);
    const xenophobiaPenalty = playerTotal > 0 && otherRatio >= 0.35 && xenoScore <= -10 ? -1 : 0;
    return {
      race: currentRace,
      sameRaceLords,
      otherRace: {
        label: resolvedOtherRace === 'ROACH' ? '蟑螂' : '人类',
        relation: otherRaceRelation,
        leader: otherRaceLeader?.lord
          ? {
              name: otherRaceLeader.lord.name,
              title: otherRaceLeader.lord.title,
              attitude: leaderAttitude ?? otherRaceRelation
            }
          : null
      },
      playerTroops: {
        total: playerTotal,
        entries: playerRaceEntries
      },
      xenophobiaPenalty
    };
  };
  const buildLordAttackPlan = (ratio: number) => {
    const garrison = currentLocation.garrison ?? [];
    const stayParties = currentLocation.stayParties ?? [];
    const lordPartyIndex = stayParties.findIndex(p => p.lordId && p.lordId === currentLord?.id);
    const lordParty = lordPartyIndex >= 0 ? stayParties[lordPartyIndex] : null;
    const pickTroops = (troops: Troop[]) => {
      const used: Troop[] = [];
      const remaining: Troop[] = [];
      troops.forEach(t => {
        if (!t || t.count <= 0) return;
        const sendCount = Math.min(t.count, Math.max(1, Math.floor(t.count * ratio)));
        if (sendCount > 0) {
          used.push({ ...t, count: sendCount });
        }
        const left = t.count - sendCount;
        if (left > 0) {
          remaining.push({ ...t, count: left });
        }
      });
      return { used, remaining };
    };
    const garrisonPick = pickTroops(garrison);
    const lordPick = lordParty ? pickTroops(lordParty.troops) : { used: [], remaining: [] };
    const nextStayParties = lordParty
      ? stayParties.map((p, idx) => idx === lordPartyIndex ? { ...p, troops: lordPick.remaining } : p)
      : stayParties;
    const updatedLocation: Location = {
      ...currentLocation,
      garrison: garrisonPick.remaining,
      stayParties: nextStayParties
    };
    const troops = [...garrisonPick.used, ...lordPick.used];
    return troops.length > 0 ? { troops, updatedLocation } : null;
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
  const updateLordData = (updates: Partial<Lord>) => {
    if (!currentLord) return;
    updateLord({ ...currentLord, ...updates });
  };
  const updateLordRelation = (delta: number) => {
    if (!currentLord) return;
    const nextRelation = Math.max(-100, Math.min(100, currentLord.relation + delta));
    if (nextRelation === currentLord.relation) return;
    updateLord({ ...currentLord, relation: nextRelation });
  };
  const handleLordGreeting = () => {
    if (!currentLord) return;
    pushLordLine('PLAYER', '向你致意。');
    pushLordLine('LORD', `${currentLord.name} 点了点头。`);
    updateLordRelation(1);
    addLog(`你向 ${currentLord.name} 致意。`);
  };
  const handleLordGift = () => {
    if (!currentLord) return;
    const cost = 50;
    if (player.gold < cost) {
      addLog('资金不足，无法赠礼。');
      return;
    }
    setPlayer(prev => ({ ...prev, gold: prev.gold - cost }));
    pushLordLine('PLAYER', '奉上礼物。');
    pushLordLine('LORD', `${currentLord.name} 接受了礼物，语气缓和了些。`);
    updateLordRelation(8);
    addLog(`你向 ${currentLord.name} 赠礼。`);
  };
  const handleLordPolicy = () => {
    if (!currentLord) return;
    const focusLabel = lordFocusLabels[currentLord.focus];
    pushLordLine('PLAYER', '打听近期方略。');
    pushLordLine('LORD', `我的方针是${focusLabel}，封地会按此筹划。`);
  };
  const handleLordRecent = () => {
    if (!currentLord) return;
    pushLordLine('PLAYER', '询问近况。');
    if (currentLord.relation < 10) {
      pushLordLine('LORD', '你我尚不熟，此事不便多言。');
      return;
    }
    const last = currentLord.lastAction;
    if (last) {
      pushLordLine('LORD', `近况：${last.text}（第${last.day}天）。`);
      const localLogs = currentLocation.localLogs ?? [];
      if (localLogs.length > 0) {
        const brief = localLogs.slice(0, 3).map(entry => entry.text).join('，');
        pushLordLine('LORD', `据点近日报告：${brief}。`);
      }
      return;
    }
    pushLordLine('LORD', '近日未有特别举措。');
  };
  const handleGuardInquiry = () => {
    pushLordLine('PLAYER', '向守卫询问领主去向。');
    if (!ownerLord) {
      pushLordLine('LORD', '守卫摇头：此处并无领主坐镇。');
      return;
    }
    if (ownerLord.currentLocationId === currentLocation.id && !ownerLord.travelDaysLeft) {
      pushLordLine('LORD', `守卫低声道：${ownerLord.title}${ownerLord.name} 正在此地处理事务。`);
      return;
    }
    if (ownerLord.travelDaysLeft && ownerLord.targetLocationId) {
      const destination = getLocationNameById(ownerLord.targetLocationId);
      pushLordLine('LORD', `守卫答复：领主正率部前往 ${destination}，预计还有 ${ownerLord.travelDaysLeft} 天抵达。`);
      return;
    }
    const locationName = getLocationNameById(ownerLord.currentLocationId);
    pushLordLine('LORD', `守卫答复：领主目前驻扎在 ${locationName}。`);
  };
  const sendToLord = async () => {
    if (!currentLord) return;
    if (isLordChatLoading) return;
    const text = lordChatInput.trim();
    if (!text) return;
    const nextDialogue = [...lordDialogue, { role: 'PLAYER' as const, text }];
    setLordDialogue(nextDialogue);
    setLordChatInput('');
    setIsLordChatLoading(true);
    try {
      const aiConfig = buildAIConfig();
      if (isFieldCamp) {
        const target = currentLocation.camp?.targetLocationId
          ? locations.find(loc => loc.id === currentLocation.camp?.targetLocationId) ?? null
          : null;
        const playerPower = calculatePower(playerRef.current.troops);
        const campPower = calculatePower(currentLocation.garrison ?? []);
        const reply = await chatWithCampLeader(nextDialogue, currentLord, playerRef.current, currentLocation, target, playerPower, campPower, aiConfig);
        setLordDialogue(prev => [...prev, { role: 'LORD' as const, text: reply }].slice(-16));
        return;
      }
      const raceContext = buildLordRaceContext();
      const homeFief = locations.find(loc => loc.id === currentLord.fiefId) ?? null;
      const arrivedDayRaw = typeof (currentLord as any).arrivedDay === 'number'
        ? Math.floor((currentLord as any).arrivedDay)
        : Math.floor(currentLord.stateSinceDay ?? playerRef.current.day);
      const stayDays = Math.max(0, Math.floor(playerRef.current.day) - arrivedDayRaw);
      const stateLabel = currentLord.state === 'RESTING'
        ? '休整补员'
        : currentLord.state === 'MARSHALLING'
          ? '集结待命'
          : currentLord.state === 'BESIEGING'
            ? '指挥围攻'
            : currentLord.state === 'FEASTING'
              ? '赴宴交际'
              : '巡逻';
      const visitPurpose = String((currentLord as any).visitPurpose ?? '').trim() || stateLabel;
      const hostText = ownerLord ? `${ownerLord.title}${ownerLord.name}` : '（无）';
      const isGuest = !!ownerLord && ownerLord.id !== currentLord.id;
      const roleText = isGuest
        ? `- 当前地点: ${currentLocation.name}（${currentLocation.type}）\n- 身份: 你是这里的客人（统治者是 ${hostText}）\n- 注意: 你不是此地统治者，用“来访/借宿/会晤”的口吻\n- 抵达: 第${arrivedDayRaw}天（已停留${stayDays}天）\n- 到访目的: ${visitPurpose}\n- 你最近动作: ${currentLord.lastAction ? `${currentLord.lastAction.text}（第${currentLord.lastAction.day}天）` : '（无）'}`
        : `- 当前地点: ${currentLocation.name}（${currentLocation.type}）\n- 身份: 你是这里的统治者\n- 近况: ${currentLord.lastAction ? `${currentLord.lastAction.text}（第${currentLord.lastAction.day}天）` : '（无）'}\n- 当前事务: ${stateLabel}（自第${currentLord.stateSinceDay}天起）`;
      const homeText = homeFief
        ? `- 名称: ${homeFief.name}\n- 类型: ${homeFief.type}\n- 归属: ${homeFief.owner ?? 'NEUTRAL'}\n- 势力: ${homeFief.factionId ?? '（无）'}\n- 是否围攻: ${homeFief.isUnderSiege ? '是' : '否'}`
        : '（未知）';
      const homeLocalText = homeFief
        ? (homeFief.localLogs ?? []).slice(0, 6).map(entry => `- 第${entry.day}天：${entry.text}`).join('\n') || '（无）'
        : '（无）';
      const response = await chatWithLord(
        nextDialogue,
        currentLord,
        playerRef.current,
        currentLocation,
        recentLogs,
        currentLocation.localLogs ?? [],
        buildLordGarrisonSummary(),
        raceContext,
        { roleText, homeText, homeLocalText },
        aiConfig
      );
      const reply = response.reply;
      setLordDialogue(prev => [...prev, { role: 'LORD' as const, text: reply }].slice(-16));
      const baseDelta = Math.max(-2, Math.min(2, Number(response.relationDelta ?? 0)));
      const racePenalty = raceContext?.xenophobiaPenalty ?? 0;
      const relationDelta = Math.max(-2, Math.min(2, baseDelta + racePenalty));
      const memory = String(response.memory ?? '').trim();
      if (relationDelta !== 0 || memory) {
        const nextRelation = Math.max(-100, Math.min(100, currentLord.relation + relationDelta));
        const nextMemories = memory
          ? [{ day: playerRef.current.day, text: memory }, ...(currentLord.memories ?? [])].slice(0, 10)
          : currentLord.memories;
        updateLordData({ relation: nextRelation, memories: nextMemories });
      }
      if (response.attack) {
        const attackRatio = Number(response.attackRatio ?? 0.4);
        const attackPlan = buildLordAttackPlan(Number.isFinite(attackRatio) ? attackRatio : 0.4);
        if (attackPlan) {
          const reasonText = String(response.attackReason ?? '').trim();
          const locationId = currentLocation.id;
          updateLocationState(attackPlan.updatedLocation);
          addLog(`${currentLord.name} 忍无可忍，派兵来袭${reasonText ? `（${reasonText}）` : ''}。`);
            onLordProvoked(currentLord, currentLocation);
          const enemy: EnemyForce = {
            id: `lord_attack_${Date.now()}`,
            name: `${currentLord.title}${currentLord.name}的亲卫`,
            description: reasonText ? `因冒犯而出兵：${reasonText}` : '领主怒而出兵。',
            troops: attackPlan.troops,
            difficulty: '困难',
            lootPotential: 1.1,
            terrain: currentLocation.terrain,
            baseTroopId: attackPlan.troops[0]?.id ?? 'militia'
          };
          window.setTimeout(() => {
            setActiveEnemy(enemy);
            setPendingBattleMeta({ mode: 'FIELD', targetLocationId: locationId });
            setPendingBattleIsTraining(false);
            onEnterBattle();
          }, 1200);
        }
      }
    } catch (error) {
      setLordDialogue(prev => [...prev, { role: 'LORD' as const, text: '领主沉默了片刻，没有回应。' }].slice(-16));
    } finally {
      setIsLordChatLoading(false);
    }
  };

  const handleCityRest = () => {
    if (!isCity) return;
    if (!canRestInCity) {
      addLog("资金不足，无法在城内休息。");
      return;
    }
    processDailyCycle(currentLocation, cityRestCost);
  };
  const handleStartWorkContract = (contractId: string) => {
    if (!isCity) return;
    if (!!workState?.isActive) return;
    const board = currentLocation.workBoard;
    const contracts = board?.contracts ?? [];
    const contract = contracts.find(c => c.id === contractId);
    if (!contract) {
      addLog('委托已失效。');
      return;
    }
    const commerce = Math.max(0, player.attributes.commerce ?? 0);
    const commerceBonusRate = Math.min(0.5, commerce * 0.01);
    const payWithBonus = Math.max(0, Math.floor(contract.pay * (1 + commerceBonusRate)));
    updateLocationState({
      ...currentLocation,
      workBoard: {
        lastRefreshDay: board?.lastRefreshDay ?? player.day,
        contracts: contracts.filter(c => c.id !== contractId)
      }
    });
    setWorkState({
      isActive: true,
      locationId: currentLocation.id,
      contractId: contract.id,
      contractTitle: contract.title,
      totalDays: Math.max(1, Math.floor(contract.days)),
      daysPassed: 0,
      totalPay: payWithBonus
    });
    onBackToMap();
  };

  const handleStartMining = () => {
    if (!isMine || !mineConfig) return;
    const days = Math.max(1, Math.floor(miningDays));
    setMiningDays(days);
    setMiningState({
      isActive: true,
      locationId: currentLocation.id,
      mineralId: mineConfig.mineralId,
      totalDays: days,
      daysPassed: 0,
      yieldByPurity: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
    });
    onBackToMap();
  };

  const handleStartRoachLure = () => {
    if (!isRoachNest) return;
    const currentCount = activeTroopCount + woundedTroopCount;
    const maxTroops = getMaxTroops();
    if (currentCount >= maxTroops) {
      addLog("队伍人数已达上限，无法继续吸引。");
      return;
    }
    const days = Math.max(1, Math.floor(roachLureDays));
    setRoachLureDays(days);
    setRoachLureState({
      isActive: true,
      locationId: currentLocation.id,
      totalDays: days,
      daysPassed: 0,
      recruitedByTroopId: {}
    });
    onBackToMap();
  };

  const pickWeightedAnomaly = (pool: Anomaly[]) => {
    if (pool.length === 0) return null;
    const weights = pool.map(item => Math.max(1, 6 - item.tier));
    const total = weights.reduce((sum, value) => sum + value, 0);
    let roll = Math.random() * total;
    for (let i = 0; i < pool.length; i += 1) {
      roll -= weights[i];
      if (roll <= 0) return pool[i];
    }
    return pool[pool.length - 1];
  };

  const handleDrawAnomaly = (mineralId: MineralId) => {
    if (!isMagicianLibrary) return;
    const available = getMineralAvailable(mineralInventory, mineralId, 1);
    if (available < 1) {
      addLog("水晶不足，无法抽取异常。");
      return;
    }
    const pool = anomalyPools[mineralId] ?? [];
    if (pool.length === 0) {
      addLog("该水晶尚未形成可抽取的异常。");
      return;
    }
    const updatedMinerals = spendMineral(mineralInventory, mineralId, 1, 1);
    if (!updatedMinerals) {
      addLog("水晶不足，无法抽取异常。");
      return;
    }
    if (Math.random() < 0.2) {
      setPlayer(prev => ({ ...prev, minerals: updatedMinerals }));
      addLog("水晶失稳崩解，异常未能成型。");
      return;
    }
    const picked = pickWeightedAnomaly(pool);
    if (!picked) {
      addLog("抽取失败，未能定位异常。");
      return;
    }
    setPlayer(prev => {
      const nextAnomalies = { ...(prev.anomalies ?? {}) };
      nextAnomalies[picked.id] = (nextAnomalies[picked.id] ?? 0) + 1;
      return { ...prev, minerals: updatedMinerals, anomalies: nextAnomalies };
    });
    addLog(`捕获异常「${picked.name}」。`);
  };

  const handleAnomalySummon = (anomaly: Anomaly) => {
    if (!isMagicianLibrary) return;
    const count = anomalyInventory[anomaly.id] ?? 0;
    if (count <= 0) {
      addLog("异常样本不足，无法召唤。");
      return;
    }
    if (currentTroopCount >= maxTroops) {
      addLog("队伍人数已达上限，无法召唤。");
      return;
    }
    const template = getTroopTemplate(anomaly.troopId);
    if (!template) {
      addLog("召唤失败，未找到对应兵种。");
      return;
    }
    const updatedTroops = [...player.troops];
    const idx = updatedTroops.findIndex(t => t.id === anomaly.troopId);
    if (idx >= 0) {
      updatedTroops[idx] = { ...updatedTroops[idx], count: updatedTroops[idx].count + 1 };
    } else {
      updatedTroops.push({ ...template, count: 1, xp: 0 });
    }
    setPlayer(prev => {
      const nextAnomalies = { ...(prev.anomalies ?? {}) };
      const nextCount = (nextAnomalies[anomaly.id] ?? 0) - 1;
      if (nextCount > 0) {
        nextAnomalies[anomaly.id] = nextCount;
      } else {
        delete nextAnomalies[anomaly.id];
      }
      return { ...prev, troops: updatedTroops, anomalies: nextAnomalies };
    });
    addLog(`异常共鸣，召唤出 1 名 ${template.name}。`);
  };

  const handleStartAltarRecruit = () => {
    if (!isAltar) return;
    if ((currentLocation.altar?.troopIds ?? []).length === 0) {
      addLog("祭坛尚未确立兵种树。");
      return;
    }
    const currentCount = activeTroopCount + woundedTroopCount;
    const maxTroops = getMaxTroops();
    if (currentCount >= maxTroops) {
      addLog("队伍人数已达上限，无法继续传教。");
      return;
    }
    const days = Math.max(1, Math.floor(altarRecruitDays));
    setAltarRecruitDays(days);
    setAltarRecruitState({
      isActive: true,
      locationId: currentLocation.id,
      totalDays: days,
      daysPassed: 0,
      recruitedByTroopId: {}
    });
    onBackToMap();
  };

  const getMineralAvailable = (inventory: PlayerState['minerals'], mineralId: MineralId, purityMin: MineralPurity) => {
    const record = inventory[mineralId] ?? { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    return ([5, 4, 3, 2, 1] as MineralPurity[])
      .filter(purity => purity >= purityMin)
      .reduce((sum, purity) => sum + (record[purity] ?? 0), 0);
  };

  const spendMineral = (inventory: PlayerState['minerals'], mineralId: MineralId, purityMin: MineralPurity, amount: number) => {
    let remaining = amount;
    const record = { ...(inventory[mineralId] ?? { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }) };
    for (const purity of [5, 4, 3, 2, 1] as MineralPurity[]) {
      if (purity < purityMin) continue;
      const available = record[purity] ?? 0;
      const take = Math.min(available, remaining);
      record[purity] = available - take;
      remaining -= take;
      if (remaining <= 0) break;
    }
    if (remaining > 0) return null;
    return { ...inventory, [mineralId]: record };
  };

  const handleSmeltBullets = (mineralId: MineralId) => {
    if (!isCrystalFoundry) return;
    const record = mineralInventory[mineralId] ?? { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    const totalOre = ([1, 2, 3, 4, 5] as MineralPurity[]).reduce((sum, purity) => sum + (record[purity] ?? 0), 0);
    const bulletGain = getFoundryBulletYield(mineralId);
    if (totalOre <= 0 || bulletGain <= 0) {
      addLog('当前矿物不足，无法熔炼。');
      return;
    }
    setPlayer(prev => ({
      ...prev,
      bullets: (prev.bullets ?? 0) + bulletGain,
      minerals: {
        ...prev.minerals,
        [mineralId]: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
      }
    }));
    addLog(`熔炼 ${mineralMeta[mineralId].name}，获得 ${bulletGain} 发水晶子弹。`);
  };

  const handleRecruitFoundryGunner = () => {
    if (!isCrystalFoundry || !foundryRecruitTemplate) return;
    if (currentTroopCount >= maxTroops) {
      addLog('队伍人数已达上限，无法继续招募。');
      return;
    }
    if (player.gold < foundryRecruitTemplate.cost) {
      addLog('金钱不足，无法雇佣魔法枪新兵。');
      return;
    }
    setPlayer(prev => {
      const existing = prev.troops.find(t => t.id === foundryRecruitTemplate.id);
      const nextTroops = existing
        ? prev.troops.map(t => t.id === foundryRecruitTemplate.id ? { ...t, count: t.count + 1 } : t)
        : [...prev.troops, { ...foundryRecruitTemplate, count: 1, xp: 0, currentAmmo: foundryRecruitTemplate.ammoPerUnit ?? 0 }];
      return {
        ...prev,
        gold: prev.gold - foundryRecruitTemplate.cost,
        troops: nextTroops
      };
    });
    addLog(`你在 ${currentLocation.name} 招募了 1 名 ${foundryRecruitTemplate.name}。`);
  };

  const updateFarmState = (updater: (farm: NonNullable<Location['farm']>) => NonNullable<Location['farm']>) => {
    if (!isMegaFarm) return;
    const base = currentLocation.farm ?? createFarmState(2);
    updateLocationState({ ...currentLocation, farm: updater(base) });
  };

  const handleUnlockFarmPlot = () => {
    if (!farmState) return;
    if (farmState.unlockedPlots >= FARM_MAX_PLOTS) {
      addLog('所有农田地块都已解锁。');
      return;
    }
    const cost = getFarmUnlockCost(farmState.unlockedPlots);
    if (player.gold < cost) {
      addLog('金钱不足，无法购买新地块。');
      return;
    }
    setPlayer(prev => ({ ...prev, gold: prev.gold - cost }));
    updateFarmState(farm => ({ ...farm, unlockedPlots: Math.min(FARM_MAX_PLOTS, farm.unlockedPlots + 1), lastUpdatedAt: Date.now() }));
    addLog(`巨大农田新增 1 块可耕地，花费 ${cost} 第纳尔。`);
  };

  const handlePlantCrop = (slot: number, cropId: CropId) => {
    if (!farmState) return;
    const crop = CROP_DEF_MAP[cropId];
    if (!crop) return;
    if (slot >= farmState.unlockedPlots) {
      addLog('该地块尚未解锁。');
      return;
    }
    if (player.gold < crop.seedCost) {
      addLog('金钱不足，无法购买种子。');
      return;
    }
    const existing = farmState.plots.find(plot => plot.slot === slot);
    if (existing?.cropId) {
      addLog('该地块已有作物。');
      return;
    }
    const plantedAt = Date.now();
    setPlayer(prev => ({ ...prev, gold: prev.gold - crop.seedCost }));
    updateFarmState(farm => ({
      ...farm,
      lastUpdatedAt: plantedAt,
      plots: Array.from({ length: FARM_MAX_PLOTS }, (_, plotSlot) => {
        const current = farm.plots.find(plot => plot.slot === plotSlot) ?? { slot: plotSlot };
        if (plotSlot !== slot) return current;
        return {
          slot,
          cropId,
          plantedAt,
          readyAt: plantedAt + crop.growMs,
          plantedDay: player.day
        };
      })
    }));
    addLog(`在巨大农田的 ${slot + 1} 号地块播下了 ${crop.name}。`);
  };

  const handleHarvestCrop = (slot: number) => {
    if (!farmState) return;
    const plot = farmState.plots.find(item => item.slot === slot);
    const crop = plot?.cropId ? CROP_DEF_MAP[plot.cropId] : null;
    if (!plot || !crop || !plot.readyAt || plot.readyAt > Date.now()) {
      addLog('作物尚未成熟。');
      return;
    }
    setPlayer(prev => ({ ...prev, gold: prev.gold + crop.yieldGold }));
    updateFarmState(farm => ({
      ...farm,
      lastUpdatedAt: Date.now(),
      plots: farm.plots.map(item => item.slot === slot ? { slot } : item)
    }));
    addLog(`收获 ${crop.name}，获得 ${crop.yieldGold} 第纳尔。`);
  };

  const handleForge = () => {
    if (!isBlacksmith) return;
    if (forgeTroopIndex === null || forgeEnchantmentId === null) {
      addLog("请选择要附魔的部队与词条。");
      return;
    }
    const recipe = enchantmentRecipes.find(r => r.enchantment.id === forgeEnchantmentId);
    if (!recipe) {
      addLog("未找到对应的附魔方案。");
      return;
    }
    const target = player.troops[forgeTroopIndex];
    if (!target) {
      addLog("未找到目标部队。");
      return;
    }
    if ((target.enchantments ?? []).some(e => e.id === recipe.enchantment.id)) {
      addLog("该部队已拥有此词条。");
      return;
    }
    const canAfford = recipe.costs.every(cost => getMineralAvailable(mineralInventory, cost.mineralId, cost.purityMin) >= cost.amount);
    if (!canAfford) {
      addLog("矿石不足，无法完成附魔。");
      return;
    }
    let nextInventory = mineralInventory;
    for (const cost of recipe.costs) {
      const updated = spendMineral(nextInventory, cost.mineralId, cost.purityMin, cost.amount);
      if (!updated) {
        addLog("矿石不足，无法完成附魔。");
        return;
      }
      nextInventory = updated;
    }
    const updatedTroops = player.troops.map((troop, index) => {
      if (index !== forgeTroopIndex) return troop;
      const enchantments = [...(troop.enchantments ?? []), recipe.enchantment];
      return { ...troop, enchantments };
    });
    setPlayer(prev => ({ ...prev, troops: updatedTroops, minerals: nextInventory }));
    addLog(`${target.name} 获得词条「${recipe.enchantment.name}」。`);
  };

  const ownedGarrison = currentLocation.garrison ?? [];
  const existingGarrison = currentLocation.garrison ?? [];
  const displayedGarrison = isOwnedByPlayer ? ownedGarrison : (existingGarrison.length > 0 ? existingGarrison : buildGarrisonTroops(currentLocation));
  const localGarrison = displayedGarrison
    .map(unit => {
      const troop = getTroopTemplate(unit.id);
      return troop ? { troop, count: unit.count } : null;
    })
    .filter(Boolean) as { troop: Omit<Troop, 'count' | 'xp'>; count: number }[];
  const stayParties = currentLocation.stayParties ?? [];
  const playerStayParty = {
    id: 'player_party',
    name: `${player.name}的部队`,
    troops: player.troops,
    owner: 'PLAYER' as const
  };
  const mergedStayParties = [playerStayParty, ...stayParties.filter(party => party.id !== playerStayParty.id)];
  const visibleStayParties = mergedStayParties.filter(party => party.troops.some(troop => troop.count > 0));
  const getPartyCount = (troops: Troop[]) => troops.reduce((sum, troop) => sum + troop.count, 0);
  const hideoutState = currentLocation.hideout;
  const hideoutSiegeLayerIndex = isHideout && currentLocation.activeSiege
    ? Math.max(0, Math.floor((currentLocation.activeSiege as any).hideoutLayerIndex ?? 0))
    : 0;
  const hideoutSiegeLayer = hideoutState?.layers?.[hideoutSiegeLayerIndex];
  const hideoutHasFallenLayers = isHideout && !!currentLocation.activeSiege && !!currentLocation.isUnderSiege && hideoutSiegeLayerIndex > 0;
  const hideoutSelectedLayerIndex = Math.max(0, Math.min((hideoutState?.layers?.length ?? 1) - 1, hideoutState?.selectedLayer ?? 0));
  const hideoutSelectedLayer = hideoutState?.layers?.[hideoutSelectedLayerIndex];
  const hideoutLayerTroops = (hideoutSelectedLayer?.garrison ?? []).filter(t => (t.count ?? 0) > 0);
  const hideoutLayerGarrisonCount = hideoutLayerTroops.reduce((sum, t) => sum + (t.count ?? 0), 0);
  const hideoutLayerGarrisonPower = hideoutLayerTroops.reduce((sum, t) => sum + (t.count ?? 0) * (t.basePower ?? 0), 0);
  const hideoutSiegeLayerTroops = (hideoutSiegeLayer?.garrison ?? []).filter(t => (t.count ?? 0) > 0);
  const hideoutSiegeLayerGarrisonCount = hideoutSiegeLayerTroops.reduce((sum, t) => sum + (t.count ?? 0), 0);
  const totalGarrisonCount = isHideout ? hideoutLayerGarrisonCount : localGarrison.reduce((sum, unit) => sum + unit.count, 0);
  const totalGarrisonPower = isHideout ? hideoutLayerGarrisonPower : localGarrison.reduce((sum, unit) => sum + unit.count * unit.troop.basePower, 0);
  const isImposterAlerted = (currentLocation.imposterAlertUntilDay ?? 0) >= player.day;
  const isSacked = (currentLocation.sackedUntilDay ?? 0) >= player.day;
  const localDefenseDetails = getLocationDefenseDetails(currentLocation);
  const garrisonLimit = getGarrisonLimit(currentLocation);
  const currentGarrisonCount = getGarrisonCount(ownedGarrison);
  const siegeEngines = currentLocation.siegeEngines ?? [];
  const siegeEngineQueue = currentLocation.siegeEngineQueue ?? [];
  const constructionQueue = currentLocation.constructionQueue ?? [];
  const builtBuildings = currentLocation.buildings ?? [];

  const hideoutLayerCapBase = hideoutSelectedLayer?.garrisonBaseLimit ?? 900;
  const hideoutLayerHasBarracks = (hideoutSelectedLayer?.facilitySlots ?? []).some(s => s.type === 'BARRACKS' && !(s.daysLeft && s.daysLeft > 0));
  const hideoutLayerLimit = hideoutLayerHasBarracks ? Math.floor(hideoutLayerCapBase * 1.5) : hideoutLayerCapBase;

  const normalizeHideoutSlots = (slots: any[] | undefined) => {
    const safe = Array.isArray(slots) ? slots : [];
    return Array.from({ length: 10 }, (_, i) => {
      const raw = safe[i];
      if (!raw || typeof raw !== 'object') return { type: null as BuildingType | null } as const;
      const type = (raw as any).type as BuildingType | null;
      const daysLeft = typeof (raw as any).daysLeft === 'number' ? Math.max(0, Math.floor((raw as any).daysLeft)) : undefined;
      const totalDays = typeof (raw as any).totalDays === 'number' ? Math.max(0, Math.floor((raw as any).totalDays)) : undefined;
      return { type: type ?? null, daysLeft, totalDays } as const;
    });
  };
  const isSlotBuilt = (slot: { type: BuildingType | null; daysLeft?: number }) => !!slot.type && !(slot.daysLeft && slot.daysLeft > 0);
  const hideoutFacilitySlots = normalizeHideoutSlots(hideoutSelectedLayer?.facilitySlots as any);
  const hideoutDefenseSlots = normalizeHideoutSlots(hideoutSelectedLayer?.defenseSlots as any);
  const hideoutFacilityBuilt = hideoutFacilitySlots.filter(isSlotBuilt).map(s => s.type as BuildingType);
  const hideoutRecruiterCount = hideoutFacilityBuilt.filter(t => t === 'RECRUITER').length;
  const hideoutShrineCount = hideoutFacilityBuilt.filter(t => t === 'SHRINE').length;
  const hideoutReligionTroopIds = (() => {
    const altar = locations.find(l => l.type === 'ALTAR' && (l.altar?.troopIds ?? []).length > 0 && !!l.altar?.doctrine?.religionName);
    return altar?.altar?.troopIds ?? [];
  })();
  const hideoutRecruitOptions = [
    ...(hideoutRecruiterCount > 0 ? [{ id: 'militia', label: getTroopTemplate('militia')?.name ?? '民兵', source: 'RECRUITER' }] : []),
    ...(hideoutShrineCount > 0 && hideoutReligionTroopIds.length > 0
      ? [{ id: hideoutReligionTroopIds[0], label: getTroopTemplate(hideoutReligionTroopIds[0])?.name ?? hideoutReligionTroopIds[0], source: 'SHRINE' }]
      : [])
  ];
  const hideoutRecruitPlan = hideoutSelectedLayer?.recruitPlan ?? null;
  const hideoutFacilityUsed = hideoutFacilitySlots.filter(s => !!s.type).length;
  const hideoutFacilityBuilding = hideoutFacilitySlots.filter(s => !!s.type && !!s.daysLeft && s.daysLeft > 0).length;
  const hideoutDefenseUsed = hideoutDefenseSlots.filter(s => !!s.type).length;
  const hideoutDefenseBuilding = hideoutDefenseSlots.filter(s => !!s.type && !!s.daysLeft && s.daysLeft > 0).length;
  const hideoutAllLayerCount = hideoutState?.layers?.length ?? 0;
  const hideoutAllSlotsTotal = hideoutAllLayerCount * 10;
  const hideoutAllFacilityUsed = (hideoutState?.layers ?? []).reduce((sum, l) => sum + (Array.isArray(l.facilitySlots) ? l.facilitySlots.filter(s => !!(s as any)?.type).length : 0), 0);
  const hideoutAllDefenseUsed = (hideoutState?.layers ?? []).reduce((sum, l) => sum + (Array.isArray(l.defenseSlots) ? l.defenseSlots.filter(s => !!(s as any)?.type).length : 0), 0);
  const hideoutExposure = Math.max(0, Math.min(100, hideoutState?.exposure ?? 0));
  const hideoutCamouflageCooldownUntilDay = hideoutState?.camouflageCooldownUntilDay ?? 0;
  const camouflageBuiltSlot = (hideoutState?.layers?.[0]?.defenseSlots ?? []).find(s => (
    ['CAMOUFLAGE_STRUCTURE', 'CAMOUFLAGE_STRUCTURE_II', 'CAMOUFLAGE_STRUCTURE_III'].includes(s.type as any) &&
    !(s.daysLeft && s.daysLeft > 0)
  ));
  const camouflageLevel = camouflageBuiltSlot?.type === 'CAMOUFLAGE_STRUCTURE_III'
    ? 3
    : camouflageBuiltSlot?.type === 'CAMOUFLAGE_STRUCTURE_II'
      ? 2
      : camouflageBuiltSlot?.type === 'CAMOUFLAGE_STRUCTURE'
        ? 1
        : 0;
  const camouflageCost = camouflageLevel === 3 ? 380 : camouflageLevel === 2 ? 320 : 260;

  const [hideoutRefineMineralId, setHideoutRefineMineralId] = React.useState<MineralId>('NULL_CRYSTAL');
  const [hideoutRefineFromPurity, setHideoutRefineFromPurity] = React.useState<MineralPurity>(1);
  const [hideoutRefineOutputCount, setHideoutRefineOutputCount] = React.useState(1);
  const [hideoutPage, setHideoutPage] = React.useState<'DASHBOARD' | 'GARRISON' | 'GUARDIAN' | 'FACILITIES' | 'DEFENSE' | 'RECRUIT' | 'REFINERY' | 'LOGS' | 'BUILD' | 'DETAIL'>('DASHBOARD');
  const [hideoutRecruitTarget, setHideoutRecruitTarget] = React.useState(0);
  const [hideoutRecruitTroopId, setHideoutRecruitTroopId] = React.useState<string>('');
  const [hideoutBuildTarget, setHideoutBuildTarget] = React.useState<{ category: 'FACILITY' | 'DEFENSE'; slotIndex: number } | null>(null);
  const [hideoutInspectTarget, setHideoutInspectTarget] = React.useState<{ category: 'FACILITY' | 'DEFENSE'; slotIndex: number } | null>(null);
  const [hideoutBuildAnim, setHideoutBuildAnim] = React.useState<{ category: 'FACILITY' | 'DEFENSE'; slotIndex: number; id: string } | null>(null);

  React.useEffect(() => {
    const defaultId = hideoutRecruitOptions[0]?.id ?? '';
    if (hideoutRecruitPlan) {
      setHideoutRecruitTarget(Math.max(0, Math.floor(hideoutRecruitPlan.target ?? 0)));
      setHideoutRecruitTroopId(hideoutRecruitPlan.troopId ?? defaultId);
      return;
    }
    setHideoutRecruitTarget(0);
    setHideoutRecruitTroopId(defaultId);
  }, [hideoutSelectedLayerIndex, hideoutRecruitPlan, hideoutRecruitOptions.length]);

  const hideoutFacilityBuildOptions = buildingOptions.filter(b => (
    b.type === 'HOUSING' ||
    b.type === 'HOUSING_II' ||
    b.type === 'HOUSING_III' ||
    b.type === 'UNDERGROUND_PLAZA' ||
    b.type === 'CANTEEN' ||
    b.type === 'TAVERN' ||
    b.type === 'THEATER' ||
    b.type === 'ARENA' ||
    b.type === 'TRAINING_CAMP' ||
    b.type === 'BARRACKS' ||
    b.type === 'RECRUITER' ||
    b.type === 'SHRINE' ||
    b.type === 'ORE_REFINERY' ||
    b.type === 'HOSPITAL_I'
  ));
  const hideoutDefenseBuildOptions = buildingOptions.filter(b => (
    b.type === 'DEFENSE' ||
    b.type === 'AA_TOWER_I' ||
    b.type === 'AA_NET_I' ||
    b.type === 'AA_RADAR_I' ||
    b.type === 'CAMOUFLAGE_STRUCTURE' ||
    b.type === 'FIRE_CRYSTAL_MINE' ||
    b.type === 'MAGIC_CIRCLE_AMPLIFY' ||
    b.type === 'MAGIC_CIRCLE_WARD' ||
    b.type === 'MAGIC_CIRCLE_RESTORE' ||
    b.type === 'ARCANE_CRYSTAL_ARRAY' ||
    b.type === 'ANTI_MAGIC_PYLON' ||
    b.type === 'MAZE_I'
  ));
  const hideoutHasRefineryBuilt = hideoutFacilitySlots.some(slot => slot.type === 'ORE_REFINERY' && isSlotBuilt(slot));

  const getHideoutSlotLabel = (slot: { type: BuildingType | null; daysLeft?: number }) => {
    if (!slot.type) return '空槽';
    if (slot.daysLeft && slot.daysLeft > 0) return `${getBuildingName(slot.type)} · ${slot.daysLeft}天`;
    return getBuildingName(slot.type);
  };

  const addHideoutLocalLog = (text: string) => {
    if (!isHideout) return;
    const safe = String(text ?? '').trim();
    if (!safe) return;
    const entry = { day: player.day, text: safe };
    const existing = currentLocation.localLogs ?? [];
    const nextLogs = [entry, ...existing].slice(0, 30);
    updateLocationState({ ...currentLocation, localLogs: nextLogs });
  };

  const getBuildingEffects = (type: BuildingType) => {
    if (type === 'HOUSING') return ['每 3 天征税一次（与数量叠加）', '会提高暴露程度上升速度'];
    if (type === 'HOUSING_II') return ['提升税收效率', '会提高暴露程度上升速度'];
    if (type === 'HOUSING_III') return ['显著提升税收效率', '会提高暴露程度上升速度'];
    if (type === 'UNDERGROUND_PLAZA') return ['仅地下层可建', '提升稳定与和谐（可叠加）'];
    if (type === 'CANTEEN') return ['提升和谐与繁荣（可叠加）'];
    if (type === 'TAVERN') return ['提升繁荣与士气（可叠加）'];
    if (type === 'THEATER') return ['显著提升繁荣与和谐（可叠加）'];
    if (type === 'ARENA') return ['提升稳定与生产力（可叠加）'];
    if (type === 'TRAINING_CAMP') return ['每 3 天训练一次（与数量叠加）', '提升该层驻军经验'];
    if (type === 'BARRACKS') return ['该层驻军上限 +50%'];
    if (type === 'RECRUITER') return ['每 4 天征募一次（与数量叠加）', '优先补满驻军空位'];
    if (type === 'SHRINE') return ['若已确立宗教：每 4 天招募信徒守卫', '驻军不足时优先补充'];
    if (type === 'ORE_REFINERY') return ['解锁该层“矿石精炼”', '低纯度×3 → 高一档纯度×1（需要时间+费用）'];
    if (type === 'HOSPITAL_I') return ['唯一建筑（全隐匿点）', '停留期间每 3 天额外推进伤兵恢复 1 天'];
    if (type === 'HOSPITAL_II') return ['唯一建筑（全隐匿点）', '停留期间每 3 天额外推进伤兵恢复 2 天'];
    if (type === 'HOSPITAL_III') return ['唯一建筑（全隐匿点）', '停留期间每 3 天额外推进伤兵恢复 3 天'];
    if (type === 'DEFENSE') return ['提升防御强度（可叠加）'];
    if (type === 'AA_TOWER_I') return ['提升防空强度与远程命中（可叠加）'];
    if (type === 'AA_TOWER_II') return ['需要 AA_TOWER_I', '提升防空强度（可叠加）'];
    if (type === 'AA_TOWER_III') return ['需要 AA_TOWER_II', '提升防空强度（可叠加）'];
    if (type === 'AA_NET_I') return ['提升空袭减伤（可叠加）'];
    if (type === 'AA_NET_II') return ['需要 AA_NET_I', '提升空袭减伤（可叠加）'];
    if (type === 'AA_RADAR_I') return ['提升防空强度与远程命中（可叠加）'];
    if (type === 'AA_RADAR_II') return ['需要 AA_RADAR_I', '提升防空强度与远程命中（可叠加）'];
    if (type === 'CAMOUFLAGE_STRUCTURE') return ['仅地面层可建', '可花钱降低暴露（冷却）', '被动减缓暴露上升'];
    if (type === 'CAMOUFLAGE_STRUCTURE_II') return ['仅地面层可建', '降低暴露效果提升', '冷却缩短'];
    if (type === 'CAMOUFLAGE_STRUCTURE_III') return ['仅地面层可建', '大幅降低暴露', '冷却进一步缩短'];
    if (type === 'FIRE_CRYSTAL_MINE') return ['防御槽可建', '接敌时触发爆燃', '提升防御火力'];
    if (type === 'MAGIC_CIRCLE_AMPLIFY') return ['法阵增幅', '提升远程压制', '可叠加'];
    if (type === 'MAGIC_CIRCLE_WARD') return ['护盾法阵', '削弱近战冲击', '可叠加'];
    if (type === 'MAGIC_CIRCLE_RESTORE') return ['恢复法阵', '战斗中缓慢修复防线', '可叠加'];
    if (type === 'ARCANE_CRYSTAL_ARRAY') return ['水晶供能', '稳定魔法输出', '可叠加'];
    if (type === 'ANTI_MAGIC_PYLON') return ['反魔法干扰', '削弱空袭与远程', '可叠加'];
    if (type === 'MAZE_I') return ['仅地面层可建（唯一）', '讨伐军进入据点后需等待 1 天才会开战'];
    if (type === 'MAZE_II') return ['仅地面层可建（唯一）', '讨伐军进入据点后需等待 2 天才会开战'];
    if (type === 'MAZE_III') return ['仅地面层可建（唯一）', '讨伐军进入据点后需等待 3 天才会开战'];
    return [];
  };

  const getBuildingYieldLines = (type: BuildingType, depth: number) => {
    if (type === 'HOUSING') return [`税收：每 3 天 +${18 + depth * 4} 第纳尔（每座）`];
    if (type === 'HOUSING_II') return [`税收：每 3 天 +${26 + depth * 5} 第纳尔（每座）`];
    if (type === 'HOUSING_III') return [`税收：每 3 天 +${36 + depth * 6} 第纳尔（每座）`];
    if (type === 'UNDERGROUND_PLAZA') return ['治理：稳定与和谐缓慢提升'];
    if (type === 'CANTEEN') return ['治理：和谐与繁荣缓慢提升'];
    if (type === 'TAVERN') return ['治理：繁荣提升并提升士气氛围'];
    if (type === 'THEATER') return ['治理：繁荣与和谐显著提升'];
    if (type === 'ARENA') return ['治理：稳定与生产力提升'];
    if (type === 'TRAINING_CAMP') return [`训练：每 3 天触发一次（强度随数量提升）`];
    if (type === 'RECRUITER') return [`征募：每 4 天 +${4 + Math.min(6, depth * 2)} 名守军（每座，上限内）`];
    if (type === 'SHRINE') return [`信徒：每 4 天 +${3 + Math.min(4, depth)} 名（每座，上限内，需宗教）`];
    if (type === 'HOSPITAL_I') return ['治疗：停留期间每 3 天额外推进伤兵恢复 1 天'];
    if (type === 'HOSPITAL_II') return ['治疗：停留期间每 3 天额外推进伤兵恢复 2 天'];
    if (type === 'HOSPITAL_III') return ['治疗：停留期间每 3 天额外推进伤兵恢复 3 天'];
    if (type === 'CAMOUFLAGE_STRUCTURE') return ['伪装：启动后降低暴露 18，冷却 6 天'];
    if (type === 'CAMOUFLAGE_STRUCTURE_II') return ['伪装：启动后降低暴露 28，冷却 5 天'];
    if (type === 'CAMOUFLAGE_STRUCTURE_III') return ['伪装：启动后降低暴露 40，冷却 4 天'];
    if (type === 'FIRE_CRYSTAL_MINE') return ['防御：提升近战伤害削减与防御火力'];
    if (type === 'MAGIC_CIRCLE_AMPLIFY') return ['防御：提升远程命中与伤害'];
    if (type === 'MAGIC_CIRCLE_WARD') return ['防御：提升近战伤害削减'];
    if (type === 'MAGIC_CIRCLE_RESTORE') return ['防御：提升城墙与器械耐久'];
    if (type === 'ARCANE_CRYSTAL_ARRAY') return ['防御：提升远程伤害'];
    if (type === 'ANTI_MAGIC_PYLON') return ['防御：降低空袭伤害并削弱远程'];
    if (type === 'MAZE_I') return ['延缓：敌军抵达后需等待 1 天才会开战'];
    if (type === 'MAZE_II') return ['延缓：敌军抵达后需等待 2 天才会开战'];
    if (type === 'MAZE_III') return ['延缓：敌军抵达后需等待 3 天才会开战'];
    return [];
  };

  const getBuildingSpec = (type: BuildingType) => buildingOptions.find(b => b.type === type) ?? null;

  const getUpgradeNextType = (type: BuildingType | null): BuildingType | null => {
    if (!type) return null;
    const mapping: Partial<Record<BuildingType, BuildingType>> = {
      HOUSING: 'HOUSING_II',
      HOUSING_II: 'HOUSING_III',
      AA_TOWER_I: 'AA_TOWER_II',
      AA_TOWER_II: 'AA_TOWER_III',
      AA_NET_I: 'AA_NET_II',
      AA_RADAR_I: 'AA_RADAR_II',
      MAZE_I: 'MAZE_II',
      MAZE_II: 'MAZE_III',
      HOSPITAL_I: 'HOSPITAL_II',
      HOSPITAL_II: 'HOSPITAL_III',
      CAMOUFLAGE_STRUCTURE: 'CAMOUFLAGE_STRUCTURE_II',
      CAMOUFLAGE_STRUCTURE_II: 'CAMOUFLAGE_STRUCTURE_III'
    };
    return mapping[type] ?? null;
  };

  const getUpgradeCostDays = (fromType: BuildingType, toType: BuildingType) => {
    const from = getBuildingSpec(fromType);
    const to = getBuildingSpec(toType);
    if (!from || !to) return null;
    const delta = Math.max(1, to.cost - from.cost);
    return { cost: Math.ceil(delta * 1.05), days: to.days, name: to.name };
  };

  const handleBuySiegeEngine = (engine: { type: SiegeEngineType; name: string; cost: number; days: number }) => {
    if (!isSiegeTarget && !isImposterPortal) return;
    if (player.gold < engine.cost) {
      addLog("资金不足，无法购买攻城器械。");
      return;
    }
    const readyCount = (currentLocation.siegeEngines ?? []).filter(t => t === engine.type).length;
    const queuedCount = (currentLocation.siegeEngineQueue ?? []).filter(q => q.type === engine.type).length;
    if (readyCount + queuedCount >= 3) {
      addLog(`该攻城器械已达上限（3 个）。`);
      return;
    }

    if (engine.days === 0) {
      const updated = {
        ...currentLocation,
        siegeEngines: [...(currentLocation.siegeEngines ?? []), engine.type]
      };
      setPlayer(prev => ({ ...prev, gold: prev.gold - engine.cost }));
      updateLocationState(updated);
      addLog(`选择了 ${engine.name}，已准备就绪。`);
    } else {
      const updated = {
        ...currentLocation,
        siegeEngineQueue: [
          ...(currentLocation.siegeEngineQueue ?? []),
          { type: engine.type, daysLeft: engine.days, totalDays: engine.days }
        ]
      };
      setPlayer(prev => ({ ...prev, gold: prev.gold - engine.cost }));
      updateLocationState(updated);
      addLog(`开始准备 ${engine.name}，需要 ${engine.days} 天。`);
    }
  };

  const handleSiegeWait = () => {
    if (!isSiegeTarget && !isImposterPortal) return;
    processDailyCycle(currentLocation, 0, 1);
    addLog("你在围城营地等待了一天。");
  };

  const handleStartConstruction = (building: { type: BuildingType; name: string; cost: number; days: number }) => {
    if (!isOwnedByPlayer) return;
    if (player.gold < building.cost) {
      addLog("资金不足，无法建造建筑。");
      return;
    }
    const alreadyBuilt = (currentLocation.buildings ?? []).includes(building.type);
    const alreadyQueued = (currentLocation.constructionQueue ?? []).some(q => q.type === building.type);
    if (alreadyBuilt || alreadyQueued) {
      addLog("该建筑已存在或正在建造中。");
      return;
    }
    const updated = {
      ...currentLocation,
      constructionQueue: [
        ...(currentLocation.constructionQueue ?? []),
        { type: building.type, daysLeft: building.days, totalDays: building.days }
      ]
    };
    setPlayer(prev => ({ ...prev, gold: prev.gold - building.cost }));
    updateLocationState(updated);
    addLog(`开始建造 ${building.name}，需要 ${building.days} 天。`);
  };

  const buildSoldierFromTemplate = (troopId: string, xpValue: number, nextId: number, day: number) => {
    const tmpl = getTroopTemplate(troopId);
    if (!tmpl) return null;
    return {
      id: `S${nextId}`,
      troopId,
      name: tmpl.name,
      tier: tmpl.tier,
      xp: Math.max(0, Math.min(tmpl.maxXp, Math.floor(xpValue))),
      maxXp: tmpl.maxXp,
      createdDay: day,
      history: [`Day ${day} · 补档入伍`],
      status: 'ACTIVE' as const
    };
  };

  const moveSoldiersStatus = (
    roster: SoldierInstance[],
    troopId: string,
    fromStatus: SoldierInstance['status'],
    toStatus: SoldierInstance['status'],
    count: number,
    note: string
  ) => {
    let remaining = count;
    return roster.map(s => {
      if (remaining <= 0) return s;
      if (s.troopId !== troopId || s.status !== fromStatus) return s;
      remaining -= 1;
      const history = [...(s.history ?? []), note];
      return { ...s, status: toStatus, history };
    });
  };

  const handleDepositToGarrison = (troopId: string, amount: number) => {
    if (!isOwnedByPlayer) return;
    const troop = player.troops.find(t => t.id === troopId);
    if (!troop) return;
    const availableCapacity = garrisonLimit - currentGarrisonCount;
    const availableActive = (player.soldiers ?? []).filter(s => s.troopId === troopId && s.status === 'ACTIVE').length || troop.count;
    const moveCount = Math.min(amount, troop.count, availableCapacity, availableActive);
    if (moveCount <= 0) {
      addLog("驻军已达上限。");
      return;
    }
    const updatedPlayerTroops = player.troops
      .map(t => t.id === troopId ? { ...t, count: t.count - moveCount } : t)
      .filter(t => t.count > 0);
    const updatedGarrison = [...ownedGarrison];
    const idx = updatedGarrison.findIndex(t => t.id === troopId);
    if (idx >= 0) {
      updatedGarrison[idx] = { ...updatedGarrison[idx], count: updatedGarrison[idx].count + moveCount };
    } else {
      updatedGarrison.push({ ...troop, count: moveCount });
    }
    setPlayer(prev => {
      let roster = Array.isArray(prev.soldiers) ? prev.soldiers.map(s => ({ ...s })) : [];
      let nextId = typeof prev.nextSoldierId === 'number' ? prev.nextSoldierId : 1;
      const activeCount = roster.filter(s => s.troopId === troopId && s.status === 'ACTIVE').length;
      const deficit = Math.max(0, moveCount - activeCount);
      const seedXp = Math.max(0, Math.floor(troop.xp ?? 0));
      for (let i = 0; i < deficit; i += 1) {
        const built = buildSoldierFromTemplate(troopId, seedXp, nextId, playerRef.current.day);
        if (built) {
          roster.push(built);
          nextId += 1;
        }
      }
      roster = moveSoldiersStatus(
        roster,
        troopId,
        'ACTIVE',
        'GARRISONED',
        moveCount,
        `Day ${playerRef.current.day} · 调入 ${currentLocation.name} 驻军`
      );
      return { ...prev, troops: updatedPlayerTroops, soldiers: roster, nextSoldierId: nextId };
    });
    updateLocationState({ ...currentLocation, garrison: updatedGarrison });
    addLog(`已调入 ${moveCount} 名 ${troop.name}。`);
  };

  const handleWithdrawFromGarrison = (troopId: string, amount: number) => {
    if (!isOwnedByPlayer) return;
    const garrisonTroop = ownedGarrison.find(t => t.id === troopId);
    if (!garrisonTroop) return;
    const currentCount = activeTroopCount + woundedTroopCount;
    const availableSpace = getMaxTroops() - currentCount;
    const availableGarrisoned = (player.soldiers ?? []).filter(s => s.troopId === troopId && s.status === 'GARRISONED').length || garrisonTroop.count;
    const moveCount = Math.min(amount, garrisonTroop.count, availableSpace, availableGarrisoned);
    if (moveCount <= 0) {
      addLog("队伍人数已满，无法调回。");
      return;
    }
    const updatedGarrison = ownedGarrison
      .map(t => t.id === troopId ? { ...t, count: t.count - moveCount } : t)
      .filter(t => t.count > 0);
    const updatedPlayerTroops = [...player.troops];
    const idx = updatedPlayerTroops.findIndex(t => t.id === troopId);
    if (idx >= 0) {
      updatedPlayerTroops[idx] = { ...updatedPlayerTroops[idx], count: updatedPlayerTroops[idx].count + moveCount };
    } else {
      const template = getTroopTemplate(troopId);
      if (template) updatedPlayerTroops.push({ ...template, count: moveCount, xp: 0 });
    }
    setPlayer(prev => {
      let roster = Array.isArray(prev.soldiers) ? prev.soldiers.map(s => ({ ...s })) : [];
      let nextId = typeof prev.nextSoldierId === 'number' ? prev.nextSoldierId : 1;
      const garrisonedCount = roster.filter(s => s.troopId === troopId && s.status === 'GARRISONED').length;
      const deficit = Math.max(0, moveCount - garrisonedCount);
      const seedXp = Math.max(0, Math.floor(garrisonTroop.xp ?? 0));
      for (let i = 0; i < deficit; i += 1) {
        const built = buildSoldierFromTemplate(troopId, seedXp, nextId, playerRef.current.day);
        if (built) {
          roster.push({ ...built, status: 'GARRISONED' as const });
          nextId += 1;
        }
      }
      roster = moveSoldiersStatus(
        roster,
        troopId,
        'GARRISONED',
        'ACTIVE',
        moveCount,
        `Day ${playerRef.current.day} · 归队 ${currentLocation.name}`
      );
      return { ...prev, troops: updatedPlayerTroops, soldiers: roster, nextSoldierId: nextId };
    });
    updateLocationState({ ...currentLocation, garrison: updatedGarrison });
    addLog(`已调回 ${moveCount} 名 ${garrisonTroop.name}。`);
  };

  const updateHideoutLayer = (layerIndex: number, updater: (layer: NonNullable<Location['hideout']>['layers'][number]) => NonNullable<Location['hideout']>['layers'][number]) => {
    if (!isHideout || !isOwnedByPlayer) return;
    const hideout = currentLocation.hideout;
    if (!hideout || !Array.isArray(hideout.layers) || hideout.layers.length === 0) return;
    const safeIndex = Math.max(0, Math.min(hideout.layers.length - 1, Math.floor(layerIndex)));
    const nextLayers = hideout.layers.map((layer, idx) => idx === safeIndex ? updater(layer) : layer);
    updateLocationState({ ...currentLocation, hideout: { ...hideout, layers: nextLayers, selectedLayer: safeIndex } });
  };

  const updateHideoutLayerWithLocalLog = (
    layerIndex: number,
    updater: (layer: NonNullable<Location['hideout']>['layers'][number]) => NonNullable<Location['hideout']>['layers'][number],
    localLogText?: string
  ) => {
    if (!isHideout || !isOwnedByPlayer) return;
    const hideout = currentLocation.hideout;
    if (!hideout || !Array.isArray(hideout.layers) || hideout.layers.length === 0) return;
    const safeIndex = Math.max(0, Math.min(hideout.layers.length - 1, Math.floor(layerIndex)));
    const nextLayers = hideout.layers.map((layer, idx) => idx === safeIndex ? updater(layer) : layer);
    const nextHideout = { ...hideout, layers: nextLayers, selectedLayer: safeIndex };
    if (!localLogText) {
      updateLocationState({ ...currentLocation, hideout: nextHideout });
      return;
    }
    const safe = String(localLogText ?? '').trim();
    if (!safe) {
      updateLocationState({ ...currentLocation, hideout: nextHideout });
      return;
    }
    const entry = { day: player.day, text: safe };
    const existing = currentLocation.localLogs ?? [];
    const nextLogs = [entry, ...existing].slice(0, 30);
    updateLocationState({ ...currentLocation, hideout: nextHideout, localLogs: nextLogs });
  };

  const handleHideoutSelectLayer = (layerIndex: number) => {
    if (!isHideout || !isOwnedByPlayer) return;
    const hideout = currentLocation.hideout;
    if (!hideout || !Array.isArray(hideout.layers) || hideout.layers.length === 0) return;
    const safeIndex = Math.max(0, Math.min(hideout.layers.length - 1, Math.floor(layerIndex)));
    if (hideoutHasFallenLayers && safeIndex < hideoutSiegeLayerIndex) {
      addLog("该层已失守，暂时无法进入。");
      return;
    }
    updateLocationState({ ...currentLocation, hideout: { ...hideout, selectedLayer: safeIndex } });
  };

  const handleHideoutExpand = () => {
    if (!isHideout || !isOwnedByPlayer) return;
    const hideout = currentLocation.hideout;
    const layers = hideout?.layers ?? [];
    const nextDepth = layers.length;
    const cost = 900 + nextDepth * 650;
    if (player.gold < cost) {
      addLog("资金不足，无法扩建新层。");
      return;
    }
    const name = nextDepth === 0 ? '地面层' : `地下${nextDepth}层`;
    const nextLayer = {
      id: `hideout_layer_${nextDepth}`,
      depth: nextDepth,
      name,
      garrison: [],
      garrisonBaseLimit: 900 + nextDepth * 650,
      facilitySlots: Array.from({ length: 10 }, () => ({ type: null })),
      defenseSlots: Array.from({ length: 10 }, () => ({ type: null })),
      refineQueue: []
    };
    setPlayer(prev => ({ ...prev, gold: Math.max(0, prev.gold - cost) }));
    updateLocationState({
      ...currentLocation,
      hideout: {
        ...(hideout ?? { layers: [], selectedLayer: 0, lastRaidDay: 0, lastRaidCheckDay: 0, exposure: 8, camouflageCooldownUntilDay: 0 }),
        layers: [...layers, nextLayer],
        selectedLayer: nextDepth
      }
    });
    addLog(`隐匿点已扩建：${name}。`);
  };

  const handleHideoutDepositToGarrison = (troopId: string, amount: number) => {
    if (!isHideout || !isOwnedByPlayer) return;
    const hideout = currentLocation.hideout;
    if (!hideout || !Array.isArray(hideout.layers) || hideout.layers.length === 0) return;
    const layerIndex = Math.max(0, Math.min(hideout.layers.length - 1, hideout.selectedLayer ?? 0));
    const layer = hideout.layers[layerIndex];
    const troop = player.troops.find(t => t.id === troopId);
    if (!troop) return;
    const capBase = layer.garrisonBaseLimit ?? 900;
    const hasBarracks = (layer.facilitySlots ?? []).some(s => s.type === 'BARRACKS' && !(s.daysLeft && s.daysLeft > 0));
    const limit = hasBarracks ? Math.floor(capBase * 1.5) : capBase;
    const currentCount = (layer.garrison ?? []).reduce((sum, t) => sum + (t.count ?? 0), 0);
    const availableCapacity = limit - currentCount;
    const availableActive = (player.soldiers ?? []).filter(s => s.troopId === troopId && s.status === 'ACTIVE').length || troop.count;
    const moveCount = Math.min(amount, troop.count, availableCapacity, availableActive);
    if (moveCount <= 0) {
      addLog("该层驻军已达上限。");
      return;
    }
    const updatedPlayerTroops = player.troops
      .map(t => t.id === troopId ? { ...t, count: t.count - moveCount } : t)
      .filter(t => t.count > 0);
    const nextGarrison = [...(layer.garrison ?? [])];
    const idx = nextGarrison.findIndex(t => t.id === troopId);
    if (idx >= 0) nextGarrison[idx] = { ...nextGarrison[idx], count: nextGarrison[idx].count + moveCount };
    else nextGarrison.push({ ...troop, count: moveCount });
    setPlayer(prev => {
      let roster = Array.isArray(prev.soldiers) ? prev.soldiers.map(s => ({ ...s })) : [];
      let nextId = typeof prev.nextSoldierId === 'number' ? prev.nextSoldierId : 1;
      const activeCount = roster.filter(s => s.troopId === troopId && s.status === 'ACTIVE').length;
      const deficit = Math.max(0, moveCount - activeCount);
      const seedXp = Math.max(0, Math.floor(troop.xp ?? 0));
      for (let i = 0; i < deficit; i += 1) {
        const built = buildSoldierFromTemplate(troopId, seedXp, nextId, playerRef.current.day);
        if (built) {
          roster.push(built);
          nextId += 1;
        }
      }
      roster = moveSoldiersStatus(
        roster,
        troopId,
        'ACTIVE',
        'GARRISONED',
        moveCount,
        `Day ${playerRef.current.day} · 调入 ${layer.name} 驻军`
      );
      return { ...prev, troops: updatedPlayerTroops, soldiers: roster, nextSoldierId: nextId };
    });
    updateHideoutLayer(layerIndex, l => ({ ...l, garrison: nextGarrison }));
    addLog(`已调入 ${moveCount} 名 ${troop.name} 到 ${layer.name}。`);
  };

  const handleHideoutWithdrawFromGarrison = (troopId: string, amount: number) => {
    if (!isHideout || !isOwnedByPlayer) return;
    const hideout = currentLocation.hideout;
    if (!hideout || !Array.isArray(hideout.layers) || hideout.layers.length === 0) return;
    const layerIndex = Math.max(0, Math.min(hideout.layers.length - 1, hideout.selectedLayer ?? 0));
    const layer = hideout.layers[layerIndex];
    const garrisonTroop = (layer.garrison ?? []).find(t => t.id === troopId);
    if (!garrisonTroop) return;
    const currentCount = activeTroopCount + woundedTroopCount;
    const availableSpace = getMaxTroops() - currentCount;
    const availableGarrisoned = (player.soldiers ?? []).filter(s => s.troopId === troopId && s.status === 'GARRISONED').length || garrisonTroop.count;
    const moveCount = Math.min(amount, garrisonTroop.count, availableSpace, availableGarrisoned);
    if (moveCount <= 0) {
      addLog("队伍人数已满，无法调回。");
      return;
    }
    const updatedGarrison = (layer.garrison ?? [])
      .map(t => t.id === troopId ? { ...t, count: t.count - moveCount } : t)
      .filter(t => t.count > 0);
    const updatedPlayerTroops = [...player.troops];
    const idx = updatedPlayerTroops.findIndex(t => t.id === troopId);
    if (idx >= 0) updatedPlayerTroops[idx] = { ...updatedPlayerTroops[idx], count: updatedPlayerTroops[idx].count + moveCount };
    else {
      const template = getTroopTemplate(troopId);
      if (template) updatedPlayerTroops.push({ ...template, count: moveCount, xp: 0 });
    }
    setPlayer(prev => {
      let roster = Array.isArray(prev.soldiers) ? prev.soldiers.map(s => ({ ...s })) : [];
      let nextId = typeof prev.nextSoldierId === 'number' ? prev.nextSoldierId : 1;
      const garrisonedCount = roster.filter(s => s.troopId === troopId && s.status === 'GARRISONED').length;
      const deficit = Math.max(0, moveCount - garrisonedCount);
      const seedXp = Math.max(0, Math.floor(garrisonTroop.xp ?? 0));
      for (let i = 0; i < deficit; i += 1) {
        const built = buildSoldierFromTemplate(troopId, seedXp, nextId, playerRef.current.day);
        if (built) {
          roster.push({ ...built, status: 'GARRISONED' as const });
          nextId += 1;
        }
      }
      roster = moveSoldiersStatus(
        roster,
        troopId,
        'GARRISONED',
        'ACTIVE',
        moveCount,
        `Day ${playerRef.current.day} · 归队 ${layer.name}`
      );
      return { ...prev, troops: updatedPlayerTroops, soldiers: roster, nextSoldierId: nextId };
    });
    updateHideoutLayer(layerIndex, l => ({ ...l, garrison: updatedGarrison }));
    addLog(`已从 ${layer.name} 调回 ${moveCount} 名 ${garrisonTroop.name}。`);
  };

  const handleHideoutBuildInSlot = (category: 'FACILITY' | 'DEFENSE', slotIndex: number, building: { type: BuildingType; name: string; cost: number; days: number }) => {
    if (!isHideout || !isOwnedByPlayer) return;
    const hideout = currentLocation.hideout;
    if (!hideout || !Array.isArray(hideout.layers) || hideout.layers.length === 0) return;
    const layerIndex = Math.max(0, Math.min(hideout.layers.length - 1, hideout.selectedLayer ?? 0));
    const layer = hideout.layers[layerIndex];
    const slots = (category === 'FACILITY' ? layer.facilitySlots : layer.defenseSlots) ?? Array.from({ length: 10 }, () => ({ type: null as BuildingType | null }));
    const idx = Math.max(0, Math.min(9, Math.floor(slotIndex)));
    const existing = slots[idx] ?? { type: null };
    if (existing.type) {
      addLog("该槽位已占用。");
      return;
    }
    if (category === 'DEFENSE' && building.type === 'CAMOUFLAGE_STRUCTURE' && layer.depth !== 0) {
      addLog("伪装结构只能在地面层建造。");
      return;
    }
    if (building.type === 'MAZE_I') {
      if (category !== 'DEFENSE') {
        addLog("迷宫属于防御设施。");
        return;
      }
      if (layer.depth !== 0) {
        addLog("迷宫只能在地面层建造。");
        return;
      }
      const allDefense = (hideout.layers ?? []).flatMap(l => l.defenseSlots ?? []);
      const hasMaze = allDefense.some(s => s.type === 'MAZE_I' || s.type === 'MAZE_II' || s.type === 'MAZE_III');
      if (hasMaze) {
        addLog("迷宫为唯一建筑，隐匿点内已存在。");
        return;
      }
    }
    if (building.type === 'HOSPITAL_I') {
      if (category !== 'FACILITY') {
        addLog("地下医院属于建筑设施。");
        return;
      }
      const allFacilities = (hideout.layers ?? []).flatMap(l => l.facilitySlots ?? []);
      const hasHospital = allFacilities.some(s => s.type === 'HOSPITAL_I' || s.type === 'HOSPITAL_II' || s.type === 'HOSPITAL_III');
      if (hasHospital) {
        addLog("地下医院为唯一建筑，隐匿点内已存在。");
        return;
      }
    }
    if (building.type === 'AA_TOWER_II' || building.type === 'AA_TOWER_III' || building.type === 'AA_NET_II' || building.type === 'AA_RADAR_II') {
      const prereq = building.type === 'AA_TOWER_II'
        ? 'AA_TOWER_I'
        : building.type === 'AA_TOWER_III'
          ? 'AA_TOWER_II'
          : building.type === 'AA_NET_II'
            ? 'AA_NET_I'
            : 'AA_RADAR_I';
      const present = (layer.defenseSlots ?? []).some(s => s.type === prereq);
      if (!present) {
        addLog(`需要先在该层建造 ${getBuildingName(prereq)}。`);
        return;
      }
    }
    if (building.type === 'CAMOUFLAGE_STRUCTURE') {
      const hasCamouflage = (layer.defenseSlots ?? []).some(s => ['CAMOUFLAGE_STRUCTURE', 'CAMOUFLAGE_STRUCTURE_II', 'CAMOUFLAGE_STRUCTURE_III'].includes(s.type as any));
      if (hasCamouflage) {
        addLog("该层已存在伪装结构。");
        return;
      }
    }
    if (player.gold < building.cost) {
      addLog("资金不足，无法建造。");
      return;
    }
    setPlayer(prev => ({ ...prev, gold: Math.max(0, prev.gold - building.cost) }));
    updateHideoutLayerWithLocalLog(
      layerIndex,
      (l) => {
        const emptySlot = { type: null as BuildingType | null, daysLeft: undefined as number | undefined, totalDays: undefined as number | undefined };
        const nextSlots = [...((category === 'FACILITY' ? l.facilitySlots : l.defenseSlots) ?? Array.from({ length: 10 }, () => ({ ...emptySlot })))];
        nextSlots[idx] = { type: building.type, daysLeft: building.days, totalDays: building.days };
        return category === 'FACILITY'
          ? { ...l, facilitySlots: nextSlots }
          : { ...l, defenseSlots: nextSlots };
      },
      `开工：${layer.name} 槽位${idx + 1} 开始建造 ${building.name}。`
    );
    addLog(`开始在 ${layer.name} 建造 ${building.name}（槽位 ${idx + 1}），需要 ${building.days} 天。`);
  };

  const handleHideoutReduceExposure = () => {
    if (!isHideout || !isOwnedByPlayer) return;
    const hideout = currentLocation.hideout;
    if (!hideout || !Array.isArray(hideout.layers) || hideout.layers.length === 0) return;
    const layer0 = hideout.layers[0];
    const camouflageTypes = ['CAMOUFLAGE_STRUCTURE_III', 'CAMOUFLAGE_STRUCTURE_II', 'CAMOUFLAGE_STRUCTURE'] as const;
    const builtCamouflage = (layer0.defenseSlots ?? []).find(s => camouflageTypes.includes(s.type as any) && !(s.daysLeft && s.daysLeft > 0));
    if (!builtCamouflage) {
      addLog("需要在地面层建造伪装结构。");
      return;
    }
    const camoLevel = builtCamouflage.type === 'CAMOUFLAGE_STRUCTURE_III'
      ? 3
      : builtCamouflage.type === 'CAMOUFLAGE_STRUCTURE_II'
        ? 2
        : 1;
    const cooldownUntil = hideout.camouflageCooldownUntilDay ?? 0;
    if (player.day < cooldownUntil) {
      addLog(`伪装结构冷却中（第 ${cooldownUntil} 天可用）。`);
      return;
    }
    const cost = camoLevel === 3 ? 380 : camoLevel === 2 ? 320 : 260;
    if (player.gold < cost) {
      addLog("资金不足，无法启动伪装。");
      return;
    }
    const exposure = Math.max(0, Math.min(100, hideout.exposure ?? 0));
    const reduceAmount = camoLevel === 3 ? 40 : camoLevel === 2 ? 28 : 18;
    const reduced = Math.max(0, exposure - reduceAmount);
    setPlayer(prev => ({ ...prev, gold: Math.max(0, prev.gold - cost) }));
    updateLocationState({
      ...currentLocation,
      hideout: {
        ...hideout,
        exposure: reduced,
        camouflageCooldownUntilDay: player.day + (camoLevel === 3 ? 4 : camoLevel === 2 ? 5 : 6)
      }
    });
    addLog(`伪装结构启动：暴露程度降低 ${Math.round(exposure - reduced)}。`);
  };

  const handleHideoutUpgradeSlot = (category: 'FACILITY' | 'DEFENSE', slotIndex: number) => {
    if (!isHideout || !isOwnedByPlayer) return;
    const hideout = currentLocation.hideout;
    if (!hideout || !Array.isArray(hideout.layers) || hideout.layers.length === 0) return;
    const layerIndex = Math.max(0, Math.min(hideout.layers.length - 1, hideout.selectedLayer ?? 0));
    const layer = hideout.layers[layerIndex];
    const idx = Math.max(0, Math.min(9, Math.floor(slotIndex)));
    const slots = (category === 'FACILITY' ? layer.facilitySlots : layer.defenseSlots) ?? [];
    const slot = (slots as any[])[idx] as any;
    const type = (slot?.type ?? null) as BuildingType | null;
    if (!type) return;
    if (slot?.daysLeft && slot.daysLeft > 0) {
      addLog("该建筑仍在施工中。");
      return;
    }
    const nextType = getUpgradeNextType(type);
    if (!nextType) {
      addLog("该建筑已达到最高等级。");
      return;
    }
    if (type === 'MAZE_I' || type === 'MAZE_II') {
      if (layer.depth !== 0 || category !== 'DEFENSE') {
        addLog("迷宫只能存在于地面层的防御槽。");
        return;
      }
    }
    if (type === 'CAMOUFLAGE_STRUCTURE' || type === 'CAMOUFLAGE_STRUCTURE_II') {
      if (layer.depth !== 0 || category !== 'DEFENSE') {
        addLog("伪装结构只能存在于地面层的防御槽。");
        return;
      }
    }
    const spec = getUpgradeCostDays(type, nextType);
    if (!spec) return;
    if (player.gold < spec.cost) {
      addLog("资金不足，无法升级。");
      return;
    }
    setPlayer(prev => ({ ...prev, gold: Math.max(0, prev.gold - spec.cost) }));
    updateHideoutLayerWithLocalLog(
      layerIndex,
      (l) => {
        const emptySlot = { type: null as BuildingType | null, daysLeft: undefined as number | undefined, totalDays: undefined as number | undefined };
        const nextSlots = [...((category === 'FACILITY' ? l.facilitySlots : l.defenseSlots) ?? Array.from({ length: 10 }, () => ({ ...emptySlot })))];
        const existing = nextSlots[idx] ?? { ...emptySlot };
        nextSlots[idx] = { ...existing, type: nextType, daysLeft: spec.days, totalDays: spec.days };
        return category === 'FACILITY'
          ? { ...l, facilitySlots: nextSlots }
          : { ...l, defenseSlots: nextSlots };
      },
      `升级：${layer.name} 槽位${idx + 1} 升级为 ${spec.name}（${spec.days}天）。`
    );
    addLog(`开始升级为 ${spec.name}，需要 ${spec.days} 天。`);
  };

  const handleHideoutStartRefine = () => {
    if (!isHideout || !isOwnedByPlayer) return;
    const hideout = currentLocation.hideout;
    if (!hideout || !Array.isArray(hideout.layers) || hideout.layers.length === 0) return;
    const layerIndex = Math.max(0, Math.min(hideout.layers.length - 1, hideout.selectedLayer ?? 0));
    const layer = hideout.layers[layerIndex];
    const hasRefinery = (layer.facilitySlots ?? []).some(s => s.type === 'ORE_REFINERY' && !(s.daysLeft && s.daysLeft > 0));
    if (!hasRefinery) {
      addLog("需要先在该层建造矿石精炼厂。");
      return;
    }
    const fromPurity = Math.max(1, Math.min(4, Math.floor(hideoutRefineFromPurity))) as MineralPurity;
    const toPurity = (fromPurity + 1) as MineralPurity;
    const outputs = Math.max(1, Math.min(50, Math.floor(hideoutRefineOutputCount || 1)));
    const inputAmount = outputs * 3;
    const record = mineralInventory[hideoutRefineMineralId] ?? { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    const available = record[fromPurity] ?? 0;
    if (available < inputAmount) {
      addLog("矿石不足，无法开始精炼。");
      return;
    }
    const cost = outputs * (40 + toPurity * 25);
    if (player.gold < cost) {
      addLog("资金不足，无法开始精炼。");
      return;
    }
    const days = 1 + toPurity;
    const nextMinerals = {
      ...mineralInventory,
      [hideoutRefineMineralId]: {
        ...record,
        [fromPurity]: available - inputAmount
      }
    };
    const jobId = `refine_${Date.now()}_${Math.floor(Math.random() * 100000)}`;
    setPlayer(prev => ({ ...prev, gold: Math.max(0, prev.gold - cost), minerals: nextMinerals }));
    updateHideoutLayer(layerIndex, l => ({
      ...l,
      refineQueue: [
        ...((l.refineQueue ?? []) as any[]),
        {
          id: jobId,
          mineralId: hideoutRefineMineralId,
          fromPurity,
          toPurity,
          inputAmount,
          outputAmount: outputs,
          daysLeft: days,
          totalDays: days
        }
      ]
    }));
    addLog(`开始精炼：${hideoutRefineMineralId} 纯度${fromPurity}×${inputAmount} → 纯度${toPurity}×${outputs}（${days} 天）。`);
  };

  const handleHideoutSetGuardian = (heroId: string) => {
    if (!isHideout || !isOwnedByPlayer) return;
    const hideout = currentLocation.hideout;
    if (!hideout || !Array.isArray(hideout.layers) || hideout.layers.length === 0) return;
    const layerIndex = Math.max(0, Math.min(hideout.layers.length - 1, hideout.selectedLayer ?? 0));
    const layerName = hideout.layers[layerIndex]?.name ?? `第${layerIndex}层`;
    const prevGuardianId = hideout.layers[layerIndex]?.guardianHeroId;
    updateHideoutLayerWithLocalLog(
      layerIndex,
      (l) => ({ ...l, guardianHeroId: heroId || undefined }),
      heroId
        ? `守护者更替：${heroes.find(h => h.id === heroId)?.name ?? heroId} 前往 ${layerName} 驻守。`
        : `守护者撤离：${layerName} 的守护者已返回随行队伍。`
    );
    setHeroes(prev => prev.map(h => {
      if (h.id !== heroId && h.id !== (prevGuardianId ?? '')) return h;
      if (h.status === 'DEAD' || !h.recruited) return h;
      if (h.id === heroId) return { ...h, locationId: currentLocation.id, stayDays: undefined };
      return { ...h, locationId: undefined, stayDays: undefined };
    }));
    if (heroId) {
      addLog("已更换该层守护者。");
    } else {
      addLog("已撤下该层守护者。");
    }
  };

  const renderRecruitCard = (offer: RecruitOffer, type: 'VOLUNTEER' | 'MERCENARY') => {
    const tmpl = getTroopTemplate(offer.troopId);
    if (!tmpl) return null;
    const totalCost = offer.cost * offer.count;
    const singleCost = offer.cost;

    const canAffordAll = player.gold >= totalCost;
    const canAffordOne = player.gold >= singleCost;
    const canRecruitOne = currentTroopCount + 1 <= maxTroops;
    const canRecruitAll = currentTroopCount + offer.count <= maxTroops;

    let btnLabelAll = `全部招募 (${totalCost})`;
    if (!canAffordAll) btnLabelAll = "资金不足";
    if (!canRecruitAll) btnLabelAll = "队伍将满";

    return (
      <TroopCard
        key={offer.troopId}
        troop={{ ...tmpl, count: offer.count, xp: 0 } as Troop}
        price={offer.cost}
        count={offer.count}
        countLabel="库存"
        actionLabel={btnLabelAll}
        onAction={() => handleRecruitOffer(offer, type)}
        disabled={!canAffordAll || !canRecruitAll}
        secondaryActionLabel={`招募1个 (${singleCost})`}
        onSecondaryAction={() => handleRecruitOffer(offer, type, 1)}
        secondaryDisabled={!canAffordOne || !canRecruitOne}
      />
    );
  };

  if (isWantedHere) {
    const mood = getLocationRelationFlavor(locationRelationValue);
    return (
      <div className="max-w-5xl mx-auto p-4 animate-fade-in pb-20 mt-10">
        <div className="relative h-48 rounded-t-lg overflow-hidden border-b-4 border-red-700 mb-6 bg-stone-800">
          <div
            className="absolute inset-0 opacity-60"
            style={getBgImageStyle()}
          />
          <div className="absolute bottom-0 left-0 p-6 bg-gradient-to-t from-stone-900 to-transparent w-full">
            <div className="flex justify-between items-end">
              <div>
                <h2 className="text-4xl font-serif flex items-center gap-3 text-red-300">
                  <AlertTriangle size={32} />
                  {currentLocation.name}
                  <span className="text-sm bg-stone-800 text-stone-400 px-2 py-1 rounded border border-stone-600 uppercase">{currentLocation.type}</span>
                </h2>
                <p className="text-stone-300 mt-2">{currentLocation.description}</p>
                <div className="text-sm text-red-200 mt-2">{mood}</div>
                <div className="text-xs text-stone-400 mt-2">
                  与此地关系：{getLocationRelationLabel(locationRelationValue)}（{locationRelationValue}）
                </div>
              </div>
              <div className="flex gap-2">
                <Button onClick={onBackToMap} variant="secondary">返回地图</Button>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-red-950/30 border border-red-800 rounded p-4">
          <div className="text-red-200 font-bold">守卫拦下了你</div>
          <div className="text-sm text-stone-300 mt-2">
            你无法进入城内。若想解除通缉，需要改善你与此地的关系。
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto p-4 animate-fade-in pb-20 mt-10">
      <div className="relative h-48 rounded-t-lg overflow-hidden border-b-4 border-amber-600 mb-6 bg-stone-800">
        <div
          className="absolute inset-0 opacity-60"
          style={getBgImageStyle()}
        />
        <div className="absolute bottom-0 left-0 p-6 bg-gradient-to-t from-stone-900 to-transparent w-full">
          <div className="flex justify-between items-end">
            <div>
              <h2 className={`text-4xl font-serif flex items-center gap-3 ${isGraveyard ? 'text-stone-400' : isHotpot ? 'text-red-500' : isCoffee ? 'text-amber-400' : 'text-amber-500'}`}>
                {isGraveyard && <Skull size={32} />}
                {isHotpot && <Utensils size={32} />}
                {isCoffee && <Ghost size={32} />}
                {isImposterPortal && <Zap size={32} />}
                {currentLocation.activeSiege && <Swords size={32} className="text-red-500 animate-pulse" />}
                {currentLocation.name}
                <span className="text-sm bg-stone-800 text-stone-400 px-2 py-1 rounded border border-stone-600 uppercase">{currentLocation.type}</span>
              </h2>
              <p className="text-stone-300 mt-2">{currentLocation.description}</p>
              {(isCity || isCastle || isVillage) && !isOwnedByPlayer && (
                <div className="text-sm text-stone-400 mt-2">
                  与此地关系：{getLocationRelationLabel(locationRelationValue)}（{locationRelationValue}）{` `}{getLocationRelationFlavor(locationRelationValue)}
                </div>
              )}
              {ownerLord && (
                <div className="text-sm text-stone-400 mt-2">{isFieldCamp ? '营地首领' : '归属领主'}：{ownerLord.title}{ownerLord.name}</div>
              )}
              <div className="flex flex-wrap gap-2 mt-3 text-xs text-stone-400">
                <span className="px-2 py-0.5 rounded border border-stone-700 bg-stone-900/40">留存部队 {totalGarrisonCount}</span>
                <span className="px-2 py-0.5 rounded border border-stone-700 bg-stone-900/40">驻军战力 {totalGarrisonPower}</span>
                {isImposterAlerted && (
                  <span className="px-2 py-0.5 rounded border border-red-700 text-red-300 bg-red-950/50">入侵中</span>
                )}
                {currentLocation.activeSiege && (
                  <span className="px-2 py-0.5 rounded border border-red-600 text-red-200 bg-red-900/60 animate-pulse">正在战斗</span>
                )}
                {isSacked && (
                  <span className="px-2 py-0.5 rounded border border-amber-800 text-amber-300 bg-amber-950/40">被洗劫</span>
                )}
              </div>
            </div>
            <div className="flex gap-2">
              {isCity && (
                <Button onClick={handleCityRest} variant="secondary" disabled={!canRestInCity}>
                  休息一天（-{cityRestCost}）
                </Button>
              )}
              <Button onClick={onBackToMap} variant="secondary">返回地图</Button>
            </div>
          </div>
        </div>
      </div>

      {currentLocation.activeSiege && (
        <div className="mb-6 p-4 bg-red-950/40 border border-red-800 rounded flex flex-col md:flex-row items-center justify-between gap-4 animate-fade-in shadow-lg shadow-red-900/20">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-red-900/20 rounded-full border border-red-800 text-red-500 hidden md:block">
              <Swords size={32} />
            </div>
            <div>
              <h3 className="text-xl font-bold text-red-400 flex items-center gap-2">
                <AlertTriangle size={20} /> 此地正在爆发激战！
              </h3>
              <p className="text-stone-400 text-sm mt-1">
                <span className="text-red-300">{currentLocation.activeSiege.attackerName}</span> ({getGarrisonCount(currentLocation.activeSiege.troops)}人) 正在围攻据点。
                守军剩余: <span className="text-green-300">{isHideout ? hideoutSiegeLayerGarrisonCount : getGarrisonCount(currentLocation.garrison ?? [])}人</span>。
              </p>
              {isHideout && (
                <div className="mt-2 inline-flex items-center gap-2 px-3 py-1 rounded border border-red-700 text-red-300 bg-red-950/50 animate-pulse text-xs">
                  被攻击层：{hideoutSiegeLayer?.name ?? `第${hideoutSiegeLayerIndex}层`}
                </div>
              )}
            </div>
          </div>
          <Button
            onClick={() => {
              const siege = currentLocation.activeSiege!;
              const enemy: EnemyForce = {
                id: `siege_defense_${Date.now()}`,
                name: siege.attackerName,
                description: '正在围攻据点的敌人。',
                troops: siege.troops,
                difficulty: '困难',
                lootPotential: 1.2,
                terrain: currentLocation.terrain,
                baseTroopId: siege.troops[0]?.id ?? 'militia',
                siegeEngines: siege.siegeEngines ?? []
              };
              onDefenseAidJoin(currentLocation, enemy);
              setActiveEnemy(enemy);

              const defenseDetails = getLocationDefenseDetails(currentLocation);
              const defenseBuildings = (currentLocation.buildings ?? []).includes('DEFENSE') ? "有额外防御建筑" : "无额外防御建筑";
              const attackerEngines = (siege.siegeEngines ?? []).map(getSiegeEngineName).join('、') || '无（或仅云梯）';

              setPendingBattleMeta({
                mode: 'DEFENSE_AID',
                targetLocationId: currentLocation.id,
                siegeContext: `守城战：玩家正在协助 ${currentLocation.name} 抵抗 ${siege.attackerName} 的围攻。
                       防御方设施：${defenseDetails.wallName}（Lv.${defenseDetails.wallLevel}），设施：${defenseDetails.mechanisms.map(m => m.name).join('、') || '无'}。${defenseBuildings}。
                       城防耐久：${defenseDetails.wallHp + defenseDetails.mechanismHp}，远程命中 +${Math.round(defenseDetails.rangedHitBonus * 100)}%，远程伤害 +${Math.round(defenseDetails.rangedDamageBonus * 100)}%，近战减伤 ${Math.round(defenseDetails.meleeDamageReduction * 100)}%。
                       进攻方器械：${attackerEngines}。`
              });
              setPendingBattleIsTraining(false);
              onEnterBattle();
            }}
            variant="danger"
            size="lg"
            className="w-full md:w-auto font-bold tracking-wider"
          >
            <Shield size={18} className="mr-2" /> 加入守军
          </Button>
        </div>
      )}

      <div className="flex gap-1 mb-6 border-b border-stone-700 overflow-x-auto">
        {isFieldCamp && (
          <>
            <button
              onClick={() => setTownTab('SIEGE')}
              className={`px-6 py-3 font-serif font-bold text-sm whitespace-nowrap ${activeTownTab === 'SIEGE' ? 'bg-stone-800 text-amber-500 border-t-2 border-amber-500' : 'text-stone-500 hover:text-stone-300'}`}
            >
              <Swords size={16} className="inline mr-2" /> 行军
            </button>
            <button
              onClick={() => setTownTab('DEFENSE')}
              className={`px-6 py-3 font-serif font-bold text-sm whitespace-nowrap ${activeTownTab === 'DEFENSE' ? 'bg-stone-800 text-amber-500 border-t-2 border-amber-500' : 'text-stone-500 hover:text-stone-300'}`}
            >
              <ShieldAlert size={16} className="inline mr-2" /> 防御设施
            </button>
            <button
              onClick={() => setTownTab('LORD')}
              className={`px-6 py-3 font-serif font-bold text-sm whitespace-nowrap ${activeTownTab === 'LORD' ? 'bg-stone-800 text-amber-500 border-t-2 border-amber-500' : 'text-stone-500 hover:text-stone-300'}`}
            >
              <MessageCircle size={16} className="inline mr-2" /> 首领
            </button>
          </>
        )}
        {!isFieldCamp && (
          <>
        {isHideout && isOwnedByPlayer && (
          <button
            onClick={() => setTownTab('HIDEOUT')}
            className={`px-6 py-3 font-serif font-bold text-sm whitespace-nowrap ${activeTownTab === 'HIDEOUT' ? 'bg-stone-800 text-emerald-300 border-t-2 border-emerald-500' : 'text-stone-500 hover:text-stone-300'}`}
          >
            <Shield size={16} className="inline mr-2" /> 隐匿点
          </button>
        )}
        {!isHideout && (
          <>
        {!isImposterPortal && !isRestricted && !isSpecialLocation && !isRoachNest && (
          <button
            onClick={() => setTownTab('RECRUIT')}
            className={`px-6 py-3 font-serif font-bold text-sm whitespace-nowrap ${activeTownTab === 'RECRUIT' ? 'bg-stone-800 text-amber-500 border-t-2 border-amber-500' : 'text-stone-500 hover:text-stone-300'}`}
          >
            <Users size={16} className="inline mr-2" /> {recruitLabel}
          </button>
        )}
        {isCoffee && !isRestricted && (
          <button
            onClick={() => setTownTab('COFFEE_CHAT')}
            className={`px-6 py-3 font-serif font-bold text-sm whitespace-nowrap ${activeTownTab === 'COFFEE_CHAT' ? 'bg-stone-800 text-amber-500 border-t-2 border-amber-500' : 'text-stone-500 hover:text-stone-300'}`}
          >
            <MessageCircle size={16} className="inline mr-2" /> 亡灵闲谈
          </button>
        )}
        {isHabitat && !isRestricted && (
          <button
            onClick={() => setTownTab('HABITAT')}
            className={`px-6 py-3 font-serif font-bold text-sm whitespace-nowrap ${activeTownTab === 'HABITAT' ? 'bg-stone-800 text-emerald-300 border-t-2 border-emerald-500' : 'text-stone-500 hover:text-stone-300'}`}
          >
            <MapPin size={16} className="inline mr-2" /> 栖息
          </button>
        )}
        {isSealHabitat && (
          <button
            onClick={() => setTownTab('SEAL_HABITAT')}
            className={`px-6 py-3 font-serif font-bold text-sm whitespace-nowrap ${activeTownTab === 'SEAL_HABITAT' ? 'bg-stone-800 text-cyan-300 border-t-2 border-cyan-500' : 'text-stone-500 hover:text-stone-300'}`}
          >
            <span className="inline mr-2">🦭</span> 海狮饲养
          </button>
        )}
        {isCity && !isRestricted && (
          <button
            onClick={() => setTownTab('TAVERN')}
            className={`px-6 py-3 font-serif font-bold text-sm whitespace-nowrap ${activeTownTab === 'TAVERN' ? 'bg-stone-800 text-amber-500 border-t-2 border-amber-500' : 'text-stone-500 hover:text-stone-300'}`}
          >
            <Beer size={16} className="inline mr-2" /> {tavernLabel}
          </button>
        )}
        {isCity && !isRestricted && (
          <button
            onClick={() => setTownTab('WORK')}
            className={`px-6 py-3 font-serif font-bold text-sm whitespace-nowrap ${activeTownTab === 'WORK' ? 'bg-stone-800 text-amber-500 border-t-2 border-amber-500' : 'text-stone-500 hover:text-stone-300'}`}
          >
            <Coins size={16} className="inline mr-2" /> 打工
          </button>
        )}
        {isMine && !isRestricted && (
          <button
            onClick={() => setTownTab('MINING')}
            className={`px-6 py-3 font-serif font-bold text-sm whitespace-nowrap ${activeTownTab === 'MINING' ? 'bg-stone-800 text-emerald-400 border-t-2 border-emerald-500' : 'text-stone-500 hover:text-stone-300'}`}
          >
            <Mountain size={16} className="inline mr-2" /> 采矿
          </button>
        )}
        {isRoachNest && !isRestricted && (
          <button
            onClick={() => setTownTab('ROACH_LURE')}
            className={`px-6 py-3 font-serif font-bold text-sm whitespace-nowrap ${activeTownTab === 'ROACH_LURE' ? 'bg-stone-800 text-lime-300 border-t-2 border-lime-500' : 'text-stone-500 hover:text-stone-300'}`}
          >
            <span className="inline mr-2">🪳</span> 吸引蟑螂
          </button>
        )}
        {isBlacksmith && !isRestricted && (
          <button
            onClick={() => setTownTab('FORGE')}
            className={`px-6 py-3 font-serif font-bold text-sm whitespace-nowrap ${activeTownTab === 'FORGE' ? 'bg-stone-800 text-orange-400 border-t-2 border-orange-500' : 'text-stone-500 hover:text-stone-300'}`}
          >
            <Hammer size={16} className="inline mr-2" /> 铁匠铺
          </button>
        )}
        {isCrystalFoundry && !isRestricted && (
          <button
            onClick={() => setTownTab('FOUNDRY')}
            className={`px-6 py-3 font-serif font-bold text-sm whitespace-nowrap ${activeTownTab === 'FOUNDRY' ? 'bg-stone-800 text-cyan-300 border-t-2 border-cyan-500' : 'text-stone-500 hover:text-stone-300'}`}
          >
            <Hammer size={16} className="inline mr-2" /> 熔炼所
          </button>
        )}
        {isMegaFarm && !isRestricted && (
          <button
            onClick={() => setTownTab('FARM')}
            className={`px-6 py-3 font-serif font-bold text-sm whitespace-nowrap ${activeTownTab === 'FARM' ? 'bg-stone-800 text-lime-300 border-t-2 border-lime-500' : 'text-stone-500 hover:text-stone-300'}`}
          >
            <Coins size={16} className="inline mr-2" /> 农田
          </button>
        )}
        {isMagicianLibrary && !isRestricted && (
          <button
            onClick={() => setTownTab('MAGICIAN_LIBRARY')}
            className={`px-6 py-3 font-serif font-bold text-sm whitespace-nowrap ${activeTownTab === 'MAGICIAN_LIBRARY' ? 'bg-stone-800 text-sky-300 border-t-2 border-sky-500' : 'text-stone-500 hover:text-stone-300'}`}
          >
            <History size={16} className="inline mr-2" /> 魔法师图书馆
          </button>
        )}
        {isRecompiler && !isRestricted && (
          <button
            onClick={() => setTownTab('RECOMPILER')}
            className={`px-6 py-3 font-serif font-bold text-sm whitespace-nowrap ${activeTownTab === 'RECOMPILER' ? 'bg-stone-800 text-fuchsia-200 border-t-2 border-fuchsia-500' : 'text-stone-500 hover:text-stone-300'}`}
          >
            <Brain size={16} className="inline mr-2" /> 重塑塔
          </button>
        )}
        {isAltar && (
          <button
            onClick={() => setTownTab('ALTAR')}
            className={`px-6 py-3 font-serif font-bold text-sm whitespace-nowrap ${activeTownTab === 'ALTAR' ? 'bg-stone-800 text-purple-300 border-t-2 border-purple-500' : 'text-stone-500 hover:text-stone-300'}`}
          >
            <Star size={16} className="inline mr-2" /> 祭坛
          </button>
        )}
        {isAltar && altarHasTree && (
          <button
            onClick={() => setTownTab('ALTAR_RECRUIT')}
            className={`px-6 py-3 font-serif font-bold text-sm whitespace-nowrap ${activeTownTab === 'ALTAR_RECRUIT' ? 'bg-stone-800 text-purple-200 border-t-2 border-purple-400' : 'text-stone-500 hover:text-stone-300'}`}
          >
            <Users size={16} className="inline mr-2" /> 传教招募
          </button>
        )}
        {!isImposterPortal && !isSpecialLocation && (
          <button
            onClick={() => setTownTab('GARRISON')}
            className={`px-6 py-3 font-serif font-bold text-sm whitespace-nowrap ${activeTownTab === 'GARRISON' ? 'bg-stone-800 text-amber-500 border-t-2 border-amber-500' : 'text-stone-500 hover:text-stone-300'}`}
          >
            <Users size={16} className="inline mr-2" /> 驻留部队
          </button>
        )}
        {!isSpecialLocation && (
          <button
            onClick={() => setTownTab('LOCAL_GARRISON')}
            className={`px-6 py-3 font-serif font-bold text-sm whitespace-nowrap ${activeTownTab === 'LOCAL_GARRISON' ? 'bg-stone-800 text-amber-500 border-t-2 border-amber-500' : 'text-stone-500 hover:text-stone-300'}`}
          >
            <Users size={16} className="inline mr-2" /> 驻军
          </button>
        )}
        {isImposterPortal && (
          <button
            onClick={() => setTownTab('IMPOSTER_STATIONED')}
            className={`px-6 py-3 font-serif font-bold text-sm whitespace-nowrap ${activeTownTab === 'IMPOSTER_STATIONED' ? 'bg-fuchsia-900/60 text-fuchsia-200 border-t-2 border-fuchsia-500' : 'text-stone-500 hover:text-stone-300'}`}
          >
            <Zap size={16} className="inline mr-2" /> 驻留军团
          </button>
        )}
        {isSiegeTarget && !isOwnedByPlayer && !isImposterPortal && (
          <button
            onClick={() => setTownTab('SIEGE')}
            className={`px-6 py-3 font-serif font-bold text-sm whitespace-nowrap ${activeTownTab === 'SIEGE' ? 'bg-stone-800 text-amber-500 border-t-2 border-amber-500' : 'text-stone-500 hover:text-stone-300'}`}
          >
            <Swords size={16} className="inline mr-2" /> 攻城
          </button>
        )}
        {isImposterPortal && !isOwnedByPlayer && (
          <button
            onClick={() => setTownTab('SIEGE')}
            className={`px-6 py-3 font-serif font-bold text-sm whitespace-nowrap ${activeTownTab === 'SIEGE' ? 'bg-fuchsia-900/60 text-fuchsia-200 border-t-2 border-fuchsia-500' : 'text-stone-500 hover:text-stone-300'}`}
          >
            <Swords size={16} className="inline mr-2" /> 攻打传送门
          </button>
        )}
        {isOwnedByPlayer && !isImposterPortal && !isRestricted && (
          <button
            onClick={() => setTownTab('OWNED')}
            className={`px-6 py-3 font-serif font-bold text-sm whitespace-nowrap ${activeTownTab === 'OWNED' ? 'bg-stone-800 text-amber-500 border-t-2 border-amber-500' : 'text-stone-500 hover:text-stone-300'}`}
          >
            <Home size={16} className="inline mr-2" /> 领地
          </button>
        )}
        {hasLord && !isSpecialLocation && !isRestricted && (
          <button
            onClick={() => setTownTab('LORD')}
            className={`px-6 py-3 font-serif font-bold text-sm whitespace-nowrap ${activeTownTab === 'LORD' ? 'bg-stone-800 text-amber-500 border-t-2 border-amber-500' : 'text-stone-500 hover:text-stone-300'}`}
          >
            <MessageCircle size={16} className="inline mr-2" /> 领主
          </button>
        )}
        {(!isImposterPortal || isImposterPortal) && (!isRestricted || isImposterPortal) && !isSpecialLocation && (
          <button
            onClick={() => setTownTab('DEFENSE')}
            className={`px-6 py-3 font-serif font-bold text-sm whitespace-nowrap ${activeTownTab === 'DEFENSE' ? (isImposterPortal ? 'bg-fuchsia-900/60 text-fuchsia-200 border-t-2 border-fuchsia-500' : 'bg-stone-800 text-amber-500 border-t-2 border-amber-500') : 'text-stone-500 hover:text-stone-300'}`}
          >
            <ShieldAlert size={16} className="inline mr-2" /> 防御设施
          </button>
        )}

        {isGraveyard && !isRestricted && (
          <button
            onClick={() => setTownTab('MEMORIAL')}
            className={`px-6 py-3 font-serif font-bold text-sm whitespace-nowrap ${activeTownTab === 'MEMORIAL' ? 'bg-stone-800 text-amber-500 border-t-2 border-amber-500' : 'text-stone-500 hover:text-stone-300'}`}
          >
            <Skull size={16} className="inline mr-2" /> 英灵殿
          </button>
        )}
          </>
        )}
          </>
        )}
      </div>

      <div className="min-h-[400px]">
        {activeTownTab === 'HIDEOUT' && isHideout && isOwnedByPlayer && (
          <div className="space-y-6 animate-fade-in">
            <div className="bg-stone-900/60 p-6 rounded border border-emerald-900/40">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                <div>
                  <div className="text-stone-200 font-bold">隐匿点分层</div>
                  <div className="text-stone-400 text-sm mt-1">
                    当前层：{hideoutSelectedLayer?.name ?? '未知'}｜驻军 {hideoutLayerGarrisonCount}/{hideoutLayerLimit}
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <div className="flex items-center gap-2">
                    <div className="text-sm text-stone-400">扩建新层成本：</div>
                    <div className="text-amber-400 font-mono">{900 + ((hideoutState?.layers?.length ?? 0)) * 650}</div>
                    <Button
                      variant="secondary"
                      disabled={player.gold < (900 + ((hideoutState?.layers?.length ?? 0)) * 650)}
                      onClick={handleHideoutExpand}
                    >
                      扩建
                    </Button>
                  </div>
                  <div className="w-full md:w-[360px]">
                    <div className="flex items-center justify-between text-xs text-stone-500 mb-1">
                      <span>暴露程度</span>
                      <span className="font-mono">{Math.round(hideoutExposure)}%</span>
                    </div>
                    <div className="w-full h-3 bg-stone-950 border border-stone-800 rounded overflow-hidden">
                      <div
                        className="h-full transition-all"
                        style={{
                          width: `${hideoutExposure}%`,
                          backgroundColor: hideoutExposure >= 85 ? '#ef4444' : hideoutExposure >= 65 ? '#f97316' : hideoutExposure >= 40 ? '#eab308' : '#34d399'
                        }}
                      />
                    </div>
                    <div className="mt-2 flex items-center justify-end gap-2">
                      <Button
                        variant="secondary"
                        disabled={camouflageLevel <= 0 || player.day < hideoutCamouflageCooldownUntilDay || player.gold < camouflageCost}
                        onClick={handleHideoutReduceExposure}
                      >
                        {player.day < hideoutCamouflageCooldownUntilDay ? `冷却至第${hideoutCamouflageCooldownUntilDay}天` : '降低暴露'}
                      </Button>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                <Button
                  variant="secondary"
                  onClick={() => onInspectHideout(hideoutSelectedLayerIndex)}
                  disabled={!!currentLocation.activeSiege}
                >
                  视察据点
                </Button>
                {(hideoutState?.layers ?? []).map((layer, idx) => (
                  <button
                    key={layer.id}
                    onClick={() => handleHideoutSelectLayer(idx)}
                    disabled={hideoutHasFallenLayers && idx < hideoutSiegeLayerIndex}
                    className={`px-3 py-1 rounded border text-sm ${idx === hideoutSelectedLayerIndex ? 'bg-emerald-900/40 border-emerald-700 text-emerald-200' : hideoutHasFallenLayers && idx < hideoutSiegeLayerIndex ? 'bg-stone-950/40 border-stone-900 text-stone-600 cursor-not-allowed' : 'bg-stone-900/60 border-stone-700 text-stone-400 hover:border-stone-500'}`}
                  >
                    L{layer.depth} {layer.name}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              {([
                { id: 'DASHBOARD', label: '仪表盘' },
                { id: 'GARRISON', label: '驻军' },
                { id: 'GUARDIAN', label: '守护者' },
                { id: 'FACILITIES', label: '建筑槽' },
                { id: 'DEFENSE', label: '防御槽' },
                { id: 'RECRUIT', label: '征兵' },
                { id: 'REFINERY', label: '精炼' },
                { id: 'LOGS', label: '据点日志' }
              ] as const).map(item => (
                <button
                  key={item.id}
                  onClick={() => {
                    setHideoutBuildTarget(null);
                    setHideoutInspectTarget(null);
                    setHideoutPage(item.id);
                  }}
                  className={`px-3 py-2 rounded border text-sm ${hideoutPage === item.id ? 'bg-emerald-900/30 border-emerald-700 text-emerald-200' : 'bg-stone-900/60 border-stone-700 text-stone-400 hover:border-stone-500'}`}
                >
                  {item.label}
                </button>
              ))}
            </div>

            {hideoutPage === 'DASHBOARD' && (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                <div className="bg-stone-900/60 border border-stone-800 rounded p-5">
                  <div className="flex items-center justify-between">
                    <div className="text-stone-200 font-bold">统计</div>
                    <Home size={16} className="text-emerald-300" />
                  </div>
                  <div className="mt-3 space-y-3">
                    <div>
                      <div className="flex items-center justify-between text-xs text-stone-500">
                        <span>建筑槽（该层）</span>
                        <span>{hideoutFacilityUsed}/10 {hideoutFacilityBuilding > 0 ? `· 施工中 ${hideoutFacilityBuilding}` : ''}</span>
                      </div>
                      <div className="h-2 bg-stone-950/60 border border-stone-800 rounded mt-1 overflow-hidden">
                        <div className="h-full bg-emerald-700/60" style={{ width: `${Math.round((hideoutFacilityUsed / 10) * 100)}%` }} />
                      </div>
                    </div>
                    <div>
                      <div className="flex items-center justify-between text-xs text-stone-500">
                        <span>防御槽（该层）</span>
                        <span>{hideoutDefenseUsed}/10 {hideoutDefenseBuilding > 0 ? `· 施工中 ${hideoutDefenseBuilding}` : ''}</span>
                      </div>
                      <div className="h-2 bg-stone-950/60 border border-stone-800 rounded mt-1 overflow-hidden">
                        <div className="h-full bg-emerald-700/60" style={{ width: `${Math.round((hideoutDefenseUsed / 10) * 100)}%` }} />
                      </div>
                    </div>
                    <div className="text-xs text-stone-500">
                      全隐匿点：建筑 {hideoutAllFacilityUsed}/{hideoutAllSlotsTotal} · 防御 {hideoutAllDefenseUsed}/{hideoutAllSlotsTotal}
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => setHideoutPage('GARRISON')}
                  className="text-left bg-stone-900/60 border border-stone-800 rounded p-5 hover:border-stone-600 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="text-stone-200 font-bold">驻军</div>
                    <Users size={16} className="text-emerald-300" />
                  </div>
                  <div className="text-stone-400 text-sm mt-2">该层 {hideoutLayerGarrisonCount}/{hideoutLayerLimit}｜战力 {Math.round(hideoutLayerGarrisonPower)}</div>
                </button>
                <button
                  onClick={() => setHideoutPage('GUARDIAN')}
                  className="text-left bg-stone-900/60 border border-stone-800 rounded p-5 hover:border-stone-600 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="text-stone-200 font-bold">守护者</div>
                    <Shield size={16} className="text-emerald-300" />
                  </div>
                  <div className="text-stone-400 text-sm mt-2">
                    {hideoutSelectedLayer?.guardianHeroId
                      ? `已设置：${heroes.find(h => h.id === hideoutSelectedLayer.guardianHeroId)?.name ?? hideoutSelectedLayer.guardianHeroId}`
                      : '未设置'}
                  </div>
                </button>
                <button
                  onClick={() => setHideoutPage('FACILITIES')}
                  className="text-left bg-stone-900/60 border border-stone-800 rounded p-5 hover:border-stone-600 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="text-stone-200 font-bold">建筑槽</div>
                    <Home size={16} className="text-emerald-300" />
                  </div>
                  <div className="text-stone-400 text-sm mt-2">点击空槽位，进入建造列表。</div>
                </button>
                <button
                  onClick={() => setHideoutPage('DEFENSE')}
                  className="text-left bg-stone-900/60 border border-stone-800 rounded p-5 hover:border-stone-600 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="text-stone-200 font-bold">防御槽</div>
                    <ShieldAlert size={16} className="text-emerald-300" />
                  </div>
                  <div className="text-stone-400 text-sm mt-2">防御与防空可重复堆叠。</div>
                </button>
                <button
                  onClick={() => setHideoutPage('REFINERY')}
                  disabled={!hideoutHasRefineryBuilt}
                  className={`text-left bg-stone-900/60 border rounded p-5 transition-colors ${hideoutHasRefineryBuilt ? 'border-stone-800 hover:border-stone-600' : 'border-stone-900 opacity-50 cursor-not-allowed'}`}
                >
                  <div className="flex items-center justify-between">
                    <div className="text-stone-200 font-bold">矿石精炼</div>
                    <Mountain size={16} className="text-emerald-300" />
                  </div>
                  <div className="text-stone-400 text-sm mt-2">{hideoutHasRefineryBuilt ? '将低纯度矿石熔炼为更高纯度。' : '需要先建造矿石精炼厂。'}</div>
                </button>
                <div className="bg-stone-900/60 border border-stone-800 rounded p-5">
                  <div className="flex items-center justify-between">
                    <div className="text-stone-200 font-bold">暴露程度</div>
                    <AlertTriangle size={16} className="text-amber-300" />
                  </div>
                  <div className="text-stone-400 text-sm mt-2">当前 {Math.round(hideoutExposure)}%｜越高越危险。</div>
                </div>
                <div className="bg-stone-900/60 border border-stone-800 rounded p-5">
                  <div className="flex items-center justify-between">
                    <div className="text-stone-200 font-bold">内政</div>
                    <Home size={16} className="text-emerald-300" />
                  </div>
                  {(() => {
                    const gov = hideoutState?.governance ?? { stability: 60, productivity: 55, prosperity: 50, harmony: 55 };
                    const clampPct = (v: number) => Math.max(0, Math.min(100, Math.floor(v)));
                    const items = [
                      { label: '稳定性', value: clampPct(gov.stability), color: 'bg-amber-600' },
                      { label: '生产力', value: clampPct(gov.productivity), color: 'bg-emerald-600' },
                      { label: '繁荣度', value: clampPct(gov.prosperity), color: 'bg-sky-600' },
                      { label: '和谐度', value: clampPct(gov.harmony), color: 'bg-purple-600' }
                    ];
                    return (
                      <div className="mt-3 space-y-3">
                        {items.map(item => (
                          <div key={item.label}>
                            <div className="flex items-center justify-between text-xs text-stone-500">
                              <span>{item.label}</span>
                              <span>{item.value}%</span>
                            </div>
                            <div className="h-2 bg-stone-950/60 border border-stone-800 rounded mt-1 overflow-hidden">
                              <div className={`h-full ${item.color}`} style={{ width: `${item.value}%` }} />
                            </div>
                          </div>
                        ))}
                        <div className="text-xs text-stone-600">内政事件会周期性发生，选择会改变这些参数。</div>
                      </div>
                    );
                  })()}
                </div>
                <button
                  onClick={() => setHideoutPage('LOGS')}
                  className="text-left bg-stone-900/60 border border-stone-800 rounded p-5 hover:border-stone-600 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="text-stone-200 font-bold">据点日志</div>
                    <Scroll size={16} className="text-emerald-300" />
                  </div>
                  <div className="text-stone-400 text-sm mt-2">
                    {(currentLocation.localLogs ?? []).length > 0 ? (currentLocation.localLogs ?? [])[0]?.text : '暂无记录'}
                  </div>
                </button>
                <div className="bg-stone-900/60 border border-stone-800 rounded p-5">
                  <div className="flex items-center justify-between">
                    <div className="text-stone-200 font-bold">停留</div>
                    <History size={16} className="text-emerald-300" />
                  </div>
                  <div className="text-stone-400 text-sm mt-2">在隐匿点停留一段时间（会触发日结算）。</div>
                  <div className="mt-3 flex items-end gap-3">
                    <div className="flex-1">
                      <div className="text-xs text-stone-500 mb-1">天数</div>
                      <input
                        value={hideoutStayDays}
                        onChange={(e) => setHideoutStayDays(Math.max(1, Math.min(60, Number(e.target.value) || 1)))}
                        className="w-full bg-black/40 border border-stone-700 rounded px-3 py-2 text-sm text-stone-200 outline-none focus:border-emerald-700"
                        type="number"
                        min={1}
                        max={60}
                        disabled={!!hideoutStayState?.isActive}
                      />
                    </div>
                    <Button
                      variant="secondary"
                      disabled={!!hideoutStayState?.isActive || !!currentLocation.activeSiege}
                      onClick={() => {
                        const days = Math.max(1, Math.min(60, Math.floor(hideoutStayDays || 1)));
                        setHideoutStayDays(days);
                        setHideoutStayState({ isActive: true, locationId: currentLocation.id, totalDays: days, daysPassed: 0 });
                        onBackToMap();
                      }}
                    >
                      开始
                    </Button>
                  </div>
                  {!!currentLocation.activeSiege && <div className="text-xs text-amber-300 mt-2">围攻中无法停留。</div>}
                </div>
              </div>
            )}

            {hideoutPage === 'GUARDIAN' && (
              <div className="bg-stone-900/60 p-6 rounded border border-stone-800 space-y-4 animate-fade-in">
                <div className="text-stone-200 font-bold">该层守护者</div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 items-end">
                  <div>
                    <label className="block text-xs text-stone-500 mb-1">选择英雄</label>
                    <select
                      value={hideoutSelectedLayer?.guardianHeroId ?? ''}
                      onChange={(e) => handleHideoutSetGuardian(e.target.value)}
                      className="w-full bg-black/40 border border-stone-700 rounded px-3 py-2 text-sm text-stone-200 outline-none focus:border-emerald-700"
                    >
                      <option value="">（无）</option>
                      {heroes
                        .filter(h => h.recruited && h.status !== 'DEAD')
                        .map(h => (
                          <option key={h.id} value={h.id}>{h.title}{h.name} (Lv.{h.level})</option>
                        ))}
                    </select>
                  </div>
                  <div className="text-sm text-stone-400">
                    {hideoutSelectedLayer?.guardianHeroId
                      ? `守护者：${(heroes.find(h => h.id === hideoutSelectedLayer.guardianHeroId)?.title ?? '')}${heroes.find(h => h.id === hideoutSelectedLayer.guardianHeroId)?.name ?? hideoutSelectedLayer.guardianHeroId}`
                      : '未设置守护者。'}
                  </div>
                </div>
              </div>
            )}

            {hideoutPage === 'GARRISON' && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 animate-fade-in">
                <div className="bg-stone-900/60 p-6 rounded border border-stone-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="text-stone-200 font-bold">该层驻军</div>
                    <div className="text-xs text-stone-500">容量 {hideoutLayerGarrisonCount}/{hideoutLayerLimit}</div>
                  </div>
                  {hideoutLayerTroops.length === 0 ? (
                    <div className="text-stone-500 text-sm">该层暂无驻军。</div>
                  ) : (
                    <div className="space-y-3">
                      {hideoutLayerTroops.map((unit, idx) => (
                        <TroopCard
                          key={`${unit.id}-${idx}`}
                          troop={unit}
                          count={unit.count}
                          countLabel="驻军"
                          actionLabel="调回10"
                          onAction={() => handleHideoutWithdrawFromGarrison(unit.id, 10)}
                          secondaryActionLabel="调回1"
                          onSecondaryAction={() => handleHideoutWithdrawFromGarrison(unit.id, 1)}
                          disabled={maxTroops - currentTroopCount <= 0}
                          secondaryDisabled={maxTroops - currentTroopCount <= 0}
                        />
                      ))}
                    </div>
                  )}
                </div>

                <div className="bg-stone-900/60 p-6 rounded border border-stone-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="text-stone-200 font-bold">部队调入该层</div>
                    <div className="text-xs text-stone-500">队伍 {currentTroopCount}/{maxTroops}</div>
                  </div>
                  {player.troops.length === 0 ? (
                    <div className="text-stone-500 text-sm">没有可调入的部队。</div>
                  ) : (
                    <div className="space-y-3">
                      {player.troops.map((unit, idx) => (
                        <TroopCard
                          key={`${unit.id}-${idx}`}
                          troop={unit}
                          count={unit.count}
                          countLabel="部队"
                          actionLabel="调入10"
                          onAction={() => handleHideoutDepositToGarrison(unit.id, 10)}
                          secondaryActionLabel="调入1"
                          onSecondaryAction={() => handleHideoutDepositToGarrison(unit.id, 1)}
                          disabled={hideoutLayerGarrisonCount >= hideoutLayerLimit}
                          secondaryDisabled={hideoutLayerGarrisonCount >= hideoutLayerLimit}
                        />
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {hideoutPage === 'RECRUIT' && (
              <div className="bg-stone-900/60 p-6 rounded border border-stone-800 space-y-4 animate-fade-in">
                <div className="flex items-center justify-between">
                  <div className="text-stone-200 font-bold">征兵计划</div>
                  <div className="text-xs text-stone-500">当前金币 {player.gold}</div>
                </div>
                {hideoutRecruitOptions.length === 0 ? (
                  <div className="text-sm text-stone-500">该层尚未建造征兵官或神殿，无法设定征兵计划。</div>
                ) : (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div>
                        <label className="block text-xs text-stone-500 mb-1">征兵类型</label>
                        <select
                          value={hideoutRecruitTroopId}
                          onChange={(e) => setHideoutRecruitTroopId(e.target.value)}
                          className="w-full bg-black/40 border border-stone-700 rounded px-3 py-2 text-sm text-stone-200 outline-none focus:border-emerald-700"
                        >
                          {hideoutRecruitOptions.map(opt => (
                            <option key={opt.id} value={opt.id}>{opt.label}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs text-stone-500 mb-1">本轮招募上限</label>
                        <input
                          value={hideoutRecruitTarget}
                          onChange={(e) => setHideoutRecruitTarget(Math.max(0, Math.floor(Number(e.target.value) || 0)))}
                          className="w-full bg-black/40 border border-stone-700 rounded px-3 py-2 text-sm text-stone-200 outline-none focus:border-emerald-700"
                          type="number"
                          min={0}
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-stone-500 mb-1">预计耗时</label>
                        {(() => {
                          const option = hideoutRecruitOptions.find(o => o.id === hideoutRecruitTroopId) ?? hideoutRecruitOptions[0];
                          const depth = hideoutSelectedLayer?.depth ?? 0;
                          const rate = option?.source === 'SHRINE'
                            ? hideoutShrineCount * (3 + Math.min(4, depth))
                            : hideoutRecruiterCount * (4 + Math.min(6, depth * 2));
                          const target = Math.max(0, Math.floor(hideoutRecruitTarget));
                          const recruited = option?.id === hideoutRecruitPlan?.troopId ? Math.max(0, Math.floor(hideoutRecruitPlan?.recruited ?? 0)) : 0;
                          const remaining = Math.max(0, target - recruited);
                          const days = rate > 0 ? Math.ceil(remaining / rate) * 4 : 0;
                          return (
                            <div className="w-full bg-black/40 border border-stone-700 rounded px-3 py-2 text-sm text-stone-200">
                              {rate <= 0 ? '不可征兵' : remaining <= 0 ? '已完成' : `${days} 天`}
                            </div>
                          );
                        })()}
                      </div>
                    </div>
                    <div className="text-xs text-stone-500">
                      {(() => {
                        const option = hideoutRecruitOptions.find(o => o.id === hideoutRecruitTroopId) ?? hideoutRecruitOptions[0];
                        const tmpl = option ? getTroopTemplate(option.id) : null;
                        const costPer = tmpl ? Math.max(10, Math.floor((tmpl.cost ?? 40) * 0.8)) : 0;
                        const target = Math.max(0, Math.floor(hideoutRecruitTarget));
                        const totalCost = costPer * target;
                        return `单价 ${costPer} · 预计总花费 ${totalCost}`;
                      })()}
                    </div>
                    <div className="flex flex-col md:flex-row gap-2 justify-end">
                      <Button
                        variant="secondary"
                        onClick={() => {
                          const option = hideoutRecruitOptions.find(o => o.id === hideoutRecruitTroopId) ?? hideoutRecruitOptions[0];
                          if (!option) return;
                          const target = Math.max(0, Math.floor(hideoutRecruitTarget));
                          const tmpl = getTroopTemplate(option.id);
                          const costPer = tmpl ? Math.max(10, Math.floor((tmpl.cost ?? 40) * 0.8)) : 0;
                          updateHideoutLayer(hideoutSelectedLayerIndex, l => {
                            if (target <= 0 || costPer <= 0) return { ...l, recruitPlan: undefined };
                            const prev = l.recruitPlan;
                            const recruited = prev && prev.troopId === option.id ? Math.min(prev.recruited ?? 0, target) : 0;
                            return { ...l, recruitPlan: { troopId: option.id, target, recruited, costPerUnit: costPer } };
                          });
                        }}
                      >
                        {hideoutRecruitPlan ? '更新计划' : '启动征兵'}
                      </Button>
                      <Button
                        variant="secondary"
                        onClick={() => updateHideoutLayer(hideoutSelectedLayerIndex, l => ({ ...l, recruitPlan: undefined }))}
                        disabled={!hideoutRecruitPlan}
                      >
                        停止征兵
                      </Button>
                    </div>
                    {hideoutRecruitPlan && (
                      <div className="text-xs text-stone-500">
                        已招募 {hideoutRecruitPlan.recruited}/{hideoutRecruitPlan.target}，目标兵种 {getTroopTemplate(hideoutRecruitPlan.troopId)?.name ?? hideoutRecruitPlan.troopId}。
                      </div>
                    )}
                  </>
                )}
              </div>
            )}

            {hideoutPage === 'FACILITIES' && (
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3 animate-fade-in">
                {hideoutFacilitySlots.map((slot, slotIndex) => (
                  <div
                    key={`facility_slot_${slotIndex}`}
                    className={`relative bg-stone-900/60 border rounded p-3 min-h-[96px] ${slot.type ? 'border-stone-800' : 'border-stone-800 hover:border-emerald-700'}`}
                  >
                    {hideoutBuildAnim?.category === 'FACILITY' && hideoutBuildAnim.slotIndex === slotIndex && (
                      <div key={hideoutBuildAnim.id} className="absolute inset-0 bg-black/55 rounded flex items-center justify-center z-10">
                        <div className="w-12 h-12 rounded-full border border-amber-700 bg-stone-950/80 flex items-center justify-center animate-bounce">
                          <Hammer size={18} className="text-amber-300" />
                        </div>
                      </div>
                    )}
                    {slot.type ? (
                      <button
                        className="w-full h-full text-left space-y-2 hover:text-emerald-200 transition-colors"
                        onClick={() => {
                          setHideoutInspectTarget({ category: 'FACILITY', slotIndex });
                          setHideoutPage('DETAIL');
                        }}
                        title="点击查看详情"
                      >
                        <div className="text-xs text-stone-500">槽位 {slotIndex + 1}</div>
                        <div className="text-stone-200 font-bold text-sm">{getHideoutSlotLabel(slot)}</div>
                      </button>
                    ) : (
                      <button
                        className="w-full h-full flex flex-col items-center justify-center gap-2 text-stone-400 hover:text-emerald-200 transition-colors"
                        onClick={() => {
                          setHideoutBuildTarget({ category: 'FACILITY', slotIndex });
                          setHideoutPage('BUILD');
                        }}
                        title="点击建造"
                      >
                        <Plus size={18} />
                        <span className="text-xs">空槽</span>
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}

            {hideoutPage === 'DEFENSE' && (
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3 animate-fade-in">
                {hideoutDefenseSlots.map((slot, slotIndex) => (
                  <div
                    key={`def_slot_${slotIndex}`}
                    className={`relative bg-stone-900/60 border rounded p-3 min-h-[96px] ${slot.type ? 'border-stone-800' : 'border-stone-800 hover:border-emerald-700'}`}
                  >
                    {hideoutBuildAnim?.category === 'DEFENSE' && hideoutBuildAnim.slotIndex === slotIndex && (
                      <div key={hideoutBuildAnim.id} className="absolute inset-0 bg-black/55 rounded flex items-center justify-center z-10">
                        <div className="w-12 h-12 rounded-full border border-amber-700 bg-stone-950/80 flex items-center justify-center animate-bounce">
                          <Hammer size={18} className="text-amber-300" />
                        </div>
                      </div>
                    )}
                    {slot.type ? (
                      <button
                        className="w-full h-full text-left space-y-2 hover:text-emerald-200 transition-colors"
                        onClick={() => {
                          setHideoutInspectTarget({ category: 'DEFENSE', slotIndex });
                          setHideoutPage('DETAIL');
                        }}
                        title="点击查看详情"
                      >
                        <div className="text-xs text-stone-500">槽位 {slotIndex + 1}</div>
                        <div className="text-stone-200 font-bold text-sm">{getHideoutSlotLabel(slot)}</div>
                      </button>
                    ) : (
                      <button
                        className="w-full h-full flex flex-col items-center justify-center gap-2 text-stone-400 hover:text-emerald-200 transition-colors"
                        onClick={() => {
                          setHideoutBuildTarget({ category: 'DEFENSE', slotIndex });
                          setHideoutPage('BUILD');
                        }}
                        title="点击建造"
                      >
                        <Plus size={18} />
                        <span className="text-xs">空槽</span>
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}

            {hideoutPage === 'BUILD' && (
              <div className="bg-stone-900/60 border border-stone-800 rounded p-6 space-y-4 animate-fade-in">
                {!hideoutBuildTarget ? (
                  <div className="flex items-center justify-between">
                    <div className="text-stone-400">未选择槽位。</div>
                    <Button variant="secondary" onClick={() => setHideoutPage('DASHBOARD')}>返回</Button>
                  </div>
                ) : (
                  <>
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                      <div>
                        <div className="text-stone-200 font-bold">
                          {hideoutBuildTarget.category === 'FACILITY' ? '建筑槽建造' : '防御槽建造'} · 槽位 {hideoutBuildTarget.slotIndex + 1}
                        </div>
                        <div className="text-stone-500 text-sm mt-1">当前资金：{player.gold} 第纳尔</div>
                      </div>
                      <Button
                        variant="secondary"
                        onClick={() => {
                          setHideoutBuildTarget(null);
                          setHideoutPage(hideoutBuildTarget.category === 'FACILITY' ? 'FACILITIES' : 'DEFENSE');
                        }}
                      >
                        返回槽位
                      </Button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {(() => {
                        const depth = hideoutSelectedLayer?.depth ?? 0;
                        const slotIndex = hideoutBuildTarget.slotIndex;
                        const category = hideoutBuildTarget.category;
                        const slots = category === 'FACILITY' ? hideoutFacilitySlots : hideoutDefenseSlots;
                        const currentSlot = slots[slotIndex];
                        if (currentSlot?.type) {
                          return (
                            <div className="md:col-span-2 bg-stone-950/40 border border-stone-800 rounded p-4 text-stone-400">
                              该槽位已占用：{getHideoutSlotLabel(currentSlot)}
                            </div>
                          );
                        }
                        const options = (category === 'FACILITY' ? hideoutFacilityBuildOptions : hideoutDefenseBuildOptions)
                          .filter(opt => depth === 0 ? true : (opt.type !== 'CAMOUFLAGE_STRUCTURE' && opt.type !== 'MAZE_I'));
                        const defenseBuilt = hideoutDefenseSlots.filter(s => s.type && isSlotBuilt(s)).map(s => s.type as BuildingType);
                        const hasMaze = hideoutDefenseSlots.some(s => s.type === 'MAZE_I' || s.type === 'MAZE_II' || s.type === 'MAZE_III');
                        const hasHospital = (hideoutState?.layers ?? []).some(l => (l.facilitySlots ?? []).some(s => s.type === 'HOSPITAL_I' || s.type === 'HOSPITAL_II' || s.type === 'HOSPITAL_III'));
                        const canBuildType = (type: BuildingType) => {
                          if (type === 'CHAPEL') return { ok: false, reason: '仅可在城市建造' };
                          if (type === 'UNDERGROUND_PLAZA' && depth === 0) return { ok: false, reason: '仅地下层可建造' };
                          if (category === 'DEFENSE' && type === 'CAMOUFLAGE_STRUCTURE' && depth !== 0) return { ok: false, reason: '仅地面层可建造' };
                          if (type === 'MAZE_I') {
                            if (category !== 'DEFENSE') return { ok: false, reason: '迷宫属于防御设施' };
                            if (depth !== 0) return { ok: false, reason: '仅地面层可建造' };
                            if (hasMaze) return { ok: false, reason: '唯一建筑，已存在' };
                          }
                          if (type === 'HOSPITAL_I') {
                            if (category !== 'FACILITY') return { ok: false, reason: '地下医院属于建筑设施' };
                            if (hasHospital) return { ok: false, reason: '唯一建筑，已存在' };
                          }
                          if (type === 'AA_TOWER_II' && !defenseBuilt.includes('AA_TOWER_I')) return { ok: false, reason: '需要 AA_TOWER_I' };
                          if (type === 'AA_TOWER_III' && !defenseBuilt.includes('AA_TOWER_II')) return { ok: false, reason: '需要 AA_TOWER_II' };
                          if (type === 'AA_NET_II' && !defenseBuilt.includes('AA_NET_I')) return { ok: false, reason: '需要 AA_NET_I' };
                          if (type === 'AA_RADAR_II' && !defenseBuilt.includes('AA_RADAR_I')) return { ok: false, reason: '需要 AA_RADAR_I' };
                          if (type === 'CAMOUFLAGE_STRUCTURE' && hideoutDefenseSlots.some(s => ['CAMOUFLAGE_STRUCTURE', 'CAMOUFLAGE_STRUCTURE_II', 'CAMOUFLAGE_STRUCTURE_III'].includes(s.type as any))) {
                            return { ok: false, reason: '已存在伪装结构' };
                          }
                          return { ok: true as const, reason: '' };
                        };
                        return options.map(opt => {
                          const prereq = canBuildType(opt.type);
                          const affordable = player.gold >= opt.cost;
                          const ready = prereq.ok && affordable;
                          const effects = getBuildingEffects(opt.type);
                          return (
                            <div key={`build_${opt.type}`} className="bg-stone-950/40 border border-stone-800 rounded p-4 space-y-3">
                              <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                  <div className="text-stone-200 font-bold">{opt.name}</div>
                                  <div className="text-xs text-stone-500 mt-1">{opt.days} 天 · {opt.cost} 第纳尔</div>
                                </div>
                                <Button
                                  variant="secondary"
                                  disabled={!ready}
                                  onClick={() => {
                                    handleHideoutBuildInSlot(category, slotIndex, opt);
                                    const id = `build_${Date.now()}_${Math.floor(Math.random() * 100000)}`;
                                    setHideoutBuildAnim({ category, slotIndex, id });
                                    setTimeout(() => setHideoutBuildAnim(prev => (prev?.id === id ? null : prev)), 650);
                                    setHideoutBuildTarget(null);
                                    setHideoutPage(category === 'FACILITY' ? 'FACILITIES' : 'DEFENSE');
                                  }}
                                >
                                  建造
                                </Button>
                              </div>
                              <div className="text-sm text-stone-400">{opt.description}</div>
                              {effects.length > 0 && (
                                <div className="flex flex-wrap gap-2 text-xs text-stone-400">
                                  {effects.map((t, idx) => (
                                    <span key={`${opt.type}_eff_${idx}`} className="px-2 py-1 rounded border border-stone-800 bg-stone-900/40">{t}</span>
                                  ))}
                                </div>
                              )}
                              {!affordable && <div className="text-xs text-red-300">资金不足</div>}
                              {affordable && !prereq.ok && <div className="text-xs text-amber-300">{prereq.reason}</div>}
                            </div>
                          );
                        });
                      })()}
                    </div>
                  </>
                )}
              </div>
            )}

            {hideoutPage === 'DETAIL' && (
              <div className="bg-stone-900/60 border border-stone-800 rounded p-6 space-y-4 animate-fade-in">
                {!hideoutInspectTarget ? (
                  <div className="flex items-center justify-between">
                    <div className="text-stone-400">未选择槽位。</div>
                    <Button variant="secondary" onClick={() => setHideoutPage('DASHBOARD')}>返回</Button>
                  </div>
                ) : (
                  (() => {
                    const category = hideoutInspectTarget.category;
                    const slotIndex = hideoutInspectTarget.slotIndex;
                    const slots = category === 'FACILITY' ? hideoutFacilitySlots : hideoutDefenseSlots;
                    const slot = slots[slotIndex];
                    if (!slot?.type) {
                      return (
                        <div className="flex items-center justify-between">
                          <div className="text-stone-400">该槽位为空。</div>
                          <Button
                            variant="secondary"
                            onClick={() => {
                              setHideoutBuildTarget({ category, slotIndex });
                              setHideoutPage('BUILD');
                            }}
                          >
                            去建造
                          </Button>
                        </div>
                      );
                    }
                    const spec = getBuildingSpec(slot.type);
                    const upgradeNext = getUpgradeNextType(slot.type);
                    const upgrade = upgradeNext ? getUpgradeCostDays(slot.type, upgradeNext) : null;
                    const isConstructing = !!slot.daysLeft && slot.daysLeft > 0;
                    const effects = getBuildingEffects(slot.type);
                    const yields = getBuildingYieldLines(slot.type, hideoutSelectedLayer?.depth ?? 0);
                    const blockMaze = (slot.type === 'MAZE_I' || slot.type === 'MAZE_II') && (hideoutSelectedLayer?.depth ?? 0) !== 0;
                    const upgradeDisabled = !upgrade || isConstructing || blockMaze || player.gold < (upgrade?.cost ?? 0);
                    return (
                      <>
                        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                          <div>
                            <div className="text-stone-200 font-bold">
                              {category === 'FACILITY' ? '建筑槽' : '防御槽'} · 槽位 {slotIndex + 1}
                            </div>
                            <div className="text-stone-500 text-sm mt-1">
                              {getHideoutSlotLabel(slot)}
                            </div>
                          </div>
                          <Button
                            variant="secondary"
                            onClick={() => {
                              setHideoutInspectTarget(null);
                              setHideoutPage(category === 'FACILITY' ? 'FACILITIES' : 'DEFENSE');
                            }}
                          >
                            返回槽位
                          </Button>
                        </div>

                        {spec && (
                          <div className="bg-stone-950/40 border border-stone-800 rounded p-4 space-y-2">
                            <div className="text-stone-200 font-bold">{spec.name}</div>
                            <div className="text-sm text-stone-400">{spec.description}</div>
                            <div className="text-xs text-stone-500">建造时间：{spec.days} 天</div>
                            {isConstructing && (
                              <div className="text-xs text-amber-300">
                                施工中：剩余 {slot.daysLeft} 天（总计 {slot.totalDays ?? spec.days} 天）
                              </div>
                            )}
                          </div>
                        )}

                        {effects.length > 0 && (
                          <div className="flex flex-wrap gap-2 text-xs text-stone-400">
                            {effects.map((t, idx) => (
                              <span key={`detail_eff_${idx}`} className="px-2 py-1 rounded border border-stone-800 bg-stone-900/40">{t}</span>
                            ))}
                          </div>
                        )}
                        {yields.length > 0 && (
                          <div className="flex flex-wrap gap-2 text-xs text-stone-400">
                            {yields.map((t, idx) => (
                              <span key={`detail_yield_${idx}`} className="px-2 py-1 rounded border border-stone-800 bg-stone-900/40">{t}</span>
                            ))}
                          </div>
                        )}

                        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                          <div className="text-stone-500 text-sm">当前资金：{player.gold} 第纳尔</div>
                          {upgrade && (
                            <Button
                              variant="secondary"
                              disabled={upgradeDisabled}
                              onClick={() => {
                                handleHideoutUpgradeSlot(category, slotIndex);
                                const id = `upgrade_${Date.now()}_${Math.floor(Math.random() * 100000)}`;
                                setHideoutBuildAnim({ category, slotIndex, id });
                                setTimeout(() => setHideoutBuildAnim(prev => (prev?.id === id ? null : prev)), 650);
                                setHideoutInspectTarget(null);
                                setHideoutPage(category === 'FACILITY' ? 'FACILITIES' : 'DEFENSE');
                              }}
                            >
                              升级为 {upgrade.name}（{upgrade.days}天 / {upgrade.cost}）
                            </Button>
                          )}
                          {!upgrade && (
                            <Button variant="secondary" disabled>
                              已满级
                            </Button>
                          )}
                        </div>

                        {upgrade && !isConstructing && player.gold < upgrade.cost && (
                          <div className="text-xs text-red-300">资金不足</div>
                        )}
                        {upgrade && isConstructing && (
                          <div className="text-xs text-amber-300">施工中无法升级</div>
                        )}
                        {upgrade && blockMaze && (
                          <div className="text-xs text-amber-300">迷宫只能在地面层升级</div>
                        )}
                      </>
                    );
                  })()
                )}
              </div>
            )}

            {hideoutPage === 'REFINERY' && (
              <div className="bg-stone-900/60 border border-stone-800 rounded p-6 space-y-4 animate-fade-in">
                {!hideoutHasRefineryBuilt ? (
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                    <div>
                      <div className="text-stone-200 font-bold">矿石精炼</div>
                      <div className="text-stone-500 text-sm mt-1">需要先在该层建造矿石精炼厂。</div>
                    </div>
                    <Button variant="secondary" onClick={() => setHideoutPage('FACILITIES')}>
                      去建造
                    </Button>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center justify-between">
                      <div className="text-stone-200 font-bold">矿石精炼</div>
                      <div className="text-stone-500 text-xs">输入纯度×3 → 输出更高纯度×1</div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                      <div>
                        <div className="text-xs text-stone-500 mb-1">矿石</div>
                        <select
                          value={hideoutRefineMineralId}
                          onChange={(e) => setHideoutRefineMineralId(e.target.value as MineralId)}
                          className="w-full bg-black/40 border border-stone-700 rounded px-3 py-2 text-sm text-stone-200 outline-none focus:border-emerald-700"
                        >
                          {(Object.keys(mineralMeta) as MineralId[]).map(id => (
                            <option key={`min_${id}`} value={id}>{mineralMeta[id]?.name ?? id}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <div className="text-xs text-stone-500 mb-1">输入纯度</div>
                        <select
                          value={hideoutRefineFromPurity}
                          onChange={(e) => setHideoutRefineFromPurity(Number(e.target.value) as MineralPurity)}
                          className="w-full bg-black/40 border border-stone-700 rounded px-3 py-2 text-sm text-stone-200 outline-none focus:border-emerald-700"
                        >
                          {[1, 2, 3, 4].map(p => (
                            <option key={`pur_${p}`} value={p}>{p} → {p + 1}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <div className="text-xs text-stone-500 mb-1">产出数量</div>
                        <input
                          value={hideoutRefineOutputCount}
                          onChange={(e) => setHideoutRefineOutputCount(Math.max(1, Math.min(50, Number(e.target.value) || 1)))}
                          className="w-full bg-black/40 border border-stone-700 rounded px-3 py-2 text-sm text-stone-200 outline-none focus:border-emerald-700"
                          type="number"
                          min={1}
                          max={50}
                        />
                      </div>
                      <div className="flex items-end">
                        <Button variant="secondary" onClick={handleHideoutStartRefine} className="w-full">
                          开始精炼
                        </Button>
                      </div>
                    </div>
                    {((hideoutSelectedLayer?.refineQueue ?? []) as any[]).length > 0 && (
                      <div className="space-y-2">
                        {((hideoutSelectedLayer?.refineQueue ?? []) as any[]).map((job: any) => (
                          <div key={job.id} className="flex items-center justify-between text-sm text-stone-300">
                            <span>{mineralMeta[job.mineralId as MineralId]?.name ?? job.mineralId} 纯度{job.fromPurity}→{job.toPurity} ×{job.outputAmount}</span>
                            <span className="text-stone-500">{job.daysLeft} 天</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>
            )}

            {hideoutPage === 'LOGS' && (
              <div className="bg-stone-900/60 border border-stone-800 rounded p-6 space-y-4 animate-fade-in">
                <div className="flex items-center justify-between">
                  <div className="text-stone-200 font-bold">据点日志</div>
                  <Button variant="secondary" onClick={() => setHideoutPage('DASHBOARD')}>返回仪表盘</Button>
                </div>
                {(currentLocation.localLogs ?? []).length === 0 ? (
                  <div className="text-stone-500 text-sm">暂无日志。</div>
                ) : (
                  <div className="space-y-2">
                    {(currentLocation.localLogs ?? []).slice(0, 20).map((entry, idx) => (
                      <div key={`hideout_log_${idx}`} className="flex items-start gap-3 bg-stone-950/40 border border-stone-800 rounded px-3 py-2">
                        <span className="text-xs text-stone-500 font-mono shrink-0">Day {entry.day}</span>
                        <span className="text-sm text-stone-300 leading-relaxed">{entry.text}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
        {activeTownTab === 'RECRUIT' && (
          <RecruitSection
            currentLocation={currentLocation}
            player={player}
            playerReligionName={playerReligionName}
            locationRelationValue={locationRelationValue}
            isHotpot={isHotpot}
            isCoffee={isCoffee}
            isHeavyTrialGrounds={isHeavyTrialGrounds}
            isCity={isCity}
            isRestricted={isRestricted}
            renderRecruitCard={renderRecruitCard}
            onPreachInCity={onPreachInCity}
          />
        )}

        {isHabitat && activeTownTab === 'HABITAT' && (
          <HabitatSection
            playerDay={player.day}
            habitatStayDays={habitatStayDays}
            setHabitatStayDays={setHabitatStayDays}
            habitatStayStateActive={!!habitatStayState?.isActive}
            onStartHabitat={() => {
                    const days = Math.max(1, Math.min(1000, Math.floor(habitatStayDays || 1)));
                    setHabitatStayDays(days);
                    setHabitatStayState({
                      isActive: true,
                      locationId: currentLocation.id,
                      totalDays: days,
                      daysPassed: 0
                    });
                    onBackToMap();
                  }}
          />
        )}

        {isSealHabitat && activeTownTab === 'SEAL_HABITAT' && (
          <SealHabitatSection
            location={currentLocation}
            playerGold={player.gold}
            playerDay={player.day}
            onUpdateLocation={(updater) => updateLocationState(updater(currentLocation))}
            setPlayer={setPlayer}
            addLog={addLog}
          />
        )}

        {isCoffee && activeTownTab === 'COFFEE_CHAT' && (
          <CoffeeChatSection
            giftableHeroes={giftableHeroes}
            coffeeGiftItems={coffeeGiftItems}
            coffeeGiftHeroId={coffeeGiftHeroId}
            setCoffeeGiftHeroId={setCoffeeGiftHeroId}
            coffeeGiftItemId={coffeeGiftItemId}
            setCoffeeGiftItemId={setCoffeeGiftItemId}
            coffeeGiftError={coffeeGiftError}
            clearCoffeeGiftError={() => setCoffeeGiftError(null)}
            onSubmitGift={() => {
                      const hero = heroes.find(h => h.id === coffeeGiftHeroId);
                      const item = coffeeGiftItems.find(i => i.id === coffeeGiftItemId);
                      if (!hero || !item) {
                        setCoffeeGiftError('请选择英雄与礼物。');
                        return;
                      }
                      if (player.gold < item.price) {
                        setCoffeeGiftError('金钱不足。');
                        return;
                      }
                      const record = {
                        id: `gift_${Date.now()}`,
                        day: player.day,
                        heroId: hero.id,
                        heroName: hero.name,
                        itemName: item.name,
                        itemType: item.itemType,
                        price: item.price,
                        sourceLocationName: currentLocation.name
                      };
                      setPlayer(prev => ({
                        ...prev,
                        gold: prev.gold - item.price,
                        giftRecords: [...(prev.giftRecords ?? []), record]
                      }));
                      addLog(`你在${currentLocation.name}花费 ${item.price} 第纳尔，送给 ${hero.name} 一份「${item.name}」。`);
                      setCoffeeGiftError(null);
                    }}
            undeadDialogue={undeadDialogue}
            undeadChatListRef={undeadChatListRef}
            undeadChatInput={undeadChatInput}
            setUndeadChatInput={setUndeadChatInput}
            sendToUndead={sendToUndead}
            isUndeadChatLoading={isUndeadChatLoading}
          />
        )}

        {isCity && activeTownTab === 'TAVERN' && (
          <TavernSection
            player={player}
            tavernHeroes={tavernHeroes}
            activeHero={activeHero}
            heroDialogue={heroDialogue}
            getHeroRoleLabel={getHeroRoleLabel}
            getHeroRecruitCost={getHeroRecruitCost}
            talkToHero={talkToHero}
            recruitHero={recruitHero}
            renderRecruitCard={renderRecruitCard}
            mercenaries={currentLocation.mercenaries}
          />
        )}

        {isCity && activeTownTab === 'WORK' && (
          <WorkSection
            currentLocation={currentLocation}
            player={player}
            workStateActive={!!workState?.isActive}
            miningStateActive={!!miningState?.isActive}
            roachLureStateActive={!!roachLureState?.isActive}
            onStartWorkContract={handleStartWorkContract}
          />
        )}

        {isMine && activeTownTab === 'MINING' && mineConfig && (
          <MiningSection
            mineConfig={mineConfig}
            miningDays={miningDays}
            setMiningDays={setMiningDays}
            miningStateActive={!!miningState?.isActive}
            workStateActive={!!workState?.isActive}
            roachLureStateActive={!!roachLureState?.isActive}
            onStartMining={handleStartMining}
            mineralMeta={mineralMeta}
            mineralPurityLabels={mineralPurityLabels}
            mineralInventory={mineralInventory}
          />
        )}

        {isRoachNest && activeTownTab === 'ROACH_LURE' && (
          <RoachLureSection
            roachLureDays={roachLureDays}
            setRoachLureDays={setRoachLureDays}
            roachLureStateActive={!!roachLureState?.isActive}
            workStateActive={!!workState?.isActive}
            miningStateActive={!!miningState?.isActive}
            currentTroopCount={currentTroopCount}
            maxTroops={maxTroops}
            onStartRoachLure={handleStartRoachLure}
          />
        )}

        {isMagicianLibrary && activeTownTab === 'MAGICIAN_LIBRARY' && (
          <MagicianLibrarySection
            mineralMeta={mineralMeta}
            anomalyPools={anomalyPools}
            mineralInventory={mineralInventory}
            ownedAnomalies={ownedAnomalies}
            currentTroopCount={currentTroopCount}
            maxTroops={maxTroops}
            getMineralAvailable={getMineralAvailable as any}
            getTroopTemplate={getTroopTemplate}
            onDrawAnomaly={handleDrawAnomaly}
            onAnomalySummon={handleAnomalySummon}
          />
        )}

        {isRecompiler && activeTownTab === 'RECOMPILER' && (
          <RecompilerSection
            player={player}
            playerRef={playerRef}
            setHeroes={setHeroes}
            addLog={addLog}
            getTroopTemplate={getTroopTemplate}
            buildAIConfig={buildAIConfig}
            onConsumeRecompilerSoldier={onConsumeRecompilerSoldier}
          />
        )}

        {isAltar && activeTownTab === 'ALTAR' && (
          <AltarSection
            currentLocationId={currentLocation.id}
            altarDialogue={altarDialogue}
            altarDraft={altarDraft}
            altarProposal={altarProposal}
            altarHasTree={altarHasTree}
            altarChatListRef={altarChatListRef}
            playerRef={playerRef}
            altarDialogues={altarDialogues}
            setAltarDialogues={setAltarDialogues}
            setAltarDrafts={setAltarDrafts}
            setAltarProposals={setAltarProposals}
            isAltarLoading={isAltarLoading}
            setIsAltarLoading={setIsAltarLoading}
            buildAIConfig={buildAIConfig}
            applyAltarProposal={applyAltarProposal}
          />
        )}

        {isAltar && activeTownTab === 'ALTAR_RECRUIT' && (
          <AltarRecruitSection
            altarState={altarState}
            getTroopTemplate={getTroopTemplate}
            altarRecruitDays={altarRecruitDays}
            setAltarRecruitDays={setAltarRecruitDays}
            isAltarRecruiting={isAltarRecruiting}
            altarRecruitState={altarRecruitState}
            onStartAltarRecruit={handleStartAltarRecruit}
            believerStats={believerStats}
            currentTroopCount={currentTroopCount}
            maxTroops={maxTroops}
            workState={workState}
            miningState={miningState}
            roachLureState={roachLureState}
          />
        )}

        {isBlacksmith && activeTownTab === 'FORGE' && (
          <ForgeSection
            player={player}
            forgeTroopIndex={forgeTroopIndex}
            setForgeTroopIndex={setForgeTroopIndex}
            forgeEnchantmentId={forgeEnchantmentId}
            setForgeEnchantmentId={setForgeEnchantmentId}
            enchantmentRecipes={enchantmentRecipes}
            mineralMeta={mineralMeta}
            mineralPurityLabels={mineralPurityLabels}
            mineralInventory={mineralInventory}
            getMineralAvailable={getMineralAvailable}
            onForge={handleForge}
          />
        )}

        {isCrystalFoundry && activeTownTab === 'FOUNDRY' && (
          <div className="space-y-6 animate-fade-in">
            <div className="bg-stone-900/60 border border-cyan-900/40 rounded p-5 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
              <div>
                <div className="text-stone-200 font-bold text-lg">晶簧熔炼所</div>
                <div className="text-sm text-stone-400 mt-1">把现有矿物直接熔成一次性水晶子弹。纯度越高，产弹越多。</div>
              </div>
              <div className="text-right">
                <div className="text-xs text-stone-500">当前弹药库存</div>
                <div className="text-3xl font-bold text-cyan-300">{player.bullets ?? 0}</div>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {(Object.keys(mineralMeta) as MineralId[]).map(mineralId => {
                const yieldCount = getFoundryBulletYield(mineralId);
                const oreCount = getMineralAvailable(mineralInventory, mineralId, 1);
                return (
                  <div key={mineralId} className="bg-stone-900/50 border border-stone-800 rounded p-4 space-y-3">
                    <div>
                      <div className="text-stone-200 font-semibold">{mineralMeta[mineralId].name}</div>
                      <div className="text-xs text-stone-500 mt-1">{mineralMeta[mineralId].effect}</div>
                    </div>
                    <div className="flex flex-wrap gap-2 text-xs text-stone-400">
                      {([1, 2, 3, 4, 5] as MineralPurity[]).map(purity => (
                        <span key={purity} className="px-2 py-1 rounded border border-stone-800 bg-black/30">
                          {mineralPurityLabels[purity]} {mineralInventory[mineralId]?.[purity] ?? 0}
                        </span>
                      ))}
                    </div>
                    <div className="text-sm text-cyan-200">可熔炼 {yieldCount} 发子弹</div>
                    <Button variant={yieldCount > 0 ? 'primary' : 'secondary'} disabled={oreCount <= 0} onClick={() => handleSmeltBullets(mineralId)}>
                      {oreCount > 0 ? `熔炼全部（${oreCount} 块）` : '没有可熔炼矿物'}
                    </Button>
                  </div>
                );
              })}
            </div>
            <div className="bg-stone-900/50 border border-stone-800 rounded p-5 space-y-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-stone-200 font-bold">特殊招募</div>
                  <div className="text-xs text-stone-500 mt-1">熔炼所提供一条独立的魔法燧发枪兵升级树。</div>
                </div>
                <div className="text-xs text-stone-500">后续升级可在队伍界面进行</div>
              </div>
              {foundryRecruitTemplate ? (
                <TroopCard
                  troop={{ ...foundryRecruitTemplate, count: 1, xp: 0, currentAmmo: foundryRecruitTemplate.ammoPerUnit ?? 0 }}
                  price={foundryRecruitTemplate.cost}
                  actionLabel="招募 1 人"
                  onAction={handleRecruitFoundryGunner}
                  disabled={player.gold < foundryRecruitTemplate.cost || currentTroopCount >= maxTroops}
                />
              ) : (
                <div className="text-sm text-stone-500">未找到魔法燧发枪兵模板。</div>
              )}
            </div>
          </div>
        )}

        {isMegaFarm && activeTownTab === 'FARM' && farmState && (
          <div className="space-y-6 animate-fade-in">
            <div className="bg-stone-900/60 border border-lime-900/40 rounded p-5 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
              <div>
                <div className="text-stone-200 font-bold text-lg">巨大农田</div>
                <div className="text-sm text-stone-400 mt-1">作物按现实时间成熟。离开游戏后，回来看依旧会继续长。</div>
              </div>
              <div className="text-right">
                <div className="text-xs text-stone-500">已解锁地块</div>
                <div className="text-3xl font-bold text-lime-300">{farmState.unlockedPlots}/{FARM_MAX_PLOTS}</div>
              </div>
            </div>
            <div className="bg-stone-900/50 border border-stone-800 rounded p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
              <div className="text-sm text-stone-400">
                下一个地块解锁费用：<span className="text-lime-300 font-semibold">{getFarmUnlockCost(farmState.unlockedPlots)}</span>
              </div>
              <Button variant="primary" disabled={farmState.unlockedPlots >= FARM_MAX_PLOTS || player.gold < getFarmUnlockCost(farmState.unlockedPlots)} onClick={handleUnlockFarmPlot}>
                解锁新地块
              </Button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {farmState.plots.map(plot => {
                const crop = plot.cropId ? CROP_DEF_MAP[plot.cropId] : null;
                const unlocked = plot.slot < farmState.unlockedPlots;
                const isReady = !!plot.readyAt && plot.readyAt <= farmNow;
                return (
                  <div key={plot.slot} className={`rounded border p-4 ${unlocked ? 'bg-stone-900/50 border-stone-800' : 'bg-stone-950/40 border-stone-900 opacity-70'}`}>
                    <div className="flex items-center justify-between gap-3 mb-3">
                      <div className="text-stone-200 font-semibold">{plot.slot + 1} 号地块</div>
                      <div className="text-xs text-stone-500">{unlocked ? (crop ? formatCountdown(plot.readyAt) : '空闲') : '未解锁'}</div>
                    </div>
                    {!unlocked && (
                      <div className="text-sm text-stone-500">购买更多地块后才能在这里种植。</div>
                    )}
                    {unlocked && !crop && (
                      <div className="space-y-2">
                        <div className="text-xs text-stone-500">选择要种下的作物</div>
                        <div className="grid grid-cols-1 gap-2">
                          {CROP_DEFS.map(def => (
                            <button
                              key={`${plot.slot}_${def.id}`}
                              type="button"
                              onClick={() => handlePlantCrop(plot.slot, def.id)}
                              disabled={player.gold < def.seedCost}
                              className="text-left rounded border border-stone-800 bg-black/25 px-3 py-2 hover:border-lime-700 hover:bg-lime-950/20 disabled:opacity-50 disabled:hover:border-stone-800"
                            >
                              <div className="flex items-center justify-between gap-3 text-sm">
                                <span className="text-stone-200">{def.name}</span>
                                <span className="text-lime-300">{def.seedCost} 金</span>
                              </div>
                              <div className="text-[11px] text-stone-500 mt-1">{def.flavor} 收益 {def.yieldGold}，耗时 {formatCountdown(Date.now() + def.growMs)}</div>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                    {unlocked && crop && (
                      <div className="space-y-3">
                        <div>
                          <div className="text-stone-200 font-semibold">{crop.name}</div>
                          <div className="text-xs text-stone-500 mt-1">{crop.flavor}</div>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-stone-400">成熟收益</span>
                          <span className="text-lime-300">{crop.yieldGold} 第纳尔</span>
                        </div>
                        <Button variant={isReady ? 'primary' : 'secondary'} disabled={!isReady} onClick={() => handleHarvestCrop(plot.slot)}>
                          {isReady ? '收获' : '等待成熟'}
                        </Button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {activeTownTab === 'GARRISON' && (
          <GarrisonSection
            visibleStayParties={visibleStayParties}
            getStayPartyOwnerLabel={getStayPartyOwnerLabel}
            getPartyCount={getPartyCount}
          />
        )}

        {isFieldCamp && activeTownTab === 'SIEGE' && (
          <div className="space-y-6 animate-fade-in">
            <div className="bg-stone-900/40 p-4 rounded border border-stone-800">
              <p className="text-stone-400 text-sm">这是行军中的临时营地，不被视为固定据点。</p>
            </div>
            <div className="bg-stone-900/60 p-6 rounded border border-stone-800 space-y-3">
              <div className="text-stone-200 font-bold">行军信息</div>
              <div className="text-sm text-stone-400">
                目标：{getLocationNameById(currentLocation.camp?.targetLocationId)}｜剩余：{currentLocation.camp?.daysLeft ?? 0} / {currentLocation.camp?.totalDays ?? 0} 天
              </div>
              <div className="text-sm text-stone-400">意图：{currentLocation.camp?.attackerName ?? '未知势力'} 正在向目标推进。</div>
            </div>
            <div className="bg-stone-900/60 p-6 rounded border border-stone-800 space-y-3">
              <div className="flex items-center justify-between">
                <div className="text-stone-200 font-bold">营地部队</div>
                <div className="text-xs text-stone-500">总人数 {getGarrisonCount(currentLocation.garrison ?? [])}</div>
              </div>
              {(currentLocation.garrison ?? []).length === 0 ? (
                <div className="text-sm text-stone-500">营地空无一人。</div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {(currentLocation.garrison ?? []).map((troop, idx) => (
                    <TroopCard key={`${troop.id}-${idx}`} troop={troop} count={troop.count} countLabel="数量" disabled />
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTownTab === 'SIEGE' && (isSiegeTarget || isImposterPortal) && !isOwnedByPlayer && (
          <div className="space-y-6 animate-fade-in">
            <div className="bg-stone-900/40 p-4 rounded border border-stone-800">
              <p className="text-stone-400 text-sm">
                {isImposterPortal
                  ? "攻打传送门需要万全的准备。这里的防御设施超越了常理，建议准备足够的重型火力。"
                  : "准备攻城器械并发动围攻。攻城战会考虑器械与防御设施的影响。"}
              </p>
            </div>
            <div className="bg-stone-900/60 p-6 rounded border border-stone-800 space-y-4">
              <div className="flex items-center justify-between">
                <div className="text-stone-200 font-bold">守城防御</div>
                <span className="text-stone-400 text-sm">{localDefenseDetails.wallName} Lv.{localDefenseDetails.wallLevel}</span>
              </div>
              <div className="text-stone-400 text-sm">
                防御设施：{localDefenseDetails.mechanisms.map(m => m.name).join('、') || '无'}
              </div>
              {(currentLocation.buildings ?? []).includes('DEFENSE') && (
                <div className="text-amber-500 text-sm">额外防御建筑已建成</div>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-stone-900/60 p-5 rounded border border-stone-800">
                <div className="text-stone-200 font-bold mb-3">已准备的攻城器械</div>
                {siegeEngines.length === 0 ? (
                  <div className="text-stone-500 text-sm">暂无可用攻城器械。</div>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {siegeEngines.map((engine, idx) => (
                      <span key={`${engine}-${idx}`} className="bg-stone-800 text-stone-300 px-2 py-1 rounded text-xs border border-stone-700">
                        {getSiegeEngineName(engine)}
                      </span>
                    ))}
                  </div>
                )}
              </div>
              <div className="bg-stone-900/60 p-5 rounded border border-stone-800">
                <div className="text-stone-200 font-bold mb-3">准备中的器械</div>
                {siegeEngineQueue.length === 0 ? (
                  <div className="text-stone-500 text-sm">没有正在准备的器械。</div>
                ) : (
                  <div className="space-y-2">
                    {siegeEngineQueue.map((engine, idx) => (
                      <div key={`${engine.type}-${idx}`} className="flex items-center justify-between text-sm text-stone-300">
                        <span>{getSiegeEngineName(engine.type)}</span>
                        <span className="text-stone-500">{engine.daysLeft} 天</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="bg-stone-900/60 p-6 rounded border border-stone-800 space-y-4">
              <div className="text-stone-200 font-bold">购买攻城器械</div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {siegeEngineOptions.map(engine => (
                  <div key={engine.type} className="bg-stone-900 border border-stone-800 p-4 rounded">
                    <div className="flex items-center justify-between mb-2">
                      <div className="text-stone-200 font-bold">{engine.name}</div>
                      <span className="text-amber-500 text-sm">{engine.cost} 第纳尔</span>
                    </div>
                    <div className="text-stone-400 text-xs mb-3">{engine.description}（{engine.days} 天）</div>
                    <Button
                      onClick={() => handleBuySiegeEngine(engine)}
                      variant="secondary"
                      disabled={player.gold < engine.cost}
                    >
                      购买
                    </Button>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button
                onClick={handleSiegeWait}
                variant="secondary"
                className="flex items-center gap-2"
              >
                <History size={18} /> 原地等待一天
              </Button>
              <Button
                onClick={() => startSiegeBattle(currentLocation)}
                variant="danger"
                disabled={siegeEngines.length === 0 || isBattling}
                className="flex items-center gap-2"
              >
                <Swords size={18} /> 发动攻城
              </Button>
            </div>
          </div>
        )}

        {activeTownTab === 'OWNED' && isOwnedByPlayer && (
          <div className="space-y-6 animate-fade-in">
            <div className="bg-stone-900/40 p-4 rounded border border-stone-800">
              <p className="text-stone-400 text-sm">你已占领此地，可建设建筑并提升驻军实力。</p>
            </div>
            <div className="bg-stone-900/60 p-5 rounded border border-stone-800 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
              <div className="text-stone-300 font-bold">驻军容量：{currentGarrisonCount} / {garrisonLimit}</div>
              <div className="text-stone-500 text-sm">已建建筑：{builtBuildings.length > 0 ? builtBuildings.map(getBuildingName).join('、') : '无'}</div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-stone-900/60 p-5 rounded border border-stone-800">
                <div className="text-stone-200 font-bold mb-3">施工队列</div>
                {constructionQueue.length === 0 ? (
                  <div className="text-stone-500 text-sm">当前没有建筑在施工。</div>
                ) : (
                  <div className="space-y-2">
                    {constructionQueue.map((item, idx) => (
                      <div key={`${item.type}-${idx}`} className="flex items-center justify-between text-sm text-stone-300">
                        <span>{getBuildingName(item.type)}</span>
                        <span className="text-stone-500">{item.daysLeft} 天</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className="bg-stone-900/60 p-5 rounded border border-stone-800">
                <div className="text-stone-200 font-bold mb-3">已有建筑</div>
                {builtBuildings.length === 0 ? (
                  <div className="text-stone-500 text-sm">尚未建造任何建筑。</div>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {builtBuildings.map((item, idx) => (
                      <span key={`${item}-${idx}`} className="bg-stone-800 text-stone-300 px-2 py-1 rounded text-xs border border-stone-700">
                        {getBuildingName(item)}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="bg-stone-900/60 p-6 rounded border border-stone-800 space-y-4">
              <div className="text-stone-200 font-bold">可建造建筑</div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {buildingOptions.filter(b => (
                  b.type !== 'HOUSING' &&
                  b.type !== 'HOUSING_II' &&
                  b.type !== 'HOUSING_III' &&
                  b.type !== 'SHRINE' &&
                  b.type !== 'ORE_REFINERY' &&
                  b.type !== 'CAMOUFLAGE_STRUCTURE' &&
                  b.type !== 'CAMOUFLAGE_STRUCTURE_II' &&
                  b.type !== 'CAMOUFLAGE_STRUCTURE_III'
                )).map(building => {
                  const prereq = building.type === 'AA_TOWER_II'
                    ? 'AA_TOWER_I'
                    : building.type === 'AA_TOWER_III'
                      ? 'AA_TOWER_II'
                      : building.type === 'AA_NET_II'
                        ? 'AA_NET_I'
                        : building.type === 'AA_RADAR_II'
                          ? 'AA_RADAR_I'
                          : null;
                  const superseded = building.type === 'AA_TOWER_I' ? (builtBuildings.includes('AA_TOWER_II') || builtBuildings.includes('AA_TOWER_III'))
                    : building.type === 'AA_TOWER_II' ? builtBuildings.includes('AA_TOWER_III')
                      : building.type === 'AA_NET_I' ? builtBuildings.includes('AA_NET_II')
                        : building.type === 'AA_RADAR_I' ? builtBuildings.includes('AA_RADAR_II')
                          : false;
                  const missingPrereq = !!prereq && !builtBuildings.includes(prereq) && !constructionQueue.some(q => q.type === prereq);
                  const disabled = player.gold < building.cost || superseded || builtBuildings.includes(building.type) || constructionQueue.some(q => q.type === building.type) || missingPrereq;
                  return (
                    <div key={building.type} className="bg-stone-900 border border-stone-800 p-4 rounded">
                      <div className="flex items-center justify-between mb-2">
                        <div className="text-stone-200 font-bold">{building.name}</div>
                        <span className="text-amber-500 text-sm">{building.cost} 第纳尔</span>
                      </div>
                      <div className="text-stone-400 text-xs mb-3">{building.description}（{building.days} 天）</div>
                      <Button
                        onClick={() => handleStartConstruction(building)}
                        variant="secondary"
                        disabled={disabled}
                      >
                        建造
                      </Button>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {activeTownTab === 'LOCAL_GARRISON' && (
          isOwnedByPlayer ? (
            <div className="space-y-6 animate-fade-in">
              <div className="bg-stone-900/40 p-4 rounded border border-stone-800 flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                <div className="text-stone-300 font-bold">驻军容量：{currentGarrisonCount} / {garrisonLimit}</div>
                <div className="text-amber-500 font-mono">总战力：{totalGarrisonPower}</div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-3">
                  <div className="text-stone-400 text-sm">驻军列表</div>
                  {ownedGarrison.length === 0 ? (
                    <div className="text-stone-500 text-sm bg-stone-900/60 p-4 rounded border border-stone-800">暂无驻军。</div>
                  ) : (
                    ownedGarrison.map((unit, idx) => (
                      <TroopCard
                        key={`${unit.id}-${idx}`}
                        troop={unit}
                        count={unit.count}
                        countLabel="驻军"
                        actionLabel="调回10"
                        onAction={() => handleWithdrawFromGarrison(unit.id, 10)}
                        secondaryActionLabel="调回1"
                        onSecondaryAction={() => handleWithdrawFromGarrison(unit.id, 1)}
                        disabled={maxTroops - currentTroopCount <= 0}
                        secondaryDisabled={maxTroops - currentTroopCount <= 0}
                      />
                    ))
                  )}
                </div>
                <div className="space-y-3">
                  <div className="text-stone-400 text-sm">部队调入</div>
                  {player.troops.length === 0 ? (
                    <div className="text-stone-500 text-sm bg-stone-900/60 p-4 rounded border border-stone-800">没有可调入的部队。</div>
                  ) : (
                    player.troops.map((unit, idx) => (
                      <TroopCard
                        key={`${unit.id}-${idx}`}
                        troop={unit}
                        count={unit.count}
                        countLabel="部队"
                        actionLabel="调入10"
                        onAction={() => handleDepositToGarrison(unit.id, 10)}
                        secondaryActionLabel="调入1"
                        onSecondaryAction={() => handleDepositToGarrison(unit.id, 1)}
                        disabled={currentGarrisonCount >= garrisonLimit}
                        secondaryDisabled={currentGarrisonCount >= garrisonLimit}
                      />
                    ))
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4 animate-fade-in">
              <div className="bg-stone-900/40 p-4 rounded border border-stone-800 flex items-center justify-between">
                <div className="text-stone-300 font-bold">总兵力：{totalGarrisonCount}</div>
                <div className="text-amber-500 font-mono">总战力：{totalGarrisonPower}</div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {localGarrison.map((unit, idx) => (
                  <TroopCard
                    key={`${unit.troop.id}-${idx}`}
                    troop={{
                      ...unit.troop,
                      count: unit.count,
                      xp: 0,
                      maxXp: 100,
                      upgradeCost: 0,
                    } as Troop}
                    count={unit.count}
                    countLabel="数量"
                    disabled={true}
                    actionLabel="驻军"
                  />
                ))}
              </div>
            </div>
          )
        )}

        {activeTownTab === 'IMPOSTER_STATIONED' && (
          <div className="space-y-6 animate-fade-in">
            <div className="bg-stone-900/40 p-4 rounded border border-stone-800">
              <h3 className="text-xl font-bold text-fuchsia-400 mb-2 flex items-center gap-2">
                <Zap size={20} /> 待命中的入侵军团
              </h3>
              <p className="text-stone-400 text-sm">这些军团正在裂隙中积蓄力量，准备发起下一轮入侵。</p>
            </div>

            <div className="grid grid-cols-1 gap-4">
              {(currentLocation.stationedArmies ?? []).length === 0 ? (
                <div className="text-stone-500 text-center py-8">目前没有集结完毕的军团。</div>
              ) : (
                (currentLocation.stationedArmies ?? []).map((army, idx) => (
                  <div key={idx} className="bg-stone-900/60 p-4 rounded border border-fuchsia-900/30">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h4 className="text-lg font-bold text-fuchsia-300">{army.name}</h4>
                        <div className="text-xs text-stone-500 mt-1">{army.description}</div>
                      </div>
                      <div className="text-fuchsia-500 font-mono text-sm bg-fuchsia-950/30 px-2 py-1 rounded">
                        战力: {calculatePower(army.troops)}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                      {army.troops.map((t, tIdx) => (
                        <div key={tIdx} className="bg-black/20 p-2 rounded text-xs border border-stone-800 flex justify-between items-center">
                          <span className="text-stone-300">{t.name}</span>
                          <span className="text-stone-500 font-mono">x{t.count}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {activeTownTab === 'DEFENSE' && (
          <div className="space-y-6 animate-fade-in">
            <div className="bg-stone-900/60 p-6 rounded border-l-4 border-amber-600 shadow-lg">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-2xl font-serif text-amber-500 mb-1">{localDefenseDetails.wallName}</h3>
                  <div className="flex items-center gap-2">
                    <span className="bg-stone-800 text-stone-400 text-xs px-2 py-0.5 rounded border border-stone-700">城墙 Lv.{localDefenseDetails.wallLevel}</span>
                    <span className="text-stone-500 text-sm italic">"{localDefenseDetails.flavorText}"</span>
                  </div>
                </div>
                <ShieldAlert size={48} className="text-amber-900/50" />
              </div>
              <p className="text-stone-300">{localDefenseDetails.wallDesc}</p>
              <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                <div className="bg-black/20 border border-stone-800 rounded px-3 py-2 text-stone-300 flex items-center justify-between">
                  <span className="text-stone-500">城防耐久</span>
                  <span className="font-mono">{localDefenseDetails.wallHp + localDefenseDetails.mechanismHp}</span>
                </div>
                <div className="bg-black/20 border border-stone-800 rounded px-3 py-2 text-stone-300 flex items-center justify-between">
                  <span className="text-stone-500">对空强度</span>
                  <span className="font-mono">+{Math.round(localDefenseDetails.antiAirPowerBonus * 100)}%</span>
                </div>
                <div className="bg-black/20 border border-stone-800 rounded px-3 py-2 text-stone-300 flex items-center justify-between">
                  <span className="text-stone-500">空袭减伤</span>
                  <span className="font-mono">-{Math.round(localDefenseDetails.airstrikeDamageReduction * 100)}%</span>
                </div>
                <div className="bg-black/20 border border-stone-800 rounded px-3 py-2 text-stone-300 flex items-center justify-between">
                  <span className="text-stone-500">远程加成</span>
                  <span className="font-mono">命中+{Math.round(localDefenseDetails.rangedHitBonus * 100)}% 伤害+{Math.round(localDefenseDetails.rangedDamageBonus * 100)}%</span>
                </div>
              </div>
            </div>

            <div>
              <h4 className="text-stone-400 font-bold uppercase text-xs mb-3 tracking-wider">防御设施 & 器械</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {localDefenseDetails.mechanisms.map((mech, idx) => (
                  <div key={idx} className="bg-stone-900 border border-stone-800 p-3 rounded flex items-start gap-3">
                    <div className="w-8 h-8 rounded bg-stone-800 flex items-center justify-center border border-stone-700 shrink-0 mt-1">
                      <Hammer size={14} className="text-stone-500" />
                    </div>
                    <div>
                      <span className="text-stone-200 font-bold block">{mech.name}</span>
                      <span className="text-stone-500 text-xs">{mech.description}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
        {activeTownTab === 'LORD' && hasLord && (
          <div className="space-y-6 animate-fade-in">
            <div className="bg-stone-900/40 p-4 rounded border border-stone-800 space-y-3">
              <div className="flex items-center justify-between">
                <div className="text-stone-300 font-bold">{isFieldCamp ? '营地首领' : '当前据点内的领主'}</div>
                {ownerLord && (
                  <div className="text-xs text-stone-500">{isFieldCamp ? '首领' : '统治者'}：{ownerLord.title}{ownerLord.name}</div>
                )}
              </div>
              {lordsHere.length === 0 ? (
                <div className="text-sm text-stone-500">暂无领主驻留。</div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {lordsHere.map(lord => {
                    const isSelected = lord.id === currentLord?.id;
                    const isRuler = isFieldCamp ? true : ownerLord?.id === lord.id;
                    return (
                      <button
                        key={lord.id}
                        onClick={() => setSelectedLordId(lord.id)}
                        className={`px-3 py-1 rounded border text-sm ${isSelected ? 'bg-amber-900/40 border-amber-700 text-amber-200' : 'bg-stone-900/60 border-stone-700 text-stone-400 hover:border-stone-500'}`}
                      >
                        {lord.title}{lord.name}
                        {isFieldCamp ? ' · 首领' : (isRuler ? ' · 统治者' : ' · 客人')}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {currentLord ? (
              <div className="bg-stone-900/40 p-4 rounded border border-stone-800">
                <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-2">
                  <div>
                    <div className="text-amber-400 font-bold">{currentLord.title} · {currentLord.name}</div>
                    <div className="text-xs text-stone-500 mt-1">{isFieldCamp ? `目标：${getLocationNameById(currentLocation.camp?.targetLocationId)}` : `封地：${getLocationNameById(currentLord.fiefId)}`}</div>
                    <div className="text-xs text-stone-500 mt-1">{isFieldCamp ? '这是营地的首领' : (ownerLord?.id === currentLord.id ? '这是据点的统治者' : '这是一名过路的客人')}</div>
                  </div>
                  <div className="text-xs text-stone-500">关系：{getLordRelationLabel(currentLord.relation)}（{currentLord.relation}）</div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-stone-400 mt-3">
                  <div>性格：{currentLord.temperament}</div>
                  <div>方针：{lordFocusLabels[currentLord.focus]}</div>
                  <div className="md:col-span-2">特质：{currentLord.traits.join('、')}</div>
                </div>
              </div>
            ) : (
              <div className="bg-stone-900/40 p-4 rounded border border-stone-800 text-sm text-stone-500">
                此处没有可交谈的领主，可向守卫询问统治者去向。
              </div>
            )}

            <div className="bg-stone-900/40 p-4 rounded border border-stone-800">
              <div className="flex items-center justify-between">
                <div className="text-stone-300 font-bold">据点日志</div>
                <div className="text-xs text-stone-500">最近记录</div>
              </div>
              <div className="mt-3 space-y-2 text-sm">
                {(currentLocation.localLogs ?? []).length === 0 ? (
                  <div className="text-stone-500">暂无记录。</div>
                ) : (
                  (currentLocation.localLogs ?? []).slice(0, 6).map((entry, idx) => (
                    <div key={idx} className="flex items-start gap-2 text-stone-400">
                      <span className="text-stone-600">第{entry.day}天</span>
                      <span>{entry.text}</span>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="bg-stone-900/60 p-4 rounded border border-stone-800 space-y-3">
              <div className="text-stone-300 font-bold">来访记录</div>
              <div className="max-h-56 overflow-y-auto space-y-2 text-sm">
                {lordDialogue.length === 0 && !isLordChatLoading ? (
                  <div className="text-stone-500">领主暂未表态。</div>
                ) : (
                  <>
                  {lordDialogue.map((line, idx) => (
                    <div key={idx} className={`flex ${line.role === 'PLAYER' ? 'justify-end' : 'justify-start'}`}>
                      <div className={`px-3 py-2 rounded border text-sm ${line.role === 'PLAYER' ? 'bg-amber-900/30 border-amber-800/60 text-amber-200' : 'bg-stone-950/40 border-stone-800 text-stone-200'}`}>
                        {line.text}
                      </div>
                    </div>
                  ))}
                  {isLordChatLoading && <ThinkingBubble label="领主正在思考..." />}
                  </>
                )}
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              {currentLord && (
                <>
                  <Button onClick={handleLordGreeting} variant="secondary">致意</Button>
                  <Button onClick={handleLordGift} variant="gold">赠礼 50 第纳尔</Button>
                  <Button onClick={handleLordPolicy} variant="secondary">询问方略</Button>
                  <Button onClick={handleLordRecent} variant="secondary">询问近况</Button>
                </>
              )}
              <Button onClick={handleGuardInquiry} variant="secondary">询问守卫</Button>
            </div>

            {currentLord && (
              <div className="bg-stone-900/40 p-3 rounded border border-stone-800">
                <div className="flex flex-col md:flex-row gap-2">
                  <input
                    value={lordChatInput}
                    onChange={(e) => setLordChatInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key !== 'Enter') return;
                      const composing = (e.nativeEvent as any)?.isComposing;
                      if (composing) return;
                      e.preventDefault();
                      sendToLord();
                    }}
                    className="flex-1 bg-stone-950 border border-stone-700 text-stone-200 px-3 py-2 rounded placeholder:text-stone-600"
                    placeholder="向领主发问..."
                    disabled={isLordChatLoading}
                  />
                  <Button
                    onClick={sendToLord}
                    variant="secondary"
                    disabled={isLordChatLoading || !lordChatInput.trim()}
                  >
                    {isLordChatLoading ? '…' : '发送'}
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTownTab === 'MEMORIAL' && (
          <div className="animate-fade-in">
            <div className="col-span-1 md:col-span-2 bg-stone-900/40 p-4 rounded border border-stone-800 mb-4">
              <p className="text-stone-400 text-sm">这里记录着所有为你牺牲的战士。</p>
            </div>
            <div className="bg-stone-900/40 p-4 rounded border border-stone-800 mb-4">
              <div className="text-stone-200 font-bold mb-3">英雄遗骸</div>
              {((player.fallenHeroes ?? []).length === 0) ? (
                <div className="text-stone-500 text-sm">暂无英雄殒命。</div>
              ) : (
                <div className="space-y-3">
                  {(player.fallenHeroes ?? []).slice().reverse().map(record => {
                    const hero = record.hero;
                    const reviveCost = 400 + Math.max(0, (hero.level ?? 1) - 1) * 250;
                    const canAfford = player.gold >= reviveCost;
                    return (
                      <div key={record.id} className="bg-stone-950/40 border border-stone-800 rounded p-3 flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <div className="text-stone-200 font-semibold truncate">{hero.name} · {hero.title}</div>
                          <div className="text-[11px] text-stone-600 truncate">殒命 Day {record.day} · 战役: {record.battleName}</div>
                          <div className="text-xs text-stone-500 truncate">复活后等级清零，持久记忆将被抹除</div>
                        </div>
                        <Button
                          variant={canAfford ? 'gold' : 'secondary'}
                          disabled={!canAfford}
                          onClick={() => {
                            setPlayer(prev => ({
                              ...prev,
                              gold: prev.gold - reviveCost,
                              fallenHeroes: (prev.fallenHeroes ?? []).filter(item => item.id !== record.id)
                            }));
                            setHeroes(prev => ([
                              ...prev.filter(h => h.id !== hero.id),
                              {
                                ...hero,
                                recruited: true,
                                joinedDay: playerRef.current.day,
                                locationId: undefined,
                                stayDays: undefined,
                              status: 'ACTIVE',
                              currentExpression: 'IDLE',
                              currentHp: hero.maxHp,
                              level: 0,
                              xp: 0,
                              maxXp: 100,
                              attributePoints: 0,
                              chatMemory: [],
                              permanentMemory: [],
                              chatRounds: 0
                              }
                            ]));
                            addLog(`你在英灵殿花费 ${reviveCost} 第纳尔，复活了 ${hero.name}。`);
                          }}
                        >
                          复活（{reviveCost}）
                        </Button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
            {player.fallenRecords.length === 0 ? (
              <div className="text-center py-20 bg-stone-900/50 rounded border border-stone-800">
                <Ghost size={48} className="mx-auto text-stone-600 mb-4 opacity-50" />
                <p className="text-stone-500 font-serif">墓碑上还没有名字。这是件好事。</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-2">
                {player.fallenRecords.slice().reverse().map((record) => (
                  <div key={record.id} className="bg-stone-900 border border-stone-800 p-4 rounded flex items-center justify-between hover:border-stone-600 transition-colors">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-stone-800 rounded-full flex items-center justify-center border border-stone-700">
                        <Skull size={16} className="text-stone-500" />
                      </div>
                      <div>
                        <div className="font-bold text-stone-300">
                          {record.unitName} <span className="text-stone-500 text-xs">x{record.count}</span>
                        </div>
                        <div className="text-xs text-stone-500">
                          死于 <span className="text-stone-400">Day {record.day}</span> - 战役: {record.battleName}
                        </div>
                      </div>
                    </div>
                    <div className="text-right text-xs max-w-xs pl-4">
                      <span className="text-red-900/70 italic block mb-1">死因</span>
                      <span className="text-stone-400">"{record.cause}"</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
