import React from 'react';
import { Map as MapIcon } from 'lucide-react';
import { Button } from './Button';
import { Location } from '../types';

type MapListModalProps = {
  locations: Location[];
  playerDay: number;
  mapListQuery: string;
  setMapListQuery: (value: string) => void;
  mapListTypeFilter: Location['type'] | 'ALL' | 'MINE';
  setMapListTypeFilter: (value: Location['type'] | 'ALL' | 'MINE') => void;
  focusLocationOnMap: (location: Location) => void;
  onClose: () => void;
};

export const MapListModal = ({
  locations,
  playerDay,
  mapListQuery,
  setMapListQuery,
  mapListTypeFilter,
  setMapListTypeFilter,
  focusLocationOnMap,
  onClose
}: MapListModalProps) => {
  const typeLabel: Record<Location['type'], string> = {
    VILLAGE: '村庄',
    CASTLE: '城堡',
    CITY: '城市',
    ROACH_NEST: '蟑螂窝',
    RUINS: '废墟',
    TRAINING_GROUNDS: '训练场',
    HEAVY_TRIAL_GROUNDS: '重型试验场',
    ASYLUM: '精神病院',
    GRAVEYARD: '陵园',
    MARKET: '市场',
    HOTPOT_RESTAURANT: '食府',
    BANDIT_CAMP: '匪营',
    MYSTERIOUS_CAVE: '洞窟',
    COFFEE: '咖啡馆',
    IMPOSTER_PORTAL: '传送门',
    WORLD_BOARD: '公告栏',
    VOID_BUFFER_MINE: '虚空缓冲区',
    MEMORY_OVERFLOW_MINE: '内存溢出大峡谷',
    LOGIC_PARADOX_MINE: '逻辑悖论深渊',
    HERO_CRYSTAL_MINE: '英雄水晶矿脉',
    BLACKSMITH: '铁匠铺',
    ALTAR: '祭坛',
    MAGICIAN_LIBRARY: '魔法师图书馆',
    SOURCE_RECOMPILER: '源码重塑塔',
    FIELD_CAMP: '行军营地',
    HABITAT: '栖息地',
    HIDEOUT: '隐匿点'
  };

  const typeBadge: Record<Location['type'], string> = {
    VILLAGE: 'bg-green-900/30 border-green-900/60 text-green-200',
    CASTLE: 'bg-stone-800 border-stone-700 text-stone-200',
    CITY: 'bg-amber-900/30 border-amber-900/60 text-amber-200',
    ROACH_NEST: 'bg-lime-950/30 border-lime-900/60 text-lime-200',
    RUINS: 'bg-purple-900/25 border-purple-900/50 text-purple-200',
    TRAINING_GROUNDS: 'bg-blue-900/25 border-blue-900/50 text-blue-200',
    HEAVY_TRIAL_GROUNDS: 'bg-slate-900/35 border-slate-700 text-slate-200',
    ASYLUM: 'bg-pink-900/25 border-pink-900/50 text-pink-200',
    GRAVEYARD: 'bg-stone-900/40 border-stone-700 text-stone-200',
    MARKET: 'bg-green-900/25 border-green-900/50 text-green-200',
    HOTPOT_RESTAURANT: 'bg-red-900/25 border-red-900/50 text-red-200',
    BANDIT_CAMP: 'bg-red-950/30 border-red-900/60 text-red-200',
    MYSTERIOUS_CAVE: 'bg-indigo-900/25 border-indigo-900/50 text-indigo-200',
    COFFEE: 'bg-amber-950/25 border-amber-900/50 text-amber-200',
    IMPOSTER_PORTAL: 'bg-fuchsia-950/30 border-fuchsia-900/60 text-fuchsia-200',
    WORLD_BOARD: 'bg-slate-900/30 border-slate-700 text-slate-200',
    VOID_BUFFER_MINE: 'bg-slate-900/40 border-slate-700 text-slate-200',
    MEMORY_OVERFLOW_MINE: 'bg-emerald-900/30 border-emerald-900/60 text-emerald-200',
    LOGIC_PARADOX_MINE: 'bg-violet-900/25 border-violet-900/50 text-violet-200',
    HERO_CRYSTAL_MINE: 'bg-purple-950/30 border-purple-900/60 text-purple-200',
    BLACKSMITH: 'bg-orange-900/25 border-orange-900/50 text-orange-200',
    ALTAR: 'bg-indigo-950/30 border-indigo-900/50 text-indigo-200',
    MAGICIAN_LIBRARY: 'bg-sky-950/30 border-sky-900/50 text-sky-200',
    SOURCE_RECOMPILER: 'bg-fuchsia-950/30 border-fuchsia-900/60 text-fuchsia-200',
    FIELD_CAMP: 'bg-stone-900/40 border-stone-700 text-stone-200',
    HABITAT: 'bg-emerald-950/25 border-emerald-900/50 text-emerald-200',
    HIDEOUT: 'bg-emerald-950/30 border-emerald-900/60 text-emerald-200'
  };

  const mineTypes: Location['type'][] = ['VOID_BUFFER_MINE', 'MEMORY_OVERFLOW_MINE', 'LOGIC_PARADOX_MINE', 'HERO_CRYSTAL_MINE'];
  const typeOptions = ['ALL', 'MINE', ...Object.keys(typeLabel).filter(type => !mineTypes.includes(type as Location['type']) && type !== 'FIELD_CAMP')] as Array<Location['type'] | 'ALL' | 'MINE'>;
  const query = mapListQuery.trim().toLowerCase();
  const activeType = mapListTypeFilter;
  const getLocationBgStyle = (loc: Location) => ({
    backgroundImage: `url("/image/${loc.type}.webp"), url("/image/${loc.type}.png"), url("/image/${loc.type}.jpg"), url("/image/${loc.type}.jpeg")`,
    backgroundSize: 'cover',
    backgroundPosition: 'center'
  });

  const sorted = [...locations]
    .filter(loc => loc.type !== 'FIELD_CAMP')
    .sort((a, b) => {
    const at = typeLabel[a.type] ?? a.type;
    const bt = typeLabel[b.type] ?? b.type;
    const typeCmp = at.localeCompare(bt, 'zh-CN');
    if (typeCmp !== 0) return typeCmp;
    return a.name.localeCompare(b.name, 'zh-CN');
  });
  const filtered = sorted.filter(loc => {
    if (activeType === 'MINE' && !mineTypes.includes(loc.type)) return false;
    if (activeType !== 'ALL' && activeType !== 'MINE' && loc.type !== activeType) return false;
    if (!query) return true;
    const text = `${loc.name} ${loc.description} ${loc.terrain} ${typeLabel[loc.type] ?? loc.type}`.toLowerCase();
    return text.includes(query);
  });

  return (
    <div
      className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-3xl bg-stone-900 border border-stone-700 rounded shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-stone-800">
          <div className="flex items-center gap-2">
            <MapIcon size={18} className="text-stone-300" />
            <h3 className="text-lg font-bold text-stone-200">据点列表</h3>
            <span className="text-xs text-stone-500">({filtered.length}/{sorted.length})</span>
          </div>
          <button
            onClick={onClose}
            className="text-stone-400 hover:text-white"
          >
            关闭
          </button>
        </div>
        <div className="px-4 pt-4 pb-2 border-b border-stone-800">
          <div className="flex flex-col md:flex-row gap-3">
            <input
              value={mapListQuery}
              onChange={(e) => setMapListQuery(e.target.value)}
              placeholder="搜索据点名称、描述或地形"
              className="flex-1 bg-stone-950 border border-stone-700 rounded px-3 py-2 text-stone-200 placeholder:text-stone-600"
            />
            <select
              value={activeType}
              onChange={(e) => setMapListTypeFilter(e.target.value as Location['type'] | 'ALL' | 'MINE')}
              className="bg-stone-950 border border-stone-700 rounded px-3 py-2 text-stone-200"
            >
              {typeOptions.map(type => (
                <option key={type} value={type}>
                  {type === 'ALL' ? '全部类型' : type === 'MINE' ? '矿山' : (typeLabel[type as Location['type']] ?? type)}
                </option>
              ))}
            </select>
            <Button
              variant="secondary"
              onClick={() => {
                setMapListQuery('');
                setMapListTypeFilter('ALL');
              }}
              disabled={!mapListQuery && activeType === 'ALL'}
            >
              清空
            </Button>
          </div>
        </div>

        <div className="p-4 max-h-[62vh] overflow-y-auto scrollbar-hide space-y-3">
          {filtered.map((loc) => {
            const isImposterAlerted = (loc.imposterAlertUntilDay ?? 0) >= playerDay;
            const isSacked = (loc.sackedUntilDay ?? 0) >= playerDay;
            return (
              <div key={loc.id} className="relative bg-stone-950/40 border border-stone-800 rounded overflow-hidden">
                <div className="absolute inset-0 opacity-30" style={getLocationBgStyle(loc)} />
                <div className="absolute inset-0 bg-gradient-to-r from-stone-950/90 via-stone-950/70 to-stone-950/30" />
                <div className="relative p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <div className="text-stone-200 font-bold truncate">{loc.name}</div>
                        <span className={`text-[10px] px-2 py-0.5 rounded border ${typeBadge[loc.type]}`}>
                          {typeLabel[loc.type] ?? loc.type}
                        </span>
                        <span className="text-[10px] px-2 py-0.5 rounded border border-stone-700 text-stone-400 bg-stone-900/30">
                          {loc.terrain}
                        </span>
                        {isImposterAlerted && (
                          <span className="text-[10px] px-2 py-0.5 rounded border border-red-700 text-red-300 bg-red-950/50">
                            入侵中
                          </span>
                        )}
                        {isSacked && (
                          <span className="text-[10px] px-2 py-0.5 rounded border border-amber-800 text-amber-300 bg-amber-950/40">
                            被洗劫
                          </span>
                        )}
                      </div>
                      <div className="text-sm text-stone-400 mt-1 leading-relaxed">{loc.description}</div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <Button onClick={() => focusLocationOnMap(loc)} variant="secondary">
                        定位
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
          {filtered.length === 0 && (
            <div className="text-stone-500 text-sm text-center py-12 border border-dashed border-stone-800 rounded">
              没找到符合条件的据点
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
