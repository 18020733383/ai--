import React from 'react';
import { Button } from '../../../components/Button';
import { Location, PlayerState } from '../../../types';

type WorkSectionProps = {
  currentLocation: Location;
  player: PlayerState;
  workStateActive: boolean;
  miningStateActive: boolean;
  roachLureStateActive: boolean;
  onStartWorkContract: (contractId: string) => void;
};

export const WorkSection = ({
  currentLocation,
  player,
  workStateActive,
  miningStateActive,
  roachLureStateActive,
  onStartWorkContract
}: WorkSectionProps) => {
  return (
    <div className="space-y-6 animate-fade-in">
      <div className="bg-stone-900/40 p-4 rounded border border-stone-800">
        <p className="text-stone-400 text-sm">城里会定期发布不同等级的委托。接下委托后时间会自动快进，你可以中途退出。</p>
      </div>
      <div className="bg-stone-900/60 p-6 rounded border border-stone-800 space-y-4">
        {((currentLocation.workBoard?.contracts ?? []).length <= 0) ? (
          <div className="text-stone-500 text-sm">目前没有可接的委托。</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {(currentLocation.workBoard?.contracts ?? []).map(c => (
              <div key={c.id} className="bg-stone-950/40 border border-stone-800 rounded p-4">
                {(() => {
                  const commerce = Math.max(0, player.attributes.commerce ?? 0);
                  const commerceBonusRate = Math.min(0.5, commerce * 0.01);
                  const payWithBonus = Math.max(0, Math.floor(c.pay * (1 + commerceBonusRate)));
                  return (
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="text-stone-200 font-bold">{c.title}</div>
                        <div className="text-xs text-stone-500 mt-1">
                          等级 {c.tier} · 耗时 {c.days} 天 · 报酬 {payWithBonus}
                          {commerce > 0 ? `（商业 ${commerce}：+${Math.round(commerceBonusRate * 100)}%）` : ''}
                        </div>
                      </div>
                      <Button
                        onClick={() => onStartWorkContract(c.id)}
                        variant="gold"
                        disabled={workStateActive || miningStateActive || roachLureStateActive}
                      >
                        接取
                      </Button>
                    </div>
                  );
                })()}
                <div className="text-xs text-stone-500 mt-2">
                  中途退出：进度过半才有报酬，且只有 1/5。
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
