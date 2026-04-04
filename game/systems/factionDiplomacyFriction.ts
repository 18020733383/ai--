import type { FactionId, Location, Lord, WorldDiplomacyState } from '../../types';
import { FACTIONS } from '../data/factions';
import { applyWorldDiplomacyDelta, getWorldFactionRelation } from './diplomacy';

const isStrongholdType = (t: Location['type']) =>
  t === 'CITY' || t === 'CASTLE' || t === 'VILLAGE';

function friendlyStrongholds(locations: Location[], fid: FactionId): Location[] {
  return locations.filter(
    l => l.factionId === fid && l.owner !== 'ENEMY' && isStrongholdType(l.type)
  );
}

/** 两势力据点间最近欧氏距离（缺据点则 ∞） */
export function minInterFactionStrongholdDistance(
  locations: Location[],
  a: FactionId,
  b: FactionId
): number {
  const la = friendlyStrongholds(locations, a);
  const lb = friendlyStrongholds(locations, b);
  if (la.length === 0 || lb.length === 0) return Infinity;
  let min = Infinity;
  for (const x of la) {
    for (const y of lb) {
      const d = Math.hypot(x.coordinates.x - y.coordinates.x, x.coordinates.y - y.coordinates.y);
      if (d < min) min = d;
    }
  }
  return min;
}

export type WeeklyFactionFrictionInput = {
  state: WorldDiplomacyState;
  locations: Location[];
  lords: Lord[];
  day: number;
  mapDiagonal: number;
};

/**
 * 每周一次：边境摩擦（邻近势力小额双向减好感）+ 好战领主挑衅（单侧领主性情/扩张 focus）。
 */
export function advanceWeeklyFactionFriction(input: WeeklyFactionFrictionInput): {
  state: WorldDiplomacyState;
  logs: string[];
} {
  const logs: string[] = [];
  let state = input.state;
  const threshold = input.mapDiagonal * 0.11;

  const factionIds = FACTIONS.map(f => f.id);
  const borderPairs: { a: FactionId; b: FactionId; dist: number }[] = [];
  for (let i = 0; i < factionIds.length; i++) {
    for (let j = i + 1; j < factionIds.length; j++) {
      const a = factionIds[i];
      const b = factionIds[j];
      const d = minInterFactionStrongholdDistance(input.locations, a, b);
      if (d < threshold) borderPairs.push({ a, b, dist: d });
    }
  }
  borderPairs.sort((x, y) => x.dist - y.dist);

  let borderIncidents = 0;
  for (const { a, b } of borderPairs) {
    if (borderIncidents >= 2) break;
    if (Math.random() > 0.46) continue;
    const delta = -(2 + (Math.random() < 0.38 ? 2 : 0));
    const shortA = FACTIONS.find(f => f.id === a)?.shortName ?? a;
    const shortB = FACTIONS.find(f => f.id === b)?.shortName ?? b;
    const textPool = [
      `${shortA}与${shortB}边境巡逻摩擦`,
      `商队在${shortA}、${shortB}交界遭扣留，互相指责`,
      `${shortA}斥${shortB}向前沿增兵过界`,
      `${shortA}与${shortB}因猎场与税卡发生纠纷`
    ];
    const text = textPool[Math.floor(Math.random() * textPool.length)];
    state = applyWorldDiplomacyDelta(state, {
      kind: 'FACTION_FACTION',
      aId: a,
      bId: b,
      delta,
      text,
      day: input.day
    });
    state = applyWorldDiplomacyDelta(state, {
      kind: 'FACTION_FACTION',
      aId: b,
      bId: a,
      delta,
      text,
      day: input.day
    });
    logs.push(`【边境】${text}（双方好感约 ${delta}）`);
    borderIncidents++;
  }

  const warlikeLords = input.lords.filter(
    l =>
      l.factionId &&
      !(l.travelDaysLeft && l.travelDaysLeft > 0) &&
      (l.focus === 'WAR' ||
        /烈|狂|战|桀|悍|傲|莽/.test(String(l.temperament ?? '')))
  );

  if (warlikeLords.length > 0 && Math.random() < 0.4) {
    const lord = warlikeLords[Math.floor(Math.random() * warlikeLords.length)];
    const fid = lord.factionId as FactionId;
    let nearestEnemy: { id: FactionId; dist: number } | null = null;
    for (const f of FACTIONS) {
      if (f.id === fid) continue;
      const d = minInterFactionStrongholdDistance(input.locations, fid, f.id);
      if (d < threshold * 1.45 && (!nearestEnemy || d < nearestEnemy.dist)) {
        nearestEnemy = { id: f.id, dist: d };
      }
    }
    if (nearestEnemy) {
      const enemyId = nearestEnemy.id;
      const rel = getWorldFactionRelation(state, fid, enemyId);
      if (rel > -78) {
        const aToB = -(3 + Math.floor(Math.random() * 4));
        const bToA = -(3 + Math.floor(Math.random() * 4));
        const enemyName = FACTIONS.find(f => f.id === enemyId)?.name ?? enemyId;
        const ev = `${lord.title}${lord.name}部众在${enemyName}边境挑衅`;
        state = applyWorldDiplomacyDelta(state, {
          kind: 'FACTION_FACTION',
          aId: fid,
          bId: enemyId,
          delta: aToB,
          text: ev,
          day: input.day
        });
        state = applyWorldDiplomacyDelta(state, {
          kind: 'FACTION_FACTION',
          aId: enemyId,
          bId: fid,
          delta: bToA,
          text: `${enemyName}斥责${lord.title}${lord.name}越界`,
          day: input.day
        });
        logs.push(`【好战】${lord.title}${lord.name}滋事，${FACTIONS.find(f => f.id === fid)?.shortName ?? ''}与${FACTIONS.find(f => f.id === enemyId)?.shortName ?? ''}关系恶化`);
      }
    }
  }

  return { state, logs };
}
