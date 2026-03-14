import type { Troop } from '../../../types';

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

export function getDefaultLayerId(troop: Troop, layers: LayerInfo[], getTroopTemplate: GetTroopTemplate): string {
  const text = getTroopLayerDescriptor(troop, getTroopTemplate);
  const template = getTroopTemplate(troop.id);
  const supportRole = template?.supportRole ?? troop.supportRole;
  const isHeavy = (template?.category ?? troop.category) === 'HEAVY' || troop.id.startsWith('heavy_');
  const isRanged = /archer|bow|crossbow|ranger|marksman|sharpshooter|弓|弩|游侠|神射|猎手|射/.test(text);
  const isMage = /mage|wizard|sorcerer|法师|术士|巫师/.test(text);
  const isBard = /bard|吟游/.test(text);
  const isShield = /shield|盾|phalanx|wall|守护/.test(text);
  const isCavalry = /cavalry|rider|horse|knight|paladin|骑/.test(text);
  if (troop.id === 'player_main') return layers[1]?.id ?? layers[0]?.id;
  if (isHeavy) {
    if (supportRole === 'ARTILLERY' || supportRole === 'RADAR') return layers[3]?.id ?? layers[layers.length - 1]?.id;
    if (supportRole === 'TANK') return layers[0]?.id ?? layers[1]?.id;
    return layers[2]?.id ?? layers[1]?.id;
  }
  if (isRanged || isMage || isBard) return layers[3]?.id ?? layers[layers.length - 1]?.id;
  if (isShield) return layers[0]?.id ?? layers[1]?.id;
  if (isCavalry) return layers[1]?.id ?? layers[0]?.id;
  return layers[1]?.id ?? layers[0]?.id;
}
