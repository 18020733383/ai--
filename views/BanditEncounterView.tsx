import React from 'react';
import { Bomb, EyeOff, Skull, Tent } from 'lucide-react';
import { Button } from '../components/Button';

type BanditEncounterViewProps = {
  onAction: (action: 'ATTACK' | 'SNEAK') => void;
};

export const BanditEncounterView = ({ onAction }: BanditEncounterViewProps) => {
  return (
    <div className="flex items-center justify-center min-h-[80vh] p-4">
      <div className="max-w-2xl w-full bg-stone-900/90 border-2 border-red-900/50 p-8 rounded shadow-2xl relative overflow-hidden animate-fade-in text-center">
        <div className="absolute top-0 right-0 p-4 opacity-10">
          <Skull size={200} />
        </div>

        <h2 className="text-4xl font-serif text-red-500 mb-4 flex items-center justify-center gap-3">
          <Tent size={40} /> 劫匪窝点
        </h2>

        <p className="text-stone-300 text-lg mb-8 leading-relaxed">
          你发现了这群法外之徒的藏身之处。空气中弥漫着廉价烈酒和烤肉的臭味。
          虽然他们看起来装备简陋，但人数众多。
          <br /><br />
          捣毁这里可以获得大量战利品，但如果你想通过，也可以尝试悄悄溜走。
        </p>

        <div className="flex gap-4 justify-center">
          <Button
            onClick={() => onAction('ATTACK')}
            size="lg"
            variant="danger"
            className="flex items-center gap-2"
          >
            <Bomb size={20} /> 捣毁据点 (战斗)
          </Button>
          <Button
            onClick={() => onAction('SNEAK')}
            size="lg"
            variant="secondary"
            className="flex items-center gap-2"
          >
            <EyeOff size={20} /> 悄悄溜走 (70% 成功率)
          </Button>
        </div>
      </div>
    </div>
  );
};
