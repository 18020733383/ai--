import React from 'react';
import { Button } from '../../../components/Button';

type RoachLureSectionProps = {
  roachLureDays: number;
  setRoachLureDays: (value: number) => void;
  roachLureStateActive: boolean;
  workStateActive: boolean;
  miningStateActive: boolean;
  currentTroopCount: number;
  maxTroops: number;
  onStartRoachLure: () => void;
};

export const RoachLureSection = ({
  roachLureDays,
  setRoachLureDays,
  roachLureStateActive,
  workStateActive,
  miningStateActive,
  currentTroopCount,
  maxTroops,
  onStartRoachLure
}: RoachLureSectionProps) => {
  return (
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
            disabled={roachLureStateActive}
          />
          <div className="text-stone-500 text-sm">预计收获总数：{roachLureDays * 1} - {roachLureDays * 3}</div>
        </div>
        <Button
          onClick={onStartRoachLure}
          variant="secondary"
          disabled={roachLureStateActive || workStateActive || miningStateActive || currentTroopCount >= maxTroops}
          className="flex items-center gap-2 w-full md:w-auto"
        >
          <span>🪳</span> 开始吸引
        </Button>
      </div>
    </div>
  );
};
