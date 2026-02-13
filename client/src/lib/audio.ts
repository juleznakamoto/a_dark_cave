import { Howl, Howler } from 'howler';
// --- Global Howler internal safety patch ---
// Patch _emit to guard against undefined _on* event arrays (defense-in-depth).
// We reference proto._emit directly (not a hardcoded string) so the access
// stays consistent regardless of minifier settings.
(function patchHowlerInternal() {
  const proto = (Howl as any).prototype;
  const originalEmit = proto._emit;
  if (originalEmit && !proto._emitPatched) {
    proto._emit = function (event: string, id: any, msg: any) {
      try {
        const listeners = this['_on' + event];
        if (!Array.isArray(listeners)) return this;
        return originalEmit.call(this, event, id, msg);
      } catch (err) {
        return this;
      }
    };
    proto._emitPatched = true;
  }
})();
import { logger } from './logger';

export class AudioManager {
  private static instance: AudioManager;
  private sounds: Map<string, Howl> = new Map();
  private soundUrls: Map<string, string> = new Map();
  private isMutedGlobally: boolean = false;
  private isMusicMuted: boolean = false;
  private backgroundMusicVolume: number = 1;
  private wasBackgroundMusicPlaying: boolean = false;

  private constructor() { }

  static getInstance(): AudioManager {
    if (!AudioManager.instance) {
      AudioManager.instance = new AudioManager();
    }
    return AudioManager.instance;
  }

  // Resume AudioContext if it's suspended (required for autoplay policy)
  private resumeAudioContext(): void {
    const ctx = Howler.ctx;
    if (ctx && ctx.state === 'suspended') {
      ctx.resume().catch(() => {
        // Silently ignore - will retry on next user interaction
      });
    }
  }

  async loadSound(name: string, url: string): Promise<void> {
    this.soundUrls.set(name, url);
    if (this.sounds.has(name)) return;

    try {
      const sound = new Howl({
        src: [url],
        preload: true,
        onload: () => logger.log(`Successfully loaded sound: ${name}`),
        onloaderror: (id, error) => logger.warn(`Failed to load sound ${name} from ${url}:`, error)
      });
      this.sounds.set(name, sound);
    } catch (error) {
      logger.warn(`Error initializing sound ${name}:`, error);
    }
  }

  playSound(name: string, volume: number = 1, isMuted: boolean = false): void {
    if (this.isMutedGlobally || isMuted) return;

    // Background music is handled separately for muting
    if (name === 'backgroundMusic' && this.isMusicMuted) return;

    // Resume AudioContext if suspended (autoplay policy)
    this.resumeAudioContext();

    const sound = this.sounds.get(name);
    if (!sound) {
      const url = this.soundUrls.get(name);
      if (url) {
        this.loadSound(name, url).then(() => {
          const loadedSound = this.sounds.get(name);
          if (loadedSound instanceof Howl) {
            try {
              loadedSound.volume(volume);
              loadedSound.play();
            } catch (error) {
              logger.warn(`Error playing loaded sound ${name}:`, error);
            }
          }
        });
      } else {
        logger.warn(`Sound ${name} not found and no URL registered`);
      }
      return;
    }

    try {
      sound.volume(volume);
      sound.play();
    } catch (error) {
      logger.warn(`Error playing sound ${name}:`, error);
    }
  }

  playLoopingSound(name: string, volume: number = 1, isMuted: boolean = false, fadeInDuration: number = 0): void {
    // Resume AudioContext if suspended (autoplay policy)
    this.resumeAudioContext();

    // Background music is controlled by isMusicMuted, not isMutedGlobally
    if (name === 'backgroundMusic') {
      if (this.isMusicMuted || isMuted) return;
    } else {
      // Other looping sounds (wind, combat, etc.) are controlled by SFX mute
      if (this.isMutedGlobally || isMuted) return;
    }

    const sound = this.sounds.get(name);
    if (!sound) {
      const url = this.soundUrls.get(name);
      if (url) {
        this.loadSound(name, url).then(() => {
          this.playLoopingSound(name, volume, isMuted, fadeInDuration);
        });
        return;
      }
      logger.warn(`Sound ${name} not found`);
      return;
    }

    try {
      // IMPORTANT: Set loop BEFORE checking if playing, so loop is always enabled
      sound.loop(true);
      sound.volume(volume);

      // If sound is already playing with loop enabled, we're done
      if (sound.playing && sound.playing()) return;

      if (fadeInDuration > 0) {
        // Clear any stale fade handlers from previous stop operations
        sound.off('fade');
        sound.volume(0);
        sound.play();
        sound.fade(0, volume, fadeInDuration * 1000);
      } else {
        sound.play();
      }
    } catch (error) {
      logger.warn(`Error playing looping sound ${name}:`, error);
    }
  }

  stopLoopingSound(name: string, fadeOutDuration: number = 0): void {
    const sound = this.sounds.get(name);
    if (!sound) return;

    if (fadeOutDuration > 0) {
      try {
        // Clear any stale fade handlers from previous stop/play cycles
        sound.off('fade');
        const currentVolume = typeof sound.volume === 'function' ? (sound.volume() ?? 0) : 0;
        sound.fade(currentVolume, 0, fadeOutDuration * 1000);
        sound.once('fade', () => {
          sound.stop();
        });
      } catch (error) {
        logger.warn(`Error fading sound ${name}:`, error);
        sound.stop();
      }
    } else {
      sound.stop();
    }
  }

  stopAllSounds(): void {
    // Track if background music was playing before stopping
    const bgMusic = this.sounds.get('backgroundMusic');
    this.wasBackgroundMusicPlaying = (bgMusic && typeof bgMusic.playing === 'function') ? bgMusic.playing() : false;

    this.sounds.forEach(sound => {
      try {
        if (sound && typeof sound.stop === 'function') {
          sound.stop();
        }
      } catch (error) {
        logger.warn('Error stopping sound during stopAllSounds:', error);
      }
    });
  }

  async preloadSounds(): Promise<void> {
    logger.log('Registering initial sounds for Howler...');
    // We only register the URL but don't force preload/load here to avoid blocking
    // critical path if the AudioManager is initialized early.
    // The sound will be loaded on first play or when loadGameSounds is called.
    const initialSounds = {
      'event': '/sounds/event.wav',
      'wind': '/sounds/wind.mp3',
    };

    for (const [name, url] of Object.entries(initialSounds)) {
      this.soundUrls.set(name, url);
    }
    logger.log('Initial sound registration complete (deferred loading)');
  }

  async loadGameSounds(): Promise<void> {
    logger.log('Loading remaining game sounds...');
    const gameSounds = {
      'newVillager': '/sounds/new_villager.wav',
      'event': '/sounds/event.wav',
      'eventMadness': '/sounds/event_madness.wav',
      'merchant': '/sounds/merchant.wav',
      'whisperingCube': '/sounds/whispering_cube.wav',
      'backgroundMusic': '/sounds/background_music.wav',
      'explosion': '/sounds/explosion.wav',
      'combat': '/sounds/combat.wav',
      'feedFire': '/sounds/feed_fire.wav',
      'sleep': '/sounds/sleep.wav',
      'buildingComplete': '/sounds/building_complete.wav',
      'craft': '/sounds/craft.wav',
      'mining': '/sounds/mining.wav',
      'chopWood': '/sounds/chop_wood.wav',
      'hunt': '/sounds/hunt.wav'
    };

    await Promise.all(
      Object.entries(gameSounds).map(([name, url]) => this.loadSound(name, url))
    );
    logger.log('Game sounds registration complete');
  }

  async startBackgroundMusic(volume: number = 1): Promise<void> {
    this.backgroundMusicVolume = volume;
    this.wasBackgroundMusicPlaying = true;
    this.playLoopingSound('backgroundMusic', volume);
  }

  pauseAllSounds(): void {
    try {
      const bgMusic = this.sounds.get('backgroundMusic');
      this.wasBackgroundMusicPlaying = (bgMusic && typeof bgMusic.playing === 'function') ? bgMusic.playing() : false;

      this.sounds.forEach(sound => {
        try {
          if (sound && typeof sound.pause === 'function') {
            sound.pause();
          }
        } catch (error) {
          logger.warn('Error pausing sound:', error);
        }
      });
    } catch (error) {
      logger.warn('Error during pauseAllSounds:', error);
    }
  }

  async resumeSounds(): Promise<void> {
    // Only resume background music if it was playing AND music is not muted
    if (this.wasBackgroundMusicPlaying && !this.isMusicMuted) {
      this.playLoopingSound('backgroundMusic', this.backgroundMusicVolume);
    }
  }

  /** @deprecated Use musicMute and sfxMute separately */
  globalMute(mute: boolean): void {
    this.isMutedGlobally = mute;
    this.isMusicMuted = mute;
    if (mute) {
      this.stopAllSounds();
    } else {
      this.resumeSounds().catch(error => {
        logger.warn('Failed to resume sounds after unmuting:', error);
      });
    }
  }

  sfxMute(mute: boolean): void {
    this.isMutedGlobally = mute;
    if (mute) {
      // Stop all currently playing looping SFX sounds (but not background music which is controlled separately)
      this.sounds.forEach((sound, name) => {
        if (sound && name !== 'backgroundMusic' && sound.loop() && typeof sound.stop === 'function') {
          try {
            sound.stop();
          } catch (error) {
            logger.warn(`Error stopping looping sound ${name}:`, error);
          }
        }
      });
    }
  }

  musicMute(mute: boolean): void {
    this.isMusicMuted = mute;
    if (mute) {
      this.wasBackgroundMusicPlaying = false; // Prevent resumeSounds() from restarting
      this.stopLoopingSound('backgroundMusic', 1);
    } else {
      this.wasBackgroundMusicPlaying = true; // Track that music should be playing
      this.playLoopingSound('backgroundMusic', this.backgroundMusicVolume, false, 1);
    }
  }
}

export const audioManager = AudioManager.getInstance();
audioManager.preloadSounds().catch(error => {
  logger.warn('Failed to preload some sounds:', error);
});
