export interface SpeechRecognitionSettings {
  provider: 'web-speech' | 'siliconflow';
  apiKey?: string; // Only for SiliconFlow
}

export interface GeneralAISettings {
  apiKey: string;
  endpoint: string;
  modelName: string;
}

export interface ImageOCRSettings {
  provider: 'qwen' | 'custom';
  useGeneralAI?: boolean; // true = use general AI settings, false = use custom settings
  apiKey: string;
  endpoint: string;
  modelName?: string; // For custom provider
}

export interface VLMSettings {
  useGeneralAI?: boolean; // true = use general AI settings, false = use OCR or custom settings
  useCustom: boolean; // false = use OCR settings, true = use custom settings (only applies when useGeneralAI is false)
  apiKey?: string;
  endpoint?: string;
  modelName?: string;
  enableThinking: boolean; // Enable thinking mode (show model's reasoning process)
}

export interface AISettings {
  // General AI service (fallback for all features)
  generalAI: GeneralAISettings;
  // Text translation settings (deprecated, kept for backward compatibility)
  provider: 'openai' | 'custom';
  endpoint: string;
  modelName: string;
  apiKey: string;
  // Speech recognition settings
  speechRecognition: SpeechRecognitionSettings;
  // Image OCR settings
  imageOCR: ImageOCRSettings;
  // VLM (Vision Language Model) settings
  vlm: VLMSettings;
}

export const OPENAI_ENDPOINT = 'https://api.openai.com/v1';
export const DASHSCOPE_ENDPOINT = 'https://dashscope.aliyuncs.com/compatible-mode/v1';
export const DASHSCOPE_INTL_ENDPOINT = 'https://dashscope-intl.aliyuncs.com/compatible-mode/v1';

export const DEFAULT_SETTINGS: AISettings = {
  generalAI: {
    apiKey: '',
    endpoint: '',
    modelName: '',
  },
  provider: 'openai',
  endpoint: '',
  modelName: '',
  apiKey: '',
  speechRecognition: {
    provider: 'web-speech',
  },
  imageOCR: {
    provider: 'qwen',
    useGeneralAI: false,
    apiKey: '',
    endpoint: DASHSCOPE_ENDPOINT,
  },
  vlm: {
    useGeneralAI: true, // Default to using general AI
    useCustom: false,
    enableThinking: false, // Disable thinking mode by default
  },
};

const SETTINGS_KEY = 'tabitomo_ai_settings';

export const saveSettings = (settings: AISettings): void => {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
};

export const loadSettings = (): AISettings | null => {
  const stored = localStorage.getItem(SETTINGS_KEY);
  if (!stored) return null;

  try {
    const parsed = JSON.parse(stored) as Partial<AISettings>;
    // Merge with default settings to ensure all properties exist
    return {
      ...DEFAULT_SETTINGS,
      ...parsed,
      generalAI: {
        ...DEFAULT_SETTINGS.generalAI,
        ...(parsed.generalAI || {}),
      },
      speechRecognition: {
        ...DEFAULT_SETTINGS.speechRecognition,
        ...(parsed.speechRecognition || {}),
      },
      imageOCR: {
        ...DEFAULT_SETTINGS.imageOCR,
        ...(parsed.imageOCR || {}),
      },
      vlm: {
        ...DEFAULT_SETTINGS.vlm,
        ...(parsed.vlm || {}),
      },
    };
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
