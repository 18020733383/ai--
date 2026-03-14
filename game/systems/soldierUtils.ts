/**
 * 士兵/部队工具函数
 * 从 App.tsx 迁出
 */
import type { PlayerState, SoldierInstance, Troop, WoundedTroopEntry } from '../../types';

export type GetTroopTemplate = (id: string) => Partial<Troop> & { id: string; name: string; tier?: number; maxXp?: number; cost?: number } | undefined;

export function buildSoldierId(seed: number): string {
  return `S${seed}`;
}

export function buildTroopsFromSoldiers(
  soldiers: SoldierInstance[],
  getTroopTemplate: GetTroopTemplate
): Troop[] {
  const grouped = soldiers.reduce<Record<string, SoldierInstance[]>>((acc, s) => {
    if (s.status !== 'ACTIVE') return acc;
    (acc[s.troopId] ??= []).push(s);
    return acc;
  }, {});
  return Object.entries(grouped)
    .map(([troopId, list]) => {
      const template = getTroopTemplate(troopId);
      if (!template) return null;
      const count = list.length;
      const maxXpValue = count > 0 ? Math.max(...list.map(s => s.xp ?? 0)) : 0;
      return { ...template, count, xp: maxXpValue } as Troop;
    })
    .filter((t): t is Troop => !!t && t.count > 0);
}

export function buildWoundedEntriesFromSoldiers(
  soldiers: SoldierInstance[],
  currentDay: number
): WoundedTroopEntry[] {
  const map = new Map<string, WoundedTroopEntry>();
  soldiers.forEach(s => {
    if (s.status !== 'WOUNDED') return;
    const recoverDay = Math.max(0, Math.floor(s.recoverDay ?? currentDay));
    const key = `${s.troopId}__${recoverDay}`;
    const cur = map.get(key);
    if (cur) {
      cur.count += 1;
      if (cur.soldierIds) cur.soldierIds.push(s.id);
    } else {
      map.set(key, { troopId: s.troopId, count: 1, recoverDay, soldierIds: [s.id] });
    }
  });
  return Array.from(map.values()).sort((a, b) => a.recoverDay - b.recoverDay);
}

export function normalizePlayerSoldiers(
  player: PlayerState,
  getTroopTemplate: GetTroopTemplate
): PlayerState {
  const troops = (Array.isArray(player.troops) ? player.troops : [])
    .filter(t => !!getTroopTemplate(t.id));
  const troopMap = new Map(troops.map(t => [t.id, t]));
  let soldiers = Array.isArray(player.soldiers) ? player.soldiers.map(s => ({ ...s })) : [];
  let nextId = typeof player.nextSoldierId === 'number' ? player.nextSoldierId : 1;
  let changed = false;

  soldiers = soldiers.filter(s => troopMap.has(s.troopId) || s.status === 'GARRISONED');
  const activeSoldiers = soldiers.filter(s => (s.status ?? 'ACTIVE') === 'ACTIVE');
  const woundedSoldiers = soldiers.filter(s => (s.status ?? 'ACTIVE') !== 'ACTIVE');

  const byTroop = activeSoldiers.reduce<Record<string, SoldierInstance[]>>((acc, s) => {
    (acc[s.troopId] ??= []).push(s);
    return acc;
  }, {});

  troops.forEach(t => {
    const template = getTroopTemplate(t.id);
    if (!template) return;
    const list = byTroop[t.id] ?? [];
    const diff = t.count - list.length;
    if (diff > 0) {
      changed = true;
      for (let i = 0; i < diff; i += 1) {
        const id = buildSoldierId(nextId++);
        const xp = Math.max(0, Math.min(template.maxXp ?? 999, Math.floor(t.xp ?? 0)));
        list.push({
          id,
          troopId: t.id,
          name: template.name,
          tier: template.tier ?? 1,
          xp,
          maxXp: template.maxXp ?? 999,
          createdDay: player.day,
          history: [`Day ${player.day} · 招募入伍`],
          status: 'ACTIVE'
        });
      }
      byTroop[t.id] = list;
    } else if (diff < 0) {
      changed = true;
      byTroop[t.id] = list.slice(0, t.count);
    }
  });

  soldiers = [...Object.values(byTroop).flat(), ...woundedSoldiers];
  soldiers = soldiers.map(s => {
    const tmpl = getTroopTemplate(s.troopId);
    if (!tmpl) return s;
    const nextXp = Math.max(0, Math.min(tmpl.maxXp ?? 999, Math.floor(s.xp ?? 0)));
    return {
      ...s,
      name: tmpl.name,
      tier: tmpl.tier ?? 1,
      xp: nextXp,
      maxXp: tmpl.maxXp ?? 999,
      status: s.status ?? 'ACTIVE'
    };
  });

  const normalizedTroops = buildTroopsFromSoldiers(soldiers, getTroopTemplate);
  if (!changed && normalizedTroops.length === troops.length) {
    const sameCounts = normalizedTroops.every(t => {
      const raw = troopMap.get(t.id);
      return raw && raw.count === t.count;
    });
    if (sameCounts && player.soldiers === soldiers && player.nextSoldierId === nextId) return player;
  }

  return {
    ...player,
    soldiers,
    nextSoldierId: nextId,
    troops: normalizedTroops,
    woundedTroops: buildWoundedEntriesFromSoldiers(soldiers, player.day)
  };
}

export function getTroopSoldiers(player: PlayerState, troopId: string): SoldierInstance[] {
  const roster = Array.isArray(player.soldiers) ? player.soldiers : [];
  return roster.filter(s => s.troopId === troopId);
}

export function markSoldiersWounded(
  soldiers: SoldierInstance[],
  soldierIds: string[],
  recoverDay: number,
  note: string
): SoldierInstance[] {
  const idSet = new Set(soldierIds);
  return soldiers.map(s => {
    if (!idSet.has(s.id)) return s;
    const history = [...(s.history ?? []), note];
    return { ...s, status: 'WOUNDED' as const, recoverDay, history };
  });
}

export function removeSoldiersById(soldiers: SoldierInstance[], soldierIds: string[]): SoldierInstance[] {
  if (soldierIds.length === 0) return soldiers;
  const idSet = new Set(soldierIds);
  return soldiers.filter(s => !idSet.has(s.id));
}
