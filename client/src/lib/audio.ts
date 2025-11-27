import { logger } from './logger';

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
    // Store the URL for later loading
    this.soundUrls.set(name, url);

    // Only actually load if audio context is available
    if (!this.initialized) {
      return;
    }

    try {
      await this.initAudioContext();
      if (!this.audioContext) return;

      if (import.meta.env.DEV) {
        logger.log(`Loading sound: ${name} from ${url}`);
      }
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      const arrayBuffer = await response.arrayBuffer();
      const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);
      this.sounds.set(name, audioBuffer);
      if (import.meta.env.DEV) {
        logger.log(`Successfully loaded sound: ${name}`);
      }
    } catch (error) {
      logger.warn(`Failed to load sound ${name} from ${url}:`, error);
    }
  }

  private async loadAllSounds(): Promise<void> {
    if (this.soundUrls.size === 0) return;

    if (import.meta.env.DEV) {
      logger.log('Loading all sounds after user gesture...');
    }
    const loadPromises = Array.from(this.soundUrls.entries()).map(([name, url]) =>
      this.loadActualSound(name, url)
    );
    await Promise.all(loadPromises);
    if (import.meta.env.DEV) {
      logger.log('Finished loading all sounds');
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
        logger.log(`Successfully loaded sound: ${name}`);
      }
    } catch (error) {
      logger.warn(`Failed to load sound ${name} from ${url}:`, error);
    }
  }

  async playSound(name: string, volume: number = 1, isMuted: boolean = false): Promise<void> {
    // Don't play if muted globally or if specific sound is muted
    if (this.isMutedGlobally || isMuted) return;

    try {
      // Initialize audio on first play attempt
      if (!this.initialized) {
        this.initialized = true;
        await this.loadAllSounds();
      }

      await this.initAudioContext();
      if (!this.audioContext) return;

      const audioBuffer = this.sounds.get(name);
      if (!audioBuffer) {
        logger.warn(`Sound ${name} not found`);
        return;
      }

      const source = this.audioContext.createBufferSource();
      const gainNode = this.audioContext.createGain();

      source.buffer = audioBuffer;
      gainNode.gain.value = Math.max(0, Math.min(1, volume));

      source.connect(gainNode);
      gainNode.connect(this.audioContext.destination);

      source.start();
    } catch (error) {
      logger.warn(`Failed to play sound ${name}:`, error);
    }
  }

  async playLoopingSound(name: string, volume: number = 1, isMuted: boolean = false, fadeInDuration: number = 0): Promise<void> {
    // Don't play if muted globally or if specific sound is muted
    if (this.isMutedGlobally || isMuted) return;

    try {
      // Stop any existing loop for this sound
      this.stopLoopingSound(name);

      // Initialize audio on first play attempt
      if (!this.initialized) {
        this.initialized = true;
        await this.loadAllSounds();
      }

      await this.initAudioContext();
      if (!this.audioContext) return;

      const audioBuffer = this.sounds.get(name);
      if (!audioBuffer) {
        logger.warn(`Sound ${name} not found`);
        return;
      }

      const source = this.audioContext.createBufferSource();
      const gainNode = this.audioContext.createGain();

      source.buffer = audioBuffer;
      source.loop = true;

      // Set initial volume based on fade-in
      if (fadeInDuration > 0) {
        gainNode.gain.value = 0;
        gainNode.gain.linearRampToValueAtTime(
          Math.max(0, Math.min(1, volume)),
          this.audioContext.currentTime + fadeInDuration
        );
      } else {
        gainNode.gain.value = Math.max(0, Math.min(1, volume));
      }

      source.connect(gainNode);
      gainNode.connect(this.audioContext.destination);

      source.start();
      this.loopingSources.set(name, source);
      this.loopingSources.set(`${name}_gain`, gainNode as any);
    } catch (error) {
      logger.warn(`Failed to play looping sound ${name}:`, error);
    }
  }

  stopLoopingSound(name: string, fadeOutDuration: number = 0): void {
    const source = this.loopingSources.get(name);
    const gainNode = this.loopingSources.get(`${name}_gain`) as any as GainNode;
    
    if (source) {
      try {
        if (fadeOutDuration > 0 && gainNode && this.audioContext) {
          // Fade out
          gainNode.gain.linearRampToValueAtTime(0, this.audioContext.currentTime + fadeOutDuration);
          
          // Stop after fade out completes
          setTimeout(() => {
            try {
              source.stop();
              source.disconnect();
              if (gainNode) gainNode.disconnect();
            } catch (error) {
              // Ignore errors if already stopped
            }
            this.loopingSources.delete(name);
            this.loopingSources.delete(`${name}_gain`);
          }, fadeOutDuration * 1000);
        } else {
          // Stop immediately
          source.stop();
          source.disconnect();
          if (gainNode) gainNode.disconnect();
          this.loopingSources.delete(name);
          this.loopingSources.delete(`${name}_gain`);
        }
      } catch (error) {
        // Ignore errors if already stopped
        this.loopingSources.delete(name);
        this.loopingSources.delete(`${name}_gain`);
      }
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
    if (import.meta.env.DEV) {
      logger.log('Registering sounds for lazy loading...');
    }
    // Just register the sound URLs, don't load yet
    this.soundUrls.set('newVillager', '/sounds/new_villager.wav');
    this.soundUrls.set('event', '/sounds/event.wav');
    this.soundUrls.set('eventMadness', '/sounds/event_madness.wav');
    this.soundUrls.set('whisperingCube', '/sounds/whispering_cube.wav');
    this.soundUrls.set('backgroundMusic', '/sounds/background_music.wav');
    this.soundUrls.set('explosion', '/sounds/explosion.wav');
    this.soundUrls.set('wind', '/sounds/wind.wav');
    if (import.meta.env.DEV) {
      logger.log('Sound URLs registered for lazy loading');
    }
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
        logger.warn('Failed to resume sounds after unmuting:', error);
      });
    }
  }
}

// Initialize and preload sounds
export const audioManager = AudioManager.getInstance();
audioManager.preloadSounds().catch(error => {
  logger.warn('Failed to preload some sounds:', error);
});