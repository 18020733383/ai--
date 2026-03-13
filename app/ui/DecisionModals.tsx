import React from 'react';
import { Button } from '../../components/Button';
import { Hero } from '../../types';

type ModalFrameProps = {
  title: string;
  day: number;
  locationName: string;
  description: string;
  onSkip: () => void;
  children: React.ReactNode;
};

const ModalFrame = ({ title, day, locationName, description, onSkip, children }: ModalFrameProps) => (
  <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
    <div className="w-full max-w-2xl bg-stone-900 border border-stone-700 rounded shadow-2xl p-6 space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-lg font-bold text-stone-200">{title}</div>
          <div className="text-xs text-stone-500 mt-1">第 {day} 天 · {locationName}</div>
        </div>
        <button onClick={onSkip} className="text-stone-400 hover:text-white">
          跳过处理
        </button>
      </div>
      <pre className="whitespace-pre-wrap text-sm text-stone-300 bg-black/30 border border-stone-800 rounded p-4">{description}</pre>
      {children}
    </div>
  </div>
);

type CityReligionDecisionModalProps = {
  title: string;
  day: number;
  locationName: string;
  description: string;
  suppressCost: number;
  canSuppress: boolean;
  heroesHere: Hero[];
  selectedHeroId: string;
  onChangeHeroId: (heroId: string) => void;
  onSkip: () => void;
  onIgnore: () => void;
  onSuppress: () => void;
  onPreach: () => void;
};

export const CityReligionDecisionModal = ({
  title,
  day,
  locationName,
  description,
  suppressCost,
  canSuppress,
  heroesHere,
  selectedHeroId,
  onChangeHeroId,
  onSkip,
  onIgnore,
  onSuppress,
  onPreach
}: CityReligionDecisionModalProps) => {
  const selectedHero = heroesHere.find(h => h.id === selectedHeroId) ?? heroesHere[0] ?? null;

  return (
    <ModalFrame title={title} day={day} locationName={locationName} description={description} onSkip={onSkip}>
      <div className="flex flex-col md:flex-row gap-2 justify-end">
        <Button variant="secondary" onClick={onIgnore}>
          放任不管
        </Button>
        <Button variant="secondary" disabled={!canSuppress} onClick={onSuppress}>
          花钱镇压（{suppressCost}）
        </Button>
        <div className="flex items-center gap-2">
          <select
            value={selectedHero?.id ?? ''}
            onChange={(e) => onChangeHeroId(e.target.value)}
            className="bg-stone-950 border border-stone-700 rounded px-2 py-2 text-sm text-stone-200"
            disabled={heroesHere.length === 0}
          >
            {heroesHere.map(h => (
              <option key={h.id} value={h.id}>{h.name} Lv.{h.level}</option>
            ))}
          </select>
          <Button variant="gold" disabled={!selectedHero} onClick={onPreach}>
            派英雄讲道
          </Button>
        </div>
      </div>
    </ModalFrame>
  );
};

type HideoutGovDecisionModalProps = {
  title: string;
  day: number;
  locationName: string;
  description: string;
  onlyTwoChoices: boolean;
  costRelief: number;
  costMediate: number;
  canRelief: boolean;
  canMediate: boolean;
  onSkip: () => void;
  onAppeaseEnvoys: () => void;
  onCrackdown: () => void;
  onRelief: () => void;
  onBoostProduction: () => void;
  onMediate: () => void;
};

export const HideoutGovDecisionModal = ({
  title,
  day,
  locationName,
  description,
  onlyTwoChoices,
  costRelief,
  costMediate,
  canRelief,
  canMediate,
  onSkip,
  onAppeaseEnvoys,
  onCrackdown,
  onRelief,
  onBoostProduction,
  onMediate
}: HideoutGovDecisionModalProps) => {
  return (
    <ModalFrame title={title} day={day} locationName={locationName} description={description} onSkip={onSkip}>
      <div className="flex flex-col md:flex-row gap-2 justify-end">
        {onlyTwoChoices ? (
          <>
            <Button variant="secondary" disabled={!canMediate} onClick={onAppeaseEnvoys}>
              安抚使者（{costMediate}）
            </Button>
            <Button variant="gold" onClick={onCrackdown}>
              强硬清剿
            </Button>
          </>
        ) : (
          <>
            <Button variant="secondary" disabled={!canRelief} onClick={onRelief}>
              安抚民心（{costRelief}）
            </Button>
            <Button variant="secondary" onClick={onBoostProduction}>
              强化生产
            </Button>
            <Button variant="gold" disabled={!canMediate} onClick={onMediate}>
              调停冲突（{costMediate}）
            </Button>
          </>
        )}
      </div>
    </ModalFrame>
  );
};
