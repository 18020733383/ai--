import React from 'react';
import { Fish, Plus, ShoppingCart } from 'lucide-react';
import { Button } from '../../../components/Button';
import type { Location, SealInstance, SealSpecies } from '../../../types';

export const SEAL_SPECIES: { id: SealSpecies; name: string; price: number; fishPerDay: number }[] = [
  { id: 'harbor_seal', name: '港海豹', price: 80, fishPerDay: 3 },
  { id: 'elephant_seal', name: '象海豹', price: 200, fishPerDay: 8 },
  { id: 'fur_seal', name: '毛皮海豹', price: 150, fishPerDay: 5 },
  { id: 'leopard_seal', name: '豹海豹', price: 250, fishPerDay: 10 }
];

export const FISH_PRICE = 5;
export const STARVE_DAYS = 5;

type SealHabitatSectionProps = {
  location: Location;
  playerGold: number;
  playerDay: number;
  onUpdateLocation: (updater: (loc: Location) => Location) => void;
  setPlayer: React.Dispatch<React.SetStateAction<{ gold: number }>>;
  addLog: (text: string) => void;
};

export const SealHabitatSection = ({
  location,
  playerGold,
  playerDay,
  onUpdateLocation,
  setPlayer,
  addLog
}: SealHabitatSectionProps) => {
  const state = location.sealHabitat ?? { seals: [], fishStock: 0, lastFeedDay: playerDay };
  const { seals, fishStock } = state;

  const buyFish = (count: number) => {
    const cost = count * FISH_PRICE;
    if (playerGold < cost) {
      addLog('金币不足。');
      return;
    }
    setPlayer((p) => ({ ...p, gold: p.gold - cost }));
    onUpdateLocation((loc) => {
      if (loc.id !== location.id || loc.type !== 'SEAL_HABITAT') return loc;
      const sh = loc.sealHabitat ?? { seals: [], fishStock: 0, lastFeedDay: playerDay };
      return {
        ...loc,
        sealHabitat: { ...sh, fishStock: sh.fishStock + count }
      };
    });
    addLog(`购买了 ${count} 条鱼（花费 ${cost} 第纳尔）。`);
  };

  const buySeal = (species: SealSpecies) => {
    const spec = SEAL_SPECIES.find((s) => s.id === species);
    if (!spec || playerGold < spec.price) {
      addLog(spec ? '金币不足。' : '未知品种。');
      return;
    }
    setPlayer((p) => ({ ...p, gold: p.gold - spec.price }));
    const id = `seal_${species}_${Date.now()}`;
    const name = `${spec.name}${seals.filter((s) => s.species === species).length + 1}`;
    onUpdateLocation((loc) => {
      if (loc.id !== location.id || loc.type !== 'SEAL_HABITAT') return loc;
      const sh = loc.sealHabitat ?? { seals: [], fishStock: 0, lastFeedDay: playerDay };
      return {
        ...loc,
        sealHabitat: {
          ...sh,
          seals: [...sh.seals, { id, species, name, hungerDays: 0 }]
        }
      };
    });
    addLog(`购买了 ${name}（花费 ${spec.price} 第纳尔）。`);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="bg-stone-900/40 p-4 rounded border border-stone-800">
        <div className="flex items-center justify-between gap-3">
          <div className="text-stone-200 font-bold">海狮饲养场</div>
          <div className="text-xs text-stone-600">无驻军 · 不会被攻击</div>
        </div>
        <div className="text-sm text-stone-400 mt-2 leading-relaxed">
          购买海狮/海豹需要花钱，鱼会随时间消耗。鱼耗尽后超过 {STARVE_DAYS} 天未喂食，海狮会饿死。
        </div>
      </div>

      <div className="bg-stone-900/40 p-4 rounded border border-stone-800 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-stone-200 font-bold flex items-center gap-2">
            <Fish size={18} /> 鱼库存
          </span>
          <span className="text-amber-400">{fishStock} 条</span>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant="secondary" size="sm" onClick={() => buyFish(10)} disabled={playerGold < 50}>
            <ShoppingCart size={14} className="inline mr-1" /> 买 10 条（50）
          </Button>
          <Button variant="secondary" size="sm" onClick={() => buyFish(50)} disabled={playerGold < 250}>
            买 50 条（250）
          </Button>
          <Button variant="gold" size="sm" onClick={() => buyFish(100)} disabled={playerGold < 500}>
            买 100 条（500）
          </Button>
        </div>
      </div>

      <div className="bg-stone-900/40 p-4 rounded border border-stone-800 space-y-3">
        <div className="text-stone-200 font-bold">购买海狮/海豹</div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {SEAL_SPECIES.map((spec) => (
            <div
              key={spec.id}
              className="flex items-center justify-between p-3 bg-stone-950/50 rounded border border-stone-800"
            >
              <div>
                <div className="text-stone-200 font-medium">{spec.name}</div>
                <div className="text-xs text-stone-500">
                  {spec.price} 第纳尔 · 每日消耗 {spec.fishPerDay} 条鱼
                </div>
              </div>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => buySeal(spec.id)}
                disabled={playerGold < spec.price}
              >
                <Plus size={14} className="inline mr-1" /> 购买
              </Button>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-stone-900/40 p-4 rounded border border-stone-800 space-y-3">
        <div className="text-stone-200 font-bold">饲养中的海狮</div>
        {seals.length === 0 ? (
          <div className="text-stone-500 text-sm">暂无饲养的海狮。购买后在此显示。</div>
        ) : (
          <div className="space-y-2">
            {seals.map((seal) => {
              const spec = SEAL_SPECIES.find((s) => s.id === seal.species);
              const status =
                seal.hungerDays >= STARVE_DAYS
                  ? '已饿死'
                  : seal.hungerDays > 0
                    ? `饥饿 ${seal.hungerDays} 天`
                    : '健康';
              return (
                <div
                  key={seal.id}
                  className={`flex items-center justify-between p-2 rounded border ${
                    seal.hungerDays >= STARVE_DAYS ? 'bg-red-950/20 border-red-900/50' : 'bg-stone-950/50 border-stone-800'
                  }`}
                >
                  <div>
                    <span className="text-stone-200">{seal.name}</span>
                    <span className="text-stone-500 text-sm ml-2">
                      （{spec?.name ?? seal.species}）· {status}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
