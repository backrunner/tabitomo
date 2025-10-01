import { AISettings } from './settings';

/**
 * Check if the provider is SiliconFlow based on endpoint URL
 */
export function isSiliconFlowProvider(settings: AISettings): boolean {
  return settings.provider === 'custom' &&
         settings.endpoint.toLowerCase().includes('siliconflow');
}

/**
 * Transcribe audio using SiliconFlow API
 */
export async function transcribeAudioSiliconFlow(
  audioBlob: Blob,
  settings: AISettings
): Promise<string> {
  const formData = new FormData();
  formData.append('model', 'FunAudioLLM/SenseVoiceSmall');
  formData.append('file', audioBlob, 'audio.webm');

  const endpoint = settings.endpoint.endsWith('/')
    ? settings.endpoint + 'audio/transcriptions'
    : settings.endpoint + '/audio/transcriptions';

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${settings.apiKey}`,
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
