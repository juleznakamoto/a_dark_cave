import { Howl } from 'howler';
import { logger } from './logger';

export class AudioManager {
  private static instance: AudioManager;
  private sounds: Map<string, Howl> = new Map();
  private soundUrls: Map<string, string> = new Map();
  private isMutedGlobally: boolean = false;
  private backgroundMusicVolume: number = 1;
  private wasBackgroundMusicPlaying: boolean = false;

  private constructor() {}

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

    const sound = this.sounds.get(name);
    if (!sound) {
      const url = this.soundUrls.get(name);
      if (url) {
        this.loadSound(name, url).then(() => {
          const loadedSound = this.sounds.get(name);
          if (loadedSound instanceof Howl) {
            try {
              loadedSound.volume(volume).play();
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
          (sound as any)[handlerName] = function(e: string, t: any, n: any) {
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
    if (this.isMutedGlobally || isMuted) return;

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

    if (sound.playing()) return;
    
    try {
      sound.loop(true);
      sound.volume(volume);
      
      // Monkey patch the internal event handling (lo/co depending on build) to be safer
      const patchInternalHandler = (handlerName: string) => {
        if (sound && (sound as any)[handlerName] && !(sound as any)['_' + handlerName + 'Patched']) {
          const originalHandler = (sound as any)[handlerName];
          (sound as any)[handlerName] = function(e: string, t: any, n: any) {
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
    logger.log('Registering sounds for Howler...');
    const soundsToRegister = {
      'newVillager': '/sounds/new_villager.wav',
      'event': '/sounds/event.wav',
      'eventMadness': '/sounds/event_madness.wav',
      'whisperingCube': '/sounds/whispering_cube.wav',
      'backgroundMusic': '/sounds/background_music.wav',
      'explosion': '/sounds/explosion.wav',
      'wind': '/sounds/wind.wav',
      'combat': '/sounds/combat.wav'
    };

    await Promise.all(
      Object.entries(soundsToRegister).map(([name, url]) => this.loadSound(name, url))
    );
    logger.log('Sound registration complete');
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

  globalMute(mute: boolean): void {
    this.isMutedGlobally = mute;
    if (mute) {
      this.stopAllSounds();
    } else {
      this.resumeSounds().catch(error => {
        logger.warn('Failed to resume sounds after unmuting:', error);
      });
    }
  }
}

export const audioManager = AudioManager.getInstance();
audioManager.preloadSounds().catch(error => {
  logger.warn('Failed to preload some sounds:', error);
});
