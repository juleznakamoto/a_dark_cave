
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

      const response = await fetch(url);
      const arrayBuffer = await response.arrayBuffer();
      const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);
      this.sounds.set(name, audioBuffer);
    } catch (error) {
      console.warn(`Failed to load sound ${name}:`, error);
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

  preloadSounds(): void {
    // Load the new villager sound
    this.loadSound('newVillager', '/sounds/new_villager.wav');
  }
}

// Initialize and preload sounds
export const audioManager = AudioManager.getInstance();
audioManager.preloadSounds();
