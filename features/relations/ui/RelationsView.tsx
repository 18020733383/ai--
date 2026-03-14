import { Button } from '../../../components/Button';
import { FACTIONS, RACE_LABELS } from '../../../game/data';
import { clampRelation, getRelationStateLabel } from '../../../game/systems/diplomacy';
import { Location, PlayerState, RaceId, WorldDiplomacyState } from '../../../types';

type RelationsViewProps = {
  locations: Location[];
  player: PlayerState;
  worldDiplomacy: WorldDiplomacyState;
  onBackToMap: () => void;
};

export const RelationsView = ({
  locations,
  player,
  worldDiplomacy,
  onBackToMap
}: RelationsViewProps) => {
  const factionRows = FACTIONS.map(faction => ({
    id: faction.id,
    name: faction.name,
    shortName: faction.shortName,
    color: faction.color
  }));
  const playerRow = { id: 'PLAYER', name: '玩家', shortName: '你', color: '#facc15' };
  const factionMatrixRows = [...factionRows, playerRow];
  const raceIds = Object.keys(RACE_LABELS) as RaceId[];
  const raceMatrixRows: Array<RaceId | 'PLAYER'> = [...raceIds, 'PLAYER'];

  const getCellStyle = (value: number) => {
    const intensity = Math.min(1, Math.abs(value) / 100);
    if (value > 0) return { backgroundColor: `rgba(16,185,129, ${0.12 + intensity * 0.55})`, color: '#ecfdf5' };
    if (value < 0) return { backgroundColor: `rgba(239,68,68, ${0.12 + intensity * 0.55})`, color: '#fee2e2' };
    return { backgroundColor: 'rgba(120,113,108,0.22)', color: '#e7e5e4' };
  };

  const getTone = getRelationStateLabel;

  const lordItems = Array.from(new Map(
    locations
      .filter(loc => loc.lord)
      .map(loc => [
        loc.lord!.id,
        {
          id: loc.lord!.id,
          name: loc.lord!.name,
          title: loc.lord!.title,
          fief: loc.name,
          value: loc.lord!.relation
        }
      ])
  ).values()).sort((a, b) => b.value - a.value);

  const diplomacyEvents = (worldDiplomacy.events ?? []).slice(0, 18);
  const personalEvents = (player.relationEvents ?? []).slice(0, 12);

  return (
    <div className="max-w-6xl mx-auto px-4">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-serif text-amber-400">关系网络</h2>
        <Button onClick={onBackToMap} variant="secondary">返回地图</Button>
      </div>
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <div className="bg-stone-900 border border-stone-700 rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="text-stone-200 font-semibold">势力外交关系</div>
            <div className="text-xs text-stone-500">{factionMatrixRows.length} 个势力</div>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-[680px] w-full border-collapse text-xs">
              <thead>
                <tr>
                  <th className="p-2 text-left text-stone-400 font-semibold">关系</th>
                  {factionMatrixRows.map(f => (
                    <th key={f.id} className="p-2 text-left text-stone-400 font-semibold">
                      <span className="inline-flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full" style={{ backgroundColor: f.color }} />
                        {f.shortName}
                      </span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {factionMatrixRows.map(rowFaction => (
                  <tr key={rowFaction.id} className="border-t border-stone-800">
                    <td className="p-2 text-stone-300 font-semibold whitespace-nowrap">{rowFaction.name}</td>
                    {factionMatrixRows.map(colFaction => {
                      const same = rowFaction.id === colFaction.id;
                      const raw = (() => {
                        if (same) return 0;
                        if (rowFaction.id === 'PLAYER') {
                          return clampRelation(Number((player.relationMatrix?.factions as any)?.[colFaction.id] ?? 0));
                        }
                        if (colFaction.id === 'PLAYER') {
                          return clampRelation(Number((player.relationMatrix?.factions as any)?.[rowFaction.id] ?? 0));
                        }
                        return clampRelation(Number((worldDiplomacy.factionRelations as any)?.[rowFaction.id]?.[colFaction.id] ?? 0));
                      })();
                      const style = getCellStyle(raw);
                      return (
                        <td key={`${rowFaction.id}_${colFaction.id}`} className="p-2 align-middle">
                          {same ? (
                            <div className="text-stone-600">—</div>
                          ) : (
                            <div className="rounded px-2 py-1 border border-black/30 inline-flex items-center gap-2" style={style}>
                              <span className="font-mono">{raw}</span>
                              <span className="opacity-90">{getTone(raw)}</span>
                            </div>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="text-xs text-stone-500 mt-3">关系状态：同盟/亲密/友好/缓和/中立/冷淡/猜忌/紧张/敌对/战争/死敌。初始均为 0，随攻城、外交等事件变化。</div>
        </div>

        <div className="bg-stone-900 border border-stone-700 rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="text-stone-200 font-semibold">势力对物种态度</div>
            <div className="text-xs text-stone-500">{raceIds.length} 个物种</div>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-[680px] w-full border-collapse text-xs">
              <thead>
                <tr>
                  <th className="p-2 text-left text-stone-400 font-semibold">态度</th>
                  {raceIds.map(raceId => (
                    <th key={raceId} className="p-2 text-left text-stone-400 font-semibold">{RACE_LABELS[raceId]}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {factionRows.map(faction => (
                  <tr key={`fr_${faction.id}`} className="border-t border-stone-800">
                    <td className="p-2 text-stone-300 font-semibold whitespace-nowrap">{faction.name}</td>
                    {raceIds.map(raceId => {
                      const raw = clampRelation(Number((worldDiplomacy.factionRaceRelations as any)?.[faction.id]?.[raceId] ?? 0));
                      const style = getCellStyle(raw);
                      return (
                        <td key={`${faction.id}_${raceId}`} className="p-2 align-middle">
                          <div className="rounded px-2 py-1 border border-black/30 inline-flex items-center gap-2" style={style}>
                            <span className="font-mono">{raw}</span>
                            <span className="opacity-90">{getTone(raw)}</span>
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                ))}
                <tr className="border-t border-stone-800">
                  <td className="p-2 text-stone-300 font-semibold whitespace-nowrap">玩家</td>
                  {raceIds.map(raceId => {
                    const raw = clampRelation(Number((player.relationMatrix?.races as any)?.[raceId] ?? 0));
                    const style = getCellStyle(raw);
                    return (
                      <td key={`player_race_${raceId}`} className="p-2 align-middle">
                        <div className="rounded px-2 py-1 border border-black/30 inline-flex items-center gap-2" style={style}>
                          <span className="font-mono">{raw}</span>
                          <span className="opacity-90">{getTone(raw)}</span>
                        </div>
                      </td>
                    );
                  })}
                </tr>
              </tbody>
            </table>
          </div>
          <div className="text-xs text-stone-500 mt-3">物种态度用于驱动“收复失地/反攻”倾向与长期敌视。</div>
        </div>
      </div>

      <div className="bg-stone-900 border border-stone-700 rounded-lg p-4 mt-6">
        <div className="flex items-center justify-between mb-3">
          <div className="text-stone-200 font-semibold">物种外交关系</div>
          <div className="text-xs text-stone-500">{raceMatrixRows.length} 个物种</div>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-[780px] w-full border-collapse text-xs">
            <thead>
              <tr>
                <th className="p-2 text-left text-stone-400 font-semibold">关系</th>
                {raceMatrixRows.map(raceId => (
                  <th key={`rh_${raceId}`} className="p-2 text-left text-stone-400 font-semibold">
                    {raceId === 'PLAYER' ? '玩家' : RACE_LABELS[raceId]}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {raceMatrixRows.map(rowId => (
                <tr key={`rr_${rowId}`} className="border-t border-stone-800">
                  <td className="p-2 text-stone-300 font-semibold whitespace-nowrap">{rowId === 'PLAYER' ? '玩家' : RACE_LABELS[rowId]}</td>
                  {raceMatrixRows.map(colId => {
                    const same = rowId === colId;
                    const raw = (() => {
                      if (same) return 0;
                      if (rowId === 'PLAYER') return clampRelation(Number((player.relationMatrix?.races as any)?.[colId] ?? 0));
                      if (colId === 'PLAYER') return clampRelation(Number((player.relationMatrix?.races as any)?.[rowId] ?? 0));
                      return clampRelation(Number((worldDiplomacy.raceRelations as any)?.[rowId]?.[colId] ?? 0));
                    })();
                    const style = getCellStyle(raw);
                    return (
                      <td key={`${rowId}_${colId}`} className="p-2 align-middle">
                        {same ? (
                          <div className="text-stone-600">—</div>
                        ) : (
                          <div className="rounded px-2 py-1 border border-black/30 inline-flex items-center gap-2" style={style}>
                            <span className="font-mono">{raw}</span>
                            <span className="opacity-90">{getTone(raw)}</span>
                          </div>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="text-xs text-stone-500 mt-3">基础值来自世界设定，可被“占领/屠杀/共同作战”等事件缓慢改写。</div>
      </div>

      <div className="bg-stone-900 border border-stone-700 rounded-lg p-4 mt-6">
        <div className="flex items-center justify-between mb-3">
          <div className="text-stone-200 font-semibold">近期外交事件</div>
          <div className="text-xs text-stone-500">{diplomacyEvents.length} 条</div>
        </div>
        {diplomacyEvents.length === 0 ? (
          <div className="text-sm text-stone-500">暂无外交记录。</div>
        ) : (
          <div className="space-y-2">
            {diplomacyEvents.map(event => (
              <div key={event.id} className="flex items-center justify-between text-sm">
                <span className="text-stone-400">第 {event.day} 天</span>
                <span className="text-stone-200 flex-1 px-3">{event.text}</span>
                <span className={event.delta >= 0 ? 'text-emerald-300' : 'text-red-300'}>
                  {event.delta >= 0 ? `+${event.delta}` : event.delta}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="bg-stone-900 border border-stone-700 rounded-lg p-4 mt-6">
        <div className="text-stone-200 font-semibold mb-3">领主关系</div>
        {lordItems.length > 0 ? (
          <div className="max-h-72 overflow-y-auto pr-2 space-y-3">
            {lordItems.map(item => (
              <div key={item.id} className="border-b border-stone-800 pb-3">
                <div className="flex items-center justify-between">
                  <span className="text-stone-200">{item.title} {item.name}</span>
                  <span className="text-xs text-stone-500">{item.fief}</span>
                </div>
                <div className="flex items-center gap-3 mt-2">
                  <input
                    type="range"
                    min={-100}
                    max={100}
                    value={item.value}
                    readOnly
                    className="w-full accent-amber-500"
                  />
                  <span className="text-sm text-stone-300 w-10 text-right">{item.value}</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-sm text-stone-500">暂无领主关系。</div>
        )}
      </div>

      <div className="bg-stone-900 border border-stone-700 rounded-lg p-4 mt-6">
        <div className="text-stone-200 font-semibold mb-3">个人关系事件</div>
        {personalEvents.length > 0 ? (
          <div className="space-y-2">
            {personalEvents.map(event => (
              <div key={event.id} className="flex items-center justify-between text-sm">
                <span className="text-stone-400">第 {event.day} 天</span>
                <span className="text-stone-200 flex-1 px-3">{event.text}</span>
                <span className={event.delta >= 0 ? 'text-emerald-300' : 'text-red-300'}>
                  {event.delta >= 0 ? `+${event.delta}` : event.delta}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-sm text-stone-500">暂无个人关系变动记录。</div>
        )}
      </div>
    </div>
  );
};
