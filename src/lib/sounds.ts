'use client';

// ─── Web Audio Sound Engine ────────────────────────────────────────────────
// All sounds generated programmatically — no external files needed.

let ctx: AudioContext | null = null;

function getCtx(): AudioContext {
  if (!ctx) ctx = new AudioContext();
  return ctx;
}

function resume() {
  const c = getCtx();
  if (c.state === 'suspended') c.resume();
  return c;
}

// Coin pickup sound
export function playCoin() {
  try {
    const c = resume();
    const t = c.currentTime;
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.connect(gain);
    gain.connect(c.destination);
    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, t);
    osc.frequency.exponentialRampToValueAtTime(1320, t + 0.1);
    gain.gain.setValueAtTime(0.3, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
    osc.start(t);
    osc.stop(t + 0.3);
  } catch (_) {}
}

// Click / tap sound
export function playClick() {
  try {
    const c = resume();
    const t = c.currentTime;
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.connect(gain);
    gain.connect(c.destination);
    osc.type = 'square';
    osc.frequency.setValueAtTime(440, t);
    gain.gain.setValueAtTime(0.08, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.06);
    osc.start(t);
    osc.stop(t + 0.06);
  } catch (_) {}
}

// Success / submit sound
export function playSuccess() {
  try {
    const c = resume();
    const t = c.currentTime;
    const notes = [523, 659, 784]; // C5 E5 G5
    notes.forEach((freq, i) => {
      const osc = c.createOscillator();
      const gain = c.createGain();
      osc.connect(gain);
      gain.connect(c.destination);
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, t + i * 0.1);
      gain.gain.setValueAtTime(0.25, t + i * 0.1);
      gain.gain.exponentialRampToValueAtTime(0.001, t + i * 0.1 + 0.35);
      osc.start(t + i * 0.1);
      osc.stop(t + i * 0.1 + 0.35);
    });
  } catch (_) {}
}

// Fanfare for winner announcement
export function playFanfare() {
  try {
    const c = resume();
    const t = c.currentTime;
    // Fanfare melody: G4 C5 E5 G5 C6
    const melody = [
      { freq: 392, start: 0,   dur: 0.15 },
      { freq: 523, start: 0.15, dur: 0.15 },
      { freq: 659, start: 0.3, dur: 0.15 },
      { freq: 784, start: 0.45, dur: 0.2 },
      { freq: 1047, start: 0.65, dur: 0.6 },
    ];
    melody.forEach(({ freq, start, dur }) => {
      const osc = c.createOscillator();
      const gain = c.createGain();
      osc.connect(gain);
      gain.connect(c.destination);
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(freq, t + start);
      gain.gain.setValueAtTime(0.2, t + start);
      gain.gain.exponentialRampToValueAtTime(0.001, t + start + dur);
      osc.start(t + start);
      osc.stop(t + start + dur);
    });
  } catch (_) {}
}

// Counter increment sound
export function playCounter(up: boolean) {
  try {
    const c = resume();
    const t = c.currentTime;
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.connect(gain);
    gain.connect(c.destination);
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(up ? 660 : 440, t);
    gain.gain.setValueAtTime(0.12, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
    osc.start(t);
    osc.stop(t + 0.12);
  } catch (_) {}
}

// Timer warning tick sound
export function playTickSound() {
  try {
    const c = resume();
    const t = c.currentTime;
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.connect(gain);
    gain.connect(c.destination);
    osc.type = 'sine';
    osc.frequency.setValueAtTime(1000, t);
    gain.gain.setValueAtTime(0.05, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.05);
    osc.start(t);
    osc.stop(t + 0.05);
  } catch (_) {}
}

// Resonant gong sound when time expires
export function playGong() {
  try {
    const c = resume();
    const t = c.currentTime;
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.connect(gain);
    gain.connect(c.destination);
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(220, t);
    osc.frequency.exponentialRampToValueAtTime(110, t + 1.5);
    gain.gain.setValueAtTime(0.4, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 1.8);
    osc.start(t);
    osc.stop(t + 1.8);
  } catch (_) {}
}
