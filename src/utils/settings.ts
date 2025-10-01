export interface AISettings {
  provider: 'openai' | 'custom';
  endpoint: string;
  modelName: string;
  apiKey: string;
}

export const OPENAI_ENDPOINT = 'https://api.openai.com/v1';

export const DEFAULT_SETTINGS: AISettings = {
  provider: 'openai',
  endpoint: '',
  modelName: '',
  apiKey: '',
};

const SETTINGS_KEY = 'tabitomo_ai_settings';

export const saveSettings = (settings: AISettings): void => {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
};

export const loadSettings = (): AISettings | null => {
  const stored = localStorage.getItem(SETTINGS_KEY);
  if (!stored) return null;

  try {
    return JSON.parse(stored) as AISettings;
  } catch {
    return null;
  }
};

export const hasSettings = (): boolean => {
  return loadSettings() !== null;
};

export const clearSettings = (): void => {
  localStorage.removeItem(SETTINGS_KEY);
};
