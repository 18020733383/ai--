/**
 * 从 AI 决策的 actions 中解析出目标据点及操作类型
 */
import type { Location } from '../../../types';

export type ObserverTargetType = 'recruit' | 'scout' | 'attack';

export type ObserverTarget = {
  locationId: string;
  types: ObserverTargetType[];
};

/** 按顺序解析 actions，返回 (locationId, actionType) 列表，用于动画执行 */
export function parseActionsInOrder(
  actions: string[],
  locations: Location[]
): Array<{ locationId: string; locationName: string; actionType: ObserverTargetType }> {
  const result: Array<{ locationId: string; locationName: string; actionType: ObserverTargetType }> = [];
  for (const action of actions) {
    const hasRecruit = /扩军|征兵|募兵/.test(action);
    const hasScout = /侦察|探查/.test(action);
    const hasAttack = /进攻|攻打|围攻/.test(action);
    for (const loc of locations) {
      if (action.includes(loc.name)) {
        if (hasRecruit) result.push({ locationId: loc.id, locationName: loc.name, actionType: 'recruit' });
        if (hasScout) result.push({ locationId: loc.id, locationName: loc.name, actionType: 'scout' });
        if (hasAttack) result.push({ locationId: loc.id, locationName: loc.name, actionType: 'attack' });
      }
    }
  }
  return result;
}

/** 匹配扩军/征兵/侦察/进攻等关键词，提取目标据点 */
export function parseObserverTargets(
  queue: Array<{ actions?: string[] }>,
  locations: Location[]
): ObserverTarget[] {
  const targetsByLoc = new Map<string, Set<ObserverTargetType>>();

  const addTarget = (loc: Location, type: ObserverTargetType) => {
    let set = targetsByLoc.get(loc.id);
    if (!set) {
      set = new Set();
      targetsByLoc.set(loc.id, set);
    }
    set.add(type);
  };

  for (const item of queue) {
    for (const action of item.actions ?? []) {
      const hasRecruit = /扩军|征兵|募兵/.test(action);
      const hasScout = /侦察|探查/.test(action);
      const hasAttack = /进攻|攻打|围攻/.test(action);
      for (const loc of locations) {
        if (action.includes(loc.name)) {
          if (hasRecruit) addTarget(loc, 'recruit');
          if (hasScout) addTarget(loc, 'scout');
          if (hasAttack) addTarget(loc, 'attack');
        }
      }
    }
  }

  return Array.from(targetsByLoc.entries()).map(([locationId, types]) => ({
    locationId,
    types: Array.from(types)
  }));
}
