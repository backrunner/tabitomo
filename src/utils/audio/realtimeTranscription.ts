import { VoiceActivityDetector, VADConfig, VADCallbacks } from './vad';
import { transcribeAudioSiliconFlow } from './audioTranscription';
import { localWhisperService } from './localWhisper';
import { AISettings } from '../config/settings';

export interface RealtimeTranscriptionConfig {
  vadConfig?: VADConfig;
  onTranscript?: (text: string, isFinal: boolean) => void;
  onError?: (error: Error) => void;
}

/**
 * Realtime transcription service using VAD and audio transcription API
 */
export class RealtimeTranscriptionService {
  private vad: VoiceActivityDetector | null = null;
  private settings: AISettings;
  private config: RealtimeTranscriptionConfig;
  private mediaStream: MediaStream | null = null;

  private isRunning = false;
  private pendingTranscriptions = 0;

  constructor(settings: AISettings, config: RealtimeTranscriptionConfig = {}) {
    this.settings = settings;
    this.config = config;
  }

  /**
   * Start realtime transcription
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      console.warn('Realtime transcription is already running');
      return;
    }

    try {
      // Get microphone access
      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      // Create VAD callbacks
      const vadCallbacks: VADCallbacks = {
        onVoiceStart: () => {
          console.log('Voice detected, starting capture...');
        },
        onVoiceEnd: async (audioBlob: Blob) => {
          console.log('Voice ended, transcribing...', audioBlob.size, 'bytes');
          await this.transcribeAudioSegment(audioBlob);
        },
      };

      // Create and start VAD
      this.vad = new VoiceActivityDetector(this.config.vadConfig, vadCallbacks);
      await this.vad.start(this.mediaStream);

      this.isRunning = true;
      console.log('Realtime transcription started');
    } catch (error) {
      console.error('Failed to start realtime transcription:', error);
      if (this.config.onError) {
        this.config.onError(error as Error);
      }
      throw error;
    }
  }

  /**
   * Stop realtime transcription
   */
  stop(): void {
    if (!this.isRunning) {
      return;
    }

    // Stop VAD
    if (this.vad) {
      this.vad.stop();
      this.vad = null;
    }

    // Stop media stream
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach(track => track.stop());
      this.mediaStream = null;
    }

    this.isRunning = false;
    console.log('Realtime transcription stopped');
  }

  /**
   * Transcribe an audio segment
   */
  private async transcribeAudioSegment(audioBlob: Blob): Promise<void> {
    this.pendingTranscriptions++;

    try {
      // Convert to appropriate format if needed
      const transcriptionBlob = await this.convertAudioFormat(audioBlob);

      // Use the configured transcription provider
      const provider = this.settings.speechRecognition.provider;

      if (provider === 'local-whisper') {
        // Use local whisper transcription
        const modelSize = this.settings.speechRecognition.whisperModel || 'base';

        // Check if model is downloaded
        if (!localWhisperService.isModelDownloaded(modelSize)) {
          console.error('Local whisper model not downloaded');
          if (this.config.onError) {
            this.config.onError(new Error(`Whisper model "${modelSize}" is not downloaded. Please download it in Settings.`));
          }
          return;
        }

        const text = await localWhisperService.transcribe(transcriptionBlob, {
          model: modelSize,
        });

        if (text && this.config.onTranscript) {
          this.config.onTranscript(text, true);
        }
      } else if (provider === 'siliconflow') {
        // Use SiliconFlow transcription
        const text = await transcribeAudioSiliconFlow(transcriptionBlob, this.settings);

        if (text && this.config.onTranscript) {
          this.config.onTranscript(text, true);
        }
      } else {
        // Fallback: use Web Speech API (not ideal for file-based transcription)
        console.warn('Web Speech API does not support file-based transcription in realtime mode');
      }
    } catch (error) {
      console.error('Failed to transcribe audio segment:', error);
      if (this.config.onError) {
        this.config.onError(error as Error);
      }
    } finally {
      this.pendingTranscriptions--;
    }
  }

  /**
   * Convert audio format if needed
   */
  private async convertAudioFormat(audioBlob: Blob): Promise<Blob> {
    // SiliconFlow API expects webm or wav format
    // MediaRecorder produces webm by default, which is supported
    if (audioBlob.type.includes('webm') || audioBlob.type.includes('wav')) {
      return audioBlob;
    }

    // If we get another format, try to keep it as-is
    // The API should handle common formats
    console.log('Audio blob type:', audioBlob.type);
    return audioBlob;
  }

  /**
   * Check if service is running
   */
  isActive(): boolean {
    return this.isRunning;
  }

  /**
   * Get number of pending transcriptions
   */
  getPendingCount(): number {
    return this.pendingTranscriptions;
  }
}
