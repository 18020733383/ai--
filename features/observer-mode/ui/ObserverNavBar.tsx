/**
 * 观海模式 - 顶部导航栏
 * 报纸、关系矩阵、返回
 */
import React from 'react';
import { ArrowLeft, Newspaper, Network } from 'lucide-react';

type ObserverNavBarProps = {
  onBack: () => void;
  onNewspaper: () => void;
  onRelations: () => void;
};

export const ObserverNavBar = ({ onBack, onNewspaper, onRelations }: ObserverNavBarProps) => (
  <header className="bg-stone-900 border-b border-stone-700 p-2 md:p-4 sticky top-0 z-30 shadow-lg flex flex-wrap gap-4 items-center justify-between">
    <span className="font-serif text-amber-400">观海模式</span>
    <div className="flex gap-2 items-center">
      <button
        onClick={onNewspaper}
        className="flex items-center gap-1 text-stone-400 hover:text-white px-2 py-1 rounded transition-colors"
        title="报纸"
      >
        <Newspaper size={16} /> <span className="hidden md:inline">报纸</span>
      </button>
      <button
        onClick={onRelations}
        className="flex items-center gap-1 text-stone-400 hover:text-white px-2 py-1 rounded transition-colors"
        title="关系矩阵"
      >
        <Network size={16} /> <span className="hidden md:inline">关系矩阵</span>
      </button>
      <button
        onClick={onBack}
        className="flex items-center gap-1 text-stone-400 hover:text-white px-2 py-1 rounded transition-colors"
        title="返回主菜单"
      >
        <ArrowLeft size={16} /> <span className="hidden md:inline">返回</span>
      </button>
    </div>
  </header>
);
