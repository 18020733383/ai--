import type { Location } from '../../types';

export type GarrisonPresetEntry = { troopId: string; count: number };

export function getLocationGarrison(location: Location): GarrisonPresetEntry[] {
  if (location.type === 'WORLD_BOARD' || location.type === 'ALTAR') return [];
  const factionId = location.factionId;
  const isVerdant = factionId === 'VERDANT_COVENANT';
  const isFrost = factionId === 'FROST_OATH';
  const isRedDune = factionId === 'RED_DUNE';

  if (location.type === 'ROACH_NEST') {
    return [
      { troopId: 'roach_brawler', count: 520 },
      { troopId: 'roach_pikeman', count: 520 },
      { troopId: 'roach_slinger', count: 520 },
      { troopId: 'roach_shieldling', count: 520 },
      { troopId: 'roach_aerial_duelist', count: 240 },
      { troopId: 'roach_aerial_lancer', count: 240 },
      { troopId: 'roach_aerial_harrier', count: 240 },
      { troopId: 'roach_aerial_guard', count: 240 },
      { troopId: 'roach_chitin_commander', count: 50 },
      { troopId: 'roach_giant_halberdier', count: 60 },
      { troopId: 'roach_giant_gunner', count: 60 },
      { troopId: 'roach_carapace_titan', count: 40 }
    ];
  }
  if (location.type === 'CITY') {
    if (isVerdant) {
      return [
        { troopId: 'imperial_swordsman', count: 600 },
        { troopId: 'imperial_shieldbearer', count: 420 },
        { troopId: 'imperial_crossbowman', count: 420 },
        { troopId: 'hunter', count: 320 },
        { troopId: 'verdant_scout_archer', count: 280 },
        { troopId: 'verdant_skybow', count: 120 },
        { troopId: 'arcane_glider', count: 14 },
        { troopId: 'arcane_biplane', count: 4 },
        { troopId: 'arcane_airship', count: 1 }
      ];
    }
    if (isFrost) {
      return [
        { troopId: 'footman', count: 520 },
        { troopId: 'imperial_shieldbearer', count: 420 },
        { troopId: 'imperial_swordsman', count: 380 },
        { troopId: 'frost_oath_halberdier', count: 280 },
        { troopId: 'frost_oath_bladeguard', count: 140 },
        { troopId: 'imperial_crossbowman', count: 200 },
        { troopId: 'arcane_glider', count: 10 },
        { troopId: 'arcane_biplane', count: 3 },
        { troopId: 'arcane_airship', count: 1 }
      ];
    }
    if (isRedDune) {
      return [
        { troopId: 'imperial_light_cavalry', count: 360 },
        { troopId: 'imperial_elite_knight', count: 200 },
        { troopId: 'red_dune_lancer', count: 340 },
        { troopId: 'red_dune_cataphract', count: 160 },
        { troopId: 'imperial_horse_archer', count: 280 },
        { troopId: 'imperial_shieldbearer', count: 240 },
        { troopId: 'imperial_crossbowman', count: 200 },
        { troopId: 'footman', count: 180 },
        { troopId: 'arcane_glider', count: 12 },
        { troopId: 'arcane_biplane', count: 3 },
        { troopId: 'arcane_airship', count: 1 }
      ];
    }
    return [
      { troopId: 'imperial_swordsman', count: 820 },
      { troopId: 'imperial_shieldbearer', count: 620 },
      { troopId: 'imperial_crossbowman', count: 320 },
      { troopId: 'knight', count: 180 },
      { troopId: 'arcane_glider', count: 12 },
      { troopId: 'arcane_biplane', count: 3 },
      { troopId: 'arcane_airship', count: 1 }
    ];
  }
  if (location.type === 'CASTLE') {
    if (isVerdant) {
      return [
        { troopId: 'imperial_shieldbearer', count: 150 },
        { troopId: 'imperial_crossbowman', count: 120 },
        { troopId: 'verdant_scout_archer', count: 120 },
        { troopId: 'hunter', count: 90 },
        { troopId: 'footman', count: 90 },
        { troopId: 'verdant_skybow', count: 30 },
        { troopId: 'arcane_glider', count: 6 },
        { troopId: 'arcane_biplane', count: 2 }
      ];
    }
    if (isFrost) {
      return [
        { troopId: 'footman', count: 180 },
        { troopId: 'imperial_shieldbearer', count: 150 },
        { troopId: 'frost_oath_halberdier', count: 120 },
        { troopId: 'imperial_crossbowman', count: 80 },
        { troopId: 'frost_oath_bladeguard', count: 40 },
        { troopId: 'imperial_swordsman', count: 30 },
        { troopId: 'arcane_glider', count: 5 },
        { troopId: 'arcane_biplane', count: 1 }
      ];
    }
    if (isRedDune) {
      return [
        { troopId: 'imperial_light_cavalry', count: 140 },
        { troopId: 'red_dune_lancer', count: 160 },
        { troopId: 'imperial_horse_archer', count: 120 },
        { troopId: 'red_dune_cataphract', count: 40 },
        { troopId: 'footman', count: 70 },
        { troopId: 'imperial_shieldbearer', count: 70 },
        { troopId: 'arcane_glider', count: 5 },
        { troopId: 'arcane_biplane', count: 1 }
      ];
    }
    return [
      { troopId: 'footman', count: 240 },
      { troopId: 'imperial_shieldbearer', count: 180 },
      { troopId: 'imperial_crossbowman', count: 120 },
      { troopId: 'knight', count: 60 },
      { troopId: 'arcane_glider', count: 5 },
      { troopId: 'arcane_biplane', count: 1 }
    ];
  }
  if (location.type === 'VILLAGE') {
    if (isVerdant) return [{ troopId: 'militia', count: 40 }, { troopId: 'hunter', count: 25 }, { troopId: 'verdant_scout_archer', count: 12 }];
    if (isFrost) return [{ troopId: 'militia', count: 45 }, { troopId: 'footman', count: 18 }, { troopId: 'frost_oath_halberdier', count: 8 }];
    if (isRedDune) return [{ troopId: 'militia', count: 35 }, { troopId: 'imperial_light_cavalry', count: 12 }, { troopId: 'red_dune_lancer', count: 10 }];
    return [{ troopId: 'militia', count: 45 }, { troopId: 'hunter', count: 22 }];
  }
  if (location.type === 'HOTPOT_RESTAURANT') {
    return [
      { troopId: 'meatball_soldier', count: 160 },
      { troopId: 'tofu_shield', count: 90 },
      { troopId: 'spicy_soup_mage', count: 40 }
    ];
  }
  if (location.type === 'GRAVEYARD') {
    return [
      { troopId: 'zombie', count: 50 },
      { troopId: 'skeleton_warrior', count: 30 },
      { troopId: 'specter', count: 20 }
    ];
  }
  if (location.type === 'COFFEE') {
    return [
      { troopId: 'zombie', count: 40 },
      { troopId: 'skeleton_warrior', count: 28 }
    ];
  }
  if (location.type === 'HABITAT') {
    return [
      { troopId: 'beast_roc_hatchling', count: 14 },
      { troopId: 'beast_roc', count: 6 },
      { troopId: 'beast_roc_alpha', count: 1 },
      { troopId: 'beast_primate_juvenile_chimp', count: 12 },
      { troopId: 'beast_primate_adult_gorilla', count: 6 },
      { troopId: 'beast_primate_silverback', count: 2 },
      { troopId: 'beast_primate_giant_legacy', count: 1 },
      { troopId: 'beast_rhino_calf', count: 6 },
      { troopId: 'beast_rhino_black_subadult', count: 3 },
      { troopId: 'beast_rhino_white_warrior', count: 1 },
      { troopId: 'beast_hippo_calf', count: 6 },
      { troopId: 'beast_hippo_swamp', count: 3 },
      { troopId: 'beast_hippo_raging_bull', count: 1 },
      { troopId: 'beast_elephant_calf', count: 4 },
      { troopId: 'beast_elephant_bush', count: 2 },
      { troopId: 'beast_elephant_musth_bull', count: 1 },
      { troopId: 'beast_lion_cub', count: 6 },
      { troopId: 'beast_lion_wanderer', count: 3 },
      { troopId: 'beast_lion_pride_king', count: 1 },
      { troopId: 'beast_tiger_cub', count: 5 },
      { troopId: 'beast_tiger_jungle_hunter', count: 2 },
      { troopId: 'beast_tiger_siberian', count: 1 },
      { troopId: 'beast_bear_cub', count: 6 },
      { troopId: 'beast_bear_grizzly', count: 3 },
      { troopId: 'beast_bear_kodiak', count: 1 },
      { troopId: 'beast_wolf_grey', count: 10 },
      { troopId: 'beast_wolf_king', count: 4 },
      { troopId: 'beast_wolf_tundra_giant', count: 2 },
      { troopId: 'beast_croc_nile_juvenile', count: 6 },
      { troopId: 'beast_croc_wetland_giant', count: 3 },
      { troopId: 'beast_croc_saltwater', count: 1 },
      { troopId: 'beast_bison_calf', count: 6 },
      { troopId: 'beast_bison_african_buffalo', count: 3 },
      { troopId: 'beast_bison_rabid_king', count: 1 }
    ];
  }
  if (location.type === 'RUINS') {
    return [
      { troopId: 'zealot', count: 70 },
      { troopId: 'flagellant', count: 40 }
    ];
  }
  if (location.type === 'BANDIT_CAMP') {
    if (location.id.startsWith('goblin_camp_')) {
      return [
        { troopId: 'goblin_scavenger', count: 80 },
        { troopId: 'goblin_spear_urchin', count: 70 },
        { troopId: 'goblin_slinger', count: 60 },
        { troopId: 'goblin_raider', count: 35 },
        { troopId: 'goblin_pikeman', count: 25 }
      ];
    }
    return [
      { troopId: 'peasant', count: 60 },
      { troopId: 'militia', count: 50 },
      { troopId: 'hunter', count: 40 }
    ];
  }
  if (location.type === 'IMPOSTER_PORTAL') {
    return [
      { troopId: 'void_larva', count: 2000 },
      { troopId: 'glitch_pawn', count: 2000 },
      { troopId: 'static_noise_walker', count: 2000 },
      { troopId: 'null_fragment', count: 2000 },
      { troopId: 'imposter_light_infantry', count: 750 },
      { troopId: 'imposter_spearman', count: 750 },
      { troopId: 'imposter_short_bowman', count: 750 },
      { troopId: 'imposter_slinger', count: 750 },
      { troopId: 'imposter_shield_conscript', count: 750 },
      { troopId: 'imposter_axeman', count: 750 },
      { troopId: 'imposter_javelin_thrower', count: 750 },
      { troopId: 'imposter_scout_rider', count: 750 },
      { troopId: 'entropy_acolyte', count: 1000 },
      { troopId: 'pixel_shifter', count: 1000 },
      { troopId: 'null_pointer_hound', count: 1000 },
      { troopId: 'syntax_error_scout', count: 1000 },
      { troopId: 'imposter_heavy_infantry', count: 400 },
      { troopId: 'imposter_pikeman', count: 400 },
      { troopId: 'imposter_swordsman', count: 400 },
      { troopId: 'imposter_longbowman', count: 400 },
      { troopId: 'imposter_crossbowman', count: 400 },
      { troopId: 'imposter_halberdier', count: 400 },
      { troopId: 'imposter_mace_guard', count: 400 },
      { troopId: 'imposter_raider_rider', count: 400 },
      { troopId: 'imposter_stalker', count: 500 },
      { troopId: 'memory_leak_mage', count: 500 },
      { troopId: 'recursion_archer', count: 500 },
      { troopId: 'deadlock_sentinel', count: 500 },
      { troopId: 'imposter_heavy_knight', count: 200 },
      { troopId: 'imposter_horse_archer', count: 200 },
      { troopId: 'imposter_pike_guard', count: 200 },
      { troopId: 'imposter_reaper_blade', count: 200 },
      { troopId: 'blue_screen_golem', count: 200 },
      { troopId: 'kernel_panic_knight', count: 200 },
      { troopId: 'segmentation_fault_dragon', count: 200 },
      { troopId: 'not_found_assassin', count: 200 },
      { troopId: 'legacy_code_abomination', count: 50 },
      { troopId: 'system_crash_titan', count: 50 },
      { troopId: 'infinite_loop_devourer', count: 50 }
    ];
  }
  return [{ troopId: 'militia', count: 80 }];
}
