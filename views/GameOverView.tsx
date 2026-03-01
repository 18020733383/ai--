import React from 'react';
import { Skull } from 'lucide-react';
import { PlayerState } from '../types';
import { Button } from '../components/Button';

type GameOverViewProps = {
  player: PlayerState;
  onRestart: () => void;
};

export const GameOverView = ({ player, onRestart }: GameOverViewProps) => {
  return (
    <div className="flex items-center justify-center min-h-screen bg-black">
      <div className="text-center animate-fade-in p-8">
        <Skull size={80} className="mx-auto text-red-900 mb-6" />
        <h1 className="text-6xl font-serif text-red-600 mb-4 tracking-widest">YOU DIED</h1>
        <p className="text-stone-500 text-xl mb-8">
          {player.story?.gameOverReason === 'HIDEOUT_FALLEN'
            ? (
              <>
                隐匿点被攻破，你失去了最后的退路。回家的路径被异常吞没。
              </>
            )
            : (
              <>
                你的传说到此为止。所有的士兵都已阵亡，你的名字将被遗忘。
              </>
            )}
        </p>

        <div className="bg-stone-900 p-6 rounded border border-stone-800 max-w-md mx-auto mb-8 text-left">
          <div className="flex justify-between border-b border-stone-800 pb-2 mb-2">
            <span className="text-stone-500">存活天数</span>
            <span className="text-stone-300 font-mono">{player.day} 天</span>
          </div>
          <div className="flex justify-between border-b border-stone-800 pb-2 mb-2">
            <span className="text-stone-500">积累声望</span>
            <span className="text-stone-300 font-mono">{player.renown}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-stone-500">最终等级</span>
            <span className="text-stone-300 font-mono">Lv.{player.level}</span>
          </div>
        </div>

        <Button onClick={onRestart} size="lg" variant="gold">
          重新开始旅程
        </Button>
      </div>
    </div>
  );
};
