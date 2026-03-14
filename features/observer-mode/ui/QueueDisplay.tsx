/**
 * 观海模式 - 行程队列展示
 * 列表只显示大方向，点击展开显示具体行为
 */
import React from 'react';
import { ChevronDown, ChevronRight, Loader2 } from 'lucide-react';
import type { QueueItem, QueueItemStatus } from '../model/types';

const STATUS_LABELS: Record<QueueItemStatus, string> = {
  pending: '等待中',
  deciding: '决策中',
  acting: '行动中',
  done: '已完成',
  error: '出错'
};

type QueueDisplayProps = {
  queue: QueueItem[];
  activeIndex: number;
  phase: string;
};

export const QueueDisplay = ({ queue, activeIndex, phase }: QueueDisplayProps) => {
  const [expanded, setExpanded] = React.useState<Set<string>>(new Set());

  const toggle = (factionId: string) => {
    setExpanded(prev => {
      const next = new Set(prev);
      if (next.has(factionId)) next.delete(factionId);
      else next.add(factionId);
      return next;
    });
  };

  return (
    <div className="bg-stone-950/60 border border-stone-700 rounded p-4 space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-stone-400 text-sm font-medium">行程队列</span>
        <span className="text-stone-500 text-xs">{phase === 'idle' ? '准备中' : phase === 'running' ? '运行中' : phase}</span>
      </div>
      <div className="space-y-2">
        {queue.map((item, i) => {
          const isActive = i === activeIndex && (item.status === 'deciding' || item.status === 'acting');
          const isDone = item.status === 'done';
          const isError = item.status === 'error';
          const hasDetails = isDone && (item.actions?.length ?? 0) > 0;
          const isExp = expanded.has(item.factionId);
          const displayText = item.action ?? item.message ?? STATUS_LABELS[item.status];
          return (
            <div
              key={item.factionId}
              className={`flex gap-3 px-3 py-2 rounded border transition-colors ${
                isActive ? 'border-amber-600 bg-amber-950/30' : isDone ? 'border-stone-700 bg-stone-900/30' : isError ? 'border-red-800 bg-red-950/20' : 'border-stone-800 bg-black/20'
              }`}
            >
              {isActive && (item.status === 'deciding' || item.status === 'acting') ? (
                <Loader2 size={16} className="text-amber-400 animate-spin flex-shrink-0 mt-0.5" />
              ) : hasDetails ? (
                <button
                  type="button"
                  onClick={() => toggle(item.factionId)}
                  className="flex-shrink-0 mt-0.5 p-0.5 text-stone-500 hover:text-stone-300"
                >
                  {isExp ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                </button>
              ) : (
                <span className="w-4 h-4 flex-shrink-0 rounded-full border border-stone-600 mt-0.5" />
              )}
              <div
                className={`flex-1 min-w-0 flex flex-col gap-0.5 ${hasDetails ? 'cursor-pointer' : ''}`}
                onClick={hasDetails ? () => toggle(item.factionId) : undefined}
              >
                <span className="text-stone-200 font-medium">{item.factionName}</span>
                <span className={`text-xs text-left break-words ${isActive ? 'text-amber-400' : isDone ? 'text-stone-500' : isError ? 'text-red-400' : 'text-stone-500'}`}>
                  {displayText}
                </span>
                {isExp && item.actions?.length && (
                  <div className="mt-1.5 pl-2 border-l border-stone-600 text-xs text-stone-400 space-y-0.5">
                    {item.actions.map((a, k) => (
                      <div key={k}>• {a}</div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
