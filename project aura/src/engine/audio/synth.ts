import type { AudioSettings } from '../../types';

class SynthManager {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private settings: AudioSettings = {
    volume: 0.3,
    waveType: 'sine',
    baseFreq: 220,
    intervalScale: 12,
    isMuted: false,
  };

  constructor() {}

  public init() {
    if (this.ctx) return;
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    this.ctx = new AudioContextClass();
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.setValueAtTime(this.settings.volume, this.ctx.currentTime);
    this.masterGain.connect(this.ctx.destination);
  }

  public updateSettings(updates: Partial<AudioSettings>) {
    this.settings = { ...this.settings, ...updates };
    if (this.masterGain && this.ctx) {
      const vol = this.settings.isMuted ? 0 : this.settings.volume;
      this.masterGain.gain.setTargetAtTime(vol, this.ctx.currentTime, 0.05);
    }
  }

  public getSettings() {
    return this.settings;
  }

  public isInitialized() {
    return this.ctx !== null && this.ctx.state !== 'suspended';
  }

  public resume() {
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  public playNode(depth: number, maxDepth: number) {
    if (!this.ctx || this.settings.isMuted) return;
    if (this.ctx.state === 'suspended') this.ctx.resume();

    const d = Math.max(0, Math.min(depth, maxDepth));
    // f(d) = Base_Freq * (2 ^ ((Max_Depth - d) / Interval_Scale))
    const scale = this.settings.intervalScale || 12;
    const freq = this.settings.baseFreq * Math.pow(2, (maxDepth - d) / scale);

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = this.settings.waveType;
    osc.frequency.setValueAtTime(freq, now);

    // ADSR Envelope: brief attack, short exponential decay
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.4, now + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.12);

    osc.connect(gain);
    if (this.masterGain) {
      gain.connect(this.masterGain);
    } else {
      gain.connect(this.ctx.destination);
    }

    osc.start(now);
    osc.stop(now + 0.15);
  }

  public playBacktrack(depth: number, maxDepth: number) {
    if (!this.ctx || this.settings.isMuted) return;
    if (this.ctx.state === 'suspended') this.ctx.resume();

    const d = Math.max(0, Math.min(depth, maxDepth));
    const scale = this.settings.intervalScale || 12;
    const startFreq = this.settings.baseFreq * Math.pow(2, (maxDepth - d) / scale);
    const endFreq = startFreq * 0.55;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(startFreq, now);
    osc.frequency.exponentialRampToValueAtTime(endFreq, now + 0.15);

    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.25, now + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.15);

    // Warm lowpass filter sweep
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(startFreq, now);
    filter.frequency.exponentialRampToValueAtTime(endFreq * 1.3, now + 0.15);

    osc.connect(filter);
    filter.connect(gain);
    if (this.masterGain) {
      gain.connect(this.masterGain);
    } else {
      gain.connect(this.ctx.destination);
    }

    osc.start(now);
    osc.stop(now + 0.16);
  }

  public playPathCompleted() {
    if (!this.ctx || this.settings.isMuted) return;
    if (this.ctx.state === 'suspended') this.ctx.resume();

    const now = this.ctx.currentTime;
    const base = this.settings.baseFreq;
    
    // Cyberpunk Major 7th arpeggio: Root (0), Major 3rd (4), Perfect 5th (7), Major 7th (11), Octave (12)
    const semitones = [0, 4, 7, 11, 12];
    const delays = [0, 0.05, 0.10, 0.15, 0.20];

    semitones.forEach((semi, index) => {
      if (!this.ctx) return;
      const freq = base * Math.pow(2, semi / 12);
      const toneTime = now + delays[index];

      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, toneTime);
      
      gain.gain.setValueAtTime(0, toneTime);
      gain.gain.linearRampToValueAtTime(0.35, toneTime + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.0001, toneTime + 0.25);

      // Simple stereo panning separation if supported
      if (this.ctx.createStereoPanner) {
        const panner = this.ctx.createStereoPanner();
        panner.pan.setValueAtTime((index % 2 === 0 ? -0.4 : 0.4), toneTime);
        osc.connect(panner);
        panner.connect(gain);
      } else {
        osc.connect(gain);
      }

      if (this.masterGain) {
        gain.connect(this.masterGain);
      } else {
        gain.connect(this.ctx.destination);
      }

      osc.start(toneTime);
      osc.stop(toneTime + 0.3);
    });
  }
}

export const synth = new SynthManager();
