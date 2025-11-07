
export class AudioManager {
  private static instance: AudioManager;
  private audioContext: AudioContext | null = null;
  private sounds: Map<string, AudioBuffer> = new Map();
  private soundUrls: Map<string, string> = new Map();
  private initialized: boolean = false;
  private loopingSources: Map<string, AudioBufferSourceNode> = new Map();
  private backgroundMusicVolume: number = 1;
  private wasBackgroundMusicPlaying: boolean = false;
  private isMuted: boolean = false;

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

      console.log(`Loading sound: ${name} from ${url}`);
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      const arrayBuffer = await response.arrayBuffer();
      const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);
      this.sounds.set(name, audioBuffer);
      console.log(`Successfully loaded sound: ${name}`);
    } catch (error) {
      console.warn(`Failed to load sound ${name} from ${url}:`, error);
    }
  }

  private async loadAllSounds(): Promise<void> {
    if (this.soundUrls.size === 0) return;

    console.log('Loading all sounds after user gesture...');
    const loadPromises = Array.from(this.soundUrls.entries()).map(([name, url]) => 
      this.loadActualSound(name, url)
    );
    await Promise.all(loadPromises);
    console.log('Finished loading all sounds');
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
      console.log(`Successfully loaded sound: ${name}`);
    } catch (error) {
      console.warn(`Failed to load sound ${name} from ${url}:`, error);
    }
  }

  async playSound(name: string, volume: number = 1): Promise<void> {
    // Don't play if muted
    if (this.isMuted) return;

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
        console.warn(`Sound ${name} not found`);
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
      console.warn(`Failed to play sound ${name}:`, error);
    }
  }

  async playLoopingSound(name: string, volume: number = 1): Promise<void> {
    // Don't play if muted
    if (this.isMuted) return;

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
        console.warn(`Sound ${name} not found`);
        return;
      }

      const source = this.audioContext.createBufferSource();
      const gainNode = this.audioContext.createGain();
      
      source.buffer = audioBuffer;
      source.loop = true;
      gainNode.gain.value = Math.max(0, Math.min(1, volume));
      
      source.connect(gainNode);
      gainNode.connect(this.audioContext.destination);
      
      source.start();
      this.loopingSources.set(name, source);
    } catch (error) {
      console.warn(`Failed to play looping sound ${name}:`, error);
    }
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
    console.log('Registering sounds for lazy loading...');
    // Just register the sound URLs, don't load yet
    this.soundUrls.set('newVillager', '/sounds/new_villager.wav');
    this.soundUrls.set('event', '/sounds/event.wav');
    this.soundUrls.set('eventMadness', '/sounds/event_madness.wav');
    this.soundUrls.set('whisperingCube', '/sounds/whispering_cube.wav');
    this.soundUrls.set('backgroundMusic', '/sounds/background_music.wav');
    console.log('Sound URLs registered for lazy loading');
  }

  async startBackgroundMusic(volume: number = 1): Promise<void> {
    this.backgroundMusicVolume = volume;
    this.wasBackgroundMusicPlaying = true;
    await this.playLoopingSound('backgroundMusic', volume);
  }

  pauseAllSounds(): void {
    // Track if background music was playing
    this.wasBackgroundMusicPlaying = this.loopingSources.has('backgroundMusic');
    // Stop all sounds
    this.stopAllSounds();
    // Set muted state
    this.isMuted = true;
  }

  async resumeSounds(): Promise<void> {
    // Clear muted state
    this.isMuted = false;
    // Resume background music if it was playing before pause
    if (this.wasBackgroundMusicPlaying) {
      await this.startBackgroundMusic(this.backgroundMusicVolume);
    }
  }
}

// Initialize and preload sounds
export const audioManager = AudioManager.getInstance();
audioManager.preloadSounds().catch(error => {
  console.warn('Failed to preload some sounds:', error);
});
