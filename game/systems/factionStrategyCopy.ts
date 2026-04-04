import { FACTIONS } from '../data';
import { clampRelation, getRelationStateLabel, getWorldFactionRelation } from './diplomacy';
import type {
  FactionId,
  FactionStrategicDirective,
  FactionStrategicMode,
  FactionStrategyShiftCode,
  Location,
  PlayerState,
  WorldDiplomacyState
} from '../../types';
import { getFactionLocations } from './garrisonHelpers';

export function formatStrategyShiftNote(code: FactionStrategyShiftCode | undefined, focalName: string): string {
  if (!code) return '尚无更迭记录。';
  if (code === 'SIEGE_HOME') {
    return `因有据点遭围 / 告急，枢机转向解围，目光锁定「${focalName}」。`;
  }
  if (code === 'FOCAL_INVALID') {
    return `上一焦点据点失效或易手，王国重新勘定战略锚点（现为「${focalName}」）。`;
  }
  if (code === 'INERTIA_EXPIRED') {
    return `战略惯性期届满，议政厅修订指令；现以「${focalName}」为目光所聚。`;
  }
  if (code === 'PRESS_WAR') {
    return `与敌国关系严峻，诏令外线施压，兵锋指向「${focalName}」一线。`;
  }
  return `采行固守与整补，核心坐镇「${focalName}」。`;
}

export function buildFactionDiplomaticSummary(
  factionId: FactionId,
  factionName: string,
  dir: FactionStrategicDirective | undefined,
  worldDiplomacy: WorldDiplomacyState,
  player: PlayerState
): string {
  let worstOther: FactionId | null = null;
  let worstVal = 0;
  for (const f of FACTIONS) {
    if (f.id === factionId) continue;
    const r = getWorldFactionRelation(worldDiplomacy, factionId, f.id);
    if (r < worstVal) {
      worstVal = r;
      worstOther = f.id;
    }
  }
  const worstLabel = worstOther != null ? (FACTIONS.find(x => x.id === worstOther)?.shortName ?? worstOther) : null;
  const worstTone = worstOther != null ? getRelationStateLabel(worstVal) : '中立';

  const playerRel = clampRelation(Number((player.relationMatrix?.factions as any)?.[factionId] ?? 0));
  const playerTone = getRelationStateLabel(playerRel);

  const modeLine = (() => {
    if (!dir) return '战略未明';
    if (dir.mode === 'HOLD') return '国内整补、固守重心';
    if (dir.mode === 'PRESS_ENEMY') return '外务吃紧、陈兵压境';
    return '解围救急、收缩迎击';
  })();

  const outward =
    worstLabel != null
      ? `对「${worstLabel}」系 ${worstTone}`
      : '对外尚可克制';
  return `【${factionName}】使馆告示：${outward}；对您态度 ${playerTone}；王国意向——${modeLine}。`;
}

export function pickStrategyRumorLine(
  factionShortName: string,
  code: FactionStrategyShiftCode,
  focalName: string,
  rivalShort?: string | null
): string {
  const r = rivalShort ? `与${rivalShort}的棋路已变。` : '';
  const templates: Record<FactionStrategyShiftCode, string[]> = {
    SIEGE_HOME: [
      `流言：${factionShortName}王宫烛火彻夜，信使奔向四方，仿佛${focalName}的命运悬于一线。`,
      `酒馆窃语：${factionShortName}的将领被急召回防，有人说${focalName}撑不了太久。`
    ],
    FOCAL_INVALID: [
      `坊间传闻：${factionShortName}沙盘上的战棋被一把拂乱，新的棋眼落在${focalName}。`
    ],
    INERTIA_EXPIRED: [
      `说书人嘟囔：${factionShortName}的「既定国策」到期了，风向可能要转向${focalName}。`
    ],
    PRESS_WAR: [
      `路边儿歌走调成：${factionShortName}磨剑霍霍，下一个名字或许是${focalName}。${r}`,
      `商旅私聊：${factionShortName}军费暗中加码，矛头隐约指向${focalName}。`
    ],
    HOLD_RECENTER: [
      `老兵叹气：${factionShortName}最近只说练兵与屯粮，重心似又回到${focalName}一旁。`
    ]
  };
  const pool = templates[code];
  return pool[Math.floor(Math.random() * pool.length)] ?? `【流言】${factionShortName}的风向变了。`;
}

export function describePlayerStrategicStance(player: PlayerState, locations: Location[]): string {
  const held = locations.filter(l => l.owner === 'PLAYER' && (l.type === 'CITY' || l.type === 'CASTLE' || l.type === 'VILLAGE'));
  const fac = player.relationMatrix?.factions;
  let minRel = 0;
  if (fac) {
    for (const v of Object.values(fac)) {
      const n = clampRelation(Number(v));
      if (n < minRel) minRel = n;
    }
  }
  const troopN = (player.troops ?? []).reduce((s, t) => s + Math.max(0, Math.floor(t.count ?? 0)), 0);
  const q = player.story?.mainQuest ?? '';

  if (held.length >= 3) return '你疆土日广，像在棋盘四角落子—诸王不能不看你一眼。';
  if (minRel <= -55) return '你四面树敌的外交底色，使你更像执刃游走，而非静坐观潮。';
  if (troopN >= 85) return '大军在握，你的脚步会拖出比诏令更长的阴影。';
  if (minRel >= 25) return '你与多数王国尚能递上名帖—暂取守势亦能换得喘息。';
  if (q.includes('PORTAL') || q.includes('CLEANSE')) return '使命驱你迎向裂隙与烽火—个人方针与诸国「固守」未必同调。';
  return '你尚未立下终年不改的方阵—机遇与险途仍随单日而迁。';
}

/** 据点为多少势力的战略焦点 */
export function focalFactionLabelsForLocation(
  locationId: string,
  strategies: WorldDiplomacyState['factionStrategies'] | undefined
): string[] {
  if (!strategies) return [];
  const out: string[] = [];
  for (const f of FACTIONS) {
    const d = strategies[f.id];
    if (d?.focalLocationId === locationId) out.push(f.shortName);
  }
  return out;
}

/** 密档：粗略压力指标 */
export function computeFactionStrategyIntel(
  factionId: FactionId,
  dir: FactionStrategicDirective | undefined,
  locations: Location[],
  worldDiplomacy: WorldDiplomacyState
): { pressure: number; focalToHeart: number | null } | null {
  if (!dir) return null;
  let worst = 0;
  for (const f of FACTIONS) {
    if (f.id === factionId) continue;
    const r = getWorldFactionRelation(worldDiplomacy, factionId, f.id);
    if (r < worst) worst = r;
  }
  const pressure = Math.round(Math.min(100, Math.abs(worst)));

  const my = getFactionLocations(factionId, locations).filter(l => l.owner !== 'ENEMY');
  if (my.length === 0) return { pressure, focalToHeart: null };
  let sx = 0;
  let sy = 0;
  for (const l of my) {
    sx += l.coordinates.x;
    sy += l.coordinates.y;
  }
  const cx = sx / my.length;
  const cy = sy / my.length;
  const focal = locations.find(l => l.id === dir.focalLocationId);
  const focalToHeart = focal ? Math.round(Math.hypot(focal.coordinates.x - cx, focal.coordinates.y - cy)) : null;
  return { pressure, focalToHeart };
}

export function modeLabel(mode: FactionStrategicMode): string {
  if (mode === 'HOLD') return '固守整备';
  if (mode === 'PRESS_ENEMY') return '对敌施压';
  return '围城解围';
}
