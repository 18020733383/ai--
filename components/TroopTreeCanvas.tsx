import React from 'react';
import * as d3 from 'd3';
import { Crosshair, Flag, Heart, Shield, Sword, Zap } from 'lucide-react';
import { Troop, TroopTier } from '../types';

type TroopTemplate = Omit<Troop, 'count' | 'xp'>;

type TroopTreeCanvasProps = {
  troops: TroopTemplate[];
  query: string;
  tierFilter: TroopTier | 'ALL';
};

type TreeNode = {
  id: string;
  troop?: TroopTemplate;
  children?: TreeNode[];
};

const getTargets = (troop: TroopTemplate) => {
  const list = [troop.upgradeTargetId, ...(troop.upgradeTargetIds ?? [])]
    .map(x => String(x ?? '').trim())
    .filter(Boolean);
  return Array.from(new Set(list));
};

const pickIcon = (troop: TroopTemplate) => {
  const attrs = troop.attributes;
  const pairs = [
    { key: 'attack', value: attrs.attack },
    { key: 'defense', value: attrs.defense },
    { key: 'agility', value: attrs.agility },
    { key: 'hp', value: attrs.hp },
    { key: 'range', value: attrs.range },
    { key: 'morale', value: attrs.morale }
  ].sort((a, b) => b.value - a.value);
  const best = pairs[0]?.key ?? 'attack';
  if (best === 'defense') return Shield;
  if (best === 'agility') return Zap;
  if (best === 'hp') return Heart;
  if (best === 'range') return Crosshair;
  if (best === 'morale') return Flag;
  return Sword;
};

export const TroopTreeCanvas = ({ troops, query, tierFilter }: TroopTreeCanvasProps) => {
  const containerRef = React.useRef<HTMLDivElement | null>(null);
  const [size, setSize] = React.useState({ w: 1200, h: 680 });
  const [transform, setTransform] = React.useState({ x: 20, y: 20, scale: 1 });
  const draggingRef = React.useRef<{ active: boolean; x: number; y: number; startX: number; startY: number }>({ active: false, x: 0, y: 0, startX: 0, startY: 0 });

  const loweredQuery = query.trim().toLowerCase();

  const layout = React.useMemo(() => {
    const map = new Map<string, TroopTemplate>();
    troops.forEach(t => map.set(t.id, t));

    const children = new Map<string, string[]>();
    const parents = new Map<string, string[]>();
    map.forEach((troop, id) => {
      const targets = getTargets(troop).filter(target => map.has(target));
      children.set(id, targets);
      targets.forEach(target => {
        const list = parents.get(target) ?? [];
        list.push(id);
        parents.set(target, list);
      });
    });

    const queryMatched = new Set<string>(
      loweredQuery
        ? troops
            .filter(t => `${t.id} ${t.name} ${(t.equipment ?? []).join(' ')} ${String(t.description ?? '')}`.toLowerCase().includes(loweredQuery))
            .map(t => t.id)
        : troops.map(t => t.id)
    );
    const tierMatched = new Set<string>(
      tierFilter === 'ALL' ? troops.map(t => t.id) : troops.filter(t => t.tier === tierFilter).map(t => t.id)
    );
    const directMatched = new Set<string>(Array.from(queryMatched).filter(id => tierMatched.has(id)));

    const visibleSet = new Set<string>();
    const includeAround = (id: string) => {
      if (!map.has(id)) return;
      const stack = [id];
      while (stack.length > 0) {
        const cur = stack.pop()!;
        if (visibleSet.has(cur)) continue;
        visibleSet.add(cur);
        (parents.get(cur) ?? []).forEach(parent => stack.push(parent));
      }
      const down = [id];
      const seen = new Set<string>();
      while (down.length > 0) {
        const cur = down.pop()!;
        if (seen.has(cur)) continue;
        seen.add(cur);
        visibleSet.add(cur);
        (children.get(cur) ?? []).forEach(child => down.push(child));
      }
    };

    if (directMatched.size === 0) {
      troops.forEach(t => visibleSet.add(t.id));
    } else {
      directMatched.forEach(includeAround);
    }

    const roots = troops
      .map(t => t.id)
      .filter(id => (parents.get(id)?.length ?? 0) === 0);
    const fallbackRoots = troops.map(t => t.id).filter(id => (parents.get(id) ?? []).every(p => !visibleSet.has(p)));
    const visibleRoots = roots.filter(id => visibleSet.has(id));
    const rootIds = visibleRoots.length > 0 ? visibleRoots : fallbackRoots.filter(id => visibleSet.has(id));

    const buildNode = (id: string, path: Set<string>): TreeNode | null => {
      if (path.has(id) || !visibleSet.has(id)) return null;
      const troop = map.get(id);
      if (!troop) return null;
      const nextPath = new Set(path);
      nextPath.add(id);
      const kids = (children.get(id) ?? [])
        .map(child => buildNode(child, nextPath))
        .filter((n): n is TreeNode => !!n);
      return { id, troop, children: kids };
    };

    const rootsBuilt = rootIds
      .map(id => buildNode(id, new Set()))
      .filter((n): n is TreeNode => !!n);
    if (rootsBuilt.length === 0) return null;

    const pseudoRoot: TreeNode = { id: '__root__', children: rootsBuilt };
    const hierarchy = d3.hierarchy<TreeNode>(pseudoRoot, d => d.children ?? []);
    const tree = d3.tree<TreeNode>().nodeSize([170, 250]);
    const laid = tree(hierarchy);
    const nodes = laid
      .descendants()
      .filter(n => n.data.id !== '__root__' && n.data.troop)
      .map(n => ({ id: n.data.id, troop: n.data.troop!, x: n.x, y: n.y, matched: directMatched.size === 0 ? false : directMatched.has(n.data.id) }));
    const links = laid
      .links()
      .filter(l => l.source.data.id !== '__root__')
      .map(l => ({
        sourceId: l.source.data.id,
        targetId: l.target.data.id,
        sourceX: l.source.y,
        sourceY: l.source.x,
        targetX: l.target.y,
        targetY: l.target.x
      }));

    if (nodes.length === 0) return null;
    const minX = Math.min(...nodes.map(n => n.y));
    const maxX = Math.max(...nodes.map(n => n.y));
    const minY = Math.min(...nodes.map(n => n.x));
    const maxY = Math.max(...nodes.map(n => n.x));
    const pad = 110;
    const nodeW = 180;
    const nodeH = 74;
    const width = Math.max(420, (maxX - minX) + nodeW + pad * 2);
    const height = Math.max(320, (maxY - minY) + nodeH + pad * 2);
    const normalizedNodes = nodes.map(n => ({
      ...n,
      px: (n.y - minX) + pad,
      py: (n.x - minY) + pad
    }));
    const normalizedLinks = links.map(l => ({
      ...l,
      sourceX: (l.sourceX - minX) + pad,
      sourceY: (l.sourceY - minY) + pad,
      targetX: (l.targetX - minX) + pad,
      targetY: (l.targetY - minY) + pad
    }));

    return { width, height, nodes: normalizedNodes, links: normalizedLinks };
  }, [troops, loweredQuery, tierFilter]);

  React.useEffect(() => {
    const update = () => {
      const el = containerRef.current;
      if (!el) return;
      setSize({ w: el.clientWidth, h: el.clientHeight });
    };
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  React.useEffect(() => {
    if (!layout) return;
    const scale = Math.max(0.35, Math.min(1.2, Math.min((size.w - 40) / layout.width, (size.h - 40) / layout.height)));
    const x = (size.w - layout.width * scale) / 2;
    const y = (size.h - layout.height * scale) / 2;
    setTransform({ x, y, scale });
  }, [layout, size.w, size.h]);

  const onMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;
    draggingRef.current = { active: true, x: transform.x, y: transform.y, startX: e.clientX, startY: e.clientY };
  };

  const onMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!draggingRef.current.active) return;
    const dx = e.clientX - draggingRef.current.startX;
    const dy = e.clientY - draggingRef.current.startY;
    setTransform(prev => ({ ...prev, x: draggingRef.current.x + dx, y: draggingRef.current.y + dy }));
  };

  const stopDrag = () => {
    draggingRef.current.active = false;
  };

  const onWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    e.preventDefault();
    const rect = e.currentTarget.getBoundingClientRect();
    const px = e.clientX - rect.left;
    const py = e.clientY - rect.top;
    const delta = -e.deltaY * 0.0012;
    const nextScale = Math.max(0.3, Math.min(2.4, transform.scale * (1 + delta)));
    const worldX = (px - transform.x) / transform.scale;
    const worldY = (py - transform.y) / transform.scale;
    setTransform({
      scale: nextScale,
      x: px - worldX * nextScale,
      y: py - worldY * nextScale
    });
  };

  if (!layout) {
    return (
      <div className="h-[70vh] border border-dashed border-stone-800 rounded flex items-center justify-center text-stone-500 text-sm">
        没找到符合条件的升级树
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="relative h-[70vh] overflow-hidden border border-stone-800 rounded bg-stone-950/40 cursor-grab active:cursor-grabbing"
      onMouseDown={onMouseDown}
      onMouseMove={onMouseMove}
      onMouseUp={stopDrag}
      onMouseLeave={stopDrag}
      onWheel={onWheel}
    >
      <div
        className="absolute left-0 top-0"
        style={{
          width: `${layout.width}px`,
          height: `${layout.height}px`,
          transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.scale})`,
          transformOrigin: '0 0'
        }}
      >
        <svg width={layout.width} height={layout.height} className="absolute left-0 top-0 pointer-events-none">
          {layout.links.map(link => {
            const midX = (link.sourceX + link.targetX) / 2;
            const d = `M ${link.sourceX} ${link.sourceY} C ${midX} ${link.sourceY}, ${midX} ${link.targetY}, ${link.targetX} ${link.targetY}`;
            return <path key={`${link.sourceId}_${link.targetId}`} d={d} fill="none" stroke="rgba(120,113,108,0.65)" strokeWidth={2} />;
          })}
        </svg>
        {layout.nodes.map(node => {
          const Icon = pickIcon(node.troop);
          const tierColor = node.troop.tier >= 5 ? 'text-rose-300' : node.troop.tier >= 4 ? 'text-amber-300' : 'text-stone-300';
          return (
            <div
              key={node.id}
              className={`absolute w-[180px] h-[74px] rounded border px-3 py-2 bg-stone-900/90 shadow ${node.matched ? 'border-amber-500 shadow-amber-900/40' : 'border-stone-700'}`}
              style={{ left: `${node.px - 90}px`, top: `${node.py - 37}px` }}
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <Icon size={14} className="text-amber-300 shrink-0" />
                  <div className="text-xs text-stone-100 truncate">{node.troop.name}</div>
                </div>
                <div className={`text-[10px] ${tierColor}`}>T{node.troop.tier}</div>
              </div>
              <div className="text-[10px] text-stone-500 mt-1 truncate">{node.id}</div>
              <div className="text-[10px] text-stone-400 mt-1">
                攻{node.troop.attributes.attack} 防{node.troop.attributes.defense} 敏{node.troop.attributes.agility} 体{node.troop.attributes.hp}
              </div>
            </div>
          );
        })}
      </div>
      <div className="absolute right-3 top-3 text-[11px] text-stone-500 bg-black/40 border border-stone-800 rounded px-2 py-1">
        拖拽平移 · 滚轮缩放（{Math.round(transform.scale * 100)}%）
      </div>
    </div>
  );
};

