import { Button } from '../../components/Button';

type PortalEndingChoiceModalProps = {
  onChooseNormal: () => void;
  onChooseReligion: () => void;
};

export const PortalEndingChoiceModal = ({
  onChooseNormal,
  onChooseReligion
}: PortalEndingChoiceModalProps) => {
  return (
    <div className="fixed inset-0 z-50 bg-black flex items-center justify-center p-4">
      <div className="w-full max-w-2xl bg-stone-900 border border-stone-700 rounded shadow-2xl p-6 space-y-4">
        <div className="text-2xl font-serif text-amber-400">终章：门</div>
        <div className="text-sm text-stone-400 leading-relaxed">
          你攻破了伪人传送门。门在发光，但城市里的信仰也在发声。
        </div>
        <div className="bg-black/30 border border-stone-800 rounded p-4 space-y-2">
          <div className="text-stone-200 font-bold">可选结局</div>
          <div className="text-xs text-stone-500">满足条件：所有城市信教比例 ≥ 90%</div>
        </div>
        <div className="flex flex-col md:flex-row gap-3 justify-end">
          <Button variant="secondary" onClick={onChooseNormal}>
            选择正常结局
          </Button>
          <Button variant="gold" onClick={onChooseReligion}>
            选择宗教结局：诸神黄昏后的新约
          </Button>
        </div>
      </div>
    </div>
  );
};
