/**
 * 观海模式 - 主界面
 * 各势力 AI 自主决策，玩家旁观
 */
import React from 'react';
import { Eye, ArrowLeft } from 'lucide-react';
import { Button } from '../../components/Button';
import { QueueDisplay } from './QueueDisplay';
import { buildInitialObserverState } from '../model/initialState';
import type { ObserverModeState } from '../model/types';

type ObserverModeScreenProps = {
  onBack: () => void;
};

export const ObserverModeScreen = ({ onBack }: ObserverModeScreenProps) => {
  const [state, setState] = React.useState<ObserverModeState>(() => buildInitialObserverState());

  return (
    <div className="min-h-screen bg-black text-stone-200 flex flex-col">
      <div className="absolute inset-0 bg-gradient-to-b from-black via-stone-950 to-black opacity-100 pointer-events-none" />
      <div className="relative flex-1 flex flex-col max-w-4xl mx-auto w-full p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Eye size={28} className="text-amber-400" />
            <div>
              <h1 className="text-2xl font-serif text-stone-200">观海模式</h1>
              <p className="text-sm text-stone-500">各势力自主决策，世界自行运转</p>
            </div>
          </div>
          <Button variant="secondary" onClick={onBack}>
            <ArrowLeft size={16} className="inline mr-2" /> 返回主菜单
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <QueueDisplay
              queue={state.queue}
              activeIndex={state.activeIndex}
              phase={state.phase}
            />
            <div className="mt-4 text-xs text-stone-600">
              开发中：AI 决策队列与战争迷雾将在此展示。当前为占位界面。
            </div>
          </div>
          <div className="space-y-4">
            <div className="bg-stone-950/60 border border-stone-700 rounded p-4">
              <div className="text-stone-400 text-sm font-medium mb-2">当前状态</div>
              <div className="text-stone-200">第 {state.currentDay} 天</div>
              <div className="text-stone-500 text-xs mt-1">模拟尚未启动</div>
            </div>
            <div className="bg-stone-950/60 border border-stone-700 rounded p-4">
              <div className="text-stone-400 text-sm font-medium mb-2">说明</div>
              <ul className="text-xs text-stone-500 space-y-1 list-disc list-inside">
                <li>各势力按队列顺序决策</li>
                <li>决策 → 行动 → 下一位</li>
                <li>每日结束生成报纸</li>
                <li>战争迷雾：仅可见己方与已侦察据点</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
