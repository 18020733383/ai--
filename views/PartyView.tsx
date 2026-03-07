import React from 'react';
import { Bird, MessageCircle, Plus, Heart, Zap, Star, Flag } from 'lucide-react';
import { Hero, PlayerState, SoldierInstance } from '../types';
import { Button } from '../components/Button';
import { TroopCard } from '../components/TroopCard';
import { getTroopRace, TROOP_RACE_LABELS } from '../constants';

type PartyCategoryFilter = 'ALL' | 'NORMAL' | 'HEAVY';

type PartyViewProps = {
  player: PlayerState;
  heroes: Hero[];
  partyCategoryFilter: PartyCategoryFilter;
  setPartyCategoryFilter: (value: PartyCategoryFilter) => void;
  getTroopTemplate: (troopId: string) => any;
  getUpgradeTargetOptions: (troopId: string) => string[];
  getTroopSoldiers: (troopId: string) => SoldierInstance[];
  handleUpgrade: (troopId: string, targetId?: string, soldierId?: string) => void;
  handleDisband: (troopId: string, mode: 'ONE' | 'ALL') => void;
  getHeroRoleLabel: (role: Hero['role']) => string;
  spendHeroAttributePoint: (heroId: string, key: keyof Hero['attributes']) => void;
  onOpenHeroChat: (heroId: string) => void;
  onLeaveHero: (heroId: string) => void;
  onBackToMap: () => void;
};

export const PartyView = ({
  player,
  heroes,
  partyCategoryFilter,
  setPartyCategoryFilter,
  getTroopTemplate,
  getUpgradeTargetOptions,
  getTroopSoldiers,
  handleUpgrade,
  handleDisband,
  getHeroRoleLabel,
  spendHeroAttributePoint,
  onOpenHeroChat,
  onLeaveHero,
  onBackToMap
}: PartyViewProps) => {
  const recruitedHeroes = heroes.filter(hero => hero.recruited && !hero.locationId);
  const [upgradePicker, setUpgradePicker] = React.useState<{ sourceId: string; options: string[]; soldiers: SoldierInstance[] } | null>(null);
  const [upgradeSoldierId, setUpgradeSoldierId] = React.useState<string | null>(null);
  const [troopDetailId, setTroopDetailId] = React.useState<string | null>(null);
  const getEligibleSoldiers = React.useCallback((sourceId: string) => {
    return getTroopSoldiers(sourceId).filter(s => s.status === 'ACTIVE' && s.xp >= s.maxXp);
  }, [getTroopSoldiers]);
  React.useEffect(() => {
    if (!upgradePicker) return;
    const nextEligible = getEligibleSoldiers(upgradePicker.sourceId);
    if (nextEligible.length === 0) {
      setUpgradePicker(null);
      setUpgradeSoldierId(null);
      return;
    }
    const nextIds = nextEligible.map(s => s.id).join('|');
    const prevIds = upgradePicker.soldiers.map(s => s.id).join('|');
    if (nextIds !== prevIds) {
      setUpgradePicker({ ...upgradePicker, soldiers: nextEligible });
      if (!nextEligible.some(s => s.id === upgradeSoldierId)) {
        setUpgradeSoldierId(nextEligible[0]?.id ?? null);
      }
    }
  }, [getEligibleSoldiers, upgradePicker, upgradeSoldierId]);
  const partyCategoryLabel: Record<PartyCategoryFilter, string> = {
    ALL: '全部',
    NORMAL: '常规',
    HEAVY: '重型'
  };
  const displayedTroops = player.troops.filter(troop => {
    const template = getTroopTemplate(troop.id);
    const category = template?.category ?? troop.category ?? 'NORMAL';
    if (partyCategoryFilter === 'ALL') return true;
    return category === partyCategoryFilter;
  });
  const raceSummary = player.troops.reduce((acc, troop) => {
    const race = getTroopRace(troop);
    acc[race] = (acc[race] ?? 0) + troop.count;
    return acc;
  }, {} as Record<string, number>);
  const totalTroops = player.troops.reduce((sum, troop) => sum + troop.count, 0);
  const woundedTroops = Array.isArray(player.woundedTroops) ? player.woundedTroops : [];
  const woundedTotal = woundedTroops.reduce((sum, e) => sum + (e.count ?? 0), 0);
  const raceEntries = Object.entries(raceSummary)
    .map(([race, count]) => ({
      race,
      count,
      ratio: totalTroops > 0 ? Math.round((count / totalTroops) * 100) : 0
    }))
    .sort((a, b) => b.count - a.count);

  return (
    <div className="max-w-4xl mx-auto p-4 pt-20 animate-fade-in">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-3xl font-serif text-stone-200">部队管理</h2>
        <Button onClick={onBackToMap} variant="secondary">返回</Button>
      </div>

      <div className="bg-stone-900/60 border border-stone-700 rounded p-3 mb-4 flex flex-col md:flex-row md:items-end md:justify-between gap-3">
        <div className="flex items-end gap-3">
          <div>
            <label className="block text-xs text-stone-500 mb-1">类别</label>
            <select
              value={partyCategoryFilter}
              onChange={(e) => setPartyCategoryFilter(e.target.value as PartyCategoryFilter)}
              className="bg-black/40 border border-stone-700 rounded px-3 py-2 text-sm text-stone-200 outline-none focus:border-amber-700"
            >
              {(['ALL', 'NORMAL', 'HEAVY'] as const).map(opt => (
                <option key={opt} value={opt}>{partyCategoryLabel[opt]}</option>
              ))}
            </select>
          </div>
          <div className="text-xs text-stone-500 pb-2">
            {displayedTroops.length}/{player.troops.length} 个兵种
          </div>
        </div>
        <Button variant="secondary" onClick={() => setPartyCategoryFilter('ALL')}>清空筛选</Button>
      </div>

      <div className="bg-stone-900/60 border border-stone-700 rounded p-3 mb-4">
        <div className="text-xs text-stone-500 mb-2">队伍种族构成</div>
        {totalTroops === 0 ? (
          <div className="text-sm text-stone-500">暂无部队</div>
        ) : (
          <div className="flex flex-wrap gap-2 text-xs text-stone-400">
            {raceEntries.map(entry => (
              <span key={entry.race} className="px-2 py-1 rounded border border-stone-800 bg-stone-950/40">
                {TROOP_RACE_LABELS[entry.race as keyof typeof TROOP_RACE_LABELS]} {entry.count}（{entry.ratio}%）
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {player.troops.length === 0 && (
          <div className="col-span-3 text-center py-12 text-stone-500">
            你是一个光杆司令。快去招募点人手吧。
          </div>
        )}
        {player.troops.length > 0 && displayedTroops.length === 0 && (
          <div className="col-span-3 text-center py-12 text-stone-500">
            没有符合筛选的部队。
          </div>
        )}
        {displayedTroops.map(troop => {
          const canAffordUpgrade = player.gold >= troop.upgradeCost;
          const options = getUpgradeTargetOptions(troop.id);
          const eligibleSoldiers = getTroopSoldiers(troop.id).filter(s => s.status === 'ACTIVE' && s.xp >= s.maxXp);
          const isBranching = options.length > 1;
          const upgradeLabel = canAffordUpgrade
            ? (isBranching ? `选择晋升 (${troop.upgradeCost} 第纳尔)` : `晋升部队 (${troop.upgradeCost} 第纳尔)`)
            : `钱不够 (${troop.upgradeCost} 第纳尔)`;
          return (
            <TroopCard
              key={troop.id}
              troop={troop}
              onInspect={() => setTroopDetailId(troop.id)}
              count={troop.count}
              secondaryActionLabel="遣散1个"
              onSecondaryAction={() => handleDisband(troop.id, 'ONE')}
              actionLabel="遣散全部"
              onAction={() => handleDisband(troop.id, 'ALL')}
              canUpgrade={options.length > 0 && eligibleSoldiers.length > 0}
              onUpgrade={() => {
                setUpgradePicker({ sourceId: troop.id, options, soldiers: eligibleSoldiers });
                setUpgradeSoldierId(eligibleSoldiers[0]?.id ?? null);
              }}
              upgradeDisabled={!canAffordUpgrade}
              upgradeLabel={upgradeLabel}
            />
          );
        })}
      </div>

      {troopDetailId && (() => {
        const troop = player.troops.find(t => t.id === troopDetailId) ?? null;
        const template = getTroopTemplate(troopDetailId) ?? troop;
        const soldiers = troop ? getTroopSoldiers(troopDetailId) : [];
        return (
          <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
            <div className="bg-stone-900 border border-stone-700 rounded p-4 w-full max-w-4xl max-h-[85vh] overflow-hidden flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-stone-200 text-lg font-semibold">{template?.name ?? troopDetailId}</div>
                  <div className="text-xs text-stone-500">T{template?.tier ?? '？'} · 数量 {troop?.count ?? 0}</div>
                </div>
                <button onClick={() => setTroopDetailId(null)} className="text-stone-400 hover:text-stone-200">关闭</button>
              </div>
              <div className="text-xs text-stone-400 flex items-center gap-3">
                <span>攻击 {template?.attributes?.attack ?? 0}</span>
                <span>血量 {template?.attributes?.hp ?? 0}</span>
                <span>敏捷 {template?.attributes?.agility ?? 0}</span>
              </div>
              <div className="flex-1 overflow-auto">
                {soldiers.length === 0 ? (
                  <div className="text-sm text-stone-500">暂无个体记录。</div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {soldiers.map(soldier => (
                      <div key={soldier.id} className="bg-stone-950/50 border border-stone-700 rounded p-3 space-y-2">
                        <div className="flex items-center justify-between text-sm text-stone-200">
                          <span>{soldier.name} · {soldier.id}</span>
                          <span className="text-xs text-stone-500">{soldier.status === 'WOUNDED' ? '负伤' : soldier.status === 'GARRISONED' ? '驻军' : '现役'}</span>
                        </div>
                        <div className="text-xs text-stone-400">经验 {soldier.xp}/{soldier.maxXp}</div>
                        <div className="text-xs text-stone-500">
                          {(soldier.history ?? []).length > 0 ? (
                            <div className="space-y-1">
                              {soldier.history.map((line, idx) => (
                                <div key={`${soldier.id}_${idx}`} className="truncate">{line}</div>
                              ))}
                            </div>
                          ) : (
                            <div>（暂无战斗记录）</div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })()}

      {upgradePicker && (() => {
        const sourceStack = player.troops.find(t => t.id === upgradePicker.sourceId) ?? null;
        const sourceTmpl = sourceStack ? getTroopTemplate(sourceStack.id) : null;
        const selectedSoldier = upgradeSoldierId
          ? upgradePicker.soldiers.find(s => s.id === upgradeSoldierId) ?? null
          : upgradePicker.soldiers[0] ?? null;
        const close = () => {
          setUpgradePicker(null);
          setUpgradeSoldierId(null);
        };
        return (
          <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
            <div className="w-full max-w-3xl bg-stone-900 border border-stone-700 rounded shadow-2xl p-5 space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-lg font-bold text-stone-200">选择晋升方向</div>
                  <div className="text-xs text-stone-500 mt-1">
                    {sourceTmpl?.name ?? sourceStack?.name ?? upgradePicker.sourceId} · 费用 {sourceStack?.upgradeCost ?? 0}
                  </div>
                </div>
                <button onClick={close} className="text-stone-400 hover:text-white">关闭</button>
              </div>

              <div>
                <div className="text-xs text-stone-500 mb-2">选择晋升个体</div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  {upgradePicker.soldiers.slice(0, 12).map(soldier => {
                    const selected = soldier.id === (selectedSoldier?.id ?? '');
                    const progress = Math.min(100, Math.floor((soldier.xp / Math.max(1, soldier.maxXp)) * 100));
                    return (
                      <button
                        key={soldier.id}
                        onClick={() => setUpgradeSoldierId(soldier.id)}
                        className={`text-left border rounded px-2 py-1 ${selected ? 'border-emerald-700 bg-emerald-950/40 text-emerald-200' : 'border-stone-800 bg-stone-950/30 text-stone-300 hover:bg-stone-950/60'}`}
                      >
                        <div className="text-xs font-semibold">{soldier.id}</div>
                        <div className="text-[10px] text-stone-500">T{soldier.tier} · {soldier.xp}/{soldier.maxXp}</div>
                        <div className="h-1 bg-stone-950/70 border border-stone-800 rounded mt-1">
                          <div className="h-full bg-emerald-500/70" style={{ width: `${progress}%` }} />
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {upgradePicker.options.map(targetId => {
                  const t = getTroopTemplate(targetId);
                  if (!t) return null;
                  const attrs = t.attributes;
                  return (
                    <button
                      key={targetId}
                      onClick={() => {
                        handleUpgrade(upgradePicker.sourceId, targetId, selectedSoldier?.id);
                        const remaining = upgradePicker.soldiers.filter(s => s.id !== (selectedSoldier?.id ?? ''));
                        if (remaining.length === 0) {
                          close();
                        } else {
                          setUpgradePicker({ ...upgradePicker, soldiers: remaining });
                          setUpgradeSoldierId(remaining[0]?.id ?? null);
                        }
                      }}
                      className="text-left bg-stone-950/50 hover:bg-stone-950/70 border border-stone-800 hover:border-emerald-700 rounded p-3 transition-colors"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="text-stone-200 font-semibold truncate">{t.name}</div>
                        <div className="text-xs text-stone-500">T{t.tier}</div>
                      </div>
                      <div className="text-xs text-stone-500 mt-1 truncate">{t.id}</div>
                      <div className="text-[11px] text-stone-400 mt-2">
                        攻{attrs.attack} 防{attrs.defense} 敏{attrs.agility} 血{attrs.hp} 射{attrs.range} 士{attrs.morale}
                      </div>
                      <div className="text-[11px] text-stone-500 mt-2 line-clamp-3">{t.description}</div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        );
      })()}

      {woundedTroops.length > 0 && (
        <div className="mt-6 bg-stone-900/60 border border-stone-700 p-4 rounded shadow-lg">
          <h3 className="text-stone-200 font-bold flex items-center gap-2 mb-3"><Heart size={16} /> 重伤士兵（不可参战）</h3>
          <div className="text-xs text-stone-500 mb-2">总计 {woundedTotal}</div>
          <div className="flex flex-wrap gap-2 text-xs text-stone-400">
            {woundedTroops
              .slice(0, 24)
              .sort((a, b) => (a.recoverDay ?? 0) - (b.recoverDay ?? 0))
              .map((e, idx) => {
                const tmpl = getTroopTemplate(e.troopId);
                const name = tmpl?.name ?? e.troopId;
                const daysLeft = Math.max(0, Math.floor((e.recoverDay ?? player.day) - player.day));
                return (
                  <span key={`wounded_${idx}_${e.troopId}_${e.recoverDay}`} className="px-2 py-1 rounded border border-stone-800 bg-stone-950/40">
                    {name} x{e.count}（{daysLeft}天）
                  </span>
                );
              })}
          </div>
        </div>
      )}

      <div className="mt-6 bg-stone-900/60 border border-stone-700 p-4 rounded shadow-lg">
        <h3 className="text-stone-200 font-bold flex items-center gap-2 mb-3"><Star size={16} /> 随行英雄</h3>
        {recruitedHeroes.length === 0 ? (
          <div className="text-stone-500 italic py-6 text-center">暂无英雄加入队伍。</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {recruitedHeroes.map(hero => {
              const hpPercent = hero.maxHp > 0 ? Math.round((hero.currentHp / hero.maxHp) * 100) : 0;
              const canBattle = hero.currentHp / hero.maxHp >= 0.8 && hero.status === 'ACTIVE';
              const heroIdle = `url("/image/characters/${hero.id}/IDLE.png"), url("/image/characters/${hero.id}/IDLE.jpg"), url("/image/characters/${hero.id}/IDLE.jpeg")`;
              const latestMemory = hero.permanentMemory?.length ? hero.permanentMemory[hero.permanentMemory.length - 1] : null;
              const memoryText = latestMemory?.text ?? '暂无持久记忆';
              const shouldScroll = memoryText.length > 22;
              return (
                <div key={hero.id} className="bg-stone-800 p-4 rounded border border-stone-700 space-y-3">
                  <div className="flex items-start gap-3">
                    <div
                      className="w-16 h-16 rounded bg-stone-900/70 border border-stone-700 bg-cover bg-center"
                      style={{ backgroundImage: heroIdle }}
                    />
                    <div className="flex-1 space-y-2">
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="text-stone-200 font-bold">{hero.name}</div>
                          <div className="text-xs text-stone-500">{hero.title} · {getHeroRoleLabel(hero.role)}</div>
                        </div>
                        <div className="text-right text-xs text-stone-500">
                          <div>等级 {hero.level}</div>
                          <div>{hero.xp} / {hero.maxXp}</div>
                        </div>
                      </div>
                      <div className="text-xs text-stone-400">{hero.background}</div>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2 text-[11px] text-stone-400">
                    {hero.traits.map((trait, idx) => (
                      <span key={`${hero.id}-trait-${idx}`} className="px-2 py-0.5 rounded border border-stone-700 bg-stone-900/40">
                        {trait}
                      </span>
                    ))}
                  </div>
                  <div className="flex items-center justify-between text-xs text-stone-500">
                    <span className={hero.status === 'DEAD' ? 'text-stone-500' : hero.status === 'INJURED' ? 'text-red-400' : 'text-green-400'}>
                      {hero.status === 'DEAD' ? '已死亡' : hero.status === 'INJURED' ? '重伤恢复中' : '状态良好'}
                    </span>
                    <span>{hero.currentHp} / {hero.maxHp}（{hpPercent}%）</span>
                    <span>{canBattle ? '可参战' : '需恢复'}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs text-stone-400">
                    <span>攻击 {hero.attributes.attack}</span>
                    <span>血量 {hero.attributes.hp}</span>
                    <span>敏捷 {hero.attributes.agility}</span>
                    <span>统御 {hero.attributes.leadership ?? 0}</span>
                  </div>
                  <div className="bg-stone-900/60 border border-stone-700 rounded px-2 py-1 text-[11px] text-stone-400 overflow-hidden">
                    {shouldScroll ? (
                      (() => {
                        const Marquee: any = 'marquee';
                        return (
                          <Marquee behavior="scroll" direction="left" scrollAmount={3}>
                            {memoryText}
                          </Marquee>
                        );
                      })()
                    ) : (
                      <span>{memoryText}</span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 text-xs text-stone-400">
                    <span>可用点数 {hero.attributePoints}</span>
                    <div className="flex items-center gap-2">
                      <button
                        disabled={hero.attributePoints <= 0 || hero.status === 'DEAD'}
                        onClick={() => spendHeroAttributePoint(hero.id, 'attack')}
                        className="w-6 h-6 rounded bg-stone-700 hover:bg-green-700 flex items-center justify-center disabled:opacity-20 disabled:cursor-not-allowed text-white"
                      >
                        <Plus size={12} />
                      </button>
                      <button
                        disabled={hero.attributePoints <= 0 || hero.status === 'DEAD'}
                        onClick={() => spendHeroAttributePoint(hero.id, 'hp')}
                        className="w-6 h-6 rounded bg-stone-700 hover:bg-green-700 flex items-center justify-center disabled:opacity-20 disabled:cursor-not-allowed text-white"
                      >
                        <Heart size={12} />
                      </button>
                      <button
                        disabled={hero.attributePoints <= 0 || hero.status === 'DEAD'}
                        onClick={() => spendHeroAttributePoint(hero.id, 'agility')}
                        className="w-6 h-6 rounded bg-stone-700 hover:bg-green-700 flex items-center justify-center disabled:opacity-20 disabled:cursor-not-allowed text-white"
                      >
                        <Zap size={12} />
                      </button>
                      <button
                        disabled={hero.attributePoints <= 0 || hero.status === 'DEAD'}
                        onClick={() => spendHeroAttributePoint(hero.id, 'leadership')}
                        className="w-6 h-6 rounded bg-stone-700 hover:bg-green-700 flex items-center justify-center disabled:opacity-20 disabled:cursor-not-allowed text-white"
                      >
                        <Flag size={12} />
                      </button>
                    </div>
                  </div>
                  <div className="flex items-center justify-end">
                    <div className="flex items-center gap-2">
                      <Button
                        onClick={() => onLeaveHero(hero.id)}
                        variant="danger"
                        disabled={hero.status === 'DEAD'}
                      >
                        离队
                      </Button>
                      <Button
                        onClick={() => onOpenHeroChat(hero.id)}
                        variant="secondary"
                        disabled={hero.status === 'DEAD'}
                      >
                        <MessageCircle size={14} className="inline mr-2" />
                        聊天
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="mt-6 bg-stone-900/60 border border-stone-700 p-4 rounded shadow-lg">
        <h3 className="text-stone-200 font-bold flex items-center gap-2 mb-3"><Bird size={16} /> 鹦鹉随行</h3>
        {player.parrots.length === 0 ? (
          <div className="text-stone-500 italic py-6 text-center">暂无鹦鹉。去花鸟市场买一只给自己添堵。</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {player.parrots.map(p => (
              <div key={p.id} className="bg-stone-800 p-4 rounded border border-stone-700">
                <div className="flex justify-between items-start">
                  <div>
                    <div className={`font-bold text-lg ${p.color}`}>{p.name}</div>
                    <div className="text-xs text-stone-500 uppercase mt-1">性格: {p.personality} · 已陪伴 {p.daysWithYou ?? 0} 天</div>
                  </div>
                  <div className="text-right text-xs text-stone-500">
                    <div>毒舌: <span className="text-stone-200 font-mono">{p.tauntCount ?? 0}</span></div>
                    <div>损失: <span className="text-red-400 font-mono">{p.goldLost ?? 0}</span></div>
                  </div>
                </div>
                <div className="text-sm text-stone-400 mt-2 italic">"{p.description}"</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
