import React from 'react';
import { Button } from '../../../components/Button';
import { Location, PlayerState, RecruitOffer, Troop } from '../../../types';

type RecruitSectionProps = {
  currentLocation: Location;
  player: PlayerState;
  playerReligionName: string | null;
  locationRelationValue: number;
  isHotpot: boolean;
  isCoffee: boolean;
  isHeavyTrialGrounds: boolean;
  isCity: boolean;
  isRestricted: boolean;
  renderRecruitCard: (offer: RecruitOffer, type: 'VOLUNTEER' | 'MERCENARY') => React.ReactNode;
  onPreachInCity: (locationId: string) => void;
};

export const RecruitSection = ({
  currentLocation,
  player,
  playerReligionName,
  locationRelationValue,
  isHotpot,
  isCoffee,
  isHeavyTrialGrounds,
  isCity,
  isRestricted,
  renderRecruitCard,
  onPreachInCity
}: RecruitSectionProps) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-fade-in">
      <div className="col-span-1 md:col-span-2 bg-stone-900/40 p-4 rounded border border-stone-800 mb-4">
        <p className="text-stone-400 text-sm">
          {isHotpot
            ? "这里可以招募到特殊的食材...我是说战士。"
            : isCoffee
              ? "亡灵愿意以廉价的代价加入。刷新时间受天数影响，招募数量受统御技能影响。"
              : isHeavyTrialGrounds
                ? "这里出售试验级重型单位。库存通常很少，且占用队伍人数上限（按台/辆计）。"
                : "在这里可以招募到基础士兵。刷新时间受天数影响，招募数量受统御技能影响。"}
        </p>
      </div>

      {isCity && playerReligionName && (
        <div className="col-span-1 md:col-span-2 bg-stone-900/40 p-4 rounded border border-stone-800">
          {(() => {
            const faith = Math.max(0, Math.min(100, Math.floor(currentLocation.religion?.faith ?? 0)));
            const rel = Math.max(-100, Math.min(100, Math.floor(locationRelationValue ?? 0)));
            const costBase = 60 + Math.floor(faith * 0.9);
            const relFactor = rel >= 0 ? (1 - Math.min(0.35, rel * 0.005)) : (1 + Math.min(0.6, Math.abs(rel) * 0.008));
            const cost = Math.max(20, Math.min(800, Math.floor(costBase * relFactor)));
            const gainBase = 6 + Math.round(rel / 30);
            const damp = Math.max(0.15, 1 - faith / 115);
            const gain = Math.max(1, Math.min(12, Math.floor(gainBase * damp)));
            const cap = faith >= 80 ? 4 : faith >= 60 ? 3 : faith >= 40 ? 2 : faith >= 20 ? 1 : 0;
            const canAfford = player.gold >= cost;
            const disabled = isRestricted || !canAfford;
            return (
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="text-stone-200 font-bold">信教比例：{faith}%</div>
                  <div className="text-xs text-stone-500">当前信仰：{playerReligionName}</div>
                </div>
                <div className="w-full h-2 bg-black/40 border border-stone-800 rounded overflow-hidden">
                  <div className="h-full bg-amber-600" style={{ width: `${faith}%` }} />
                </div>
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                  <div className="text-xs text-stone-500">
                    20/40/60/80% 解锁教徒招募（当前：T1~T{cap || 0}）
                  </div>
                  <Button
                    variant="secondary"
                    disabled={disabled}
                    onClick={() => onPreachInCity(currentLocation.id)}
                  >
                    传教（{cost}）+{gain}%
                  </Button>
                </div>
                {isRestricted && (
                  <div className="text-xs text-red-300">据点处于封锁/战时状态，无法传教。</div>
                )}
                {!isRestricted && !canAfford && (
                  <div className="text-xs text-red-300">资金不足，无法传教。</div>
                )}
              </div>
            );
          })()}
        </div>
      )}

      {isHeavyTrialGrounds ? (
        currentLocation.mercenaries.length > 0 ? currentLocation.mercenaries.map(offer =>
          renderRecruitCard(offer, 'MERCENARY')
        ) : (
          <div className="col-span-2 text-center py-12 border border-dashed border-stone-800 rounded">
            <p className="text-stone-500 italic">试验场今天没有可用的重型装备。</p>
          </div>
        )
      ) : (
        currentLocation.volunteers.length > 0 ? currentLocation.volunteers.map(offer =>
          renderRecruitCard(offer, 'VOLUNTEER')
        ) : (
          <div className="col-span-2 text-center py-12 border border-dashed border-stone-800 rounded">
            <p className="text-stone-500 italic">这一带暂时没有愿意参军的人。（过几天再来看看）</p>
          </div>
        )
      )}
    </div>
  );
};
