import React from 'react';
import { ArrowLeft, Coins, Scroll } from 'lucide-react';
import { BuildingType, Location, PlayerState, Troop, TroopTier } from '../types';
import { Button } from '../components/Button';

type BillsViewProps = {
  player: PlayerState;
  locations: Location[];
  getTroopTemplate: (id: string) => Omit<Troop, 'count' | 'xp'> | undefined;
  onBack: () => void;
};

export const BillsView = ({ player, locations, getTroopTemplate, onBack }: BillsViewProps) => {
  const horizonDays = 28;
  const today = player.day;
  const leadership = Math.max(0, Math.floor(player.attributes.leadership ?? 0));
  const leadershipRate = Math.min(0.4, leadership * 0.01);
  const daysUntilNextWage = (() => {
    const mod = ((today % 7) + 7) % 7;
    const d = 7 - mod;
    return d <= 0 ? 7 : d;
  })();

  const tierWageTable: Record<number, number> = { 1: 1, 2: 2, 3: 4, 4: 7, 5: 11, 6: 16 };
  const getUnitWage = (troop: { id: string; tier?: TroopTier; category?: string; heavyTier?: number }) => {
    const tier = (troop.tier ?? getTroopTemplate(troop.id)?.tier ?? 3) as unknown as number;
    let wage = tierWageTable[tier] ?? 4;
    const isHeavy = troop.category === 'HEAVY' || (troop.heavyTier ?? 0) > 0;
    if (isHeavy) wage = Math.round(wage * 2);
    return Math.max(0, Math.floor(wage));
  };

  const collectStationedTroops = () => {
    const stationed: Troop[] = [];
    locations.forEach(loc => {
      if (loc.owner !== 'PLAYER') return;
      if (loc.type === 'HIDEOUT') {
        const layers = loc.hideout?.layers ?? [];
        layers.forEach(layer => (layer.garrison ?? []).forEach(t => stationed.push({ ...t })));
        return;
      }
      (loc.garrison ?? []).forEach(t => stationed.push({ ...t }));
    });
    return stationed;
  };

  const computeWeeklyWage = () => {
    const army = (player.troops ?? []).reduce((sum, t) => sum + getUnitWage(t) * Math.max(0, Math.floor(t.count ?? 0)), 0);
    const wounded = (player.woundedTroops ?? []).reduce((sum, e) => {
      const count = Math.max(0, Math.floor(e.count ?? 0));
      if (count <= 0) return sum;
      const tmpl = getTroopTemplate(e.troopId);
      const unit = getUnitWage({ id: e.troopId, tier: tmpl?.tier, category: tmpl?.category, heavyTier: tmpl?.heavyTier });
      return sum + unit * count;
    }, 0);
    const stationed = collectStationedTroops().reduce((sum, t) => sum + getUnitWage(t) * Math.max(0, Math.floor(t.count ?? 0)), 0);
    const stationedDiscounted = Math.floor(stationed / 5);
    const base = army + wounded + stationedDiscounted;
    const afterLeadership = Math.floor(base * (1 - leadershipRate));
    return {
      army,
      wounded,
      stationedRaw: stationed,
      stationedDiscounted,
      base,
      afterLeadership: Math.max(0, afterLeadership)
    };
  };

  const weekly = computeWeeklyWage();
  const wageEvents = Array.from({ length: horizonDays }, (_, i) => today + (i + 1)).filter(d => d % 7 === 0).length;
  const wageMonth = weekly.afterLeadership * wageEvents;

  const computeHideoutTaxProjection = () => {
    const isBuilt = (slot: any) => {
      if (!slot || typeof slot !== 'object') return false;
      if (!slot.type) return false;
      if (typeof slot.daysLeft === 'number' && slot.daysLeft > 0) return false;
      return true;
    };
    const getBuiltTypes = (slots: any[] | undefined) => (Array.isArray(slots) ? slots : []).filter(isBuilt).map(s => s.type as BuildingType);

    let total = 0;
    const details: Array<{ hideoutName: string; layerName: string; times: number; amount: number }> = [];
    locations.forEach(loc => {
      if (loc.owner !== 'PLAYER') return;
      if (loc.type !== 'HIDEOUT') return;
      const layers = loc.hideout?.layers ?? [];
      layers.forEach(layer => {
        const facilityBuilt = getBuiltTypes(layer.facilitySlots as any);
        const housingCount = facilityBuilt.reduce((acc, t) => acc + (t === 'HOUSING' ? 1 : 0), 0);
        if (housingCount <= 0) return;
        const perHit = housingCount * (18 + (layer.depth ?? 0) * 4);
        let lastIncomeDay = Math.max(0, Math.floor((layer as any).lastIncomeDay ?? 0));
        let hits = 0;
        for (let step = 1; step <= horizonDays; step++) {
          const day = today + step;
          if (day - lastIncomeDay >= 3) {
            hits += 1;
            total += perHit;
            lastIncomeDay = day;
          }
        }
        details.push({ hideoutName: loc.name, layerName: layer.name, times: hits, amount: perHit * hits });
      });
    });
    return { total, details: details.filter(d => d.times > 0).sort((a, b) => b.amount - a.amount) };
  };

  const taxes = computeHideoutTaxProjection();
  const net = taxes.total - wageMonth;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Button variant="secondary" onClick={onBack}>
            <ArrowLeft size={16} className="inline mr-2" /> 返回
          </Button>
          <div>
            <div className="text-stone-200 font-bold text-xl flex items-center gap-2">
              <Scroll size={18} className="text-amber-300" /> 账单
            </div>
            <div className="text-xs text-stone-500">预计未来 {horizonDays} 天（约 1 个月）</div>
          </div>
        </div>
        <div className="text-sm text-stone-400 flex items-center gap-2">
          <Coins size={14} className="text-yellow-500" /> 当前金币 {player.gold}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-stone-900/60 border border-stone-800 rounded p-4">
          <div className="text-stone-200 font-bold">军饷支出</div>
          <div className="text-xs text-stone-500 mt-1">每周结算 · 驻军按 1/5 · 统御减免</div>
          <div className="mt-3 text-3xl font-mono text-red-400">{wageMonth}</div>
          <div className="text-xs text-stone-500 mt-2">
            下月结算次数：{wageEvents} 次 · 周军饷：{weekly.afterLeadership}
          </div>
          <div className="text-xs text-stone-500 mt-1">距离下次结算：{daysUntilNextWage} 天</div>
          <div className="text-xs text-stone-600 mt-2">
            统御 {leadership}：-{Math.round(leadershipRate * 100)}%
          </div>
        </div>

        <div className="bg-stone-900/60 border border-stone-800 rounded p-4">
          <div className="text-stone-200 font-bold">税收收入</div>
          <div className="text-xs text-stone-500 mt-1">目前仅统计隐匿点民居税收</div>
          <div className="mt-3 text-3xl font-mono text-emerald-400">{taxes.total}</div>
          <div className="text-xs text-stone-500 mt-2">
            约每 3 天征收一次（按现有建筑推算）
          </div>
        </div>

        <div className="bg-stone-900/60 border border-stone-800 rounded p-4">
          <div className="text-stone-200 font-bold">净收支</div>
          <div className="text-xs text-stone-500 mt-1">收入 - 支出</div>
          <div className={`mt-3 text-3xl font-mono ${net >= 0 ? 'text-emerald-300' : 'text-red-300'}`}>{net}</div>
          <div className="text-xs text-stone-500 mt-2">
            {net >= 0 ? '预计结余增加' : '预计资金减少'}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-stone-900/60 border border-stone-800 rounded p-4">
          <div className="text-stone-200 font-bold mb-3">军饷明细（每周）</div>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-stone-500">队伍</span><span className="text-stone-200 font-mono">{weekly.army}</span></div>
            <div className="flex justify-between"><span className="text-stone-500">伤兵</span><span className="text-stone-200 font-mono">{weekly.wounded}</span></div>
            <div className="flex justify-between"><span className="text-stone-500">驻军（原价）</span><span className="text-stone-200 font-mono">{weekly.stationedRaw}</span></div>
            <div className="flex justify-between"><span className="text-stone-500">驻军（1/5）</span><span className="text-stone-200 font-mono">{weekly.stationedDiscounted}</span></div>
            <div className="flex justify-between border-t border-stone-800 pt-2"><span className="text-stone-500">合计（统御前）</span><span className="text-stone-200 font-mono">{weekly.base}</span></div>
            <div className="flex justify-between"><span className="text-stone-500">合计（统御后）</span><span className="text-amber-300 font-mono">{weekly.afterLeadership}</span></div>
          </div>
        </div>

        <div className="bg-stone-900/60 border border-stone-800 rounded p-4">
          <div className="text-stone-200 font-bold mb-3">税收明细（预测）</div>
          {taxes.details.length === 0 ? (
            <div className="text-stone-500 text-sm">暂无可预测税收（需要隐匿点建造民居）。</div>
          ) : (
            <div className="space-y-2 text-sm">
              {taxes.details.slice(0, 10).map((d, idx) => (
                <div key={`${d.hideoutName}_${d.layerName}_${idx}`} className="flex justify-between gap-3">
                  <span className="text-stone-500 truncate">{d.hideoutName}·{d.layerName}（{d.times} 次）</span>
                  <span className="text-stone-200 font-mono">{d.amount}</span>
                </div>
              ))}
              {taxes.details.length > 10 && (
                <div className="text-xs text-stone-600">其余 {taxes.details.length - 10} 条已省略</div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
