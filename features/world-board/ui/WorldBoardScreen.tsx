import { generateWorldNewspaper } from '../../../services/geminiService';
import { FACTIONS, TROOP_TEMPLATES } from '../../../game/data';
import { clampRelation } from '../../../game/systems/diplomacy';
import { WorldBoardView } from '../../../views/WorldBoardView';
import { AIProvider, Location, Lord, PlayerState, SiegeEngineType, Troop, WorldBattleReport, WorldDiplomacyState } from '../../../types';

type SiegeEngineOption = {
  type: SiegeEngineType;
  name: string;
  cost: number;
  days: number;
  description: string;
};

type SiegeEngineCombatStats = {
  hp: number;
  wallDamage: number;
  attackerRangedHit: number;
  attackerRangedDamage: number;
  attackerMeleeHit: number;
  attackerMeleeDamage: number;
  defenderRangedHitPenalty: number;
  defenderRangedDamagePenalty: number;
};

type LocationDefenseDetails = {
  wallName: string;
  wallLevel: number;
  wallHp: number;
  mechanismHp: number;
  rangedHitBonus: number;
  rangedDamageBonus: number;
  meleeDamageReduction: number;
  mechanisms: { name: string; description: string }[];
};

type WorldBoardAIConfig = {
  baseUrl: string;
  apiKey: string;
  model: string;
  provider: AIProvider;
};

type WorldBoardScreenProps = {
  currentLocation: Location | null;
  locations: Location[];
  lords: Lord[];
  player: PlayerState;
  logs: string[];
  worldBattleReports: WorldBattleReport[];
  worldDiplomacy: WorldDiplomacyState;
  battleTimeline: Array<{ day: number; count: number }>;
  customTroopTemplates: Record<string, Omit<Troop, 'count' | 'xp'>>;
  siegeEngineOptions: SiegeEngineOption[];
  siegeEngineCombatStats: Record<SiegeEngineType, SiegeEngineCombatStats>;
  calculatePower: (troops: Troop[]) => number;
  getDefenderTroops: (location: Location) => Troop[];
  getGarrisonCount: (troops: Troop[]) => number;
  getLocationDefenseDetails: (location: Location) => LocationDefenseDetails;
  buildAIConfig: () => WorldBoardAIConfig | undefined;
  onOpenTroopArchive: () => void;
  onBackToMap: () => void;
  onExportMarkdown: () => void;
};

export const WorldBoardScreen = ({
  currentLocation,
  locations,
  lords,
  player,
  logs,
  worldBattleReports,
  worldDiplomacy,
  battleTimeline,
  customTroopTemplates,
  siegeEngineOptions,
  siegeEngineCombatStats,
  calculatePower,
  getDefenderTroops,
  getGarrisonCount,
  getLocationDefenseDetails,
  buildAIConfig,
  onOpenTroopArchive,
  onBackToMap,
  onExportMarkdown
}: WorldBoardScreenProps) => {
  if (!currentLocation) return null;

  const troopTypeCount = Object.keys({ ...TROOP_TEMPLATES, ...customTroopTemplates }).length;
  const activeBattles = locations
    .filter(loc => loc.activeSiege)
    .map(loc => {
      const siege = loc.activeSiege!;
      return {
        id: loc.id,
        locationName: loc.name,
        attackerName: siege.attackerName,
        defenderName: loc.lord ? `${loc.lord.title}${loc.lord.name}` : `${loc.name}守军`,
        startDay: siege.startDay,
        attackerTroops: siege.troops,
        defenderTroops: getDefenderTroops(loc)
      };
    });

  const factionSnapshots = FACTIONS.map(faction => {
    const factionLocations = locations.filter(loc => loc.factionId === faction.id);
    const cities = factionLocations.filter(loc => loc.type === 'CITY').length;
    const castles = factionLocations.filter(loc => loc.type === 'CASTLE').length;
    const villages = factionLocations.filter(loc => loc.type === 'VILLAGE').length;
    const soldiers = factionLocations.reduce((sum, loc) => sum + getGarrisonCount(getDefenderTroops(loc)), 0);
    return {
      ...faction,
      cities,
      castles,
      villages,
      soldiers
    };
  });

  const siegeEngineArchive = siegeEngineOptions.map(option => ({
    ...option,
    ...siegeEngineCombatStats[option.type]
  }));

  const defenseArchive = Array.from(new Map(locations.map(loc => [loc.type, loc])).values())
    .map(loc => {
      const defense = getLocationDefenseDetails(loc);
      if (defense.wallLevel <= 0 && defense.mechanisms.length === 0) return null;
      return {
        type: loc.type,
        sampleName: loc.name,
        wallName: defense.wallName,
        wallLevel: defense.wallLevel,
        wallHp: defense.wallHp,
        mechanismHp: defense.mechanismHp,
        rangedHitBonus: defense.rangedHitBonus,
        rangedDamageBonus: defense.rangedDamageBonus,
        meleeDamageReduction: defense.meleeDamageReduction,
        mechanisms: defense.mechanisms
      };
    })
    .filter(Boolean) as Array<{
      type: Location['type'];
      sampleName: string;
      wallName: string;
      wallLevel: number;
      wallHp: number;
      mechanismHp: number;
      rangedHitBonus: number;
      rangedDamageBonus: number;
      meleeDamageReduction: number;
      mechanisms: { name: string; description: string }[];
    }>;

  const countTroopNumber = (troops: Array<{ count?: number }>) => troops.reduce((sum, troop) => sum + (troop.count ?? 0), 0);
  const coordLabel = (loc: Location) => `野外(${Math.round(loc.coordinates.x)},${Math.round(loc.coordinates.y)})`;
  const getLocationName = (id?: string) => {
    if (!id) return '未知';
    const loc = locations.find(item => item.id === id);
    return loc?.name ?? id;
  };
  const formatTroopsForForce = (troops: Troop[]) => troops
    .filter(t => (t.count ?? 0) > 0)
    .map(t => ({ name: t.name, count: t.count ?? 0, tier: t.tier }));

  const worldForces = [
    {
      id: 'force_player_party',
      kind: '玩家队伍',
      name: '玩家队伍',
      locationName: currentLocation.name,
      troopCount: countTroopNumber(player.troops),
      power: calculatePower(player.troops),
      troops: formatTroopsForForce(player.troops)
    },
    ...lords.map(lord => ({
      id: `force_lord_${lord.id}`,
      kind: '领主',
      name: `${lord.title}${lord.name}`,
      locationName: getLocationName(lord.currentLocationId),
      troopCount: countTroopNumber(lord.partyTroops),
      power: calculatePower(lord.partyTroops),
      troops: formatTroopsForForce(lord.partyTroops)
    })),
    ...locations.flatMap(loc => {
      const rows: Array<{
        id: string;
        kind: string;
        name: string;
        locationName: string;
        troopCount: number;
        power: number;
        troops: Array<{ name: string; count: number; tier?: number }>;
      }> = [];

      (loc.stayParties ?? []).forEach(party => {
        rows.push({
          id: `force_stay_${loc.id}_${party.id}`,
          kind: party.owner === 'PLAYER' ? '驻扎（我方）' : party.owner === 'ENEMY' ? '驻扎（敌方）' : '驻扎（中立）',
          name: party.name,
          locationName: loc.name,
          troopCount: countTroopNumber(party.troops),
          power: calculatePower(party.troops),
          troops: formatTroopsForForce(party.troops)
        });
      });

      (loc.stationedArmies ?? []).forEach(army => {
        rows.push({
          id: `force_army_${loc.id}_${army.id}`,
          kind: '驻军',
          name: army.name,
          locationName: loc.name,
          troopCount: countTroopNumber(army.troops),
          power: calculatePower(army.troops),
          troops: formatTroopsForForce(army.troops)
        });
      });

      if (loc.activeSiege) {
        rows.push({
          id: `force_siege_${loc.id}_${loc.activeSiege.attackerName}`,
          kind: '攻城军',
          name: loc.activeSiege.attackerName,
          locationName: loc.name,
          troopCount: countTroopNumber(loc.activeSiege.troops),
          power: calculatePower(loc.activeSiege.troops),
          troops: formatTroopsForForce(loc.activeSiege.troops)
        });
      }

      if (loc.type === 'FIELD_CAMP' && loc.owner === 'ENEMY' && loc.garrison && loc.garrison.length > 0) {
        rows.push({
          id: `force_field_${loc.id}`,
          kind: loc.camp?.kind === 'CARAVAN' ? '商队' : '行军营地',
          name: loc.name,
          locationName: coordLabel(loc),
          troopCount: countTroopNumber(loc.garrison),
          power: calculatePower(loc.garrison),
          troops: formatTroopsForForce(loc.garrison)
        });
      }

      if (loc.factionRaidTroops && loc.factionRaidTroops.length > 0) {
        rows.push({
          id: `force_raid_${loc.id}`,
          kind: '袭掠队',
          name: loc.factionRaidAttackerName ?? '未知袭掠队',
          locationName: `${loc.name} → ${getLocationName(loc.factionRaidTargetId)} (ETA ${loc.factionRaidEtaDay ?? '?'})`,
          troopCount: countTroopNumber(loc.factionRaidTroops),
          power: calculatePower(loc.factionRaidTroops),
          troops: formatTroopsForForce(loc.factionRaidTroops)
        });
      }

      return rows;
    })
  ].filter(force => force.troopCount > 0);

  const buildRelationAlerts = () => {
    const rows: string[] = [];
    for (let i = 0; i < FACTIONS.length; i += 1) {
      for (let j = i + 1; j < FACTIONS.length; j += 1) {
        const a = FACTIONS[i];
        const b = FACTIONS[j];
        const val = clampRelation(Number((worldDiplomacy.factionRelations as any)?.[a.id]?.[b.id] ?? 0));
        if (val <= -30 || val >= 35) rows.push(`${a.shortName} vs ${b.shortName}：${val}`);
      }
    }
    return rows
      .sort((x, y) => {
        const nx = Number((x.match(/：(-?\d+)/)?.[1] ?? 0));
        const ny = Number((y.match(/：(-?\d+)/)?.[1] ?? 0));
        return Math.abs(ny) - Math.abs(nx);
      })
      .slice(0, 16);
  };

  const generateBoardNewspaper = async () => {
    const aiConfig = buildAIConfig();
    if (!aiConfig) throw new Error('请先在设置里配置 AI 模型与 Key。');

    const battleReports = worldBattleReports
      .slice(0, 14)
      .map(report => `第${report.day}天 ${report.battleLocation} ${report.enemyName} ${report.outcome === 'A' ? '战败' : '胜利'} 伤情:${report.keyUnitDamageSummary || '无'}`);
    const activeBattleLines = activeBattles
      .slice(0, 12)
      .map(battle => `${battle.locationName} 攻:${battle.attackerName} 守:${battle.defenderName} 开战日:${battle.startDay}`);
    const diplomacyLines = (worldDiplomacy.events ?? [])
      .slice(0, 18)
      .map(event => `第${event.day}天 ${event.text} (${event.delta >= 0 ? '+' : ''}${event.delta})`);
    const relationAlerts = buildRelationAlerts();
    const invasionAlerts = logs
      .filter(line => /入侵|袭掠|逼近|围攻|传送门|叛乱/.test(line))
      .slice(0, 18);
    const forceLines = [...worldForces]
      .sort((a, b) => b.power - a.power)
      .slice(0, 20)
      .map(force => `${force.kind} ${force.name} @ ${force.locationName} 兵力${force.troopCount} 战力${Math.round(force.power)}`);

    return generateWorldNewspaper({
      day: player.day,
      locationName: currentLocation.name,
      worldSummary: `当前共 ${locations.length} 个据点，进行中战斗 ${activeBattles.length} 场，世界势力 ${FACTIONS.length} 个，记录部队 ${worldForces.length} 支。`,
      eventLogs: logs.slice(0, 40),
      battleReports,
      activeBattles: activeBattleLines,
      diplomacyEvents: diplomacyLines,
      relationAlerts,
      invasionAlerts,
      worldForces: forceLines
    }, aiConfig);
  };

  return (
    <WorldBoardView
      currentLocation={currentLocation}
      logs={logs}
      worldBattleReports={worldBattleReports}
      activeBattles={activeBattles}
      battleTimeline={battleTimeline}
      troopTypeCount={troopTypeCount}
      factionSnapshots={factionSnapshots}
      siegeEngineArchive={siegeEngineArchive}
      defenseArchive={defenseArchive}
      worldForces={worldForces}
      onOpenTroopArchive={onOpenTroopArchive}
      onBackToMap={onBackToMap}
      onExportMarkdown={onExportMarkdown}
      onGenerateNewspaper={generateBoardNewspaper}
    />
  );
};
