import React from 'react';
import { Brain } from 'lucide-react';
import { Troop } from '../types';
import { Button } from '../components/Button';
import { TroopCard } from '../components/TroopCard';

type AsylumViewProps = {
  gachaResult: Troop | null;
  onGacha: () => void;
  onBackToMap: () => void;
};

export const AsylumView = ({ gachaResult, onGacha, onBackToMap }: AsylumViewProps) => {
  return (
    <div className="max-w-4xl mx-auto p-4 pt-20 animate-fade-in">
      <div className="bg-stone-900 border-2 border-purple-900 p-8 rounded shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 p-4 opacity-10">
          <Brain size={200} className="text-purple-500" />
        </div>
        <div className="relative z-10 text-center">
          <h2 className="text-4xl font-serif text-purple-400 mb-4 flex items-center justify-center gap-3">
            <Brain size={40} /> 阳光精神病院
          </h2>
          <p className="text-stone-400 mb-8 max-w-lg mx-auto">
            这里的院长声称可以用“休克疗法”制造出超级战士。虽然大部分实验体都疯了，但偶尔也有...奇迹。
            <br /><br />
            <span className="text-yellow-500 font-bold">费用: 250 第纳尔 / 次</span>
            <br />
            <span className="text-stone-500 text-sm">概率分布: T1(60%) / T2(25%) / T3(10%) / T4(4%) / T5(1%)</span>
          </p>

          <div className="flex justify-center gap-4 mb-8">
            <Button onClick={onGacha} size="lg" className="border-purple-500 text-purple-200 hover:bg-purple-900">
              进行“治疗” (抽卡)
            </Button>
            <Button onClick={onBackToMap} variant="secondary">
              离开
            </Button>
          </div>

          {gachaResult && (
            <div className="mt-8 p-6 bg-purple-900/20 border border-purple-500/50 rounded animate-bounce-in">
              <h3 className="text-xl text-purple-300 mb-4">实验成功！</h3>
              <div className="max-w-sm mx-auto">
                <TroopCard troop={gachaResult} />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
