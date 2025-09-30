
export class AudioManager {
  private static instance: AudioManager;
  private audioContext: AudioContext | null = null;
  private sounds: Map<string, AudioBuffer> = new Map();

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

  async playSound(name: string, volume: number = 1): Promise<void> {
    try {
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

  async preloadSounds(): Promise<void> {
    console.log('Starting to preload sounds...');
    // Load all sounds in parallel
    await Promise.all([
      this.loadSound('newVillager', '/sounds/new_villager.wav'),
      this.loadSound('event', '/sounds/event.wav'),
      this.loadSound('eventMadness', '/sounds/event_madness.wav'),
    ]);
    console.log('Finished preloading sounds');
  }
}

// Initialize and preload sounds
export const audioManager = AudioManager.getInstance();
audioManager.preloadSounds().catch(error => {
  console.warn('Failed to preload some sounds:', error);
});
