import React from 'react';
import { MapPin } from 'lucide-react';
import { Button } from '../../../components/Button';

type HabitatSectionProps = {
  playerDay: number;
  habitatStayDays: number;
  setHabitatStayDays: (value: number) => void;
  habitatStayStateActive: boolean;
  onStartHabitat: () => void;
};

export const HabitatSection = ({
  playerDay,
  habitatStayDays,
  setHabitatStayDays,
  habitatStayStateActive,
  onStartHabitat
}: HabitatSectionProps) => {
  return (
    <div className="space-y-6 animate-fade-in">
      <div className="bg-stone-900/40 p-4 rounded border border-stone-800">
        <div className="flex items-center justify-between gap-3">
          <div className="text-stone-200 font-bold">栖息地</div>
          <div className="text-xs text-stone-600">时间会加速流逝，世界照常运转</div>
        </div>
        <div className="text-sm text-stone-400 mt-2 leading-relaxed">
          你可以在此停留一段时间，用更短的间隔推进每日结算（商队、袭掠、攻城、招募刷新等都会照常发生）。
        </div>
      </div>

      <div className="bg-stone-900/40 p-4 rounded border border-stone-800 space-y-3">
        <div className="flex items-center justify-between">
          <div className="text-stone-200 font-bold">快进天数</div>
          <div className="text-xs text-stone-500">当前第 {playerDay} 天</div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
          <div className="md:col-span-2">
            <div className="text-xs text-stone-500 mb-1">天数（1-1000）</div>
            <input
              type="number"
              min={1}
              max={1000}
              value={habitatStayDays}
              onChange={e => setHabitatStayDays(Number(e.target.value))}
              className="w-full bg-stone-950 border border-stone-700 text-stone-200 px-3 py-2 rounded"
            />
          </div>
          <Button
            variant="secondary"
            disabled={habitatStayStateActive}
            onClick={onStartHabitat}
          >
            <MapPin size={16} className="inline mr-2" /> 开始栖息
          </Button>
        </div>
      </div>
    </div>
  );
};
