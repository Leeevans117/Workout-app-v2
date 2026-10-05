/**
 * Audio Notification Engine using Web Audio API
 * Generates distinct synthesized sound cues with zero external asset dependencies
 */

class SoundNotificationEngine {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = false;
  private volume: number = 0.8;

  constructor() {
    // AudioContext will be initialized on first user interaction to comply with browser autoplay policies
    const savedMuted = localStorage.getItem('apex_sound_muted');
    if (savedMuted !== null) {
      this.isMuted = savedMuted === 'true';
    }
  }

  private getAudioContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    return this.ctx;
  }

  public toggleMute(): boolean {
    this.isMuted = !this.isMuted;
    localStorage.setItem('apex_sound_muted', String(this.isMuted));
    if (!this.isMuted) {
      this.playStartWorkBeep();
    }
    return this.isMuted;
  }

  public getMuted(): boolean {
    return this.isMuted;
  }

  public setVolume(vol: number) {
    this.volume = Math.max(0, Math.min(1, vol));
  }

  public getVolume(): number {
    return this.volume;
  }

  /**
   * Sound 1: Exercise timer ends
   * Uplifting, rewarding three-tone ascending chord (C5 -> E5 -> G5)
   */
  public playExerciseEndSound() {
    if (this.isMuted) return;
    const ctx = this.getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const notes = [523.25, 659.25, 783.99]; // C5, E5, G5
    
    notes.forEach((freq, index) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now + index * 0.1);
      
      gain.gain.setValueAtTime(0, now + index * 0.1);
      gain.gain.linearRampToValueAtTime(0.35 * this.volume, now + index * 0.1 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, now + index * 0.1 + 0.35);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now + index * 0.1);
      osc.stop(now + index * 0.1 + 0.4);
    });
  }

  /**
   * Sound 2: Rest period begins
   * Calming, gentle descending two-tone bell chime (A4 -> E4) with soft release
   */
  public playRestStartSound() {
    if (this.isMuted) return;
    const ctx = this.getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const frequencies = [440, 329.63]; // A4, E4

    frequencies.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + idx * 0.16);

      gain.gain.setValueAtTime(0, now + idx * 0.16);
      gain.gain.linearRampToValueAtTime(0.25 * this.volume, now + idx * 0.16 + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.16 + 0.55);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now + idx * 0.16);
      osc.stop(now + idx * 0.16 + 0.6);
    });
  }

  /**
   * Sound 3: Rest period ends
   * High-energy, crisp double-staccato alert (G5 -> C6) signaling time to resume
   */
  public playRestEndSound() {
    if (this.isMuted) return;
    const ctx = this.getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const tones = [
      { freq: 783.99, start: 0, duration: 0.12 },     // G5
      { freq: 1046.50, start: 0.15, duration: 0.28 },  // C6 (bright accent)
    ];

    tones.forEach((tone) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'square';
      // Low-pass filter to smooth harsh square harmonics
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(2200, now + tone.start);

      osc.frequency.setValueAtTime(tone.freq, now + tone.start);

      gain.gain.setValueAtTime(0, now + tone.start);
      gain.gain.linearRampToValueAtTime(0.3 * this.volume, now + tone.start + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.001, now + tone.start + tone.duration);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now + tone.start);
      osc.stop(now + tone.start + tone.duration + 0.02);
    });
  }

  /**
   * Sound 4: 10-second McGill Prep / Interval 3-2-1 Countdown Beep
   */
  public playPrepCountdownBeep(isFinalOne: boolean = false) {
    if (this.isMuted) return;
    const ctx = this.getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    const freq = isFinalOne ? 1174.66 : 784; // High D6 or G5
    osc.frequency.setValueAtTime(freq, now);

    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.28 * this.volume, now + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.001, now + (isFinalOne ? 0.25 : 0.12));

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + (isFinalOne ? 0.26 : 0.14));
  }

  /**
   * Sound 5: Work session start / Go
   */
  public playStartWorkBeep() {
    if (this.isMuted) return;
    const ctx = this.getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(880, now);
    osc.frequency.exponentialRampToValueAtTime(1320, now + 0.15);

    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.35 * this.volume, now + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.36);
  }

  /**
   * Sound 6: Full workout finished victory fanfare
   */
  public playWorkoutCompleteFanfare() {
    if (this.isMuted) return;
    const ctx = this.getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const notes = [
      { f: 523.25, t: 0, d: 0.15 },     // C5
      { f: 659.25, t: 0.16, d: 0.15 },  // E5
      { f: 783.99, t: 0.32, d: 0.15 },  // G5
      { f: 1046.50, t: 0.48, d: 0.45 }, // C6
    ];

    notes.forEach((n) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(n.f, now + n.t);

      gain.gain.setValueAtTime(0, now + n.t);
      gain.gain.linearRampToValueAtTime(0.35 * this.volume, now + n.t + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, now + n.t + n.d);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now + n.t);
      osc.stop(now + n.t + n.d + 0.02);
    });
  }
}

export const soundEngine = new SoundNotificationEngine();
