import React, { useState, useEffect, useRef } from 'react';
import { Fish, Plus, ShoppingCart } from 'lucide-react';
import { Button } from '../../../components/Button';
import type { Location, SealInstance, SealSpecies } from '../../../types';

const HUNGER_SEGMENTS = 5;
const DANGER_THRESHOLD = 2;

export const SEAL_SPECIES: { id: SealSpecies; name: string; price: number; fishPerDay: number }[] = [
  { id: 'harbor_seal', name: '港海豹', price: 80, fishPerDay: 3 },
  { id: 'elephant_seal', name: '象海豹', price: 200, fishPerDay: 8 },
  { id: 'fur_seal', name: '毛皮海豹', price: 150, fishPerDay: 5 },
  { id: 'leopard_seal', name: '豹海豹', price: 250, fishPerDay: 10 },
  { id: 'california_sea_lion', name: '加州海狮', price: 120, fishPerDay: 6 },
  { id: 'stellers_sea_lion', name: '北海狮', price: 220, fishPerDay: 9 },
  { id: 'australian_sea_lion', name: '澳洲海狮', price: 180, fishPerDay: 5 }
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

  const [fishDropTrigger, setFishDropTrigger] = useState(0);
  const fishDropCountRef = useRef(0);

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
    fishDropCountRef.current = Math.min(count, 12);
    setFishDropTrigger((t) => t + 1);
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

  const [tick, setTick] = useState(0);
  const [sealPositions, setSealPositions] = useState<Record<string, { x: number; y: number; targetX: number; targetY: number }>>({});
  const [fishDrops, setFishDrops] = useState<Array<{ id: number; x: number; progress: number }>>([]);

  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 400);
    return () => clearInterval(id);
  }, []);

  const aliveSeals = seals.filter((s) => s.hungerDays < STARVE_DAYS);

  const fishDropActive = fishDrops.length > 0;

  useEffect(() => {
    if (aliveSeals.length === 0) return;
    setSealPositions((prev) => {
      const next = { ...prev };
      aliveSeals.forEach((seal, i) => {
        const cur = next[seal.id];
        const seed = seal.id.split('').reduce((s, c) => s + c.charCodeAt(0), 0);
        if (!cur || Math.abs(cur.x - cur.targetX) < 2 || (fishDropActive && tick % 2 === 0)) {
          let targetX: number;
          let targetY: number;
          if (fishDropActive) {
            targetX = 20 + (seed + i * 13) % 60;
            targetY = 65 + (seed % 15);
          } else {
            targetX = 15 + (seed + tick) % 70;
            targetY = 20 + ((seed * 7 + tick * 3) % 60);
          }
          next[seal.id] = {
            x: cur?.x ?? targetX,
            y: cur?.y ?? targetY,
            targetX,
            targetY
          };
        } else {
          const dx = (cur.targetX - cur.x) * 0.15;
          const dy = (cur.targetY - cur.y) * 0.15;
          next[seal.id] = { ...cur, x: cur.x + dx, y: cur.y + dy };
        }
      });
      return next;
    });
  }, [aliveSeals, tick, fishDropActive]);

  useEffect(() => {
    if (fishDropTrigger <= 0) return;
    const n = fishDropCountRef.current;
    const newDrops = Array.from({ length: n }, (_, i) => ({
      id: Date.now() + i * 100,
      x: 10 + (i * 7) % 80,
      progress: 0
    }));
    setFishDrops((prev) => [...prev, ...newDrops]);
    const animId = setInterval(() => {
      setFishDrops((prev) => {
        const next = prev.map((f) => ({ ...f, progress: Math.min(1, f.progress + 0.06) }));
        return next.filter((f) => f.progress < 1);
      });
    }, 60);
    return () => clearInterval(animId);
  }, [fishDropTrigger]);

  return (
    <div className="space-y-6 animate-fade-in">
      {aliveSeals.length > 0 && (
        <div className="bg-stone-900/40 p-4 rounded border border-stone-800 overflow-hidden">
          <div className="text-stone-200 font-bold mb-2">海边活动（俯视）</div>
          <div
            className="relative h-40 rounded-lg border border-stone-700 overflow-hidden"
            style={{
              background: 'linear-gradient(135deg, #4A90A4 0%, #5BA3B8 30%, #C4A574 60%, #DEB887 100%)'
            }}
          >
            {fishDrops.map((f) => (
              <div
                key={f.id}
                className="absolute text-lg select-none pointer-events-none animate-bounce"
                style={{
                  left: `${f.x}%`,
                  top: `${f.progress * 100}%`,
                  transform: 'translate(-50%, -50%)'
                }}
              >
                🐟
              </div>
            ))}
            {aliveSeals.map((seal, i) => {
              const pos = sealPositions[seal.id];
              const x = pos ? pos.x : 30 + (i * 15) % 50;
              const y = pos ? pos.y : 40 + (i * 10) % 40;
              return (
                <div
                  key={seal.id}
                  className="absolute text-xl select-none pointer-events-none transition-all duration-300"
                  style={{
                    left: `${Math.max(5, Math.min(90, x))}%`,
                    top: `${Math.max(5, Math.min(85, y))}%`,
                    transform: 'translate(-50%, -50%)'
                  }}
                  title={seal.name}
                >
                  🦭
                </div>
              );
            })}
          </div>
        </div>
      )}
      <div className="bg-stone-900/40 p-4 rounded border border-stone-800">
        <div className="flex items-center justify-between gap-3">
          <div className="text-stone-200 font-bold">海狮饲养场</div>
          <div className="text-xs text-stone-600">无驻军 · 不会被攻击</div>
        </div>
        <div className="text-sm text-stone-400 mt-2 leading-relaxed">
          购买海狮/海豹需要花钱，鱼会随时间消耗。鱼耗尽后超过 {STARVE_DAYS} 天未喂食，动物会饿死。
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
        <div className="text-stone-200 font-bold">购买海狮与海豹</div>
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
        <div className="text-stone-200 font-bold">饲养中的海狮与海豹</div>
        {seals.length === 0 ? (
          <div className="text-stone-500 text-sm">暂无饲养的动物。购买后在此显示。</div>
        ) : (
          <div className="space-y-3">
            {seals.map((seal) => {
              const spec = SEAL_SPECIES.find((s) => s.id === seal.species);
              const status =
                seal.hungerDays >= STARVE_DAYS
                  ? '已饿死'
                  : seal.hungerDays > 0
                    ? `饥饿 ${seal.hungerDays} 天`
                    : '健康';
              const remaining = Math.max(0, HUNGER_SEGMENTS - seal.hungerDays);
              const isDanger = remaining <= DANGER_THRESHOLD && seal.hungerDays < STARVE_DAYS;
              return (
                <div
                  key={seal.id}
                  className={`flex flex-col gap-1.5 p-2 rounded border ${
                    seal.hungerDays >= STARVE_DAYS ? 'bg-red-950/20 border-red-900/50' : 'bg-stone-950/50 border-stone-800'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-stone-200">{seal.name}</span>
                    <span className="text-stone-500 text-sm">
                      （{spec?.name ?? seal.species}）· {status}
                    </span>
                  </div>
                  {seal.hungerDays < STARVE_DAYS && (
                    <div className="flex items-center gap-2">
                      <div className="flex gap-0.5 flex-1 relative">
                        {Array.from({ length: HUNGER_SEGMENTS }, (_, i) => (
                          <div
                            key={i}
                            className={`h-2.5 flex-1 rounded-sm border ${
                              i < remaining
                                ? isDanger
                                  ? 'bg-amber-500 border-amber-600'
                                  : 'bg-emerald-500 border-emerald-600'
                                : 'bg-stone-700 border-stone-600'
                            }`}
                            title={i < remaining ? '饱食' : '空腹'}
                          />
                        ))}
                        <div
                          className="absolute top-0 bottom-0 w-0.5 bg-amber-400/80 -translate-x-px"
                          style={{ left: `${(DANGER_THRESHOLD / HUNGER_SEGMENTS) * 100}%` }}
                          title="危险线"
                        />
                      </div>
                      <span className="text-[10px] text-stone-500 w-8 tabular-nums">
                        {remaining}/{HUNGER_SEGMENTS}
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
