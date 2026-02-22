import React from 'react';
import { AlertTriangle, Beer, Coins, Ghost, Hammer, History, Home, MessageCircle, Mountain, Shield, ShieldAlert, Skull, Star, Swords, Users, Utensils, Zap } from 'lucide-react';
import { Button } from '../components/Button';
import { TroopCard } from '../components/TroopCard';
import { chatWithAltar, chatWithLord } from '../services/geminiService';
import { AIProvider, AltarDoctrine, AltarTroopDraft, BuildingType, EnemyForce, Enchantment, Hero, Location, LordFocus, MineralId, MineralPurity, PlayerState, RecruitOffer, SiegeEngineType, StayParty, Troop, TroopTier } from '../types';

type TownTab = 'RECRUIT' | 'TAVERN' | 'GARRISON' | 'LOCAL_GARRISON' | 'DEFENSE' | 'MEMORIAL' | 'WORK' | 'SIEGE' | 'OWNED' | 'COFFEE_CHAT' | 'MINING' | 'FORGE' | 'ROACH_LURE' | 'IMPOSTER_STATIONED' | 'LORD' | 'ALTAR' | 'ALTAR_RECRUIT';

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

type AltarRecruitState = {
  isActive: boolean;
  locationId: string;
  totalDays: number;
  daysPassed: number;
  recruitedByTroopId: Record<string, number>;
};

type TownViewProps = {
  currentLocation: Location | null;
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
  getLocationDefenseDetails: (location: Location) => { wallLevel: number; wallName: string; wallDesc: string; mechanisms: { name: string; description: string }[]; flavorText: string; wallHp: number; mechanismHp: number; rangedHitBonus: number; rangedDamageBonus: number; meleeDamageReduction: number };
  getSiegeEngineName: (type: SiegeEngineType) => string;
  siegeEngineOptions: { type: SiegeEngineType; name: string; cost: number; days: number; description: string }[];
  startSiegeBattle: (location: Location) => void;
  handleRecruitOffer: (offer: RecruitOffer, type: 'VOLUNTEER' | 'MERCENARY', amountToRecruit?: number) => void;
  updateLocationState: (location: Location) => void;
  setPlayer: React.Dispatch<React.SetStateAction<PlayerState>>;
  setActiveEnemy: React.Dispatch<React.SetStateAction<EnemyForce | null>>;
  setPendingBattleMeta: React.Dispatch<React.SetStateAction<{ mode: 'FIELD' | 'SIEGE' | 'DEFENSE_AID'; targetLocationId?: string; siegeContext?: string } | null>>;
  setPendingBattleIsTraining: React.Dispatch<React.SetStateAction<boolean>>;
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
    return {
      backgroundImage: `url("/image/${type}.webp"), url("/image/${type}.png"), url("/image/${type}.jpg"), url("/image/${type}.jpeg")`,
      backgroundSize: 'cover',
      backgroundPosition: 'center'
    };
  };

  const isCity = currentLocation.type === 'CITY';
  const isCastle = currentLocation.type === 'CASTLE';
  const isVillage = currentLocation.type === 'VILLAGE';
  const isRoachNest = currentLocation.type === 'ROACH_NEST';
  const isSiegeTarget = isCity || isCastle || isVillage || isRoachNest;
  const isGraveyard = currentLocation.type === 'GRAVEYARD';
  const isHotpot = currentLocation.type === 'HOTPOT_RESTAURANT';
  const isCoffee = currentLocation.type === 'COFFEE';
  const isHeavyTrialGrounds = currentLocation.type === 'HEAVY_TRIAL_GROUNDS';
  const isImposterPortal = currentLocation.type === 'IMPOSTER_PORTAL';
  const isAltar = currentLocation.type === 'ALTAR';
  const mineConfig = mineConfigs[currentLocation.type];
  const isMine = !!mineConfig;
  const isBlacksmith = currentLocation.type === 'BLACKSMITH';
  const isSpecialLocation = isMine || isBlacksmith || isAltar;
  const isOwnedByPlayer = currentLocation.owner === 'PLAYER';
  const isRestricted = (currentLocation.sackedUntilDay ?? 0) >= player.day || currentLocation.owner === 'ENEMY' || !!currentLocation.isUnderSiege;
  const restrictedTabs = ['RECRUIT', 'TAVERN', 'WORK', 'MEMORIAL', 'COFFEE_CHAT', 'OWNED', 'MINING', 'FORGE', 'ROACH_LURE', 'LORD'];
  const specialHiddenTabs = ['RECRUIT', 'GARRISON', 'LOCAL_GARRISON', 'DEFENSE', 'SIEGE', 'OWNED', 'TAVERN', 'WORK', 'MEMORIAL', 'COFFEE_CHAT', 'LORD'];
  const specialFallbackTab = isMine ? 'MINING' : isBlacksmith ? 'FORGE' : isAltar ? 'ALTAR' : 'LOCAL_GARRISON';
  const activeTownTab = (isOwnedByPlayer && townTab === 'LORD')
    ? 'LOCAL_GARRISON'
    : (isSpecialLocation && specialHiddenTabs.includes(townTab))
      ? specialFallbackTab
      : (isRestricted && restrictedTabs.includes(townTab))
        ? 'LOCAL_GARRISON'
        : (isImposterPortal && townTab !== 'IMPOSTER_STATIONED' && townTab !== 'DEFENSE' && townTab !== 'LOCAL_GARRISON' && townTab !== 'SIEGE')
          ? 'LOCAL_GARRISON'
          : townTab;

  const recruitLabel = isGraveyard ? "挖掘尸体" : isHotpot ? "点菜 (招募)" : isCoffee ? "招募亡灵" : isHeavyTrialGrounds ? "采购重型单位" : "征募志愿兵";
  const tavernLabel = "前往酒馆";

  const currentTroopCount = player.troops.reduce((a, b) => a + b.count, 0);
  const maxTroops = getMaxTroops();
  const cityRestCost = 5;
  const canRestInCity = player.gold >= cityRestCost;
  const altarDialogue = altarDialogues[currentLocation.id] ?? [];
  const altarDraft = altarDrafts[currentLocation.id] ?? { domain: '', spread: '', blessing: '' };
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
  const currentLord = currentLocation.lord ?? null;

  React.useEffect(() => {
    if (isAltar && activeTownTab === 'ALTAR_RECRUIT' && !altarHasTree) {
      setTownTab('ALTAR');
    }
  }, [isAltar, activeTownTab, altarHasTree, setTownTab]);
  const hasLord = !!currentLord && !isOwnedByPlayer;
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
  const getStayPartyOwnerLabel = (party: StayParty) => {
    if (party.owner === 'PLAYER') return '玩家';
    if (party.lordId && currentLocation.lord?.id === party.lordId) return currentLocation.lord?.name ?? '领主';
    if (party.owner === 'ENEMY') return '敌军';
    return '中立';
  };
  const [lordDialogue, setLordDialogue] = React.useState<{ role: 'PLAYER' | 'LORD'; text: string }[]>([]);
  const [lordChatInput, setLordChatInput] = React.useState('');
  const [isLordChatLoading, setIsLordChatLoading] = React.useState(false);
  const [altarChatInput, setAltarChatInput] = React.useState('');
  React.useEffect(() => {
    if (!currentLord) {
      setLordDialogue([]);
      return;
    }
    setLordDialogue([{ role: 'LORD', text: `${currentLord.title}${currentLord.name} 正在 ${currentLocation.name} 接见来访者。` }]);
  }, [currentLocation.id, currentLord?.id]);

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
  const workIncomePerDay = 20;
  const mineralInventory = player.minerals ?? initialMinerals;
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
  const updateLordData = (updates: Partial<Location['lord']>) => {
    if (!currentLord) return;
    updateLocationState({ ...currentLocation, lord: { ...currentLord, ...updates } });
  };
  const updateLordRelation = (delta: number) => {
    if (!currentLord) return;
    const nextRelation = Math.max(-100, Math.min(100, currentLord.relation + delta));
    if (nextRelation === currentLord.relation) return;
    updateLocationState({ ...currentLocation, lord: { ...currentLord, relation: nextRelation } });
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
      const response = await chatWithLord(
        nextDialogue,
        currentLord,
        playerRef.current,
        recentLogs,
        currentLocation.localLogs ?? [],
        buildLordGarrisonSummary(),
        aiConfig
      );
      const reply = response.reply;
      setLordDialogue(prev => [...prev, { role: 'LORD' as const, text: reply }].slice(-16));
      const relationDelta = Math.max(-2, Math.min(2, Number(response.relationDelta ?? 0)));
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
  const totalGarrisonCount = localGarrison.reduce((sum, unit) => sum + unit.count, 0);
  const totalGarrisonPower = localGarrison.reduce((sum, unit) => sum + unit.count * unit.troop.basePower, 0);
  const isImposterAlerted = (currentLocation.imposterAlertUntilDay ?? 0) >= player.day;
  const isSacked = (currentLocation.sackedUntilDay ?? 0) >= player.day;
  const localDefenseDetails = getLocationDefenseDetails(currentLocation);
  const garrisonLimit = getGarrisonLimit(currentLocation);
  const currentGarrisonCount = getGarrisonCount(ownedGarrison);
  const siegeEngines = currentLocation.siegeEngines ?? [];
  const siegeEngineQueue = currentLocation.siegeEngineQueue ?? [];
  const constructionQueue = currentLocation.constructionQueue ?? [];
  const builtBuildings = currentLocation.buildings ?? [];

  const handleBuySiegeEngine = (engine: { type: SiegeEngineType; name: string; cost: number; days: number }) => {
    if (!isSiegeTarget && !isImposterPortal) return;
    if (player.gold < engine.cost) {
      addLog("资金不足，无法购买攻城器械。");
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
                守军剩余: <span className="text-green-300">{getGarrisonCount(currentLocation.garrison ?? [])}人</span>。
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
      </div>

      <div className="min-h-[400px]">
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

        {isCoffee && activeTownTab === 'COFFEE_CHAT' && (
          <div className="space-y-4 animate-fade-in">
            <div className="bg-stone-900/40 p-4 rounded border border-stone-800 text-sm text-stone-400 flex items-center justify-between gap-3">
              <div>亡灵们会记得你最近的经历，也会盯着你的队伍阵容评头论足。</div>
              <div className="text-xs text-stone-600 whitespace-nowrap">Enter 发送</div>
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
              <div className="text-stone-400">预计收入：{workDays * workIncomePerDay} 第纳尔</div>
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

        {isAltar && activeTownTab === 'ALTAR' && (
          <div className="space-y-6 animate-fade-in">
            <div className="bg-stone-900/40 p-4 rounded border border-stone-800">
              <p className="text-stone-400 text-sm">
                祭坛深处的神秘人等待你的教义。对话会实时更新兵种草案，满意后再确立教义。
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
                    placeholder="与神秘人对话，描述权柄、散播方式、禁忌祝福"
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
                {buildingOptions.map(building => {
                  const disabled = player.gold < building.cost || builtBuildings.includes(building.type) || constructionQueue.some(q => q.type === building.type);
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
        {activeTownTab === 'LORD' && hasLord && currentLord && (
          <div className="space-y-6 animate-fade-in">
            <div className="bg-stone-900/40 p-4 rounded border border-stone-800">
              <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-2">
                <div>
                  <div className="text-amber-400 font-bold">{currentLord.title} · {currentLord.name}</div>
                  <div className="text-xs text-stone-500 mt-1">封地：{currentLocation.name}</div>
                </div>
                <div className="text-xs text-stone-500">关系：{getLordRelationLabel(currentLord.relation)}（{currentLord.relation}）</div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-stone-400 mt-3">
                <div>性格：{currentLord.temperament}</div>
                <div>方针：{lordFocusLabels[currentLord.focus]}</div>
                <div className="md:col-span-2">特质：{currentLord.traits.join('、')}</div>
              </div>
            </div>

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
              <Button onClick={handleLordGreeting} variant="secondary">致意</Button>
              <Button onClick={handleLordGift} variant="gold">赠礼 50 第纳尔</Button>
              <Button onClick={handleLordPolicy} variant="secondary">询问方略</Button>
              <Button onClick={handleLordRecent} variant="secondary">询问近况</Button>
            </div>

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
          </div>
        )}

        {activeTownTab === 'MEMORIAL' && (
          <div className="animate-fade-in">
            <div className="col-span-1 md:col-span-2 bg-stone-900/40 p-4 rounded border border-stone-800 mb-4">
              <p className="text-stone-400 text-sm">这里记录着所有为你牺牲的战士。</p>
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
