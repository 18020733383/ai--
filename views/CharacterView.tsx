import React from 'react';
import { User, Sword, Shield, Heart, Flag, Activity, Anchor, Swords, EyeOff, Plus, MessageCircle, ShoppingBag, Award, Sparkles, Dice6 } from 'lucide-react';
import { PlayerAttributes, PlayerState } from '../types';
import { Button } from '../components/Button';

type CharacterViewProps = {
  player: PlayerState;
  spendAttributePoint: (attr: keyof PlayerAttributes) => void;
  onBackToMap: () => void;
  onChuuniOath: () => void;
  onChuuniFateRoll: () => void;
};

export const CharacterView = ({ player, spendAttributePoint, onBackToMap, onChuuniOath, onChuuniFateRoll }: CharacterViewProps) => {
  const res = player.chuuniResonance ?? 0;
  const oathPending = !!player.chuuniOathNextBattle;
  const fateToday = player.chuuniFateDiceDay === player.day;
  return (
    <div className="max-w-2xl mx-auto p-4 animate-fade-in pb-20 mt-10">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-3xl font-serif text-stone-200">角色属性</h2>
        <Button onClick={onBackToMap} variant="secondary">返回</Button>
      </div>

      <div className="bg-stone-900/80 border border-stone-700 p-8 rounded shadow-2xl">
        <div className="flex items-center gap-6 mb-8 pb-8 border-b border-stone-800">
          <div className="w-24 h-24 bg-stone-800 rounded-full flex items-center justify-center border-4 border-stone-600">
            <User size={48} className="text-stone-400" />
          </div>
          <div>
            <h3 className="text-2xl font-bold text-amber-500">{player.name}</h3>
            <p className="text-stone-400">等级 {player.level} | 经验 {player.xp} / {player.maxXp}</p>
            <p className={`text-sm mt-1 ${player.status === 'INJURED' ? 'text-red-500 font-bold' : 'text-green-500'}`}>
              状态: {player.status === 'INJURED' ? '重伤 (恢复中...)' : '健康'}
            </p>
            <p className="text-xs text-stone-400 mt-1">生命 {player.currentHp} / {player.maxHp}</p>
            <p className={`text-xs mt-1 flex items-center gap-1 ${(player.prestige ?? 0) >= 0 ? 'text-amber-400' : 'text-red-400'}`}>
              <Award size={12} /> 威望 {(player.prestige ?? 0)}
            </p>
          </div>
          <div className="ml-auto text-right">
            <span className="block text-sm text-stone-500">可用属性点</span>
            <span className="text-3xl font-bold text-yellow-500">{player.attributePoints}</span>
          </div>
        </div>

        <div className="mb-8 pb-8 border-b border-stone-800 space-y-4">
          <div className="flex items-center gap-2 text-amber-500/95 font-serif">
            <Sparkles size={18} />
            <span className="font-bold text-lg">虚无刻印 · 共鸣权柄</span>
          </div>
          <p className="text-xs text-stone-500 leading-relaxed">
            实战的胜利会喂养「中二共鸣」。燃烧 35 点共鸣可立誓：下一战实战全体微量强攻与士气加成，并附带……念出台词的特权。
          </p>
          <div className="flex items-center gap-4">
            <div className="flex-1 h-3 rounded-full bg-stone-800 border border-stone-700 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-violet-900 via-amber-700 to-amber-400 transition-all duration-500"
                style={{ width: `${Math.min(100, res)}%` }}
              />
            </div>
            <span className="text-sm font-mono text-amber-200 w-16 text-right">{Math.min(100, res)}/100</span>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="gold"
              size="sm"
              disabled={res < 35 || oathPending}
              onClick={onChuuniOath}
              className="flex items-center gap-2"
            >
              <Sparkles size={14} /> 真名誓约（-35 共鸣）
            </Button>
            {oathPending && <span className="text-xs text-amber-400 self-center">下一战已烙印</span>}
            <Button
              variant="secondary"
              size="sm"
              disabled={fateToday}
              onClick={onChuuniFateRoll}
              className="flex items-center gap-2 border-violet-900/50"
            >
              <Dice6 size={14} /> 命运宣告（每日一次）
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-x-12 gap-y-6">
          {([
            { key: 'attack', label: '攻击', icon: <Sword size={16} />, desc: '增加战斗胜率权重' },
            { key: 'defense', label: '防御', icon: <Shield size={16} />, desc: '减少受到伤害' },
            { key: 'hp', label: '血量上限', icon: <Heart size={16} />, desc: '提升生存能力' },
            { key: 'leadership', label: '统御', icon: <Flag size={16} />, desc: '增加带兵上限' },
            { key: 'medicine', label: '医术', icon: <Activity size={16} />, desc: '救回阵亡士兵' },
            { key: 'looting', label: '掠夺', icon: <Anchor size={16} />, desc: '每级 +10% 战利品金币' },
            { key: 'training', label: '训练', icon: <Swords size={16} />, desc: '每级 +5% 战斗经验，且每日训练士兵' },
            { key: 'commerce', label: '商业', icon: <ShoppingBag size={16} />, desc: '每级 +5 打工日收入' },
            { key: 'escape', label: '跑路', icon: <EyeOff size={16} />, desc: '增加逃跑成功率' },
            { key: 'negotiation', label: '谈判', icon: <MessageCircle size={16} />, desc: '提高谈判成功率' }
          ] as const).map(attr => (
            <div key={attr.key} className="flex items-center justify-between">
              <div>
                <span className="flex items-center gap-2 text-stone-300 font-bold">{attr.icon} {attr.label}</span>
                <span className="text-[10px] text-stone-500">{attr.desc}</span>
              </div>
              <div className="flex items-center gap-4">
                <span className="text-xl font-mono text-stone-200">{player.attributes[attr.key]}</span>
                <button
                  disabled={player.attributePoints <= 0}
                  onClick={() => spendAttributePoint(attr.key)}
                  className="w-6 h-6 rounded bg-stone-700 hover:bg-green-700 flex items-center justify-center disabled:opacity-20 disabled:cursor-not-allowed text-white"
                >
                  <Plus size={12} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
