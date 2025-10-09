import { generateObject, generateText } from 'ai';
import { createOpenAICompatible } from '@ai-sdk/openai-compatible';
import { z } from 'zod';
import { AISettings } from '../config/settings';

// All supported languages with their codes and English names
export const SUPPORTED_LANGUAGES = {
  zh: 'Chinese',
  en: 'English',
  fr: 'French',
  pt: 'Portuguese',
  es: 'Spanish',
  ja: 'Japanese',
  tr: 'Turkish',
  ru: 'Russian',
  ar: 'Arabic',
  ko: 'Korean',
  th: 'Thai',
  it: 'Italian',
  de: 'German',
  vi: 'Vietnamese',
  ms: 'Malay',
  id: 'Indonesian',
  tl: 'Filipino',
  hi: 'Hindi',
  'zh-Hant': 'Traditional Chinese',
  pl: 'Polish',
  cs: 'Czech',
  nl: 'Dutch',
  km: 'Khmer',
  my: 'Burmese',
  fa: 'Persian',
  gu: 'Gujarati',
  ur: 'Urdu',
  te: 'Telugu',
  mr: 'Marathi',
  he: 'Hebrew',
  bn: 'Bengali',
  ta: 'Tamil',
  uk: 'Ukrainian',
  bo: 'Tibetan',
  kk: 'Kazakh',
  mn: 'Mongolian',
  ug: 'Uyghur',
  yue: 'Cantonese'
} as const;

export type LanguageCode = keyof typeof SUPPORTED_LANGUAGES;

// Translation result schema for structured output
const translationSchema = z.object({
  translatedText: z.string().describe('The translated text in the target language'),
  detectedLanguage: z.string().optional().describe('The detected source language code if language detection was performed'),
  confidence: z.number().min(0).max(1).optional().describe('Translation confidence score between 0 and 1')
});

// Initialize AI client based on provider
const getAIClient = (settings: AISettings) => {
  // Priority: 1. Translation service settings (if fully configured), 2. General AI service
  // Check if Translation service is fully configured (all three fields must be present)
  const useTranslationService = !!(settings.apiKey && settings.endpoint && settings.modelName);

  const apiKey = useTranslationService ? settings.apiKey : settings.generalAI.apiKey;
  const endpoint = useTranslationService ? settings.endpoint : settings.generalAI.endpoint;

  if (!apiKey) {
    throw new Error('API key is not configured');
  }

  // Always use OpenAI-compatible SDK
  return createOpenAICompatible({
    name: 'ai-provider',
    apiKey,
    baseURL: endpoint,
  });
};

/**
 * Check if the model is Hunyuan-MT
 */
const isHunyuanMT = (modelName: string): boolean => {
  const normalized = modelName.toLowerCase();
  return normalized === 'hunyuan-mt-7b' || normalized === 'tencent/hunyuan-mt-7b';
};

/**
 * Translate text using AI with structured JSON output
 * @param text - The text to translate
 * @param sourceLang - Source language code
 * @param targetLang - Target language code
 * @param settings - AI settings containing API key, endpoint, and model
 * @returns Translated text
 */
export async function translateText(
  text: string,
  sourceLang: LanguageCode,
  targetLang: LanguageCode,
  settings: AISettings
): Promise<string> {
  // If source and target are the same, return original text
  if (sourceLang === targetLang) {
    return text;
  }

  // Validate text input
  if (!text || text.trim().length === 0) {
    return '';
  }

  try {
    const client = getAIClient(settings);
    // Priority: 1. Translation service (if fully configured), 2. General AI service
    const useTranslationService = !!(settings.apiKey && settings.endpoint && settings.modelName);
    const modelName = useTranslationService ? settings.modelName : settings.generalAI.modelName;
    const sourceLangName = SUPPORTED_LANGUAGES[sourceLang];
    const targetLangName = SUPPORTED_LANGUAGES[targetLang];

    // Use chat completion for Hunyuan-MT model
    if (isHunyuanMT(modelName)) {
      // Determine if either source or target is Chinese
      const isChineseInvolved = sourceLang === 'zh' || sourceLang === 'zh-Hant' ||
                                targetLang === 'zh' || targetLang === 'zh-Hant';

      let prompt: string;
      if (isChineseInvolved) {
        // Chinese prompt for ZH<=>XX translation
        prompt = `把下面的文本翻译成${targetLangName}，不要输出任何的额外解释。\n\n${text}`;
      } else {
        // English prompt for XX<=>XX translation
        prompt = `Translate the following segment into ${targetLangName}, without additional explanation.\n\n${text}`;
      }

      const result = await generateText({
        model: client(modelName),
        prompt: prompt,
      });

      return result.text;
    }

    // Use structured output for other models
    const result = await generateObject({
      model: client(modelName),
      schema: translationSchema,
      prompt: `You are a professional translator. Translate the following text from ${sourceLangName} (${sourceLang}) to ${targetLangName} (${targetLang}).

Text to translate: "${text}"

Instructions:
1. Provide an accurate and natural translation
2. Preserve the tone and style of the original text
3. If the text contains idioms or cultural references, adapt them appropriately for the target language
4. Maintain any formatting or special characters
5. Return only the translation in the JSON format specified

Respond with the translation in JSON format.`,
    });

    return result.object.translatedText;
  } catch (error) {
    console.error('Translation error:', error);
    throw new Error(`Translation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Detect the language of the input text
 * @param text - The text to analyze
 * @param settings - AI settings containing API key, endpoint, and model
 * @returns Detected language code
 */
export async function detectLanguage(text: string, settings: AISettings): Promise<LanguageCode> {
  if (!text || text.trim().length === 0) {
    return 'en'; // Default to English
  }

  try {
    const client = getAIClient(settings);
    // Priority: 1. Translation service (if fully configured), 2. General AI service
    const useTranslationService = !!(settings.apiKey && settings.endpoint && settings.modelName);
    const modelName = useTranslationService ? settings.modelName : settings.generalAI.modelName;

    const languageDetectionSchema = z.object({
      languageCode: z.string().describe('The detected language code'),
      confidence: z.number().min(0).max(1).describe('Detection confidence score')
    });

    const supportedCodes = Object.keys(SUPPORTED_LANGUAGES).join(', ');

    const result = await generateObject({
      model: client(modelName),
      schema: languageDetectionSchema,
      prompt: `Detect the language of the following text. Return the language code from this list: ${supportedCodes}.

Text: "${text}"

Respond with the language code and confidence score in JSON format.`,
    });

    const detectedCode = result.object.languageCode as LanguageCode;

    // Validate the detected code is in our supported list
    if (detectedCode in SUPPORTED_LANGUAGES) {
      return detectedCode;
    }

    return 'en'; // Fallback to English
  } catch (error) {
    console.error('Language detection error:', error);
    return 'en'; // Fallback to English on error
  }
}
