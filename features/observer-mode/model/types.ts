/**
 * 观海模式 - 类型定义
 * 各势力 AI 决策队列，战争迷雾等
 */

export type QueueItemStatus = 'pending' | 'deciding' | 'acting' | 'done' | 'error';

export type QueueItem = {
  factionId: string;
  factionName: string;
  status: QueueItemStatus;
  /** 大方向，列表展示 */
  action?: string;
  /** 具体行为，点击展开 */
  actions?: string[];
  /** 兼容旧字段 */
  message?: string;
};

export type ObserverModePhase = 'idle' | 'running' | 'day_end' | 'paused';

export type ObserverModeState = {
  phase: ObserverModePhase;
  currentDay: number;
  queue: QueueItem[];
  activeIndex: number;
  log: string[];
};
