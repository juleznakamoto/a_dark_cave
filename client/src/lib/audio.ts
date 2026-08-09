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
import { EVENT_AMBIENCE_FADE_SECONDS, SOUND_VOLUME } from './soundVolumes';

export { EVENT_AMBIENCE_FADE_SECONDS, SOUND_VOLUME, feedFireVolume } from './soundVolumes';

export class AudioManager {
  private static instance: AudioManager;
  private sounds: Map<string, Howl> = new Map();
  private soundUrls: Map<string, string> = new Map();
  private isMutedGlobally: boolean = false;
  private isMusicMuted: boolean = false;
  private backgroundMusicVolume: number = 1;
  private wasBackgroundMusicPlaying: boolean = false;
  /** Master multipliers (0–1) layered on top of each sound's per-call volume. */
  private musicMasterVolume: number = 1;
  private sfxMasterVolume: number = 1;
  /** Per-call requested volume (pre-master) so master changes can re-apply to live sounds. */
  private requestedVolumes: Map<string, number> = new Map();
  /** Looping event ambience (cube, future madness beds, etc.) currently owning the mix. */
  private activeEventAmbience: string | null = null;

  private constructor() { }

  private clampVolume(value: number): number {
    if (!Number.isFinite(value)) return 1;
    return Math.max(0, Math.min(1, value));
  }

  /** Effective Howler volume for a sound: per-call volume scaled by the matching master. */
  private effectiveVolume(name: string, volume: number): number {
    const master =
      name === 'backgroundMusic' ? this.musicMasterVolume : this.sfxMasterVolume;
    return volume * master;
  }

  private isSoundPlaying(name: string): boolean {
    const sound = this.sounds.get(name);
    return Boolean(sound && typeof sound.playing === 'function' && sound.playing());
  }

  private getCurrentVolume(name: string): number {
    const sound = this.sounds.get(name);
    if (!sound || typeof sound.volume !== 'function') return 0;
    const value = sound.volume();
    return typeof value === 'number' ? value : 0;
  }

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

  /** Resolves when Howl has finished loading (or failed); does not hang forever. */
  private waitForHowlLoad(sound: Howl, name: string): Promise<void> {
    if (sound.state() === 'loaded') return Promise.resolve();

    return new Promise((resolve) => {
      const onLoad = () => {
        sound.off('loaderror', onError);
        resolve();
      };
      const onError = (_id: number, error: unknown) => {
        sound.off('load', onLoad);
        logger.warn(`Failed to load sound ${name}:`, error);
        resolve();
      };
      sound.once('load', onLoad);
      sound.once('loaderror', onError);
    });
  }

  async loadSound(name: string, url: string): Promise<void> {
    this.soundUrls.set(name, url);

    const existing = this.sounds.get(name);
    if (existing) {
      await this.waitForHowlLoad(existing, name);
      return;
    }

    try {
      const config: Record<string, unknown> = {
        src: [url],
        preload: true,
        onload: () => logger.log(`Successfully loaded sound: ${name}`),
        onloaderror: (id: number, error: unknown) =>
          logger.warn(`Failed to load sound ${name} from ${url}:`, error),
      };

      // Howler best practice: on playerror (autoplay blocked), wait for unlock then retry
      if (name === 'backgroundMusic') {
        const self = this;
        config.onplayerror = function () {
          const snd = self.sounds.get('backgroundMusic');
          if (snd && !self.isMusicMuted) {
            snd.once('unlock', function () {
              if (!self.isMusicMuted) {
                snd.loop(true);
                snd.volume(0);
                snd.play();
                snd.fade(
                  0,
                  self.effectiveVolume('backgroundMusic', self.backgroundMusicVolume),
                  1000,
                );
              }
            });
          }
        };
      }

      const sound = new Howl(config as Parameters<typeof Howl>[0]);
      this.sounds.set(name, sound);
      await this.waitForHowlLoad(sound, name);
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

    this.requestedVolumes.set(name, volume);
    const effective = this.effectiveVolume(name, volume);

    const sound = this.sounds.get(name);
    if (!sound) {
      const url = this.soundUrls.get(name);
      if (url) {
        this.loadSound(name, url).then(() => {
          const loadedSound = this.sounds.get(name);
          if (loadedSound instanceof Howl) {
            try {
              loadedSound.volume(effective);
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
      sound.volume(effective);
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
      this.requestedVolumes.set(name, volume);
      const effective = this.effectiveVolume(name, volume);

      // IMPORTANT: Set loop BEFORE checking if playing, so loop is always enabled
      sound.loop(true);

      // Already playing: cancel any in-progress fade-out and move to target volume
      if (sound.playing && sound.playing()) {
        sound.off('fade');
        if (fadeInDuration > 0) {
          sound.fade(this.getCurrentVolume(name), effective, fadeInDuration * 1000);
        } else {
          sound.volume(effective);
        }
        return;
      }

      if (fadeInDuration > 0) {
        // Clear any stale fade handlers from previous stop operations
        sound.off('fade');
        sound.volume(0);
        sound.play();
        sound.fade(0, effective, fadeInDuration * 1000);
      } else {
        sound.volume(effective);
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
        if (!(sound.playing && sound.playing())) {
          sound.stop();
          return;
        }
        const currentVolume = this.getCurrentVolume(name);
        sound.fade(currentVolume, 0, fadeOutDuration * 1000);
        sound.once('fade', () => {
          sound.stop();
        });
      } catch (error) {
        logger.warn(`Error fading sound ${name}:`, error);
        sound.stop();
      }
    } else {
      try {
        sound.off('fade');
        sound.stop();
      } catch (error) {
        logger.warn(`Error stopping sound ${name}:`, error);
      }
    }
  }

  /**
   * Crossfade from background music into a looping event bed (cube, future madness, etc.).
   * Safe to call when the game loop also pauses — event ambience is preserved.
   */
  startEventAmbience(
    name: string,
    volume: number,
    fadeSeconds: number = EVENT_AMBIENCE_FADE_SECONDS,
  ): void {
    if (this.isSoundPlaying('backgroundMusic') || this.wasBackgroundMusicPlaying) {
      this.wasBackgroundMusicPlaying = !this.isMusicMuted;
    }

    this.activeEventAmbience = name;
    this.stopLoopingSound('backgroundMusic', fadeSeconds);
    this.playLoopingSound(name, volume, false, fadeSeconds);
  }

  /**
   * Fade out event ambience. Background music is restored by {@link resumeSounds}
   * when the simulation unpauses (typically when the event dialog closes).
   */
  stopEventAmbience(
    name?: string,
    fadeSeconds: number = EVENT_AMBIENCE_FADE_SECONDS,
  ): void {
    const soundName = name ?? this.activeEventAmbience;
    if (!soundName) return;

    if (this.activeEventAmbience === soundName) {
      this.activeEventAmbience = null;
    }
    this.stopLoopingSound(soundName, fadeSeconds);
  }

  /** Stop looping SFX except BGM and the active event ambience bed. */
  private stopNonAmbienceLoopingSounds(): void {
    this.sounds.forEach((sound, name) => {
      if (name === 'backgroundMusic') return;
      if (name === this.activeEventAmbience) return;
      if (!sound || typeof sound.loop !== 'function' || !sound.loop()) return;
      if (typeof sound.playing === 'function' && !sound.playing()) return;
      try {
        sound.off('fade');
        sound.stop();
      } catch (error) {
        logger.warn(`Error stopping looping sound ${name}:`, error);
      }
    });
  }

  /**
   * Simulation pause (modal / user pause): fade BGM out and stop other loops,
   * while preserving any active event ambience bed.
   */
  pauseForSimulation(
    musicFadeOutSeconds: number = EVENT_AMBIENCE_FADE_SECONDS,
  ): void {
    if (this.isSoundPlaying('backgroundMusic')) {
      this.wasBackgroundMusicPlaying = !this.isMusicMuted;
      this.stopLoopingSound('backgroundMusic', musicFadeOutSeconds);
    } else if (!this.isMusicMuted && this.wasBackgroundMusicPlaying) {
      // Keep resume intent if BGM already faded for event ambience
    } else if (!this.activeEventAmbience) {
      this.wasBackgroundMusicPlaying = false;
    }

    this.stopNonAmbienceLoopingSounds();
  }

  stopAllSounds(): void {
    // Full stop (restart / start screen): do not leave resume intent for BGM.
    this.wasBackgroundMusicPlaying = false;
    this.activeEventAmbience = null;

    this.sounds.forEach(sound => {
      try {
        if (sound && typeof sound.stop === 'function') {
          sound.off('fade');
          sound.stop();
        }
      } catch (error) {
        logger.warn('Error stopping sound during stopAllSounds:', error);
      }
    });
  }

  /**
   * Decode start-screen cues early so Light Fire is not waiting on first-click
   * fetch/decode (especially slow on Vite/dev). Autoplay only blocks play(), not load.
   */
  async preloadSounds(): Promise<void> {
    logger.log('Preloading start-screen sounds...');
    const initialSounds = {
      wind: '/sounds/wind.mp3',
      lightFire: '/sounds/light_fire.mp3',
    };

    await Promise.all(
      Object.entries(initialSounds).map(([name, url]) => this.loadSound(name, url)),
    );
    logger.log('Start-screen sound preload complete');
  }

  async loadGameSounds(): Promise<void> {
    logger.log('Loading remaining game sounds...');
    const gameSounds = {
      newVillager: '/sounds/new_villager.mp3',
      event: '/sounds/event.mp3',
      eventMadness: '/sounds/event_madness.mp3',
      merchant: '/sounds/merchant.mp3',
      whisperingCube: '/sounds/whispering_cube.mp3',
      bloodMoon: '/sounds/blood_moon.mp3',
      backgroundMusic: '/sounds/background_music.mp3',
      explosion: '/sounds/explosion.mp3',
      combat: '/sounds/combat.mp3',
      feedFire: '/sounds/feed_fire.mp3',
      sleep: '/sounds/sleep.mp3',
      buildingComplete: '/sounds/building_complete.mp3',
      craft: '/sounds/craft.mp3',
      mining: '/sounds/mining.mp3',
      chopWood: '/sounds/chop_wood.mp3',
      gatherWood: '/sounds/gather_wood.mp3',
      hunt: '/sounds/hunt.mp3',
    };

    await Promise.all(
      Object.entries(gameSounds).map(([name, url]) => this.loadSound(name, url))
    );
    logger.log('Game sounds registration complete');
  }

  async startBackgroundMusic(volume: number = SOUND_VOLUME.backgroundMusic): Promise<void> {
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

  async resumeSounds(
    musicFadeInSeconds: number = EVENT_AMBIENCE_FADE_SECONDS,
  ): Promise<void> {
    // Event dialog still owns the mix — do not pull BGM back underneath it
    if (this.activeEventAmbience) return;

    // Only resume background music if it was playing AND music is not muted
    if (this.wasBackgroundMusicPlaying && !this.isMusicMuted) {
      this.playLoopingSound(
        'backgroundMusic',
        this.backgroundMusicVolume,
        false,
        musicFadeInSeconds,
      );
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
            if (name === this.activeEventAmbience) {
              this.activeEventAmbience = null;
            }
            sound.off('fade');
            sound.stop();
          } catch (error) {
            logger.warn(`Error stopping looping sound ${name}:`, error);
          }
        }
      });
    }
  }

  /**
   * @param resume When unmuting, start BGM again (default true). Pass false on the
   * start screen so New Game / remount does not pull gameplay music back in.
   */
  musicMute(mute: boolean, options?: { resume?: boolean }): void {
    this.isMusicMuted = mute;
    if (mute) {
      this.wasBackgroundMusicPlaying = false; // Prevent resumeSounds() from restarting
      this.stopLoopingSound('backgroundMusic', 1);
      return;
    }

    const shouldResume = options?.resume !== false;
    if (!shouldResume) {
      this.wasBackgroundMusicPlaying = false;
      return;
    }

    this.wasBackgroundMusicPlaying = true;
    // Don't restart BGM under an active event bed
    if (!this.activeEventAmbience) {
      this.playLoopingSound('backgroundMusic', this.backgroundMusicVolume, false, 1);
    }
  }

  /** Set the master music volume (0–1) and apply it live to the background track. */
  setMusicVolume(volume: number): void {
    this.musicMasterVolume = this.clampVolume(volume);
    const bgMusic = this.sounds.get('backgroundMusic');
    if (bgMusic && typeof bgMusic.volume === 'function') {
      try {
        bgMusic.volume(
          this.effectiveVolume('backgroundMusic', this.backgroundMusicVolume),
        );
      } catch (error) {
        logger.warn('Error applying music volume:', error);
      }
    }
  }

  /** Set the master SFX volume (0–1) and apply it live to any playing looping SFX. */
  setSfxVolume(volume: number): void {
    this.sfxMasterVolume = this.clampVolume(volume);
    this.sounds.forEach((sound, name) => {
      if (name === 'backgroundMusic') return;
      if (
        sound &&
        typeof sound.playing === 'function' &&
        sound.playing() &&
        typeof sound.volume === 'function'
      ) {
        const requested = this.requestedVolumes.get(name) ?? 1;
        try {
          sound.volume(this.effectiveVolume(name, requested));
        } catch (error) {
          logger.warn(`Error applying SFX volume for ${name}:`, error);
        }
      }
    });
  }
}

export const audioManager = AudioManager.getInstance();
audioManager.preloadSounds().catch(error => {
  logger.warn('Failed to preload some sounds:', error);
});
