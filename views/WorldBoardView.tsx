import React from 'react';
import { Hammer, History, Scroll, Shield } from 'lucide-react';
import { BattleResult, FactionSpecialization, Location, SiegeEngineType, WorldBattleReport } from '../types';
import { Button } from '../components/Button';

type WorldBoardViewProps = {
  currentLocation: Location | null;
  logs: string[];
  worldBattleReports: WorldBattleReport[];
  activeBattles: Array<{
    id: string;
    locationName: string;
    attackerName: string;
    defenderName: string;
    startDay: number;
    attackerTroops: Array<{ id: string; name?: string; count: number }>;
    defenderTroops: Array<{ id: string; name?: string; count: number }>;
  }>;
  battleTimeline: Array<{ day: number; count: number }>;
  troopTypeCount: number;
  siegeEngineArchive: Array<{
    type: SiegeEngineType;
    name: string;
    cost: number;
    days: number;
    description: string;
    hp: number;
    wallDamage: number;
    attackerRangedHit: number;
    attackerRangedDamage: number;
    attackerMeleeHit: number;
    attackerMeleeDamage: number;
    defenderRangedHitPenalty: number;
    defenderRangedDamagePenalty: number;
  }>;
  defenseArchive: Array<{
    type: Location['type'];
    sampleName: string;
    wallName: string;
    wallLevel: number;
    wallHp: number;
    mechanismHp: number;
    rangedHitBonus: number;
    rangedDamageBonus: number;
    meleeDamageReduction: number;
    mechanisms: { name: string; description: string }[];
  }>;
  factionSnapshots: Array<{
    id: string;
    name: string;
    shortName: string;
    description: string;
    focus: FactionSpecialization;
    color: string;
    cities: number;
    castles: number;
    villages: number;
    soldiers: number;
  }>;
  onOpenTroopArchive: () => void;
  onBackToMap: () => void;
  onExportMarkdown: () => void;
};

export const WorldBoardView = ({
  currentLocation,
  logs,
  worldBattleReports,
  activeBattles,
  battleTimeline,
  troopTypeCount,
  siegeEngineArchive,
  defenseArchive,
  factionSnapshots,
  onOpenTroopArchive,
  onBackToMap,
  onExportMarkdown
}: WorldBoardViewProps) => {
  if (!currentLocation) return null;
  const outcomeLabel = (outcome: BattleResult['outcome']) => outcome === 'A' ? '胜利' : '战败';
  const formatTroopLoss = (list: Array<{ name: string; count: number; cause?: string }>) => {
    if (!list || list.length === 0) return '无';
    return list.map(item => `${item.count}x${item.name}${item.cause ? `(${item.cause})` : ''}`).join('，');
  };
  const formatKeyUnitLoss = (list?: Array<{ name: string; hpLoss: number; cause?: string }>) => {
    if (!list || list.length === 0) return '无';
    return list.map(item => `${item.name} HP-${item.hpLoss}${item.cause ? `(${item.cause})` : ''}`).join('，');
  };
  const pct = (value: number) => `${Math.round(value * 100)}%`;
  const focusLabel: Record<FactionSpecialization, string> = {
    MELEE: '近战',
    RANGED: '远程',
    CAVALRY: '骑兵'
  };
  const [expandedBattleId, setExpandedBattleId] = React.useState<string | null>(null);
  const formatTroops = (troops: Array<{ id: string; name?: string; count: number }>) => {
    if (!troops || troops.length === 0) return '无';
    return troops.filter(t => t.count > 0).map(t => `${t.name ?? t.id}x${t.count}`).join('，') || '无';
  };
  const timeline = battleTimeline.slice(-30);
  const maxBattleCount = Math.max(1, ...timeline.map(item => item.count));
  const chartWidth = 320;
  const chartHeight = 120;
  const chartPadding = 20;
  const buildLinePath = () => {
    if (timeline.length === 0) return '';
    const stepX = timeline.length > 1 ? (chartWidth - chartPadding * 2) / (timeline.length - 1) : 0;
    return timeline.map((point, index) => {
      const x = chartPadding + stepX * index;
      const y = chartHeight - chartPadding - (point.count / maxBattleCount) * (chartHeight - chartPadding * 2);
      return `${index === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
    }).join(' ');
  };

  return (
    <div className="min-h-[80vh] p-4 pt-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-stone-900 border border-stone-700 flex items-center justify-center">
              <History className="text-slate-300" size={20} />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-stone-200">世界公告栏</h2>
              <div className="text-xs text-stone-500">{currentLocation.description}</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              onClick={onOpenTroopArchive}
              className="flex items-center gap-2"
            >
              <Scroll size={16} /> 兵种档案
            </Button>
            <Button variant="secondary" onClick={onBackToMap}>返回地图</Button>
            <Button onClick={onExportMarkdown}>导出 Markdown</Button>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 mb-6">
          <div className="bg-stone-900/70 border border-stone-700 rounded p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="text-stone-200 font-semibold">进行中的战斗</div>
              <div className="text-xs text-stone-500">{activeBattles.length} 场</div>
            </div>
            {activeBattles.length === 0 ? (
              <div className="text-sm text-stone-500">当前没有战斗发生。</div>
            ) : (
              <div className="space-y-3">
                {activeBattles.map(battle => {
                  const expanded = expandedBattleId === battle.id;
                  return (
                    <div key={battle.id} className="bg-stone-950/60 border border-stone-800 rounded p-3 space-y-2">
                      <div className="flex items-center justify-between text-sm text-stone-200">
                        <div>{battle.locationName} · 第 {battle.startDay} 天开战</div>
                        <button
                          onClick={() => setExpandedBattleId(expanded ? null : battle.id)}
                          className="text-xs text-amber-300 hover:text-amber-200"
                        >
                          {expanded ? '收起' : '展开'}
                        </button>
                      </div>
                      <div className="text-xs text-stone-400">攻方：{battle.attackerName}</div>
                      <div className="text-xs text-stone-400">守方：{battle.defenderName}</div>
                      {expanded && (
                        <div className="text-xs text-stone-300 space-y-2">
                          <div>攻方构成：{formatTroops(battle.attackerTroops)}</div>
                          <div>守方构成：{formatTroops(battle.defenderTroops)}</div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="bg-stone-900/70 border border-stone-700 rounded p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="text-stone-200 font-semibold">战斗数量趋势</div>
              <div className="text-xs text-stone-500">近 {timeline.length} 天</div>
            </div>
            {timeline.length === 0 ? (
              <div className="text-sm text-stone-500">暂无统计数据。</div>
            ) : (
              <div className="flex items-center justify-center">
                <svg width={chartWidth} height={chartHeight} viewBox={`0 0 ${chartWidth} ${chartHeight}`}>
                  <rect x={0} y={0} width={chartWidth} height={chartHeight} fill="none" stroke="rgba(120,113,108,0.25)" />
                  <path d={buildLinePath()} fill="none" stroke="rgba(245,158,11,0.9)" strokeWidth={2} />
                  {timeline.map((point, index) => {
                    if (timeline.length === 1 || index === timeline.length - 1) {
                      const stepX = timeline.length > 1 ? (chartWidth - chartPadding * 2) / (timeline.length - 1) : 0;
                      const x = chartPadding + stepX * index;
                      const y = chartHeight - chartPadding - (point.count / maxBattleCount) * (chartHeight - chartPadding * 2);
                      return (
                        <circle key={`${point.day}-${point.count}`} cx={x} cy={y} r={3} fill="rgba(245,158,11,0.9)" />
                      );
                    }
                    return null;
                  })}
                </svg>
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-4 gap-4">
          <div className="bg-stone-900/70 border border-stone-700 rounded p-4">
            <div className="text-stone-200 font-semibold mb-3">事件日志</div>
            {logs.length === 0 ? (
              <div className="text-sm text-stone-500">暂无记录。</div>
            ) : (
              <div className="max-h-[70vh] overflow-y-auto scrollbar-hide pr-1">
                <ul className="space-y-2 text-sm text-stone-300">
                  {logs.map((item, index) => (
                    <li key={`${index}_${item.slice(0, 8)}`} className="leading-relaxed">
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          <div className="bg-stone-900/70 border border-stone-700 rounded p-4">
            <div className="text-stone-200 font-semibold mb-3">战斗详情</div>
            {worldBattleReports.length === 0 ? (
              <div className="text-sm text-stone-500">暂无战斗记录。</div>
            ) : (
              <div className="space-y-3 max-h-[70vh] overflow-y-auto scrollbar-hide pr-1">
                {worldBattleReports.map(report => (
                  <div key={report.id} className="bg-stone-950/60 border border-stone-800 rounded p-3 space-y-2">
                    <div className="flex items-center justify-between text-sm text-stone-200">
                      <div>第 {report.day} 天 · {report.battleLocation}</div>
                      <div className="text-xs text-slate-300">{outcomeLabel(report.outcome)}</div>
                    </div>
                    <div className="text-xs text-stone-500">敌军：{report.enemyName} · 记录时间 {report.createdAt || '未知'}</div>
                    <div className="text-xs text-stone-300">我方：{report.playerSide || '（无）'}</div>
                    <div className="text-xs text-stone-300">敌方：{report.enemySide || '（无）'}</div>
                    <div className="text-xs text-stone-400">伤情：{report.keyUnitDamageSummary || '（无）'}</div>
                    {report.rounds.length === 0 ? (
                      <div className="text-xs text-stone-500">暂无回合记录。</div>
                    ) : (
                      <div className="space-y-2">
                        {report.rounds.map(round => (
                          <div key={`${report.id}_${round.roundNumber}`} className="border border-stone-800/70 rounded p-2 text-xs text-stone-300 space-y-1">
                            <div className="text-stone-400">回合 {round.roundNumber}</div>
                            {round.description && <div className="text-stone-300">{round.description}</div>}
                            <div className="text-stone-400">我方伤亡：{formatTroopLoss(round.casualtiesA ?? (round as any).playerCasualties ?? [])}</div>
                            <div className="text-stone-400">我方关键单位受伤：{formatKeyUnitLoss(round.keyUnitDamageA ?? (round as any).heroInjuries ?? [])}</div>
                            <div className="text-stone-400">敌方关键单位受伤：{formatKeyUnitLoss(round.keyUnitDamageB ?? (round as any).enemyInjuries ?? [])}</div>
                            <div className="text-stone-400">敌方伤亡：{formatTroopLoss(round.casualtiesB ?? (round as any).enemyCasualties ?? [])}</div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="bg-stone-900/70 border border-stone-700 rounded p-4">
            <div className="text-stone-200 font-semibold mb-3">兵种档案</div>
            <div className="bg-stone-950/60 border border-stone-800 rounded p-4">
              <div className="flex items-center justify-between">
                <div className="text-sm text-stone-200 font-semibold">档案库</div>
                <div className="text-xs text-stone-500">{troopTypeCount} 个条目</div>
              </div>
              <div className="text-xs text-stone-400 mt-2 leading-relaxed">
                查看六维雷达图、筛选与统计信息。
              </div>
              <div className="mt-4">
                <Button
                  onClick={onOpenTroopArchive}
                  size="lg"
                  className="w-full flex items-center justify-center gap-2"
                >
                  <Scroll size={18} /> 打开兵种档案
                </Button>
              </div>
            </div>
          </div>

          <div className="bg-stone-900/70 border border-stone-700 rounded p-4">
            <div className="text-stone-200 font-semibold mb-3">势力动态</div>
            <div className="space-y-3 max-h-[70vh] overflow-y-auto scrollbar-hide pr-1">
              {factionSnapshots.map(faction => (
                <div key={faction.id} className="bg-stone-950/60 border border-stone-800 rounded p-3 space-y-2">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: faction.color }} />
                      <div className="text-sm text-stone-200 font-semibold">{faction.name}</div>
                    </div>
                    <span className="text-xs text-stone-400">{focusLabel[faction.focus]} 擅长</span>
                  </div>
                  <div className="text-xs text-stone-500">{faction.description}</div>
                  <div className="grid grid-cols-2 gap-2 text-xs text-stone-300">
                    <div>城市 {faction.cities}</div>
                    <div>堡垒 {faction.castles}</div>
                    <div>乡村 {faction.villages}</div>
                    <div>兵力 {faction.soldiers}</div>
                  </div>
                </div>
              ))}
              {factionSnapshots.length === 0 && (
                <div className="text-sm text-stone-500">暂无势力数据。</div>
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 mt-6">
          <div className="bg-stone-900/70 border border-stone-700 rounded p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="text-stone-200 font-semibold flex items-center gap-2">
                <Hammer size={16} /> 攻城设施档案
              </div>
              <div className="text-xs text-stone-500">{siegeEngineArchive.length} 个条目</div>
            </div>
            <div className="space-y-3 max-h-[60vh] overflow-y-auto scrollbar-hide pr-1">
              {siegeEngineArchive.map(item => (
                <div key={item.type} className="bg-stone-950/60 border border-stone-800 rounded p-3 space-y-2">
                  <div className="flex items-center justify-between text-sm text-stone-200">
                    <div className="font-semibold">{item.name}</div>
                    <div className="text-xs text-stone-500">{item.type}</div>
                  </div>
                  <div className="text-xs text-stone-400">{item.description}</div>
                  <div className="grid grid-cols-2 gap-2 text-xs text-stone-300">
                    <div>成本 {item.cost}</div>
                    <div>工期 {item.days} 天</div>
                    <div>耐久 {item.hp}</div>
                    <div>破墙 {item.wallDamage}</div>
                    <div>远程命中 +{pct(item.attackerRangedHit)}</div>
                    <div>远程伤害 +{pct(item.attackerRangedDamage)}</div>
                    <div>近战命中 +{pct(item.attackerMeleeHit)}</div>
                    <div>近战伤害 +{pct(item.attackerMeleeDamage)}</div>
                    <div>守方远程命中 -{pct(item.defenderRangedHitPenalty)}</div>
                    <div>守方远程伤害 -{pct(item.defenderRangedDamagePenalty)}</div>
                  </div>
                </div>
              ))}
              {siegeEngineArchive.length === 0 && (
                <div className="text-sm text-stone-500">暂无攻城设施数据。</div>
              )}
            </div>
          </div>

          <div className="bg-stone-900/70 border border-stone-700 rounded p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="text-stone-200 font-semibold flex items-center gap-2">
                <Shield size={16} /> 守城设施档案
              </div>
              <div className="text-xs text-stone-500">{defenseArchive.length} 个条目</div>
            </div>
            <div className="space-y-3 max-h-[60vh] overflow-y-auto scrollbar-hide pr-1">
              {defenseArchive.map(item => (
                <div key={item.type} className="bg-stone-950/60 border border-stone-800 rounded p-3 space-y-2">
                  <div className="flex items-center justify-between text-sm text-stone-200">
                    <div className="font-semibold">{item.sampleName}</div>
                    <div className="text-xs text-stone-500">{item.type}</div>
                  </div>
                  <div className="text-xs text-stone-400">{item.wallName} (Lv.{item.wallLevel})</div>
                  <div className="grid grid-cols-2 gap-2 text-xs text-stone-300">
                    <div>城墙耐久 {item.wallHp}</div>
                    <div>器械耐久 {item.mechanismHp}</div>
                    <div>远程命中 +{pct(item.rangedHitBonus)}</div>
                    <div>远程伤害 +{pct(item.rangedDamageBonus)}</div>
                    <div>近战减伤 {pct(item.meleeDamageReduction)}</div>
                    <div>器械数量 {item.mechanisms.length}</div>
                  </div>
                  {item.mechanisms.length > 0 && (
                    <div className="flex flex-wrap gap-1 text-xs text-stone-400">
                      {item.mechanisms.map(mech => (
                        <span key={mech.name} className="px-1.5 py-0.5 bg-stone-800 rounded border border-stone-700">
                          {mech.name}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
              {defenseArchive.length === 0 && (
                <div className="text-sm text-stone-500">暂无守城设施数据。</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
