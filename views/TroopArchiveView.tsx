import React from 'react';
import { Scroll } from 'lucide-react';
import { Troop, TroopTier } from '../types';
import { Button } from '../components/Button';

type TroopArchiveFactionFilter = 'ALL' | 'HUMAN' | 'ROACH' | 'IMPOSTER' | 'ASYLUM' | 'UNDEAD' | 'HOTPOT' | 'GOBLIN' | 'CUSTOM';
type TroopArchiveCategoryFilter = 'ALL' | 'NORMAL' | 'HEAVY';
type TroopArchiveSort = 'TIER' | 'NAME' | 'TOTAL' | 'ATTACK' | 'DEFENSE' | 'AGILITY' | 'HP' | 'RANGE' | 'MORALE';

type TroopArchiveViewProps = {
  troopTemplates: Record<string, Omit<Troop, 'count' | 'xp'>>;
  customTroopTemplates: Record<string, Omit<Troop, 'count' | 'xp'>>;
  troopArchiveQuery: string;
  setTroopArchiveQuery: (value: string) => void;
  troopArchiveFactionFilter: TroopArchiveFactionFilter;
  setTroopArchiveFactionFilter: (value: TroopArchiveFactionFilter) => void;
  troopArchiveTierFilter: TroopTier | 'ALL';
  setTroopArchiveTierFilter: (value: TroopTier | 'ALL') => void;
  troopArchiveCategoryFilter: TroopArchiveCategoryFilter;
  setTroopArchiveCategoryFilter: (value: TroopArchiveCategoryFilter) => void;
  troopArchiveSort: TroopArchiveSort;
  setTroopArchiveSort: (value: TroopArchiveSort) => void;
  troopArchivePage: number;
  setTroopArchivePage: (value: number) => void;
  troopArchivePageSize: number;
  setTroopArchivePageSize: (value: number) => void;
  onBackToWorldBoard: () => void;
  onBackToMap: () => void;
};

export const TroopArchiveView = ({
  troopTemplates,
  customTroopTemplates,
  troopArchiveQuery,
  setTroopArchiveQuery,
  troopArchiveFactionFilter,
  setTroopArchiveFactionFilter,
  troopArchiveTierFilter,
  setTroopArchiveTierFilter,
  troopArchiveCategoryFilter,
  setTroopArchiveCategoryFilter,
  troopArchiveSort,
  setTroopArchiveSort,
  troopArchivePage,
  setTroopArchivePage,
  troopArchivePageSize,
  setTroopArchivePageSize,
  onBackToWorldBoard,
  onBackToMap
}: TroopArchiveViewProps) => {
  const [archiveViewMode, setArchiveViewMode] = React.useState<'LIST' | 'TREE'>('LIST');
  const templateMap = { ...troopTemplates, ...customTroopTemplates };
  const allTroops = Object.values(templateMap);

  const isCustomTemplate = (id: string) => Object.prototype.hasOwnProperty.call(customTroopTemplates, id);

  const guessFaction = (id: string): TroopArchiveFactionFilter => {
    if (isCustomTemplate(id)) return 'CUSTOM';
    if (id.startsWith('roach_')) return 'ROACH';
    if (id.startsWith('goblin_')) return 'GOBLIN';
    if (
      id.startsWith('imposter_') ||
      id.startsWith('void_') ||
      id.startsWith('glitch_') ||
      id.startsWith('static_') ||
      id.startsWith('null_') ||
      id.startsWith('entropy_') ||
      id.startsWith('pixel_') ||
      id.startsWith('syntax_') ||
      id.startsWith('memory_') ||
      id.startsWith('deadlock_') ||
      id.startsWith('buffer_') ||
      id.startsWith('kernel_') ||
      id.startsWith('segmentation_') ||
      id.startsWith('not_found_') ||
      id.startsWith('legacy_code_') ||
      id.startsWith('system_crash_') ||
      id.startsWith('infinite_loop_') ||
      id.startsWith('recursion_')
    ) return 'IMPOSTER';
    if (
      id === 'zombie' ||
      id.startsWith('skeleton_') ||
      id.startsWith('specter_') ||
      id.startsWith('death_') ||
      id.startsWith('lich_')
    ) return 'UNDEAD';
    if (
      id.startsWith('meatball_') ||
      id.startsWith('tofu_') ||
      id.startsWith('noodle_') ||
      id.startsWith('spice_') ||
      id.startsWith('broth_') ||
      id.startsWith('hotpot_')
    ) return 'HOTPOT';
    if (
      id.startsWith('mad_') ||
      id.startsWith('asylum_') ||
      id === 'finger_thrower' ||
      id === 'headbanger_brute' ||
      id === 'delusional_knight' ||
      id === 'screaming_alchemist'
    ) return 'ASYLUM';
    return 'HUMAN';
  };

  const factionLabel: Record<TroopArchiveFactionFilter | 'ALL', string> = {
    ALL: '全部',
    HUMAN: '人类',
    ROACH: '蟑螂',
    IMPOSTER: '伪人/故障',
    ASYLUM: '疯人院',
    UNDEAD: '亡灵',
    HOTPOT: '食府',
    GOBLIN: '哥布林',
    CUSTOM: '自定义'
  };
  const categoryLabel: Record<TroopArchiveCategoryFilter, string> = {
    ALL: '全部',
    NORMAL: '常规',
    HEAVY: '重型'
  };

  const tierLabel = (tier: TroopTier) => `T${tier}`;

  const query = troopArchiveQuery.trim().toLowerCase();
  const matchQuery = (t: Omit<Troop, 'count' | 'xp'>) => {
    if (!query) return true;
    const text = `${t.id} ${t.name} ${(t.equipment ?? []).join(' ')} ${String(t.description ?? '')}`.toLowerCase();
    return text.includes(query);
  };
  const filtered = allTroops
    .filter(t => {
      if (troopArchiveTierFilter !== 'ALL' && t.tier !== troopArchiveTierFilter) return false;
      const faction = guessFaction(t.id);
      if (troopArchiveFactionFilter !== 'ALL' && faction !== troopArchiveFactionFilter) return false;
      const category = t.category ?? 'NORMAL';
      if (troopArchiveCategoryFilter !== 'ALL' && category !== troopArchiveCategoryFilter) return false;
      return matchQuery(t);
    })
    .sort((a, b) => {
      const byName = () => a.name.localeCompare(b.name, 'zh-CN');
      if (troopArchiveSort === 'NAME') return byName();
      if (troopArchiveSort === 'TIER') {
        const tierCmp = a.tier - b.tier;
        if (tierCmp !== 0) return tierCmp;
        return byName();
      }
      const getValue = (t: Omit<Troop, 'count' | 'xp'>) => {
        const attrs = t.attributes;
        if (troopArchiveSort === 'TOTAL') return attrs.attack + attrs.defense + attrs.agility + attrs.hp + attrs.range + attrs.morale;
        if (troopArchiveSort === 'ATTACK') return attrs.attack;
        if (troopArchiveSort === 'DEFENSE') return attrs.defense;
        if (troopArchiveSort === 'AGILITY') return attrs.agility;
        if (troopArchiveSort === 'HP') return attrs.hp;
        if (troopArchiveSort === 'RANGE') return attrs.range;
        return attrs.morale;
      };
      const diff = getValue(b) - getValue(a);
      if (diff !== 0) return diff;
      const tierCmp = a.tier - b.tier;
      if (tierCmp !== 0) return tierCmp;
      return byName();
    });

  const treeCandidates = allTroops.filter(t => {
    const faction = guessFaction(t.id);
    if (troopArchiveFactionFilter !== 'ALL' && faction !== troopArchiveFactionFilter) return false;
    const category = t.category ?? 'NORMAL';
    if (troopArchiveCategoryFilter !== 'ALL' && category !== troopArchiveCategoryFilter) return false;
    return true;
  });
  const treeMatchIds = query ? new Set(treeCandidates.filter(matchQuery).map(t => t.id)) : null;
  const treeMap = treeCandidates.reduce((acc, t) => {
    acc.set(t.id, t);
    return acc;
  }, new Map<string, Omit<Troop, 'count' | 'xp'>>());
  const treeTargets = treeCandidates.reduce((acc, t) => {
    if (t.upgradeTargetId) acc.add(t.upgradeTargetId);
    return acc;
  }, new Set<string>());
  const treeRoots = treeCandidates
    .filter(t => !treeTargets.has(t.id))
    .sort((a, b) => (a.tier - b.tier) || a.name.localeCompare(b.name, 'zh-CN'));
  const buildTreePath = (root: Omit<Troop, 'count' | 'xp'>) => {
    const path: Array<Omit<Troop, 'count' | 'xp'>> = [];
    const visited = new Set<string>();
    let current: Omit<Troop, 'count' | 'xp'> | undefined = root;
    while (current && !visited.has(current.id)) {
      visited.add(current.id);
      path.push(current);
      const nextId = current.upgradeTargetId;
      if (!nextId) break;
      current = treeMap.get(nextId);
    }
    return path;
  };
  const treePaths = treeRoots
    .map(buildTreePath)
    .filter(path => {
      const matchTier = troopArchiveTierFilter === 'ALL' ? true : path.some(t => t.tier === troopArchiveTierFilter);
      if (!matchTier) return false;
      if (!treeMatchIds) return true;
      return path.some(t => treeMatchIds.has(t.id));
    });

  const attrOrder = [
    { key: 'attack', label: '攻' },
    { key: 'defense', label: '防' },
    { key: 'agility', label: '敏' },
    { key: 'hp', label: '体' },
    { key: 'range', label: '远' },
    { key: 'morale', label: '士' }
  ] as const;
  type AttrKey = typeof attrOrder[number]['key'];

  const calcStats = () => {
    const count = filtered.length;
    const sum = {
      attack: 0,
      defense: 0,
      agility: 0,
      hp: 0,
      range: 0,
      morale: 0
    };
    const max: Record<AttrKey, { value: number; troopId: string; troopName: string }> = {
      attack: { value: -1, troopId: '', troopName: '' },
      defense: { value: -1, troopId: '', troopName: '' },
      agility: { value: -1, troopId: '', troopName: '' },
      hp: { value: -1, troopId: '', troopName: '' },
      range: { value: -1, troopId: '', troopName: '' },
      morale: { value: -1, troopId: '', troopName: '' }
    };

    for (const t of filtered) {
      sum.attack += t.attributes.attack;
      sum.defense += t.attributes.defense;
      sum.agility += t.attributes.agility;
      sum.hp += t.attributes.hp;
      sum.range += t.attributes.range;
      sum.morale += t.attributes.morale;

      (Object.keys(max) as Array<AttrKey>).forEach(key => {
        const value = t.attributes[key];
        if (value > max[key].value) max[key] = { value, troopId: t.id, troopName: t.name };
      });
    }

    const avg = {
      attack: count ? Math.round(sum.attack / count) : 0,
      defense: count ? Math.round(sum.defense / count) : 0,
      agility: count ? Math.round(sum.agility / count) : 0,
      hp: count ? Math.round(sum.hp / count) : 0,
      range: count ? Math.round(sum.range / count) : 0,
      morale: count ? Math.round(sum.morale / count) : 0
    };
    return { count, avg, max };
  };

  const stats = calcStats();

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

  const tierOptions: Array<TroopTier | 'ALL'> = ['ALL', TroopTier.TIER_1, TroopTier.TIER_2, TroopTier.TIER_3, TroopTier.TIER_4, TroopTier.TIER_5];
  const factionOptions: Array<TroopArchiveFactionFilter> = ['ALL', 'HUMAN', 'ROACH', 'IMPOSTER', 'ASYLUM', 'UNDEAD', 'HOTPOT', 'GOBLIN', 'CUSTOM'];
  const categoryOptions: Array<TroopArchiveCategoryFilter> = ['ALL', 'NORMAL', 'HEAVY'];

  const sortOptions: Array<{ value: TroopArchiveSort; label: string }> = [
    { value: 'TIER', label: '按阶级' },
    { value: 'NAME', label: '按名称' },
    { value: 'TOTAL', label: '按综合' },
    { value: 'ATTACK', label: '按攻击' },
    { value: 'DEFENSE', label: '按防御' },
    { value: 'AGILITY', label: '按敏捷' },
    { value: 'HP', label: '按体魄' },
    { value: 'RANGE', label: '按远程' },
    { value: 'MORALE', label: '按士气' }
  ];
  const pageSizeOptions = [8, 12, 24, 48];
  const totalItems = filtered.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / troopArchivePageSize));
  const safePage = Math.min(Math.max(1, troopArchivePage), totalPages);
  const pageStart = (safePage - 1) * troopArchivePageSize;
  const pageEnd = Math.min(totalItems, pageStart + troopArchivePageSize);
  const paged = filtered.slice(pageStart, pageEnd);

  return (
    <div className="min-h-[80vh] p-4 pt-6">
      <div className="max-w-6xl mx-auto space-y-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-stone-900 border border-stone-700 flex items-center justify-center">
              <Scroll className="text-amber-300" size={20} />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-stone-200">兵种档案</h2>
              <div className="text-xs text-stone-500">六维雷达图 · 筛选 · 统计</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="secondary" onClick={onBackToWorldBoard}>返回公告栏</Button>
            <Button variant="secondary" onClick={onBackToMap}>返回地图</Button>
          </div>
        </div>

        <div className="bg-stone-900/70 border border-stone-700 rounded p-4 space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
            <div className="md:col-span-2">
              <label className="block text-xs text-stone-500 mb-1">搜索</label>
              <input
                value={troopArchiveQuery}
                onChange={(e) => {
                  setTroopArchiveQuery(e.target.value);
                  setTroopArchivePage(1);
                }}
                placeholder="按名称 / id / 描述 / 装备…"
                className="w-full bg-black/40 border border-stone-700 rounded px-3 py-2 text-sm text-stone-200 outline-none focus:border-amber-700"
              />
            </div>
            <div>
              <label className="block text-xs text-stone-500 mb-1">阵营</label>
              <select
                value={troopArchiveFactionFilter}
                onChange={(e) => {
                  setTroopArchiveFactionFilter(e.target.value as TroopArchiveFactionFilter);
                  setTroopArchivePage(1);
                }}
                className="w-full bg-black/40 border border-stone-700 rounded px-3 py-2 text-sm text-stone-200 outline-none focus:border-amber-700"
              >
                {factionOptions.map(opt => (
                  <option key={opt} value={opt}>{factionLabel[opt]}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-stone-500 mb-1">阶级</label>
              <select
                value={troopArchiveTierFilter}
                onChange={(e) => {
                  setTroopArchiveTierFilter((e.target.value === 'ALL' ? 'ALL' : Number(e.target.value)) as TroopTier | 'ALL');
                  setTroopArchivePage(1);
                }}
                className="w-full bg-black/40 border border-stone-700 rounded px-3 py-2 text-sm text-stone-200 outline-none focus:border-amber-700"
              >
                {tierOptions.map(opt => (
                  <option key={String(opt)} value={String(opt)}>{opt === 'ALL' ? '全部' : tierLabel(opt)}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-stone-500 mb-1">类别</label>
              <select
                value={troopArchiveCategoryFilter}
                onChange={(e) => {
                  setTroopArchiveCategoryFilter(e.target.value as TroopArchiveCategoryFilter);
                  setTroopArchivePage(1);
                }}
                className="w-full bg-black/40 border border-stone-700 rounded px-3 py-2 text-sm text-stone-200 outline-none focus:border-amber-700"
              >
                {categoryOptions.map(opt => (
                  <option key={opt} value={opt}>{categoryLabel[opt]}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
            <div>
              <label className="block text-xs text-stone-500 mb-1">排序</label>
              <select
                value={troopArchiveSort}
                onChange={(e) => {
                  setTroopArchiveSort(e.target.value as TroopArchiveSort);
                  setTroopArchivePage(1);
                }}
                className="w-full bg-black/40 border border-stone-700 rounded px-3 py-2 text-sm text-stone-200 outline-none focus:border-amber-700"
              >
                {sortOptions.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-stone-500 mb-1">显示</label>
              <select
                value={archiveViewMode}
                onChange={(e) => {
                  setArchiveViewMode(e.target.value as 'LIST' | 'TREE');
                  setTroopArchivePage(1);
                }}
                className="w-full bg-black/40 border border-stone-700 rounded px-3 py-2 text-sm text-stone-200 outline-none focus:border-amber-700"
              >
                <option value="LIST">列表</option>
                <option value="TREE">升级树</option>
              </select>
            </div>
            <div className="md:col-span-3 flex items-end justify-between gap-3">
              <div className="text-xs text-stone-500">
                当前筛选：{filtered.length}/{allTroops.length} 条目
              </div>
              <Button
                variant="secondary"
                onClick={() => {
                  setTroopArchiveQuery('');
                  setTroopArchiveFactionFilter('ALL');
                  setTroopArchiveTierFilter('ALL');
                  setTroopArchiveCategoryFilter('ALL');
                  setTroopArchiveSort('TIER');
                  setTroopArchivePage(1);
                }}
              >
                清空筛选
              </Button>
            </div>
          </div>
        </div>

        <div className="bg-stone-900/70 border border-stone-700 rounded p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="text-stone-200 font-semibold">统计信息</div>
            <div className="text-xs text-stone-500">基于当前筛选结果</div>
          </div>
          {stats.count === 0 ? (
            <div className="text-sm text-stone-500">暂无条目。</div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 text-sm">
              <div className="bg-stone-950/60 border border-stone-800 rounded p-3 space-y-2">
                <div className="text-xs text-stone-500">条目数</div>
                <div className="text-stone-200 font-semibold">{stats.count}</div>
              </div>
              <div className="bg-stone-950/60 border border-stone-800 rounded p-3 space-y-2">
                <div className="text-xs text-stone-500">六维平均</div>
                <div className="flex items-center justify-between gap-3">
                  <div className="text-xs text-stone-300">
                    {attrOrder.map(a => `${a.label}${stats.avg[a.key]}`).join(' ')}
                  </div>
                  <div className="shrink-0">
                    <TroopRadar attributes={stats.avg} size={110} />
                  </div>
                </div>
              </div>
              <div className="bg-stone-950/60 border border-stone-800 rounded p-3 space-y-2">
                <div className="text-xs text-stone-500">六维最高</div>
                <div className="space-y-1 text-xs text-stone-300">
                  {attrOrder.map(a => (
                    <div key={`max-${a.key}`} className="flex items-center justify-between gap-3">
                      <span>{a.label}{stats.max[a.key].value}</span>
                      <span className="text-stone-400 truncate">{stats.max[a.key].troopName}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {archiveViewMode === 'LIST' && (
        <div className="bg-stone-900/70 border border-stone-700 rounded p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div className="text-xs text-stone-400">
            显示 {totalItems === 0 ? 0 : (pageStart + 1)}-{pageEnd} / {totalItems}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-stone-400">每页</span>
            <select
              value={troopArchivePageSize}
              onChange={(e) => {
                setTroopArchivePageSize(Number(e.target.value));
                setTroopArchivePage(1);
              }}
              className="bg-black/40 border border-stone-700 rounded px-2 py-1 text-xs text-stone-200 outline-none focus:border-amber-700"
            >
              {pageSizeOptions.map(size => (
                <option key={size} value={size}>{size}</option>
              ))}
            </select>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setTroopArchivePage(Math.max(1, safePage - 1))}
              disabled={safePage <= 1}
            >
              上一页
            </Button>
            <div className="text-xs text-stone-400">
              {safePage}/{totalPages}
            </div>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setTroopArchivePage(Math.min(totalPages, safePage + 1))}
              disabled={safePage >= totalPages}
            >
              下一页
            </Button>
          </div>
        </div>
        )}

        {archiveViewMode === 'LIST' ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
          {paged.map(t => (
            <div key={t.id} className="bg-stone-900/70 border border-stone-700 rounded p-3 space-y-3">
              <div className="flex items-center justify-between">
                <div className="text-stone-200 font-semibold">{t.name}</div>
                <div className="text-xs text-stone-500">T{t.tier}</div>
              </div>
              <div className="text-xs text-stone-500">{t.id}</div>
              {t.description && <div className="text-xs text-stone-300 leading-relaxed">{t.description}</div>}
              <div className="flex items-center justify-between">
                <div className="text-xs text-stone-400">{(t.category ?? 'NORMAL') === 'HEAVY' ? '重型' : '常规'}</div>
                <div className="text-xs text-stone-500">{factionLabel[guessFaction(t.id)]}</div>
              </div>
              {t.equipment && t.equipment.length > 0 && (
                <div className="text-xs text-stone-400">{t.equipment.join(' · ')}</div>
              )}
              <div className="flex items-center justify-between gap-3">
                <div className="text-xs text-stone-300">
                  {attrOrder.map(a => `${a.label}${t.attributes[a.key]}`).join(' ')}
                </div>
                <TroopRadar attributes={t.attributes} size={90} />
              </div>
            </div>
          ))}
        </div>
        ) : (
        <div className="space-y-3">
          {treePaths.map((path, idx) => (
            <div key={`${path[0]?.id ?? 'tree'}_${idx}`} className="bg-stone-900/70 border border-stone-700 rounded p-3 overflow-x-auto">
              <div className="flex items-center gap-2 min-w-max">
                {path.map((node, i) => {
                  const isMatch = treeMatchIds ? treeMatchIds.has(node.id) : false;
                  return (
                    <React.Fragment key={node.id}>
                      <div className={`bg-stone-950/60 border rounded p-2 w-64 shrink-0 ${isMatch ? 'border-amber-600' : 'border-stone-800'}`}>
                        <div className="flex items-center justify-between gap-2">
                          <div className="text-sm text-stone-200 font-semibold truncate">{node.name}</div>
                          <div className="text-xs text-stone-500">T{node.tier}</div>
                        </div>
                        <div className="text-xs text-stone-500 mt-1">{node.id}</div>
                        <div className="text-xs text-stone-300 mt-2">
                          {attrOrder.map(a => `${a.label}${node.attributes[a.key]}`).join(' ')}
                        </div>
                      </div>
                      {i < path.length - 1 && (
                        <div className="text-stone-500 px-1">→</div>
                      )}
                    </React.Fragment>
                  );
                })}
              </div>
            </div>
          ))}
          {treePaths.length === 0 && (
            <div className="text-stone-500 text-sm text-center py-12 border border-dashed border-stone-800 rounded">
              没找到符合条件的升级树
            </div>
          )}
        </div>
        )}
      </div>
    </div>
  );
};
