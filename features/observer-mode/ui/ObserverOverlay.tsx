/**
 * 观海模式 - 地图上的浮动队列面板
 * 叠加在正常大地图上，显示各势力 AI 决策队列
 */
import React from 'react';
import { Eye, ArrowLeft, Play } from 'lucide-react';
import { Button } from '../../../components/Button';
import { QueueDisplay } from './QueueDisplay';
import { buildInitialObserverState } from '../model/initialState';
import { decideFactionAction } from '../../../services/geminiService';
import { parseObserverTargets } from '../utils/parseTargets';
import type { ObserverModeState } from '../model/types';
import type { Location } from '../../../types';

type ObserverOverlayProps = {
  onBack: () => void;
  buildAIConfig: () => { baseUrl: string; apiKey: string; model: string; provider: string } | undefined;
  locations?: Location[];
  onTargetsChange?: (queue: Array<{ actions?: string[] }>) => void;
};

export const ObserverOverlay = ({ onBack, buildAIConfig, locations = [], onTargetsChange }: ObserverOverlayProps) => {
  const [state, setState] = React.useState<ObserverModeState>(() => buildInitialObserverState());
  const [isRunning, setIsRunning] = React.useState(false);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);

  React.useEffect(() => {
    onTargetsChange?.(state.queue);
  }, [state.queue, onTargetsChange]);

  const runDecisionLoop = React.useCallback(async () => {
    setErrorMsg(null);
    const aiConfig = buildAIConfig();
    if (!aiConfig) {
      setErrorMsg('未配置 AI，请先打开设置配置 API Key');
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
        const { action, actions } = await decideFactionAction(item.factionId, item.factionName, aiConfig);
        setState(s => ({
          ...s,
          queue: s.queue.map((q, j) =>
            j === i ? { ...q, status: 'done' as const, action, actions } : q
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
    <div className="absolute top-4 right-4 z-40 w-80 max-h-[70vh] flex flex-col bg-stone-950/95 border border-stone-700 rounded-lg shadow-xl overflow-hidden">
      <div className="flex-shrink-0 p-3 border-b border-stone-700 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Eye size={20} className="text-amber-400" />
          <span className="font-serif text-stone-200">观海模式</span>
        </div>
        <Button variant="secondary" size="sm" onClick={onBack} disabled={isRunning}>
          <ArrowLeft size={14} className="inline mr-1" /> 返回
        </Button>
      </div>
      <div className="flex-1 min-h-0 overflow-y-auto p-3 space-y-3">
        {errorMsg && (
          <div className="p-2 bg-amber-950/50 border border-amber-700 rounded text-amber-200 text-xs">
            {errorMsg}
          </div>
        )}
        <QueueDisplay queue={state.queue} activeIndex={state.activeIndex} phase={state.phase} />
        <div className="flex gap-2">
          <Button variant="gold" size="sm" onClick={runDecisionLoop} disabled={isRunning} className="flex-1">
            <Play size={14} className="inline mr-1" /> {isRunning ? '决策中...' : '开始模拟'}
          </Button>
          <Button variant="secondary" size="sm" onClick={resetQueue} disabled={isRunning}>
            重置
          </Button>
        </div>
        <div className="text-xs text-stone-500">
          第 {state.currentDay} 天 · {state.phase === 'idle' ? '准备中' : state.phase === 'running' ? '运行中' : '本日完成'}
        </div>
      </div>
    </div>
  );
};
