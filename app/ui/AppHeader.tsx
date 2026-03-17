import React from 'react';
import { Activity, Coins, Crosshair, Flag, Map as MapIcon, MessageCircle, Scroll, Settings, User, Users } from 'lucide-react';
import { GameView, PlayerState } from '../../types';

type AppHeaderProps = {
  player: PlayerState;
  view: GameView;
  troopCount: number;
  maxTroops: number;
  onOpenCharacter: () => void;
  onToggleParty: () => void;
  onToggleBills: () => void;
  onOpenMapList: () => void;
  onOpenWorldStats: () => void;
  onOpenRelations: () => void;
  onOpenChangelog: () => void;
  onOpenSettings: () => void;
};

export const AppHeader = ({
  player,
  view,
  troopCount,
  maxTroops,
  onOpenCharacter,
  onToggleParty,
  onToggleBills,
  onOpenMapList,
  onOpenWorldStats,
  onOpenRelations,
  onOpenChangelog,
  onOpenSettings
}: AppHeaderProps) => (
  <header className="bg-stone-900 border-b border-stone-700 p-2 md:p-4 sticky top-0 z-30 shadow-lg flex flex-wrap gap-4 items-center justify-between">
    <div className="flex items-center gap-2">
      <div
        onClick={onOpenCharacter}
        className="flex items-center gap-2 cursor-pointer hover:bg-stone-800 p-1 rounded transition-colors"
      >
        <div className="w-8 h-8 rounded-full bg-stone-700 border border-stone-500 flex items-center justify-center">
          <User size={16} className={player.status === 'INJURED' ? 'text-red-500' : 'text-stone-300'} />
        </div>
        <div className="flex flex-col">
          <span className="text-xs font-bold text-stone-300 leading-none">{player.name} Lv.{player.level}</span>
          <div className="w-16 h-1.5 bg-stone-800 rounded mt-1">
            <div className="h-full bg-red-600" style={{ width: `${(player.currentHp / player.maxHp) * 100}%` }} />
          </div>
          <span className="text-[10px] text-stone-500">{player.currentHp} / {player.maxHp}</span>
        </div>
      </div>
      {player.attributePoints > 0 && <span className="animate-pulse text-yellow-500 text-xs font-bold">● 加点</span>}
    </div>

    <div className="flex gap-4 text-sm items-center">
      <div className="flex items-center gap-2 text-stone-400" title="天数">
        <span className="font-serif">Day {player.day}</span>
      </div>
      <div className="flex items-center gap-1 text-yellow-500" title="第纳尔">
        <Coins size={14} /> <span>{player.gold}</span>
      </div>
      <div className="flex items-center gap-1 text-cyan-300" title="水晶子弹">
        <Crosshair size={14} /> <span>{player.bullets ?? 0}</span>
      </div>
      <button
        onClick={onToggleParty}
        className="flex items-center gap-1 text-stone-200 hover:text-white px-2 rounded transition-colors"
      >
        <Users size={14} /> <span>{troopCount} / {maxTroops}</span>
      </button>
      <button
        onClick={onToggleBills}
        className="flex items-center gap-1 text-stone-400 hover:text-white px-2 rounded transition-colors"
        title="账单"
      >
        <Scroll size={14} /> <span className="hidden md:inline">账单</span>
      </button>
      <button
        onClick={onOpenMapList}
        className="flex items-center gap-1 text-stone-400 hover:text-white px-2 rounded transition-colors"
        title="据点列表"
      >
        <MapIcon size={14} /> <span className="hidden md:inline">据点</span>
      </button>
      <button
        onClick={onOpenWorldStats}
        className="flex items-center gap-1 text-stone-400 hover:text-white px-2 rounded transition-colors"
        title="士兵统计"
      >
        <Activity size={14} /> <span className="hidden md:inline">统计</span>
      </button>
      <button
        onClick={onOpenRelations}
        className="flex items-center gap-1 text-stone-400 hover:text-white px-2 rounded transition-colors"
        title="关系"
      >
        <Flag size={14} /> <span className="hidden md:inline">关系</span>
      </button>
      <button
        onClick={onOpenChangelog}
        className="flex items-center gap-1 text-stone-400 hover:text-white px-2 rounded transition-colors"
        title="更新日志"
      >
        <MessageCircle size={14} /> <span className="hidden md:inline">更新</span>
      </button>
      <button
        onClick={onOpenSettings}
        className="flex items-center gap-1 text-stone-400 hover:text-white px-2 rounded transition-colors"
        title="设置"
      >
        <Settings size={14} /> <span className="hidden md:inline">设置</span>
      </button>
    </div>
  </header>
);
