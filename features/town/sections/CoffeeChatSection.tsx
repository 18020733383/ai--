import React, { useMemo } from 'react';
import { Button } from '../../../components/Button';
import { ThinkingBubble } from '../../../components/ThinkingBubble';
import { Hero } from '../../../types';

export type CoffeeGiftItem = {
  id: string;
  name: string;
  price: number;
  itemType: 'COFFEE' | 'FOOD';
  category: string;
  blurb?: string;
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
  undeadChatListRef: React.RefObject<HTMLDivElement | null>;
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
  const menuSections = useMemo(() => {
    const order: string[] = [];
    const byCat = new Map<string, CoffeeGiftItem[]>();
    for (const it of coffeeGiftItems) {
      if (!byCat.has(it.category)) {
        byCat.set(it.category, []);
        order.push(it.category);
      }
      byCat.get(it.category)!.push(it);
    }
    return order.map(title => ({ title, items: byCat.get(title)! }));
  }, [coffeeGiftItems]);

  const selectedItem = coffeeGiftItems.find(i => i.id === coffeeGiftItemId);

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="bg-stone-900/40 p-4 rounded border border-stone-800 text-sm text-stone-400 flex items-center justify-between gap-3">
        <div>亡灵们会记得你最近的经历，也会盯着你的队伍阵容评头论足。</div>
        <div className="text-xs text-stone-600 whitespace-nowrap">Enter 发送</div>
      </div>

      <div
        className="rounded-lg border-2 border-amber-950/70 bg-gradient-to-b from-[#1a1614] to-stone-950/95 p-4 md:p-5 shadow-[inset_0_1px_0_rgba(251,191,36,0.06)] space-y-4"
        style={{ fontFamily: 'ui-serif, "Noto Serif SC", "Source Han Serif SC", serif' }}
      >
        <div className="text-center border-b border-amber-900/40 pb-3">
          <div className="text-[10px] tracking-[0.35em] text-amber-700/90 uppercase">亡 灵 咖 啡 馆</div>
          <div className="text-lg md:text-xl font-bold text-amber-100 mt-1 tracking-wider">今晨膳牌</div>
          <div className="text-[11px] text-stone-500 mt-1">点选下列品目，择英雄以赠之</div>
        </div>

        <div>
          <div className="text-xs text-amber-600/90 mb-2 font-semibold tracking-wide">惠顾之主</div>
          <div className="flex flex-wrap gap-2">
            {giftableHeroes.length === 0 ? (
              <span className="text-sm text-stone-500">（暂无可赠送英雄）</span>
            ) : (
              giftableHeroes.map(h => {
                const on = h.id === coffeeGiftHeroId;
                return (
                  <button
                    key={`gift_hero_${h.id}`}
                    type="button"
                    onClick={() => {
                      setCoffeeGiftHeroId(h.id);
                      clearCoffeeGiftError();
                    }}
                    className={[
                      'px-3 py-1.5 rounded-md text-sm border transition-colors',
                      on
                        ? 'bg-amber-950/50 border-amber-500 text-amber-100 shadow-sm'
                        : 'bg-stone-900/80 border-stone-700 text-stone-300 hover:border-amber-900/50 hover:text-stone-100'
                    ].join(' ')}
                  >
                    {h.name}
                  </button>
                );
              })
            )}
          </div>
        </div>

        <div className="space-y-4 max-h-[min(52vh,520px)] overflow-y-auto pr-1 scrollbar-hide">
          {menuSections.map(section => (
            <div key={section.title}>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-amber-500/80 text-sm font-bold">{section.title}</span>
                <span className="flex-1 h-px bg-amber-900/25" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {section.items.map(item => {
                  const sel = item.id === coffeeGiftItemId;
                  return (
                    <button
                      key={`menu_${item.id}`}
                      type="button"
                      onClick={() => {
                        setCoffeeGiftItemId(item.id);
                        clearCoffeeGiftError();
                      }}
                      className={[
                        'text-left rounded-md border px-3 py-2.5 transition-all',
                        sel
                          ? 'border-amber-500/80 bg-amber-950/35 ring-1 ring-amber-600/40'
                          : 'border-stone-800 bg-stone-900/40 hover:border-amber-900/40 hover:bg-stone-900/70'
                      ].join(' ')}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="text-stone-100 text-sm font-semibold leading-snug">{item.name}</div>
                          {item.blurb ? (
                            <div className="text-[11px] text-stone-500 mt-0.5 leading-relaxed">{item.blurb}</div>
                          ) : null}
                        </div>
                        <div className="shrink-0 text-amber-200/90 text-sm font-mono tabular-nums">{item.price}</div>
                      </div>
                      <div className="text-[10px] text-stone-600 mt-1.5">
                        {item.itemType === 'COFFEE' ? '饮' : '食'} · 第纳尔
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {selectedItem ? (
          <div className="text-xs text-stone-500 border-t border-amber-900/25 pt-3 flex flex-wrap items-center justify-between gap-2">
            <span>
              已择：<span className="text-amber-200/90">{selectedItem.name}</span>
              <span className="text-stone-600 mx-1">·</span>
              <span className="font-mono text-stone-400">{selectedItem.price}</span> 第纳尔
            </span>
            <Button
              variant="gold"
              disabled={giftableHeroes.length === 0}
              onClick={onSubmitGift}
            >
              购买并赠送
            </Button>
          </div>
        ) : null}

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
