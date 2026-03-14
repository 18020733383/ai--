/**
 * 观海模式 - 初始状态
 */
import { FACTIONS } from '../../../game/data';
import type { ObserverModeState, QueueItem } from './types';

export function buildInitialQueue(): QueueItem[] {
  return FACTIONS.map(f => ({
    factionId: f.id,
    factionName: f.shortName,
    status: 'pending' as const,
    message: undefined
  }));
}

export function buildInitialObserverState(): ObserverModeState {
  return {
    phase: 'idle',
    currentDay: 1,
    queue: buildInitialQueue(),
    activeIndex: -1,
    log: []
  };
}
