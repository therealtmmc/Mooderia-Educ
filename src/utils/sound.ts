// Self-contained sound synthesizer using the Web Audio API
class AcousticSoundSystem {
  private ctx: AudioContext | null = null;
  public enabled: boolean = true;

  private initCtx() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    if (this.ctx.state === "suspended") {
      this.ctx.resume();
    }
    return this.ctx;
  }

  playTick() {
    if (!this.enabled) return;
    try {
      const ctx = this.initCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(800, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(100, ctx.currentTime + 0.04);

      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.04);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 0.04);
    } catch (e) {
      console.warn("Acoustic tick failed", e);
    }
  }

  playPop() {
    if (!this.enabled) return;
    try {
      const ctx = this.initCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(250, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(450, ctx.currentTime + 0.08);

      gain.gain.setValueAtTime(0.12, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 0.08);
    } catch (e) {
      console.warn("Acoustic pop failed", e);
    }
  }

  playChime() {
    if (!this.enabled) return;
    try {
      const ctx = this.initCtx();
      const now = ctx.currentTime;

      // Two bright bell tones in succession
      const playBell = (freq: number, startDelay: number, duration: number, vol: number) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = "triangle";
        osc.frequency.setValueAtTime(freq, now + startDelay);
        osc.frequency.setValueAtTime(freq * 1.5, now + startDelay); // Overtones

        gain.gain.setValueAtTime(0, now);
        gain.gain.setValueAtTime(vol, now + startDelay);
        gain.gain.exponentialRampToValueAtTime(0.001, now + startDelay + duration);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now + startDelay);
        osc.stop(now + startDelay + duration);
      };

      playBell(880, 0, 0.4, 0.15); // A5
      playBell(1318.51, 0.1, 0.5, 0.1); // E6
    } catch (e) {
      console.warn("Acoustic chime failed", e);
    }
  }

  playCorrect() {
    if (!this.enabled) return;
    try {
      const ctx = this.initCtx();
      const now = ctx.currentTime;

      // Arpeggio leading to a pleasant chord
      const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = "sine";
        osc.frequency.setValueAtTime(freq, now + idx * 0.06);

        gain.gain.setValueAtTime(0, now);
        gain.gain.setValueAtTime(0.1, now + idx * 0.06);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.06 + 0.4);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now + idx * 0.06);
        osc.stop(now + idx * 0.06 + 0.4);
      });
    } catch (e) {
      console.warn("Acoustic correct sound failed", e);
    }
  }

  playIncorrect() {
    if (!this.enabled) return;
    try {
      const ctx = this.initCtx();
      const now = ctx.currentTime;

      // Unharmonious, sliding down buzz
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gain = ctx.createGain();

      osc1.type = "sawtooth";
      osc1.frequency.setValueAtTime(120, now);
      osc1.frequency.linearRampToValueAtTime(75, now + 0.35);

      osc2.type = "sine";
      osc2.frequency.setValueAtTime(118, now);
      osc2.frequency.linearRampToValueAtTime(73, now + 0.35);

      gain.gain.setValueAtTime(0.18, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

      // Low pass filter to keep it soft not harsh
      const filter = ctx.createBiquadFilter();
      filter.type = "lowpass";
      filter.frequency.setValueAtTime(400, now);

      osc1.connect(filter);
      osc2.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);

      osc1.start();
      osc2.start();

      osc1.stop(now + 0.35);
      osc2.stop(now + 0.35);
    } catch (e) {
      console.warn("Acoustic incorrect sound failed", e);
    }
  }
}

export const sound = new AcousticSoundSystem();
