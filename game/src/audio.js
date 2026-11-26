// Synthesised sound for Meridian Run: no audio files, everything is built
// from oscillators and filtered noise, so the game stays offline and small.
// Audio starts only after the first user gesture, as browsers require.
let ctx = null;
let engineOsc = null;
let engineGain = null;
let windSrc = null;
let windGain = null;
let muted = false;

export function isMuted() {
  return muted;
}

export function toggleMute() {
  muted = !muted;
  if (engineGain) engineGain.gain.value = muted ? 0 : 0.05;
  if (windGain) windGain.gain.value = muted ? 0 : 0.02;
  return muted;
}

function ensureContext() {
  if (ctx) return ctx;
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return null;
  ctx = new AC();
  engineOsc = ctx.createOscillator();
  engineOsc.type = 'sawtooth';
  engineOsc.frequency.value = 55;
  engineGain = ctx.createGain();
  engineGain.gain.value = 0;
  const engineFilter = ctx.createBiquadFilter();
  engineFilter.type = 'lowpass';
  engineFilter.frequency.value = 420;
  engineOsc.connect(engineFilter).connect(engineGain).connect(ctx.destination);
  engineOsc.start();

  const buffer = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i += 1) data[i] = Math.random() * 2 - 1;
  windSrc = ctx.createBufferSource();
  windSrc.buffer = buffer;
  windSrc.loop = true;
  const windFilter = ctx.createBiquadFilter();
  windFilter.type = 'bandpass';
  windFilter.frequency.value = 600;
  windGain = ctx.createGain();
  windGain.gain.value = 0;
  windSrc.connect(windFilter).connect(windGain).connect(ctx.destination);
  windSrc.start();
  return ctx;
}

export function unlockAudio() {
  const c = ensureContext();
  if (c && c.state === 'suspended') c.resume();
}

// Call every frame: the engine note follows the throttle, the wind the speed.
export function updateEngine(throttle, speed) {
  if (!ctx || muted) return;
  const t = ctx.currentTime;
  engineOsc.frequency.setTargetAtTime(48 + throttle * 55 + speed * 0.25, t, 0.08);
  engineGain.gain.setTargetAtTime(0.02 + throttle * 0.045, t, 0.1);
  windGain.gain.setTargetAtTime(Math.min(0.06, speed * 0.0007), t, 0.15);
}

function blip(freq, dur, type, vol, when = 0) {
  if (!ctx || muted) return;
  const c = ensureContext();
  if (!c) return;
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  gain.gain.setValueAtTime(0, c.currentTime + when);
  gain.gain.linearRampToValueAtTime(vol, c.currentTime + when + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + when + dur);
  osc.connect(gain).connect(c.destination);
  osc.start(c.currentTime + when);
  osc.stop(c.currentTime + when + dur + 0.05);
}

export function playRing() {
  blip(880, 0.18, 'sine', 0.16);
  blip(1318, 0.28, 'sine', 0.12, 0.07);
}

export function playClick() {
  blip(660, 0.06, 'square', 0.06);
}

export function playThud() {
  blip(90, 0.22, 'sine', 0.25);
  blip(55, 0.3, 'triangle', 0.2, 0.02);
}

export function playCrash() {
  if (!ctx || muted) return;
  const c = ensureContext();
  const dur = 0.6;
  const buffer = c.createBuffer(1, c.sampleRate * dur, c.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
  const src = c.createBufferSource();
  src.buffer = buffer;
  const filter = c.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = 900;
  const gain = c.createGain();
  gain.gain.value = 0.35;
  src.connect(filter).connect(gain).connect(c.destination);
  src.start();
}
