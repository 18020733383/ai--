import React from 'react';
import { Button } from '../../../components/Button';
import { getTroopRace, TROOP_RACE_LABELS } from '../../../game/data';
import { proposeHeroPromotion, type HeroPromotionDraft } from '../../../services/geminiService';
import { AIProvider, Hero, PlayerState, Troop } from '../../../types';

type AIConfig = {
  baseUrl: string;
  apiKey: string;
  model: string;
  provider: AIProvider;
};

type RecompilerSectionProps = {
  player: PlayerState;
  playerRef: React.MutableRefObject<PlayerState>;
  setHeroes: React.Dispatch<React.SetStateAction<Hero[]>>;
  addLog: (text: string) => void;
  getTroopTemplate: (id: string) => Omit<Troop, 'count' | 'xp'> | undefined;
  buildAIConfig: () => AIConfig | undefined;
  onConsumeRecompilerSoldier: (payload: { soldierId: string; troopId: string; goldCost: number; crystalTier: number }) => void;
};

const tiers = [
  { tier: 1, name: '混沌碎片', model: '1B-3B（小模型）', boost: 0.2, troopTierReq: 2, goldCost: 600 },
  { tier: 2, name: '逻辑原石', model: '7B（主流开源）', boost: 0.5, troopTierReq: 3, goldCost: 1200 },
  { tier: 3, name: '灵知晶体', model: '14B-32B（进阶）', boost: 1.0, troopTierReq: 4, goldCost: 2600 },
  { tier: 4, name: '虚空核心', model: '70B+（顶级开源）', boost: 2.0, troopTierReq: 5, goldCost: 5200 },
  { tier: 5, name: '奇点神格', model: 'GPT-4 / Claude 3（最强商业）', boost: 4.0, troopTierReq: 5, goldCost: 9800 }
] as const;

const clampValue = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n));

export const RecompilerSection = ({
  player,
  playerRef,
  setHeroes,
  addLog,
  getTroopTemplate,
  buildAIConfig,
  onConsumeRecompilerSoldier
}: RecompilerSectionProps) => {
  const [recompilerTroopId, setRecompilerTroopId] = React.useState<string | null>(null);
  const [recompilerSoldierId, setRecompilerSoldierId] = React.useState<string | null>(null);
  const [recompilerCrystalTier, setRecompilerCrystalTier] = React.useState<number>(1);
  const [recompilerDraft, setRecompilerDraft] = React.useState<HeroPromotionDraft | null>(null);
  const [recompilerNameDraft, setRecompilerNameDraft] = React.useState('');
  const [isRecompilerLoading, setIsRecompilerLoading] = React.useState(false);
  const [recompilerError, setRecompilerError] = React.useState<string | null>(null);

  const resetDraft = () => {
    setRecompilerDraft(null);
    setRecompilerNameDraft('');
    setRecompilerError(null);
  };

  const selectedTier = tiers.find(item => item.tier === recompilerCrystalTier) ?? tiers[0];
  const inv = (player.minerals as any)?.HERO_CRYSTAL ?? { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  const canAffordGold = player.gold >= selectedTier.goldCost;
  const canAffordCrystal = (inv[selectedTier.tier] ?? 0) >= 1;
  const selectedSoldier = (player.soldiers ?? []).find(s => s.id === recompilerSoldierId && s.status === 'ACTIVE') ?? null;
  const soldierTier = selectedSoldier?.tier ?? 0;
  const meetsLevel = soldierTier >= selectedTier.troopTierReq;
  const isReady = canAffordGold && canAffordCrystal && meetsLevel;

  const selectedTroopStack = recompilerTroopId ? player.troops.find(t => t.id === recompilerTroopId) ?? null : null;
  const selectedTemplate = selectedTroopStack ? getTroopTemplate(selectedTroopStack.id) : undefined;
  const selectedRace = selectedTroopStack
    ? getTroopRace({
        id: selectedTroopStack.id,
        name: selectedTroopStack.name,
        doctrine: selectedTroopStack.doctrine,
        evangelist: selectedTroopStack.evangelist,
        race: selectedTroopStack.race as any
      })
    : 'UNKNOWN';

  const boostedAttributes = (() => {
    if (!selectedTemplate) return null;
    const baseHeroAttributes = selectedTemplate.attributes
      ? {
          attack: clampValue(Math.round(selectedTemplate.attributes.attack / 5), 8, 30),
          hp: clampValue(Math.round(selectedTemplate.attributes.hp * 1.4), 60, 220),
          agility: clampValue(Math.round(selectedTemplate.attributes.agility / 5), 8, 30),
          leadership: 0
        }
      : { attack: 12, hp: 90, agility: 12, leadership: 0 };
    return {
      attack: clampValue(Math.round(baseHeroAttributes.attack * (1 + selectedTier.boost)), 8, 180),
      hp: clampValue(Math.round(baseHeroAttributes.hp * (1 + selectedTier.boost)), 60, 1200),
      agility: clampValue(Math.round(baseHeroAttributes.agility * (1 + selectedTier.boost)), 8, 180),
      leadership: baseHeroAttributes.leadership
    };
  })();

  const generateSoulDraft = async () => {
    if (!selectedTroopStack || !selectedTemplate || !selectedSoldier) return;
    if (!isReady) {
      setRecompilerError('条件未满足：请检查士兵等级、金钱、或英雄水晶库存。');
      return;
    }

    const historyItems = selectedSoldier.history ?? [];
    const soldierHistory = historyItems.length > 0 ? historyItems.map(line => `- ${line}`).join('\n') : '（暂无个体战役记录）';

    setIsRecompilerLoading(true);
    resetDraft();
    try {
      const aiConfig = buildAIConfig();
      const draft = await proposeHeroPromotion(
        {
          id: selectedTroopStack.id,
          name: selectedTroopStack.name,
          tier: selectedTemplate.tier,
          description: selectedTemplate.description || '',
          equipment: selectedTemplate.equipment ?? [],
          attributes: selectedTemplate.attributes ?? { attack: 0, defense: 0, agility: 0, hp: 0, range: 0, morale: 0 },
          race: selectedRace
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
  };

  const confirmPromotion = () => {
    if (!selectedTroopStack || !selectedSoldier || !recompilerDraft || !boostedAttributes || !isReady) return;
    const name = recompilerNameDraft.trim() || recompilerDraft.name.trim() || selectedTroopStack.name;
    const heroId = `promoted_${String(selectedRace).toLowerCase()}_${Date.now()}`;
    onConsumeRecompilerSoldier({
      soldierId: selectedSoldier.id,
      troopId: selectedTroopStack.id,
      goldCost: selectedTier.goldCost,
      crystalTier: selectedTier.tier
    });

    setHeroes(prev => ([
      ...prev,
      {
        id: heroId,
        name,
        title: recompilerDraft.title,
        role: recompilerDraft.role,
        race: (selectedRace !== 'UNKNOWN' ? selectedRace : undefined) as any,
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
        attributes: boostedAttributes,
        currentHp: boostedAttributes.hp,
        maxHp: boostedAttributes.hp,
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

    addLog(`你在源码重塑塔消耗 ${selectedTier.goldCost} 金钱与英雄水晶T${selectedTier.tier}，将 ${selectedTroopStack.name} 重构为英雄「${name}」。`);
    setRecompilerTroopId(null);
    setRecompilerSoldierId(null);
    resetDraft();
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="bg-stone-900/40 border border-stone-800 rounded p-4">
        <div className="text-stone-200 font-bold font-serif mb-2">万神殿 · 源码重塑塔</div>
        <p className="text-stone-400 text-sm">
          这里能消耗金钱与英雄水晶，将一名士兵重构为拥有独立意识的英雄。水晶位阶越高，英雄越强，谈吐越像“活人”。
        </p>
      </div>

      <div className="bg-stone-900/40 border border-stone-800 rounded p-4">
        <div className="text-stone-200 font-bold mb-3">英雄水晶位阶</div>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-2">
          {tiers.map(tierOption => {
            const available = inv[tierOption.tier] ?? 0;
            const active = recompilerCrystalTier === tierOption.tier;
            return (
              <button
                key={`tier_${tierOption.tier}`}
                onClick={() => {
                  setRecompilerCrystalTier(tierOption.tier);
                  resetDraft();
                }}
                className={`p-3 rounded border text-left ${active ? 'bg-fuchsia-950/30 border-fuchsia-900/70 text-fuchsia-200' : 'bg-stone-950/30 border-stone-800 text-stone-300 hover:bg-stone-950/50'}`}
              >
                <div className="font-bold">T{tierOption.tier} · {tierOption.name}</div>
                <div className="text-[11px] text-stone-500 mt-1">模型：{tierOption.model}</div>
                <div className="text-[11px] text-stone-500">属性增幅：+{Math.round(tierOption.boost * 100)}%</div>
                <div className="text-[11px] text-stone-500">库存：{available}</div>
              </button>
            );
          })}
        </div>
        <div className="text-sm text-stone-400 mt-3 space-y-2">
          <div>当前选择：T{selectedTier.tier} · {selectedTier.name}（模型：{selectedTier.model}）</div>
          <div>需求：士兵等级 ≥ T{selectedTier.troopTierReq}，金钱 {selectedTier.goldCost}，英雄水晶T{selectedTier.tier} ×1</div>
          {selectedSoldier ? (
            <div className="space-y-1">
              <div className="text-xs text-stone-500">已选士兵：{selectedSoldier.id} · {selectedSoldier.name} · T{selectedSoldier.tier}</div>
              <div className="h-2 bg-stone-950/70 border border-stone-800 rounded overflow-hidden">
                <div
                  className="h-full bg-emerald-500/70"
                  style={{ width: `${Math.min(100, Math.floor((selectedSoldier.xp / Math.max(1, selectedSoldier.maxXp)) * 100))}%` }}
                />
              </div>
              <div className="text-xs text-stone-500">经验进度：{selectedSoldier.xp}/{selectedSoldier.maxXp}</div>
            </div>
          ) : (
            <div className="text-xs text-stone-500">未选择士兵。</div>
          )}
          <div className={isReady ? 'text-emerald-300' : 'text-amber-300'}>
            {isReady ? '条件满足，可执行重塑。' : '条件未满足：请检查士兵等级、金钱、或水晶库存。'}
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
              const race = getTroopRace({
                id: troopStack.id,
                name: troopStack.name,
                doctrine: troopStack.doctrine,
                evangelist: troopStack.evangelist,
                race: troopStack.race as any
              });
              const raceLabel = TROOP_RACE_LABELS[race] ?? race;
              const selected = recompilerTroopId === troopStack.id;
              const troopSoldiers = (player.soldiers ?? []).filter(s => s.troopId === troopStack.id && s.status === 'ACTIVE');
              return (
                <button
                  key={`promotable_${troopStack.id}`}
                  onClick={() => {
                    setRecompilerTroopId(troopStack.id);
                    setRecompilerSoldierId(troopSoldiers[0]?.id ?? null);
                    resetDraft();
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

      {recompilerTroopId && (
        <div className="bg-stone-900/40 border border-stone-800 rounded p-4">
          <div className="text-stone-200 font-bold mb-3">选择士兵个体</div>
          {(() => {
            const list = (player.soldiers ?? []).filter(s => s.troopId === recompilerTroopId && s.status === 'ACTIVE');
            if (list.length === 0) return <div className="text-stone-500 text-sm">当前兵种没有可用个体。</div>;
            return (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                {list.slice(0, 24).map(soldier => {
                  const selected = soldier.id === recompilerSoldierId;
                  const progress = Math.min(100, Math.floor((soldier.xp / Math.max(1, soldier.maxXp)) * 100));
                  return (
                    <button
                      key={soldier.id}
                      onClick={() => {
                        setRecompilerSoldierId(soldier.id);
                        resetDraft();
                      }}
                      className={`p-2 rounded border text-left ${selected ? 'bg-emerald-950/30 border-emerald-900/70 text-emerald-200' : 'bg-stone-950/30 border-stone-800 hover:bg-stone-950/50'}`}
                    >
                      <div className="text-sm font-semibold">{soldier.id}</div>
                      <div className="text-[11px] text-stone-500">T{soldier.tier} · XP {soldier.xp}/{soldier.maxXp}</div>
                      <div className="h-1.5 bg-stone-950/70 border border-stone-800 rounded overflow-hidden mt-1">
                        <div className="h-full bg-emerald-500/70" style={{ width: `${progress}%` }} />
                      </div>
                    </button>
                  );
                })}
              </div>
            );
          })()}
        </div>
      )}

      {recompilerTroopId && (
        <div className="bg-stone-900/40 border border-stone-800 rounded p-4 space-y-4">
          {!selectedTroopStack || !selectedTemplate || !boostedAttributes ? (
            <div className="text-stone-500 text-sm">选择的士兵不存在或缺少模板。</div>
          ) : (
            <>
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="text-stone-200 font-bold">重塑目标：{selectedTroopStack.name}{selectedSoldier ? `（${selectedSoldier.id}）` : ''}</div>
                  <div className="text-sm text-stone-500 mt-1">预计英雄属性：攻{boostedAttributes.attack} / HP{boostedAttributes.hp} / 敏{boostedAttributes.agility}</div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="secondary"
                    disabled={isRecompilerLoading || !selectedSoldier}
                    onClick={generateSoulDraft}
                  >
                    {isRecompilerLoading ? '…' : '生成灵魂'}
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={() => {
                      setRecompilerTroopId(null);
                      setRecompilerSoldierId(null);
                      resetDraft();
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
                <pre className="text-xs text-stone-400 whitespace-pre-wrap">
                  {selectedSoldier && (selectedSoldier.history ?? []).length > 0
                    ? (selectedSoldier.history ?? []).map(line => `- ${line}`).join('\n')
                    : '（暂无个体战役记录）'}
                </pre>
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
                      disabled={!isReady || isRecompilerLoading || !selectedSoldier}
                      onClick={confirmPromotion}
                    >
                      确认晋升（{selectedTier.goldCost} + 水晶T{selectedTier.tier}）
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
};
