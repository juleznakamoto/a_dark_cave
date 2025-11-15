export class AudioManager {
  private static instance: AudioManager;
  private audioContext: AudioContext | null = null;
  private sounds: Map<string, AudioBuffer> = new Map();
  private soundUrls: Map<string, string> = new Map();
  private initialized: boolean = false;
  private loopingSources: Map<string, AudioBufferSourceNode> = new Map();
  private backgroundMusicVolume: number = 1;
  private wasBackgroundMusicPlaying: boolean = false;
  private isMutedGlobally: boolean = false; // Added a flag for global mute state

  private constructor() {}

  static getInstance(): AudioManager {
    if (!AudioManager.instance) {
      AudioManager.instance = new AudioManager();
    }
    return AudioManager.instance;
  }

  private async initAudioContext(): Promise<void> {
    if (!this.audioContext) {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    }

    if (this.audioContext.state === 'suspended') {
      await this.audioContext.resume();
    }
  }

  async loadSound(name: string, url: string): Promise<void> {
    // RAM TEST: Audio loading completely disabled
    if (import.meta.env.DEV) {
      console.log(`[RAM TEST] Audio loading disabled for: ${name}`);
    }
    return;
  }

  private async loadAllSounds(): Promise<void> {
    if (this.soundUrls.size === 0) return;

    if (import.meta.env.DEV) {
      console.log('Loading all sounds after user gesture...');
    }
    const loadPromises = Array.from(this.soundUrls.entries()).map(([name, url]) =>
      this.loadActualSound(name, url)
    );
    await Promise.all(loadPromises);
    if (import.meta.env.DEV) {
      console.log('Finished loading all sounds');
    }
  }

  private async loadActualSound(name: string, url: string): Promise<void> {
    try {
      await this.initAudioContext();
      if (!this.audioContext) return;

      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      const arrayBuffer = await response.arrayBuffer();
      const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);
      this.sounds.set(name, audioBuffer);
      if (import.meta.env.DEV) {
        console.log(`Successfully loaded sound: ${name}`);
      }
    } catch (error) {
      console.warn(`Failed to load sound ${name} from ${url}:`, error);
    }
  }

  async playSound(name: string, volume: number = 1, isMuted: boolean = false): Promise<void> {
    // RAM TEST: Audio playback completely disabled
    return;
  }

  async playLoopingSound(name: string, volume: number = 1, isMuted: boolean = false): Promise<void> {
    // RAM TEST: Audio playback completely disabled
    return;
  }

  stopLoopingSound(name: string): void {
    const source = this.loopingSources.get(name);
    if (source) {
      try {
        source.stop();
        source.disconnect();
      } catch (error) {
        // Ignore errors if already stopped
      }
      this.loopingSources.delete(name);
    }
  }

  stopAllSounds(): void {
    // Stop all looping sounds
    this.loopingSources.forEach((source, name) => {
      try {
        source.stop();
        source.disconnect();
      } catch (error) {
        // Ignore errors if already stopped
      }
    });
    this.loopingSources.clear();
  }

  async preloadSounds(): Promise<void> {
    // RAM TEST: Audio preloading completely disabled
    if (import.meta.env.DEV) {
      console.log('[RAM TEST] Audio preloading disabled');
    }
    return;
  }

  async startBackgroundMusic(volume: number = 1): Promise<void> {
    this.backgroundMusicVolume = volume;
    this.wasBackgroundMusicPlaying = true;
    // The check for mute state is now handled within playLoopingSound
    await this.playLoopingSound('backgroundMusic', volume);
  }

  pauseAllSounds(): void {
    // Track if background music was playing
    this.wasBackgroundMusicPlaying = this.loopingSources.has('backgroundMusic');
    // Stop all sounds
    this.stopAllSounds();
  }

  async resumeSounds(): Promise<void> {
    // Resume background music if it was playing before pause
    if (this.wasBackgroundMusicPlaying) {
      // The check for mute state is now handled within playLoopingSound
      await this.startBackgroundMusic(this.backgroundMusicVolume);
    }
  }

  // Method to globally mute/unmute all audio
  globalMute(mute: boolean): void {
    this.isMutedGlobally = mute;
    if (mute) {
      this.stopAllSounds();
    } else {
      // If unmuting, we might want to resume background music if it was playing
      this.resumeSounds().catch(error => {
        console.warn('Failed to resume sounds after unmuting:', error);
      });
    }
  }
}

// Initialize and preload sounds
export const audioManager = AudioManager.getInstance();
audioManager.preloadSounds().catch(error => {
  console.warn('Failed to preload some sounds:', error);
});