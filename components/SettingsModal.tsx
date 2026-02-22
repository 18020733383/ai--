import React from 'react';
import { Settings } from 'lucide-react';
import { Button } from './Button';
import { AIProvider } from '../types';

type SettingsModalProps = {
  openAIBaseUrl: string;
  setOpenAIBaseUrl: (value: string) => void;
  openAIKey: string;
  setOpenAIKey: (value: string) => void;
  openAIModel: string;
  setOpenAIModel: (value: string) => void;
  aiProvider: AIProvider;
  setAIProvider: (value: AIProvider) => void;
  doubaoApiKey: string;
  setDoubaoApiKey: (value: string) => void;
  geminiApiKey: string;
  setGeminiApiKey: (value: string) => void;
  openAIProfiles: { id: string; name: string }[];
  activeOpenAIProfileId: string | null;
  openAIProfileName: string;
  setOpenAIProfileName: (value: string) => void;
  selectOpenAIProfile: (profileId: string) => void;
  addOpenAIProfile: () => void;
  openAIModels: string[];
  isModelsLoading: boolean;
  fetchOpenAIModelList: () => void;
  settingsError: string | null;
  battleStreamEnabled: boolean;
  setBattleStreamEnabled: (value: boolean) => void;
  battleResolutionMode: 'AI' | 'PROGRAM';
  setBattleResolutionMode: (value: 'AI' | 'PROGRAM') => void;
  saveDataText: string;
  setSaveDataText: (value: string) => void;
  saveDataNotice: string | null;
  exportSaveData: () => void;
  importSaveData: () => void;
  onClose: () => void;
  onSave: () => void;
};

export const SettingsModal = ({
  openAIBaseUrl,
  setOpenAIBaseUrl,
  openAIKey,
  setOpenAIKey,
  openAIModel,
  setOpenAIModel,
  aiProvider,
  setAIProvider,
  doubaoApiKey,
  setDoubaoApiKey,
  geminiApiKey,
  setGeminiApiKey,
  openAIProfiles,
  activeOpenAIProfileId,
  openAIProfileName,
  setOpenAIProfileName,
  selectOpenAIProfile,
  addOpenAIProfile,
  openAIModels,
  isModelsLoading,
  fetchOpenAIModelList,
  settingsError,
  battleStreamEnabled,
  setBattleStreamEnabled,
  battleResolutionMode,
  setBattleResolutionMode,
  saveDataText,
  setSaveDataText,
  saveDataNotice,
  exportSaveData,
  importSaveData,
  onClose,
  onSave
}: SettingsModalProps) => {
  const isModelListSupported = aiProvider === 'GPT' || aiProvider === 'CUSTOM';
  const showProfiles = aiProvider === 'GPT' || aiProvider === 'CUSTOM';
  const keyLabel = aiProvider === 'DOUBAO' ? '豆包 API Key' : 'Key';
  const keyValue = aiProvider === 'DOUBAO' ? doubaoApiKey : openAIKey;
  const setKeyValue = aiProvider === 'DOUBAO' ? setDoubaoApiKey : setOpenAIKey;
  const baseUrlPlaceholder = aiProvider === 'DOUBAO' ? 'https://ark.cn-beijing.volces.com/api/v3' : 'https://api.openai.com';
  const modelPlaceholder = aiProvider === 'DOUBAO' ? 'doubao-seed-1.6' : 'gpt-4o-mini / gpt-4.1-mini ...';

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
      <div className="w-full max-w-5xl bg-stone-900 border border-stone-700 rounded shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-stone-800">
          <h3 className="text-lg font-bold text-stone-200 flex items-center gap-2"><Settings size={18}/> API 设置</h3>
          <button
            onClick={() => {
              onSave();
              onClose();
            }}
            className="text-stone-400 hover:text-white"
          >
            关闭
          </button>
        </div>
        <div className="p-4 max-h-[80vh] overflow-y-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="bg-stone-950/40 border border-stone-800 rounded p-4 space-y-4">
              <div>
                <div className="text-sm text-stone-300 font-bold mb-3">AI 供应商</div>
                <select
                  value={aiProvider}
                  onChange={(e) => setAIProvider(e.target.value as AIProvider)}
                  className="w-full bg-stone-950 border border-stone-700 rounded px-3 py-2 text-stone-200"
                >
                  <option value="CUSTOM">自定义</option>
                  <option value="GPT">GPT</option>
                  <option value="GEMINI">Gemini</option>
                  <option value="DOUBAO">豆包</option>
                </select>
              </div>

              {aiProvider === 'GEMINI' ? (
                <div>
                  <label className="block text-xs text-stone-500 mb-1">Gemini API Key</label>
                  <input
                    value={geminiApiKey}
                    onChange={(e) => setGeminiApiKey(e.target.value)}
                    className="w-full bg-stone-950 border border-stone-700 rounded px-3 py-2 text-stone-200 placeholder:text-stone-600"
                    placeholder="AIzaSy..."
                  />
                </div>
              ) : (
                <div className="space-y-3">
                  {showProfiles && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
                      <div className="md:col-span-2">
                        <label className="block text-xs text-stone-500 mb-1">配置</label>
                        <select
                          value={activeOpenAIProfileId ?? ''}
                          onChange={(e) => selectOpenAIProfile(e.target.value)}
                          className="w-full bg-stone-950 border border-stone-700 rounded px-3 py-2 text-stone-200"
                        >
                          {openAIProfiles.map(p => (
                            <option key={p.id} value={p.id}>{p.name}</option>
                          ))}
                        </select>
                      </div>
                      <Button onClick={addOpenAIProfile} variant="secondary">
                        新增配置
                      </Button>
                    </div>
                  )}

                  {showProfiles && (
                    <div>
                      <label className="block text-xs text-stone-500 mb-1">配置名称</label>
                      <input
                        value={openAIProfileName}
                        onChange={(e) => setOpenAIProfileName(e.target.value)}
                        className="w-full bg-stone-950 border border-stone-700 rounded px-3 py-2 text-stone-200 placeholder:text-stone-600"
                        placeholder="例如：OpenAI 主用"
                      />
                    </div>
                  )}
                  <div>
                    <label className="block text-xs text-stone-500 mb-1">Base URL</label>
                    <input
                      value={openAIBaseUrl}
                      onChange={(e) => setOpenAIBaseUrl(e.target.value)}
                      className="w-full bg-stone-950 border border-stone-700 rounded px-3 py-2 text-stone-200 placeholder:text-stone-600"
                      placeholder={baseUrlPlaceholder}
                    />
                  </div>

                  <div>
                    <label className="block text-xs text-stone-500 mb-1">{keyLabel}</label>
                    <input
                      value={keyValue}
                      onChange={(e) => setKeyValue(e.target.value)}
                      className="w-full bg-stone-950 border border-stone-700 rounded px-3 py-2 text-stone-200 placeholder:text-stone-600"
                      placeholder={aiProvider === 'DOUBAO' ? 'ak-...' : 'sk-...'}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
                    <div className="md:col-span-2">
                      <label className="block text-xs text-stone-500 mb-1">模型</label>
                      <input
                        value={openAIModel}
                        onChange={(e) => setOpenAIModel(e.target.value)}
                        className="w-full bg-stone-950 border border-stone-700 rounded px-3 py-2 text-stone-200 placeholder:text-stone-600"
                        placeholder={modelPlaceholder}
                      />
                    </div>
                    <Button
                      onClick={fetchOpenAIModelList}
                      disabled={!isModelListSupported || isModelsLoading || !openAIKey.trim()}
                      variant="secondary"
                    >
                      {isModelsLoading ? '获取中...' : '获取模型'}
                    </Button>
                  </div>

                  {isModelListSupported && openAIModels.length > 0 && (
                    <div>
                      <label className="block text-xs text-stone-500 mb-1">模型列表</label>
                      <select
                        value={openAIModel}
                        onChange={(e) => setOpenAIModel(e.target.value)}
                        className="w-full bg-stone-950 border border-stone-700 rounded px-3 py-2 text-stone-200"
                      >
                        {openAIModels.map(m => <option key={m} value={m}>{m}</option>)}
                      </select>
                    </div>
                  )}
                </div>
              )}

              <div className="flex items-center justify-between bg-black/20 border border-stone-800 rounded px-3 py-2">
                <div className="text-xs text-stone-400">战斗传输</div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant={battleStreamEnabled ? "gold" : "secondary"}
                    onClick={() => setBattleStreamEnabled(true)}
                  >
                    流式
                  </Button>
                  <Button
                    size="sm"
                    variant={!battleStreamEnabled ? "gold" : "secondary"}
                    onClick={() => setBattleStreamEnabled(false)}
                  >
                    一次性
                  </Button>
                </div>
              </div>
              <div className="flex items-center justify-between bg-black/20 border border-stone-800 rounded px-3 py-2">
                <div className="text-xs text-stone-400">战斗结算</div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant={battleResolutionMode === 'AI' ? "gold" : "secondary"}
                    onClick={() => setBattleResolutionMode('AI')}
                  >
                    AI
                  </Button>
                  <Button
                    size="sm"
                    variant={battleResolutionMode === 'PROGRAM' ? "gold" : "secondary"}
                    onClick={() => setBattleResolutionMode('PROGRAM')}
                  >
                    程序
                  </Button>
                </div>
              </div>

              {settingsError && (
                <div className="text-sm text-red-400 border-l-2 border-red-900 pl-3">
                  {settingsError}
                </div>
              )}
            </div>

          <div className="bg-stone-950/40 border border-stone-800 rounded p-4">
            <div className="text-sm text-stone-300 font-bold mb-3">存档导入导出</div>
            <div className="space-y-3">
              <div className="flex flex-wrap gap-2">
                <Button onClick={exportSaveData} variant="secondary">
                  导出存档
                </Button>
                <Button onClick={importSaveData} variant="secondary">
                  导入存档
                </Button>
              </div>
              <textarea
                value={saveDataText}
                onChange={(e) => setSaveDataText(e.target.value)}
                className="w-full min-h-[260px] bg-stone-950 border border-stone-700 rounded px-3 py-2 text-stone-200 placeholder:text-stone-600"
                placeholder="把存档 JSON 粘贴到这里，或点击导出生成"
              />
              {saveDataNotice && (
                <div className="text-sm text-stone-400 border-l-2 border-stone-700 pl-3">
                  {saveDataNotice}
                </div>
              )}
              <div className="flex justify-end gap-2">
                <Button
                  variant="secondary"
                  onClick={() => {
                    onSave();
                    onClose();
                  }}
                >
                  保存
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
  );
};
