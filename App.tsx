
import React, { useState, useEffect, useRef } from 'react';
import { AIProvider, AltarDoctrine, AltarTroopDraft, SoldierInstance, Troop, PlayerState, WoundedTroopEntry, GameView, Location, EnemyForce, BattleResult, BattleBrief, TroopTier, TerrainType, BattleRound, PlayerAttributes, RecruitOffer, Parrot, ParrotVariant, FallenRecord, FallenHeroRecord, BuildingType, SiegeEngineType, ConstructionQueueItem, SiegeEngineQueueItem, Hero, HeroChatLine, HeroPermanentMemory, PartyDiaryEntry, WorldBattleReport, MineralId, MineralPurity, Enchantment, StayParty, LordFocus, RaceId, TroopRace, Lord, NegotiationResult, WorldDiplomacyState, WorkContract } from './types';
import { BUILDING_OPTIONS, ENCHANTMENT_RECIPES, ENDING_LIST, FACTIONS, getBuildingName, getSiegeEngineName, getEndingContent, getNewCovenantAvailable, HIDEOUT_GOV_EVENTS, INITIAL_PLAYER_STATE, INITIAL_HERO_ROSTER, LOCATIONS, ENEMY_TYPES, SIEGE_ENGINE_COMBAT_STATS, SIEGE_ENGINE_OPTIONS, TROOP_TEMPLATES, createTroop, MAP_WIDTH, MAP_HEIGHT, MINE_CONFIGS, MINERAL_META, MINERAL_PURITY_LABELS, PARROT_VARIANTS, ENEMY_QUOTES, parrotMischiefEvents, parrotChatter, IMPOSTER_TROOP_IDS, WORLD_BOOK, RACE_LABELS, getTroopRace, TROOP_RACE_LABELS } from './game/data';
import { AltarTroopTreeResult, buildBattlePrompt, buildHeroChatPrompt, chatHeroChatter, chatWithAuthor, chatWithHero, chatWithUndead, generateWorldNewspaper, listOpenAIModels, proposeShapedTroop, resolveNegotiation, ShaperDecision } from './services/geminiService';
import { buildUpdatedProfiles, buildAIConfigFromSettings, createNextAIProfile, loadAISettingsFromStorage, persistAISettingsToStorage, selectAIProfileState } from './app/providers/ai-settings';
import { AUTO_SAVE_ID, readSaveIndex, SAVE_DATA_PREFIX, SAVE_SELECTED_KEY, type SaveSlotMeta, writeSaveIndex } from './app/save-load/storage';
import { applyGarrisonTraining, applyWorldDiplomacyDelta, buildBanditTroops, buildImposterTroops, buildInitialWorld, buildInitialWorldDiplomacy, buildRandomizedHeroes, buildSupportTroops, buildWorkContractsForCity, canHeroBattle, clampRelation, clampValue, computePreachPlan, ensureEnemyHeroTroops, ensureLocationLords, findLocationAtPosition, getBattleTroops, getCityReligionTierCap, getDefaultGarrisonBaseLimit, getEncounterChance, getEnemyRace, getFactionLocations, getGarrisonCount, getGarrisonLimit, getHeroRoleLabel, getHpRatio, getLocationDefenseDetails, getLocationRace, buildGarrisonTroops as buildGarrisonTroopsImpl, getDefenderTroops as getDefenderTroopsImpl, getLocationRecruitId, getLocationRelationTarget, getPlayerReligion as getPlayerReligionFromLocations, getRecruitmentPool, getRelationScale, getRelationTone, getRelationValue, getTroopCount, getWorldFactionRelation, getWorldFactionRaceRelation, getWorldRaceRelation, getXenoAcceptanceScore, isCastleLikeLocation, isUndeadFortressLocation, mergeTroops, normalizeRelationMatrix, normalizeWorldDiplomacy, pickImposterTarget, PRESTIGE, computeSealHabitatPrestige, processBanditSpawn, processCaravanMovement, processCaravanSpawn, processSealHabitatDaily, randomInt, rollBinomial, rollMineralPurity, seedStayParties, splitTroops, syncLordPresence, buildTroopsFromSoldiers as buildTroopsFromSoldiersImpl, buildWoundedEntriesFromSoldiers as buildWoundedEntriesFromSoldiersImpl, normalizePlayerSoldiers as normalizePlayerSoldiersImpl, markSoldiersWounded as markSoldiersWoundedImpl, removeSoldiersById as removeSoldiersByIdImpl, buildRaceComposition } from './game/systems';
import { calculatePower } from './game/systems/combatPower';
import { calculateXpGain } from './game/systems/xpGain';
import { calculateFleeChance, calculateRearGuardPlan } from './features/battle/model/battleEscape';
import { DEFAULT_BATTLE_LAYERS, getDefaultLayerId } from './features/battle/model/battleLayers';
import { applyMemoryEdits, applyPartyDiaryEdits, normalizeDiaryEdits, normalizeHeroChat, normalizeHeroEmotion, normalizeHeroMemory, normalizeMemoryEdits, normalizePartyDiary, splitHeroReply } from './features/hero/model/heroChatUtils';
import { collectWorldTroops as collectWorldTroopsFromWorld, getBelieverStats as getBelieverStatsFromWorld } from './features/world-board/model/worldStats';
import { runBattlePipeline } from './features/battle/model/battlePipeline';
import { calculateLocalBattleRewards, computeBattleSettlement, computeTrainingXpRewards } from './features/battle/model/battleSettlement';
import { appendDefenseAidTroops, BattleEngagementMeta, describeBattleLocationText } from './features/battle/model/battleRuntime';
import { resolveBattleProgrammatic as resolveBattleProgrammaticFn } from './features/battle/model/resolveBattleProgrammatic';
import type { AltarRecruitState, HideoutStayState, MiningState, RoachLureState, TownTab, WorkState } from './features/town/model/types';
import { Button } from './components/Button';
import { BattleView, BattleResultView } from './features/battle';
import { ChangelogModal } from './components/ChangelogModal';
import { SettingsModal } from './components/SettingsModal';
import { MapListModal } from './components/MapListModal';
import { WorldTroopStatsModal } from './components/WorldTroopStatsModal';
import { CHANGELOG } from './data/changelog';
import { AppHeader } from './app/ui/AppHeader';
import { AppMainContent } from './app/ui/AppMainContent';
import { BattleSimulationOverlay } from './app/ui/BattleSimulationOverlay';
import { DecisionOverlay } from './app/ui/DecisionOverlay';
import { LogConsole } from './app/ui/LogConsole';
import { WorldBoardScreen } from './features/world-board';
import { RelationsView } from './features/relations';
import { parseObserverTargets } from './features/observer-mode/utils/parseTargets';
import { ObserverNavBar } from './features/observer-mode/ui/ObserverNavBar';
import { ObserverLocationModal, ObserverSiegeModal } from './features/observer-mode';
import { ObserverNewspaperModal } from './features/observer-mode/ui/ObserverNewspaperModal';
import { TroopArchiveView } from './views/TroopArchiveView';
import { PartyView } from './views/PartyView';
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
  Syringe, Brain, Beer, Bird, ShoppingBag, MessageCircle, Utensils, EyeOff, Bomb, Info, Settings, Hammer, Coffee, Star, History, Lock, Activity
} from 'lucide-react';

// Helper for XP calculation to avoid duplication and state race conditions
type NegotiationState = {
  status: 'idle' | 'loading' | 'result';
  result: NegotiationResult | null;
  locked: boolean;
};
type NegotiationLine = { role: 'PLAYER' | 'ENEMY'; text: string };

export default function App() {
  const initialWorld = React.useMemo(() => buildInitialWorld(), []);
  const [player, setPlayer] = useState<PlayerState>(INITIAL_PLAYER_STATE);
  const [heroes, setHeroes] = useState<Hero[]>(() => buildRandomizedHeroes());
  const [locations, setLocations] = useState<Location[]>(() => initialWorld.locations.map(l => l.type === 'CITY' ? { ...l, workBoard: { lastRefreshDay: INITIAL_PLAYER_STATE.day, contracts: buildWorkContractsForCity(l, INITIAL_PLAYER_STATE.day) } } : l));
  const [lords, setLords] = useState<Lord[]>(() => initialWorld.lords);
  const [view, setView] = useState<GameView>('MAIN_MENU');
  const [endingReturnView, setEndingReturnView] = useState<GameView>('GAME_OVER');
  const [portalEndingChoiceMade, setPortalEndingChoiceMade] = useState(false);
  const [pendingDecisions, setPendingDecisions] = useState<Array<{
    id: string;
    kind: 'CITY_RELIGION' | 'HIDEOUT_GOV';
    locationId: string;
    day: number;
    title: string;
    description: string;
    baseDelta?: number;
    payload?: any;
  }>>([]);
  const [decisionHeroId, setDecisionHeroId] = useState<string>('');
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
  const [townTab, setTownTab] = useState<TownTab>('RECRUIT');
  const [hideoutInspectLayerIndex, setHideoutInspectLayerIndex] = useState(0);
  const [workDays, setWorkDays] = useState(1);
  const [miningDays, setMiningDays] = useState(2);
  const [roachLureDays, setRoachLureDays] = useState(2);
  const [hideoutStayDays, setHideoutStayDays] = useState(3);
  const [miningState, setMiningState] = useState<MiningState | null>(null);
  const [roachLureState, setRoachLureState] = useState<RoachLureState | null>(null);
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
    troopForPrompt?: Pick<Troop, 'name' | 'race' | 'tier' | 'basePower' | 'maxXp' | 'upgradeCost' | 'upgradeTargetId' | 'description' | 'equipment' | 'attributes'>;
  } | null>(null);
  const [isShaperLoading, setIsShaperLoading] = useState(false);
  const [altarDialogues, setAltarDialogues] = useState<Record<string, { role: 'PLAYER' | 'NPC'; text: string }[]>>({});
  const [altarDrafts, setAltarDrafts] = useState<Record<string, AltarDoctrine>>({});
  const [altarProposals, setAltarProposals] = useState<Record<string, { doctrine: AltarDoctrine; result: AltarTroopTreeResult; prevResult?: AltarTroopTreeResult }>>({});
  const [isAltarLoading, setIsAltarLoading] = useState(false);
  const [altarRecruitDays, setAltarRecruitDays] = useState(2);
  const [altarRecruitState, setAltarRecruitState] = useState<AltarRecruitState | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [openAIBaseUrl, setOpenAIBaseUrl] = useState('https://api.openai.com');
  const [openAIKey, setOpenAIKey] = useState('');
  const [openAIModel, setOpenAIModel] = useState('');
  const [aiProvider, setAIProvider] = useState<AIProvider>('CUSTOM');
  const [doubaoApiKey, setDoubaoApiKey] = useState('');
  const [geminiApiKey, setGeminiApiKey] = useState('');
  const [openAIProfiles, setOpenAIProfiles] = useState<{ id: string; name: string; baseUrl: string; key: string; model: string }[]>([]);
  const [activeOpenAIProfileId, setActiveOpenAIProfileId] = useState<string | null>(null);
  const [heroChatterEnabled, setHeroChatterEnabled] = useState(false);
  const [heroChatterMinMinutes, setHeroChatterMinMinutes] = useState(6);
  const [heroChatterMaxMinutes, setHeroChatterMaxMinutes] = useState(12);
  const [openAIProfileName, setOpenAIProfileName] = useState('默认');
  const [openAIModels, setOpenAIModels] = useState<string[]>([]);
  const [isModelsLoading, setIsModelsLoading] = useState(false);
  const [battleStreamEnabled, setBattleStreamEnabled] = useState(false);
  const [battleResolutionMode, setBattleResolutionMode] = useState<'AI' | 'PROGRAM'>('AI');
  const [settingsError, setSettingsError] = useState<string | null>(null);
  const [saveDataText, setSaveDataText] = useState('');
  const [saveDataNotice, setSaveDataNotice] = useState<string | null>(null);
  const [manualSaveName, setManualSaveName] = useState('');
  const [battleError, setBattleError] = useState<string | null>(null);
  const [battleMeta, setBattleMeta] = useState<BattleEngagementMeta | null>(null);
  const [pendingBattleMeta, setPendingBattleMeta] = useState<BattleEngagementMeta | null>(null);
  const [pendingBattleIsTraining, setPendingBattleIsTraining] = useState(false);
  const [isBattleStreaming, setIsBattleStreaming] = useState(false);
  const [isBattleResultFinal, setIsBattleResultFinal] = useState(true);
  const [isChangelogOpen, setIsChangelogOpen] = useState(false);
  const [isMapListOpen, setIsMapListOpen] = useState(false);
  const [observerTargets, setObserverTargets] = useState<Array<{ locationId: string; types: string[] }>>([]);
  const [observerLocationModal, setObserverLocationModal] = useState<Location | null>(null);
  const [observerLordDialogue, setObserverLordDialogue] = useState<Record<string, Array<{ role: 'player' | 'lord'; text: string }>>>({});
  const [observerSiegeModal, setObserverSiegeModal] = useState<{
    loc: Location;
    siege: NonNullable<Location['activeSiege']>;
    attackerName: string;
    attackerTroops: Troop[];
    defenderName: string;
    defenderTroops: Troop[];
    onResolve: (outcome: 'attacker' | 'defender') => void;
  } | null>(null);
  const [observerCurrentAction, setObserverCurrentAction] = useState<{ locationId: string; locationName: string; actionType: string; factionName: string } | null>(null);
  const [isObserverNewspaperOpen, setIsObserverNewspaperOpen] = useState(false);
  const [isObserverRelationsOpen, setIsObserverRelationsOpen] = useState(false);
  const [mapListQuery, setMapListQuery] = useState('');
  const [mapListTypeFilter, setMapListTypeFilter] = useState<Location['type'] | 'ALL' | 'MINE'>('ALL');
  const [isWorldTroopStatsOpen, setIsWorldTroopStatsOpen] = useState(false);
  const [worldTroopRaceFilter, setWorldTroopRaceFilter] = useState<TroopRace | 'ALL'>('ALL');
  const [worldTroopTierFilter, setWorldTroopTierFilter] = useState<TroopTier | 'ALL'>('ALL');
  const [worldTroopIdFilter, setWorldTroopIdFilter] = useState('ALL');
  const [troopArchiveQuery, setTroopArchiveQuery] = useState('');
  const [troopArchiveFactionFilter, setTroopArchiveFactionFilter] = useState<'ALL' | 'HUMAN' | 'ROACH' | 'IMPOSTER' | 'ASYLUM' | 'UNDEAD' | 'HOTPOT' | 'GOBLIN' | 'CUSTOM'>('ALL');
  const [troopArchiveTierFilter, setTroopArchiveTierFilter] = useState<TroopTier | 'ALL'>('ALL');
  const [troopArchiveCategoryFilter, setTroopArchiveCategoryFilter] = useState<'ALL' | 'NORMAL' | 'HEAVY'>('ALL');
  const [troopArchiveSort, setTroopArchiveSort] = useState<'TIER' | 'NAME' | 'TOTAL' | 'ATTACK' | 'DEFENSE' | 'AGILITY' | 'HP' | 'RANGE' | 'MORALE'>('TIER');
  const [troopArchivePage, setTroopArchivePage] = useState(1);
  const [troopArchivePageSize, setTroopArchivePageSize] = useState(12);
  const [partyCategoryFilter, setPartyCategoryFilter] = useState<'ALL' | 'NORMAL' | 'HEAVY'>('ALL');
  const [heroDialogue, setHeroDialogue] = useState<{ heroId: string; text: string } | null>(null);

  useEffect(() => {
    setPlayer(prev => {
      const story = prev.story ?? {};
      if (story.outsiderHeroId && story.outsiderCluePack) return prev;
      const candidates = (heroes ?? []).filter(h => h && h.status !== 'DEAD').map(h => h.id);
      if (candidates.length === 0) return prev;
      const outsiderHeroId = candidates[Math.floor(Math.random() * candidates.length)];
      const packs = ['A', 'B', 'C', 'D'];
      const outsiderCluePack = packs[Math.floor(Math.random() * packs.length)];
      return { ...prev, story: { ...story, outsiderHeroId, outsiderCluePack } };
    });
  }, [heroes]);

  // Work State
  const [workState, setWorkState] = useState<WorkState | null>(null);
  const [habitatStayState, setHabitatStayState] = useState<{
    isActive: boolean;
    locationId: string;
    totalDays: number;
    daysPassed: number;
  } | null>(null);
  const [hideoutStayState, setHideoutStayState] = useState<HideoutStayState | null>(null);

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
  const logsRef = useRef(logs);
  const defenseAidMetaRef = useRef<{ locationId: string; delta: number; ratio: number } | null>(null);
  const undeadChatListRef = useRef<HTMLDivElement>(null);
  const shaperChatListRef = useRef<HTMLDivElement>(null);
  const altarChatListRef = useRef<HTMLDivElement>(null);
  const heroChatListRef = useRef<HTMLDivElement>(null);
  const heroChatTimersRef = useRef<Record<string, number[]>>({});
  const heroChatterRef = useRef<{ nextAt: number; inFlight: boolean; retry: number }>({ nextAt: 0, inFlight: false, retry: 0 });

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

    useEffect(() => {
      if (!workState?.isActive) return;
      if (!currentLocation) return;
      if (currentLocation.id !== workState.locationId) return;

      if (workState.daysPassed >= workState.totalDays) {
        const finishTimer = setTimeout(() => {
          const earned = Math.max(0, Math.floor(workState.totalPay));
          if (earned > 0) setPlayer(prev => ({ ...prev, gold: prev.gold + earned }));
          setPlayer(prev => ({ ...prev, prestige: (prev.prestige ?? 0) + PRESTIGE.WORK_CONTRACT_COMPLETE }));
          addLog(`委托完成，获得 ${earned} 第纳尔，威望 +${PRESTIGE.WORK_CONTRACT_COMPLETE}。`);
          setWorkState(null);
          if (currentLocation) {
            setView('TOWN');
            setTownTab('WORK');
          }
        }, 650);
        return () => clearTimeout(finishTimer);
      }

      const timer = setTimeout(() => {
        if (!currentLocation) return;
        if (currentLocation.id !== workState.locationId) return;
        processDailyCycle(currentLocation, 0, 1, 0, true);
        setWorkState(prev => prev ? { ...prev, daysPassed: prev.daysPassed + 1 } : null);
      }, 1200);

      return () => clearTimeout(timer);
    }, [workState, currentLocation]);

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
        const currentCount = current.troops.reduce((a, b) => a + b.count, 0) + (current.woundedTroops ?? []).reduce((sum, e) => sum + (e.count ?? 0), 0);
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
    if (!habitatStayState?.isActive) return;
    if (habitatStayState.daysPassed >= habitatStayState.totalDays) {
      const finishTimer = setTimeout(() => {
        addLog(`栖息结束，时间已快进 ${habitatStayState.totalDays} 天。`);
        setHabitatStayState(null);
        if (currentLocation) {
          setView('TOWN');
          setTownTab('HABITAT');
        }
      }, 350);
      return () => clearTimeout(finishTimer);
    }

    const timer = setTimeout(() => {
      if (!currentLocation) return;
      if (currentLocation.id !== habitatStayState.locationId) return;
      processDailyCycle(currentLocation, 0, 1, 0, true);
      setHabitatStayState(prev => prev ? { ...prev, daysPassed: prev.daysPassed + 1 } : null);
    }, 50);

    return () => clearTimeout(timer);
  }, [habitatStayState]);

  useEffect(() => {
    if (!hideoutStayState?.isActive) return;
    if (hideoutStayState.daysPassed >= hideoutStayState.totalDays) {
      const finishTimer = setTimeout(() => {
        addLog(`停留结束，时间已快进 ${hideoutStayState.totalDays} 天。`);
        setHideoutStayState(null);
        if (currentLocation) {
          setView('TOWN');
          setTownTab('HIDEOUT');
        }
      }, 350);
      return () => clearTimeout(finishTimer);
    }

    const timer = setTimeout(() => {
      if (!currentLocation) return;
      if (currentLocation.id !== hideoutStayState.locationId) return;
      processDailyCycle(currentLocation, 0, 1, 0, true);
      setHideoutStayState(prev => prev ? { ...prev, daysPassed: prev.daysPassed + 1 } : null);
    }, 1200);

    return () => clearTimeout(timer);
  }, [hideoutStayState]);

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
      const currentCount = current.troops.reduce((a, b) => a + b.count, 0) + (current.woundedTroops ?? []).reduce((sum, e) => sum + (e.count ?? 0), 0);
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
    logsRef.current = logs;
  }, [logs]);

  useEffect(() => {
    const active = pendingDecisions[0] ?? null;
    if (!active || active.kind !== 'CITY_RELIGION') return;
    const heroesHere = (heroes ?? []).filter(h => h.recruited && h.status !== 'DEAD');
    if (heroesHere.length === 0) return;
    const current = String(decisionHeroId ?? '').trim();
    if (current && heroesHere.some(h => h.id === current)) return;
    setDecisionHeroId(heroesHere[0].id);
  }, [pendingDecisions.length, pendingDecisions[0]?.id, heroes, decisionHeroId]);

  useEffect(() => {
    if (!heroChatterEnabled) {
      heroChatterRef.current = { nextAt: 0, inFlight: false, retry: 0 };
      return;
    }

    const clampInt = (n: number, min: number, max: number) => Math.max(min, Math.min(max, Math.floor(n)));
    const getRange = () => {
      const min = clampInt(heroChatterMinMinutes, 1, 240);
      const max = clampInt(heroChatterMaxMinutes, 1, 240);
      return { min, max: Math.max(min, max) };
    };
    const scheduleNext = (delayMs?: number) => {
      const { min, max } = getRange();
      const span = max - min;
      const minutes = min + (span <= 0 ? 0 : Math.random() * span);
      heroChatterRef.current.nextAt = Date.now() + (typeof delayMs === 'number' ? delayMs : Math.floor(minutes * 60 * 1000));
    };

    if (heroChatterRef.current.nextAt <= 0) scheduleNext(10_000);

    const timer = window.setInterval(async () => {
      const state = heroChatterRef.current;
      if (!heroChatterEnabled) return;
      if (state.inFlight) return;
      if (state.nextAt <= 0 || Date.now() < state.nextAt) return;
      if (isBattling || view === 'BATTLE' || view === 'BATTLE_RESULT' || view === 'MAIN_MENU' || view === 'INTRO' || view === 'ENDING') {
        scheduleNext(30_000);
        return;
      }

      const party = (heroesRef.current ?? []).filter(h => h && h.recruited && h.status !== 'DEAD');
      if (party.length < 2) {
        scheduleNext(60_000);
        return;
      }

      const aiConfig = buildAIConfig();
      if (!aiConfig) {
        scheduleNext(60_000);
        return;
      }

      const shuffle = <T,>(arr: T[]) => {
        const a = [...arr];
        for (let i = a.length - 1; i > 0; i -= 1) {
          const j = Math.floor(Math.random() * (i + 1));
          const tmp = a[i];
          a[i] = a[j];
          a[j] = tmp;
        }
        return a;
      };
      const maxCount = Math.min(4, party.length);
      const size = Math.max(2, Math.min(maxCount, 2 + Math.floor(Math.random() * (maxCount - 1))));
      const participants = shuffle(party).slice(0, size);

      const locationText = currentLocation
        ? `${currentLocation.name}（${currentLocation.type}）`
        : view === 'TOWN'
          ? '城镇'
          : '野外行军';

      state.inFlight = true;
      try {
        const res = await chatHeroChatter(
          participants,
          playerRef.current,
          (logsRef.current ?? []).slice(0, 20),
          (partyDiaryRef.current ?? []).slice(-20),
          locationText,
          aiConfig
        );
        const summary = String(res.summary ?? '').trim() || '队伍闲聊';
        const map = new Map(participants.map(h => [h.id, h.name]));
        const lines = (res.lines ?? []).slice(0, 18).map(l => ({
          heroId: String(l.heroId ?? '').trim(),
          text: String(l.text ?? '').trim(),
          emotion: l.emotion
        })).filter(l => l.heroId && l.text && map.has(l.heroId));
        const text = lines.length > 0
          ? lines.map(l => `${map.get(l.heroId)}：${l.text}`).join('\n')
          : `${participants.map(h => h.name).join('、')}（沉默地交换了眼神）。`;

        addLog(`【闲聊】${summary}`);
        addPartyDiaryEntry('party', '队伍', `【闲聊】${summary}\n${text}`, playerRef.current.day, playerRef.current.day);

        const now = Date.now();
        const createdAt = new Date(now).toLocaleString('zh-CN', { hour12: false });
        setHeroes(prev => prev.map(h => {
          if (!h.recruited || h.status === 'DEAD') return h;
          const involved = participants.some(p => p.id === h.id);
          if (!involved) return h;
          const mem: HeroPermanentMemory = {
            id: `chatter_${now}_${Math.floor(Math.random() * 10000)}`,
            text: `闲聊：${summary}`,
            createdAt,
            createdDay: playerRef.current.day,
            roundIndex: playerRef.current.day
          };
          const nextMem = [mem, ...(h.permanentMemory ?? [])].slice(0, 24);
          const lastEmotion = [...lines].reverse().find(l => l.heroId === h.id)?.emotion;
          return { ...h, permanentMemory: nextMem, currentExpression: lastEmotion ?? h.currentExpression };
        }));

        state.retry = 0;
        scheduleNext();
      } catch {
        state.retry = Math.max(0, Math.floor(state.retry)) + 1;
        if (state.retry >= 3) {
          state.retry = 0;
          scheduleNext();
        } else {
          scheduleNext(15_000 * state.retry);
        }
      } finally {
        state.inFlight = false;
      }
    }, 4_000);

    return () => window.clearInterval(timer);
  }, [
    heroChatterEnabled,
    heroChatterMinMinutes,
    heroChatterMaxMinutes,
    aiProvider,
    openAIBaseUrl,
    openAIKey,
    openAIModel,
    doubaoApiKey,
    geminiApiKey,
    view,
    isBattling,
    currentLocation?.id
  ]);

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

  const getPlayerReligion = (list?: Location[]) => getPlayerReligionFromLocations(list ?? locations);

  const preachInCity = (locationId: string) => {
    const id = String(locationId ?? '').trim();
    if (!id) return;
    const religion = getPlayerReligion();
    if (!religion) {
      addLog('你还没有确立宗教。先去祭坛创建宗教。');
      return;
    }
    const target = locations.find(l => l.id === id) ?? null;
    if (!target || target.type !== 'CITY') return;
    const relationValue = playerRef.current.locationRelations?.[id] ?? 0;
    const plan = computePreachPlan(target, relationValue);
    if (playerRef.current.gold < plan.cost) {
      addLog('资金不足，无法传教。');
      return;
    }
    const day = playerRef.current.day;
    const rollInt = (min: number, max: number) => Math.floor(min + Math.random() * (max - min + 1));
    const nextEventDay = (() => {
      const current = target.religion?.nextEventDay;
      if (typeof current === 'number' && current > day) return current;
      return day + rollInt(7, 14);
    })();
    const nextFaith = Math.max(0, Math.min(100, plan.faith + plan.gain));
    setPlayer(prev => ({ ...prev, gold: Math.max(0, prev.gold - plan.cost) }));
    setLocations(prev => prev.map(l => {
      if (l.id !== id) return l;
      const currentFaith = Math.max(0, Math.min(100, Math.floor(l.religion?.faith ?? 0)));
      const faithAfter = Math.max(0, Math.min(100, currentFaith + plan.gain));
      return {
        ...l,
        religion: {
          faith: faithAfter,
          started: true,
          lastEventDay: l.religion?.lastEventDay,
          nextEventDay
        }
      };
    }));
    setCurrentLocation(prev => {
      if (!prev || prev.id !== id) return prev;
      const currentFaith = Math.max(0, Math.min(100, Math.floor(prev.religion?.faith ?? 0)));
      const faithAfter = Math.max(0, Math.min(100, currentFaith + plan.gain));
      return { ...prev, religion: { faith: faithAfter, started: true, lastEventDay: prev.religion?.lastEventDay, nextEventDay } };
    });
    addLog(`【传教】${target.name}：宣讲"${religion.religionName}"，+${plan.gain}%（花费 ${plan.cost}）。`);
    addLocationLog(id, `传教活动推进：信教比例 +${plan.gain}%（现 ${nextFaith}%）。`, day);
  };

  const handleRecruitHeroRelation = (hero: Hero) => {
    const race = hero.race ?? 'HUMAN';
    if (race === 'HUMAN') return;
    updateRelation('RACE', race, 8, `招募${RACE_LABELS[race]}英雄 ${hero.name}`);
  };

  const handleLordProvoked = (lord: Lord, location: Location) => {
    if (lord.factionId) {
      updateRelation('FACTION', lord.factionId, -8, `激怒${lord.title}${lord.name}`);
      return;
    }
    const race = getLocationRace(location);
    if (race) {
      updateRelation('RACE', race, -6, `激怒${RACE_LABELS[race]}领主`);
    }
  };

  const updateLocationRelation = (locationId: string, delta: number, text: string) => {
    if (!delta) return;
    const safeId = String(locationId || '').trim();
    if (!safeId) return;
    setPlayer(prev => {
      const current = (prev.locationRelations?.[safeId] ?? 0);
      const next = clampRelation(current + delta);
      if (next === current) return prev;
      return {
        ...prev,
        locationRelations: {
          ...(prev.locationRelations ?? {}),
          [safeId]: next
        }
      };
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
    return buildAIConfigFromSettings({
      aiProvider,
      doubaoApiKey,
      geminiApiKey,
      openAIBaseUrl,
      openAIKey,
      openAIModel
    });
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

  const buildTroopsFromSoldiers = (soldiers: SoldierInstance[]): Troop[] =>
    buildTroopsFromSoldiersImpl(soldiers, getTroopTemplate);
  const normalizePlayerSoldiers = (player: PlayerState): PlayerState =>
    normalizePlayerSoldiersImpl(player, getTroopTemplate);
  const buildWoundedEntriesFromSoldiers = (soldiers: SoldierInstance[], day: number) =>
    buildWoundedEntriesFromSoldiersImpl(soldiers, day);
  const markSoldiersWounded = (soldiers: SoldierInstance[], ids: string[], recoverDay: number, note: string) =>
    markSoldiersWoundedImpl(soldiers, ids, recoverDay, note);
  const removeSoldiersById = (soldiers: SoldierInstance[], ids: string[]) =>
    removeSoldiersByIdImpl(soldiers, ids);

  const buildGarrisonTroops = (location: Location) =>
    buildGarrisonTroopsImpl(location, getTroopTemplate);
  const getDefenderTroops = (location: Location) =>
    getDefenderTroopsImpl(location, getTroopTemplate);

  const getUpgradeTargetOptions = (troopId: string): string[] => {
    const tmpl = getTroopTemplate(troopId);
    if (!tmpl) return [];
    const explicit = Array.isArray(tmpl.upgradeTargetIds)
      ? tmpl.upgradeTargetIds.map(x => String(x ?? '').trim()).filter(Boolean)
      : (tmpl.upgradeTargetId ? [tmpl.upgradeTargetId] : []);
    const primary = explicit[0] ?? '';
    if (!primary) return [];
    if (explicit.length >= 2) return Array.from(new Set(explicit)).slice(0, 3);

    const allTemplates = { ...TROOP_TEMPLATES, ...customTroopTemplates } as Record<string, Omit<Troop, 'count' | 'xp'>>;
    const primaryTmpl = allTemplates[primary] ?? getTroopTemplate(primary);

    const getRole = (t: Omit<Troop, 'count' | 'xp'>) => {
      const text = `${t.id} ${t.name} ${(t.equipment ?? []).join(' ')}`.toLowerCase();
      if (/(骑|rider|caval|horse|warg|wolf)/i.test(text)) return 'CAV' as const;
      if ((t.attributes?.range ?? 0) >= 90) return 'RANGED' as const;
      if (/(弓|弩|射|箭)/.test(t.name ?? '') || /(bow|cross)/i.test(text)) return 'RANGED' as const;
      return 'MELEE' as const;
    };
    const getGroup = (t: Omit<Troop, 'count' | 'xp'>) => {
      if (t.id.includes('_')) return t.id.split('_')[0];
      return getRole(t) === 'RANGED' ? 'core_ranged' : 'core_melee';
    };

    const group = getGroup(tmpl);
    const tierNext = (tmpl.tier ?? 1) + 1;
    const candidates = Object.values(allTemplates).filter(t => {
      if (!t) return false;
      if (t.id === primary) return false;
      if ((t.tier ?? 1) !== tierNext) return false;
      return getGroup(t) === group;
    });

    const primaryRole = primaryTmpl ? getRole(primaryTmpl) : 'MELEE' as const;
    const wanted = primaryRole === 'RANGED' ? (['MELEE', 'CAV'] as const) : primaryRole === 'CAV' ? (['MELEE', 'RANGED'] as const) : (['RANGED', 'CAV'] as const);

    const score = (t: Omit<Troop, 'count' | 'xp'>) => {
      const p = primaryTmpl ?? tmpl;
      const dp = Math.abs((t.basePower ?? 0) - (p.basePower ?? 0));
      const dc = Math.abs((t.cost ?? 0) - (p.cost ?? 0)) * 0.01;
      return dp + dc;
    };

    const picks: string[] = [];
    for (const role of wanted) {
      const best = candidates
        .filter(t => getRole(t) === role)
        .sort((a, b) => score(a) - score(b))[0];
      if (best?.id) picks.push(best.id);
      if (picks.length >= 2) break;
    }

    return Array.from(new Set([primary, ...picks])).slice(0, 3);
  };

  const getTroopSoldiers = (player: PlayerState, troopId: string) => {
    const roster = Array.isArray(player.soldiers) ? player.soldiers : [];
    return roster.filter(s => s.troopId === troopId);
  };

  const getDefaultLayerIdForTroop = (troop: Troop, layers: { id: string; name: string; hint: string }[]) =>
    getDefaultLayerId(troop, layers, getTroopTemplate);

  useEffect(() => {
    sessionStorage.removeItem('game.logs');
    const settings = loadAISettingsFromStorage();
    setOpenAIProfiles(settings.openAIProfiles);
    setActiveOpenAIProfileId(settings.activeOpenAIProfileId);
    setOpenAIProfileName(settings.openAIProfileName);
    setOpenAIBaseUrl(settings.openAIBaseUrl);
    setOpenAIKey(settings.openAIKey);
    setOpenAIModel(settings.openAIModel);
    setAIProvider(settings.aiProvider);
    setDoubaoApiKey(settings.doubaoApiKey);
    setGeminiApiKey(settings.geminiApiKey);
    setBattleStreamEnabled(settings.battleStreamEnabled);
    setBattleResolutionMode(settings.battleResolutionMode);
    setHeroChatterEnabled(settings.heroChatterEnabled);
    setHeroChatterMinMinutes(settings.heroChatterMinMinutes);
    setHeroChatterMaxMinutes(settings.heroChatterMaxMinutes);
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
        assignments[troop.id] = getDefaultLayerIdForTroop(troop, layers);
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
        const translateX = -(MAP_WIDTH / 2) * unitSize + cameraRef.current.x;
        const translateY = -(MAP_HEIGHT / 2) * unitSize + cameraRef.current.y;
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
            x: anchor.screen.x - anchor.world.x * unitSize + (MAP_WIDTH / 2) * unitSize,
            y: anchor.screen.y - anchor.world.y * unitSize + (MAP_HEIGHT / 2) * unitSize
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

  const spendHeroAttributePoint = (heroId: string, key: keyof Hero['attributes']) => {
    setHeroes(prev => prev.map(hero => {
      if (hero.id !== heroId) return hero;
      if (hero.attributePoints <= 0) return hero;
      const currentValue = typeof hero.attributes[key] === 'number' ? hero.attributes[key] : 0;
      const nextAttributes = { ...hero.attributes, [key]: currentValue + 1 };
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

  const getHeroLeadershipBonus = () => {
    const guardianIds = new Set<string>();
    locations.forEach(loc => {
      if (!loc.hideout?.layers) return;
      loc.hideout.layers.forEach(layer => {
        if (layer.guardianHeroId) guardianIds.add(layer.guardianHeroId);
      });
    });
    const activeHeroes = heroes.filter(h => h.recruited && !h.locationId && h.status !== 'DEAD' && !guardianIds.has(h.id));
    const total = activeHeroes.reduce((sum, h) => sum + Math.max(0, h.attributes.leadership ?? 0), 0);
    return total * 5;
  };

  const getMaxTroops = () => 20 + player.attributes.leadership * 5 + getHeroLeadershipBonus();

  const handleHeroLeave = (heroId: string) => {
    const hero = heroes.find(h => h.id === heroId);
    if (!hero || !hero.recruited) return;
    const returnCity = currentLocation?.type === 'CITY'
      ? currentLocation
      : locations.find(l => l.type === 'CITY') ?? locations[0] ?? null;
    const stayDays = Math.max(2, Math.min(6, 2 + Math.floor(Math.random() * 5)));
    const returnCityId = returnCity?.id;
    setHeroes(prev => prev.map(h => {
      if (h.id !== heroId) return h;
      return {
        ...h,
        recruited: false,
        locationId: returnCityId,
        stayDays
      };
    }));
    setLocations(prev => prev.map(loc => {
      if (!loc.hideout?.layers) return loc;
      const nextLayers = loc.hideout.layers.map(layer => layer.guardianHeroId === heroId ? { ...layer, guardianHeroId: undefined } : layer);
      const changed = nextLayers.some((layer, idx) => layer.guardianHeroId !== loc.hideout?.layers?.[idx]?.guardianHeroId);
      if (!changed) return loc;
      return { ...loc, hideout: { ...loc.hideout, layers: nextLayers } };
    }));
    if (activeHeroChatId === heroId) {
      setActiveHeroChatId(null);
      setView('PARTY');
    }
    if (returnCity) addLog(`${hero.name} 已离队，返回 ${returnCity.name}。`);
    else addLog(`${hero.name} 已离队。`);
  };

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
    if (workState?.isActive || miningState?.isActive || roachLureState?.isActive || altarRecruitState?.isActive || habitatStayState?.isActive || hideoutStayState?.isActive) return;
    
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

  const focusCameraOnLocation = (location: Location, desiredZoom = 1.4) => {
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
          x: centerX - (location.coordinates.x - MAP_WIDTH / 2) * unitSize,
          y: centerY - (location.coordinates.y - MAP_HEIGHT / 2) * unitSize
        };
        cameraRef.current = nextCamera;
        setCamera(nextCamera);
      });
    });
  };

  const focusLocationOnMap = (location: Location) => {
    setIsMapListOpen(false);
    setView('MAP');
    focusCameraOnLocation(location);
  };

  // Modified to accept arrivalPos explicitly to avoid stale state closure issues
  const finishTravel = (arrivalPos: {x: number, y: number}, travelToken: number) => {
    setTargetPosition(null);
    hasArrivedRef.current = false;
    if (processedTravelTokenRef.current === travelToken) return;
    processedTravelTokenRef.current = travelToken;
    
    const hitLocation = findLocationAtPosition(arrivalPos, locations);

    if (hitLocation?.type === 'FIELD_CAMP') {
      setPlayer(prev => ({ ...prev, position: arrivalPos }));
      enterLocation(hitLocation);
      return;
    }

    processDailyCycle(hitLocation);
  };

  const siegeEngineOptions = SIEGE_ENGINE_OPTIONS;
  const siegeEngineCombatStats = SIEGE_ENGINE_COMBAT_STATS;
  const buildingOptions = BUILDING_OPTIONS;

  const getLocationTroops = (loc: Location) => {
    return (loc.garrison && loc.garrison.length > 0 ? loc.garrison : buildGarrisonTroops(loc)).map(t => ({ ...t }));
  };

  const processDailyCycle = (location?: Location, rentCost: number = 0, days: number = 1, workIncomePerDay: number = 0, suppressEncounter: boolean = false, options?: { skipSiegeProcessing?: boolean }): Location[] | void => {
    let newLocations = [...locations];
    let nextPlayer = { ...playerRef.current };
    let nextHeroes = heroesRef.current.map(h => ({ ...h }));
    let nextLords = lordsRef.current.map(lord => ({ ...lord, partyTroops: lord.partyTroops.map(t => ({ ...t })) }));
    let nextBattleTimeline = [...battleTimelineRef.current];
    let nextWorldDiplomacy = worldDiplomacyRef.current;
    const logsToAdd: string[] = [];
    const decisionsToAdd: Array<{
      id: string;
      kind: 'CITY_RELIGION' | 'HIDEOUT_GOV';
      locationId: string;
      day: number;
      title: string;
      description: string;
      baseDelta?: number;
      payload?: any;
    }> = [];
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
    for (let dayIndex = 0; dayIndex < days; dayIndex++) {
      newLocations = processCaravanMovement(newLocations, MAP_WIDTH, MAP_HEIGHT);

      const banditResult = processBanditSpawn(newLocations, nextPlayer.day, dayIndex, MAP_WIDTH, MAP_HEIGHT);
      newLocations = banditResult.locations;
      if (banditResult.log) logsToAdd.push(banditResult.log);

      const caravanResult = processCaravanSpawn(newLocations, nextPlayer.day, dayIndex, getTroopTemplate, MAP_WIDTH, MAP_HEIGHT);
      newLocations = caravanResult.locations;
      if (caravanResult.log) logsToAdd.push(caravanResult.log);

      const nextDay = nextPlayer.day + 1;
      newLocations = newLocations.map(loc => {
        if (loc.type === 'SEAL_HABITAT') {
          const { location: updated, starvedNames } = processSealHabitatDaily(loc, nextDay);
          if (starvedNames.length > 0) {
            logsToAdd.push(`【海狮饲养场】${starvedNames.join('、')} 因断粮饿死了。`);
          }
          const aliveCount = (updated.sealHabitat?.seals ?? []).filter(s => (s.hungerDays ?? 0) < 5).length;
          const lastPrestige = updated.sealHabitat?.lastPrestigeDay;
          const shouldAdd = lastPrestige == null || nextDay - lastPrestige >= 5;
          if (aliveCount > 0 && shouldAdd) {
            const gain = computeSealHabitatPrestige(aliveCount);
            nextPlayer = { ...nextPlayer, prestige: (nextPlayer.prestige ?? 0) + gain };
            logsToAdd.push(`【海狮饲养场】饲养 ${aliveCount} 只海狮/海豹，威望 +${gain}。`);
            return { ...updated, sealHabitat: { ...updated.sealHabitat!, lastPrestigeDay: nextDay } };
          }
          return updated;
        }
        if (loc.type !== 'CITY') return loc;
        const board = loc.workBoard;
        const last = typeof board?.lastRefreshDay === 'number' ? board.lastRefreshDay : 0;
        const contracts = Array.isArray(board?.contracts) ? board!.contracts : [];
        const intervalDays = 3;
        if (contracts.length > 0 && nextDay - last < intervalDays) return loc;
        return { ...loc, workBoard: { lastRefreshDay: nextDay, contracts: buildWorkContractsForCity(loc, nextDay) } };
      });
      const religion = getPlayerReligion(newLocations);
      if (religion) {
        const rollInt = (min: number, max: number) => Math.floor(min + Math.random() * (max - min + 1));
        const clampFaith = (v: number) => Math.max(0, Math.min(100, Math.floor(v)));
        newLocations = newLocations.map(loc => {
          if (loc.type !== 'CITY') return loc;
          const current = loc.religion ?? { faith: 0, started: false };
          const started = !!current.started || (current.faith ?? 0) > 0;
          if (!started) return loc;
          const nextEventDay = typeof current.nextEventDay === 'number' && current.nextEventDay > nextDay
            ? current.nextEventDay
            : nextDay + rollInt(7, 14);
          if (nextDay < nextEventDay) {
            return { ...loc, religion: { ...current, faith: clampFaith(current.faith ?? 0), started: true, nextEventDay } };
          }
          const faithNow = clampFaith(current.faith ?? 0);
          const relationValue = nextPlayer.locationRelations?.[loc.id] ?? 0;
          const negative = Math.random() < 0.72;
          const magnitude = negative
            ? (2 + rollInt(0, 7))
            : (1 + rollInt(0, 5));
          const relationTilt = relationValue >= 60 ? 2 : relationValue >= 30 ? 1 : relationValue <= -40 ? -2 : relationValue <= -20 ? -1 : 0;
          const rawDelta = negative ? -(magnitude + Math.max(0, -relationTilt)) : (magnitude + Math.max(0, relationTilt));
          const hasChapel = (loc.buildings ?? []).includes('CHAPEL');
          const delta = rawDelta < 0
            ? Math.min(-1, Math.ceil(rawDelta * (hasChapel ? 0.7 : 1)))
            : Math.max(1, Math.floor(rawDelta * (hasChapel ? 1.15 : 1)));
          decisionsToAdd.push({
            id: `religion_${loc.id}_${nextDay}_${Math.floor(Math.random() * 10000)}`,
            kind: 'CITY_RELIGION',
            locationId: loc.id,
            day: nextDay,
            title: `传教风波：${loc.name}`,
            description: [
              delta >= 0 ? `城里有人开始传唱“${religion.religionName}”。` : '谣言在街巷里发酵，信徒被嘲弄。',
              `当前信教比例：${faithNow}%`,
              `波动倾向：${delta >= 0 ? `+${delta}%` : `${delta}%`}`,
              hasChapel ? '小教堂在运作，能缓冲波动。' : ''
            ].filter(Boolean).join('\n'),
            baseDelta: delta,
            payload: { religionName: religion.religionName }
          });
          return {
            ...loc,
            religion: {
              faith: faithNow,
              started: true,
              lastEventDay: current.lastEventDay,
              nextEventDay: nextDay + rollInt(7, 14)
            }
          };
        });
      }

      {
        const rollInt = (min: number, max: number) => Math.floor(min + Math.random() * (max - min + 1));
        const clampPct = (v: number) => Math.max(0, Math.min(100, Math.floor(v)));
        const relationCandidates = (Object.keys(RACE_LABELS) as RaceId[]).filter(r => r !== 'HUMAN');
        newLocations = newLocations.map(loc => {
          if (loc.type !== 'HIDEOUT' || loc.owner !== 'PLAYER' || !loc.hideout) return loc;
          const gov = loc.hideout.governance ?? { stability: 60, productivity: 55, prosperity: 50, harmony: 55 };
          const builtFacilities = (loc.hideout.layers ?? []).flatMap(layer => (layer.facilitySlots ?? []))
            .filter(s => !!s?.type && !(typeof s?.daysLeft === 'number' && s.daysLeft > 0))
            .map(s => s.type as BuildingType);
          const countFacility = (type: BuildingType) => builtFacilities.reduce((acc, t) => acc + (t === type ? 1 : 0), 0);
          const plaza = countFacility('UNDERGROUND_PLAZA');
          const canteen = countFacility('CANTEEN');
          const tavern = countFacility('TAVERN');
          const theater = countFacility('THEATER');
          const arena = countFacility('ARENA');
          const nextGov = {
            stability: clampPct(gov.stability + plaza * 0.6 + arena * 0.6),
            productivity: clampPct(gov.productivity + arena * 0.3),
            prosperity: clampPct(gov.prosperity + canteen * 0.4 + tavern * 0.6 + theater * 0.8),
            harmony: clampPct(gov.harmony + plaza * 0.6 + canteen * 0.6 + tavern * 0.3 + theater * 0.6)
          };
          let nextEventDay = typeof gov.nextEventDay === 'number' ? gov.nextEventDay : nextDay + rollInt(2, 4);
          const lastEventDay = typeof gov.lastEventDay === 'number' ? gov.lastEventDay : nextDay - rollInt(2, 5);
          const daysSince = Math.max(0, nextDay - lastEventDay);
          const baseChance = Math.min(0.7, 0.2 + daysSince * 0.12);
          if (nextDay < nextEventDay) {
            return { ...loc, hideout: { ...loc.hideout, governance: { ...gov, ...nextGov, nextEventDay, lastEventDay } } };
          }
          if (Math.random() >= baseChance) {
            nextEventDay = nextDay + rollInt(2, 4);
            return { ...loc, hideout: { ...loc.hideout, governance: { ...gov, ...nextGov, nextEventDay, lastEventDay } } };
          }
          const evt = HIDEOUT_GOV_EVENTS[Math.floor(Math.random() * HIDEOUT_GOV_EVENTS.length)];
          const relationImpact = Math.random() < 0.45
            ? {
                raceId: relationCandidates[Math.floor(Math.random() * relationCandidates.length)],
                onlyTwoChoices: Math.random() < 0.35
              }
            : null;
          decisionsToAdd.push({
            id: `hideout_gov_${loc.id}_${nextDay}_${Math.floor(Math.random() * 10000)}`,
            kind: 'HIDEOUT_GOV',
            locationId: loc.id,
            day: nextDay,
            title: `内政事件：${evt.title}（${loc.name}）`,
            description: [
              ...evt.lines,
              relationImpact ? `牵涉与 ${RACE_LABELS[relationImpact.raceId]} 的关系走向。` : '',
              `稳定性 ${clampPct(nextGov.stability)}｜生产力 ${clampPct(nextGov.productivity)}｜繁荣度 ${clampPct(nextGov.prosperity)}｜和谐度 ${clampPct(nextGov.harmony)}`,
              clampPct(nextGov.stability) <= 20 ? '警告：稳定性过低，叛乱风险上升。' : ''
            ].filter(Boolean).join('\n'),
            payload: { gov: nextGov, eventId: evt.id, relationImpact }
          });
          return { ...loc, hideout: { ...loc.hideout, governance: { ...gov, ...nextGov, nextEventDay: nextDay + rollInt(3, 6), lastEventDay } } };
        });
      }
      const stayLoc = location ? (newLocations.find(l => l.id === location.id) ?? location) : null;
      const hospitalLevel = (() => {
        if (!stayLoc || stayLoc.type !== 'HIDEOUT' || stayLoc.owner !== 'PLAYER') return 0;
        const layers = stayLoc.hideout?.layers ?? [];
        const built = layers.flatMap(l => (l.facilitySlots ?? []) as any[])
          .filter(s => !!s?.type && !(typeof s?.daysLeft === 'number' && s.daysLeft > 0))
          .map(s => s.type as BuildingType);
        if (built.includes('HOSPITAL_III')) return 3;
        if (built.includes('HOSPITAL_II')) return 2;
        if (built.includes('HOSPITAL_I')) return 1;
        return 0;
      })();
      let roster = Array.isArray(nextPlayer.soldiers) ? nextPlayer.soldiers.map(s => ({ ...s })) : [];
      if (roster.length > 0) {
        if (hospitalLevel > 0 && nextDay % 3 === 0) {
          roster = roster.map(s => {
            if (s.status !== 'WOUNDED') return s;
            const recoverDay = Math.max(nextDay, Math.floor((s.recoverDay ?? nextDay) - hospitalLevel));
            return { ...s, recoverDay };
          });
          logsToAdd.push(`地下医院发挥作用：伤兵恢复进度加快 ${hospitalLevel} 天。`);
        }
        const recovered = roster.filter(s => s.status === 'WOUNDED' && (s.recoverDay ?? 0) <= nextDay);
        if (recovered.length > 0) {
          const byName = recovered.reduce<Record<string, number>>((acc, s) => {
            acc[s.name] = (acc[s.name] ?? 0) + 1;
            return acc;
          }, {});
          Object.entries(byName).forEach(([name, count]) => {
            if (count > 0) logsToAdd.push(`伤兵恢复：${name} x${count} 重新归队。`);
          });
          roster = roster.map(s => (s.status === 'WOUNDED' && (s.recoverDay ?? 0) <= nextDay) ? { ...s, status: 'ACTIVE', recoverDay: undefined } : s);
        }
        nextPlayer = {
          ...nextPlayer,
          soldiers: roster,
          troops: buildTroopsFromSoldiers(roster),
          woundedTroops: buildWoundedEntriesFromSoldiers(roster, nextDay)
        };
      }
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
        const heavyOptions = isUndeadFortressLocation(loc)
          ? ['undead_soul_obelisk', 'undead_bone_mortar', 'undead_grave_bastion']
          : (loc.type === 'CITY' || loc.type === 'CASTLE' || loc.type === 'VILLAGE')
            ? ['heavy_ballista', 'heavy_fire_cannon', 'heavy_catapult', 'heavy_light_tank']
            : loc.type === 'ROACH_NEST'
              ? ['roach_egg_thrower']
              : [];
        const airOptions = isUndeadFortressLocation(loc)
          ? ['undead_gargoyle', 'undead_gargoyle_ancient']
          : (loc.type === 'CITY' || loc.type === 'CASTLE')
            ? ['arcane_glider', 'arcane_biplane', 'arcane_airship']
            : loc.type === 'HABITAT'
              ? ['beast_roc_hatchling', 'beast_roc', 'beast_roc_alpha']
              : [];
        let remaining = amount;
        const updated = [...troops];
        if (heavyOptions.length > 0) {
          const totalCount = updated.reduce((sum, t) => sum + t.count, 0);
          const desiredHeavy = Math.max(1, Math.min(3, 1 + Math.floor(totalCount / 280)));
          const existingHeavy = updated.filter(t => t.category === 'HEAVY').reduce((sum, t) => sum + t.count, 0);
          const heavyToAdd = Math.max(0, Math.min(desiredHeavy - existingHeavy, Math.min(3, remaining)));
          for (let i = 0; i < heavyToAdd; i++) {
            const heavyId = heavyOptions[Math.floor(Math.random() * heavyOptions.length)];
            const heavyTemplate = getTroopTemplate(heavyId);
            if (!heavyTemplate) continue;
            const idx = updated.findIndex(t => t.id === heavyTemplate.id);
            if (idx >= 0) {
              updated[idx] = { ...updated[idx], count: updated[idx].count + 1 };
            } else {
              updated.push({ ...heavyTemplate, count: 1, xp: 0 });
            }
            remaining -= 1;
            if (remaining <= 0) break;
          }
        }
        if (remaining > 0 && airOptions.length > 0) {
          const totalCount = updated.reduce((sum, t) => sum + t.count, 0);
          const desiredAir = Math.max(1, Math.min(3, 1 + Math.floor(totalCount / 360)));
          const existingAir = updated.filter(t => (t.combatDomain ?? 'GROUND') !== 'GROUND').reduce((sum, t) => sum + t.count, 0);
          const airToAdd = Math.max(0, Math.min(desiredAir - existingAir, Math.min(3, remaining)));
          for (let i = 0; i < airToAdd; i++) {
            const airId = airOptions[Math.floor(Math.random() * airOptions.length)];
            const airTemplate = getTroopTemplate(airId);
            if (!airTemplate) continue;
            const idx = updated.findIndex(t => t.id === airTemplate.id);
            if (idx >= 0) {
              updated[idx] = { ...updated[idx], count: updated[idx].count + 1 };
            } else {
              updated.push({ ...airTemplate, count: 1, xp: 0 });
            }
            remaining -= 1;
            if (remaining <= 0) break;
          }
        }
        if (remaining <= 0) return updated;
        const recruitId = getLocationRecruitId(loc);
        const template = getTroopTemplate(recruitId);
        if (!template) return updated;
        const index = updated.findIndex(t => t.id === template.id);
        if (index >= 0) {
          updated[index] = { ...updated[index], count: updated[index].count + remaining };
        } else {
          updated.push({ ...template, count: remaining, xp: 0 });
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

      let newGold = Math.max(0, nextPlayer.gold - rentCost);

      const cityPool = newLocations.filter(l => l.type === 'CITY');
      const cityIds = cityPool.map(l => l.id);
      const pickCityId = (excludeId?: string) => {
        if (cityIds.length === 0) return null;
        if (cityIds.length === 1) return cityIds[0];
        const candidates = cityIds.filter(id => id !== excludeId);
        const pool = candidates.length > 0 ? candidates : cityIds;
        return pool[Math.floor(Math.random() * pool.length)];
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
          if (updated.type === 'HIDEOUT' && updated.hideout && Array.isArray(updated.hideout.layers) && updated.hideout.layers.length > 0) {
            const religionTroopIds = (() => {
              const altar = newLocations.find(l => l.type === 'ALTAR' && (l.altar?.troopIds ?? []).length > 0 && !!l.altar?.doctrine?.religionName);
              return altar?.altar?.troopIds ?? [];
            })();
            const normalizeSlots = (slots: any[] | undefined) => Array.from({ length: 10 }, (_, i) => {
              const raw = Array.isArray(slots) ? slots[i] : null;
              const type = raw && typeof raw === 'object' ? ((raw as any).type as BuildingType | null) : null;
              const daysLeft = raw && typeof raw === 'object' && typeof (raw as any).daysLeft === 'number' ? Math.max(0, Math.floor((raw as any).daysLeft)) : undefined;
              const totalDays = raw && typeof raw === 'object' && typeof (raw as any).totalDays === 'number' ? Math.max(0, Math.floor((raw as any).totalDays)) : undefined;
              return { type: type ?? null, daysLeft, totalDays };
            });
            const tickSlots = (slots: Array<{ type: BuildingType | null; daysLeft?: number; totalDays?: number }>, layerName: string) => {
              return slots.map(s => {
                if (!s.type) return s;
                if (typeof s.daysLeft === 'number' && s.daysLeft > 0) {
                  const next = Math.max(0, s.daysLeft - 1);
                  if (next === 0) logsToAdd.push(`${updated.name}·${layerName} 的 ${getBuildingName(s.type)} 已建成。`);
                  return { ...s, daysLeft: next };
                }
                return s;
              });
            };
            const builtTypes = (slots: Array<{ type: BuildingType | null; daysLeft?: number }>) => slots
              .filter(s => !!s.type && !(typeof s.daysLeft === 'number' && s.daysLeft > 0))
              .map(s => s.type as BuildingType);
            const nextLayers = updated.hideout.layers.map(layer => {
              const nextLayer = { ...layer };
              const facilitySlots = tickSlots(normalizeSlots(nextLayer.facilitySlots as any), nextLayer.name);
              const defenseSlots = tickSlots(normalizeSlots(nextLayer.defenseSlots as any), nextLayer.name);
              nextLayer.facilitySlots = facilitySlots;
              nextLayer.defenseSlots = defenseSlots;

              const facilityBuilt = builtTypes(facilitySlots);
              const countFacility = (t: BuildingType) => facilityBuilt.reduce((acc, x) => acc + (x === t ? 1 : 0), 0);
              const housingCount = countFacility('HOUSING');
              const housing2Count = countFacility('HOUSING_II');
              const housing3Count = countFacility('HOUSING_III');
              const campCount = countFacility('TRAINING_CAMP');
              const recruiterCount = countFacility('RECRUITER');
              const shrineCount = countFacility('SHRINE');
              const hasBarracks = countFacility('BARRACKS') > 0;
              const baseCap = nextLayer.garrisonBaseLimit ?? 900;
              const cap = hasBarracks ? Math.floor(baseCap * 1.5) : baseCap;

              const housingScore = housingCount + housing2Count * 1.6 + housing3Count * 2.4;
              if (housingScore > 0) {
                const lastIncomeDay = nextLayer.lastIncomeDay ?? 0;
                if (nextDay - lastIncomeDay >= 3) {
                  const income = Math.floor(housingScore * (18 + nextLayer.depth * 4));
                  newGold += income;
                  nextLayer.lastIncomeDay = nextDay;
                  logsToAdd.push(`【税收】${updated.name}·${nextLayer.name} 征收了 ${income} 第纳尔。`);
                }
              }

              if (campCount > 0) {
                const lastTrainingDay = nextLayer.lastTrainingDay ?? 0;
                if (nextDay - lastTrainingDay >= 3) {
                  nextLayer.lastTrainingDay = nextDay;
                  if ((nextLayer.garrison ?? []).length > 0) {
                    const strength = Math.max(4, Math.min(10, 3 + campCount));
                    nextLayer.garrison = applyGarrisonTraining(nextLayer.garrison ?? [], strength, getTroopTemplate);
                    logsToAdd.push(`【训练营】${updated.name}·${nextLayer.name} 的驻军获得了经验。`);
                  }
                }
              }

              const recruitPlan = (nextLayer as any).recruitPlan as { troopId: string; target: number; recruited: number; costPerUnit: number } | undefined;
              if (recruitPlan && recruitPlan.target > 0) {
                const planTarget = Math.max(0, Math.floor(recruitPlan.target));
                const planRecruited = Math.max(0, Math.floor(recruitPlan.recruited ?? 0));
                const planRemaining = Math.max(0, planTarget - planRecruited);
                const isShrinePlan = recruitPlan.troopId === religionTroopIds[0] && shrineCount > 0;
                const rate = isShrinePlan
                  ? shrineCount * (3 + Math.min(4, nextLayer.depth))
                  : recruiterCount > 0
                    ? recruiterCount * (4 + Math.min(6, nextLayer.depth * 2))
                    : 0;
                const lastPlanDay = isShrinePlan ? (nextLayer.lastShrineDay ?? 0) : (nextLayer.lastRecruitDay ?? 0);
                if (planRemaining > 0 && rate > 0 && nextDay - lastPlanDay >= 4) {
                  if (isShrinePlan) nextLayer.lastShrineDay = nextDay;
                  else nextLayer.lastRecruitDay = nextDay;
                  const garrison = (nextLayer.garrison ?? []).map(t => ({ ...t }));
                  const currentCount = getGarrisonCount(garrison);
                  const capRemaining = Math.max(0, cap - currentCount);
                  const attempt = Math.min(rate, planRemaining, capRemaining);
                  if (attempt > 0) {
                    const template = getTroopTemplate(recruitPlan.troopId);
                    const costPerUnit = Math.max(1, Math.floor(recruitPlan.costPerUnit ?? (template?.cost ?? 0) ?? 0));
                    const affordable = costPerUnit > 0 ? Math.min(attempt, Math.floor(nextPlayer.gold / costPerUnit)) : 0;
                    if (template && affordable > 0) {
                      const index = garrison.findIndex(t => t.id === template.id);
                      if (index >= 0) garrison[index] = { ...garrison[index], count: garrison[index].count + affordable };
                      else garrison.push({ ...template, count: affordable, xp: 0 });
                      nextLayer.garrison = garrison;
                      recruitPlan.recruited = planRecruited + affordable;
                      (nextLayer as any).recruitPlan = { ...recruitPlan };
                      const totalCost = affordable * costPerUnit;
                      nextPlayer = { ...nextPlayer, gold: Math.max(0, nextPlayer.gold - totalCost) };
                      logsToAdd.push(`【征兵官】${updated.name}·${nextLayer.name} 招募 ${affordable} 名守军（花费 ${totalCost}）。`);
                    }
                  }
                }
              }

              const refineQueue = Array.isArray(nextLayer.refineQueue) ? nextLayer.refineQueue.map(job => ({ ...job })) : [];
              const nextRefineQueue: any[] = [];
              refineQueue.forEach(job => {
                const daysLeft = Math.max(0, Math.floor((job.daysLeft ?? 0) - 1));
                if (daysLeft <= 0) {
                  const mineralId = job.mineralId as MineralId;
                  const toPurity = job.toPurity as MineralPurity;
                  const out = Math.max(0, Math.floor(job.outputAmount ?? 0));
                  if (out > 0) {
                    const nextMinerals = { ...(nextPlayer.minerals ?? INITIAL_PLAYER_STATE.minerals) };
                    const record = { ...(nextMinerals[mineralId] ?? { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }) };
                    record[toPurity] = (record[toPurity] ?? 0) + out;
                    nextMinerals[mineralId] = record;
                    nextPlayer = { ...nextPlayer, minerals: nextMinerals };
                    logsToAdd.push(`【精炼完成】${updated.name}·${nextLayer.name} 产出 ${MINERAL_PURITY_LABELS[toPurity]}${MINERAL_META[mineralId]?.name ?? mineralId}x${out}。`);
                  }
                } else {
                  nextRefineQueue.push({ ...job, daysLeft });
                }
              });
              nextLayer.refineQueue = nextRefineQueue as any;

              return nextLayer;
            });
            const totalBuilt = nextLayers.reduce((sum, layer) => {
              const a = builtTypes(normalizeSlots(layer.facilitySlots as any)).length;
              const b = builtTypes(normalizeSlots(layer.defenseSlots as any)).length;
              return sum + a + b;
            }, 0);
            const camouflageBuilt = (() => {
              const layer0 = nextLayers[0];
              if (!layer0) return 0;
              const built = builtTypes(normalizeSlots(layer0.defenseSlots as any));
              const camo1 = built.filter(t => t === 'CAMOUFLAGE_STRUCTURE').length;
              const camo2 = built.filter(t => t === 'CAMOUFLAGE_STRUCTURE_II').length;
              const camo3 = built.filter(t => t === 'CAMOUFLAGE_STRUCTURE_III').length;
              return camo1 + camo2 * 1.6 + camo3 * 2.4;
            })();
            const baseExposure = Math.max(0, Math.min(100, updated.hideout.exposure ?? 0));
            const depthFactor = Math.max(0, nextLayers.length - 1) * 0.18;
            const builtFactor = totalBuilt * 0.09;
            const passive = 0.35 + depthFactor + builtFactor - Math.min(0.7, camouflageBuilt * 0.22);
            const nextExposure = Math.max(0, Math.min(100, baseExposure + passive));
            updated.hideout = { ...updated.hideout, layers: nextLayers, exposure: nextExposure };
            if (!updated.isUnderSiege && !updated.activeSiege) {
              const visitorChance = clampValue(0.015 + (nextExposure / 100) * 0.06, 0.01, 0.08);
              if (Math.random() < visitorChance) {
                const roll = Math.random();
                const text = roll < 0.45
                  ? '有人在入口附近徘徊，似乎在寻找什么。'
                  : roll < 0.75
                    ? '一支小队路过废墟，朝隐匿点方向张望了许久。'
                    : '可疑的侦察痕迹出现在外围，可能有人在绘制路线。';
                addLocalLog(updated.id, text);
              }
            }
          }

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
                updated.garrison = applyGarrisonTraining(updated.garrison ?? [], 4, getTroopTemplate);
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
                  const recruitId = getLocationRecruitId(updated);
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
         if (options?.skipSiegeProcessing) return loc;
         
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

         if (loc.type === 'HIDEOUT' && loc.owner === 'PLAYER' && loc.hideout && Array.isArray(loc.hideout.layers) && loc.hideout.layers.length > 0) {
          if (typeof siege.startDay === 'number' && nextDay < siege.startDay) {
            const remaining = Math.max(1, Math.floor(siege.startDay - nextDay));
            if (remaining <= 3 || remaining % 2 === 1) {
              addLocalLog(loc.id, `迷宫延缓：敌军仍在迷阵中摸索（还需 ${remaining} 天）。`);
            }
            return { ...loc, activeSiege: siege, isUnderSiege: true };
          }
          const layerIndexRaw = (siege as any).hideoutLayerIndex ?? loc.hideout.selectedLayer ?? 0;
          const layerIndex = Math.max(0, Math.min(loc.hideout.layers.length - 1, Math.floor(layerIndexRaw)));
          const layer = loc.hideout.layers[layerIndex];
          let garrison = (layer.garrison ?? []).map(t => ({ ...t })).filter(t => t.count > 0);
          let attackers = [...siege.troops];

          const defense = getLocationDefenseDetails({ ...loc, activeSiege: { ...siege, hideoutLayerIndex: layerIndex } });
          const wallBonus = 1 + (defense.wallLevel * 0.2);
          const guardianHeroId = layer.guardianHeroId;
          const guardian = guardianHeroId ? nextHeroes.find(h => h.id === guardianHeroId) ?? null : null;
          const guardianFactor = guardian ? clampValue(1 + guardian.level * 0.03 + guardian.attributes.attack * 0.004 + guardian.attributes.hp * 0.001, 1, 1.75) : 1;

          const getProfile = (troop: Troop) => {
            const tmpl = getTroopTemplate(troop.id);
            const normalizedId = troop.id.startsWith('garrison_') ? troop.id.slice('garrison_'.length) : troop.id;
            const inferredDomain: 'GROUND' | 'AIR' | 'HYBRID' = tmpl?.combatDomain ?? troop.combatDomain ?? (
              normalizedId.includes('aerial') ? 'AIR' : 'GROUND'
            );
            const attrs = tmpl?.attributes ?? troop.attributes;
            const range = attrs?.range ?? 0;
            const airValue = typeof (attrs as any)?.air === 'number'
              ? Number((attrs as any).air)
              : inferredDomain === 'AIR' ? 180 : inferredDomain === 'HYBRID' ? 130 : 0;
            let antiAirValue = typeof (attrs as any)?.antiAir === 'number'
              ? Number((attrs as any).antiAir)
              : Math.round(Math.max(0, range) * 0.85 + 10);
            const tier = tmpl?.tier ?? troop.tier ?? 1;
            const isRoach = normalizedId.startsWith('roach_');
            const isRoachGlide = isRoach && !normalizedId.includes('aerial') && tier <= 2;
            if (isRoachGlide) antiAirValue = Math.max(antiAirValue, 65);
            const clamp01 = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n));
            const attackVsAir = typeof (tmpl?.attackVsAir ?? troop.attackVsAir) === 'number'
              ? (tmpl?.attackVsAir ?? troop.attackVsAir) as number
              : clamp01(0.18 + (antiAirValue / 210) + (inferredDomain !== 'GROUND' ? airValue / 520 : 0), 0.15, 1.25);
            const attackVsGround = typeof (tmpl?.attackVsGround ?? troop.attackVsGround) === 'number'
              ? (tmpl?.attackVsGround ?? troop.attackVsGround) as number
              : inferredDomain === 'AIR'
                ? clamp01(0.75 + (airValue / 520), 0.75, 1.25)
                : 1.0;
            const canCapture = typeof (tmpl?.canCapture ?? troop.canCapture) === 'boolean'
              ? (tmpl?.canCapture ?? troop.canCapture) as boolean
              : inferredDomain !== 'AIR';
            return { domain: inferredDomain, attackVsAir, attackVsGround, canCapture };
          };
          const isAirCapable = (t: Troop) => {
            const d = getProfile(t).domain;
            return d === 'AIR' || d === 'HYBRID';
          };
          const isGroundCapable = (t: Troop) => {
            const d = getProfile(t).domain;
            return d === 'GROUND' || d === 'HYBRID';
          };
          const calcAttackPower = (troops: Troop[], target: 'AIR' | 'GROUND') => troops.reduce((acc, t) => {
            const bonusRatio = (t.enchantments ?? []).reduce((sum, e) => sum + e.powerBonus, 0);
            const profile = getProfile(t);
            const weight = target === 'AIR' ? profile.attackVsAir : profile.attackVsGround;
            if (t.id === 'player_main' || t.id.startsWith('hero_')) return acc + t.basePower * (1 + bonusRatio) * weight;
            return acc + t.count * t.tier * 10 * (1 + bonusRatio) * weight;
          }, 0);
          const applyLossSelective = (troops: Troop[], rate: number, predicate: (t: Troop) => boolean) => {
            if (rate <= 0) return troops;
            return troops
              .map(t => {
                if (!predicate(t)) return t;
                return { ...t, count: Math.max(0, Math.floor(t.count * (1 - rate))) };
              })
              .filter(t => t.count > 0);
          };

          const phaseLoss = () => 0.03 + (Math.random() * 0.03);
          const clampRate = (n: number, max: number) => Math.max(0, Math.min(max, n));

          const attackersAir = attackers.filter(isAirCapable);
          const defendersAir = garrison.filter(isAirCapable);
          const aaLoss = phaseLoss();
          const airAirAP = calcAttackPower(attackersAir, 'AIR');
          const airAirDP = calcAttackPower(defendersAir, 'AIR') * guardianFactor;
          const airAirRatio = airAirDP > 0 ? airAirAP / airAirDP : airAirAP > 0 ? 10 : 0;
          const defenderAirLossRate = airAirRatio > 0 ? clampRate(aaLoss * airAirRatio, 0.35) : 0;
          const attackerAirLossRate = airAirRatio > 0 ? clampRate(aaLoss * (1 / airAirRatio), 0.35) : 0;
          garrison = applyLossSelective(garrison, defenderAirLossRate, isAirCapable);
          attackers = applyLossSelective(attackers, attackerAirLossRate, isAirCapable);

          const agLoss = 0.035 + (Math.random() * 0.035);
          const airToGroundAP = calcAttackPower(attackers.filter(isAirCapable), 'GROUND');
          const defenderGroundPower = calculatePower(garrison.filter(isGroundCapable)) * wallBonus * guardianFactor;
          const airToGroundRatio = defenderGroundPower > 0 ? airToGroundAP / defenderGroundPower : airToGroundAP > 0 ? 10 : 0;
          const defenderGroundLossRate = airToGroundRatio > 0
            ? clampRate(agLoss * airToGroundRatio, 0.4) * (1 - (defense as any).airstrikeDamageReduction)
            : 0;
          garrison = applyLossSelective(garrison, defenderGroundLossRate, isGroundCapable);

          const gaLoss = 0.035 + (Math.random() * 0.035);
          const groundToAirDP = calcAttackPower(garrison.filter(isGroundCapable), 'AIR') * guardianFactor * (1 + (defense as any).antiAirPowerBonus);
          const attackerAirPower = calculatePower(attackers.filter(isAirCapable));
          const groundToAirRatio = attackerAirPower > 0 ? groundToAirDP / attackerAirPower : groundToAirDP > 0 ? 10 : 0;
          const attackerAirLossRate2 = groundToAirRatio > 0 ? clampRate(gaLoss * groundToAirRatio, 0.4) : 0;
          attackers = applyLossSelective(attackers, attackerAirLossRate2, isAirCapable);

          const groundLoss = 0.04 + (Math.random() * 0.04);
          const attackerGroundPower = calculatePower(attackers.filter(isGroundCapable)) + calcAttackPower(attackers.filter(isAirCapable), 'GROUND') * 0.35;
          const defenderGroundPower2 = (calculatePower(garrison.filter(isGroundCapable)) + calcAttackPower(garrison.filter(isAirCapable), 'GROUND') * 0.15) * wallBonus * guardianFactor;
          const groundRatio = defenderGroundPower2 > 0 ? attackerGroundPower / defenderGroundPower2 : attackerGroundPower > 0 ? 10 : 0;
          const defenderGroundLossRate2 = clampRate(groundLoss * groundRatio, 0.5);
          const attackerGroundLossRate2 = clampRate(groundLoss * (groundRatio > 0 ? (1 / groundRatio) : 1), 0.5);
          garrison = applyLossSelective(garrison, defenderGroundLossRate2, isGroundCapable);
          attackers = applyLossSelective(attackers, attackerGroundLossRate2, isGroundCapable);

          const garrisonCount = getGarrisonCount(garrison);
          const attackerCount = getGarrisonCount(attackers);
          const defenderHoldCount = getGarrisonCount(garrison.filter(t => getProfile(t).canCapture));
          const attackerHoldCount = getGarrisonCount(attackers.filter(t => getProfile(t).canCapture));

          const nextLayers = loc.hideout.layers.map((l, idx) => idx === layerIndex ? { ...l, garrison } : l);
          const nextHideout = { ...loc.hideout, layers: nextLayers, selectedLayer: layerIndex };

          if ((nextDay - siege.startDay) % 2 === 0) {
            const guardianName = guardian ? `${guardian.title ?? ''}${guardian.name}` : '';
            addLocalLog(loc.id, guardianName
              ? `${guardianName}记录：隐匿点遭围攻，攻${attackerCount} 守${garrisonCount}（${layer.name}）。`
              : `隐匿点遭围攻：攻${attackerCount} 守${garrisonCount}（${layer.name}）。`
            );
          }

          if (defenderHoldCount <= 0) {
            const isLastLayer = layerIndex >= loc.hideout.layers.length - 1;
            if (isLastLayer) {
              logsToAdd.push(`【隐匿点沦陷】敌军攻入最深处，隐匿点被攻破。`);
              addLocalLog(loc.id, `隐匿点沦陷，游戏结束。`);
              nextPlayer = {
                ...nextPlayer,
                story: {
                  ...(nextPlayer.story ?? {}),
                  gameOverReason: 'HIDEOUT_FALLEN',
                  endingId: 'HIDEOUT_FALLEN'
                }
              };
              setEndingReturnView('GAME_OVER');
              setView('ENDING');
              return {
                ...loc,
                hideout: nextHideout,
                activeSiege: undefined,
                isUnderSiege: false
              };
            }
            if (attackerHoldCount <= 0) {
              logsToAdd.push(`【围攻解除】隐匿点 ${layer.name} 守军溃散，但 ${siegeFactionName} 无法继续推进，选择撤离。`);
              addLocalLog(loc.id, `守军溃散，围城方撤离（${layer.name}）。`);
              return {
                ...loc,
                hideout: { ...nextHideout, layers: nextLayers.map((l, idx) => idx === layerIndex ? { ...l, garrison: [] } : l) },
                activeSiege: undefined,
                isUnderSiege: false
              };
            }
            if (layerIndex < loc.hideout.layers.length - 1) {
              const nextLayerIndex = layerIndex + 1;
              logsToAdd.push(`【隐匿点告急】${layer.name} 失守，敌军深入下一层！`);
              addLocalLog(loc.id, `第 ${layer.depth} 层失守，敌军深入。`);
              return {
                ...loc,
                hideout: { ...nextHideout, selectedLayer: nextLayerIndex },
                activeSiege: { ...siege, troops: attackers, hideoutLayerIndex: nextLayerIndex },
                isUnderSiege: true
              };
            }
          }

          if (attackerCount <= 0 || attackerHoldCount <= 0) {
            logsToAdd.push(`【围攻解除】隐匿点 ${layer.name} 击退了 ${siegeFactionName}。`);
            addLocalLog(loc.id, `围攻被击退（${layer.name}）。`);
            return {
              ...loc,
              hideout: nextHideout,
              activeSiege: undefined,
              isUnderSiege: false
            };
          }

          return {
            ...loc,
            hideout: nextHideout,
            activeSiege: { ...siege, troops: attackers, hideoutLayerIndex: layerIndex }
          };
         }
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
         
         const defense = getLocationDefenseDetails(loc);
         const wallBonus = 1 + (defense.wallLevel * 0.2);
         const getProfile = (troop: Troop) => {
           const tmpl = getTroopTemplate(troop.id);
           const normalizedId = troop.id.startsWith('garrison_') ? troop.id.slice('garrison_'.length) : troop.id;
           const inferredDomain: 'GROUND' | 'AIR' | 'HYBRID' = tmpl?.combatDomain ?? troop.combatDomain ?? (
             normalizedId.includes('aerial') ? 'AIR' : 'GROUND'
           );
           const attrs = tmpl?.attributes ?? troop.attributes;
           const range = attrs?.range ?? 0;
           const airValue = typeof (attrs as any)?.air === 'number'
             ? Number((attrs as any).air)
             : inferredDomain === 'AIR' ? 180 : inferredDomain === 'HYBRID' ? 130 : 0;
           let antiAirValue = typeof (attrs as any)?.antiAir === 'number'
             ? Number((attrs as any).antiAir)
             : Math.round(Math.max(0, range) * 0.85 + 10);
           const tier = tmpl?.tier ?? troop.tier ?? 1;
           const isRoach = normalizedId.startsWith('roach_');
           const isRoachGlide = isRoach && !normalizedId.includes('aerial') && tier <= 2;
           if (isRoachGlide) antiAirValue = Math.max(antiAirValue, 65);
           const clamp01 = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n));
           const attackVsAir = typeof (tmpl?.attackVsAir ?? troop.attackVsAir) === 'number'
             ? (tmpl?.attackVsAir ?? troop.attackVsAir) as number
             : clamp01(0.18 + (antiAirValue / 210) + (inferredDomain !== 'GROUND' ? airValue / 520 : 0), 0.15, 1.25);
           const attackVsGround = typeof (tmpl?.attackVsGround ?? troop.attackVsGround) === 'number'
             ? (tmpl?.attackVsGround ?? troop.attackVsGround) as number
             : inferredDomain === 'AIR'
               ? clamp01(0.75 + (airValue / 520), 0.75, 1.25)
               : 1.0;
           const canCapture = typeof (tmpl?.canCapture ?? troop.canCapture) === 'boolean'
             ? (tmpl?.canCapture ?? troop.canCapture) as boolean
             : inferredDomain !== 'AIR';
           return { domain: inferredDomain, attackVsAir, attackVsGround, canCapture };
         };
         const isAirCapable = (t: Troop) => {
           const d = getProfile(t).domain;
           return d === 'AIR' || d === 'HYBRID';
         };
         const isGroundCapable = (t: Troop) => {
           const d = getProfile(t).domain;
           return d === 'GROUND' || d === 'HYBRID';
         };
         const calcAttackPower = (troops: Troop[], target: 'AIR' | 'GROUND') => troops.reduce((acc, t) => {
           const bonusRatio = (t.enchantments ?? []).reduce((sum, e) => sum + e.powerBonus, 0);
           const profile = getProfile(t);
           const weight = target === 'AIR' ? profile.attackVsAir : profile.attackVsGround;
           if (t.id === 'player_main' || t.id.startsWith('hero_')) return acc + t.basePower * (1 + bonusRatio) * weight;
           return acc + t.count * t.tier * 10 * (1 + bonusRatio) * weight;
         }, 0);
         const applyLossSelective = (troops: Troop[], rate: number, predicate: (t: Troop) => boolean) => {
           if (rate <= 0) return troops;
           return troops
             .map(t => {
               if (!predicate(t)) return t;
               return { ...t, count: Math.max(0, Math.floor(t.count * (1 - rate))) };
             })
             .filter(t => t.count > 0);
         };

         const defendersAll = [
           ...garrison,
           ...stayParties.flatMap(party => party.troops),
           ...stationedArmies.flatMap(army => army.troops)
         ];
         const attackersAir = attackers.filter(isAirCapable);
         const attackersGround = attackers.filter(isGroundCapable);
         const defendersAir = defendersAll.filter(isAirCapable);
         const defendersGround = defendersAll.filter(isGroundCapable);

         const phaseLoss = () => 0.03 + (Math.random() * 0.03);
         const clampRate = (n: number, max: number) => Math.max(0, Math.min(max, n));

         const aaLoss = phaseLoss();
         const airAirAP = calcAttackPower(attackersAir, 'AIR');
         const airAirDP = calcAttackPower(defendersAir, 'AIR');
         const airAirRatio = airAirDP > 0 ? airAirAP / airAirDP : airAirAP > 0 ? 10 : 0;
         const defenderAirLossRate = airAirRatio > 0 ? clampRate(aaLoss * airAirRatio, 0.35) : 0;
         const attackerAirLossRate = airAirRatio > 0 ? clampRate(aaLoss * (1 / airAirRatio), 0.35) : 0;

         garrison = applyLossSelective(garrison, defenderAirLossRate, isAirCapable);
         const nextStayPartiesAir = stayParties
           .map(party => ({ ...party, troops: applyLossSelective(party.troops, defenderAirLossRate, isAirCapable) }))
           .filter(party => party.troops.length > 0);
         const nextStationedArmiesAir = stationedArmies
           .map(army => ({ ...army, troops: applyLossSelective(army.troops, defenderAirLossRate, isAirCapable) }))
           .filter(army => army.troops.length > 0);
         attackers = applyLossSelective(attackers, attackerAirLossRate, isAirCapable);

         const defendersAllAfterAir = [
           ...garrison,
           ...nextStayPartiesAir.flatMap(party => party.troops),
           ...nextStationedArmiesAir.flatMap(army => army.troops)
         ];
         const defendersGroundAfterAir = defendersAllAfterAir.filter(isGroundCapable);

         const agLoss = 0.035 + (Math.random() * 0.035);
         const airToGroundAP = calcAttackPower(attackers.filter(isAirCapable), 'GROUND');
         const defenderGroundPower = calculatePower(defendersGroundAfterAir) * wallBonus;
         const airToGroundRatio = defenderGroundPower > 0 ? airToGroundAP / defenderGroundPower : airToGroundAP > 0 ? 10 : 0;
        const defenderGroundLossRate = airToGroundRatio > 0
          ? clampRate(agLoss * airToGroundRatio, 0.4) * (1 - (defense as any).airstrikeDamageReduction)
          : 0;

         garrison = applyLossSelective(garrison, defenderGroundLossRate, isGroundCapable);
         const nextStayPartiesGround = nextStayPartiesAir
           .map(party => ({ ...party, troops: applyLossSelective(party.troops, defenderGroundLossRate, isGroundCapable) }))
           .filter(party => party.troops.length > 0);
         const nextStationedArmiesGround = nextStationedArmiesAir
           .map(army => ({ ...army, troops: applyLossSelective(army.troops, defenderGroundLossRate, isGroundCapable) }))
           .filter(army => army.troops.length > 0);

         const gaLoss = 0.035 + (Math.random() * 0.035);
        const groundToAirDP = calcAttackPower(defendersGroundAfterAir, 'AIR') * (1 + (defense as any).antiAirPowerBonus);
         const attackerAirPower = calculatePower(attackers.filter(isAirCapable));
         const groundToAirRatio = attackerAirPower > 0 ? groundToAirDP / attackerAirPower : groundToAirDP > 0 ? 10 : 0;
         const attackerAirLossRate2 = groundToAirRatio > 0 ? clampRate(gaLoss * groundToAirRatio, 0.4) : 0;
         attackers = applyLossSelective(attackers, attackerAirLossRate2, isAirCapable);

         const groundLoss = 0.04 + (Math.random() * 0.04);
         const attackerGroundPower = calculatePower(attackers.filter(isGroundCapable)) + calcAttackPower(attackers.filter(isAirCapable), 'GROUND') * 0.35;
         const defendersAllAfterAG = [
           ...garrison,
           ...nextStayPartiesGround.flatMap(party => party.troops),
           ...nextStationedArmiesGround.flatMap(army => army.troops)
         ];
         const defenderGroundPower2 = (calculatePower(defendersAllAfterAG.filter(isGroundCapable)) + calcAttackPower(defendersAllAfterAG.filter(isAirCapable), 'GROUND') * 0.15) * wallBonus;
         const groundRatio = defenderGroundPower2 > 0 ? attackerGroundPower / defenderGroundPower2 : attackerGroundPower > 0 ? 10 : 0;
         const defenderGroundLossRate2 = clampRate(groundLoss * groundRatio, 0.5);
         const attackerGroundLossRate2 = clampRate(groundLoss * (groundRatio > 0 ? (1 / groundRatio) : 1), 0.5);

         garrison = applyLossSelective(garrison, defenderGroundLossRate2, isGroundCapable);
         const nextStayParties = nextStayPartiesGround
           .map(party => ({ ...party, troops: applyLossSelective(party.troops, defenderGroundLossRate2, isGroundCapable) }))
           .filter(party => party.troops.length > 0);
         const nextStationedArmies = nextStationedArmiesGround
           .map(army => ({ ...army, troops: applyLossSelective(army.troops, defenderGroundLossRate2, isGroundCapable) }))
           .filter(army => army.troops.length > 0);
         attackers = applyLossSelective(attackers, attackerGroundLossRate2, isGroundCapable);
         
         siege.troops = attackers;
         
         const garrisonCount = getGarrisonCount([
           ...garrison,
           ...nextStayParties.flatMap(party => party.troops),
           ...nextStationedArmies.flatMap(army => army.troops)
         ]);
         const attackerCount = getGarrisonCount(attackers);
         const defenderHoldCount = getGarrisonCount([
           ...garrison.filter(t => getProfile(t).canCapture),
           ...nextStayParties.flatMap(party => party.troops).filter(t => getProfile(t).canCapture),
           ...nextStationedArmies.flatMap(army => army.troops).filter(t => getProfile(t).canCapture)
         ]);
         const attackerHoldCount = getGarrisonCount(attackers.filter(t => getProfile(t).canCapture));

        if ((nextDay - siege.startDay) % 2 === 0) {
          addLocalLog(loc.id, `围攻仍在继续：攻${attackerCount} 守${garrisonCount}。`);
        }
         
         if (defenderHoldCount <= 0) {
            if (attackerHoldCount <= 0) {
              logsToAdd.push(`【围攻解除】${loc.name} 的地面守军已溃散，但 ${siegeFactionName} 无法占领据点，选择撤离。`);
              addLocalLog(loc.id, `地面守军溃散，围城方撤离。`);
              return {
                ...loc,
                garrison: [],
                stayParties: [],
                stationedArmies: [],
                activeSiege: undefined,
                isUnderSiege: false
              };
            }
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
                owner: attackerFactionId ? undefined : 'ENEMY',
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
         
        if (attackerCount <= 0 || attackerHoldCount <= 0) {
            if (attackerCount > 0 && attackerHoldCount <= 0) {
              logsToAdd.push(`【围攻解除】${siegeFactionName} 在 ${loc.name} 的地面部队已崩溃，无法继续围城。`);
              addLocalLog(loc.id, `围城方地面部队崩溃，围攻解除。`);
            } else {
              logsToAdd.push(`【围攻解除】${loc.name} 的守军击溃了 ${siegeFactionName} 的进攻部队！`);
              addLocalLog(loc.id, `围攻被击溃，守军守住城池。`);
            }
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
        const spawnCooldown = 9;
        const lastInvasionDay = portal.lastInvasionDay ?? 0;
        const stationedArmies = portal.stationedArmies ?? [];

          if (nextDay - lastInvasionDay >= spawnCooldown && stationedArmies.length < 3) {
            const newForces = buildImposterTroops(nextDay, getTroopTemplate);
            const newArmy: EnemyForce = {
               name: `伪人裂隙浪潮·${Math.floor(nextDay / spawnCooldown)}`,
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
        if (sourceIndex >= 0 && meta.kind !== 'LORD_MARCH') {
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
        if (meta.kind === 'LORD_MARCH') {
          return;
        }
        if (target.activeSiege || target.isUnderSiege) {
          logsToAdd.push(`【行军营地】${meta.attackerName} 抵达 ${target.name} 时战场已被占据，选择撤回。`);
          return;
        }
        const raidTroops = (camp.garrison ?? []).map(t => ({ ...t }));
        const raidPower = calculatePower(raidTroops);
        const hideoutDelayDays = (() => {
          if (target.type !== 'HIDEOUT') return 0;
          const layer0 = target.hideout?.layers?.[0];
          if (!layer0) return 0;
          const slots = Array.isArray(layer0.defenseSlots) ? layer0.defenseSlots : [];
          const built = slots
            .map(s => ({ type: (s as any)?.type as BuildingType | null, daysLeft: (s as any)?.daysLeft as number | undefined }))
            .filter(s => !!s.type && !(typeof s.daysLeft === 'number' && s.daysLeft > 0))
            .map(s => s.type as BuildingType);
          if (built.includes('MAZE_III')) return 3;
          if (built.includes('MAZE_II')) return 2;
          if (built.includes('MAZE_I')) return 1;
          return 0;
        })();
        target.activeSiege = {
          attackerName: meta.attackerName,
          attackerFactionId: camp.factionId,
          troops: raidTroops,
          startDay: nextDay + hideoutDelayDays,
          totalPower: raidPower,
          siegeEngines: ['SIMPLE_LADDER'],
          hideoutLayerIndex: target.type === 'HIDEOUT' ? 0 : undefined
        };
        target.isUnderSiege = true;
        if (meta.kind === 'IMPOSTER_RAID') {
          target.imposterAlertUntilDay = undefined;
        }
        newLocations[targetIndex] = target;
        if (target.type === 'HIDEOUT' && hideoutDelayDays > 0) {
          logsToAdd.push(`【行军营地】${meta.attackerName} 抵达 ${target.name}，进入迷宫，预计 ${hideoutDelayDays} 天后开始围攻。`);
          addLocalLog(target.id, `遭到 ${meta.attackerName} 围攻（迷宫延缓 ${hideoutDelayDays} 天）。`);
        } else {
          logsToAdd.push(`【行军营地】${meta.attackerName} 抵达 ${target.name}，开始围攻。`);
          addLocalLog(target.id, `遭到 ${meta.attackerName} 围攻。`);
        }
        if (target.type === 'HIDEOUT' && target.hideout?.layers?.length) {
          const guardianHeroId = target.hideout.layers[0]?.guardianHeroId;
          const guardian = guardianHeroId ? nextHeroes.find(h => h.id === guardianHeroId) ?? null : null;
          if (guardian) {
            addLocalLog(target.id, `${guardian.title ?? ''}${guardian.name}记录：敌军已到达入口，开始围攻。`);
          }
        }
      });

      const hostileFactions = FACTIONS.filter(faction => getRelationValue(playerRef.current, 'FACTION', faction.id) <= -40);
      const playerTargets = newLocations.filter(loc => (
        loc.owner === 'PLAYER' &&
        !loc.activeSiege &&
        (loc.type === 'CITY' || loc.type === 'CASTLE' || loc.type === 'VILLAGE' || loc.type === 'HIDEOUT')
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
        const target = (() => {
          const weights = playerTargets.map(t => t.type === 'HIDEOUT'
            ? 1 + (clampValue(t.hideout?.exposure ?? 0, 0, 100) / 100) * 2.2
            : 1
          );
          const sum = weights.reduce((a, b) => a + b, 0);
          let roll = Math.random() * (sum > 0 ? sum : playerTargets.length);
          for (let i = 0; i < playerTargets.length; i++) {
            roll -= weights[i] ?? 1;
            if (roll <= 0) return playerTargets[i];
          }
          return playerTargets[Math.floor(Math.random() * playerTargets.length)];
        })();
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

      const hostileRaces = (Object.keys(RACE_LABELS) as RaceId[])
        .filter(race => race !== 'HUMAN' && getRelationValue(playerRef.current, 'RACE', race) <= -45);
      hostileRaces.forEach(race => {
        if (playerTargets.length === 0) return;
        const relationValue = getRelationValue(playerRef.current, 'RACE', race);
        const baseChance = relationValue <= -70 ? 0.45 : relationValue <= -55 ? 0.32 : 0.2;
        if (Math.random() > baseChance) return;
        const raceLocations = newLocations.filter(loc => getLocationRace(loc) === race);
        if (raceLocations.length === 0) return;
        const source = [...raceLocations].sort((a, b) => getGarrisonCount(getLocationTroops(b)) - getGarrisonCount(getLocationTroops(a)))[0];
        if (!source) return;
        const target = (() => {
          const weights = playerTargets.map(t => t.type === 'HIDEOUT'
            ? 1 + (clampValue(t.hideout?.exposure ?? 0, 0, 100) / 100) * 2.2
            : 1
          );
          const sum = weights.reduce((a, b) => a + b, 0);
          let roll = Math.random() * (sum > 0 ? sum : playerTargets.length);
          for (let i = 0; i < playerTargets.length; i++) {
            roll -= weights[i] ?? 1;
            if (roll <= 0) return playerTargets[i];
          }
          return playerTargets[Math.floor(Math.random() * playerTargets.length)];
        })();
        const hasExistingRaidCamp = newLocations.some(loc => (
          loc.type === 'FIELD_CAMP' &&
          loc.owner === 'ENEMY' &&
          loc.camp?.kind === 'FACTION_RAID' &&
          loc.camp?.targetLocationId === target.id
        ));
        if (hasExistingRaidCamp || target.activeSiege || target.isUnderSiege) return;
        const sourceTroops = getLocationTroops(source);
        const { attackers, remaining } = splitTroops(sourceTroops, 0.5);
        const scaledAttackers = attackers.map(t => ({ ...t, count: Math.max(1, Math.floor(t.count * getRelationScale(relationValue))) }));
        if (getGarrisonCount(scaledAttackers) < 40) return;
        const marchDays = 2 + Math.floor(Math.random() * 3);
        const etaDay = nextDay + marchDays;
        const raceLabel = RACE_LABELS[race] ?? race;
        const attackerName = `${raceLabel}讨伐队`;
        const leaderName = `${raceLabel}先锋`;
        logsToAdd.push(`【讨伐】${raceLabel} 讨伐队从 ${source.name} 出发，目标 ${target.name}，预计 ${marchDays} 天后抵达。`);
        addLocalLog(target.id, `侦查到 ${raceLabel} 讨伐队逼近。`);
        const campId = `field_camp_race_${source.id}_${target.id}_${nextDay}`;
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
          description: `一支正在行军的${raceLabel}讨伐队。目标：${target.name}。`,
          coordinates: initialCoordinates,
          terrain: source.terrain,
          factionId: undefined,
          lastRefreshDay: 0,
          volunteers: [],
          mercenaries: [],
          owner: 'ENEMY',
          isUnderSiege: false,
          siegeProgress: 0,
          siegeEngines: [],
          garrison: scaledAttackers.map(t => ({ ...t })),
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
          }
        };
        const sourceIndex = newLocations.findIndex(loc => loc.id === source.id);
        if (sourceIndex >= 0) {
          const sourceLoc = newLocations[sourceIndex];
          newLocations[sourceIndex] = {
            ...sourceLoc,
            garrison: remaining,
            factionRaidTargetId: target.id,
            factionRaidEtaDay: etaDay,
            factionRaidAttackerName: attackerName
          };
        }
        newLocations.push(camp);
      });

      const hideoutTarget = newLocations.find(loc => loc.type === 'HIDEOUT' && loc.owner === 'PLAYER');
      if (hideoutTarget && !hideoutTarget.activeSiege && !hideoutTarget.isUnderSiege && hideoutTarget.hideout) {
        const exposure = clampValue(hideoutTarget.hideout.exposure ?? 0, 0, 100);
        const hasExistingRaidCamp = newLocations.some(loc => (
          loc.type === 'FIELD_CAMP' &&
          loc.owner === 'ENEMY' &&
          loc.camp?.kind === 'FACTION_RAID' &&
          loc.camp?.targetLocationId === hideoutTarget.id
        ));
        const lastRaidDayRaw = hideoutTarget.hideout.lastRaidDay ?? 0;
        const lastRaidDay = lastRaidDayRaw <= 0 ? nextDay : lastRaidDayRaw;
        const daysSinceLastRaid = Math.max(0, nextDay - lastRaidDay);

        const intervalDays = exposure < 30 ? 10 : exposure < 55 ? 8 : exposure < 75 ? 6 : 4;
        const lastCheckDay = hideoutTarget.hideout.lastRaidCheckDay ?? 0;
        const shouldCheck = (nextDay - lastCheckDay) >= intervalDays;
        const graceDays = 12;
        const cooldownOk = daysSinceLastRaid >= graceDays;

        if (shouldCheck) {
          const hideoutIndex = newLocations.findIndex(loc => loc.id === hideoutTarget.id);
          if (hideoutIndex >= 0) {
            newLocations[hideoutIndex] = {
              ...hideoutTarget,
              hideout: { ...hideoutTarget.hideout, lastRaidDay, lastRaidCheckDay: nextDay }
            };
          }
        }

        if (shouldCheck && !hasExistingRaidCamp && cooldownOk) {
          const exposureChance = clampValue(0.03 + (exposure / 100) * 0.22, 0.02, 0.28);
          const timePressure = clampValue((daysSinceLastRaid - graceDays) * 0.012, 0, 0.18);
          const chance = clampValue(exposureChance + timePressure, 0, 0.35);
          if (Math.random() < chance) {
          const marchDays = 2 + Math.floor(Math.random() * 3);
          const etaDay = nextDay + marchDays;
          const roll = Math.random();
          const attackerName = roll < 0.7 ? '讨伐队' : roll < 0.9 ? '异种讨伐队' : '裂隙猎杀队';
          const leaderName = roll < 0.7 ? '地方武装头目' : roll < 0.9 ? '异种首领' : '裂隙军官';
          const scale = 1 + (exposure / 100) * 1.6;
          const raidTroops = roll < 0.7
            ? [
                createTroop('peasant', Math.max(8, Math.floor(randomInt(30, 60) * scale))),
                createTroop('militia', Math.max(6, Math.floor(randomInt(20, 45) * scale))),
                createTroop('hunter', Math.max(3, Math.floor(randomInt(10, 25) * scale)))
              ]
            : roll < 0.9
              ? [
                  createTroop('goblin_scavenger', Math.max(10, Math.floor(randomInt(35, 70) * scale))),
                  createTroop('goblin_spear_urchin', Math.max(8, Math.floor(randomInt(25, 55) * scale))),
                  createTroop('goblin_slinger', Math.max(7, Math.floor(randomInt(20, 45) * scale))),
                  createTroop('goblin_raider', Math.max(3, Math.floor(randomInt(10, 22) * scale)))
                ]
              : [
                  createTroop('imposter_grunt', Math.max(10, Math.floor(randomInt(35, 70) * scale))),
                  createTroop('imposter_crossbowman', Math.max(7, Math.floor(randomInt(20, 45) * scale))),
                  createTroop('imposter_spear_guard', Math.max(6, Math.floor(randomInt(15, 35) * scale)))
                ];
          const campId = `field_camp_hideout_${hideoutTarget.id}_${nextDay}`;
          const dx = randomInt(-24, 24);
          const dy = randomInt(-24, 24);
          const initialCoordinates = {
            x: clampValue(hideoutTarget.coordinates.x + dx, 0, MAP_WIDTH),
            y: clampValue(hideoutTarget.coordinates.y + dy, 0, MAP_HEIGHT)
          };
          const camp: Location = {
            id: campId,
            name: `${attackerName}·集结地`,
            type: 'FIELD_CAMP',
            description: `一支正在集结的讨伐队。目标：${hideoutTarget.name}。`,
            coordinates: initialCoordinates,
            terrain: hideoutTarget.terrain,
            factionId: undefined,
            lastRefreshDay: 0,
            volunteers: [],
            mercenaries: [],
            owner: 'ENEMY',
            isUnderSiege: false,
            siegeProgress: 0,
            siegeEngines: [],
            garrison: raidTroops.map(t => ({ ...t })),
            buildings: ['DEFENSE'],
            constructionQueue: [],
            siegeEngineQueue: [],
            lastIncomeDay: 0,
            camp: {
              kind: 'FACTION_RAID',
              sourceLocationId: 'unknown_raiders',
              targetLocationId: hideoutTarget.id,
              totalDays: marchDays,
              daysLeft: marchDays,
              attackerName,
              leaderName
            }
          };
          const hideoutIndex = newLocations.findIndex(loc => loc.id === hideoutTarget.id);
          if (hideoutIndex >= 0) {
            newLocations[hideoutIndex] = {
              ...hideoutTarget,
              hideout: { ...hideoutTarget.hideout, lastRaidDay: nextDay, lastRaidCheckDay: nextDay }
            };
          }
          logsToAdd.push(`【讨伐】侦查到有部队在隐匿点周围集结（暴露${Math.round(exposure)}%），预计 ${marchDays} 天后发动进攻。`);
          addLocalLog(hideoutTarget.id, `侦查到讨伐队集结，预计 ${etaDay} 天后发动进攻。`);
          newLocations.push(camp);
          }
        }
      }

      if (nextDay % 7 === 0) {
        const councilFactions = FACTIONS.filter(faction => getFactionLocations(faction.id, newLocations).length > 0);
        councilFactions.forEach(faction => {
          const factionLocations = getFactionLocations(faction.id, newLocations);
          const threatened = factionLocations.filter(loc => !!loc.activeSiege);
          const totalTroops = factionLocations.reduce((sum, loc) => sum + getGarrisonCount(getLocationTroops(loc)), 0);
          const hasImposterClaim = newLocations.some(loc => isImposterControlledLocation(loc) && loc.claimFactionId === faction.id);
          const avgGarrison = factionLocations.length > 0 ? totalTroops / factionLocations.length : totalTroops;
          let decision: 'EXPAND' | 'HOLD' | 'ATTACK' = 'HOLD';
          const roll = Math.random();
          if (threatened.length > 0) {
            logsToAdd.push(`【议会】${faction.name} 决定组织援军解围。`);
            const sortedTargets = [...threatened].sort((a, b) => getGarrisonCount(getLocationTroops(a)) - getGarrisonCount(getLocationTroops(b)));
            const reinforceTargets = sortedTargets.slice(0, Math.min(2, sortedTargets.length));
            reinforceTargets.forEach(target => {
              const baseTroops = getLocationTroops(target);
              const cap = getGarrisonCap(target);
              const currentCount = getGarrisonCount(baseTroops);
              if (currentCount >= cap) return;
              const recruitCount = target.type === 'CITY' ? 90 : target.type === 'CASTLE' ? 60 : 36;
              const available = Math.min(cap - currentCount, recruitCount);
              const nextGarrison = applyRecruitment(baseTroops, target, available);
              newLocations = newLocations.map(loc => loc.id === target.id ? { ...loc, garrison: nextGarrison } : loc);
            });
            return;
          }
          if (hasImposterClaim) {
            decision = roll < 0.72 ? 'ATTACK' : 'EXPAND';
          } else if (avgGarrison < 280) {
            decision = roll < 0.8 ? 'EXPAND' : 'HOLD';
          } else if (avgGarrison < 520) {
            decision = roll < 0.35 ? 'ATTACK' : roll < 0.75 ? 'EXPAND' : 'HOLD';
          } else {
            decision = roll < 0.55 ? 'ATTACK' : roll < 0.8 ? 'EXPAND' : 'HOLD';
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
              const recruitCount = target.type === 'CITY' ? 90 : target.type === 'CASTLE' ? 60 : 36;
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
            if (nextLord.currentLocationId === nextLord.targetLocationId) {
              nextLord = { ...nextLord, travelDaysLeft: undefined, targetLocationId: undefined, travelPurpose: undefined };
            } else {
            const remaining = nextLord.travelDaysLeft - 1;
            if (remaining <= 0) {
              const purpose = nextLord.travelPurpose;
              nextLord = {
                ...nextLord,
                currentLocationId: nextLord.targetLocationId,
                travelDaysLeft: undefined,
                targetLocationId: undefined,
                travelPurpose: undefined,
                visitPurpose: purpose ?? nextLord.visitPurpose,
                arrivedDay: nextDay
              };
              const arrivedLoc = getLocationById(nextLord.currentLocationId);
              if (arrivedLoc) {
                nextLord = recordLordAction(nextLord, arrivedLoc.id, `${nextLord.title}${nextLord.name} 抵达了 ${arrivedLoc.name}${purpose ? `（${purpose}）` : ''}`);
              }
            } else {
              return { ...nextLord, travelDaysLeft: remaining };
            }
            }
          }
          const partyCount = getTroopCount(nextLord.partyTroops);
          const partyMax = nextLord.partyMaxCount ?? Math.max(1, partyCount);
          const needsRest = partyCount < Math.max(20, Math.floor(partyMax * 0.6));
          const siegeCandidates = newLocations.filter(loc => (
            loc.factionId === nextLord.factionId &&
            !!loc.activeSiege &&
            (loc.type === 'CITY' || loc.type === 'CASTLE' || loc.type === 'VILLAGE' || isCastleLikeLocation(loc))
          ));
          const reliefTarget = siegeCandidates.length === 0 ? null : (() => {
            const scored = siegeCandidates
              .map(loc => ({
                loc,
                dist: Math.hypot(loc.coordinates.x - currentLoc.coordinates.x, loc.coordinates.y - currentLoc.coordinates.y),
                pinned: loc.id === nextLord.fiefId ? 0 : 1
              }))
              .sort((a, b) => a.pinned - b.pinned || a.dist - b.dist);
            const candidate = scored[0]?.loc ?? null;
            if (!candidate?.activeSiege) return null;
            const siege = candidate.activeSiege;
            const attackerPower = calculatePower(siege.troops ?? []);
            const defense = getLocationDefenseDetails(candidate);
            const wallBonus = 1 + (defense.wallLevel * 0.2);
            const garrison = (candidate.garrison && candidate.garrison.length > 0 ? candidate.garrison : buildGarrisonTroops(candidate)).map(t => ({ ...t }));
            const stayTroops = (candidate.stayParties ?? []).flatMap(p => p.troops ?? []).map(t => ({ ...t }));
            const stationedTroops = (candidate.stationedArmies ?? []).flatMap(a => a.troops ?? []).map(t => ({ ...t }));
            const defenderPower = calculatePower([...garrison, ...stayTroops, ...stationedTroops]) * wallBonus;
            const partyPower = calculatePower(nextLord.partyTroops);
            const threshold = siege.attackerFactionId ? 1.25 : 1.18;
            if (partyPower + defenderPower <= attackerPower * threshold) return null;
            return candidate;
          })();
          const raidSources = newLocations.filter(loc => (
            loc.factionId === nextLord.factionId &&
            loc.factionRaidTargetId &&
            loc.factionRaidEtaDay &&
            loc.factionRaidEtaDay >= nextDay
          ));
          const raidSource = raidSources.sort((a, b) => (a.factionRaidEtaDay ?? 0) - (b.factionRaidEtaDay ?? 0))[0];
          let desiredState = nextLord.state;
          if (reliefTarget && (!needsRest || reliefTarget.id === nextLord.fiefId) && partyCount >= 20) {
            desiredState = 'MARSHALLING';
          } else if (needsRest) {
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
          const moveTo = (target: Location | null, purpose: string) => {
            if (!target || nextLord.currentLocationId === target.id) return nextLord;
            const from = getLocationById(nextLord.currentLocationId) ?? fief ?? target;
            if (!from) return nextLord;
            return { ...nextLord, targetLocationId: target.id, travelDaysLeft: estimateTravelDays(from, target), travelPurpose: purpose, visitPurpose: undefined };
          };
          if (nextLord.state === 'RESTING') {
            const restLoc = (currentLoc.factionId === nextLord.factionId && currentLoc.owner !== 'ENEMY')
              ? currentLoc
              : (fief && fief.factionId === nextLord.factionId ? fief : (friendlyStrongholds(nextLord.factionId)[0] ?? currentLoc));
            if (restLoc.id !== nextLord.currentLocationId) {
              return moveTo(restLoc, `前往${restLoc.name}休整补员`);
            }
            const available = Math.max(0, Math.min(partyMax - partyCount, restLoc.type === 'CITY' ? 18 : restLoc.type === 'CASTLE' ? 12 : 8));
            const recruited = applyRecruitment(nextLord.partyTroops, restLoc, available);
            const trained = applyGarrisonTraining(recruited, 3, getTroopTemplate);
            nextLord = recordLordAction(nextLord, restLoc.id, `在${restLoc.name}休整补员`);
            return { ...nextLord, partyTroops: trained };
          }
          if (nextLord.state === 'MARSHALLING') {
            const gatherLoc = reliefTarget ?? (raidSource ? getLocationById(raidSource.id) ?? fief ?? currentLoc : fief ?? currentLoc);
            if (gatherLoc.id !== nextLord.currentLocationId) {
              return moveTo(gatherLoc, reliefTarget ? `前往${gatherLoc.name}解围` : `前往${gatherLoc.name}集结待命`);
            }
            const trained = applyGarrisonTraining(nextLord.partyTroops, 3, getTroopTemplate);
            nextLord = recordLordAction(nextLord, gatherLoc.id, reliefTarget ? `在${gatherLoc.name}参与解围` : `在${gatherLoc.name}集结待命`);
            return { ...nextLord, partyTroops: trained };
          }
          if (nextLord.state === 'BESIEGING') {
            const targetLoc = raidSource ? getLocationById(raidSource.factionRaidTargetId ?? '') : null;
            if (targetLoc && targetLoc.id !== nextLord.currentLocationId) {
              return moveTo(targetLoc, `前往${targetLoc.name}围攻`);
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
                    siegeEngines: ['SIMPLE_LADDER' as SiegeEngineType]
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
              return moveTo(feastHost, `前往${feastHost.name}赴宴`);
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
            nextLord = recordLordAction(nextLord, patrolBase.id, `在${patrolBase.name}附近巡逻`);
          }
          const trained = applyGarrisonTraining(nextLord.partyTroops, 2, getTroopTemplate);
          return { ...nextLord, partyTroops: trained };
        });
      }

      const findLocationById = (id: string) => newLocations.find(loc => loc.id === id);
      const lordCampMap = new Map(
        newLocations
          .filter(loc => loc.type === 'FIELD_CAMP' && loc.camp?.kind === 'LORD_MARCH' && loc.camp.lordId)
          .map(loc => [loc.camp?.lordId as string, loc])
      );
      const lordTravelers = nextLords.filter(lord => lord.travelDaysLeft && lord.targetLocationId);
      const preservedLocations = newLocations.filter(loc => !(loc.type === 'FIELD_CAMP' && loc.camp?.kind === 'LORD_MARCH'));
      const lordCamps = lordTravelers.map(lord => {
        const from = findLocationById(lord.currentLocationId) ?? findLocationById(lord.fiefId);
        const target = findLocationById(lord.targetLocationId ?? '');
        if (!from || !target || from.id === target.id) return null;
        const existing = lordCampMap.get(lord.id);
        const totalDays = existing?.camp?.totalDays ?? Math.max(1, Math.floor(lord.travelDaysLeft ?? 1));
        const daysLeft = Math.max(1, Math.floor(lord.travelDaysLeft ?? 1));
        const campName = `${lord.title}${lord.name}的行军营地`;
        return {
          id: existing?.id ?? `lord_march_${lord.id}`,
          name: campName,
          type: 'FIELD_CAMP',
          description: `向 ${target.name} 行军中（剩余 ${daysLeft} 天）`,
          coordinates: existing?.coordinates ?? { ...from.coordinates },
          terrain: from.terrain ?? target.terrain,
          owner: 'ENEMY' as const,
          garrison: lord.partyTroops.map(t => ({ ...t })),
          camp: {
            kind: 'LORD_MARCH',
            lordId: lord.id,
            sourceLocationId: from.id,
            targetLocationId: target.id,
            totalDays,
            daysLeft,
            attackerName: target.name,
            leaderName: `${lord.title}${lord.name}`,
            routeStart: existing?.camp?.routeStart ?? { ...from.coordinates },
            routeEnd: existing?.camp?.routeEnd ?? { ...target.coordinates }
          }
        } as Location;
      }).filter(Boolean) as Location[];
      newLocations = [...preservedLocations, ...lordCamps];

      const activeBattleCount = newLocations.filter(loc => loc.activeSiege).length;
      if (nextBattleTimeline.length === 0 || nextBattleTimeline[nextBattleTimeline.length - 1].day !== nextDay) {
        nextBattleTimeline.push({ day: nextDay, count: activeBattleCount });
      } else {
        nextBattleTimeline[nextBattleTimeline.length - 1] = { day: nextDay, count: activeBattleCount };
      }

      if (nextDay % 7 === 0) {
        const tierWageTable: Record<number, number> = { 1: 1, 2: 2, 3: 4, 4: 7, 5: 11, 6: 16 };
        const getUnitWage = (troop: { id: string; tier?: TroopTier; category?: string; heavyTier?: number }) => {
          const tier = (troop.tier ?? getTroopTemplate(troop.id)?.tier ?? 3) as unknown as number;
          let wage = tierWageTable[tier] ?? 4;
          const isHeavy = troop.category === 'HEAVY' || (troop.heavyTier ?? 0) > 0;
          if (isHeavy) wage = Math.round(wage * 2);
          return Math.max(0, Math.floor(wage));
        };

        const armyTroops = nextTroops ?? [];
        const armyWage = armyTroops.reduce((sum, t) => sum + getUnitWage(t) * Math.max(0, Math.floor(t.count ?? 0)), 0);
        const wounded = Array.isArray(nextPlayer.woundedTroops)
          ? nextPlayer.woundedTroops
          : buildWoundedEntriesFromSoldiers(Array.isArray(nextPlayer.soldiers) ? nextPlayer.soldiers : [], nextDay);
        const woundedWage = wounded.reduce((sum, e) => {
          const count = Math.max(0, Math.floor(e.count ?? 0));
          if (count <= 0) return sum;
          const tmpl = getTroopTemplate(e.troopId);
          const unit = getUnitWage({ id: e.troopId, tier: tmpl?.tier, category: tmpl?.category, heavyTier: tmpl?.heavyTier });
          return sum + unit * count;
        }, 0);

        const stationedTroops: Troop[] = [];
        newLocations.forEach(loc => {
          if (loc.owner !== 'PLAYER') return;
          if (loc.type === 'HIDEOUT') {
            const layers = loc.hideout?.layers ?? [];
            layers.forEach(layer => {
              (layer.garrison ?? []).forEach(t => stationedTroops.push({ ...t }));
            });
            return;
          }
          (loc.garrison ?? []).forEach(t => stationedTroops.push({ ...t }));
        });
        const stationedWage = stationedTroops.reduce((sum, t) => sum + getUnitWage(t) * Math.max(0, Math.floor(t.count ?? 0)), 0);
        const stationedDiscounted = Math.floor(stationedWage / 5);

        const leadership = Math.max(0, Math.floor(nextPlayer.attributes.leadership ?? 0));
        const leadershipRate = Math.min(0.4, leadership * 0.01);
        const baseTotal = armyWage + woundedWage + stationedDiscounted;
        const discounted = Math.floor(baseTotal * (1 - leadershipRate));
        const due = Math.max(0, Math.floor(discounted));
        const paid = Math.min(Math.max(0, Math.floor(newGold)), due);
        newGold = Math.max(0, Math.floor(newGold - paid));

        logsToAdd.push(`【军饷】本周应付 ${due} 第纳尔（统御 ${leadership}：-${Math.round(leadershipRate * 100)}%，驻军 1/5）。`);
        if (paid < due) logsToAdd.push(`【军饷不足】仅支付 ${paid} / ${due} 第纳尔。`);
      }

      if (rentCost > 0) logsToAdd.push(`在城内休息一天（-${rentCost} 第纳尔）。`);

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
    if (decisionsToAdd.length > 0) {
      setPendingDecisions(prev => [...prev, ...decisionsToAdd].slice(0, 24));
    }

    if ((nextPlayer.story?.endingId ?? '') === 'HIDEOUT_FALLEN') {
      setEndingReturnView('GAME_OVER');
      setView('ENDING');
      return;
    }

    const finalLocation = location ? syncedLocations.find(l => l.id === location.id) ?? location : undefined;
    if (finalLocation && finalLocation.type === 'HIDEOUT' && finalLocation.owner === 'PLAYER') {
      enterLocation(finalLocation);
      return;
    }
    if (!suppressEncounter && finalLocation && finalLocation.type !== 'TRAINING_GROUNDS' && finalLocation.type !== 'ASYLUM' && finalLocation.type !== 'CITY' && finalLocation.type !== 'MARKET' && finalLocation.type !== 'HOTPOT_RESTAURANT' && finalLocation.type !== 'BANDIT_CAMP' && finalLocation.type !== 'MYSTERIOUS_CAVE' && finalLocation.type !== 'COFFEE' && finalLocation.type !== 'IMPOSTER_PORTAL' && finalLocation.type !== 'WORLD_BOARD' && finalLocation.type !== 'ROACH_NEST' && finalLocation.type !== 'MAGICIAN_LIBRARY' && finalLocation.type !== 'HIDEOUT' && finalLocation.type !== 'SEAL_HABITAT') {
      const relationTarget = getLocationRelationTarget(finalLocation);
      const relationValue = relationTarget ? getRelationValue(playerRef.current, relationTarget.type, relationTarget.id) : 0;
      const encounterChance = getEncounterChance(0.18, relationValue);
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
         const ambushChance = getEncounterChance(0.26, relationValue);
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
    if (options?.skipSiegeProcessing) return syncedLocations;
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

  const enterLocation = (location: Location) => {
     if (location.type === 'FIELD_CAMP') {
       if (location.owner === 'ENEMY') {
         const troops = (location.garrison ?? []).map(t => ({ ...t }));
         const militiaTemplate = getTroopTemplate('militia');
         const defenseAddon = militiaTemplate ? [{ ...militiaTemplate, count: 8, xp: 0 }] : [];
         const withDefense = (location.buildings ?? []).includes('DEFENSE')
           ? mergeTroops(troops, defenseAddon)
           : troops;
        const isCaravan = location.camp?.kind === 'CARAVAN';
        const caravanMultiplier = Math.max(1, location.camp?.goldMultiplier ?? 3.0);
        const enemy: EnemyForce = {
           id: `field_camp_${Date.now()}`,
           name: location.camp?.attackerName ?? location.name,
          description: `${location.description}${(location.buildings ?? []).includes('DEFENSE') ? '营地四周有简易木栅与拒马。' : ''}${isCaravan ? ' 车阵里传来钱币与货箱碰撞声。' : ''}`,
           troops: withDefense,
          difficulty: isCaravan ? 'CARAVAN' : '一般',
          lootPotential: isCaravan ? caravanMultiplier : 1.0,
           terrain: location.terrain,
          baseTroopId: isCaravan ? 'caravan' : (withDefense[0]?.id ?? 'militia')
         };
         addLog(`你接近了 ${location.name}，敌军立即出营迎战！`);
         setActiveEnemy(enemy);
        setPendingBattleMeta({ mode: 'FIELD', targetLocationId: location.id, siegeContext: isCaravan ? '商队临时营地：车阵围成半环，护卫在木箱后方布防，适合防守反击。' : '临时营地：有简易木栅、拒马与壕沟，适合防守反击。' });
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
      if (!workState?.isActive && !habitatStayState?.isActive && !hideoutStayState?.isActive) {
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

     if (location.type === 'SEAL_HABITAT') {
       setCurrentLocation(location);
       if (!workState?.isActive && !habitatStayState?.isActive && !hideoutStayState?.isActive) {
         setView('TOWN');
         setTownTab('SEAL_HABITAT');
       }
       addLog(`抵达了 ${location.name}。`);
       return;
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
            { role: 'NPC', text: '黑纱之下传来低语：说出你的宗教名字与教义。回答四件事。' },
            { role: 'NPC', text: '你的信仰叫什么名字？' },
            { role: 'NPC', text: '你的神明掌管什么权柄？' },
            { role: 'NPC', text: '你的信徒如何散播恐惧？' },
            { role: 'NPC', text: '赐予他们何种禁忌的祝福？' }
          ]
        };
      });
      setAltarDrafts(prev => prev[location.id] ? prev : { ...prev, [location.id]: { religionName: '', domain: '', spread: '', blessing: '' } });
    }

    const localRelation = playerRef.current.locationRelations?.[location.id] ?? 0;
    if (localRelation <= -60 && location.owner !== 'PLAYER' && (location.type === 'CITY' || location.type === 'CASTLE' || location.type === 'VILLAGE')) {
      setCurrentLocation(location);
      setView('TOWN');
      addLog(`${location.name} 的守卫认出了你：你发现自己在通缉令上。`);
      addLocationLog(location.id, `守卫拦下了 ${playerRef.current.name}：此人被通缉。`);
      return;
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
    const isRecruitRefreshExcluded = location.type === 'MYSTERIOUS_CAVE' || location.type === 'IMPOSTER_PORTAL' || location.type === 'ALTAR';
     const shouldRefreshRecruit =
       !isRecruitRefreshExcluded &&
       (player.day - location.lastRefreshDay >= REFRESH_INTERVAL || (isHeavyTrialGrounds && location.mercenaries.length === 0));

     if (shouldRefreshRecruit) {
        // Generate Volunteers (Low tier, cheap)
        const volunteerPool = getRecruitmentPool(location, 'VOLUNTEER');
        const volunteerOffers: RecruitOffer[] = [];
        const extraBelievers = (() => {
          if (location.type !== 'CITY') return [];
          const faith = Math.max(0, Math.min(100, Math.floor(location.religion?.faith ?? 0)));
          const cap = getCityReligionTierCap(faith);
          if (cap <= 0) return [];
          const religion = getPlayerReligion();
          if (!religion || (religion.troopIds ?? []).length === 0) return [];
          return (religion.troopIds ?? [])
            .map(id => {
              const tmpl = getTroopTemplate(id);
              return tmpl ? { id, tier: tmpl.tier } : null;
            })
            .filter((x): x is { id: string; tier: TroopTier } => !!x && typeof x.tier === 'number')
            .filter(x => x.tier <= cap)
            .map(x => x.id);
        })();
        const combinedVolunteerPool = Array.from(new Set([...volunteerPool, ...extraBelievers]));
        if (combinedVolunteerPool.length > 0) {
          const shuffled = combinedVolunteerPool.slice().sort(() => Math.random() - 0.5);
          const offerCount = Math.max(1, Math.min(3, shuffled.length, 1 + Math.floor(Math.random() * 3)));
          for (let i = 0; i < offerCount; i += 1) {
            const templateId = shuffled[i];
            const template = getTroopTemplate(templateId);
            if (!template) continue;
            const count = Math.floor(Math.random() * 5) + 2 + player.attributes.leadership;
            volunteerOffers.push({ troopId: templateId, count, cost: template.cost });
          }
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
          } else if (Math.random() > 0.25) {
            const shuffled = mercPool.slice().sort(() => Math.random() - 0.5);
            const offerCount = Math.max(1, Math.min(3, shuffled.length, 1 + Math.floor(Math.random() * 3)));
            for (let i = 0; i < offerCount; i += 1) {
              const templateId = shuffled[i];
              const template = getTroopTemplate(templateId);
              if (!template) continue;
              const count = Math.floor(Math.random() * 3) + 1;
              mercOffers.push({ troopId: templateId, count, cost: Math.floor(template.cost * 1.5) });
            }
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
    } else if (location.type === 'HABITAT') {
      if (!workState?.isActive && !miningState?.isActive && !roachLureState?.isActive && !altarRecruitState?.isActive && !habitatStayState?.isActive && !hideoutStayState?.isActive) {
        setView('TOWN');
        setTownTab('HABITAT');
      }
    } else if (location.type === 'ALTAR') {
      if (!workState?.isActive && !miningState?.isActive && !roachLureState?.isActive && !altarRecruitState?.isActive && !habitatStayState?.isActive && !hideoutStayState?.isActive) {
        setView('TOWN');
        setTownTab('ALTAR');
      }
    } else if (MINE_CONFIGS[location.type]) {
      if (!workState?.isActive && !miningState?.isActive && !roachLureState?.isActive && !habitatStayState?.isActive && !hideoutStayState?.isActive) {
        setView('TOWN');
        setTownTab('MINING');
      }
    } else if (location.type === 'BLACKSMITH') {
      if (!workState?.isActive && !miningState?.isActive && !roachLureState?.isActive && !habitatStayState?.isActive && !hideoutStayState?.isActive) {
        setView('TOWN');
        setTownTab('FORGE');
      }
    } else if (location.type === 'MAGICIAN_LIBRARY') {
      if (!workState?.isActive && !miningState?.isActive && !roachLureState?.isActive && !altarRecruitState?.isActive && !habitatStayState?.isActive && !hideoutStayState?.isActive) {
        setView('TOWN');
        setTownTab('MAGICIAN_LIBRARY');
      }
    } else if (location.type === 'SOURCE_RECOMPILER') {
      if (!workState?.isActive && !miningState?.isActive && !roachLureState?.isActive && !altarRecruitState?.isActive && !habitatStayState?.isActive && !hideoutStayState?.isActive) {
        setView('TOWN');
        setTownTab('RECOMPILER');
      }
     } else {
       // Only set view to TOWN if not working.
       // The work loop will handle the view.
      if (!workState?.isActive && !miningState?.isActive && !roachLureState?.isActive && !habitatStayState?.isActive && !hideoutStayState?.isActive) {
        setView('TOWN');
        setTownTab('RECRUIT');
       }
     }
    addLocationLog(location.id, `有部队抵达：${playerRef.current.name}。`);
     addLog(`抵达了 ${location.name}。`);
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
    const enemyRace = getEnemyRace(enemy);
    const relationValue = enemyRace ? getRelationValue(playerRef.current, 'RACE', enemyRace) : 0;
    const encounterScale = getRelationScale(relationValue);
    const scaledEnemy: EnemyForce = {
      ...enemy,
      troops: enemy.troops.map(t => ({
        ...t,
        count: Math.max(1, Math.floor((t.count ?? 0) * encounterScale))
      }))
    };

    let supportTroops: Troop[] | null = null;
    let supportLabel = '';
    if (atLocation) {
      setCurrentLocation(atLocation);
      const relationTarget = getLocationRelationTarget(atLocation);
      const relationValue = relationTarget ? getRelationValue(playerRef.current, relationTarget.type, relationTarget.id) : 0;
      const locationRace = getLocationRace(atLocation);
      const enemyRace = getEnemyRace(scaledEnemy);
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
    setActiveEnemy(scaledEnemy);
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

  const getBattleRelationValue = () => {
    if (!activeEnemy) return 0;
    const target = pendingBattleMeta?.targetLocationId
      ? locations.find(l => l.id === pendingBattleMeta.targetLocationId) ?? null
      : null;
    const relationTarget = target ? getLocationRelationTarget(target) : null;
    if (relationTarget) return getRelationValue(playerRef.current, relationTarget.type, relationTarget.id);
    const enemyRace = getEnemyRace(activeEnemy);
    return enemyRace ? getRelationValue(playerRef.current, 'RACE', enemyRace) : 0;
  };

  const exitEncounter = (logText: string, cost?: number) => {
    if (typeof cost === 'number' && cost > 0) {
      setPlayer(prev => ({ ...prev, gold: Math.max(0, prev.gold - cost) }));
    }
    setActiveEnemy(null);
    setPendingBattleMeta(null);
    setPendingBattleIsTraining(false);
    setBattleError(null);
    setIsBattling(false);
    setIsBattleStreaming(false);
    setIsBattleResultFinal(true);
    setBattleResult(null);
    setBattleSnapshot(null);
    if (currentLocation && pendingBattleMeta?.targetLocationId === currentLocation.id) {
      setView('TOWN');
    } else {
      setView('MAP');
    }
    if (logText) addLog(logText);
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
    battleInfo?: BattleEngagementMeta
  ): BattleResult =>
    resolveBattleProgrammaticFn(battleTroops, enemyForce, terrain, currentPlayer, battleInfo, {
      getTroopTemplate,
      battlePlan,
      locations,
      getLocationDefenseDetails,
      getSiegeEngineName,
      siegeEngineCombatStats: SIEGE_ENGINE_COMBAT_STATS
    });

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
      acc[troop.id] = getDefaultLayerIdForTroop(troop, defaultLayers);
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
    const meta: BattleEngagementMeta = pendingBattleMeta ?? { mode: 'FIELD' };
    const currentPlayer = playerRef.current;
    const currentHeroes = heroesRef.current;
    const battleTroops = appendDefenseAidTroops(getBattleTroops(currentPlayer, currentHeroes), locations, meta);

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

  const startBattle = async (isTraining: boolean = false, meta?: BattleEngagementMeta) => {
    if (!activeEnemy) return;
    const battleInfo = meta ?? { mode: 'FIELD' as const };
    const currentPlayer = playerRef.current;
    let battleTroops = getBattleTroops(currentPlayer, heroesRef.current);

    battleTroops = appendDefenseAidTroops(battleTroops, locations, battleInfo);
    const battleLocationText = describeBattleLocationText(battleInfo, locations, currentLocation, currentPlayer);
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
      const deploymentContext = buildDeploymentContext(currentPlayer, heroesRef.current, activeEnemy, battleTroops);
      const { finalResult, localRewards, shouldStep, firstRoundReady } = await runBattlePipeline({
            battleTroops,
            activeEnemy,
            currentPlayer,
        battleInfo,
        battleResolutionMode,
        battleStreamEnabled,
            aiConfig,
        isTraining,
        deploymentContext,
        resolveBattleProgrammatic,
        onStreamRound: (streamedRounds) => {
                setBattleResult(prev => ({
                  rounds: streamedRounds,
                  outcome: prev?.outcome ?? 'A',
                  lootGold: prev?.lootGold ?? 0,
                  renownGained: prev?.renownGained ?? 0,
                  xpGained: prev?.xpGained ?? 0
                }));
                setCurrentRoundIndex(streamedRounds.length - 1);
        },
        onFirstRoundReady: () => {
                  setView('BATTLE_RESULT');
                  setIsBattling(false);
                }
      });

      setBattleResult(finalResult);
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
        const settlement = computeBattleSettlement({
          prev,
          heroes: heroesRef.current,
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
        });
        setPlayer(settlement.nextPlayer);
        setHeroes(settlement.nextHeroes);
        settlement.logs.forEach(addLog);
        if (settlement.garrisonUpdate) {
          const loc = locations.find(l => l.id === settlement.garrisonUpdate!.locationId);
          if (loc) updateLocationState({ ...loc, garrison: settlement.garrisonUpdate!.garrison });
        }
        setRecentBattleBriefs(prevBriefs => [settlement.battleBrief, ...(Array.isArray(prevBriefs) ? prevBriefs : [])].slice(0, 3));
        setWorldBattleReports(prevReports => [settlement.worldBattleReport, ...(Array.isArray(prevReports) ? prevReports : [])].slice(0, 12));
      }
      if (isTraining && localRewards.xp > 0) {
        const trainingResult = computeTrainingXpRewards({
          prev: playerRef.current,
          heroes: heroesRef.current,
          xpAmount: localRewards.xp,
          getTroopTemplate,
          getTroopRace,
          IMPOSTER_TROOP_IDS,
          canHeroBattle,
          normalizePlayerSoldiers,
          buildTroopsFromSoldiers,
          buildWoundedEntriesFromSoldiers,
          calculateXpGain
        });
        if (trainingResult) {
          setPlayer(trainingResult.nextPlayer);
          setHeroes(trainingResult.nextHeroes);
          addLog(trainingResult.log);
        }
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
    const woundedCount = (player.woundedTroops ?? []).reduce((sum, e) => sum + (e.count ?? 0), 0);
    const currentCount = player.troops.reduce((a, b) => a + b.count, 0) + woundedCount;
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

      return normalizePlayerSoldiers({
        ...prev,
        gold: prev.gold - totalCost,
        troops: newTroops
      });
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

  const consumeRecompilerSoldier = (payload: { soldierId: string; troopId: string; goldCost: number; crystalTier: number }) => {
    setPlayer(prev => {
      const normalized = normalizePlayerSoldiers(prev);
      const roster = Array.isArray(normalized.soldiers) ? normalized.soldiers.map(s => ({ ...s })) : [];
      const target = roster.find(s => s.id === payload.soldierId && s.status === 'ACTIVE');
      if (!target || target.troopId !== payload.troopId) return prev;
      const nextRoster = roster.filter(s => s.id !== payload.soldierId);
      const nextTroops = buildTroopsFromSoldiers(nextRoster);
      const nextMinerals = { ...(normalized.minerals as any) };
      const tierKey = payload.crystalTier as any;
      nextMinerals.HERO_CRYSTAL = { ...(nextMinerals.HERO_CRYSTAL ?? { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }) };
      nextMinerals.HERO_CRYSTAL[tierKey] = Math.max(0, (nextMinerals.HERO_CRYSTAL[tierKey] ?? 0) - 1);
      return {
        ...normalized,
        gold: Math.max(0, normalized.gold - payload.goldCost),
        soldiers: nextRoster,
        troops: nextTroops,
        minerals: nextMinerals,
        woundedTroops: buildWoundedEntriesFromSoldiers(nextRoster, normalized.day)
      };
    });
  };

  const handleUpgrade = (troopId: string, overrideTargetId?: string, soldierId?: string) => {
    const prev = playerRef.current;
    const normalized = normalizePlayerSoldiers(prev);
    const roster = Array.isArray(normalized.soldiers) ? normalized.soldiers : [];
    const eligibleSoldiers = roster.filter(s => s.troopId === troopId && s.status === 'ACTIVE' && s.xp >= s.maxXp);
    const chosenSoldier = soldierId ? roster.find(s => s.id === soldierId) : eligibleSoldiers[0];
    if (!chosenSoldier || chosenSoldier.troopId !== troopId) return;

    const troopIndex = prev.troops.findIndex(t => t.id === troopId);
    if (troopIndex === -1) return;
    const troop = prev.troops[troopIndex];
    const options = getUpgradeTargetOptions(troopId);
    const chosen = (overrideTargetId ?? options[0] ?? troop.upgradeTargetId ?? '').trim();
    if (!chosen) return;
    if (options.length > 0 && !options.includes(chosen)) return;
    if (chosenSoldier.xp < chosenSoldier.maxXp || prev.gold < troop.upgradeCost) return;
    
    const newTroops = [...prev.troops];
    newTroops[troopIndex] = { ...troop, count: troop.count - 1, xp: Math.max(0, troop.xp - troop.maxXp) };
    const targetTemplate = getTroopTemplate(chosen);
    if (!targetTemplate) return;
    const existingTargetIndex = newTroops.findIndex(t => t.id === targetTemplate.id);

    if (existingTargetIndex !== -1) {
      newTroops[existingTargetIndex].count += 1;
    } else {
      newTroops.push({ ...targetTemplate, count: 1, xp: 0 });
    }

    const nextRoster = roster.map(s => {
      if (s.id !== chosenSoldier.id) return s;
      return {
        ...s,
        troopId: targetTemplate.id,
        name: targetTemplate.name,
        tier: targetTemplate.tier,
        xp: Math.max(0, s.xp - s.maxXp),
        maxXp: targetTemplate.maxXp,
        history: [...(s.history ?? []), `Day ${prev.day} · 晋升为 ${targetTemplate.name}`]
      };
    });
    const nextTroops = buildTroopsFromSoldiers(nextRoster);
    addLog(`一名 ${troop.name}（${chosenSoldier.id}）晋升为 ${targetTemplate.name}！`);
    setPlayer({
      ...prev,
      gold: prev.gold - troop.upgradeCost,
      soldiers: nextRoster,
      troops: nextTroops,
      woundedTroops: buildWoundedEntriesFromSoldiers(nextRoster, prev.day)
    });
  };

  const handleDisband = (troopId: string, mode: 'ONE' | 'ALL') => {
    const prev = playerRef.current;
    const troop = prev.troops.find(t => t.id === troopId);
    if (!troop || troop.count <= 0) return;
    const remove = mode === 'ALL' ? troop.count : 1;
    const normalized = normalizePlayerSoldiers(prev);
    const roster = Array.isArray(normalized.soldiers) ? normalized.soldiers : [];
    const pool = roster.filter(s => s.troopId === troopId && s.status === 'ACTIVE');
    const removed = pool.slice(0, remove).map(s => s.id);
    const nextRoster = removeSoldiersById(roster, removed);
    const nextTroops = buildTroopsFromSoldiers(nextRoster);
    setPlayer({ ...normalized, soldiers: nextRoster, troops: nextTroops, woundedTroops: buildWoundedEntriesFromSoldiers(nextRoster, prev.day) });
    addLog(mode === 'ALL' ? `你遣散了全部 ${troop.name}。` : `你遣散了 1 名 ${troop.name}（${removed[0] ?? '未知'}）。`);
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
    const relationTarget = getLocationRelationTarget(location);
    if (relationTarget?.type === 'FACTION') {
      const factionPenalty = location.type === 'CITY' ? -20 : location.type === 'CASTLE' ? -16 : location.type === 'VILLAGE' ? -12 : -10;
      updateRelation(relationTarget.type, relationTarget.id, factionPenalty, `进攻 ${location.name}`);
    }
    if (relationTarget?.type === 'RACE') {
      const racePenalty = location.type === 'ROACH_NEST'
        ? -14
        : location.type === 'IMPOSTER_PORTAL'
          ? -14
          : location.type === 'GRAVEYARD'
            ? (isUndeadFortressLocation(location) ? -16 : -12)
            : location.type === 'BANDIT_CAMP'
              ? -10
              : location.type === 'MYSTERIOUS_CAVE'
                ? -12
                : location.type === 'ASYLUM'
                  ? -12
                  : -8;
      updateRelation(relationTarget.type, relationTarget.id, racePenalty, `进攻 ${location.name}`);
    }
    if (location.type === 'CITY' || location.type === 'CASTLE' || location.type === 'VILLAGE') {
      const lordPenalty = location.type === 'CITY' ? -18 : location.type === 'CASTLE' ? -14 : -10;
      const localPenalty = location.type === 'CITY' ? -28 : location.type === 'CASTLE' ? -24 : -18;
      if (location.lord) {
        updateLordRelation(location.id, lordPenalty, `遭到玩家围攻`);
      }
      updateLocationRelation(location.id, localPenalty, `围攻 ${location.name}`);
    }
    setActiveEnemy(enemy);
    setPendingBattleMeta({ mode: 'SIEGE', targetLocationId: location.id, siegeContext });
    setPendingBattleIsTraining(false);
    setView('BATTLE');
  };

  const closeBattleResult = () => {
    if (pendingBattleIsTraining) {
      setBattleResult(null);
      setActiveEnemy(null);
      setIsBattling(false);
      setIsBattleStreaming(false);
      setIsBattleResultFinal(true);
      setBattleMeta(null);
      setBattleSnapshot(null);
      setPendingBattleMeta(null);
      setPendingBattleIsTraining(false);
      setView('TRAINING');
      return;
    }
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
          if (target.type === 'IMPOSTER_PORTAL') {
            setPlayer(prev => ({
              ...prev,
              story: {
                ...(prev.story ?? {}),
                gameOverReason: 'PORTAL_CLEARED',
                endingId: 'PORTAL_CLEARED'
              }
            }));
            setPortalEndingChoiceMade(false);
            setEndingReturnView('GAME_OVER');
            setView('ENDING');
          }
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
      if (target?.type !== 'IMPOSTER_PORTAL' || battleResult?.outcome !== 'A') setView('MAP');
      return;
    }

    if (battleMeta?.mode === 'FIELD' && battleMeta.targetLocationId) {
      if (battleMeta.siegeContext === 'HIDEOUT_REBELLION') {
        const target = locations.find(l => l.id === battleMeta.targetLocationId && l.type === 'HIDEOUT');
        if (target && battleResult) {
          if (battleResult.outcome === 'A') {
            setLocations(prev => prev.map(l => {
              if (l.id !== target.id || l.type !== 'HIDEOUT' || !l.hideout) return l;
              const gov = l.hideout.governance ?? { stability: 60, productivity: 55, prosperity: 50, harmony: 55 };
              const clampPct = (v: number) => Math.max(0, Math.min(100, Math.floor(v)));
              return {
                ...l,
                hideout: {
                  ...l.hideout,
                  governance: {
                    ...gov,
                    stability: clampPct(gov.stability + 18),
                    harmony: clampPct(gov.harmony + 8),
                    productivity: clampPct(gov.productivity - 4),
                    prosperity: clampPct(gov.prosperity - 2)
                  }
                }
              };
            }));
            addLog(`【叛乱平定】你镇压了 ${target.name} 的叛军，地下秩序暂时恢复。`);
            addLocationLog(target.id, '叛乱被镇压，稳定性回升。');
          } else {
            setPlayer(prev => ({
              ...prev,
              story: { ...(prev.story ?? {}), endingId: 'HIDEOUT_REBELLION', gameOverReason: 'HIDEOUT_REBELLION' }
            }));
            addLog(`【叛乱失败】你未能守住 ${target.name}。叛军夺取了隐匿点。`);
            addLocationLog(target.id, '叛军夺取了隐匿点。');
            setEndingReturnView('GAME_OVER');
            setView('ENDING');
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
        if (!target || battleResult?.outcome !== 'B') setView('MAP');
        return;
      }
      const camp = locations.find(l => l.id === battleMeta.targetLocationId && l.type === 'FIELD_CAMP');
      if (camp && battleResult) {
        if (battleResult.outcome === 'A') {
          const meta = camp.camp;
          setLocations(prev => {
            let next = prev.filter(l => l.id !== camp.id);
            if (meta && meta.kind !== 'CARAVAN') {
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
          addLog(meta?.kind === 'CARAVAN' ? `你洗劫了 ${camp.name}。` : `你摧毁了 ${camp.name}。`);
          if (meta?.targetLocationId && meta.kind !== 'CARAVAN') addLocationLog(meta.targetLocationId, `${meta.attackerName} 的行军营地被击溃。`);
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
      let endTriggered = false;
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
           updateLocationRelation(target.id, relationDelta, `协助守城 ${target.name}`);
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
            if (target.type === 'HIDEOUT') {
              const hideout = target.hideout;
              const layers = hideout?.layers ?? [];
              const idx = target.activeSiege?.hideoutLayerIndex ?? hideout?.selectedLayer ?? 0;
              const layerIndex = Math.max(0, Math.min(layers.length - 1, Math.floor(idx)));
              const nextLayers = layers.map((layer, i) => i === layerIndex ? { ...layer, garrison: [] } : layer);
              const isLast = layers.length > 0 && layerIndex >= layers.length - 1;
              const nextHideout = hideout ? { ...hideout, layers: nextLayers, selectedLayer: Math.min(layerIndex + 1, Math.max(0, layers.length - 1)) } : hideout;
              if (isLast) {
                updateLocationState({ ...target, hideout: nextHideout, activeSiege: undefined, isUnderSiege: false });
                setPlayer(prev => ({
                  ...prev,
                  story: { ...(prev.story ?? {}), gameOverReason: 'HIDEOUT_FALLEN', endingId: 'HIDEOUT_FALLEN' }
                }));
                addLog(`战斗失利，${target.name} 最后一层失守。`);
                addLocationLog(target.id, `最后防线失守，隐匿点沦陷。`);
                setEndingReturnView('GAME_OVER');
                setView('ENDING');
                endTriggered = true;
              } else {
                const nextSiege = { ...target.activeSiege, hideoutLayerIndex: layerIndex + 1 };
                updateLocationState({ ...target, hideout: nextHideout, activeSiege: nextSiege, isUnderSiege: true });
                addLog(`战斗失利，${target.name} 的守军全灭，第 ${layerIndex + 1} 层失守，围攻向更深处推进。`);
                addLocationLog(target.id, `守军全灭，第 ${layerIndex + 1} 层失守。`);
              }
            } else {
              const attackerFactionId = target.activeSiege?.attackerFactionId;
              updateLocationState({
                ...target,
                owner: 'ENEMY',
                factionId: attackerFactionId ?? target.factionId,
                garrison: [],
                activeSiege: undefined,
                isUnderSiege: false
              });
              addLog(`战斗失利，${target.name} 守军全灭。据点陷落。`);
              addLocationLog(target.id, `守军全灭，据点陷落。`);
            }
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
      if (!endTriggered) setView('TOWN');
      return;
    }

    // Check if we just defeated a Bandit Camp
    if (activeEnemy && currentLocation && currentLocation.type === 'BANDIT_CAMP' && battleResult?.outcome === 'A') {
        const isGoblinCamp = currentLocation.id.startsWith('goblin_camp_');
        const prestigeGain = isGoblinCamp ? PRESTIGE.GOBLIN_CAMP_DESTROY : PRESTIGE.BANDIT_CAMP_DESTROY;
        setLocations(prev => prev.filter(l => l.id !== currentLocation.id));
        setPlayer(p => ({ ...p, prestige: (p.prestige ?? 0) + prestigeGain }));
        addLog(isGoblinCamp ? "你成功捣毁了哥布林营地！这地方暂时安静了。" : "你成功捣毁了劫匪窝点！这地方以后安全了。");
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
      const isGoblinCamp = !!currentLocation && currentLocation.type === 'BANDIT_CAMP' && currentLocation.id.startsWith('goblin_camp_');
      if (action === 'ATTACK') {
          const banditTroops = buildBanditTroops(currentLocation ?? null, player.day);
          
          const enemy: EnemyForce = {
              name: isGoblinCamp ? '哥布林营地' : '劫匪大本营',
              description: isGoblinCamp ? '矮棚与陷阱连成一片，绿皮正在集结。' : '聚集了大量亡命之徒。',
              troops: banditTroops,
              difficulty: '一般',
              lootPotential: 3.0, // High reward
              terrain: 'BANDIT_CAMP',
              baseTroopId: isGoblinCamp ? 'goblin_scavenger' : 'peasant'
          };
          setActiveEnemy(enemy);
          setPendingBattleMeta({ mode: 'FIELD' });
          setPendingBattleIsTraining(false);
          setView('BATTLE');
      } else {
          // Sneak
          if (Math.random() > 0.7) { // 30% fail
              addLog(isGoblinCamp ? "潜行失败！哥布林哨兵发出尖叫，营地沸腾起来！" : "潜行失败！哨兵发现了你的踪迹！");
              handleBanditAction('ATTACK');
          } else {
              addLog(isGoblinCamp ? "你绕开陷阱区悄悄撤离，营地还没反应过来。" : "你带着部队悄悄溜走了，没有惊动任何人。");
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
    const currentCount = player.troops.reduce((a, b) => a + b.count, 0) + (player.woundedTroops ?? []).reduce((sum, e) => sum + (e.count ?? 0), 0);
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
        if (tier === TroopTier.TIER_1) return { attack: 30, defense: 20, agility: 25, hp: 30, range: 5, morale: 25 };
        if (tier === TroopTier.TIER_2) return { attack: 75, defense: 85, agility: 50, hp: 80, range: 5, morale: 75 };
        if (tier === TroopTier.TIER_3) return { attack: 110, defense: 115, agility: 70, hp: 110, range: 5, morale: 110 };
        if (tier === TroopTier.TIER_4) return { attack: 155, defense: 150, agility: 90, hp: 145, range: 5, morale: 140 };
        return { attack: 220, defense: 185, agility: 115, hp: 170, range: 5, morale: 170 };
      };
      const capByTier: Record<number, number> = { 1: 85, 2: 115, 3: 150, 4: 185, 5: 225 };
      const sanitizeShaperAttributes = (tier: TroopTier, raw: any) => {
        const cap = capByTier[tier] ?? 85;
        const base = buildShaperAttributes(tier);
        if (!raw || typeof raw !== 'object') return base;
        return {
          attack: clampInt(raw.attack, 0, cap),
          defense: clampInt(raw.defense, 0, cap),
          agility: clampInt(raw.agility, 0, cap),
          hp: clampInt(raw.hp, 0, cap),
          range: clampInt(raw.range, 0, cap),
          morale: clampInt(raw.morale, 0, cap)
        };
      };
      const sanitizeShaperRace = (raw: any) => {
        const val = String(raw ?? '').toUpperCase().trim();
        const allowed = new Set(['HUMAN', 'ROACH', 'UNDEAD', 'IMPOSTER', 'BANDIT', 'AUTOMATON', 'VOID', 'MADNESS', 'UNKNOWN']);
        return allowed.has(val) ? val : 'UNKNOWN';
      };

      const troop = proposal.troop;
      const troopTemplate = troop ? (() => {
        const race = sanitizeShaperRace((troop as any).race);
        const id = `shaped_${race.toLowerCase()}_${Date.now()}`;
        const tier = clampInt((troop as any).tier, 1, 5) as TroopTier;
        const basePower = clampInt((troop as any).basePower, 1, 9999);
        const maxXp = clampInt((troop as any).maxXp, 10, 2000);
        const upgradeCost = clampInt((troop as any).upgradeCost, 0, 1000000);
        const name = String((troop as any).name || '裁缝的造物').slice(0, 40);
        const description = String((troop as any).description || '沉默的造物。').slice(0, 500);
        const equipmentRaw = Array.isArray((troop as any).equipment) ? (troop as any).equipment : [];
        const equipment = equipmentRaw.map((x: any) => String(x)).filter(Boolean).slice(0, 5);
        const upgradeTargetId = String((troop as any).upgradeTargetId || '').trim();
        const attributes = sanitizeShaperAttributes(tier, (troop as any).attributes);
        return {
          id,
          name,
          race: race as any,
          tier,
          basePower,
          cost: Math.max(0, clampInt(proposal.price, 0, 1000000)),
          upgradeCost,
          maxXp,
          upgradeTargetId: upgradeTargetId ? upgradeTargetId : undefined,
          description,
          equipment: equipment.length > 0 ? equipment : ['破剪刀'],
          attributes
        } as Omit<Troop, 'count' | 'xp'>;
      })() : undefined;

      setShaperProposal({
        decision: proposal.decision,
        npcReply: proposal.npcReply,
        price: Math.max(0, proposal.price),
        troopTemplate,
        troopForPrompt: troop ? {
          name: troopTemplate?.name ?? String((troop as any).name || '裁缝的造物').slice(0, 40),
          race: troopTemplate?.race ?? (sanitizeShaperRace((troop as any).race) as any),
          tier: troopTemplate?.tier ?? (clampInt((troop as any).tier, 1, 5) as any),
          basePower: troopTemplate?.basePower ?? clampInt((troop as any).basePower, 1, 9999),
          maxXp: troopTemplate?.maxXp ?? clampInt((troop as any).maxXp, 10, 2000),
          upgradeCost: troopTemplate?.upgradeCost ?? clampInt((troop as any).upgradeCost, 0, 1000000),
          upgradeTargetId: troopTemplate?.upgradeTargetId,
          description: troopTemplate?.description ?? String((troop as any).description || '沉默的造物。').slice(0, 500),
          equipment: troopTemplate?.equipment ?? (Array.isArray((troop as any).equipment) ? (troop as any).equipment : []).map((x: any) => String(x)).filter(Boolean).slice(0, 5),
          attributes: troopTemplate?.attributes ?? sanitizeShaperAttributes((clampInt((troop as any).tier, 1, 5) as TroopTier), (troop as any).attributes)
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
    const religionName = String((doctrine as any).religionName ?? '').trim() || String(doctrine.domain ?? '').trim() || '无名信仰';
    const doctrineSuffix = `隶属于「${religionName}」`;
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
        description: appendDoctrineSuffix(String(troop.description || `信仰：${religionName}。教义：${doctrine.domain}。`)).slice(0, 500),
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
        doctrine: religionName,
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
    const { updatedProfiles, activeId } = buildUpdatedProfiles(
      openAIProfiles,
      activeOpenAIProfileId,
      openAIProfileName,
      openAIBaseUrl,
      openAIKey,
      openAIModel
    );
    setOpenAIProfiles(updatedProfiles);
    setActiveOpenAIProfileId(activeId);
    persistAISettingsToStorage({
      aiProvider,
      doubaoApiKey,
      geminiApiKey,
      openAIBaseUrl,
      openAIKey,
      openAIModel,
      openAIProfiles: updatedProfiles,
      activeOpenAIProfileId: activeId,
      openAIProfileName,
      battleStreamEnabled,
      battleResolutionMode,
      heroChatterEnabled,
      heroChatterMinMinutes,
      heroChatterMaxMinutes
    });
  };

  const selectOpenAIProfile = (profileId: string) => {
    const profile = selectAIProfileState(openAIProfiles, profileId);
    if (!profile) return;
    setActiveOpenAIProfileId(profile.id);
    setOpenAIProfileName(profile.name);
    setOpenAIBaseUrl(profile.baseUrl);
    setOpenAIKey(profile.key);
    setOpenAIModel(profile.model);
    setOpenAIModels([]);
  };

  const addOpenAIProfile = () => {
    const { profile: newProfile, updated } = createNextAIProfile(openAIProfiles);
    setOpenAIProfiles(updated);
    setActiveOpenAIProfileId(newProfile.id);
    setOpenAIProfileName(newProfile.name);
    setOpenAIBaseUrl(newProfile.baseUrl);
    setOpenAIKey('');
    setOpenAIModel('');
    setOpenAIModels([]);
  };

  const SAVEGAME_SCHEMA_VERSION = 1 as const;
  type SaveGame = {
    meta: {
      schemaId: 'CALRADIA_CHRONICLES';
      schemaVersion: typeof SAVEGAME_SCHEMA_VERSION;
      timestamp: number;
      createdAt: string;
    };
    world: {
      locations: Location[];
      logs: string[];
      recentBattleBriefs: BattleBrief[];
      worldBattleReports: WorldBattleReport[];
      worldDiplomacy: WorldDiplomacyState;
      battleTimeline: Array<{ day: number; count: number }>;
    };
    entities: {
      heroes: Hero[];
      lords: Lord[];
    };
    player: PlayerState;
    ui: {
      view: GameView;
      currentLocationId: string | null;
      townTab: typeof townTab;
      workDays: number;
      miningDays: number;
      roachLureDays: number;
      trainingMyArmy: { id: string; count: number }[];
      trainingEnemyArmy: { id: string; count: number }[];
      trainInputMy: { id: string; count: number };
      trainInputEnemy: { id: string; count: number };
    };
    systems: {
      customTroopTemplates: Record<string, Omit<Troop, 'count' | 'xp'>>;
      shaperDialogue: typeof shaperDialogue;
      shaperInput: string;
      shaperProposal: typeof shaperProposal;
      altarDialogues: typeof altarDialogues;
      altarDrafts: typeof altarDrafts;
      altarProposals: typeof altarProposals;
      altarRecruitDays: number;
    };
    settings: {
      battleStreamEnabled: boolean;
      battleResolutionMode: 'AI' | 'PROGRAM';
      aiProvider: AIProvider;
      doubaoApiKey: string;
      geminiApiKey: string;
      heroChatterEnabled?: boolean;
      heroChatterMinMinutes?: number;
      heroChatterMaxMinutes?: number;
      openAIProfiles: typeof openAIProfiles;
      openAIActiveProfileId: typeof activeOpenAIProfileId;
      openAI: {
        baseUrl: string;
        key: string;
        model: string;
      };
    };
  };

  const buildSaveGame = (): SaveGame => ({
    meta: {
      schemaId: 'CALRADIA_CHRONICLES',
      schemaVersion: SAVEGAME_SCHEMA_VERSION,
      timestamp: Date.now(),
      createdAt: new Date().toISOString()
    },
    world: {
      locations,
      logs,
      recentBattleBriefs,
      worldBattleReports,
      worldDiplomacy,
      battleTimeline
    },
    entities: {
      heroes,
      lords
    },
    player,
    ui: {
      view,
      currentLocationId: currentLocation?.id ?? null,
      townTab,
      workDays,
      miningDays,
      roachLureDays,
      trainingMyArmy,
      trainingEnemyArmy,
      trainInputMy,
      trainInputEnemy
    },
    systems: {
      customTroopTemplates,
      shaperDialogue,
      shaperInput,
      shaperProposal,
      altarDialogues,
      altarDrafts,
      altarProposals,
      altarRecruitDays
    },
    settings: {
      battleStreamEnabled,
      battleResolutionMode,
      openAIProfiles,
      openAIActiveProfileId: activeOpenAIProfileId,
      aiProvider,
      doubaoApiKey,
      geminiApiKey,
      heroChatterEnabled,
      heroChatterMinMinutes,
      heroChatterMaxMinutes,
      openAI: {
        baseUrl: openAIBaseUrl,
        key: openAIKey,
        model: openAIModel
      }
    }
  });

  const [saveSlots, setSaveSlots] = useState<SaveSlotMeta[]>(() => readSaveIndex());
  const [selectedSaveId, setSelectedSaveId] = useState<string | null>(() => {
    const raw = localStorage.getItem(SAVE_SELECTED_KEY);
    return raw ? raw : null;
  });

  useEffect(() => {
    if (!selectedSaveId) localStorage.removeItem(SAVE_SELECTED_KEY);
    else localStorage.setItem(SAVE_SELECTED_KEY, selectedSaveId);
  }, [selectedSaveId]);

  const upsertSaveSlot = (meta: SaveSlotMeta) => {
    setSaveSlots(prev => {
      const list = Array.isArray(prev) ? prev.slice() : [];
      const idx = list.findIndex(s => s.id === meta.id);
      const next = idx >= 0 ? list.map(s => (s.id === meta.id ? { ...s, ...meta } : s)) : [...list, meta];
      writeSaveIndex(next);
      return next;
    });
  };

  const deleteSaveSlot = (id: string) => {
    const safeId = String(id);
    if (!safeId || safeId === AUTO_SAVE_ID) return;
    try {
      localStorage.removeItem(`${SAVE_DATA_PREFIX}${safeId}`);
    } catch {}
    setSaveSlots(prev => {
      const next = (prev ?? []).filter(s => s.id !== safeId);
      writeSaveIndex(next);
      return next;
    });
    setSelectedSaveId(prev => (prev === safeId ? null : prev));
  };

  const writeSavePayload = (slotId: string, name: string, isAuto: boolean, payload: SaveGame) => {
    const id = String(slotId);
    localStorage.setItem(`${SAVE_DATA_PREFIX}${id}`, JSON.stringify(payload));
    upsertSaveSlot({
      id,
      name: name || '未命名存档',
      createdAt: isAuto ? (saveSlots.find(s => s.id === id)?.createdAt ?? payload.meta.timestamp) : payload.meta.timestamp,
      updatedAt: payload.meta.timestamp,
      isAuto,
      day: payload.player.day,
      level: payload.player.level,
      renown: payload.player.renown,
      endingId: payload.player.story?.endingId ?? payload.player.story?.gameOverReason
    });
  };

  useEffect(() => {
    if (view === 'MAIN_MENU' || view === 'INTRO' || view === 'ENDING' || view === 'GAME_OVER') return;
    if (view === 'BATTLE' || view === 'BATTLE_RESULT') return;
    const timer = window.setTimeout(() => {
      try {
        const payload = buildSaveGame();
        payload.ui.view = 'MAP';
        payload.ui.currentLocationId = null;
        writeSavePayload(AUTO_SAVE_ID, '自动存档', true, payload);
      } catch {}
    }, 1200);
    return () => window.clearTimeout(timer);
  }, [player.day, player.gold, player.renown, player.level, player.story?.endingId, view]);

  const createBlankSaveSlot = () => {
    try {
      const world = buildInitialWorld();
      const now = Date.now();
      const id = `SLOT_${now}_${Math.floor(Math.random() * 10000)}`;
      const label = `空白存档 ${new Date(now).toLocaleString('zh-CN', { hour12: false })}`;
      const basePlayer: PlayerState = {
        ...INITIAL_PLAYER_STATE,
        story: {
          ...(INITIAL_PLAYER_STATE.story ?? {}),
          introSeen: false,
          mainQuest: 'CLEANSE_PORTALS',
          mainQuestStage: 1,
          gameOverReason: undefined,
          endingId: undefined
        }
      };
      const seededLocations = world.locations.map(l => l.type === 'CITY'
        ? { ...l, workBoard: { lastRefreshDay: basePlayer.day, contracts: buildWorkContractsForCity(l, basePlayer.day) } }
        : l
      );
      const seededHeroes = buildRandomizedHeroes();
      const payload: SaveGame = {
        meta: {
          schemaId: 'CALRADIA_CHRONICLES',
          schemaVersion: SAVEGAME_SCHEMA_VERSION,
          timestamp: now,
          createdAt: new Date(now).toISOString()
        },
        world: {
          locations: seededLocations,
          logs: ["欢迎来到《卡拉迪亚编年史》。拖动地图探索，滚轮缩放，点击据点移动。"],
          recentBattleBriefs: [],
          worldBattleReports: [],
          worldDiplomacy: buildInitialWorldDiplomacy(),
          battleTimeline: [{ day: basePlayer.day, count: 0 }]
        },
        entities: {
          heroes: seededHeroes,
          lords: world.lords
        },
        player: basePlayer,
        ui: {
          view: 'INTRO',
          currentLocationId: null,
          townTab: 'RECRUIT',
          workDays: 1,
          miningDays: 2,
          roachLureDays: 2,
          trainingMyArmy: [],
          trainingEnemyArmy: [],
          trainInputMy: { id: '', count: 0 },
          trainInputEnemy: { id: '', count: 0 }
        },
        systems: {
          customTroopTemplates: {},
          shaperDialogue: [{ role: 'NPC', text: '别站门口挡风。说吧，你想让我缝出什么兵？' }],
          shaperInput: '',
          shaperProposal: null,
          altarDialogues: {},
          altarDrafts: {},
          altarProposals: {},
          altarRecruitDays: 2
        },
        settings: {
          battleStreamEnabled,
          battleResolutionMode,
          openAIProfiles,
          openAIActiveProfileId: activeOpenAIProfileId,
          aiProvider,
          doubaoApiKey,
          geminiApiKey,
          heroChatterEnabled,
          heroChatterMinMinutes,
          heroChatterMaxMinutes,
          openAI: {
            baseUrl: openAIBaseUrl,
            key: openAIKey,
            model: openAIModel
          }
        }
      };
      writeSavePayload(id, label, false, payload);
      setSelectedSaveId(id);
    } catch {}
  };

  const loadSaveSlot = (preferredId?: string) => {
    const candidates = [preferredId, selectedSaveId, AUTO_SAVE_ID].filter(Boolean) as string[];
    for (const id of candidates) {
      try {
        const raw = localStorage.getItem(`${SAVE_DATA_PREFIX}${id}`);
        if (!raw) continue;
        setEndingReturnView('GAME_OVER');
        importSaveData(raw, { silent: true });
        return;
      } catch {}
    }
  };

  const createManualSave = () => {
    try {
      const payload = buildSaveGame();
      const now = Date.now();
      const id = `SLOT_${now}_${Math.floor(Math.random() * 10000)}`;
      const label = manualSaveName.trim() || `手动存档 第${player.day}天 ${new Date(now).toLocaleString('zh-CN', { hour12: false })}`;
      writeSavePayload(id, label, false, payload);
      setSelectedSaveId(id);
      setManualSaveName('');
      setSaveDataNotice(`已保存：${label}`);
    } catch (e: any) {
      setSaveDataNotice(e?.message || '手动存档失败。');
    }
  };

  const exportSaveData = () => {
    try {
      const payload = buildSaveGame();
      const json = JSON.stringify(payload, null, 2);
      setSaveDataText(json);
      setSaveDataNotice('存档已生成，已填入文本框。');
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `calradia-save-v${payload.meta.schemaVersion}-day-${player.day}.json`;
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
    const allowed: GameView[] = ['MAIN_MENU', 'INTRO', 'MAP', 'TOWN', 'HIDEOUT_INSPECT', 'PARTY', 'CHARACTER', 'BILLS', 'TRAINING', 'ASYLUM', 'MARKET', 'BANDIT_ENCOUNTER', 'CAVE', 'BATTLE', 'BATTLE_RESULT', 'ENDING', 'GAME_OVER', 'HERO_CHAT', 'WORLD_BOARD', 'TROOP_ARCHIVE', 'RELATIONS', 'OBSERVER_MODE'];
    if (!allowed.includes(safe)) return 'MAP';
    if (safe === 'ENDING' || safe === 'GAME_OVER' || safe === 'BATTLE' || safe === 'BATTLE_RESULT') return 'MAP';
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
    const mergedAttributes = (() => {
      const raw = hero.attributes ?? base.attributes ?? { attack: 10, hp: 80, agility: 10 };
      return {
        attack: typeof raw.attack === 'number' ? raw.attack : 10,
        hp: typeof raw.hp === 'number' ? raw.hp : 80,
        agility: typeof raw.agility === 'number' ? raw.agility : 10,
        leadership: typeof raw.leadership === 'number' ? raw.leadership : 0
      };
    })();

    return {
      ...base,
      ...hero,
      race: mergedRace,
      attributes: mergedAttributes,
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

  useEffect(() => {
    setPlayer(prev => normalizePlayerSoldiers(prev));
  }, [player.troops, player.soldiers?.length]);

  useEffect(() => {
    if ((player.story?.introSeen ?? false) === true) return;
    if (player.day > 1) return;
    if (view === 'MAIN_MENU' || view === 'ENDING' || view === 'OBSERVER_MODE') return;
    setView(prev => (prev === 'INTRO' ? prev : 'INTRO'));
  }, [player.day, player.story?.introSeen, view]);

  const importSaveData = (rawText?: string, options?: { silent?: boolean; forceView?: GameView }) => {
    try {
      const sourceText = typeof rawText === 'string' ? rawText : saveDataText;
      const parsed = JSON.parse(sourceText);
      const migrateToSaveGame = (raw: any): SaveGame => {
        const isNew = raw?.meta?.schemaId === 'CALRADIA_CHRONICLES' && raw?.meta?.schemaVersion === SAVEGAME_SCHEMA_VERSION;
        if (isNew) return raw as SaveGame;
        const legacy = raw ?? {};
        const legacyPlayer = legacy?.player as PlayerState | undefined;
        const legacyLocations = legacy?.locations as Location[] | undefined;
        const legacyHeroes = legacy?.heroes as Hero[] | undefined;
        const legacyLords = legacy?.lords as Lord[] | undefined;
        return {
          meta: {
            schemaId: 'CALRADIA_CHRONICLES',
            schemaVersion: SAVEGAME_SCHEMA_VERSION,
            timestamp: typeof legacy?.savedAt === 'number' ? legacy.savedAt : Date.now(),
            createdAt: new Date(typeof legacy?.savedAt === 'number' ? legacy.savedAt : Date.now()).toISOString()
          },
          world: {
            locations: Array.isArray(legacyLocations) ? legacyLocations : [],
            logs: Array.isArray(legacy?.logs) ? legacy.logs : [],
            recentBattleBriefs: Array.isArray(legacy?.recentBattleBriefs) ? legacy.recentBattleBriefs : [],
            worldBattleReports: Array.isArray(legacy?.worldBattleReports) ? legacy.worldBattleReports : [],
            worldDiplomacy: legacy?.worldDiplomacy ?? buildInitialWorldDiplomacy(),
            battleTimeline: Array.isArray(legacy?.battleTimeline) ? legacy.battleTimeline : []
          },
          entities: {
            heroes: Array.isArray(legacyHeroes) ? legacyHeroes : [],
            lords: Array.isArray(legacyLords) ? legacyLords : []
          },
          player: legacyPlayer ?? INITIAL_PLAYER_STATE,
          ui: {
            view: legacy?.view ?? 'MAP',
            currentLocationId: typeof legacy?.currentLocationId === 'string' ? legacy.currentLocationId : null,
            townTab: legacy?.townTab ?? 'RECRUIT',
            workDays: typeof legacy?.workDays === 'number' ? legacy.workDays : 1,
            miningDays: typeof legacy?.miningDays === 'number' ? legacy.miningDays : 2,
            roachLureDays: typeof legacy?.roachLureDays === 'number' ? legacy.roachLureDays : 2,
            trainingMyArmy: Array.isArray(legacy?.trainingMyArmy) ? legacy.trainingMyArmy : trainingMyArmy,
            trainingEnemyArmy: Array.isArray(legacy?.trainingEnemyArmy) ? legacy.trainingEnemyArmy : trainingEnemyArmy,
            trainInputMy: legacy?.trainInputMy ?? trainInputMy,
            trainInputEnemy: legacy?.trainInputEnemy ?? trainInputEnemy
          },
          systems: {
            customTroopTemplates: legacy?.customTroopTemplates ?? {},
            shaperDialogue: Array.isArray(legacy?.shaperDialogue) ? legacy.shaperDialogue : shaperDialogue,
            shaperInput: typeof legacy?.shaperInput === 'string' ? legacy.shaperInput : '',
            shaperProposal: legacy?.shaperProposal ?? null,
            altarDialogues: legacy?.altarDialogues ?? {},
            altarDrafts: legacy?.altarDrafts ?? {},
            altarProposals: legacy?.altarProposals ?? {},
            altarRecruitDays: typeof legacy?.altarRecruitDays === 'number' ? legacy.altarRecruitDays : 2
          },
          settings: {
            battleStreamEnabled: typeof legacy?.battleStreamEnabled === 'boolean' ? legacy.battleStreamEnabled : battleStreamEnabled,
            battleResolutionMode: legacy?.battleResolutionMode === 'AI' || legacy?.battleResolutionMode === 'PROGRAM' ? legacy.battleResolutionMode : battleResolutionMode,
            openAIProfiles: Array.isArray(legacy?.openAIProfiles) ? legacy.openAIProfiles : [],
            openAIActiveProfileId: typeof legacy?.openAIActiveProfileId === 'string' ? legacy.openAIActiveProfileId : null,
            aiProvider: typeof legacy?.aiProvider === 'string' ? legacy.aiProvider : aiProvider,
            doubaoApiKey: typeof legacy?.doubaoApiKey === 'string' ? legacy.doubaoApiKey : doubaoApiKey,
            geminiApiKey: typeof legacy?.geminiApiKey === 'string' ? legacy.geminiApiKey : geminiApiKey,
            openAI: legacy?.openAI ?? { baseUrl: openAIBaseUrl, key: openAIKey, model: openAIModel }
          }
        };
      };

      const save = migrateToSaveGame(parsed);
      const nextPlayer = save?.player as PlayerState | undefined;
      const nextLocations = save?.world?.locations as Location[] | undefined;
      const nextHeroes = save?.entities?.heroes as Hero[] | undefined;
      const nextLords = save?.entities?.lords as Lord[] | undefined;
      if (!nextPlayer || !Array.isArray(nextPlayer.troops)) throw new Error('存档缺少玩家信息。');
      if (!Array.isArray(nextLocations)) throw new Error('存档缺少据点信息。');
    const normalizedPlayer = {
        ...nextPlayer,
        prestige: typeof (nextPlayer as any)?.prestige === 'number' ? (nextPlayer as any).prestige : 0,
        attributes: {
          ...INITIAL_PLAYER_STATE.attributes,
          ...(nextPlayer.attributes ?? {})
        },
        giftRecords: Array.isArray((nextPlayer as any)?.giftRecords) ? (nextPlayer as any).giftRecords : [],
        minerals: nextPlayer.minerals ?? INITIAL_PLAYER_STATE.minerals,
        relationMatrix: normalizeRelationMatrix((nextPlayer as any)?.relationMatrix),
        relationEvents: Array.isArray((nextPlayer as any)?.relationEvents) ? (nextPlayer as any).relationEvents : [],
        locationRelations: ((nextPlayer as any)?.locationRelations && typeof (nextPlayer as any).locationRelations === 'object')
          ? (nextPlayer as any).locationRelations
          : {}
      };
      setPlayer(normalizePlayerSoldiers(normalizedPlayer));
      const normalizedHeroes = Array.isArray(nextHeroes) && nextHeroes.length > 0
        ? nextHeroes.map(normalizeHero)
        : heroesRef.current.map(normalizeHero);
      setHeroes(normalizedHeroes);
      const normalizedLocations = ensureLocationLords(seedStayParties(nextLocations)).map(loc => {
        const normalizedOwner = (loc.owner === 'ENEMY' && loc.factionId && (loc.type === 'CITY' || loc.type === 'CASTLE' || loc.type === 'VILLAGE'))
          ? undefined
          : loc.owner;
        const baseLoc = (() => {
          if (loc.claimFactionId) return normalizedOwner === loc.owner ? loc : { ...loc, owner: normalizedOwner };
          if (loc.factionId) return { ...loc, owner: normalizedOwner, claimFactionId: loc.factionId };
          return normalizedOwner === loc.owner ? loc : { ...loc, owner: normalizedOwner };
        })();
        if (baseLoc.type !== 'HIDEOUT') return baseLoc;
        const hideout = baseLoc.hideout;
        const layersRaw = Array.isArray(hideout?.layers) ? hideout!.layers : [];
        const defenseSet = new Set<BuildingType>([
          'DEFENSE',
          'AA_TOWER_I',
          'AA_TOWER_II',
          'AA_TOWER_III',
          'AA_NET_I',
          'AA_NET_II',
          'AA_RADAR_I',
          'AA_RADAR_II',
          'CAMOUFLAGE_STRUCTURE',
          'CAMOUFLAGE_STRUCTURE_II',
          'CAMOUFLAGE_STRUCTURE_III',
          'MAZE_I',
          'MAZE_II',
          'MAZE_III',
          'FIRE_CRYSTAL_MINE',
          'MAGIC_CIRCLE_AMPLIFY',
          'MAGIC_CIRCLE_WARD',
          'MAGIC_CIRCLE_RESTORE',
          'ARCANE_CRYSTAL_ARRAY',
          'ANTI_MAGIC_PYLON'
        ]);
        const normalizeSlots = (slots: any[] | undefined, fallbackBuildings: BuildingType[] | undefined, pickDefense: boolean) => {
          const safe = Array.isArray(slots) ? slots : [];
          const base = Array.from({ length: 10 }, (_, i) => {
            const raw = safe[i];
            const type = raw && typeof raw === 'object' ? ((raw as any).type as BuildingType | null) : null;
            const daysLeft = raw && typeof raw === 'object' && typeof (raw as any).daysLeft === 'number' ? Math.max(0, Math.floor((raw as any).daysLeft)) : undefined;
            const totalDays = raw && typeof raw === 'object' && typeof (raw as any).totalDays === 'number' ? Math.max(0, Math.floor((raw as any).totalDays)) : undefined;
            return { type: type ?? null, daysLeft, totalDays };
          });
          if (!fallbackBuildings || fallbackBuildings.length === 0) return base;
          const filtered = fallbackBuildings.filter(t => pickDefense ? defenseSet.has(t) : !defenseSet.has(t));
          let cursor = 0;
          return base.map(s => {
            if (s.type) return s;
            const next = filtered[cursor++];
            return next ? { type: next } : s;
          });
        };
        const nextLayers = layersRaw.length > 0 ? layersRaw : [{
          id: 'hideout_layer_0',
          depth: 0,
          name: '地面层',
          garrison: [],
          garrisonBaseLimit: 900
        }];
        const normalizedLayers = nextLayers.map((layer: any, idx: number) => {
          const depth = typeof layer?.depth === 'number' ? Math.max(0, Math.floor(layer.depth)) : idx;
          const name = typeof layer?.name === 'string' ? layer.name : (depth === 0 ? '地面层' : `地下${depth}层`);
          const buildings = Array.isArray(layer?.buildings) ? (layer.buildings as any[]).filter(Boolean) as BuildingType[] : [];
          return {
            ...layer,
            depth,
            name,
            garrison: Array.isArray(layer?.garrison) ? layer.garrison : [],
            garrisonBaseLimit: typeof layer?.garrisonBaseLimit === 'number' ? layer.garrisonBaseLimit : (900 + depth * 650),
            facilitySlots: normalizeSlots(layer?.facilitySlots, buildings, false),
            defenseSlots: normalizeSlots(layer?.defenseSlots, buildings, true),
            refineQueue: Array.isArray(layer?.refineQueue) ? layer.refineQueue : []
          };
        });
        return ({
          ...baseLoc,
          owner: 'PLAYER' as const,
          hideout: {
            layers: normalizedLayers,
            selectedLayer: Math.max(0, Math.min(normalizedLayers.length - 1, Math.floor(hideout?.selectedLayer ?? 0))),
            lastRaidDay: typeof hideout?.lastRaidDay === 'number' ? hideout!.lastRaidDay : 0,
            lastRaidCheckDay: typeof hideout?.lastRaidCheckDay === 'number' ? hideout!.lastRaidCheckDay : 0,
            exposure: typeof hideout?.exposure === 'number' ? Math.max(0, Math.min(100, hideout!.exposure)) : 8,
            camouflageCooldownUntilDay: typeof hideout?.camouflageCooldownUntilDay === 'number' ? hideout!.camouflageCooldownUntilDay : 0
          }
        } as Location);
      });
      const locationTemplates = new Map(LOCATIONS.map(loc => [loc.id, loc]));
      const normalizeTroops = (troops?: Troop[]) => {
        if (!Array.isArray(troops)) return [];
        return troops
          .map(t => ({ ...t, count: Math.max(0, Math.floor(t.count ?? 0)), xp: Math.max(0, Math.floor(t.xp ?? 0)) }))
          .filter(t => !!getTroopTemplate(t.id) && t.count > 0);
      };
      const normalizeStayParties = (parties?: StayParty[]) => {
        if (!Array.isArray(parties)) return [];
        return parties.map(p => ({
          ...p,
          troops: normalizeTroops(p.troops)
        }));
      };
      const buildGoblinFallback = () => {
        const ids = ['goblin_scavenger', 'goblin_slinger', 'goblin_scrap_shield'];
        return ids.map(id => {
          const tmpl = getTroopTemplate(id);
          return tmpl ? { ...tmpl, count: id === 'goblin_scavenger' ? 30 : id === 'goblin_slinger' ? 20 : 12, xp: 0 } : null;
        }).filter(Boolean) as Troop[];
      };
      const mergedLocations = normalizedLocations.map(loc => {
        const template = locationTemplates.get(loc.id);
        const merged = template ? { ...template, ...loc } : loc;
        // 始终使用 constants 中的坐标，确保旧存档也能获得新分布
        const coords = template?.coordinates ?? merged.coordinates;
        const next = {
          ...merged,
          coordinates: coords,
          volunteers: Array.isArray(merged.volunteers) ? merged.volunteers : (template?.volunteers ?? []),
          mercenaries: Array.isArray(merged.mercenaries) ? merged.mercenaries : (template?.mercenaries ?? []),
          buildings: Array.isArray(merged.buildings) ? merged.buildings : (template?.buildings ?? []),
          garrison: normalizeTroops(merged.garrison),
          stayParties: normalizeStayParties(merged.stayParties)
        };
        if (!next.lord && template?.lord) next.lord = template.lord;
        if (next.id.startsWith('village_goblin_')) {
          const goblinOnly = next.garrison.filter(t => t.id.startsWith('goblin_'));
          next.garrison = goblinOnly.length > 0 ? goblinOnly : normalizeTroops(template?.garrison ?? buildGoblinFallback());
        }
        return next;
      });
      const existingIds = new Set(mergedLocations.map(loc => loc.id));
      const missingLocations = LOCATIONS.filter(loc => !existingIds.has(loc.id));
      const finalLocations = ensureLocationLords(seedStayParties([...mergedLocations, ...missingLocations]));
      const finalLords = Array.isArray(nextLords) && nextLords.length > 0
        ? nextLords
        : finalLocations.flatMap(loc => loc.lord ? [loc.lord] : []);
      const syncedLocations = syncLordPresence(finalLocations, finalLords);
      setLords(finalLords.length > 0 ? finalLords : lordsRef.current);
      setLocations(syncedLocations);
      const nextLogs = Array.isArray(save?.world?.logs)
        ? save.world.logs.filter((x: any) => typeof x === 'string').slice(0, 120)
        : [];
      setLogs(nextLogs);
      const normalizeOutcome = (raw: any): 'A' | 'B' => {
        if (raw === 'B' || raw === 'DEFEAT' || raw === 'RETREAT') return 'B';
        return 'A';
      };
      const nextBriefsRaw = Array.isArray(save?.world?.recentBattleBriefs) ? save.world.recentBattleBriefs : [];
      const nextBriefs = nextBriefsRaw.map((b: any) => ({
        day: typeof b?.day === 'number' ? b.day : normalizedPlayer.day,
        battleLocation: String(b?.battleLocation ?? '').trim(),
        enemyName: String(b?.enemyName ?? '').trim() || '（未知敌军）',
        outcome: normalizeOutcome(b?.outcome),
        playerSide: String(b?.playerSide ?? '').trim(),
        enemySide: String(b?.enemySide ?? '').trim(),
        keyUnitDamageSummary: String(b?.keyUnitDamageSummary ?? b?.heroInjuries ?? '').trim()
      })).slice(0, 3);
      setRecentBattleBriefs(nextBriefs);
      const nextReportsRaw = Array.isArray(save?.world?.worldBattleReports) ? save.world.worldBattleReports : [];
      const nextReports = nextReportsRaw.map((b: any) => ({
        id: String(b?.id ?? `battle_import_${Math.random().toString(36).slice(2, 8)}`),
        day: typeof b?.day === 'number' ? b.day : normalizedPlayer.day,
        createdAt: String(b?.createdAt ?? ''),
        battleLocation: String(b?.battleLocation ?? '').trim(),
        enemyName: String(b?.enemyName ?? '').trim() || '（未知敌军）',
        outcome: normalizeOutcome(b?.outcome),
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
      setWorldDiplomacy(normalizeWorldDiplomacy(save?.world?.worldDiplomacy, normalizedPlayer.day));
      const nextTimelineRaw = Array.isArray(save?.world?.battleTimeline) ? save.world.battleTimeline : [];
      const nextTimeline = nextTimelineRaw
        .map((item: any) => ({
          day: typeof item?.day === 'number' ? item.day : normalizedPlayer.day,
          count: typeof item?.count === 'number' ? item.count : 0
        }))
        .filter(item => item.day >= 0 && item.count >= 0)
        .slice(-80);
      setBattleTimeline(nextTimeline.length > 0 ? nextTimeline : [{ day: normalizedPlayer.day, count: 0 }]);
      const nextLocationId = typeof save?.ui?.currentLocationId === 'string' ? save.ui.currentLocationId : null;
      const nextLocation = syncedLocations.find(l => l.id === nextLocationId) ?? null;
      setCurrentLocation(nextLocation);
      const safeView = normalizeView(save?.ui?.view, !!nextLocation);
      const forced = options?.forceView;
      const finalView = forced
        ? (forced === 'TOWN' && !nextLocation ? 'MAP' : forced)
        : safeView;
      setView(finalView);
      setTownTab(save?.ui?.townTab ?? 'RECRUIT');
      setWorkDays(typeof save?.ui?.workDays === 'number' ? save.ui.workDays : 1);
      setMiningDays(typeof save?.ui?.miningDays === 'number' ? save.ui.miningDays : 2);
      setRoachLureDays(typeof save?.ui?.roachLureDays === 'number' ? save.ui.roachLureDays : 2);
      setTrainingMyArmy(Array.isArray(save?.ui?.trainingMyArmy) ? save.ui.trainingMyArmy : trainingMyArmy);
      setTrainingEnemyArmy(Array.isArray(save?.ui?.trainingEnemyArmy) ? save.ui.trainingEnemyArmy : trainingEnemyArmy);
      setTrainInputMy(save?.ui?.trainInputMy ?? trainInputMy);
      setTrainInputEnemy(save?.ui?.trainInputEnemy ?? trainInputEnemy);
      setCustomTroopTemplates(save?.systems?.customTroopTemplates ?? {});
      setShaperDialogue(Array.isArray(save?.systems?.shaperDialogue) ? save.systems.shaperDialogue : shaperDialogue);
      setShaperInput(typeof save?.systems?.shaperInput === 'string' ? save.systems.shaperInput : '');
      setShaperProposal(save?.systems?.shaperProposal ?? null);
      setAltarDialogues(save?.systems?.altarDialogues ?? {});
      setAltarDrafts(save?.systems?.altarDrafts ?? {});
      setAltarProposals(save?.systems?.altarProposals ?? {});
      setAltarRecruitDays(typeof save?.systems?.altarRecruitDays === 'number' ? save.systems.altarRecruitDays : 2);
      setAltarRecruitState(null);
      const importedProfiles = Array.isArray(save?.settings?.openAIProfiles)
        ? save.settings.openAIProfiles.filter((p: any) => p && typeof p.id === 'string')
        : [];
      const currentOpenAIKey = localStorage.getItem('openai.key') ?? openAIKey;
      const currentDoubaoKey = localStorage.getItem('doubao.key') ?? doubaoApiKey;
      const currentGeminiKey = localStorage.getItem('gemini.key') ?? geminiApiKey;
      const preserveKeyIfEmpty = (imported: string | undefined, current: string) =>
        (typeof imported === 'string' && imported.trim().length > 0) ? imported.trim() : current;
      if (importedProfiles.length > 0) {
        const importedActiveId = typeof save?.settings?.openAIActiveProfileId === 'string' ? save.settings.openAIActiveProfileId : null;
        const activeProfile = importedProfiles.find((p: any) => p.id === importedActiveId) ?? importedProfiles[0];
        const keyToUse = preserveKeyIfEmpty(activeProfile.key, currentOpenAIKey);
        const profilesWithPreservedKeys = importedProfiles.map((p: any) =>
          p.id === activeProfile.id && (!p.key || !String(p.key).trim())
            ? { ...p, key: keyToUse }
            : { ...p, key: preserveKeyIfEmpty(p.key, currentOpenAIKey) }
        );
        setOpenAIProfiles(profilesWithPreservedKeys);
        setActiveOpenAIProfileId(activeProfile.id);
        setOpenAIProfileName(activeProfile.name ?? '默认');
        setOpenAIBaseUrl(activeProfile.baseUrl ?? openAIBaseUrl);
        setOpenAIKey(keyToUse);
        setOpenAIModel(activeProfile.model ?? openAIModel);
        localStorage.setItem('openai.profiles', JSON.stringify(profilesWithPreservedKeys));
        localStorage.setItem('openai.profile.active', activeProfile.id);
        localStorage.setItem('openai.baseUrl', String(activeProfile.baseUrl ?? '').trim());
        localStorage.setItem('openai.key', keyToUse);
        localStorage.setItem('openai.model', String(activeProfile.model ?? '').trim());
      } else if (save?.settings?.openAI) {
        const baseUrl = typeof save.settings.openAI.baseUrl === 'string' ? save.settings.openAI.baseUrl : openAIBaseUrl;
        const key = preserveKeyIfEmpty(save.settings.openAI.key, currentOpenAIKey);
        const model = typeof save.settings.openAI.model === 'string' ? save.settings.openAI.model : openAIModel;
        setOpenAIBaseUrl(baseUrl);
        setOpenAIKey(key);
        setOpenAIModel(model);
        localStorage.setItem('openai.baseUrl', baseUrl.trim());
        localStorage.setItem('openai.key', key);
        localStorage.setItem('openai.model', model.trim());
      }
      const importedProvider = typeof save?.settings?.aiProvider === 'string' ? save.settings.aiProvider : aiProvider;
      const normalizedProvider = importedProvider === 'GPT' || importedProvider === 'GEMINI' || importedProvider === 'DOUBAO' || importedProvider === 'CUSTOM'
        ? importedProvider
        : 'CUSTOM';
      setAIProvider(normalizedProvider as AIProvider);
      localStorage.setItem('ai.provider', normalizedProvider);
      const importedDoubaoKey = preserveKeyIfEmpty(save?.settings?.doubaoApiKey, currentDoubaoKey);
      const importedGeminiKey = preserveKeyIfEmpty(save?.settings?.geminiApiKey, currentGeminiKey);
      setDoubaoApiKey(importedDoubaoKey);
      setGeminiApiKey(importedGeminiKey);
      localStorage.setItem('doubao.key', importedDoubaoKey);
      localStorage.setItem('gemini.key', importedGeminiKey);
      if (typeof save?.settings?.battleStreamEnabled === 'boolean') {
        setBattleStreamEnabled(save.settings.battleStreamEnabled);
        localStorage.setItem('battle.stream', save.settings.battleStreamEnabled ? '1' : '0');
      }
      if (save?.settings?.battleResolutionMode === 'AI' || save?.settings?.battleResolutionMode === 'PROGRAM') {
        setBattleResolutionMode(save.settings.battleResolutionMode);
        localStorage.setItem('battle.mode', save.settings.battleResolutionMode);
      }
      if (typeof save?.settings?.heroChatterEnabled === 'boolean') {
        setHeroChatterEnabled(save.settings.heroChatterEnabled);
        localStorage.setItem('hero.chatter.enabled', save.settings.heroChatterEnabled ? '1' : '0');
      }
      if (typeof save?.settings?.heroChatterMinMinutes === 'number' && Number.isFinite(save.settings.heroChatterMinMinutes)) {
        const v = Math.max(1, Math.floor(save.settings.heroChatterMinMinutes));
        setHeroChatterMinMinutes(v);
        localStorage.setItem('hero.chatter.minMinutes', String(v));
      }
      if (typeof save?.settings?.heroChatterMaxMinutes === 'number' && Number.isFinite(save.settings.heroChatterMaxMinutes)) {
        const v = Math.max(1, Math.floor(save.settings.heroChatterMaxMinutes));
        setHeroChatterMaxMinutes(v);
        localStorage.setItem('hero.chatter.maxMinutes', String(v));
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
      setWorkState(null);
      setMiningState(null);
      setRoachLureState(null);
      setAltarRecruitState(null);
      setHabitatStayState(null);
      if (!options?.silent) setSaveDataNotice('存档已导入。');
    } catch (e: any) {
      if (!options?.silent) setSaveDataNotice(e?.message || '导入失败。');
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
    return collectWorldTroopsFromWorld({
      player,
      locations,
      getTroopTemplate,
      buildGarrisonTroops
    });
  };

  const getBelieverStats = (troopIds: string[]) => {
    return getBelieverStatsFromWorld(troopIds, {
      player,
      locations,
      getTroopTemplate,
      buildGarrisonTroops
    });
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
    <BanditEncounterView
      onAction={handleBanditAction}
      title={currentLocation?.id?.startsWith('goblin_camp_') ? '哥布林营地' : '劫匪窝点'}
      description={currentLocation?.id?.startsWith('goblin_camp_')
        ? (
            <>
              你发现了一片矮棚与陷阱交织的营地。油烟、蘑菇与火药味混在一起。
              <br /><br />
              捣毁这里可以获得大量战利品，但也可能惊动整片绿皮。
            </>
          )
        : undefined}
    />
  );

  const renderWorldBoard = () => (
    <WorldBoardScreen
        currentLocation={currentLocation}
      locations={locations}
      lords={lords}
      player={player}
        logs={logs}
        worldBattleReports={worldBattleReports}
      worldDiplomacy={worldDiplomacy}
        battleTimeline={battleTimeline}
      customTroopTemplates={customTroopTemplates}
      siegeEngineOptions={siegeEngineOptions}
      siegeEngineCombatStats={siegeEngineCombatStats}
      calculatePower={calculatePower}
      getDefenderTroops={getDefenderTroops}
      getGarrisonCount={getGarrisonCount}
      getLocationDefenseDetails={getLocationDefenseDetails}
      buildAIConfig={buildAIConfig}
        onOpenTroopArchive={() => setView('TROOP_ARCHIVE')}
        onBackToMap={() => setView('MAP')}
        onExportMarkdown={exportWorldBoardMarkdown}
    />
  );

  const renderRelations = () => (
    <RelationsView
      locations={locations}
      player={player}
      worldDiplomacy={worldDiplomacy}
      onBackToMap={() => setView('MAP')}
    />
  );

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
      onChatAuthor={async (dialogue, userInput) => {
        const aiConfig = buildAIConfig();
        if (!aiConfig) throw new Error('AI 未配置');
        const changelogText = CHANGELOG
          .map(e => `版本 ${e.version}（${e.date}）\n- ${e.items.join('\n- ')}`)
          .join('\n\n');
        return chatWithAuthor(dialogue, userInput, changelogText, aiConfig);
      }}
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
      heroChatterEnabled={heroChatterEnabled}
      setHeroChatterEnabled={setHeroChatterEnabled}
      heroChatterMinMinutes={heroChatterMinMinutes}
      setHeroChatterMinMinutes={setHeroChatterMinMinutes}
      heroChatterMaxMinutes={heroChatterMaxMinutes}
      setHeroChatterMaxMinutes={setHeroChatterMaxMinutes}
      saveDataText={saveDataText}
      setSaveDataText={setSaveDataText}
      saveDataNotice={saveDataNotice}
      manualSaveName={manualSaveName}
      setManualSaveName={setManualSaveName}
      onManualSave={createManualSave}
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
      getUpgradeTargetOptions={getUpgradeTargetOptions}
      getTroopSoldiers={(troopId) => getTroopSoldiers(playerRef.current, troopId)}
      handleUpgrade={handleUpgrade}
      handleDisband={handleDisband}
      getHeroRoleLabel={getHeroRoleLabel}
      spendHeroAttributePoint={spendHeroAttributePoint}
      onOpenHeroChat={(heroId) => {
        setActiveHeroChatId(heroId);
        setHeroChatInput('');
        setView('HERO_CHAT');
      }}
      onLeaveHero={handleHeroLeave}
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
      estimateBattleRewards={(enemy, current) => calculateLocalBattleRewards(enemy, current.level, current.attributes.training ?? 0, 'A')}
      exitTrainingBattle={() => {
        setActiveEnemy(null);
        setPendingBattleMeta(null);
        setPendingBattleIsTraining(false);
        setBattleError(null);
        setIsBattling(false);
        setIsBattleStreaming(false);
        setIsBattleResultFinal(true);
        setBattleResult(null);
        setBattleSnapshot(null);
        setView('TRAINING');
      }}
      getTroopTemplate={getTroopTemplate}
      setHoveredTroop={setHoveredTroop}
      setBattlePlan={setBattlePlan}
      setDraggingTroopId={setDraggingTroopId}
      startBattle={startBattle}
      attemptFlee={attemptFlee}
      sacrificeRetreat={sacrificeRetreat}
      onIgnoreEncounter={() => {
        if (!activeEnemy) return;
        exitEncounter(`你选择无视 ${activeEnemy.name}，继续前进。`);
      }}
      onPayToll={(cost) => {
        if (!activeEnemy) return;
        if (player.gold < cost) {
          addLog("资金不足，无法支付过路费。");
          return;
        }
        exitEncounter(`你支付 ${cost} 第纳尔作为过路费，避免冲突。`, cost);
      }}
      battleRelationValue={getBattleRelationValue()}
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
    const freshWorld = buildInitialWorld();
    setPlayer(normalizePlayerSoldiers(INITIAL_PLAYER_STATE));
    setHeroes(buildRandomizedHeroes());
    setLocations(freshWorld.locations.map(l => l.type === 'CITY' ? { ...l, workBoard: { lastRefreshDay: INITIAL_PLAYER_STATE.day, contracts: buildWorkContractsForCity(l, INITIAL_PLAYER_STATE.day) } } : l));
    setLords(freshWorld.lords);
    setCurrentLocation(null);
    setView('MAIN_MENU');
    setEndingReturnView('GAME_OVER');
    setPortalEndingChoiceMade(false);
    setLogs(["欢迎来到《卡拉迪亚编年史》。拖动地图探索，滚轮缩放，点击据点移动。"]);
    setActiveEnemy(null);
    setBattleResult(null);
    setIsBattling(false);
    setIsBattleStreaming(false);
    setIsBattleResultFinal(true);
    setBattleMeta(null);
    setBattleSnapshot(null);
    setPendingBattleMeta(null);
    setPendingBattleIsTraining(false);
  };

  const startNewGame = () => {
    restartGame();
    setPlayer(prev => ({
      ...prev,
      story: {
        ...(prev.story ?? {}),
        introSeen: false,
        mainQuest: 'CLEANSE_PORTALS',
        mainQuestStage: 1,
        gameOverReason: undefined,
        endingId: undefined
      }
    }));
    setEndingReturnView('GAME_OVER');
    setView('INTRO');
  };

  const renderGameOver = () => (
    <GameOverView player={player} onRestart={restartGame} />
  );

  const renderDecisionModal = () => {
      return (
      <DecisionOverlay
        pendingDecisions={pendingDecisions}
        isBlockedByView={isBattling || view === 'BATTLE' || view === 'BATTLE_RESULT' || view === 'MAIN_MENU' || view === 'INTRO' || view === 'ENDING' || view === 'GAME_OVER'}
        locations={locations}
        heroes={heroes}
        player={player}
        decisionHeroId={decisionHeroId}
        setDecisionHeroId={setDecisionHeroId}
        setPendingDecisions={setPendingDecisions}
        setLocations={setLocations}
        setCurrentLocation={setCurrentLocation}
        setPlayer={setPlayer}
        setHeroes={setHeroes}
        setActiveEnemy={setActiveEnemy}
        setPendingBattleMeta={setPendingBattleMeta}
        setPendingBattleIsTraining={setPendingBattleIsTraining}
        addLog={addLog}
        onUpdateRelation={updateRelation}
        onEnterBattle={() => setView('BATTLE')}
        playerRef={playerRef}
      />
    );
  };

  const renderBattleSimulation = () => {
    const leftTroops = (battleSnapshot?.playerTroops ?? player.troops ?? []).filter(t => (t.count ?? 0) > 0);
    const rightTroops = (battleSnapshot?.enemyTroops ?? activeEnemy?.troops ?? []).filter(t => (t.count ?? 0) > 0);
    return (
      <BattleSimulationOverlay
        battleError={battleError}
        leftTroops={leftTroops}
        rightTroops={rightTroops}
        isBattleStreaming={isBattleStreaming}
        onCancelError={() => setBattleError(null)}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onRetry={() => startBattle(currentLocation?.type === 'TRAINING_GROUNDS', battleMeta ?? undefined)}
      />
    );
  };

  const endingKey = player.story?.endingId ?? player.story?.gameOverReason ?? '';
  const newCovenantAvailable = getNewCovenantAvailable(locations, getPlayerReligion());
  const endingContent = getEndingContent(endingKey, player.day, getPlayerReligion()?.religionName ?? '');


  const handleIntroFinish = () => {
    const hideout = locations.find(l => l.id === 'hideout_underground') ?? null;
    setPlayer(prev => ({
      ...prev,
      story: {
        ...(prev.story ?? {}),
        introSeen: true,
        mainQuest: prev.story?.mainQuest ?? 'CLEANSE_PORTALS',
        mainQuestStage: Math.max(1, prev.story?.mainQuestStage ?? 0)
      },
      position: hideout?.coordinates ?? prev.position
    }));
    addLog('【主线】清理传送门周边的伪人活动，封堵异常源头。');
    addLog('提示：传送门据点会不断酝酿新的袭击，围绕它们建立据点、清剿外溢，是回家的唯一线索。');
    if (hideout) {
      setCurrentLocation(hideout);
      setTownTab('HIDEOUT');
      setView('TOWN');
    } else {
      setView('MAP');
    }
  };

  return (
    <div className="min-h-screen bg-stone-950 text-stone-200 font-sans selection:bg-amber-900 selection:text-white overflow-hidden flex flex-col">
      {view === 'OBSERVER_MODE' && (
        <ObserverNavBar
          onBack={() => setView('MAIN_MENU')}
          onNewspaper={() => setIsObserverNewspaperOpen(true)}
          onRelations={() => setIsObserverRelationsOpen(true)}
        />
      )}
      {view !== 'MAIN_MENU' && view !== 'INTRO' && view !== 'ENDING' && view !== 'GAME_OVER' && view !== 'BATTLE' && view !== 'BATTLE_RESULT' && view !== 'BANDIT_ENCOUNTER' && view !== 'HERO_CHAT' && view !== 'HIDEOUT_INSPECT' && view !== 'OBSERVER_MODE' && (
        <AppHeader
          player={player}
          view={view}
          troopCount={player.troops.reduce((a, b) => a + b.count, 0) + (player.woundedTroops ?? []).reduce((sum, e) => sum + (e.count ?? 0), 0)}
          maxTroops={getMaxTroops()}
          onOpenCharacter={() => setView('CHARACTER')}
          onToggleParty={() => setView(view === 'PARTY' ? 'MAP' : 'PARTY')}
          onToggleBills={() => setView(view === 'BILLS' ? 'MAP' : 'BILLS')}
          onOpenMapList={() => setIsMapListOpen(true)}
          onOpenWorldStats={() => setIsWorldTroopStatsOpen(true)}
          onOpenRelations={() => setView('RELATIONS')}
          onOpenChangelog={() => setIsChangelogOpen(true)}
          onOpenSettings={() => {
            setSettingsError(null);
            setIsSettingsOpen(true);
          }}
        />
      )}
      
      <AppMainContent
        view={view}
        mainMenuProps={{
          saves: saveSlots,
          selectedSaveId,
          onSelectSave: (id) => setSelectedSaveId(id),
          onDeleteSave: (id) => deleteSaveSlot(id),
          onNewGame: startNewGame,
          onContinue: (preferredId) => loadSaveSlot(preferredId),
          onCreateBlankSave: createBlankSaveSlot,
          endings: [...ENDING_LIST],
          onReplayEnding: (endingId) => {
              setEndingReturnView('MAIN_MENU');
              setPortalEndingChoiceMade(true);
              setPlayer(prev => ({
                ...prev,
                story: {
                  ...(prev.story ?? {}),
                  endingId,
                  gameOverReason: endingId
                }
              }));
              setView('ENDING');
          },
          onObserverMode: () => {
            restartGame();
            setView('OBSERVER_MODE');
          }
        }}
        billsProps={{
          player,
          locations,
          getTroopTemplate,
          onBack: () => setView('MAP')
        }}
        mapProps={{
          zoom,
          camera,
          locations,
          player,
          worldDiplomacy,
          workState,
          miningState,
          roachLureState,
          habitatStayState,
          hideoutStayState,
          hoveredLocation,
          mousePos,
          mapRef,
          handleMouseDown,
          handleMouseMove,
          handleMouseUp,
          moveTo,
          setHoveredLocation,
          isObserverMode: view === 'OBSERVER_MODE',
          observerTargets: view === 'OBSERVER_MODE' ? observerTargets : undefined,
          observerCurrentAction: view === 'OBSERVER_MODE' ? observerCurrentAction : undefined,
          onLocationSelect: view === 'OBSERVER_MODE' ? setObserverLocationModal : undefined,
          setPlayer,
          setWorkState,
          setMiningState,
          setRoachLureState,
          setHabitatStayState,
          setHideoutStayState,
          addLog
        }}
        endingProps={{
          endingKey,
          newCovenantAvailable,
          portalEndingChoiceMade,
          endingContent,
          onChooseNormal: () => {
                      setPortalEndingChoiceMade(true);
          },
          onChooseReligion: () => {
                      setPortalEndingChoiceMade(true);
                      setPlayer(prev => ({
                        ...prev,
                        story: {
                          ...(prev.story ?? {}),
                          endingId: 'NEW_COVENANT',
                          gameOverReason: 'NEW_COVENANT'
                        }
                      }));
          },
          onFinishEnding: () => setView(endingReturnView)
        }}
        onIntroFinish={handleIntroFinish}
        renderRelations={renderRelations}
        renderWorldBoard={renderWorldBoard}
        renderTroopArchive={renderTroopArchive}
        townProps={{
          townState: {
            currentLocation,
            locations,
            lords,
            player,
            heroes,
            heroDialogue,
            townTab,
            workDays,
            miningDays,
            roachLureDays,
            hideoutStayDays,
            workState,
            miningState,
            roachLureState,
            habitatStayState,
            hideoutStayState,
            altarRecruitDays,
            altarRecruitState,
            forgeTroopIndex,
            forgeEnchantmentId,
            undeadDialogue,
            undeadChatInput,
            isUndeadChatLoading,
            altarDialogues,
            altarDrafts,
            altarProposals,
            isAltarLoading,
            aiProvider,
            doubaoApiKey,
            geminiApiKey,
            openAIBaseUrl,
            openAIKey,
            openAIModel,
            recentLogs: logs.slice(0, 12),
            playerReligionName: getPlayerReligion()?.religionName ?? null
          },
          townActions: {
            setHeroDialogue,
            setHeroes,
            addLog,
            setTownTab,
            setWorkDays,
            setMiningDays,
            setRoachLureDays,
            setHideoutStayDays,
            setWorkState,
            setMiningState,
            setRoachLureState,
            setHabitatStayState,
            setHideoutStayState,
            setAltarRecruitDays,
            setAltarRecruitState,
            setForgeTroopIndex,
            setForgeEnchantmentId,
            setUndeadChatInput,
            sendToUndead,
            setAltarDialogues,
            setAltarDrafts,
            setAltarProposals,
            setIsAltarLoading,
            applyAltarProposal,
            startSiegeBattle,
            handleRecruitOffer,
            updateLocationState,
            setPlayer,
            onRecruitHero: handleRecruitHeroRelation,
            onLordProvoked: handleLordProvoked,
            setActiveEnemy,
            setPendingBattleMeta,
            setPendingBattleIsTraining,
            onDefenseAidJoin: handleDefenseAidJoin,
            onBackToMap: () => setView('MAP'),
            onEnterBattle: () => setView('BATTLE'),
            updateLord,
            onPreachInCity: preachInCity,
            onInspectHideout: (layerIndex) => {
              const hideout = currentLocation?.hideout;
              const maxLayer = Math.max(0, (hideout?.layers?.length ?? 1) - 1);
              const safe = Math.max(0, Math.min(maxLayer, Math.floor(layerIndex || 0)));
              setHideoutInspectLayerIndex(safe);
              setView('HIDEOUT_INSPECT');
            },
            onConsumeRecompilerSoldier: consumeRecompilerSoldier
          },
          townDerived: {
            playerRef,
            undeadChatListRef,
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
            isBattling,
            calculatePower,
            getHeroRoleLabel,
            enchantmentRecipes: ENCHANTMENT_RECIPES,
            mineralMeta: MINERAL_META,
            mineralPurityLabels: MINERAL_PURITY_LABELS,
            mineConfigs: MINE_CONFIGS,
            initialMinerals: INITIAL_PLAYER_STATE.minerals,
            buildingOptions,
            getBuildingName,
            processDailyCycle
          }
        }}
        hideoutInspectLocation={currentLocation}
        hideoutInspectHeroes={heroes}
        hideoutInspectLayerIndex={hideoutInspectLayerIndex}
        onHideoutLayerChange={(index) => {
          if (!currentLocation || currentLocation.type !== 'HIDEOUT') return;
              const hideout = currentLocation.hideout;
              if (!hideout) return;
              const maxLayer = Math.max(0, (hideout.layers?.length ?? 1) - 1);
              const safe = Math.max(0, Math.min(maxLayer, Math.floor(index || 0)));
              setHideoutInspectLayerIndex(safe);
              const nextHideout = { ...hideout, selectedLayer: safe };
              updateLocationState({ ...currentLocation, hideout: nextHideout });
            }}
        onHideoutBackToTown={() => {
              setTownTab('HIDEOUT');
              setView('TOWN');
            }}
        onHideoutBackToMap={() => setView('MAP')}
        renderBanditEncounter={renderBanditEncounter}
        renderAsylum={renderAsylum}
        renderMarket={renderMarket}
        renderMysteriousCave={renderMysteriousCave}
        renderParty={renderParty}
        renderCharacter={renderCharacter}
        renderHeroChat={renderHeroChat}
        renderTraining={renderTraining}
        renderBattle={renderBattle}
        renderBattleResult={renderBattleResult}
        renderGameOver={renderGameOver}
        observerModeProps={{
          onBack: () => setView('MAIN_MENU'),
          buildAIConfig,
          locations,
          worldDiplomacy,
          onTargetsChange: (queue) => setObserverTargets(parseObserverTargets(queue, locations)),
          onFocusLocation: (loc) => focusCameraOnLocation(loc),
          onApplyAction: (locationId, actionType, factionId) => {
            if (actionType === 'attack' && factionId) {
              const target = locations.find(l => l.id === locationId);
              if (!target) return;
              const factionLocations = getFactionLocations(factionId, locations);
              const source = [...factionLocations].sort((a, b) => getGarrisonCount(getLocationTroops(b)) - getGarrisonCount(getLocationTroops(a)))[0];
              if (!source || source.factionRaidTargetId || source.factionRaidEtaDay || target.activeSiege || target.isUnderSiege) return;
              const sourceTroops = getLocationTroops(source);
              const { attackers, remaining } = splitTroops(sourceTroops, 0.5);
              if (getGarrisonCount(attackers) < 30) return;
              const faction = FACTIONS.find(f => f.id === factionId);
              const marchDays = 2 + Math.floor(Math.random() * 2);
              const nextDay = player.day + 1;
              const etaDay = nextDay + marchDays;
              const attackerName = faction ? `${faction.name}远征军` : '远征军';
              const leaderName = source.lord ? `${source.lord.title}${source.lord.name}` : (faction ? `${faction.name}军官` : '军官');
              const campId = `field_camp_obs_${source.id}_${target.id}_${Date.now()}`;
              const dx = target.coordinates.x - source.coordinates.x;
              const dy = target.coordinates.y - source.coordinates.y;
              const distance = Math.hypot(dx, dy);
              const fraction = distance > 0 ? Math.min(0.18, 1 / Math.max(2, Math.round(marchDays * 1.2))) : 0;
              const initialCoordinates = { x: source.coordinates.x + dx * fraction, y: source.coordinates.y + dy * fraction };
              const camp: Location = {
                id: campId,
                name: `${attackerName}·行军营地`,
                type: 'FIELD_CAMP',
                description: `一支正在行军的远征军临时扎营。目标：${target.name}。`,
                coordinates: initialCoordinates,
                terrain: source.terrain,
                factionId,
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
              setLocations(prev => {
                const next = prev.map(l => {
                  if (l.id === source.id) {
                    return { ...l, garrison: remaining, factionRaidTargetId: target.id, factionRaidEtaDay: etaDay, factionRaidAttackerName: attackerName, factionRaidFactionId: factionId, factionRaidTroops: attackers };
                  }
                  return l;
                });
                return [...next, camp];
              });
              return;
            }
            const loc = locations.find(l => l.id === locationId);
            if (!loc) return;
            if (actionType === 'recruit') {
              const garrison = (loc.garrison ?? []).length > 0 ? [...loc.garrison] : buildGarrisonTroops(loc);
              const recruitId = loc.type === 'CITY' || loc.type === 'CASTLE' ? 'footman' : 'militia';
              const template = getTroopTemplate(recruitId);
              if (template) {
                const addCount = Math.floor(15 + Math.random() * 25);
                const existing = garrison.find(t => t.id === recruitId);
                if (existing) existing.count += addCount;
                else garrison.push({ ...template, count: addCount, xp: 0 });
                updateLocationState({ ...loc, garrison });
              }
            }
          },
          onAdvanceDay: async () => {
            const locs = processDailyCycle(undefined, 0, 1, 0, true, { skipSiegeProcessing: true });
            if (!locs || locs.length === 0) return;
            const sieges = locs.filter(l => l.activeSiege);
            for (const loc of sieges) {
              const siege = loc.activeSiege!;
              const defenderTroops = [
                ...(loc.garrison ?? []),
                ...(loc.stayParties ?? []).flatMap(p => p.troops),
                ...(loc.stationedArmies ?? []).flatMap(a => a.troops)
              ].filter(t => (t.count ?? 0) > 0);
              const attackerTroops = (siege.troops ?? []).filter(t => (t.count ?? 0) > 0);
              const attackerName = siege.attackerName ?? '进攻方';
              const defenderName = FACTIONS.find(f => f.id === loc.factionId)?.name ?? loc.name;
              const outcome = await new Promise<'attacker' | 'defender'>(r => {
                setObserverSiegeModal({
                  loc,
                  siege,
                  attackerName,
                  attackerTroops,
                  defenderName,
                  defenderTroops,
                  onResolve: (o) => { r(o); setObserverSiegeModal(null); }
                });
              });
              const defenderFactionId = loc.factionId;
              const attackerFactionId = siege.attackerFactionId;
              const claimFactionId = loc.claimFactionId ?? loc.factionId;
              const nextDay = player.day + 1;
              if (outcome === 'attacker') {
                setLocations(prev => prev.map(l => l.id !== loc.id ? l : {
                  ...l,
                  owner: attackerFactionId ? undefined : 'ENEMY',
                  factionId: attackerFactionId ?? undefined,
                  claimFactionId: attackerFactionId ?? claimFactionId,
                  garrison: siege.troops ?? [],
                  stayParties: [],
                  stationedArmies: [],
                  activeSiege: undefined,
                  isUnderSiege: false,
                  sackedUntilDay: undefined,
                  lastRefreshDay: nextDay,
                  volunteers: [],
                  mercenaries: [],
                  lord: undefined
                }));
                if (attackerFactionId && defenderFactionId && attackerFactionId !== defenderFactionId) {
                  setWorldDiplomacy(prev => {
                    let next = applyWorldDiplomacyDelta(prev, { kind: 'FACTION_FACTION', aId: attackerFactionId, bId: defenderFactionId, delta: -18, text: `占领 ${loc.name}`, day: nextDay });
                    return applyWorldDiplomacyDelta(next, { kind: 'FACTION_FACTION', aId: defenderFactionId, bId: attackerFactionId, delta: -26, text: `失去 ${loc.name}`, day: nextDay });
                  });
                }
              } else {
                setLocations(prev => prev.map(l => l.id !== loc.id ? l : { ...l, activeSiege: undefined, isUnderSiege: false }));
              }
            }
          },
          onApplyDiplomacy: (factionAId, factionBId, decision, dialogue, relationDelta) => {
            const factionA = FACTIONS.find(f => f.id === factionAId);
            const factionB = FACTIONS.find(f => f.id === factionBId);
            const nameA = factionA?.shortName ?? factionAId;
            const nameB = factionB?.shortName ?? factionBId;
            if (decision === 'IMPROVE_RELATIONS' && relationDelta) {
              const delta = Math.max(5, Math.min(25, relationDelta));
              setWorldDiplomacy(prev => {
                let next = applyWorldDiplomacyDelta(prev, { kind: 'FACTION_FACTION', aId: factionAId, bId: factionBId, delta, text: `${nameA}与${nameB}外交会谈，关系改善`, day: player.day });
                next = applyWorldDiplomacyDelta(next, { kind: 'FACTION_FACTION', aId: factionBId, bId: factionAId, delta, text: `${nameB}与${nameA}外交会谈，关系改善`, day: player.day });
                return next;
              });
              return;
            }
            if (decision === 'REINFORCE') {
              const besiegedByB = locations.filter(loc => loc.type === 'CITY' || loc.type === 'CASTLE' || loc.type === 'VILLAGE')
                .filter(loc => loc.factionId === factionBId && loc.activeSiege && loc.isUnderSiege);
              const target = besiegedByB[0];
              if (!target) return;
              const factionALocs = getFactionLocations(factionAId, locations);
              const source = [...factionALocs].sort((a, b) => getGarrisonCount(getLocationTroops(b)) - getGarrisonCount(getLocationTroops(a)))[0];
              if (!source || source.factionRaidTargetId || getGarrisonCount(getLocationTroops(source)) < 30) return;
              const sourceTroops = getLocationTroops(source);
              const { attackers, remaining } = splitTroops(sourceTroops, 0.4);
              const marchDays = 2;
              const nextDay = player.day + 1;
              const etaDay = nextDay + marchDays;
              const attackerName = `${nameA}援军`;
              const campId = `field_camp_dip_${source.id}_${target.id}_${Date.now()}`;
              const dx = target.coordinates.x - source.coordinates.x;
              const dy = target.coordinates.y - source.coordinates.y;
              const distance = Math.hypot(dx, dy);
              const fraction = distance > 0 ? Math.min(0.18, 1 / 4) : 0;
              const initialCoordinates = { x: source.coordinates.x + dx * fraction, y: source.coordinates.y + dy * fraction };
              const camp: Location = {
                id: campId,
                name: `${attackerName}·行军营地`,
                type: 'FIELD_CAMP',
                description: `一支增援部队。目标：${target.name}。`,
                coordinates: initialCoordinates,
                terrain: source.terrain,
                factionId: factionAId,
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
                  leaderName: `${nameA}援军统领`
                }
              };
              setLocations(prev => {
                const next = prev.map(l => l.id === source.id ? { ...l, garrison: remaining, factionRaidTargetId: target.id, factionRaidEtaDay: etaDay, factionRaidAttackerName: attackerName, factionRaidFactionId: factionAId } : l);
                return [...next, camp];
              });
              setWorldDiplomacy(prev => applyWorldDiplomacyDelta(prev, { kind: 'FACTION_FACTION', aId: factionAId, bId: factionBId, delta: 8, text: `${nameA}派兵增援${nameB}`, day: player.day }));
              return;
            }
            if (decision === 'WITHDRAW') {
              const attackingByA = locations.filter(loc => loc.activeSiege?.attackerFactionId === factionAId && loc.factionId === factionBId);
              const target = attackingByA[0];
              if (!target) return;
              const campsToRemove = locations.filter(loc => loc.type === 'FIELD_CAMP' && loc.camp?.targetLocationId === target.id && loc.factionId === factionAId);
              const sourceId = campsToRemove[0]?.camp?.sourceLocationId;
              setLocations(prev => {
                let next = prev.filter(loc => !campsToRemove.some(c => c.id === loc.id));
                next = next.map(loc => {
                  if (loc.id === target.id) return { ...loc, activeSiege: undefined, isUnderSiege: false };
                  if (sourceId && loc.id === sourceId) return { ...loc, factionRaidTargetId: undefined, factionRaidEtaDay: undefined, factionRaidAttackerName: undefined, factionRaidFactionId: undefined };
                  return loc;
                });
                return next;
              });
              setWorldDiplomacy(prev => applyWorldDiplomacyDelta(prev, { kind: 'FACTION_FACTION', aId: factionAId, bId: factionBId, delta: 5, text: `${nameA}从${target.name}撤军`, day: player.day }));
            }
          },
          onCurrentActionChange: setObserverCurrentAction
        }}
      />

      {isSettingsOpen && renderSettingsModal()}
      {isChangelogOpen && <ChangelogModal entries={CHANGELOG} onClose={() => setIsChangelogOpen(false)} />}
      {isMapListOpen && renderMapListModal()}
      {isWorldTroopStatsOpen && renderWorldTroopStatsModal()}
      {renderDecisionModal()}
      {observerLocationModal && (
        <ObserverLocationModal
          location={observerLocationModal}
          onClose={() => setObserverLocationModal(null)}
          getTroopName={(id) => getTroopTemplate(id)?.name ?? id}
          getLocationName={(id) => locations.find(l => l.id === id)?.name ?? id}
          lordDialogue={observerLordDialogue[observerLocationModal.id] ?? []}
          onLordDialogue={(lines) => setObserverLordDialogue(prev => ({ ...prev, [observerLocationModal.id]: lines }))}
          onChatWithLord={async (locationId, lord, dialogue) => {
            const { chatWithLordForObserver } = await import('./services/geminiService');
            const config = buildAIConfigFromSettings();
            const aiConfig = config ? { baseUrl: config.baseUrl, apiKey: config.apiKey, model: config.model, provider: config.provider } : undefined;
            const loc = locations.find(l => l.id === locationId);
            const factionName = loc?.factionId ? (FACTIONS.find(f => f.id === loc.factionId)?.name ?? '') : '';
            return chatWithLordForObserver(
              { id: lord.id, name: lord.name, title: lord.title, focus: lord.focus },
              loc?.name ?? '',
              factionName,
              dialogue,
              aiConfig
            );
          }}
        />
      )}
      {observerSiegeModal && (
        <ObserverSiegeModal
          location={observerSiegeModal.loc}
          attackerName={observerSiegeModal.attackerName}
          attackerTroops={observerSiegeModal.attackerTroops}
          defenderName={observerSiegeModal.defenderName}
          defenderTroops={observerSiegeModal.defenderTroops}
          onResolve={observerSiegeModal.onResolve}
          getTroopName={(id) => getTroopTemplate(id)?.name ?? id}
        />
      )}
      {isObserverNewspaperOpen && (
        <ObserverNewspaperModal onClose={() => setIsObserverNewspaperOpen(false)} />
      )}
      {isObserverRelationsOpen && (
        <div className="fixed inset-0 z-50 bg-stone-950 overflow-auto">
          <div className="sticky top-0 z-10 bg-stone-900 border-b border-stone-700 px-4 py-2 flex justify-end">
              <button 
              onClick={() => setIsObserverRelationsOpen(false)}
              className="text-stone-400 hover:text-white px-3 py-1 rounded"
              >
              关闭
              </button>
           </div>
          <div className="max-w-6xl mx-auto p-4">
            <RelationsView
              locations={locations}
              player={player}
              worldDiplomacy={worldDiplomacy}
              onBackToMap={() => setIsObserverRelationsOpen(false)}
            />
           </div>
        </div>
      )}

      {/* AI Simulation Overlay */}
      {(isBattling || battleError) && renderBattleSimulation()}

      <LogConsole
        logs={logs}
        isExpanded={isLogExpanded}
        onToggleExpanded={() => setIsLogExpanded(!isLogExpanded)}
        visible={view !== 'BATTLE' && view !== 'BATTLE_RESULT' && view !== 'BANDIT_ENCOUNTER' && view !== 'HERO_CHAT' && view !== 'HIDEOUT_INSPECT' && view !== 'OBSERVER_MODE' && !isBattling}
      />
    </div>
  );
}
