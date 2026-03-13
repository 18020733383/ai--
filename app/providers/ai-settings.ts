import { AIProvider } from '../../types';

export type OpenAIProfile = {
  id: string;
  name: string;
  baseUrl: string;
  key: string;
  model: string;
};

export type AISettingsState = {
  aiProvider: AIProvider;
  doubaoApiKey: string;
  geminiApiKey: string;
  openAIBaseUrl: string;
  openAIKey: string;
  openAIModel: string;
  openAIProfiles: OpenAIProfile[];
  activeOpenAIProfileId: string | null;
  openAIProfileName: string;
  battleStreamEnabled: boolean;
  battleResolutionMode: 'AI' | 'PROGRAM';
  heroChatterEnabled: boolean;
  heroChatterMinMinutes: number;
  heroChatterMaxMinutes: number;
};

export const createDefaultOpenAIProfile = (baseUrl: string, key: string, model: string): OpenAIProfile => ({
  id: `profile_${Date.now()}`,
  name: '默认',
  baseUrl: baseUrl || 'https://api.openai.com',
  key: key || '',
  model: model || ''
});

export const normalizeAIProvider = (provider: string | null | undefined): AIProvider => {
  return provider === 'GPT' || provider === 'GEMINI' || provider === 'DOUBAO' || provider === 'CUSTOM'
    ? provider
    : 'CUSTOM';
};

export const loadAISettingsFromStorage = (): AISettingsState => {
  const baseUrl = localStorage.getItem('openai.baseUrl') ?? 'https://api.openai.com';
  const key = localStorage.getItem('openai.key') ?? '';
  const model = localStorage.getItem('openai.model') ?? '';
  const provider = localStorage.getItem('ai.provider');
  const doubaoKey = localStorage.getItem('doubao.key') ?? '';
  const geminiKey = localStorage.getItem('gemini.key') ?? '';
  const profilesRaw = localStorage.getItem('openai.profiles');
  const activeProfileId = localStorage.getItem('openai.profile.active');
  const battleStream = localStorage.getItem('battle.stream');
  const battleMode = localStorage.getItem('battle.mode');
  const chatterEnabled = localStorage.getItem('hero.chatter.enabled');
  const chatterMin = localStorage.getItem('hero.chatter.minMinutes');
  const chatterMax = localStorage.getItem('hero.chatter.maxMinutes');

  let profiles: OpenAIProfile[] = [];
  if (profilesRaw) {
    try {
      const parsed = JSON.parse(profilesRaw);
      if (Array.isArray(parsed)) {
        profiles = parsed.filter(p => p && typeof p.id === 'string');
      }
    } catch {
    }
  }

  if (profiles.length === 0) {
    const fallback = createDefaultOpenAIProfile(baseUrl, key, model);
    profiles = [fallback];
    localStorage.setItem('openai.profiles', JSON.stringify(profiles));
    localStorage.setItem('openai.profile.active', fallback.id);
  }

  const activeProfile = profiles.find(p => p.id === activeProfileId) ?? profiles[0];
  const min = Number(chatterMin);
  const max = Number(chatterMax);

  return {
    aiProvider: normalizeAIProvider(provider),
    doubaoApiKey: doubaoKey,
    geminiApiKey: geminiKey,
    openAIBaseUrl: activeProfile.baseUrl,
    openAIKey: activeProfile.key,
    openAIModel: activeProfile.model,
    openAIProfiles: profiles,
    activeOpenAIProfileId: activeProfile.id,
    openAIProfileName: activeProfile.name,
    battleStreamEnabled: battleStream === '1' || battleStream === 'true',
    battleResolutionMode: battleMode === 'PROGRAM' ? 'PROGRAM' : 'AI',
    heroChatterEnabled: chatterEnabled === '1' || chatterEnabled === 'true',
    heroChatterMinMinutes: Number.isFinite(min) && min > 0 ? Math.floor(min) : 6,
    heroChatterMaxMinutes: Number.isFinite(max) && max > 0 ? Math.floor(max) : 12
  };
};

export const persistAISettingsToStorage = (settings: AISettingsState) => {
  localStorage.setItem('openai.profiles', JSON.stringify(settings.openAIProfiles));
  if (settings.activeOpenAIProfileId) {
    localStorage.setItem('openai.profile.active', settings.activeOpenAIProfileId);
  }
  localStorage.setItem('openai.baseUrl', settings.openAIBaseUrl.trim());
  localStorage.setItem('openai.key', settings.openAIKey.trim());
  localStorage.setItem('openai.model', settings.openAIModel.trim());
  localStorage.setItem('ai.provider', settings.aiProvider);
  localStorage.setItem('doubao.key', settings.doubaoApiKey.trim());
  localStorage.setItem('gemini.key', settings.geminiApiKey.trim());
  localStorage.setItem('battle.stream', settings.battleStreamEnabled ? '1' : '0');
  localStorage.setItem('battle.mode', settings.battleResolutionMode);
  localStorage.setItem('hero.chatter.enabled', settings.heroChatterEnabled ? '1' : '0');
  localStorage.setItem('hero.chatter.minMinutes', String(settings.heroChatterMinMinutes));
  localStorage.setItem('hero.chatter.maxMinutes', String(settings.heroChatterMaxMinutes));
};

export const buildAIConfigFromSettings = (settings: Pick<AISettingsState, 'aiProvider' | 'doubaoApiKey' | 'geminiApiKey' | 'openAIBaseUrl' | 'openAIKey' | 'openAIModel'>) => {
  if (settings.aiProvider === 'GEMINI') {
    const key = settings.geminiApiKey.trim();
    if (!key) return undefined;
    return { baseUrl: '', apiKey: key, model: 'gemini-3-flash-preview', provider: settings.aiProvider };
  }
  if (settings.aiProvider === 'DOUBAO') {
    const key = settings.doubaoApiKey.trim();
    const model = settings.openAIModel.trim();
    if (!key || !model) return undefined;
    return {
      baseUrl: settings.openAIBaseUrl.trim() || 'https://ark.cn-beijing.volces.com/api/v3',
      apiKey: key,
      model,
      provider: settings.aiProvider
    };
  }
  const key = settings.openAIKey.trim();
  const model = settings.openAIModel.trim();
  if (!key || !model) return undefined;
  return {
    baseUrl: settings.openAIBaseUrl.trim() || 'https://api.openai.com',
    apiKey: key,
    model,
    provider: settings.aiProvider
  };
};

export const buildUpdatedProfiles = (
  profiles: OpenAIProfile[],
  activeProfileId: string | null,
  fallbackName: string,
  baseUrl: string,
  key: string,
  model: string
) => {
  const normalizedProfiles = profiles.length > 0 ? profiles : [createDefaultOpenAIProfile(baseUrl, key, model)];
  const activeId = activeProfileId ?? normalizedProfiles[0].id;
  const updatedProfiles = normalizedProfiles.map(p => {
    if (p.id !== activeId) return p;
    return {
      ...p,
      name: fallbackName || p.name,
      baseUrl,
      key,
      model
    };
  });
  return { updatedProfiles, activeId };
};

export const selectAIProfileState = (profiles: OpenAIProfile[], profileId: string) => {
  const profile = profiles.find(p => p.id === profileId);
  if (!profile) return null;
  localStorage.setItem('openai.profile.active', profile.id);
  localStorage.setItem('openai.baseUrl', profile.baseUrl.trim());
  localStorage.setItem('openai.key', profile.key.trim());
  localStorage.setItem('openai.model', profile.model.trim());
  return profile;
};

export const createNextAIProfile = (profiles: OpenAIProfile[]) => {
  const profile: OpenAIProfile = {
    id: `profile_${Date.now()}`,
    name: `新配置 ${profiles.length + 1}`,
    baseUrl: 'https://api.openai.com',
    key: '',
    model: ''
  };
  const updated = [...profiles, profile];
  localStorage.setItem('openai.profiles', JSON.stringify(updated));
  localStorage.setItem('openai.profile.active', profile.id);
  localStorage.setItem('openai.baseUrl', profile.baseUrl);
  localStorage.setItem('openai.key', '');
  localStorage.setItem('openai.model', '');
  return { profile, updated };
};
