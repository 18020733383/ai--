import React from 'react';
import { AlertTriangle, Beer, Brain, Coins, Ghost, Hammer, History, Home, MapPin, MessageCircle, Mountain, Plus, Scroll, Shield, ShieldAlert, Skull, Star, Swords, Users, Utensils, Zap } from 'lucide-react';
import { Button } from '../components/Button';
import { TroopCard } from '../components/TroopCard';
import { chatWithAltar, chatWithCampLeader, chatWithLord, proposeHeroPromotion, type HeroPromotionDraft } from '../services/geminiService';
import { ANOMALY_CATALOG, getTroopRace, TROOP_RACE_LABELS } from '../constants';
import { AIProvider, AltarDoctrine, AltarTroopDraft, Anomaly, BuildingType, EnemyForce, Enchantment, Hero, Location, Lord, LordFocus, MineralId, MineralPurity, PlayerState, RecruitOffer, SiegeEngineType, StayParty, Troop, TroopTier } from '../types';

type TownTab = 'RECRUIT' | 'TAVERN' | 'GARRISON' | 'LOCAL_GARRISON' | 'DEFENSE' | 'MEMORIAL' | 'WORK' | 'SIEGE' | 'OWNED' | 'COFFEE_CHAT' | 'MINING' | 'FORGE' | 'ROACH_LURE' | 'IMPOSTER_STATIONED' | 'LORD' | 'ALTAR' | 'ALTAR_RECRUIT' | 'MAGICIAN_LIBRARY' | 'RECOMPILER' | 'HABITAT' | 'HIDEOUT';

type WorkState = {
  isActive: boolean;
  totalDays: number;
  daysPassed: number;
  dailyIncome: number;
  accumulatedIncome: number;
};

type MiningState = {
  isActive: boolean;
  locationId: string;
  mineralId: MineralId;
  totalDays: number;
  daysPassed: number;
  yieldByPurity: Record<MineralPurity, number>;
};

type RoachLureState = {
  isActive: boolean;
  locationId: string;
  totalDays: number;
  daysPassed: number;
  recruitedByTroopId: Record<string, number>;
};

type HabitatStayState = {
  isActive: boolean;
  locationId: string;
  totalDays: number;
  daysPassed: number;
};

type AltarRecruitState = {
  isActive: boolean;
  locationId: string;
  totalDays: number;
  daysPassed: number;
  recruitedByTroopId: Record<string, number>;
};

type TownViewProps = {
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
  workState: WorkState | null;
  setWorkState: (value: WorkState | null) => void;
  miningState: MiningState | null;
  setMiningState: (value: MiningState | null) => void;
  roachLureState: RoachLureState | null;
  setRoachLureState: (value: RoachLureState | null) => void;
  habitatStayState: HabitatStayState | null;
  setHabitatStayState: (value: HabitatStayState | null) => void;
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
  workState,
  setWorkState,
  miningState,
  setMiningState,
  roachLureState,
  setRoachLureState,
  habitatStayState,
  setHabitatStayState,
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
  recentLogs
}: TownViewProps) => {
  if (!currentLocation) return null;

  const getBgImageStyle = () => {
    const type = currentLocation.type;
    const bgType = type === 'FIELD_CAMP' ? 'BANDIT_CAMP' : type === 'HIDEOUT' ? 'RUINS' : type;
    return {
      backgroundImage: `url("/image/${bgType}.webp"), url("/image/${bgType}.png"), url("/image/${bgType}.jpg"), url("/image/${bgType}.jpeg")`,
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
  const isHideout = currentLocation.type === 'HIDEOUT';
  const isHeavyTrialGrounds = currentLocation.type === 'HEAVY_TRIAL_GROUNDS';
  const isImposterPortal = currentLocation.type === 'IMPOSTER_PORTAL';
  const isAltar = currentLocation.type === 'ALTAR';
  const mineConfig = mineConfigs[currentLocation.type];
  const isMine = !!mineConfig;
  const isBlacksmith = currentLocation.type === 'BLACKSMITH';
  const isMagicianLibrary = currentLocation.type === 'MAGICIAN_LIBRARY';
  const isRecompiler = currentLocation.type === 'SOURCE_RECOMPILER';
  const isFieldCamp = currentLocation.type === 'FIELD_CAMP';
  const isSpecialLocation = isMine || isBlacksmith || isAltar || isMagicianLibrary || isRecompiler;
  const isOwnedByPlayer = currentLocation.owner === 'PLAYER';
  const locationRelationValue = player.locationRelations?.[currentLocation.id] ?? 0;
  const isWantedHere = !isOwnedByPlayer && (isCity || isCastle || isVillage) && locationRelationValue <= -60;
  const isRestrictedEnemyHeld = currentLocation.owner === 'ENEMY' && (isCity || isCastle || isVillage) && !currentLocation.factionId;
  const isRestricted = (currentLocation.sackedUntilDay ?? 0) >= player.day || isRestrictedEnemyHeld || !!currentLocation.isUnderSiege;
  const restrictedTabs = ['RECRUIT', 'TAVERN', 'WORK', 'MEMORIAL', 'COFFEE_CHAT', 'OWNED', 'MINING', 'FORGE', 'ROACH_LURE', 'LORD', 'MAGICIAN_LIBRARY', 'RECOMPILER'];
  const specialHiddenTabs = ['RECRUIT', 'GARRISON', 'LOCAL_GARRISON', 'DEFENSE', 'SIEGE', 'OWNED', 'TAVERN', 'WORK', 'MEMORIAL', 'COFFEE_CHAT', 'LORD'];
  const specialFallbackTab = isMine ? 'MINING' : isBlacksmith ? 'FORGE' : isAltar ? 'ALTAR' : isMagicianLibrary ? 'MAGICIAN_LIBRARY' : isRecompiler ? 'RECOMPILER' : 'LOCAL_GARRISON';
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
  const tavernLabel = "前往酒馆";

  const currentTroopCount = player.troops.reduce((a, b) => a + b.count, 0);
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
  const [altarChatInput, setAltarChatInput] = React.useState('');
  const [recompilerTroopId, setRecompilerTroopId] = React.useState<string | null>(null);
  const [recompilerCrystalTier, setRecompilerCrystalTier] = React.useState<number>(1);
  const [recompilerDraft, setRecompilerDraft] = React.useState<HeroPromotionDraft | null>(null);
  const [recompilerNameDraft, setRecompilerNameDraft] = React.useState('');
  const [isRecompilerLoading, setIsRecompilerLoading] = React.useState(false);
  const [recompilerError, setRecompilerError] = React.useState<string | null>(null);
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

  const recruitHero = (hero: Hero) => {
    if (hero.recruited) return;
    setHeroes(prev => prev.map(h => h.id === hero.id ? {
      ...h,
      recruited: true,
      joinedDay: playerRef.current.day,
      affinity: '陌生',
      locationId: undefined,
      stayDays: undefined
    } : h));
    setHeroDialogue(null);
    addLog(`${hero.name} 加入了你的队伍。`);
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

  const handleAltarChatSend = async () => {
    if (!currentLocation || currentLocation.type !== 'ALTAR') return;
    if (isAltarLoading) return;
    const text = altarChatInput.trim();
    if (!text) return;
    const locationId = currentLocation.id;
    const nextDialogue = [
      ...(altarDialogues[locationId] ?? []),
      { role: 'PLAYER' as const, text }
    ];
    setAltarDialogues(prev => ({
      ...prev,
      [locationId]: nextDialogue
    }));
    setAltarChatInput('');
    setIsAltarLoading(true);
    try {
      const aiConfig = buildAIConfig();
      const response = await chatWithAltar(
        nextDialogue,
        altarDraft,
        playerRef.current,
        altarProposal ? { doctrineSummary: altarProposal.result.doctrineSummary, troops: altarProposal.result.troops } : null,
        aiConfig
      );
      console.log('[altar] response', response);
      setAltarDrafts(prev => ({ ...prev, [locationId]: response.draft }));
      setAltarProposals(prev => ({
        ...prev,
        [locationId]: {
          doctrine: response.draft,
          result: {
            npcReply: response.npcReply,
            doctrineSummary: response.doctrineSummary,
            troops: response.troops
          },
          prevResult: prev[locationId]?.result
        }
      }));
      setAltarDialogues(prev => ({
        ...prev,
        [locationId]: [...(prev[locationId] ?? nextDialogue), { role: 'NPC', text: response.npcReply }]
      }));
    } catch (error) {
      console.log('[altar] error', error);
      setAltarDialogues(prev => ({
        ...prev,
        [locationId]: [...(prev[locationId] ?? nextDialogue), { role: 'NPC', text: '神秘人沉默了片刻。' }]
      }));
    } finally {
      setIsAltarLoading(false);
    }
  };

  const formatAttributes = (attrs?: AltarTroopDraft['attributes']) => {
    if (!attrs) return 'A0 D0 AGI0 HP0 RNG0 MOR0';
    return `A${attrs.attack} D${attrs.defense} AGI${attrs.agility} HP${attrs.hp} RNG${attrs.range} MOR${attrs.morale}`;
  };

  const attributeMeta = [
    { key: 'attack', label: '攻击' },
    { key: 'defense', label: '防御' },
    { key: 'agility', label: '敏捷' },
    { key: 'hp', label: '体魄' },
    { key: 'range', label: '远程' },
    { key: 'morale', label: '士气' }
  ] as const;
  type AttrKey = typeof attributeMeta[number]['key'];
  const altarRadarMax: Record<AttrKey, number> = {
    attack: 200,
    defense: 215,
    agility: 160,
    hp: 220,
    range: 210,
    morale: 200
  };
  const radarSize = 110;
  const radarCenter = radarSize / 2;
  const radarRadius = 36;
  const radarPoints = (values: Record<AttrKey, number>, maxValues: Record<AttrKey, number>, scale: number = 1) =>
    attributeMeta.map((attr, index) => {
      const angle = (Math.PI * 2 * index) / attributeMeta.length - Math.PI / 2;
      const max = Math.max(1, maxValues[attr.key]);
      const ratio = Math.min(1, values[attr.key] / max);
      const r = radarRadius * ratio * scale;
      const x = radarCenter + Math.cos(angle) * r;
      const y = radarCenter + Math.sin(angle) * r;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    }).join(' ');
  const radarAxis = attributeMeta.map((attr, index) => {
    const angle = (Math.PI * 2 * index) / attributeMeta.length - Math.PI / 2;
    const x = radarCenter + Math.cos(angle) * radarRadius;
    const y = radarCenter + Math.sin(angle) * radarRadius;
    return { x, y, label: attr.label };
  });
  const renderAltarRadar = (attrs?: AltarTroopDraft['attributes'], color: string = '#c084fc') => {
    const values: Record<AttrKey, number> = {
      attack: attrs?.attack ?? 0,
      defense: attrs?.defense ?? 0,
      agility: attrs?.agility ?? 0,
      hp: attrs?.hp ?? 0,
      range: attrs?.range ?? 0,
      morale: attrs?.morale ?? 0
    };
    return (
      <svg width={radarSize} height={radarSize} viewBox={`0 0 ${radarSize} ${radarSize}`}>
        <polygon points={radarPoints(altarRadarMax, altarRadarMax, 1)} fill="none" stroke="#2a2a2a" strokeWidth="1" />
        <polygon points={radarPoints(altarRadarMax, altarRadarMax, 0.66)} fill="none" stroke="#202020" strokeWidth="1" />
        <polygon points={radarPoints(altarRadarMax, altarRadarMax, 0.33)} fill="none" stroke="#202020" strokeWidth="1" />
        {radarAxis.map((axis, idx) => (
          <line key={`axis-${idx}`} x1={radarCenter} y1={radarCenter} x2={axis.x} y2={axis.y} stroke="#242424" strokeWidth="1" />
        ))}
        <polygon points={radarPoints(values, altarRadarMax)} fill="rgba(192, 132, 252, 0.25)" stroke={color} strokeWidth="1.5" />
      </svg>
    );
  };

  const listSignature = (list?: string[]) => (list ?? []).map(item => String(item).trim()).filter(Boolean).join('|');

  const isAttributesChanged = (current?: AltarTroopDraft['attributes'], prev?: AltarTroopDraft['attributes']) => {
    if (!prev && current) return true;
    if (!current && prev) return true;
    if (!current || !prev) return false;
    return current.attack !== prev.attack
      || current.defense !== prev.defense
      || current.agility !== prev.agility
      || current.hp !== prev.hp
      || current.range !== prev.range
      || current.morale !== prev.morale;
  };

  const getTroopDiff = (current: AltarTroopDraft, prev?: AltarTroopDraft) => ({
    name: !prev || current.name !== prev.name,
    basePower: !prev || current.basePower !== prev.basePower,
    maxXp: !prev || current.maxXp !== prev.maxXp,
    upgradeCost: !prev || current.upgradeCost !== prev.upgradeCost,
    description: !prev || current.description !== prev.description,
    equipment: !prev || listSignature(current.equipment) !== listSignature(prev.equipment),
    attributes: isAttributesChanged(current.attributes, prev?.attributes)
  });

  const findPrevTroop = (index?: number) => {
    if (prevAltarTroops.length === 0) return undefined;
    return typeof index === 'number' ? prevAltarTroops[index] : undefined;
  };

  const handleCityRest = () => {
    if (!isCity) return;
    if (!canRestInCity) {
      addLog("资金不足，无法在城内休息。");
      return;
    }
    processDailyCycle(currentLocation, cityRestCost);
  };
  const handleWork = () => {
    if (!isCity) return;
    const days = Math.max(1, Math.floor(workDays));
    setWorkDays(days);

    setWorkState({
      isActive: true,
      totalDays: days,
      daysPassed: 0,
      dailyIncome: workIncomePerDay,
      accumulatedIncome: 0
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
    const currentCount = player.troops.reduce((a, b) => a + b.count, 0);
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
    const currentCount = player.troops.reduce((a, b) => a + b.count, 0);
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
  const hideoutSelectedLayerIndex = Math.max(0, Math.min((hideoutState?.layers?.length ?? 1) - 1, hideoutState?.selectedLayer ?? 0));
  const hideoutSelectedLayer = hideoutState?.layers?.[hideoutSelectedLayerIndex];
  const hideoutLayerTroops = (hideoutSelectedLayer?.garrison ?? []).filter(t => (t.count ?? 0) > 0);
  const hideoutLayerGarrisonCount = hideoutLayerTroops.reduce((sum, t) => sum + (t.count ?? 0), 0);
  const hideoutLayerGarrisonPower = hideoutLayerTroops.reduce((sum, t) => sum + (t.count ?? 0) * (t.basePower ?? 0), 0);
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
  const hideoutExposure = Math.max(0, Math.min(100, hideoutState?.exposure ?? 0));
  const hideoutCamouflageCooldownUntilDay = hideoutState?.camouflageCooldownUntilDay ?? 0;

  const [hideoutRefineMineralId, setHideoutRefineMineralId] = React.useState<MineralId>('NULL_CRYSTAL');
  const [hideoutRefineFromPurity, setHideoutRefineFromPurity] = React.useState<MineralPurity>(1);
  const [hideoutRefineOutputCount, setHideoutRefineOutputCount] = React.useState(1);
  const [hideoutPage, setHideoutPage] = React.useState<'DASHBOARD' | 'GARRISON' | 'GUARDIAN' | 'FACILITIES' | 'DEFENSE' | 'REFINERY' | 'LOGS' | 'BUILD'>('DASHBOARD');
  const [hideoutBuildTarget, setHideoutBuildTarget] = React.useState<{ category: 'FACILITY' | 'DEFENSE'; slotIndex: number } | null>(null);
  const [hideoutBuildAnim, setHideoutBuildAnim] = React.useState<{ category: 'FACILITY' | 'DEFENSE'; slotIndex: number; id: string } | null>(null);

  const hideoutFacilityBuildOptions = buildingOptions.filter(b => (
    b.type === 'HOUSING' ||
    b.type === 'TRAINING_CAMP' ||
    b.type === 'BARRACKS' ||
    b.type === 'RECRUITER' ||
    b.type === 'SHRINE' ||
    b.type === 'ORE_REFINERY'
  ));
  const hideoutDefenseBuildOptions = buildingOptions.filter(b => (
    b.type === 'DEFENSE' ||
    b.type === 'AA_TOWER_I' ||
    b.type === 'AA_TOWER_II' ||
    b.type === 'AA_TOWER_III' ||
    b.type === 'AA_NET_I' ||
    b.type === 'AA_NET_II' ||
    b.type === 'AA_RADAR_I' ||
    b.type === 'AA_RADAR_II' ||
    b.type === 'CAMOUFLAGE_STRUCTURE'
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
    if (type === 'TRAINING_CAMP') return ['每 3 天训练一次（与数量叠加）', '提升该层驻军经验'];
    if (type === 'BARRACKS') return ['该层驻军上限 +50%'];
    if (type === 'RECRUITER') return ['每 4 天征募一次（与数量叠加）', '优先补满驻军空位'];
    if (type === 'SHRINE') return ['若已确立宗教：每 4 天招募信徒守卫', '驻军不足时优先补充'];
    if (type === 'ORE_REFINERY') return ['解锁该层“矿石精炼”', '低纯度×3 → 高一档纯度×1（需要时间+费用）'];
    if (type === 'DEFENSE') return ['提升防御强度（可叠加）'];
    if (type === 'AA_TOWER_I') return ['提升防空强度与远程命中（可叠加）'];
    if (type === 'AA_TOWER_II') return ['需要 AA_TOWER_I', '提升防空强度（可叠加）'];
    if (type === 'AA_TOWER_III') return ['需要 AA_TOWER_II', '提升防空强度（可叠加）'];
    if (type === 'AA_NET_I') return ['提升空袭减伤（可叠加）'];
    if (type === 'AA_NET_II') return ['需要 AA_NET_I', '提升空袭减伤（可叠加）'];
    if (type === 'AA_RADAR_I') return ['提升防空强度与远程命中（可叠加）'];
    if (type === 'AA_RADAR_II') return ['需要 AA_RADAR_I', '提升防空强度与远程命中（可叠加）'];
    if (type === 'CAMOUFLAGE_STRUCTURE') return ['仅地面层可建', '可花钱降低暴露（冷却）', '被动减缓暴露上升'];
    return [];
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

  const handleDepositToGarrison = (troopId: string, amount: number) => {
    if (!isOwnedByPlayer) return;
    const troop = player.troops.find(t => t.id === troopId);
    if (!troop) return;
    const availableCapacity = garrisonLimit - currentGarrisonCount;
    const moveCount = Math.min(amount, troop.count, availableCapacity);
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
    setPlayer(prev => ({ ...prev, troops: updatedPlayerTroops }));
    updateLocationState({ ...currentLocation, garrison: updatedGarrison });
    addLog(`已调入 ${moveCount} 名 ${troop.name}。`);
  };

  const handleWithdrawFromGarrison = (troopId: string, amount: number) => {
    if (!isOwnedByPlayer) return;
    const garrisonTroop = ownedGarrison.find(t => t.id === troopId);
    if (!garrisonTroop) return;
    const currentCount = player.troops.reduce((a, b) => a + b.count, 0);
    const availableSpace = getMaxTroops() - currentCount;
    const moveCount = Math.min(amount, garrisonTroop.count, availableSpace);
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
    setPlayer(prev => ({ ...prev, troops: updatedPlayerTroops }));
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

  const handleHideoutSelectLayer = (layerIndex: number) => {
    if (!isHideout || !isOwnedByPlayer) return;
    const hideout = currentLocation.hideout;
    if (!hideout || !Array.isArray(hideout.layers) || hideout.layers.length === 0) return;
    const safeIndex = Math.max(0, Math.min(hideout.layers.length - 1, Math.floor(layerIndex)));
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
        ...(hideout ?? { layers: [], selectedLayer: 0, lastRaidDay: 0, exposure: 8, camouflageCooldownUntilDay: 0 }),
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
    const moveCount = Math.min(amount, troop.count, availableCapacity);
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
    setPlayer(prev => ({ ...prev, troops: updatedPlayerTroops }));
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
    const currentCount = player.troops.reduce((a, b) => a + b.count, 0);
    const availableSpace = getMaxTroops() - currentCount;
    const moveCount = Math.min(amount, garrisonTroop.count, availableSpace);
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
    setPlayer(prev => ({ ...prev, troops: updatedPlayerTroops }));
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
      const hasCamouflage = (layer.defenseSlots ?? []).some(s => s.type === 'CAMOUFLAGE_STRUCTURE');
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
    updateHideoutLayer(layerIndex, l => {
      const emptySlot = { type: null as BuildingType | null, daysLeft: undefined as number | undefined, totalDays: undefined as number | undefined };
      const nextSlots = [...((category === 'FACILITY' ? l.facilitySlots : l.defenseSlots) ?? Array.from({ length: 10 }, () => ({ ...emptySlot })))];
      nextSlots[idx] = { type: building.type, daysLeft: building.days, totalDays: building.days };
      return category === 'FACILITY'
        ? { ...l, facilitySlots: nextSlots }
        : { ...l, defenseSlots: nextSlots };
    });
    addLog(`开始在 ${layer.name} 建造 ${building.name}（槽位 ${idx + 1}），需要 ${building.days} 天。`);
    addHideoutLocalLog(`开工：${layer.name} 槽位${idx + 1} 开始建造 ${building.name}。`);
  };

  const handleHideoutReduceExposure = () => {
    if (!isHideout || !isOwnedByPlayer) return;
    const hideout = currentLocation.hideout;
    if (!hideout || !Array.isArray(hideout.layers) || hideout.layers.length === 0) return;
    const layer0 = hideout.layers[0];
    const hasCamouflage = (layer0.defenseSlots ?? []).some(s => s.type === 'CAMOUFLAGE_STRUCTURE' && !(s.daysLeft && s.daysLeft > 0));
    if (!hasCamouflage) {
      addLog("需要在地面层建造伪装结构。");
      return;
    }
    const cooldownUntil = hideout.camouflageCooldownUntilDay ?? 0;
    if (player.day < cooldownUntil) {
      addLog(`伪装结构冷却中（第 ${cooldownUntil} 天可用）。`);
      return;
    }
    const cost = 260;
    if (player.gold < cost) {
      addLog("资金不足，无法启动伪装。");
      return;
    }
    const exposure = Math.max(0, Math.min(100, hideout.exposure ?? 0));
    const reduced = Math.max(0, exposure - 18);
    setPlayer(prev => ({ ...prev, gold: Math.max(0, prev.gold - cost) }));
    updateLocationState({
      ...currentLocation,
      hideout: {
        ...hideout,
        exposure: reduced,
        camouflageCooldownUntilDay: player.day + 6
      }
    });
    addLog(`伪装结构启动：暴露程度降低 ${Math.round(exposure - reduced)}。`);
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
    updateHideoutLayer(layerIndex, l => ({ ...l, guardianHeroId: heroId || undefined }));
    setHeroes(prev => prev.map(h => {
      if (h.id !== heroId && h.id !== (hideout.layers[layerIndex]?.guardianHeroId ?? '')) return h;
      if (h.status === 'DEAD' || !h.recruited) return h;
      if (h.id === heroId) return { ...h, locationId: currentLocation.id, stayDays: undefined };
      return { ...h, locationId: undefined, stayDays: undefined };
    }));
    if (heroId) {
      const name = heroes.find(h => h.id === heroId)?.name ?? heroId;
      addLog("已更换该层守护者。");
      addHideoutLocalLog(`守护者更替：${name} 前往 ${layerName} 驻守。`);
    } else {
      addLog("已撤下该层守护者。");
      addHideoutLocalLog(`守护者撤离：${layerName} 的守护者已返回随行队伍。`);
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
                守军剩余: <span className="text-green-300">{isHideout ? hideoutLayerGarrisonCount : getGarrisonCount(currentLocation.garrison ?? [])}人</span>。
              </p>
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
                        disabled={player.day < hideoutCamouflageCooldownUntilDay || player.gold < 260 || !((hideoutState?.layers?.[0]?.defenseSlots ?? []).some(s => s.type === 'CAMOUFLAGE_STRUCTURE' && !(s.daysLeft && s.daysLeft > 0)))}
                        onClick={handleHideoutReduceExposure}
                      >
                        {player.day < hideoutCamouflageCooldownUntilDay ? `冷却至第${hideoutCamouflageCooldownUntilDay}天` : '降低暴露'}
                      </Button>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                {(hideoutState?.layers ?? []).map((layer, idx) => (
                  <button
                    key={layer.id}
                    onClick={() => handleHideoutSelectLayer(idx)}
                    className={`px-3 py-1 rounded border text-sm ${idx === hideoutSelectedLayerIndex ? 'bg-emerald-900/40 border-emerald-700 text-emerald-200' : 'bg-stone-900/60 border-stone-700 text-stone-400 hover:border-stone-500'}`}
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
                { id: 'REFINERY', label: '精炼' },
                { id: 'LOGS', label: '据点日志' }
              ] as const).map(item => (
                <button
                  key={item.id}
                  onClick={() => {
                    setHideoutBuildTarget(null);
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
                      <div className="space-y-2">
                        <div className="text-xs text-stone-500">槽位 {slotIndex + 1}</div>
                        <div className="text-stone-200 font-bold text-sm">{getHideoutSlotLabel(slot)}</div>
                      </div>
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
                      <div className="space-y-2">
                        <div className="text-xs text-stone-500">槽位 {slotIndex + 1}</div>
                        <div className="text-stone-200 font-bold text-sm">{getHideoutSlotLabel(slot)}</div>
                      </div>
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
                          .filter(opt => depth === 0 ? true : opt.type !== 'CAMOUFLAGE_STRUCTURE');
                        const defenseBuilt = hideoutDefenseSlots.filter(s => s.type && isSlotBuilt(s)).map(s => s.type as BuildingType);
                        const canBuildType = (type: BuildingType) => {
                          if (category === 'DEFENSE' && type === 'CAMOUFLAGE_STRUCTURE' && depth !== 0) return { ok: false, reason: '仅地面层可建造' };
                          if (type === 'AA_TOWER_II' && !defenseBuilt.includes('AA_TOWER_I')) return { ok: false, reason: '需要 AA_TOWER_I' };
                          if (type === 'AA_TOWER_III' && !defenseBuilt.includes('AA_TOWER_II')) return { ok: false, reason: '需要 AA_TOWER_II' };
                          if (type === 'AA_NET_II' && !defenseBuilt.includes('AA_NET_I')) return { ok: false, reason: '需要 AA_NET_I' };
                          if (type === 'AA_RADAR_II' && !defenseBuilt.includes('AA_RADAR_I')) return { ok: false, reason: '需要 AA_RADAR_I' };
                          if (type === 'CAMOUFLAGE_STRUCTURE' && hideoutDefenseSlots.some(s => s.type === 'CAMOUFLAGE_STRUCTURE')) return { ok: false, reason: '已存在伪装结构' };
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-fade-in">
            <div className="col-span-1 md:col-span-2 bg-stone-900/40 p-4 rounded border border-stone-800 mb-4">
              <p className="text-stone-400 text-sm">
                {isHotpot
                  ? "这里可以招募到特殊的食材...我是说战士。"
                  : isCoffee
                    ? "亡灵愿意以廉价的代价加入。刷新时间受天数影响，招募数量受统御技能影响。"
                    : isHeavyTrialGrounds
                      ? "这里出售试验级重型单位。库存通常很少，且占用队伍人数上限（按台/辆计）。"
                      : "在这里可以招募到基础士兵。刷新时间受天数影响，招募数量受统御技能影响。"}
              </p>
            </div>
            {isHeavyTrialGrounds ? (
              currentLocation.mercenaries.length > 0 ? currentLocation.mercenaries.map(offer =>
                renderRecruitCard(offer, 'MERCENARY')
              ) : (
                <div className="col-span-2 text-center py-12 border border-dashed border-stone-800 rounded">
                  <p className="text-stone-500 italic">试验场今天没有可用的重型装备。</p>
                </div>
              )
            ) : (
              currentLocation.volunteers.length > 0 ? currentLocation.volunteers.map(offer =>
                renderRecruitCard(offer, 'VOLUNTEER')
              ) : (
                <div className="col-span-2 text-center py-12 border border-dashed border-stone-800 rounded">
                  <p className="text-stone-500 italic">这一带暂时没有愿意参军的人。（过几天再来看看）</p>
                </div>
              )
            )}
          </div>
        )}

        {isHabitat && activeTownTab === 'HABITAT' && (
          <div className="space-y-6 animate-fade-in">
            <div className="bg-stone-900/40 p-4 rounded border border-stone-800">
              <div className="flex items-center justify-between gap-3">
                <div className="text-stone-200 font-bold">栖息地</div>
                <div className="text-xs text-stone-600">时间会加速流逝，世界照常运转</div>
              </div>
              <div className="text-sm text-stone-400 mt-2 leading-relaxed">
                你可以在此停留一段时间，用更短的间隔推进每日结算（商队、袭掠、攻城、招募刷新等都会照常发生）。
              </div>
            </div>

            <div className="bg-stone-900/40 p-4 rounded border border-stone-800 space-y-3">
              <div className="flex items-center justify-between">
                <div className="text-stone-200 font-bold">快进天数</div>
                <div className="text-xs text-stone-500">当前第 {player.day} 天</div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
                <div className="md:col-span-2">
                  <div className="text-xs text-stone-500 mb-1">天数（1-1000）</div>
                  <input
                    type="number"
                    min={1}
                    max={1000}
                    value={habitatStayDays}
                    onChange={e => setHabitatStayDays(Number(e.target.value))}
                    className="w-full bg-stone-950 border border-stone-700 text-stone-200 px-3 py-2 rounded"
                  />
                </div>
                <Button
                  variant="secondary"
                  disabled={habitatStayState?.isActive}
                  onClick={() => {
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
                >
                  <MapPin size={16} className="inline mr-2" /> 开始栖息
                </Button>
              </div>
            </div>
          </div>
        )}

        {isCoffee && activeTownTab === 'COFFEE_CHAT' && (
          <div className="space-y-4 animate-fade-in">
            <div className="bg-stone-900/40 p-4 rounded border border-stone-800 text-sm text-stone-400 flex items-center justify-between gap-3">
              <div>亡灵们会记得你最近的经历，也会盯着你的队伍阵容评头论足。</div>
              <div className="text-xs text-stone-600 whitespace-nowrap">Enter 发送</div>
            </div>

            <div className="bg-stone-900/40 p-4 rounded border border-stone-800 space-y-3">
              <div className="flex items-center justify-between">
                <div className="text-stone-200 font-bold">咖啡与点心</div>
                <div className="text-xs text-stone-500">赠礼会被记录进英雄对话</div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                <div className="md:col-span-1">
                  <div className="text-xs text-stone-500 mb-1">选择英雄</div>
                  <select
                    value={coffeeGiftHeroId}
                    onChange={e => {
                      setCoffeeGiftHeroId(e.target.value);
                      setCoffeeGiftError(null);
                    }}
                    className="w-full bg-stone-950 border border-stone-700 text-stone-200 px-3 py-2 rounded"
                  >
                    {giftableHeroes.length === 0 ? (
                      <option value="">（暂无可赠送英雄）</option>
                    ) : (
                      giftableHeroes.map(h => (
                        <option key={`gift_hero_${h.id}`} value={h.id}>{h.name}</option>
                      ))
                    )}
                  </select>
                </div>
                <div className="md:col-span-1">
                  <div className="text-xs text-stone-500 mb-1">选择礼物</div>
                  <select
                    value={coffeeGiftItemId}
                    onChange={e => {
                      setCoffeeGiftItemId(e.target.value);
                      setCoffeeGiftError(null);
                    }}
                    className="w-full bg-stone-950 border border-stone-700 text-stone-200 px-3 py-2 rounded"
                  >
                    {coffeeGiftItems.map(item => (
                      <option key={`gift_item_${item.id}`} value={item.id}>
                        {item.name}（{item.price}）
                      </option>
                    ))}
                  </select>
                </div>
                <div className="md:col-span-1 flex items-end gap-2">
                  <Button
                    variant="gold"
                    disabled={giftableHeroes.length === 0}
                    onClick={() => {
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
                  >
                    购买并赠送
                  </Button>
                </div>
              </div>
              {coffeeGiftError && (
                <div className="text-sm text-red-300 bg-red-950/20 border border-red-900/40 rounded px-3 py-2">
                  {coffeeGiftError}
                </div>
              )}
            </div>

            <div
              ref={undeadChatListRef}
              className="bg-gradient-to-b from-stone-950/40 to-stone-900/40 p-4 rounded border border-stone-800 max-h-72 overflow-y-auto scrollbar-hide space-y-2"
            >
              {undeadDialogue.map((line, index) => (
                <div key={index} className={`flex ${line.role === 'PLAYER' ? 'justify-end' : 'justify-start'} log-slide-in`}>
                  <div
                    className={[
                      'max-w-[85%] md:max-w-[70%] px-3 py-2 rounded-2xl border shadow',
                      line.role === 'PLAYER'
                        ? 'bg-stone-800 border-stone-700 text-stone-200 rounded-br-sm'
                        : 'bg-amber-950/25 border-amber-900/50 text-amber-200 rounded-bl-sm'
                    ].join(' ')}
                  >
                    <div className="text-[10px] tracking-wider uppercase opacity-70 mb-1">
                      {line.role === 'PLAYER' ? '你' : '亡灵'}
                    </div>
                    <div className="text-sm leading-relaxed whitespace-pre-wrap">{line.text}</div>
                  </div>
                </div>
              ))}
            </div>

            <div className="bg-stone-900/40 p-3 rounded border border-stone-800">
              <div className="flex flex-col md:flex-row gap-2">
                <input
                  value={undeadChatInput}
                  onChange={(e) => setUndeadChatInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key !== 'Enter') return;
                    const composing = (e.nativeEvent as any)?.isComposing;
                    if (composing) return;
                    e.preventDefault();
                    sendToUndead();
                  }}
                  className="flex-1 bg-stone-950 border border-stone-700 text-stone-200 px-3 py-2 rounded placeholder:text-stone-600"
                  placeholder="问亡灵点什么..."
                  disabled={isUndeadChatLoading}
                />
                <Button
                  onClick={sendToUndead}
                  variant="secondary"
                  disabled={isUndeadChatLoading || !undeadChatInput.trim()}
                >
                  {isUndeadChatLoading ? '…' : '发送'}
                </Button>
              </div>
            </div>
          </div>
        )}

        {isCity && activeTownTab === 'TAVERN' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-fade-in">
            <div className="col-span-1 md:col-span-2 bg-stone-900/40 p-4 rounded border border-stone-800 mb-4">
              <p className="text-stone-400 text-sm">酒馆里偶尔会出现寻找雇主的资深战士。费用较高。</p>
            </div>
            <div className="col-span-1 md:col-span-2 bg-stone-900/40 p-4 rounded border border-stone-800">
              <div className="flex items-center justify-between">
                <div className="text-amber-500 font-bold">旅人传闻</div>
                <div className="text-xs text-stone-500">英雄会在城市酒馆停留几天后离开</div>
              </div>
              {tavernHeroes.length === 0 ? (
                <div className="text-stone-500 text-sm mt-3">今天没有熟面孔。</div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                  {tavernHeroes.map(hero => (
                    <div key={hero.id} className="bg-stone-950/40 border border-stone-800 rounded p-4 space-y-3">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <Star size={14} className="text-amber-400" />
                            <div className="text-stone-200 font-bold">{hero.name}</div>
                            <span className="text-[10px] px-2 py-0.5 rounded border border-stone-700 text-stone-400 bg-stone-900/30">
                              {getHeroRoleLabel(hero.role)}
                            </span>
                          </div>
                          <div className="text-xs text-stone-500">{hero.title} · {hero.portrait}</div>
                        </div>
                        <div className="text-xs text-stone-500">等级 {hero.level}</div>
                      </div>
                      <div className="text-sm text-stone-400 leading-relaxed">{hero.background}</div>
                      <div className="flex flex-wrap gap-2 text-[11px] text-stone-400">
                        {hero.traits.map((trait, idx) => (
                          <span key={`${hero.id}-trait-${idx}`} className="px-2 py-0.5 rounded border border-stone-700 bg-stone-900/40">
                            {trait}
                          </span>
                        ))}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-stone-500">
                        <span>攻击 {hero.attributes.attack}</span>
                        <span>血量 {hero.maxHp}</span>
                        <span>敏捷 {hero.attributes.agility}</span>
                      </div>
                      <div className="flex gap-2">
                        <Button onClick={() => talkToHero(hero)} variant="secondary">对话</Button>
                        <Button onClick={() => recruitHero(hero)} variant="gold">招募</Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {activeHero && heroDialogue && (
                <div className="mt-4 bg-stone-900/60 border border-stone-800 rounded p-4">
                  <div className="text-xs text-stone-500 mb-1">{activeHero.name}：</div>
                  <div className="text-stone-200">{heroDialogue.text}</div>
                </div>
              )}
            </div>
            {currentLocation.mercenaries.length > 0 ? currentLocation.mercenaries.map((offer) =>
              renderRecruitCard(offer, 'MERCENARY')
            ) : (
              <div className="col-span-2 text-center py-12 border border-dashed border-stone-800 rounded">
                <p className="text-stone-500 italic">酒馆里只有醉鬼。</p>
              </div>
            )}
          </div>
        )}

        {isCity && activeTownTab === 'WORK' && (
          <div className="space-y-6 animate-fade-in">
            <div className="bg-stone-900/40 p-4 rounded border border-stone-800">
              <p className="text-stone-400 text-sm">在城里打工可以获得稳定但不多的收入。时间越长收入越高。</p>
            </div>
            <div className="bg-stone-900/60 p-6 rounded border border-stone-800 flex flex-col md:flex-row md:items-center gap-6">
              <div className="flex items-center gap-3">
                <span className="text-stone-300">打工天数</span>
                <input
                  type="number"
                  min={1}
                  max={30}
                  value={workDays}
                  onChange={(e) => setWorkDays(Math.max(1, Math.min(30, Number(e.target.value) || 1)))}
                  className="w-20 bg-stone-800 border border-stone-700 text-stone-200 px-2 py-1 rounded"
                />
              </div>
              <div className="text-stone-400">预计收入：{workDays * workIncomePerDay} 第纳尔（{workIncomePerDay}/天）</div>
              <Button onClick={handleWork} variant="gold" className="flex items-center gap-2">
                <Coins size={16} /> 开始打工
              </Button>
            </div>
          </div>
        )}

        {isMine && activeTownTab === 'MINING' && mineConfig && (
          <div className="space-y-6 animate-fade-in">
            <div className="bg-stone-900/40 p-4 rounded border border-stone-800">
              <p className="text-stone-400 text-sm">
                矿脉会产出{mineConfig.crystalName}，附带效果：{mineConfig.effect}。挖矿会消耗时间并推进天数。
              </p>
            </div>
            <div className="bg-stone-900/60 p-6 rounded border border-stone-800 space-y-4">
              <div className="flex flex-wrap items-center gap-4">
                <span className="text-stone-300">挖矿天数</span>
                <input
                  type="number"
                  min={1}
                  max={20}
                  value={miningDays}
                  onChange={(e) => setMiningDays(Math.max(1, Math.min(20, Number(e.target.value) || 1)))}
                  className="w-20 bg-stone-800 border border-stone-700 text-stone-200 px-2 py-1 rounded"
                  disabled={!!miningState?.isActive}
                />
                <div className="text-stone-500 text-sm">纯度随机 1-5 级</div>
              </div>
              <Button
                onClick={handleStartMining}
                variant="secondary"
                disabled={!!miningState?.isActive || !!workState?.isActive || !!roachLureState?.isActive}
                className="flex items-center gap-2 w-full md:w-auto"
              >
                <Mountain size={16} /> 开始挖矿
              </Button>
            </div>

            <div className="bg-stone-900/60 p-6 rounded border border-stone-800">
              <div className="text-stone-200 font-bold mb-3">矿石库存</div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {(Object.keys(mineralMeta) as MineralId[]).map(id => (
                  <div key={id} className="bg-stone-900 border border-stone-800 rounded p-3 space-y-2">
                    <div className="text-stone-200 font-semibold">{mineralMeta[id].name}</div>
                    <div className="text-xs text-stone-500">{mineralMeta[id].effect}</div>
                    <div className="text-xs text-stone-400">
                      {[5, 4, 3, 2, 1].map(purity => (
                        <span key={`${id}_${purity}`} className="mr-2">
                          {mineralPurityLabels[purity as MineralPurity]} {mineralInventory[id][purity as MineralPurity] ?? 0}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {isRoachNest && activeTownTab === 'ROACH_LURE' && (
          <div className="space-y-6 animate-fade-in">
            <div className="bg-stone-900/40 p-4 rounded border border-stone-800">
              <p className="text-stone-400 text-sm">
                在蟑螂窝附近摆上油渍纸板与热饮残渣，静候虫群集合。每一天会随机吸引一批 Tier 1 蟑螂士兵加入你。
              </p>
            </div>
            <div className="bg-stone-900/60 p-6 rounded border border-stone-800 space-y-4">
              <div className="flex flex-wrap items-center gap-4">
                <span className="text-stone-300">吸引天数</span>
                <input
                  type="number"
                  min={1}
                  max={20}
                  value={roachLureDays}
                  onChange={(e) => setRoachLureDays(Math.max(1, Math.min(20, Number(e.target.value) || 1)))}
                  className="w-20 bg-stone-800 border border-stone-700 text-stone-200 px-2 py-1 rounded"
                  disabled={!!roachLureState?.isActive}
                />
                <div className="text-stone-500 text-sm">预计收获总数：{roachLureDays * 1} - {roachLureDays * 3}</div>
              </div>
              <Button
                onClick={handleStartRoachLure}
                variant="secondary"
                disabled={!!roachLureState?.isActive || !!workState?.isActive || !!miningState?.isActive || currentTroopCount >= maxTroops}
                className="flex items-center gap-2 w-full md:w-auto"
              >
                <span>🪳</span> 开始吸引
              </Button>
            </div>
          </div>
        )}

        {isMagicianLibrary && activeTownTab === 'MAGICIAN_LIBRARY' && (
          <div className="space-y-6 animate-fade-in">
            <div className="bg-stone-900/40 p-4 rounded border border-stone-800">
              <p className="text-stone-400 text-sm">
                消耗异常水晶抽取异常样本，抽取有 20% 概率失稳。收集异常后即可进行召唤。
              </p>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="bg-stone-900/60 border border-stone-800 rounded p-4 space-y-3">
                <div className="text-stone-200 font-bold">水晶抽异常</div>
                <div className="space-y-3">
                  {(Object.keys(mineralMeta) as MineralId[]).map(id => {
                    const pool = anomalyPools[id] ?? [];
                    const available = getMineralAvailable(mineralInventory, id, 1);
                    return (
                      <div key={id} className="bg-stone-900 border border-stone-800 rounded p-3 space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="text-stone-200 font-semibold">{mineralMeta[id].name}</div>
                          <span className="text-xs text-stone-400">库存 {available}</span>
                        </div>
                        <div className="text-xs text-stone-500">{mineralMeta[id].effect}</div>
                        <div className="text-xs text-stone-500">异常池：{pool.length} 种</div>
                        <Button
                          onClick={() => handleDrawAnomaly(id)}
                          variant="secondary"
                          disabled={available < 1 || pool.length === 0}
                          className="w-full"
                        >
                          消耗 1 抽取
                        </Button>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="bg-stone-900/60 border border-stone-800 rounded p-4 space-y-3">
                <div className="text-stone-200 font-bold">异常召唤</div>
                {ownedAnomalies.length === 0 ? (
                  <div className="text-stone-500 text-sm">尚未收集到异常样本。</div>
                ) : (
                  <div className="space-y-3">
                    {ownedAnomalies.map(({ anomaly, count }) => {
                      if (!anomaly) return null;
                      const troop = getTroopTemplate(anomaly.troopId);
                      const canSummon = currentTroopCount < maxTroops;
                      const label = canSummon ? '召唤' : '队伍已满';
                      return (
                        <div key={anomaly.id} className="bg-stone-900 border border-stone-800 rounded p-3 space-y-2">
                          <div className="flex items-center justify-between">
                            <div className="text-stone-200 font-semibold">{anomaly.name}</div>
                            <span className="text-xs text-sky-300">T{anomaly.tier}</span>
                          </div>
                          <div className="text-xs text-stone-500">{anomaly.description}</div>
                          <div className="text-xs text-stone-400">异常样本：{count}</div>
                          <div className="text-xs text-stone-400">召唤兵种：{troop?.name ?? anomaly.troopId}</div>
                          <Button
                            onClick={() => handleAnomalySummon(anomaly)}
                            variant="secondary"
                            disabled={!canSummon}
                            className="w-full"
                          >
                            {label}
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {isRecompiler && activeTownTab === 'RECOMPILER' && (
          <div className="space-y-6 animate-fade-in">
            <div className="bg-stone-900/40 border border-stone-800 rounded p-4">
              <div className="text-stone-200 font-bold font-serif mb-2">万神殿 · 源码重塑塔</div>
              <p className="text-stone-400 text-sm">
                这里能消耗金钱与英雄水晶，将一名士兵重构为拥有独立意识的英雄。水晶位阶越高，英雄越强，谈吐越像“活人”。
              </p>
            </div>

            {(() => {
              const tiers = [
                { tier: 1, name: '混沌碎片', model: '1B-3B（小模型）', boost: 0.2, levelReq: 5, goldCost: 600 },
                { tier: 2, name: '逻辑原石', model: '7B（主流开源）', boost: 0.5, levelReq: 10, goldCost: 1200 },
                { tier: 3, name: '灵知晶体', model: '14B-32B（进阶）', boost: 1.0, levelReq: 15, goldCost: 2600 },
                { tier: 4, name: '虚空核心', model: '70B+（顶级开源）', boost: 2.0, levelReq: 20, goldCost: 5200 },
                { tier: 5, name: '奇点神格', model: 'GPT-4 / Claude 3（最强商业）', boost: 4.0, levelReq: 25, goldCost: 9800 }
              ] as const;
              const inv = (player.minerals as any)?.HERO_CRYSTAL ?? { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
              const selectedTier = tiers.find(t => t.tier === recompilerCrystalTier) ?? tiers[0];
              const canAffordGold = player.gold >= selectedTier.goldCost;
              const canAffordCrystal = (inv[selectedTier.tier] ?? 0) >= 1;
              const meetsLevel = player.level >= selectedTier.levelReq;
              const isReady = canAffordGold && canAffordCrystal && meetsLevel;

              return (
                <>
                  <div className="bg-stone-900/40 border border-stone-800 rounded p-4">
                    <div className="text-stone-200 font-bold mb-3">英雄水晶位阶</div>
                    <div className="grid grid-cols-1 md:grid-cols-5 gap-2">
                      {tiers.map(t => {
                        const available = inv[t.tier] ?? 0;
                        const active = recompilerCrystalTier === t.tier;
                        return (
                          <button
                            key={`tier_${t.tier}`}
                            onClick={() => {
                              setRecompilerCrystalTier(t.tier);
                              setRecompilerDraft(null);
                              setRecompilerNameDraft('');
                              setRecompilerError(null);
                            }}
                            className={`p-3 rounded border text-left ${active ? 'bg-fuchsia-950/30 border-fuchsia-900/70 text-fuchsia-200' : 'bg-stone-950/30 border-stone-800 text-stone-300 hover:bg-stone-950/50'}`}
                          >
                            <div className="font-bold">T{t.tier} · {t.name}</div>
                            <div className="text-[11px] text-stone-500 mt-1">模型：{t.model}</div>
                            <div className="text-[11px] text-stone-500">属性增幅：+{Math.round(t.boost * 100)}%</div>
                            <div className="text-[11px] text-stone-500">库存：{available}</div>
                          </button>
                        );
                      })}
                    </div>
                    <div className="text-sm text-stone-400 mt-3 space-y-1">
                      <div>当前选择：T{selectedTier.tier} · {selectedTier.name}（模型：{selectedTier.model}）</div>
                      <div>需求：玩家等级 ≥ {selectedTier.levelReq}，金钱 {selectedTier.goldCost}，英雄水晶T{selectedTier.tier} ×1</div>
                      <div className={isReady ? 'text-emerald-300' : 'text-amber-300'}>
                        {isReady ? '条件满足，可执行重塑。' : '条件未满足：请检查等级、金钱、或水晶库存。'}
                      </div>
                    </div>
                  </div>

                  <div className="bg-stone-900/40 border border-stone-800 rounded p-4">
                    <div className="text-stone-200 font-bold mb-3">可晋升士兵</div>
                    {player.troops.filter(t => t.count > 0).length === 0 ? (
                      <div className="text-stone-500 text-sm">你没有可用于重塑的士兵。</div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {player.troops.filter(t => t.count > 0).map(troopStack => {
                          const tmpl = getTroopTemplate(troopStack.id);
                          const race = getTroopRace({ id: troopStack.id, name: troopStack.name, doctrine: troopStack.doctrine, evangelist: troopStack.evangelist, race: troopStack.race as any });
                          const raceLabel = TROOP_RACE_LABELS[race] ?? race;
                          const selected = recompilerTroopId === troopStack.id;
                          return (
                            <button
                              key={`promotable_${troopStack.id}`}
                              onClick={() => {
                                setRecompilerTroopId(troopStack.id);
                                setRecompilerDraft(null);
                                setRecompilerNameDraft('');
                                setRecompilerError(null);
                              }}
                              className={`p-3 rounded border text-left ${selected ? 'bg-fuchsia-950/20 border-fuchsia-900/60' : 'bg-stone-950/30 border-stone-800 hover:bg-stone-950/50'}`}
                            >
                              <div className="flex items-center justify-between gap-3">
                                <div className="min-w-0">
                                  <div className="text-stone-200 font-semibold truncate">{troopStack.name}</div>
                                  <div className="text-xs text-stone-500 truncate">种族：{raceLabel} · Tier：{tmpl?.tier ?? troopStack.tier}</div>
                                </div>
                                <div className="text-sm text-stone-300">×{troopStack.count}</div>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {recompilerTroopId && (() => {
                    const troopStack = player.troops.find(t => t.id === recompilerTroopId) ?? null;
                    const tmpl = troopStack ? getTroopTemplate(troopStack.id) : undefined;
                    if (!troopStack || !tmpl) {
                      return (
                        <div className="bg-stone-900/40 border border-stone-800 rounded p-4">
                          <div className="text-stone-500 text-sm">选择的士兵不存在或缺少模板。</div>
                        </div>
                      );
                    }

                    const clampValue = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n));
                    const baseHeroAttributes = tmpl.attributes
                      ? {
                        attack: clampValue(Math.round(tmpl.attributes.attack / 5), 8, 30),
                        hp: clampValue(Math.round(tmpl.attributes.hp * 1.4), 60, 220),
                        agility: clampValue(Math.round(tmpl.attributes.agility / 5), 8, 30)
                      }
                      : { attack: 12, hp: 90, agility: 12 };
                    const boosted = {
                      attack: clampValue(Math.round(baseHeroAttributes.attack * (1 + selectedTier.boost)), 8, 180),
                      hp: clampValue(Math.round(baseHeroAttributes.hp * (1 + selectedTier.boost)), 60, 1200),
                      agility: clampValue(Math.round(baseHeroAttributes.agility * (1 + selectedTier.boost)), 8, 180)
                    };
                    const race = getTroopRace({ id: troopStack.id, name: troopStack.name, doctrine: troopStack.doctrine, evangelist: troopStack.evangelist, race: troopStack.race as any });
                    const historyItems = (player.fallenRecords ?? [])
                      .filter(r => r.unitName.includes(troopStack.name) && !r.unitName.includes('（英雄）'))
                      .slice(-10)
                      .map(r => `- Day ${r.day} · ${r.battleName} · ${r.cause}`);
                    const soldierHistory = historyItems.length > 0 ? historyItems.join('\n') : '（暂无同名战役记录）';

                    return (
                      <div className="bg-stone-900/40 border border-stone-800 rounded p-4 space-y-4">
                        <div className="flex items-start justify-between gap-4">
                          <div className="min-w-0">
                            <div className="text-stone-200 font-bold">重塑目标：{troopStack.name}</div>
                            <div className="text-sm text-stone-500 mt-1">预计英雄属性：攻{boosted.attack} / HP{boosted.hp} / 敏{boosted.agility}</div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="secondary"
                              disabled={isRecompilerLoading}
                              onClick={async () => {
                                if (!isReady) {
                                  setRecompilerError('条件未满足：请检查等级、金钱、或英雄水晶库存。');
                                  return;
                                }
                                setIsRecompilerLoading(true);
                                setRecompilerError(null);
                                setRecompilerDraft(null);
                                setRecompilerNameDraft('');
                                try {
                                  const aiConfig = buildAIConfig();
                                  const draft = await proposeHeroPromotion(
                                    {
                                      id: troopStack.id,
                                      name: troopStack.name,
                                      tier: tmpl.tier,
                                      description: tmpl.description || '',
                                      equipment: tmpl.equipment ?? [],
                                      attributes: tmpl.attributes ?? { attack: 0, defense: 0, agility: 0, hp: 0, range: 0, morale: 0 },
                                      race
                                    },
                                    selectedTier.tier,
                                    `${selectedTier.name} / ${selectedTier.model}`,
                                    playerRef.current,
                                    soldierHistory,
                                    aiConfig
                                  );
                                  setRecompilerDraft(draft);
                                  setRecompilerNameDraft(draft.name);
                                } catch (e: any) {
                                  setRecompilerError(String(e?.message ?? e ?? '生成失败'));
                                } finally {
                                  setIsRecompilerLoading(false);
                                }
                              }}
                            >
                              {isRecompilerLoading ? '…' : '生成灵魂'}
                            </Button>
                            <Button
                              variant="secondary"
                              onClick={() => {
                                setRecompilerTroopId(null);
                                setRecompilerDraft(null);
                                setRecompilerNameDraft('');
                                setRecompilerError(null);
                              }}
                            >
                              取消
                            </Button>
                          </div>
                        </div>

                        {recompilerError && (
                          <div className="bg-red-950/20 border border-red-900/40 rounded p-3 text-red-200 text-sm">
                            {recompilerError}
                          </div>
                        )}

                        <div className="bg-stone-950/30 border border-stone-800 rounded p-3">
                          <div className="text-stone-200 font-bold mb-2">士兵经历</div>
                          <pre className="text-xs text-stone-400 whitespace-pre-wrap">{soldierHistory}</pre>
                        </div>

                        {recompilerDraft && (
                          <div className="space-y-3">
                            <div className="bg-stone-950/30 border border-stone-800 rounded p-3 space-y-2">
                              <div className="text-stone-200 font-bold">新英雄档案</div>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                <div>
                                  <div className="text-xs text-stone-500 mb-1">名字（可改）</div>
                                  <input
                                    value={recompilerNameDraft}
                                    onChange={e => setRecompilerNameDraft(e.target.value)}
                                    className="w-full bg-stone-950 border border-stone-700 text-stone-200 px-3 py-2 rounded placeholder:text-stone-600"
                                  />
                                </div>
                                <div>
                                  <div className="text-xs text-stone-500 mb-1">称号</div>
                                  <div className="text-stone-200 px-3 py-2 bg-stone-950/40 border border-stone-800 rounded">{recompilerDraft.title}</div>
                                </div>
                              </div>
                              <div className="text-sm text-stone-400">职业：{recompilerDraft.role} · 外观：{recompilerDraft.portrait}</div>
                              <div className="text-sm text-stone-400">性格：{recompilerDraft.personality}</div>
                              <div className="text-sm text-stone-400 whitespace-pre-wrap">经历：{recompilerDraft.background}</div>
                              <div className="text-sm text-stone-400">特质：{recompilerDraft.traits.join('、')}</div>
                              <div className="text-sm text-stone-400">台词：{recompilerDraft.quotes.join(' / ')}</div>
                            </div>

                            <div className="flex items-center justify-end">
                              <Button
                                variant={isReady ? 'gold' : 'secondary'}
                                disabled={!isReady || isRecompilerLoading}
                                onClick={() => {
                                  if (!isReady) return;
                                  const name = recompilerNameDraft.trim() || recompilerDraft.name.trim() || troopStack.name;
                                  const heroId = `promoted_${race.toLowerCase()}_${Date.now()}`;

                                  const ratio = troopStack.count > 0 ? (troopStack.count - 1) / troopStack.count : 0;
                                  const nextXp = Math.max(0, Math.floor((troopStack.xp ?? 0) * ratio));
                                  const nextTroops = playerRef.current.troops
                                    .map(t => t.id === troopStack.id ? ({ ...t, count: t.count - 1, xp: nextXp }) : t)
                                    .filter(t => t.count > 0);

                                  const nextMinerals = { ...(playerRef.current.minerals as any) };
                                  const tierKey = selectedTier.tier as any;
                                  nextMinerals.HERO_CRYSTAL = { ...(nextMinerals.HERO_CRYSTAL ?? { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }) };
                                  nextMinerals.HERO_CRYSTAL[tierKey] = Math.max(0, (nextMinerals.HERO_CRYSTAL[tierKey] ?? 0) - 1);

                                  setPlayer(prev => ({
                                    ...prev,
                                    gold: prev.gold - selectedTier.goldCost,
                                    troops: nextTroops,
                                    minerals: nextMinerals
                                  }));

                                  setHeroes(prev => ([
                                    ...prev,
                                    {
                                      id: heroId,
                                      name,
                                      title: recompilerDraft.title,
                                      role: recompilerDraft.role,
                                      race: (race !== 'UNKNOWN' ? race : undefined) as any,
                                      personality: recompilerDraft.personality,
                                      background: recompilerDraft.background,
                                      traits: recompilerDraft.traits,
                                      quotes: recompilerDraft.quotes,
                                      portrait: recompilerDraft.portrait,
                                      profile: recompilerDraft.profile,
                                      level: 0,
                                      xp: 0,
                                      maxXp: 100,
                                      attributePoints: 0,
                                      attributes: boosted,
                                      currentHp: boosted.hp,
                                      maxHp: boosted.hp,
                                      status: 'ACTIVE',
                                      recruited: true,
                                      joinedDay: playerRef.current.day,
                                      locationId: undefined,
                                      permanentMemory: [],
                                      chatMemory: [],
                                      chatRounds: 0,
                                      currentExpression: 'IDLE'
                                    }
                                  ]));

                                  addLog(`你在源码重塑塔消耗 ${selectedTier.goldCost} 金钱与英雄水晶T${selectedTier.tier}，将 ${troopStack.name} 重构为英雄「${name}」。`);
                                  setRecompilerDraft(null);
                                  setRecompilerNameDraft('');
                                  setRecompilerTroopId(null);
                                }}
                              >
                                确认晋升（{selectedTier.goldCost} + 水晶T{selectedTier.tier}）
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </>
              );
            })()}
          </div>
        )}

        {isAltar && activeTownTab === 'ALTAR' && (
          <div className="space-y-6 animate-fade-in">
            <div className="bg-stone-900/40 p-4 rounded border border-stone-800">
              <p className="text-stone-400 text-sm">
                祭坛深处的神秘人等待你的宗教名字与教义。对话会实时更新兵种草案，满意后再确立教义。
              </p>
            </div>

            <div className="bg-stone-950/60 border border-purple-900/40 rounded p-6 overflow-hidden relative">
              <div
                className="absolute inset-0 opacity-60"
                style={{ background: 'radial-gradient(circle at center, rgba(192, 132, 252, 0.18), rgba(15, 23, 42, 0.05) 55%, rgba(15, 23, 42, 0.2) 100%)' }}
              />
              <div className="relative flex flex-col items-center justify-center gap-4">
                <svg width={220} height={220} viewBox="0 0 220 220" className="text-purple-300">
                  <circle cx="110" cy="110" r="92" fill="none" stroke="rgba(192, 132, 252, 0.4)" strokeWidth="2" />
                  <circle cx="110" cy="110" r="68" fill="none" stroke="rgba(192, 132, 252, 0.25)" strokeWidth="2" />
                  <polygon points="110,30 182,72 182,148 110,190 38,148 38,72" fill="none" stroke="rgba(226, 232, 240, 0.25)" strokeWidth="1.5" />
                  <polygon points="110,48 164,80 164,140 110,172 56,140 56,80" fill="none" stroke="rgba(192, 132, 252, 0.2)" strokeWidth="1" />
                  <circle cx="110" cy="110" r="8" fill="rgba(192, 132, 252, 0.65)" />
                </svg>
                <div className="flex flex-col items-center">
                  <div className="w-44 h-8 rounded-full bg-stone-900/80 border border-purple-900/50 shadow-[0_0_25px_rgba(192,132,252,0.2)]" />
                  <div className="w-24 h-10 -mt-3 rounded-b-full bg-stone-900/90 border border-purple-900/40" />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <div className="bg-stone-900/60 border border-stone-800 rounded p-4 space-y-4 lg:col-span-2">
                <div className="text-stone-200 font-bold">神秘人</div>
                <div
                  ref={altarChatListRef}
                  className="bg-gradient-to-b from-stone-950/40 to-stone-900/40 p-4 rounded border border-stone-800 max-h-80 overflow-y-auto scrollbar-hide space-y-2"
                >
                  {altarDialogue.length === 0 && (
                    <div className="text-stone-500 text-sm">黑纱之下没有回应。</div>
                  )}
                  {altarDialogue.map((line, index) => (
                    <div key={index} className={`flex ${line.role === 'PLAYER' ? 'justify-end' : 'justify-start'} log-slide-in`}>
                      <div
                        className={[
                          'max-w-[85%] md:max-w-[70%] px-3 py-2 rounded-2xl border shadow',
                          line.role === 'PLAYER'
                            ? 'bg-stone-800 border-stone-700 text-stone-200 rounded-br-sm'
                            : 'bg-purple-950/30 border-purple-900/40 text-purple-200 rounded-bl-sm'
                        ].join(' ')}
                      >
                        <div className="text-[10px] tracking-wider uppercase opacity-70 mb-1">
                          {line.role === 'PLAYER' ? '你' : '神秘人'}
                        </div>
                        <div className="text-sm leading-relaxed whitespace-pre-wrap">{line.text}</div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="bg-stone-950/40 border border-stone-800 rounded p-3 text-sm text-stone-400 space-y-1">
                  <div>宗教名字：{altarDraft.religionName.trim() || '未命名'}</div>
                  <div>权柄：{altarDraft.domain.trim() || '未说明'}</div>
                  <div>散播方式：{altarDraft.spread.trim() || '未说明'}</div>
                  <div>禁忌祝福：{altarDraft.blessing.trim() || '未说明'}</div>
                </div>

                <div className="flex flex-col md:flex-row gap-3">
                  <input
                    value={altarChatInput}
                    onChange={(e) => setAltarChatInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleAltarChatSend();
                    }}
                    className="flex-1 bg-stone-950 border border-stone-700 text-stone-200 px-3 py-2 rounded placeholder:text-stone-600"
                    placeholder="与神秘人对话，描述宗教名字、权柄、散播方式、禁忌祝福"
                  />
                  <Button
                    onClick={handleAltarChatSend}
                    variant="secondary"
                    disabled={isAltarLoading || !altarChatInput.trim()}
                  >
                    发送
                  </Button>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <Button
                    onClick={applyAltarProposal}
                    variant={altarHasTree ? 'danger' : 'secondary'}
                    disabled={isAltarLoading || !altarProposal}
                  >
                    {altarHasTree ? '重构教义（300）' : '确立教义'}
                  </Button>
                </div>
              </div>

              <div className="bg-stone-900/60 border border-stone-800 rounded p-4 space-y-4">
                <div className="text-stone-200 font-bold">教义草案</div>
                {!altarProposal ? (
                  <div className="text-stone-500 text-sm">尚无草案。</div>
                ) : (
                  <div className="space-y-2 text-sm text-stone-400">
                      <div className={`${doctrineSummaryChanged ? 'text-amber-300' : 'text-stone-300'} whitespace-pre-wrap`}>
                        {altarProposal.result.doctrineSummary || '神秘人正在权衡。'}
                      </div>
                      <div className="text-[11px] text-stone-500">变动高亮</div>
                      <div className="space-y-2">
                        {(altarProposal.result.troops ?? []).map((troop, index) => {
                          const prevTroop = findPrevTroop(index);
                          const diff = getTroopDiff(troop, prevTroop);
                          const nameClass = diff.name ? 'text-amber-300' : 'text-stone-200';
                          const powerClass = diff.basePower ? 'text-amber-300' : 'text-stone-500';
                          const xpClass = diff.maxXp ? 'text-amber-300' : 'text-stone-500';
                          const costClass = diff.upgradeCost ? 'text-amber-300' : 'text-stone-500';
                          const descClass = diff.description ? 'text-amber-300' : 'text-stone-500';
                          const equipClass = diff.equipment ? 'text-amber-300' : 'text-stone-500';
                          const attrClass = diff.attributes ? 'text-amber-300' : 'text-stone-500';
                          return (
                            <div key={`${troop.name ?? 'troop'}_${index}`} className="border border-stone-800 rounded p-3 bg-stone-950/40">
                              <div className="flex flex-wrap gap-3">
                                <div className="flex-1 space-y-1">
                                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
                                    <span className="text-stone-500">Tier {troop.tier ?? index + 1}</span>
                                    <span className={nameClass}>{troop.name ?? '无名信徒'}</span>
                                    <span className={powerClass}>战力 {troop.basePower ?? 0}</span>
                                    <span className={xpClass}>经验 {troop.maxXp ?? 0}</span>
                                    <span className={costClass}>升级 {troop.upgradeCost ?? 0}</span>
                                  </div>
                                  <div className={`text-[11px] ${attrClass}`}>{formatAttributes(troop.attributes)}</div>
                                  <div className={`text-[11px] ${equipClass}`}>装备：{(troop.equipment ?? []).join('、') || '无'}</div>
                                  <div className={`text-[11px] ${descClass}`}>{troop.description || '沉默的信徒。'}</div>
                                </div>
                                <div className="shrink-0 bg-stone-950/40 border border-stone-800 rounded p-2">
                                  {renderAltarRadar(troop.attributes)}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
              </div>
            </div>
          </div>
        )}

        {isAltar && activeTownTab === 'ALTAR_RECRUIT' && (
          <div className="space-y-6 animate-fade-in">
            <div className="bg-stone-900/40 p-4 rounded border border-stone-800">
              <p className="text-stone-400 text-sm">
                传教会以天数累积教徒，招募成功率受祭坛影响。兵种树来自已确立的教义。
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <div className="bg-stone-900/60 border border-stone-800 rounded p-4 space-y-3 lg:col-span-2">
                <div className="text-stone-200 font-bold">兵种树</div>
                {(altarState?.troopIds ?? []).length === 0 ? (
                  <div className="text-stone-500 text-sm">尚未生成兵种树。</div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {(altarState?.troopIds ?? []).map(id => {
                      const template = getTroopTemplate(id);
                      return (
                        <div key={id} className="border border-stone-800 rounded p-3 bg-stone-950/40 flex flex-wrap gap-3">
                          <div className="flex-1 space-y-1">
                            <div className="text-stone-200 text-sm font-semibold">{template?.name ?? id}</div>
                            <div className="text-xs text-stone-500">Tier {template?.tier ?? 1}</div>
                            <div className="text-[11px] text-stone-500">{template?.description ?? '暂无描述'}</div>
                            <div className="text-[11px] text-stone-500">装备：{template?.equipment?.join('、') || '无'}</div>
                          </div>
                          <div className="shrink-0 bg-stone-950/40 border border-stone-800 rounded p-2">
                            {renderAltarRadar(template?.attributes, '#7c3aed')}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="bg-stone-900/60 border border-stone-800 rounded p-4 space-y-4">
                <div className="text-stone-200 font-bold">传教招募</div>
                <div className="flex flex-wrap items-center gap-3">
                  <span className="text-stone-300">天数</span>
                  <input
                    type="number"
                    min={1}
                    max={20}
                    value={altarRecruitDays}
                    onChange={(e) => setAltarRecruitDays(Math.max(1, Math.min(20, Number(e.target.value) || 1)))}
                    className="w-20 bg-stone-800 border border-stone-700 text-stone-200 px-2 py-1 rounded"
                    disabled={isAltarRecruiting}
                  />
                  <div className="text-stone-500 text-sm">预计收获总数：{altarRecruitDays * 1} - {altarRecruitDays * 3}</div>
                </div>
                {isAltarRecruiting && (
                  <div className="text-xs text-purple-300">
                    传教进行中：第 {altarRecruitState?.daysPassed ?? 0} / {altarRecruitState?.totalDays ?? altarRecruitDays} 天
                  </div>
                )}
                <Button
                  onClick={handleStartAltarRecruit}
                  variant="secondary"
                  disabled={isAltarRecruiting || !!workState?.isActive || !!miningState?.isActive || !!roachLureState?.isActive || currentTroopCount >= maxTroops}
                  className="flex items-center gap-2 w-full"
                >
                  <Star size={16} /> 开始传教
                </Button>

                <div className="border-t border-stone-800 pt-3 space-y-2">
                  <div className="text-stone-200 font-bold">信徒统计</div>
                  <div className="text-sm text-stone-400 space-y-1">
                    <div>总数：{believerStats.total}</div>
                    <div>Tier1：{believerStats.byTier[1]} · Tier2：{believerStats.byTier[2]}</div>
                    <div>Tier3：{believerStats.byTier[3]} · Tier4：{believerStats.byTier[4]} · Tier5：{believerStats.byTier[5]}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {isBlacksmith && activeTownTab === 'FORGE' && (
          <div className="space-y-6 animate-fade-in">
            <div className="bg-stone-900/40 p-4 rounded border border-stone-800">
              <p className="text-stone-400 text-sm">
                铁匠铺可用矿石为部队附魔词条，词条会提高纸面战力并影响战报。
              </p>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <div className="bg-stone-900/60 border border-stone-800 rounded p-4 space-y-3">
                <div className="text-stone-200 font-bold">选择部队</div>
                {player.troops.length === 0 ? (
                  <div className="text-stone-500 text-sm">暂无可附魔部队。</div>
                ) : (
                  <div className="space-y-2 max-h-80 overflow-y-auto scrollbar-hide">
                    {player.troops.map((troop, index) => (
                      <button
                        key={`${troop.id}_${index}`}
                        onClick={() => setForgeTroopIndex(index)}
                        className={`w-full text-left border rounded p-2 ${forgeTroopIndex === index ? 'border-amber-500 bg-stone-900' : 'border-stone-800 bg-stone-950/40'}`}
                      >
                        <div className="text-stone-200 text-sm font-semibold">{troop.name} × {troop.count}</div>
                        <div className="text-xs text-stone-500">{troop.equipment.join('、')}</div>
                        {troop.enchantments && troop.enchantments.length > 0 && (
                          <div className="text-[11px] text-fuchsia-300">词条：{troop.enchantments.map(e => e.name).join('、')}</div>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="bg-stone-900/60 border border-stone-800 rounded p-4 space-y-3 lg:col-span-2">
                <div className="text-stone-200 font-bold">词条列表</div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {enchantmentRecipes.map(recipe => {
                    const costText = recipe.costs.map(cost => {
                      const name = mineralMeta[cost.mineralId].name;
                      const purityLabel = mineralPurityLabels[cost.purityMin];
                      return `${purityLabel}${name} x${cost.amount}`;
                    }).join(' + ');
                    const available = recipe.costs.every(cost => getMineralAvailable(mineralInventory, cost.mineralId, cost.purityMin) >= cost.amount);
                    const selected = forgeEnchantmentId === recipe.enchantment.id;
                    return (
                      <button
                        key={recipe.enchantment.id}
                        onClick={() => setForgeEnchantmentId(recipe.enchantment.id)}
                        className={`text-left border rounded p-3 space-y-2 ${selected ? 'border-amber-500 bg-stone-900' : 'border-stone-800 bg-stone-950/40'}`}
                      >
                        <div className="text-stone-200 font-semibold">{recipe.enchantment.name}</div>
                        <div className="text-xs text-stone-500">{recipe.enchantment.category} · +{Math.round(recipe.enchantment.powerBonus * 100)}% 战力</div>
                        <div className="text-xs text-stone-400">{recipe.enchantment.description}</div>
                        <div className={`text-xs ${available ? 'text-emerald-400' : 'text-red-400'}`}>消耗：{costText}</div>
                      </button>
                    );
                  })}
                </div>
                <div className="flex items-center justify-between pt-2">
                  <div className="text-xs text-stone-500">可用矿石会优先消耗高纯度库存。</div>
                  <Button onClick={handleForge} variant="secondary" className="flex items-center gap-2">
                    <Hammer size={16} /> 执行附魔
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTownTab === 'GARRISON' && (
          <div className="space-y-6 animate-fade-in">
            {visibleStayParties.length === 0 && (
              <div className="text-center py-12 border border-dashed border-stone-800 rounded">
                <p className="text-stone-500 italic">暂无停留部队。</p>
              </div>
            )}
            {visibleStayParties.map(party => (
              <div key={party.id} className="bg-stone-900/40 border border-stone-800 rounded p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="text-stone-200 font-bold flex items-center gap-2">
                    <Users size={16} className="text-amber-500" />
                    <span>{party.name}</span>
                  </div>
                  <div className="text-stone-400 text-sm flex items-center gap-3">
                    <span>归属 {getStayPartyOwnerLabel(party)}</span>
                    <span>总人数 {getPartyCount(party.troops)}</span>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {party.troops.map(troop => (
                    <TroopCard
                      key={`${party.id}-${troop.id}`}
                      troop={troop}
                      count={troop.count}
                      countLabel="数量"
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
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
                {buildingOptions.filter(b => b.type !== 'HOUSING' && b.type !== 'SHRINE' && b.type !== 'ORE_REFINERY' && b.type !== 'CAMOUFLAGE_STRUCTURE').map(building => {
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
                {lordDialogue.length === 0 ? (
                  <div className="text-stone-500">领主暂未表态。</div>
                ) : (
                  lordDialogue.map((line, idx) => (
                    <div key={idx} className={`flex ${line.role === 'PLAYER' ? 'justify-end' : 'justify-start'}`}>
                      <div className={`px-3 py-2 rounded border text-sm ${line.role === 'PLAYER' ? 'bg-amber-900/30 border-amber-800/60 text-amber-200' : 'bg-stone-950/40 border-stone-800 text-stone-200'}`}>
                        {line.text}
                      </div>
                    </div>
                  ))
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
