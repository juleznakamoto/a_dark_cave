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
            loadedSound.volume(volume).play();
          }
        });
      } else {
        logger.warn(`Sound ${name} not found and no URL registered`);
      }
      return;
    }

    sound.volume(volume);
    sound.play();
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

    sound.loop(true);
    sound.volume(volume);
    
    if (fadeInDuration > 0) {
      sound.volume(0);
      sound.play();
      sound.fade(0, volume, fadeInDuration * 1000);
    } else {
      sound.play();
    }
  }

  stopLoopingSound(name: string, fadeOutDuration: number = 0): void {
    const sound = this.sounds.get(name);
    if (!sound) return;

    if (fadeOutDuration > 0) {
      sound.fade(sound.volume(), 0, fadeOutDuration * 1000);
      sound.once('fade', () => {
        sound.stop();
      });
    } else {
      sound.stop();
    }
  }

  stopAllSounds(): void {
    this.sounds.forEach(sound => sound.stop());
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

    for (const [name, url] of Object.entries(soundsToRegister)) {
      await this.loadSound(name, url);
    }
    logger.log('Sound registration complete');
  }

  async startBackgroundMusic(volume: number = 1): Promise<void> {
    this.backgroundMusicVolume = volume;
    this.wasBackgroundMusicPlaying = true;
    this.playLoopingSound('backgroundMusic', volume);
  }

  pauseAllSounds(): void {
    const bgMusic = this.sounds.get('backgroundMusic');
    this.wasBackgroundMusicPlaying = (bgMusic && typeof bgMusic.playing === 'function') ? bgMusic.playing() : false;
    this.sounds.forEach(sound => sound.pause());
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
