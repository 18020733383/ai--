import React from 'react';
import { BillsView } from '../../views/BillsView';
import { HideoutInspectView } from '../../views/HideoutInspectView';
import { IntroCinematicView } from '../../views/IntroCinematicView';
import { MainMenuView } from '../../views/MainMenuView';
import { TownView } from '../../features/town';
import { ObserverModeScreen } from '../../features/observer-mode';
import { GameView, Hero, Location } from '../../types';
import { EndingScreen } from './EndingScreen';
import { MapScreen } from './MapScreen';

type AppMainContentProps = {
  view: GameView;
  mainMenuProps: React.ComponentProps<typeof MainMenuView>;
  billsProps: React.ComponentProps<typeof BillsView>;
  mapProps: React.ComponentProps<typeof MapScreen>;
  endingProps: React.ComponentProps<typeof EndingScreen>;
  onIntroFinish: () => void;
  renderRelations: () => React.ReactNode;
  renderWorldBoard: () => React.ReactNode;
  renderTroopArchive: () => React.ReactNode;
  townProps: React.ComponentProps<typeof TownView>;
  hideoutInspectLocation: Location | null;
  hideoutInspectHeroes: Hero[];
  hideoutInspectLayerIndex: number;
  onHideoutLayerChange: (index: number) => void;
  onHideoutBackToTown: () => void;
  onHideoutBackToMap: () => void;
  renderBanditEncounter: () => React.ReactNode;
  renderAsylum: () => React.ReactNode;
  renderMarket: () => React.ReactNode;
  renderMysteriousCave: () => React.ReactNode;
  renderParty: () => React.ReactNode;
  renderCharacter: () => React.ReactNode;
  renderHeroChat: () => React.ReactNode;
  renderTraining: () => React.ReactNode;
  renderBattle: () => React.ReactNode;
  renderBattleResult: () => React.ReactNode;
  renderGameOver: () => React.ReactNode;
  observerModeProps: { onBack: () => void; buildAIConfig: () => { baseUrl: string; apiKey: string; model: string; provider: string } | undefined };
};

export const AppMainContent = ({
  view,
  mainMenuProps,
  billsProps,
  mapProps,
  endingProps,
  onIntroFinish,
  renderRelations,
  renderWorldBoard,
  renderTroopArchive,
  townProps,
  hideoutInspectLocation,
  hideoutInspectHeroes,
  hideoutInspectLayerIndex,
  onHideoutLayerChange,
  onHideoutBackToTown,
  onHideoutBackToMap,
  renderBanditEncounter,
  renderAsylum,
  renderMarket,
  renderMysteriousCave,
  renderParty,
  renderCharacter,
  renderHeroChat,
  renderTraining,
  renderBattle,
  renderBattleResult,
  renderGameOver,
  observerModeProps
}: AppMainContentProps) => {
  return (
    <main className={view === 'MAP' || view === 'HERO_CHAT' || view === 'MAIN_MENU' || view === 'OBSERVER_MODE' ? 'flex-1 w-full flex' : 'flex-1 container mx-auto pb-8 pt-4'}>
      {view === 'MAIN_MENU' && <MainMenuView {...mainMenuProps} />}
      {view === 'OBSERVER_MODE' && <ObserverModeScreen {...observerModeProps} />}
      {view === 'BILLS' && <BillsView {...billsProps} />}
      {view === 'MAP' && <MapScreen {...mapProps} />}
      {view === 'ENDING' && <EndingScreen {...endingProps} />}
      {view === 'INTRO' && <IntroCinematicView onFinish={onIntroFinish} />}
      {view === 'RELATIONS' && renderRelations()}
      {view === 'WORLD_BOARD' && renderWorldBoard()}
      {view === 'TROOP_ARCHIVE' && renderTroopArchive()}
      {view === 'TOWN' && <TownView {...townProps} />}
      {view === 'HIDEOUT_INSPECT' && hideoutInspectLocation && hideoutInspectLocation.type === 'HIDEOUT' && (
        <HideoutInspectView
          location={hideoutInspectLocation}
          heroes={hideoutInspectHeroes}
          initialLayerIndex={hideoutInspectLayerIndex}
          onLayerChange={onHideoutLayerChange}
          onBackToTown={onHideoutBackToTown}
          onBackToMap={onHideoutBackToMap}
        />
      )}
      {view === 'BANDIT_ENCOUNTER' && renderBanditEncounter()}
      {view === 'ASYLUM' && renderAsylum()}
      {view === 'MARKET' && renderMarket()}
      {view === 'CAVE' && renderMysteriousCave()}
      {view === 'PARTY' && renderParty()}
      {view === 'CHARACTER' && renderCharacter()}
      {view === 'HERO_CHAT' && renderHeroChat()}
      {view === 'TRAINING' && renderTraining()}
      {view === 'BATTLE' && renderBattle()}
      {view === 'BATTLE_RESULT' && renderBattleResult()}
      {view === 'GAME_OVER' && renderGameOver()}
    </main>
  );
};
