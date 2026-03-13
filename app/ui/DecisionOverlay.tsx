import React from 'react';
import { createTroop, RACE_LABELS } from '../../game/data';
import { EnemyForce, GameView, Hero, HeroPermanentMemory, Location, PlayerState, RaceId, Troop } from '../../types';
import { CityReligionDecisionModal, HideoutGovDecisionModal } from './DecisionModals';

type PendingDecision = {
  id: string;
  kind: 'CITY_RELIGION' | 'HIDEOUT_GOV';
  locationId: string;
  day: number;
  title: string;
  description: string;
  baseDelta?: number;
  payload?: any;
};

type BattleMeta = {
  mode: 'FIELD' | 'SIEGE' | 'DEFENSE_AID';
  targetLocationId?: string;
  siegeContext?: string;
  supportTroops?: Troop[];
  supportLabel?: string;
};

type DecisionOverlayProps = {
  pendingDecisions: PendingDecision[];
  isBlockedByView: boolean;
  locations: Location[];
  heroes: Hero[];
  player: PlayerState;
  decisionHeroId: string;
  setDecisionHeroId: (heroId: string) => void;
  setPendingDecisions: React.Dispatch<React.SetStateAction<PendingDecision[]>>;
  setLocations: React.Dispatch<React.SetStateAction<Location[]>>;
  setCurrentLocation: React.Dispatch<React.SetStateAction<Location | null>>;
  setPlayer: React.Dispatch<React.SetStateAction<PlayerState>>;
  setHeroes: React.Dispatch<React.SetStateAction<Hero[]>>;
  setActiveEnemy: React.Dispatch<React.SetStateAction<EnemyForce | null>>;
  setPendingBattleMeta: React.Dispatch<React.SetStateAction<BattleMeta | null>>;
  setPendingBattleIsTraining: React.Dispatch<React.SetStateAction<boolean>>;
  addLog: (text: string) => void;
  onUpdateRelation: (targetType: 'FACTION' | 'RACE', targetId: string, delta: number, text: string) => void;
  onEnterBattle: () => void;
  playerRef: React.MutableRefObject<PlayerState>;
};

export const DecisionOverlay = ({
  pendingDecisions,
  isBlockedByView,
  locations,
  heroes,
  player,
  decisionHeroId,
  setDecisionHeroId,
  setPendingDecisions,
  setLocations,
  setCurrentLocation,
  setPlayer,
  setHeroes,
  setActiveEnemy,
  setPendingBattleMeta,
  setPendingBattleIsTraining,
  addLog,
  onUpdateRelation,
  onEnterBattle,
  playerRef
}: DecisionOverlayProps) => {
  const active = pendingDecisions[0] ?? null;
  if (!active || isBlockedByView) return null;
  const loc = locations.find(l => l.id === active.locationId) ?? null;
  const shift = () => setPendingDecisions(prev => prev.slice(1));
  const clampPct = (v: number) => Math.max(0, Math.min(100, Math.floor(v)));
  const now = Date.now();
  const createdAt = new Date(now).toLocaleString('zh-CN', { hour12: false });

  if (active.kind === 'CITY_RELIGION') {
    if (!loc || loc.type !== 'CITY') return null;
    const faithNow = clampPct(loc.religion?.faith ?? 0);
    const baseDelta = Math.floor(Number(active.baseDelta ?? 0));
    const hasChapel = (loc.buildings ?? []).includes('CHAPEL');
    const suppressCostRaw = 90 + Math.abs(baseDelta) * 22 + Math.floor(faithNow * 0.3);
    const suppressCost = Math.max(20, Math.floor(suppressCostRaw * (hasChapel ? 0.9 : 1)));
    const canSuppress = player.gold >= suppressCost;
    const heroesHere = heroes.filter(h => h.recruited && h.status !== 'DEAD');
    const hero = heroesHere.find(h => h.id === decisionHeroId) ?? heroesHere[0] ?? null;

    const applyFaithDelta = (delta: number, reason: string, heroId?: string) => {
      const nextFaith = clampPct(faithNow + delta);
      setLocations(prev => prev.map(l => {
        if (l.id !== loc.id) return l;
        const currentFaith = clampPct(l.religion?.faith ?? 0);
        const faithAfter = clampPct(currentFaith + delta);
        const localLogs = Array.isArray(l.localLogs) ? l.localLogs : [];
        const text = `传教事件处理：${reason}（${delta >= 0 ? `+${delta}%` : `${delta}%`}，现 ${faithAfter}%）。`;
        const nextLocalLogs = localLogs.length > 0 && localLogs[0].text === text ? localLogs : [{ day: active.day, text }, ...localLogs].slice(0, 30);
        return { ...l, localLogs: nextLocalLogs, religion: { ...(l.religion ?? { faith: 0 }), faith: faithAfter, started: true, lastEventDay: active.day } };
      }));
      setCurrentLocation(prev => {
        if (!prev || prev.id !== loc.id) return prev;
        const currentFaith = clampPct(prev.religion?.faith ?? 0);
        const faithAfter = clampPct(currentFaith + delta);
        return { ...prev, religion: { ...(prev.religion ?? { faith: 0 }), faith: faithAfter, started: true, lastEventDay: active.day } };
      });
      addLog(`【传教事件】${loc.name}：${reason}（现 ${nextFaith}%）。`);
      if (heroId) {
        setHeroes(prev => prev.map(h => {
          if (h.id !== heroId) return h;
          const mem: HeroPermanentMemory = {
            id: `faith_evt_${now}_${Math.floor(Math.random() * 10000)}`,
            text: `传教事件：${loc.name}｜${reason}`,
            createdAt,
            createdDay: playerRef.current.day,
            roundIndex: playerRef.current.day
          };
          return { ...h, permanentMemory: [mem, ...(h.permanentMemory ?? [])].slice(0, 24) };
        }));
      }
    };

    return (
      <CityReligionDecisionModal
        title={active.title}
        day={active.day}
        locationName={loc.name}
        description={active.description}
        suppressCost={suppressCost}
        canSuppress={canSuppress}
        heroesHere={heroesHere}
        selectedHeroId={hero?.id ?? ''}
        onChangeHeroId={setDecisionHeroId}
        onSkip={() => {
          const extra = baseDelta < 0 && Math.random() < (hasChapel ? 0.2 : 0.35) ? (hasChapel ? -1 : -2) : 0;
          applyFaithDelta(baseDelta + extra, '放任不管');
          shift();
        }}
        onIgnore={() => {
          const extra = baseDelta < 0 && Math.random() < (hasChapel ? 0.2 : 0.35) ? (hasChapel ? -1 : -2) : 0;
          applyFaithDelta(baseDelta + extra, '放任不管');
          shift();
        }}
        onSuppress={() => {
          if (!canSuppress) return;
          const delta = baseDelta < 0 ? Math.ceil(baseDelta * (hasChapel ? 0.35 : 0.5)) : baseDelta;
          setPlayer(prev => ({ ...prev, gold: Math.max(0, prev.gold - suppressCost) }));
          applyFaithDelta(delta, `花钱镇压（-${suppressCost}）`);
          shift();
        }}
        onPreach={() => {
          if (!hero) return;
          const bonus = Math.floor((hero.level ?? 0) / 8);
          const delta = baseDelta < 0 ? Math.max(1, Math.floor(Math.abs(baseDelta) / 2) + 1 + bonus) : (baseDelta + 2 + bonus);
          applyFaithDelta(delta, `派 ${hero.name} 讲道`, hero.id);
          shift();
        }}
      />
    );
  }

  if (active.kind === 'HIDEOUT_GOV') {
    if (!loc || loc.type !== 'HIDEOUT' || loc.owner !== 'PLAYER' || !loc.hideout) return null;
    const gov = loc.hideout.governance ?? { stability: 60, productivity: 55, prosperity: 50, harmony: 55 };
    const relationImpact = (active as any)?.payload?.relationImpact as { raceId: RaceId; onlyTwoChoices?: boolean } | null;
    const relationLabel = relationImpact ? RACE_LABELS[relationImpact.raceId] : '';
    const applyGov = (delta: { stability: number; productivity: number; prosperity: number; harmony: number }, cost: number, label: string) => {
      if (cost > 0) setPlayer(prev => ({ ...prev, gold: Math.max(0, prev.gold - cost) }));
      const nextGov = {
        stability: clampPct(gov.stability + delta.stability),
        productivity: clampPct(gov.productivity + delta.productivity),
        prosperity: clampPct(gov.prosperity + delta.prosperity),
        harmony: clampPct(gov.harmony + delta.harmony),
        lastEventDay: active.day,
        nextEventDay: gov.nextEventDay
      };
      setLocations(prev => prev.map(l => {
        if (l.id !== loc.id || l.type !== 'HIDEOUT' || !l.hideout) return l;
        const localLogs = Array.isArray(l.localLogs) ? l.localLogs : [];
        const text = `内政处理：${label}（稳${delta.stability >= 0 ? `+${delta.stability}` : delta.stability} 产${delta.productivity >= 0 ? `+${delta.productivity}` : delta.productivity} 繁${delta.prosperity >= 0 ? `+${delta.prosperity}` : delta.prosperity} 和${delta.harmony >= 0 ? `+${delta.harmony}` : delta.harmony}）`;
        const nextLocalLogs = localLogs.length > 0 && localLogs[0].text === text ? localLogs : [{ day: active.day, text }, ...localLogs].slice(0, 30);
        return { ...l, localLogs: nextLocalLogs, hideout: { ...l.hideout, governance: nextGov } };
      }));
      setCurrentLocation(prev => {
        if (!prev || prev.id !== loc.id || prev.type !== 'HIDEOUT' || !prev.hideout) return prev;
        return { ...prev, hideout: { ...prev.hideout, governance: nextGov } };
      });
      addLog(`【内政】${loc.name}：${label}。`);
      const rebellionRisk = nextGov.stability <= 15 ? 0.28 : nextGov.stability <= 20 ? 0.15 : 0;
      if (rebellionRisk > 0 && Math.random() < rebellionRisk) {
        const rebelCount = Math.max(10, Math.min(120, Math.floor((100 - nextGov.stability) * 0.9 + nextGov.productivity * 0.35 + nextGov.prosperity * 0.25)));
        const mix = [
          { id: 'militia', ratio: 0.55 },
          { id: 'peasant', ratio: 0.25 },
          { id: 'archer', ratio: 0.12 },
          { id: 'footman', ratio: 0.08 }
        ];
        const troops = mix
          .map(x => ({ ...x, count: Math.max(1, Math.floor(rebelCount * x.ratio)) }))
          .filter(x => x.count > 0)
          .map(x => createTroop(x.id as any, x.count));
        const enemy: EnemyForce = {
          id: `hideout_rebellion_${Date.now()}`,
          name: '叛军',
          description: '内政失衡引发的叛乱。你必须亲自镇压，否则隐匿点将被夺走。',
          troops,
          difficulty: nextGov.stability <= 15 ? '困难' : '中等',
          lootPotential: 0.2,
          terrain: loc.terrain,
          baseTroopId: troops[0]?.id ?? 'militia'
        };
        setActiveEnemy(enemy);
        setPendingBattleMeta({ mode: 'FIELD', targetLocationId: loc.id, siegeContext: 'HIDEOUT_REBELLION' });
        setPendingBattleIsTraining(false);
        addLog(`【叛乱】${loc.name} 爆发叛乱！准备迎战。`);
        onEnterBattle();
      }
    };
    const applyRelation = (delta: number, label: string) => {
      if (!relationImpact || !delta) return;
      onUpdateRelation('RACE', relationImpact.raceId, delta, `内政处理：${label}（${relationLabel}）`);
    };
    const costRelief = 140;
    const costMediate = 80;
    const canRelief = player.gold >= costRelief;
    const canMediate = player.gold >= costMediate;
    const onlyTwoChoices = !!relationImpact?.onlyTwoChoices;

    return (
      <HideoutGovDecisionModal
        title={active.title}
        day={active.day}
        locationName={loc.name}
        description={active.description}
        onlyTwoChoices={onlyTwoChoices}
        costRelief={costRelief}
        costMediate={costMediate}
        canRelief={canRelief}
        canMediate={canMediate}
        onSkip={() => {
          applyGov({ stability: -2, productivity: 0, prosperity: 0, harmony: -1 }, 0, '观望不决');
          if (relationImpact) applyRelation(-4, '观望不决');
          shift();
        }}
        onAppeaseEnvoys={() => {
          if (!canMediate) return;
          applyGov({ stability: 6, productivity: -2, prosperity: 0, harmony: 8 }, costMediate, `安抚使者（-${costMediate}）`);
          applyRelation(10, '安抚使者');
          shift();
        }}
        onCrackdown={() => {
          applyGov({ stability: -6, productivity: 6, prosperity: 3, harmony: -6 }, 0, '强硬清剿');
          applyRelation(-10, '强硬清剿');
          shift();
        }}
        onRelief={() => {
          if (!canRelief) return;
          applyGov({ stability: 10, productivity: -3, prosperity: -1, harmony: 4 }, costRelief, `安抚民心（-${costRelief}）`);
          applyRelation(8, '安抚民心');
          shift();
        }}
        onBoostProduction={() => {
          applyGov({ stability: -9, productivity: 8, prosperity: 5, harmony: -2 }, 0, '强化生产');
          applyRelation(-8, '强化生产');
          shift();
        }}
        onMediate={() => {
          if (!canMediate) return;
          applyGov({ stability: 3, productivity: -2, prosperity: 0, harmony: 10 }, costMediate, `调停冲突（-${costMediate}）`);
          applyRelation(4, '调停冲突');
          shift();
        }}
      />
    );
  }

  return null;
};
