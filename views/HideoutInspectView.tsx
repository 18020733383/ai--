import React from 'react';
import { Hero, Location } from '../types';
import { Button } from '../components/Button';

type HideoutInspectViewProps = {
  location: Location;
  heroes: Hero[];
  initialLayerIndex: number;
  onLayerChange: (index: number) => void;
  onBackToTown: () => void;
  onBackToMap: () => void;
};

type Role = 'GUARD' | 'PATROL' | 'WORKER' | 'HERO' | 'GUARDIAN';
type NpcAgent = {
  id: string;
  role: Role;
  name: string;
  x: number;
  y: number;
  r: number;
  speed: number;
  target: { x: number; y: number };
  wait: number;
  movable: boolean;
};
type Obstacle = { x: number; y: number; w: number; h: number };
type LayerTemplate = {
  key: string;
  title: string;
  background: string;
  ambience: string;
  entryRect: { x: number; y: number; w: number; h: number };
  stairsUp: { x: number; y: number };
  stairsDown: { x: number; y: number };
  buildAnchors: Array<{ x: number; y: number; w: number; h: number }>;
  patrolPoints: Array<{ x: number; y: number }>;
  staticObstacles: Obstacle[];
  guardPosts: Array<{ x: number; y: number }>;
};

const MAP_W = 980;
const MAP_H = 560;
const PLAYER_SIZE = 18;
const GRID = 28;

const roleReplies: Record<Role, string[]> = {
  GUARD: [
    '岗哨汇报：入口区安全，未发现异常轨迹。',
    '门口火把和警钟都正常，今晚照常轮值。',
    '我盯着外层通道，任何陌生脚步都会被拦下。',
    '外面风声很大，但现在还没有敌军动向。'
  ],
  PATROL: [
    '巡逻路线已清点，补给点和暗门都没问题。',
    '我刚从北走廊回来，那边今天很安静。',
    '再巡两圈就换班，顺便检查一下火油桶。',
    '今晚地面有点潮，走廊转角要注意打滑。'
  ],
  WORKER: [
    '工坊这边还在赶工，别踩到我的图纸。',
    '材料刚搬进来，接下来几天会有施工噪音。',
    '脚手架还没拆，先别让新兵跑上去。',
    '只要矿石不断，我们的建造进度还能再快一点。'
  ],
  HERO: [
    '我会跟在你后面，前面真有事我先上。',
    '这层防线没问题，队伍士气也稳得住。',
    '你探路，我压阵，出了岔子我来收尾。',
    '隐匿点状态不错，至少今天像个家。'
  ],
  GUARDIAN: [
    '守护者值守中：该层防线完整，哨兵链路畅通。',
    '这层由我盯着，真有人闯进来我会先一步处理。',
    '别担心，我已经让驻军在关键节点轮换了。'
  ]
};

const buildingLabelMap: Record<string, string> = {
  BARRACKS: '兵营',
  FACTORY: '工坊',
  HOUSING: '居住区',
  TRAINING_CAMP: '训练场',
  DEFENSE: '防御工事',
  RECRUITER: '招募站',
  CHAPEL: '小教堂',
  SHRINE: '祭坛',
  ORE_REFINERY: '精炼厂',
  HOSPITAL_I: '医务室',
  HOSPITAL_II: '医院',
  HOSPITAL_III: '野战医院',
  CAMOUFLAGE_STRUCTURE: '伪装网',
  MAZE_I: '迷宫工事',
  MAZE_II: '迷宫工事',
  MAZE_III: '迷宫工事',
  AA_TOWER_I: '防空塔',
  AA_TOWER_II: '防空塔',
  AA_TOWER_III: '防空塔',
  AA_NET_I: '防空网',
  AA_NET_II: '防空网',
  AA_RADAR_I: '雷达站',
  AA_RADAR_II: '雷达站'
};

const templates: LayerTemplate[] = [
  {
    key: 'ENTRY',
    title: '入口哨区',
    background: 'radial-gradient(circle at 30% 25%, #2f3a4a 0%, #131a27 58%, #090d14 100%)',
    ambience: '入口风声和岗哨号角此起彼伏。',
    entryRect: { x: 24, y: 48, w: 220, h: 130 },
    stairsUp: { x: 266, y: 74 },
    stairsDown: { x: 890, y: 500 },
    buildAnchors: [
      { x: 320, y: 120, w: 110, h: 76 }, { x: 462, y: 120, w: 110, h: 76 }, { x: 604, y: 120, w: 110, h: 76 }, { x: 746, y: 120, w: 110, h: 76 },
      { x: 320, y: 232, w: 110, h: 76 }, { x: 462, y: 232, w: 110, h: 76 }, { x: 604, y: 232, w: 110, h: 76 }, { x: 746, y: 232, w: 110, h: 76 },
      { x: 320, y: 344, w: 110, h: 76 }, { x: 462, y: 344, w: 110, h: 76 }, { x: 604, y: 344, w: 110, h: 76 }, { x: 746, y: 344, w: 110, h: 76 }
    ],
    patrolPoints: [{ x: 150, y: 240 }, { x: 255, y: 360 }, { x: 460, y: 490 }, { x: 660, y: 475 }, { x: 840, y: 380 }, { x: 860, y: 230 }, { x: 650, y: 80 }, { x: 420, y: 70 }],
    staticObstacles: [{ x: 268, y: 18, w: 26, h: 140 }, { x: 294, y: 18, w: 8, h: 44 }, { x: 294, y: 120, w: 8, h: 38 }],
    guardPosts: [{ x: 82, y: 110 }, { x: 130, y: 148 }, { x: 184, y: 110 }]
  },
  {
    key: 'WORKSHOP',
    title: '工坊层',
    background: 'radial-gradient(circle at 60% 30%, #3a2f2a 0%, #1e1614 55%, #0d0a09 100%)',
    ambience: '铁砧敲击声从工坊深处断续传来。',
    entryRect: { x: 30, y: 38, w: 170, h: 98 },
    stairsUp: { x: 78, y: 94 },
    stairsDown: { x: 914, y: 496 },
    buildAnchors: [
      { x: 240, y: 90, w: 120, h: 84 }, { x: 384, y: 90, w: 120, h: 84 }, { x: 528, y: 90, w: 120, h: 84 }, { x: 672, y: 90, w: 120, h: 84 },
      { x: 240, y: 206, w: 120, h: 84 }, { x: 384, y: 206, w: 120, h: 84 }, { x: 528, y: 206, w: 120, h: 84 }, { x: 672, y: 206, w: 120, h: 84 },
      { x: 240, y: 322, w: 120, h: 84 }, { x: 384, y: 322, w: 120, h: 84 }, { x: 528, y: 322, w: 120, h: 84 }, { x: 672, y: 322, w: 120, h: 84 }
    ],
    patrolPoints: [{ x: 150, y: 260 }, { x: 290, y: 470 }, { x: 520, y: 500 }, { x: 780, y: 460 }, { x: 900, y: 300 }, { x: 820, y: 140 }, { x: 560, y: 64 }, { x: 300, y: 72 }],
    staticObstacles: [{ x: 214, y: 52, w: 12, h: 450 }, { x: 822, y: 52, w: 12, h: 450 }],
    guardPosts: [{ x: 126, y: 142 }, { x: 174, y: 100 }]
  },
  {
    key: 'CAVERN',
    title: '蓄水洞厅',
    background: 'radial-gradient(circle at 45% 20%, #274144 0%, #102426 60%, #071113 100%)',
    ambience: '洞厅潮湿，水滴回声让脚步显得更重。',
    entryRect: { x: 34, y: 56, w: 154, h: 86 },
    stairsUp: { x: 84, y: 104 },
    stairsDown: { x: 904, y: 486 },
    buildAnchors: [
      { x: 228, y: 92, w: 126, h: 74 }, { x: 374, y: 86, w: 126, h: 74 }, { x: 520, y: 92, w: 126, h: 74 }, { x: 666, y: 104, w: 126, h: 74 },
      { x: 228, y: 218, w: 126, h: 74 }, { x: 374, y: 220, w: 126, h: 74 }, { x: 520, y: 218, w: 126, h: 74 }, { x: 666, y: 228, w: 126, h: 74 },
      { x: 228, y: 346, w: 126, h: 74 }, { x: 374, y: 354, w: 126, h: 74 }, { x: 520, y: 346, w: 126, h: 74 }, { x: 666, y: 356, w: 126, h: 74 }
    ],
    patrolPoints: [{ x: 140, y: 280 }, { x: 260, y: 420 }, { x: 440, y: 500 }, { x: 650, y: 490 }, { x: 840, y: 430 }, { x: 902, y: 288 }, { x: 812, y: 138 }, { x: 566, y: 54 }, { x: 306, y: 76 }],
    staticObstacles: [{ x: 438, y: 266, w: 112, h: 42 }, { x: 450, y: 318, w: 90, h: 26 }],
    guardPosts: [{ x: 116, y: 116 }, { x: 154, y: 148 }]
  },
  {
    key: 'DEEP_CORE',
    title: '深层中枢',
    background: 'radial-gradient(circle at 52% 26%, #3b2a45 0%, #191224 60%, #0a0812 100%)',
    ambience: '深层能源核心低鸣，空气里有微弱电流味。',
    entryRect: { x: 26, y: 44, w: 166, h: 94 },
    stairsUp: { x: 84, y: 94 },
    stairsDown: { x: 910, y: 492 },
    buildAnchors: [
      { x: 250, y: 98, w: 118, h: 78 }, { x: 394, y: 98, w: 118, h: 78 }, { x: 538, y: 98, w: 118, h: 78 }, { x: 682, y: 98, w: 118, h: 78 },
      { x: 250, y: 216, w: 118, h: 78 }, { x: 394, y: 216, w: 118, h: 78 }, { x: 538, y: 216, w: 118, h: 78 }, { x: 682, y: 216, w: 118, h: 78 },
      { x: 250, y: 334, w: 118, h: 78 }, { x: 394, y: 334, w: 118, h: 78 }, { x: 538, y: 334, w: 118, h: 78 }, { x: 682, y: 334, w: 118, h: 78 }
    ],
    patrolPoints: [{ x: 132, y: 252 }, { x: 272, y: 452 }, { x: 496, y: 510 }, { x: 722, y: 476 }, { x: 886, y: 360 }, { x: 900, y: 210 }, { x: 742, y: 78 }, { x: 498, y: 56 }, { x: 268, y: 78 }],
    staticObstacles: [{ x: 486, y: 256, w: 20, h: 72 }, { x: 466, y: 278, w: 60, h: 20 }],
    guardPosts: [{ x: 110, y: 112 }, { x: 148, y: 150 }, { x: 188, y: 112 }]
  }
];

const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));
const rand = (min: number, max: number) => min + Math.random() * (max - min);

const pointBlocked = (p: { x: number; y: number }, obstacles: Obstacle[], pad = 2) => {
  if (p.x < 10 || p.y < 10 || p.x > MAP_W - 10 || p.y > MAP_H - 10) return true;
  for (const o of obstacles) {
    if (p.x >= o.x - pad && p.x <= o.x + o.w + pad && p.y >= o.y - pad && p.y <= o.y + o.h + pad) return true;
  }
  return false;
};

const segmentBlocked = (a: { x: number; y: number }, b: { x: number; y: number }, obstacles: Obstacle[]) => {
  const d = Math.hypot(b.x - a.x, b.y - a.y);
  const steps = Math.max(2, Math.ceil(d / 12));
  for (let i = 1; i <= steps; i++) {
    const t = i / steps;
    const p = { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
    if (pointBlocked(p, obstacles, 1.5)) return true;
  }
  return false;
};

const keyOf = (x: number, y: number) => `${x},${y}`;

const buildPath = (start: { x: number; y: number }, end: { x: number; y: number }, obstacles: Obstacle[]) => {
  const target = { x: clamp(end.x, 14, MAP_W - 14), y: clamp(end.y, 14, MAP_H - 14) };
  if (!pointBlocked(target, obstacles) && !segmentBlocked(start, target, obstacles)) return [target];
  const cols = Math.floor(MAP_W / GRID);
  const rows = Math.floor(MAP_H / GRID);
  const toCell = (p: { x: number; y: number }) => ({
    cx: clamp(Math.floor(p.x / GRID), 0, cols - 1),
    cy: clamp(Math.floor(p.y / GRID), 0, rows - 1)
  });
  const toPoint = (cx: number, cy: number) => ({ x: cx * GRID + GRID / 2, y: cy * GRID + GRID / 2 });
  const s = toCell(start);
  const e = toCell(target);
  const q: Array<{ cx: number; cy: number }> = [{ cx: s.cx, cy: s.cy }];
  const seen = new Set<string>([keyOf(s.cx, s.cy)]);
  const parent = new Map<string, string>();
  const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]];
  let found = false;
  while (q.length > 0) {
    const cur = q.shift()!;
    if (cur.cx === e.cx && cur.cy === e.cy) {
      found = true;
      break;
    }
    for (const [dx, dy] of dirs) {
      const nx = cur.cx + dx;
      const ny = cur.cy + dy;
      if (nx < 0 || ny < 0 || nx >= cols || ny >= rows) continue;
      const nk = keyOf(nx, ny);
      if (seen.has(nk)) continue;
      const p = toPoint(nx, ny);
      if (pointBlocked(p, obstacles, 2)) continue;
      seen.add(nk);
      parent.set(nk, keyOf(cur.cx, cur.cy));
      q.push({ cx: nx, cy: ny });
    }
  }
  if (!found) return [target];
  const chain: Array<{ x: number; y: number }> = [];
  let curKey = keyOf(e.cx, e.cy);
  while (curKey !== keyOf(s.cx, s.cy)) {
    const [cxStr, cyStr] = curKey.split(',');
    const cx = Number(cxStr);
    const cy = Number(cyStr);
    chain.push(toPoint(cx, cy));
    curKey = parent.get(curKey) ?? keyOf(s.cx, s.cy);
  }
  chain.reverse();
  if (chain.length === 0 || Math.hypot(chain[chain.length - 1].x - target.x, chain[chain.length - 1].y - target.y) > 18) chain.push(target);
  return chain;
};

const pickLine = (pool: string[], seed: number) => pool[Math.abs(seed) % Math.max(1, pool.length)] ?? '';

export const HideoutInspectView: React.FC<HideoutInspectViewProps> = ({
  location,
  heroes,
  initialLayerIndex,
  onLayerChange,
  onBackToTown,
  onBackToMap
}) => {
  const hideout = location.hideout;
  const layerCount = hideout?.layers?.length ?? 0;
  const [layerIndex, setLayerIndex] = React.useState(clamp(initialLayerIndex, 0, Math.max(0, layerCount - 1)));
  const layer = hideout?.layers?.[layerIndex];
  const theme = templates[layerIndex % templates.length];
  const guardHero = layer?.guardianHeroId ? (heroes.find(h => h.id === layer.guardianHeroId) ?? null) : null;
  const followedHeroes = heroes.filter(h => h.recruited && h.status !== 'DEAD').slice(0, 4);
  const [playerPos, setPlayerPos] = React.useState({ x: 190, y: 308 });
  const [playerPath, setPlayerPath] = React.useState<Array<{ x: number; y: number }>>([]);
  const [clickMarker, setClickMarker] = React.useState<{ x: number; y: number } | null>(null);
  const [dialogText, setDialogText] = React.useState('进入视察模式。可键盘移动或鼠标点击移动。靠近目标按 E 交互。');
  const [lastTargetId, setLastTargetId] = React.useState('');
  const [tick, setTick] = React.useState(0);
  const [npcStates, setNpcStates] = React.useState<NpcAgent[]>([]);
  const pressedRef = React.useRef<Record<string, boolean>>({});
  const eHandledRef = React.useRef(false);
  const mapRef = React.useRef<HTMLDivElement | null>(null);
  const trailRef = React.useRef<Array<{ x: number; y: number }>>([{ x: 190, y: 308 }]);

  React.useEffect(() => {
    const safe = clamp(initialLayerIndex, 0, Math.max(0, (hideout?.layers?.length ?? 1) - 1));
    setLayerIndex(safe);
  }, [initialLayerIndex, hideout?.layers?.length]);

  React.useEffect(() => {
    onLayerChange(layerIndex);
  }, [layerIndex, onLayerChange]);

  const builtFinished = React.useMemo(() => ([
    ...(layer?.facilitySlots ?? []).map(s => ({ ...s, source: 'facility' as const })),
    ...(layer?.defenseSlots ?? []).map(s => ({ ...s, source: 'defense' as const }))
  ]), [layer?.facilitySlots, layer?.defenseSlots]);

  const builtNodes = builtFinished
    .filter(s => !!s.type && (!s.daysLeft || s.daysLeft <= 0))
    .slice(0, theme.buildAnchors.length)
    .map((s, i) => ({
      id: `built_${i}_${s.type}`,
      type: s.type as string,
      label: buildingLabelMap[s.type as string] ?? String(s.type),
      ...(theme.buildAnchors[i] ?? { x: 320, y: 120, w: 100, h: 72 })
    }));

  const constructingNodes = builtFinished
    .filter(s => !!s.type && !!s.daysLeft && s.daysLeft > 0)
    .slice(0, theme.buildAnchors.length)
    .map((s, i) => ({
      id: `construct_${i}_${s.type}`,
      type: s.type as string,
      daysLeft: Math.max(1, Math.floor(s.daysLeft ?? 1)),
      ...(theme.buildAnchors[i] ?? { x: 320, y: 120, w: 100, h: 72 })
    }));

  const builtRects: Obstacle[] = builtNodes.map(n => ({ x: n.x - 2, y: n.y - 2, w: n.w + 4, h: n.h + 4 }));
  const constructRects: Obstacle[] = constructingNodes.map(n => ({ x: n.x - 2, y: n.y - 2, w: n.w + 4, h: n.h + 4 }));
  const staticObstacles: Obstacle[] = [theme.entryRect, ...theme.staticObstacles, ...builtRects, ...constructRects];

  const garrisonCount = (layer?.garrison ?? []).reduce((sum, t) => sum + (t.count ?? 0), 0);
  const guardCount = Math.max(1, Math.min(4, Math.floor(garrisonCount / 90) + 1));
  const patrolCount = Math.max(3, Math.min(10, Math.floor(garrisonCount / 40) + 2));
  const workerCount = Math.max(1, Math.min(4, Math.ceil((builtNodes.length + constructingNodes.length) / 4)));

  React.useEffect(() => {
    const guards: NpcAgent[] = Array.from({ length: guardCount }).map((_, i) => {
      const post = theme.guardPosts[i % theme.guardPosts.length] ?? { x: 88 + i * 36, y: 118 };
      return {
        id: `guard_${i}`,
        role: 'GUARD',
        name: `岗哨 ${i + 1}`,
        x: post.x,
        y: post.y,
        r: 8,
        speed: 0,
        target: post,
        wait: 999999,
        movable: false
      };
    });
    const patrols: NpcAgent[] = Array.from({ length: patrolCount }).map((_, i) => {
      const p = theme.patrolPoints[i % theme.patrolPoints.length];
      const next = theme.patrolPoints[(i + 2) % theme.patrolPoints.length];
      return {
        id: `patrol_${i}`,
        role: 'PATROL',
        name: `巡逻兵 ${i + 1}`,
        x: p.x + rand(-12, 12),
        y: p.y + rand(-12, 12),
        r: 7,
        speed: 1.35 + rand(0.2, 0.8),
        target: { x: next.x + rand(-8, 8), y: next.y + rand(-8, 8) },
        wait: Math.floor(rand(15, 90)),
        movable: true
      };
    });
    const workers: NpcAgent[] = Array.from({ length: workerCount }).map((_, i) => {
      const anchor = (constructingNodes[i % Math.max(1, constructingNodes.length)] ?? builtNodes[i % Math.max(1, builtNodes.length)]) ?? theme.buildAnchors[i % theme.buildAnchors.length];
      const tx = anchor.x + anchor.w / 2 + rand(-18, 18);
      const ty = anchor.y + anchor.h + rand(16, 36);
      return {
        id: `worker_${i}`,
        role: 'WORKER',
        name: `工务员 ${i + 1}`,
        x: tx,
        y: ty,
        r: 7,
        speed: 0.95 + rand(0.1, 0.45),
        target: { x: tx, y: ty },
        wait: Math.floor(rand(35, 120)),
        movable: true
      };
    });
    const guardian: NpcAgent[] = guardHero ? [{
      id: `guardian_${guardHero.id}`,
      role: 'GUARDIAN',
      name: `${guardHero.title}${guardHero.name}（守护者）`,
      x: 846,
      y: 462,
      r: 9,
      speed: 0,
      target: { x: 846, y: 462 },
      wait: 999999,
      movable: false
    }] : [];
    setNpcStates([...guards, ...patrols, ...workers, ...guardian]);
    setPlayerPos({ x: clamp(theme.entryRect.x + theme.entryRect.w / 2 + 20, 30, MAP_W - 30), y: clamp(theme.entryRect.y + theme.entryRect.h + 120, 30, MAP_H - 30) });
    setPlayerPath([]);
    setClickMarker(null);
    trailRef.current = [{ x: clamp(theme.entryRect.x + theme.entryRect.w / 2 + 20, 30, MAP_W - 30), y: clamp(theme.entryRect.y + theme.entryRect.h + 120, 30, MAP_H - 30) }];
    setDialogText(`${theme.title}：${theme.ambience}`);
  }, [layerIndex, guardCount, patrolCount, workerCount, guardHero?.id]);

  React.useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      pressedRef.current[e.key.toLowerCase()] = true;
    };
    const onKeyUp = (e: KeyboardEvent) => {
      pressedRef.current[e.key.toLowerCase()] = false;
      if (e.key.toLowerCase() === 'e') eHandledRef.current = false;
    };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, []);

  React.useEffect(() => {
    const timer = setInterval(() => {
      setTick(v => v + 1);
      const keys = pressedRef.current;
      const manual = !!(keys.w || keys.a || keys.s || keys.d || keys.arrowup || keys.arrowleft || keys.arrowdown || keys.arrowright);
      setPlayerPos(prev => {
        let next = { ...prev };
        if (manual) {
          setPlayerPath([]);
          setClickMarker(null);
          const speed = keys.shift ? 5.6 : 3.8;
          let dx = 0;
          let dy = 0;
          if (keys.w || keys.arrowup) dy -= speed;
          if (keys.s || keys.arrowdown) dy += speed;
          if (keys.a || keys.arrowleft) dx -= speed;
          if (keys.d || keys.arrowright) dx += speed;
          const p1 = { x: clamp(prev.x + dx, 10, MAP_W - 10), y: clamp(prev.y + dy, 10, MAP_H - 10) };
          if (!pointBlocked(p1, staticObstacles, 3)) next = p1;
          else {
            const px = { x: clamp(prev.x + dx, 10, MAP_W - 10), y: prev.y };
            const py = { x: prev.x, y: clamp(prev.y + dy, 10, MAP_H - 10) };
            if (!pointBlocked(px, staticObstacles, 3)) next = px;
            else if (!pointBlocked(py, staticObstacles, 3)) next = py;
          }
        } else if (playerPath.length > 0) {
          const cur = playerPath[0];
          const dx = cur.x - prev.x;
          const dy = cur.y - prev.y;
          const d = Math.hypot(dx, dy);
          if (d <= 6) {
            setPlayerPath(path => path.slice(1));
          } else {
            const step = 4.2;
            const p1 = { x: prev.x + (dx / d) * step, y: prev.y + (dy / d) * step };
            if (!pointBlocked(p1, staticObstacles, 3)) next = p1;
            else setPlayerPath([]);
          }
        }
        trailRef.current = [...trailRef.current, next].slice(-160);
        return next;
      });

      setNpcStates(prev => {
        const waypoints = theme.patrolPoints;
        const updated = prev.map(n => {
          if (!n.movable) return n;
          if (n.wait > 0) return { ...n, wait: n.wait - 1 };
          let tx = n.target.x;
          let ty = n.target.y;
          const dx = tx - n.x;
          const dy = ty - n.y;
          const d = Math.hypot(dx, dy);
          if (d <= 8) {
            const picked = waypoints[Math.floor(Math.random() * waypoints.length)] ?? { x: n.x, y: n.y };
            tx = picked.x + rand(-14, 14);
            ty = picked.y + rand(-14, 14);
            return { ...n, target: { x: tx, y: ty }, wait: Math.floor(rand(24, 110)) };
          }
          const nx = n.x + (dx / d) * n.speed;
          const ny = n.y + (dy / d) * n.speed;
          if (pointBlocked({ x: nx, y: ny }, staticObstacles, 2.5)) {
            const picked = waypoints[Math.floor(Math.random() * waypoints.length)] ?? { x: n.x, y: n.y };
            return { ...n, target: { x: picked.x + rand(-12, 12), y: picked.y + rand(-12, 12) }, wait: Math.floor(rand(22, 76)) };
          }
          return { ...n, x: nx, y: ny };
        });
        for (let i = 0; i < updated.length; i++) {
          for (let j = i + 1; j < updated.length; j++) {
            const a = updated[i];
            const b = updated[j];
            if (!a.movable && !b.movable) continue;
            const dx = a.x - b.x;
            const dy = a.y - b.y;
            const d = Math.max(0.001, Math.hypot(dx, dy));
            const minD = a.r + b.r + 2;
            if (d >= minD) continue;
            const overlap = (minD - d) / 2;
            const px = (dx / d) * overlap;
            const py = (dy / d) * overlap;
            const na = { x: clamp(a.x + px, 10, MAP_W - 10), y: clamp(a.y + py, 10, MAP_H - 10) };
            const nb = { x: clamp(b.x - px, 10, MAP_W - 10), y: clamp(b.y - py, 10, MAP_H - 10) };
            if (a.movable && !pointBlocked(na, staticObstacles, 2)) updated[i] = { ...updated[i], x: na.x, y: na.y };
            if (b.movable && !pointBlocked(nb, staticObstacles, 2)) updated[j] = { ...updated[j], x: nb.x, y: nb.y };
          }
        }
        return updated;
      });
    }, 40);
    return () => clearInterval(timer);
  }, [playerPath, staticObstacles, theme.patrolPoints]);

  const heroFollowers = followedHeroes.map((h, i) => {
    const idx = Math.max(0, trailRef.current.length - 1 - (i + 1) * 12);
    const p = trailRef.current[idx] ?? playerPos;
    return {
      id: `hero_follow_${h.id}`,
      role: 'HERO' as Role,
      name: `${h.title}${h.name}`,
      x: p.x - 12 + i * 4,
      y: p.y + 16 + i * 3
    };
  });

  const interactables: Array<{ id: string; kind: 'NPC' | 'STAIRS_UP' | 'STAIRS_DOWN' | 'EXIT'; role?: Role; name: string; x: number; y: number }> = [
    ...npcStates.map(n => ({ id: n.id, kind: 'NPC' as const, role: n.role, name: n.name, x: n.x, y: n.y })),
    ...heroFollowers.map(h => ({ id: h.id, kind: 'NPC' as const, role: h.role, name: h.name, x: h.x, y: h.y })),
    ...(layerIndex > 0 ? [{ id: 'stairs_up', kind: 'STAIRS_UP' as const, name: '上行楼梯', x: theme.stairsUp.x, y: theme.stairsUp.y }] : []),
    ...(layerIndex < layerCount - 1 ? [{ id: 'stairs_down', kind: 'STAIRS_DOWN' as const, name: '下行楼梯', x: theme.stairsDown.x, y: theme.stairsDown.y }] : []),
    ...(layerIndex === 0 ? [{ id: 'entry_exit', kind: 'EXIT' as const, name: '据点入口', x: theme.entryRect.x + theme.entryRect.w * 0.5, y: theme.entryRect.y + theme.entryRect.h * 0.5 }] : [])
  ];

  const nearest = interactables
    .map(it => ({ ...it, dist: Math.hypot(it.x - playerPos.x, it.y - playerPos.y) }))
    .sort((a, b) => a.dist - b.dist)[0] ?? null;

  const canInteract = !!nearest && nearest.dist <= 68;
  const interactHint = !nearest
    ? ''
    : nearest.kind === 'STAIRS_UP'
      ? '按 E 前往上一层'
      : nearest.kind === 'STAIRS_DOWN'
        ? '按 E 前往下一层'
        : nearest.kind === 'EXIT'
          ? '按 E 离开据点'
          : `按 E 与 ${nearest.name} 对话`;

  React.useEffect(() => {
    const ePressed = !!pressedRef.current.e;
    if (!ePressed || !canInteract || !nearest) return;
    if (eHandledRef.current) return;
    eHandledRef.current = true;
    if (nearest.kind === 'STAIRS_UP') {
      setLayerIndex(v => clamp(v - 1, 0, Math.max(0, layerCount - 1)));
      setDialogText('你沿着台阶向上，火把光线渐亮。');
      return;
    }
    if (nearest.kind === 'STAIRS_DOWN') {
      setLayerIndex(v => clamp(v + 1, 0, Math.max(0, layerCount - 1)));
      setDialogText('你顺阶而下，地表噪声逐渐远去。');
      return;
    }
    if (nearest.kind === 'EXIT') {
      setDialogText('你从入口离开据点，返回地表。');
      onBackToMap();
      return;
    }
    const role = nearest.role ?? 'PATROL';
    const pool = roleReplies[role] ?? roleReplies.PATROL;
    const guardianPrefix = role === 'GUARDIAN' && guardHero ? `${guardHero.title}${guardHero.name}压低声音：` : '';
    const line = pickLine(pool, tick + nearest.id.length * 7);
    setDialogText(`${nearest.name}：${guardianPrefix}${line}`);
    setLastTargetId(nearest.id);
  }, [canInteract, nearest, layerCount, tick, guardHero?.id, onBackToMap]);

  const handleClickMove = (event: React.MouseEvent<HTMLDivElement>) => {
    const rect = mapRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    const target = { x: clamp(x, 12, MAP_W - 12), y: clamp(y, 12, MAP_H - 12) };
    setClickMarker(target);
    if (pointBlocked(target, staticObstacles, 2)) {
      setDialogText('该位置无法到达，路径被障碍阻挡。');
      return;
    }
    const path = buildPath(playerPos, target, staticObstacles);
    setPlayerPath(path);
  };

  return (
    <div className="max-w-6xl mx-auto p-4 pt-20 animate-fade-in space-y-4">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h2 className="text-3xl font-serif text-stone-200">隐匿据点视察</h2>
          <div className="text-stone-400 text-sm mt-1">
            {location.name} · 第 {layer?.depth ?? (layerIndex + 1)} 层 {layer?.name ?? theme.title} · 驻军 {garrisonCount}
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={onBackToTown}>返回据点管理</Button>
          <Button variant="secondary" onClick={onBackToMap}>返回地图</Button>
        </div>
      </div>

      <div className="bg-stone-900/60 border border-stone-700 rounded p-3 text-xs text-stone-400">
        W/A/S/D 或方向键移动，Shift 冲刺。鼠标点击可自动寻路。{interactHint ? `靠近后 ${interactHint}。` : '靠近角色、楼梯或入口可交互。'}
      </div>

      <div className="bg-stone-950/80 border border-stone-700 rounded p-3">
        <div
          ref={mapRef}
          className="relative mx-auto border border-stone-700 rounded overflow-hidden cursor-crosshair"
          style={{ width: MAP_W, height: MAP_H, background: theme.background }}
          onClick={handleClickMove}
        >
          <div className="absolute left-8 top-8 text-[11px] text-stone-400">{theme.title}</div>
          <div className="absolute left-8 top-24 text-[10px] text-stone-500">{theme.ambience}</div>

          <div
            className="absolute border border-stone-500/70 bg-stone-900/35 rounded"
            style={{ left: theme.entryRect.x, top: theme.entryRect.y, width: theme.entryRect.w, height: theme.entryRect.h }}
          />
          <div className="absolute text-[11px] text-stone-400" style={{ left: theme.entryRect.x + 8, top: theme.entryRect.y + 6 }}>入口</div>

          {builtNodes.map(n => (
            <div key={n.id} className="absolute rounded border border-emerald-800/80 bg-emerald-950/45"
              style={{ left: n.x, top: n.y, width: n.w, height: n.h }}>
              <div className="w-full h-full flex items-center justify-center text-[11px] text-emerald-300 text-center px-1">{n.label}</div>
            </div>
          ))}

          {constructingNodes.map(n => (
            <div key={n.id} className="absolute rounded border border-amber-700/80 bg-amber-950/25"
              style={{ left: n.x, top: n.y, width: n.w, height: n.h }}>
              <div className="absolute inset-0 bg-[repeating-linear-gradient(45deg,rgba(251,191,36,0.15),rgba(251,191,36,0.15)_8px,transparent_8px,transparent_16px)]" />
              <div className="absolute inset-0 border border-dashed border-amber-500/70 rounded" />
              <div className="absolute left-1 top-1 text-[10px] text-amber-300">{buildingLabelMap[n.type] ?? n.type}</div>
              <div className="absolute right-1 bottom-1 text-[10px] text-amber-200">施工中 · {n.daysLeft}天</div>
            </div>
          ))}

          {npcStates.map(n => (
            <div key={n.id} className="absolute" style={{ left: n.x - n.r, top: n.y - n.r }}>
              <div
                className={`rounded-full border ${n.role === 'GUARD' ? 'bg-cyan-300 border-cyan-100' : n.role === 'PATROL' ? 'bg-amber-300 border-amber-100' : n.role === 'WORKER' ? 'bg-emerald-300 border-emerald-100' : n.role === 'GUARDIAN' ? 'bg-fuchsia-300 border-fuchsia-100' : 'bg-violet-300 border-violet-100'}`}
                style={{ width: n.r * 2, height: n.r * 2 }}
              />
            </div>
          ))}

          {heroFollowers.map(h => (
            <div key={h.id} className="absolute" style={{ left: h.x - 6, top: h.y - 6 }}>
              <div className="w-3 h-3 rounded-full bg-violet-300 border border-violet-100" />
            </div>
          ))}

          {layerIndex > 0 && (
            <div className="absolute" style={{ left: theme.stairsUp.x - 16, top: theme.stairsUp.y - 16 }}>
              <div className="w-8 h-8 rounded border border-stone-300 bg-stone-700/80 text-stone-100 text-[10px] flex items-center justify-center">↑</div>
            </div>
          )}
          {layerIndex < layerCount - 1 && (
            <div className="absolute" style={{ left: theme.stairsDown.x - 16, top: theme.stairsDown.y - 16 }}>
              <div className="w-8 h-8 rounded border border-stone-300 bg-stone-700/80 text-stone-100 text-[10px] flex items-center justify-center">↓</div>
            </div>
          )}

          {layerIndex === 0 && (
            <div className="absolute text-[10px] text-stone-200 bg-black/45 border border-stone-700 rounded px-1 py-0.5"
              style={{ left: theme.entryRect.x + 50, top: theme.entryRect.y + theme.entryRect.h - 16 }}>
              E 离开据点
            </div>
          )}

          <div className="absolute" style={{ left: playerPos.x - PLAYER_SIZE / 2, top: playerPos.y - PLAYER_SIZE / 2 }}>
            <div className="w-[18px] h-[18px] rounded-full bg-red-400 border border-red-100 shadow-[0_0_10px_rgba(248,113,113,0.75)]" />
          </div>

          {clickMarker && (
            <div className="absolute" style={{ left: clickMarker.x - 6, top: clickMarker.y - 6 }}>
              <div className="w-3 h-3 rounded-full bg-white/80 border border-white" />
            </div>
          )}

          {canInteract && nearest && (
            <div className="absolute px-2 py-1 rounded bg-black/70 border border-amber-700 text-[11px] text-amber-300"
              style={{ left: clamp(nearest.x - 60, 8, MAP_W - 190), top: clamp(nearest.y - 34, 8, MAP_H - 30) }}>
              {interactHint}
            </div>
          )}
        </div>
      </div>

      <div className="bg-stone-900/60 border border-stone-700 rounded p-4">
        <div className="text-stone-200 font-semibold mb-1">现场通讯</div>
        <div className="text-sm text-stone-300">{dialogText}</div>
        {lastTargetId && <div className="text-xs text-stone-500 mt-1">最后交互对象：{lastTargetId}</div>}
      </div>
    </div>
  );
};
