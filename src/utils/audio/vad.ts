/**
 * Voice Activity Detection (VAD) utility using Web Audio API
 * Detects speech segments in audio stream and triggers callbacks
 * Uses modern MediaRecorder + AnalyserNode approach (no deprecated APIs)
 */

export interface VADConfig {
  // Energy threshold parameters
  energyThreshold?: number; // Energy threshold to detect voice (default: 30)
  energyIntegrationTime?: number; // Time window for energy calculation in ms (default: 100)

  // Voice activity parameters
  minVoiceDuration?: number; // Minimum voice duration in ms (default: 250)
  maxVoiceDuration?: number; // Maximum voice duration in ms before forcing split (default: 10000)
  silenceDuration?: number; // Silence duration to end voice segment in ms (default: 800)
}

const DEFAULT_CONFIG: Required<VADConfig> = {
  energyThreshold: 30,
  energyIntegrationTime: 100,
  minVoiceDuration: 250,
  maxVoiceDuration: 10000,
  silenceDuration: 800,
};

export interface VADCallbacks {
  onVoiceStart?: () => void;
  onVoiceEnd?: (audioBlob: Blob) => void;
  onSpeechData?: (energy: number) => void;
}

export class VoiceActivityDetector {
  private config: Required<VADConfig>;
  private callbacks: VADCallbacks;

  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private mediaStreamSource: MediaStreamAudioSourceNode | null = null;
  private mediaRecorder: MediaRecorder | null = null;

  private isVoiceActive = false;
  private voiceStartTime = 0;
  private lastVoiceTime = 0;

  private audioChunks: Blob[] = [];
  private monitoringInterval: number | null = null;
  private checkInterval: number | null = null;

  constructor(config: VADConfig = {}, callbacks: VADCallbacks = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.callbacks = callbacks;
  }

  /**
   * Start VAD with a media stream
   */
  async start(stream: MediaStream): Promise<void> {
    // Create audio context
    this.audioContext = new AudioContext();

    // Create analyser node for energy detection
    this.analyser = this.audioContext.createAnalyser();
    this.analyser.fftSize = 2048;
    this.analyser.smoothingTimeConstant = 0.8;

    // Create media stream source
    this.mediaStreamSource = this.audioContext.createMediaStreamSource(stream);

    // Connect only to analyser (no destination to avoid echo)
    this.mediaStreamSource.connect(this.analyser);

    // Create MediaRecorder for actual audio capture
    this.mediaRecorder = new MediaRecorder(stream, {
      mimeType: this.getSupportedMimeType(),
    });

    this.audioChunks = [];

    this.mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        this.audioChunks.push(event.data);
      }
    };

    // Start recording
    this.mediaRecorder.start(100); // Collect data every 100ms

    // Start monitoring energy levels
    this.startMonitoring();
  }

  /**
   * Stop VAD
   */
  stop(): void {
    // Stop monitoring
    this.stopMonitoring();

    // Flush any remaining audio
    if (this.isVoiceActive) {
      this.endVoice();
    }

    // Stop MediaRecorder
    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      this.mediaRecorder.stop();
    }

    // Disconnect and cleanup
    if (this.mediaStreamSource) {
      this.mediaStreamSource.disconnect();
      this.mediaStreamSource = null;
    }

    if (this.analyser) {
      this.analyser.disconnect();
      this.analyser = null;
    }

    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }

    // Clear state
    this.audioChunks = [];
    this.isVoiceActive = false;
    this.mediaRecorder = null;
  }

  /**
   * Get supported MIME type for MediaRecorder
   */
  private getSupportedMimeType(): string {
    const types = [
      'audio/webm;codecs=opus',
      'audio/webm',
      'audio/ogg;codecs=opus',
      'audio/mp4',
    ];

    for (const type of types) {
      if (MediaRecorder.isTypeSupported(type)) {
        return type;
      }
    }

    return ''; // Use default
  }

  /**
   * Start monitoring audio energy levels
   */
  private startMonitoring(): void {
    if (!this.analyser) return;

    const dataArray = new Uint8Array(this.analyser.frequencyBinCount);

    // Monitor energy levels at regular intervals
    this.monitoringInterval = window.setInterval(() => {
      if (!this.analyser) return;

      this.analyser.getByteFrequencyData(dataArray);

      // Calculate average energy
      const energy = this.calculateAverageEnergy(dataArray);

      // Detect voice activity
      this.processEnergy(energy);

      // Call speech data callback
      if (this.callbacks.onSpeechData) {
        this.callbacks.onSpeechData(energy);
      }
    }, this.config.energyIntegrationTime);

    // Check voice duration at regular intervals
    this.checkInterval = window.setInterval(() => {
      this.checkVoiceDuration();
    }, 100);
  }

  /**
   * Stop monitoring
   */
  private stopMonitoring(): void {
    if (this.monitoringInterval !== null) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }

    if (this.checkInterval !== null) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
  }

  /**
   * Calculate average energy from frequency data
   */
  private calculateAverageEnergy(dataArray: Uint8Array): number {
    let sum = 0;
    for (let i = 0; i < dataArray.length; i++) {
      sum += dataArray[i];
    }
    return sum / dataArray.length;
  }

  /**
   * Process energy level and detect voice activity
   */
  private processEnergy(energy: number): void {
    const isVoice = energy > this.config.energyThreshold;
    const currentTime = Date.now();

    if (isVoice) {
      this.lastVoiceTime = currentTime;

      if (!this.isVoiceActive) {
        // Start new voice segment
        this.startVoice();
      }
    } else if (this.isVoiceActive) {
      // Check if silence duration exceeded
      const silenceDuration = currentTime - this.lastVoiceTime;

      if (silenceDuration >= this.config.silenceDuration) {
        const voiceDuration = currentTime - this.voiceStartTime;

        // Check minimum voice duration
        if (voiceDuration >= this.config.minVoiceDuration) {
          this.endVoice();
        } else {
          // Too short, discard
          this.isVoiceActive = false;
          this.audioChunks = [];

          // Restart recording to clear buffer
          if (this.mediaRecorder && this.mediaRecorder.state === 'recording') {
            this.mediaRecorder.stop();
            this.mediaRecorder.start(100);
          }
        }
      }
    }
  }

  /**
   * Check voice duration and force split if needed
   */
  private checkVoiceDuration(): void {
    if (!this.isVoiceActive) return;

    const currentTime = Date.now();
    const voiceDuration = currentTime - this.voiceStartTime;

    // Check if max duration reached
    if (voiceDuration >= this.config.maxVoiceDuration) {
      this.endVoice();
    }
  }

  /**
   * Start voice segment
   */
  private startVoice(): void {
    this.isVoiceActive = true;
    this.voiceStartTime = Date.now();
    this.audioChunks = [];

    if (this.callbacks.onVoiceStart) {
      this.callbacks.onVoiceStart();
    }
  }

  /**
   * End voice segment and create audio blob
   */
  private endVoice(): void {
    if (!this.isVoiceActive) {
      return;
    }

    this.isVoiceActive = false;

    // Get the recorded audio chunks
    const chunks = [...this.audioChunks];
    this.audioChunks = [];

    if (chunks.length === 0) {
      return;
    }

    // Create audio blob from recorded chunks
    const mimeType = this.mediaRecorder?.mimeType || 'audio/webm';
    const audioBlob = new Blob(chunks, { type: mimeType });

    // Restart recording to clear buffer
    if (this.mediaRecorder && this.mediaRecorder.state === 'recording') {
      this.mediaRecorder.stop();

      // Small delay before restarting
      setTimeout(() => {
        if (this.mediaRecorder && this.mediaRecorder.state === 'inactive') {
          this.mediaRecorder.start(100);
        }
      }, 50);
    }

    if (this.callbacks.onVoiceEnd && audioBlob) {
      this.callbacks.onVoiceEnd(audioBlob);
    }
  }
}
