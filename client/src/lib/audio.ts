import { Howl } from 'howler';
// --- Global Howler internal safety patch ---
(function patchHowlerInternal() {
  const proto = (Howl as any).prototype;
  const targets = ['lo', 'co']; // both variants exist in different Howler builds

  targets.forEach(fnName => {
    if (proto[fnName] && !proto[`_${fnName}Patched`]) {
      const original = proto[fnName];
      proto[fnName] = function (event: string, t: any, n: any) {
        try {
          const listeners = this['_on' + event];
          if (!Array.isArray(listeners)) return this; // prevent .length crash
          return original.call(this, event, t, n);
        } catch (err) {
          console.warn(`[HowlerPatch] prevented crash in ${fnName}(${event}):`, err);
          return this;
        }
      };
      proto[`_${fnName}Patched`] = true;
      console.log(`[HowlerPatch] Patched Howler.${fnName} globally`);
    }
  });
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

      // Monkey patch the internal event handling (lo/co depending on build) to be safer
      const patchInternalHandler = (handlerName: string) => {
        if (sound && (sound as any)[handlerName] && !(sound as any)['_' + handlerName + 'Patched']) {
          const originalHandler = (sound as any)[handlerName];
          (sound as any)[handlerName] = function (e: string, t: any, n: any) {
            if (!e) return this;
            const i = this["_on" + e];
            if (!i || !Array.isArray(i)) {
              console.log(`[AudioManager] Prevented ${handlerName} crash for event: ${e}`);
              return (typeof this.Yo === 'function') ? this.Yo(e) : this;
            }
            try {
              return originalHandler.apply(this, [e, t, n]);
            } catch (err) {
              console.warn(`[AudioManager] Howler internal ${handlerName} error for event ${e}:`, err);
              return this;
            }
          };
          (sound as any)['_' + handlerName + 'Patched'] = true;
          console.log(`[AudioManager] Patched ${handlerName} for sound: ${name}`);
        }
      };

      patchInternalHandler('lo');
      patchInternalHandler('co');
    } catch (error) {
      logger.warn(`Error playing sound ${name}:`, error);
    }
  }

  playLoopingSound(name: string, volume: number = 1, isMuted: boolean = false, fadeInDuration: number = 0): void {
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

    if (sound.playing && sound.playing()) return;

    try {
      sound.loop(true);
      sound.volume(volume);

      // Monkey patch the internal event handling (lo/co depending on build) to be safer
      const patchInternalHandler = (handlerName: string) => {
        if (sound && (sound as any)[handlerName] && !(sound as any)['_' + handlerName + 'Patched']) {
          const originalHandler = (sound as any)[handlerName];
          (sound as any)[handlerName] = function (e: string, t: any, n: any) {
            if (!e) return this;
            const i = this["_on" + e];
            if (!i || !Array.isArray(i)) {
              console.log(`[AudioManager] Prevented ${handlerName} crash for event: ${e}`);
              return (typeof this.Yo === 'function') ? this.Yo(e) : this;
            }
            try {
              return originalHandler.apply(this, [e, t, n]);
            } catch (err) {
              console.warn(`[AudioManager] Howler internal ${handlerName} error for event ${e}:`, err);
              return this;
            }
          };
          (sound as any)['_' + handlerName + 'Patched'] = true;
          console.log(`[AudioManager] Patched ${handlerName} for sound: ${name}`);
        }
      };

      patchInternalHandler('lo');
      patchInternalHandler('co');

      if (fadeInDuration > 0) {
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
      'wind': '/sounds/wind.mp3',
      'event': '/sounds/event.wav',
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
      'sleep': '/sounds/sleep.wav'
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
    if (this.wasBackgroundMusicPlaying) {
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
      // Stop all looping SFX sounds (but not background music which is controlled separately)
      this.stopLoopingSound('wind');
      this.stopLoopingSound('combat');
      this.stopLoopingSound('whisperingCube');
      // Note: backgroundMusic is controlled by musicMute, not sfxMute
    }
  }

  musicMute(mute: boolean): void {
    this.isMusicMuted = mute;
    if (mute) {
      this.stopLoopingSound('backgroundMusic', 1);
    } else {
      this.playLoopingSound('backgroundMusic', this.backgroundMusicVolume, false, 1);
    }
  }
}

export const audioManager = AudioManager.getInstance();
audioManager.preloadSounds().catch(error => {
  logger.warn('Failed to preload some sounds:', error);
});
