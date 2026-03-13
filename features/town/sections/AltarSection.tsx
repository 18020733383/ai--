import React from 'react';
import { Button } from '../../../components/Button';
import { ThinkingBubble } from '../../../components/ThinkingBubble';
import { chatWithAltar } from '../../../services/geminiService';
import { AIProvider, AltarDoctrine, AltarTroopDraft, PlayerState } from '../../../types';
import { AltarRadar, formatAltarAttributes } from './AltarShared';

type AltarDialogueLine = { role: 'PLAYER' | 'NPC'; text: string };
type AltarProposalResult = {
  npcReply: string;
  doctrineSummary: string;
  troops: AltarTroopDraft[];
};
type AltarProposal = {
  doctrine: AltarDoctrine;
  result: AltarProposalResult;
  prevResult?: AltarProposalResult;
};
type AIConfig = {
  baseUrl: string;
  apiKey: string;
  model: string;
  provider: AIProvider;
};

type AltarSectionProps = {
  currentLocationId: string;
  altarDialogue: AltarDialogueLine[];
  altarDraft: AltarDoctrine;
  altarProposal?: AltarProposal;
  altarHasTree: boolean;
  altarChatListRef: React.RefObject<HTMLDivElement>;
  playerRef: React.MutableRefObject<PlayerState>;
  altarDialogues: Record<string, AltarDialogueLine[]>;
  setAltarDialogues: React.Dispatch<React.SetStateAction<Record<string, AltarDialogueLine[]>>>;
  setAltarDrafts: React.Dispatch<React.SetStateAction<Record<string, AltarDoctrine>>>;
  setAltarProposals: React.Dispatch<React.SetStateAction<Record<string, AltarProposal>>>;
  isAltarLoading: boolean;
  setIsAltarLoading: React.Dispatch<React.SetStateAction<boolean>>;
  buildAIConfig: () => AIConfig | undefined;
  applyAltarProposal: () => void;
};

const listSignature = (list?: string[]) => (list ?? []).map(item => String(item).trim()).filter(Boolean).join('|');

const isAttributesChanged = (current?: AltarTroopDraft['attributes'], prev?: AltarTroopDraft['attributes']) => {
  if (!prev && current) return true;
  if (!current && prev) return true;
  if (!current || !prev) return false;
  return current.attack !== prev.attack
    || current.defense !== prev.defense
    || current.agility !== prev.agility
    || current.hp !== prev.hp
    || current.range !== prev.range
    || current.morale !== prev.morale;
};

const getTroopDiff = (current: AltarTroopDraft, prev?: AltarTroopDraft) => ({
  name: !prev || current.name !== prev.name,
  basePower: !prev || current.basePower !== prev.basePower,
  maxXp: !prev || current.maxXp !== prev.maxXp,
  upgradeCost: !prev || current.upgradeCost !== prev.upgradeCost,
  description: !prev || current.description !== prev.description,
  equipment: !prev || listSignature(current.equipment) !== listSignature(prev.equipment),
  attributes: isAttributesChanged(current.attributes, prev?.attributes)
});

export const AltarSection = ({
  currentLocationId,
  altarDialogue,
  altarDraft,
  altarProposal,
  altarHasTree,
  altarChatListRef,
  playerRef,
  altarDialogues,
  setAltarDialogues,
  setAltarDrafts,
  setAltarProposals,
  isAltarLoading,
  setIsAltarLoading,
  buildAIConfig,
  applyAltarProposal
}: AltarSectionProps) => {
  const [altarChatInput, setAltarChatInput] = React.useState('');

  const handleAltarChatSend = async () => {
    const text = altarChatInput.trim();
    if (isAltarLoading || !text) return;

    const nextDialogue = [
      ...(altarDialogues[currentLocationId] ?? []),
      { role: 'PLAYER' as const, text }
    ];
    setAltarDialogues(prev => ({
      ...prev,
      [currentLocationId]: nextDialogue
    }));
    setAltarChatInput('');
    setIsAltarLoading(true);

    try {
      const aiConfig = buildAIConfig();
      const response = await chatWithAltar(
        nextDialogue,
        altarDraft,
        playerRef.current,
        altarProposal ? { doctrineSummary: altarProposal.result.doctrineSummary, troops: altarProposal.result.troops } : null,
        aiConfig
      );
      setAltarDrafts(prev => ({ ...prev, [currentLocationId]: response.draft }));
      setAltarProposals(prev => ({
        ...prev,
        [currentLocationId]: {
          doctrine: response.draft,
          result: {
            npcReply: response.npcReply,
            doctrineSummary: response.doctrineSummary,
            troops: response.troops
          },
          prevResult: prev[currentLocationId]?.result
        }
      }));
      setAltarDialogues(prev => ({
        ...prev,
        [currentLocationId]: [...(prev[currentLocationId] ?? nextDialogue), { role: 'NPC', text: response.npcReply }]
      }));
    } catch {
      setAltarDialogues(prev => ({
        ...prev,
        [currentLocationId]: [...(prev[currentLocationId] ?? nextDialogue), { role: 'NPC', text: '神秘人沉默了片刻。' }]
      }));
    } finally {
      setIsAltarLoading(false);
    }
  };

  const prevAltarTroops = altarProposal?.prevResult?.troops ?? [];
  const prevDoctrineSummary = altarProposal?.prevResult?.doctrineSummary ?? '';
  const doctrineSummaryChanged = !!prevDoctrineSummary && prevDoctrineSummary !== (altarProposal?.result?.doctrineSummary ?? '');

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="bg-stone-900/40 p-4 rounded border border-stone-800">
        <p className="text-stone-400 text-sm">
          祭坛深处的神秘人等待你的宗教名字与教义。对话会实时更新兵种草案，满意后再确立教义。
        </p>
      </div>

      <div className="bg-stone-950/60 border border-purple-900/40 rounded p-6 overflow-hidden relative">
        <div
          className="absolute inset-0 opacity-60"
          style={{ background: 'radial-gradient(circle at center, rgba(192, 132, 252, 0.18), rgba(15, 23, 42, 0.05) 55%, rgba(15, 23, 42, 0.2) 100%)' }}
        />
        <div className="relative flex flex-col items-center justify-center gap-4">
          <svg width={220} height={220} viewBox="0 0 220 220" className="text-purple-300">
            <circle cx="110" cy="110" r="92" fill="none" stroke="rgba(192, 132, 252, 0.4)" strokeWidth="2" />
            <circle cx="110" cy="110" r="68" fill="none" stroke="rgba(192, 132, 252, 0.25)" strokeWidth="2" />
            <polygon points="110,30 182,72 182,148 110,190 38,148 38,72" fill="none" stroke="rgba(226, 232, 240, 0.25)" strokeWidth="1.5" />
            <polygon points="110,48 164,80 164,140 110,172 56,140 56,80" fill="none" stroke="rgba(192, 132, 252, 0.2)" strokeWidth="1" />
            <circle cx="110" cy="110" r="8" fill="rgba(192, 132, 252, 0.65)" />
          </svg>
          <div className="flex flex-col items-center">
            <div className="w-44 h-8 rounded-full bg-stone-900/80 border border-purple-900/50 shadow-[0_0_25px_rgba(192,132,252,0.2)]" />
            <div className="w-24 h-10 -mt-3 rounded-b-full bg-stone-900/90 border border-purple-900/40" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="bg-stone-900/60 border border-stone-800 rounded p-4 space-y-4 lg:col-span-2">
          <div className="text-stone-200 font-bold">神秘人</div>
          <div
            ref={altarChatListRef}
            className="bg-gradient-to-b from-stone-950/40 to-stone-900/40 p-4 rounded border border-stone-800 max-h-80 overflow-y-auto scrollbar-hide space-y-2"
          >
            {altarDialogue.length === 0 && (
              <div className="text-stone-500 text-sm">黑纱之下没有回应。</div>
            )}
            {altarDialogue.map((line, index) => (
              <div key={index} className={`flex ${line.role === 'PLAYER' ? 'justify-end' : 'justify-start'} log-slide-in`}>
                <div
                  className={[
                    'max-w-[85%] md:max-w-[70%] px-3 py-2 rounded-2xl border shadow',
                    line.role === 'PLAYER'
                      ? 'bg-stone-800 border-stone-700 text-stone-200 rounded-br-sm'
                      : 'bg-purple-950/30 border-purple-900/40 text-purple-200 rounded-bl-sm'
                  ].join(' ')}
                >
                  <div className="text-[10px] tracking-wider uppercase opacity-70 mb-1">
                    {line.role === 'PLAYER' ? '你' : '神秘人'}
                  </div>
                  <div className="text-sm leading-relaxed whitespace-pre-wrap">{line.text}</div>
                </div>
              </div>
            ))}
            {isAltarLoading && <ThinkingBubble label="神秘人正在思考..." />}
          </div>

          <div className="bg-stone-950/40 border border-stone-800 rounded p-3 text-sm text-stone-400 space-y-1">
            <div>宗教名字：{altarDraft.religionName.trim() || '未命名'}</div>
            <div>权柄：{altarDraft.domain.trim() || '未说明'}</div>
            <div>散播方式：{altarDraft.spread.trim() || '未说明'}</div>
            <div>禁忌祝福：{altarDraft.blessing.trim() || '未说明'}</div>
          </div>

          <div className="flex flex-col md:flex-row gap-3">
            <input
              value={altarChatInput}
              onChange={(e) => setAltarChatInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleAltarChatSend();
              }}
              className="flex-1 bg-stone-950 border border-stone-700 text-stone-200 px-3 py-2 rounded placeholder:text-stone-600"
              placeholder="与神秘人对话，描述宗教名字、权柄、散播方式、禁忌祝福"
            />
            <Button
              onClick={handleAltarChatSend}
              variant="secondary"
              disabled={isAltarLoading || !altarChatInput.trim()}
            >
              发送
            </Button>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Button
              onClick={applyAltarProposal}
              variant={altarHasTree ? 'danger' : 'secondary'}
              disabled={isAltarLoading || !altarProposal}
            >
              {altarHasTree ? '重构教义（300）' : '确立教义'}
            </Button>
          </div>
        </div>

        <div className="bg-stone-900/60 border border-stone-800 rounded p-4 space-y-4">
          <div className="text-stone-200 font-bold">教义草案</div>
          {!altarProposal ? (
            <div className="text-stone-500 text-sm">尚无草案。</div>
          ) : (
            <div className="space-y-2 text-sm text-stone-400">
              <div className={`${doctrineSummaryChanged ? 'text-amber-300' : 'text-stone-300'} whitespace-pre-wrap`}>
                {altarProposal.result.doctrineSummary || '神秘人正在权衡。'}
              </div>
              <div className="text-[11px] text-stone-500">变动高亮</div>
              <div className="space-y-2">
                {(altarProposal.result.troops ?? []).map((troop, index) => {
                  const prevTroop = prevAltarTroops[index];
                  const diff = getTroopDiff(troop, prevTroop);
                  const nameClass = diff.name ? 'text-amber-300' : 'text-stone-200';
                  const powerClass = diff.basePower ? 'text-amber-300' : 'text-stone-500';
                  const xpClass = diff.maxXp ? 'text-amber-300' : 'text-stone-500';
                  const costClass = diff.upgradeCost ? 'text-amber-300' : 'text-stone-500';
                  const descClass = diff.description ? 'text-amber-300' : 'text-stone-500';
                  const equipClass = diff.equipment ? 'text-amber-300' : 'text-stone-500';
                  const attrClass = diff.attributes ? 'text-amber-300' : 'text-stone-500';
                  return (
                    <div key={`${troop.name ?? 'troop'}_${index}`} className="border border-stone-800 rounded p-3 bg-stone-950/40">
                      <div className="flex flex-wrap gap-3">
                        <div className="flex-1 space-y-1">
                          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
                            <span className="text-stone-500">Tier {troop.tier ?? index + 1}</span>
                            <span className={nameClass}>{troop.name ?? '无名信徒'}</span>
                            <span className={powerClass}>战力 {troop.basePower ?? 0}</span>
                            <span className={xpClass}>经验 {troop.maxXp ?? 0}</span>
                            <span className={costClass}>升级 {troop.upgradeCost ?? 0}</span>
                          </div>
                          <div className={`text-[11px] ${attrClass}`}>{formatAltarAttributes(troop.attributes)}</div>
                          <div className={`text-[11px] ${equipClass}`}>装备：{(troop.equipment ?? []).join('、') || '无'}</div>
                          <div className={`text-[11px] ${descClass}`}>{troop.description || '沉默的信徒。'}</div>
                        </div>
                        <div className="shrink-0 bg-stone-950/40 border border-stone-800 rounded p-2">
                          <AltarRadar attrs={troop.attributes} />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
