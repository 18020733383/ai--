import React, { useMemo, useState } from 'react';
import { Activity, LayoutGrid, Shield } from 'lucide-react';
import { Button } from './Button';
import { FactionId, Location, Lord, Troop, TroopTier, TroopRace, WorldDiplomacyState } from '../types';
import { getTroopRace, TROOP_RACE_LABELS } from '../game/data';
import { buildFactionMilitaryOverviews, MILITARY_POSTURE_LABELS } from '../game/systems/militaryOrbat';

type WorldTroopStatsModalProps = {
  collectWorldTroops: () => Troop[];
  getTroopTemplate: (id: string) => Omit<Troop, 'count' | 'xp'> | undefined;
  locations: Location[];
  lords: Lord[];
  worldDiplomacy: WorldDiplomacyState;
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
  locations,
  lords,
  worldDiplomacy,
  worldTroopRaceFilter,
  setWorldTroopRaceFilter,
  worldTroopTierFilter,
  setWorldTroopTierFilter,
  worldTroopIdFilter,
  setWorldTroopIdFilter,
  copyEndgameBattlePrompt,
  onClose
}: WorldTroopStatsModalProps) => {
  const [panel, setPanel] = useState<'roster' | 'orbat'>('roster');
  const [orbatFaction, setOrbatFaction] = useState<FactionId | 'ALL'>('ALL');

  const factionOverviews = useMemo(
    () =>
      buildFactionMilitaryOverviews({
        locations,
        lords,
        factionStrategies: worldDiplomacy.factionStrategies ?? {},
        getTroopTemplate: getTroopTemplate as Parameters<typeof buildFactionMilitaryOverviews>[0]['getTroopTemplate']
      }),
    [locations, lords, worldDiplomacy.factionStrategies, getTroopTemplate]
  );

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
  const raceOrder: TroopRace[] = ['HUMAN', 'ROACH', 'UNDEAD', 'IMPOSTER', 'BANDIT', 'AUTOMATON', 'VOID', 'MADNESS', 'BEAST', 'GOBLIN', 'UNKNOWN'];

  return (
    <div
      className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-5xl max-h-[92vh] flex flex-col bg-stone-900 border border-stone-700 rounded shadow-2xl overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-2 p-4 border-b border-stone-800">
          <div className="flex items-center gap-2 flex-wrap">
            <Activity size={18} className="text-stone-300" />
            <h3 className="text-lg font-bold text-stone-200">世界士兵统计</h3>
            {panel === 'roster' && (
              <span className="text-xs text-stone-500">({filtered.length}/{aggregated.length})</span>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex rounded border border-stone-700 overflow-hidden text-xs">
              <button
                type="button"
                onClick={() => setPanel('roster')}
                className={`px-3 py-1.5 flex items-center gap-1 ${panel === 'roster' ? 'bg-amber-900/40 text-amber-200' : 'bg-stone-950 text-stone-400 hover:text-stone-200'}`}
              >
                <LayoutGrid size={14} /> 兵种名册
              </button>
              <button
                type="button"
                onClick={() => setPanel('orbat')}
                className={`px-3 py-1.5 flex items-center gap-1 ${panel === 'orbat' ? 'bg-amber-900/40 text-amber-200' : 'bg-stone-950 text-stone-400 hover:text-stone-200'}`}
              >
                <Shield size={14} /> 各国编制
              </button>
            </div>
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
        {panel === 'roster' && (
        <div className="px-4 pt-4 pb-2 border-b border-stone-800 shrink-0">
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
        )}

        <div className="p-4 space-y-4 overflow-y-auto flex-1 min-h-0">
        {panel === 'orbat' && (
          <div className="space-y-4">
            <div className="text-xs text-stone-500">
              账面编制随据点与王国战略生成：姿态含 {Object.values(MILITARY_POSTURE_LABELS).join('、')}。领主围城时仅出动部分行营兵力。
            </div>
            <select
              value={orbatFaction}
              onChange={e => setOrbatFaction(e.target.value as FactionId | 'ALL')}
              className="bg-stone-950 border border-stone-700 rounded px-3 py-2 text-stone-200 max-w-xs"
            >
              <option value="ALL">全部势力</option>
              {factionOverviews.map(f => (
                <option key={f.factionId} value={f.factionId}>{f.factionName}</option>
              ))}
            </select>
            {(orbatFaction === 'ALL' ? factionOverviews : factionOverviews.filter(f => f.factionId === orbatFaction)).map(f => (
              <div key={f.factionId} className="border border-stone-800 rounded-lg overflow-hidden">
                <div
                  className="px-3 py-2 flex flex-wrap items-center gap-2 border-b border-stone-800"
                  style={{ borderLeftWidth: 3, borderLeftColor: f.color }}
                >
                  <span className="font-bold text-stone-100">{f.factionName}</span>
                  <span className="text-stone-500 text-sm">总兵力</span>
                  <span className="font-mono text-amber-300">{f.totalStrength}</span>
                  <span className="text-xs text-stone-600 ml-2">
                    {f.byTier.filter(t => t.count > 0).map(t => `T${t.tier}:${t.count}`).join(' · ') || '—'}
                  </span>
                </div>
                <div className="p-3 space-y-3 bg-stone-950/30">
                  <div className="text-xs font-semibold text-stone-400 uppercase tracking-wider">正式编制单位</div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                      <thead>
                        <tr className="text-stone-500 border-b border-stone-800">
                          <th className="py-1 pr-2">阶</th>
                          <th className="py-1 pr-2">锚点</th>
                          <th className="py-1 pr-2">姿态</th>
                          <th className="py-1 pr-2 text-right">账面</th>
                          <th className="py-1 pr-2">等级结构</th>
                        </tr>
                      </thead>
                      <tbody>
                        {f.formalUnits.length === 0 ? (
                          <tr><td colSpan={5} className="py-2 text-stone-600">无据点兵力</td></tr>
                        ) : f.formalUnits.map(u => (
                          <tr key={u.id} className="border-b border-stone-800/60">
                            <td className="py-1.5 pr-2 text-amber-200/90 whitespace-nowrap">{u.echelonLabel}</td>
                            <td className="py-1.5 pr-2 text-stone-300">{u.anchorName}</td>
                            <td className="py-1.5 pr-2">
                              <span className="text-xs px-1.5 py-0.5 rounded bg-stone-800 text-stone-300">{u.postureLabel}</span>
                            </td>
                            <td className="py-1.5 pr-2 text-right font-mono text-stone-200">{u.bookStrength}</td>
                            <td className="py-1.5 text-xs text-stone-500">
                              {u.byTier.filter(t => t.count > 0).map(t => `T${t.tier}:${t.count}`).join(' ') || '—'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="text-xs font-semibold text-stone-400 uppercase tracking-wider">驻地兵力散布</div>
                  <div className="space-y-2 max-h-48 overflow-y-auto scrollbar-hide">
                    {f.holdings.length === 0 ? (
                      <div className="text-stone-600 text-sm">无城村驻防记录</div>
                    ) : f.holdings.map(h => (
                      <div key={h.locationId} className="bg-stone-900/50 border border-stone-800 rounded p-2 text-sm">
                        <div className="flex flex-wrap justify-between gap-1">
                          <span className="text-stone-200 font-medium">{h.locationName}</span>
                          <span className="text-stone-500 text-xs">{h.locationType}</span>
                          <span className="font-mono text-amber-200/80">{h.strength}</span>
                        </div>
                        <div className="text-[11px] text-stone-500 mt-1">
                          {h.byTier.filter(t => t.count > 0).map(t => `T${t.tier}:${t.count}`).join(' · ') || '—'}
                        </div>
                        {h.lords.length > 0 && (
                          <div className="text-[11px] text-stone-400 mt-1">
                            在城领主：
                            {h.lords.map(l => `${l.title}${l.name}（行营${l.partyStrength}·${l.state}）`).join('；')}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {panel === 'roster' && (<>
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
        </>)}
        </div>
      </div>
    </div>
  );
};
