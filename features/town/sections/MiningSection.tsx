import React from 'react';
import { Mountain } from 'lucide-react';
import { Button } from '../../../components/Button';
import { MineralId, MineralPurity, PlayerState } from '../../../types';

type MiningSectionProps = {
  mineConfig: { mineralId: MineralId; crystalName: string; effect: string };
  miningDays: number;
  setMiningDays: (value: number) => void;
  miningStateActive: boolean;
  workStateActive: boolean;
  roachLureStateActive: boolean;
  onStartMining: () => void;
  mineralMeta: Record<MineralId, { name: string; effect: string }>;
  mineralPurityLabels: Record<MineralPurity, string>;
  mineralInventory: PlayerState['minerals'];
};

export const MiningSection = ({
  mineConfig,
  miningDays,
  setMiningDays,
  miningStateActive,
  workStateActive,
  roachLureStateActive,
  onStartMining,
  mineralMeta,
  mineralPurityLabels,
  mineralInventory
}: MiningSectionProps) => {
  return (
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
            disabled={miningStateActive}
          />
          <div className="text-stone-500 text-sm">纯度随机 1-5 级</div>
        </div>
        <Button
          onClick={onStartMining}
          variant="secondary"
          disabled={miningStateActive || workStateActive || roachLureStateActive}
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
  );
};
