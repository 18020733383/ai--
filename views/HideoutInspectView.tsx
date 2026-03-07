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

type Role = 'GUARD' | 'PATROL' | 'WORKER' | 'HERO';

const MAP_W = 980;
const MAP_H = 560;
const PLAYER_SIZE = 18;
const PLAYER_SPEED = 4.8;
const CLICK_REACH = 8;
const NPC_BASE_SIZE = 14;

const roleReplyPools: Record<Role, string[]> = {
  GUARD: [
    '岗哨汇报：入口区安全，未发现异常轨迹。',
    '别担心，外层通道我盯着，今晚没人能摸进来。',
    '守门人不是摆设，真有袭击我会第一时间敲钟。',
    '换班前我会再走一遍入口区，保证无死角。',
    '门禁暗号今晚已更新，陌生人进不来。'
  ],
  PATROL: [
    '我在巡逻，顺便数了下砖缝，今天一块都没少。',
    '据点里最近挺安静，就是炊事班又把汤熬糊了。',
    '巡逻路线已经跑熟了，再来一圈就换班。',
    '我刚从下层回来，楼梯口附近一切正常。',
    '今晚湿气重，地面滑，记得慢点跑。'
  ],
  WORKER: [
    '工坊这边还在赶工，别踩到我的图纸。',
    '最近材料够用，建筑进度比上周快不少。',
    '你要是再扩建，记得先给我们腾出仓位。',
    '脚手架别乱碰，昨晚刚加固过。',
    '新一批钢钉到了，明天能再推进一段工期。'
  ],
  HERO: [
    '我跟着你走，真要开打我会先顶上去。',
    '这层防线没问题，队伍士气也还不错。',
    '休整得差不多了，随时可以出去狠狠干一票。',
    '地形我都记熟了，有事我先去探路。',
    '只要你点头，我就带人去清理外层。'
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

const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));
const rand = (min: number, max: number) => min + Math.random() * (max - min);

type Point = { x: number; y: number };
type Rect = { x: number; y: number; w: number; h: number };
type NpcState = {
  id: string;
  role: Exclude<Role, 'HERO'>;
  name: string;
  x: number;
  y: number;
  radius: number;
  speed: number;
  target: Point;
  waitMs: number;
  moodSeed: number;
};

const pushOutOfRect = (p: Point, r: number, rect: Rect): Point => {
  const nearestX = clamp(p.x, rect.x, rect.x + rect.w);
  const nearestY = clamp(p.y, rect.y, rect.y + rect.h);
  const dx = p.x - nearestX;
  const dy = p.y - nearestY;
  const d2 = dx * dx + dy * dy;
  if (d2 >= r * r) return p;
  if (d2 <= 0.0001) {
    const left = Math.abs(p.x - rect.x);
    const right = Math.abs(rect.x + rect.w - p.x);
    const top = Math.abs(p.y - rect.y);
    const bottom = Math.abs(rect.y + rect.h - p.y);
    const m = Math.min(left, right, top, bottom);
    if (m === left) return { x: rect.x - r, y: p.y };
    if (m === right) return { x: rect.x + rect.w + r, y: p.y };
    if (m === top) return { x: p.x, y: rect.y - r };
    return { x: p.x, y: rect.y + rect.h + r };
  }
  const d = Math.sqrt(d2);
  const k = (r - d) / d;
  return { x: p.x + dx * k, y: p.y + dy * k };
};

const collidePoint = (p: Point, radius: number, obstacles: Rect[]): Point => {
  let out = {
    x: clamp(p.x, 20, MAP_W - 20),
    y: clamp(p.y, 20, MAP_H - 20)
  };
  for (let i = 0; i < obstacles.length; i++) out = pushOutOfRect(out, radius, obstacles[i]);
  out.x = clamp(out.x, 20, MAP_W - 20);
  out.y = clamp(out.y, 20, MAP_H - 20);
  return out;
};

const dist = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y);
const moveToward = (from: Point, to: Point, step: number): Point => {
  const d = dist(from, to);
  if (d <= step || d < 0.0001) return { x: to.x, y: to.y };
  const ux = (to.x - from.x) / d;
  const uy = (to.y - from.y) / d;
  return { x: from.x + ux * step, y: from.y + uy * step };
};

const resolveUnitCollisions = (units: Array<{ x: number; y: number; radius: number }>) => {
  for (let iter = 0; iter < 2; iter++) {
    for (let i = 0; i < units.length; i++) {
      for (let j = i + 1; j < units.length; j++) {
        const a = units[i];
        const b = units[j];
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const d = Math.hypot(dx, dy);
        const minD = a.radius + b.radius;
        if (d >= minD || d < 0.0001) continue;
        const push = (minD - d) * 0.5;
        const ux = dx / d;
        const uy = dy / d;
        a.x -= ux * push;
        a.y -= uy * push;
        b.x += ux * push;
        b.y += uy * push;
      }
    }
  }
};

const buildLayerTheme = (layerIndex: number): {
  name: string;
  tint: string;
  floor: string;
  waypoints: Point[];
  anchors: Array<{ x: number; y: number; text: string }>;
  entryZone: Rect;
} => {
  const presets = [
    {
      name: '入口前厅',
      tint: 'rgba(34,197,94,0.18)',
      floor: 'radial-gradient(circle at 35% 35%, #1f2937 0%, #121826 55%, #0a101c 100%)',
      waypoints: [{ x: 140, y: 130 }, { x: 270, y: 190 }, { x: 480, y: 200 }, { x: 680, y: 260 }, { x: 860, y: 410 }, { x: 420, y: 430 }],
      anchors: [{ x: 70, y: 64, text: '入口' }, { x: 830, y: 520, text: '后勤区' }],
      entryZone: { x: 36, y: 36, w: 170, h: 110 }
    },
    {
      name: '训练层',
      tint: 'rgba(59,130,246,0.18)',
      floor: 'radial-gradient(circle at 50% 30%, #243244 0%, #121826 56%, #0a1018 100%)',
      waypoints: [{ x: 120, y: 230 }, { x: 300, y: 130 }, { x: 520, y: 110 }, { x: 820, y: 150 }, { x: 840, y: 380 }, { x: 520, y: 450 }, { x: 260, y: 410 }],
      anchors: [{ x: 80, y: 74, text: '训练场' }, { x: 780, y: 74, text: '器械区' }],
      entryZone: { x: 42, y: 52, w: 138, h: 100 }
    },
    {
      name: '工坊层',
      tint: 'rgba(245,158,11,0.16)',
      floor: 'radial-gradient(circle at 40% 45%, #2f2a1f 0%, #191821 58%, #0a0f17 100%)',
      waypoints: [{ x: 180, y: 120 }, { x: 360, y: 120 }, { x: 560, y: 160 }, { x: 780, y: 220 }, { x: 860, y: 450 }, { x: 570, y: 470 }, { x: 300, y: 430 }],
      anchors: [{ x: 78, y: 74, text: '仓储区' }, { x: 800, y: 506, text: '熔炉区' }],
      entryZone: { x: 36, y: 36, w: 160, h: 108 }
    }
  ];
  return presets[layerIndex % presets.length];
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
  const layerTheme = React.useMemo(() => buildLayerTheme(layerIndex), [layerIndex]);
  const guardHero = layer?.guardianHeroId ? (heroes.find(h => h.id === layer.guardianHeroId) ?? null) : null;
  const followedHeroes = heroes.filter(h => h.recruited && h.status !== 'DEAD').slice(0, 3);
  const [playerPos, setPlayerPos] = React.useState({ x: 180, y: 320 });
  const [dialogText, setDialogText] = React.useState('巡逻值守中。靠近角色后按 E 可对话，靠近楼梯可上下层。');
  const [lastTargetId, setLastTargetId] = React.useState<string>('');
  const [clickTarget, setClickTarget] = React.useState<Point | null>(null);
  const [npcStates, setNpcStates] = React.useState<NpcState[]>([]);
  const pressedRef = React.useRef<Record<string, boolean>>({});
  const eHandledRef = React.useRef(false);
  const playerTrailRef = React.useRef<Array<{ x: number; y: number }>>([{ x: 180, y: 320 }]);
  const mapRef = React.useRef<HTMLDivElement | null>(null);

  React.useEffect(() => {
    const safe = clamp(initialLayerIndex, 0, Math.max(0, (hideout?.layers?.length ?? 1) - 1));
    setLayerIndex(safe);
  }, [initialLayerIndex, hideout?.layers?.length]);

  React.useEffect(() => {
    onLayerChange(layerIndex);
  }, [layerIndex, onLayerChange]);

  const builtFacilitySlots = (layer?.facilitySlots ?? []).filter(s => !!s.type);
  const builtDefenseSlots = (layer?.defenseSlots ?? []).filter(s => !!s.type);
  const allSlots = [...builtFacilitySlots, ...builtDefenseSlots];
  const finishedTypes = allSlots.filter(s => !s.daysLeft || s.daysLeft <= 0).map(s => s.type as string);
  const constructingSlots = allSlots.filter(s => (s.daysLeft ?? 0) > 0).slice(0, 8);
  const buildingNodes = finishedTypes.slice(0, 12).map((type, idx) => {
    const col = idx % 4;
    const row = Math.floor(idx / 4);
    return {
      id: `building_${idx}_${type}`,
      x: 330 + col * 134,
      y: 116 + row * 114,
      w: 90,
      h: 62,
      label: buildingLabelMap[type] ?? type
    };
  });
  const buildingObstacles: Rect[] = buildingNodes.map(n => ({ x: n.x - 6, y: n.y - 6, w: n.w + 12, h: n.h + 12 }));
  const constructionNodes = constructingSlots.map((slot, idx) => {
    const col = idx % 4;
    const row = Math.floor(idx / 4);
    return {
      id: `construct_${idx}_${slot.type}`,
      x: 330 + col * 134,
      y: 404 + row * 72,
      w: 90,
      h: 52,
      type: String(slot.type ?? ''),
      daysLeft: slot.daysLeft ?? 1
    };
  });

  const stairUp = layerIndex > 0 ? { x: 220, y: 70 } : null;
  const stairDown = layerIndex < layerCount - 1 ? { x: 880, y: 500 } : null;
  const exitNode = layerIndex === 0 ? { x: layerTheme.entryZone.x + 78, y: layerTheme.entryZone.y + 52 } : null;

  const staticObstacles: Rect[] = [
    layerTheme.entryZone,
    ...buildingObstacles,
    ...(stairUp ? [{ x: stairUp.x - 10, y: stairUp.y - 10, w: 28, h: 28 }] : []),
    ...(stairDown ? [{ x: stairDown.x - 10, y: stairDown.y - 10, w: 28, h: 28 }] : [])
  ];

  React.useEffect(() => {
    const garrisonCount = (layer?.garrison ?? []).reduce((sum, t) => sum + (t.count ?? 0), 0);
    const guardCount = Math.max(2, Math.min(5, Math.floor(garrisonCount / 80) + 2));
    const patrolCount = Math.max(3, Math.min(10, Math.floor(garrisonCount / 32) + 3));
    const workerCount = Math.max(1, Math.min(5, constructionNodes.length > 0 ? constructionNodes.length : Math.max(1, Math.floor(buildingNodes.length / 3))));
    const guardList: NpcState[] = Array.from({ length: guardCount }).map((_, i) => {
      const anchor = { x: 120 + (i % 3) * 42, y: 170 + Math.floor(i / 3) * 34 };
      return {
        id: `guard_${i}`,
        role: 'GUARD',
        name: `岗哨 ${i + 1}`,
        x: anchor.x,
        y: anchor.y,
        radius: NPC_BASE_SIZE / 2,
        speed: 0.6 + Math.random() * 0.4,
        target: anchor,
        waitMs: 700 + Math.random() * 900,
        moodSeed: Math.floor(Math.random() * 999999)
      };
    });
    const patrolList: NpcState[] = Array.from({ length: patrolCount }).map((_, i) => {
      const startWp = layerTheme.waypoints[i % layerTheme.waypoints.length];
      const targetWp = layerTheme.waypoints[(i + 1) % layerTheme.waypoints.length];
      return {
        id: `patrol_${i}`,
        role: 'PATROL',
        name: `巡逻兵 ${i + 1}`,
        x: startWp.x + rand(-16, 16),
        y: startWp.y + rand(-16, 16),
        radius: NPC_BASE_SIZE / 2,
        speed: 1.3 + Math.random() * 0.7,
        target: { x: targetWp.x + rand(-20, 20), y: targetWp.y + rand(-20, 20) },
        waitMs: 300 + Math.random() * 700,
        moodSeed: Math.floor(Math.random() * 999999)
      };
    });
    const workerList: NpcState[] = Array.from({ length: workerCount }).map((_, i) => {
      const base = (constructionNodes[i % Math.max(1, constructionNodes.length)] ?? buildingNodes[i % Math.max(1, buildingNodes.length)] ?? { x: 500, y: 300 });
      return {
        id: `worker_${i}`,
        role: 'WORKER',
        name: `工务员 ${i + 1}`,
        x: base.x + rand(-18, 18),
        y: base.y + rand(-16, 16),
        radius: NPC_BASE_SIZE / 2,
        speed: 1.1 + Math.random() * 0.5,
        target: { x: base.x + rand(-22, 22), y: base.y + rand(-18, 18) },
        waitMs: 800 + Math.random() * 1200,
        moodSeed: Math.floor(Math.random() * 999999)
      };
    });
    setNpcStates([...guardList, ...patrolList, ...workerList]);
    const nextPlayer = collidePoint({ x: 190, y: 330 }, PLAYER_SIZE / 2, staticObstacles);
    setPlayerPos(nextPlayer);
    setClickTarget(null);
    playerTrailRef.current = [nextPlayer];
  }, [layerIndex, layer?.id]);

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
      const keys = pressedRef.current;
      const speed = (keys.shift ? PLAYER_SPEED * 1.45 : PLAYER_SPEED);
      let dx = 0;
      let dy = 0;
      if (keys.w || keys.arrowup) dy -= speed;
      if (keys.s || keys.arrowdown) dy += speed;
      if (keys.a || keys.arrowleft) dx -= speed;
      if (keys.d || keys.arrowright) dx += speed;
      let manualMoved = false;
      if (Math.abs(dx) > 0 || Math.abs(dy) > 0) {
        setClickTarget(null);
        manualMoved = true;
      }
      setPlayerPos(prev => {
        let next = prev;
        if (manualMoved) {
          next = collidePoint({ x: prev.x + dx, y: prev.y + dy }, PLAYER_SIZE / 2, staticObstacles);
        } else if (clickTarget) {
          const toward = moveToward(prev, clickTarget, PLAYER_SPEED);
          next = collidePoint(toward, PLAYER_SIZE / 2, staticObstacles);
          if (dist(next, clickTarget) <= CLICK_REACH) setClickTarget(null);
        }
        if (next.x !== prev.x || next.y !== prev.y) {
          const trail = [...playerTrailRef.current, next];
          playerTrailRef.current = trail.slice(-140);
        }
        return next;
      });

      setNpcStates(prev => {
        const updated = prev.map(npc => {
          let next = { ...npc };
          if (next.waitMs > 0) {
            next.waitMs = Math.max(0, next.waitMs - 45);
            if (next.role === 'GUARD' && Math.random() < 0.02) {
              next.target = { x: 110 + rand(0, 130), y: 160 + rand(0, 90) };
            }
          } else {
            const moved = moveToward({ x: next.x, y: next.y }, next.target, next.speed);
            const fixed = collidePoint(moved, next.radius, staticObstacles);
            next.x = fixed.x;
            next.y = fixed.y;
            if (dist(next, next.target) < 7) {
              const wp = layerTheme.waypoints[Math.floor(Math.random() * layerTheme.waypoints.length)];
              if (next.role === 'WORKER') {
                const work = constructionNodes[Math.floor(Math.random() * Math.max(1, constructionNodes.length))] ?? buildingNodes[Math.floor(Math.random() * Math.max(1, buildingNodes.length))];
                if (work) next.target = { x: work.x + rand(8, 70), y: work.y + rand(8, 40) };
                else next.target = { x: wp.x + rand(-20, 20), y: wp.y + rand(-20, 20) };
                next.waitMs = 700 + Math.random() * 1200;
              } else if (next.role === 'GUARD') {
                next.target = { x: 110 + rand(0, 130), y: 160 + rand(0, 90) };
                next.waitMs = 500 + Math.random() * 900;
              } else {
                next.target = { x: wp.x + rand(-22, 22), y: wp.y + rand(-22, 22) };
                next.waitMs = 420 + Math.random() * 900;
              }
            }
          }
          return next;
        });
        const units = updated.map(n => ({ x: n.x, y: n.y, radius: n.radius }));
        resolveUnitCollisions(units);
        return updated.map((n, i) => {
          const fixed = collidePoint({ x: units[i].x, y: units[i].y }, n.radius, staticObstacles);
          return { ...n, x: fixed.x, y: fixed.y };
        });
      });
    }, 45);
    return () => clearInterval(timer);
  }, [clickTarget, staticObstacles, layerTheme, constructionNodes, buildingNodes]);

  const heroNodes = followedHeroes.map((h, i) => {
    const trailIndex = Math.max(0, playerTrailRef.current.length - 1 - (i + 1) * 10);
    const p = playerTrailRef.current[trailIndex] ?? playerPos;
    return {
      id: `hero_${h.id}`,
      role: 'HERO' as Role,
      name: `${h.title}${h.name}`,
      x: p.x - 18 + i * 4,
      y: p.y + 20 + i * 3
    };
  });
  const guardNodes = npcStates.filter(n => n.role === 'GUARD');
  const patrolNodes = npcStates.filter(n => n.role === 'PATROL');
  const workerNodes = npcStates.filter(n => n.role === 'WORKER');
  const garrisonCount = (layer?.garrison ?? []).reduce((sum, t) => sum + (t.count ?? 0), 0);

  const interactables: Array<{
    id: string;
    kind: 'NPC' | 'STAIRS_UP' | 'STAIRS_DOWN' | 'EXIT';
    role?: Role;
    name: string;
    x: number;
    y: number;
  }> = [
    ...guardNodes.map(n => ({ ...n, kind: 'NPC' as const })),
    ...patrolNodes.map(n => ({ ...n, kind: 'NPC' as const })),
    ...workerNodes.map(n => ({ ...n, kind: 'NPC' as const })),
    ...(guardHero ? [{ id: `guardian_${guardHero.id}`, kind: 'NPC' as const, role: 'HERO' as Role, name: `${guardHero.title}${guardHero.name}（守护者）`, x: 820, y: 460 }] : []),
    ...heroNodes.map(n => ({ ...n, kind: 'NPC' as const })),
    ...(stairUp ? [{ id: 'stairs_up', kind: 'STAIRS_UP' as const, name: '上行楼梯', x: stairUp.x, y: stairUp.y }] : []),
    ...(stairDown ? [{ id: 'stairs_down', kind: 'STAIRS_DOWN' as const, name: '下行楼梯', x: stairDown.x, y: stairDown.y }] : []),
    ...(exitNode ? [{ id: 'exit_gate', kind: 'EXIT' as const, name: '据点入口', x: exitNode.x, y: exitNode.y }] : [])
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
          ? '按 E 离开据点'
        : `按 E 与 ${nearest.name} 对话`;

  React.useEffect(() => {
    const ePressed = !!pressedRef.current.e;
    if (!ePressed || !canInteract || !nearest) return;
    if (eHandledRef.current) return;
    eHandledRef.current = true;
    if (nearest.kind === 'STAIRS_UP') {
      setLayerIndex(v => clamp(v - 1, 0, Math.max(0, layerCount - 1)));
      setDialogText('你沿着狭窄阶梯向上，空气里有潮湿的尘土味。');
      return;
    }
    if (nearest.kind === 'STAIRS_DOWN') {
      setLayerIndex(v => clamp(v + 1, 0, Math.max(0, layerCount - 1)));
      setDialogText('你踏下石阶，火把摇曳，地下回声更重了。');
      return;
    }
    if (nearest.kind === 'EXIT') {
      setDialogText('你从入口离开隐匿据点，回到了大地图。');
      onBackToMap();
      return;
    }
    const role = nearest.role ?? 'PATROL';
    const pool = roleReplyPools[role] ?? roleReplyPools.PATROL;
    const guardianBonus = (nearest.id.startsWith('guardian_') && role === 'HERO')
      ? ['守护者：这层由我驻守，敌人进来只会留下尸体。', '守护者：我已检查值守名单，夜间轮班正常。']
      : [];
    const mixed = [...pool, ...guardianBonus];
    const seed = Math.abs(nearest.id.split('').reduce((a, c) => a + c.charCodeAt(0), 0)) % mixed.length;
    const line = pool[seed];
    const picked = mixed[seed] ?? mixed[0];
    void line;
    setDialogText(`${nearest.name}：${picked}`);
    setLastTargetId(nearest.id);
  }, [canInteract, nearest, layerCount, onBackToMap]);

  return (
    <div className="max-w-6xl mx-auto p-4 pt-20 animate-fade-in space-y-4">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h2 className="text-3xl font-serif text-stone-200">隐匿据点视察</h2>
          <div className="text-stone-400 text-sm mt-1">
            {location.name} · 第 {layer?.depth ?? (layerIndex + 1)} 层 {layer?.name ?? '未知'} · 驻军 {garrisonCount}
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={onBackToTown}>返回据点管理</Button>
          <Button variant="secondary" onClick={onBackToMap}>返回地图</Button>
        </div>
      </div>

      <div className="bg-stone-900/60 border border-stone-700 rounded p-3 text-xs text-stone-400">
        W/A/S/D 或方向键移动，Shift 冲刺，鼠标左键可点击移动。{interactHint ? `靠近后 ${interactHint}。` : '靠近角色、楼梯或入口后可交互。'}
      </div>

      <div className="bg-stone-950/80 border border-stone-700 rounded p-3">
        <div
          ref={mapRef}
          className="relative mx-auto border border-stone-700 rounded overflow-hidden"
          style={{ width: MAP_W, height: MAP_H, background: layerTheme.floor }}
          onClick={(e) => {
            const box = mapRef.current?.getBoundingClientRect();
            if (!box) return;
            const next = {
              x: clamp(e.clientX - box.left, 20, MAP_W - 20),
              y: clamp(e.clientY - box.top, 20, MAP_H - 20)
            };
            const fixed = collidePoint(next, PLAYER_SIZE / 2, staticObstacles);
            setClickTarget(fixed);
          }}
        >
          <div className="absolute inset-0 pointer-events-none" style={{ background: `radial-gradient(circle at 50% 50%, ${layerTheme.tint} 0%, rgba(0,0,0,0) 70%)` }} />
          {layerTheme.anchors.map((a, idx) => (
            <div key={`anchor_${idx}`} className="absolute text-[11px] text-stone-500" style={{ left: a.x, top: a.y }}>{a.text}</div>
          ))}
          <div className="absolute border border-stone-700/80 bg-stone-950/35 rounded" style={{ left: layerTheme.entryZone.x, top: layerTheme.entryZone.y, width: layerTheme.entryZone.w, height: layerTheme.entryZone.h }} />
          {layerIndex === 0 && (
            <div className="absolute text-[11px] text-emerald-300" style={{ left: layerTheme.entryZone.x + 8, top: layerTheme.entryZone.y + 8 }}>离开入口（E）</div>
          )}

          {buildingNodes.map(b => (
            <div key={b.id} className="absolute" style={{ left: b.x, top: b.y, width: b.w, height: b.h }}>
              <div className="w-full h-full border border-emerald-900/80 bg-emerald-950/30 rounded flex items-center justify-center text-[11px] text-emerald-300 px-1 text-center">
                {b.label}
              </div>
            </div>
          ))}
          {constructionNodes.map(n => (
            <div key={n.id} className="absolute" style={{ left: n.x, top: n.y, width: n.w, height: n.h }}>
              <div className="w-full h-full border border-amber-700/80 bg-amber-950/30 rounded px-2 py-1">
                <div className="text-[10px] text-amber-300 truncate">{buildingLabelMap[n.type] ?? n.type}</div>
                <div className="text-[10px] text-amber-200 mt-1">施工中 · {n.daysLeft}天</div>
                <div className="mt-1 h-1.5 bg-stone-950/70 rounded overflow-hidden">
                  <div className="h-full bg-amber-500" style={{ width: `${clamp((7 - n.daysLeft) * 14, 8, 96)}%` }} />
                </div>
              </div>
            </div>
          ))}

          {guardNodes.map(n => (
            <div key={n.id} className="absolute text-[10px]" style={{ left: n.x, top: n.y }}>
              <div className="w-4 h-4 rounded-full bg-cyan-300 border border-cyan-100" />
            </div>
          ))}
          {patrolNodes.map(n => (
            <div key={n.id} className="absolute text-[10px]" style={{ left: n.x, top: n.y }}>
              <div className="w-3.5 h-3.5 rounded-full bg-amber-300 border border-amber-100" />
            </div>
          ))}
          {workerNodes.map(n => (
            <div key={n.id} className="absolute text-[10px]" style={{ left: n.x, top: n.y }}>
              <div className="w-3.5 h-3.5 rounded-full bg-emerald-300 border border-emerald-100" />
            </div>
          ))}
          {guardHero && (
            <div className="absolute" style={{ left: 820, top: 460 }}>
              <div className="w-5 h-5 rounded-full bg-fuchsia-300 border border-fuchsia-100" />
            </div>
          )}
          {heroNodes.map(n => (
            <div key={n.id} className="absolute" style={{ left: n.x, top: n.y }}>
              <div className="w-4 h-4 rounded-full bg-violet-300 border border-violet-100" />
            </div>
          ))}

          {layerIndex > 0 && (
            <div className="absolute" style={{ left: stairUp!.x, top: stairUp!.y }}>
              <div className="w-8 h-8 rounded border border-stone-300 bg-stone-700/80 text-stone-100 text-[10px] flex items-center justify-center">↑</div>
            </div>
          )}
          {layerIndex < layerCount - 1 && (
            <div className="absolute" style={{ left: stairDown!.x, top: stairDown!.y }}>
              <div className="w-8 h-8 rounded border border-stone-300 bg-stone-700/80 text-stone-100 text-[10px] flex items-center justify-center">↓</div>
            </div>
          )}
          {clickTarget && (
            <div className="absolute pointer-events-none" style={{ left: clickTarget.x - 7, top: clickTarget.y - 7 }}>
              <div className="w-3.5 h-3.5 rounded-full border border-cyan-200 bg-cyan-500/70" />
            </div>
          )}

          <div className="absolute" style={{ left: playerPos.x - PLAYER_SIZE / 2, top: playerPos.y - PLAYER_SIZE / 2 }}>
            <div className="w-[18px] h-[18px] rounded-full bg-red-400 border border-red-100 shadow-[0_0_10px_rgba(248,113,113,0.7)]" />
          </div>

          {canInteract && nearest && (
            <div className="absolute px-2 py-1 rounded bg-black/70 border border-amber-700 text-[11px] text-amber-300"
              style={{ left: clamp(nearest.x - 50, 8, MAP_W - 170), top: clamp(nearest.y - 36, 8, MAP_H - 30) }}>
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
