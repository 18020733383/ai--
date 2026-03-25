import type { Location } from '../../types';

export function getRecruitmentPool(location: Location, mode: 'VOLUNTEER' | 'MERCENARY'): string[] {
  const type = location.type;
  const factionId = location.factionId;
  const factionMercs = factionId === 'VERDANT_COVENANT'
    ? ['verdant_scout_archer', 'verdant_skybow']
    : factionId === 'FROST_OATH'
      ? ['frost_oath_halberdier', 'frost_oath_bladeguard']
      : factionId === 'RED_DUNE'
        ? ['red_dune_lancer', 'red_dune_cataphract']
        : factionId === 'ARCANE_CONCORD'
          ? ['stellar_magus', 'lumen_savant', 'rift_sentinel', 'aether_scholar']
          : [];
  if (location.id.startsWith('village_goblin_')) {
    return mode === 'VOLUNTEER'
      ? ['goblin_scavenger', 'goblin_slinger', 'goblin_spear_urchin', 'goblin_sneak']
      : ['goblin_scrap_shield', 'goblin_bomber', 'goblin_wolf_pup_rider'];
  }
  if (factionId === 'ARCANE_CONCORD') {
    if (mode === 'VOLUNTEER') {
      return ['stellar_initiate', 'lumen_initiate', 'rift_initiate', 'aether_initiate'];
    }
    return [
      'stellar_acolyte',
      'lumen_disciple',
      'rift_acolyte',
      'aether_disciple',
      ...factionMercs
    ];
  }
  if (type === 'HEAVY_TRIAL_GROUNDS') {
    if (mode === 'VOLUNTEER') return [];
    return [
      'heavy_ballista',
      'heavy_catapult',
      'heavy_bulwark_carriage',
      'heavy_fire_cannon',
      'heavy_light_tank',
      'heavy_arcane_radar',
      'heavy_siege_belfry',
      'roach_egg_thrower',
      'imposter_flux_mortar',
      'undead_soul_obelisk',
      'undead_bone_siege_golem',
      'undead_cathedral_colossus',
      'hotpot_broth_howler'
    ];
  }
  if (type === 'GRAVEYARD') {
    if (mode === 'VOLUNTEER') return ['zombie', 'undead_grave_thrall', 'undead_rot_scout', 'undead_mire_digger', 'undead_bone_crawler', 'undead_ashen_runner', 'undead_coffin_bearer', 'undead_carrion_moth'];
    return [
      'skeleton_warrior',
      'specter',
      'skeleton_archer',
      'undead_musician',
      'undead_bone_javelin',
      'undead_grave_arbalist',
      'undead_bone_slinger',
      'undead_tomb_guard',
      'undead_plague_bearer',
      'undead_bone_rider',
      'undead_bone_hussar',
      'undead_wight_knight',
      'undead_grave_alchemist',
      'undead_plague_doctor',
      'undead_pestilence_lord',
      'undead_gargoyle',
      'undead_gargoyle_ancient',
      'undead_bone_mortar',
      'undead_grave_bastion',
      'undead_gloom_skimmer',
      'undead_tomb_harrier',
      'undead_night_gaunt',
      'undead_eclipse_reaper',
      'undead_grave_colossus',
      'undead_bone_siege_golem',
      'undead_cathedral_colossus'
    ];
  }
  if (type === 'HOTPOT_RESTAURANT') {
    return ['meatball_soldier', 'tofu_shield', 'spicy_soup_mage'];
  }
  if (type === 'COFFEE') {
    if (mode === 'VOLUNTEER') return ['zombie', 'undead_grave_thrall', 'undead_ashen_runner', 'skeleton_warrior'];
    return [];
  }
  if (type === 'HABITAT') {
    if (mode === 'VOLUNTEER') {
      return [
        'beast_roc_hatchling',
        'beast_primate_juvenile_chimp',
        'beast_rhino_calf',
        'beast_hippo_calf',
        'beast_elephant_calf',
        'beast_lion_cub',
        'beast_tiger_cub',
        'beast_bear_cub',
        'beast_wolf_grey',
        'beast_croc_nile_juvenile',
        'beast_bison_calf'
      ];
    }
    return [
      'beast_roc',
      'beast_roc_alpha',
      'beast_primate_adult_gorilla',
      'beast_rhino_black_subadult',
      'beast_hippo_swamp',
      'beast_elephant_bush',
      'beast_lion_wanderer',
      'beast_tiger_jungle_hunter',
      'beast_bear_grizzly',
      'beast_wolf_king',
      'beast_croc_wetland_giant',
      'beast_bison_african_buffalo'
    ];
  }
  if (type === 'MARKET') return [];
  if (type === 'IMPOSTER_PORTAL') return [];
  if (type === 'MYSTERIOUS_CAVE') return [];
  if (type === 'ROACH_NEST') return [];

  // General locations
  if (mode === 'VOLUNTEER') {
    return [
      'peasant',
      'militia',
      'hunter',
      'zealot',
      'imperial_shield_conscript',
      'imperial_recruit_archer',
      'imperial_recruit_crossbow',
      'imperial_light_attendant',
      'imperial_spear_initiate',
      'imperial_squire_cavalry',
      'imperial_rider_trainee'
    ];
  } else {
    const basePool = ['footman', 'archer', 'wolf_rider', 'alchemist', 'flagellant', 'arcane_apprentice'];
    if (location.type === 'CITY' || location.type === 'CASTLE' || location.type === 'VILLAGE') {
      const airPool = location.type === 'CITY' || location.type === 'CASTLE'
        ? ['arcane_glider', 'arcane_biplane', 'arcane_airship']
        : [];
      return [...basePool, ...factionMercs, ...airPool];
    }
    return basePool;
  }
}
