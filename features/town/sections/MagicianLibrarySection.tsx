import React from 'react';
import { Button } from '../../../components/Button';
import { Anomaly, MineralId, PlayerState } from '../../../types';

type MagicianLibrarySectionProps = {
  mineralMeta: Record<MineralId, { name: string; effect: string }>;
  anomalyPools: Record<MineralId, Anomaly[]>;
  mineralInventory: PlayerState['minerals'];
  ownedAnomalies: Array<{ anomaly: Anomaly | null; count: number }>;
  currentTroopCount: number;
  maxTroops: number;
  getMineralAvailable: (inventory: PlayerState['minerals'], mineralId: MineralId, purityMin: 1) => number;
  getTroopTemplate: (id: string) => any;
  onDrawAnomaly: (mineralId: MineralId) => void;
  onAnomalySummon: (anomaly: Anomaly) => void;
};

export const MagicianLibrarySection = ({
  mineralMeta,
  anomalyPools,
  mineralInventory,
  ownedAnomalies,
  currentTroopCount,
  maxTroops,
  getMineralAvailable,
  getTroopTemplate,
  onDrawAnomaly,
  onAnomalySummon
}: MagicianLibrarySectionProps) => {
  return (
    <div className="space-y-6 animate-fade-in">
      <div className="bg-stone-900/40 p-4 rounded border border-stone-800">
        <p className="text-stone-400 text-sm">
          消耗异常水晶抽取异常样本，抽取有 20% 概率失稳。收集异常后即可进行召唤。
        </p>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-stone-900/60 border border-stone-800 rounded p-4 space-y-3">
          <div className="text-stone-200 font-bold">水晶抽异常</div>
          <div className="space-y-3">
            {(Object.keys(mineralMeta) as MineralId[]).map(id => {
              const pool = anomalyPools[id] ?? [];
              const available = getMineralAvailable(mineralInventory, id, 1);
              return (
                <div key={id} className="bg-stone-900 border border-stone-800 rounded p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="text-stone-200 font-semibold">{mineralMeta[id].name}</div>
                    <span className="text-xs text-stone-400">库存 {available}</span>
                  </div>
                  <div className="text-xs text-stone-500">{mineralMeta[id].effect}</div>
                  <div className="text-xs text-stone-500">异常池：{pool.length} 种</div>
                  <Button
                    onClick={() => onDrawAnomaly(id)}
                    variant="secondary"
                    disabled={available < 1 || pool.length === 0}
                    className="w-full"
                  >
                    消耗 1 抽取
                  </Button>
                </div>
              );
            })}
          </div>
        </div>

        <div className="bg-stone-900/60 border border-stone-800 rounded p-4 space-y-3">
          <div className="text-stone-200 font-bold">异常召唤</div>
          {ownedAnomalies.length === 0 ? (
            <div className="text-stone-500 text-sm">尚未收集到异常样本。</div>
          ) : (
            <div className="space-y-3">
              {ownedAnomalies.map(({ anomaly, count }) => {
                if (!anomaly) return null;
                const troop = getTroopTemplate(anomaly.troopId);
                const canSummon = currentTroopCount < maxTroops;
                const label = canSummon ? '召唤' : '队伍已满';
                return (
                  <div key={anomaly.id} className="bg-stone-900 border border-stone-800 rounded p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="text-stone-200 font-semibold">{anomaly.name}</div>
                      <span className="text-xs text-sky-300">T{anomaly.tier}</span>
                    </div>
                    <div className="text-xs text-stone-500">{anomaly.description}</div>
                    <div className="text-xs text-stone-400">异常样本：{count}</div>
                    <div className="text-xs text-stone-400">召唤兵种：{troop?.name ?? anomaly.troopId}</div>
                    <Button
                      onClick={() => onAnomalySummon(anomaly)}
                      variant="secondary"
                      disabled={!canSummon}
                      className="w-full"
                    >
                      {label}
                    </Button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
