/**
 * 观海模式 - 主界面
 * 各势力 AI 自主决策，玩家旁观。行程队列显示实际 API 调用顺序。
 */
import React from 'react';
import { Eye, ArrowLeft, Play } from 'lucide-react';
import { Button } from '../../../components/Button';
import { QueueDisplay } from './QueueDisplay';
import { buildInitialObserverState } from '../model/initialState';
import { decideFactionAction } from '../../../services/geminiService';
import type { ObserverModeState, QueueItem } from '../model/types';

type ObserverModeScreenProps = {
  onBack: () => void;
  buildAIConfig: () => { baseUrl: string; apiKey: string; model: string; provider: string } | undefined;
};

export const ObserverModeScreen = ({ onBack, buildAIConfig }: ObserverModeScreenProps) => {
  const [state, setState] = React.useState<ObserverModeState>(() => buildInitialObserverState());
  const [isRunning, setIsRunning] = React.useState(false);

  const runDecisionLoop = React.useCallback(async () => {
    const aiConfig = buildAIConfig();
    if (!aiConfig) {
      setState(s => ({ ...s, log: [...s.log, '未配置 AI，请在设置中配置 API Key'] }));
      return;
    }
    setIsRunning(true);
    setState(s => ({ ...s, phase: 'running', queue: s.queue.map(q => ({ ...q, status: 'pending' as const })), activeIndex: -1 }));

    const queue = state.queue;
    for (let i = 0; i < queue.length; i++) {
      const item = queue[i];
      setState(s => ({
        ...s,
        activeIndex: i,
        queue: s.queue.map((q, j) =>
          j === i ? { ...q, status: 'deciding' as const, message: '决策中...' } : q
        )
      }));

      try {
        const { action } = await decideFactionAction(item.factionId, item.factionName, aiConfig);
        setState(s => ({
          ...s,
          queue: s.queue.map((q, j) =>
            j === i ? { ...q, status: 'done' as const, message: action } : q
          )
        }));
      } catch (e: any) {
        const msg = e?.message || '请求失败';
        setState(s => ({
          ...s,
          queue: s.queue.map((q, j) =>
            j === i ? { ...q, status: 'error' as const, message: msg } : q
          ),
          log: [...s.log, `${item.factionName}: ${msg}`]
        }));
      }
    }

    setState(s => ({ ...s, phase: 'day_end', activeIndex: -1 }));
    setIsRunning(false);
  }, [state.queue, buildAIConfig]);

  const resetQueue = React.useCallback(() => {
    setState(buildInitialObserverState());
  }, []);

  return (
    <div className="min-h-screen bg-black text-stone-200 flex flex-col">
      <div className="absolute inset-0 bg-gradient-to-b from-black via-stone-950 to-black opacity-100 pointer-events-none" />
      <div className="relative flex-1 flex flex-col max-w-4xl mx-auto w-full p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Eye size={28} className="text-amber-400" />
            <div>
              <h1 className="text-2xl font-serif text-stone-200">观海模式</h1>
              <p className="text-sm text-stone-500">各势力自主决策，世界自行运转 · v0.13.0</p>
            </div>
          </div>
          <Button variant="secondary" onClick={onBack} disabled={isRunning}>
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
            <div className="mt-4 flex gap-2">
              <Button
                variant="gold"
                onClick={runDecisionLoop}
                disabled={isRunning}
              >
                <Play size={16} className="inline mr-2" /> {isRunning ? '决策中...' : '开始模拟'}
              </Button>
              <Button variant="secondary" onClick={resetQueue} disabled={isRunning}>
                重置队列
              </Button>
            </div>
          </div>
          <div className="space-y-4">
            <div className="bg-stone-950/60 border border-stone-700 rounded p-4">
              <div className="text-stone-400 text-sm font-medium mb-2">当前状态</div>
              <div className="text-stone-200">第 {state.currentDay} 天</div>
              <div className="text-stone-500 text-xs mt-1">
                {state.phase === 'idle' && '点击开始模拟，按队列顺序调用 AI 决策'}
                {state.phase === 'running' && '正在依次调用各势力决策 API'}
                {state.phase === 'day_end' && '本日决策完成'}
              </div>
            </div>
            <div className="bg-stone-950/60 border border-stone-700 rounded p-4">
              <div className="text-stone-400 text-sm font-medium mb-2">说明</div>
              <ul className="text-xs text-stone-500 space-y-1 list-disc list-inside">
                <li>行程队列 = API 调用顺序</li>
                <li>「XX决策中」= 正在调用该势力决策 API</li>
                <li>完成后显示 AI 返回的决策摘要</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
