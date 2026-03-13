import React from 'react';
import { Star } from 'lucide-react';
import { Button } from '../../../components/Button';
import { Hero, PlayerState, RecruitOffer } from '../../../types';

type TavernSectionProps = {
  player: PlayerState;
  tavernHeroes: Hero[];
  activeHero: Hero | null;
  heroDialogue: { heroId: string; text: string } | null;
  getHeroRoleLabel: (role: Hero['role']) => string;
  getHeroRecruitCost: (hero: Hero) => number;
  talkToHero: (hero: Hero) => void;
  recruitHero: (hero: Hero) => void;
  renderRecruitCard: (offer: RecruitOffer, type: 'VOLUNTEER' | 'MERCENARY') => React.ReactNode;
  mercenaries: RecruitOffer[];
};

export const TavernSection = ({
  player,
  tavernHeroes,
  activeHero,
  heroDialogue,
  getHeroRoleLabel,
  getHeroRecruitCost,
  talkToHero,
  recruitHero,
  renderRecruitCard,
  mercenaries
}: TavernSectionProps) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-fade-in">
      <div className="col-span-1 md:col-span-2 bg-stone-900/40 p-4 rounded border border-stone-800 mb-4">
        <p className="text-stone-400 text-sm">酒馆里偶尔会出现寻找雇主的资深战士。费用较高。</p>
      </div>
      <div className="col-span-1 md:col-span-2 bg-stone-900/40 p-4 rounded border border-stone-800">
        <div className="flex items-center justify-between">
          <div className="text-amber-500 font-bold">旅人传闻</div>
          <div className="text-xs text-stone-500">英雄会在城市酒馆停留几天后离开</div>
        </div>
        {tavernHeroes.length === 0 ? (
          <div className="text-stone-500 text-sm mt-3">今天没有熟面孔。</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            {tavernHeroes.map(hero => (
              <div key={hero.id} className="bg-stone-950/40 border border-stone-800 rounded p-4 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <Star size={14} className="text-amber-400" />
                      <div className="text-stone-200 font-bold">{hero.name}</div>
                      <span className="text-[10px] px-2 py-0.5 rounded border border-stone-700 text-stone-400 bg-stone-900/30">
                        {getHeroRoleLabel(hero.role)}
                      </span>
                    </div>
                    <div className="text-xs text-stone-500">{hero.title} · {hero.portrait}</div>
                  </div>
                  <div className="text-xs text-stone-500">等级 {hero.level}</div>
                </div>
                <div className="text-sm text-stone-400 leading-relaxed">{hero.background}</div>
                <div className="flex flex-wrap gap-2 text-[11px] text-stone-400">
                  {hero.traits.map((trait, idx) => (
                    <span key={`${hero.id}-trait-${idx}`} className="px-2 py-0.5 rounded border border-stone-700 bg-stone-900/40">
                      {trait}
                    </span>
                  ))}
                </div>
                <div className="flex items-center gap-2 text-xs text-stone-500">
                  <span>攻击 {hero.attributes.attack}</span>
                  <span>血量 {hero.maxHp}</span>
                  <span>敏捷 {hero.attributes.agility}</span>
                </div>
                <div className="flex gap-2">
                  <Button onClick={() => talkToHero(hero)} variant="secondary">对话</Button>
                  <Button onClick={() => recruitHero(hero)} variant="gold" disabled={player.gold < getHeroRecruitCost(hero)}>
                    招募（{getHeroRecruitCost(hero)}）
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
        {activeHero && heroDialogue && (
          <div className="mt-4 bg-stone-900/60 border border-stone-800 rounded p-4">
            <div className="text-xs text-stone-500 mb-1">{activeHero.name}：</div>
            <div className="text-stone-200">{heroDialogue.text}</div>
          </div>
        )}
      </div>
      {mercenaries.length > 0 ? mercenaries.map((offer) =>
        renderRecruitCard(offer, 'MERCENARY')
      ) : (
        <div className="col-span-2 text-center py-12 border border-dashed border-stone-800 rounded">
          <p className="text-stone-500 italic">酒馆里只有醉鬼。</p>
        </div>
      )}
    </div>
  );
};
