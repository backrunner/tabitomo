import { AISettings } from '../config/settings';

/**
 * Check if the provider is SiliconFlow for speech recognition
 */
export function useSiliconFlowSpeech(settings: AISettings): boolean {
  return settings.speechRecognition.provider === 'siliconflow';
}

/**
 * Get the API key for SiliconFlow speech recognition
 */
function getSiliconFlowApiKey(settings: AISettings): string {
  // Use speech-specific API key if set, otherwise use translation API key
  return settings.speechRecognition.apiKey || settings.apiKey;
}

/**
 * Transcribe audio using SiliconFlow API
 */
export async function transcribeAudioSiliconFlow(
  audioBlob: Blob,
  settings: AISettings
): Promise<string> {
  const formData = new FormData();
  // Use model from settings, fallback to default if not set
  const modelName = settings.speechRecognition.modelName || 'TeleAI/TeleSpeechASR';
  formData.append('model', modelName);
  formData.append('file', audioBlob, 'audio.webm');

  const endpoint = settings.endpoint.endsWith('/')
    ? settings.endpoint + 'audio/transcriptions'
    : settings.endpoint + '/audio/transcriptions';

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${getSiliconFlowApiKey(settings)}`,
    },
    body: formData,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`SiliconFlow transcription failed: ${errorText}`);
  }

  const result = await response.json();
  return result.text || '';
}
