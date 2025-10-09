/**
 * Local Whisper transcription service using @remotion/whisper-web
 * Runs entirely in the browser using WebAssembly
 */

import { downloadWhisperModel, transcribe, WhisperWebModel, resampleTo16Khz, WhisperWebLanguage } from '@remotion/whisper-web';

export type WhisperModelSize = Extract<WhisperWebModel, 'tiny' | 'base' | 'small'>;

export interface WhisperTranscriptionOptions {
  model?: WhisperModelSize;
  language?: WhisperWebLanguage;
}

interface ModelDownloadProgress {
  loaded: number;
  total: number;
  percentage: number;
}

export type ModelDownloadCallback = (progress: ModelDownloadProgress) => void;

class LocalWhisperService {
  private downloadedModels: Set<WhisperModelSize> = new Set();
  private downloadingModels: Set<WhisperModelSize> = new Set();

  /**
   * Download Whisper model with progress tracking
   */
  async downloadModel(
    modelSize: WhisperModelSize,
    onProgress?: ModelDownloadCallback
  ): Promise<void> {
    if (this.downloadedModels.has(modelSize)) {
      console.log(`[Whisper] Model ${modelSize} already downloaded`);
      return;
    }

    if (this.downloadingModels.has(modelSize)) {
      throw new Error(`Model ${modelSize} is already being downloaded`);
    }

    this.downloadingModels.add(modelSize);

    try {
      console.log(`[Whisper] Starting download of ${modelSize} model...`);

      await downloadWhisperModel({
        model: modelSize,
        onProgress: (progress) => {
          if (onProgress) {
            onProgress({
              loaded: progress.downloadedBytes,
              total: progress.totalBytes,
              percentage: progress.progress * 100,
            });
          }
        },
      });

      this.downloadedModels.add(modelSize);
      console.log(`[Whisper] Model ${modelSize} downloaded successfully`);
    } catch (error) {
      console.error(`[Whisper] Failed to download model ${modelSize}:`, error);
      throw error;
    } finally {
      this.downloadingModels.delete(modelSize);
    }
  }

  /**
   * Check if a model is downloaded
   */
  isModelDownloaded(modelSize: WhisperModelSize): boolean {
    return this.downloadedModels.has(modelSize);
  }

  /**
   * Check if a model is currently downloading
   */
  isModelDownloading(modelSize: WhisperModelSize): boolean {
    return this.downloadingModels.has(modelSize);
  }

  /**
   * Transcribe audio blob using Whisper
   */
  async transcribe(
    audioBlob: Blob,
    options: WhisperTranscriptionOptions = {}
  ): Promise<string> {
    const modelSize = options.model || 'base';

    // Ensure model is downloaded
    if (!this.downloadedModels.has(modelSize)) {
      throw new Error(
        `Whisper model "${modelSize}" is not downloaded. Please download it first.`
      );
    }

    try {
      console.log(`[Whisper] Transcribing audio with ${modelSize} model...`);

      // Resample audio to 16kHz Float32Array for Whisper
      const channelWaveform = await resampleTo16Khz({
        file: audioBlob,
      });

      // Transcribe using whisper-web
      const result = await transcribe({
        model: modelSize,
        channelWaveform,
        language: options.language,
      });

      // Concatenate all transcription items into a single string
      const transcription = result.transcription
        .map((item) => item.text)
        .join(' ')
        .trim();

      console.log(`[Whisper] Transcription complete:`, transcription);

      return transcription;
    } catch (error) {
      console.error('[Whisper] Transcription error:', error);
      throw new Error(
        `Failed to transcribe audio: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Clear cached models (for memory management)
   */
  clearCache(): void {
    this.downloadedModels.clear();
    console.log('[Whisper] Model cache cleared');
  }

  /**
   * Get model size information
   */
  getModelInfo(modelSize: WhisperModelSize): { size: string; description: string } {
    const modelInfo: Record<WhisperModelSize, { size: string; description: string }> = {
      tiny: { size: '~75 MB', description: 'Fastest, less accurate' },
      base: { size: '~145 MB', description: 'Good balance of speed and accuracy' },
      small: { size: '~488 MB', description: 'Better accuracy, slower' },
    };

    return modelInfo[modelSize];
  }
}

// Export singleton instance
export const localWhisperService = new LocalWhisperService();
