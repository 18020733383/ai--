/**
 * 观海模式 - 地图上的浮动队列面板
 * 叠加在正常大地图上，显示各势力 AI 决策队列
 */
import React from 'react';
import { Eye, ArrowLeft, Play } from 'lucide-react';
import { Button } from '../../../components/Button';
import { QueueDisplay } from './QueueDisplay';
import { buildInitialObserverState } from '../model/initialState';
import { decideFactionAction, runDiplomacyMeeting } from '../../../services/geminiService';
import { parseObserverTargets, parseActionsInOrder } from '../utils/parseTargets';
import type { ObserverModeState } from '../model/types';
import type { Location } from '../../../types';
import type { WorldDiplomacyState } from '../../../types';

const ACTION_DURATION_MS = 1800;

type ObserverOverlayProps = {
  onBack: () => void;
  buildAIConfig: () => { baseUrl: string; apiKey: string; model: string; provider: string } | undefined;
  locations?: Location[];
  worldDiplomacy?: WorldDiplomacyState;
  onTargetsChange?: (queue: Array<{ actions?: string[] }>) => void;
  onFocusLocation?: (location: Location) => void;
  onApplyAction?: (locationId: string, actionType: string, factionId?: string) => void;
  onApplyDiplomacy?: (factionAId: string, factionBId: string, decision: 'REINFORCE' | 'WITHDRAW' | 'IMPROVE_RELATIONS', dialogue: string[], relationDelta?: number) => void;
  onCurrentActionChange?: (action: { locationId: string; locationName: string; actionType: string; factionName: string; dialogue?: string[] } | null) => void;
  onAdvanceDay?: () => void;
};

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

export const ObserverOverlay = ({ onBack, buildAIConfig, locations = [], worldDiplomacy, onTargetsChange, onFocusLocation, onApplyAction, onApplyDiplomacy, onCurrentActionChange, onAdvanceDay }: ObserverOverlayProps) => {
  const [state, setState] = React.useState<ObserverModeState>(() => buildInitialObserverState());
  const [isRunning, setIsRunning] = React.useState(false);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);
  const [autoContinue, setAutoContinue] = React.useState(false);

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
        const locationNames = locations.filter(l => l.type === 'CITY' || l.type === 'CASTLE' || l.type === 'VILLAGE').map(l => l.name);
        const { action, actions } = await decideFactionAction(item.factionId, item.factionName, aiConfig, locationNames);
        setState(s => ({
          ...s,
          queue: s.queue.map((q, j) =>
            j === i ? { ...q, status: 'done' as const, action, actions } : q
          )
        }));

        const actionList = parseActionsInOrder(actions ?? [], locations, item.factionId);
        console.log('[观海] 解析行动:', { factionName: item.factionName, actions, actionList });
        for (const parsed of actionList) {
          const { locationId, locationName, actionType } = parsed;
          if (actionType === 'diplomacy' && 'targetFactionId' in parsed) {
            const { targetFactionId, targetFactionName } = parsed;
            if (!onApplyDiplomacy || !onCurrentActionChange) continue;
            const loc = locations.find(l => l.id === locationId) ?? locations.filter(l => l.factionId === item.factionId)[0];
            if (loc) onFocusLocation?.(loc);
            onCurrentActionChange({ locationId, locationName, actionType: 'diplomacy', factionName: item.factionName });
            await sleep(ACTION_DURATION_MS);
            try {
              const { getWorldFactionRelation } = await import('../../../game/systems/diplomacy');
              const relationAB = worldDiplomacy ? getWorldFactionRelation(worldDiplomacy, item.factionId, targetFactionId) : 0;
              const { dialogue, decision, relationDelta } = await runDiplomacyMeeting(item.factionId, targetFactionId, relationAB, aiConfig);
              onCurrentActionChange({ locationId, locationName, actionType: 'diplomacy', factionName: item.factionName, dialogue });
              await sleep(1200);
              onApplyDiplomacy(item.factionId, targetFactionId, decision, dialogue, relationDelta);
            } catch (e: any) {
              console.warn('[观海] 外交会议失败:', e);
              onApplyDiplomacy(item.factionId, targetFactionId, 'IMPROVE_RELATIONS', ['会谈未能达成共识'], 10);
            }
            onCurrentActionChange(null);
            await sleep(400);
            continue;
          }
          const loc = locations.find(l => l.id === locationId);
          if (!loc) continue;
          if (!onFocusLocation || !onApplyAction || !onCurrentActionChange) {
            console.warn('[观海] 缺少回调，跳过动画');
            continue;
          }
          onFocusLocation(loc);
          onCurrentActionChange({ locationId, locationName, actionType, factionName: item.factionName });
          await sleep(ACTION_DURATION_MS);
          onApplyAction(locationId, actionType, item.factionId);
          onCurrentActionChange(null);
          await sleep(400);
        }
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

    onAdvanceDay?.();
    setState(s => ({ ...s, phase: 'day_end', activeIndex: -1, currentDay: s.currentDay + 1 }));
    setIsRunning(false);
    if (autoContinue) {
      await sleep(2000);
      runDecisionLoop();
    }
  }, [state.queue, buildAIConfig, locations, onFocusLocation, onApplyAction, onApplyDiplomacy, onCurrentActionChange, onAdvanceDay, autoContinue]);

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
        <label className="flex items-center gap-2 text-xs text-stone-400 cursor-pointer">
          <input
            type="checkbox"
            checked={autoContinue}
            onChange={e => setAutoContinue(e.target.checked)}
            disabled={isRunning}
            className="rounded accent-amber-500"
          />
          <span>自动继续下一回合</span>
        </label>
        <div className="text-xs text-stone-500">
          第 {state.currentDay} 天 · {state.phase === 'idle' ? '准备中' : state.phase === 'running' ? '运行中' : '本日完成'}
        </div>
      </div>
    </div>
  );
};
