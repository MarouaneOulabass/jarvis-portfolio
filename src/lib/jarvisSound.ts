'use client';

export type JarvisSoundType =
  | 'hover'
  | 'tap'
  | 'focus'
  | 'drop'
  | 'dropzone-enter'
  | 'message'
  | 'error'
  | 'boot'
  | 'whoosh';

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let enabled = true;
let initialized = false;

const STORAGE_KEY = 'jarvis-sound-enabled';

function ensureCtx(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!ctx) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const Ctx = window.AudioContext || (window as any).webkitAudioContext;
    if (!Ctx) return null;
    ctx = new Ctx();
    master = ctx.createGain();
    master.gain.value = 0.1;
    master.connect(ctx.destination);
  }
  if (ctx.state === 'suspended') ctx.resume().catch(() => {});
  return ctx;
}

function tone(
  freqs: number[],
  duration: number,
  opts: {
    type?: OscillatorType;
    gain?: number;
    slideTo?: number;
    delay?: number;
  } = {},
) {
  if (!enabled) return;
  const c = ensureCtx();
  if (!c || !master) return;
  const start = c.currentTime + (opts.delay || 0);
  const osciType = opts.type || 'sine';
  const g = opts.gain ?? 0.3;

  for (const f of freqs) {
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.type = osciType;
    osc.frequency.setValueAtTime(f, start);
    if (opts.slideTo !== undefined) {
      osc.frequency.exponentialRampToValueAtTime(opts.slideTo, start + duration);
    }
    gain.gain.setValueAtTime(0, start);
    gain.gain.linearRampToValueAtTime(g, start + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    osc.connect(gain);
    gain.connect(master);
    osc.start(start);
    osc.stop(start + duration);
  }
}

function noiseBurst(duration: number, gain = 0.15) {
  if (!enabled) return;
  const c = ensureCtx();
  if (!c || !master) return;
  const bufSize = Math.floor(c.sampleRate * duration);
  const buf = c.createBuffer(1, bufSize, c.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < bufSize; i++) {
    data[i] = (Math.random() * 2 - 1) * (1 - i / bufSize);
  }
  const src = c.createBufferSource();
  src.buffer = buf;
  const g = c.createGain();
  g.gain.value = gain;
  const filter = c.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.value = 2000;
  src.connect(filter);
  filter.connect(g);
  g.connect(master);
  src.start();
}

export function playSound(type: JarvisSoundType) {
  if (!enabled) return;
  switch (type) {
    case 'hover':
      tone([1400], 0.04, { gain: 0.08, type: 'sine' });
      break;
    case 'tap':
      tone([880, 1320], 0.08, { type: 'triangle', gain: 0.18 });
      break;
    case 'focus':
      tone([660], 0.22, { slideTo: 1320, type: 'sine', gain: 0.22 });
      tone([1320], 0.15, { type: 'sine', gain: 0.12, delay: 0.05 });
      break;
    case 'drop':
      tone([200], 0.1, { slideTo: 80, type: 'sawtooth', gain: 0.25 });
      noiseBurst(0.15, 0.08);
      break;
    case 'dropzone-enter':
      tone([1760, 2200], 0.1, { type: 'sine', gain: 0.15 });
      break;
    case 'message':
      tone([988, 1318], 0.18, { type: 'sine', gain: 0.18 });
      tone([1976], 0.1, { type: 'sine', gain: 0.1, delay: 0.05 });
      break;
    case 'error':
      tone([220], 0.3, { slideTo: 110, type: 'square', gain: 0.2 });
      break;
    case 'boot':
      tone([220, 440], 0.2, { type: 'sine', gain: 0.15 });
      tone([660], 0.3, { type: 'sine', gain: 0.15, delay: 0.15 });
      tone([880, 1100], 0.4, { type: 'sine', gain: 0.18, delay: 0.3 });
      break;
    case 'whoosh':
      tone([100], 0.3, { slideTo: 1200, type: 'sawtooth', gain: 0.15 });
      noiseBurst(0.3, 0.1);
      break;
  }
}

export function setSoundEnabled(v: boolean) {
  enabled = v;
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(STORAGE_KEY, v ? '1' : '0');
    } catch {
      // ignore
    }
  }
}

export function isSoundEnabled(): boolean {
  return enabled;
}

export function initSound() {
  if (initialized) return;
  initialized = true;
  if (typeof window === 'undefined') return;
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored !== null) enabled = stored === '1';
  } catch {
    // ignore
  }
  // Wake AudioContext on first gesture
  const wake = () => {
    ensureCtx();
    window.removeEventListener('pointerdown', wake);
    window.removeEventListener('keydown', wake);
  };
  window.addEventListener('pointerdown', wake, { once: true });
  window.addEventListener('keydown', wake, { once: true });
}
