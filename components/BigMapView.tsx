import React, { useState, useMemo } from 'react';
import { AlertTriangle, Brain, Coffee, Coins, Eye, Flag, Ghost, Hammer, History, Home, MapPin, Mountain, Scroll, Shield, ShieldAlert, ShoppingBag, Skull, Snowflake, Star, Sun, Swords, Tent, Trees, Users, Utensils, Zap } from 'lucide-react';
import { Location, MineralId, MineralPurity, PlayerState, WorldDiplomacyState } from '../types';
import { FACTIONS, MAP_HEIGHT, MAP_WIDTH } from '../game/data';
import { Button } from './Button';
import { getTerrainType, type TerrainType } from '../game/utils/terrainNoise';

type WorkState = {
  isActive: boolean;
  locationId: string;
  contractId: string;
  contractTitle: string;
  totalDays: number;
  daysPassed: number;
  totalPay: number;
};

type MiningState = {
  isActive: boolean;
  locationId: string;
  mineralId: MineralId;
  totalDays: number;
  daysPassed: number;
  yieldByPurity: Record<MineralPurity, number>;
};

type RoachLureState = {
  isActive: boolean;
  locationId: string;
  totalDays: number;
  daysPassed: number;
  recruitedByTroopId: Record<string, number>;
};

type HabitatStayState = {
  isActive: boolean;
  locationId: string;
  totalDays: number;
  daysPassed: number;
};

type HideoutStayState = {
  isActive: boolean;
  locationId: string;
  totalDays: number;
  daysPassed: number;
};

export type MapSeason = 'spring' | 'summer' | 'autumn' | 'winter';

/** 装饰层（山/树/雪/日）颜色与透明度 */
const MAP_SEASON_STYLES: Record<MapSeason, {
  mountain: { color: string; opacity: number };
  trees: { color: string; opacity: number };
  snowflake: { color: string; opacity: number };
  sun: { color: string; opacity: number };
}> = {
  spring: {
    mountain: { color: '#5a7c52', opacity: 0.22 },
    trees: { color: '#3d7c3d', opacity: 0.4 },
    snowflake: { color: '#94a3b8', opacity: 0.05 },
    sun: { color: '#facc15', opacity: 0.18 }
  },
  summer: {
    mountain: { color: '#6b8c5c', opacity: 0.22 },
    trees: { color: '#4a7c44', opacity: 0.28 },
    snowflake: { color: '#93c5fd', opacity: 0.12 },
    sun: { color: '#f59e0b', opacity: 0.35 }
  },
  autumn: {
    mountain: { color: '#8b7340', opacity: 0.22 },
    trees: { color: '#b8860b', opacity: 0.45 },
    snowflake: { color: '#94a3b8', opacity: 0.04 },
    sun: { color: '#ea580c', opacity: 0.2 }
  },
  winter: {
    mountain: { color: '#6b7c8c', opacity: 0.28 },
    trees: { color: '#4a5a4a', opacity: 0.1 },
    snowflake: { color: '#e0e7ff', opacity: 0.5 },
    sun: { color: '#93c5fd', opacity: 0.1 }
  }
};

const SEASON_LABELS: Record<MapSeason, string> = {
  spring: '春',
  summer: '夏',
  autumn: '秋',
  winter: '冬'
};

/** 地形 × 季节 颜色：各地形对季节的响应不同 */
const TERRAIN_SEASON_COLORS: Record<TerrainType, Record<MapSeason, string>> = {
  forest: {
    spring: '#4a7c4a',
    summer: '#3d6b3d',
    autumn: '#8b6914',
    winter: '#5a6a5a'
  },
  grassland: {
    spring: '#6bac5a',
    summer: '#8fbc7a',
    autumn: '#a67c4a',
    winter: '#8b9c7a'
  },
  desert: {
    spring: '#c9b896',
    summer: '#d4b896',
    autumn: '#c4a876',
    winter: '#b8a898'
  },
  hills: {
    spring: '#7a8c6a',
    summer: '#8a9c7a',
    autumn: '#9a7c5a',
    winter: '#7a8a9a'
  },
  wetland: {
    spring: '#5a7c5a',
    summer: '#4a6b5a',
    autumn: '#6b5a4a',
    winter: '#5a6a7a'
  }
};

const TERRAIN_GRID_SIZE = 96;
const TERRAIN_CELL_UNITS = MAP_WIDTH / TERRAIN_GRID_SIZE;

type BigMapViewProps = {
  zoom: number;
  camera: { x: number; y: number };
  locations: Location[];
  player: PlayerState;
  isObserverMode?: boolean;
  observerTargets?: Array<{ locationId: string; types: string[] }>;
  observerCurrentAction?: { locationId: string; locationName: string; actionType: string; factionName: string } | null;
  worldDiplomacy?: WorldDiplomacyState;
  onLocationSelect?: (location: Location) => void;
  workState: WorkState | null;
  miningState: MiningState | null;
  roachLureState: RoachLureState | null;
  habitatStayState: HabitatStayState | null;
  hideoutStayState: HideoutStayState | null;
  onAbortWork: () => void;
  onAbortMining: () => void;
  onAbortRoachLure: () => void;
  onAbortHabitat: () => void;
  onAbortHideoutStay: () => void;
  hoveredLocation: Location | null;
  mousePos: { x: number; y: number };
  mapRef: React.RefObject<HTMLDivElement>;
  handleMouseDown: (event: React.MouseEvent<HTMLDivElement>) => void;
  handleMouseMove: (event: React.MouseEvent<HTMLDivElement>) => void;
  handleMouseUp: () => void;
  moveTo: (x: number, y: number, locationId?: string) => void;
  setHoveredLocation: (location: Location | null) => void;
};

export const BigMapView = ({
  zoom,
  camera,
  locations,
  player,
  isObserverMode,
  observerTargets,
  observerCurrentAction,
  worldDiplomacy,
  onLocationSelect,
  workState,
  miningState,
  roachLureState,
  habitatStayState,
  hideoutStayState,
  onAbortWork,
  onAbortMining,
  onAbortRoachLure,
  onAbortHabitat,
  onAbortHideoutStay,
  hoveredLocation,
  mousePos,
  mapRef,
  handleMouseDown,
  handleMouseMove,
  handleMouseUp,
  moveTo,
  setHoveredLocation
}: BigMapViewProps) => {
  const [season, setSeason] = useState<MapSeason>('summer');
  const unitSize = 10 * zoom;
  const seasonStyle = MAP_SEASON_STYLES[season];

  const terrainGrid = useMemo(() => {
    const grid: { gx: number; gy: number; terrain: TerrainType }[] = [];
    for (let gy = 0; gy < TERRAIN_GRID_SIZE; gy++) {
      for (let gx = 0; gx < TERRAIN_GRID_SIZE; gx++) {
        const worldX = (gx + 0.5) * TERRAIN_CELL_UNITS;
        const worldY = (gy + 0.5) * TERRAIN_CELL_UNITS;
        grid.push({ gx, gy, terrain: getTerrainType(worldX / MAP_WIDTH, worldY / MAP_HEIGHT) });
      }
    }
    return grid;
  }, []);
  const isTimeSkipActive = !!(workState?.isActive || miningState?.isActive || roachLureState?.isActive || habitatStayState?.isActive || hideoutStayState?.isActive);
  const imposterPortal = locations.find(loc => loc.type === 'IMPOSTER_PORTAL');
  const fieldCampCount = locations.filter(loc => loc.type === 'FIELD_CAMP').length;
  const hoveredFieldCampTarget =
    hoveredLocation?.type === 'FIELD_CAMP' && hoveredLocation.camp?.targetLocationId
      ? locations.find(l => l.id === hoveredLocation.camp!.targetLocationId) ?? null
      : null;
  const hoveredCampMeta = hoveredLocation?.type === 'FIELD_CAMP' ? hoveredLocation.camp : undefined;
  const factionColors = FACTIONS.reduce<Record<string, string>>((acc, faction) => {
    acc[faction.id] = faction.color;
    return acc;
  }, {});
  const raidTarget = imposterPortal?.imposterRaidTargetId
    ? locations.find(loc => loc.id === imposterPortal.imposterRaidTargetId)
    : null;
  const showRaidArrow = !!(imposterPortal && raidTarget && imposterPortal.imposterRaidEtaDay && imposterPortal.imposterRaidEtaDay >= player.day);
  const raidPath = showRaidArrow && imposterPortal && raidTarget ? (() => {
    const startX = imposterPortal.coordinates.x * unitSize;
    const startY = imposterPortal.coordinates.y * unitSize;
    const endX = raidTarget.coordinates.x * unitSize;
    const endY = raidTarget.coordinates.y * unitSize;
    const dx = endX - startX;
    const dy = endY - startY;
    const length = Math.max(40, Math.hypot(dx, dy));
    const nx = length > 0 ? -dy / length : 0;
    const ny = length > 0 ? dx / length : 0;
    const curveOffset = Math.max(28 * zoom, Math.min(90 * zoom, length * 0.25));
    const controlX = (startX + endX) / 2 + nx * curveOffset;
    const controlY = (startY + endY) / 2 + ny * curveOffset;
    const headSize = Math.max(10, 14 * zoom);
    const lineWidth = Math.max(3, 4 * zoom);
    const dashLength = Math.max(8, 12 * zoom);
    const dashGap = Math.max(6, 8 * zoom);
    return { startX, startY, endX, endY, controlX, controlY, headSize, lineWidth, dashLength, dashGap };
  })() : null;
  const factionRaidPaths = locations.flatMap(loc => {
    if (!loc.factionRaidTargetId || !loc.factionRaidEtaDay || loc.factionRaidEtaDay < player.day) return [];
    const target = locations.find(item => item.id === loc.factionRaidTargetId);
    if (!target) return [];
    const startX = loc.coordinates.x * unitSize;
    const startY = loc.coordinates.y * unitSize;
    const endX = target.coordinates.x * unitSize;
    const endY = target.coordinates.y * unitSize;
    const dx = endX - startX;
    const dy = endY - startY;
    const length = Math.max(40, Math.hypot(dx, dy));
    const nx = length > 0 ? -dy / length : 0;
    const ny = length > 0 ? dx / length : 0;
    const curveOffset = Math.max(24 * zoom, Math.min(80 * zoom, length * 0.2));
    const controlX = (startX + endX) / 2 + nx * curveOffset;
    const controlY = (startY + endY) / 2 + ny * curveOffset;
    const headSize = Math.max(8, 12 * zoom);
    const lineWidth = Math.max(2.5, 3.5 * zoom);
    const dashLength = Math.max(6, 10 * zoom);
    const dashGap = Math.max(5, 7 * zoom);
    const color = loc.factionRaidFactionId ? (factionColors[loc.factionRaidFactionId] ?? '#60a5fa') : '#60a5fa';
    return [{
      id: `${loc.id}-${target.id}`,
      sourceId: loc.id,
      targetId: target.id,
      startX,
      startY,
      endX,
      endY,
      controlX,
      controlY,
      headSize,
      lineWidth,
      dashLength,
      dashGap,
      color
    }];
  });
  const factionRaidTargets = new Set(factionRaidPaths.map(path => path.targetId));

  // 结盟箭头：当天外交改善关系的势力对，绿色箭头 + 🤝（每天最多一个）
  const alliancePath = (() => {
    if (!worldDiplomacy?.events?.length) return null;
    const todayEvent = worldDiplomacy.events.find(
      e => e.kind === 'FACTION_FACTION' && (e.delta ?? 0) > 0 && e.day === player.day
    );
    if (!todayEvent?.aId || !todayEvent?.bId) return null;
    const locA = locations.filter(l => l.factionId === todayEvent.aId && (l.type === 'CITY' || l.type === 'CASTLE' || l.type === 'VILLAGE'))[0];
    const locB = locations.filter(l => l.factionId === todayEvent.bId && (l.type === 'CITY' || l.type === 'CASTLE' || l.type === 'VILLAGE'))[0];
    if (!locA || !locB) return null;
    const startX = locA.coordinates.x * unitSize;
    const startY = locA.coordinates.y * unitSize;
    const endX = locB.coordinates.x * unitSize;
    const endY = locB.coordinates.y * unitSize;
    const dx = endX - startX;
    const dy = endY - startY;
    const length = Math.max(40, Math.hypot(dx, dy));
    const nx = length > 0 ? -dy / length : 0;
    const ny = length > 0 ? dx / length : 0;
    const curveOffset = Math.max(24 * zoom, Math.min(80 * zoom, length * 0.2));
    return {
      id: `alliance_${todayEvent.aId}_${todayEvent.bId}`,
      startX, startY, endX, endY,
      controlX: (startX + endX) / 2 + nx * curveOffset,
      controlY: (startY + endY) / 2 + ny * curveOffset,
      headSize: Math.max(8, 12 * zoom),
      lineWidth: Math.max(2.5, 3.5 * zoom),
      dashLength: Math.max(6, 10 * zoom),
      dashGap: Math.max(5, 7 * zoom),
      color: '#22c55e'
    };
  })();

  return (
    <div
      className="relative w-full flex-1 min-h-[70vh] bg-black overflow-hidden cursor-move select-none"
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      ref={mapRef}
    >
      <style>{`
        @keyframes imposter-raid-dash {
          0% { stroke-dashoffset: 0; }
          100% { stroke-dashoffset: -32px; }
        }
        @keyframes faction-raid-dash {
          0% { stroke-dashoffset: 0; }
          100% { stroke-dashoffset: -26px; }
        }
        @keyframes imposter-raid-pulse {
          0%, 100% { transform: translateY(-50%) scale(0.95); opacity: 0.8; }
          50% { transform: translateY(-50%) scale(1.15); opacity: 1; }
        }
        @keyframes work-slot-spin {
          0% { transform: translateY(0); }
          100% { transform: translateY(-20px); }
        }
        @keyframes snow-fall {
          0% { transform: translateY(-10%) translateX(0); opacity: 0.8; }
          100% { transform: translateY(110vh) translateX(20px); opacity: 0.3; }
        }
      `}</style>
      {workState?.isActive && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 pointer-events-auto">
          <div className="bg-stone-900/90 border-2 border-amber-600 rounded-lg p-6 shadow-2xl flex flex-col items-center gap-4 min-w-[280px] animate-fade-in">
            <div className="flex items-center gap-2 text-amber-500 text-xl font-bold font-serif">
              <Coins className="animate-pulse" />
              <span>委托中...</span>
            </div>
            <div className="text-stone-300 text-sm">{workState.contractTitle}</div>
            <div className="flex items-center gap-6">
              <div className="text-center">
                <div className="text-xs text-stone-500 uppercase tracking-wider mb-1">当前天数</div>
                <div className="bg-black border border-stone-700 rounded px-3 py-2 min-w-[80px]">
                  <div className="text-3xl font-mono text-stone-200 font-bold relative overflow-hidden h-9">
                    <div key={player.day} className="animate-[slide-up_0.3s_ease-out]">
                      {player.day}
                    </div>
                  </div>
                </div>
              </div>
              <div className="text-center">
                <div className="text-xs text-stone-500 uppercase tracking-wider mb-1">委托报酬</div>
                <div className="bg-black border border-stone-700 rounded px-3 py-2 min-w-[80px]">
                  <div className="text-3xl font-mono text-yellow-500 font-bold">
                    {workState.totalPay}
                  </div>
                </div>
              </div>
            </div>
            <div className="w-full bg-stone-800 rounded-full h-2 mt-2">
              <div
                className="bg-amber-600 h-2 rounded-full transition-all duration-500"
                style={{ width: `${(workState.daysPassed / workState.totalDays) * 100}%` }}
              />
            </div>
            <div className="text-xs text-stone-400">
              进度：{workState.daysPassed} / {workState.totalDays} 天
            </div>
            <div className="text-xs text-stone-500">中途退出：进度过半才有报酬，且只有 1/5。</div>
            <Button variant="danger" size="sm" onClick={onAbortWork}>
              中止
            </Button>
          </div>
        </div>
      )}
      {miningState?.isActive && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 pointer-events-auto">
          <div className="bg-stone-900/90 border-2 border-emerald-600 rounded-lg p-6 shadow-2xl flex flex-col items-center gap-4 min-w-[300px] animate-fade-in">
            <div className="flex items-center gap-2 text-emerald-400 text-xl font-bold font-serif">
              <Mountain className="animate-pulse" />
              <span>采矿中...</span>
            </div>
            <div className="flex items-center gap-6">
              <div className="text-center">
                <div className="text-xs text-stone-500 uppercase tracking-wider mb-1">当前天数</div>
                <div className="bg-black border border-stone-700 rounded px-3 py-2 min-w-[80px]">
                  <div className="text-3xl font-mono text-stone-200 font-bold relative overflow-hidden h-9">
                    <div key={player.day} className="animate-[slide-up_0.3s_ease-out]">
                      {player.day}
                    </div>
                  </div>
                </div>
              </div>
              <div className="text-center">
                <div className="text-xs text-stone-500 uppercase tracking-wider mb-1">累计产出</div>
                <div className="bg-black border border-stone-700 rounded px-3 py-2 min-w-[80px]">
                  <div className="text-3xl font-mono text-emerald-400 font-bold">
                    {Object.values(miningState.yieldByPurity).reduce((sum, v) => sum + v, 0)}
                  </div>
                </div>
              </div>
            </div>
            <div className="w-full bg-stone-800 rounded-full h-2 mt-2">
              <div
                className="bg-emerald-600 h-2 rounded-full transition-all duration-500"
                style={{ width: `${(miningState.daysPassed / miningState.totalDays) * 100}%` }}
              />
            </div>
            <div className="text-xs text-stone-400">
              进度：{miningState.daysPassed} / {miningState.totalDays} 天
            </div>
            <Button variant="danger" size="sm" onClick={onAbortMining}>
              中止
            </Button>
          </div>
        </div>
      )}
      {roachLureState?.isActive && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 pointer-events-auto">
          <div className="bg-stone-900/90 border-2 border-lime-600 rounded-lg p-6 shadow-2xl flex flex-col items-center gap-4 min-w-[300px] animate-fade-in">
            <div className="flex items-center gap-2 text-lime-300 text-xl font-bold font-serif">
              <span className="animate-pulse">🪳</span>
              <span>吸引蟑螂中...</span>
            </div>
            <div className="flex items-center gap-6">
              <div className="text-center">
                <div className="text-xs text-stone-500 uppercase tracking-wider mb-1">当前天数</div>
                <div className="bg-black border border-stone-700 rounded px-3 py-2 min-w-[80px]">
                  <div className="text-3xl font-mono text-stone-200 font-bold relative overflow-hidden h-9">
                    <div key={player.day} className="animate-[slide-up_0.3s_ease-out]">
                      {player.day}
                    </div>
                  </div>
                </div>
              </div>
              <div className="text-center">
                <div className="text-xs text-stone-500 uppercase tracking-wider mb-1">累计吸引</div>
                <div className="bg-black border border-stone-700 rounded px-3 py-2 min-w-[80px]">
                  <div className="text-3xl font-mono text-lime-300 font-bold">
                    {Object.values(roachLureState.recruitedByTroopId).reduce((sum, v) => sum + v, 0)}
                  </div>
                </div>
              </div>
            </div>
            <div className="w-full bg-stone-800 rounded-full h-2 mt-2">
              <div
                className="bg-lime-600 h-2 rounded-full transition-all duration-500"
                style={{ width: `${(roachLureState.daysPassed / roachLureState.totalDays) * 100}%` }}
              />
            </div>
            <div className="text-xs text-stone-400">
              进度：{roachLureState.daysPassed} / {roachLureState.totalDays} 天
            </div>
            <Button variant="danger" size="sm" onClick={onAbortRoachLure}>
              中止
            </Button>
          </div>
        </div>
      )}
      {habitatStayState?.isActive && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 pointer-events-auto">
          <div className="bg-stone-900/90 border-2 border-emerald-600 rounded-lg p-6 shadow-2xl flex flex-col items-center gap-4 min-w-[300px] animate-fade-in">
            <div className="flex items-center gap-2 text-emerald-300 text-xl font-bold font-serif">
              <MapPin className="animate-pulse" />
              <span>栖息中...</span>
            </div>
            <div className="flex items-center gap-6">
              <div className="text-center">
                <div className="text-xs text-stone-500 uppercase tracking-wider mb-1">当前天数</div>
                <div className="bg-black border border-stone-700 rounded px-3 py-2 min-w-[80px]">
                  <div className="text-3xl font-mono text-stone-200 font-bold relative overflow-hidden h-9">
                    <div key={player.day} className="animate-[slide-up_0.2s_ease-out]">
                      {player.day}
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="w-full bg-stone-800 rounded-full h-2 mt-2">
              <div
                className="bg-emerald-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${(habitatStayState.daysPassed / habitatStayState.totalDays) * 100}%` }}
              />
            </div>
            <div className="text-xs text-stone-400">
              进度：{habitatStayState.daysPassed} / {habitatStayState.totalDays} 天
            </div>
            <Button variant="danger" size="sm" onClick={onAbortHabitat}>
              中止
            </Button>
          </div>
        </div>
      )}
      {hideoutStayState?.isActive && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 pointer-events-auto">
          <div className="bg-stone-900/90 border-2 border-emerald-600 rounded-lg p-6 shadow-2xl flex flex-col items-center gap-4 min-w-[300px] animate-fade-in">
            <div className="flex items-center gap-2 text-emerald-300 text-xl font-bold font-serif">
              <MapPin className="animate-pulse" />
              <span>停留中...</span>
            </div>
            <div className="flex items-center gap-6">
              <div className="text-center">
                <div className="text-xs text-stone-500 uppercase tracking-wider mb-1">当前天数</div>
                <div className="bg-black border border-stone-700 rounded px-3 py-2 min-w-[80px]">
                  <div className="text-3xl font-mono text-stone-200 font-bold relative overflow-hidden h-9">
                    <div key={player.day} className="animate-[slide-up_0.2s_ease-out]">
                      {player.day}
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="w-full bg-stone-800 rounded-full h-2 mt-2">
              <div
                className="bg-emerald-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${(hideoutStayState.daysPassed / hideoutStayState.totalDays) * 100}%` }}
              />
            </div>
            <div className="text-xs text-stone-400">
              进度：{hideoutStayState.daysPassed} / {hideoutStayState.totalDays} 天
            </div>
            <Button variant="danger" size="sm" onClick={onAbortHideoutStay}>
              中止
            </Button>
          </div>
        </div>
      )}
      {season === 'winter' && (
        <div className="absolute inset-0 pointer-events-none z-[25] overflow-hidden" aria-hidden>
          {Array.from({ length: 40 }).map((_, i) => (
            <div
              key={i}
              className="absolute rounded-full bg-white/70"
              style={{
                left: `${(i * 7 + 13) % 100}%`,
                top: '-2%',
                width: `${2 + (i % 3)}px`,
                height: `${2 + (i % 3)}px`,
                animation: 'snow-fall 8s linear infinite',
                animationDelay: `${(i * 0.4) % 6}s`,
                animationDuration: `${6 + (i % 5)}s`
              }}
            />
          ))}
        </div>
      )}
      {hoveredLocation && (
        <div
          className="fixed z-50 bg-stone-900 border border-amber-500/50 px-3 py-2 rounded shadow-2xl pointer-events-none text-left max-w-[min(320px,calc(100vw-32px))]"
          style={{
            left: Math.min(window.innerWidth - 280, mousePos.x + 16),
            top: Math.min(window.innerHeight - (hoveredLocation.type === 'FIELD_CAMP' && hoveredCampMeta ? 140 : 80), mousePos.y + 16)
          }}
        >
          <div className="flex items-center gap-2">
            <span className="font-bold text-amber-400">{hoveredLocation.name}</span>
            <span className="text-[10px] bg-stone-800 px-1.5 py-0.5 rounded text-stone-400 uppercase">{hoveredLocation.type}</span>
          </div>
          {hoveredLocation.type === 'FIELD_CAMP' && hoveredCampMeta && (
            <div className="mt-2 space-y-1 text-xs text-stone-300 border-t border-stone-700/80 pt-2">
              <div>
                <span className="text-stone-500">目的地：</span>
                <span className="text-amber-200/90">
                  {hoveredFieldCampTarget?.name ?? hoveredCampMeta.targetLocationId ?? '未知'}
                </span>
              </div>
              <div>
                <span className="text-stone-500">预计到达：</span>
                {(() => {
                  const left = hoveredCampMeta.daysLeft ?? 0;
                  const total = hoveredCampMeta.totalDays ?? 0;
                  if (left <= 0) {
                    return <span className="text-emerald-400">即将抵达目标</span>;
                  }
                  return (
                    <span className="text-stone-200">
                      约 <span className="text-amber-400 font-semibold tabular-nums">{left}</span> 天后抵达
                      {total > 0 ? (
                        <span className="text-stone-500 ml-1">
                          （剩余 {left}/{total} 天路程）
                        </span>
                      ) : null}
                    </span>
                  );
                })()}
              </div>
            </div>
          )}
        </div>
      )}
      <div
        className="absolute"
        style={{
          width: `${MAP_WIDTH * unitSize}px`,
          height: `${MAP_HEIGHT * unitSize}px`,
          transform: `translate3d(${Math.round((-(MAP_WIDTH / 2) * unitSize + camera.x) * 10) / 10}px, ${Math.round((-(MAP_HEIGHT / 2) * unitSize + camera.y) * 10) / 10}px, 0)`,
          willChange: 'transform'
        }}
      >
        {/* 网格地形：森林/草原/沙漠/丘陵/湿地，随季节变化 */}
        <div className="absolute inset-0 z-0" style={{ display: 'grid', gridTemplateColumns: `repeat(${TERRAIN_GRID_SIZE}, 1fr)`, gridTemplateRows: `repeat(${TERRAIN_GRID_SIZE}, 1fr)` }}>
          {terrainGrid.map(({ gx, gy, terrain }) => (
            <div
              key={`${gx}-${gy}`}
              className="border border-black/[0.04]"
              style={{
                backgroundColor: TERRAIN_SEASON_COLORS[terrain][season],
                transition: 'background-color 1.6s cubic-bezier(0.4, 0, 0.2, 1)'
              }}
              aria-hidden
            />
          ))}
        </div>
        <div className="absolute top-[10%] left-[10%] z-[5]" style={{ opacity: seasonStyle.mountain.opacity }}><Mountain size={400 * zoom} color={seasonStyle.mountain.color} /></div>
        <div className="absolute top-[80%] left-[20%] z-[5]" style={{ opacity: seasonStyle.trees.opacity }}><Trees size={300 * zoom} color={seasonStyle.trees.color} /></div>
        <div className="absolute top-[20%] left-[70%] z-[5]" style={{ opacity: seasonStyle.snowflake.opacity }}><Snowflake size={350 * zoom} color={seasonStyle.snowflake.color} /></div>
        <div className="absolute top-[70%] left-[70%] z-[5]" style={{ opacity: seasonStyle.sun.opacity }}><Sun size={300 * zoom} color={seasonStyle.sun.color} /></div>
        {raidPath && (
          <svg
            className="absolute left-0 top-0 pointer-events-none z-20"
            width={MAP_WIDTH * unitSize}
            height={MAP_HEIGHT * unitSize}
            viewBox={`0 0 ${MAP_WIDTH * unitSize} ${MAP_HEIGHT * unitSize}`}
          >
            <defs>
              <marker
                id="imposter-raid-arrowhead"
                markerWidth={raidPath.headSize}
                markerHeight={raidPath.headSize}
                refX={raidPath.headSize * 0.8}
                refY={raidPath.headSize * 0.3}
                orient="auto"
                markerUnits="userSpaceOnUse"
              >
                <path
                  d={`M 0 0 L 0 ${raidPath.headSize * 0.6} L ${raidPath.headSize} ${raidPath.headSize * 0.3} Z`}
                  fill="rgba(239,68,68,0.95)"
                />
              </marker>
            </defs>
            <path
              d={`M ${raidPath.startX} ${raidPath.startY} Q ${raidPath.controlX} ${raidPath.controlY} ${raidPath.endX} ${raidPath.endY}`}
              fill="none"
              stroke="rgba(239,68,68,0.95)"
              strokeWidth={raidPath.lineWidth}
              strokeLinecap="round"
              strokeDasharray={`${raidPath.dashLength} ${raidPath.dashGap}`}
              style={{
                animation: 'imposter-raid-dash 0.9s linear infinite',
                filter: 'drop-shadow(0 0 8px rgba(239,68,68,0.8))'
              }}
              markerEnd="url(#imposter-raid-arrowhead)"
            />
          </svg>
        )}
        {factionRaidPaths.length > 0 && (
          <svg
            className="absolute left-0 top-0 pointer-events-none z-20"
            width={MAP_WIDTH * unitSize}
            height={MAP_HEIGHT * unitSize}
            viewBox={`0 0 ${MAP_WIDTH * unitSize} ${MAP_HEIGHT * unitSize}`}
          >
            <defs>
              {factionRaidPaths.map(path => (
                <marker
                  key={path.id}
                  id={`faction-raid-arrowhead-${path.id}`}
                  markerWidth={path.headSize}
                  markerHeight={path.headSize}
                  refX={path.headSize * 0.4}
                  refY={path.headSize * 0.4}
                  orient="auto"
                  markerUnits="userSpaceOnUse"
                >
                  <path d={`M0,0 L${path.headSize},${path.headSize * 0.4} L0,${path.headSize * 0.8}`} fill={path.color} />
                </marker>
              ))}
            </defs>
            {factionRaidPaths.map(path => (
              <path
                key={path.id}
                d={`M ${path.startX} ${path.startY} Q ${path.controlX} ${path.controlY} ${path.endX} ${path.endY}`}
                fill="none"
                stroke={path.color}
                strokeWidth={path.lineWidth}
                strokeLinecap="round"
                strokeDasharray={`${path.dashLength} ${path.dashGap}`}
                style={{
                  animation: 'faction-raid-dash 1.2s linear infinite',
                  filter: `drop-shadow(0 0 6px ${path.color}66)`
                }}
                markerEnd={`url(#faction-raid-arrowhead-${path.id})`}
              />
            ))}
          </svg>
        )}
        {alliancePath && (
          <svg
            className="absolute left-0 top-0 pointer-events-none z-20"
            width={MAP_WIDTH * unitSize}
            height={MAP_HEIGHT * unitSize}
            viewBox={`0 0 ${MAP_WIDTH * unitSize} ${MAP_HEIGHT * unitSize}`}
          >
            <defs>
              <marker
                id="alliance-arrowhead"
                markerWidth={alliancePath.headSize}
                markerHeight={alliancePath.headSize}
                refX={alliancePath.headSize * 0.4}
                refY={alliancePath.headSize * 0.4}
                orient="auto"
                markerUnits="userSpaceOnUse"
              >
                <path d={`M0,0 L${alliancePath.headSize},${alliancePath.headSize * 0.4} L0,${alliancePath.headSize * 0.8}`} fill={alliancePath.color} />
              </marker>
            </defs>
            <path
              d={`M ${alliancePath.startX} ${alliancePath.startY} Q ${alliancePath.controlX} ${alliancePath.controlY} ${alliancePath.endX} ${alliancePath.endY}`}
              fill="none"
              stroke={alliancePath.color}
              strokeWidth={alliancePath.lineWidth}
              strokeLinecap="round"
              strokeDasharray={`${alliancePath.dashLength} ${alliancePath.dashGap}`}
              style={{ animation: 'faction-raid-dash 1.2s linear infinite', filter: 'drop-shadow(0 0 6px rgba(34,197,94,0.6))' }}
              markerEnd="url(#alliance-arrowhead)"
            />
            <text
              x={(alliancePath.startX + alliancePath.endX) / 2}
              y={(alliancePath.startY + alliancePath.endY) / 2}
              textAnchor="middle"
              dominantBaseline="middle"
              fontSize={20 * zoom}
              fill="#22c55e"
              style={{ filter: 'drop-shadow(0 0 4px rgba(0,0,0,0.8))' }}
            >
              🤝
            </text>
          </svg>
        )}
        {locations.map(loc => (
          <div
            key={loc.id}
            onClick={(e) => {
              e.stopPropagation();
              if (isObserverMode) {
                onLocationSelect?.(loc);
                return;
              }
              if (isTimeSkipActive) return;
              moveTo(loc.coordinates.x, loc.coordinates.y, loc.id);
            }}
            onMouseEnter={() => setHoveredLocation(loc)}
            onMouseLeave={() => setHoveredLocation(null)}
            className={`absolute cursor-pointer group ${loc.type === 'FIELD_CAMP' ? 'z-30' : 'z-10'} hover:z-50`}
            style={{ left: `${loc.coordinates.x * unitSize}px`, top: `${loc.coordinates.y * unitSize}px` }}
          >
            <div className="absolute transform -translate-x-1/2 -translate-y-1/2 flex items-center justify-center">
              <div
                className="relative p-1 rounded-full border-2 transition-transform hover:scale-110 shadow-lg bg-stone-800 border-amber-600"
                style={{
                  transform: `scale(${zoom})`,
                  borderColor: loc.type === 'FIELD_CAMP' ? (loc.factionId ? (factionColors[loc.factionId] ?? '#94a3b8') : '#94a3b8') : undefined,
                }}
              >
                {loc.type === 'CITY' ? <Home className="text-amber-500" size={24} /> :
                  loc.type === 'CASTLE' ? <ShieldAlert className="text-stone-400" size={20} /> :
                  loc.type === 'FIELD_CAMP' ? <Flag size={20} style={{ color: loc.factionId ? (factionColors[loc.factionId] ?? '#94a3b8') : '#94a3b8' }} /> :
                  loc.type === 'ROACH_NEST' ? <span className="text-[20px] leading-none">🪳</span> :
                  loc.type === 'RUINS' ? <Ghost className="text-purple-400" size={20} /> :
                  loc.type === 'GRAVEYARD' ? <Skull className="text-stone-300" size={20} /> :
                  loc.type === 'TRAINING_GROUNDS' ? <Swords className="text-blue-400" size={20} /> :
                  loc.type === 'ASYLUM' ? <Brain className="text-pink-500" size={22} /> :
                  loc.type === 'MARKET' ? <ShoppingBag className="text-green-500" size={20} /> :
                  loc.type === 'HOTPOT_RESTAURANT' ? <Utensils className="text-red-500" size={20} /> :
                  loc.type === 'COFFEE' ? <Coffee className="text-amber-300" size={20} /> :
                  loc.type === 'BANDIT_CAMP' ? <Tent className="text-red-600" size={20} /> :
                  loc.type === 'HEAVY_TRIAL_GROUNDS' ? <span className="text-[20px] leading-none">🏗️</span> :
                  loc.type === 'IMPOSTER_PORTAL' ? <Zap className="text-fuchsia-400" size={20} /> :
                  loc.type === 'MYSTERIOUS_CAVE' ? <Scroll className="text-indigo-400" size={20} /> :
                  loc.type === 'WORLD_BOARD' ? <History className="text-slate-300" size={20} /> :
                  loc.type === 'VOID_BUFFER_MINE' || loc.type === 'MEMORY_OVERFLOW_MINE' || loc.type === 'LOGIC_PARADOX_MINE' ? <Mountain className="text-emerald-400" size={20} /> :
                  loc.type === 'HERO_CRYSTAL_MINE' ? <Mountain className="text-purple-300" size={20} /> :
                  loc.type === 'BLACKSMITH' ? <Hammer className="text-orange-400" size={20} /> :
                  loc.type === 'CRYSTAL_FOUNDRY' ? <Hammer className="text-cyan-300" size={20} /> :
                  loc.type === 'MEGA_FARM' ? <Coins className="text-lime-300" size={20} /> :
                  loc.type === 'ALTAR' ? <span className="text-[20px] leading-none">🛐</span> :
                  loc.type === 'MAGICIAN_LIBRARY' ? <Star className="text-sky-400" size={20} /> :
                  loc.type === 'SOURCE_RECOMPILER' ? <Brain className="text-fuchsia-300" size={20} /> :
                  loc.type === 'HABITAT' ? <MapPin className="text-emerald-300" size={20} /> :
                  loc.type === 'SEAL_HABITAT' ? <span className="text-[20px] leading-none">🦭</span> :
                  loc.type === 'HIDEOUT' ? <Shield className="text-emerald-300" size={20} /> :
                  <Tent className="text-green-500" size={16} />}
                {loc.factionId && loc.owner !== 'PLAYER' && (
                  <span
                    className="absolute -bottom-1 left-1/2 -translate-x-1/2 h-2 w-2 rounded-full border border-black/60 shadow"
                    style={{ backgroundColor: factionColors[loc.factionId] ?? '#94a3b8' }}
                  />
                )}
                {(loc.imposterAlertUntilDay ?? 0) >= player.day && (
                  <span className="absolute -top-1 -right-1 bg-red-600 text-white rounded-full p-0.5 shadow">
                    <AlertTriangle size={10} />
                  </span>
                )}
                {factionRaidTargets.has(loc.id) && !loc.activeSiege && (
                  <span className="absolute -top-1 -left-1 bg-sky-600 text-white rounded-full p-0.5 shadow">
                    <AlertTriangle size={10} />
                  </span>
                )}
                {loc.activeSiege && (
                  <span className="absolute -top-3 -right-3 bg-red-600 text-white rounded-full p-1 shadow animate-pulse z-50">
                    <Swords size={12} />
                  </span>
                )}
                {(loc.sackedUntilDay ?? 0) >= player.day && (
                  <span className="absolute -bottom-1 -right-1 bg-stone-900 text-amber-400 rounded-full p-0.5 shadow">
                    <Skull size={10} />
                  </span>
                )}
                {isObserverMode && observerTargets?.some(t => t.locationId === loc.id) && (
                  <div className="absolute -top-2 left-1/2 -translate-x-1/2 flex gap-0.5">
                    {observerTargets.find(t => t.locationId === loc.id)?.types.map((type, k) => (
                      type === 'recruit' ? <Users key={k} size={10} className="text-emerald-400 bg-black/60 rounded p-0.5" title="征兵" /> :
                      type === 'scout' ? <Eye key={k} size={10} className="text-sky-400 bg-black/60 rounded p-0.5" title="侦察" /> :
                      type === 'attack' ? <Swords key={k} size={10} className="text-red-400 bg-black/60 rounded p-0.5" title="进攻" /> : null
                    ))}
                  </div>
                )}
              </div>
            </div>
            {zoom > 0.8 && (
              <div className="absolute top-4 left-1/2 transform -translate-x-1/2 mt-2 flex justify-center whitespace-nowrap pointer-events-none">
                <span className="font-serif text-[10px] font-bold text-stone-900 bg-white/80 px-2 rounded shadow group-hover:bg-amber-100" style={{ transform: `scale(${zoom})` }}>{loc.name}</span>
              </div>
            )}
          </div>
        ))}
        {!isObserverMode && (
          <div
            className="absolute transform -translate-x-1/2 -translate-y-1/2 z-20 pointer-events-none"
            style={{
              left: `${player.position.x * unitSize}px`,
              top: `${player.position.y * unitSize}px`
            }}
          >
            <div className="text-red-700 animate-bounce drop-shadow-xl" style={{ transform: `scale(${zoom})` }}>
              <MapPin size={48} fill="currentColor" stroke="white" strokeWidth={2} />
            </div>
          </div>
        )}
        {isObserverMode && observerCurrentAction && (() => {
          const act = observerCurrentAction!;
          const actionLabel = act.actionType === 'recruit' ? '扩军中' : act.actionType === 'scout' ? '侦察中' : act.actionType === 'attack' ? '进攻中' : '外交中';
          const loc = locations.find(l => l.id === act.locationId);
          const x = loc ? loc.coordinates.x * unitSize : unitSize * (MAP_WIDTH / 2);
          const y = loc ? loc.coordinates.y * unitSize - 28 : unitSize * (MAP_HEIGHT / 2) - 28;
          const dialogue = (act as any).dialogue as string[] | undefined;
          return (
            <div
              className="absolute z-50 pointer-events-none animate-pulse"
              style={{
                left: `${x}px`,
                top: `${y}px`,
                transform: 'translate(-50%, -50%)'
              }}
            >
              <div className="bg-amber-600/95 text-black px-3 py-1.5 rounded-lg shadow-lg text-sm font-bold whitespace-nowrap border-2 border-amber-400">
                {act.factionName} · {actionLabel}
              </div>
              {dialogue && dialogue.length > 0 && (
                <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-64 max-w-[90vw] bg-stone-900/95 border border-amber-600/60 rounded-lg p-2 text-xs text-stone-200 shadow-xl">
                  {dialogue.map((line, i) => (
                    <div key={i} className="py-0.5">{line}</div>
                  ))}
                </div>
              )}
            </div>
          );
        })()}
      </div>
      <div className="absolute top-4 left-4 bg-black/60 text-stone-300 p-2 rounded text-xs select-none pointer-events-none z-30">
        WASD 或 拖拽移动视野 | 滚轮缩放 ({Math.round(zoom * 100)}%) | 行军营地 {fieldCampCount}
      </div>
      <div className="absolute top-4 right-4 flex gap-1 z-30 pointer-events-auto">
        <span className="bg-black/60 text-stone-400 px-2 py-1 rounded-l text-xs self-center">季节</span>
        {(['spring', 'summer', 'autumn', 'winter'] as MapSeason[]).map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setSeason(s)}
            className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
              season === s
                ? 'bg-amber-600 text-white'
                : 'bg-black/60 text-stone-400 hover:bg-stone-700 hover:text-stone-200'
            }`}
          >
            {SEASON_LABELS[s]}
          </button>
        ))}
      </div>
    </div>
  );
};
