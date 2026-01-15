import { logger } from "./logger";

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
      this.audioContext = new (window.AudioContext ||
        (window as any).webkitAudioContext)();
    }

    if (this.audioContext.state === "suspended") {
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

      logger.log(`Loading sound: ${name} from ${url}`);
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      const arrayBuffer = await response.arrayBuffer();
      const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);
      this.sounds.set(name, audioBuffer);
      logger.log(`Successfully loaded sound: ${name}`);
    } catch (error) {
      logger.warn(`Failed to load sound ${name} from ${url}:`, error);
    }
  }

  private async loadAllSounds(): Promise<void> {
    if (this.soundUrls.size === 0) return;

    logger.log("Loading all sounds after user gesture...");
    const loadPromises = Array.from(this.soundUrls.entries()).map(
      ([name, url]) => this.loadActualSound(name, url),
    );
    await Promise.all(loadPromises);
    logger.log("Finished loading all sounds");
  }

  private async loadActualSound(name: string, url: string): Promise<void> {
    if (this.sounds.has(name)) return;
    try {
      await this.initAudioContext();
      if (!this.audioContext) return;

      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      const arrayBuffer = await response.arrayBuffer();
      // decodeAudioData is CPU intensive and blocks the main thread.
      // We wrap it in a microtask/promise but it's still heavy.
      const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);
      this.sounds.set(name, audioBuffer);
      logger.log(`Successfully loaded sound: ${name}`);
    } catch (error) {
      logger.warn(`Failed to load sound ${name} from ${url}:`, error);
    }
  }

  async playSound(
    name: string,
    volume: number = 1,
    isMuted: boolean = false,
  ): Promise<void> {
    // Don't play if muted globally or if specific sound is muted
    if (this.isMutedGlobally || isMuted) return;

    // IMPORTANT: Check for sound in cache FIRST before doing any async work
    const audioBuffer = this.sounds.get(name);
    if (audioBuffer) {
      this.playBuffer(audioBuffer, volume);
      return;
    }

    // Fire and forget sound loading and playback to avoid blocking the caller
    (async () => {
      try {
        // Initialize audio on first play attempt
        if (!this.initialized) {
          this.initialized = true;
          this.loadAllSounds().catch(err => logger.error("Async sound load failed", err));
        }

        await this.initAudioContext();
        if (!this.audioContext) return;

        let buffer = this.sounds.get(name);
        if (!buffer) {
          // If sound not loaded yet, try to load it specifically
          const url = this.soundUrls.get(name);
          if (url) {
            logger.log(`Sound ${name} not found in cache, attempting immediate load...`);
            await this.loadActualSound(name, url);
            buffer = this.sounds.get(name);
          }
        }

        if (buffer) {
          this.playBuffer(buffer, volume);
        } else {
          logger.warn(`Sound ${name} not found and could not be loaded`);
        }
      } catch (error) {
        logger.warn(`Failed to play sound ${name}:`, error);
      }
    })();
  }

  private playBuffer(buffer: AudioBuffer, volume: number): void {
    if (!this.audioContext) return;
    try {
      const source = this.audioContext.createBufferSource();
      const gainNode = this.audioContext.createGain();

      source.buffer = buffer;
      gainNode.gain.value = Math.max(0, Math.min(1, volume));

      source.connect(gainNode);
      gainNode.connect(this.audioContext.destination);

      source.start();
    } catch (error) {
      logger.warn("Failed to play audio buffer:", error);
    }
  }

  async playLoopingSound(
    name: string,
    volume: number = 1,
    isMuted: boolean = false,
    fadeInDuration: number = 0,
  ): Promise<void> {
    // Don't play if muted globally or if specific sound is muted
    if (this.isMutedGlobally || isMuted) return;

    try {
      // Stop any existing loop for this sound
      this.stopLoopingSound(name);

      // Initialize audio on first play attempt
      if (!this.initialized) {
        this.initialized = true;
        this.loadAllSounds().catch(err => logger.error("Async sound load failed", err));
      }

      await this.initAudioContext();
      if (!this.audioContext) return;

      let audioBuffer = this.sounds.get(name);
      if (!audioBuffer) {
        // If sound not loaded yet, try to load it specifically
        const url = this.soundUrls.get(name);
        if (url) {
          logger.log(`Sound ${name} not found in cache, attempting immediate load...`);
          await this.loadActualSound(name, url);
          audioBuffer = this.sounds.get(name);
        }
      }

      if (!audioBuffer) {
        logger.warn(`Sound ${name} not found and could not be loaded`);
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
          this.audioContext.currentTime + fadeInDuration,
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
          gainNode.gain.linearRampToValueAtTime(
            0,
            this.audioContext.currentTime + fadeOutDuration,
          );

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
    logger.log("Registering sounds for lazy loading...");
    // Just register the sound URLs
    this.soundUrls.set("newVillager", "/sounds/new_villager.wav");
    this.soundUrls.set("event", "/sounds/event.wav");
    this.soundUrls.set("eventMadness", "/sounds/event_madness.wav");
    this.soundUrls.set("whisperingCube", "/sounds/whispering_cube.wav");
    this.soundUrls.set("backgroundMusic", "/sounds/background_music.wav");
    this.soundUrls.set("explosion", "/sounds/explosion.wav");
    this.soundUrls.set("wind", "/sounds/wind.wav");
    this.soundUrls.set("combat", "/sounds/combat.wav");
    logger.log("Sound URLs registered for lazy loading");

    // Proactively load critical sounds in the background WITHOUT blocking
    this.loadActualSound("event", "/sounds/event.wav").catch(() => {});
    this.loadActualSound("combat", "/sounds/combat.wav").catch(() => {});
  }

  async startBackgroundMusic(volume: number = 1): Promise<void> {
    this.backgroundMusicVolume = volume;
    this.wasBackgroundMusicPlaying = true;
    // The check for mute state is now handled within playLoopingSound
    await this.playLoopingSound("backgroundMusic", volume);
  }

  pauseAllSounds(): void {
    // Track if background music was playing
    this.wasBackgroundMusicPlaying = this.loopingSources.has("backgroundMusic");
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
      this.resumeSounds().catch((error) => {
        logger.warn("Failed to resume sounds after unmuting:", error);
      });
    }
  }

  isSoundLooping(name: string): boolean {
    return this.loopingSources.has(name);
  }
}

// Initialize and preload sounds
export const audioManager = AudioManager.getInstance();
audioManager.preloadSounds().catch((error) => {
  logger.warn("Failed to preload some sounds:", error);
});
