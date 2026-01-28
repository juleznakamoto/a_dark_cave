import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AudioManager } from './audio';

// Mock Howl
vi.mock('howler', () => ({
  Howl: vi.fn().mockImplementation(() => ({
    play: vi.fn(),
    stop: vi.fn(),
    pause: vi.fn(),
    volume: vi.fn(),
    loop: vi.fn(),
    fade: vi.fn(),
    once: vi.fn(),
    playing: vi.fn(() => false),
  })),
}));

describe('AudioManager', () => {
  let audioManager: AudioManager;

  beforeEach(() => {
    // Reset the singleton instance
    (AudioManager as any).instance = null;
    audioManager = AudioManager.getInstance();
  });

  describe('sfxMute', () => {
    it('should set isMutedGlobally when muting SFX', () => {
      audioManager.sfxMute(true);
      expect((audioManager as any).isMutedGlobally).toBe(true);
    });

    it('should unset isMutedGlobally when unmuting SFX', () => {
      audioManager.sfxMute(false);
      expect((audioManager as any).isMutedGlobally).toBe(false);
    });
  });

  describe('playSound', () => {
    it('should not play sound when SFX is muted', () => {
      const mockSound = {
        play: vi.fn(),
        volume: vi.fn(),
        playing: vi.fn(() => false),
      };

      (audioManager as any).sounds.set('test', mockSound as any);
      (audioManager as any).isMutedGlobally = true;

      audioManager.playSound('test');

      expect(mockSound.play).not.toHaveBeenCalled();
    });

    it('should play sound when SFX is not muted', () => {
      const mockSound = {
        play: vi.fn(),
        volume: vi.fn(),
        playing: vi.fn(() => false),
      };

      (audioManager as any).sounds.set('test', mockSound as any);
      (audioManager as any).isMutedGlobally = false;

      audioManager.playSound('test');

      expect(mockSound.play).toHaveBeenCalled();
    });
  });
});