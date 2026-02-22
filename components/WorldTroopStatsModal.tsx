import React from 'react';
import { Activity } from 'lucide-react';
import { Button } from './Button';
import { Troop, TroopTier, TroopRace } from '../types';
import { getTroopRace, TROOP_RACE_LABELS } from '../constants';

type WorldTroopStatsModalProps = {
  collectWorldTroops: () => Troop[];
  getTroopTemplate: (id: string) => Omit<Troop, 'count' | 'xp'> | undefined;
  worldTroopRaceFilter: TroopRace | 'ALL';
  setWorldTroopRaceFilter: (value: TroopRace | 'ALL') => void;
  worldTroopTierFilter: TroopTier | 'ALL';
  setWorldTroopTierFilter: (value: TroopTier | 'ALL') => void;
  worldTroopIdFilter: string;
  setWorldTroopIdFilter: (value: string) => void;
  copyEndgameBattlePrompt: () => void;
  onClose: () => void;
};

export const WorldTroopStatsModal = ({
  collectWorldTroops,
  getTroopTemplate,
  worldTroopRaceFilter,
  setWorldTroopRaceFilter,
  worldTroopTierFilter,
  setWorldTroopTierFilter,
  worldTroopIdFilter,
  setWorldTroopIdFilter,
  copyEndgameBattlePrompt,
  onClose
}: WorldTroopStatsModalProps) => {
  const aggregated = Object.values(collectWorldTroops().reduce((acc, troop) => {
    const template = getTroopTemplate(troop.id);
    const id = template?.id ?? troop.id;
    const name = template?.name ?? troop.name;
    const tier = (template?.tier ?? troop.tier ?? 1) as TroopTier;
    const description = template?.description ?? troop.description ?? '';
    const equipment = template?.equipment ?? troop.equipment ?? [];
    const entry = acc[id];
    const race = getTroopRace({
      id,
      name,
      doctrine: template?.doctrine ?? troop.doctrine,
      evangelist: template?.evangelist ?? troop.evangelist
    });
    if (entry) {
      entry.count += troop.count;
    } else {
      acc[id] = {
        id,
        name,
        tier,
        count: troop.count,
        description,
        equipment,
        race
      };
    }
    return acc;
  }, {} as Record<string, { id: string; name: string; tier: TroopTier; count: number; description: string; equipment: string[]; race: TroopRace }>)).sort((a, b) => {
    const tierCmp = a.tier - b.tier;
    if (tierCmp !== 0) return tierCmp;
    return a.name.localeCompare(b.name, 'zh-CN');
  });

  const filtered = aggregated.filter(entry => {
    if (worldTroopRaceFilter !== 'ALL' && entry.race !== worldTroopRaceFilter) return false;
    if (worldTroopTierFilter !== 'ALL' && entry.tier !== worldTroopTierFilter) return false;
    if (worldTroopIdFilter !== 'ALL' && entry.id !== worldTroopIdFilter) return false;
    return true;
  });

  const totals = filtered.reduce((acc, entry) => {
    acc.totalCount += entry.count;
    return acc;
  }, { totalCount: 0 });
  const raceTotals = aggregated.reduce((acc, entry) => {
    acc[entry.race] = (acc[entry.race] ?? 0) + entry.count;
    return acc;
  }, {} as Record<TroopRace, number>);
  const raceTypes = Object.keys(raceTotals).length;
  const unknownCount = raceTotals.UNKNOWN ?? 0;
  const tierTotals = [1, 2, 3, 4, 5].map(tier => ({
    tier,
    count: filtered.filter(entry => entry.tier === tier).reduce((sum, entry) => sum + entry.count, 0)
  }));
  const raceOrder: TroopRace[] = ['HUMAN', 'ROACH', 'UNDEAD', 'IMPOSTER', 'BANDIT', 'AUTOMATON', 'VOID', 'MADNESS', 'UNKNOWN'];

  return (
    <div
      className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-4xl bg-stone-900 border border-stone-700 rounded shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-stone-800">
          <div className="flex items-center gap-2">
            <Activity size={18} className="text-stone-300" />
            <h3 className="text-lg font-bold text-stone-200">世界士兵统计</h3>
            <span className="text-xs text-stone-500">({filtered.length}/{aggregated.length})</span>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="secondary" onClick={copyEndgameBattlePrompt}>
              终局之战Prompt
            </Button>
            <button
              onClick={onClose}
              className="text-stone-400 hover:text-white"
            >
              关闭
            </button>
          </div>
        </div>
        <div className="px-4 pt-4 pb-2 border-b border-stone-800">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <select
              value={worldTroopRaceFilter}
              onChange={(e) => setWorldTroopRaceFilter(e.target.value as TroopRace | 'ALL')}
              className="bg-stone-950 border border-stone-700 rounded px-3 py-2 text-stone-200"
            >
              <option value="ALL">全部种族</option>
              {raceOrder.map(race => (
                <option key={race} value={race}>
                  {TROOP_RACE_LABELS[race]}
                </option>
              ))}
            </select>
            <select
              value={worldTroopTierFilter}
              onChange={(e) => {
                const value = e.target.value;
                setWorldTroopTierFilter(value === 'ALL' ? 'ALL' : (Number(value) as TroopTier));
              }}
              className="bg-stone-950 border border-stone-700 rounded px-3 py-2 text-stone-200"
            >
              <option value="ALL">全部等级</option>
              <option value="1">T1</option>
              <option value="2">T2</option>
              <option value="3">T3</option>
              <option value="4">T4</option>
              <option value="5">T5</option>
            </select>
            <select
              value={worldTroopIdFilter}
              onChange={(e) => setWorldTroopIdFilter(e.target.value)}
              className="bg-stone-950 border border-stone-700 rounded px-3 py-2 text-stone-200"
            >
              <option value="ALL">全部兵种</option>
              {aggregated.map(entry => (
                <option key={entry.id} value={entry.id}>
                  {entry.name}
                </option>
              ))}
            </select>
            <Button
              variant="secondary"
              onClick={() => {
                setWorldTroopRaceFilter('ALL');
                setWorldTroopTierFilter('ALL');
                setWorldTroopIdFilter('ALL');
              }}
              disabled={worldTroopRaceFilter === 'ALL' && worldTroopTierFilter === 'ALL' && worldTroopIdFilter === 'ALL'}
            >
              清空筛选
            </Button>
          </div>
        </div>

        <div className="p-4 space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="bg-stone-950/40 border border-stone-800 rounded p-3">
              <div className="text-xs text-stone-500">总人数</div>
              <div className="text-2xl font-mono text-stone-100">{totals.totalCount}</div>
            </div>
            <div className="bg-stone-950/40 border border-stone-800 rounded p-3">
              <div className="text-xs text-stone-500">兵种数</div>
              <div className="text-2xl font-mono text-stone-100">{filtered.length}</div>
            </div>
            <div className="bg-stone-950/40 border border-stone-800 rounded p-3">
              <div className="text-xs text-stone-500">种族数</div>
              <div className="text-2xl font-mono text-fuchsia-300">{raceTypes}</div>
            </div>
            <div className="bg-stone-950/40 border border-stone-800 rounded p-3">
              <div className="text-xs text-stone-500">未知</div>
              <div className="text-2xl font-mono text-amber-300">{unknownCount}</div>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 text-xs text-stone-400">
            {tierTotals.map(item => (
              <span key={item.tier} className="px-2 py-1 rounded border border-stone-800 bg-stone-950/40">
                T{item.tier}：{item.count}
              </span>
            ))}
          </div>

          <div className="space-y-2 max-h-[50vh] overflow-y-auto scrollbar-hide">
            {filtered.map(entry => (
              <div key={entry.id} className="bg-stone-950/40 border border-stone-800 rounded p-3 flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <div className="text-stone-200 font-bold truncate">{entry.name}</div>
                    <span className="text-[10px] px-2 py-0.5 rounded border border-stone-700 text-stone-400 bg-stone-900/30">
                      T{entry.tier}
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded border border-slate-800 text-slate-300 bg-slate-950/40">
                      {TROOP_RACE_LABELS[entry.race]}
                    </span>
                  </div>
                  {entry.description && (
                    <div className="text-xs text-stone-500 mt-1 leading-relaxed">{entry.description}</div>
                  )}
                </div>
                <div className="text-right">
                  <div className="text-xs text-stone-500">数量</div>
                  <div className="text-2xl font-mono text-amber-400">{entry.count}</div>
                </div>
              </div>
            ))}
            {filtered.length === 0 && (
              <div className="text-stone-500 text-sm text-center py-12 border border-dashed border-stone-800 rounded">
                没找到符合条件的士兵
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
