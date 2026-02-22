import React from 'react';
import { ArrowRight, Coins, Shield, Swords, Trophy, User, Zap } from 'lucide-react';
import { BattleResult, EnemyForce, Hero, PlayerState, Troop } from '../types';
import { Button } from './Button';

type BattleSnapshot = { playerTroops: Troop[]; enemyTroops: Troop[] };

type BattleResultViewProps = {
  battleResult: BattleResult | null;
  isBattleResultFinal: boolean;
  currentRoundIndex: number;
  setCurrentRoundIndex: (index: number) => void;
  battleSnapshot: BattleSnapshot | null;
  player: PlayerState;
  heroes: Hero[];
  activeEnemy: EnemyForce | null;
  getBattleTroops: (player: PlayerState, heroes: Hero[]) => Troop[];
  closeBattleResult: () => void;
  isProgramMode: boolean;
  onAdvanceRound: () => void;
};

export const BattleResultView = ({
  battleResult,
  isBattleResultFinal,
  currentRoundIndex,
  setCurrentRoundIndex,
  battleSnapshot,
  player,
  heroes,
  activeEnemy,
  getBattleTroops,
  closeBattleResult,
  isProgramMode,
  onAdvanceRound
}: BattleResultViewProps) => {
  if (!battleResult) return null;

  const isFinal = isBattleResultFinal;
  const isVictory = isFinal && battleResult.outcome === 'A';
  const rounds = Array.isArray(battleResult.rounds) ? battleResult.rounds : [];
  const safeIndex = Math.min(currentRoundIndex, Math.max(0, rounds.length - 1));
  const currentRound = rounds[safeIndex] ?? { roundNumber: 1, description: "战报缺失，战场迷雾遮蔽了细节。", casualtiesA: [], keyUnitDamageA: [], keyUnitDamageB: [], casualtiesB: [] };
  const playerInjuries = currentRound.keyUnitDamageA ?? (currentRound as any).heroInjuries ?? (currentRound as any).playerInjuries ?? [];
  const enemyInjuries = currentRound.keyUnitDamageB ?? (currentRound as any).enemyInjuries ?? [];
  const roundCasualtiesA = currentRound.casualtiesA ?? (currentRound as any).playerCasualties ?? [];
  const roundCasualtiesB = currentRound.casualtiesB ?? (currentRound as any).enemyCasualties ?? [];
  const snapshot = battleSnapshot ?? { playerTroops: getBattleTroops(player, heroes), enemyTroops: activeEnemy?.troops ?? [] };
  const playerTotal = snapshot.playerTroops.reduce((sum, t) => sum + t.count, 0);
  const enemyTotal = snapshot.enemyTroops.reduce((sum, t) => sum + t.count, 0);
  const actionQueue = currentRound.actionQueue ?? [];

  const cumulativeCasualties = (side: 'player' | 'enemy') => {
    return rounds.slice(0, safeIndex + 1).reduce((sum, round) => {
      const list = side === 'player'
        ? (round.casualtiesA ?? (round as any).playerCasualties ?? [])
        : (round.casualtiesB ?? (round as any).enemyCasualties ?? []);
      return sum + list.reduce((acc, item) => acc + (item.count ?? 0), 0);
    }, 0);
  };

  const playerRemaining = Math.max(0, playerTotal - cumulativeCasualties('player'));
  const enemyRemaining = Math.max(0, enemyTotal - cumulativeCasualties('enemy'));

  const renderSoldierGrid = (total: number, remaining: number, color: string) => {
    const scale = Math.max(1, Math.ceil(total / 40));
    const totalIcons = Math.max(6, Math.ceil(total / scale));
    const aliveIcons = Math.max(0, Math.ceil(remaining / scale));
    return (
      <div className="grid grid-cols-8 gap-1">
        {Array.from({ length: totalIcons }).map((_, idx) => {
          const alive = idx < aliveIcons;
          return (
            <User
              key={idx}
              size={14}
              className={`${alive ? color : 'text-stone-700 opacity-40'} transition-colors`}
            />
          );
        })}
      </div>
    );
  };

  return (
    <div className="max-w-3xl mx-auto p-4 pt-10 animate-fade-in pb-20">
      <div className={`bg-stone-900 border-4 ${isVictory ? 'border-amber-600' : 'border-stone-700'} p-6 rounded shadow-2xl`}>
        <div className="text-center mb-8 border-b border-stone-800 pb-4">
          <h2 className={`text-4xl font-serif font-bold ${isFinal ? (isVictory ? 'text-amber-500' : 'text-stone-500') : 'text-stone-300'}`}>
            {isFinal ? (isVictory ? '史诗般的胜利！' : '惨痛的失败') : '战局推演中'}
          </h2>
          {!isFinal && !isProgramMode && (
            <div className="mt-3 text-xs text-stone-500">已接收 {rounds.length} 回合战报，正在继续生成...</div>
          )}
          {!isFinal && isProgramMode && (
            <div className="mt-3 text-xs text-stone-500">点击行动队列推进回合</div>
          )}
          {isVictory && (
            <div className="flex justify-center gap-6 mt-4 text-sm font-mono text-stone-300">
              <span className="flex items-center gap-1"><Coins size={14} className="text-yellow-500" /> +{battleResult.lootGold}</span>
              <span className="flex items-center gap-1"><Trophy size={14} className="text-purple-500" /> +{battleResult.renownGained}</span>
              <span className="flex items-center gap-1"><Zap size={14} className="text-blue-500" /> +{battleResult.xpGained} XP</span>
            </div>
          )}
        </div>

        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-black/30 p-4 rounded border border-stone-800 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-emerald-400 font-bold">我方阵地</span>
              <span className="text-stone-500 text-xs">{playerRemaining} / {playerTotal}</span>
            </div>
            {renderSoldierGrid(playerTotal, playerRemaining, 'text-emerald-400')}
          </div>
          <div className="bg-black/30 p-4 rounded border border-stone-800 flex flex-col items-center justify-center gap-2">
            <div className="text-stone-300 font-bold">战斗回合</div>
            <div className="text-amber-500 text-2xl font-mono">{currentRound.roundNumber}</div>
            <div className="text-stone-500 text-xs text-center">根据当回合伤亡刷新战场</div>
          </div>
          <div className="bg-black/30 p-4 rounded border border-stone-800 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-stone-500 text-xs">{enemyRemaining} / {enemyTotal}</span>
              <span className="text-red-400 font-bold">敌方阵地</span>
            </div>
            {renderSoldierGrid(enemyTotal, enemyRemaining, 'text-red-400')}
          </div>
        </div>

        <div className="bg-black/30 p-6 rounded min-h-[300px] mb-6 relative">
          <div className="flex justify-between items-center mb-4">
            <span className="text-stone-500 text-xs uppercase tracking-widest">Battle Report</span>
            <div className="flex gap-2">
              {battleResult.rounds.map((_, i) => (
                <div
                  key={i}
                  className={`h-1.5 w-8 rounded ${i === currentRoundIndex ? 'bg-amber-500' : i < currentRoundIndex ? 'bg-stone-600' : 'bg-stone-800'}`}
                ></div>
              ))}
            </div>
          </div>

          <div className="animate-fade-in key={currentRoundIndex}">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xl font-bold text-stone-200">Round {currentRound.roundNumber}</h3>
              {isProgramMode && !isFinal && (
                <span className="text-xs text-stone-500">行动队列</span>
              )}
            </div>
            {isProgramMode && !isFinal && (
              <div className="flex flex-wrap gap-2 mb-4">
                {actionQueue.length === 0 ? (
                  <span className="text-xs text-stone-600">队列生成中</span>
                ) : (
                  actionQueue.map((unit, idx) => (
                    <button
                      key={`${unit.side}-${unit.name}-${idx}`}
                      onClick={onAdvanceRound}
                      className={`px-2 py-1 rounded border text-xs ${unit.side === 'A' ? 'border-emerald-700/60 text-emerald-300 bg-emerald-950/30' : 'border-red-700/60 text-red-300 bg-red-950/30'}`}
                    >
                      {unit.name}
                    </button>
                  ))
                )}
              </div>
            )}
            <p className="text-stone-300 leading-relaxed mb-6">{currentRound.description}</p>

            <div className="grid grid-cols-2 gap-8 border-t border-stone-800 pt-4">
              <div>
                <h4 className="text-green-700 font-bold mb-2 flex items-center gap-2"><Shield size={14} /> 我方伤亡</h4>
                {roundCasualtiesA.length === 0 ? (
                  <span className="text-stone-600 text-sm">无伤亡</span>
                ) : (
                  <ul className="space-y-1">
                    {roundCasualtiesA.map((c, i) => (
                      <li key={i} className="text-sm text-red-400">
                        {c.count}x {c.name} <span className="text-stone-600 text-xs">({c.cause})</span>
                      </li>
                    ))}
                  </ul>
                )}
                <div className="mt-4">
                  <h4 className="text-amber-700 font-bold mb-2 flex items-center gap-2"><Shield size={14} /> 我方关键单位受伤</h4>
                  {playerInjuries.length === 0 ? (
                    <span className="text-stone-600 text-sm">无受伤</span>
                  ) : (
                    <ul className="space-y-1">
                      {playerInjuries.map((c, i) => (
                        <li key={i} className="text-sm text-amber-300">
                          {c.name} -{c.hpLoss} HP <span className="text-stone-600 text-xs">({c.cause})</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
              <div>
                <h4 className="text-red-700 font-bold mb-2 flex items-center gap-2"><Swords size={14} /> 敌方伤亡</h4>
                {roundCasualtiesB.length === 0 ? (
                  <span className="text-stone-600 text-sm">无伤亡</span>
                ) : (
                  <ul className="space-y-1">
                    {roundCasualtiesB.map((c, i) => (
                      <li key={i} className="text-sm text-stone-400">
                        {c.count}x {c.name} <span className="text-stone-600 text-xs">({c.cause})</span>
                      </li>
                    ))}
                  </ul>
                )}
                <div className="mt-4">
                  <h4 className="text-amber-700 font-bold mb-2 flex items-center gap-2"><Swords size={14} /> 敌方关键单位受伤</h4>
                  {enemyInjuries.length === 0 ? (
                    <span className="text-stone-600 text-sm">无受伤</span>
                  ) : (
                    <ul className="space-y-1">
                      {enemyInjuries.map((c, i) => (
                        <li key={i} className="text-sm text-amber-300">
                          {c.name} -{c.hpLoss} HP <span className="text-stone-600 text-xs">({c.cause})</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-between items-center">
          {!isProgramMode && (
            <Button
              onClick={() => setCurrentRoundIndex(Math.max(0, currentRoundIndex - 1))}
              disabled={currentRoundIndex === 0}
              variant="secondary"
              size="sm"
            >
              上一回合
            </Button>
          )}

          {!isProgramMode && currentRoundIndex < battleResult.rounds.length - 1 ? (
            <Button
              onClick={() => setCurrentRoundIndex(currentRoundIndex + 1)}
              className="w-48"
            >
              下一回合 <ArrowRight size={16} className="inline ml-2" />
            </Button>
          ) : !isFinal ? (
            <Button variant="secondary" className="w-48" disabled>
              {isProgramMode ? '等待指令' : '战报生成中'}
            </Button>
          ) : (
            <Button onClick={closeBattleResult} variant="gold" className="w-48">
              结束战斗
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};
