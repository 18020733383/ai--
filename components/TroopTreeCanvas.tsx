import React from 'react';
import * as d3 from 'd3';
import { Crosshair, Flag, Heart, Maximize2, Minimize2, Shield, Sword, Zap } from 'lucide-react';
import { Troop, TroopTier } from '../types';
import { Button } from './Button';

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

type LayoutNode = {
  id: string;
  troop: TroopTemplate;
  px: number;
  py: number;
  matched: boolean;
};

type LayoutLink = {
  sourceId: string;
  targetId: string;
  sourceX: number;
  sourceY: number;
  targetX: number;
  targetY: number;
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

const TroopRadar = ({ attributes, size = 140 }: { attributes: Troop['attributes']; size?: number }) => {
  const center = size / 2;
  const radius = size * 0.32;
  const labelRadius = size * 0.43;
  const maxAttr = 255;
  const angles = Array.from({ length: 6 }, (_, index) => (-Math.PI / 2) + (index * (Math.PI / 3)));
  const point = (angle: number, scale: number, r: number) => ({
    x: center + Math.cos(angle) * r * scale,
    y: center + Math.sin(angle) * r * scale
  });
  const gridScales = [0.25, 0.5, 0.75, 1];
  const outerPoints = angles.map(a => point(a, 1, radius));
  const gridPolygons = gridScales.map(scale => angles.map(a => point(a, scale, radius)));
  const values = [
    attributes.attack,
    attributes.defense,
    attributes.agility,
    attributes.hp,
    attributes.range,
    attributes.morale
  ].map(v => Math.max(0, Math.min(maxAttr, Number(v))) / maxAttr);
  const dataPoints = angles.map((a, i) => point(a, values[i], radius));
  const toPath = (pts: Array<{ x: number; y: number }>) => pts.map(p => `${p.x.toFixed(2)},${p.y.toFixed(2)}`).join(' ');
  const labels = ['攻', '防', '敏', '体', '远', '士'];
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="select-none">
      {gridPolygons.map((pts, idx) => (
        <polygon
          key={`grid-${idx}`}
          points={toPath(pts)}
          fill="none"
          stroke="rgba(120, 113, 108, 0.35)"
          strokeWidth={1}
        />
      ))}
      {outerPoints.map((p, idx) => (
        <line
          key={`axis-${idx}`}
          x1={center}
          y1={center}
          x2={p.x}
          y2={p.y}
          stroke="rgba(120, 113, 108, 0.35)"
          strokeWidth={1}
        />
      ))}
      <polygon
        points={toPath(dataPoints)}
        fill="rgba(245, 158, 11, 0.22)"
        stroke="rgba(245, 158, 11, 0.8)"
        strokeWidth={1.5}
      />
      {angles.map((a, idx) => {
        const p = point(a, 1, labelRadius);
        const cos = Math.cos(a);
        const sin = Math.sin(a);
        const textAnchor = Math.abs(cos) < 0.2 ? 'middle' : (cos > 0 ? 'start' : 'end');
        const dominantBaseline = Math.abs(sin) < 0.2 ? 'middle' : (sin > 0 ? 'hanging' : 'alphabetic');
        return (
          <text
            key={`label-${idx}`}
            x={p.x}
            y={p.y}
            textAnchor={textAnchor}
            dominantBaseline={dominantBaseline}
            fontSize={12}
            fill="rgba(214, 211, 209, 0.9)"
          >
            {labels[idx]}
          </text>
        );
      })}
    </svg>
  );
};

export const TroopTreeCanvas = ({ troops, query, tierFilter }: TroopTreeCanvasProps) => {
  const containerRef = React.useRef<HTMLDivElement | null>(null);
  const [size, setSize] = React.useState({ w: 1200, h: 680 });
  const [transform, setTransform] = React.useState({ x: 20, y: 20, scale: 1 });
  const [selectedId, setSelectedId] = React.useState<string | null>(null);
  const [highlightIds, setHighlightIds] = React.useState<Set<string>>(new Set());
  const [isFullscreen, setIsFullscreen] = React.useState(false);
  const pointerRef = React.useRef<{ active: boolean; id: number; startX: number; startY: number; baseX: number; baseY: number }>({
    active: false,
    id: -1,
    startX: 0,
    startY: 0,
    baseX: 0,
    baseY: 0
  });

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
      const up = [id];
      while (up.length > 0) {
        const cur = up.pop()!;
        if (visibleSet.has(cur)) continue;
        visibleSet.add(cur);
        (parents.get(cur) ?? []).forEach(parent => up.push(parent));
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

    if (directMatched.size === 0) troops.forEach(t => visibleSet.add(t.id));
    else directMatched.forEach(includeAround);

    const roots = troops.map(t => t.id).filter(id => (parents.get(id)?.length ?? 0) === 0);
    const fallbackRoots = troops.map(t => t.id).filter(id => (parents.get(id) ?? []).every(p => !visibleSet.has(p)));
    const visibleRoots = roots.filter(id => visibleSet.has(id));
    const rootIds = visibleRoots.length > 0 ? visibleRoots : fallbackRoots.filter(id => visibleSet.has(id));

    const buildNode = (id: string, path: Set<string>): TreeNode | null => {
      if (path.has(id) || !visibleSet.has(id)) return null;
      const troop = map.get(id);
      if (!troop) return null;
      const nextPath = new Set(path);
      nextPath.add(id);
      const kids = (children.get(id) ?? []).map(child => buildNode(child, nextPath)).filter((n): n is TreeNode => !!n);
      return { id, troop, children: kids };
    };

    const rootsBuilt = rootIds.map(id => buildNode(id, new Set())).filter((n): n is TreeNode => !!n);
    if (rootsBuilt.length === 0) return null;

    const pseudoRoot: TreeNode = { id: '__root__', children: rootsBuilt };
    const hierarchy = d3.hierarchy<TreeNode>(pseudoRoot, d => d.children ?? []);
    const tree = d3.tree<TreeNode>().nodeSize([170, 250]);
    const laid = tree(hierarchy);

    const rawNodes = laid
      .descendants()
      .filter(n => n.data.id !== '__root__' && n.data.troop)
      .map(n => ({ id: n.data.id, troop: n.data.troop!, x: n.x, y: n.y, matched: directMatched.size > 0 && directMatched.has(n.data.id) }));
    const rawLinks = laid
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

    if (rawNodes.length === 0) return null;
    const minX = Math.min(...rawNodes.map(n => n.y));
    const maxX = Math.max(...rawNodes.map(n => n.y));
    const minY = Math.min(...rawNodes.map(n => n.x));
    const maxY = Math.max(...rawNodes.map(n => n.x));
    const pad = 110;
    const nodeW = 184;
    const nodeH = 78;
    const width = Math.max(420, (maxX - minX) + nodeW + pad * 2);
    const height = Math.max(320, (maxY - minY) + nodeH + pad * 2);
    const nodes: LayoutNode[] = rawNodes.map(n => ({
      ...n,
      px: (n.y - minX) + pad,
      py: (n.x - minY) + pad
    }));
    const links: LayoutLink[] = rawLinks.map(l => ({
      ...l,
      sourceX: (l.sourceX - minX) + pad,
      sourceY: (l.sourceY - minY) + pad,
      targetX: (l.targetX - minX) + pad,
      targetY: (l.targetY - minY) + pad
    }));

    return { width, height, nodes, links, parents, children };
  }, [troops, loweredQuery, tierFilter]);

  const nodeMap = React.useMemo(() => {
    const map = new Map<string, LayoutNode>();
    layout?.nodes.forEach(n => map.set(n.id, n));
    return map;
  }, [layout]);

  const selectedNode = selectedId ? nodeMap.get(selectedId) ?? null : null;

  const fitToView = React.useCallback((targetLayout: NonNullable<typeof layout>) => {
    const scale = Math.max(0.35, Math.min(1.2, Math.min((size.w - 40) / targetLayout.width, (size.h - 40) / targetLayout.height)));
    const x = (size.w - targetLayout.width * scale) / 2;
    const y = (size.h - targetLayout.height * scale) / 2;
    setTransform({ x, y, scale });
  }, [size.h, size.w]);

  const centerOnNode = React.useCallback((id: string, nextScale?: number) => {
    if (!layout) return;
    const node = nodeMap.get(id);
    if (!node) return;
    const scale = Math.max(0.3, Math.min(2.4, nextScale ?? transform.scale));
    const x = size.w / 2 - node.px * scale;
    const y = size.h / 2 - node.py * scale;
    setTransform({ x, y, scale });
  }, [layout, nodeMap, size.w, size.h, transform.scale]);

  const highlightPath = React.useCallback((id: string) => {
    if (!layout) return;
    const set = new Set<string>();
    const up = [id];
    while (up.length > 0) {
      const cur = up.pop()!;
      if (set.has(cur)) continue;
      set.add(cur);
      (layout.parents.get(cur) ?? []).forEach(parent => up.push(parent));
    }
    const down = [id];
    while (down.length > 0) {
      const cur = down.pop()!;
      if (set.has(cur)) set.add(cur);
      (layout.children.get(cur) ?? []).forEach(child => {
        if (!set.has(child)) set.add(child);
        down.push(child);
      });
    }
    setHighlightIds(set);
  }, [layout]);

  React.useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new ResizeObserver(() => {
      setSize({ w: el.clientWidth, h: el.clientHeight });
    });
    observer.observe(el);
    setSize({ w: el.clientWidth, h: el.clientHeight });
    return () => observer.disconnect();
  }, [isFullscreen]);

  React.useEffect(() => {
    if (!layout) return;
    fitToView(layout);
  }, [layout, fitToView]);

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    if (target.closest('[data-node-card]') || target.closest('[data-minimap]')) return;
    e.preventDefault();
    pointerRef.current = {
      active: true,
      id: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      baseX: transform.x,
      baseY: transform.y
    };
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!pointerRef.current.active || pointerRef.current.id !== e.pointerId) return;
    const dx = e.clientX - pointerRef.current.startX;
    const dy = e.clientY - pointerRef.current.startY;
    setTransform(prev => ({ ...prev, x: pointerRef.current.baseX + dx, y: pointerRef.current.baseY + dy }));
  };

  const onPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (pointerRef.current.id !== e.pointerId) return;
    pointerRef.current.active = false;
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {}
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

  const moveFromMiniMap = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!layout) return;
    const miniRect = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
    const miniW = miniRect.width;
    const miniH = miniRect.height;
    const s = Math.min(miniW / layout.width, miniH / layout.height);
    const contentW = layout.width * s;
    const contentH = layout.height * s;
    const ox = (miniW - contentW) / 2;
    const oy = (miniH - contentH) / 2;
    const x = Math.max(0, Math.min(contentW, e.clientX - miniRect.left - ox));
    const y = Math.max(0, Math.min(contentH, e.clientY - miniRect.top - oy));
    const worldX = x / s;
    const worldY = y / s;
    setTransform(prev => ({
      ...prev,
      x: size.w / 2 - worldX * prev.scale,
      y: size.h / 2 - worldY * prev.scale
    }));
  };

  if (!layout) {
    return (
      <div className="h-[70vh] border border-dashed border-stone-800 rounded flex items-center justify-center text-stone-500 text-sm">
        没找到符合条件的升级树
      </div>
    );
  }

  const miniW = 220;
  const miniH = 140;
  const miniScale = Math.min(miniW / layout.width, miniH / layout.height);
  const miniContentW = layout.width * miniScale;
  const miniContentH = layout.height * miniScale;
  const miniOX = (miniW - miniContentW) / 2;
  const miniOY = (miniH - miniContentH) / 2;

  const worldLeft = -transform.x / transform.scale;
  const worldTop = -transform.y / transform.scale;
  const worldViewW = size.w / transform.scale;
  const worldViewH = size.h / transform.scale;
  const viewX = miniOX + worldLeft * miniScale;
  const viewY = miniOY + worldTop * miniScale;
  const viewW = worldViewW * miniScale;
  const viewH = worldViewH * miniScale;

  return (
    <div className={isFullscreen ? 'fixed inset-2 z-[70] bg-black/90 rounded border border-stone-700' : ''}>
      <div
        ref={containerRef}
        className={`relative overflow-hidden border border-stone-800 rounded bg-stone-950/40 ${isFullscreen ? 'h-full' : 'h-[70vh]'}`}
        style={{ touchAction: 'none' }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
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
              const active = highlightIds.has(link.sourceId) && highlightIds.has(link.targetId);
              return (
                <path
                  key={`${link.sourceId}_${link.targetId}`}
                  d={d}
                  fill="none"
                  stroke={active ? 'rgba(251,191,36,0.95)' : 'rgba(120,113,108,0.65)'}
                  strokeWidth={active ? 3 : 2}
                />
              );
            })}
          </svg>
          {layout.nodes.map(node => {
            const Icon = pickIcon(node.troop);
            const tierColor = node.troop.tier >= 5 ? 'text-rose-300' : node.troop.tier >= 4 ? 'text-amber-300' : 'text-stone-300';
            const selected = selectedId === node.id;
            const highlighted = highlightIds.has(node.id);
            return (
              <button
                key={node.id}
                data-node-card="1"
                onClick={() => setSelectedId(node.id)}
                onDoubleClick={() => {
                  setSelectedId(node.id);
                  highlightPath(node.id);
                  centerOnNode(node.id);
                }}
                className={`absolute w-[184px] h-[78px] rounded border px-3 py-2 bg-stone-900/90 shadow text-left ${selected ? 'border-amber-500 shadow-amber-900/50' : highlighted ? 'border-amber-700' : node.matched ? 'border-amber-600' : 'border-stone-700'}`}
                style={{ left: `${node.px - 92}px`, top: `${node.py - 39}px` }}
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
              </button>
            );
          })}
        </div>

        <div className="absolute left-3 top-3 flex items-center gap-2">
          <Button variant="secondary" size="sm" onClick={() => fitToView(layout)}>重置视图</Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setIsFullscreen(v => !v)}
            className="flex items-center gap-1"
          >
            {isFullscreen ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
            {isFullscreen ? '返回' : '全屏'}
          </Button>
        </div>

        <div className="absolute right-3 top-3 text-[11px] text-stone-500 bg-black/40 border border-stone-800 rounded px-2 py-1">
          拖拽平移 · 滚轮缩放（{Math.round(transform.scale * 100)}%）
        </div>

        <div
          data-minimap="1"
          className="absolute left-3 bottom-3 w-[220px] h-[140px] bg-black/60 border border-stone-700 rounded p-1 cursor-crosshair"
          onMouseDown={(e) => {
            e.preventDefault();
            moveFromMiniMap(e);
          }}
          onMouseMove={(e) => {
            if ((e.buttons & 1) === 1) moveFromMiniMap(e);
          }}
        >
          <svg width={miniW - 8} height={miniH - 8} viewBox={`0 0 ${miniW - 8} ${miniH - 8}`} className="block">
            {layout.links.map(link => {
              const active = highlightIds.has(link.sourceId) && highlightIds.has(link.targetId);
              return (
                <line
                  key={`mini_${link.sourceId}_${link.targetId}`}
                  x1={miniOX + link.sourceX * miniScale}
                  y1={miniOY + link.sourceY * miniScale}
                  x2={miniOX + link.targetX * miniScale}
                  y2={miniOY + link.targetY * miniScale}
                  stroke={active ? 'rgba(251,191,36,0.9)' : 'rgba(113,113,122,0.8)'}
                  strokeWidth={active ? 1.5 : 1}
                />
              );
            })}
            {layout.nodes.map(node => {
              const selected = selectedId === node.id;
              const highlighted = highlightIds.has(node.id);
              return (
                <circle
                  key={`mini_node_${node.id}`}
                  cx={miniOX + node.px * miniScale}
                  cy={miniOY + node.py * miniScale}
                  r={selected ? 3.4 : 2.6}
                  fill={selected ? 'rgba(251,191,36,1)' : highlighted ? 'rgba(245,158,11,0.9)' : 'rgba(203,213,225,0.8)'}
                />
              );
            })}
            <rect
              x={viewX}
              y={viewY}
              width={Math.max(8, viewW)}
              height={Math.max(8, viewH)}
              fill="rgba(245,158,11,0.08)"
              stroke="rgba(245,158,11,0.95)"
              strokeWidth={1.2}
            />
          </svg>
        </div>

        {selectedNode && (
          <div className="absolute right-3 bottom-3 w-[320px] max-h-[60%] overflow-auto bg-stone-900/95 border border-stone-700 rounded p-3 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div>
                <div className="text-stone-100 font-semibold">{selectedNode.troop.name}</div>
                <div className="text-xs text-stone-500 mt-0.5">{selectedNode.id} · T{selectedNode.troop.tier}</div>
              </div>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  highlightPath(selectedNode.id);
                  centerOnNode(selectedNode.id);
                }}
              >
                居中并高亮
              </Button>
            </div>
            {selectedNode.troop.description && (
              <div className="text-xs text-stone-300 leading-relaxed">{selectedNode.troop.description}</div>
            )}
            <div>
              <div className="text-xs text-stone-500 mb-1">装备</div>
              <div className="text-xs text-stone-300">
                {(selectedNode.troop.equipment ?? []).length > 0 ? selectedNode.troop.equipment.join(' · ') : '无'}
              </div>
            </div>
            <div className="flex items-center justify-between gap-3">
              <div className="text-xs text-stone-300">
                攻{selectedNode.troop.attributes.attack} 防{selectedNode.troop.attributes.defense} 敏{selectedNode.troop.attributes.agility}
                <br />
                体{selectedNode.troop.attributes.hp} 远{selectedNode.troop.attributes.range} 士{selectedNode.troop.attributes.morale}
              </div>
              <TroopRadar attributes={selectedNode.troop.attributes} size={110} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
