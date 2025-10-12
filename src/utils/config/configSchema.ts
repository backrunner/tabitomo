/**
 * Versioned Config Schema
 * Defines the structure of configuration with versioning for migration support
 */

import { schema, ObjectSchema, validateSchema as validateSchemaBase, applyDefaults } from './schema';
import { DASHSCOPE_ENDPOINT } from './settings';

// Re-export validation functions
export { validateSchemaBase as validateSchema, applyDefaults };

/**
 * Current schema version
 * Increment this when making breaking changes to the config structure
 */
export const CURRENT_SCHEMA_VERSION = 1;

/**
 * Translation Config Schema
 */
export const translationSchema = {
  outputMode: schema.enum(['plain', 'structured'] as const, { default: 'structured' }),
};

/**
 * Speech Recognition Config Schema
 */
export const speechRecognitionSchema = {
  provider: schema.enum(['web-speech', 'siliconflow', 'local-whisper'] as const, {
    default: 'web-speech',
  }),
  apiKey: schema.string({ optional: true }),
  modelName: schema.string({ optional: true, default: 'TeleAI/TeleSpeechASR' }),
  enableRealtimeTranscription: schema.boolean({ optional: true, default: true }),
  whisperModel: schema.enum(['tiny', 'base', 'small'] as const, {
    optional: true,
    default: 'base',
  }),
  whisperModelDownloaded: schema.boolean({ optional: true, default: false }),
};

/**
 * General AI Config Schema
 */
export const generalAISchema = {
  apiKey: schema.string({ default: '' }),
  endpoint: schema.string({ default: '' }),
  modelName: schema.string({ default: '' }),
};

/**
 * Image OCR Config Schema
 */
export const imageOCRSchema = {
  provider: schema.enum(['qwen', 'custom'] as const, { default: 'qwen' }),
  useGeneralAI: schema.boolean({ optional: true, default: false }),
  apiKey: schema.string({ default: '' }),
  endpoint: schema.string({ default: DASHSCOPE_ENDPOINT }),
  modelName: schema.string({ optional: true }),
};

/**
 * VLM (Vision Language Model) Config Schema
 */
export const vlmSchema = {
  useGeneralAI: schema.boolean({ optional: true, default: true }),
  useCustom: schema.boolean({ default: false }),
  apiKey: schema.string({ optional: true }),
  endpoint: schema.string({ optional: true }),
  modelName: schema.string({ optional: true }),
  enableThinking: schema.boolean({ default: false }),
};

/**
 * Main AI Config Schema (v1)
 */
export const aiConfigSchemaV1 = {
  // Schema version for migration tracking
  _version: schema.number({ optional: true, default: CURRENT_SCHEMA_VERSION }),

  // General AI service (fallback for all features)
  generalAI: schema.object(generalAISchema),

  // Legacy text translation config (deprecated, kept for backward compatibility)
  provider: schema.enum(['openai', 'custom'] as const, { default: 'openai' }),
  endpoint: schema.string({ default: '' }),
  modelName: schema.string({ default: '' }),
  apiKey: schema.string({ default: '' }),

  // Translation config
  translation: schema.object(translationSchema),

  // Speech recognition config
  speechRecognition: schema.object(speechRecognitionSchema),

  // Image OCR config
  imageOCR: schema.object(imageOCRSchema),

  // VLM config
  vlm: schema.object(vlmSchema),
};

/**
 * Type inference from schema
 */
export type AIConfigV1 = {
  _version?: number;
  generalAI: {
    apiKey: string;
    endpoint: string;
    modelName: string;
  };
  provider: 'openai' | 'custom';
  endpoint: string;
  modelName: string;
  apiKey: string;
  translation: {
    outputMode: 'plain' | 'structured';
  };
  speechRecognition: {
    provider: 'web-speech' | 'siliconflow' | 'local-whisper';
    apiKey?: string;
    modelName?: string;
    enableRealtimeTranscription?: boolean;
    whisperModel?: 'tiny' | 'base' | 'small';
    whisperModelDownloaded?: boolean;
  };
  imageOCR: {
    provider: 'qwen' | 'custom';
    useGeneralAI?: boolean;
    apiKey: string;
    endpoint: string;
    modelName?: string;
  };
  vlm: {
    useGeneralAI?: boolean;
    useCustom: boolean;
    apiKey?: string;
    endpoint?: string;
    modelName?: string;
    enableThinking: boolean;
  };
};

/**
 * Versioned config container
 * All exported config will be wrapped in this structure
 */
export interface VersionedConfig {
  version: number;
  config: AIConfigV1; // or future versions
  exportedAt: string; // ISO timestamp
  appVersion?: string; // App version that exported this config
}

/**
 * Get the appropriate schema for a given version
 */
export function getSchemaForVersion(version: number): ObjectSchema {
  switch (version) {
    case 1:
      return aiConfigSchemaV1;
    default:
      throw new Error(`Unsupported schema version: ${version}`);
  }
}
