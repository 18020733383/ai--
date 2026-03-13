import React from 'react';
import { Users } from 'lucide-react';
import { Troop, StayParty } from '../../../types';
import { TroopCard } from '../../../components/TroopCard';

type GarrisonSectionProps = {
  visibleStayParties: StayParty[];
  getStayPartyOwnerLabel: (party: StayParty) => string;
  getPartyCount: (troops: Troop[]) => number;
};

export const GarrisonSection = ({
  visibleStayParties,
  getStayPartyOwnerLabel,
  getPartyCount
}: GarrisonSectionProps) => {
  return (
    <div className="space-y-6 animate-fade-in">
      {visibleStayParties.length === 0 && (
        <div className="text-center py-12 border border-dashed border-stone-800 rounded">
          <p className="text-stone-500 italic">暂无停留部队。</p>
        </div>
      )}
      {visibleStayParties.map(party => (
        <div key={party.id} className="bg-stone-900/40 border border-stone-800 rounded p-4 space-y-4">
          <div className="flex items-center justify-between">
            <div className="text-stone-200 font-bold flex items-center gap-2">
              <Users size={16} className="text-amber-500" />
              <span>{party.name}</span>
            </div>
            <div className="text-stone-400 text-sm flex items-center gap-3">
              <span>归属 {getStayPartyOwnerLabel(party)}</span>
              <span>总人数 {getPartyCount(party.troops)}</span>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {party.troops.map(troop => (
              <TroopCard
                key={`${party.id}-${troop.id}`}
                troop={troop}
                count={troop.count}
                countLabel="数量"
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};
