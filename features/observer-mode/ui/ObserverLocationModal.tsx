/**
 * 观海模式 - 点击据点弹出的信息窗口
 * 显示驻军、领主、防御设施、驻留部队，支持与领主对话
 */
import React from 'react';
import { X, MessageCircle, Send } from 'lucide-react';
import { Location } from '../../../types';
import { getLocationDefenseDetails } from '../../../game/systems';
import { getGarrisonCount } from '../../../game/systems';

export type LordDialogueLine = { role: 'player' | 'lord'; text: string };

type ObserverLocationModalProps = {
  location: Location;
  onClose: () => void;
  getTroopName: (id: string) => string;
  getLocationName?: (id: string) => string;
  lordDialogue?: LordDialogueLine[];
  onLordDialogue?: (lines: LordDialogueLine[]) => void;
  onChatWithLord?: (locationId: string, lord: NonNullable<Location['lord']>, dialogue: LordDialogueLine[]) => Promise<string>;
};

export const ObserverLocationModal = ({ location, onClose, getTroopName, getLocationName, lordDialogue = [], onLordDialogue, onChatWithLord }: ObserverLocationModalProps) => {
  const [chatInput, setChatInput] = React.useState('');
  const [chatLoading, setChatLoading] = React.useState(false);
  const chatEndRef = React.useRef<HTMLDivElement>(null);
  React.useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [lordDialogue]);
  const defense = getLocationDefenseDetails(location);
  const garrisonCount = getGarrisonCount(location.garrison ?? []);
  const garrison = (location.garrison ?? []).filter(t => t.count > 0);
  const stayParties = (location.stayParties ?? []).filter(p => p.troops.some(t => t.count > 0));
  const camp = location.type === 'FIELD_CAMP' ? location.camp : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={onClose}>
      <div
        className="bg-stone-900 border border-stone-700 rounded-lg shadow-2xl w-full max-w-md max-h-[85vh] overflow-hidden flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 border-b border-stone-700">
          <h3 className="text-lg font-serif text-amber-400">{location.name}</h3>
          <button onClick={onClose} className="p-1 text-stone-400 hover:text-white">
            <X size={20} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {camp && (
            <section>
              <h4 className="text-sm font-semibold text-amber-400 mb-2">行军营地</h4>
              <div className="text-xs text-stone-400 space-y-1">
                <div>进攻方：{camp.attackerName}</div>
                <div>目标：{getLocationName ? getLocationName(camp.targetLocationId) : camp.targetLocationId}</div>
                <div>剩余行军：{camp.daysLeft ?? camp.totalDays ?? '?'} 天</div>
              </div>
            </section>
          )}
          {location.lord && (
            <section>
              <h4 className="text-sm font-semibold text-stone-300 mb-2">领主</h4>
              <div className="text-xs text-stone-400 space-y-1">
                <div>{location.lord.title}{location.lord.name}</div>
                <div>关系：{location.lord.relation ?? 0}</div>
                {location.lord.focus && <div>倾向：{location.lord.focus === 'WAR' ? '扩张' : location.lord.focus === 'TRADE' ? '贸易' : location.lord.focus === 'DEFENSE' ? '防御' : '外交'}</div>}
              </div>
              {onChatWithLord && onLordDialogue && (
                <div className="mt-3 border-t border-stone-700 pt-3">
                  <div className="text-xs text-stone-500 mb-2 flex items-center gap-1">
                    <MessageCircle size={14} /> 与领主对话（可影响势力决策）
                  </div>
                  <div className="max-h-32 overflow-y-auto bg-stone-950 rounded p-2 mb-2 text-xs space-y-1">
                    {lordDialogue.length === 0 ? (
                      <div className="text-stone-500">点击下方输入并发送与领主对话</div>
                    ) : (
                      lordDialogue.map((line, i) => (
                        <div key={i} className={line.role === 'player' ? 'text-amber-300' : 'text-emerald-300'}>
                          {line.role === 'player' ? '你' : '领主'}：{line.text}
                        </div>
                      ))
                    )}
                    <div ref={chatEndRef} />
                  </div>
                  <form
                    onSubmit={async (e) => {
                      e.preventDefault();
                      const text = chatInput.trim();
                      if (!text || chatLoading) return;
                      setChatInput('');
                      const nextLines: LordDialogueLine[] = [...lordDialogue, { role: 'player', text }];
                      onLordDialogue(nextLines);
                      setChatLoading(true);
                      try {
                        const reply = await onChatWithLord(location.id, location.lord!, nextLines);
                        onLordDialogue([...nextLines, { role: 'lord', text: reply }]);
                      } catch (err) {
                        onLordDialogue([...nextLines, { role: 'lord', text: '（领主未回应）' }]);
                      } finally {
                        setChatLoading(false);
                      }
                    }}
                    className="flex gap-2"
                  >
                    <input
                      type="text"
                      value={chatInput}
                      onChange={e => setChatInput(e.target.value)}
                      placeholder="输入对话..."
                      className="flex-1 bg-stone-800 border border-stone-600 rounded px-2 py-1 text-sm text-stone-200 placeholder-stone-500"
                      disabled={chatLoading}
                    />
                    <button
                      type="submit"
                      disabled={chatLoading || !chatInput.trim()}
                      className="p-1.5 rounded bg-amber-600 text-white hover:bg-amber-500 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Send size={14} />
                    </button>
                  </form>
                </div>
              )}
            </section>
          )}
          <section>
            <h4 className="text-sm font-semibold text-stone-300 mb-2">驻军 ({garrisonCount})</h4>
            {garrison.length === 0 ? (
              <div className="text-xs text-stone-500">无</div>
            ) : (
              <ul className="text-xs text-stone-400 space-y-1">
                {garrison.map((t, i) => (
                  <li key={i}>{getTroopName(t.id)} x{t.count}</li>
                ))}
              </ul>
            )}
          </section>
          {defense && (location.type === 'CITY' || location.type === 'CASTLE' || location.type === 'VILLAGE') && (
            <section>
              <h4 className="text-sm font-semibold text-stone-300 mb-2">防御设施</h4>
              <div className="text-xs text-stone-400 space-y-1">
                <div>{defense.wallName} Lv.{defense.wallLevel}</div>
                <div>城墙 HP: {defense.wallHp} | 机关 HP: {defense.mechanismHp}</div>
                {defense.mechanisms?.length > 0 && (
                  <div className="mt-1">
                    {defense.mechanisms.map((m, i) => (
                      <div key={i}>• {m.name}: {m.description}</div>
                    ))}
                  </div>
                )}
              </div>
            </section>
          )}
          {stayParties.length > 0 && (
            <section>
              <h4 className="text-sm font-semibold text-stone-300 mb-2">驻留部队</h4>
              <ul className="text-xs text-stone-400 space-y-2">
                {stayParties.map((p, i) => (
                  <li key={i}>
                    <div className="font-medium text-stone-300">{p.leaderName ?? '部队'}</div>
                    <div className="pl-2">
                      {p.troops.filter(t => t.count > 0).map((t, j) => (
                        <div key={j}>{getTroopName(t.id)} x{t.count}</div>
                      ))}
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      </div>
    </div>
  );
};
