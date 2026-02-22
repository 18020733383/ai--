
import React from 'react';
import { Troop } from '../types';
import { Shield, Users, Sword, ChevronUp, Hammer, ShieldAlert, Star } from 'lucide-react';

interface TroopCardProps {
  troop: Troop;
  actionLabel?: string;
  onAction?: () => void;
  secondaryActionLabel?: string;
  onSecondaryAction?: () => void;
  price?: number;
  count?: number; // Current count in player party OR available count in recruit offer
  disabled?: boolean;
  secondaryDisabled?: boolean;
  canUpgrade?: boolean;
  onUpgrade?: () => void;
  upgradeDisabled?: boolean;
  upgradeLabel?: string;
  countLabel?: string;
}

export const TroopCard: React.FC<TroopCardProps> = ({ 
  troop, 
  actionLabel, 
  onAction, 
  secondaryActionLabel,
  onSecondaryAction,
  price, 
  count, 
  disabled,
  secondaryDisabled,
  canUpgrade,
  onUpgrade,
  upgradeDisabled,
  upgradeLabel,
  countLabel
}) => {
  // Calculate XP Percentage for the whole stack to determine if ready
  const xpPercentage = Math.min(100, (troop.xp / (troop.maxXp * (troop.count || 1))) * 100);
  const isReadyToUpgrade = canUpgrade && troop.xp >= troop.maxXp; // At least one unit can upgrade
  const isHeavy = troop.category === 'HEAVY';
  const normalizedId = troop.id.startsWith('garrison_') ? troop.id.slice('garrison_'.length) : troop.id;
  const doctrineLabel = troop.doctrine?.trim();
  const isEvangelist = troop.evangelist || normalizedId.startsWith('altar_') || !!doctrineLabel;

  return (
    <div className="bg-stone-900/80 border border-stone-700 p-4 rounded-sm flex flex-col gap-3 group hover:border-stone-500 transition-colors relative overflow-hidden">
       {/* Count Label Badge (Top Right) */}
       {count !== undefined && countLabel && (
          <div className="absolute top-2 right-2 bg-stone-800 text-stone-400 text-[10px] px-2 py-0.5 rounded border border-stone-700">
             {countLabel}: <span className="text-white font-bold">{count}</span>
          </div>
       )}

      <div className="flex items-start justify-between pr-12">
        <div className="flex items-center gap-4">
          <div className={`w-12 h-12 rounded-full flex items-center justify-center border-2 ${troop.tier >= 3 ? 'border-yellow-600 bg-stone-800' : 'border-stone-600 bg-stone-800'}`}>
             {troop.tier >= 4 ? <Shield className="w-6 h-6 text-yellow-500" /> : 
              troop.tier === 3 ? <Sword className="w-6 h-6 text-stone-300" /> :
              <Hammer className="w-5 h-5 text-stone-500" />}
          </div>
          <div>
            <h4 className="font-serif font-bold text-stone-200 text-lg">{troop.name}</h4>
            <div className="flex items-center gap-2 text-xs text-stone-500 mb-1">
               <span className="bg-stone-800 px-1 rounded border border-stone-700">Tier {troop.tier}</span>
               {isHeavy && (
                 <span className="bg-emerald-900/40 text-emerald-200 px-1 rounded border border-emerald-700/60 inline-flex items-center gap-1">
                   <ShieldAlert className="w-3 h-3" /> 重型
                 </span>
               )}
               {isEvangelist && (
                 <span className="bg-amber-900/40 text-amber-200 px-1 rounded border border-amber-700/60 inline-flex items-center gap-1">
                   <Star className="w-3 h-3" /> {doctrineLabel ? `教义·${doctrineLabel}` : '传教'}
                 </span>
               )}
               <span>•</span>
               <span>{troop.equipment.join(', ')}</span>
            </div>
            {troop.enchantments && troop.enchantments.length > 0 && (
              <div className="text-[11px] text-fuchsia-300">
                词条：{troop.enchantments.map(e => e.name).join('、')}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Stats & Description */}
      <p className="text-xs text-stone-400 italic border-l-2 border-stone-700 pl-2 min-h-[40px]">{troop.description}</p>
      <div className="flex flex-wrap gap-2 text-[11px] text-stone-400">
        <span>攻 {troop.attributes.attack}</span>
        <span>防 {troop.attributes.defense}</span>
        <span>敏 {troop.attributes.agility}</span>
        <span>血 {troop.attributes.hp}</span>
        <span>射 {troop.attributes.range}</span>
        <span>士 {troop.attributes.morale}</span>
      </div>

      {/* Action Area */}
      <div className="mt-auto pt-2 border-t border-stone-800 flex flex-col gap-2">
         {price !== undefined && (
            <div className="text-yellow-500 font-bold text-sm flex items-center gap-1 mb-1">
              单价: {price} <span className="text-[10px] text-stone-500">第纳尔</span>
            </div>
          )}

          <div className="flex gap-2">
            {onSecondaryAction && (
                <button 
                onClick={onSecondaryAction}
                disabled={secondaryDisabled}
                className="flex-1 px-2 py-1 bg-stone-800 hover:bg-stone-700 text-stone-300 text-xs uppercase border border-stone-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                >
                {secondaryActionLabel}
                </button>
            )}
            {onAction && (
                <button 
                onClick={onAction}
                disabled={disabled}
                className="flex-1 px-2 py-1 bg-amber-900/50 hover:bg-amber-800 text-amber-200 text-xs uppercase border border-amber-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap disabled:bg-stone-800 disabled:text-stone-500 disabled:border-stone-600"
                >
                {actionLabel}
                </button>
            )}
          </div>

          {/* Player Troop Specifics (XP, Upgrade) */}
          {!price && count !== undefined && !countLabel && (
            <>
               <div className="flex justify-between items-center mb-1 text-xs text-stone-400">
                    <span className="flex items-center gap-1 font-bold text-stone-300">
                        <Users className="w-3 h-3"/> 数量: {count}
                    </span>
                    {troop.upgradeTargetId ? (
                        <span>XP: {Math.floor(troop.xp)} / {troop.maxXp * count}</span>
                    ) : (
                        <span className="text-yellow-600">顶级兵种</span>
                    )}
                </div>
                
                {troop.upgradeTargetId && (
                    <div className="w-full h-1.5 bg-stone-800 rounded-full overflow-hidden mb-2">
                    <div 
                        className="h-full bg-blue-600 transition-all duration-500" 
                        style={{ width: `${xpPercentage}%` }}
                    ></div>
                    </div>
                )}

                {canUpgrade && isReadyToUpgrade && (
                    <button 
                    onClick={onUpgrade}
                    disabled={upgradeDisabled}
                    className="w-full flex items-center justify-center gap-2 bg-green-900/30 hover:bg-green-900/50 border border-green-800 text-green-400 text-xs py-1 mt-1 transition-colors disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-stone-800 disabled:text-stone-500 disabled:border-stone-700"
                    >
                    <ChevronUp className="w-3 h-3" /> 
                    {upgradeLabel ?? `晋升部队 (${troop.upgradeCost} 第纳尔)`}
                    </button>
                )}
            </>
          )}
      </div>
    </div>
  );
};
