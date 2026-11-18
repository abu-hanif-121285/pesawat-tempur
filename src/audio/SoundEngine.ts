export type MusicMode = 'none' | 'menu' | 'battle' | 'boss';

class SoundEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private musicGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;

  private enabled = true;
  private musicVolume = 0.45;
  private sfxVolume = 0.75;

  private musicMode: MusicMode = 'none';
  private musicInterval: number | null = null;
  private stepIndex = 0;

  // Continuous jet engine hum nodes
  private engineOsc: OscillatorNode | null = null;
  private engineFilter: BiquadFilterNode | null = null;
  private engineGain: GainNode | null = null;

  private noiseBuffer: AudioBuffer | null = null;
  private lastLaserAt = 0;
  private lastLowHpAt = 0;

  public unlock(): void {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return;
      this.ctx = new AudioCtx();

      this.masterGain = this.ctx.createGain();
      this.musicGain = this.ctx.createGain();
      this.sfxGain = this.ctx.createGain();

      this.musicGain.connect(this.masterGain);
      this.sfxGain.connect(this.masterGain);
      this.masterGain.connect(this.ctx.destination);

      this.createNoiseBuffer();
      this.applyVolumes();
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
  }

  private createNoiseBuffer(): void {
    if (!this.ctx) return;
    const length = this.ctx.sampleRate * 1.5;
    const buffer = this.ctx.createBuffer(1, length, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    this.noiseBuffer = buffer;
  }

  public configure(enabled: boolean, musicVol: number, sfxVol: number): void {
    this.enabled = enabled;
    this.musicVolume = Math.max(0, Math.min(1, musicVol));
    this.sfxVolume = Math.max(0, Math.min(1, sfxVol));
    this.applyVolumes();
  }

  private applyVolumes(): void {
    if (!this.ctx || !this.masterGain || !this.musicGain || !this.sfxGain) return;
    const now = this.ctx.currentTime;
    this.masterGain.gain.setTargetAtTime(this.enabled ? 1 : 0, now, 0.03);
    this.musicGain.gain.setTargetAtTime(this.musicVolume * 0.42, now, 0.05);
    this.sfxGain.gain.setTargetAtTime(this.sfxVolume * 0.75, now, 0.05);
  }

  public setMusicMode(mode: MusicMode): void {
    if (this.musicMode === mode) return;
    this.musicMode = mode;

    if (this.musicInterval !== null) {
      window.clearInterval(this.musicInterval);
      this.musicInterval = null;
    }

    if (mode === 'none') return;

    this.stepIndex = 0;
    const stepMs = mode === 'menu' ? 240 : mode === 'boss' ? 135 : 160;
    this.musicInterval = window.setInterval(() => {
      this.playMusicStep();
    }, stepMs);
  }

  private playMusicStep(): void {
    if (!this.enabled || !this.ctx || !this.musicGain || this.ctx.state !== 'running') return;

    const now = this.ctx.currentTime;
    const step = this.stepIndex % 16;
    this.stepIndex++;

    // Sci-fi minor synth sequences (D minor / C minor / F minor)
    const menuNotes = [146.83, 174.61, 220.0, 261.63, 293.66, 261.63, 220.0, 174.61];
    const battleBass = [73.42, 73.42, 73.42, 87.31, 65.41, 65.41, 58.27, 65.41];
    const bossBass = [65.41, 65.41, 77.78, 65.41, 61.74, 61.74, 58.27, 73.42];
    const battleArp = [293.66, 349.23, 440.0, 587.33, 523.25, 440.0, 349.23, 329.63];
    const bossArp = [261.63, 311.13, 392.0, 523.25, 466.16, 392.0, 311.13, 369.99];

    if (this.musicMode === 'menu') {
      if (step % 2 === 0) {
        const freq = menuNotes[(step / 2) % menuNotes.length];
        this.triggerNote(freq, 'triangle', 0.35, 0.18);
      }
      if (step === 0 || step === 8) {
        this.triggerNote(73.42, 'sine', 0.85, 0.25);
      }
      return;
    }

    const isBoss = this.musicMode === 'boss';
    const bassFreq = (isBoss ? bossBass : battleBass)[Math.floor(step / 2) % 8];
    const arpFreq = (isBoss ? bossArp : battleArp)[step % 8];

    // Driving sub-bass pulse
    this.triggerNote(bassFreq, 'sawtooth', 0.13, 0.22, 360);

    // Sci-fi synth arpeggio
    if (step % 2 === 0 || isBoss) {
      this.triggerNote(arpFreq, isBoss ? 'sawtooth' : 'square', 0.1, 0.1, 1400);
    }

    // Electronic kick on beats 0, 4, 8, 12
    if (step % 4 === 0) {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(135, now);
      osc.frequency.exponentialRampToValueAtTime(36, now + 0.12);
      gain.gain.setValueAtTime(0.32, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.13);
      osc.connect(gain);
      gain.connect(this.musicGain);
      osc.start(now);
      osc.stop(now + 0.14);
    }

    // Crisp hi-hat on offbeats
    if (step % 2 === 1 && this.noiseBuffer) {
      const src = this.ctx.createBufferSource();
      src.buffer = this.noiseBuffer;
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'highpass';
      filter.frequency.value = 6500;
      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.06, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.045);
      src.connect(filter);
      filter.connect(gain);
      gain.connect(this.musicGain);
      src.start(now);
      src.stop(now + 0.05);
    }
  }

  private triggerNote(
    freq: number,
    type: OscillatorType,
    duration: number,
    volume: number,
    cutoff = 1800
  ): void {
    if (!this.ctx || !this.musicGain) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const filter = this.ctx.createBiquadFilter();
    const gain = this.ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, now);
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(cutoff, now);

    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(volume, now + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.musicGain);

    osc.start(now);
    osc.stop(now + duration + 0.02);
  }

  public startEngineHum(): void {
    this.unlock();
    if (!this.ctx || !this.sfxGain || this.engineOsc) return;
    const now = this.ctx.currentTime;

    this.engineOsc = this.ctx.createOscillator();
    this.engineFilter = this.ctx.createBiquadFilter();
    this.engineGain = this.ctx.createGain();

    this.engineOsc.type = 'sawtooth';
    this.engineOsc.frequency.setValueAtTime(62, now);

    this.engineFilter.type = 'lowpass';
    this.engineFilter.frequency.setValueAtTime(220, now);

    this.engineGain.gain.setValueAtTime(0.04, now);

    this.engineOsc.connect(this.engineFilter);
    this.engineFilter.connect(this.engineGain);
    this.engineGain.connect(this.sfxGain);

    this.engineOsc.start(now);
  }

  public updateEngineHum(throttle01: number, boosting: boolean): void {
    if (!this.ctx || !this.engineOsc || !this.engineFilter || !this.engineGain) return;
    const now = this.ctx.currentTime;
    const targetFreq = 58 + throttle01 * 38 + (boosting ? 46 : 0);
    const targetCutoff = 190 + throttle01 * 240 + (boosting ? 420 : 0);
    const targetVol = this.enabled ? 0.035 + throttle01 * 0.035 + (boosting ? 0.05 : 0) : 0;

    this.engineOsc.frequency.setTargetAtTime(targetFreq, now, 0.08);
    this.engineFilter.frequency.setTargetAtTime(targetCutoff, now, 0.08);
    this.engineGain.gain.setTargetAtTime(targetVol, now, 0.08);
  }

  public stopEngineHum(): void {
    if (this.engineOsc) {
      try {
        this.engineOsc.stop();
        this.engineOsc.disconnect();
      } catch {
        // ignore
      }
      this.engineOsc = null;
      this.engineFilter = null;
      this.engineGain = null;
    }
  }

  public playLaser(barrelTier = 1): void {
    if (!this.enabled || !this.ctx || !this.sfxGain) return;
    const nowMs = performance.now();
    if (nowMs - this.lastLaserAt < 45) return;
    this.lastLaserAt = nowMs;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = barrelTier >= 3 ? 'sawtooth' : 'square';
    const startFreq = barrelTier >= 3 ? 1080 : barrelTier === 2 ? 940 : 840;
    osc.frequency.setValueAtTime(startFreq, now);
    osc.frequency.exponentialRampToValueAtTime(190, now + 0.09);

    gain.gain.setValueAtTime(0.14, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.095);

    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.1);
  }

  public playMissile(): void {
    if (!this.enabled || !this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;

    // Lock beep + rocket whoosh
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(520, now);
    osc.frequency.exponentialRampToValueAtTime(140, now + 0.28);
    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.31);

    if (this.noiseBuffer) {
      const src = this.ctx.createBufferSource();
      src.buffer = this.noiseBuffer;
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(1100, now);
      filter.frequency.exponentialRampToValueAtTime(380, now + 0.36);
      const nGain = this.ctx.createGain();
      nGain.gain.setValueAtTime(0.24, now);
      nGain.gain.exponentialRampToValueAtTime(0.001, now + 0.38);
      src.connect(filter);
      filter.connect(nGain);
      nGain.connect(this.sfxGain);
      src.start(now);
      src.stop(now + 0.39);
    }
  }

  public playExplosion(size: 'small' | 'medium' | 'large' = 'medium'): void {
    if (!this.enabled || !this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;
    const dur = size === 'large' ? 0.85 : size === 'medium' ? 0.42 : 0.24;
    const vol = size === 'large' ? 0.48 : size === 'medium' ? 0.28 : 0.17;

    if (this.noiseBuffer) {
      const src = this.ctx.createBufferSource();
      src.buffer = this.noiseBuffer;
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(size === 'large' ? 900 : 1200, now);
      filter.frequency.exponentialRampToValueAtTime(95, now + dur);

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(vol, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + dur);

      src.connect(filter);
      filter.connect(gain);
      gain.connect(this.sfxGain);
      src.start(now);
      src.stop(now + dur + 0.02);
    }

    // Sub-bass impact punch
    const sub = this.ctx.createOscillator();
    const subGain = this.ctx.createGain();
    sub.type = 'sine';
    sub.frequency.setValueAtTime(size === 'large' ? 110 : 140, now);
    sub.frequency.exponentialRampToValueAtTime(28, now + dur * 0.85);
    subGain.gain.setValueAtTime(vol * 0.9, now);
    subGain.gain.exponentialRampToValueAtTime(0.001, now + dur * 0.9);
    sub.connect(subGain);
    subGain.connect(this.sfxGain);
    sub.start(now);
    sub.stop(now + dur);
  }

  public playShield(): void {
    if (!this.enabled || !this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(280, now);
    osc.frequency.exponentialRampToValueAtTime(760, now + 0.25);
    gain.gain.setValueAtTime(0.22, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.32);
  }

  public playPowerUp(isCoin = false): void {
    if (!this.enabled || !this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;
    const notes = isCoin ? [880, 1318.5] : [523.25, 659.25, 783.99, 1046.5];
    notes.forEach((freq, idx) => {
      if (!this.ctx || !this.sfxGain) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now + idx * 0.05);
      gain.gain.setValueAtTime(0.18, now + idx * 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.05 + 0.14);
      osc.connect(gain);
      gain.connect(this.sfxGain);
      osc.start(now + idx * 0.05);
      osc.stop(now + idx * 0.05 + 0.15);
    });
  }

  public playLowHealthWarning(): void {
    if (!this.enabled || !this.ctx || !this.sfxGain) return;
    const nowMs = performance.now();
    if (nowMs - this.lastLowHpAt < 950) return;
    this.lastLowHpAt = nowMs;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(680, now);
    osc.frequency.setValueAtTime(490, now + 0.1);
    gain.gain.setValueAtTime(0.12, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.23);
  }

  public playVictory(): void {
    if (!this.enabled || !this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;
    const fanfare = [523.25, 659.25, 783.99, 1046.5, 1318.5];
    fanfare.forEach((freq, i) => {
      if (!this.ctx || !this.sfxGain) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      const t = now + i * 0.11;
      osc.frequency.setValueAtTime(freq, t);
      gain.gain.setValueAtTime(0.24, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.42);
      osc.connect(gain);
      gain.connect(this.sfxGain);
      osc.start(t);
      osc.stop(t + 0.45);
    });
  }

  public playGameOver(): void {
    if (!this.enabled || !this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;
    const notes = [392.0, 349.23, 311.13, 261.63];
    notes.forEach((freq, i) => {
      if (!this.ctx || !this.sfxGain) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sawtooth';
      const t = now + i * 0.18;
      osc.frequency.setValueAtTime(freq, t);
      gain.gain.setValueAtTime(0.18, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.4);
      osc.connect(gain);
      gain.connect(this.sfxGain);
      osc.start(t);
      osc.stop(t + 0.42);
    });
  }
}

export const soundEngine = new SoundEngine();
