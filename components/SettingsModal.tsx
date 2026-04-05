import React from 'react';
import { Settings } from 'lucide-react';
import { Button } from './Button';
import { AIProvider } from '../types';
import { runSettingsApiChatTest, type OpenAIConfig } from '../services/geminiService';

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
  heroChatterEnabled: boolean;
  setHeroChatterEnabled: (value: boolean) => void;
  heroChatterMinMinutes: number;
  setHeroChatterMinMinutes: (value: number) => void;
  heroChatterMaxMinutes: number;
  setHeroChatterMaxMinutes: (value: number) => void;
  replyStyleUserMessage: string;
  setReplyStyleUserMessage: (value: string) => void;
  replyStyleAssistantMessage: string;
  setReplyStyleAssistantMessage: (value: string) => void;
  saveDataText: string;
  setSaveDataText: (value: string) => void;
  saveDataNotice: string | null;
  manualSaveName: string;
  setManualSaveName: (value: string) => void;
  onManualSave: () => void;
  exportSaveData: () => void;
  importSaveData: () => void;
  onClose: () => void;
  onSave: () => void;
  buildAIConfig: () => OpenAIConfig | undefined;
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
  heroChatterEnabled,
  setHeroChatterEnabled,
  heroChatterMinMinutes,
  setHeroChatterMinMinutes,
  heroChatterMaxMinutes,
  setHeroChatterMaxMinutes,
  replyStyleUserMessage,
  setReplyStyleUserMessage,
  replyStyleAssistantMessage,
  setReplyStyleAssistantMessage,
  saveDataText,
  setSaveDataText,
  saveDataNotice,
  manualSaveName,
  setManualSaveName,
  onManualSave,
  exportSaveData,
  importSaveData,
  onClose,
  onSave,
  buildAIConfig
}: SettingsModalProps) => {
  const [apiTestPrompt, setApiTestPrompt] = React.useState(
    '请用一句中文回复：若你收到此消息，只回答「连通正常」四字。'
  );
  const [apiTestResult, setApiTestResult] = React.useState<string | null>(null);
  const [apiTestLoading, setApiTestLoading] = React.useState(false);
  /** OpenAI 兼容端：部分服务（如 Grok/xAI）默认只返回 SSE，需流式或与自动解析配合 */
  const [apiTestUseStream, setApiTestUseStream] = React.useState(false);

  const handleApiTest = async () => {
    setApiTestLoading(true);
    setApiTestResult(null);
    try {
      const res = await runSettingsApiChatTest(buildAIConfig(), apiTestPrompt, {
        stream: apiTestUseStream
      });
      if (res.ok) {
        setApiTestResult(`成功（${res.latencyMs} ms）\n\n${res.reply}`);
      } else {
        setApiTestResult(
          `失败${typeof res.latencyMs === 'number' ? `（${res.latencyMs} ms）` : ''}：${res.error}`
        );
      }
    } finally {
      setApiTestLoading(false);
    }
  };

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

              <div className="bg-black/20 border border-stone-800 rounded px-3 py-2 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="text-xs text-stone-400">英雄闲聊</div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant={heroChatterEnabled ? "gold" : "secondary"}
                      onClick={() => setHeroChatterEnabled(true)}
                    >
                      开
                    </Button>
                    <Button
                      size="sm"
                      variant={!heroChatterEnabled ? "gold" : "secondary"}
                      onClick={() => setHeroChatterEnabled(false)}
                    >
                      关
                    </Button>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-stone-500 mb-1">间隔下限（分钟）</label>
                    <input
                      value={heroChatterMinMinutes}
                      onChange={(e) => setHeroChatterMinMinutes(Math.max(1, Math.floor(Number(e.target.value) || 1)))}
                      type="number"
                      min={1}
                      className="w-full bg-stone-950 border border-stone-700 rounded px-3 py-2 text-stone-200"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-stone-500 mb-1">间隔上限（分钟）</label>
                    <input
                      value={heroChatterMaxMinutes}
                      onChange={(e) => setHeroChatterMaxMinutes(Math.max(1, Math.floor(Number(e.target.value) || 1)))}
                      type="number"
                      min={1}
                      className="w-full bg-stone-950 border border-stone-700 rounded px-3 py-2 text-stone-200"
                    />
                  </div>
                </div>
                <div className="text-xs text-stone-600">仅当队伍至少有 2 名英雄，且不在战斗中时触发。</div>
              </div>

              <div className="bg-black/20 border border-stone-800 rounded px-3 py-2 space-y-3">
                <div className="text-xs text-stone-300 font-bold">AI 回复风格（前置对话）</div>
                <p className="text-[11px] text-stone-500 leading-relaxed">
                  仅对 OpenAI 兼容接口生效（自定义 / GPT / 豆包等）。若下列两项均填写，每次请求会在<strong className="text-stone-400">所有前置 system 消息之后</strong>
                  插入一轮「用户 → 助手」伪历史，再接着游戏的 system / user，用于约定语气或格式（例如先让模型承认扮演某角色）。
                  Gemini 直连不使用该机制。
                </p>
                <div>
                  <label className="block text-xs text-stone-500 mb-1">User（第一条，如：你是一个江湖说书人，回复要短促带评书味。）</label>
                  <textarea
                    value={replyStyleUserMessage}
                    onChange={e => setReplyStyleUserMessage(e.target.value)}
                    className="w-full min-h-[64px] bg-stone-950 border border-stone-700 rounded px-3 py-2 text-sm text-stone-200 placeholder:text-stone-600"
                    placeholder="留空则不注入前置对话"
                  />
                </div>
                <div>
                  <label className="block text-xs text-stone-500 mb-1">Assistant（第二条，模型侧应答，如：得嘞，老夫这就短打快说。）</label>
                  <textarea
                    value={replyStyleAssistantMessage}
                    onChange={e => setReplyStyleAssistantMessage(e.target.value)}
                    className="w-full min-h-[64px] bg-stone-950 border border-stone-700 rounded px-3 py-2 text-sm text-stone-200 placeholder:text-stone-600"
                    placeholder="需与上栏同时非空才会生效"
                  />
                </div>
              </div>

              {settingsError && (
                <div className="text-sm text-red-400 border-l-2 border-red-900 pl-3">
                  {settingsError}
                </div>
              )}

              <div className="bg-black/20 border border-stone-800 rounded p-3 space-y-2">
                <div className="text-xs text-stone-300 font-bold">API 连通测试</div>
                <p className="text-[11px] text-stone-500 leading-relaxed">
                  使用当前表单中的供应商、Key、Base URL、模型发一条对话（无需先点「保存」）。非流式请求会附带{' '}
                  <span className="text-stone-400 font-mono">stream:false</span>；若仍解析失败可改「流式」。服务端若直接返回 SSE，也会尽量从正文聚合内容。
                </p>
                <div className="flex items-center gap-2 bg-black/25 border border-stone-800 rounded px-2 py-1.5">
                  <span className="text-[10px] text-stone-500 shrink-0">chat/completions</span>
                  <Button
                    type="button"
                    size="sm"
                    variant={!apiTestUseStream ? 'gold' : 'secondary'}
                    onClick={() => setApiTestUseStream(false)}
                    disabled={apiTestLoading}
                  >
                    非流式
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant={apiTestUseStream ? 'gold' : 'secondary'}
                    onClick={() => setApiTestUseStream(true)}
                    disabled={apiTestLoading}
                  >
                    流式
                  </Button>
                </div>
                <textarea
                  value={apiTestPrompt}
                  onChange={e => setApiTestPrompt(e.target.value)}
                  className="w-full min-h-[72px] bg-stone-950 border border-stone-700 rounded px-3 py-2 text-sm text-stone-200 placeholder:text-stone-600"
                  placeholder="输入发给模型的用户消息…"
                />
                <div className="flex flex-wrap gap-2 items-center">
                  <Button variant="gold" size="sm" onClick={handleApiTest} disabled={apiTestLoading}>
                    {apiTestLoading ? '请求中…' : '发送测试'}
                  </Button>
                  <span className="text-[10px] text-stone-600">
                    Gemini 不受流式开关影响；自定义 / GPT / 豆包 / Grok 等走 OpenAI 兼容接口。
                  </span>
                </div>
                {apiTestResult !== null && (
                  <pre className="text-xs text-stone-300 bg-stone-950/80 border border-stone-800 rounded p-3 whitespace-pre-wrap break-words max-h-40 overflow-y-auto font-mono">
                    {apiTestResult}
                  </pre>
                )}
              </div>
            </div>

          <div className="bg-stone-950/40 border border-stone-800 rounded p-4">
            <div className="text-sm text-stone-300 font-bold mb-3">存档导入导出</div>
            <div className="space-y-3">
              <div className="bg-black/30 border border-stone-800 rounded p-3">
                <div className="text-xs text-stone-500 mb-2">手动存档</div>
                <div className="flex flex-col md:flex-row gap-2">
                  <input
                    value={manualSaveName}
                    onChange={(e) => setManualSaveName(e.target.value)}
                    className="flex-1 bg-stone-950 border border-stone-700 rounded px-3 py-2 text-sm text-stone-200 placeholder:text-stone-600"
                    placeholder="存档名称（可留空）"
                  />
                  <Button variant="secondary" onClick={onManualSave}>
                    立即保存
                  </Button>
                </div>
              </div>
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
