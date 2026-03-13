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

  if (factionIds.includes('VERDANT_COVENANT') && factionIds.includes('FROST_OATH')) {
    (factionRelations as any).VERDANT_COVENANT.FROST_OATH = -18;
    (factionRelations as any).FROST_OATH.VERDANT_COVENANT = -18;
  }
  if (factionIds.includes('VERDANT_COVENANT') && factionIds.includes('RED_DUNE')) {
    (factionRelations as any).VERDANT_COVENANT.RED_DUNE = -10;
    (factionRelations as any).RED_DUNE.VERDANT_COVENANT = -10;
  }
  if (factionIds.includes('FROST_OATH') && factionIds.includes('RED_DUNE')) {
    (factionRelations as any).FROST_OATH.RED_DUNE = -22;
    (factionRelations as any).RED_DUNE.FROST_OATH = -22;
  }
  if (factionIds.includes('AUREATE_LEAGUE') && factionIds.includes('VERDANT_COVENANT')) {
    (factionRelations as any).AUREATE_LEAGUE.VERDANT_COVENANT = -8;
    (factionRelations as any).VERDANT_COVENANT.AUREATE_LEAGUE = -8;
  }
  if (factionIds.includes('AUREATE_LEAGUE') && factionIds.includes('FROST_OATH')) {
    (factionRelations as any).AUREATE_LEAGUE.FROST_OATH = -12;
    (factionRelations as any).FROST_OATH.AUREATE_LEAGUE = -12;
  }
  if (factionIds.includes('AUREATE_LEAGUE') && factionIds.includes('RED_DUNE')) {
    (factionRelations as any).AUREATE_LEAGUE.RED_DUNE = -6;
    (factionRelations as any).RED_DUNE.AUREATE_LEAGUE = -6;
  }
  if (factionIds.includes('ARCANE_CONCORD') && factionIds.includes('VERDANT_COVENANT')) {
    (factionRelations as any).ARCANE_CONCORD.VERDANT_COVENANT = -4;
    (factionRelations as any).VERDANT_COVENANT.ARCANE_CONCORD = -4;
  }
  if (factionIds.includes('ARCANE_CONCORD') && factionIds.includes('FROST_OATH')) {
    (factionRelations as any).ARCANE_CONCORD.FROST_OATH = -10;
    (factionRelations as any).FROST_OATH.ARCANE_CONCORD = -10;
  }
  if (factionIds.includes('ARCANE_CONCORD') && factionIds.includes('RED_DUNE')) {
    (factionRelations as any).ARCANE_CONCORD.RED_DUNE = -6;
    (factionRelations as any).RED_DUNE.ARCANE_CONCORD = -6;
  }
  if (factionIds.includes('ARCANE_CONCORD') && factionIds.includes('AUREATE_LEAGUE')) {
    (factionRelations as any).ARCANE_CONCORD.AUREATE_LEAGUE = 4;
    (factionRelations as any).AUREATE_LEAGUE.ARCANE_CONCORD = 4;
  }

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
