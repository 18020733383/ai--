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
  bg: string;
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
type SimState = {
  player: { x: number; y: number };
  npcs: NpcAgent[];
  trail: Array<{ x: number; y: number }>;
  patrolTick: number;
};

const MAP_W = 980;
const MAP_H = 560;
const PLAYER_R = 9;

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
    bg: '#0f172a',
    waypoints: [{ x: 160, y: 96 }, { x: 300, y: 90 }, { x: 460, y: 98 }, { x: 640, y: 110 }, { x: 830, y: 128 }, { x: 888, y: 275 }, { x: 838, y: 445 }, { x: 650, y: 470 }, { x: 460, y: 472 }, { x: 280, y: 456 }, { x: 120, y: 420 }, { x: 96, y: 245 }],
    buildingSpots: [{ x: 360, y: 182, w: 98, h: 66 }, { x: 490, y: 182, w: 98, h: 66 }, { x: 620, y: 182, w: 98, h: 66 }, { x: 360, y: 282, w: 98, h: 66 }, { x: 490, y: 282, w: 98, h: 66 }, { x: 620, y: 282, w: 98, h: 66 }, { x: 360, y: 382, w: 98, h: 66 }, { x: 490, y: 382, w: 98, h: 66 }, { x: 620, y: 382, w: 98, h: 66 }],
    stairsDown: { x: 896, y: 500 },
    entrance: { x: 54, y: 56, w: 182, h: 112 }
  },
  {
    id: 'COMMON',
    name: '生活层',
    bg: '#0b1d19',
    waypoints: [{ x: 110, y: 136 }, { x: 250, y: 96 }, { x: 430, y: 90 }, { x: 610, y: 98 }, { x: 800, y: 130 }, { x: 886, y: 276 }, { x: 850, y: 446 }, { x: 670, y: 475 }, { x: 500, y: 474 }, { x: 330, y: 452 }, { x: 152, y: 420 }, { x: 96, y: 260 }],
    buildingSpots: [{ x: 280, y: 164, w: 98, h: 66 }, { x: 410, y: 164, w: 98, h: 66 }, { x: 540, y: 164, w: 98, h: 66 }, { x: 670, y: 164, w: 98, h: 66 }, { x: 280, y: 260, w: 98, h: 66 }, { x: 410, y: 260, w: 98, h: 66 }, { x: 540, y: 260, w: 98, h: 66 }, { x: 670, y: 260, w: 98, h: 66 }, { x: 280, y: 356, w: 98, h: 66 }, { x: 410, y: 356, w: 98, h: 66 }, { x: 540, y: 356, w: 98, h: 66 }, { x: 670, y: 356, w: 98, h: 66 }],
    stairsUp: { x: 94, y: 82 },
    stairsDown: { x: 900, y: 500 }
  },
  {
    id: 'WORKSHOP',
    name: '工坊层',
    bg: '#1c140b',
    waypoints: [{ x: 115, y: 120 }, { x: 280, y: 100 }, { x: 440, y: 110 }, { x: 620, y: 112 }, { x: 810, y: 136 }, { x: 892, y: 265 }, { x: 852, y: 438 }, { x: 680, y: 470 }, { x: 490, y: 476 }, { x: 320, y: 455 }, { x: 160, y: 428 }, { x: 98, y: 248 }],
    buildingSpots: [{ x: 250, y: 150, w: 112, h: 70 }, { x: 390, y: 150, w: 112, h: 70 }, { x: 530, y: 150, w: 112, h: 70 }, { x: 670, y: 150, w: 112, h: 70 }, { x: 250, y: 252, w: 112, h: 70 }, { x: 390, y: 252, w: 112, h: 70 }, { x: 530, y: 252, w: 112, h: 70 }, { x: 670, y: 252, w: 112, h: 70 }, { x: 250, y: 354, w: 112, h: 70 }, { x: 390, y: 354, w: 112, h: 70 }, { x: 530, y: 354, w: 112, h: 70 }, { x: 670, y: 354, w: 112, h: 70 }],
    stairsUp: { x: 88, y: 88 },
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
  if (d2 <= 0.0001) return { x: rect.x - r - 1, y };
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
  const [dialogText, setDialogText] = React.useState('巡逻值守中。靠近角色后按 E 可对话，靠近楼梯或入口可交互。');
  const [lastTargetId, setLastTargetId] = React.useState<string>('');
  const [interactHint, setInteractHint] = React.useState('');

  const canvasRef = React.useRef<HTMLCanvasElement | null>(null);
  const pressedRef = React.useRef<Record<string, boolean>>({});
  const eHandledRef = React.useRef(false);
  const nearestRef = React.useRef<{ id: string; kind: 'NPC' | 'STAIRS_UP' | 'STAIRS_DOWN' | 'EXIT'; role?: Role; name: string } | null>(null);
  const simRef = React.useRef<SimState>({ player: { x: 180, y: 320 }, npcs: [], trail: [{ x: 180, y: 320 }], patrolTick: 0 });
  const rafRef = React.useRef<number | null>(null);
  const lastFrameRef = React.useRef<number>(0);
  const hintRef = React.useRef('');
  const layerRef = React.useRef(0);
  const layerCountRef = React.useRef(0);

  const layer = hideout?.layers?.[layerIndex];
  const template = layerTemplates[layerIndex % layerTemplates.length];
  const followedHeroes = heroes.filter(h => h.recruited && h.status !== 'DEAD').slice(0, 3);
  const guardHero = layer?.guardianHeroId ? (heroes.find(h => h.id === layer.guardianHeroId) ?? null) : null;
  const garrisonCount = (layer?.garrison ?? []).reduce((sum, t) => sum + (t.count ?? 0), 0);

  const builtFacilities = (layer?.facilitySlots ?? [])
    .filter(s => !!s.type && (!s.daysLeft || s.daysLeft <= 0))
    .map(s => ({ type: String(s.type), daysLeft: 0 }));
  const builtDefense = (layer?.defenseSlots ?? [])
    .filter(s => !!s.type && (!s.daysLeft || s.daysLeft <= 0))
    .map(s => ({ type: String(s.type), daysLeft: 0 }));
  const queue = (layer?.facilitySlots ?? [])
    .filter(s => !!s.type && !!s.daysLeft && s.daysLeft > 0)
    .map(s => ({ type: String(s.type), daysLeft: Number(s.daysLeft || 0) }))
    .concat((layer?.defenseSlots ?? []).filter(s => !!s.type && !!s.daysLeft && s.daysLeft > 0).map(s => ({ type: String(s.type), daysLeft: Number(s.daysLeft || 0) })));
  const buildingItems = [...builtFacilities, ...builtDefense, ...queue];
  const buildingNodes = buildingItems.slice(0, template.buildingSpots.length).map((item, idx) => {
    const spot = template.buildingSpots[idx];
    return { id: `building_${idx}_${item.type}`, x: spot.x, y: spot.y, w: spot.w, h: spot.h, label: buildingLabelMap[item.type] ?? item.type, underConstruction: item.daysLeft > 0, daysLeft: item.daysLeft };
  });
  const obstacleRects = buildingNodes.map(b => ({ x: b.x - 2, y: b.y - 2, w: b.w + 4, h: b.h + 4 }));

  React.useEffect(() => {
    const safe = clamp(initialLayerIndex, 0, Math.max(0, (hideout?.layers?.length ?? 1) - 1));
    setLayerIndex(safe);
  }, [initialLayerIndex, hideout?.layers?.length]);

  React.useEffect(() => {
    onLayerChange(layerIndex);
  }, [layerIndex, onLayerChange]);

  React.useEffect(() => {
    layerRef.current = layerIndex;
    layerCountRef.current = layerCount;
    const guardCount = Math.max(2, Math.min(5, Math.floor(garrisonCount / 65) + 2));
    const patrolCount = Math.max(3, Math.min(12, Math.floor(garrisonCount / 30) + 3));
    const workerCount = Math.max(1, Math.min(6, Math.max(1, Math.floor(buildingNodes.length / 3))));
    const make = (id: string, role: Role, name: string, wp: number, r: number, speed: number): NpcAgent => {
      const p = template.waypoints[wp % template.waypoints.length] ?? { x: 140, y: 140 };
      const startWait = 900 + Math.floor(Math.random() * 2200);
      const jump = 1 + Math.floor(Math.random() * Math.max(2, template.waypoints.length - 1));
      return { id, role, name, x: p.x, y: p.y, r, speed, waitMs: startWait, targetIndex: (wp + jump) % template.waypoints.length };
    };
    const npcs: NpcAgent[] = [];
    for (let i = 0; i < guardCount; i++) npcs.push(make(`guard_${i}`, 'GUARD', `岗哨 ${i + 1}`, i, 9, 1.8));
    for (let i = 0; i < patrolCount; i++) npcs.push(make(`patrol_${i}`, 'PATROL', `巡逻兵 ${i + 1}`, i + 3, 8, 2.25));
    for (let i = 0; i < workerCount; i++) npcs.push(make(`worker_${i}`, 'WORKER', `工务员 ${i + 1}`, i + 5, 8, 1.7));
    if (guardHero) npcs.push(make(`guardian_${guardHero.id}`, 'GUARDIAN', `${guardHero.title}${guardHero.name}`, template.waypoints.length - 1, 10, 2));
    simRef.current = { player: template.waypoints[0] ?? { x: 180, y: 320 }, npcs, trail: [template.waypoints[0] ?? { x: 180, y: 320 }], patrolTick: 0 };
    setDialogText(`进入${template.name}，巡逻系统已切换。`);
  }, [layerIndex, layer?.id, guardHero?.id, garrisonCount, template.id]);

  React.useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      pressedRef.current[e.key.toLowerCase()] = true;
      if (e.key.toLowerCase() === 'e' && !eHandledRef.current) {
        eHandledRef.current = true;
        const nearest = nearestRef.current;
        if (!nearest) return;
        if (nearest.kind === 'STAIRS_UP') {
          setLayerIndex(v => clamp(v - 1, 0, Math.max(0, layerCountRef.current - 1)));
          setDialogText('你沿着石阶向上，脚步声在穹顶间回响。');
          return;
        }
        if (nearest.kind === 'STAIRS_DOWN') {
          setLayerIndex(v => clamp(v + 1, 0, Math.max(0, layerCountRef.current - 1)));
          setDialogText('你下到更深的层区，空气里多了铁与潮土的味道。');
          return;
        }
        if (nearest.kind === 'EXIT') {
          setDialogText('你从入口离开视察区域，返回据点管理。');
          onBackToTown();
          return;
        }
        const role = nearest.role ?? 'PATROL';
        const line = pick(roleReplies[role] ?? roleReplies.PATROL);
        setDialogText(`${nearest.name}：${line}`);
        setLastTargetId(nearest.id);
      }
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
  }, [onBackToTown]);

  React.useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const draw = (s: SimState) => {
      ctx.clearRect(0, 0, MAP_W, MAP_H);
      ctx.fillStyle = template.bg;
      ctx.fillRect(0, 0, MAP_W, MAP_H);

      if (template.entrance && layerRef.current === 0) {
        ctx.fillStyle = 'rgba(14,116,144,0.24)';
        ctx.strokeStyle = 'rgba(56,189,248,0.8)';
        ctx.lineWidth = 1;
        ctx.fillRect(template.entrance.x, template.entrance.y, template.entrance.w, template.entrance.h);
        ctx.strokeRect(template.entrance.x, template.entrance.y, template.entrance.w, template.entrance.h);
        ctx.fillStyle = '#bae6fd';
        ctx.font = '12px sans-serif';
        ctx.fillText('入口区域（按 E 离开）', template.entrance.x + 8, template.entrance.y + 18);
      }

      for (const b of buildingNodes) {
        ctx.fillStyle = b.underConstruction ? 'rgba(120,53,15,0.42)' : 'rgba(6,78,59,0.35)';
        ctx.strokeStyle = b.underConstruction ? 'rgba(217,119,6,0.9)' : 'rgba(6,95,70,0.9)';
        ctx.lineWidth = 1;
        ctx.fillRect(b.x, b.y, b.w, b.h);
        ctx.strokeRect(b.x, b.y, b.w, b.h);
        ctx.fillStyle = b.underConstruction ? '#fcd34d' : '#6ee7b7';
        ctx.font = '11px sans-serif';
        ctx.fillText(b.label, b.x + 6, b.y + 16);
        if (b.underConstruction) {
          ctx.fillStyle = '#fde68a';
          ctx.fillText(`脚手架·剩余${b.daysLeft}天`, b.x + 6, b.y + 32);
        }
      }

      ctx.fillStyle = 'rgba(148,163,184,0.32)';
      for (const p of template.waypoints) ctx.fillRect(p.x - 2, p.y - 2, 4, 4);

      for (const n of s.npcs) {
        const color = n.role === 'GUARD' ? '#67e8f9' : n.role === 'PATROL' ? '#fcd34d' : n.role === 'WORKER' ? '#6ee7b7' : n.role === 'GUARDIAN' ? '#f5d0fe' : '#c4b5fd';
        ctx.fillStyle = color;
        ctx.strokeStyle = '#f8fafc';
        ctx.beginPath();
        ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      }

      const heroNodes = followedHeroes.map((h, i) => {
        const idx = Math.max(0, s.trail.length - 1 - (i + 1) * 26);
        const p = s.trail[idx] ?? s.player;
        return { id: h.id, x: p.x - 10 + i * 4, y: p.y + 16 + i * 4, name: `${h.title}${h.name}` };
      });
      for (const h of heroNodes) {
        ctx.fillStyle = '#a78bfa';
        ctx.strokeStyle = '#ede9fe';
        ctx.beginPath();
        ctx.arc(h.x, h.y, 7, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      }

      if (template.stairsUp && layerRef.current > 0) {
        ctx.fillStyle = 'rgba(68,64,60,0.85)';
        ctx.strokeStyle = '#d6d3d1';
        ctx.fillRect(template.stairsUp.x - 14, template.stairsUp.y - 14, 28, 28);
        ctx.strokeRect(template.stairsUp.x - 14, template.stairsUp.y - 14, 28, 28);
        ctx.fillStyle = '#f5f5f4';
        ctx.font = '14px sans-serif';
        ctx.fillText('↑', template.stairsUp.x - 4, template.stairsUp.y + 5);
      }
      if (template.stairsDown && layerRef.current < layerCountRef.current - 1) {
        ctx.fillStyle = 'rgba(68,64,60,0.85)';
        ctx.strokeStyle = '#d6d3d1';
        ctx.fillRect(template.stairsDown.x - 14, template.stairsDown.y - 14, 28, 28);
        ctx.strokeRect(template.stairsDown.x - 14, template.stairsDown.y - 14, 28, 28);
        ctx.fillStyle = '#f5f5f4';
        ctx.font = '14px sans-serif';
        ctx.fillText('↓', template.stairsDown.x - 4, template.stairsDown.y + 5);
      }

      ctx.fillStyle = '#f87171';
      ctx.strokeStyle = '#fee2e2';
      ctx.beginPath();
      ctx.arc(s.player.x, s.player.y, PLAYER_R, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      if (hintRef.current) {
        const m = nearestRef.current;
        if (m) {
          const ix = m.kind === 'NPC' ? (s.npcs.find(n => n.id === m.id)?.x ?? s.player.x) : m.kind === 'EXIT'
            ? (template.entrance ? template.entrance.x + template.entrance.w * 0.5 : s.player.x)
            : m.kind === 'STAIRS_UP'
              ? (template.stairsUp?.x ?? s.player.x)
              : (template.stairsDown?.x ?? s.player.x);
          const iy = m.kind === 'NPC' ? (s.npcs.find(n => n.id === m.id)?.y ?? s.player.y) : m.kind === 'EXIT'
            ? (template.entrance ? template.entrance.y + template.entrance.h * 0.5 : s.player.y)
            : m.kind === 'STAIRS_UP'
              ? (template.stairsUp?.y ?? s.player.y)
              : (template.stairsDown?.y ?? s.player.y);
          const bx = clamp(ix - 86, 8, MAP_W - 184);
          const by = clamp(iy - 36, 8, MAP_H - 28);
          ctx.fillStyle = 'rgba(0,0,0,0.72)';
          ctx.strokeStyle = 'rgba(180,83,9,0.9)';
          ctx.fillRect(bx, by, 176, 24);
          ctx.strokeRect(bx, by, 176, 24);
          ctx.fillStyle = '#fcd34d';
          ctx.font = '11px sans-serif';
          ctx.fillText(hintRef.current, bx + 6, by + 16);
        }
      }
    };

    const loop = (ts: number) => {
      const dt = lastFrameRef.current ? Math.min(50, ts - lastFrameRef.current) : 16;
      lastFrameRef.current = ts;
      const s = simRef.current;
      s.patrolTick += dt * 0.05;

      const speed = (pressedRef.current.shift ? 8 : 5) * (dt / 16);
      let dx = 0;
      let dy = 0;
      if (pressedRef.current.w || pressedRef.current.arrowup) dy -= speed;
      if (pressedRef.current.s || pressedRef.current.arrowdown) dy += speed;
      if (pressedRef.current.a || pressedRef.current.arrowleft) dx -= speed;
      if (pressedRef.current.d || pressedRef.current.arrowright) dx += speed;
      if (dx || dy) {
        s.player.x = clamp(s.player.x + dx, 14, MAP_W - 14);
        s.player.y = clamp(s.player.y + dy, 14, MAP_H - 14);
        for (const rect of obstacleRects) {
          const fixed = resolveCircleRect(s.player.x, s.player.y, PLAYER_R, rect);
          s.player.x = fixed.x;
          s.player.y = fixed.y;
        }
        s.trail.push({ x: s.player.x, y: s.player.y });
        if (s.trail.length > 160) s.trail.shift();
      }

      s.npcs = s.npcs.map(agent => {
        let x = agent.x;
        let y = agent.y;
        let waitMs = Math.max(0, agent.waitMs - dt);
        let targetIndex = agent.targetIndex;
        if (waitMs <= 0) {
          const target = template.waypoints[targetIndex] ?? template.waypoints[0];
          const vx = target.x - x;
          const vy = target.y - y;
          const dist = Math.hypot(vx, vy);
          if (dist < 8) {
            const waitMin = agent.role === 'GUARD' ? 2600 : agent.role === 'WORKER' ? 2200 : 1800;
            const waitMax = agent.role === 'GUARD' ? 8200 : agent.role === 'WORKER' ? 7200 : 6400;
            waitMs = waitMin + Math.floor(Math.random() * Math.max(1, waitMax - waitMin));
            if (agent.role === 'GUARD' || agent.role === 'GUARDIAN') {
              const delta = Math.floor(Math.random() * 3) - 1;
              targetIndex = clamp(targetIndex + delta, 0, Math.max(0, template.waypoints.length - 1));
            } else {
              const step = 2 + Math.floor(Math.random() * Math.max(2, Math.floor(template.waypoints.length / 2)));
              targetIndex = (targetIndex + step) % template.waypoints.length;
            }
          } else {
            const step = Math.min(agent.speed * (dt / 16) * 2.8, dist);
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
        return { ...agent, x, y, waitMs, targetIndex };
      });

      for (let i = 0; i < s.npcs.length; i++) {
        for (let j = i + 1; j < s.npcs.length; j++) {
          const a = s.npcs[i];
          const b = s.npcs[j];
          const ddx = b.x - a.x;
          const ddy = b.y - a.y;
          const minD = a.r + b.r + 2;
          const d2 = ddx * ddx + ddy * ddy;
          if (d2 > 0 && d2 < minD * minD) {
            const d = Math.sqrt(d2);
            const push = (minD - d) * 0.5;
            const nx = ddx / d;
            const ny = ddy / d;
            a.x = clamp(a.x - nx * push, 12, MAP_W - 12);
            a.y = clamp(a.y - ny * push, 12, MAP_H - 12);
            b.x = clamp(b.x + nx * push, 12, MAP_W - 12);
            b.y = clamp(b.y + ny * push, 12, MAP_H - 12);
          }
        }
      }

      for (const a of s.npcs) {
        const ddx = a.x - s.player.x;
        const ddy = a.y - s.player.y;
        const minD = a.r + PLAYER_R + 1;
        const d2 = ddx * ddx + ddy * ddy;
        if (d2 > 0 && d2 < minD * minD) {
          const d = Math.sqrt(d2);
          const push = minD - d;
          a.x = clamp(a.x + (ddx / d) * push, 12, MAP_W - 12);
          a.y = clamp(a.y + (ddy / d) * push, 12, MAP_H - 12);
        }
      }

      const interactables: Array<{ id: string; kind: 'NPC' | 'STAIRS_UP' | 'STAIRS_DOWN' | 'EXIT'; role?: Role; name: string; x: number; y: number }> = [
        ...s.npcs.map(n => ({ id: n.id, kind: 'NPC' as const, role: n.role, name: n.name, x: n.x, y: n.y })),
        ...(template.stairsUp && layerRef.current > 0 ? [{ id: 'stairs_up', kind: 'STAIRS_UP' as const, name: '上行楼梯', x: template.stairsUp.x, y: template.stairsUp.y }] : []),
        ...(template.stairsDown && layerRef.current < layerCountRef.current - 1 ? [{ id: 'stairs_down', kind: 'STAIRS_DOWN' as const, name: '下行楼梯', x: template.stairsDown.x, y: template.stairsDown.y }] : []),
        ...(template.entrance && layerRef.current === 0 ? [{ id: 'exit_hideout', kind: 'EXIT' as const, name: '据点入口', x: template.entrance.x + template.entrance.w * 0.5, y: template.entrance.y + template.entrance.h * 0.5 }] : [])
      ];
      const nearest = interactables
        .map(it => ({ ...it, dist: Math.hypot(it.x - s.player.x, it.y - s.player.y) }))
        .sort((a, b) => a.dist - b.dist)[0] ?? null;
      const canInteract = !!nearest && nearest.dist <= 64;
      nearestRef.current = canInteract && nearest ? { id: nearest.id, kind: nearest.kind, role: nearest.role, name: nearest.name } : null;
      const hint = !canInteract || !nearest
        ? ''
        : nearest.kind === 'STAIRS_UP'
          ? '按 E 前往上一层'
          : nearest.kind === 'STAIRS_DOWN'
            ? '按 E 前往下一层'
            : nearest.kind === 'EXIT'
              ? '按 E 离开据点内部'
              : `按 E 与 ${nearest.name} 对话`;
      if (hint !== hintRef.current) {
        hintRef.current = hint;
        setInteractHint(hint);
      }

      draw(s);
      rafRef.current = requestAnimationFrame(loop);
    };

    rafRef.current = requestAnimationFrame(loop);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
      lastFrameRef.current = 0;
    };
  }, [layerIndex, template.id, garrisonCount, guardHero?.id, buildingNodes.length]);

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
        <canvas ref={canvasRef} width={MAP_W} height={MAP_H} className="mx-auto border border-stone-700 rounded block" />
      </div>

      <div className="bg-stone-900/60 border border-stone-700 rounded p-4">
        <div className="text-stone-200 font-semibold mb-1">现场通讯</div>
        <div className="text-sm text-stone-300">{dialogText}</div>
        {lastTargetId && <div className="text-xs text-stone-500 mt-1">最后交互对象：{lastTargetId}</div>}
      </div>
    </div>
  );
};
