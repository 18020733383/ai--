import React from 'react';
import { Hero, Location, PlayerState } from '../types';
import { Button } from '../components/Button';

type HideoutInteriorViewProps = {
  location: Location;
  player: PlayerState;
  heroes: Hero[];
  layerIndex: number;
  onChangeLayer: (nextLayerIndex: number) => void;
  onBack: () => void;
};

type Vec2 = { x: number; y: number };

type NpcRole = 'GUARD' | 'SOLDIER' | 'WORKER' | 'HERO';

type Npc = {
  id: string;
  name: string;
  role: NpcRole;
  pos: Vec2;
  vel: Vec2;
  wanderCenter: Vec2;
  wanderRadius: number;
  lastWanderAt: number;
  talkCooldownUntil: number;
};

type Rect = { x: number; y: number; w: number; h: number; kind: 'WALL' | 'STRUCT' | 'STAIR_UP' | 'STAIR_DOWN' };

const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n));
const dist = (a: Vec2, b: Vec2) => Math.hypot(a.x - b.x, a.y - b.y);
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

const rectContains = (r: Rect, p: Vec2) => p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h;
const rectInflate = (r: Rect, pad: number): Rect => ({ ...r, x: r.x - pad, y: r.y - pad, w: r.w + pad * 2, h: r.h + pad * 2 });
const collideCircleWithRects = (pos: Vec2, radius: number, rects: Rect[]) => {
  let x = pos.x;
  let y = pos.y;
  const r = radius;
  for (const rect of rects) {
    if (rect.kind === 'STAIR_UP' || rect.kind === 'STAIR_DOWN') continue;
    const a = rectInflate(rect, r);
    if (rectContains(a, { x, y })) {
      const left = Math.abs(x - a.x);
      const right = Math.abs(a.x + a.w - x);
      const top = Math.abs(y - a.y);
      const bottom = Math.abs(a.y + a.h - y);
      const m = Math.min(left, right, top, bottom);
      if (m === left) x = a.x - 0.01;
      else if (m === right) x = a.x + a.w + 0.01;
      else if (m === top) y = a.y - 0.01;
      else y = a.y + a.h + 0.01;
    }
  }
  return { x, y };
};

const pick = <T,>(arr: T[], seed: number) => {
  if (arr.length === 0) return null;
  const i = Math.abs(seed) % arr.length;
  return arr[i];
};

const buildDialog = (role: NpcRole, seed: number, hero?: Hero | null) => {
  const guard = [
    '夜里风紧，别离门太近。',
    '站岗是门艺术：站得越稳，麻烦越少。',
    '外面一有动静，我们会第一时间吹哨。',
    '隐匿点不是家，是活下去的壳。'
  ];
  const soldier = [
    '今天的巡逻路线比昨天短…我怀疑据点在偷懒。',
    '听说你又扩建了？地基别挖到深渊里去。',
    '训练场那边缺人手，别只顾着招新兵。',
    '我在练“看起来很强”的步伐。'
  ];
  const worker = [
    '工具都在，材料也在，剩下的就是时间。',
    '你别问我为什么这么多支撑柱，我也不想塌。',
    '这地方越大，越像迷宫。'
  ];
  const heroTalk = [
    '我在你身后。别回头，浪费时间。',
    '这里的空气像旧日志，读久了会头痛。',
    '需要我盯着哪一层？我随时可以下去。'
  ];
  const byRole = role === 'GUARD' ? guard : role === 'WORKER' ? worker : role === 'HERO' ? heroTalk : soldier;
  const base = pick(byRole, seed) ?? '……';
  if (role !== 'HERO' || !hero) return base;
  const roleHint = hero.role === 'MAGE' ? '法术' : hero.role === 'BARD' ? '歌声' : hero.role === 'ARCHER' ? '箭矢' : hero.role === 'SHIELD' ? '盾墙' : '刀刃';
  const extra = [
    `你的队伍还缺一条更干净的后路。`,
    `我闻到了危险的味道，像某段没清理的缓存。`,
    `只要你下令，我就让${roleHint}说话。`
  ];
  return `${base}\n${pick(extra, seed + 7) ?? ''}`.trim();
};

const getBuiltSlotTypes = (slots: Array<{ type: string | null; daysLeft?: number }> | undefined) => {
  const safe = Array.isArray(slots) ? slots : [];
  return safe
    .filter(s => !!s?.type && !(s.daysLeft && s.daysLeft > 0))
    .map(s => String(s.type));
};

const buildStructures = (facilityTypes: string[], defenseTypes: string[], hasUp: boolean, hasDown: boolean) => {
  const rects: Rect[] = [];
  rects.push({ x: 40, y: 48, w: 880, h: 20, kind: 'WALL' });
  rects.push({ x: 40, y: 472, w: 880, h: 20, kind: 'WALL' });
  rects.push({ x: 40, y: 48, w: 20, h: 444, kind: 'WALL' });
  rects.push({ x: 900, y: 48, w: 20, h: 444, kind: 'WALL' });
  rects.push({ x: 200, y: 180, w: 140, h: 80, kind: 'STRUCT' });
  rects.push({ x: 600, y: 180, w: 140, h: 80, kind: 'STRUCT' });
  const placeGrid = (items: string[], baseX: number, baseY: number, cols: number, w: number, h: number, gap: number) => {
    const capped = items.slice(0, 10);
    capped.forEach((t, i) => {
      const cx = i % cols;
      const cy = Math.floor(i / cols);
      rects.push({
        x: baseX + cx * (w + gap),
        y: baseY + cy * (h + gap),
        w,
        h,
        kind: 'STRUCT'
      });
    });
  };
  placeGrid(facilityTypes, 90, 110, 2, 90, 60, 14);
  placeGrid(defenseTypes, 780, 110, 1, 90, 60, 14);
  if (hasUp) rects.push({ x: 455, y: 95, w: 90, h: 55, kind: 'STAIR_UP' });
  if (hasDown) rects.push({ x: 455, y: 390, w: 90, h: 55, kind: 'STAIR_DOWN' });
  return rects;
};

export const HideoutInteriorView = ({
  location,
  player,
  heroes,
  layerIndex,
  onChangeLayer,
  onBack
}: HideoutInteriorViewProps) => {
  const canvasRef = React.useRef<HTMLCanvasElement | null>(null);
  const wrapRef = React.useRef<HTMLDivElement | null>(null);
  const pressedRef = React.useRef<Record<string, boolean>>({});
  const lastTimeRef = React.useRef<number>(0);
  const rafRef = React.useRef<number | null>(null);
  const playerPosRef = React.useRef<Vec2>({ x: 170, y: 420 });
  const heroPosRef = React.useRef<Record<string, Vec2>>({});
  const npcsRef = React.useRef<Npc[]>([]);
  const nearPromptRef = React.useRef<{ text: string; targetId: string } | null>(null);

  const hideout = location.hideout;
  const layers = hideout?.layers ?? [];
  const safeLayerIndex = clamp(Math.floor(layerIndex || 0), 0, Math.max(0, layers.length - 1));
  const layer = layers[safeLayerIndex] ?? null;
  const facilityTypes = getBuiltSlotTypes(layer?.facilitySlots as any);
  const defenseTypes = getBuiltSlotTypes(layer?.defenseSlots as any);
  const hasUp = safeLayerIndex > 0;
  const hasDown = safeLayerIndex < layers.length - 1;

  const structures = React.useMemo(
    () => buildStructures(facilityTypes, defenseTypes, hasUp, hasDown),
    [facilityTypes.join('|'), defenseTypes.join('|'), hasUp, hasDown]
  );

  const followingHeroes = React.useMemo(() => heroes.filter(h => h.recruited && !h.locationId), [heroes]);

  const [hint, setHint] = React.useState<string>('WASD 移动 · E 交互 · Esc 返回');
  const [dialogue, setDialogue] = React.useState<{ name: string; text: string } | null>(null);
  const [nearPrompt, setNearPrompt] = React.useState<{ text: string; targetId: string } | null>(null);

  React.useEffect(() => {
    const mk = (overrides: Partial<Npc>): Npc => ({
      id: overrides.id ?? `npc_${Math.random()}`,
      name: overrides.name ?? '士兵',
      role: overrides.role ?? 'SOLDIER',
      pos: overrides.pos ?? { x: 200, y: 200 },
      vel: overrides.vel ?? { x: 0, y: 0 },
      wanderCenter: overrides.wanderCenter ?? { x: 200, y: 200 },
      wanderRadius: overrides.wanderRadius ?? 140,
      lastWanderAt: 0,
      talkCooldownUntil: 0
    });

    const guard = mk({
      id: 'guard_gate',
      name: '门口卫兵',
      role: 'GUARD',
      pos: { x: 120, y: 438 },
      wanderCenter: { x: 120, y: 438 },
      wanderRadius: 8
    });
    const worker = mk({
      id: 'worker_1',
      name: '工匠',
      role: 'WORKER',
      pos: { x: 270, y: 220 },
      wanderCenter: { x: 270, y: 220 },
      wanderRadius: 60
    });

    const garrisonCount = (layer?.garrison ?? []).reduce((sum, t) => sum + (t.count ?? 0), 0);
    const walkers = clamp(3 + Math.floor(garrisonCount / 80), 3, 10);
    const soldierList: Npc[] = Array.from({ length: walkers }, (_, i) => {
      const base = 200 + (i % 3) * 180;
      const pos = { x: clamp(base + (i * 13) % 60, 90, 870), y: clamp(140 + (i * 37) % 260, 100, 440) };
      return mk({
        id: `soldier_${i}`,
        name: `巡逻兵${i + 1}`,
        role: 'SOLDIER',
        pos,
        wanderCenter: { x: pos.x, y: pos.y },
        wanderRadius: 160
      });
    });

    playerPosRef.current = { x: 170, y: 420 };
    heroPosRef.current = {};
    setDialogue(null);
    npcsRef.current = [guard, worker, ...soldierList];
    setHint(`隐匿点 · ${layer?.name ?? `L${safeLayerIndex}`}${facilityTypes.length + defenseTypes.length > 0 ? ` · 建筑 ${facilityTypes.length + defenseTypes.length}` : ''}`);
    setNearPrompt(null);
    nearPromptRef.current = null;
  }, [location.id, player.day, safeLayerIndex, facilityTypes.length, defenseTypes.length, layer?.garrison?.length]);

  const interact = React.useCallback(() => {
    const now = Date.now();
    const p = playerPosRef.current;
    const stairUp = structures.find(r => r.kind === 'STAIR_UP');
    const stairDown = structures.find(r => r.kind === 'STAIR_DOWN');
    const nearStairUp = stairUp ? rectContains(rectInflate(stairUp, 18), p) : false;
    const nearStairDown = stairDown ? rectContains(rectInflate(stairDown, 18), p) : false;
    if (nearStairUp) {
      onChangeLayer(Math.max(0, safeLayerIndex - 1));
      return;
    }
    if (nearStairDown) {
      onChangeLayer(Math.min(layers.length - 1, safeLayerIndex + 1));
      return;
    }

    let bestNpc: { id: string; name: string; role: NpcRole; d: number; hero?: Hero | null } | null = null;
    const npcs = npcsRef.current;
    for (const npc of npcs) {
      const d = dist(p, npc.pos);
      if (d > 36) continue;
      if (npc.talkCooldownUntil > now) continue;
      if (!bestNpc || d < bestNpc.d) bestNpc = { id: npc.id, name: npc.name, role: npc.role, d };
    }
    const heroIds = followingHeroes.map(h => h.id);
    for (const heroId of heroIds) {
      const hp = heroPosRef.current[heroId];
      if (!hp) continue;
      const d = dist(p, hp);
      if (d > 36) continue;
      if (!bestNpc || d < bestNpc.d) {
        const hero = followingHeroes.find(h => h.id === heroId) ?? null;
        bestNpc = { id: `hero_${heroId}`, name: hero?.name ?? '英雄', role: 'HERO', d, hero };
      }
    }
    if (!bestNpc) return;
    const seed = Math.floor((player.day * 97 + safeLayerIndex * 19 + bestNpc.id.length * 13 + Math.random() * 1000));
    const text = buildDialog(bestNpc.role, seed, bestNpc.hero ?? null);
    setDialogue({ name: bestNpc.name, text });
    if (bestNpc.role !== 'HERO') {
      npcsRef.current = npcsRef.current.map(n => n.id === bestNpc!.id ? { ...n, talkCooldownUntil: now + 800 } : n);
    }
  }, [structures, safeLayerIndex, layers.length, onChangeLayer, player.day, followingHeroes]);

  React.useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      pressedRef.current[e.key.toLowerCase()] = true;
      if (e.key === 'Escape') onBack();
      if (e.key.toLowerCase() === 'e') interact();
    };
    const onKeyUp = (e: KeyboardEvent) => {
      pressedRef.current[e.key.toLowerCase()] = false;
    };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, [interact, onBack]);

  React.useEffect(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const W = 960;
    const H = 540;
    canvas.width = W;
    canvas.height = H;

    const updateScale = () => {
      const rect = wrap.getBoundingClientRect();
      const scale = Math.min(rect.width / W, rect.height / H);
      canvas.style.width = `${Math.floor(W * scale)}px`;
      canvas.style.height = `${Math.floor(H * scale)}px`;
    };
    updateScale();
    const ro = new ResizeObserver(updateScale);
    ro.observe(wrap);

    const tick = (t: number) => {
      const last = lastTimeRef.current || t;
      lastTimeRef.current = t;
      const dt = clamp((t - last) / 1000, 0, 0.033);
      const keys = pressedRef.current;
      const speed = keys['shift'] ? 220 : 160;
      let vx = 0;
      let vy = 0;
      if (keys['w'] || keys['arrowup']) vy -= 1;
      if (keys['s'] || keys['arrowdown']) vy += 1;
      if (keys['a'] || keys['arrowleft']) vx -= 1;
      if (keys['d'] || keys['arrowright']) vx += 1;
      const len = Math.hypot(vx, vy) || 1;
      vx = (vx / len) * speed;
      vy = (vy / len) * speed;

      {
        const prev = playerPosRef.current;
        const nextRaw = { x: prev.x + vx * dt, y: prev.y + vy * dt };
        const bounded = { x: clamp(nextRaw.x, 70, 890), y: clamp(nextRaw.y, 78, 462) };
        playerPosRef.current = collideCircleWithRects(bounded, 12, structures);
      }

      {
        const now = Date.now();
        const next = npcsRef.current.map(n => ({ ...n }));
        for (const npc of next) {
          if (npc.role === 'GUARD') continue;
          const needNew = now - npc.lastWanderAt > 900 + Math.random() * 1200;
          if (needNew) {
            const ang = Math.random() * Math.PI * 2;
            const r = (0.2 + Math.random() * 0.8) * npc.wanderRadius;
            const tx = npc.wanderCenter.x + Math.cos(ang) * r;
            const ty = npc.wanderCenter.y + Math.sin(ang) * r;
            const dx = tx - npc.pos.x;
            const dy = ty - npc.pos.y;
            const d = Math.hypot(dx, dy) || 1;
            const s = npc.role === 'WORKER' ? 40 : 70;
            npc.vel = { x: (dx / d) * s, y: (dy / d) * s };
            npc.lastWanderAt = now;
          }
          const nextRaw = { x: npc.pos.x + npc.vel.x * dt, y: npc.pos.y + npc.vel.y * dt };
          const bounded = { x: clamp(nextRaw.x, 70, 890), y: clamp(nextRaw.y, 78, 462) };
          const after = collideCircleWithRects(bounded, 12, structures);
          npc.pos = after;
          if (dist(npc.pos, npc.wanderCenter) > npc.wanderRadius * 1.25) {
            npc.vel = { x: (npc.wanderCenter.x - npc.pos.x) * 0.6, y: (npc.wanderCenter.y - npc.pos.y) * 0.6 };
          }
        }
        npcsRef.current = next;
      }

      {
        const ids = followingHeroes.map(h => h.id);
        const chain: Vec2[] = [{ ...playerPosRef.current }];
        const next: Record<string, Vec2> = { ...heroPosRef.current };
        ids.forEach((id, i) => {
          const target = chain[chain.length - 1];
          const cur = next[id] ?? { x: target.x - 18, y: target.y + 10 };
          const d = dist(cur, target);
          const desired = 26;
          const tMove = clamp(dt * 6, 0, 1);
          const dx = target.x - cur.x;
          const dy = target.y - cur.y;
          const factor = d > desired ? (desired / Math.max(1, d)) : 1;
          const nx = lerp(cur.x, target.x - dx * factor, tMove);
          const ny = lerp(cur.y, target.y - dy * factor, tMove);
          const bounded = { x: clamp(nx, 70, 890), y: clamp(ny, 78, 462) };
          next[id] = collideCircleWithRects(bounded, 12, structures);
          chain.push(next[id]);
        });
        Object.keys(next).forEach(id => {
          if (!ids.includes(id)) delete next[id];
        });
        heroPosRef.current = next;
      }

      {
        const p = playerPosRef.current;
        const stairUp = structures.find(r => r.kind === 'STAIR_UP');
        const stairDown = structures.find(r => r.kind === 'STAIR_DOWN');
        let nextPrompt: { text: string; targetId: string } | null = null;
        if (stairUp && rectContains(rectInflate(stairUp, 18), p)) nextPrompt = { text: '按 E 上楼梯', targetId: 'stair_up' };
        else if (stairDown && rectContains(rectInflate(stairDown, 18), p)) nextPrompt = { text: '按 E 下楼梯', targetId: 'stair_down' };
        else {
          let best: { id: string; d: number } | null = null;
          for (const npc of npcsRef.current) {
            const d = dist(p, npc.pos);
            if (d > 36) continue;
            if (!best || d < best.d) best = { id: npc.id, d };
          }
          for (const heroId of followingHeroes.map(h => h.id)) {
            const hp = heroPosRef.current[heroId];
            if (!hp) continue;
            const d = dist(p, hp);
            if (d > 36) continue;
            if (!best || d < best.d) best = { id: `hero_${heroId}`, d };
          }
          if (best) nextPrompt = { text: '按 E 对话', targetId: best.id };
        }
        const prevPrompt = nearPromptRef.current;
        const same = (!prevPrompt && !nextPrompt) || (prevPrompt && nextPrompt && prevPrompt.text === nextPrompt.text && prevPrompt.targetId === nextPrompt.targetId);
        if (!same) {
          nearPromptRef.current = nextPrompt;
          setNearPrompt(nextPrompt);
        }
      }

      ctx.clearRect(0, 0, W, H);
      ctx.fillStyle = '#07080b';
      ctx.fillRect(0, 0, W, H);

      ctx.fillStyle = '#0b0f14';
      ctx.fillRect(48, 56, 864, 428);

      for (const r of structures) {
        if (r.kind === 'WALL') ctx.fillStyle = '#151922';
        else if (r.kind === 'STRUCT') ctx.fillStyle = '#0f1722';
        else if (r.kind === 'STAIR_UP') ctx.fillStyle = '#1b2a3a';
        else ctx.fillStyle = '#1b2a3a';
        ctx.fillRect(r.x, r.y, r.w, r.h);
        if (r.kind === 'STAIR_UP' || r.kind === 'STAIR_DOWN') {
          ctx.strokeStyle = '#2a4a6b';
          ctx.lineWidth = 2;
          ctx.strokeRect(r.x + 1, r.y + 1, r.w - 2, r.h - 2);
          ctx.fillStyle = '#88c0ff';
          ctx.font = '12px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace';
          const text = r.kind === 'STAIR_UP' ? 'STAIR ↑' : 'STAIR ↓';
          ctx.fillText(text, r.x + 10, r.y + 32);
        } else if (r.kind === 'STRUCT') {
          ctx.strokeStyle = '#1b2330';
          ctx.strokeRect(r.x + 1, r.y + 1, r.w - 2, r.h - 2);
        }
      }

      const drawNpc = (pos: Vec2, color: string, label: string) => {
        ctx.beginPath();
        ctx.fillStyle = color;
        ctx.arc(pos.x, pos.y, 11, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.fillStyle = '#d7dee7';
        ctx.font = '10px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace';
        ctx.fillText(label, pos.x - 10, pos.y - 16);
      };

      for (const npc of npcsRef.current) {
        if (npc.role === 'GUARD') drawNpc(npc.pos, '#b45309', 'G');
        else if (npc.role === 'WORKER') drawNpc(npc.pos, '#64748b', 'W');
        else drawNpc(npc.pos, '#16a34a', 'S');
      }

      for (const h of followingHeroes) {
        const pos = heroPosRef.current[h.id];
        if (!pos) continue;
        drawNpc(pos, '#7c3aed', 'H');
      }

      drawNpc(playerPosRef.current, '#60a5fa', 'P');

      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      ro.disconnect();
    };
  }, [structures, followingHeroes.map(h => h.id).join('|')]);

  return (
    <div className="fixed inset-0 z-50 bg-black">
      <div className="absolute top-0 left-0 right-0 p-3 flex items-center justify-between gap-2 bg-black/60 backdrop-blur border-b border-stone-800">
        <div className="min-w-0">
          <div className="text-stone-200 font-semibold truncate">{location.name} · {layer?.name ?? `第${safeLayerIndex + 1}层`}</div>
          <div className="text-xs text-stone-500 truncate">{hint}</div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {nearPrompt && <div className="text-xs text-emerald-300 bg-emerald-950/30 border border-emerald-900 px-2 py-1 rounded">{nearPrompt.text}</div>}
          <Button variant="secondary" onClick={onBack}>返回</Button>
        </div>
      </div>

      <div ref={wrapRef} className="absolute inset-0 pt-[56px] pb-4 flex items-center justify-center">
        <canvas ref={canvasRef} className="border border-stone-800 bg-black" />
      </div>

      {dialogue && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 w-[min(720px,calc(100%-24px))] bg-black/80 backdrop-blur border border-stone-800 rounded p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-stone-200 font-semibold">{dialogue.name}</div>
              <div className="text-sm text-stone-300 whitespace-pre-wrap mt-2">{dialogue.text}</div>
            </div>
            <button className="text-stone-400 hover:text-white" onClick={() => setDialogue(null)}>关闭</button>
          </div>
        </div>
      )}
    </div>
  );
};
