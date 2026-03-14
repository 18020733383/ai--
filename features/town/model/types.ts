import { MineralId, MineralPurity } from '../../../types';

export type TownTab =
  | 'RECRUIT'
  | 'TAVERN'
  | 'GARRISON'
  | 'LOCAL_GARRISON'
  | 'DEFENSE'
  | 'MEMORIAL'
  | 'WORK'
  | 'SIEGE'
  | 'OWNED'
  | 'COFFEE_CHAT'
  | 'MINING'
  | 'FORGE'
  | 'ROACH_LURE'
  | 'IMPOSTER_STATIONED'
  | 'LORD'
  | 'ALTAR'
  | 'ALTAR_RECRUIT'
  | 'MAGICIAN_LIBRARY'
  | 'RECOMPILER'
  | 'HABITAT'
  | 'HIDEOUT'
  | 'SEAL_HABITAT';

export type WorkState = {
  isActive: boolean;
  locationId: string;
  contractId: string;
  contractTitle: string;
  totalDays: number;
  daysPassed: number;
  totalPay: number;
};

export type MiningState = {
  isActive: boolean;
  locationId: string;
  mineralId: MineralId;
  totalDays: number;
  daysPassed: number;
  yieldByPurity: Record<MineralPurity, number>;
};

export type RoachLureState = {
  isActive: boolean;
  locationId: string;
  totalDays: number;
  daysPassed: number;
  recruitedByTroopId: Record<string, number>;
};

export type HabitatStayState = {
  isActive: boolean;
  locationId: string;
  totalDays: number;
  daysPassed: number;
};

export type AltarRecruitState = {
  isActive: boolean;
  locationId: string;
  totalDays: number;
  daysPassed: number;
  recruitedByTroopId: Record<string, number>;
};

export type HideoutStayState = {
  isActive: boolean;
  locationId: string;
  totalDays: number;
  daysPassed: number;
};
