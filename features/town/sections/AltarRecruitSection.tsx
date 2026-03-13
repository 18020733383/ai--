import React from 'react';
import { Star } from 'lucide-react';
import { Button } from '../../../components/Button';
import { Location, Troop } from '../../../types';
import { AltarRecruitState, MiningState, RoachLureState, WorkState } from '../model/types';
import { AltarRadar } from './AltarShared';

type AltarRecruitSectionProps = {
  altarState: Location['altar'];
  getTroopTemplate: (id: string) => Omit<Troop, 'count' | 'xp'> | undefined;
  altarRecruitDays: number;
  setAltarRecruitDays: (value: number) => void;
  isAltarRecruiting: boolean;
  altarRecruitState: AltarRecruitState | null;
  onStartAltarRecruit: () => void;
  believerStats: { total: number; byTier: Record<number, number> };
  currentTroopCount: number;
  maxTroops: number;
  workState: WorkState | null;
  miningState: MiningState | null;
  roachLureState: RoachLureState | null;
};

export const AltarRecruitSection = ({
  altarState,
  getTroopTemplate,
  altarRecruitDays,
  setAltarRecruitDays,
  isAltarRecruiting,
  altarRecruitState,
  onStartAltarRecruit,
  believerStats,
  currentTroopCount,
  maxTroops,
  workState,
  miningState,
  roachLureState
}: AltarRecruitSectionProps) => {
  return (
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
                      <AltarRadar attrs={template?.attributes} color="#7c3aed" />
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
            onClick={onStartAltarRecruit}
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
  );
};
