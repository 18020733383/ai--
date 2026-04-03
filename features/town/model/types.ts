import { MineralId, MineralPurity, WorkContractRewardKind } from '../../../types';

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
  | 'FOUNDRY'
  | 'FARM'
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
  /** 金币报酬（GOLD 为全额；特殊委托为津贴，含商业加成） */
  totalPay: number;
  contractTier: number;
  rewardKind: WorkContractRewardKind;
  rewardXp?: number;
  rewardTroopId?: string;
  rewardTroopCount?: number;
  /** 大地图委托面板一行摘要 */
  rewardSummary: string;
  isMystery?: boolean;
  mysteryChainId?: string;
  mysteryStage?: number;
  mysteryTotalStages?: number;
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
