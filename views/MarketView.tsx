import React from 'react';
import { ShoppingBag } from 'lucide-react';
import { Button } from '../components/Button';
import { PlayerState, ParrotVariant } from '../types';

type MarketViewProps = {
  player: PlayerState;
  parrotVariants: ParrotVariant[];
  onBuyParrot: (parrot: ParrotVariant) => void;
  onBackToMap: () => void;
};

export const MarketView = ({ player, parrotVariants, onBuyParrot, onBackToMap }: MarketViewProps) => {
  return (
    <div className="max-w-4xl mx-auto p-4 pt-20 animate-fade-in">
      <div className="bg-stone-900 border border-stone-700 p-6 rounded shadow-lg">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-3xl font-serif text-green-500 flex items-center gap-2">
            <ShoppingBag /> 奇珍花鸟市场
          </h2>
          <Button onClick={onBackToMap} variant="secondary">返回</Button>
        </div>
        <p className="text-stone-400 mb-6">
          这里出售各种稀有的鹦鹉。它们不仅是宠物，更是你精神状态的...投影。
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {parrotVariants.map((parrot, idx) => {
            const owned = player.parrots.some(p => p.type === parrot.type);
            const disabled = owned || player.gold < parrot.price;
            return (
              <div key={idx} className="bg-stone-800 p-4 rounded border border-stone-700 flex flex-col justify-between">
                <div>
                  <div className="flex justify-between items-start">
                    <h4 className={`font-bold text-lg ${parrot.color}`}>{parrot.name}</h4>
                    <span className="text-yellow-500 font-mono text-sm">{parrot.price} G</span>
                  </div>
                  <p className="text-xs text-stone-500 uppercase mt-1">性格: {parrot.personality}</p>
                  <p className="text-sm text-stone-400 mt-2 italic">"{parrot.description}"</p>
                </div>
                <Button
                  onClick={() => onBuyParrot(parrot)}
                  className="mt-4 w-full"
                  disabled={disabled}
                >
                  {owned ? '已拥有' : '购买'}
                </Button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
