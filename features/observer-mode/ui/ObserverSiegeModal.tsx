/**
 * 观海模式 - 围攻结算弹窗
 * 显示进攻方 vs 防守方，调用 AI 结算
 */
import React from 'react';
import { Swords, Loader2 } from 'lucide-react';
import type { Location } from '../../../types';
import type { Troop } from '../../../types';

type ObserverSiegeModalProps = {
  location: Location;
  attackerName: string;
  attackerTroops: Troop[];
  defenderName: string;
  defenderTroops: Troop[];
  onResolve: (outcome: 'attacker' | 'defender') => void;
  getTroopName: (id: string) => string;
};

export const ObserverSiegeModal = ({
  location,
  attackerName,
  attackerTroops,
  defenderName,
  defenderTroops,
  onResolve,
  getTroopName
}: ObserverSiegeModalProps) => {
  const [loading, setLoading] = React.useState(true);
  const [outcome, setOutcome] = React.useState<'attacker' | 'defender' | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { resolveSiegeOutcome } = await import('../../../services/geminiService');
        const { buildAIConfigFromSettings } = await import('../../../app/providers/ai-settings');
        const config = buildAIConfigFromSettings();
        const aiConfig = config ? { baseUrl: config.baseUrl, apiKey: config.apiKey, model: config.model, provider: config.provider } : undefined;
        const result = await resolveSiegeOutcome(
          attackerName,
          attackerTroops,
          defenderName,
          defenderTroops,
          location.name,
          aiConfig
        );
        if (!cancelled) {
          setOutcome(result);
          setLoading(false);
        }
      } catch (e) {
        console.warn('[观海] 围攻结算失败:', e);
        if (!cancelled) {
          setOutcome(Math.random() < 0.5 ? 'attacker' : 'defender');
          setLoading(false);
        }
      }
    })();
    return () => { cancelled = true; };
  }, []);

  React.useEffect(() => {
    if (!loading && outcome) {
      const t = setTimeout(() => onResolve(outcome), 1500);
      return () => clearTimeout(t);
    }
  }, [loading, outcome, onResolve]);

  const attCount = attackerTroops.reduce((s, t) => s + (t.count ?? 0), 0);
  const defCount = defenderTroops.reduce((s, t) => s + (t.count ?? 0), 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
      <div className="bg-stone-900 border-2 border-amber-600 rounded-xl shadow-2xl w-full max-w-md overflow-hidden">
        <div className="p-4 border-b border-stone-700 text-center">
          <h3 className="text-lg font-serif text-amber-400 flex items-center justify-center gap-2">
            <Swords size={22} />
            围攻结算 · {location.name}
          </h3>
        </div>
        <div className="p-4 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-red-950/40 border border-red-800/60 rounded-lg p-3">
              <div className="text-sm font-semibold text-red-300 mb-1">进攻方</div>
              <div className="text-amber-400 font-medium">{attackerName}</div>
              <div className="text-xs text-stone-400 mt-1">{attCount} 人</div>
              <div className="text-xs text-stone-500 mt-1 space-y-0.5">
                {attackerTroops.slice(0, 5).map((t, i) => (
                  <div key={i}>{getTroopName(t.id)} x{t.count}</div>
                ))}
              </div>
            </div>
            <div className="bg-emerald-950/40 border border-emerald-800/60 rounded-lg p-3">
              <div className="text-sm font-semibold text-emerald-300 mb-1">防守方</div>
              <div className="text-amber-400 font-medium">{defenderName}</div>
              <div className="text-xs text-stone-400 mt-1">{defCount} 人</div>
              <div className="text-xs text-stone-500 mt-1 space-y-0.5">
                {defenderTroops.slice(0, 5).map((t, i) => (
                  <div key={i}>{getTroopName(t.id)} x{t.count}</div>
                ))}
              </div>
            </div>
          </div>
          {loading ? (
            <div className="flex items-center justify-center gap-2 text-amber-400 py-4">
              <Loader2 size={24} className="animate-spin" />
              <span>AI 结算中...</span>
            </div>
          ) : outcome ? (
            <div className={`text-center py-3 rounded-lg font-semibold ${outcome === 'attacker' ? 'bg-red-900/50 text-red-300' : 'bg-emerald-900/50 text-emerald-300'}`}>
              {outcome === 'attacker' ? `进攻方攻陷 ${location.name}！` : `防守方击退进攻，守住 ${location.name}！`}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
};
