import React from 'react';
import { AlertTriangle, Bird, Flag, Hammer, Info, Lock, MessageCircle, Shield, ShieldAlert, Skull, Swords, User } from 'lucide-react';
import { BattleResult, EnemyForce, Hero, Location, NegotiationResult, PlayerState, SiegeEngineType, Troop } from '../types';
import { Button } from './Button';

type BattlePlan = {
  stance: 'ATTACK' | 'DEFEND' | 'PROTECT';
  layers: { id: string; name: string; hint: string }[];
  assignments: Record<string, string | null>;
  protectedTroopIds: string[];
};

type BattleMeta = { mode: 'FIELD' | 'SIEGE' | 'DEFENSE_AID'; targetLocationId?: string; siegeContext?: string };

type SiegeEngineOption = { type: SiegeEngineType; name: string; cost: number; days: number; description: string };

type DefenseDetails = { wallName: string; wallLevel: number; wallHp: number; mechanismHp: number; rangedHitBonus: number; rangedDamageBonus: number; meleeDamageReduction: number; antiAirPowerBonus: number; airstrikeDamageReduction: number; mechanisms: { name: string; description: string }[] };

type BattleViewProps = {
  activeEnemy: EnemyForce | null;
  player: PlayerState;
  heroes: Hero[];
  pendingBattleMeta: BattleMeta | null;
  pendingBattleIsTraining: boolean;
  locations: Location[];
  negotiationState: {
    status: 'idle' | 'loading' | 'result';
    result: NegotiationResult | null;
    locked: boolean;
  };
  negotiationOpen: boolean;
  negotiationDialogue: Array<{ role: 'PLAYER' | 'ENEMY'; text: string }>;
  negotiationInput: string;
  negotiationError: string | null;
  setNegotiationInput: (value: string) => void;
  onSendNegotiation: () => void;
  onCloseNegotiation: () => void;
  battlePlan: BattlePlan;
  draggingTroopId: string | null;
  hoveredTroop: Troop | null;
  mousePos: { x: number; y: number };
  getBattleTroops: (player: PlayerState, heroes: Hero[]) => Troop[];
  calculatePower: (troops: Troop[]) => number;
  calculateFleeChance: (playerTroops: Troop[], enemyTroops: Troop[], escape: number) => number;
  calculateRearGuardPlan: (playerTroops: Troop[], enemyTroops: Troop[], escape: number) => { lost: number; successChance: number };
  estimateBattleRewards: (enemy: EnemyForce, player: PlayerState) => { gold: number; renown: number; xp: number };
  exitTrainingBattle: () => void;
  getTroopTemplate: (id: string) => Omit<Troop, 'count' | 'xp'> | undefined;
  setHoveredTroop: (troop: Troop | null) => void;
  setBattlePlan: React.Dispatch<React.SetStateAction<BattlePlan>>;
  setDraggingTroopId: (id: string | null) => void;
  startBattle: (isTraining: boolean, meta?: BattleMeta) => void;
  attemptFlee: () => void;
  sacrificeRetreat: () => void;
  onStartNegotiation: () => void;
  onAcceptNegotiation: () => void;
  onRejectNegotiation: () => void;
  copyPendingBattlePrompt: () => void;
  getLocationDefenseDetails: (location: Location) => DefenseDetails;
  getSiegeEngineName: (type: SiegeEngineType) => string;
  siegeEngineOptions: SiegeEngineOption[];
};

export const BattleView = ({
  activeEnemy,
  player,
  heroes,
  pendingBattleMeta,
  pendingBattleIsTraining,
  locations,
  negotiationState,
  negotiationOpen,
  negotiationDialogue,
  negotiationInput,
  negotiationError,
  setNegotiationInput,
  onSendNegotiation,
  onCloseNegotiation,
  battlePlan,
  draggingTroopId,
  hoveredTroop,
  mousePos,
  getBattleTroops,
  calculatePower,
  calculateFleeChance,
  calculateRearGuardPlan,
  estimateBattleRewards,
  exitTrainingBattle,
  getTroopTemplate,
  setHoveredTroop,
  setBattlePlan,
  setDraggingTroopId,
  startBattle,
  attemptFlee,
  sacrificeRetreat,
  onStartNegotiation,
  onAcceptNegotiation,
  onRejectNegotiation,
  copyPendingBattlePrompt,
  getLocationDefenseDetails,
  getSiegeEngineName,
  siegeEngineOptions
}: BattleViewProps) => {
  if (!activeEnemy) return null;

  let battleTroops = getBattleTroops(player, heroes);
  let garrisonTroops: Troop[] = [];
  let taggedGarrisonTroops: Troop[] = [];
  if (pendingBattleMeta?.mode === 'DEFENSE_AID' && pendingBattleMeta.targetLocationId) {
    const loc = locations.find(l => l.id === pendingBattleMeta.targetLocationId);
    if (loc?.type === 'HIDEOUT') {
      const hideout = loc.hideout;
      const layers = hideout?.layers ?? [];
      const layerIndex = loc.activeSiege?.hideoutLayerIndex ?? hideout?.selectedLayer ?? 0;
      const layer = layers[Math.max(0, Math.min(layers.length - 1, Math.floor(layerIndex)))];
      garrisonTroops = layer?.garrison ?? [];
    } else {
      garrisonTroops = loc?.garrison ?? [];
    }
    taggedGarrisonTroops = garrisonTroops.map(t => ({ ...t, id: `garrison_${t.id}` }));
  }

  const myPower = calculatePower([...battleTroops, ...garrisonTroops]);
  const enemyPower = calculatePower(activeEnemy.troops);
  const winChance = myPower / (myPower + enemyPower);
  const fleeChance = calculateFleeChance(battleTroops, activeEnemy.troops, player.attributes.escape ?? 0);
  const rearGuardPlan = calculateRearGuardPlan(battleTroops, activeEnemy.troops, player.attributes.escape ?? 0);
  const estimatedVictoryRewards = estimateBattleRewards(activeEnemy, player);
  const negotiationOffer = negotiationState.result?.decision === 'CONDITIONAL';
  const negotiationPercent = negotiationState.result?.goldPercent ?? 0;
  const negotiationDisabled = pendingBattleIsTraining || negotiationState.locked || negotiationState.status === 'loading';

  let prediction = "胜负难料";
  if (winChance > 0.7) prediction = "胜券在握";
  else if (winChance > 0.55) prediction = "略占优势";
  else if (winChance < 0.3) prediction = "凶多吉少";
  else if (winChance < 0.45) prediction = "处于劣势";

  const playerTotal = battleTroops.reduce((sum, t) => sum + t.count, 0) + garrisonTroops.reduce((sum, t) => sum + t.count, 0);
  const enemyTotal = activeEnemy.troops.reduce((sum, t) => sum + t.count, 0);
  const attributeMeta = [
    { key: 'attack', label: '攻击' },
    { key: 'defense', label: '防御' },
    { key: 'agility', label: '敏捷' },
    { key: 'hp', label: '体魄' },
    { key: 'range', label: '远程' },
    { key: 'morale', label: '士气' }
  ] as const;
  type AttrKey = typeof attributeMeta[number]['key'];
  const sumAttributes = (troops: Troop[]) => {
    const totals: Record<AttrKey, number> = { attack: 0, defense: 0, agility: 0, hp: 0, range: 0, morale: 0 };
    troops.forEach(t => {
      const template = getTroopTemplate(t.id);
      const attrs = template?.attributes ?? t.attributes;
      if (!attrs) return;
      const count = t.count ?? 0;
      totals.attack += attrs.attack * count;
      totals.defense += attrs.defense * count;
      totals.agility += attrs.agility * count;
      totals.hp += attrs.hp * count;
      totals.range += attrs.range * count;
      totals.morale += attrs.morale * count;
    });
    return totals;
  };
  const averageAttributes = (totals: Record<AttrKey, number>, count: number) => {
    const safe = Math.max(1, count);
    return {
      attack: totals.attack / safe,
      defense: totals.defense / safe,
      agility: totals.agility / safe,
      hp: totals.hp / safe,
      range: totals.range / safe,
      morale: totals.morale / safe
    };
  };
  const playerAttrTotals = sumAttributes([...battleTroops, ...garrisonTroops]);
  const enemyAttrTotals = sumAttributes(activeEnemy.troops);
  const playerAttrAvg = averageAttributes(playerAttrTotals, playerTotal);
  const enemyAttrAvg = averageAttributes(enemyAttrTotals, enemyTotal);
  const maxAttrAvg: Record<AttrKey, number> = {
    attack: Math.max(1, playerAttrAvg.attack, enemyAttrAvg.attack),
    defense: Math.max(1, playerAttrAvg.defense, enemyAttrAvg.defense),
    agility: Math.max(1, playerAttrAvg.agility, enemyAttrAvg.agility),
    hp: Math.max(1, playerAttrAvg.hp, enemyAttrAvg.hp),
    range: Math.max(1, playerAttrAvg.range, enemyAttrAvg.range),
    morale: Math.max(1, playerAttrAvg.morale, enemyAttrAvg.morale)
  };
  const radarSize = 180;
  const radarCenter = radarSize / 2;
  const radarRadius = 64;
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
  const axisPoints = attributeMeta.map((attr, index) => {
    const angle = (Math.PI * 2 * index) / attributeMeta.length - Math.PI / 2;
    const x = radarCenter + Math.cos(angle) * radarRadius;
    const y = radarCenter + Math.sin(angle) * radarRadius;
    const labelX = radarCenter + Math.cos(angle) * (radarRadius + 14);
    const labelY = radarCenter + Math.sin(angle) * (radarRadius + 14);
    return { x, y, labelX, labelY, label: attr.label };
  });

  const renderSoldierGrid = (total: number, remaining: number, color: string) => {
    const scale = Math.max(1, Math.ceil(total / 40));
    const totalIcons = Math.max(6, Math.ceil(total / scale));
    const aliveIcons = Math.max(0, Math.ceil(remaining / scale));
    return (
      <div className="grid grid-cols-8 gap-1">
        {Array.from({ length: totalIcons }).map((_, idx) => {
          const alive = idx < aliveIcons;
          return (
            <User
              key={idx}
              size={14}
              className={`${alive ? color : 'text-stone-700 opacity-40'} transition-colors`}
            />
          );
        })}
      </div>
    );
  };

  const buildHoverTroop = (troop: Troop) => {
    const tmpl = getTroopTemplate(troop.id);
    return tmpl
      ? ({ ...tmpl, count: troop.count, xp: troop.xp ?? 0, enchantments: troop.enchantments ?? tmpl.enchantments } as Troop)
      : ({ ...troop, equipment: (troop as any).equipment ?? [], description: (troop as any).description ?? '' } as Troop);
  };

  const renderTroopList = (troops: Troop[], align: 'left' | 'right', isLockedOverride: boolean = false) => (
    <div className="space-y-1 max-h-40 overflow-y-auto scrollbar-hide">
      {troops.map((t, i) => {
        const isGarrison = t.id.startsWith('garrison_');
        const isLocked = isLockedOverride || isGarrison;
        const hoverTroop = buildHoverTroop(t);
        const template = getTroopTemplate(t.id);
        const isHeavy = (template?.category ?? t.category) === 'HEAVY';
        const domain = template?.combatDomain ?? t.combatDomain ?? 'GROUND';
        const isAir = domain === 'AIR';
        const isHybrid = domain === 'HYBRID';
        return (
          <div
            key={`${t.id}-${i}`}
            className={`flex ${align === 'right' ? 'flex-row-reverse' : 'flex-row'} justify-between text-sm text-stone-300 border-b border-stone-800 pb-1 cursor-help hover:bg-stone-800/50 transition-colors p-1 rounded ${isLocked ? 'opacity-75' : ''}`}
            onMouseEnter={() => setHoveredTroop(hoverTroop)}
            onMouseLeave={() => setHoveredTroop(null)}
          >
            <span className="flex items-center gap-1">
              {isHeavy && <ShieldAlert size={10} className="text-emerald-400" />}
              {(isAir || isHybrid) && <Bird size={10} className="text-sky-300" />}
              {t.name}
              {isLocked && <Shield size={10} className="text-stone-500" />}
            </span>
            <span className="font-mono text-stone-500">x{t.count}</span>
          </div>
        );
      })}
    </div>
  );

  const layers = battlePlan.layers;
  const assignments = battlePlan.assignments;
  const protectedIds = battlePlan.protectedTroopIds;

  const setTroopLayer = (troopId: string, layerId: string | null) => {
    setBattlePlan(prev => ({
      ...prev,
      assignments: { ...prev.assignments, [troopId]: layerId }
    }));
  };

  const toggleProtected = (troopId: string) => {
    setBattlePlan(prev => {
      const exists = prev.protectedTroopIds.includes(troopId);
      return {
        ...prev,
        protectedTroopIds: exists
          ? prev.protectedTroopIds.filter(id => id !== troopId)
          : [...prev.protectedTroopIds, troopId]
      };
    });
  };

  const renderSiegeInfo = () => {
    if (!pendingBattleMeta || !pendingBattleMeta.targetLocationId) return null;
    if (pendingBattleMeta.mode !== 'SIEGE' && pendingBattleMeta.mode !== 'DEFENSE_AID') return null;

    const targetLoc = locations.find(l => l.id === pendingBattleMeta.targetLocationId);
    if (!targetLoc) return null;

    const isPlayerAttacking = pendingBattleMeta.mode === 'SIEGE';
    const attackerEngines = isPlayerAttacking
      ? (targetLoc.siegeEngines ?? [])
      : (activeEnemy.siegeEngines ?? []);

    const defenseDetails = getLocationDefenseDetails(targetLoc);
    const hasDefenseBuilding = (targetLoc.buildings ?? []).includes('DEFENSE');

    return (
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-stone-900/60 p-4 rounded border border-red-900/30">
          <h4 className="text-red-400 font-bold mb-2 flex items-center gap-2">
            <Hammer size={14} /> 攻城方器械
          </h4>
          {attackerEngines.length === 0 ? (
            <div className="text-stone-500 text-xs">无攻城器械（或使用云梯强攻）</div>
          ) : (
            <div className="flex flex-wrap gap-2">
              {attackerEngines.map((type, idx) => (
                <div key={idx} className="group relative cursor-help">
                  <span className="px-2 py-1 bg-stone-800 border border-stone-700 rounded text-xs text-stone-300">
                    {getSiegeEngineName(type)}
                  </span>
                  <div className="absolute bottom-full left-0 mb-2 w-48 bg-black border border-stone-700 p-2 rounded hidden group-hover:block z-50 text-xs text-stone-400">
                    {siegeEngineOptions.find(o => o.type === type)?.description}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-stone-900/60 p-4 rounded border border-blue-900/30">
          <h4 className="text-blue-400 font-bold mb-2 flex items-center gap-2">
            <Shield size={14} /> 守方防御设施
          </h4>
          <div className="space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-stone-400">城墙:</span>
              <span className="text-stone-200">{defenseDetails.wallName} (Lv.{defenseDetails.wallLevel})</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-stone-400">城防耐久:</span>
              <span className="text-stone-200">{defenseDetails.wallHp + defenseDetails.mechanismHp}</span>
            </div>
            <div className="text-stone-500">
              远程命中 +{Math.round(defenseDetails.rangedHitBonus * 100)}% · 远程伤害 +{Math.round(defenseDetails.rangedDamageBonus * 100)}% · 近战减伤 {Math.round(defenseDetails.meleeDamageReduction * 100)}%
            </div>
            <div className="text-stone-500">
              对空强度 +{Math.round(defenseDetails.antiAirPowerBonus * 100)}% · 空袭减伤 -{Math.round(defenseDetails.airstrikeDamageReduction * 100)}%
            </div>
            {hasDefenseBuilding && (
              <div className="text-amber-500">已建造额外防御建筑</div>
            )}
            <div>
              <span className="text-stone-400 block mb-1">防御器械:</span>
              <div className="flex flex-wrap gap-1">
                {defenseDetails.mechanisms.length > 0 ? defenseDetails.mechanisms.map((mech, i) => (
                  <div key={i} className="group relative cursor-help">
                    <span className="px-1.5 py-0.5 bg-stone-800 rounded text-stone-300 border border-stone-700 block">
                      {mech.name}
                    </span>
                    <div className="absolute bottom-full right-0 mb-2 w-48 bg-black border border-stone-700 p-2 rounded hidden group-hover:block z-50 text-xs text-stone-400">
                      {mech.description}
                    </div>
                  </div>
                )) : <span className="text-stone-600">无</span>}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const unassignedTroops = battleTroops.filter(t => !assignments[t.id]);

  return (
    <div className="max-w-2xl mx-auto p-4 pt-20 animate-fade-in pb-20 relative">
      {hoveredTroop && (
        <div
          className="fixed z-50 bg-stone-900 border border-amber-500/50 p-4 rounded shadow-2xl pointer-events-none w-64 text-left"
          style={{
            left: Math.min(window.innerWidth - 270, mousePos.x + 20),
            top: Math.min(window.innerHeight - 300, mousePos.y + 20)
          }}
        >
          <div className="flex justify-between items-start mb-2 border-b border-stone-700 pb-1">
            <h4 className="font-bold text-amber-500 text-lg">{hoveredTroop.name}</h4>
            <span className="text-xs bg-stone-800 px-1 rounded text-stone-400">T{hoveredTroop.tier}</span>
          </div>
          <div className="text-xs text-stone-400 mb-2 space-y-1">
            <p>⚔️ 基础战力: <span className="text-stone-200">{hoveredTroop.basePower}</span></p>
            <p>🛡️ 装备: {(hoveredTroop.equipment ?? []).join(', ')}</p>
          </div>
          {hoveredTroop.enchantments && hoveredTroop.enchantments.length > 0 && (
            <div className="text-xs text-fuchsia-300 mb-2 space-y-1">
              {hoveredTroop.enchantments.map(enchantment => (
                <div key={enchantment.id}>
                  <span className="font-semibold">{enchantment.name}</span>
                  <span className="text-fuchsia-200">：{enchantment.description}</span>
                </div>
              ))}
            </div>
          )}
          <p className="text-xs text-stone-500 italic border-l-2 border-stone-600 pl-2">
            {hoveredTroop.description}
          </p>
        </div>
      )}

      <div className="bg-stone-900 border-2 border-red-900/50 p-8 rounded shadow-2xl text-center relative overflow-hidden">
        <div className="absolute inset-0 bg-repeat opacity-5 pointer-events-none" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'60\' height=\'60\' viewBox=\'0 0 60 60\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cpath d=\'M30 30h30v30H30zM0 0h30v30H0z\' fill=\'%235c4d3c\' fill-opacity=\'0.1\' fill-rule=\'evenodd\'/%3E%3C/svg%3E")' }}></div>
        <h2 className="text-3xl font-serif text-red-500 mb-2 flex items-center justify-center gap-2">
          <ShieldAlert /> 遭遇敌军
        </h2>
        <h1 className="text-5xl font-serif text-stone-200 mb-6">{activeEnemy.name}</h1>
        <p className="text-stone-400 italic mb-8 max-w-lg mx-auto">"{activeEnemy.description}"</p>

        <div className="grid grid-cols-3 gap-4 mb-8">
          {renderSiegeInfo() && (
            <div className="col-span-3">
              {renderSiegeInfo()}
            </div>
          )}
          <div className="bg-black/30 p-4 rounded border border-stone-800 text-left space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-emerald-400 font-bold">我方阵地</span>
              <span className="text-stone-500 text-xs">{playerTotal} 人</span>
            </div>
            {renderSoldierGrid(playerTotal, playerTotal, 'text-emerald-400')}
          </div>
          <div className="flex flex-col items-center justify-center gap-3">
            <Button onClick={() => startBattle(pendingBattleIsTraining, pendingBattleMeta ?? undefined)} size="lg" variant="danger" className="w-full">
              <Swords className="inline mr-2" /> 开始战斗
            </Button>
            <Button
              onClick={onStartNegotiation}
              size="lg"
              variant="secondary"
              className="w-full"
              disabled={negotiationDisabled}
            >
              <MessageCircle className="inline mr-2" /> 谈判
            </Button>
            <div className="text-stone-500 text-xs text-center">点击后生成完整战报</div>
            {negotiationState.status === 'loading' && (
              <div className="text-xs text-amber-400">谈判中…</div>
            )}
            {negotiationState.locked && negotiationState.result?.decision === 'REFUSE' && (
              <div className="text-xs text-red-400">对方拒绝谈判</div>
            )}
            {negotiationOffer && !negotiationState.locked && (
              <div className="w-full bg-black/40 border border-amber-700/40 rounded p-3 text-xs text-stone-300 space-y-2">
                <div>对方要求上交 {negotiationPercent}% 钱财后撤军。</div>
                <div className="flex gap-2">
                  <Button onClick={onAcceptNegotiation} size="sm" variant="primary" className="flex-1">
                    接受
                  </Button>
                  <Button onClick={onRejectNegotiation} size="sm" variant="secondary" className="flex-1">
                    拒绝
                  </Button>
                </div>
              </div>
            )}
          </div>
          <div className="bg-black/30 p-4 rounded border border-stone-800 text-right space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-stone-500 text-xs">{enemyTotal} 人</span>
              <span className="text-red-400 font-bold">敌方阵地</span>
            </div>
            {renderSoldierGrid(enemyTotal, enemyTotal, 'text-red-400')}
          </div>
        </div>

        {negotiationOpen && (
          <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
            <div className="w-full max-w-2xl bg-stone-900 border border-stone-700 rounded shadow-2xl overflow-hidden">
              <div className="px-4 py-3 border-b border-stone-700 flex items-center justify-between">
                <div className="text-stone-200 font-bold">谈判</div>
                <Button variant="secondary" onClick={onCloseNegotiation}>关闭</Button>
              </div>
              <div className="p-4 space-y-3 max-h-[60vh] overflow-y-auto">
                {negotiationDialogue.length === 0 ? (
                  <div className="text-sm text-stone-500">暂无对话。</div>
                ) : (
                  negotiationDialogue.map((line, idx) => (
                    <div key={idx} className={`flex ${line.role === 'PLAYER' ? 'justify-end' : 'justify-start'}`}>
                      <div className={`px-3 py-2 rounded border text-sm ${line.role === 'PLAYER' ? 'bg-amber-900/30 border-amber-800/60 text-amber-200' : 'bg-stone-950/40 border-stone-800 text-stone-200'}`}>
                        {line.text}
                      </div>
                    </div>
                  ))
                )}
                {negotiationState.status === 'loading' && (
                  <div className="text-xs text-amber-400">谈判中…</div>
                )}
                {negotiationState.locked && negotiationState.result?.decision === 'REFUSE' && (
                  <div className="text-xs text-red-400">对方拒绝谈判</div>
                )}
                {negotiationError && (
                  <div className="text-xs text-red-400">{negotiationError}</div>
                )}
              </div>
              <div className="p-4 border-t border-stone-700 space-y-2">
                <div className="flex gap-2">
                  <input
                    value={negotiationInput}
                    onChange={(e) => setNegotiationInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key !== 'Enter') return;
                      const composing = (e.nativeEvent as any)?.isComposing;
                      if (composing) return;
                      e.preventDefault();
                      onSendNegotiation();
                    }}
                    className="flex-1 bg-stone-950 border border-stone-700 text-stone-200 px-3 py-2 rounded placeholder:text-stone-600"
                    placeholder="输入谈判内容..."
                    disabled={negotiationState.status === 'loading' || negotiationState.locked}
                  />
                  <Button
                    onClick={onSendNegotiation}
                    variant="secondary"
                    disabled={negotiationState.status === 'loading' || negotiationState.locked || !negotiationInput.trim()}
                  >
                    发送
                  </Button>
                </div>
                {negotiationOffer && !negotiationState.locked && (
                  <div className="w-full bg-black/40 border border-amber-700/40 rounded p-3 text-xs text-stone-300 space-y-2">
                    <div>对方要求上交 {negotiationPercent}% 钱财后撤军。</div>
                    <div className="flex gap-2">
                      <Button onClick={onAcceptNegotiation} size="sm" variant="primary" className="flex-1">
                        接受
                      </Button>
                      <Button onClick={onRejectNegotiation} size="sm" variant="secondary" className="flex-1">
                        拒绝
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-8 mb-8 text-left">
          <div className="bg-black/30 p-4 rounded border border-stone-800">
            <h3 className="text-amber-500 font-bold mb-2 border-b border-stone-700 pb-1 flex justify-between">
              我方部队 <Info size={14} className="text-stone-600" />
            </h3>
            {renderTroopList([...battleTroops, ...taggedGarrisonTroops], 'left')}
          </div>

          <div className="bg-black/30 p-4 rounded border border-stone-800">
            <h3 className="text-red-500 font-bold mb-2 border-b border-stone-700 pb-1 text-right flex flex-row-reverse justify-between">
              敌方部队 <Info size={14} className="text-stone-600" />
            </h3>
            {renderTroopList(activeEnemy.troops, 'right')}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8 text-left">
          <div className="bg-black/30 p-4 rounded border border-stone-800">
            <h3 className="text-amber-500 font-bold mb-3 border-b border-stone-700 pb-1">属性平均值（六边形）</h3>
            <div className="flex items-center justify-center">
              <svg width={radarSize} height={radarSize} viewBox={`0 0 ${radarSize} ${radarSize}`}>
                <polygon points={radarPoints(maxAttrAvg, maxAttrAvg, 1)} fill="none" stroke="#2a2a2a" strokeWidth="1" />
                <polygon points={radarPoints(maxAttrAvg, maxAttrAvg, 0.66)} fill="none" stroke="#202020" strokeWidth="1" />
                <polygon points={radarPoints(maxAttrAvg, maxAttrAvg, 0.33)} fill="none" stroke="#202020" strokeWidth="1" />
                {axisPoints.map((axis, idx) => (
                  <line key={`axis-${idx}`} x1={radarCenter} y1={radarCenter} x2={axis.x} y2={axis.y} stroke="#242424" strokeWidth="1" />
                ))}
                <polygon points={radarPoints(playerAttrAvg, maxAttrAvg)} fill="rgba(239, 68, 68, 0.35)" stroke="#ef4444" strokeWidth="1.5" />
                <polygon points={radarPoints(enemyAttrAvg, maxAttrAvg)} fill="rgba(59, 130, 246, 0.35)" stroke="#3b82f6" strokeWidth="1.5" />
                {axisPoints.map((axis, idx) => (
                  <text key={`label-${idx}`} x={axis.labelX} y={axis.labelY} fill="#9ca3af" fontSize="10" textAnchor="middle" dominantBaseline="middle">
                    {axis.label}
                  </text>
                ))}
              </svg>
            </div>
            <div className="flex justify-center gap-6 text-xs text-stone-400">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-red-500"></span>
                我方平均
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                敌方平均
              </div>
            </div>
          </div>
          <div className="bg-black/30 p-4 rounded border border-stone-800">
            <h3 className="text-amber-500 font-bold mb-3 border-b border-stone-700 pb-1">属性总和对比</h3>
            <div className="space-y-3">
              {attributeMeta.map(attr => {
                const playerTotalAttr = playerAttrTotals[attr.key];
                const enemyTotalAttr = enemyAttrTotals[attr.key];
                const totalAttr = playerTotalAttr + enemyTotalAttr;
                const playerRatio = totalAttr > 0 ? playerTotalAttr / totalAttr : 0.5;
                const enemyRatio = totalAttr > 0 ? enemyTotalAttr / totalAttr : 0.5;
                return (
                  <div key={attr.key}>
                    <div className="flex items-center justify-between text-xs text-stone-400 mb-1">
                      <span>{attr.label}</span>
                      <span className="flex items-center gap-3">
                        <span className="text-red-400">{Math.round(playerRatio * 100)}%</span>
                        <span className="text-blue-400">{Math.round(enemyRatio * 100)}%</span>
                      </span>
                    </div>
                    <div className="h-2 flex rounded overflow-hidden border border-stone-700 bg-stone-900">
                      <div className="bg-red-600" style={{ width: `${playerRatio * 100}%` }} />
                      <div className="bg-blue-600" style={{ width: `${enemyRatio * 100}%` }} />
                    </div>
                    <div className="flex items-center justify-between text-[10px] text-stone-500 mt-1">
                      <span>我方 {Math.round(playerTotalAttr)}</span>
                      <span>敌方 {Math.round(enemyTotalAttr)}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="bg-black/30 p-5 rounded border border-stone-800 text-left mb-8 space-y-4">
          <div className="flex items-center justify-between">
            <div className="text-amber-500 font-bold">战前部署</div>
            <div className="flex gap-2">
              <button
                onClick={copyPendingBattlePrompt}
                className="px-3 py-1 rounded text-xs border bg-stone-900 text-stone-400 border-stone-700 hover:bg-stone-800"
                title="调试：复制将发送给 AI 的战斗提示词"
              >
                复制Prompt
              </button>
              <button
                onClick={() => setBattlePlan(prev => ({ ...prev, stance: 'ATTACK' }))}
                className={`px-3 py-1 rounded text-xs border ${battlePlan.stance === 'ATTACK' ? 'bg-amber-600 text-black border-amber-500' : 'bg-stone-900 text-stone-400 border-stone-700'}`}
              >
                进攻
              </button>
              <button
                onClick={() => setBattlePlan(prev => ({ ...prev, stance: 'DEFEND' }))}
                className={`px-3 py-1 rounded text-xs border ${battlePlan.stance === 'DEFEND' ? 'bg-amber-600 text-black border-amber-500' : 'bg-stone-900 text-stone-400 border-stone-700'}`}
              >
                防守
              </button>
              <button
                onClick={() => setBattlePlan(prev => ({ ...prev, stance: 'PROTECT' }))}
                className={`px-3 py-1 rounded text-xs border ${battlePlan.stance === 'PROTECT' ? 'bg-amber-600 text-black border-amber-500' : 'bg-stone-900 text-stone-400 border-stone-700'}`}
              >
                重点保护
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between text-xs text-stone-500">
            <span>层级从外到内排列</span>
            <span>悬浮层级查看用途</span>
          </div>

          <div className="grid grid-cols-1 gap-3">
            {layers.map((layer, index) => {
              const playerLayerTroops = battleTroops.filter(t => assignments[t.id] === layer.id);
              const garrisonLayerTroops = index === 0 ? taggedGarrisonTroops : [];
              const troops = [...playerLayerTroops, ...garrisonLayerTroops];
              return (
                <div
                  key={layer.id}
                  title={layer.hint}
                  className="rounded border border-stone-700 bg-stone-900/60 p-3 hover:border-amber-500/70 transition-colors"
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={() => {
                    if (draggingTroopId) {
                      setTroopLayer(draggingTroopId, layer.id);
                      setDraggingTroopId(null);
                    }
                  }}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <div className="text-sm text-amber-500 font-bold">{index + 1}</div>
                      <div className="text-stone-200 font-bold text-sm">{layer.name}</div>
                    </div>
                    <div className="text-xs text-stone-500">{layer.hint}</div>
                  </div>
                  {troops.length === 0 ? (
                    <div className="text-xs text-stone-600">拖动单位到此层</div>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {troops.map(troop => {
                        const isGarrison = troop.id.startsWith('garrison_');
                        const template = getTroopTemplate(troop.id);
                        const isHeavy = (template?.category ?? troop.category) === 'HEAVY';
                        return (
                          <div
                            key={troop.id}
                            draggable={!isGarrison}
                            onDragStart={() => !isGarrison && setDraggingTroopId(troop.id)}
                            onDragEnd={() => setDraggingTroopId(null)}
                            onMouseEnter={() => setHoveredTroop(buildHoverTroop(troop))}
                            onMouseLeave={() => setHoveredTroop(null)}
                            className={`flex items-center gap-2 px-2 py-1 rounded border border-stone-700 bg-stone-950 text-xs text-stone-300 transition-all duration-200 ease-out ${draggingTroopId === troop.id ? 'opacity-60 scale-[0.98] shadow-lg shadow-black/40' : 'hover:scale-[1.02]'} ${isGarrison ? 'cursor-not-allowed opacity-80 border-amber-900/50' : 'cursor-grab active:cursor-grabbing'}`}
                          >
                            <span className="flex items-center gap-1">
                              {isHeavy && <ShieldAlert size={10} className="text-emerald-400" />}
                              {troop.name} x{troop.count}
                            </span>
                            {isGarrison ? (
                              <Lock size={10} className="text-stone-500 ml-1" />
                            ) : (
                              <button
                                onClick={() => toggleProtected(troop.id)}
                                className={`px-1.5 py-0.5 rounded border ${protectedIds.includes(troop.id) ? 'border-amber-500 text-amber-400' : 'border-stone-700 text-stone-500'}`}
                              >
                                保护
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div
            className={`rounded border border-dashed border-stone-700 bg-stone-900/40 p-3 transition-colors ${draggingTroopId ? 'border-amber-500/40' : ''}`}
            onDragOver={(e) => e.preventDefault()}
            onDrop={() => {
              if (draggingTroopId) {
                setTroopLayer(draggingTroopId, null);
                setDraggingTroopId(null);
              }
            }}
          >
            <div className="text-xs text-stone-500 mb-2">未分配</div>
            {unassignedTroops.length === 0 ? (
              <div className="text-xs text-stone-600">无</div>
            ) : (
              <div className="flex flex-wrap gap-2">
                {unassignedTroops.map(troop => {
                  const template = getTroopTemplate(troop.id);
                  const isHeavy = (template?.category ?? troop.category) === 'HEAVY';
                  return (
                    <div
                      key={troop.id}
                      draggable
                      onDragStart={() => setDraggingTroopId(troop.id)}
                      onDragEnd={() => setDraggingTroopId(null)}
                      onMouseEnter={() => setHoveredTroop(buildHoverTroop(troop))}
                      onMouseLeave={() => setHoveredTroop(null)}
                      className={`flex items-center gap-2 px-2 py-1 rounded border border-stone-700 bg-stone-950 text-xs text-stone-300 cursor-grab active:cursor-grabbing transition-all duration-200 ease-out ${draggingTroopId === troop.id ? 'opacity-60 scale-[0.98] shadow-lg shadow-black/40' : 'hover:scale-[1.02]'}`}
                    >
                      <span className="flex items-center gap-1">
                        {isHeavy && <ShieldAlert size={10} className="text-emerald-400" />}
                        {troop.name} x{troop.count}
                      </span>
                      <button
                        onClick={() => toggleProtected(troop.id)}
                        className={`px-1.5 py-0.5 rounded border ${protectedIds.includes(troop.id) ? 'border-amber-500 text-amber-400' : 'border-stone-700 text-stone-500'}`}
                      >
                        保护
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-between items-center text-sm mb-6 px-4">
          <span className="text-stone-500">预估战力对比</span>
          <div className="flex flex-col items-end">
            <span className={`font-bold text-lg ${winChance > 0.5 ? 'text-green-500' : 'text-red-500'}`}>
              {prediction}
            </span>
            <span className="text-xs text-stone-600">({Math.round(winChance * 100)}% 胜率)</span>
            {!pendingBattleIsTraining && (
              <span className="text-xs text-stone-600">
                预计胜利经验 +{estimatedVictoryRewards.xp}（期望值约 +{Math.max(0, Math.round(estimatedVictoryRewards.xp * winChance))}）
              </span>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-3">
          {pendingBattleIsTraining ? (
            <div className="flex gap-3">
              <Button onClick={exitTrainingBattle} className="flex-1" variant="secondary">
                返回训练场
              </Button>
            </div>
          ) : (
            <div className="flex gap-3">
              <Button onClick={attemptFlee} className="flex-1" variant="secondary">
                <Flag className="inline mr-2" size={14} /> 尝试逃跑 ({Math.floor(fleeChance * 100)}% 成功率)
              </Button>
              <Button onClick={sacrificeRetreat} className="flex-1" variant="secondary">
                <Skull className="inline mr-2" size={14} /> 断尾求生 (牺牲 {rearGuardPlan.lost} 人 | {Math.floor(rearGuardPlan.successChance * 100)}% 成功率)
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
