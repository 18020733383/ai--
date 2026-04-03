import React from 'react';
import { Button } from '../../../components/Button';
import { Location, PlayerState, WorkContract, WorkContractRewardKind } from '../../../types';

type WorkSectionProps = {
  currentLocation: Location;
  player: PlayerState;
  workStateActive: boolean;
  miningStateActive: boolean;
  roachLureStateActive: boolean;
  getTroopName: (troopId: string) => string;
  onStartWorkContract: (contractId: string) => void;
  onRefreshWorkBoard: () => void;
};

function contractRewardKind(c: WorkContract): WorkContractRewardKind {
  return c.rewardKind ?? 'GOLD';
}

export const WorkSection = ({
  currentLocation,
  player,
  workStateActive,
  miningStateActive,
  roachLureStateActive,
  getTroopName,
  onStartWorkContract,
  onRefreshWorkBoard
}: WorkSectionProps) => {
  const board = currentLocation.workBoard;
  const contracts = board?.contracts ?? [];
  const commerce = Math.max(0, player.attributes.commerce ?? 0);
  const commerceBonusRate = Math.min(0.5, commerce * 0.01);
  const canManualRefresh =
    !workStateActive &&
    !miningStateActive &&
    !roachLureStateActive &&
    (board?.lastManualRefreshDay ?? -1) !== player.day;

  const describeContract = (c: WorkContract) => {
    const kind = contractRewardKind(c);
    const payBase = Math.max(0, Math.floor(c.pay * (1 + commerceBonusRate)));
    if (kind === 'GOLD') {
      return { primary: `报酬 ${payBase} 金币`, secondary: null as string | null };
    }
    const stipend = Math.max(0, Math.floor(c.pay * (1 + commerceBonusRate) * 0.4));
    if (kind === 'PLAYER_XP') {
      return {
        primary: `完成奖励：角色经验 +${c.rewardXp ?? 0}`,
        secondary: `津贴 ${stipend} 金币`
      };
    }
    const tid = c.rewardTroopId ?? '';
    const cnt = c.rewardTroopCount ?? 0;
    return {
      primary: `完成奖励：援军 ${getTroopName(tid)} ×${cnt}`,
      secondary: `津贴 ${stipend} 金币`
    };
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="bg-stone-900/40 p-4 rounded border border-stone-800">
        <p className="text-stone-400 text-sm">
          各城委托标题与势力有关；商业等级越高，高星委托出现概率略升。偶有「经验」「援军」类报酬。
          紫色高亮为<span className="text-purple-300">神秘长线</span>：首段小概率出现，须按段完成；整线结束有秘藏重奖。每日可手动刷新一次榜文。
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Button
          variant="secondary"
          size="sm"
          disabled={!canManualRefresh}
          onClick={onRefreshWorkBoard}
        >
          今日刷新委托
        </Button>
        {!canManualRefresh && (board?.lastManualRefreshDay === player.day) ? (
          <span className="text-xs text-stone-500">本日已刷新过。</span>
        ) : null}
      </div>
      <div className="bg-stone-900/60 p-6 rounded border border-stone-800 space-y-4">
        {contracts.length <= 0 ? (
          <div className="text-stone-500 text-sm">目前没有可接的委托。</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {contracts.map(c => {
              const { primary, secondary } = describeContract(c);
              const isMystery = !!c.isMystery;
              const seg =
                isMystery && c.mysteryStage && c.mysteryTotalStages
                  ? `长线第 ${c.mysteryStage}/${c.mysteryTotalStages} 段`
                  : '';
              const payLine =
                contractRewardKind(c) === 'GOLD'
                  ? `${seg ? `${seg} · ` : ''}等级 ${c.tier} · 耗时 ${c.days} 天 · ${primary}${commerce > 0 ? `（商业 ${commerce}：+${Math.round(commerceBonusRate * 100)}%）` : ''}`
                  : `${seg ? `${seg} · ` : ''}等级 ${c.tier} · 耗时 ${c.days} 天 · ${primary}`;
              return (
                <div
                  key={c.id}
                  className={
                    isMystery
                      ? 'bg-purple-950/35 border-2 border-purple-500/70 rounded p-4 shadow-[0_0_20px_rgba(168,85,247,0.15)]'
                      : 'bg-stone-950/40 border border-stone-800 rounded p-4'
                  }
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      {isMystery ? (
                        <div className="text-xs font-semibold text-purple-300 uppercase tracking-wide mb-0.5">神秘委托</div>
                      ) : null}
                      <div className={isMystery ? 'text-purple-100 font-bold' : 'text-stone-200 font-bold'}>{c.title}</div>
                      <div className={`text-xs mt-1 ${isMystery ? 'text-purple-200/80' : 'text-stone-500'}`}>{payLine}</div>
                      {secondary ? (
                        <div className={`text-xs mt-1 ${isMystery ? 'text-purple-200/70' : 'text-stone-500'}`}>{secondary}</div>
                      ) : null}
                      {isMystery ? (
                        <div className="text-xs text-purple-300/90 mt-1">
                          {c.mysteryStage === c.mysteryTotalStages
                            ? '完成本段即可领取秘藏终奖（大额金币、经验、精锐援军）。'
                            : '分段推进；中途放弃不会推进长线进度。'}
                        </div>
                      ) : null}
                    </div>
                    <Button
                      onClick={() => onStartWorkContract(c.id)}
                      variant="gold"
                      disabled={workStateActive || miningStateActive || roachLureStateActive}
                    >
                      接取
                    </Button>
                  </div>
                  <div className="text-xs text-stone-500 mt-2">
                    中途退出：进度过半可领部分津贴（约 1/5）；经验与援军仅在整单完成时发放。
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
