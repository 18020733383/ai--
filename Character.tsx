import React, { useState } from 'react';
import { Hero, HeroChatLine, PartyDiaryEntry } from './types';
import { Button } from './components/Button';
import { MessageCircle, Plus, Heart, Zap, Copy } from 'lucide-react';

type CharacterProps = {
  hero: Hero;
  chatMemory: HeroChatLine[];
  worldbookContent: string;
  chatInput: string;
  isLoading: boolean;
  onInputChange: (value: string) => void;
  onSend: () => void;
  onCopyPrompt: () => Promise<boolean>;
  onUpdateMemory: (memoryId: string, nextText: string) => void;
  onDeleteMemory: (memoryId: string) => void;
  partyDiary: PartyDiaryEntry[];
  onAddDiaryEntry: (text: string) => void;
  onUpdateDiaryEntry: (entryId: string, nextText: string) => void;
  onDeleteDiaryEntry: (entryId: string) => void;
  onSpendAttribute: (key: 'attack' | 'hp' | 'agility') => void;
  onClose: () => void;
  listRef: React.RefObject<HTMLDivElement>;
};

export default function Character({
  hero,
  chatMemory,
  worldbookContent,
  chatInput,
  isLoading,
  onInputChange,
  onSend,
  onCopyPrompt,
  onUpdateMemory,
  onDeleteMemory,
  partyDiary,
  onAddDiaryEntry,
  onUpdateDiaryEntry,
  onDeleteDiaryEntry,
  onSpendAttribute,
  onClose,
  listRef
}: CharacterProps) {
  const expression = hero.currentExpression || 'IDLE';
  const face = `url("/image/characters/${hero.id}/${expression}.png"), url("/image/characters/${hero.id}/${expression}.jpg"), url("/image/characters/${hero.id}/${expression}.jpeg")`;
  const [isMemoryOpen, setIsMemoryOpen] = useState(false);
  const [isDiaryOpen, setIsDiaryOpen] = useState(false);
  const [isWorldBookOpen, setIsWorldBookOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState('');
  const [diaryEditingId, setDiaryEditingId] = useState<string | null>(null);
  const [diaryEditingText, setDiaryEditingText] = useState('');
  const [diaryInput, setDiaryInput] = useState('');
  const [copyNotice, setCopyNotice] = useState<string | null>(null);
  const memoryItems = [...(hero.permanentMemory ?? [])].sort((a, b) => b.roundIndex - a.roundIndex);
  const diaryItems = [...(partyDiary ?? [])].sort((a, b) => b.roundIndex - a.roundIndex);
  const hpPercent = hero.maxHp > 0 ? Math.round((hero.currentHp / hero.maxHp) * 100) : 0;
  const actionRegex = /(\([^)]*\)|（[^）]*）)/g;
  const isActionPart = (part: string) => {
    const trimmed = String(part ?? '').trim();
    if (!trimmed) return false;
    if (trimmed.startsWith('(') && trimmed.endsWith(')')) return true;
    if (trimmed.startsWith('（') && trimmed.endsWith('）')) return true;
    return false;
  };
  const renderWithActions = (text: string, role: 'PLAYER' | 'HERO') => {
    const raw = String(text ?? '');
    const parts = raw.split(actionRegex).filter(p => p.length > 0);
    if (parts.length <= 1) return raw;
    const actionClass = role === 'PLAYER'
      ? 'text-amber-200/70 italic'
      : 'text-stone-400 italic';
    return parts.map((part, i) => {
      const isAction = isActionPart(part);
      return isAction
        ? <span key={i} className={actionClass}>{part}</span>
        : <span key={i}>{part}</span>;
    });
  };

  return (
    <div className="min-h-screen w-full bg-stone-950">
      <div className="max-w-6xl mx-auto px-4 py-6 md:py-10 space-y-6">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div
              className="w-14 h-14 rounded border border-stone-700 bg-stone-900/50 bg-cover bg-center"
              style={{ backgroundImage: face }}
            />
            <div>
              <div className="text-2xl font-serif text-amber-300">{hero.name}</div>
              <div className="text-sm text-stone-300">{hero.title} · {hero.portrait}</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button onClick={() => setIsDiaryOpen(true)} variant="secondary">队伍日记</Button>
            <Button onClick={() => setIsWorldBookOpen(true)} variant="secondary">世界书</Button>
            <Button onClick={() => setIsMemoryOpen(true)} variant="secondary">持久记忆</Button>
            <Button onClick={onClose} variant="secondary">返回队伍</Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-[2fr_1fr] gap-4">
          <div className="bg-stone-950/60 border border-stone-800 rounded p-4 space-y-3">
            <div className="text-xs text-stone-400">性格：{hero.personality}</div>
            <div className="text-xs text-stone-400">好感度：{String((hero as any)?.affinity ?? '陌生')}</div>
            <div
              ref={listRef}
              className="bg-gradient-to-b from-stone-950/40 to-stone-900/40 p-4 rounded border border-stone-800 max-h-[60vh] overflow-y-auto scrollbar-hide space-y-2"
            >
              {chatMemory.length === 0 ? (
                <div className="text-stone-500 text-sm text-center py-10">还没有开始聊天。</div>
              ) : (
                chatMemory.map((line, index) => (
                  <div key={index} className={`flex ${line.role === 'PLAYER' ? 'justify-end' : 'justify-start'} log-slide-in`}>
                    <div
                      className={[
                        'max-w-[85%] md:max-w-[70%] px-3 py-2 rounded-2xl border shadow',
                        line.role === 'PLAYER'
                          ? 'bg-amber-900/50 border-amber-800 text-amber-100'
                          : 'bg-stone-800/70 border-stone-700 text-stone-200'
                      ].join(' ')}
                    >
                      {renderWithActions(line.text, line.role)}
                    </div>
                  </div>
                ))
              )}
            </div>
            <div className="flex gap-2">
              <input
                value={chatInput}
                onChange={(e) => onInputChange(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key !== 'Enter') return;
                  const composing = (e.nativeEvent as any)?.isComposing;
                  if (composing) return;
                  e.preventDefault();
                  onSend();
                }}
                className="flex-1 bg-stone-950 border border-stone-700 text-stone-200 px-3 py-2 rounded placeholder:text-stone-600"
                placeholder="对英雄说点什么..."
                disabled={isLoading || hero.status === 'DEAD'}
              />
              <Button
                onClick={async () => {
                  const ok = await onCopyPrompt();
                  setCopyNotice(ok ? '已复制' : '复制失败');
                  window.setTimeout(() => setCopyNotice(null), 1400);
                }}
                variant="secondary"
                disabled={isLoading || hero.status === 'DEAD' || !chatInput.trim()}
              >
                <Copy size={14} className="inline mr-2" />
                复制Prompt
              </Button>
              <Button
                onClick={onSend}
                variant="secondary"
                disabled={isLoading || hero.status === 'DEAD' || !chatInput.trim()}
              >
                {isLoading ? '…' : '发送'}
              </Button>
            </div>
            {copyNotice ? (
              <div className="text-xs text-stone-500">{copyNotice}</div>
            ) : null}
          </div>
          <div className="bg-stone-950/60 border border-stone-800 rounded p-4 space-y-4">
            <div className="text-sm text-stone-200 font-bold flex items-center gap-2"><MessageCircle size={16}/> 成长与属性</div>
            <div className="grid grid-cols-2 gap-3 text-xs text-stone-400">
              <div>
                <div className="text-stone-500">等级</div>
                <div className="text-stone-200 text-sm">Lv.{hero.level}</div>
              </div>
              <div>
                <div className="text-stone-500">经验</div>
                <div className="text-stone-200 text-sm">{hero.xp} / {hero.maxXp}</div>
              </div>
              <div>
                <div className="text-stone-500">血量</div>
                <div className="text-stone-200 text-sm">{hero.currentHp} / {hero.maxHp}（{hpPercent}%）</div>
              </div>
              <div>
                <div className="text-stone-500">状态</div>
                <div className={hero.status === 'DEAD' ? 'text-stone-500 text-sm' : hero.status === 'INJURED' ? 'text-red-300 text-sm' : 'text-emerald-300 text-sm'}>
                  {hero.status === 'DEAD' ? '已死亡' : hero.status === 'INJURED' ? '重伤恢复中' : '状态良好'}
                </div>
              </div>
            </div>
            <div className="flex items-center justify-between text-xs text-stone-400">
              <span>可用点数 {hero.attributePoints}</span>
              <div className="flex items-center gap-2">
                <button
                  disabled={hero.attributePoints <= 0 || hero.status === 'DEAD'}
                  onClick={() => onSpendAttribute('attack')}
                  className="w-7 h-7 rounded bg-stone-700 hover:bg-green-700 flex items-center justify-center disabled:opacity-20 disabled:cursor-not-allowed text-white"
                >
                  <Plus size={12} />
                </button>
                <button
                  disabled={hero.attributePoints <= 0 || hero.status === 'DEAD'}
                  onClick={() => onSpendAttribute('hp')}
                  className="w-7 h-7 rounded bg-stone-700 hover:bg-green-700 flex items-center justify-center disabled:opacity-20 disabled:cursor-not-allowed text-white"
                >
                  <Heart size={12} />
                </button>
                <button
                  disabled={hero.attributePoints <= 0 || hero.status === 'DEAD'}
                  onClick={() => onSpendAttribute('agility')}
                  className="w-7 h-7 rounded bg-stone-700 hover:bg-green-700 flex items-center justify-center disabled:opacity-20 disabled:cursor-not-allowed text-white"
                >
                  <Zap size={12} />
                </button>
              </div>
            </div>
            <div className="flex items-center justify-between text-xs text-stone-400">
              <span>攻击 {hero.attributes.attack}</span>
              <span>血量 {hero.attributes.hp}</span>
              <span>敏捷 {hero.attributes.agility}</span>
            </div>
            <div className="text-xs text-stone-400 leading-relaxed">{hero.background}</div>
            <div className="flex flex-wrap gap-2 text-[11px] text-stone-400">
              {hero.traits.map((trait, idx) => (
                <span key={`${hero.id}-trait-${idx}`} className="px-2 py-0.5 rounded border border-stone-700 bg-stone-900/40">
                  {trait}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
      {isMemoryOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setIsMemoryOpen(false);
          }}
        >
          <div className="w-full max-w-2xl bg-stone-900 border border-stone-700 rounded shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-stone-800">
              <div className="text-stone-200 font-bold">持久记忆</div>
              <button
                onClick={() => setIsMemoryOpen(false)}
                className="text-stone-400 hover:text-white"
              >
                关闭
              </button>
            </div>
            <div className="p-4 max-h-[70vh] overflow-y-auto scrollbar-hide space-y-3">
              {memoryItems.length === 0 ? (
                <div className="text-stone-500 text-sm text-center py-10">暂无持久记忆。</div>
              ) : (
                memoryItems.map((item) => {
                  const isEditing = editingId === item.id;
                  return (
                    <div key={item.id} className="bg-stone-950/40 border border-stone-800 rounded p-3 space-y-2">
                      <div className="text-xs text-stone-500">
                        现实时间 {item.createdAt} · 游戏第 {item.createdDay} 天 · 轮次 {item.roundIndex}
                      </div>
                      {isEditing ? (
                        <div className="space-y-2">
                          <textarea
                            value={editingText}
                            onChange={(e) => setEditingText(e.target.value)}
                            className="w-full min-h-[80px] bg-stone-950 border border-stone-700 text-stone-200 px-3 py-2 rounded text-sm"
                          />
                          <div className="flex items-center gap-2 justify-end">
                            <button
                              onClick={() => {
                                setEditingId(null);
                                setEditingText('');
                              }}
                              className="text-xs text-stone-400 hover:text-stone-200"
                            >
                              取消
                            </button>
                            <button
                              onClick={() => {
                                const nextText = editingText.trim();
                                if (!nextText) return;
                                onUpdateMemory(item.id, nextText);
                                setEditingId(null);
                                setEditingText('');
                              }}
                              className="text-xs text-amber-300 hover:text-amber-200"
                            >
                              保存
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-start justify-between gap-3">
                          <div className="text-sm text-stone-300 leading-relaxed flex-1">{item.text}</div>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => {
                                setEditingId(item.id);
                                setEditingText(item.text);
                              }}
                              className="text-xs text-stone-400 hover:text-stone-200"
                            >
                              编辑
                            </button>
                            <button
                              onClick={() => onDeleteMemory(item.id)}
                              className="text-xs text-red-300 hover:text-red-200"
                            >
                              删除
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}
      {isDiaryOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setIsDiaryOpen(false);
          }}
        >
          <div className="w-full max-w-2xl bg-stone-900 border border-stone-700 rounded shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-stone-800">
              <div className="text-stone-200 font-bold">队伍日记</div>
              <button
                onClick={() => setIsDiaryOpen(false)}
                className="text-stone-400 hover:text-white"
              >
                关闭
              </button>
            </div>
            <div className="p-4 max-h-[70vh] overflow-y-auto scrollbar-hide space-y-3">
              <div className="space-y-2">
                <textarea
                  value={diaryInput}
                  onChange={(e) => setDiaryInput(e.target.value)}
                  className="w-full min-h-[80px] bg-stone-950 border border-stone-700 text-stone-200 px-3 py-2 rounded text-sm"
                  placeholder="写入队伍日记..."
                />
                <div className="flex items-center justify-end gap-2">
                  <button
                    onClick={() => setDiaryInput('')}
                    className="text-xs text-stone-400 hover:text-stone-200"
                  >
                    清空
                  </button>
                  <button
                    onClick={() => {
                      const nextText = diaryInput.trim();
                      if (!nextText) return;
                      onAddDiaryEntry(nextText);
                      setDiaryInput('');
                    }}
                    className="text-xs text-amber-300 hover:text-amber-200"
                  >
                    记录
                  </button>
                </div>
              </div>
              {diaryItems.length === 0 ? (
                <div className="text-stone-500 text-sm text-center py-10">暂无队伍日记。</div>
              ) : (
                diaryItems.map((item) => {
                  const isEditing = diaryEditingId === item.id;
                  return (
                    <div key={item.id} className="bg-stone-950/40 border border-stone-800 rounded p-3 space-y-2">
                      <div className="text-xs text-stone-500">
                        记录人 {item.authorName} · 现实时间 {item.createdAt} · 游戏第 {item.createdDay} 天 · 轮次 {item.roundIndex}
                      </div>
                      {isEditing ? (
                        <div className="space-y-2">
                          <textarea
                            value={diaryEditingText}
                            onChange={(e) => setDiaryEditingText(e.target.value)}
                            className="w-full min-h-[80px] bg-stone-950 border border-stone-700 text-stone-200 px-3 py-2 rounded text-sm"
                          />
                          <div className="flex items-center gap-2 justify-end">
                            <button
                              onClick={() => {
                                setDiaryEditingId(null);
                                setDiaryEditingText('');
                              }}
                              className="text-xs text-stone-400 hover:text-stone-200"
                            >
                              取消
                            </button>
                            <button
                              onClick={() => {
                                const nextText = diaryEditingText.trim();
                                if (!nextText) return;
                                onUpdateDiaryEntry(item.id, nextText);
                                setDiaryEditingId(null);
                                setDiaryEditingText('');
                              }}
                              className="text-xs text-amber-300 hover:text-amber-200"
                            >
                              保存
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-start justify-between gap-3">
                          <div className="text-sm text-stone-300 leading-relaxed flex-1">{item.text}</div>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => {
                                setDiaryEditingId(item.id);
                                setDiaryEditingText(item.text);
                              }}
                              className="text-xs text-stone-400 hover:text-stone-200"
                            >
                              编辑
                            </button>
                            <button
                              onClick={() => onDeleteDiaryEntry(item.id)}
                              className="text-xs text-red-300 hover:text-red-200"
                            >
                              删除
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}
      {isWorldBookOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setIsWorldBookOpen(false);
          }}
        >
          <div className="w-full max-w-xl bg-stone-900 border border-stone-700 rounded shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-stone-800">
              <div className="text-stone-200 font-bold">世界书</div>
              <button
                onClick={() => setIsWorldBookOpen(false)}
                className="text-stone-400 hover:text-white"
              >
                关闭
              </button>
            </div>
            <div className="p-4 space-y-3">
              <div className="text-xs text-stone-500">简短设定，用于理解世界与关键名词。</div>
              <div className="text-sm text-stone-300 whitespace-pre-line leading-relaxed">{worldbookContent}</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
