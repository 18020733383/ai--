import { RaceId, WorldDiplomacyState } from '../../types';
import { FACTIONS, RACE_LABELS, RACE_RELATION_MATRIX } from '../data';

export const clampRelation = (value: number) => Math.max(-100, Math.min(100, Math.round(value)));

export const buildInitialWorldDiplomacy = (): WorldDiplomacyState => {
  const factionIds = FACTIONS.map(f => f.id);
  const raceIds = Object.keys(RACE_LABELS) as RaceId[];
  const factionRelations = factionIds.reduce((acc, a) => {
    acc[a] = factionIds.reduce((row, b) => {
      row[b] = 0;
      return row;
    }, {} as Record<string, number>) as Record<typeof factionIds[number], number>;
    return acc;
  }, {} as Record<string, Record<string, number>>) as WorldDiplomacyState['factionRelations'];
  // 势力关系初始均为 0，随攻城/外交等事件变化

  const raceRelations = raceIds.reduce((acc, a) => {
    acc[a] = raceIds.reduce((row, b) => {
      row[b] = clampRelation(RACE_RELATION_MATRIX[a]?.[b] ?? 0);
      return row;
    }, {} as Record<string, number>) as Record<typeof raceIds[number], number>;
    return acc;
  }, {} as WorldDiplomacyState['raceRelations']);

  const factionRaceRelations = factionIds.reduce((acc, factionId) => {
    acc[factionId] = raceIds.reduce((row, raceId) => {
      row[raceId] = clampRelation(RACE_RELATION_MATRIX.HUMAN?.[raceId] ?? 0);
      return row;
    }, {} as Record<string, number>) as Record<typeof raceIds[number], number>;
    return acc;
  }, {} as WorldDiplomacyState['factionRaceRelations']);

  return { factionRelations, raceRelations, factionRaceRelations, events: [] };
};

export const normalizeWorldDiplomacy = (raw: any, currentDay: number): WorldDiplomacyState => {
  const base = buildInitialWorldDiplomacy();
  const factionIds = FACTIONS.map(f => f.id);
  const raceIds = Object.keys(RACE_LABELS) as RaceId[];
  const next: WorldDiplomacyState = {
    factionRelations: { ...base.factionRelations },
    raceRelations: { ...base.raceRelations },
    factionRaceRelations: { ...base.factionRaceRelations },
    events: Array.isArray(raw?.events) ? raw.events.filter((e: any) => e && typeof e.text === 'string').slice(0, 60) : []
  };

  factionIds.forEach(a => {
    const row = raw?.factionRelations?.[a];
    const nextRow: Record<string, number> = { ...(next.factionRelations as any)[a] };
    factionIds.forEach(b => {
      nextRow[b] = clampRelation(Number(row?.[b] ?? nextRow[b] ?? 0));
    });
    (next.factionRelations as any)[a] = nextRow;
  });

  raceIds.forEach(a => {
    const row = raw?.raceRelations?.[a];
    const nextRow: Record<string, number> = { ...(next.raceRelations as any)[a] };
    raceIds.forEach(b => {
      nextRow[b] = clampRelation(Number(row?.[b] ?? nextRow[b] ?? 0));
    });
    (next.raceRelations as any)[a] = nextRow;
  });

  factionIds.forEach(factionId => {
    const row = raw?.factionRaceRelations?.[factionId];
    const nextRow: Record<string, number> = { ...(next.factionRaceRelations as any)[factionId] };
    raceIds.forEach(raceId => {
      nextRow[raceId] = clampRelation(Number(row?.[raceId] ?? nextRow[raceId] ?? 0));
    });
    (next.factionRaceRelations as any)[factionId] = nextRow;
  });

  next.events = next.events.map((e: any) => ({
    id: String(e?.id ?? `dip_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`),
    day: typeof e?.day === 'number' ? e.day : currentDay,
    kind: e?.kind === 'FACTION_FACTION' || e?.kind === 'FACTION_RACE' || e?.kind === 'RACE_RACE' ? e.kind : 'FACTION_FACTION',
    aId: String(e?.aId ?? ''),
    bId: String(e?.bId ?? ''),
    delta: clampRelation(Number(e?.delta ?? 0)),
    text: String(e?.text ?? '').trim()
  })).filter((e: any) => e.text);

  return next;
};

/** 根据关系数值返回状态标签 */
export const getRelationStateLabel = (value: number): string => {
  if (value >= 80) return '同盟';
  if (value >= 60) return '亲密';
  if (value >= 35) return '友好';
  if (value >= 15) return '缓和';
  if (value >= 5) return '中立';
  if (value >= -5) return '冷淡';
  if (value >= -15) return '猜忌';
  if (value >= -35) return '紧张';
  if (value >= -60) return '敌对';
  if (value >= -80) return '战争';
  return '死敌';
};

export const getWorldFactionRelation = (state: WorldDiplomacyState, a: string, b: string) => clampRelation(Number((state.factionRelations as any)?.[a]?.[b] ?? 0));
export const getWorldRaceRelation = (state: WorldDiplomacyState, a: string, b: string) => clampRelation(Number((state.raceRelations as any)?.[a]?.[b] ?? 0));
export const getWorldFactionRaceRelation = (state: WorldDiplomacyState, factionId: string, raceId: string) => clampRelation(Number((state.factionRaceRelations as any)?.[factionId]?.[raceId] ?? 0));

export const applyWorldDiplomacyDelta = (
  state: WorldDiplomacyState,
  payload: { kind: WorldDiplomacyState['events'][number]['kind']; aId: string; bId: string; delta: number; text: string; day: number }
) => {
  const delta = clampRelation(payload.delta);
  if (!delta) return state;
  const id = `dip_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
  const event = { id, day: payload.day, kind: payload.kind, aId: payload.aId, bId: payload.bId, delta, text: payload.text };

  if (payload.kind === 'FACTION_FACTION') {
    const current = getWorldFactionRelation(state, payload.aId, payload.bId);
    const nextValue = clampRelation(current + delta);
    if (nextValue === current) return state;
    return {
      ...state,
      factionRelations: {
        ...state.factionRelations,
        [payload.aId]: { ...(state.factionRelations as any)[payload.aId], [payload.bId]: nextValue }
      } as any,
      events: [event, ...(state.events ?? [])].slice(0, 60)
    };
  }

  if (payload.kind === 'RACE_RACE') {
    const current = getWorldRaceRelation(state, payload.aId, payload.bId);
    const nextValue = clampRelation(current + delta);
    if (nextValue === current) return state;
    return {
      ...state,
      raceRelations: {
        ...state.raceRelations,
        [payload.aId]: { ...(state.raceRelations as any)[payload.aId], [payload.bId]: nextValue }
      } as any,
      events: [event, ...(state.events ?? [])].slice(0, 60)
    };
  }

  const current = getWorldFactionRaceRelation(state, payload.aId, payload.bId);
  const nextValue = clampRelation(current + delta);
  if (nextValue === current) return state;
  return {
    ...state,
    factionRaceRelations: {
      ...state.factionRaceRelations,
      [payload.aId]: { ...(state.factionRaceRelations as any)[payload.aId], [payload.bId]: nextValue }
    } as any,
    events: [event, ...(state.events ?? [])].slice(0, 60)
  };
};
