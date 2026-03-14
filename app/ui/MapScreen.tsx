import React from 'react';
import { BigMapView } from '../../features/world-map';
import { Location, PlayerState } from '../../types';
import type { HabitatStayState, HideoutStayState, MiningState, RoachLureState, WorkState } from '../../features/town/model/types';

type MapScreenProps = {
  zoom: number;
  camera: { x: number; y: number };
  locations: Location[];
  player: PlayerState;
  isObserverMode?: boolean;
  workState: WorkState | null;
  miningState: MiningState | null;
  roachLureState: RoachLureState | null;
  habitatStayState: HabitatStayState | null;
  hideoutStayState: HideoutStayState | null;
  hoveredLocation: Location | null;
  mousePos: { x: number; y: number };
  mapRef: React.RefObject<HTMLDivElement>;
  handleMouseDown: (event: React.MouseEvent<HTMLDivElement>) => void;
  handleMouseMove: (event: React.MouseEvent<HTMLDivElement>) => void;
  handleMouseUp: () => void;
  moveTo: (x: number, y: number, locationId?: string) => void;
  setHoveredLocation: (location: Location | null) => void;
  setPlayer: React.Dispatch<React.SetStateAction<PlayerState>>;
  setWorkState: (value: WorkState | null) => void;
  setMiningState: (value: MiningState | null) => void;
  setRoachLureState: (value: RoachLureState | null) => void;
  setHabitatStayState: (value: HabitatStayState | null) => void;
  setHideoutStayState: (value: HideoutStayState | null) => void;
  addLog: (text: string) => void;
};

export const MapScreen = ({
  zoom,
  camera,
  locations,
  player,
  isObserverMode,
  workState,
  miningState,
  roachLureState,
  habitatStayState,
  hideoutStayState,
  hoveredLocation,
  mousePos,
  mapRef,
  handleMouseDown,
  handleMouseMove,
  handleMouseUp,
  moveTo,
  setHoveredLocation,
  setPlayer,
  setWorkState,
  setMiningState,
  setRoachLureState,
  setHabitatStayState,
  setHideoutStayState,
  addLog
}: MapScreenProps) => {
  const handleAbortWork = () => {
    if (!workState?.isActive) return;
    const ratio = workState.totalDays > 0 ? workState.daysPassed / workState.totalDays : 0;
    const earned = ratio < 0.5 ? 0 : Math.max(0, Math.floor(workState.totalPay / 5));
    if (earned > 0) setPlayer(prev => ({ ...prev, gold: prev.gold + earned }));
    addLog(earned > 0 ? `你中止了委托，领取了 ${earned} 第纳尔。` : '你中止了委托，但进度不足一半，拿不到报酬。');
    setWorkState(null);
  };

  const handleAbortMining = () => {
    if (!miningState?.isActive) return;
    addLog('你中止了采矿。');
    setMiningState(null);
  };

  const handleAbortRoachLure = () => {
    if (!roachLureState?.isActive) return;
    addLog('你中止了吸引蟑螂。');
    setRoachLureState(null);
  };

  const handleAbortHabitat = () => {
    if (!habitatStayState?.isActive) return;
    addLog('你中止了栖息。');
    setHabitatStayState(null);
  };

  const handleAbortHideoutStay = () => {
    if (!hideoutStayState?.isActive) return;
    addLog('你中止了停留。');
    setHideoutStayState(null);
  };

  return (
    <BigMapView
      zoom={zoom}
      camera={camera}
      locations={locations}
      player={player}
      isObserverMode={isObserverMode}
      workState={workState}
      miningState={miningState}
      roachLureState={roachLureState}
      habitatStayState={habitatStayState}
      hideoutStayState={hideoutStayState}
      onAbortWork={handleAbortWork}
      onAbortMining={handleAbortMining}
      onAbortRoachLure={handleAbortRoachLure}
      onAbortHabitat={handleAbortHabitat}
      onAbortHideoutStay={handleAbortHideoutStay}
      hoveredLocation={hoveredLocation}
      mousePos={mousePos}
      mapRef={mapRef}
      handleMouseDown={handleMouseDown}
      handleMouseMove={handleMouseMove}
      handleMouseUp={handleMouseUp}
      moveTo={moveTo}
      setHoveredLocation={setHoveredLocation}
    />
  );
};
