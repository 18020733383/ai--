import { EndingCinematicView } from '../../views/EndingCinematicView';
import { PortalEndingChoiceModal } from './PortalEndingChoiceModal';

type EndingScreenProps = {
  endingKey: string;
  newCovenantAvailable: boolean;
  portalEndingChoiceMade: boolean;
  endingContent: {
    title: string;
    subtitle: string;
    lines: string[];
  };
  onChooseNormal: () => void;
  onChooseReligion: () => void;
  onFinishEnding: () => void;
};

export const EndingScreen = ({
  endingKey,
  newCovenantAvailable,
  portalEndingChoiceMade,
  endingContent,
  onChooseNormal,
  onChooseReligion,
  onFinishEnding
}: EndingScreenProps) => {
  if (endingKey === 'PORTAL_CLEARED' && newCovenantAvailable && !portalEndingChoiceMade) {
    return <PortalEndingChoiceModal onChooseNormal={onChooseNormal} onChooseReligion={onChooseReligion} />;
  }

  return (
    <EndingCinematicView
      title={endingContent.title}
      subtitle={endingContent.subtitle}
      lines={endingContent.lines}
      onFinish={onFinishEnding}
    />
  );
};
