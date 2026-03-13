import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from '../../components/Button';
import { Troop } from '../../types';

type BattleSimulationOverlayProps = {
  battleError: string | null;
  leftTroops: Troop[];
  rightTroops: Troop[];
  isBattleStreaming: boolean;
  onCancelError: () => void;
  onOpenSettings: () => void;
  onRetry: () => void;
};

export const BattleSimulationOverlay = ({
  battleError,
  leftTroops,
  rightTroops,
  isBattleStreaming,
  onCancelError,
  onOpenSettings,
  onRetry
}: BattleSimulationOverlayProps) => {
  const leftMax = Math.max(1, ...leftTroops.map(t => t.count ?? 0));
  const rightMax = Math.max(1, ...rightTroops.map(t => t.count ?? 0));

  return (
    <div className="fixed inset-0 bg-black/90 z-50 flex flex-col items-center justify-center text-center p-4">
      {battleError ? (
        <div className="animate-fade-in flex flex-col items-center">
          <AlertTriangle size={64} className="text-red-500 mb-6" />
          <h2 className="text-3xl font-serif font-bold text-red-500 mb-4">战局推演失败</h2>
          <p className="text-stone-400 max-w-md mb-8">{battleError}</p>
          <div className="flex gap-4">
            <Button onClick={onCancelError} variant="secondary">
              取消
            </Button>
            <Button onClick={onOpenSettings} variant="secondary">
              设置
            </Button>
            <Button onClick={onRetry} size="lg" className="flex items-center gap-2">
              <RefreshCw size={20} /> 重试
            </Button>
          </div>
        </div>
      ) : (
        <>
          <div className="w-full max-w-5xl bg-stone-950/40 border border-stone-800 rounded p-4 mb-6 relative overflow-hidden">
            <style>{`
              @keyframes battleArrow {
                0% { transform: translateX(0); opacity: 0; }
                15% { opacity: 1; }
                100% { transform: translateX(220px); opacity: 0; }
              }
              @keyframes battleArrowReverse {
                0% { transform: translateX(0); opacity: 0; }
                15% { opacity: 1; }
                100% { transform: translateX(-220px); opacity: 0; }
              }
              @keyframes battleSpark {
                0% { transform: scale(0.6); opacity: 0; }
                30% { opacity: 1; }
                100% { transform: scale(1.2); opacity: 0; }
              }
              @keyframes battleCharge {
                0%, 100% { transform: translateX(0); }
                50% { transform: translateX(8px); }
              }
            `}</style>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
              <div className="space-y-2 max-h-[320px] overflow-auto pr-2">
                <div className="text-xs text-red-300">红方</div>
                {leftTroops.length === 0 ? (
                  <div className="text-xs text-stone-500">无可见部队</div>
                ) : (
                  leftTroops.map(t => (
                    <div key={`left_${t.id}`} className="text-left">
                      <div className="text-xs text-stone-200 truncate">{t.name ?? t.id} · {t.count}</div>
                      <div className="h-1 bg-red-900/40 rounded">
                        <div className="h-full bg-red-400/80 rounded animate-pulse" style={{ width: `${Math.max(6, Math.round((t.count ?? 0) / leftMax * 100))}%` }} />
                      </div>
                    </div>
                  ))
                )}
              </div>
              <div className="relative flex flex-col items-center justify-center gap-2">
                <div className="text-4xl animate-bounce">⚔</div>
                <div className="text-xs text-stone-500">交战演算中</div>
                <div className="relative w-full h-28 mt-2">
                  <div className="absolute left-2 top-2 text-xs text-red-300 animate-[battleCharge_1.2s_ease-in-out_infinite]">冲锋</div>
                  <div className="absolute right-2 bottom-2 text-xs text-blue-300 animate-[battleCharge_1.2s_ease-in-out_infinite]">迎战</div>
                  {[0, 1, 2, 3, 4, 5].map(i => (
                    <span
                      key={`arrow_l_${i}`}
                      className="absolute left-2 text-red-300 text-sm"
                      style={{ top: `${12 + i * 14}px`, animation: `battleArrow ${0.8 + i * 0.1}s linear ${i * 0.15}s infinite` }}
                    >
                      ➶
                    </span>
                  ))}
                  {[0, 1, 2, 3, 4, 5].map(i => (
                    <span
                      key={`arrow_r_${i}`}
                      className="absolute right-2 text-blue-300 text-sm"
                      style={{ top: `${18 + i * 14}px`, animation: `battleArrowReverse ${0.8 + i * 0.1}s linear ${i * 0.12}s infinite` }}
                    >
                      ➷
                    </span>
                  ))}
                  {[0, 1, 2, 3].map(i => (
                    <span
                      key={`spark_${i}`}
                      className="absolute left-1/2 text-amber-300 text-lg"
                      style={{ top: `${20 + i * 18}px`, animation: `battleSpark ${0.6 + i * 0.2}s ease-in-out ${i * 0.1}s infinite` }}
                    >
                      ✦
                    </span>
                  ))}
                </div>
              </div>
              <div className="space-y-2 max-h-[320px] overflow-auto pl-2">
                <div className="text-xs text-blue-300">蓝方</div>
                {rightTroops.length === 0 ? (
                  <div className="text-xs text-stone-500">无可见部队</div>
                ) : (
                  rightTroops.map(t => (
                    <div key={`right_${t.id}`} className="text-right">
                      <div className="text-xs text-stone-200 truncate">{t.name ?? t.id} · {t.count}</div>
                      <div className="h-1 bg-blue-900/40 rounded">
                        <div className="h-full bg-blue-400/80 rounded animate-pulse ml-auto" style={{ width: `${Math.max(6, Math.round((t.count ?? 0) / rightMax * 100))}%` }} />
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
          <h2 className="text-3xl font-serif text-amber-500 mb-2">正在推演战局...</h2>
          <div className="text-xs text-stone-500 mb-3">传输方式：{isBattleStreaming ? '流式' : '一次性'}</div>
          <p className="text-stone-400 italic max-w-md animate-pulse">
            "战争的胜负往往在第一支箭射出之前就已经注定了。"
          </p>
        </>
      )}
    </div>
  );
};
