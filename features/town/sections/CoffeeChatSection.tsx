import React from 'react';
import { Button } from '../../../components/Button';
import { ThinkingBubble } from '../../../components/ThinkingBubble';
import { Hero } from '../../../types';

type CoffeeGiftItem = {
  id: string;
  name: string;
  price: number;
  itemType: 'COFFEE' | 'FOOD';
};

type CoffeeChatSectionProps = {
  giftableHeroes: Hero[];
  coffeeGiftItems: CoffeeGiftItem[];
  coffeeGiftHeroId: string;
  setCoffeeGiftHeroId: (value: string) => void;
  coffeeGiftItemId: string;
  setCoffeeGiftItemId: (value: string) => void;
  coffeeGiftError: string | null;
  clearCoffeeGiftError: () => void;
  onSubmitGift: () => void;
  undeadDialogue: { role: 'PLAYER' | 'UNDEAD'; text: string }[];
  undeadChatListRef: React.RefObject<HTMLDivElement>;
  undeadChatInput: string;
  setUndeadChatInput: (value: string) => void;
  sendToUndead: () => void;
  isUndeadChatLoading: boolean;
};

export const CoffeeChatSection = ({
  giftableHeroes,
  coffeeGiftItems,
  coffeeGiftHeroId,
  setCoffeeGiftHeroId,
  coffeeGiftItemId,
  setCoffeeGiftItemId,
  coffeeGiftError,
  clearCoffeeGiftError,
  onSubmitGift,
  undeadDialogue,
  undeadChatListRef,
  undeadChatInput,
  setUndeadChatInput,
  sendToUndead,
  isUndeadChatLoading
}: CoffeeChatSectionProps) => {
  return (
    <div className="space-y-4 animate-fade-in">
      <div className="bg-stone-900/40 p-4 rounded border border-stone-800 text-sm text-stone-400 flex items-center justify-between gap-3">
        <div>亡灵们会记得你最近的经历，也会盯着你的队伍阵容评头论足。</div>
        <div className="text-xs text-stone-600 whitespace-nowrap">Enter 发送</div>
      </div>

      <div className="bg-stone-900/40 p-4 rounded border border-stone-800 space-y-3">
        <div className="flex items-center justify-between">
          <div className="text-stone-200 font-bold">咖啡与点心</div>
          <div className="text-xs text-stone-500">赠礼会被记录进英雄对话</div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
          <div className="md:col-span-1">
            <div className="text-xs text-stone-500 mb-1">选择英雄</div>
            <select
              value={coffeeGiftHeroId}
              onChange={e => {
                setCoffeeGiftHeroId(e.target.value);
                clearCoffeeGiftError();
              }}
              className="w-full bg-stone-950 border border-stone-700 text-stone-200 px-3 py-2 rounded"
            >
              {giftableHeroes.length === 0 ? (
                <option value="">（暂无可赠送英雄）</option>
              ) : (
                giftableHeroes.map(h => (
                  <option key={`gift_hero_${h.id}`} value={h.id}>{h.name}</option>
                ))
              )}
            </select>
          </div>
          <div className="md:col-span-1">
            <div className="text-xs text-stone-500 mb-1">选择礼物</div>
            <select
              value={coffeeGiftItemId}
              onChange={e => {
                setCoffeeGiftItemId(e.target.value);
                clearCoffeeGiftError();
              }}
              className="w-full bg-stone-950 border border-stone-700 text-stone-200 px-3 py-2 rounded"
            >
              {coffeeGiftItems.map(item => (
                <option key={`gift_item_${item.id}`} value={item.id}>
                  {item.name}（{item.price}）
                </option>
              ))}
            </select>
          </div>
          <div className="md:col-span-1 flex items-end gap-2">
            <Button
              variant="gold"
              disabled={giftableHeroes.length === 0}
              onClick={onSubmitGift}
            >
              购买并赠送
            </Button>
          </div>
        </div>
        {coffeeGiftError && (
          <div className="text-sm text-red-300 bg-red-950/20 border border-red-900/40 rounded px-3 py-2">
            {coffeeGiftError}
          </div>
        )}
      </div>

      <div
        ref={undeadChatListRef}
        className="bg-gradient-to-b from-stone-950/40 to-stone-900/40 p-4 rounded border border-stone-800 max-h-72 overflow-y-auto scrollbar-hide space-y-2"
      >
        {undeadDialogue.map((line, index) => (
          <div key={index} className={`flex ${line.role === 'PLAYER' ? 'justify-end' : 'justify-start'} log-slide-in`}>
            <div
              className={[
                'max-w-[85%] md:max-w-[70%] px-3 py-2 rounded-2xl border shadow',
                line.role === 'PLAYER'
                  ? 'bg-stone-800 border-stone-700 text-stone-200 rounded-br-sm'
                  : 'bg-amber-950/25 border-amber-900/50 text-amber-200 rounded-bl-sm'
              ].join(' ')}
            >
              <div className="text-[10px] tracking-wider uppercase opacity-70 mb-1">
                {line.role === 'PLAYER' ? '你' : '亡灵'}
              </div>
              <div className="text-sm leading-relaxed whitespace-pre-wrap">{line.text}</div>
            </div>
          </div>
        ))}
        {isUndeadChatLoading && <ThinkingBubble label="亡灵正在思考..." />}
      </div>

      <div className="bg-stone-900/40 p-3 rounded border border-stone-800">
        <div className="flex flex-col md:flex-row gap-2">
          <input
            value={undeadChatInput}
            onChange={(e) => setUndeadChatInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key !== 'Enter') return;
              const composing = (e.nativeEvent as any)?.isComposing;
              if (composing) return;
              e.preventDefault();
              sendToUndead();
            }}
            className="flex-1 bg-stone-950 border border-stone-700 text-stone-200 px-3 py-2 rounded placeholder:text-stone-600"
            placeholder="问亡灵点什么..."
            disabled={isUndeadChatLoading}
          />
          <Button
            onClick={sendToUndead}
            variant="secondary"
            disabled={isUndeadChatLoading || !undeadChatInput.trim()}
          >
            {isUndeadChatLoading ? '…' : '发送'}
          </Button>
        </div>
      </div>
    </div>
  );
};
