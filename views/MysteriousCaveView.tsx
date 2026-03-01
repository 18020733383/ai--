import React from 'react';
import { MessageCircle, Scroll } from 'lucide-react';
import { Location, PlayerState, RecruitOffer, Troop } from '../types';
import { Button } from '../components/Button';
import { TroopCard } from '../components/TroopCard';
import { ShaperDecision } from '../services/geminiService';

type ShaperProposal = {
  decision: ShaperDecision;
  npcReply: string;
  price: number;
  troopTemplate?: Omit<Troop, 'count' | 'xp'>;
};

type MysteriousCaveViewProps = {
  player: PlayerState;
  currentLocation: Location;
  shaperDialogue: { role: 'PLAYER' | 'NPC'; text: string }[];
  shaperInput: string;
  isShaperLoading: boolean;
  shaperProposal: ShaperProposal | null;
  shaperChatListRef: React.RefObject<HTMLDivElement>;
  getTroopTemplate: (troopId: string) => Omit<Troop, 'count' | 'xp'> | null;
  getMaxTroops: () => number;
  onChangeShaperInput: (value: string) => void;
  onSendToShaper: () => void;
  onCraftShapedTroop: () => void;
  onRecruitOffer: (offer: RecruitOffer, type: 'VOLUNTEER' | 'MERCENARY', countOverride?: number) => void;
  onBackToMap: () => void;
};

export const MysteriousCaveView = ({
  player,
  currentLocation,
  shaperDialogue,
  shaperInput,
  isShaperLoading,
  shaperProposal,
  shaperChatListRef,
  getTroopTemplate,
  getMaxTroops,
  onChangeShaperInput,
  onSendToShaper,
  onCraftShapedTroop,
  onRecruitOffer,
  onBackToMap
}: MysteriousCaveViewProps) => {
  const woundedTroopCount = (player.woundedTroops ?? []).reduce((sum, e) => sum + (e.count ?? 0), 0);
  const currentTroopCount = player.troops.reduce((a, b) => a + b.count, 0) + woundedTroopCount;
  const maxTroops = getMaxTroops();

  const renderRecruitCard = (offer: RecruitOffer) => {
    const tmpl = getTroopTemplate(offer.troopId);
    if (!tmpl) return null;

    const totalCost = offer.cost * offer.count;
    const singleCost = offer.cost;

    const canAffordAll = player.gold >= totalCost;
    const canAffordOne = player.gold >= singleCost;
    const canRecruitOne = currentTroopCount + 1 <= maxTroops;
    const canRecruitAll = currentTroopCount + offer.count <= maxTroops;

    let btnLabelAll = offer.count === 1 ? `招募 (${totalCost})` : `全部招募 (${totalCost})`;
    if (!canAffordAll) btnLabelAll = '资金不足';
    if (!canRecruitAll) btnLabelAll = '队伍将满';

    return (
      <TroopCard
        key={offer.troopId}
        troop={{ ...tmpl, count: offer.count, xp: 0 } as Troop}
        price={offer.cost}
        count={offer.count}
        countLabel="库存"
        actionLabel={btnLabelAll}
        onAction={() => onRecruitOffer(offer, 'VOLUNTEER')}
        disabled={!canAffordAll || !canRecruitAll}
        secondaryActionLabel={`招募1个 (${singleCost})`}
        onSecondaryAction={() => onRecruitOffer(offer, 'VOLUNTEER', 1)}
        secondaryDisabled={!canAffordOne || !canRecruitOne}
      />
    );
  };

  const preview = shaperProposal?.troopTemplate ? ({ ...shaperProposal.troopTemplate, count: 1, xp: 0 } as Troop) : null;
  const canPay = shaperProposal?.decision === 'OK' && !!shaperProposal.troopTemplate && player.gold >= (shaperProposal?.price ?? 0);

  return (
    <div className="max-w-6xl mx-auto p-4 pt-20 animate-fade-in pb-20">
      <div className="bg-stone-900 border border-indigo-900/60 p-6 rounded shadow-lg">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-3xl font-serif text-indigo-300 flex items-center gap-2">
            <Scroll /> 神秘洞窟
          </h2>
          <Button onClick={onBackToMap} variant="secondary">离开</Button>
        </div>

        <p className="text-stone-400 mb-6">
          洞窟深处，禁忌塑形者 · 歪嘴裁缝 正在用骨针和脏线缝合战争。
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-black/30 border border-stone-800 rounded p-4 flex flex-col">
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-stone-200 font-bold flex items-center gap-2"><MessageCircle size={16} /> 对话</h3>
              <div className="text-xs text-stone-500">第纳尔: <span className="text-stone-200 font-mono">{player.gold}</span></div>
            </div>
            <div ref={shaperChatListRef} className="flex-1 overflow-y-auto scrollbar-hide space-y-2 max-h-80 pr-2">
              {shaperDialogue.map((m, idx) => (
                <div key={idx} className={`flex ${m.role === 'PLAYER' ? 'justify-end' : 'justify-start'} log-slide-in`}>
                  <div
                    className={[
                      'max-w-[85%] md:max-w-[70%] px-3 py-2 rounded-2xl border shadow',
                      m.role === 'PLAYER'
                        ? 'bg-stone-800 border-stone-700 text-stone-200 rounded-br-sm'
                        : 'bg-indigo-950/40 border-indigo-900/60 text-indigo-200 rounded-bl-sm'
                    ].join(' ')}
                  >
                    <div className="text-[10px] tracking-wider uppercase opacity-70 mb-1">
                      {m.role === 'PLAYER' ? '你' : '歪嘴裁缝'}
                    </div>
                    <div className="text-sm leading-relaxed whitespace-pre-wrap">{m.text}</div>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-4 flex gap-2">
              <input
                value={shaperInput}
                onChange={(e) => onChangeShaperInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    const composing = (e.nativeEvent as any)?.isComposing;
                    if (composing) return;
                    e.preventDefault();
                    if (!isShaperLoading) onSendToShaper();
                  }
                }}
                className="flex-1 bg-stone-950 border border-stone-700 rounded px-3 py-2 text-stone-200 placeholder:text-stone-600"
                placeholder="描述你想要的兵种（越离谱越挨骂）..."
                disabled={isShaperLoading}
              />
              <Button onClick={onSendToShaper} disabled={isShaperLoading || !shaperInput.trim()}>
                {isShaperLoading ? '思考中...' : '发送'}
              </Button>
            </div>

            {shaperProposal && (
              <div className="mt-4 bg-stone-950/60 border border-stone-800 rounded p-3 text-sm">
                <div className="flex justify-between text-stone-400">
                  <span>判定: <span className="text-stone-200 font-mono">{shaperProposal.decision}</span></span>
                  <span>报价: <span className="text-yellow-500 font-mono">{shaperProposal.price}</span></span>
                </div>
              </div>
            )}
          </div>

          <div className="space-y-4">
            <div className="bg-black/30 border border-stone-800 rounded p-4">
              <h3 className="text-stone-200 font-bold mb-3">塑形预览</h3>
              {preview ? (
                <TroopCard
                  troop={preview}
                  actionLabel={`支付塑形 (${shaperProposal?.price ?? 0})`}
                  onAction={onCraftShapedTroop}
                  disabled={!canPay}
                />
              ) : (
                <div className="text-stone-500 italic py-8 text-center">
                  先和歪嘴裁缝聊聊，让他给你开价。
                </div>
              )}
              {shaperProposal?.decision === 'REFUSE' && (
                <div className="mt-3 text-xs text-red-400 border-l-2 border-red-900 pl-3">
                  他拒绝了你的要求。换个说法，或者别那么离谱。
                </div>
              )}
              {shaperProposal?.decision === 'OVERPRICE' && (
                <div className="mt-3 text-xs text-yellow-400 border-l-2 border-yellow-900 pl-3">
                  他愿意做，但明显在宰你。你可以继续谈，或者认栽。
                </div>
              )}
            </div>

            <div className="bg-black/30 border border-stone-800 rounded p-4">
              <h3 className="text-stone-200 font-bold mb-3">洞窟招募</h3>
              {currentLocation.volunteers.length > 0 ? (
                <div className="grid grid-cols-1 gap-3">
                  {currentLocation.volunteers.map(renderRecruitCard)}
                </div>
              ) : (
                <div className="text-stone-500 italic py-8 text-center">
                  洞窟里暂时没有可招募的造物。
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
