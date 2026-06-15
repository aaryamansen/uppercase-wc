/**
 * Tiny WebAudio synthesiser for pixel-style SFX.
 * ----------------------------------------------------------------------------
 * No audio files — every sound is generated procedurally so the build stays
 * lightweight and fully static. Muted by default to respect autoplay policies;
 * the AudioContext is created lazily on first user gesture.
 */

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let crowd: { stop: () => void } | null = null;
let isMuted = true;

function ensureCtx(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!ctx) {
    const AC = window.AudioContext || (window as any).webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = isMuted ? 0 : 0.6;
    master.connect(ctx.destination);
  }
  if (ctx.state === 'suspended') void ctx.resume();
  return ctx;
}

function tone(
  freq: number,
  dur: number,
  type: OscillatorType = 'square',
  vol = 0.3,
  glideTo?: number
) {
  const c = ensureCtx();
  if (!c || !master) return;
  const osc = c.createOscillator();
  const g = c.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, c.currentTime);
  if (glideTo) osc.frequency.exponentialRampToValueAtTime(glideTo, c.currentTime + dur);
  g.gain.setValueAtTime(0.0001, c.currentTime);
  g.gain.exponentialRampToValueAtTime(vol, c.currentTime + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + dur);
  osc.connect(g);
  g.connect(master);
  osc.start();
  osc.stop(c.currentTime + dur + 0.02);
}

function noiseBurst(dur: number, vol = 0.4, hp = 800) {
  const c = ensureCtx();
  if (!c || !master) return;
  const frames = Math.floor(c.sampleRate * dur);
  const buf = c.createBuffer(1, frames, c.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < frames; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / frames);
  const src = c.createBufferSource();
  src.buffer = buf;
  const filter = c.createBiquadFilter();
  filter.type = 'highpass';
  filter.frequency.value = hp;
  const g = c.createGain();
  g.gain.value = vol;
  src.connect(filter);
  filter.connect(g);
  g.connect(master);
  src.start();
}

export const Audio = {
  setMuted(m: boolean) {
    isMuted = m;
    if (master && ctx) master.gain.setTargetAtTime(m ? 0 : 0.6, ctx.currentTime, 0.05);
    if (m) this.stopCrowd();
  },

  /** Looping crowd ambience built from gently filtered noise. */
  startCrowd() {
    const c = ensureCtx();
    if (!c || !master || crowd) return;
    const buf = c.createBuffer(1, c.sampleRate * 2, c.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * 0.5;
    const src = c.createBufferSource();
    src.buffer = buf;
    src.loop = true;
    const filter = c.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 480;
    filter.Q.value = 0.6;
    const g = c.createGain();
    g.gain.value = 0.08;
    src.connect(filter);
    filter.connect(g);
    g.connect(master);
    src.start();
    crowd = { stop: () => { try { src.stop(); } catch { /* noop */ } } };
  },

  stopCrowd() {
    if (crowd) {
      crowd.stop();
      crowd = null;
    }
  },

  kick() {
    noiseBurst(0.08, 0.5, 300);
    tone(180, 0.12, 'square', 0.25, 90);
  },

  goal() {
    [523, 659, 784, 1047].forEach((f, i) =>
      setTimeout(() => tone(f, 0.18, 'square', 0.3), i * 70)
    );
    setTimeout(() => this.cheer(), 120);
  },

  save() {
    tone(140, 0.18, 'sawtooth', 0.3, 70);
    noiseBurst(0.12, 0.3, 500);
  },

  miss() {
    tone(300, 0.4, 'sine', 0.25, 120);
  },

  whistle() {
    tone(2100, 0.18, 'sine', 0.2, 2400);
    setTimeout(() => tone(2200, 0.12, 'sine', 0.18), 120);
  },

  cheer() {
    noiseBurst(0.6, 0.35, 600);
  },

  /** Short celebration sting for the results reveal. */
  sting() {
    [659, 784, 988, 1319].forEach((f, i) =>
      setTimeout(() => tone(f, 0.22, 'triangle', 0.28), i * 90)
    );
  }
};
