import React from 'react';
import { User, Sword, Shield, Heart, Flag, Activity, Anchor, Swords, EyeOff, Plus, MessageCircle, ShoppingBag } from 'lucide-react';
import { PlayerAttributes, PlayerState } from '../types';
import { Button } from '../components/Button';

type CharacterViewProps = {
  player: PlayerState;
  spendAttributePoint: (attr: keyof PlayerAttributes) => void;
  onBackToMap: () => void;
};

export const CharacterView = ({ player, spendAttributePoint, onBackToMap }: CharacterViewProps) => {
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
          </div>
          <div className="ml-auto text-right">
            <span className="block text-sm text-stone-500">可用属性点</span>
            <span className="text-3xl font-bold text-yellow-500">{player.attributePoints}</span>
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
