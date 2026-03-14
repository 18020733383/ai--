/**
 * 观海模式 - 各势力 AI 自主决策，玩家旁观
 */
export { ObserverModeScreen } from './ui/ObserverModeScreen';
export { ObserverOverlay } from './ui/ObserverOverlay';
export { QueueDisplay } from './ui/QueueDisplay';
export type { ObserverModeState, QueueItem, QueueItemStatus } from './model/types';
export { buildInitialObserverState, buildInitialQueue } from './model/initialState';
