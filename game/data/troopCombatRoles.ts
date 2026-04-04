import type { Troop, TroopCombatRole } from '../../types';

export const TROOP_COMBAT_ROLE_LABELS: Record<TroopCombatRole, string> = {
  LEVY: '征发步兵',
  MILITIA: '守备民兵',
  LINE_INFANTRY: '列阵步兵',
  SHOCK_TROOPER: '陷阵猛士',
  SPEAR_LINE: '枪矛方阵',
  POLEARM: '长柄斩矛',
  SHIELD_SPECIALIST: '盾墙专精',
  HEAVY_INFANTRY: '重装步兵',
  SKIRMISHER: '轻装散兵',
  ARCHER: '弓手',
  LONGBOW: '长弓狙射',
  CROSSBOW: '弩手',
  SLINGER: '投索掷弹',
  GUNNER: '火器铳炮',
  JAVELINEER: '标枪投掷',
  LIGHT_CAVALRY: '轻骑袭扰',
  HEAVY_CAVALRY: '重骑冲锋',
  LANCER: '枪骑突刺',
  HORSE_ARCHER: '骑射游猎',
  BEAST_RIDER: '兽骑战狼',
  BATTLE_MAGE: '战阵法师',
  ELEMENTALIST: '元素术者',
  CURSE_HEXER: '咒缚诡术',
  SUMMON_CHANNELER: '召唤通幽',
  AERIAL_SKIRMISH: '空中袭扰',
  AERIAL_STRIKE: '空中强袭',
  AERIAL_BOMBER: '空中轰击',
  SIEGE_ARTILLERY: '攻城炮械',
  SIEGE_TOWER: '攻城塔楼',
  FIELD_ENGINE: '机甲战车',
  SUPPORT_RADAR: '侦校支援',
  SCOUT_STALKER: '侦察渗透',
  MONSTER_BEAST: '巨兽猛禽',
  CONSTRUCT_GOLEM: '构造魔像',
  SWARM_INSECT: '虫群集群'
};

export type TroopCombatRoleAssignInput = Pick<
  Troop,
  | 'tier'
  | 'name'
  | 'category'
  | 'combatDomain'
  | 'supportRole'
  | 'attributes'
  | 'ammoPerUnit'
> & {
  equipment?: string[];
  description?: string;
};

function pushUnique(roles: TroopCombatRole[], r: TroopCombatRole, max = 4) {
  if (roles.length >= max) return;
  if (!roles.includes(r)) roles.push(r);
}

/** 由模板与 id 推导职能标签（至多 4 枚），供 TROOP_TEMPLATES 与缺省时的 UI 解析 */
export function assignCombatRoles(t: TroopCombatRoleAssignInput, id: string): TroopCombatRole[] {
  const roles: TroopCombatRole[] = [];
  const idL = id.toLowerCase();
  const text = `${idL} ${(t.name ?? '').toLowerCase()} ${(t.equipment ?? []).join(' ').toLowerCase()} ${(t.description ?? '').toLowerCase()}`;

  const domain = t.combatDomain ?? 'GROUND';
  const cat = t.category ?? 'NORMAL';
  const sr = t.supportRole;
  const attrs = t.attributes ?? { attack: 0, defense: 0, agility: 0, hp: 0, range: 0, morale: 0 };
  const rng = attrs.range ?? 0;
  const ag = attrs.agility ?? 0;
  const atk = attrs.attack ?? 0;
  const def = attrs.defense ?? 0;
  const hp = attrs.hp ?? 0;

  // --- 重型 / 攻城科技 ---
  if (cat === 'HEAVY') {
    if (sr === 'ARTILLERY') pushUnique(roles, 'SIEGE_ARTILLERY');
    else if (sr === 'TANK') pushUnique(roles, 'FIELD_ENGINE');
    else if (sr === 'RADAR') pushUnique(roles, 'SUPPORT_RADAR');
    else if (/tower|belfry|云梯|攻城塔|楼车|siege_belfry/.test(text)) pushUnique(roles, 'SIEGE_TOWER');
    else pushUnique(roles, 'FIELD_ENGINE');
  }

  // --- 空域 ---
  if (domain === 'AIR' || domain === 'HYBRID') {
    if (
      /bomber|轰炸|投弹|obelisk|mortar|egg_throw|flux_mortar|天穹撞|撞角舰|灾变|cataclysm/.test(text) ||
      /aerial.*bomber|空中轰/.test(text)
    ) {
      pushUnique(roles, 'AERIAL_BOMBER');
    } else if (
      /强袭|截击|决斗|歼|闯将|storm_skiff|celestial_ram|harrier|reaper|夜魇|摘魂|intercept/.test(text) ||
      /roc|飞龙|魔龙|亚龙|君龙|暴君|驭龙/.test(idL)
    ) {
      pushUnique(roles, 'AERIAL_STRIKE');
    } else {
      pushUnique(roles, 'AERIAL_SKIRMISH');
    }
  }

  // --- 地面骑乘（空军已标则仍可叠兽骑语义，但避免与纯空军重复）---
  const mountPat =
    /(cavalry|knight|cataphract|husar|hussar|squire_cavalry|light_cavalry|elite_knight|bixi|steppe|windrider|death_knight|bone_rider|bone_hussar|wight_knight|dread_marshal|roach_chitin_commander|scout_rider|raider_rider|horse_arch|imposter_horse)/.test(
      idL
    );
  const beastMountPat = /(wolf_rider|warg_rider|wolf_pup|goblin_wolf)/.test(idL);
  if ((domain === 'GROUND' || domain === 'HYBRID') && (mountPat || beastMountPat)) {
    if (/horse_arch|windrider|steppe|弓骑|骑射|windrider|horse_archer|imposter_horse_archer/.test(idL) || /骑射|弓骑/.test(text)) {
      pushUnique(roles, 'HORSE_ARCHER');
    } else if (/cataphract|heavy_cavalry|elite_knight|bixi|death_knight|wight|dread_marshal|paladin|重骑/.test(idL) || /重骑|铁甲骑|圣骑/.test(text)) {
      pushUnique(roles, 'HEAVY_CAVALRY');
    } else if (
      /lancer|lance|枪骑|突击枪|eclipse_lancer|red_dune_lancer|roach_aerial_lancer/.test(idL) ||
      /枪骑|冲锋枪骑/.test(text)
    ) {
      pushUnique(roles, 'LANCER');
    } else if (beastMountPat || /warg|座狼|战狼/.test(text)) {
      pushUnique(roles, 'BEAST_RIDER');
    } else {
      pushUnique(roles, 'LIGHT_CAVALRY');
    }
  }

  // --- 火器 / 弹药 ---
  if ((t.ammoPerUnit ?? 0) > 0 || /flintlock|musket|arquebus|铳|燧发|火枪|gunner|炮兵|齐射|弹幕|captain.*燧/.test(text)) {
    pushUnique(roles, 'GUNNER');
  }

  // --- 投掷 / 索弹 ---
  if (/slinger|投石索|榴弹|bomber(?!.*飞机)|egg_throw|投掷虫/.test(text) || /slinger|bomber|grenadier|thrower/.test(idL)) {
    pushUnique(roles, 'SLINGER');
  }

  // --- 弩 ---
  if (/crossbow|arbalest|弩|机弩|stitch_crossbow|grave_arbalist|steel_arbalest|imposter_crossbow/.test(idL) || /弩|机弩/.test(text)) {
    pushUnique(roles, 'CROSSBOW');
  }

  // --- 弓 ---
  if (
    (/archer|bow|skybow|longbow|marksman|ranger|eagle_ranger|hunter|sharpshooter|dragoonslayer|骷髅弓|imposter_short_bow|imposter_longbow|recursion_archer|roach_slinger|undead_bone_slinger/.test(
      idL
    ) &&
      !/crossbow|arbalest|弩|slinger|horse_arch|windrider/.test(idL)) ||
    (/弓|猎手|游射/.test(text) && !/弩|机弩|骑射/.test(text))
  ) {
    if (/longbow|长弓|鹰狩|eagle_ranger|imperial_longbowman/.test(idL) || /长弓|强弓/.test(text)) pushUnique(roles, 'LONGBOW');
    else if (!roles.includes('CROSSBOW') && !roles.includes('GUNNER')) pushUnique(roles, 'ARCHER');
  }

  // --- 标枪 ---
  if (/javelin|标枪|掷矛|thrower|pikeling|投矛|imposter_javelin/.test(text) || /javelin/.test(idL)) {
    pushUnique(roles, 'JAVELINEER');
  }

  // --- 枪矛方阵（非枪骑兵）---
  if (
    !roles.includes('LANCER') &&
    !roles.includes('LIGHT_CAVALRY') &&
    !roles.includes('HEAVY_CAVALRY') &&
    (/pikeman|phalanx|spear_initiate|spear_chief|imposter_pikeman|imposter_pike|frost_oath_halberdier|roach_pikeman|goblin_pikeman/.test(idL) ||
      /枪阵|矛墙|长矛阵|拒马/.test(text))
  ) {
    pushUnique(roles, 'SPEAR_LINE');
  }

  // --- 长柄斩矛 ---
  if (/halberd|halberdier|戟|钺|镰刀|镰刀卫士|iron_halberd|imposter_halberdier/.test(idL) || /长戟|戟兵/.test(text)) {
    pushUnique(roles, 'POLEARM');
  }

  // --- 法术 ---
  const magePat =
    /mage|wizard|sorc|acolyte|adept|invoker|archmage|weaver|oracle|magus|archon|seraph|necro|lich|hexer|shaman|术士|法师|法术|咒术|禁术|咏唱|奥术|邪术|召唤|binder|channeler|学徒|侍法|塑能|先知|熵|像素|递归|指针|语法|编译|缓冲|线程|浮点|nan|上溢|下溢|循环|栈|内核/.test(
      text
    );
  const stellarPat = /(lumen|stellar|rift|aether|arcane_apprentice|glitch|kernel|pyro_|flame_|shadow_|necro_)/.test(idL);
  if (magePat || stellarPat) {
    if (/necro|lich|grave|bone_binder|瘟疫|诅咒|招魂|恶灵|尸|entropy|咒缚|hexer|巫医|fungus_medic|plague/.test(text))
      pushUnique(roles, 'CURSE_HEXER');
    else if (/summon|caller|binder|imaginary_friend|召唤|唤灵/.test(text)) pushUnique(roles, 'SUMMON_CHANNELER');
    else if (/pyro|flame|fire|cinder|magma|burn|炽|燃|烬|霜纹|寒冰|冰川|永冬|雷霆|雷暴|arc_discharge/.test(text))
      pushUnique(roles, 'ELEMENTALIST');
    else pushUnique(roles, 'BATTLE_MAGE');
  }

  // --- 渗透 / 侦察 ---
  if (/assassin|stalk|sneak|nightblade|shadow_lord|潜行|暗刃|谍|not_found|割喉|roach_sneak|goblin_sneak/.test(text)) {
    pushUnique(roles, 'SCOUT_STALKER');
  }
  if (
    (/scout|skirmish|pathfinder|侦察|斥候|游哨|boundary|scout_rider|侦查/.test(text) || /scout|skirmisher|pathfinder/.test(idL)) &&
    ag > atk - 5 &&
    rng < 95 &&
    domain === 'GROUND'
  ) {
    pushUnique(roles, 'SKIRMISHER');
  }

  // --- 盾墙 ---
  if (/shield|盾|wall|bulwark|immortal_wall|tower_shield|shieldbearer|盾墙|大盾|方阵盾|imposter_shield|roach_shieldling/.test(text)) {
    pushUnique(roles, 'SHIELD_SPECIALIST');
  }

  // --- 陷阵 ---
  if (/executioner|greatsword|刽子|巨剑|breacher|狂热|zealot|flagellant|破门|狂战士|判官|冲锋官/.test(text)) {
    pushUnique(roles, 'SHOCK_TROOPER');
  }

  // --- 重装步兵 ---
  if (
    /heavy_infantry|immortal|grave_bastion|mace_guard|iron.*heavy|重甲|重装步|imposter_heavy_infantry|imposter_heavy_knight/.test(idL) ||
    (def >= 95 && hp >= 95 && domain === 'GROUND' && cat !== 'HEAVY')
  ) {
    pushUnique(roles, 'HEAVY_INFANTRY');
  }

  // --- 巨兽 / 构造 / 虫群 ---
  if (
    /beast_|drake|wyrm|dragon|roc|primate|rhino|hippo|elephant|lion|tiger|bear|wolf|croc|bison|巨兽|雏龙|龙蛋|蛋|猩|犀|象|狮|虎|熊|鳄|牛|巨猿|锦鲤|沙虫/.test(idL) ||
    /古兽|原型|巨化/.test(text)
  ) {
    pushUnique(roles, 'MONSTER_BEAST');
  }
  if (
    /golem|colossus|titan|魔像|泰坦|墙蜂|automaton|walkmachine|legacy_code|system_crash|blue_screen|kernel_panic|segmentation|behemoth|发条|锅炉|收割机|废铁|巨偶|scrap_iron|carapace_titan/.test(
      text
    ) ||
    /golem|colossus|bastion|carapace|titan|egg_throw|soul_obelisk/.test(idL)
  ) {
    pushUnique(roles, 'CONSTRUCT_GOLEM');
  }
  if (/bug_|roach_brawler|roach_pikeman|roach_slinger|cockroach|蟑螂集群|虫群|幼虫/.test(idL)) {
    pushUnique(roles, 'SWARM_INSECT');
  }

  // --- 亡灵行卒（无其它标签时的步兵底）---
  if (
    /^(zombie|skeleton_warrior|undead_grave_thrall|undead_coffin_bearer|undead_tomb_guard|undead_musician)$/.test(idL) ||
    /^skeleton_/.test(idL) && !/archer/.test(idL)
  ) {
    if (!roles.some(r => ['MONSTER_BEAST', 'CONSTRUCT_GOLEM', 'CURSE_HEXER', 'BATTLE_MAGE', 'AERIAL_SKIRMISH', 'AERIAL_STRIKE', 'LANCER', 'HEAVY_CAVALRY'].includes(r)))
      pushUnique(roles, 'LINE_INFANTRY');
  }

  // --- 征发 / 民兵 ---
  if (idL === 'peasant' || /农民|征夫|苦力民夫/.test(text)) pushUnique(roles, 'LEVY');
  if (idL === 'militia' || /乡勇守备/.test(text)) pushUnique(roles, 'MILITIA');

  // --- 缺省 ---
  if (roles.length === 0) {
    if (idL === 'peasant') pushUnique(roles, 'LEVY');
    else if (idL === 'militia') pushUnique(roles, 'MILITIA');
    else if ((t.tier ?? 1) <= 2 && rng < 50 && domain === 'GROUND') pushUnique(roles, 'MILITIA');
    else pushUnique(roles, 'LINE_INFANTRY');
  }

  return roles.slice(0, 4);
}

export function formatCombatRoleLabels(roles: TroopCombatRole[] | undefined): string[] {
  if (!roles?.length) return [];
  return roles.map(r => TROOP_COMBAT_ROLE_LABELS[r] ?? r);
}

export function resolveTroopCombatRoles(
  troop: Pick<Troop, 'id' | 'combatRoles'> & Partial<TroopCombatRoleAssignInput>,
  getTemplate?: (id: string) => Partial<Troop> | undefined
): TroopCombatRole[] {
  if (troop.combatRoles?.length) return troop.combatRoles;
  const tmpl = getTemplate?.(troop.id) as TroopCombatRoleAssignInput & { combatRoles?: TroopCombatRole[] } | undefined;
  if (tmpl?.combatRoles?.length) return tmpl.combatRoles;
  return assignCombatRoles({ ...tmpl, ...troop, attributes: troop.attributes ?? tmpl?.attributes }, troop.id);
}
