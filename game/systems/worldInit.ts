import type { Hero, Location, Lord, LordFocus, StayParty, Troop } from '../../types';
import { FACTIONS, INITIAL_HERO_ROSTER, LOCATIONS, TROOP_TEMPLATES } from '../data';

export const STAY_PARTY_LOCATION_TYPES: Location['type'][] = ['CITY', 'CASTLE', 'ROACH_NEST', 'IMPOSTER_PORTAL'];

export const isUndeadFortressLocation = (location: Location) =>
  location.type === 'GRAVEYARD' && location.id.startsWith('death_');

export const isCastleLikeLocation = (location: Location) =>
  location.type === 'CASTLE' || isUndeadFortressLocation(location);

const buildStayPartyTroops = (location: Location, seed: number, entries: Array<{ id: string; count: number }>) => {
  const heavyOptions = location.type === 'ROACH_NEST'
    ? ['roach_egg_thrower']
    : location.type === 'IMPOSTER_PORTAL'
      ? ['imposter_flux_mortar']
      : (location.type === 'CITY' || location.type === 'CASTLE')
        ? ['heavy_ballista', 'heavy_fire_cannon', 'heavy_catapult', 'heavy_light_tank']
        : [];
  const airOptions = (location.type === 'CITY' || location.type === 'CASTLE')
    ? ['arcane_glider', 'arcane_biplane', 'arcane_airship']
    : [];
  const baseTroops = entries
    .map(entry => {
      const template = TROOP_TEMPLATES[entry.id];
      return template ? { ...template, count: entry.count, xp: 0 } : null;
    })
    .filter(Boolean) as Troop[];
  const totalCount = baseTroops.reduce((sum, t) => sum + t.count, 0);
  const next = [...baseTroops];
  if (heavyOptions.length > 0) {
    const desiredHeavy = Math.max(1, Math.min(3, 1 + Math.floor(totalCount / 280)));
    const existingHeavy = baseTroops
      .filter(t => t.category === 'HEAVY')
      .reduce((sum, t) => sum + t.count, 0);
    const remainingHeavy = Math.max(0, desiredHeavy - existingHeavy);
    for (let i = 0; i < remainingHeavy; i++) {
      const heavyId = heavyOptions[(seed + i) % heavyOptions.length];
      const template = TROOP_TEMPLATES[heavyId];
      if (!template) continue;
      const existing = next.find(t => t.id === heavyId);
      if (existing) {
        existing.count += 1;
      } else {
        next.push({ ...template, count: 1, xp: 0 });
      }
    }
  }
  if (airOptions.length > 0) {
    const desiredAir = Math.max(1, Math.min(3, 1 + Math.floor(totalCount / 360)));
    const existingAir = baseTroops
      .filter(t => (t.combatDomain ?? 'GROUND') !== 'GROUND')
      .reduce((sum, t) => sum + t.count, 0);
    const remainingAir = Math.max(0, desiredAir - existingAir);
    for (let i = 0; i < remainingAir; i++) {
      const airId = airOptions[(seed + 31 + i) % airOptions.length];
      const template = TROOP_TEMPLATES[airId];
      if (!template) continue;
      const existing = next.find(t => t.id === airId);
      if (existing) {
        existing.count += 1;
      } else {
        next.push({ ...template, count: 1, xp: 0 });
      }
    }
  }
  return next;
};

const buildStayPartiesForLocation = (location: Location): StayParty[] => {
  const seed = location.id.split('').reduce((sum, ch) => sum + ch.charCodeAt(0), 0);
  const firstIndex = (seed % 90) + 1;
  const secondIndex = ((seed + 17) % 90) + 1;
  const faction = FACTIONS.find(f => f.id === location.factionId);
  const factionLabel = faction?.shortName ?? '帝国';
  const cityTitles = ['城卫团', '巡防团', '商路护卫团', '苍弦弓团', '长街守军'];
  const cityMobileTitles = ['机动旅', '斥候营', '巡猎队', '游击团', '轻骑团'];
  const castleTitles = ['要塞守备团', '铁壁卫队', '壁垒军', '山脊卫团'];
  const roachTitles = ['啃噬虫群', '裂甲虫潮', '腐蚀虫巢', '黑潮虫群'];
  const imposterTitles = ['裂隙先锋群', '故障行军群', '镜像突袭群', '扭曲军势'];
  const pickTitle = (titles: string[], index: number) => titles[index % titles.length];
  if (location.type === 'CITY') {
    const titleA = pickTitle(cityTitles, firstIndex);
    const titleB = pickTitle(cityMobileTitles, secondIndex);
    return [
      {
        id: `${location.id}_legion_${firstIndex}`,
        name: `${factionLabel}·${location.name}${titleA}`,
        troops: buildStayPartyTroops(location, seed + firstIndex, [
          { id: 'imperial_swordsman', count: 240 },
          { id: 'imperial_shieldbearer', count: 180 },
          { id: 'imperial_crossbowman', count: 140 },
          { id: 'knight', count: 60 }
        ]),
        owner: 'NEUTRAL'
      },
      {
        id: `${location.id}_legion_${secondIndex}`,
        name: `${factionLabel}·${location.name}${titleB}`,
        troops: buildStayPartyTroops(location, seed + secondIndex, [
          { id: 'footman', count: 200 },
          { id: 'imperial_shieldbearer', count: 160 },
          { id: 'imperial_crossbowman', count: 120 },
          { id: 'knight', count: 50 }
        ]),
        owner: 'NEUTRAL'
      }
    ];
  }
  if (location.type === 'CASTLE') {
    const title = pickTitle(castleTitles, firstIndex);
    return [
      {
        id: `${location.id}_legion_${firstIndex}`,
        name: `${factionLabel}·${location.name}${title}`,
        troops: buildStayPartyTroops(location, seed + firstIndex, [
          { id: 'footman', count: 160 },
          { id: 'imperial_shieldbearer', count: 120 },
          { id: 'imperial_crossbowman', count: 90 },
          { id: 'knight', count: 35 }
        ]),
        owner: 'NEUTRAL'
      }
    ];
  }
  if (location.type === 'ROACH_NEST') {
    const titleA = pickTitle(roachTitles, firstIndex);
    const titleB = pickTitle(roachTitles, secondIndex + 3);
    return [
      {
        id: `${location.id}_swarm_${firstIndex}`,
        name: `蟑螂${titleA}`,
        troops: buildStayPartyTroops(location, seed + firstIndex, [
          { id: 'roach_brawler', count: 260 },
          { id: 'roach_pikeman', count: 260 },
          { id: 'roach_slinger', count: 180 },
          { id: 'roach_shieldling', count: 180 },
          { id: 'roach_aerial_duelist', count: 60 }
        ]),
        owner: 'ENEMY'
      },
      {
        id: `${location.id}_swarm_${secondIndex}`,
        name: `蟑螂${titleB}`,
        troops: buildStayPartyTroops(location, seed + secondIndex, [
          { id: 'roach_aerial_lancer', count: 80 },
          { id: 'roach_aerial_harrier', count: 80 },
          { id: 'roach_aerial_guard', count: 80 },
          { id: 'roach_chitin_commander', count: 30 },
          { id: 'roach_giant_halberdier', count: 40 }
        ]),
        owner: 'ENEMY'
      }
    ];
  }
  if (location.type === 'IMPOSTER_PORTAL') {
    const titleA = pickTitle(imposterTitles, firstIndex);
    const titleB = pickTitle(imposterTitles, secondIndex + 2);
    return [
      {
        id: `${location.id}_legion_${firstIndex}`,
        name: `伪人${titleA}`,
        troops: buildStayPartyTroops(location, seed + firstIndex, [
          { id: 'void_larva', count: 380 },
          { id: 'glitch_pawn', count: 380 },
          { id: 'static_noise_walker', count: 260 },
          { id: 'null_fragment', count: 260 },
          { id: 'imposter_light_infantry', count: 220 },
          { id: 'imposter_short_bowman', count: 140 }
        ]),
        owner: 'ENEMY'
      },
      {
        id: `${location.id}_legion_${secondIndex}`,
        name: `伪人${titleB}`,
        troops: buildStayPartyTroops(location, seed + secondIndex, [
          { id: 'imposter_spearman', count: 260 },
          { id: 'imposter_slinger', count: 240 },
          { id: 'entropy_acolyte', count: 140 },
          { id: 'pixel_shifter', count: 120 },
          { id: 'syntax_error_scout', count: 120 },
          { id: 'imposter_heavy_infantry', count: 80 },
          { id: 'imposter_longbowman', count: 80 }
        ]),
        owner: 'ENEMY'
      }
    ];
  }
  return [];
};

export const seedStayParties = (locations: Location[]) =>
  locations.map(location => {
    if (!STAY_PARTY_LOCATION_TYPES.includes(location.type)) return location;
    if (location.stayParties && location.stayParties.length > 0) return location;
    return { ...location, stayParties: buildStayPartiesForLocation(location) };
  });

const lordFamilyNames = ['洛', '伊', '雷', '凯', '萨', '赫', '沃', '格', '塞', '艾', '菲', '卡'];
const lordGivenNames = ['兰', '维恩', '赫尔', '赛恩', '米娅', '罗莎', '阿什', '卡尔', '诺亚', '艾琳', '里昂', '希尔'];
const lordTemperaments = ['强硬', '稳重', '多疑', '豪爽', '谨慎', '冷峻', '宽厚', '冷静'];
const lordTraits = ['好战', '务实', '忠诚', '谨慎', '野心', '仁慈', '狡黠', '守旧', '热情', '冷静'];
const lordFocuses: LordFocus[] = ['WAR', 'TRADE', 'DEFENSE', 'DIPLOMACY'];
const lordTitleByType = (type: Location['type']) =>
  type === 'CITY' ? '城主' : type === 'CASTLE' ? '堡主' : type === 'GRAVEYARD' ? '墓主' : type === 'ROACH_NEST' ? '巢主' : '领主';
const getLordSeed = (id: string) => id.split('').reduce((sum, ch) => sum + ch.charCodeAt(0), 0);
const pickLordValue = <T,>(list: T[], seed: number, offset: number = 0) => list[(seed + offset) % list.length];
const roachLordNames = ['甲壳母', '壳鸣者', '孵化主', '触须王', '蜕壳者', '螯刃统领', '脉囊司巢'];
const undeadLordNames = ['黯焰守陵者', '骨律祀官', '腐棺司主', '冥火执令', '遗誓看守者', '黑纱侯影', '亡钟聆者'];

export const getDefaultGarrisonBaseLimit = (location: Location) => {
  const existingCount = (location.garrison ?? []).reduce((sum, t) => sum + t.count, 0);
  if (existingCount > 0) return existingCount;
  if (location.type === 'CITY') return 1940;
  if (location.type === 'CASTLE') return 600;
  if (location.type === 'VILLAGE') return 67;
  return 0;
};

const buildLordPartyTroops = (location: Location) => {
  const pickTroop = (id: string, count: number) => {
    const template = TROOP_TEMPLATES[id];
    return template ? { ...template, count, xp: 0 } : null;
  };
  if (location.factionId === 'ARCANE_CONCORD') {
    if (location.type === 'CITY') {
      const base = [
        pickTroop('stellar_acolyte', 70),
        pickTroop('lumen_disciple', 60),
        pickTroop('rift_acolyte', 50),
        pickTroop('aether_disciple', 50),
        pickTroop('stellar_magus', 20),
        pickTroop('aether_scholar', 15)
      ].filter(Boolean) as Troop[];
      return base;
    }
    if (location.type === 'CASTLE') {
      const base = [
        pickTroop('lumen_disciple', 40),
        pickTroop('rift_sentinel', 30),
        pickTroop('aether_scholar', 25),
        pickTroop('stellar_magus', 20)
      ].filter(Boolean) as Troop[];
      return base;
    }
    if (location.type === 'VILLAGE') {
      const base = [
        pickTroop('stellar_initiate', 35),
        pickTroop('lumen_initiate', 25),
        pickTroop('rift_initiate', 20),
        pickTroop('aether_initiate', 20)
      ].filter(Boolean) as Troop[];
      return base;
    }
  }
  if (location.type === 'CITY') {
    const base = [pickTroop('militia', 120), pickTroop('footman', 80), pickTroop('hunter', 50), pickTroop('heavy_fire_cannon', 1), pickTroop('arcane_glider', 1)].filter(Boolean) as Troop[];
    return base;
  }
  if (location.type === 'CASTLE') {
    const base = [pickTroop('footman', 60), pickTroop('hunter', 30), pickTroop('heavy_ballista', 1), pickTroop('arcane_glider', 1)].filter(Boolean) as Troop[];
    return base;
  }
  if (location.type === 'GRAVEYARD') {
    return [
      pickTroop('skeleton_warrior', 80),
      pickTroop('undead_bone_javelin', 70),
      pickTroop('undead_grave_arbalist', 60),
      pickTroop('specter', 40),
      pickTroop('undead_musician', 30),
      pickTroop('undead_soul_obelisk', 1),
      pickTroop('undead_gargoyle', 1)
    ].filter(Boolean) as Troop[];
  }
  if (location.type === 'VILLAGE') {
    const base = [pickTroop('peasant', 30), pickTroop('hunter', 15), pickTroop('heavy_ballista', 1)].filter(Boolean) as Troop[];
    return base;
  }
  if (location.type === 'ROACH_NEST') {
    return [
      pickTroop('roach_brawler', 80),
      pickTroop('roach_pikeman', 70),
      pickTroop('roach_slinger', 60),
      pickTroop('roach_shieldling', 50),
      pickTroop('roach_egg_thrower', 1)
    ].filter(Boolean) as Troop[];
  }
  return [];
};

export const getTroopCount = (troops: Troop[]) => troops.reduce((sum, t) => sum + t.count, 0);

const buildLordStayParty = (locationId: string, lord: Lord) => ({
  id: `lord_party_${lord.id}`,
  name: `${lord.name}的部队`,
  troops: lord.partyTroops,
  owner: 'NEUTRAL' as const,
  lordId: lord.id
});

const buildLocationLord = (location: Location): Lord | null => {
  const isUndeadFortress = isUndeadFortressLocation(location);
  if (location.type !== 'CITY' && location.type !== 'CASTLE' && location.type !== 'VILLAGE' && location.type !== 'ROACH_NEST' && !isUndeadFortress) return null;
  const seed = getLordSeed(location.id);
  const traitA = pickLordValue(lordTraits, seed, 5);
  const traitB = pickLordValue(lordTraits, seed, 9);
  const traits = traitA === traitB ? [traitA] : [traitA, traitB];
  const focus = pickLordValue(lordFocuses, seed, 7);
  const faction = FACTIONS.find(f => f.id === location.factionId);
  const roachName = roachLordNames[seed % roachLordNames.length];
  const undeadName = undeadLordNames[seed % undeadLordNames.length];
  const partyTroops = buildLordPartyTroops(location);
  const partyMaxCount = getTroopCount(partyTroops);
  return {
    id: `lord_${location.id}`,
    name: location.type === 'ROACH_NEST' ? roachName : location.type === 'GRAVEYARD' ? undeadName : `${pickLordValue(lordFamilyNames, seed)}${pickLordValue(lordGivenNames, seed, 3)}`,
    title: lordTitleByType(location.type),
    factionId: faction?.id ?? location.factionId,
    fiefId: location.id,
    traits,
    temperament: pickLordValue(lordTemperaments, seed, 12),
    focus,
    relation: 0,
    currentLocationId: location.id,
    state: 'RESTING',
    stateSinceDay: 1,
    partyTroops,
    partyMaxCount
  } as Lord;
};

export const ensureLocationLords = (list: Location[]) => {
  return list.map(loc => {
    const isUndeadFortress = isUndeadFortressLocation(loc);
    if (loc.type !== 'CITY' && loc.type !== 'CASTLE' && loc.type !== 'VILLAGE' && loc.type !== 'ROACH_NEST' && !isUndeadFortress) return loc;
    const currentLord = loc.lord && loc.lord.factionId === loc.factionId && loc.lord.fiefId === loc.id ? loc.lord : null;
    const lord = currentLord ?? buildLocationLord(loc);
    if (!lord) return loc;
    const baseLimit = loc.garrisonBaseLimit ?? getDefaultGarrisonBaseLimit(loc);
    return { ...loc, lord, garrisonBaseLimit: baseLimit };
  });
};

export const syncLordPresence = (list: Location[], lords: Lord[]) => {
  const lordsById = new Map(lords.map(lord => [lord.id, lord]));
  return list.map(loc => {
    const owner = loc.lord ? lordsById.get(loc.lord.id) ?? loc.lord : loc.lord;
    const preservedParties = (loc.stayParties ?? []).filter(party => !party.lordId || !lordsById.has(party.lordId));
    const visitingLords = lords.filter(lord => lord.currentLocationId === loc.id && !lord.travelDaysLeft);
    const lordParties = visitingLords.map(lord => buildLordStayParty(loc.id, lord));
    return { ...loc, lord: owner, stayParties: [...preservedParties, ...lordParties] };
  });
};

export function buildRandomizedHeroes(): Hero[] {
  const cityIds = LOCATIONS.filter(l => l.type === 'CITY').map(l => l.id);
  return INITIAL_HERO_ROSTER.map(hero => {
    if (cityIds.length === 0 || Math.random() < 0.45) return { ...hero };
    const cityId = cityIds[Math.floor(Math.random() * cityIds.length)];
    const stayDays = Math.floor(Math.random() * 4) + 2;
    return { ...hero, locationId: cityId, stayDays };
  });
}

export const buildInitialWorld = () => {
  const seeded = seedStayParties(LOCATIONS);
  const withLords = ensureLocationLords(seeded);
  const lords = withLords.flatMap(loc => (loc.lord ? [{ ...loc.lord }] : []));
  const syncedLocations = syncLordPresence(withLords, lords).map(loc => {
    if (loc.claimFactionId) return loc;
    if (loc.factionId) return { ...loc, claimFactionId: loc.factionId };
    return loc;
  });
  return { locations: syncedLocations, lords };
};
