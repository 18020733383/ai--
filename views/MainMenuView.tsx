import React from 'react';
import { Film, Play, Plus, Save, Skull, Trash2 } from 'lucide-react';
import { Button } from '../components/Button';

type SaveSlotMeta = {
  id: string;
  name: string;
  createdAt: number;
  updatedAt: number;
  isAuto?: boolean;
  day?: number;
  level?: number;
  renown?: number;
  endingId?: string;
};

type EndingMeta = {
  id: string;
  title: string;
  subtitle: string;
};

type MainMenuViewProps = {
  saves: SaveSlotMeta[];
  selectedSaveId: string | null;
  onSelectSave: (id: string) => void;
  onDeleteSave: (id: string) => void;
  onNewGame: () => void;
  onContinue: (preferredId?: string) => void;
  onCreateSaveFromAuto: () => void;
  endings: EndingMeta[];
  onReplayEnding: (endingId: string) => void;
};

export const MainMenuView = ({
  saves,
  selectedSaveId,
  onSelectSave,
  onDeleteSave,
  onNewGame,
  onContinue,
  onCreateSaveFromAuto,
  endings,
  onReplayEnding
}: MainMenuViewProps) => {
  const [tab, setTab] = React.useState<'SAVES' | 'ENDINGS'>('SAVES');
  const safeSaves = Array.isArray(saves) ? saves.slice().sort((a, b) => (b.updatedAt ?? 0) - (a.updatedAt ?? 0)) : [];
  const selected = selectedSaveId ? safeSaves.find(s => s.id === selectedSaveId) ?? null : null;
  const autoSave = safeSaves.find(s => s.isAuto) ?? null;
  const canCreateFromAuto = !!autoSave;

  return (
    <div className="min-h-screen bg-black text-stone-200 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-gradient-to-b from-black via-stone-950 to-black opacity-100 pointer-events-none" />
      <div className="relative w-full max-w-5xl">
        <div className="mb-6 flex items-end justify-between gap-4">
          <div>
            <div className="text-stone-200 font-serif text-5xl tracking-wide">卡拉迪亚编年史</div>
            <div className="text-stone-500 text-sm mt-2">破碎服务器上的策略与抉择</div>
          </div>
          <div className="flex gap-2">
            <Button variant={tab === 'SAVES' ? 'gold' : 'secondary'} onClick={() => setTab('SAVES')}>
              <Save size={16} className="inline mr-2" /> 存档
            </Button>
            <Button variant={tab === 'ENDINGS' ? 'gold' : 'secondary'} onClick={() => setTab('ENDINGS')}>
              <Film size={16} className="inline mr-2" /> 达成结局
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 bg-stone-950/60 border border-stone-800 rounded p-5">
            {tab === 'SAVES' ? (
              <div className="space-y-4">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                  <div className="text-stone-300 font-bold">存档列表</div>
                  <div className="flex flex-wrap gap-2">
                    <Button onClick={onNewGame} variant="secondary">
                      <Plus size={16} className="inline mr-2" /> 开始新游戏
                    </Button>
                    <Button onClick={() => onContinue(selectedSaveId ?? undefined)} variant="gold" disabled={!autoSave && !selected}>
                      <Play size={16} className="inline mr-2" /> 继续游戏
                    </Button>
                    <Button onClick={onCreateSaveFromAuto} variant="secondary" disabled={!canCreateFromAuto}>
                      <Save size={16} className="inline mr-2" /> 新建存档
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  {safeSaves.length === 0 ? (
                    <div className="text-stone-500 text-sm py-10 text-center">暂无存档。</div>
                  ) : (
                    safeSaves.map(item => {
                      const active = item.id === selectedSaveId;
                      const label = item.isAuto ? `自动存档 · ${item.name}` : item.name;
                      const updated = item.updatedAt ? new Date(item.updatedAt).toLocaleString('zh-CN', { hour12: false }) : '';
                      return (
                        <button
                          key={item.id}
                          onClick={() => onSelectSave(item.id)}
                          className={`w-full text-left bg-black/30 border rounded p-3 transition-colors ${active ? 'border-emerald-700' : 'border-stone-800 hover:border-stone-600'}`}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <div className="text-stone-200 font-bold truncate">{label}</div>
                              <div className="text-xs text-stone-500 mt-1">
                                {typeof item.day === 'number' ? `第 ${item.day} 天` : '（未知天数）'}
                                {typeof item.level === 'number' ? ` · Lv.${item.level}` : ''}
                                {typeof item.renown === 'number' ? ` · 声望 ${item.renown}` : ''}
                                {updated ? ` · ${updated}` : ''}
                              </div>
                            </div>
                            {!item.isAuto && (
                              <Button
                                variant="danger"
                                size="sm"
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  onDeleteSave(item.id);
                                }}
                              >
                                <Trash2 size={14} className="inline mr-1" /> 删除
                              </Button>
                            )}
                          </div>
                        </button>
                      );
                    })
                  )}
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="text-stone-300 font-bold">结局回放</div>
                  <div className="text-xs text-stone-500">测试阶段：全部解锁</div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {endings.map(e => (
                    <div key={e.id} className="bg-black/30 border border-stone-800 rounded p-4">
                      <div className="text-stone-200 font-bold">{e.title}</div>
                      <div className="text-xs text-stone-500 mt-1">{e.subtitle}</div>
                      <div className="mt-3">
                        <Button variant="gold" onClick={() => onReplayEnding(e.id)}>
                          <Film size={16} className="inline mr-2" /> 回放
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="bg-stone-950/60 border border-stone-800 rounded p-5">
            <div className="text-stone-300 font-bold">当前选择</div>
            {!selected ? (
              <div className="text-stone-500 text-sm mt-3">未选择存档。默认继续会使用自动存档。</div>
            ) : (
              <div className="mt-3 space-y-2">
                <div className="text-stone-200 font-bold">{selected.name}</div>
                <div className="text-xs text-stone-500">
                  {typeof selected.day === 'number' ? `第 ${selected.day} 天` : '（未知天数）'}
                  {typeof selected.level === 'number' ? ` · Lv.${selected.level}` : ''}
                  {typeof selected.renown === 'number' ? ` · 声望 ${selected.renown}` : ''}
                </div>
                {selected.endingId && (
                  <div className="text-xs text-amber-300 flex items-center gap-2">
                    <Skull size={14} /> 已触发结局：{selected.endingId}
                  </div>
                )}
                <div className="pt-2">
                  <Button onClick={() => onContinue(selected.id)} variant="gold" className="w-full">
                    <Play size={16} className="inline mr-2" /> 从该存档继续
                  </Button>
                </div>
              </div>
            )}
            <div className="mt-6 text-xs text-stone-600 leading-relaxed">
              自动存档会在推进天数、战斗结束等关键节点更新。
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
