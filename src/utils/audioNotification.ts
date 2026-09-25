/**
 * Audio Notification Service using Web Audio API
 * Generates loud, crisp, pleasant acoustic tones for completed auto-crops without external file dependencies.
 */

class SoundNotificationService {
  private audioCtx: AudioContext | null = null;
  private isMuted: boolean = false;

  private getAudioContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    
    if (!this.audioCtx) {
      const AudioCtxClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtxClass) {
        this.audioCtx = new AudioCtxClass();
      }
    }

    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      this.audioCtx.resume().catch(() => {
        // AudioContext resume might require user interaction
      });
    }

    return this.audioCtx;
  }

  public setMuted(muted: boolean) {
    this.isMuted = muted;
    try {
      localStorage.setItem('sayonika_sound_muted', muted ? 'true' : 'false');
    } catch {
      // ignore
    }
  }

  public getIsMuted(): boolean {
    try {
      return localStorage.getItem('sayonika_sound_muted') === 'true';
    } catch {
      return this.isMuted;
    }
  }

  /**
   * Play a clean, high-volume, resonant success chime
   * Distinct, clear notes with harmonic overtones audible over printer/shop noise
   */
  public playSuccessChime(volume: number = 0.85): void {
    if (this.getIsMuted()) return;

    try {
      const ctx = this.getAudioContext();
      if (!ctx) return;

      const now = ctx.currentTime;

      // Master gain node with soft limiting to prevent clipping while staying loud
      const masterGain = ctx.createGain();
      masterGain.gain.setValueAtTime(volume, now);
      masterGain.connect(ctx.destination);

      // Distinct ascending triad chords (D5 -> G5 -> B5 -> D6)
      const notes = [
        { freq: 587.33, start: 0.00, duration: 0.28, gain: 0.55 }, // D5
        { freq: 783.99, start: 0.08, duration: 0.32, gain: 0.65 }, // G5
        { freq: 987.77, start: 0.16, duration: 0.38, gain: 0.75 }, // B5
        { freq: 1174.66, start: 0.24, duration: 0.65, gain: 0.90 }, // D6 (loud crystal ring)
      ];

      notes.forEach(({ freq, start, duration, gain }) => {
        // Primary fundamental oscillator (sine)
        const osc = ctx.createOscillator();
        // Overtone oscillator for sparkle & clarity (triangle)
        const overtoneOsc = ctx.createOscillator();
        const noteGain = ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + start);

        overtoneOsc.type = 'triangle';
        overtoneOsc.frequency.setValueAtTime(freq * 2, now + start);

        const noteStart = now + start;
        const noteEnd = noteStart + duration;

        noteGain.gain.setValueAtTime(0.001, noteStart);
        noteGain.gain.exponentialRampToValueAtTime(gain, noteStart + 0.02);
        noteGain.gain.exponentialRampToValueAtTime(0.0001, noteEnd);

        osc.connect(noteGain);
        overtoneOsc.connect(noteGain);
        noteGain.connect(masterGain);

        osc.start(noteStart);
        overtoneOsc.start(noteStart);
        osc.stop(noteEnd + 0.08);
        overtoneOsc.stop(noteEnd + 0.08);
      });
    } catch (e) {
      console.warn('Could not play notification sound:', e);
    }
  }

  /**
   * Play single card crop completion chime (loud, crisp double-tap bell)
   */
  public playCardCroppedTone(volume: number = 0.80): void {
    if (this.getIsMuted()) return;

    try {
      const ctx = this.getAudioContext();
      if (!ctx) return;

      const now = ctx.currentTime;

      const masterGain = ctx.createGain();
      masterGain.gain.setValueAtTime(volume, now);
      masterGain.connect(ctx.destination);

      const notes = [
        { freq: 880.00, start: 0.00, duration: 0.18, gain: 0.70 }, // A5
        { freq: 1174.66, start: 0.09, duration: 0.40, gain: 0.85 }, // D6
      ];

      notes.forEach(({ freq, start, duration, gain }) => {
        const osc = ctx.createOscillator();
        const overtone = ctx.createOscillator();
        const noteGain = ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + start);

        overtone.type = 'triangle';
        overtone.frequency.setValueAtTime(freq * 2, now + start);

        const noteStart = now + start;
        const noteEnd = noteStart + duration;

        noteGain.gain.setValueAtTime(0.001, noteStart);
        noteGain.gain.exponentialRampToValueAtTime(gain, noteStart + 0.015);
        noteGain.gain.exponentialRampToValueAtTime(0.0001, noteEnd);

        osc.connect(noteGain);
        overtone.connect(noteGain);
        noteGain.connect(masterGain);

        osc.start(noteStart);
        overtone.start(noteStart);
        osc.stop(noteEnd + 0.05);
        overtone.stop(noteEnd + 0.05);
      });
    } catch (e) {
      console.warn('Could not play card sound:', e);
    }
  }
}

export const soundService = new SoundNotificationService();
export const playCropSuccessSound = () => soundService.playSuccessChime();
export const playSingleCropSound = () => soundService.playCardCroppedTone();
