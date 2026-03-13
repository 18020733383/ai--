import React from 'react';
import { AltarTroopDraft } from '../../../types';

const attributeMeta = [
  { key: 'attack', label: '攻击' },
  { key: 'defense', label: '防御' },
  { key: 'agility', label: '敏捷' },
  { key: 'hp', label: '体魄' },
  { key: 'range', label: '远程' },
  { key: 'morale', label: '士气' }
] as const;

type AttrKey = typeof attributeMeta[number]['key'];

const altarRadarMax: Record<AttrKey, number> = {
  attack: 200,
  defense: 215,
  agility: 160,
  hp: 220,
  range: 210,
  morale: 200
};

const radarSize = 110;
const radarCenter = radarSize / 2;
const radarRadius = 36;

const radarPoints = (values: Record<AttrKey, number>, maxValues: Record<AttrKey, number>, scale: number = 1) =>
  attributeMeta.map((attr, index) => {
    const angle = (Math.PI * 2 * index) / attributeMeta.length - Math.PI / 2;
    const max = Math.max(1, maxValues[attr.key]);
    const ratio = Math.min(1, values[attr.key] / max);
    const r = radarRadius * ratio * scale;
    const x = radarCenter + Math.cos(angle) * r;
    const y = radarCenter + Math.sin(angle) * r;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(' ');

const radarAxis = attributeMeta.map((attr, index) => {
  const angle = (Math.PI * 2 * index) / attributeMeta.length - Math.PI / 2;
  const x = radarCenter + Math.cos(angle) * radarRadius;
  const y = radarCenter + Math.sin(angle) * radarRadius;
  return { x, y, label: attr.label };
});

export const formatAltarAttributes = (attrs?: AltarTroopDraft['attributes']) => {
  if (!attrs) return 'A0 D0 AGI0 HP0 RNG0 MOR0';
  return `A${attrs.attack} D${attrs.defense} AGI${attrs.agility} HP${attrs.hp} RNG${attrs.range} MOR${attrs.morale}`;
};

type AltarRadarProps = {
  attrs?: AltarTroopDraft['attributes'];
  color?: string;
};

export const AltarRadar = ({ attrs, color = '#c084fc' }: AltarRadarProps) => {
  const values: Record<AttrKey, number> = {
    attack: attrs?.attack ?? 0,
    defense: attrs?.defense ?? 0,
    agility: attrs?.agility ?? 0,
    hp: attrs?.hp ?? 0,
    range: attrs?.range ?? 0,
    morale: attrs?.morale ?? 0
  };

  return (
    <svg width={radarSize} height={radarSize} viewBox={`0 0 ${radarSize} ${radarSize}`}>
      <polygon points={radarPoints(altarRadarMax, altarRadarMax, 1)} fill="none" stroke="#2a2a2a" strokeWidth="1" />
      <polygon points={radarPoints(altarRadarMax, altarRadarMax, 0.66)} fill="none" stroke="#202020" strokeWidth="1" />
      <polygon points={radarPoints(altarRadarMax, altarRadarMax, 0.33)} fill="none" stroke="#202020" strokeWidth="1" />
      {radarAxis.map((axis, idx) => (
        <line key={`axis-${idx}`} x1={radarCenter} y1={radarCenter} x2={axis.x} y2={axis.y} stroke="#242424" strokeWidth="1" />
      ))}
      <polygon points={radarPoints(values, altarRadarMax)} fill="rgba(192, 132, 252, 0.25)" stroke={color} strokeWidth="1.5" />
    </svg>
  );
};
