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
type LayerTemplate = {
  id: string;
  name: string;
  tint: string;
  waypoints: Array<{ x: number; y: number }>;
  buildingSpots: Array<{ x: number; y: number; w: number; h: number }>;
  stairsUp?: { x: number; y: number };
  stairsDown?: { x: number; y: number };
  entrance?: { x: number; y: number; w: number; h: number };
};
type NpcAgent = {
  id: string;
  role: Role;
  name: string;
  x: number;
  y: number;
  r: number;
  speed: number;
  waitMs: number;
  targetIndex: number;
};

const MAP_W = 980;
const MAP_H = 560;
const PLAYER_SIZE = 18;

const roleReplies: Record<Role, string[]> = {
  GUARD: [
    '岗哨汇报：入口区安全，未发现异常轨迹。',
    '外层通道已清，今晚无人可潜入。',
    '值更刚交接，警戒等级保持在二级。'
  ],
  PATROL: [
    '巡逻路线正常，东侧巷道没有异常。',
    '刚绕完一圈，仓库那边只听见老鼠叫。',
    '巡逻点都打卡了，准备去下个节点。'
  ],
  WORKER: [
    '脚手架还没拆，别靠太近，木梁会掉灰。',
    '工坊材料够了，再给我两天能完工。',
    '施工区域别乱跑，地上有钉子。'
  ],
  HERO: [
    '我跟着你，前面有情况我先上。',
    '队伍状态不错，随时可转入战斗。',
    '你走哪我跟哪，别把我甩丢了。'
  ],
  GUARDIAN: [
    '本层我来守，除非我倒下，否则防线不破。',
    '守护者在位，任何异动我都会第一时间压制。',
    '这层是最后防线，你放心往前指挥。'
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

const layerTemplates: LayerTemplate[] = [
  {
    id: 'ENTRY',
    name: '入口层',
    tint: 'radial-gradient(circle at 30% 20%, #253247 0%, #0d1523 62%, #070b13 100%)',
    waypoints: [
      { x: 170, y: 95 }, { x: 260, y: 120 }, { x: 380, y: 110 }, { x: 520, y: 120 },
      { x: 700, y: 125 }, { x: 845, y: 145 }, { x: 890, y: 260 }, { x: 860, y: 410 },
      { x: 700, y: 470 }, { x: 520, y: 455 }, { x: 360, y: 470 }, { x: 220, y: 450 },
      { x: 120, y: 380 }, { x: 100, y: 240 }
    ],
    buildingSpots: [
      { x: 360, y: 185, w: 98, h: 66 }, { x: 490, y: 185, w: 98, h: 66 }, { x: 620, y: 185, w: 98, h: 66 },
      { x: 360, y: 285, w: 98, h: 66 }, { x: 490, y: 285, w: 98, h: 66 }, { x: 620, y: 285, w: 98, h: 66 },
      { x: 360, y: 385, w: 98, h: 66 }, { x: 490, y: 385, w: 98, h: 66 }, { x: 620, y: 385, w: 98, h: 66 }
    ],
    stairsDown: { x: 890, y: 495 },
    entrance: { x: 58, y: 56, w: 180, h: 110 }
  },
  {
    id: 'COMMON',
    name: '生活层',
    tint: 'radial-gradient(circle at 58% 38%, #1f3a33 0%, #0b1d19 58%, #070f0d 100%)',
    waypoints: [
      { x: 110, y: 130 }, { x: 260, y: 95 }, { x: 430, y: 92 }, { x: 620, y: 102 }, { x: 820, y: 132 },
      { x: 885, y: 260 }, { x: 845, y: 430 }, { x: 680, y: 470 }, { x: 515, y: 468 }, { x: 330, y: 455 }, { x: 170, y: 430 }, { x: 95, y: 282 }
    ],
    buildingSpots: [
      { x: 280, y: 165, w: 98, h: 66 }, { x: 410, y: 165, w: 98, h: 66 }, { x: 540, y: 165, w: 98, h: 66 }, { x: 670, y: 165, w: 98, h: 66 },
      { x: 280, y: 260, w: 98, h: 66 }, { x: 410, y: 260, w: 98, h: 66 }, { x: 540, y: 260, w: 98, h: 66 }, { x: 670, y: 260, w: 98, h: 66 },
      { x: 280, y: 355, w: 98, h: 66 }, { x: 410, y: 355, w: 98, h: 66 }, { x: 540, y: 355, w: 98, h: 66 }, { x: 670, y: 355, w: 98, h: 66 }
    ],
    stairsUp: { x: 100, y: 76 },
    stairsDown: { x: 900, y: 500 }
  },
  {
    id: 'WORKSHOP',
    name: '工坊层',
    tint: 'radial-gradient(circle at 48% 42%, #3b2d1f 0%, #1c140b 58%, #0e0805 100%)',
    waypoints: [
      { x: 120, y: 120 }, { x: 280, y: 100 }, { x: 430, y: 110 }, { x: 610, y: 110 }, { x: 780, y: 130 },
      { x: 860, y: 250 }, { x: 850, y: 425 }, { x: 670, y: 470 }, { x: 480, y: 472 }, { x: 315, y: 455 }, { x: 165, y: 420 }, { x: 95, y: 250 }
    ],
    buildingSpots: [
      { x: 250, y: 150, w: 112, h: 70 }, { x: 390, y: 150, w: 112, h: 70 }, { x: 530, y: 150, w: 112, h: 70 }, { x: 670, y: 150, w: 112, h: 70 },
      { x: 250, y: 252, w: 112, h: 70 }, { x: 390, y: 252, w: 112, h: 70 }, { x: 530, y: 252, w: 112, h: 70 }, { x: 670, y: 252, w: 112, h: 70 },
      { x: 250, y: 354, w: 112, h: 70 }, { x: 390, y: 354, w: 112, h: 70 }, { x: 530, y: 354, w: 112, h: 70 }, { x: 670, y: 354, w: 112, h: 70 }
    ],
    stairsUp: { x: 86, y: 86 },
    stairsDown: { x: 896, y: 496 }
  }
];

const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));
const pick = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

const resolveCircleRect = (x: number, y: number, r: number, rect: { x: number; y: number; w: number; h: number }) => {
  const nx = clamp(x, rect.x, rect.x + rect.w);
  const ny = clamp(y, rect.y, rect.y + rect.h);
  const dx = x - nx;
  const dy = y - ny;
  const d2 = dx * dx + dy * dy;
  if (d2 >= r * r) return { x, y };
  if (d2 <= 0.0001) {
    const left = Math.abs(x - rect.x);
    const right = Math.abs(rect.x + rect.w - x);
    const top = Math.abs(y - rect.y);
    const bottom = Math.abs(rect.y + rect.h - y);
    const m = Math.min(left, right, top, bottom);
    if (m === left) return { x: rect.x - r, y };
    if (m === right) return { x: rect.x + rect.w + r, y };
    if (m === top) return { x, y: rect.y - r };
    return { x, y: rect.y + rect.h + r };
  }
  const d = Math.sqrt(d2);
  const push = r - d;
  return { x: x + (dx / d) * push, y: y + (dy / d) * push };
};

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
  const template = layerTemplates[layerIndex % layerTemplates.length];
  const followedHeroes = heroes.filter(h => h.recruited && h.status !== 'DEAD').slice(0, 3);
  const guardHero = layer?.guardianHeroId ? (heroes.find(h => h.id === layer.guardianHeroId) ?? null) : null;

  const [playerPos, setPlayerPos] = React.useState<{ x: number; y: number }>({ x: 180, y: 320 });
  const [patrolTick, setPatrolTick] = React.useState(0);
  const [dialogText, setDialogText] = React.useState('巡逻值守中。靠近角色后按 E 可对话，靠近楼梯或入口可交互。');
  const [lastTargetId, setLastTargetId] = React.useState<string>('');
  const [npcs, setNpcs] = React.useState<NpcAgent[]>([]);
  const pressedRef = React.useRef<Record<string, boolean>>({});
  const eHandledRef = React.useRef(false);
  const playerTrailRef = React.useRef<Array<{ x: number; y: number }>>([{ x: 180, y: 320 }]);
  const playerPosRef = React.useRef(playerPos);

  React.useEffect(() => {
    const safe = clamp(initialLayerIndex, 0, Math.max(0, (hideout?.layers?.length ?? 1) - 1));
    setLayerIndex(safe);
  }, [initialLayerIndex, hideout?.layers?.length]);

  React.useEffect(() => {
    onLayerChange(layerIndex);
  }, [layerIndex, onLayerChange]);

  const builtFacilities = (layer?.facilitySlots ?? [])
    .filter(s => !!s.type && (!s.daysLeft || s.daysLeft <= 0))
    .map(s => ({ type: String(s.type), daysLeft: 0 }));
  const builtDefense = (layer?.defenseSlots ?? [])
    .filter(s => !!s.type && (!s.daysLeft || s.daysLeft <= 0))
    .map(s => ({ type: String(s.type), daysLeft: 0 }));
  const buildingQueue = (layer?.facilitySlots ?? [])
    .filter(s => !!s.type && !!s.daysLeft && s.daysLeft > 0)
    .map(s => ({ type: String(s.type), daysLeft: Number(s.daysLeft || 0) }))
    .concat(
      (layer?.defenseSlots ?? [])
        .filter(s => !!s.type && !!s.daysLeft && s.daysLeft > 0)
        .map(s => ({ type: String(s.type), daysLeft: Number(s.daysLeft || 0) }))
    );
  const buildingItems = React.useMemo(() => [...builtFacilities, ...builtDefense, ...buildingQueue], [builtFacilities, builtDefense, buildingQueue]);
  const buildingNodes = React.useMemo(() => buildingItems.slice(0, template.buildingSpots.length).map((item, idx) => {
    const spot = template.buildingSpots[idx];
    const underConstruction = item.daysLeft > 0;
    return {
      id: `building_${idx}_${item.type}`,
      x: spot.x,
      y: spot.y,
      w: spot.w,
      h: spot.h,
      type: item.type,
      underConstruction,
      daysLeft: item.daysLeft,
      label: buildingLabelMap[item.type] ?? item.type
    };
  }), [buildingItems, template]);

  const obstacleRects = React.useMemo(() => buildingNodes.map(b => ({ x: b.x - 2, y: b.y - 2, w: b.w + 4, h: b.h + 4 })), [buildingNodes]);

  React.useEffect(() => {
    playerPosRef.current = playerPos;
  }, [playerPos]);

  React.useEffect(() => {
    const garrisonCount = (layer?.garrison ?? []).reduce((sum, t) => sum + (t.count ?? 0), 0);
    const guardCount = Math.max(2, Math.min(5, Math.floor(garrisonCount / 65) + 2));
    const patrolCount = Math.max(3, Math.min(12, Math.floor(garrisonCount / 30) + 3));
    const workerCount = Math.max(1, Math.min(6, Math.max(1, Math.floor(buildingNodes.length / 3))));

    const make = (id: string, role: Role, name: string, wp: number, r: number, speed: number): NpcAgent => {
      const p = template.waypoints[wp % template.waypoints.length] ?? { x: 140, y: 140 };
      return { id, role, name, x: p.x, y: p.y, r, speed, waitMs: 0, targetIndex: (wp + 1) % template.waypoints.length };
    };

    const next: NpcAgent[] = [];
    for (let i = 0; i < guardCount; i++) next.push(make(`guard_${i}`, 'GUARD', `岗哨 ${i + 1}`, i, 9, 1.8));
    for (let i = 0; i < patrolCount; i++) next.push(make(`patrol_${i}`, 'PATROL', `巡逻兵 ${i + 1}`, i + 3, 8, 2.2));
    for (let i = 0; i < workerCount; i++) next.push(make(`worker_${i}`, 'WORKER', `工务员 ${i + 1}`, i + 5, 8, 1.7));
    if (guardHero) next.push(make(`guardian_${guardHero.id}`, 'GUARDIAN', `${guardHero.title}${guardHero.name}`, template.waypoints.length - 1, 10, 2.0));
    setNpcs(next);
    setDialogText(`进入${template.name}，巡逻系统已切换。`);
    setPlayerPos(template.waypoints[0] ?? { x: 180, y: 320 });
    playerTrailRef.current = [template.waypoints[0] ?? { x: 180, y: 320 }];
  }, [layerIndex, layer?.id, guardHero?.id]);

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
      setPatrolTick(v => v + 1);
      const keys = pressedRef.current;
      const speed = keys.shift ? 8 : 5;
      let dx = 0;
      let dy = 0;
      if (keys.w || keys.arrowup) dy -= speed;
      if (keys.s || keys.arrowdown) dy += speed;
      if (keys.a || keys.arrowleft) dx -= speed;
      if (keys.d || keys.arrowright) dx += speed;

      if (dx !== 0 || dy !== 0) {
        setPlayerPos(prev => {
          let nx = clamp(prev.x + dx, 14, MAP_W - 14);
          let ny = clamp(prev.y + dy, 14, MAP_H - 14);
          for (const rect of obstacleRects) {
            const fixed = resolveCircleRect(nx, ny, PLAYER_SIZE / 2, rect);
            nx = fixed.x;
            ny = fixed.y;
          }
          const next = { x: nx, y: ny };
          playerPosRef.current = next;
          const trail = [...playerTrailRef.current, next];
          playerTrailRef.current = trail.slice(-140);
          return next;
        });
      }

      setNpcs(prev => {
        const moved = prev.map(agent => {
          let x = agent.x;
          let y = agent.y;
          let wait = Math.max(0, agent.waitMs - 45);
          let targetIndex = agent.targetIndex;
          if (wait <= 0) {
            const target = template.waypoints[targetIndex] ?? template.waypoints[0];
            const vx = target.x - x;
            const vy = target.y - y;
            const dist = Math.hypot(vx, vy);
            if (dist < 6) {
              wait = 500 + Math.floor(Math.random() * 1800);
              targetIndex = Math.floor(Math.random() * template.waypoints.length);
            } else {
              const step = Math.min(agent.speed * 2.8, dist);
              x += (vx / dist) * step;
              y += (vy / dist) * step;
            }
          }

          x = clamp(x, 12, MAP_W - 12);
          y = clamp(y, 12, MAP_H - 12);
          for (const rect of obstacleRects) {
            const fixed = resolveCircleRect(x, y, agent.r, rect);
            x = fixed.x;
            y = fixed.y;
          }
          return { ...agent, x, y, waitMs: wait, targetIndex };
        });

        for (let i = 0; i < moved.length; i++) {
          for (let j = i + 1; j < moved.length; j++) {
            const a = moved[i];
            const b = moved[j];
            const dx2 = b.x - a.x;
            const dy2 = b.y - a.y;
            const minD = a.r + b.r + 2;
            const d2 = dx2 * dx2 + dy2 * dy2;
            if (d2 > 0 && d2 < minD * minD) {
              const d = Math.sqrt(d2);
              const push = (minD - d) * 0.5;
              const nx = dx2 / d;
              const ny = dy2 / d;
              a.x = clamp(a.x - nx * push, 12, MAP_W - 12);
              a.y = clamp(a.y - ny * push, 12, MAP_H - 12);
              b.x = clamp(b.x + nx * push, 12, MAP_W - 12);
              b.y = clamp(b.y + ny * push, 12, MAP_H - 12);
            }
          }
        }

        return moved.map(a => {
          const dx2 = a.x - playerPosRef.current.x;
          const dy2 = a.y - playerPosRef.current.y;
          const minD = a.r + PLAYER_SIZE / 2 + 1;
          const d2 = dx2 * dx2 + dy2 * dy2;
          if (d2 <= 0 || d2 >= minD * minD) return a;
          const d = Math.sqrt(d2);
          const push = minD - d;
          return {
            ...a,
            x: clamp(a.x + (dx2 / d) * push, 12, MAP_W - 12),
            y: clamp(a.y + (dy2 / d) * push, 12, MAP_H - 12)
          };
        });
      });
    }, 45);
    return () => clearInterval(timer);
  }, [layerIndex, template, obstacleRects]);

  const heroNodes = followedHeroes.map((h, i) => {
    const trailIndex = Math.max(0, playerTrailRef.current.length - 1 - (i + 1) * 12);
    const p = playerTrailRef.current[trailIndex] ?? playerPos;
    return { id: `hero_${h.id}`, role: 'HERO' as Role, name: `${h.title}${h.name}`, x: p.x - 12 + i * 4, y: p.y + 18 + i * 4 };
  });

  const interactables: Array<{
    id: string;
    kind: 'NPC' | 'STAIRS_UP' | 'STAIRS_DOWN' | 'EXIT';
    role?: Role;
    name: string;
    x: number;
    y: number;
  }> = [
    ...npcs.map(n => ({ id: n.id, kind: 'NPC' as const, role: n.role, name: n.name, x: n.x, y: n.y })),
    ...heroNodes.map(n => ({ id: n.id, kind: 'NPC' as const, role: n.role, name: n.name, x: n.x, y: n.y })),
    ...(template.stairsUp && layerIndex > 0 ? [{ id: 'stairs_up', kind: 'STAIRS_UP' as const, name: '上行楼梯', x: template.stairsUp.x, y: template.stairsUp.y }] : []),
    ...(template.stairsDown && layerIndex < layerCount - 1 ? [{ id: 'stairs_down', kind: 'STAIRS_DOWN' as const, name: '下行楼梯', x: template.stairsDown.x, y: template.stairsDown.y }] : []),
    ...(template.entrance && layerIndex === 0
      ? [{ id: 'exit_hideout', kind: 'EXIT' as const, name: '据点入口', x: template.entrance.x + template.entrance.w * 0.5, y: template.entrance.y + template.entrance.h * 0.5 }]
      : [])
  ];

  const nearest = interactables
    .map(it => ({ ...it, dist: Math.hypot(it.x - playerPos.x, it.y - playerPos.y) }))
    .sort((a, b) => a.dist - b.dist)[0] ?? null;
  const canInteract = !!nearest && nearest.dist <= 64;
  const interactHint = !nearest
    ? ''
    : nearest.kind === 'STAIRS_UP'
      ? '按 E 前往上一层'
      : nearest.kind === 'STAIRS_DOWN'
        ? '按 E 前往下一层'
        : nearest.kind === 'EXIT'
          ? '按 E 离开据点内部'
          : `按 E 与 ${nearest.name} 对话`;

  React.useEffect(() => {
    const ePressed = !!pressedRef.current.e;
    if (!ePressed || !canInteract || !nearest) return;
    if (eHandledRef.current) return;
    eHandledRef.current = true;

    if (nearest.kind === 'STAIRS_UP') {
      setLayerIndex(v => clamp(v - 1, 0, Math.max(0, layerCount - 1)));
      setDialogText('你沿着石阶向上，脚步声在穹顶间回响。');
      return;
    }
    if (nearest.kind === 'STAIRS_DOWN') {
      setLayerIndex(v => clamp(v + 1, 0, Math.max(0, layerCount - 1)));
      setDialogText('你下到更深的层区，空气里多了铁与潮土的味道。');
      return;
    }
    if (nearest.kind === 'EXIT') {
      setDialogText('你从入口离开视察区域，返回据点管理。');
      onBackToTown();
      return;
    }

    const role = nearest.role ?? 'PATROL';
    const pool = roleReplies[role] ?? roleReplies.PATROL;
    const line = pick(pool);
    setDialogText(`${nearest.name}：${line}`);
    setLastTargetId(nearest.id);
  }, [canInteract, nearest, layerCount, onBackToTown]);

  const garrisonCount = (layer?.garrison ?? []).reduce((sum, t) => sum + (t.count ?? 0), 0);

  return (
    <div className="max-w-6xl mx-auto p-4 pt-20 animate-fade-in space-y-4">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h2 className="text-3xl font-serif text-stone-200">隐匿据点视察</h2>
          <div className="text-stone-400 text-sm mt-1">{location.name} · 第 {layer?.depth ?? (layerIndex + 1)} 层 {layer?.name ?? template.name} · 驻军 {garrisonCount}</div>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={onBackToTown}>返回据点管理</Button>
          <Button variant="secondary" onClick={onBackToMap}>返回地图</Button>
        </div>
      </div>

      <div className="bg-stone-900/60 border border-stone-700 rounded p-3 text-xs text-stone-400">
        W/A/S/D 或方向键移动，Shift 冲刺。{interactHint ? `靠近后 ${interactHint}。` : '靠近角色、楼梯或入口后可交互。'}
      </div>

      <div className="bg-stone-950/80 border border-stone-700 rounded p-3">
        <div className="relative mx-auto border border-stone-700 rounded overflow-hidden" style={{ width: MAP_W, height: MAP_H, background: template.tint }}>
          {template.entrance && layerIndex === 0 && (
            <div className="absolute border border-sky-500/70 bg-sky-900/20 rounded" style={{ left: template.entrance.x, top: template.entrance.y, width: template.entrance.w, height: template.entrance.h }}>
              <div className="text-[11px] text-sky-200 px-2 py-1">入口区域（按 E 离开）</div>
            </div>
          )}

          {buildingNodes.map(b => (
            <div key={b.id} className="absolute" style={{ left: b.x, top: b.y, width: b.w, height: b.h }}>
              <div className={`w-full h-full rounded border flex flex-col items-center justify-center text-[11px] px-1 text-center ${b.underConstruction ? 'border-amber-700 bg-amber-950/35 text-amber-300' : 'border-emerald-900/80 bg-emerald-950/30 text-emerald-300'}`}>
                <div>{b.label}</div>
                {b.underConstruction && <div className="text-[10px] text-amber-200 mt-1">脚手架 · 剩余{b.daysLeft}天</div>}
              </div>
            </div>
          ))}

          {template.waypoints.map((p, i) => (
            <div key={`wp_${i}`} className="absolute rounded-full bg-stone-400/25" style={{ left: p.x - 2, top: p.y - 2, width: 4, height: 4 }} />
          ))}

          {npcs.map(n => (
            <div key={n.id} className="absolute" style={{ left: n.x - n.r, top: n.y - n.r }}>
              <div className={`rounded-full border ${n.role === 'GUARD' ? 'bg-cyan-300 border-cyan-100' : n.role === 'PATROL' ? 'bg-amber-300 border-amber-100' : n.role === 'WORKER' ? 'bg-emerald-300 border-emerald-100' : n.role === 'GUARDIAN' ? 'bg-fuchsia-300 border-fuchsia-100' : 'bg-violet-300 border-violet-100'}`} style={{ width: n.r * 2, height: n.r * 2 }} />
            </div>
          ))}
          {heroNodes.map(n => (
            <div key={n.id} className="absolute" style={{ left: n.x - 7, top: n.y - 7 }}>
              <div className="w-[14px] h-[14px] rounded-full bg-violet-300 border border-violet-100" />
            </div>
          ))}

          {template.stairsUp && layerIndex > 0 && (
            <div className="absolute" style={{ left: template.stairsUp.x - 14, top: template.stairsUp.y - 14 }}>
              <div className="w-8 h-8 rounded border border-stone-300 bg-stone-700/80 text-stone-100 text-[10px] flex items-center justify-center">↑</div>
            </div>
          )}
          {template.stairsDown && layerIndex < layerCount - 1 && (
            <div className="absolute" style={{ left: template.stairsDown.x - 14, top: template.stairsDown.y - 14 }}>
              <div className="w-8 h-8 rounded border border-stone-300 bg-stone-700/80 text-stone-100 text-[10px] flex items-center justify-center">↓</div>
            </div>
          )}

          <div className="absolute" style={{ left: playerPos.x - PLAYER_SIZE / 2, top: playerPos.y - PLAYER_SIZE / 2 }}>
            <div className="w-[18px] h-[18px] rounded-full bg-red-400 border border-red-100 shadow-[0_0_10px_rgba(248,113,113,0.7)]" />
          </div>

          {canInteract && nearest && (
            <div className="absolute px-2 py-1 rounded bg-black/70 border border-amber-700 text-[11px] text-amber-300" style={{ left: clamp(nearest.x - 76, 8, MAP_W - 180), top: clamp(nearest.y - 36, 8, MAP_H - 30) }}>
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
