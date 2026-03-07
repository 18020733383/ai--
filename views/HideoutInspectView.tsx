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

const roleReplies: Record<Role, string[]> = {
  GUARD: [
    '岗哨汇报：入口区安全，未发现异常轨迹。',
    '别担心，外层通道我盯着，今晚没人能摸进来。',
    '守门人不是摆设，真有袭击我会第一时间敲钟。'
  ],
  PATROL: [
    '我在巡逻，顺便数了下砖缝，今天一块都没少。',
    '据点里最近挺安静，就是炊事班又把汤熬糊了。',
    '巡逻路线已经跑熟了，再来一圈就换班。'
  ],
  WORKER: [
    '工坊这边还在赶工，别踩到我的图纸。',
    '最近材料够用，建筑进度比上周快不少。',
    '你要是再扩建，记得先给我们腾出仓位。'
  ],
  HERO: [
    '我跟着你走，真要开打我会先顶上去。',
    '这层防线没问题，队伍士气也还不错。',
    '休整得差不多了，随时可以出去狠狠干一票。'
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
  const guardHero = layer?.guardianHeroId ? (heroes.find(h => h.id === layer.guardianHeroId) ?? null) : null;
  const followedHeroes = heroes.filter(h => h.recruited && h.status !== 'DEAD').slice(0, 3);
  const [playerPos, setPlayerPos] = React.useState({ x: 180, y: 320 });
  const [patrolTick, setPatrolTick] = React.useState(0);
  const [dialogText, setDialogText] = React.useState('巡逻值守中。靠近角色后按 E 可对话，靠近楼梯可上下层。');
  const [lastTargetId, setLastTargetId] = React.useState<string>('');
  const pressedRef = React.useRef<Record<string, boolean>>({});
  const eHandledRef = React.useRef(false);
  const playerTrailRef = React.useRef<Array<{ x: number; y: number }>>([{ x: 180, y: 320 }]);

  React.useEffect(() => {
    const safe = clamp(initialLayerIndex, 0, Math.max(0, (hideout?.layers?.length ?? 1) - 1));
    setLayerIndex(safe);
  }, [initialLayerIndex, hideout?.layers?.length]);

  React.useEffect(() => {
    onLayerChange(layerIndex);
  }, [layerIndex, onLayerChange]);

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
      const speed = (keys.shift ? 8 : 5);
      let dx = 0;
      let dy = 0;
      if (keys.w || keys.arrowup) dy -= speed;
      if (keys.s || keys.arrowdown) dy += speed;
      if (keys.a || keys.arrowleft) dx -= speed;
      if (keys.d || keys.arrowright) dx += speed;
      if (dx !== 0 || dy !== 0) {
        setPlayerPos(prev => {
          const next = {
            x: clamp(prev.x + dx, 24, MAP_W - 24),
            y: clamp(prev.y + dy, 24, MAP_H - 24)
          };
          const trail = [...playerTrailRef.current, next];
          playerTrailRef.current = trail.slice(-120);
          return next;
        });
      }
    }, 45);
    return () => clearInterval(timer);
  }, []);

  const builtFacilities = (layer?.facilitySlots ?? [])
    .filter(s => !!s.type && (!s.daysLeft || s.daysLeft <= 0))
    .map(s => s.type as string);
  const builtDefense = (layer?.defenseSlots ?? [])
    .filter(s => !!s.type && (!s.daysLeft || s.daysLeft <= 0))
    .map(s => s.type as string);
  const allBuilt = [...builtFacilities, ...builtDefense];

  const buildingNodes = allBuilt.slice(0, 12).map((type, idx) => {
    const col = idx % 4;
    const row = Math.floor(idx / 4);
    return {
      id: `building_${idx}_${type}`,
      x: 350 + col * 130,
      y: 120 + row * 115,
      label: buildingLabelMap[type] ?? type
    };
  });

  const garrisonCount = (layer?.garrison ?? []).reduce((sum, t) => sum + (t.count ?? 0), 0);
  const guardCount = Math.max(1, Math.min(3, Math.floor(garrisonCount / 70) + 1));
  const patrolCount = Math.max(2, Math.min(8, Math.floor(garrisonCount / 35) + 2));

  const guardNodes = Array.from({ length: guardCount }).map((_, i) => ({
    id: `guard_${i}`,
    role: 'GUARD' as Role,
    name: `岗哨 ${i + 1}`,
    x: 120 + i * 46,
    y: 140 + (i % 2) * 40
  }));

  const patrolNodes = Array.from({ length: patrolCount }).map((_, i) => {
    const angle = patrolTick * 0.06 + i * (Math.PI / 4);
    const cx = 520 + (i % 2 === 0 ? -1 : 1) * 180;
    const cy = 290 + ((i % 3) - 1) * 85;
    return {
      id: `patrol_${i}`,
      role: 'PATROL' as Role,
      name: `巡逻兵 ${i + 1}`,
      x: cx + Math.cos(angle) * (30 + (i % 3) * 14),
      y: cy + Math.sin(angle) * (26 + (i % 2) * 10)
    };
  });

  const workerNodes = buildingNodes.slice(0, Math.min(4, buildingNodes.length)).map((b, i) => ({
    id: `worker_${i}`,
    role: 'WORKER' as Role,
    name: `工务员 ${i + 1}`,
    x: b.x + 32,
    y: b.y + 32
  }));

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

  const interactables: Array<{
    id: string;
    kind: 'NPC' | 'STAIRS_UP' | 'STAIRS_DOWN';
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
    ...(layerIndex > 0 ? [{ id: 'stairs_up', kind: 'STAIRS_UP' as const, name: '上行楼梯', x: 220, y: 70 }] : []),
    ...(layerIndex < layerCount - 1 ? [{ id: 'stairs_down', kind: 'STAIRS_DOWN' as const, name: '下行楼梯', x: 880, y: 500 }] : [])
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
    const role = nearest.role ?? 'PATROL';
    const pool = roleReplies[role] ?? roleReplies.PATROL;
    const seed = (nearest.id.length + patrolTick) % pool.length;
    const line = pool[seed];
    setDialogText(`${nearest.name}：${line}`);
    setLastTargetId(nearest.id);
  }, [canInteract, nearest, layerCount, patrolTick]);

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
        W/A/S/D 或方向键移动，Shift 冲刺。{interactHint ? `靠近后 ${interactHint}。` : '靠近角色或楼梯后可交互。'}
      </div>

      <div className="bg-stone-950/80 border border-stone-700 rounded p-3">
        <div
          className="relative mx-auto border border-stone-700 rounded overflow-hidden"
          style={{ width: MAP_W, height: MAP_H, background: 'radial-gradient(circle at 50% 40%, #1f2937 0%, #0b1020 60%, #06090f 100%)' }}
        >
          <div className="absolute left-8 top-8 text-[11px] text-stone-500">入口</div>
          <div className="absolute left-16 top-16 w-160 h-96 border border-stone-800 rounded" style={{ width: 180, height: 120 }} />

          {buildingNodes.map(b => (
            <div key={b.id} className="absolute" style={{ left: b.x, top: b.y, width: 86, height: 62 }}>
              <div className="w-full h-full border border-emerald-900/80 bg-emerald-950/30 rounded flex items-center justify-center text-[11px] text-emerald-300 px-1 text-center">
                {b.label}
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
            <div className="absolute" style={{ left: 220, top: 70 }}>
              <div className="w-8 h-8 rounded border border-stone-300 bg-stone-700/80 text-stone-100 text-[10px] flex items-center justify-center">↑</div>
            </div>
          )}
          {layerIndex < layerCount - 1 && (
            <div className="absolute" style={{ left: 880, top: 500 }}>
              <div className="w-8 h-8 rounded border border-stone-300 bg-stone-700/80 text-stone-100 text-[10px] flex items-center justify-center">↓</div>
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

