import React from 'react';
import { AlertTriangle, Brain, Coffee, Coins, Flag, Ghost, Hammer, History, Home, MapPin, Mountain, Scroll, ShieldAlert, ShoppingBag, Skull, Snowflake, Star, Sun, Swords, Tent, Trees, Utensils, Zap } from 'lucide-react';
import { Location, MineralId, MineralPurity, PlayerState } from '../types';
import { FACTIONS, MAP_HEIGHT, MAP_WIDTH } from '../constants';

type WorkState = {
  isActive: boolean;
  totalDays: number;
  daysPassed: number;
  dailyIncome: number;
  accumulatedIncome: number;
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

type BigMapViewProps = {
  zoom: number;
  camera: { x: number; y: number };
  locations: Location[];
  player: PlayerState;
  workState: WorkState | null;
  miningState: MiningState | null;
  roachLureState: RoachLureState | null;
  habitatStayState: HabitatStayState | null;
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
  workState,
  miningState,
  roachLureState,
  habitatStayState,
  hoveredLocation,
  mousePos,
  mapRef,
  handleMouseDown,
  handleMouseMove,
  handleMouseUp,
  moveTo,
  setHoveredLocation
}: BigMapViewProps) => {
  const unitSize = 10 * zoom;
  const imposterPortal = locations.find(loc => loc.type === 'IMPOSTER_PORTAL');
  const fieldCampCount = locations.filter(loc => loc.type === 'FIELD_CAMP').length;
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
      `}</style>
      {workState?.isActive && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 pointer-events-none">
          <div className="bg-stone-900/90 border-2 border-amber-600 rounded-lg p-6 shadow-2xl flex flex-col items-center gap-4 min-w-[280px] animate-fade-in">
            <div className="flex items-center gap-2 text-amber-500 text-xl font-bold font-serif">
              <Coins className="animate-pulse" />
              <span>打工中...</span>
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
                <div className="text-xs text-stone-500 uppercase tracking-wider mb-1">累计收入</div>
                <div className="bg-black border border-stone-700 rounded px-3 py-2 min-w-[80px]">
                  <div className="text-3xl font-mono text-yellow-500 font-bold">
                    {workState.accumulatedIncome}
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
          </div>
        </div>
      )}
      {miningState?.isActive && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 pointer-events-none">
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
          </div>
        </div>
      )}
      {roachLureState?.isActive && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 pointer-events-none">
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
          </div>
        </div>
      )}
      {habitatStayState?.isActive && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 pointer-events-none">
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
          </div>
        </div>
      )}
      {hoveredLocation && (
        <div
          className="fixed z-50 bg-stone-900 border border-amber-500/50 px-3 py-2 rounded shadow-2xl pointer-events-none text-left"
          style={{
            left: Math.min(window.innerWidth - 240, mousePos.x + 16),
            top: Math.min(window.innerHeight - 80, mousePos.y + 16)
          }}
        >
          <div className="flex items-center gap-2">
            <span className="font-bold text-amber-400">{hoveredLocation.name}</span>
            <span className="text-[10px] bg-stone-800 px-1.5 py-0.5 rounded text-stone-400 uppercase">{hoveredLocation.type}</span>
          </div>
        </div>
      )}
      <div
        className="absolute"
        style={{
          width: `${MAP_WIDTH * unitSize}px`,
          height: `${MAP_HEIGHT * unitSize}px`,
          transform: `translate3d(${Math.round((-200 * unitSize + camera.x) * 10) / 10}px, ${Math.round((-200 * unitSize + camera.y) * 10) / 10}px, 0)`,
          backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'60\' height=\'60\' viewBox=\'0 0 60 60\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cpath d=\'M30 30h30v30H30zM0 0h30v30H0z\' fill=\'%235c4d3c\' fill-opacity=\'0.1\' fill-rule=\'evenodd\'/%3E%3C/svg%3E")',
          backgroundColor: '#e6d5a7',
          backgroundSize: `${60 * zoom}px ${60 * zoom}px`,
          willChange: 'transform'
        }}
      >
        <div className="absolute top-[10%] left-[10%] opacity-20"><Mountain size={400 * zoom} color="#8c7b64" /></div>
        <div className="absolute top-[80%] left-[20%] opacity-20"><Trees size={300 * zoom} color="#6b8c64" /></div>
        <div className="absolute top-[20%] left-[70%] opacity-20"><Snowflake size={350 * zoom} color="#a5b4fc" /></div>
        <div className="absolute top-[70%] left-[70%] opacity-20"><Sun size={300 * zoom} color="#fb923c" /></div>
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
        {locations.map(loc => (
          <div
            key={loc.id}
            onClick={(e) => {
              e.stopPropagation();
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
                  loc.type === 'ALTAR' ? <span className="text-[20px] leading-none">🛐</span> :
                  loc.type === 'MAGICIAN_LIBRARY' ? <Star className="text-sky-400" size={20} /> :
                  loc.type === 'SOURCE_RECOMPILER' ? <Brain className="text-fuchsia-300" size={20} /> :
                  loc.type === 'HABITAT' ? <MapPin className="text-emerald-300" size={20} /> :
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
              </div>
            </div>
            {zoom > 0.8 && (
              <div className="absolute top-4 left-1/2 transform -translate-x-1/2 mt-2 flex justify-center whitespace-nowrap pointer-events-none">
                <span className="font-serif text-[10px] font-bold text-stone-900 bg-white/80 px-2 rounded shadow group-hover:bg-amber-100" style={{ transform: `scale(${zoom})` }}>{loc.name}</span>
              </div>
            )}
          </div>
        ))}
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
      </div>
      <div className="absolute top-4 left-4 bg-black/60 text-stone-300 p-2 rounded text-xs select-none pointer-events-none z-30">
        WASD 或 拖拽移动视野 | 滚轮缩放 ({Math.round(zoom * 100)}%) | 行军营地 {fieldCampCount}
      </div>
    </div>
  );
};
