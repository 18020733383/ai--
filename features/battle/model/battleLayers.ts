import type { Troop, TroopCombatRole } from '../../../types';

export const DEFAULT_BATTLE_LAYERS = [
  { id: 'layer-1', name: '先锋', hint: '承受正面冲击，适合盾兵与重装近战。' },
  { id: 'layer-2', name: '前锋', hint: '主力突击与机动部队，短兵相接。' },
  { id: 'layer-3', name: '中坚', hint: '稳定战线，承担主力输出与支援。' },
  { id: 'layer-4', name: '后卫', hint: '远程火力与施法单位，保持安全距离。' },
  { id: 'layer-5', name: '预备', hint: '保留机动与护卫，随时补位。' }
];

export type LayerInfo = { id: string; name: string; hint: string };

export type GetTroopTemplate = (id: string) => Partial<Troop> | undefined;

export function getTroopLayerDescriptor(troop: Troop, getTroopTemplate: GetTroopTemplate): string {
  const template = getTroopTemplate(troop.id);
  const source = template ?? troop;
  const equipment = Array.isArray(source.equipment) ? source.equipment.join(' ') : '';
  const description = source.description ?? '';
  return `${troop.id} ${troop.name} ${equipment} ${description}`.toLowerCase();
}

function hasAnyRole(list: TroopCombatRole[], candidates: TroopCombatRole[]): boolean {
  return candidates.some(r => list.includes(r));
}

export function getDefaultLayerId(troop: Troop, layers: LayerInfo[], getTroopTemplate: GetTroopTemplate): string {
  const template = getTroopTemplate(troop.id);
  const text = getTroopLayerDescriptor(troop, getTroopTemplate);
  const supportRole = template?.supportRole ?? troop.supportRole;
  const isHeavy = (template?.category ?? troop.category) === 'HEAVY' || troop.id.startsWith('heavy_');

  const roleList: TroopCombatRole[] =
    template?.combatRoles?.length ? (template.combatRoles as TroopCombatRole[]) : troop.combatRoles ?? [];

  if (troop.id === 'player_main') return layers[1]?.id ?? layers[0]?.id;

  if (roleList.length > 0) {
    if (
      hasAnyRole(roleList, [
        'SIEGE_ARTILLERY',
        'SUPPORT_RADAR',
        'AERIAL_BOMBER',
        'ARCHER',
        'LONGBOW',
        'CROSSBOW',
        'GUNNER',
        'BATTLE_MAGE',
        'ELEMENTALIST',
        'CURSE_HEXER',
        'SUMMON_CHANNELER'
      ])
    ) {
      return layers[3]?.id ?? layers[layers.length - 1]?.id;
    }
    if (hasAnyRole(roleList, ['SHIELD_SPECIALIST', 'SPEAR_LINE']) && !hasAnyRole(roleList, ['HORSE_ARCHER', 'LIGHT_CAVALRY'])) {
      return layers[0]?.id ?? layers[1]?.id;
    }
    if (
      hasAnyRole(roleList, [
        'LIGHT_CAVALRY',
        'HEAVY_CAVALRY',
        'LANCER',
        'HORSE_ARCHER',
        'BEAST_RIDER',
        'AERIAL_SKIRMISH',
        'AERIAL_STRIKE',
        'SHOCK_TROOPER',
        'SCOUT_STALKER'
      ])
    ) {
      return layers[1]?.id ?? layers[0]?.id;
    }
    if (hasAnyRole(roleList, ['SKIRMISHER', 'JAVELINEER', 'SLINGER'])) {
      return layers[2]?.id ?? layers[1]?.id;
    }
    if (hasAnyRole(roleList, ['FIELD_ENGINE', 'CONSTRUCT_GOLEM', 'HEAVY_INFANTRY', 'SIEGE_TOWER', 'MONSTER_BEAST'])) {
      return layers[1]?.id ?? layers[2]?.id;
    }
    if (hasAnyRole(roleList, ['LEVY', 'MILITIA', 'LINE_INFANTRY', 'POLEARM', 'SWARM_INSECT'])) {
      return layers[1]?.id ?? layers[0]?.id;
    }
  }

  if (isHeavy) {
    if (supportRole === 'ARTILLERY' || supportRole === 'RADAR') return layers[3]?.id ?? layers[layers.length - 1]?.id;
    if (supportRole === 'TANK') return layers[0]?.id ?? layers[1]?.id;
    return layers[2]?.id ?? layers[1]?.id;
  }
  const isRanged = /archer|bow|crossbow|ranger|marksman|sharpshooter|弓|弩|游侠|神射|猎手|射/.test(text);
  const isMage = /mage|wizard|sorcerer|法师|术士|巫师/.test(text);
  const isBard = /bard|吟游/.test(text);
  const isShield = /shield|盾|phalanx|wall|守护/.test(text);
  const isCavalry = /cavalry|rider|horse|knight|paladin|骑/.test(text);
  if (isRanged || isMage || isBard) return layers[3]?.id ?? layers[layers.length - 1]?.id;
  if (isShield) return layers[0]?.id ?? layers[1]?.id;
  if (isCavalry) return layers[1]?.id ?? layers[0]?.id;
  return layers[1]?.id ?? layers[0]?.id;
}
