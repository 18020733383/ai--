import React from 'react';
import { Hammer } from 'lucide-react';
import { Button } from '../../../components/Button';
import { Enchantment, MineralId, MineralPurity, PlayerState, Troop } from '../../../types';

type ForgeSectionProps = {
  player: PlayerState;
  forgeTroopIndex: number | null;
  setForgeTroopIndex: (value: number | null) => void;
  forgeEnchantmentId: string | null;
  setForgeEnchantmentId: (value: string | null) => void;
  enchantmentRecipes: Array<{ enchantment: Enchantment; costs: { mineralId: MineralId; purityMin: MineralPurity; amount: number }[] }>;
  mineralMeta: Record<MineralId, { name: string; effect: string }>;
  mineralPurityLabels: Record<MineralPurity, string>;
  mineralInventory: PlayerState['minerals'];
  getMineralAvailable: (inventory: PlayerState['minerals'], mineralId: MineralId, purityMin: MineralPurity) => number;
  onForge: () => void;
};

export const ForgeSection = ({
  player,
  forgeTroopIndex,
  setForgeTroopIndex,
  forgeEnchantmentId,
  setForgeEnchantmentId,
  enchantmentRecipes,
  mineralMeta,
  mineralPurityLabels,
  mineralInventory,
  getMineralAvailable,
  onForge
}: ForgeSectionProps) => {
  return (
    <div className="space-y-6 animate-fade-in">
      <div className="bg-stone-900/40 p-4 rounded border border-stone-800">
        <p className="text-stone-400 text-sm">
          铁匠铺可用矿石为部队附魔词条，词条会提高纸面战力并影响战报。
        </p>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="bg-stone-900/60 border border-stone-800 rounded p-4 space-y-3">
          <div className="text-stone-200 font-bold">选择部队</div>
          {player.troops.length === 0 ? (
            <div className="text-stone-500 text-sm">暂无可附魔部队。</div>
          ) : (
            <div className="space-y-2 max-h-80 overflow-y-auto scrollbar-hide">
              {player.troops.map((troop, index) => (
                <button
                  key={`${troop.id}_${index}`}
                  onClick={() => setForgeTroopIndex(index)}
                  className={`w-full text-left border rounded p-2 ${forgeTroopIndex === index ? 'border-amber-500 bg-stone-900' : 'border-stone-800 bg-stone-950/40'}`}
                >
                  <div className="text-stone-200 text-sm font-semibold">{troop.name} × {troop.count}</div>
                  <div className="text-xs text-stone-500">{troop.equipment.join('、')}</div>
                  {troop.enchantments && troop.enchantments.length > 0 && (
                    <div className="text-[11px] text-fuchsia-300">词条：{troop.enchantments.map(e => e.name).join('、')}</div>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="bg-stone-900/60 border border-stone-800 rounded p-4 space-y-3 lg:col-span-2">
          <div className="text-stone-200 font-bold">词条列表</div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {enchantmentRecipes.map(recipe => {
              const costText = recipe.costs.map(cost => {
                const name = mineralMeta[cost.mineralId].name;
                const purityLabel = mineralPurityLabels[cost.purityMin];
                return `${purityLabel}${name} x${cost.amount}`;
              }).join(' + ');
              const available = recipe.costs.every(cost => getMineralAvailable(mineralInventory, cost.mineralId, cost.purityMin) >= cost.amount);
              const selected = forgeEnchantmentId === recipe.enchantment.id;
              return (
                <button
                  key={recipe.enchantment.id}
                  onClick={() => setForgeEnchantmentId(recipe.enchantment.id)}
                  className={`text-left border rounded p-3 space-y-2 ${selected ? 'border-amber-500 bg-stone-900' : 'border-stone-800 bg-stone-950/40'}`}
                >
                  <div className="text-stone-200 font-semibold">{recipe.enchantment.name}</div>
                  <div className="text-xs text-stone-500">{recipe.enchantment.category} · +{Math.round(recipe.enchantment.powerBonus * 100)}% 战力</div>
                  <div className="text-xs text-stone-400">{recipe.enchantment.description}</div>
                  <div className={`text-xs ${available ? 'text-emerald-400' : 'text-red-400'}`}>消耗：{costText}</div>
                </button>
              );
            })}
          </div>
          <div className="flex items-center justify-between pt-2">
            <div className="text-xs text-stone-500">可用矿石会优先消耗高纯度库存。</div>
            <Button onClick={onForge} variant="secondary" className="flex items-center gap-2">
              <Hammer size={16} /> 执行附魔
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
